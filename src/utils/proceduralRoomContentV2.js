import {
  balanceEncounterEnemies,
  summarizeEncounter,
} from "./proceduralEncounterBalance.js";

const LANGS = ["en", "ru", "uk", "pl"];
const LOOT_RARITIES = ["common", "uncommon", "rare", "legendary"];
const WEALTH_LEVELS = ["poor", "standard", "rich", "wealthy"];

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return LANGS.includes(code) ? code : "en";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizedLootConfig(spec = {}) {
  return {
    lootRarity: LOOT_RARITIES.includes(spec.lootRarity) ? spec.lootRarity : "uncommon",
    wealth: WEALTH_LEVELS.includes(spec.wealth) ? spec.wealth : "standard",
  };
}

function rngFor(spec, roomId) {
  const { lootRarity, wealth } = normalizedLootConfig(spec);
  return mulberry32(hashSeed(`${spec?.type || "wasteland"}:${spec?.seed || "1"}:${roomId}:${lootRarity}:${wealth}:room-content-v2`));
}

function pick(rng, values) {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

function chance(rng, probability) {
  return rng() < probability;
}

function int(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const COPY = {
  en: {
    enemies: "Enemies", loot: "Loot", terminal: "Terminal", safe: "Safe", vending: "Vending machine", workbench: "Workbench", hazard: "Hazard", special: "Special", empty: "Nothing notable",
    level: "Lvl", xpEach: "XP each",
    terminalEffects: {
      turrets_off: "disables the security turrets", secret_door: "opens a hidden maintenance door", storage_door: "unlocks the secured storage room", safe_unlock: "remotely unlocks the office safe", power_restore: "restores power to this section", alarm_off: "disables the alarm system", logs: "contains pre-war logs and local records",
    },
    safeCheck: (d) => `Lockpick D${d}`,
    vendingStatus: { working: "working", damaged: "damaged", empty: "empty" },
    stock: "Stock", contains: "Contains", available: "available",
  },
  ru: {
    enemies: "Враги", loot: "Лут", terminal: "Терминал", safe: "Сейф", vending: "Вендинг-аппарат", workbench: "Верстак", hazard: "Опасность", special: "Особое", empty: "Ничего примечательного",
    level: "Ур.", xpEach: "XP за каждого",
    terminalEffects: {
      turrets_off: "отключает охранные турели", secret_door: "открывает скрытую техническую дверь", storage_door: "отпирает защищённый склад", safe_unlock: "удалённо открывает офисный сейф", power_restore: "восстанавливает питание в этой секции", alarm_off: "отключает систему тревоги", logs: "содержит довоенные записи и локальные журналы",
    },
    safeCheck: (d) => `Взлом: Lockpick D${d}`,
    vendingStatus: { working: "работает", damaged: "повреждён", empty: "пуст" },
    stock: "Внутри", contains: "Содержимое", available: "доступен",
  },
  uk: {
    enemies: "Вороги", loot: "Лут", terminal: "Термінал", safe: "Сейф", vending: "Вендінг-автомат", workbench: "Верстак", hazard: "Небезпека", special: "Особливе", empty: "Нічого примітного",
    level: "Рів.", xpEach: "XP за кожного",
    terminalEffects: {
      turrets_off: "вимикає охоронні турелі", secret_door: "відкриває приховані технічні двері", storage_door: "відмикає захищений склад", safe_unlock: "віддалено відкриває офісний сейф", power_restore: "відновлює живлення в цій секції", alarm_off: "вимикає систему тривоги", logs: "містить довоєнні записи та локальні журнали",
    },
    safeCheck: (d) => `Злам: Lockpick D${d}`,
    vendingStatus: { working: "працює", damaged: "пошкоджений", empty: "порожній" },
    stock: "Всередині", contains: "Вміст", available: "доступний",
  },
  pl: {
    enemies: "Wrogowie", loot: "Łup", terminal: "Terminal", safe: "Sejf", vending: "Automat", workbench: "Warsztat", hazard: "Zagrożenie", special: "Specjalne", empty: "Nic szczególnego",
    level: "Poz.", xpEach: "XP za każdego",
    terminalEffects: {
      turrets_off: "wyłącza wieżyczki ochronne", secret_door: "otwiera ukryte drzwi techniczne", storage_door: "odblokowuje zabezpieczony magazyn", safe_unlock: "zdalnie otwiera sejf w biurze", power_restore: "przywraca zasilanie tej sekcji", alarm_off: "wyłącza alarm", logs: "zawiera przedwojenne logi i lokalne zapisy",
    },
    safeCheck: (d) => `Lockpick D${d}`,
    vendingStatus: { working: "działa", damaged: "uszkodzony", empty: "pusty" },
    stock: "Zawartość", contains: "Zawiera", available: "dostępny",
  },
};

const ROOM_NAMES = {
  en: { ruins: "Ruins", wreck: "Wreck", camp: "Camp", store: "Store", garage: "Garage", office: "Office", storage: "Storage", wc: "WC", sales: "Sales Floor", barrack: "Barracks", boss: "Boss Shack", workshop: "Workshop", courtyard: "Courtyard", armory: "Armory", control: "Control Room", barracks: "Barracks", generator: "Generator", medical: "Medical" },
  ru: { ruins: "Руины", wreck: "Обломки", camp: "Лагерь", store: "Магазин", garage: "Гараж", office: "Офис", storage: "Склад", wc: "Туалет", sales: "Торговый зал", barrack: "Барак", boss: "Хижина босса", workshop: "Мастерская", courtyard: "Двор", armory: "Оружейная", control: "Комната управления", barracks: "Казарма", generator: "Генераторная", medical: "Медблок" },
  uk: { ruins: "Руїни", wreck: "Уламки", camp: "Табір", store: "Магазин", garage: "Гараж", office: "Офіс", storage: "Склад", wc: "Туалет", sales: "Торгова зала", barrack: "Барак", boss: "Хатина боса", workshop: "Майстерня", courtyard: "Двір", armory: "Збройова", control: "Кімната керування", barracks: "Казарма", generator: "Генераторна", medical: "Медблок" },
  pl: { ruins: "Ruiny", wreck: "Wrak", camp: "Obóz", store: "Sklep", garage: "Garaż", office: "Biuro", storage: "Magazyn", wc: "WC", sales: "Sala sprzedaży", barrack: "Barak", boss: "Chata bossa", workshop: "Warsztat", courtyard: "Dziedziniec", armory: "Zbrojownia", control: "Sterownia", barracks: "Koszary", generator: "Generator", medical: "Ambulatorium" },
};

const FOOD = ["Sugar Bombs", "InstaMash", "Cram", "Salisbury Steak", "Dandy Boy Apples", "Fancy Lads Snack Cakes", "BlamCo Mac & Cheese"];
const DRINKS = ["Nuka-Cola", "Nuka-Cherry", "Purified Water", "Dirty Water", "Sunset Sarsaparilla"];
const AMMO = [".38 rounds", "10mm rounds", ".45 rounds", "5mm rounds", "shotgun shells", "fusion cell", "2mm EC"];
const MEDS = ["bandages", "Stimpak", "Rad-X", "RadAway", "Med-X", "Stealth Boy"];
const JUNK = ["desk fan", "typewriter", "duct tape", "wrench", "wonderglue", "circuitry", "aluminum tray"];
const WEAPONS = ["pipe pistol", "combat knife", "10mm pistol", "double-barrel shotgun", "laser pistol", "combat shotgun", "plasma rifle", "Gauss rifle"];

const ITEM_RARITY = {
  ".38 rounds": "common", "10mm rounds": "common", ".45 rounds": "uncommon", "5mm rounds": "uncommon", "shotgun shells": "uncommon", "fusion cell": "rare", "2mm EC": "legendary",
  bandages: "common", Stimpak: "uncommon", "Rad-X": "uncommon", RadAway: "uncommon", "Med-X": "rare", "Stealth Boy": "rare",
  "pipe pistol": "common", "combat knife": "common", "10mm pistol": "uncommon", "double-barrel shotgun": "uncommon", "laser pistol": "rare", "combat shotgun": "rare", "plasma rifle": "legendary", "Gauss rifle": "legendary",
  "Nuka-Cherry": "uncommon", circuitry: "uncommon", wonderglue: "uncommon",
};

const WEALTH_MULTIPLIER = { poor: 0.6, standard: 1, rich: 1.5, wealthy: 2 };

function rarityIndex(value) {
  return Math.max(0, LOOT_RARITIES.indexOf(value));
}

function itemRarity(item) {
  return ITEM_RARITY[item] || "common";
}

function filteredPool(pool, spec) {
  const { lootRarity } = normalizedLootConfig(spec);
  const max = rarityIndex(lootRarity);
  const result = [...new Set(pool)].filter((item) => rarityIndex(itemRarity(item)) <= max);
  return result.length ? result : [...new Set(pool)].filter((item) => itemRarity(item) === "common");
}

function scaledCount(value, spec, min = 1) {
  const { wealth } = normalizedLootConfig(spec);
  return Math.max(min, Math.round(value * (WEALTH_MULTIPLIER[wealth] || 1)));
}

function lootList(rng, pool, spec, min = 1, max = 3) {
  const source = filteredPool(pool, spec);
  const low = Math.min(source.length, scaledCount(min, spec, min > 0 ? 1 : 0));
  const high = Math.min(source.length, Math.max(low, scaledCount(max, spec, low)));
  const count = source.length ? int(rng, low, high) : 0;
  const result = [];
  const candidates = [...source];
  while (result.length < count && candidates.length) {
    const index = int(rng, 0, candidates.length - 1);
    result.push(candidates.splice(index, 1)[0]);
  }
  return result;
}

function makeTerminal(rng, allowedEffects) {
  return { effect: pick(rng, allowedEffects), difficulty: int(rng, 1, 3) };
}

function makeSafe(rng, spec, tier = 1) {
  const { wealth, lootRarity } = normalizedLootConfig(spec);
  const rarityBonus = Math.min(2, rarityIndex(lootRarity));
  const difficulty = clamp(tier + (chance(rng, 0.35) ? 1 : 0) + (rarityBonus >= 2 && chance(rng, 0.25) ? 1 : 0), 1, 3);
  const wealthMult = WEALTH_MULTIPLIER[wealth] || 1;
  const caps = Math.max(1, Math.round(int(rng, 12 * difficulty, 35 * difficulty) * wealthMult));
  const contents = [`${caps} caps`, ...lootList(rng, [...AMMO, ...MEDS, ...WEAPONS], spec, 1, Math.min(4, difficulty + 1))];
  return { difficulty, contents };
}

function makeVending(rng, spec) {
  const { wealth } = normalizedLootConfig(spec);
  const emptyChance = wealth === "poor" ? 0.32 : wealth === "wealthy" ? 0.06 : wealth === "rich" ? 0.1 : 0.15;
  const damagedChance = wealth === "poor" ? 0.35 : 0.2;
  const roll = rng();
  const status = roll < emptyChance ? "empty" : roll < emptyChance + damagedChance ? "damaged" : "working";
  const stock = status === "empty" ? [] : lootList(rng, [...FOOD, ...DRINKS], spec, 2, status === "working" ? 6 : 3);
  return { status, stock };
}

function room(id, extras = {}) {
  return { id, markers: [], enemies: [], loot: [], terminal: null, safe: null, vending: null, workbench: false, hazard: null, special: null, ...extras };
}

function addEnemy(rng, target, pool, min = 1, max = 2) {
  const count = int(rng, min, max);
  target.enemies.push({ type: pick(rng, pool), count, candidates: [...pool] });
  if (!target.markers.includes("ENEMY")) target.markers.push("ENEMY");
}

function addLoot(rng, target, spec, pool = JUNK, min = 1, max = 3) {
  target.loot.push(...lootList(rng, pool, spec, min, max));
  if (target.loot.length && !target.markers.includes("LOOT")) target.markers.push("LOOT");
}

function markObject(target, key) {
  if (!target.markers.includes(key)) target.markers.push(key);
}

function generateWasteland(spec) {
  const rooms = [room("ruins"), room("wreck"), room("camp")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "ruins") {
      if (chance(rng, 0.6)) addEnemy(rng, target, ["Feral Ghoul", "Mole Rat", "Radroach"], 1, 3);
      addLoot(rng, target, spec, [...JUNK, ...MEDS], 1, 3);
      if (chance(rng, 0.25)) { target.safe = makeSafe(rng, spec, 1); markObject(target, "SAFE"); }
    } else if (target.id === "wreck") {
      addLoot(rng, target, spec, [...JUNK, ...AMMO], 1, 3);
      if (chance(rng, 0.45)) target.hazard = pick(rng, ["radiation pocket", "unstable wreckage", "tripwire trap"]);
    } else {
      addEnemy(rng, target, ["Raider", "Scavenger", "Wild Mongrel"], 1, 3);
      target.special = pick(rng, ["campfire", "bedrolls", "makeshift cooking station"]);
      if (chance(rng, 0.55)) addLoot(rng, target, spec, [...FOOD, ...DRINKS, ...AMMO], 1, 3);
    }
  });
  return rooms;
}

