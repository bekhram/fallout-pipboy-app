export const RULEBOOK_BUILDINGS = {
  small_house: { materials: { common: 40 }, constructionDays: 4, effects: { roomCapacity: 1 }, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  large_house: { materials: { common: 60 }, constructionDays: 8, effects: { roomCapacity: 3 }, skill: { name: "Repair", rank: 3 }, rarity: "common" },
  barracks: { materials: { common: 50 }, constructionDays: 6, effects: { roomCapacity: 2 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  crop_field: { materials: { common: 4 }, constructionDays: 1, effects: { cropSlots: 4 }, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  greenhouse: { materials: { common: 4 }, constructionDays: 1, effects: { cropSlots: 4 }, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  brahmin_pen: { materials: { common: 10 }, constructionDays: 2, effects: { brahminCapacity: 2 }, skill: { name: "Survival", rank: 2 }, rarity: "common" },
  water_pump: { materials: { common: 5, uncommon: 1 }, constructionDays: 2, effects: { water: 3 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  water_purifier: { materials: { common: 19, uncommon: 4 }, constructionDays: 4, effects: { water: 10, requiresPower: 2 }, skill: { name: "Repair", rank: 4 }, rarity: "common" },
  powered_water_pump: { materials: { common: 25, uncommon: 12 }, constructionDays: 3, effects: { water: 10, requiresPower: 4, looseDirt: true }, skill: { name: "Repair", rank: 4 }, rarity: "common" },
  industrial_water_purifier: { materials: { common: 36, uncommon: 14 }, constructionDays: 6, effects: { water: 40, requiresPower: 5, requiresWaterPlacement: true }, perk: { name: "Science!", rank: 1 }, skill: { name: "Science", rank: 3 }, rarity: "uncommon" },
  water_tower: { materials: { common: 25, uncommon: 12 }, constructionDays: 3, effects: { water: 10, requiresPower: 4, looseDirt: true }, skill: { name: "Repair", rank: 4 }, rarity: "common", legacyAlias: true },

  windmill: { materials: { common: 15, uncommon: 16 }, constructionDays: 4, effects: { power: 3 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  generator: { materials: { common: 7, uncommon: 4 }, constructionDays: 5, effects: { power: 3 }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  generator_medium: { materials: { common: 11, uncommon: 9 }, constructionDays: 8, effects: { power: 5, noisy: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },
  generator_large: { materials: { common: 4, uncommon: 33, rare: 3 }, constructionDays: 12, effects: { power: 10, noisy: true }, perk: { name: "Science!", rank: 1 }, skill: { name: "Science", rank: 3 }, rarity: "uncommon" },
  fusion_reactor: { materials: { common: 2, uncommon: 67, rare: 20 }, constructionDays: 30, effects: { power: 100 }, perk: { name: "Science!", rank: 4 }, skill: { name: "Science", rank: 4 }, rarity: "uncommon" },
  power_pylon: { materials: { common: 12, uncommon: 4 }, constructionDays: 1, effects: { transmitsPower: true }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  lights: { materials: { common: 2, uncommon: 2 }, constructionDays: 1, effects: { happiness: 1, needsPowerConnection: true }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  radio_beacon: { materials: { common: 14, uncommon: 6, rare: 4 }, constructionDays: 3, effects: { requiresPower: 1, attractsPeople: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },

  workshop: { materials: { common: 10, uncommon: 14 }, constructionDays: 2, effects: { crafting: true, craftingType: "weapons" }, perk: { name: "Local Leader", rank: 2 }, skill: { name: "Repair", rank: 3 }, rarity: "uncommon", legacyAlias: true },
  armor_workbench: {
    materials: { common: 3, uncommon: 21 }, constructionDays: 2,
    effects: { crafting: true, craftingType: "armor" },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Armorer", rank: 1 }],
    skill: { name: "Repair", rank: 3 }, rarity: "uncommon",
  },
  chemistry_station: {
    materials: { common: 14, uncommon: 14 }, constructionDays: 2,
    effects: { crafting: true, craftingType: "chemistry" },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Chemist", rank: 1 }],
    skill: { name: "Science", rank: 3 }, rarity: "uncommon",
  },
  cooking_station: {
    materials: { common: 8, uncommon: 6 }, constructionDays: 1,
    effects: { crafting: true, craftingType: "cooking" },
    perk: { name: "Local Leader", rank: 2 },
    skill: { name: "Survival", rank: 1 }, rarity: "uncommon",
  },
  power_armor_station: {
    materials: { common: 4, uncommon: 32, rare: 3 }, constructionDays: 3,
    effects: { crafting: true, craftingType: "power_armor" },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Armorer", rank: 2 }],
    skill: { name: "Science", rank: 3 }, rarity: "uncommon",
  },
  weapons_workbench: {
    materials: { common: 10, uncommon: 14 }, constructionDays: 2,
    effects: { crafting: true, craftingType: "weapons" },
    perk: { name: "Local Leader", rank: 2 },
    perkAnyOf: [{ name: "Blacksmith", rank: 1 }, { name: "Gun Nut", rank: 1 }],
    skill: { name: "Repair", rank: 3 }, rarity: "uncommon",
  },
  robot_workbench: {
    materials: { common: 18, uncommon: 36, rare: 6 }, constructionDays: 4,
    effects: { crafting: true, craftingType: "robots" },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Robotics Expert", rank: 2 }],
    skills: [{ name: "Repair", rank: 2 }, { name: "Science", rank: 2 }], rarity: "uncommon",
  },
  scrap_yard: { materials: { common: 8 }, constructionDays: 1, effects: { improvedScavenging: true, scavengingRerolls: 3 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  warehouse: { materials: { common: 24 }, constructionDays: 6, effects: { storageLbs: 300 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },

  trading_post: {
    materials: { common: 8 }, caps: 300, constructionDays: 1,
    effects: { happiness: 1, income: 1, store: true, storeFamily: "trading", storeTier: 1 },
    perk: { name: "Local Leader", rank: 2 }, skill: { name: "Barter", rank: 2 }, rarity: "uncommon",
  },
  trading_shop: {
    materials: { common: 8 }, caps: 600, constructionDays: 2,
    effects: { happiness: 2, income: 2, store: true, storeFamily: "trading", storeTier: 2 },
    perk: { name: "Local Leader", rank: 2 }, skill: { name: "Barter", rank: 3 }, rarity: "uncommon",
  },
  trading_emporium: {
    materials: { common: 8 }, caps: 1500, constructionDays: 3,
    effects: { happiness: 3, income: 3, store: true, storeFamily: "trading", storeTier: 3, salvageBonusDice: 1 },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Cap Collector", rank: 1 }],
    skill: { name: "Barter", rank: 4 }, rarity: "uncommon",
  },
  first_aid_station: {
    materials: { common: 8 }, caps: 300, constructionDays: 1,
    effects: { happiness: 1, income: 1, store: true, storeFamily: "medical", storeTier: 1, medical: true },
    perk: { name: "Local Leader", rank: 2 }, skills: [{ name: "Barter", rank: 1 }, { name: "Medicine", rank: 2 }], rarity: "uncommon",
  },
  clinic: {
    materials: { common: 8 }, caps: 600, constructionDays: 2,
    effects: { happiness: 2, income: 2, store: true, storeFamily: "medical", storeTier: 2, medical: true },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Medic", rank: 1 }],
    skills: [{ name: "Barter", rank: 2 }, { name: "Medicine", rank: 3 }], rarity: "uncommon",
  },
  surgery_center: {
    materials: { common: 8 }, caps: 1500, constructionDays: 3,
    effects: { happiness: 3, income: 3, store: true, storeFamily: "medical", storeTier: 3, medical: true, salvageBonusDice: 1 },
    perks: [{ name: "Local Leader", rank: 2 }, { name: "Medic", rank: 1 }, { name: "Cap Collector", rank: 1 }],
    skills: [{ name: "Barter", rank: 3 }, { name: "Medicine", rank: 4 }], rarity: "uncommon",
  },
  caravan_post: { materials: { common: 5 }, constructionDays: 1, effects: { tradeOutpost: true, traderIntervalDays: 7 }, skill: { name: "Speech", rank: 2 }, rarity: "rare" },

  guard_post: { materials: { common: 14 }, constructionDays: 2, effects: { guardActionDefenseBonus: 1 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  siren: { materials: { common: 10, uncommon: 6 }, constructionDays: 2, effects: { requiresPower: 1, defensePerGuardPost: 1, transmitsPower: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },
  turret: { materials: { common: 8, uncommon: 4, rare: 1 }, constructionDays: 2, effects: { defense: 3 }, skill: { name: "Repair", rank: 3 }, rarity: "common" },
  machine_gun_turret: { materials: { common: 8, uncommon: 4, rare: 1 }, constructionDays: 2, effects: { defense: 3 }, skill: { name: "Repair", rank: 3 }, rarity: "common" },
  heavy_machine_gun_turret: { materials: { common: 10, uncommon: 6, rare: 2 }, constructionDays: 3, effects: { defense: 4 }, perk: { name: "Gun Nut", rank: 1 }, skill: { name: "Repair", rank: 4 }, rarity: "uncommon" },
  laser_turret: { materials: { common: 5, uncommon: 13, rare: 9 }, constructionDays: 4, effects: { requiresPower: 1, defense: 4 }, perk: { name: "Science!", rank: 1 }, skill: { name: "Science", rank: 3 }, rarity: "uncommon" },
  heavy_laser_turret: { materials: { common: 3, uncommon: 14, rare: 16 }, constructionDays: 4, effects: { requiresPower: 2, defense: 6 }, perk: { name: "Science!", rank: 3 }, skill: { name: "Science", rank: 4 }, rarity: "uncommon" },
  shotgun_turret: { materials: { common: 6, uncommon: 17, rare: 5 }, constructionDays: 4, effects: { requiresPower: 1, defense: 4 }, perk: { name: "Gun Nut", rank: 2 }, skill: { name: "Repair", rank: 4 }, rarity: "uncommon" },
  spotlight_turret: { materials: { common: 6, uncommon: 7, rare: 1 }, constructionDays: 2, effects: { requiresPower: 1, defense: 1 }, skill: { name: "Science", rank: 2 }, rarity: "common" },

  watchtower: { materials: { common: 14 }, constructionDays: 2, effects: { guardActionDefenseBonus: 1 }, skill: { name: "Repair", rank: 2 }, rarity: "common", legacyAlias: true },
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
