import { INVENTORY_DATABASE } from "../data/inventoryDatabase.js";
import * as V2 from "./proceduralRoomContentV2.js";
import { summarizeEncounter } from "./proceduralEncounterBalance.js";

const LOOT_RARITIES = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const WEALTH_LEVELS = ["poor", "standard", "rich", "wealthy"];

const LEGACY_RARITY = {
  common: "r1",
  uncommon: "r3",
  rare: "r5",
  legendary: "r7",
};

const LEGACY_BUCKET = {
  r0: "common",
  r1: "common",
  r2: "uncommon",
  r3: "uncommon",
  r4: "rare",
  r5: "rare",
  r6: "legendary",
  r7: "legendary",
};

const MANUAL_ITEMS = [
  { name: ".38 rounds", category: "ammo", rarity: 0 },
  { name: "10mm rounds", category: "ammo", rarity: 1 },
  { name: ".45 rounds", category: "ammo", rarity: 2 },
  { name: "shotgun shells", category: "ammo", rarity: 2 },
  { name: "5mm rounds", category: "ammo", rarity: 3 },
  { name: "fusion cell", category: "ammo", rarity: 3 },
  { name: "plasma cartridge", category: "ammo", rarity: 5 },
  { name: "2mm EC", category: "ammo", rarity: 6 },
  { name: "pipe pistol", category: "weapons", rarity: 0 },
  { name: "combat knife", category: "weapons", rarity: 1 },
  { name: "10mm pistol", category: "weapons", rarity: 2 },
  { name: "double-barrel shotgun", category: "weapons", rarity: 2 },
  { name: "laser pistol", category: "weapons", rarity: 3 },
  { name: "combat shotgun", category: "weapons", rarity: 4 },
  { name: "plasma rifle", category: "weapons", rarity: 5 },
  { name: "Gauss rifle", category: "weapons", rarity: 7 },
  { name: "desk fan", category: "junk", rarity: 0 },
  { name: "typewriter", category: "junk", rarity: 1 },
  { name: "duct tape", category: "junk", rarity: 1 },
  { name: "wrench", category: "junk", rarity: 0 },
  { name: "wonderglue", category: "junk", rarity: 2 },
  { name: "circuitry", category: "junk", rarity: 3 },
  { name: "aluminum tray", category: "junk", rarity: 1 },
];

const DB_ITEMS = INVENTORY_DATABASE
  .map((item) => ({
    name: String(item?.canonicalName || item?.name || "").trim(),
    category: String(item?.category || "").toLowerCase(),
    rarity: Number(item?.rarity),
  }))
  .filter((item) => item.name && Number.isFinite(item.rarity) && item.rarity >= 0 && item.rarity <= 7);

const ALL_ITEMS = [...DB_ITEMS, ...MANUAL_ITEMS];

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

function normalizeRarity(value) {
  const raw = String(value || "").toLowerCase();
  if (LOOT_RARITIES.includes(raw)) return raw;
  return LEGACY_RARITY[raw] || "r3";
}

function rarityNumber(value) {
  return Math.max(0, Math.min(7, Number(normalizeRarity(value).slice(1)) || 0));
}

function normalizedWealth(value) {
  return WEALTH_LEVELS.includes(value) ? value : "standard";
}

function legacySpec(spec = {}) {
  const rarity = normalizeRarity(spec.lootRarity);
  return {
    ...spec,
    lootRarity: LEGACY_BUCKET[rarity],
    wealth: normalizedWealth(spec.wealth),
  };
}

function roomCategories(roomId) {
  if (["medical", "wc"].includes(roomId)) return ["aid", "food", "beverages"];
  if (["store", "sales", "camp", "barrack", "barracks"].includes(roomId)) return ["food", "beverages", "aid", "tools", "junk"];
  if (["garage", "workshop", "wreck", "generator"].includes(roomId)) return ["tools", "junk", "aid"];
  if (["armory", "storage", "boss"].includes(roomId)) return ["ammo", "weapons", "aid", "tools", "junk"];
  if (["office", "control"].includes(roomId)) return ["aid", "tools", "junk", "ammo"];
  return ["food", "beverages", "aid", "tools", "junk", "ammo"];
}

function eligibleItems(spec, categories) {
  const maxR = rarityNumber(spec.lootRarity);
  const wanted = new Set(categories);
  const result = ALL_ITEMS.filter((item) => item.rarity <= maxR && wanted.has(item.category));
  if (result.length) return result;
  return ALL_ITEMS.filter((item) => item.rarity <= maxR);
}

function pickLoot(rng, spec, categories, count) {
  const maxR = rarityNumber(spec.lootRarity);
  const source = [...eligibleItems(spec, categories)];
  const result = [];
  while (result.length < count && source.length) {
    // Higher allowed rarity should matter, but lower-rarity finds must remain common.
    const highTier = source.filter((item) => item.rarity >= Math.max(0, maxR - 1));
    const pool = highTier.length && rng() < 0.32 ? highTier : source;
    const selected = pool[Math.floor(rng() * pool.length)];
    result.push(selected.name);
    const index = source.indexOf(selected);
    if (index >= 0) source.splice(index, 1);
  }
  return result;
}

function enhanceRoomLoot(spec, room) {
  const rng = mulberry32(hashSeed(`${spec?.type || "wasteland"}:${spec?.seed || "1"}:${room.id}:${normalizeRarity(spec.lootRarity)}:${normalizedWealth(spec.wealth)}:loot-r7-v1`));
  const categories = roomCategories(room.id);
  const next = {
    ...room,
    loot: [...(room.loot || [])],
    safe: room.safe ? { ...room.safe, contents: [...(room.safe.contents || [])] } : null,
    vending: room.vending ? { ...room.vending, stock: [...(room.vending.stock || [])] } : null,
  };

  if (next.loot.length) {
    next.loot = pickLoot(rng, spec, categories, next.loot.length);
  }

  if (next.safe) {
    const caps = next.safe.contents.filter((item) => /caps$/i.test(String(item)));
    const itemCount = Math.max(1, next.safe.contents.length - caps.length);
    next.safe.contents = [
      ...caps,
      ...pickLoot(rng, spec, ["weapons", "ammo", "aid", "tools"], itemCount),
    ];
  }

  if (next.vending && next.vending.status !== "empty") {
    const count = Math.max(1, next.vending.stock.length || 2);
    next.vending.stock = pickLoot(rng, spec, ["food", "beverages"], count);
  }

  return next;
}

export function generateProceduralRoomData(spec = {}) {
  const normalizedSpec = {
    ...spec,
    lootRarity: normalizeRarity(spec.lootRarity),
    wealth: normalizedWealth(spec.wealth),
  };
  const base = V2.generateProceduralRoomData(legacySpec(normalizedSpec));
  return base.map((room) => enhanceRoomLoot(normalizedSpec, room));
}

export function generateProceduralEncounterSummary(spec = {}) {
  const rooms = generateProceduralRoomData(spec);
  return summarizeEncounter(spec, rooms);
}

export function roomDataById(data = [], id) {
  return V2.roomDataById(data, id);
}

export function roomPrimaryMarker(roomData) {
  return V2.roomPrimaryMarker(roomData);
}

export function localizeProceduralRoomData(data = [], lang = "en") {
  return V2.localizeProceduralRoomData(data, lang);
}

export function generateLocalizedProceduralRooms(spec = {}, lang = "en") {
  return localizeProceduralRoomData(generateProceduralRoomData(spec), lang);
}

export { LOOT_RARITIES, WEALTH_LEVELS, normalizeRarity as normalizeLootRarity };
