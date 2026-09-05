import { BESTIARY_ENTRIES } from "../data/bestiary.js";

export const BESTIARY_COMBAT_STORAGE_KEY = "fallout_pipboy_bestiary_combat_v1";
export const BESTIARY_COMBAT_CHANGED_EVENT = "pipboy:bestiary-combat-changed";

function numberOrNull(value) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function safeLevel(value, fallback = 1) {
  const numeric = numberOrNull(value);
  return numeric == null ? fallback : Math.max(1, numeric);
}

function combatSnapshot(entry, index = 0) {
  const maxHp = Math.max(1, numberOrNull(entry?.hp) || 1);
  return {
    instanceId: `${entry.id || "enemy"}-${Date.now()}-${index}`,
    bestiaryId: entry.id || null,
    name: entry.name || "Unknown enemy",
    category: entry.category || "enemy",
    tags: Array.isArray(entry.tags) ? [...entry.tags] : [],
    level: safeLevel(entry.level),
    xp: numberOrNull(entry.xp),
    statKind: entry.statKind || "creature",
    creatureType: entry.creatureType || null,
    body: numberOrNull(entry.body),
    mind: numberOrNull(entry.mind),
    melee: numberOrNull(entry.melee),
    guns: numberOrNull(entry.guns),
    other: numberOrNull(entry.other),
    special: entry.special ? clone(entry.special) : null,
    skills: Array.isArray(entry.skills) ? clone(entry.skills) : [],
    hp: { current: maxHp, max: maxHp },
    initiative: numberOrNull(entry.initiative),
    defense: numberOrNull(entry.defense) || 1,
    carryWeight: entry.carryWeight || null,
    meleeBonus: entry.meleeBonus || null,
    luckPoints: entry.luckPoints || null,
    drBlock: entry.drBlock || null,
    attacks: entry.attacks || null,
    abilities: entry.abilities || null,
    loot: entry.loot || null,
    source: entry.source || null,
    defeated: false,
  };
}

function pickClosestByLevel(entries, playerLevel) {
  const target = safeLevel(playerLevel);
  const ranked = entries
    .map((entry) => ({ entry, distance: Math.abs(safeLevel(entry.level) - target) }))
    .sort((a, b) => a.distance - b.distance || safeLevel(a.entry.level) - safeLevel(b.entry.level));
  if (!ranked.length) return null;
  const bestDistance = ranked[0].distance;
  const close = ranked.filter((item) => item.distance <= bestDistance + 1).slice(0, 4);
  return close[Math.floor(Math.random() * close.length)]?.entry || ranked[0].entry;
}

function getAmbushPool(character) {
  const regionId = character?.mapData?.regionId || "commonwealth";
  let pool = BESTIARY_ENTRIES.filter((entry) => entry && entry.category === "enemy" && entry.hp && entry.attacks);

  // Synths are Commonwealth-specific in the Core Rulebook context. Other regions use the
  // generic raider/super-mutant/ghoul-style enemies that are already present in the book.
  if (regionId !== "commonwealth") {
    pool = pool.filter((entry) => !String(entry.id || "").startsWith("synth"));
  }

  return pool;
}

export function buildBestiaryCombatForEncounter(encounter, character = {}) {
  if (!encounter || encounter.type !== "ambush") return null;

  const playerLevel = safeLevel(character?.level);
  const picked = pickClosestByLevel(getAmbushPool(character), playerLevel);
  if (!picked) return null;

  const enemy = combatSnapshot(picked, 0);
  return {
    id: `combat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "active",
    source: "bestiary",
    selectionRule: "app_level_matched_ambush",
    encounterId: encounter.id || "ambush",
    regionId: character?.mapData?.regionId || "commonwealth",
    playerLevel,
    round: 1,
    enemies: [enemy],
    createdAt: Date.now(),
  };
}

function readStore() {
  if (typeof window === "undefined") return { bySession: {}, latestSessionKey: null };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BESTIARY_COMBAT_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { bySession: parsed.bySession || {}, latestSessionKey: parsed.latestSessionKey || null }
      : { bySession: {}, latestSessionKey: null };
  } catch {
    return { bySession: {}, latestSessionKey: null };
  }
}

function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BESTIARY_COMBAT_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_CHANGED_EVENT));
  } catch {
    // Optional local combat persistence.
  }
}

export function saveCombatForSession(sessionKey, combat) {
  if (!sessionKey || !combat) return;
  const store = readStore();
  store.bySession[sessionKey] = { ...clone(combat), updatedAt: Date.now() };
  store.latestSessionKey = sessionKey;
  writeStore(store);
}

export function readCombatForSession(sessionKey) {
  if (!sessionKey) return null;
  const store = readStore();
  return store.bySession?.[sessionKey] || null;
}

export function readLatestCombat() {
  const store = readStore();
  const key = store.latestSessionKey;
  if (!key) return null;
  const combat = store.bySession?.[key] || null;
  return combat ? { sessionKey: key, ...combat } : null;
}

export function updateCombatEnemyHp(sessionKey, instanceId, nextHp) {
  const store = readStore();
  const combat = store.bySession?.[sessionKey];
  if (!combat) return null;
  const enemies = (combat.enemies || []).map((enemy) => {
    if (enemy.instanceId !== instanceId) return enemy;
    const max = Math.max(1, Number(enemy?.hp?.max || 1));
    const current = Math.max(0, Math.min(max, Number(nextHp) || 0));
    return { ...enemy, hp: { current, max }, defeated: current <= 0 };
  });
  const allDefeated = enemies.length > 0 && enemies.every((enemy) => enemy.defeated || Number(enemy?.hp?.current || 0) <= 0);
  store.bySession[sessionKey] = {
    ...combat,
    enemies,
    status: allDefeated ? "resolved" : "active",
    updatedAt: Date.now(),
  };
  store.latestSessionKey = sessionKey;
  writeStore(store);
  return store.bySession[sessionKey];
}

export function clearCombatForSession(sessionKey) {
  if (!sessionKey) return;
  const store = readStore();
  delete store.bySession[sessionKey];
  if (store.latestSessionKey === sessionKey) {
    const remaining = Object.entries(store.bySession || {})
      .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0));
    store.latestSessionKey = remaining[0]?.[0] || null;
  }
  writeStore(store);
}
