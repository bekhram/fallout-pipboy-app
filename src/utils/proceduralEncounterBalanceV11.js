import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { SPECIAL_CREATURE_FEATURES, legendaryAbilitiesFor } from "./npcFeaturePresets.js";
import * as V10 from "./proceduralEncounterBalanceV10.js";

export * from "./proceduralEncounterBalanceV10.js";

const RANKS = ["minion", "standard", "special", "legendary"];
const INSTITUTE_SCIENTIST_ID = "institute-scientist";
const ENTRY_BY_ID = new Map(BESTIARY_ENTRIES.map((entry) => [String(entry?.id || ""), entry]));

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

function hashSeed(value) {
  const source = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickDeterministic(list, seed) {
  if (!list.length) return null;
  return list[hashSeed(seed) % list.length] || null;
}

function cloneRooms(inputRooms = []) {
  return inputRooms.map((room) => ({
    ...room,
    markers: [...(room?.markers || [])],
    enemies: (room?.enemies || []).map((enemy) => ({ ...enemy })),
  }));
}

function totalEnemies(rooms = []) {
  return rooms.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => roomSum + count(enemy?.count), 0), 0);
}

function rankCounts(rooms = []) {
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  rooms.forEach((room) => (room?.enemies || []).forEach((enemy) => {
    result[normalizedRank(enemy?.rank)] += count(enemy?.count);
  }));
  return result;
}

function roomEnemyCount(room) {
  return (room?.enemies || []).reduce((sum, enemy) => sum + count(enemy?.count), 0);
}

function enemyStrength(enemy = {}) {
  return Math.max(
    num(enemy?.baseXp, 0),
    num(enemy?.xp, 0),
    num(enemy?.level, 0) * 10,
  );
}

function sourceRows(rooms = []) {
  const rows = [];
  rooms.forEach((room, roomIndex) => {
    (room?.enemies || []).forEach((enemy, enemyIndex) => {
      if (count(enemy?.count) <= 0) return;
      rows.push({ room, roomIndex, enemyIndex, enemy });
    });
  });
  return rows;
}

function rankNeededForNextUnit(rooms = []) {
  const nextTotal = totalEnemies(rooms) + 1;
  const desired = V10.proceduralRankCounts(nextTotal);
  const current = rankCounts(rooms);
  const deficits = RANKS
    .map((rank, index) => ({ rank, index, deficit: num(desired?.[rank]) - num(current?.[rank]) }))
    .filter((item) => item.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.index - b.index);
  return deficits[0]?.rank || "standard";
}

function chooseTemplate(rooms, rank, spec, iteration) {
  let rows = sourceRows(rooms);
  if (rank !== "standard") {
    const withoutScientist = rows.filter(({ enemy }) => String(enemy?.npcId || "").toLowerCase() !== INSTITUTE_SCIENTIST_ID);
    if (withoutScientist.length) rows = withoutScientist;
  }
  if (!rows.length) return null;

  const strongestFirst = rank === "special" || rank === "legendary";
  rows.sort((a, b) => {
    const strengthDiff = strongestFirst
      ? enemyStrength(b.enemy) - enemyStrength(a.enemy)
      : enemyStrength(a.enemy) - enemyStrength(b.enemy);
    if (strengthDiff) return strengthDiff;
    const aKey = `${a.room?.id || a.roomIndex}:${a.enemy?.npcId || a.enemy?.type || a.enemyIndex}`;
    const bKey = `${b.room?.id || b.roomIndex}:${b.enemy?.npcId || b.enemy?.type || b.enemyIndex}`;
    return aKey.localeCompare(bKey);
  });

  const band = rows.slice(0, Math.min(4, rows.length));
  return pickDeterministic(band, `${spec?.type || "wasteland"}:${spec?.seed || "1"}:${rank}:${iteration}:target-xp-template`);
}

function roomGroup(room, enemy) {
  return String(enemy?.enemyGroup || room?.enemyGroup || "").trim();
}

function chooseTargetRoom(rooms, template, spec, iteration) {
  const group = roomGroup(template.room, template.enemy);
  let candidates = rooms.map((room, roomIndex) => ({ room, roomIndex }));
  if (group) {
    const matching = candidates.filter(({ room }) => {
      if (String(room?.enemyGroup || "").trim() === group) return true;
      return (room?.enemies || []).some((enemy) => roomGroup(room, enemy) === group);
    });
    if (matching.length) candidates = matching;
  }
  candidates.sort((a, b) => roomEnemyCount(a.room) - roomEnemyCount(b.room) || String(a.room?.id || a.roomIndex).localeCompare(String(b.room?.id || b.roomIndex)));
  const minimum = roomEnemyCount(candidates[0]?.room);
  const leastUsed = candidates.filter(({ room }) => roomEnemyCount(room) === minimum);
  return pickDeterministic(leastUsed, `${spec?.seed || "1"}:${iteration}:target-xp-room`) || { room: template.room, roomIndex: template.roomIndex };
}

function xpForRank(baseXp, rank) {
  if (rank === "minion") return V10.proceduralMinionXp(baseXp);
  return V10.rankXp(baseXp, rank);
}

function rankMultiplier(rank) {
  if (rank === "minion") return 1 / 3;
  if (rank === "special") return 2;
  if (rank === "legendary") return 3;
  return 1;
}

