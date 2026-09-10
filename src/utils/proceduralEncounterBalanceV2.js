import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { NPC_RANK_RULES } from "./npcCombat.js";
import {
  SPECIAL_CREATURE_FEATURES,
  legendaryAbilitiesFor,
} from "./npcFeaturePresets.js";

export const ENCOUNTER_DIFFICULTIES = ["easy", "standard", "hard", "deadly"];

const DIFFICULTY_ORDER = ENCOUNTER_DIFFICULTIES;
const DIFFICULTY_MULTIPLIER = {
  easy: 0.6,
  standard: 1,
  hard: 1.35,
  deadly: 1.75,
};

const RANK_WEIGHTS = {
  easy: { minion: 0.62, standard: 0.38, special: 0, legendary: 0 },
  standard: { minion: 0.32, standard: 0.5, special: 0.18, legendary: 0 },
  hard: { minion: 0.2, standard: 0.42, special: 0.38, legendary: 0 },
  deadly: { minion: 0.14, standard: 0.32, special: 0.54, legendary: 0 },
};

const NORMAL_XP_BY_LEVEL = [
  0,
  10, 17, 24, 31, 38,
  45, 52, 60, 67, 74,
  81, 88, 95, 102, 109,
  116, 123, 130, 137, 144,
];

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9а-яёіїєґ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
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

