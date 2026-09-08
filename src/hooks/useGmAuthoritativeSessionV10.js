import { useMemo } from "react";
import useGmAuthoritativeSessionV9, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV9.js";
import {
  MERCHANT_CREATE_PREFIX,
  MERCHANT_TRADE_PREFIX,
  formatMerchantOfferMessage,
  merchantAcceptsItem,
  merchantBuyPrice,
  merchantSellPrice,
  normalizeMerchantTradeItem,
} from "../utils/merchantSystem.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

// The shared-session chat stores at most 1200 characters per message.
// Merchant stock can be several KB, so creation state must be chunked.
const MERCHANT_CREATE_CHUNK_SIZE = 600;
const MERCHANT_CREATE_MAX_CHUNKS = 48;

function hiddenMerchantText(value) {
  const text = String(value || "");
  return text.startsWith(MERCHANT_CREATE_PREFIX) || text.startsWith(MERCHANT_TRADE_PREFIX);
}

function parsePacket(message, prefix) {
  const text = String(message?.text || "");
  if (!text.startsWith(prefix)) return null;
  try {
    return JSON.parse(text.slice(prefix.length));
  } catch {
    return null;
  }
}

function normalizeMerchant(raw = {}) {
  const id = String(raw?.id || "").trim();
  if (!id) return null;
  const stock = (Array.isArray(raw?.stock) ? raw.stock : [])
    .map((item, index) => {
      const normalized = normalizeMerchantTradeItem(item);
      return {
        ...normalized,
        stockId: String(item?.stockId || item?.id || `${id}-stock-${index}`),
      };
    })
    .filter((item) => item.stockId && item.name);

  return {
    id,
    name: String(raw?.name || "Merchant").slice(0, 80),
    merchantType: String(raw?.merchantType || "junkDealer"),
    wealth: Math.max(1, Math.min(10, Number(raw?.wealth || 1))),
    minRarity: Math.max(0, Math.min(7, Number(raw?.minRarity || 0))),
    maxRarity: Math.max(0, Math.min(7, Number(raw?.maxRarity ?? 7))),
    caps: Math.max(0, Math.round(Number(raw?.caps || 0))),
    initialCaps: Math.max(0, Math.round(Number(raw?.initialCaps ?? raw?.caps ?? 0))),
    stock,
    createdAt: Number(raw?.createdAt || Date.now()),
  };
}

function replayMerchants(chat = []) {
  const merchants = new Map();
  const tradeResults = [];
  const seenTradeIds = new Set();
  const createBatches = new Map();

  for (const message of Array.isArray(chat) ? chat : []) {
    const createPacket = parsePacket(message, MERCHANT_CREATE_PREFIX);
    if (createPacket) {
      if (message?.authorRole !== "gm") continue;

      // New chunked merchant state. Reconstruct it once the final piece arrives.
      if (createPacket?.chunked === true) {
        const batchId = String(createPacket?.batchId || "").trim();
        const total = Math.max(1, Math.min(MERCHANT_CREATE_MAX_CHUNKS, Number(createPacket?.total || 1)));
        const index = Math.max(0, Math.min(total - 1, Number(createPacket?.index || 0)));
        if (!batchId) continue;

        let batch = createBatches.get(batchId);
        if (!batch || batch.total !== total) {
          batch = { total, chunks: new Array(total).fill(null) };
          createBatches.set(batchId, batch);
        }
        batch.chunks[index] = String(createPacket?.chunk || "");

        if (batch.chunks.every((chunk) => chunk !== null)) {
          try {
            const decoded = JSON.parse(batch.chunks.join(""));
            const merchant = normalizeMerchant(decoded?.merchant || decoded);
            if (merchant) merchants.set(merchant.id, merchant);
          } catch {
            // Ignore malformed or incomplete merchant state.
          }
          createBatches.delete(batchId);
        }
        continue;
      }

      // Backward compatibility with the original single-message format.
      const merchant = normalizeMerchant(createPacket?.merchant || createPacket);
      if (merchant) merchants.set(merchant.id, merchant);
      continue;
    }

    const trade = parsePacket(message, MERCHANT_TRADE_PREFIX);
    if (!trade) continue;

    const tradeId = String(trade?.tradeId || "").trim();
    const merchantId = String(trade?.merchantId || "").trim();
    const kind = trade?.kind === "sell" ? "sell" : "buy";
    const actorClientId = String(message?.authorClientId || trade?.clientId || "").trim();
    if (!tradeId || seenTradeIds.has(tradeId)) continue;
    seenTradeIds.add(tradeId);

    const result = {
      tradeId,
      merchantId,
      kind,
      actorClientId,
      at: Number(message?.at || Date.now()),
      accepted: false,
      reason: "INVALID",
      price: 0,
      item: null,
      playerItemKey: String(trade?.playerItemKey || ""),
    };

    const merchant = merchants.get(merchantId);
    if (!merchant) {
      result.reason = "MERCHANT_NOT_FOUND";
      tradeResults.push(result);
      continue;
    }

    if (kind === "buy") {
      const stockId = String(trade?.stockId || "");
      const stockIndex = merchant.stock.findIndex((item) => String(item?.stockId || "") === stockId);
      if (stockIndex < 0) {
        result.reason = "SOLD_OUT";
        tradeResults.push(result);
        continue;
      }

      const item = merchant.stock[stockIndex];
      const price = merchantBuyPrice(item);
      merchant.stock = merchant.stock.filter((_, index) => index !== stockIndex);
      merchant.caps += price;
      merchants.set(merchant.id, { ...merchant, stock: [...merchant.stock] });

      result.accepted = true;
      result.reason = "OK";
      result.price = price;
      result.item = { ...item };
      tradeResults.push(result);
      continue;
    }

    const soldItem = normalizeMerchantTradeItem(trade?.item || {});
    if (!soldItem?.name || !merchantAcceptsItem(merchant.merchantType, soldItem)) {
      result.reason = "WRONG_TYPE";
      tradeResults.push(result);
      continue;
    }

    const price = merchantSellPrice(soldItem);
    if (merchant.caps < price) {
      result.reason = "NO_VENDOR_CAPS";
      result.price = price;
      result.item = soldItem;
      tradeResults.push(result);
      continue;
    }

    const resaleItem = {
      ...soldItem,
      stockId: `resale-${tradeId}`,
      quantity: 1,
      cost: String(merchantBuyPrice(soldItem)),
    };
    merchant.caps -= price;
    merchant.stock = [...merchant.stock, resaleItem];
    merchants.set(merchant.id, { ...merchant, stock: [...merchant.stock] });

    result.accepted = true;
    result.reason = "OK";
    result.price = price;
    result.item = resaleItem;
    tradeResults.push(result);
  }

  return { merchants: [...merchants.values()], tradeResults };
}

