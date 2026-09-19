import { getTelegramLink, validCampaignId } from "../server/telegramCampaignStore.js";

const MAX_TEXT_LENGTH = 3900;
const MAX_ITEMS = 30;

function text(value, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function clip(value, max = MAX_TEXT_LENGTH) {
  const source = text(value);
  return source.length > max ? `${source.slice(0, Math.max(0, max - 1))}…` : source;
}

function allowedOrigin(origin) {
  const normalized = text(origin).replace(/\/$/, "");
  if (!normalized) return false;

  const defaults = new Set([
    "https://pip-2d20.fun",
    "https://www.pip-2d20.fun",
    "http://localhost:5173",
    "capacitor://localhost",
    "http://localhost",
  ]);

  const configured = text(process.env.TELEGRAM_ALLOWED_ORIGINS)
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  configured.forEach((value) => defaults.add(value));

  if (process.env.VERCEL_URL) defaults.add(`https://${process.env.VERCEL_URL}`);
  return defaults.has(normalized);
}

function formatDice(payload = {}) {
  const result = payload.result && typeof payload.result === "object" ? payload.result : {};
  const character = text(payload.character, "Unknown character");
  const label = text(result.label, result.diceType === "d6" ? "Damage" : "Roll");
  const dice = Array.isArray(result.diceValues)
    ? result.diceValues.slice(0, 50).map((value) => text(value)).join(", ")
    : "";

  const lines = [
    `🎲 ${character}`,
    label,
    dice ? `Dice: [${dice}]` : "",
  ];

  if (result.diceType === "d20") {
    if (result.targetNumber != null) lines.push(`Target: ${number(result.targetNumber)}`);
    if (result.successes != null) lines.push(`Successes: ${number(result.successes)}`);
    if (result.complications != null) lines.push(`Complications: ${number(result.complications)}`);
    if (result.hitLocation?.label) lines.push(`Hit: ${text(result.hitLocation.label)}`);
  } else {
    lines.push(`Damage: ${number(result.totalDamage)}`);
    lines.push(`Effects: ${number(result.totalEffects)}`);
    const effects = Array.isArray(result.effects) ? result.effects.filter(Boolean).slice(0, 12) : [];
    if (effects.length) lines.push(`FX: ${effects.join(", ")}`);
  }

  if (result.reroll) lines.push("↻ Reroll");
  return clip(lines.filter(Boolean).join("\n"));
}

function formatLoot(payload = {}) {
  const items = Array.isArray(payload.items) ? payload.items.slice(0, MAX_ITEMS) : [];
  const lines = ["🎁 GM LOOT"];

  items.forEach((item) => {
    const name = text(item?.name, "Loot");
    const quantity = Math.max(1, number(item?.quantity, 1));
    const qty = quantity > 1 ? ` ×${quantity}` : "";
    const rarity = item?.rarity != null ? ` · R${Math.max(0, Math.min(7, number(item.rarity)))}` : "";
    const cost = item?.cost ?? item?.price;
    const costText = cost != null && text(cost) ? ` · 💰${text(cost)}` : "";
    const legendary = item?.legendary
      ? ` · ★ ${text(item?.legendaryPropertyName, "Legendary")}`
      : "";
    lines.push(`• ${name}${qty}${costText}${rarity}${legendary}`);
  });

  if (!items.length) lines.push("• Empty");
  if (Array.isArray(payload.items) && payload.items.length > MAX_ITEMS) {
    lines.push(`… +${payload.items.length - MAX_ITEMS} more`);
  }
  return clip(lines.join("\n"));
}

function formatMerchant(payload = {}) {
  const merchant = payload.merchant && typeof payload.merchant === "object" ? payload.merchant : {};
  const stock = Array.isArray(merchant.stock) ? merchant.stock.slice(0, MAX_ITEMS) : [];
  const lines = [
    `🛒 ${text(merchant.name, "Merchant")}`,
    text(merchant.merchantType) ? `Type: ${text(merchant.merchantType)}` : "",
    merchant.caps != null ? `Caps: ${number(merchant.caps)}` : "",
    "",
    "Stock:",
  ];

  stock.forEach((item) => {
    const name = text(item?.name, "Item");
    const quantity = Math.max(1, number(item?.quantity, 1));
    const qty = quantity > 1 ? ` ×${quantity}` : "";
    const price = item?.cost ?? item?.price;
    const priceText = price != null && text(price) ? ` — 💰${text(price)}` : "";
    const legendary = item?.legendary
      ? `★ ${text(item?.legendaryPropertyName, "Legendary")} · `
      : "";
    lines.push(`• ${legendary}${name}${qty}${priceText}`);
  });

  if (!stock.length) lines.push("• Empty");
  if (Array.isArray(merchant.stock) && merchant.stock.length > MAX_ITEMS) {
    lines.push(`… +${merchant.stock.length - MAX_ITEMS} more`);
  }
  return clip(lines.filter((line, index) => line || index === 3).join("\n"));
}

export function formatTelegramEvent(payload = {}) {
  const type = text(payload.type).toLowerCase();
  if (type === "dice_roll") return formatDice(payload);
  if (type === "loot") return formatLoot(payload);
  if (type === "merchant") return formatMerchant(payload);
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!allowedOrigin(req.headers?.origin)) {
    return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  }

  const botToken = text(process.env.TELEGRAM_BOT_TOKEN);
  if (!botToken) {
    console.warn("telegram_event_skipped", { reason: "bot_not_configured" });
    return res.status(503).json({ ok: false, error: "telegram_not_configured" });
  }

  const payload = req.body || {};
  const campaignId = text(payload.campaignId);
  let chatId = "";

  if (!validCampaignId(campaignId)) {
    console.info("telegram_event_skipped", { reason: "missing_campaign_id" });
    return res.status(200).json({ ok: true, skipped: true, reason: "missing_campaign_id" });
  }

  const link = await getTelegramLink(campaignId);
  chatId = text(link?.chatId);
  if (!chatId) {
    console.info("telegram_event_skipped", { reason: "campaign_not_connected" });
    return res.status(200).json({ ok: true, skipped: true, reason: "campaign_not_connected" });
  }

  const message = formatTelegramEvent(payload);
  if (!message) {
    return res.status(400).json({ ok: false, error: "unsupported_event" });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      console.error("telegram_send_failed", {
        status: response.status,
        description: data?.description || "",
      });
      return res.status(502).json({ ok: false, error: "telegram_send_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("telegram_send_error", error);
    return res.status(502).json({ ok: false, error: "telegram_unreachable" });
  }
}
