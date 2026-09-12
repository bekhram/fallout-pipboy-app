import * as V11 from "./proceduralEncounterBalanceV11.js";

export * from "./proceduralEncounterBalanceV11.js";

export const PROCEDURAL_DIFFICULTY_SCALE = 1.5;

const RANKS = ["minion", "standard", "special", "legendary"];

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function count(value) {
  return Math.max(0, Math.floor(num(value, 0)));
}

function normalizedRank(value) {
  const rank = String(value || "standard").toLowerCase();
  return RANKS.includes(rank) ? rank : "standard";
}

function cloneRooms(inputRooms = []) {
  return inputRooms.map((room) => ({
    ...room,
    markers: [...(room?.markers || [])],
    enemies: (room?.enemies || []).map((enemy) => ({ ...enemy })),
  }));
}

function totalEnemies(rooms = []) {
  return rooms.reduce(
    (sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => roomSum + count(enemy?.count), 0),
    0,
  );
}

function rankCounts(rooms = []) {
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  rooms.forEach((room) => (room?.enemies || []).forEach((enemy) => {
    result[normalizedRank(enemy?.rank)] += count(enemy?.count);
  }));
  return result;
}

function nextRank(rooms = []) {
  const desired = V11.proceduralRankCounts(totalEnemies(rooms) + 1);
  const current = rankCounts(rooms);
  return RANKS
    .map((rank, index) => ({ rank, index, deficit: num(desired?.[rank]) - num(current?.[rank]) }))
    .sort((a, b) => b.deficit - a.deficit || a.index - b.index)[0]?.rank || "standard";
}

function encounterXp(rooms = []) {
  return rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + Math.max(0, num(enemy?.xp, enemy?.baseXp || 0)) * count(enemy?.count);
  }, 0), 0);
}

function scaledTargetXp(spec = {}) {
  return Math.max(1, Math.ceil(num(V11.targetEncounterXp(spec), 1) * PROCEDURAL_DIFFICULTY_SCALE));
}

function candidateBuckets(rooms = [], preferredRank = "standard") {
  const all = [];
  rooms.forEach((room, roomIndex) => (room?.enemies || []).forEach((enemy, enemyIndex) => {
    const xp = Math.max(1, num(enemy?.xp, enemy?.baseXp || 1));
    all.push({ roomIndex, enemyIndex, rank: normalizedRank(enemy?.rank), xp });
  }));
  const preferred = all.filter((item) => item.rank === preferredRank);
  return preferred.length ? preferred : all;
}

function addClosestBudgetUnit(rooms, targetXp) {
  const currentXp = encounterXp(rooms);
  const preferredRank = nextRank(rooms);
  const candidates = candidateBuckets(rooms, preferredRank);
  if (!candidates.length) return false;

  candidates.sort((a, b) => {
    const aScore = Math.abs(targetXp - (currentXp + a.xp));
    const bScore = Math.abs(targetXp - (currentXp + b.xp));
    return aScore - bScore || a.xp - b.xp || a.roomIndex - b.roomIndex || a.enemyIndex - b.enemyIndex;
  });

  const selected = candidates[0];
  const enemy = rooms[selected.roomIndex]?.enemies?.[selected.enemyIndex];
  if (!enemy) return false;
  enemy.count = count(enemy.count) + 1;
  return true;
}

export function targetEncounterXp(spec = {}) {
  return scaledTargetXp(spec);
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const rooms = cloneRooms(V11.balanceEncounterEnemies(spec, inputRooms));
  const targetXp = scaledTargetXp(spec);
  let guard = 0;

  while (encounterXp(rooms) < targetXp && guard < 200) {
    if (!addClosestBudgetUnit(rooms, targetXp)) break;
    guard += 1;
  }

  return rooms;
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const base = V11.summarizeEncounter(spec, rooms);
  const targetXp = scaledTargetXp(spec);
  const actualXp = Math.max(0, num(base?.actualXp, encounterXp(rooms)));
  return {
    ...base,
    targetXp,
    targetXpFloorEnforced: actualXp >= targetXp,
    encounterDifficultyScale: PROCEDURAL_DIFFICULTY_SCALE,
    encounterBudgetRule: "all encounter difficulty budgets are scaled to 150% of the previous target XP",
  };
}
