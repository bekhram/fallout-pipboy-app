const LANGS = ["en", "ru", "uk", "pl"];

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return LANGS.includes(code) ? code : "en";
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

function rngFor(spec, roomId) {
  return mulberry32(hashSeed(`${spec?.type || "wasteland"}:${spec?.seed || "1"}:${roomId}:room-content-v1`));
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
    terminalEffects: {
      turrets_off: "disables the security turrets",
      secret_door: "opens a hidden maintenance door",
      storage_door: "unlocks the secured storage room",
      safe_unlock: "remotely unlocks the office safe",
      power_restore: "restores power to this section",
      alarm_off: "disables the alarm system",
      logs: "contains pre-war logs and local records",
    },
    safeCheck: (d) => `Lockpick D${d}`,
    vendingStatus: { working: "working", damaged: "damaged", empty: "empty" },
    stock: "Stock", contains: "Contains",
  },
  ru: {
    enemies: "Враги", loot: "Лут", terminal: "Терминал", safe: "Сейф", vending: "Вендинг-аппарат", workbench: "Верстак", hazard: "Опасность", special: "Особое", empty: "Ничего примечательного",
    terminalEffects: {
      turrets_off: "отключает охранные турели",
      secret_door: "открывает скрытую техническую дверь",
      storage_door: "отпирает защищённый склад",
      safe_unlock: "удалённо открывает офисный сейф",
      power_restore: "восстанавливает питание в этой секции",
      alarm_off: "отключает систему тревоги",
      logs: "содержит довоенные записи и локальные журналы",
    },
    safeCheck: (d) => `Взлом: Lockpick D${d}`,
    vendingStatus: { working: "работает", damaged: "повреждён", empty: "пуст" },
    stock: "Внутри", contains: "Содержимое",
  },
  uk: {
    enemies: "Вороги", loot: "Лут", terminal: "Термінал", safe: "Сейф", vending: "Вендінг-автомат", workbench: "Верстак", hazard: "Небезпека", special: "Особливе", empty: "Нічого примітного",
    terminalEffects: {
      turrets_off: "вимикає охоронні турелі",
      secret_door: "відкриває приховані технічні двері",
      storage_door: "відмикає захищений склад",
      safe_unlock: "віддалено відкриває офісний сейф",
      power_restore: "відновлює живлення в цій секції",
      alarm_off: "вимикає систему тривоги",
      logs: "містить довоєнні записи та локальні журнали",
    },
    safeCheck: (d) => `Злам: Lockpick D${d}`,
    vendingStatus: { working: "працює", damaged: "пошкоджений", empty: "порожній" },
    stock: "Всередині", contains: "Вміст",
  },
  pl: {
    enemies: "Wrogowie", loot: "Łup", terminal: "Terminal", safe: "Sejf", vending: "Automat", workbench: "Warsztat", hazard: "Zagrożenie", special: "Specjalne", empty: "Nic szczególnego",
    terminalEffects: {
      turrets_off: "wyłącza wieżyczki ochronne",
      secret_door: "otwiera ukryte drzwi techniczne",
      storage_door: "odblokowuje zabezpieczony magazyn",
      safe_unlock: "zdalnie otwiera sejf w biurze",
      power_restore: "przywraca zasilanie tej sekcji",
      alarm_off: "wyłącza alarm",
      logs: "zawiera przedwojenne logi i lokalne zapisy",
    },
    safeCheck: (d) => `Lockpick D${d}`,
    vendingStatus: { working: "działa", damaged: "uszkodzony", empty: "pusty" },
    stock: "Zawartość", contains: "Zawiera",
  },
};

const ROOM_NAMES = {
  en: {
    ruins: "Ruins", wreck: "Wreck", camp: "Camp", store: "Store", garage: "Garage", office: "Office", storage: "Storage", wc: "WC",
    sales: "Sales Floor", barrack: "Barracks", boss: "Boss Shack", workshop: "Workshop", courtyard: "Courtyard",
    armory: "Armory", control: "Control Room", barracks: "Barracks", generator: "Generator", medical: "Medical",
  },
  ru: {
    ruins: "Руины", wreck: "Обломки", camp: "Лагерь", store: "Магазин", garage: "Гараж", office: "Офис", storage: "Склад", wc: "Туалет",
    sales: "Торговый зал", barrack: "Барак", boss: "Хижина босса", workshop: "Мастерская", courtyard: "Двор",
    armory: "Оружейная", control: "Комната управления", barracks: "Казарма", generator: "Генераторная", medical: "Медблок",
  },
  uk: {
    ruins: "Руїни", wreck: "Уламки", camp: "Табір", store: "Магазин", garage: "Гараж", office: "Офіс", storage: "Склад", wc: "Туалет",
    sales: "Торгова зала", barrack: "Барак", boss: "Хатина боса", workshop: "Майстерня", courtyard: "Двір",
    armory: "Збройова", control: "Кімната керування", barracks: "Казарма", generator: "Генераторна", medical: "Медблок",
  },
  pl: {
    ruins: "Ruiny", wreck: "Wrak", camp: "Obóz", store: "Sklep", garage: "Garaż", office: "Biuro", storage: "Magazyn", wc: "WC",
    sales: "Sala sprzedaży", barrack: "Barak", boss: "Chata bossa", workshop: "Warsztat", courtyard: "Dziedziniec",
    armory: "Zbrojownia", control: "Sterownia", barracks: "Koszary", generator: "Generator", medical: "Ambulatorium",
  },
};

