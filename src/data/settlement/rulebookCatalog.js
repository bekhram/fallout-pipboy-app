export const RULEBOOK_BUILDINGS = {
  small_house: { materials: { common: 40 }, constructionDays: 4, effects: { roomCapacity: 1 }, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  large_house: { materials: { common: 60 }, constructionDays: 8, effects: { roomCapacity: 3 }, skill: { name: "Repair", rank: 3 }, rarity: "common" },
  barracks: { materials: { common: 50 }, constructionDays: 6, effects: { roomCapacity: 2 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  crop_field: { materials: { common: 4 }, constructionDays: 1, effects: { cropSlots: 4 }, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  greenhouse: { materials: { common: 4 }, constructionDays: 1, effects: { cropSlots: 4 }, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  brahmin_pen: { materials: { common: 10 }, constructionDays: 2, effects: { brahminCapacity: 2 }, skill: { name: "Survival", rank: 2 }, rarity: "common" },
  water_pump: { materials: { common: 5, uncommon: 1 }, constructionDays: 2, effects: { water: 3 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  water_purifier: { materials: { common: 19, uncommon: 4 }, constructionDays: 4, effects: { water: 10, requiresPower: 2 }, skill: { name: "Repair", rank: 4 }, rarity: "common" },
  water_tower: { materials: { common: 25, uncommon: 12 }, constructionDays: 3, effects: { water: 10, requiresPower: 4 }, skill: { name: "Repair", rank: 4 }, rarity: "common" },

  windmill: { materials: { common: 15, uncommon: 16 }, constructionDays: 4, effects: { power: 3 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  generator: { materials: { common: 7, uncommon: 4 }, constructionDays: 5, effects: { power: 3 }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  generator_medium: { materials: { common: 11, uncommon: 9 }, constructionDays: 8, effects: { power: 5, noisy: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },
  generator_large: { materials: { common: 4, uncommon: 33, rare: 3 }, constructionDays: 12, effects: { power: 10, noisy: true }, perk: { name: "Science!", rank: 1 }, skill: { name: "Science", rank: 3 }, rarity: "uncommon" },
  fusion_reactor: { materials: { common: 2, uncommon: 67, rare: 20 }, constructionDays: 30, effects: { power: 100 }, perk: { name: "Science!", rank: 4 }, skill: { name: "Science", rank: 4 }, rarity: "uncommon" },
  power_pylon: { materials: { common: 12, uncommon: 4 }, constructionDays: 1, effects: { transmitsPower: true }, skill: { name: "Science", rank: 1 }, rarity: "common" },
  lights: { materials: { common: 2, uncommon: 2 }, constructionDays: 1, effects: { happiness: 1, requiresPower: 1 }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  radio_beacon: { materials: { common: 14, uncommon: 6, rare: 4 }, constructionDays: 3, effects: { requiresPower: 1, attractsPeople: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },

  workshop: { materials: { common: 10, uncommon: 14 }, constructionDays: 2, effects: { crafting: true }, perk: { name: "Local Leader", rank: 2 }, skill: { name: "Repair", rank: 3 }, rarity: "uncommon" },
  scrap_yard: { materials: { common: 8 }, constructionDays: 1, effects: { improvedScavenging: true }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  warehouse: { materials: { common: 24 }, constructionDays: 6, effects: { storageLbs: 300 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  trading_post: { materials: { common: 8 }, caps: 300, constructionDays: 1, effects: { happiness: 1, income: 1, store: true }, perk: { name: "Local Leader", rank: 2 }, skill: { name: "Barter", rank: 2 }, rarity: "uncommon" },
  caravan_post: { materials: { common: 5 }, constructionDays: 1, effects: { tradeOutpost: true }, rarity: "rare" },
  clinic: { materials: { common: 8 }, caps: 600, constructionDays: 2, effects: { happiness: 2, income: 2, store: true, medical: true }, perk: { name: "Local Leader", rank: 2 }, skill: { name: "Medicine", rank: 3 }, rarity: "uncommon" },
  guard_post: { materials: { common: 14 }, constructionDays: 2, effects: { guardActionDefenseBonus: 1 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  watchtower: { materials: { common: 14 }, constructionDays: 2, effects: { guardActionDefenseBonus: 1 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  turret: { materials: { common: 8, uncommon: 4, rare: 1 }, constructionDays: 2, effects: { defense: 3 }, skill: { name: "Repair", rank: 3 }, rarity: "common" },
  wall_straight: { materials: { common: 3 }, constructionDays: 1, effects: {}, rarity: "common" },
  wall_corner: { materials: { common: 3 }, constructionDays: 1, effects: {}, rarity: "common" },
  gate: { materials: { common: 6 }, constructionDays: 1, effects: {}, rarity: "common" },
};

export function getRulebookBuilding(id) {
  return RULEBOOK_BUILDINGS[id] || null;
}

export function formatRulebookCost(rule = {}) {
  const materials = rule.materials || {};
  return [
    materials.common ? `${materials.common}C` : null,
    materials.uncommon ? `${materials.uncommon}U` : null,
    materials.rare ? `${materials.rare}R` : null,
    rule.caps ? `${rule.caps} caps` : null,
  ].filter(Boolean).join(" · ");
}