export default function useGmAuthoritativeSessionV10(form) {
  const base = useGmAuthoritativeSessionV9(form);
  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];
  const replay = useMemo(() => replayMerchants(rawChat), [rawChat]);

  const visibleChat = useMemo(
    () => rawChat.filter((message) => !hiddenMerchantText(message?.text)),
    [rawChat]
  );
  const visibleFeed = useMemo(
    () => (Array.isArray(base.feed) ? base.feed : []).filter((item) => !hiddenMerchantText(item?.text)),
    [base.feed]
  );

  const createMerchant = (merchant) => {
    if (base.mode !== "host" || base.status !== "online") return false;
    const normalized = normalizeMerchant(merchant);
    if (!normalized) return false;

    const json = JSON.stringify({ merchant: normalized });
    const chunks = [];
    for (let offset = 0; offset < json.length; offset += MERCHANT_CREATE_CHUNK_SIZE) {
      chunks.push(json.slice(offset, offset + MERCHANT_CREATE_CHUNK_SIZE));
    }
    if (!chunks.length || chunks.length > MERCHANT_CREATE_MAX_CHUNKS) return false;

    const batchId = `${normalized.id}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    let sentAll = true;
    for (let index = 0; index < chunks.length; index += 1) {
      const packet = `${MERCHANT_CREATE_PREFIX}${JSON.stringify({
        chunked: true,
        batchId,
        index,
        total: chunks.length,
        chunk: chunks[index],
      })}`;
      if (!base.sendChat?.(packet)) sentAll = false;
    }
    return sentAll;
  };

  const tradeWithMerchant = ({ tradeId, merchantId, kind, stockId = "", item = null, playerItemKey = "" } = {}) => {
    if (base.status !== "online" || !merchantId) return false;
    const resolvedTradeId = String(tradeId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    return Boolean(base.sendChat?.(`${MERCHANT_TRADE_PREFIX}${JSON.stringify({
      tradeId: resolvedTradeId,
      merchantId: String(merchantId),
      kind: kind === "sell" ? "sell" : "buy",
      stockId: String(stockId || ""),
      item: item ? normalizeMerchantTradeItem(item) : null,
      playerItemKey: String(playerItemKey || ""),
      clientId: String(base.clientId || ""),
    })}`));
  };

  const publishMerchantOffer = (merchantId) => {
    if (base.mode !== "host" || base.status !== "online") return false;
    const id = String(merchantId || "").trim();
    if (!id) return false;
    // Creation chunks are queued before this message, so an offer can be sent
    // immediately after generation without waiting for React replay to catch up.
    return Boolean(base.sendChat?.(formatMerchantOfferMessage(id)));
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v10-shared-merchants-chunked",
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    merchants: replay.merchants,
    merchantTradeResults: replay.tradeResults,
    createMerchant,
    tradeWithMerchant,
    publishMerchantOffer,
  };
}
