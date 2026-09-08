export const MERCHANT_CREATE_PREFIX = "[[PIP2D20_MERCHANT_CREATE_V1]]";
export const MERCHANT_TRADE_PREFIX = "[[PIP2D20_MERCHANT_TRADE_V1]]";
export const MERCHANT_OFFER_PREFIX = "[[PIP2D20_MERCHANT_OFFER_V1]]";

export const MERCHANT_TYPES = [
  "armorer",
  "gunsmith",
  "junkDealer",
  "chemist",
  "ammunition",
  "grocer",
  "comic",
];

const TYPE_COPY = {
  armorer: { en: "Armorer", ru: "Броник", uk: "Броняр", pl: "Płatnerz" },
  gunsmith: { en: "Gunsmith", ru: "Оружейник", uk: "Зброяр", pl: "Rusznikarz" },
  junkDealer: { en: "Junk dealer", ru: "Хламовщик", uk: "Лахмітник", pl: "Handlarz złomem" },
  chemist: { en: "Chem dealer", ru: "Химик", uk: "Хімік", pl: "Chemik" },
  ammunition: { en: "Ammunition dealer", ru: "Амунишен", uk: "Продавець набоїв", pl: "Sprzedawca amunicji" },
  grocer: { en: "Grocer", ru: "Бакалейщик", uk: "Бакалійник", pl: "Sklepikarz" },
  comic: { en: "Comic dealer", ru: "Продавец комиксов", uk: "Продавець коміксів", pl: "Sprzedawca komiksów" },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(code) ? code : "en";
}

export function getMerchantTypeLabel(type, language = "en") {
  const lang = languageCode(language);
  return TYPE_COPY[type]?.[lang] || TYPE_COPY[type]?.en || String(type || "Merchant");
}

export function clampMerchantRarity(value, fallback = 0) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return Math.max(0, Math.min(7, Number(fallback) || 0));
  const number = Number(text);
  const resolved = Number.isFinite(number) ? number : fallback;
  return Math.max(0, Math.min(7, Math.round(Number(resolved) || 0)));
}

export function merchantItemRarity(item, fallback = 0) {
  const raw = String(item?.rarity ?? "").trim();
  const numeric = Number(raw.replace(",", "."));
  if (raw && Number.isFinite(numeric)) return clampMerchantRarity(numeric, fallback);

  const category = String(item?.category || "").toLowerCase();
  const sourceType = String(item?.sourceType || "").toLowerCase();
  const special = ["magazines", "tools", "misc"].includes(category)
    || ["bobblehead", "special", "stealth_boy", "stealthboy"].includes(sourceType);
  return special ? 5 : clampMerchantRarity(fallback, 0);
}

export function merchantBuyPrice(item) {
  const raw = String(item?.cost ?? item?.price ?? "").trim().replace(",", ".");
  const number = Number(raw);
  if (raw && Number.isFinite(number) && number > 0) return Math.max(1, Math.round(number));
  const rarity = merchantItemRarity(item, 0);
  return Math.max(5, 10 + rarity * 20);
}

export function merchantSellPrice(item) {
  return Math.max(1, Math.floor(merchantBuyPrice(item) / 3));
}

export function merchantAcceptsItem(type, item) {
  const merchantType = MERCHANT_TYPES.includes(type) ? type : "junkDealer";
  const category = String(item?.category || "").toLowerCase();
  const sourceType = String(item?.sourceType || "").toLowerCase();
  const lootType = String(item?.lootType || "").toLowerCase();

  if (merchantType === "armorer") {
    return category === "armor" || sourceType === "armor" || sourceType === "armor_mod";
  }
  if (merchantType === "gunsmith") {
    return category === "weapons" || category === "ammo" || sourceType === "weapon" || sourceType === "weapon_mod" || lootType === "weapon" || lootType === "ammo";
  }
  if (merchantType === "junkDealer") {
    return category === "junk" || lootType === "junk" || lootType === "special" || ["misc", "tools", "magazines"].includes(category);
  }
  if (merchantType === "chemist") return category === "aid";
  if (merchantType === "ammunition") return category === "ammo" || lootType === "ammo";
  if (merchantType === "grocer") return category === "food" || category === "beverages";
  if (merchantType === "comic") return category === "magazines";
  return false;
}