const FOOD = ["Sugar Bombs", "InstaMash", "Cram", "Salisbury Steak", "Dandy Boy Apples", "Fancy Lads Snack Cakes", "BlamCo Mac & Cheese"];
const DRINKS = ["Nuka-Cola", "Nuka-Cherry", "Purified Water", "Dirty Water", "Sunset Sarsaparilla"];
const AMMO = [".38 rounds", "10mm rounds", ".45 rounds", "5mm rounds", "shotgun shells"];
const MEDS = ["Stimpak", "Rad-X", "RadAway", "Med-X", "bandages"];
const JUNK = ["desk fan", "typewriter", "duct tape", "wrench", "wonderglue", "circuitry", "aluminum tray"];
const WEAPONS = ["10mm pistol", "pipe pistol", "combat knife", "laser pistol", "double-barrel shotgun"];

function lootList(rng, pool, min = 1, max = 3) {
  const count = int(rng, min, max);
  const result = [];
  const source = [...pool];
  while (result.length < count && source.length) {
    const index = int(rng, 0, source.length - 1);
    result.push(source.splice(index, 1)[0]);
  }
  return result;
}

function makeTerminal(rng, allowedEffects) {
  return {
    effect: pick(rng, allowedEffects),
    difficulty: int(rng, 1, 3),
  };
}

function makeSafe(rng, tier = 1) {
  const difficulty = Math.max(1, Math.min(3, tier + (chance(rng, 0.35) ? 1 : 0)));
  const caps = int(rng, 12 * difficulty, 35 * difficulty);
  const contents = [`${caps} caps`, ...lootList(rng, [...AMMO, ...MEDS, ...WEAPONS], 1, Math.min(3, difficulty + 1))];
  return { difficulty, contents };
}

function makeVending(rng) {
  const roll = rng();
  const status = roll < 0.15 ? "empty" : roll < 0.35 ? "damaged" : "working";
  const stock = status === "empty" ? [] : lootList(rng, [...FOOD, ...DRINKS], 2, status === "working" ? 5 : 3);
  return { status, stock };
}

function room(id, extras = {}) {
  return { id, markers: [], enemies: [], loot: [], terminal: null, safe: null, vending: null, workbench: false, hazard: null, special: null, ...extras };
}

function addEnemy(rng, target, pool, min = 1, max = 2) {
  const count = int(rng, min, max);
  target.enemies.push({ type: pick(rng, pool), count });
  target.markers.push("ENEMY");
}

function addLoot(rng, target, pool = JUNK, min = 1, max = 3) {
  target.loot.push(...lootList(rng, pool, min, max));
  if (!target.markers.includes("LOOT")) target.markers.push("LOOT");
}

function generateWasteland(spec) {
  const rooms = [room("ruins"), room("wreck"), room("camp")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "ruins") {
      if (chance(rng, 0.6)) addEnemy(rng, target, ["Feral Ghoul", "Mole Rat", "Radroach"], 1, 3);
      addLoot(rng, target, [...JUNK, ...MEDS], 1, 3);
      if (chance(rng, 0.25)) target.safe = makeSafe(rng, 1);
    } else if (target.id === "wreck") {
      addLoot(rng, target, [...JUNK, ...AMMO], 1, 3);
      if (chance(rng, 0.45)) target.hazard = pick(rng, ["radiation pocket", "unstable wreckage", "tripwire trap"]);
    } else {
      addEnemy(rng, target, ["Raider", "Scavenger", "Wild Mongrel"], 1, 3);
      target.special = pick(rng, ["campfire", "bedrolls", "makeshift cooking station"]);
      if (chance(rng, 0.55)) addLoot(rng, target, [...FOOD, ...DRINKS, ...AMMO], 1, 3);
    }
  });
  return rooms;
}

