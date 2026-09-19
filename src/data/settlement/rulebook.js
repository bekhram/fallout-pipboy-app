export const SETTLEMENT_RULEBOOK = {
  people: {
    maxBase: 10,
    maxFormula: "10 + leader CHA",
  },
  happiness: {
    min: 1,
    max: 20,
  },
  stockpile: {
    baseCapacityLbs: 300,
  },
  needs: ["beds", "food", "water", "defense"],
};

export const SETTLEMENT_ACTIONS = {
  hunting_gathering: {
    id: "hunting_gathering",
    alwaysAvailable: true,
    name: { en: "Hunting & Gathering", ru: "Охота и собирательство", uk: "Полювання та збиральництво", pl: "Polowanie i zbieractwo" },
    summary: "Roll 3 CD; total rolled adds to next day's Food. Each Effect also adds one random foraging item. Each additional worker adds +1 CD.",
  },
  scavenging: {
    id: "scavenging",
    alwaysAvailable: true,
    name: { en: "Scavenging", ru: "Поиск припасов", uk: "Пошук припасів", pl: "Poszukiwanie zapasów" },
    summary: "Roll 3 CD; gain Common Materials equal to total rolled and one Uncommon Material per Effect. Each additional worker adds +1 CD.",
  },
  guard: {
    id: "guard",
    alwaysAvailable: true,
    name: { en: "Guard", ru: "Охрана", uk: "Охорона", pl: "Warta" },
    summary: "An armed settler patrols the settlement, adding +1 Defense for the day. Guard Posts/Towers may increase this bonus.",
  },
  build: {
    id: "build",
    alwaysAvailable: true,
    name: { en: "Build", ru: "Строительство", uk: "Будівництво", pl: "Budowa" },
    summary: "Workers contribute settlement-days to construction. Multiple workers divide the required construction time.",
  },
  tend_crops: {
    id: "tend_crops",
    requires: "crops",
    name: { en: "Tend Crops", ru: "Уход за посевами", uk: "Догляд за посівами", pl: "Uprawa roślin" },
    summary: "One settler can tend up to six crops per day; every two crops tended add +1 Food for the next day, rounded down.",
  },
  trade_caravan: {
    id: "trade_caravan",
    requires: "trade_outpost",
    name: { en: "Trade Caravan", ru: "Торговый караван", uk: "Торговий караван", pl: "Karawana handlowa" },
  },
  business: {
    id: "business",
    requires: "store",
    name: { en: "Business", ru: "Работа в магазине", uk: "Робота в крамниці", pl: "Prowadzenie sklepu" },
  },
};

export const STRUCTURES = {
  small_shack: { materials: { common: 40 }, constructionDays: 4, rooms: 1, skill: { name: "Repair", rank: 1 }, rarity: "common" },
  medium_shack: { materials: { common: 50 }, constructionDays: 6, rooms: 2, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  large_shack: { materials: { common: 60 }, constructionDays: 8, rooms: 3, skill: { name: "Repair", rank: 3 }, rarity: "common" },
};

export const ROOMS = {
  private_room: { materials: { common: 25 }, constructionDays: 5, effects: { beds: 1, happiness: 1, storageLbs: 100 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  dormitory: { materials: { common: 27 }, constructionDays: 6, effects: { beds: 4, happiness: -1 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  quarters: { materials: { common: 26 }, constructionDays: 6, effects: { beds: 2, storageLbs: 100 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  lounge: { materials: { common: 28 }, constructionDays: 5, effects: { happiness: 2 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  storage: { materials: { common: 24 }, constructionDays: 6, effects: { storageLbs: 300 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  office: { materials: { common: 26 }, constructionDays: 6, effects: { happiness: 1, storageLbs: 100, office: true }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
};

export const POWER_OBJECTS = {
  windmill: { materials: { common: 15, uncommon: 16 }, constructionDays: 4, effects: { power: 3 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  small_generator: { materials: { common: 7, uncommon: 4 }, constructionDays: 5, effects: { power: 3 }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  medium_generator: { materials: { common: 11, uncommon: 9 }, constructionDays: 8, effects: { power: 5, noisy: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },
  large_generator: { materials: { common: 4, uncommon: 33, rare: 3 }, constructionDays: 12, effects: { power: 10, noisy: true }, perk: { name: "Science!", rank: 1 }, skill: { name: "Science", rank: 3 }, rarity: "uncommon" },
  fusion_reactor: { materials: { common: 2, uncommon: 67, rare: 20 }, constructionDays: 30, effects: { power: 100 }, perk: { name: "Science!", rank: 4 }, skill: { name: "Science", rank: 4 }, rarity: "uncommon" },
  power_pylon: { materials: { common: 12, uncommon: 4 }, constructionDays: 1, effects: { transmitsPower: true }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  lights: { materials: { common: 2, uncommon: 2 }, constructionDays: 1, effects: { happiness: 1, needsPowerConnection: true }, skill: { name: "Science", rank: 2 }, rarity: "common" },
  radio_beacon: { materials: { common: 14, uncommon: 6, rare: 4 }, constructionDays: 3, effects: { requiresPower: 1, attractsPeople: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },
};

export const DEFENSE_OBJECTS = {
  guard_post: { materials: { common: 14 }, constructionDays: 2, effects: { guardActionDefenseBonus: 1 }, skill: { name: "Repair", rank: 2 }, rarity: "common" },
  siren: { materials: { common: 10, uncommon: 6 }, constructionDays: 2, effects: { requiresPower: 1, defensePerGuardPost: 1, transmitsPower: true }, skill: { name: "Science", rank: 3 }, rarity: "common" },
  machine_gun_turret: { materials: { common: 8, uncommon: 4, rare: 1 }, constructionDays: 2, effects: { defense: 3 }, skill: { name: "Repair", rank: 3 }, rarity: "common" },
  heavy_machine_gun_turret: { materials: { common: 10, uncommon: 6, rare: 2 }, constructionDays: 3, effects: { defense: 4 }, perk: { name: "Gun Nut", rank: 1 }, skill: { name: "Repair", rank: 4 }, rarity: "uncommon" },
  laser_turret: { materials: { common: 5, uncommon: 13, rare: 9 }, constructionDays: 4, effects: { requiresPower: 1, defense: 4 }, perk: { name: "Science!", rank: 1 }, skill: { name: "Science", rank: 3 }, rarity: "uncommon" },
  heavy_laser_turret: { materials: { common: 3, uncommon: 14, rare: 16 }, constructionDays: 4, effects: { requiresPower: 2, defense: 6 }, perk: { name: "Science!", rank: 3 }, skill: { name: "Science", rank: 4 }, rarity: "uncommon" },
  shotgun_turret: { materials: { common: 6, uncommon: 17, rare: 5 }, constructionDays: 4, effects: { requiresPower: 1, defense: 4 }, perk: { name: "Gun Nut", rank: 2 }, skill: { name: "Repair", rank: 4 }, rarity: "uncommon" },
  spotlight_turret: { materials: { common: 6, uncommon: 7, rare: 1 }, constructionDays: 2, effects: { requiresPower: 1, defense: 1 }, skill: { name: "Science", rank: 2 }, rarity: "common" },
};

export function settlementRuleName(definition, language = "en") {
  const key = String(language || "en").split("-")[0];
  return definition?.name?.[key] || definition?.name?.en || definition?.id || "";
}