function generateRedRocket(spec) {
  const rooms = [room("store"), room("garage"), room("office"), room("storage"), room("wc")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "store") {
      target.vending = makeVending(rng, spec); markObject(target, "VENDING");
      addLoot(rng, target, spec, [...FOOD, ...DRINKS, ...JUNK], 1, 3);
      if (chance(rng, 0.45)) addEnemy(rng, target, ["Radroach", "Feral Ghoul", "Raider"], 1, 2);
    } else if (target.id === "garage") {
      target.workbench = true; markObject(target, "WORKBENCH");
      addLoot(rng, target, spec, JUNK, 2, 4);
      if (chance(rng, 0.5)) addEnemy(rng, target, ["Raider", "Protectron", "Mole Rat"], 1, 2);
    } else if (target.id === "office") {
      target.terminal = makeTerminal(rng, ["turrets_off", "secret_door", "safe_unlock", "logs"]);
      target.safe = makeSafe(rng, spec, 1); markObject(target, "TERMINAL"); markObject(target, "SAFE");
      addLoot(rng, target, spec, JUNK, 1, 2);
    } else if (target.id === "storage") {
      addLoot(rng, target, spec, [...AMMO, ...JUNK, ...FOOD], 2, 4);
      if (chance(rng, 0.4)) { target.safe = makeSafe(rng, spec, 1); markObject(target, "SAFE"); }
    } else {
      if (chance(rng, 0.65)) addLoot(rng, target, spec, MEDS, 1, 2);
      else target.special = "empty washroom";
    }
  });
  return rooms;
}

