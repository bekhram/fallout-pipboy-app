import * as V4 from "./proceduralEncounterBalanceV4.js";

export * from "./proceduralEncounterBalanceV4.js";

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRank(value) {
  const rank = String(value || "standard").toLowerCase();
  return ["minion", "standard", "special", "legendary"].includes(rank) ? rank : "standard";
}

export function proceduralEnemyLevelScale(baseLevel, partyLevel) {
  const originalLevel = Math.max(1, Math.floor(num(baseLevel, 1)));
  const targetLevel = Math.max(originalLevel, Math.floor(num(partyLevel, originalLevel)));
  const levelDifference = Math.max(0, targetLevel - originalLevel);
  const stepBonus = Math.floor(levelDifference / 2);
  return {
    originalLevel,
    targetLevel,
    levelDifference,
    attackBonus: stepBonus,
    damageBonus: stepBonus,
    scaled: stepBonus > 0 || targetLevel > originalLevel,
  };
}

function scaleEnemy(enemy, avgPartyLevel) {
  const baseLevel = num(enemy?.baseLevel ?? enemy?.originalLevel ?? enemy?.level, 1);
  const scale = proceduralEnemyLevelScale(baseLevel, avgPartyLevel);
  const rank = normalizeRank(enemy?.rank);
  const baseXp = V4.normalNpcXpForLevel(scale.targetLevel);
  return {
    ...enemy,
    rank,
    baseLevel: scale.originalLevel,
    originalLevel: scale.originalLevel,
    level: scale.targetLevel,
    levelScaleDifference: scale.levelDifference,
    levelAttackBonus: scale.attackBonus,
    levelDamageBonus: scale.damageBonus,
    levelScaled: scale.scaled,
    baseXp,
    xp: V4.rankXp(baseXp, rank),
  };
}

function totalXp(rooms) {
  return rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + Math.max(0, num(enemy?.xp, 0)) * Math.max(0, Math.floor(num(enemy?.count, 0)));
  }, 0), 0);
}

function legendaryUnits(rooms) {
  return rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + (normalizeRank(enemy?.rank) === "legendary" ? Math.max(0, Math.floor(num(enemy?.count, 0))) : 0);
  }, 0), 0);
}

function trimOvershoot(rooms, targetXp, difficulty) {
  if (!(targetXp > 0)) return rooms;
  const upper = targetXp * 1.15;
  const lower = targetXp * 0.78;
  let current = totalXp(rooms);
  let guard = 0;

  while (current > upper && guard < 100) {
    guard += 1;
    const legends = legendaryUnits(rooms);
    const candidates = [];

    rooms.forEach((room, roomIndex) => {
      (room?.enemies || []).forEach((enemy, enemyIndex) => {
        const count = Math.max(0, Math.floor(num(enemy?.count, 0)));
        if (!count) return;
        const rank = normalizeRank(enemy?.rank);
        if (difficulty === "deadly" && rank === "legendary" && legends <= 1) return;
        const cost = Math.max(1, num(enemy?.xp, 1));
        const projected = current - cost;
        if (projected < lower) return;
        candidates.push({ roomIndex, enemyIndex, cost, projected, score: Math.abs(projected - targetXp) });
      });
    });

    if (!candidates.length) break;
    candidates.sort((a, b) => a.score - b.score || b.cost - a.cost);
    const selected = candidates[0];
    const enemy = rooms[selected.roomIndex].enemies[selected.enemyIndex];
    enemy.count = Math.max(0, Math.floor(num(enemy.count, 0)) - 1);
    current = selected.projected;
  }

  rooms.forEach((room) => {
    room.enemies = (room?.enemies || []).filter((enemy) => Math.max(0, Math.floor(num(enemy?.count, 0))) > 0);
  });
  return rooms;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const { avgPartyLevel } = V4.normalizedPartyConfig(spec);
  const difficulty = V4.normalizeEncounterDifficulty(spec?.encounterDifficulty ?? spec?.difficulty);
  const targetXp = V4.targetEncounterXp({ ...spec, encounterDifficulty: difficulty });
  const rooms = V4.balanceEncounterEnemies(spec, inputRooms).map((room) => ({
    ...room,
    enemies: (room?.enemies || []).map((enemy) => scaleEnemy(enemy, avgPartyLevel)),
  }));
  return trimOvershoot(rooms, targetXp, difficulty);
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const base = V4.summarizeEncounter(spec, rooms);
  const scaledEnemies = rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + (enemy?.levelScaled ? Math.max(0, Math.floor(num(enemy?.count, 0))) : 0);
  }, 0), 0);
  const maxScaleDifference = rooms.reduce((max, room) => Math.max(max, ...(room?.enemies || []).map((enemy) => num(enemy?.levelScaleDifference, 0)), 0), 0);
  return { ...base, scaledEnemies, maxScaleDifference };
}
