import * as V3 from "./proceduralRoomContentV3.js";

const WEALTH_FACTOR = { poor: 0.72, standard: 1, rich: 1.22, wealthy: 1.45 };

const AMMO = [
  { name: ".38 rounds", rarity: 0 },
  { name: "10mm rounds", rarity: 1 },
  { name: ".45 rounds", rarity: 2 },
  { name: "shotgun shells", rarity: 2 },
  { name: "5mm rounds", rarity: 3 },
  { name: "fusion cell", rarity: 3 },
  { name: "plasma cartridge", rarity: 5 },
  { name: "2mm EC", rarity: 6 },
];

const FOOD = [
  { name: "Cram", rarity: 0 },
  { name: "InstaMash", rarity: 0 },
  { name: "Sugar Bombs", rarity: 0 },
  { name: "Salisbury Steak", rarity: 1 },
  { name: "Dandy Boy Apples", rarity: 1 },
  { name: "Fancy Lads Snack Cakes", rarity: 1 },
  { name: "BlamCo Mac & Cheese", rarity: 1 },
];

const WATER = [
  { name: "Dirty Water", rarity: 0 },
  { name: "Purified Water", rarity: 1 },
  { name: "Nuka-Cola", rarity: 1 },
  { name: "Nuka-Cherry", rarity: 2 },
];

const MEDICAL = [
  { name: "bandages", rarity: 0 },
  { name: "Stimpak", rarity: 1 },
  { name: "Rad-X", rarity: 1 },
  { name: "RadAway", rarity: 1 },
  { name: "Mentats", rarity: 2 },
  { name: "Buffout", rarity: 2 },
  { name: "Psycho", rarity: 2 },
  { name: "Med-X", rarity: 3 },
];

const TRAPS = [
  "tripwire grenade",
  "pressure-plate mine",
  "rigged door",
  "shotgun trap",
  "electrified wire",
  "alarm tripwire",
];

const COPY = {
  en: {
    trap: "Trap",
    trapCheck: (d) => `detect/disarm D${d}`,
    ammoCrate: "Army ammo chest",
    supplies: "Supplies",
    food: "food",
    water: "water",
    medkit: "First-aid kit",
    contains: "Contains",
  },
  ru: {
    trap: "Ловушка",
    trapCheck: (d) => `обнаружение/обезвреживание D${d}`,
    ammoCrate: "Армейский сундук с патронами",
    supplies: "Припасы",
    food: "еда",
    water: "вода",
    medkit: "Аптечка",
    contains: "Содержимое",
  },
  uk: {
    trap: "Пастка",
    trapCheck: (d) => `виявлення/знешкодження D${d}`,
    ammoCrate: "Армійська скриня з набоями",
    supplies: "Припаси",
    food: "їжа",
    water: "вода",
    medkit: "Аптечка",
    contains: "Вміст",
  },
  pl: {
    trap: "Pułapka",
    trapCheck: (d) => `wykrycie/rozbrojenie D${d}`,
    ammoCrate: "Wojskowa skrzynia z amunicją",
    supplies: "Zapasy",
    food: "jedzenie",
    water: "woda",
    medkit: "Apteczka",
    contains: "Zawartość",
  },
};

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