function generateMart(spec) {
  const rooms = [room("sales"), room("storage"), room("office")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "sales") {
      target.vending = makeVending(rng, spec); markObject(target, "VENDING");
      addLoot(rng, target, spec, [...FOOD, ...DRINKS, ...JUNK], 2, 5);
      if (chance(rng, 0.65)) addEnemy(rng, target, ["Feral Ghoul", "Raider", "Radroach"], 1, 3);
    } else if (target.id === "storage") {
      addLoot(rng, target, spec, [...FOOD, ...AMMO, ...JUNK], 2, 5);
      if (chance(rng, 0.7)) { target.safe = makeSafe(rng, spec, 2); markObject(target, "SAFE"); }
      if (chance(rng, 0.35)) addEnemy(rng, target, ["Radroach", "Raider"], 1, 2);
    } else {
      target.terminal = makeTerminal(rng, ["storage_door", "alarm_off", "secret_door", "logs"]);
      target.safe = makeSafe(rng, spec, 1); markObject(target, "TERMINAL"); markObject(target, "SAFE");
    }
  });
  return rooms;
}

function generateRaider(spec) {
  const rooms = [room("barrack"), room("boss"), room("storage"), room("workshop"), room("courtyard")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "barrack") {
      addEnemy(rng, target, ["Raider", "Raider Scavver"], 2, 4);
      addLoot(rng, target, spec, [...AMMO, ...FOOD], 1, 3);
    } else if (target.id === "boss") {
      addEnemy(rng, target, ["Raider Veteran", "Raider Psycho", "Raider"], 1, 2);
      target.safe = makeSafe(rng, spec, 2); markObject(target, "SAFE");
      if (chance(rng, 0.55)) { target.terminal = makeTerminal(rng, ["turrets_off", "storage_door", "logs"]); markObject(target, "TERMINAL"); }
    } else if (target.id === "storage") {
      addLoot(rng, target, spec, [...AMMO, ...WEAPONS, ...JUNK], 2, 4);
      if (chance(rng, 0.45)) target.hazard = "tripwire trap";
    } else if (target.id === "workshop") {
      target.workbench = true; markObject(target, "WORKBENCH"); addLoot(rng, target, spec, JUNK, 2, 4);
    } else {
      addEnemy(rng, target, ["Raider", "Raider Scavver", "Raider Veteran"], 2, 5);
      target.special = pick(rng, ["campfire", "prisoner cage", "guard post"]);
    }
  });
  return rooms;
}

