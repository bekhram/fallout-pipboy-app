import { BESTIARY_ENTRIES } from "../data/bestiary.js";

export const BESTIARY_COMBAT_STORAGE_KEY = "fallout_pipboy_bestiary_combat_v1";
export const BESTIARY_COMBAT_CHANGED_EVENT = "pipboy:bestiary-combat-changed";
export const BESTIARY_COMBAT_ACTION_EVENT = "pipboy:bestiary-combat-action";

const DAMAGE_TYPES = ["physical", "energy", "radiation", "poison"];
const HIT_LOCATIONS = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];

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

function emptyResistanceType() {
  return {
    immune: false,
    all: null,
    head: null,
    torso: null,
    leftArm: null,
    rightArm: null,
    leftLeg: null,
    rightLeg: null,
  };
}

function assignResistanceLocations(target, value, locationText) {
  const text = String(locationText || "").toLowerCase();
  if (!text.trim() || text.includes("all")) {
    target.all = value;
    return;
  }

  let matched = false;
  if (text.includes("head") || text.includes("face")) {
    target.head = value;
    matched = true;
  }
  if (text.includes("torso") || text.includes("body")) {
    target.torso = value;
    matched = true;
  }
  if (text.includes("arm")) {
    target.leftArm = value;
    target.rightArm = value;
    matched = true;
  }
  if (text.includes("leg")) {
    target.leftLeg = value;
    target.rightLeg = value;
    matched = true;
  }

  if (!matched) target.all = value;
}

export function parseBestiaryDrBlock(value) {
  const result = Object.fromEntries(DAMAGE_TYPES.map((type) => [type, emptyResistanceType()]));
  const segments = String(value || "")
    .split("•")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const match = segment.match(
      /^(Physical(?:\s*\/\s*Energy)?|Energy(?:\s*\/\s*Physical)?|Radiation|Poison)\s*:?\s*(.*)$/i
    );
    if (!match) continue;

    const types = match[1]
      .split("/")
      .map((type) => type.trim().toLowerCase())
      .filter((type) => DAMAGE_TYPES.includes(type));
    const tail = String(match[2] || "").trim();

    if (/immune/i.test(tail)) {
      for (const type of types) result[type].immune = true;
      continue;
    }

    const pieces = tail.split(";").map((piece) => piece.trim()).filter(Boolean);
    for (const piece of pieces) {
      const valueMatch = piece.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
      if (!valueMatch) continue;
      const resistance = Math.max(0, Number(valueMatch[1]) || 0);
      const locationText = valueMatch[2] || "";
      for (const type of types) {
        assignResistanceLocations(result[type], resistance, locationText);
      }
    }
  }

  return result;
}

function normalizeHitLocation(value) {
  const raw = String(value || "all").trim();
  if (HIT_LOCATIONS.includes(raw)) return raw;
  const normalized = raw.toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "head" || normalized === "face") return "head";
  if (normalized === "torso" || normalized === "body") return "torso";
  if (normalized === "leftarm" || normalized === "arm" || normalized === "arms") return "leftArm";
  if (normalized === "rightarm") return "rightArm";
  if (normalized === "leftleg" || normalized === "leg" || normalized === "legs") return "leftLeg";
  if (normalized === "rightleg") return "rightLeg";
  return "all";
}

export function getBestiaryResistance(enemy, damageType = "physical", hitLocation = "all") {
  const type = DAMAGE_TYPES.includes(String(damageType || "").toLowerCase())
    ? String(damageType).toLowerCase()
    : "physical";
  const parsed = enemy?.resistances || parseBestiaryDrBlock(enemy?.drBlock);
  const profile = parsed?.[type] || emptyResistanceType();
  if (profile.immune) return 9999;

  const location = normalizeHitLocation(hitLocation);
  const locationValue = location !== "all" ? profile?.[location] : null;
  if (Number.isFinite(Number(locationValue))) return Math.max(0, Number(locationValue));
  if (Number.isFinite(Number(profile?.all))) return Math.max(0, Number(profile.all));
  return 0;
}

export function hasBestiaryLocationSpecificDr(enemy, damageType = "physical") {
  const type = DAMAGE_TYPES.includes(String(damageType || "").toLowerCase())
    ? String(damageType).toLowerCase()
    : "physical";
  const parsed = enemy?.resistances || parseBestiaryDrBlock(enemy?.drBlock);
  const profile = parsed?.[type];
  if (!profile || profile.immune || Number.isFinite(Number(profile.all))) return false;
  return HIT_LOCATIONS.some((location) => Number.isFinite(Number(profile?.[location])));
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
    resistances: parseBestiaryDrBlock(entry.drBlock),
    attacks: entry.attacks || null,
    abilities: entry.abilities || null,
    loot: entry.loot || null,
    source: entry.source || null,
    combatStatuses: {},
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

  if (regionId !== "commonwealth") {
    pool = pool.filter((entry) => !String(entry.id || "").startsWith("synth"));
  }

  return pool;
}

