import * as V5 from "./proceduralEncounterBalanceV5.js";
import { cellsInsideRoom, getProceduralRoomBounds } from "./proceduralRoomLayout.js";

export * from "./proceduralEncounterBalanceV5.js";

export const MIN_PROCEDURAL_MINIONS = 10;

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function count(value) {
  return Math.max(0, Math.floor(num(value, 0)));
}

function rank(value) {
  const normalized = String(value || "standard").toLowerCase();
  return ["minion", "standard", "special", "legendary"].includes(normalized) ? normalized : "standard";
}

export function proceduralMinionXp(baseXp) {
  return Math.max(1, Math.round(Math.max(0, num(baseXp, 0)) / 3));
}

function normalizeEnemyXp(enemy = {}) {
  if (rank(enemy.rank) !== "minion") return { ...enemy };
  const baseXp = Math.max(1, num(enemy.baseXp, V5.normalNpcXpForLevel(enemy.level || 1)));
  return {
    ...enemy,
    rank: "minion",
    baseXp,
    xp: proceduralMinionXp(baseXp),
    xpMultiplier: 1 / 3,
  };
}

function cloneRooms(rooms = []) {
  return rooms.map((room) => ({
    ...room,
    markers: [...(room?.markers || [])],
    enemies: (room?.enemies || []).map(normalizeEnemyXp),
  }));
}

function minionCount(rooms = []) {
  return rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + (rank(enemy?.rank) === "minion" ? count(enemy?.count) : 0);
  }, 0), 0);
}

function totalXp(rooms = []) {
  return rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + Math.max(0, num(enemy?.xp, 0)) * count(enemy?.count);
  }, 0), 0);
}

function roomUsed(room) {
  return (room?.enemies || []).reduce((sum, enemy) => sum + count(enemy?.count), 0);
}

function roomCapacity(boundsByRoom, room) {
  const bounds = boundsByRoom?.[room?.id];
  return bounds ? cellsInsideRoom(bounds).length : 0;
}

function enemyGroup(enemy, room) {
  return String(enemy?.enemyGroup || room?.enemyGroup || "").trim();
}

function roomCanTakeGroup(room, group) {
  const enemies = (room?.enemies || []).filter((enemy) => count(enemy?.count) > 0);
  if (!enemies.length) return true;
  return enemies.every((enemy) => !enemyGroup(enemy, room) || enemyGroup(enemy, room) === group);
}

function minionTemplatesByGroup(rooms) {
  const result = new Map();
  rooms.forEach((room) => {
    (room?.enemies || []).forEach((enemy) => {
      if (rank(enemy?.rank) !== "minion") return;
      const group = enemyGroup(enemy, room) || "other";
      if (!result.has(group)) result.set(group, { ...enemy, count: 0, enemyGroup: group });
    });
  });
  return result;
}

function addMinionStack(room, template, amount) {
  if (!room || !template || amount <= 0) return 0;
  const group = template.enemyGroup || enemyGroup(template, room) || "other";
  const same = (room.enemies || []).find((enemy) =>
    rank(enemy?.rank) === "minion"
    && String(enemy?.npcId || enemy?.type || "") === String(template?.npcId || template?.type || "")
    && (enemyGroup(enemy, room) || group) === group
  );
  if (same) {
    same.count = count(same.count) + amount;
    same.xp = proceduralMinionXp(same.baseXp);
    same.xpMultiplier = 1 / 3;
  } else {
    room.enemies.push({ ...template, count: amount, xp: proceduralMinionXp(template.baseXp), xpMultiplier: 1 / 3, enemyGroup: group });
  }
  if (!room.enemyGroup) room.enemyGroup = group;
  if (!room.markers.includes("ENEMY")) room.markers.push("ENEMY");
  return amount;
}

