export const LOOT_TYPE_COPY = {
  weapon: { en: "Weapon", ru: "Оружие", uk: "Зброя", pl: "Broń" },
  armor: { en: "Armor", ru: "Броня", uk: "Броня", pl: "Pancerz" },
  ammo: { en: "Ammo", ru: "Патроны", uk: "Набої", pl: "Amunicja" },
  aid: { en: "Aid", ru: "Помощь", uk: "Допомога", pl: "Pomoc" },
  junk: { en: "Junk", ru: "Хлам", uk: "Мотлох", pl: "Złom" },
  mod: { en: "Mod", ru: "Мод", uk: "Мод", pl: "Mod" },
  special: { en: "Special", ru: "Особое", uk: "Особливе", pl: "Specjalne" },
  caps: { en: "Caps", ru: "Крышки", uk: "Кришки", pl: "Kapsle" },
};

const INVENTORY_CATEGORY_BY_LOOT_TYPE = {
  weapon: "weapons",
  armor: "armor",
  ammo: "ammo",
  aid: "aid",
  junk: "junk",
  mod: "misc",
  special: "misc",
  caps: "misc",
};

const SOURCE_TYPE_BY_LOOT_TYPE = {
  weapon: "weapon",
  armor: "armor",
  ammo: "ammo",
  aid: "loot",
  junk: "loot",
  mod: "mod",
  special: "special",
  caps: "caps",
};

function langCode(language) {
  return String(language || "en").toLowerCase().split("-")[0];
}

export function getLootTypeLabel(type, language = "en") {
  const lang = langCode(language);
  return LOOT_TYPE_COPY[type]?.[lang] || LOOT_TYPE_COPY[type]?.en || type;
}

function cleanField(value, fallback = "0") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function formatLootChatMessage(item, language = "en") {
  const type = String(item?.lootType || item?.type || "special").toLowerCase();
  const label = getLootTypeLabel(type, language);
  const quantity = Math.max(1, Number(item?.quantity || 1));
  const quantityText = quantity > 1 ? ` ×${quantity}` : "";
  const cost = cleanField(item?.cost ?? item?.price, "-");
  const weight = cleanField(item?.weight, "0");
  const rarity = Math.max(0, Math.min(7, Number(item?.rarity || 0)));
  return `🎁 [${label}] ${String(item?.name || "Loot")}${quantityText} — 💰${cost} · ⚖${weight} · R${rarity}`;
}

function lootTypeFromLabel(label) {
  const target = String(label || "").trim().toLowerCase();
  for (const [type, translations] of Object.entries(LOOT_TYPE_COPY)) {
    if (Object.values(translations).some((value) => String(value).toLowerCase() === target)) {
      return type;
    }
  }
  return "special";
}

export function parseLootChatMessage(text) {
  const source = String(text || "").trim();
  if (!source.startsWith("🎁 [")) return null;

  const labelEnd = source.indexOf("] ");
  const metaStart = source.lastIndexOf(" — 💰");
  if (labelEnd < 3 || metaStart <= labelEnd) return null;

  const label = source.slice(4, labelEnd).trim();
  let nameAndQuantity = source.slice(labelEnd + 2, metaStart).trim();
  const meta = source.slice(metaStart + 5);
  const parts = meta.split(" · ");
  if (parts.length < 3) return null;

  const quantityMatch = nameAndQuantity.match(/\s×(\d+)$/);
  const quantity = quantityMatch ? Math.max(1, Number(quantityMatch[1])) : 1;
  if (quantityMatch) nameAndQuantity = nameAndQuantity.slice(0, quantityMatch.index).trim();

  const cost = String(parts[0] || "").trim() || "-";
  const weight = String(parts[1] || "").replace(/^⚖/, "").trim() || "0";
  const rarity = Math.max(0, Math.min(7, Number(String(parts[2] || "").replace(/^R/i, "")) || 0));
  const lootType = lootTypeFromLabel(label);

  return {
    label,
    item: {
      id: `loot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: nameAndQuantity || "Loot",
      quantity: String(quantity),
      cost,
      weight,
      rarity: String(rarity),
      category: INVENTORY_CATEGORY_BY_LOOT_TYPE[lootType] || "misc",
      sourceType: SOURCE_TYPE_BY_LOOT_TYPE[lootType] || "loot",
      sourceId: null,
      effect: "",
      lootType,
    },
  };
}