function generateBunker(spec) {
  const rooms = [room("armory"), room("control"), room("barracks"), room("storage"), room("generator"), room("medical")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "armory") {
      addLoot(rng, target, spec, [...WEAPONS, ...AMMO], 2, 4); target.safe = makeSafe(rng, spec, 2); markObject(target, "SAFE");
    } else if (target.id === "control") {
      target.terminal = makeTerminal(rng, ["turrets_off", "secret_door", "storage_door", "alarm_off"]); markObject(target, "TERMINAL");
      if (chance(rng, 0.5)) addEnemy(rng, target, ["Protectron", "Mr. Gutsy", "Security Robot"], 1, 2);
    } else if (target.id === "barracks") {
      if (chance(rng, 0.7)) addEnemy(rng, target, ["Feral Ghoul", "Security Robot", "Protectron"], 1, 3);
      addLoot(rng, target, spec, [...AMMO, ...JUNK], 1, 3);
    } else if (target.id === "storage") {
      addLoot(rng, target, spec, [...AMMO, ...MEDS, ...JUNK], 2, 4);
      if (chance(rng, 0.6)) { target.safe = makeSafe(rng, spec, 2); markObject(target, "SAFE"); }
    } else if (target.id === "generator") {
      target.workbench = true; target.terminal = makeTerminal(rng, ["power_restore", "turrets_off", "secret_door"]); markObject(target, "WORKBENCH"); markObject(target, "TERMINAL");
      target.hazard = chance(rng, 0.45) ? "electrical hazard" : null;
    } else {
      addLoot(rng, target, spec, MEDS, 2, 4);
      if (chance(rng, 0.35)) { target.safe = makeSafe(rng, spec, 1); markObject(target, "SAFE"); }
    }
  });
  return rooms;
}