function generateRedRocket(spec) {
  const rooms = [room("store"), room("garage"), room("office"), room("storage"), room("wc")];
  rooms.forEach((target) => {
    const rng = rngFor(spec, target.id);
    if (target.id === "store") {
      target.vending = makeVending(rng);
      target.markers.push("VENDING");
      addLoot(rng, target, [...FOOD, ...DRINKS, ...JUNK], 1, 3);
      if (chance(rng, 0.45)) addEnemy(rng, target, ["Radroach", "Feral Ghoul", "Raider"], 1, 2);
    } else if (target.id === "garage") {
      target.workbench = true;
      target.markers.push("WORKBENCH");
      addLoot(rng, target, JUNK, 2, 4);
      if (chance(rng, 0.5)) addEnemy(rng, target, ["Raider", "Protectron", "Mole Rat"], 1, 2);
    } else if (target.id === "office") {
      target.terminal = makeTerminal(rng, ["turrets_off", "secret_door", "safe_unlock", "logs"]);
      target.safe = makeSafe(rng, 1);
      target.markers.push("TERMINAL", "SAFE");
      addLoot(rng, target, JUNK, 1, 2);
    } else if (target.id === "storage") {
      addLoot(rng, target, [...AMMO, ...JUNK, ...FOOD], 2, 4);
      if (chance(rng, 0.4)) target.safe = makeSafe(rng, 1);
    } else {
      if (chance(rng, 0.65)) addLoot(rng, target, MEDS, 1, 2);
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
      target.vending = makeVending(rng);
      target.markers.push("VENDING");
      addLoot(rng, target, [...FOOD, ...DRINKS, ...JUNK], 2, 5);
      if (chance(rng, 0.65)) addEnemy(rng, target, ["Feral Ghoul", "Raider", "Radroach"], 1, 3);
    } else if (target.id === "storage") {
      addLoot(rng, target, [...FOOD, ...AMMO, ...JUNK], 2, 5);
      if (chance(rng, 0.7)) target.safe = makeSafe(rng, 2);
      if (chance(rng, 0.35)) addEnemy(rng, target, ["Radroach", "Raider"], 1, 2);
    } else {
      target.terminal = makeTerminal(rng, ["storage_door", "alarm_off", "secret_door", "logs"]);
      target.safe = makeSafe(rng, 1);
      target.markers.push("TERMINAL", "SAFE");
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
      addLoot(rng, target, [...AMMO, ...FOOD], 1, 3);
    } else if (target.id === "boss") {
      addEnemy(rng, target, ["Raider Veteran", "Raider Psycho"], 1, 2);
      target.safe = makeSafe(rng, 2);
      if (chance(rng, 0.55)) target.terminal = makeTerminal(rng, ["turrets_off", "storage_door", "logs"]);
      target.markers.push("SAFE");
      if (target.terminal) target.markers.push("TERMINAL");
    } else if (target.id === "storage") {
      addLoot(rng, target, [...AMMO, ...WEAPONS, ...JUNK], 2, 4);
      if (chance(rng, 0.45)) target.hazard = "tripwire trap";
    } else if (target.id === "workshop") {
      target.workbench = true;
      target.markers.push("WORKBENCH");
      addLoot(rng, target, JUNK, 2, 4);
    } else {
      addEnemy(rng, target, ["Raider", "Raider Scavver"], 2, 5);
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
      addLoot(rng, target, [...WEAPONS, ...AMMO], 2, 4);
      target.safe = makeSafe(rng, 2);
    } else if (target.id === "control") {
      target.terminal = makeTerminal(rng, ["turrets_off", "secret_door", "storage_door", "alarm_off"]);
      target.markers.push("TERMINAL");
      if (chance(rng, 0.5)) addEnemy(rng, target, ["Protectron", "Mr. Gutsy", "Security Robot"], 1, 2);
    } else if (target.id === "barracks") {
      if (chance(rng, 0.7)) addEnemy(rng, target, ["Feral Ghoul", "Security Robot"], 1, 3);
      addLoot(rng, target, [...AMMO, ...JUNK], 1, 3);
    } else if (target.id === "storage") {
      addLoot(rng, target, [...AMMO, ...MEDS, ...JUNK], 2, 4);
      if (chance(rng, 0.6)) target.safe = makeSafe(rng, 2);
    } else if (target.id === "generator") {
      target.workbench = true;
      target.terminal = makeTerminal(rng, ["power_restore", "turrets_off", "secret_door"]);
      target.markers.push("WORKBENCH", "TERMINAL");
      target.hazard = chance(rng, 0.45) ? "electrical hazard" : null;
    } else {
      addLoot(rng, target, MEDS, 2, 4);
      if (chance(rng, 0.35)) target.safe = makeSafe(rng, 1);
    }
  });
  return rooms;
}

export function generateProceduralRoomData(spec = {}) {
  if (spec.type === "red_rocket") return generateRedRocket(spec);
  if (spec.type === "super_duper_mart") return generateMart(spec);
  if (spec.type === "raider_camp") return generateRaider(spec);
  if (spec.type === "military_bunker") return generateBunker(spec);
  return generateWasteland(spec);
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

  raw.enemies.forEach((enemy) => lines.push(`${c.enemies}: ${enemy.type} ×${enemy.count}`));
  if (raw.loot.length) lines.push(`${c.loot}: ${raw.loot.join(", ")}`);
  if (raw.terminal) lines.push(`${c.terminal} D${raw.terminal.difficulty}: ${c.terminalEffects[raw.terminal.effect] || raw.terminal.effect}`);
  if (raw.safe) lines.push(`${c.safe} — ${c.safeCheck(raw.safe.difficulty)}. ${c.contains}: ${raw.safe.contents.join(", ")}`);
  if (raw.vending) {
    const status = c.vendingStatus[raw.vending.status] || raw.vending.status;
    const stock = raw.vending.stock.length ? ` — ${c.stock}: ${raw.vending.stock.join(", ")}` : "";
    lines.push(`${c.vending}: ${status}${stock}`);
  }
  if (raw.workbench) lines.push(`${c.workbench}: available`);
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