export function buildBestiaryCombatForEncounter(encounter, character = {}) {
  if (!encounter || (encounter.type !== "ambush" && encounter.autoCombat !== true)) return null;

  const playerLevel = safeLevel(character?.level);
  const presetIds = Array.isArray(encounter?.combatBestiaryIds)
    ? encounter.combatBestiaryIds.filter(Boolean)
    : [];

  let enemies = [];
  let selectionRule = "app_level_matched_ambush";

  if (presetIds.length) {
    const entries = presetIds
      .map((id) => BESTIARY_ENTRIES.find((entry) => entry?.id === id))
      .filter(Boolean);
    if (!entries.length) return null;
    enemies = entries.map((entry, index) => combatSnapshot(entry, index));
    selectionRule = encounter?.generationSource === "core_rulebook_official"
      ? "core_rulebook_encounter_preset"
      : "encounter_preset";
  } else {
    const picked = pickClosestByLevel(getAmbushPool(character), playerLevel);
    if (!picked) return null;
    enemies = [combatSnapshot(picked, 0)];
  }

  return {
    id: `combat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "active",
    source: "bestiary",
    selectionRule,
    encounterId: encounter.id || "ambush",
    encounterSource: encounter?.generationSource || "app_custom",
    encounterTable: encounter?.tableName || null,
    encounterRoll: encounter?.roll ?? null,
    weirdRoll: encounter?.weirdRoll ?? null,
    rulesSource: encounter?.rulesSource || null,
    rulesPage: encounter?.rulesPage || null,
    regionId: character?.mapData?.regionId || "commonwealth",
    playerLevel,
    round: 1,
    enemies,
    log: [],
    lastAction: null,
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
  const existing = store.bySession?.[sessionKey];
  store.bySession[sessionKey] = {
    ...clone(combat),
    log: Array.isArray(combat.log) ? combat.log : (existing?.log || []),
    lastAction: combat.lastAction || existing?.lastAction || null,
    updatedAt: Date.now(),
  };
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

export function applyCombatAttackResult(sessionKey, instanceId, result) {
  const store = readStore();
  const combat = store.bySession?.[sessionKey];
  if (!combat || !result) return null;

  let targetBefore = null;
  let targetAfter = null;
  const enemies = (combat.enemies || []).map((enemy) => {
    if (enemy.instanceId !== instanceId) return enemy;
    targetBefore = clone(enemy);

    const current = Math.max(0, Number(enemy?.hp?.current || 0));
    const max = Math.max(0, Number(enemy?.hp?.max || current));
    const totalFinalDamage = Math.max(0, Number(result.totalFinalDamage || 0));
    const radioactiveExtra = Math.max(0, Number(result.radioactiveFinalDamage || 0));
    const mainRadiation = String(result.damageType || "").toLowerCase() === "radiation"
      ? totalFinalDamage
      : 0;
    const hpDamage = mainRadiation > 0 ? 0 : totalFinalDamage;
    const radiationDamage = mainRadiation + radioactiveExtra;

    let nextCurrent = Math.max(0, current - hpDamage);
    const nextMax = Math.max(0, max - radiationDamage);
    nextCurrent = Math.min(nextCurrent, nextMax);

    const combatStatuses = {
      ...(enemy.combatStatuses || {}),
      ...(result.stunned ? { stunned: true } : {}),
      ...(result.persistentRounds > 0
        ? { persistent: { rounds: result.persistentRounds, damageType: result.damageType } }
        : {}),
    };

    targetAfter = {
      ...enemy,
      hp: { current: nextCurrent, max: nextMax },
      combatStatuses,
      defeated: nextCurrent <= 0 || nextMax <= 0,
    };
    return targetAfter;
  });

  if (!targetBefore || !targetAfter) return null;

  const action = {
    token: `combat-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "player_attack",
    at: Date.now(),
    target: {
      instanceId,
      name: targetBefore.name,
      hpBefore: targetBefore.hp,
      hpAfter: targetAfter.hp,
      defeated: targetAfter.defeated,
    },
    result: clone(result),
  };

  const allDefeated = enemies.length > 0 && enemies.every((enemy) => enemy.defeated || Number(enemy?.hp?.current || 0) <= 0);
  const nextCombat = {
    ...combat,
    enemies,
    status: allDefeated ? "resolved" : "active",
    lastAction: action,
    log: [...(Array.isArray(combat.log) ? combat.log : []), action].slice(-30),
    updatedAt: Date.now(),
  };

  store.bySession[sessionKey] = nextCombat;
  store.latestSessionKey = sessionKey;
  writeStore(store);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_ACTION_EVENT, {
      detail: { sessionKey, action, combat: nextCombat },
    }));
  }

  return { combat: nextCombat, action };
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