function generateBaseRoomData(spec = {}) {
  if (spec.type === "red_rocket") return generateRedRocket(spec);
  if (spec.type === "super_duper_mart") return generateMart(spec);
  if (spec.type === "raider_camp") return generateRaider(spec);
  if (spec.type === "military_bunker") return generateBunker(spec);
  return generateWasteland(spec);
}

export function generateProceduralRoomData(spec = {}) {
  return balanceEncounterEnemies(spec, generateBaseRoomData(spec));
}

export function generateProceduralEncounterSummary(spec = {}) {
  const rooms = generateProceduralRoomData(spec);
  return summarizeEncounter(spec, rooms);
}

export function roomDataById(data = [], id) {
  return data.find((item) => item.id === id) || null;
}

export function roomPrimaryMarker(roomData) {
  if (!roomData) return null;
  const priority = ["TERMINAL", "SAFE", "VENDING", "ENEMY", "WORKBENCH", "LOOT", "MEDS"];
  return priority.find((value) => roomData.markers?.includes(value)) || null;
}

function formatRoom(raw, lang) {
  const code = langCode(lang);
  const c = COPY[code];
  const name = ROOM_NAMES[code]?.[raw.id] || ROOM_NAMES.en[raw.id] || raw.id;
  const lines = [];
  raw.enemies.forEach((enemy) => {
    const meta = enemy.level || enemy.xp ? ` (${c.level} ${enemy.level || "?"}, ${enemy.xp || "?"} ${c.xpEach})` : "";
    lines.push(`${c.enemies}: ${enemy.type} ×${enemy.count}${meta}`);
  });
  if (raw.loot.length) lines.push(`${c.loot}: ${raw.loot.join(", ")}`);
  if (raw.terminal) lines.push(`${c.terminal} D${raw.terminal.difficulty}: ${c.terminalEffects[raw.terminal.effect] || raw.terminal.effect}`);
  if (raw.safe) lines.push(`${c.safe} — ${c.safeCheck(raw.safe.difficulty)}. ${c.contains}: ${raw.safe.contents.join(", ")}`);
  if (raw.vending) {
    const status = c.vendingStatus[raw.vending.status] || raw.vending.status;
    const stock = raw.vending.stock.length ? ` — ${c.stock}: ${raw.vending.stock.join(", ")}` : "";
    lines.push(`${c.vending}: ${status}${stock}`);
  }
  if (raw.workbench) lines.push(`${c.workbench}: ${c.available}`);
  if (raw.hazard) lines.push(`${c.hazard}: ${raw.hazard}`);
  if (raw.special) lines.push(`${c.special}: ${raw.special}`);
  if (!lines.length) lines.push(c.empty);
  return { ...raw, name, lines };
}

export function localizeProceduralRoomData(data = [], lang = "en") {
  return data.map((item) => formatRoom(item, lang));
}

export function generateLocalizedProceduralRooms(spec = {}, lang = "en") {
  return localizeProceduralRoomData(generateProceduralRoomData(spec), lang);
}

export { LOOT_RARITIES, WEALTH_LEVELS };
