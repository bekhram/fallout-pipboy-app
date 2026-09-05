export const CRAFTING_MATERIAL_ITEMS = [
  { name: "Common Materials", category: "junk", sourceType: "crafting_material", materialTier: "common", weight: "1", cost: "1", effect: "Common crafting material unit." },
  { name: "Uncommon Materials", category: "junk", sourceType: "crafting_material", materialTier: "uncommon", weight: "1", cost: "3", effect: "Uncommon crafting material unit." },
  { name: "Rare Materials", category: "junk", sourceType: "crafting_material", materialTier: "rare", weight: "1", cost: "5", effect: "Rare crafting material unit." },
];

const LOCALIZED = {
  ru: {
    common: ["Обычные материалы", "Единица обычных материалов для крафта."],
    uncommon: ["Необычные материалы", "Единица необычных материалов для крафта."],
    rare: ["Редкие материалы", "Единица редких материалов для крафта."],
  },
  uk: {
    common: ["Звичайні матеріали", "Одиниця звичайних матеріалів для крафту."],
    uncommon: ["Незвичайні матеріали", "Одиниця незвичайних матеріалів для крафту."],
    rare: ["Рідкісні матеріали", "Одиниця рідкісних матеріалів для крафту."],
  },
  pl: {
    common: ["Materiały pospolite", "Jednostka pospolitych materiałów do rzemiosła."],
    uncommon: ["Materiały niepospolite", "Jednostka niepospolitych materiałów do rzemiosła."],
    rare: ["Materiały rzadkie", "Jednostka rzadkich materiałów do rzemiosła."],
  },
};

export function getLocalizedCraftingMaterial(item, language = "en") {
  if (item?.sourceType !== "crafting_material") return null;
  const lang = String(language || "en").split("-")[0];
  const row = LOCALIZED[lang]?.[item.materialTier];
  if (!row) return { displayName: item.name, displayEffect: item.effect };
  return { displayName: row[0], displayEffect: row[1] };
}