function pick(rng, values) {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

function int(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function rarityNumber(value) {
  const match = String(value || "r3").toLowerCase().match(/^r([0-7])$/);
  return match ? Number(match[1]) : 3;
}

function wealth(spec) {
  return WEALTH_FACTOR[spec?.wealth] || 1;
}

function chance(rng, base, spec) {
  return rng() < Math.min(0.95, base * wealth(spec));
}

function eligible(pool, spec) {
  const max = rarityNumber(spec?.lootRarity);
  const result = pool.filter((item) => item.rarity <= max);
  return result.length ? result : pool.filter((item) => item.rarity === 0);
}

function uniquePicks(rng, pool, spec, minCount, maxCount) {
  const source = [...eligible(pool, spec)];
  if (!source.length) return [];
  const factor = wealth(spec);
  const low = Math.max(1, Math.round(minCount * factor));
  const high = Math.max(low, Math.min(source.length, Math.round(maxCount * factor)));
  const count = Math.min(source.length, int(rng, Math.min(low, source.length), high));
  const result = [];
  while (result.length < count && source.length) {
    const index = int(rng, 0, source.length - 1);
    result.push(source.splice(index, 1)[0].name);
  }
  return result;
}

function ammoStack(rng, item, spec) {
  const factor = wealth(spec);
  const base = item.includes("2mm") || item.includes("plasma") ? int(rng, 4, 12) : item.includes("fusion") ? int(rng, 8, 20) : int(rng, 12, 36);
  return `${item} ×${Math.max(1, Math.round(base * factor))}`;
}

function trapChance(spec, roomId) {
  const type = String(spec?.type || "wasteland");
  let base = 0.13;
  if (type === "raider_camp") base = 0.34;
  else if (type === "military_bunker") base = 0.27;
  else if (type === "super_duper_mart") base = 0.16;
  if (["boss", "storage", "armory", "control", "office"].includes(roomId)) base += 0.1;
  if (["wc", "medical"].includes(roomId)) base -= 0.07;
  return clamp(base, 0.03, 0.65);
}

function ammoChestChance(spec, roomId) {
  const type = String(spec?.type || "wasteland");
  if (type === "military_bunker") {
    if (roomId === "armory") return 0.78;
    if (["storage", "control", "barracks"].includes(roomId)) return 0.4;
    return 0.18;
  }
  if (type === "raider_camp") return ["boss", "storage", "workshop"].includes(roomId) ? 0.28 : 0.1;
  if (type === "wasteland") return ["ruins", "wreck"].includes(roomId) ? 0.1 : 0.04;
  return ["storage", "garage"].includes(roomId) ? 0.13 : 0.04;
}

function suppliesChance(spec, roomId) {
  let base = 0.18;
  if (["store", "sales", "camp", "barrack", "barracks", "storage"].includes(roomId)) base = 0.4;
  if (["office", "control", "garage", "workshop"].includes(roomId)) base = 0.16;
  if (["wc", "armory"].includes(roomId)) base = 0.07;
  return base;
}

function medkitChance(spec, roomId) {
  if (roomId === "medical") return 0.9;
  if (["office", "control", "barrack", "barracks", "storage", "boss"].includes(roomId)) return 0.3;
  if (["garage", "workshop", "store", "sales"].includes(roomId)) return 0.18;
  return 0.1;
}

function makeTrap(rng, spec) {
  const level = clamp(Math.round(Number(spec?.avgPartyLevel) || 1), 1, 30);
  const difficulty = clamp(1 + Math.floor(level / 7) + (rng() < 0.25 ? 1 : 0), 1, 4);
  return { type: pick(rng, TRAPS), difficulty };
}

function makeAmmoChest(rng, spec) {
  const selected = uniquePicks(rng, AMMO, spec, 1, 3);
  return {
    contents: selected.map((item) => ammoStack(rng, item, spec)),
  };
}

function makeSupplies(rng, spec) {
  return {
    food: uniquePicks(rng, FOOD, spec, 1, 3),
    water: uniquePicks(rng, WATER, spec, 1, 2),
  };
}

function makeMedkit(rng, spec) {
  return { contents: uniquePicks(rng, MEDICAL, spec, 1, 4) };
}

function markerOrder(markers = []) {
  const priority = ["ENEMY", "TRAP", "TERMINAL", "SAFE", "AMMO_CRATE", "MEDKIT", "VENDING", "SUPPLIES", "WORKBENCH", "LOOT", "MEDS"];
  return [...new Set(markers)].sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
}

function enrichRoom(spec, room) {
  const rng = mulberry32(hashSeed(`${spec?.type || "wasteland"}:${spec?.seed || "1"}:${room.id}:${spec?.lootRarity || "r3"}:${spec?.wealth || "standard"}:room-objects-v4`));
  const next = {
    ...room,
    markers: [...(room.markers || [])],
    trap: null,
    ammoCrate: null,
    supplies: null,
    medkit: null,
  };

  if (chance(rng, trapChance(spec, room.id), spec)) {
    next.trap = makeTrap(rng, spec);
    next.markers.push("TRAP");
  }
  if (chance(rng, ammoChestChance(spec, room.id), spec)) {
    next.ammoCrate = makeAmmoChest(rng, spec);
    if (next.ammoCrate.contents.length) next.markers.push("AMMO_CRATE");
  }
  if (chance(rng, suppliesChance(spec, room.id), spec)) {
    next.supplies = makeSupplies(rng, spec);
    if (next.supplies.food.length || next.supplies.water.length) next.markers.push("SUPPLIES");
  }
  if (chance(rng, medkitChance(spec, room.id), spec)) {
    next.medkit = makeMedkit(rng, spec);
    if (next.medkit.contents.length) next.markers.push("MEDKIT");
  }

  next.markers = markerOrder(next.markers);
  return next;
}

function language(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function extraLines(room, lang) {
  const text = COPY[language(lang)];
  const lines = [];
  if (room?.trap) lines.push(`${text.trap}: ${room.trap.type}. ${text.trapCheck(room.trap.difficulty)}.`);
  if (room?.ammoCrate?.contents?.length) lines.push(`${text.ammoCrate}: ${room.ammoCrate.contents.join(", ")}`);
  if (room?.supplies) {
    const parts = [];
    if (room.supplies.food?.length) parts.push(`${text.food}: ${room.supplies.food.join(", ")}`);
    if (room.supplies.water?.length) parts.push(`${text.water}: ${room.supplies.water.join(", ")}`);
    if (parts.length) lines.push(`${text.supplies}: ${parts.join("; ")}`);
  }
  if (room?.medkit?.contents?.length) lines.push(`${text.medkit}: ${text.contains}: ${room.medkit.contents.join(", ")}`);
  return lines;
}

export function generateProceduralRoomData(spec = {}) {
  return V3.generateProceduralRoomData(spec).map((room) => enrichRoom(spec, room));
}

export function generateProceduralEncounterSummary(spec = {}) {
  return V3.generateProceduralEncounterSummary(spec);
}

export function roomDataById(data = [], id) {
  return data.find((room) => room?.id === id) || null;
}

export function roomPrimaryMarker(roomData) {
  const markers = markerOrder(roomData?.markers || []);
  return markers[0] || null;
}

export function localizeProceduralRoomData(data = [], lang = "en") {
  const localizedBase = V3.localizeProceduralRoomData(data, lang);
  const rawById = new Map(data.map((room) => [room.id, room]));
  return localizedBase.map((room) => ({
    ...room,
    markers: markerOrder(rawById.get(room.id)?.markers || room.markers || []),
    lines: [...(room.lines || []), ...extraLines(rawById.get(room.id), lang)],
  }));
}

export function generateLocalizedProceduralRooms(spec = {}, lang = "en") {
  const data = generateProceduralRoomData(spec);
  return localizeProceduralRoomData(data, lang);
}

export const LOOT_RARITIES = V3.LOOT_RARITIES;
export const WEALTH_LEVELS = V3.WEALTH_LEVELS;
export const normalizeLootRarity = V3.normalizeLootRarity;