function buildRankedEnemy(template, rank, spec, iteration) {
  let enemy = { ...template.enemy, count: 1 };
  const { avgPartyLevel } = V10.normalizedPartyConfig(spec);
  const group = roomGroup(template.room, enemy);
  const seed = `${spec?.type || "wasteland"}:${spec?.seed || "1"}:${group}:${rank}:${iteration}:target-xp-unit-v1`;

  if (rank === "minion") {
    const weakest = V10.weakestProceduralMinionForGroup?.(group);
    if (weakest) {
      const scale = V10.proceduralEnemyLevelScale(weakest?.level || 1, avgPartyLevel);
      enemy = {
        ...enemy,
        type: String(weakest?.name || enemy?.type || "NPC"),
        npcId: String(weakest?.id || enemy?.npcId || ""),
        candidates: [String(weakest?.name || enemy?.type || "NPC")],
        enemyGroup: group || enemy?.enemyGroup || "",
        baseLevel: scale.originalLevel,
        originalLevel: scale.originalLevel,
        level: scale.targetLevel,
        levelScaleDifference: scale.levelDifference,
        levelAttackBonus: scale.attackBonus,
        levelDamageBonus: scale.damageBonus,
        levelScaled: scale.scaled,
        baseXp: V10.normalNpcXpForLevel(scale.targetLevel),
      };
    }
  }

  const baseXp = Math.max(1, num(enemy?.baseXp, V10.normalNpcXpForLevel(enemy?.level || avgPartyLevel)));
  const next = {
    ...enemy,
    count: 1,
    rank,
    baseXp,
    xp: xpForRank(baseXp, rank),
    xpMultiplier: rankMultiplier(rank),
    specialFeatureId: "",
    specialFeature: "",
    legendaryAbilityId: "",
    legendaryAbility: "",
    legendaryRewardType: "",
    legendaryReward: "",
  };

  if (rank === "special") {
    const feature = pickDeterministic(SPECIAL_CREATURE_FEATURES, `${seed}:special`);
    if (feature) {
      next.specialFeatureId = feature.id;
      next.specialFeature = `${feature.name} — ${feature.summary}`;
    }
  }

  if (rank === "legendary") {
    const entry = ENTRY_BY_ID.get(String(next?.npcId || ""));
    const kind = String(entry?.cardKind || entry?.statKind || "creature").toLowerCase() === "character" ? "npc" : "creature";
    const ability = pickDeterministic(legendaryAbilitiesFor(kind), `${seed}:legendary`);
    if (ability) {
      next.legendaryAbilityId = ability.id;
      next.legendaryAbility = `${ability.name} — ${ability.summary}`;
    }
    next.legendaryRewardType = (hashSeed(`${seed}:reward`) % 2) === 0 ? "weapon" : "armor";
    next.legendaryReward = "Legendary encounter reward";
  }

  return next;
}

function sameEnemyBucket(a = {}, b = {}) {
  return String(a?.npcId || a?.type || "") === String(b?.npcId || b?.type || "")
    && normalizedRank(a?.rank) === normalizedRank(b?.rank)
    && String(a?.specialFeatureId || "") === String(b?.specialFeatureId || "")
    && String(a?.legendaryAbilityId || "") === String(b?.legendaryAbilityId || "")
    && String(a?.enemyGroup || "") === String(b?.enemyGroup || "");
}

function appendBudgetUnit(inputRooms, spec, iteration) {
  const rooms = cloneRooms(inputRooms);
  const rank = rankNeededForNextUnit(rooms);
  const template = chooseTemplate(rooms, rank, spec, iteration);
  if (!template) return { rooms, added: false };

  const target = chooseTargetRoom(rooms, template, spec, iteration);
  const enemy = buildRankedEnemy(template, rank, spec, iteration);
  const room = rooms[target.roomIndex];
  if (!room) return { rooms, added: false };

  const existing = (room.enemies || []).find((item) => sameEnemyBucket(item, enemy));
  if (existing) existing.count = count(existing.count) + 1;
  else room.enemies.push(enemy);
  if (!room.markers.includes("ENEMY")) room.markers.push("ENEMY");
  return { rooms, added: true };
}

function actualXp(spec, rooms) {
  return Math.max(0, num(V10.summarizeEncounter(spec, rooms)?.actualXp, 0));
}

function enforceTargetXpFloor(spec = {}, inputRooms = []) {
  const targetXp = Math.max(1, num(V10.targetEncounterXp(spec), 1));
  let rooms = cloneRooms(inputRooms);
  let xp = actualXp(spec, rooms);
  let guard = 0;

  while (xp < targetXp && guard < 100) {
    const next = appendBudgetUnit(rooms, spec, guard);
    if (!next.added) break;
    rooms = next.rooms;
    xp = actualXp(spec, rooms);
    guard += 1;
  }

  return rooms;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  const proportional = V10.balanceEncounterEnemies(spec, inputRooms);
  return enforceTargetXpFloor(spec, proportional);
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const base = V10.summarizeEncounter(spec, rooms);
  const partySize = Math.max(1, num(base?.partySize, V10.normalizedPartyConfig(spec).partySize));
  const totalXp = Math.max(0, num(base?.actualXp, 0));
  const perPlayer = totalXp / partySize;
  return {
    ...base,
    xpPerPlayer: Math.round(perPlayer * 10) / 10,
    targetXpFloorEnforced: totalXp >= num(base?.targetXp, 0),
    encounterBudgetRule: "enemy XP must be greater than or equal to target XP; excess XP is allowed",
  };
}
