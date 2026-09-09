import { BESTIARY_ENTRIES } from "../data/bestiary.js";

const DIFFICULTY_ORDER = ["easy", "standard", "hard", "deadly"];

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

function combatEntries() {
  return BESTIARY_ENTRIES.filter((entry) => {
    const level = number(entry?.level);
    const xp = number(entry?.xp);
    const category = String(entry?.category || "").toLowerCase();
    return level > 0 && xp > 0 && !["trap", "hazard", "obstacle"].includes(category);
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

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function baselineXpForLevel(level) {
  const target = clamp(level || 1, 1, 50);
  let matches = ENTRIES.filter((entry) => Math.abs(number(entry.level) - target) <= 1);
  if (matches.length < 3) {
    matches = [...ENTRIES]
      .sort((a, b) => Math.abs(number(a.level) - target) - Math.abs(number(b.level) - target))
      .slice(0, 8);
  }
  return Math.max(10, median(matches.map((entry) => number(entry.xp))) || Math.round(10 + target * 6.5));
}

export function normalizedPartyConfig(spec = {}) {
  return {
    avgPartyLevel: clamp(spec.avgPartyLevel ?? spec.partyLevel ?? 1, 1, 50),
    partySize: clamp(spec.partySize ?? 4, 1, 8),
  };
}

export function targetEncounterXp(spec = {}) {
  const { avgPartyLevel, partySize } = normalizedPartyConfig(spec);
  return Math.max(10, Math.round(baselineXpForLevel(avgPartyLevel) * partySize));
}

function candidateEntries(candidates = []) {
  return candidates
    .map((name) => ({ requestedName: name, entry: findBestiaryCombatEntry(name) }))
    .filter((item) => item.entry);
}

function chooseCandidate(candidates, groupBudget, avgPartyLevel, rng) {
  const found = candidateEntries(candidates);
  if (!found.length) return null;
  const scored = found.map((item) => {
    const level = number(item.entry.level, 1);
    const xp = number(item.entry.xp, 10);
    const levelDistance = Math.abs(level - avgPartyLevel);
    const budgetDistance = Math.abs(xp - Math.max(10, groupBudget)) / Math.max(10, groupBudget);
    return { ...item, score: levelDistance * 1.8 + budgetDistance + rng() * 0.18 };
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

function ensureEnemyGroup(spec, rooms) {
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

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const rooms = inputRooms.map((room) => ({
    ...room,
    enemies: (room.enemies || []).map((enemy) => ({ ...enemy, candidates: [...(enemy.candidates || [enemy.type])] })),
    markers: [...(room.markers || [])],
  }));
  const groups = ensureEnemyGroup(spec, rooms);
  if (!groups.length) return rooms;

  const { avgPartyLevel, partySize } = normalizedPartyConfig(spec);
  const targetXp = targetEncounterXp(spec);
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${avgPartyLevel}:${partySize}:encounter-balance-v1`));
  const groupBudget = targetXp / groups.length;
  const maxEnemies = Math.min(14, Math.max(2, partySize * 2 + 2));

  groups.forEach(({ enemy }) => {
    const chosen = chooseCandidate(enemy.candidates, groupBudget, avgPartyLevel, rng);
    if (chosen) {
      enemy.type = String(chosen.entry.name || chosen.requestedName || enemy.type);
      enemy.level = number(chosen.entry.level, avgPartyLevel);
      enemy.xp = Math.max(1, number(chosen.entry.xp, 10));
      enemy.npcId = String(chosen.entry.id || "");
    } else {
      const fallbackXp = Math.max(10, Math.round(baselineXpForLevel(avgPartyLevel) * 0.75));
      enemy.level = avgPartyLevel;
      enemy.xp = fallbackXp;
      enemy.npcId = "";
    }
    enemy.count = Math.max(1, Math.min(5, Math.round(groupBudget / Math.max(1, enemy.xp))));
  });

  const totalCount = () => groups.reduce((sum, { enemy }) => sum + Number(enemy.count || 0), 0);
  const totalXp = () => groups.reduce((sum, { enemy }) => sum + Number(enemy.count || 0) * Number(enemy.xp || 0), 0);

  while (totalCount() > maxEnemies) {
    const reducible = groups
      .map(({ enemy }) => enemy)
      .filter((enemy) => enemy.count > 1)
      .sort((a, b) => number(a.xp) - number(b.xp));
    if (!reducible.length) break;
    reducible[0].count -= 1;
  }

  let guard = 0;
  while (totalXp() < targetXp * 0.82 && totalCount() < maxEnemies && guard < 24) {
    guard += 1;
    const cheapest = groups.map(({ enemy }) => enemy).sort((a, b) => number(a.xp) - number(b.xp))[0];
    if (!cheapest) break;
    cheapest.count += 1;
  }

  guard = 0;
  while (totalXp() > targetXp * 1.45 && guard < 24) {
    guard += 1;
    const expensive = groups
      .map(({ enemy }) => enemy)
      .filter((enemy) => enemy.count > 1)
      .sort((a, b) => number(b.xp) - number(a.xp))[0];
    if (!expensive) break;
    expensive.count -= 1;
  }

  return rooms;
}

export function encounterDifficulty(actualXp, targetXp) {
  const ratio = targetXp > 0 ? actualXp / targetXp : 0;
  if (ratio <= 0.65) return { key: "easy", ratio };
  if (ratio <= 1.15) return { key: "standard", ratio };
  if (ratio <= 1.5) return { key: "hard", ratio };
  return { key: "deadly", ratio };
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const targetXp = targetEncounterXp(spec);
  const { avgPartyLevel, partySize } = normalizedPartyConfig(spec);
  const enemies = rooms.flatMap((room) => (room.enemies || []).map((enemy) => ({ ...enemy, roomId: room.id })));
  const totalEnemies = enemies.reduce((sum, enemy) => sum + number(enemy.count), 0);
  const actualXp = enemies.reduce((sum, enemy) => {
    const entry = enemy.xp ? null : findBestiaryCombatEntry(enemy.type);
    const xp = Math.max(0, number(enemy.xp ?? entry?.xp));
    return sum + xp * number(enemy.count);
  }, 0);
  const difficulty = encounterDifficulty(actualXp, targetXp);
  return {
    avgPartyLevel,
    partySize,
    baselineXp: baselineXpForLevel(avgPartyLevel),
    targetXp,
    actualXp,
    xpPerPlayer: partySize ? Math.round(actualXp / partySize) : actualXp,
    totalEnemies,
    difficulty: difficulty.key,
    ratio: difficulty.ratio,
    difficultyOrder: DIFFICULTY_ORDER.indexOf(difficulty.key),
  };
}
