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

  for (const message of Array.isArray(chat) ? chat : []) {
    const createPacket = parsePacket(message, MERCHANT_CREATE_PREFIX);
    if (createPacket) {
      if (message?.authorRole !== "gm") continue;
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
    return Boolean(base.sendChat?.(`${MERCHANT_CREATE_PREFIX}${JSON.stringify({ merchant: normalized })}`));
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
    const exists = replay.merchants.some((merchant) => merchant.id === String(merchantId || ""));
    if (!exists) return false;
    return Boolean(base.sendChat?.(formatMerchantOfferMessage(merchantId)));
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v10-shared-merchants",
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    merchants: replay.merchants,
    merchantTradeResults: replay.tradeResults,
    createMerchant,
    tradeWithMerchant,
    publishMerchantOffer,
  };
}
