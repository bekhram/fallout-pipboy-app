import * as V12 from "./proceduralEncounterBalanceV12.js";

export * from "./proceduralEncounterBalanceV12.js";

const RANKS = ["minion", "standard", "special", "legendary"];
export const MAX_MANUAL_ENEMY_COUNT = 50;

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

export function normalizeEnemyCountOverride(value) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(MAX_MANUAL_ENEMY_COUNT, parsed);
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

function currentRankCounts(rooms = []) {
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  rooms.forEach((room) => (room?.enemies || []).forEach((enemy) => {
    result[normalizedRank(enemy?.rank)] += count(enemy?.count);
  }));
  return result;
}

function desiredRankCounts(total) {
  return V12.proceduralRankCounts(Math.max(0, total));
}

function cleanupRooms(rooms) {
  rooms.forEach((room) => {
    room.enemies = (room?.enemies || []).filter((enemy) => count(enemy?.count) > 0);
    if (!room.enemies.length) {
      room.markers = (room.markers || []).filter((marker) => marker !== "ENEMY");
    } else if (!(room.markers || []).includes("ENEMY")) {
      room.markers = [...(room.markers || []), "ENEMY"];
    }
  });
  return rooms;
}

function trimToEnemyCount(rooms, desiredTotal) {
  const desired = desiredRankCounts(desiredTotal);
  let guard = 0;

  while (totalEnemies(rooms) > desiredTotal && guard < 500) {
    const current = currentRankCounts(rooms);
    const buckets = [];

    rooms.forEach((room, roomIndex) => (room?.enemies || []).forEach((enemy, enemyIndex) => {
      if (count(enemy?.count) <= 0) return;
      const rank = normalizedRank(enemy?.rank);
      const excess = current[rank] - (desired[rank] || 0);
      const xp = Math.max(0, num(enemy?.xp, enemy?.baseXp || 0));
      buckets.push({ roomIndex, enemyIndex, rank, excess, xp });
    }));

    if (!buckets.length) break;
    buckets.sort((a, b) => {
      const aPreferred = a.excess > 0 ? 0 : 1;
      const bPreferred = b.excess > 0 ? 0 : 1;
      return aPreferred - bPreferred || b.excess - a.excess || a.xp - b.xp || b.roomIndex - a.roomIndex;
    });

    const selected = buckets[0];
    const enemy = rooms[selected.roomIndex]?.enemies?.[selected.enemyIndex];
    if (!enemy) break;
    enemy.count = count(enemy.count) - 1;
    guard += 1;
  }

  return cleanupRooms(rooms);
}

function addToEnemyCount(rooms, desiredTotal) {
  const desired = desiredRankCounts(desiredTotal);
  let guard = 0;

  while (totalEnemies(rooms) < desiredTotal && guard < 500) {
    const current = currentRankCounts(rooms);
    const deficits = RANKS
      .map((rank, index) => ({ rank, index, deficit: (desired[rank] || 0) - current[rank] }))
      .sort((a, b) => b.deficit - a.deficit || a.index - b.index);
    const preferredRank = deficits[0]?.deficit > 0 ? deficits[0].rank : "standard";

    const allBuckets = [];
    rooms.forEach((room, roomIndex) => (room?.enemies || []).forEach((enemy, enemyIndex) => {
      if (count(enemy?.count) <= 0) return;
      allBuckets.push({
        roomIndex,
        enemyIndex,
        rank: normalizedRank(enemy?.rank),
        xp: Math.max(0, num(enemy?.xp, enemy?.baseXp || 0)),
        roomCount: (room?.enemies || []).reduce((sum, item) => sum + count(item?.count), 0),
      });
    }));

    if (!allBuckets.length) break;
    const preferred = allBuckets.filter((item) => item.rank === preferredRank);
    const candidates = preferred.length ? preferred : allBuckets;
    candidates.sort((a, b) => a.roomCount - b.roomCount || a.xp - b.xp || a.roomIndex - b.roomIndex || a.enemyIndex - b.enemyIndex);

    const selected = candidates[0];
    const enemy = rooms[selected.roomIndex]?.enemies?.[selected.enemyIndex];
    if (!enemy) break;
    enemy.count = count(enemy.count) + 1;
    guard += 1;
  }

  return cleanupRooms(rooms);
}

function enforceEnemyCount(spec, inputRooms) {
  const override = normalizeEnemyCountOverride(spec?.enemyCountOverride);
  const rooms = cloneRooms(inputRooms);
  if (!override) return rooms;

  const current = totalEnemies(rooms);
  if (current > override) return trimToEnemyCount(rooms, override);
  if (current < override) return addToEnemyCount(rooms, override);
  return cleanupRooms(rooms);
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const balanced = V12.balanceEncounterEnemies(spec, inputRooms);
  return enforceEnemyCount(spec, balanced);
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const base = V12.summarizeEncounter(spec, rooms);
  const override = normalizeEnemyCountOverride(spec?.enemyCountOverride);
  const enemyCount = totalEnemies(rooms);
  return {
    ...base,
    enemyCount,
    enemyCountOverride: override,
    enemyCountMode: override ? "manual" : "auto",
  };
}