export function normalizeMerchantTradeItem(item = {}) {
  const rarity = merchantItemRarity(item, 0);
  return {
    id: String(item?.id || ""),
    stockId: String(item?.stockId || item?.id || ""),
    name: String(item?.name || item?.canonicalName || "Item"),
    canonicalName: String(item?.canonicalName || item?.name || "Item"),
    quantity: Math.max(1, Number(item?.quantity || 1)),
    cost: String(merchantBuyPrice(item)),
    weight: String(item?.weight ?? "0"),
    rarity,
    category: String(item?.category || "misc"),
    sourceType: String(item?.sourceType || "loot"),
    sourceId: item?.sourceId ?? null,
    effect: String(item?.effect || item?.effects || ""),
    lootType: String(item?.lootType || "special"),
  };
}

export function inventoryTradeKey(item, index = -1) {
  const stable = item?.id || item?.sourceId || item?.inventoryId;
  if (stable) return `id:${String(stable)}`;
  return [
    "item",
    String(item?.category || "").toLowerCase(),
    String(item?.sourceType || "").toLowerCase(),
    String(item?.canonicalName || item?.name || "").trim().toLowerCase(),
    String(index),
  ].join(":");
}

export function isStackableTradeItem(item) {
  const category = String(item?.category || "").toLowerCase();
  return ["ammo", "aid", "food", "beverages", "junk", "misc", "magazines", "tools"].includes(category)
    && !["weapon", "armor", "armor_mod", "weapon_mod"].includes(String(item?.sourceType || "").toLowerCase());
}

function identity(item) {
  return [
    String(item?.category || "").toLowerCase(),
    String(item?.sourceType || "").toLowerCase(),
    String(item?.canonicalName || item?.name || "").trim().toLowerCase(),
  ].join("::");
}

export function appendPurchasedItem(inventory = [], item = {}) {
  const next = Array.isArray(inventory) ? [...inventory] : [];
  const normalized = normalizeMerchantTradeItem(item);
  const inventoryItem = {
    ...normalized,
    id: normalized.id || `merchant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    quantity: String(Math.max(1, Number(normalized.quantity || 1))),
    rarity: String(normalized.rarity),
    sourceId: normalized.sourceId ?? null,
  };

  if (isStackableTradeItem(inventoryItem)) {
    const key = identity(inventoryItem);
    const index = next.findIndex((entry) => identity(entry) === key);
    if (index >= 0) {
      next[index] = {
        ...next[index],
        quantity: String(Math.max(0, Number(next[index]?.quantity || 0)) + Math.max(1, Number(inventoryItem.quantity || 1))),
      };
      return next;
    }
  }

  next.push(inventoryItem);
  return next;
}

export function removeSoldInventoryUnit(inventory = [], playerItemKey = "", fallbackItem = null) {
  const next = Array.isArray(inventory) ? [...inventory] : [];
  let index = next.findIndex((item, itemIndex) => inventoryTradeKey(item, itemIndex) === playerItemKey);
  if (index < 0 && fallbackItem) {
    const key = identity(fallbackItem);
    index = next.findIndex((item) => identity(item) === key);
  }
  if (index < 0) return next;

  const quantity = Math.max(0, Number(next[index]?.quantity ?? next[index]?.qty ?? 0));
  if (quantity > 1) {
    next[index] = { ...next[index], quantity: String(quantity - 1) };
    return next;
  }
  next.splice(index, 1);
  return next;
}

export function formatMerchantOfferMessage(merchantId) {
  return `${MERCHANT_OFFER_PREFIX}${String(merchantId || "")}`;
}

export function parseMerchantOfferMessage(text) {
  const value = String(text || "");
  if (!value.startsWith(MERCHANT_OFFER_PREFIX)) return null;
  const merchantId = value.slice(MERCHANT_OFFER_PREFIX.length).trim();
  return merchantId ? { merchantId } : null;
}