function pick(rng, values = []) {
  if (!values.length) return null;
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

export function normalNpcXpForLevel(level) {
  const npcLevel = Math.max(1, Math.floor(number(level, 1)));
  if (npcLevel <= 20) return NORMAL_XP_BY_LEVEL[npcLevel];
  return 144 + (npcLevel - 20) * 7;
}

export function npcXpMultiplier(entry = {}) {
  const source = normalizeName([
    entry?.rank,
    entry?.npcRank,
    entry?.creatureType,
    entry?.category,
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
  ].filter(Boolean).join(" "));
  if (/\b(legendary|major)\b|легендар|major/.test(source)) return 3;
  if (/\b(mighty|notable|special)\b|могуч|значим|особ/.test(source)) return 2;
  return 1;
}

export function officialNpcXp(entryOrLevel, multiplier = null) {
  if (typeof entryOrLevel === "number" || typeof entryOrLevel === "string") {
    return normalNpcXpForLevel(entryOrLevel) * Math.max(1, number(multiplier, 1));
  }
  const entry = entryOrLevel || {};
  return normalNpcXpForLevel(entry.level) * (multiplier || npcXpMultiplier(entry));
}

export function rankXp(baseXp, rank = "standard") {
  const rule = NPC_RANK_RULES[rank] || NPC_RANK_RULES.standard;
  return Math.max(1, Math.round(number(baseXp, 10) * number(rule.xpMultiplier, 1)));
}

function combatEntries() {
  return BESTIARY_ENTRIES.filter((entry) => {
    const level = number(entry?.level);
    const category = String(entry?.category || "").toLowerCase();
    return level > 0 && !["trap", "hazard", "obstacle"].includes(category);
  });
}

const ENTRIES = combatEntries();

export function findBestiaryCombatEntry(name) {
  const needle = normalizeName(name);
  if (!needle) return null;
  const exact = ENTRIES.find((entry) => normalizeName(entry?.name) === needle);
  if (exact) return exact;
  return ENTRIES.find((entry) => {
    const haystack = normalizeName(`${entry?.name || ""} ${entry?.creatureType || ""} ${(entry?.tags || []).join(" ")}`);
    const entryName = normalizeName(entry?.name);
    return haystack.includes(needle) || (entryName && needle.includes(entryName));
  }) || null;
}

export function baselineXpForLevel(level) {
  return normalNpcXpForLevel(clamp(level || 1, 1, 50));
}

export function normalizedPartyConfig(spec = {}) {
  return {
    avgPartyLevel: clamp(spec.avgPartyLevel ?? spec.partyLevel ?? 1, 1, 50),
    partySize: clamp(spec.partySize ?? 4, 1, 8),
  };
}

export function normalizeEncounterDifficulty(value) {
  const difficulty = String(value || "standard").toLowerCase();
  return ENCOUNTER_DIFFICULTIES.includes(difficulty) ? difficulty : "standard";
}

export function baseEncounterXp(spec = {}) {
  const { avgPartyLevel, partySize } = normalizedPartyConfig(spec);
  const xpPerPlayer = normalNpcXpForLevel(avgPartyLevel) * 2;
  return Math.max(10, Math.round(xpPerPlayer * partySize));
}

export function targetEncounterXp(spec = {}) {
  const difficulty = normalizeEncounterDifficulty(spec.encounterDifficulty ?? spec.difficulty);
  return Math.max(10, Math.round(baseEncounterXp(spec) * DIFFICULTY_MULTIPLIER[difficulty]));
}

function candidateEntries(candidates = []) {
  return candidates
    .map((name) => ({ requestedName: name, entry: findBestiaryCombatEntry(name) }))
    .filter((item) => item.entry);
}

function chooseCandidate(candidates, avgPartyLevel, rng) {
  const found = candidateEntries(candidates);
  if (!found.length) return null;
  const scored = found.map((item) => {
    const level = number(item.entry.level, 1);
    const levelDistance = Math.abs(level - avgPartyLevel);
    return { ...item, score: levelDistance + rng() * 0.35 };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0];
}

const FALLBACKS = {
  wasteland: { roomId: "camp", pool: ["Raider", "Feral Ghoul", "Mole Rat", "Radroach", "Wild Mongrel"] },
  red_rocket: { roomId: "garage", pool: ["Raider", "Protectron", "Mole Rat", "Feral Ghoul", "Radroach"] },
  super_duper_mart: { roomId: "sales", pool: ["Feral Ghoul", "Raider", "Radroach"] },
  raider_camp: { roomId: "courtyard", pool: ["Raider", "Raider Veteran", "Raider Psycho", "Raider Scavver"] },
  military_bunker: { roomId: "control", pool: ["Protectron", "Mr. Gutsy", "Security Robot", "Feral Ghoul"] },
};

function ensureEnemyGroups(spec, rooms) {
  const existing = rooms.flatMap((room) => (room.enemies || []).map((enemy) => ({ room, enemy })));
  if (existing.length) return existing;
  const fallback = FALLBACKS[spec.type] || FALLBACKS.wasteland;
  const targetRoom = rooms.find((room) => room.id === fallback.roomId) || rooms[0];
  if (!targetRoom) return [];
  const enemy = { type: fallback.pool[0], count: 1, candidates: fallback.pool };
  targetRoom.enemies.push(enemy);
  if (!targetRoom.markers.includes("ENEMY")) targetRoom.markers.push("ENEMY");
  return [{ room: targetRoom, enemy }];
}

function weightedRank(rng, difficulty) {
  const weights = RANK_WEIGHTS[difficulty] || RANK_WEIGHTS.standard;
  const roll = rng();
  let cursor = 0;
  for (const rank of ["minion", "standard", "special"]) {
    cursor += weights[rank] || 0;
    if (roll <= cursor) return rank;
  }
  return "standard";
}

function decorateRank(enemy, entry, rank, rng) {
  const baseXp = normalNpcXpForLevel(enemy.level || entry?.level || 1);
  const result = {
    ...enemy,
    rank,
    baseXp,
    xp: rankXp(baseXp, rank),
    xpMultiplier: NPC_RANK_RULES[rank]?.xpMultiplier ?? 1,
    specialFeatureId: "",
    specialFeature: "",
    legendaryAbilityId: "",
    legendaryAbility: "",
    legendaryRewardType: "",
    legendaryReward: "",
  };

  if (rank === "special") {
    const feature = pick(rng, SPECIAL_CREATURE_FEATURES);
    if (feature) {
      result.specialFeatureId = feature.id;
      result.specialFeature = `${feature.name} — ${feature.summary}`;
    }
  }

  if (rank === "legendary") {
    const kind = String(entry?.cardKind || "creature").toLowerCase() === "npc" ? "npc" : "creature";
    const ability = pick(rng, legendaryAbilitiesFor(kind));
    if (ability) {
      result.legendaryAbilityId = ability.id;
      result.legendaryAbility = `${ability.name} — ${ability.summary}`;
    }
    result.legendaryRewardType = rng() < 0.5 ? "weapon" : "armor";
    result.legendaryReward = "Legendary encounter reward";
  }

  return result;
}

function roomTokenCount(planned, roomId) {
  return planned.filter((item) => item.room.id === roomId).length;
}

function selectTemplate(templates, planned, rng, preferBoss = false) {
  const available = templates.filter((template) => roomTokenCount(planned, template.room.id) < 4);
  const pool = available.length ? available : templates;
  if (!pool.length) return null;
  if (preferBoss) {
    return [...pool].sort((a, b) => b.baseXp - a.baseXp)[0];
  }
  return pool[Math.floor(rng() * pool.length)];
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const rooms = inputRooms.map((room) => ({
    ...room,
    enemies: (room.enemies || []).map((enemy) => ({ ...enemy, candidates: [...(enemy.candidates || [enemy.type])] })),
    markers: [...(room.markers || [])],
  }));
  const sourceGroups = ensureEnemyGroups(spec, rooms);
  if (!sourceGroups.length) return rooms;

  const { avgPartyLevel, partySize } = normalizedPartyConfig(spec);
  const difficulty = normalizeEncounterDifficulty(spec.encounterDifficulty ?? spec.difficulty);
  const targetXp = targetEncounterXp({ ...spec, encounterDifficulty: difficulty });
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${avgPartyLevel}:${partySize}:${difficulty}:encounter-ranks-v1`));

  const templates = sourceGroups.map(({ room, enemy }) => {
    const chosen = chooseCandidate(enemy.candidates, avgPartyLevel, rng);
    const entry = chosen?.entry || findBestiaryCombatEntry(enemy.type);
    const level = number(entry?.level, avgPartyLevel);
    return {
      room,
      source: enemy,
      entry,
      type: String(entry?.name || chosen?.requestedName || enemy.type || "NPC"),
      level,
      baseXp: normalNpcXpForLevel(level),
      npcId: String(entry?.id || ""),
    };
  });

  rooms.forEach((room) => { room.enemies = []; });

  const maxEnemies = Math.min(14, Math.max(2, partySize * 2 + 3));
  const planned = [];
  let totalXp = 0;
  let legendaryCount = 0;

  const addToken = (template, rank) => {
    if (!template || planned.length >= maxEnemies) return false;
    if (roomTokenCount(planned, template.room.id) >= 4) return false;
    if (rank === "legendary" && legendaryCount >= 1) return false;
    const base = {
      type: template.type,
      count: 1,
      candidates: [...(template.source.candidates || [template.type])],
      level: template.level,
      npcId: template.npcId,
    };
    const enemy = decorateRank(base, template.entry, rank, rng);
    planned.push({ room: template.room, enemy, template });
    totalXp += enemy.xp;
    if (rank === "legendary") legendaryCount += 1;
    return true;
  };

  // Guarantee variety according to chosen difficulty.
  if (difficulty === "standard" || difficulty === "hard" || difficulty === "deadly") {
    const specialTemplate = selectTemplate(templates, planned, rng);
    if (specialTemplate && targetXp >= specialTemplate.baseXp * 2) addToken(specialTemplate, "special");
  }

  if (difficulty === "hard" && rng() < 0.4) {
    addToken(selectTemplate(templates, planned, rng, true), "legendary");
  }

  if (difficulty === "deadly") {
    addToken(selectTemplate(templates, planned, rng, true), "legendary");
  }

  if (partySize >= 2 && planned.length < maxEnemies) {
    addToken(selectTemplate(templates, planned, rng), "minion");
  }

  let guard = 0;
  while (totalXp < targetXp * 0.92 && planned.length < maxEnemies && guard < 80) {
    guard += 1;
    const template = selectTemplate(templates, planned, rng);
    if (!template) break;
    let rank = weightedRank(rng, difficulty);
    if (rank === "legendary") rank = "special";
    const cost = rankXp(template.baseXp, rank);
    const remaining = targetXp - totalXp;

    if (cost > remaining * 1.45 && rank !== "minion") {
      rank = remaining >= template.baseXp * 0.8 ? "standard" : "minion";
    }
    if (!addToken(template, rank)) break;
  }

  if (!planned.length) addToken(templates[0], difficulty === "easy" ? "minion" : "standard");

  const grouped = new Map();
  planned.forEach(({ room, enemy }) => {
    const key = `${room.id}|${enemy.npcId || enemy.type}|${enemy.rank}|${enemy.specialFeatureId}|${enemy.legendaryAbilityId}`;
    if (!grouped.has(key)) grouped.set(key, { room, enemy: { ...enemy, count: 0 } });
    grouped.get(key).enemy.count += 1;
  });

  grouped.forEach(({ room, enemy }) => {
    room.enemies.push(enemy);
    if (!room.markers.includes("ENEMY")) room.markers.push("ENEMY");
  });

  return rooms;
}

export function encounterDifficulty(actualXp, standardTargetXp) {
  const ratio = standardTargetXp > 0 ? actualXp / standardTargetXp : 0;
  if (ratio <= 0.65) return { key: "easy", ratio };
  if (ratio <= 1.15) return { key: "standard", ratio };
  if (ratio <= 1.5) return { key: "hard", ratio };
  return { key: "deadly", ratio };
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const standardTargetXp = baseEncounterXp(spec);
  const targetDifficulty = normalizeEncounterDifficulty(spec.encounterDifficulty ?? spec.difficulty);
  const targetXp = targetEncounterXp({ ...spec, encounterDifficulty: targetDifficulty });
  const { avgPartyLevel, partySize } = normalizedPartyConfig(spec);
  const enemies = rooms.flatMap((room) => (room.enemies || []).map((enemy) => ({ ...enemy, roomId: room.id })));
  const totalEnemies = enemies.reduce((sum, enemy) => sum + number(enemy.count), 0);
  const actualXp = enemies.reduce((sum, enemy) => {
    const baseXp = number(enemy.baseXp, normalNpcXpForLevel(enemy.level || avgPartyLevel));
    const xp = Math.max(1, number(enemy.xp, rankXp(baseXp, enemy.rank)));
    return sum + xp * number(enemy.count);
  }, 0);
  const calculated = encounterDifficulty(actualXp, standardTargetXp);
  const rankCounts = { minion: 0, standard: 0, special: 0, legendary: 0 };
  enemies.forEach((enemy) => {
    const rank = ["minion", "standard", "special", "legendary"].includes(enemy.rank) ? enemy.rank : "standard";
    rankCounts[rank] += number(enemy.count);
  });

  return {
    avgPartyLevel,
    partySize,
    baselineXp: normalNpcXpForLevel(avgPartyLevel),
    standardTargetXp,
    targetXp,
    targetDifficulty,
    actualXp,
    xpPerPlayer: partySize > 0 ? Math.round((actualXp / partySize) * 10) / 10 : actualXp,
    totalEnemies,
    rankCounts,
    difficulty: calculated.key,
    ratio: calculated.ratio,
    difficultyOrder: DIFFICULTY_ORDER.indexOf(calculated.key),
  };
}