function ensureMinimumMinions(spec, inputRooms) {
  const rooms = cloneRooms(inputRooms);
  const initial = minionCount(rooms);
  if (!initial || initial >= MIN_PROCEDURAL_MINIONS) return rooms;

  let missing = MIN_PROCEDURAL_MINIONS - initial;
  const templates = minionTemplatesByGroup(rooms);
  const groups = [...templates.keys()];
  if (!groups.length) return rooms;

  const boundsByRoom = getProceduralRoomBounds(spec);
  const preferred = [];
  const empty = [];

  rooms.forEach((room) => {
    if (String(room?.id || "").toLowerCase() === "wc") return;
    const capacity = roomCapacity(boundsByRoom, room);
    const free = Math.max(0, capacity - roomUsed(room));
    if (!free) return;

    const existingMinion = (room.enemies || []).find((enemy) => rank(enemy?.rank) === "minion");
    if (existingMinion) {
      const group = enemyGroup(existingMinion, room) || groups[0];
      const template = templates.get(group) || templates.get(groups[0]);
      preferred.push({ room, template, free, priority: 0 });
      return;
    }

    const roomGroup = String(room?.enemyGroup || "").trim();
    const compatibleGroup = roomGroup && templates.has(roomGroup) ? roomGroup : "";
    if (compatibleGroup && roomCanTakeGroup(room, compatibleGroup)) {
      preferred.push({ room, template: templates.get(compatibleGroup), free, priority: 1 });
      return;
    }

    if (!(room.enemies || []).some((enemy) => count(enemy?.count) > 0)) {
      empty.push({ room, template: templates.get(groups[0]), free, priority: 2 });
    }
  });

  [...preferred, ...empty]
    .sort((a, b) => a.priority - b.priority || b.free - a.free)
    .forEach(({ room, template, free }) => {
      if (missing <= 0) return;
      const added = Math.min(missing, free);
      addMinionStack(room, template, added);
      missing -= added;
    });

  // Procedural layouts normally have enough room cells for ten minions. If a very small/custom
  // layout does not, keep the encounter contract (minimum ten) and let token placement report
  // any cells it could not place rather than silently reducing the generated squad.
  if (missing > 0) {
    const firstRoom = rooms.find((room) => (room.enemies || []).some((enemy) => rank(enemy?.rank) === "minion"));
    const firstEnemy = firstRoom?.enemies?.find((enemy) => rank(enemy?.rank) === "minion");
    if (firstRoom && firstEnemy) addMinionStack(firstRoom, firstEnemy, missing);
  }

  return rooms;
}

function protectedMinimum(rooms, enemy, difficulty) {
  const enemyRank = rank(enemy?.rank);
  if (enemyRank === "minion") return MIN_PROCEDURAL_MINIONS;
  if (enemyRank === "legendary" && difficulty === "deadly") return 1;
  if (enemyRank === "special" && ["hard", "deadly"].includes(difficulty)) return 1;
  return 0;
}

function rankTotal(rooms, wantedRank) {
  return rooms.reduce((sum, room) => sum + (room.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + (rank(enemy?.rank) === wantedRank ? count(enemy?.count) : 0);
  }, 0), 0);
}

function trimNonMinionOvershoot(spec, inputRooms) {
  const rooms = cloneRooms(inputRooms);
  const difficulty = V5.normalizeEncounterDifficulty(spec?.encounterDifficulty ?? spec?.difficulty);
  const target = V5.targetEncounterXp({ ...spec, encounterDifficulty: difficulty });
  if (!(target > 0)) return rooms;

  const upper = target * 1.15;
  let current = totalXp(rooms);
  let guard = 0;

  while (current > upper && guard < 100) {
    guard += 1;
    const candidates = [];
    rooms.forEach((room, roomIndex) => {
      (room.enemies || []).forEach((enemy, enemyIndex) => {
        const enemyRank = rank(enemy?.rank);
        if (enemyRank === "minion" || count(enemy?.count) <= 0) return;
        const totalForRank = rankTotal(rooms, enemyRank);
        if (totalForRank <= protectedMinimum(rooms, enemy, difficulty)) return;
        const cost = Math.max(1, num(enemy?.xp, 1));
        const projected = current - cost;
        candidates.push({ roomIndex, enemyIndex, cost, projected, score: Math.abs(projected - target) });
      });
    });
    if (!candidates.length) break;
    candidates.sort((a, b) => a.score - b.score || b.cost - a.cost);
    const chosen = candidates[0];
    const enemy = rooms[chosen.roomIndex].enemies[chosen.enemyIndex];
    enemy.count = Math.max(0, count(enemy.count) - 1);
    current = chosen.projected;
  }

  rooms.forEach((room) => {
    room.enemies = (room.enemies || []).filter((enemy) => count(enemy?.count) > 0);
  });
  return rooms;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const balanced = V5.balanceEncounterEnemies(spec, inputRooms);
  const withSquad = ensureMinimumMinions(spec, balanced);
  return trimNonMinionOvershoot(spec, withSquad);
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const normalized = cloneRooms(rooms);
  const base = V5.summarizeEncounter(spec, normalized);
  return {
    ...base,
    minionMinimum: MIN_PROCEDURAL_MINIONS,
    minionXpDivisor: 3,
  };
}
