import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { SPECIAL_CREATURE_FEATURES, legendaryAbilitiesFor } from "./npcFeaturePresets.js";
import * as V5 from "./proceduralEncounterBalanceV5.js";
import * as V9 from "./proceduralEncounterBalanceV9.js";

export * from "./proceduralEncounterBalanceV9.js";

export const PROCEDURAL_RANK_SHARES = {
  minion: 0.4,
  standard: 0.3,
  special: 0.2,
  legendary: 0.1,
};

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

function trimForcedMinionOverflow(inputRooms = [], targetTotal = 0) {
  const rooms = cloneRooms(inputRooms);
  let extra = Math.max(0, totalEnemies(rooms) - Math.max(0, targetTotal));
  if (!extra) return rooms;

  // V6's historical "minimum ten minions" rule is the only stage that adds units
  // after the normal encounter plan. Remove minions first so the original encounter
  // size calculated by V5 is restored before applying the requested rank mix.
  for (let roomIndex = rooms.length - 1; roomIndex >= 0 && extra > 0; roomIndex -= 1) {
    const enemies = rooms[roomIndex].enemies || [];
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0 && extra > 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      if (normalizedRank(enemy?.rank) !== "minion") continue;
      const removable = Math.min(extra, count(enemy?.count));
      enemy.count = count(enemy?.count) - removable;
      extra -= removable;
    }
    rooms[roomIndex].enemies = enemies.filter((enemy) => count(enemy?.count) > 0);
  }

  // Defensive fallback: if a future wrapper adds non-minion units, still respect
  // the original total instead of returning an oversized encounter.
  for (let roomIndex = rooms.length - 1; roomIndex >= 0 && extra > 0; roomIndex -= 1) {
    const enemies = rooms[roomIndex].enemies || [];
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0 && extra > 0; enemyIndex -= 1) {
      const enemy = enemies[enemyIndex];
      const removable = Math.min(extra, count(enemy?.count));
      enemy.count = count(enemy?.count) - removable;
      extra -= removable;
    }
    rooms[roomIndex].enemies = enemies.filter((enemy) => count(enemy?.count) > 0);
  }

  rooms.forEach((room) => {
    if (!(room.enemies || []).length) room.markers = room.markers.filter((marker) => marker !== "ENEMY");
  });
  return rooms;
}

export function proceduralRankCounts(total) {
  const units = Math.max(0, Math.floor(num(total, 0)));
  if (!units) return { minion: 0, standard: 0, special: 0, legendary: 0 };

  const exact = RANKS.map((rank, index) => ({
    rank,
    index,
    exact: units * PROCEDURAL_RANK_SHARES[rank],
  }));
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  let assigned = 0;

  exact.forEach((item) => {
    const whole = Math.floor(item.exact);
    result[item.rank] = whole;
    assigned += whole;
  });

  exact
    .map((item) => ({ ...item, remainder: item.exact - Math.floor(item.exact) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .slice(0, units - assigned)
    .forEach((item) => { result[item.rank] += 1; });

  return result;
}

function flattenUnits(rooms = []) {
  const units = [];
  rooms.forEach((room, roomIndex) => {
    (room?.enemies || []).forEach((enemy, enemyIndex) => {
      for (let i = 0; i < count(enemy?.count); i += 1) {
        units.push({
          roomIndex,
          enemyIndex,
          unitIndex: i,
          roomId: String(room?.id || roomIndex),
          roomGroup: String(room?.enemyGroup || enemy?.enemyGroup || ""),
          enemy: { ...enemy, count: 1 },
        });
      }
    });
  });
  return units;
}

function strength(unit) {
  const enemy = unit?.enemy || {};
  return Math.max(
    num(enemy?.baseXp, 0),
    num(enemy?.xp, 0),
    num(enemy?.level, 0) * 10,
  );
}

function forcedStandard(unit) {
  return String(unit?.enemy?.npcId || "").toLowerCase() === INSTITUTE_SCIENTIST_ID;
}

function assignmentForUnits(units, desired) {
  const assigned = new Map();
  const available = new Set(units.map((_, index) => index));

  const standardForced = [];
  units.forEach((unit, index) => {
    if (forcedStandard(unit)) standardForced.push(index);
  });
  standardForced.forEach((index) => {
    assigned.set(index, "standard");
    available.delete(index);
  });

  const remainingQuota = { ...desired };
  remainingQuota.standard = Math.max(0, remainingQuota.standard - standardForced.length);
  if (standardForced.length > desired.standard) {
    let overflow = standardForced.length - desired.standard;
    ["minion", "special", "legendary"].forEach((rank) => {
      const taken = Math.min(overflow, remainingQuota[rank]);
      remainingQuota[rank] -= taken;
      overflow -= taken;
    });
  }

  const take = (rank, amount, sorter) => {
    if (amount <= 0) return;
    const candidates = [...available].sort((a, b) => sorter(units[a], units[b]));
    candidates.slice(0, amount).forEach((index) => {
      assigned.set(index, rank);
      available.delete(index);
    });
  };

  // Keep existing minion profiles whenever possible, then use the weakest remaining
  // profiles. Stronger enemies are preferentially promoted to special/legendary ranks.
  take("minion", remainingQuota.minion, (a, b) => {
    const aWasMinion = normalizedRank(a?.enemy?.rank) === "minion" ? 0 : 1;
    const bWasMinion = normalizedRank(b?.enemy?.rank) === "minion" ? 0 : 1;
    return aWasMinion - bWasMinion || strength(a) - strength(b) || a.roomId.localeCompare(b.roomId);
  });
  take("legendary", remainingQuota.legendary, (a, b) => strength(b) - strength(a) || a.roomId.localeCompare(b.roomId));
  take("special", remainingQuota.special, (a, b) => strength(b) - strength(a) || a.roomId.localeCompare(b.roomId));
  take("standard", remainingQuota.standard, (a, b) => strength(a) - strength(b) || a.roomId.localeCompare(b.roomId));

  // Rounding/forced-role safety: every remaining unit becomes standard.
  available.forEach((index) => assigned.set(index, "standard"));
  return assigned;
}

function rankXp(baseXp, rank) {
  if (rank === "minion") return V9.proceduralMinionXp(baseXp);
  return V9.rankXp(baseXp, rank);
}

function rankMultiplier(rank) {
  if (rank === "minion") return 1 / 3;
  if (rank === "special") return 2;
  if (rank === "legendary") return 3;
  return 1;
}

function applyRank(unit, rank, spec) {
  let enemy = { ...unit.enemy, count: 1 };
  const seed = `${spec?.type || "wasteland"}:${spec?.seed || "1"}:${unit.roomId}:${unit.enemyIndex}:${unit.unitIndex}:${rank}:rank-40-30-20-10-v1`;

  if (rank === "minion" && normalizedRank(enemy.rank) !== "minion") {
    const group = String(enemy?.enemyGroup || unit?.roomGroup || "").trim();
    const weakest = V9.weakestProceduralMinionForGroup?.(group);
    if (weakest) {
      const scale = V9.proceduralEnemyLevelScale(weakest?.level || 1, V9.normalizedPartyConfig(spec).avgPartyLevel);
      enemy = {
        ...enemy,
        type: String(weakest?.name || enemy.type || "NPC"),
        npcId: String(weakest?.id || enemy.npcId || ""),
        candidates: [String(weakest?.name || enemy.type || "NPC")],
        baseLevel: scale.originalLevel,
        originalLevel: scale.originalLevel,
        level: scale.targetLevel,
        levelScaleDifference: scale.levelDifference,
        levelAttackBonus: scale.attackBonus,
        levelDamageBonus: scale.damageBonus,
        levelScaled: scale.scaled,
      };
    }
  }

  const baseXp = Math.max(1, num(enemy?.baseXp, V9.normalNpcXpForLevel(enemy?.level || 1)));
  const next = {
    ...enemy,
    rank,
    baseXp,
    xp: rankXp(baseXp, rank),
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

function rebuildRooms(inputRooms, units, assignments, spec) {
  const rooms = inputRooms.map((room) => ({ ...room, enemies: [], markers: [...(room?.markers || [])] }));
  const grouped = new Map();

  units.forEach((unit, index) => {
    const rank = assignments.get(index) || "standard";
    const enemy = applyRank(unit, rank, spec);
    const key = [
      unit.roomIndex,
      enemy.npcId || enemy.type,
      enemy.rank,
      enemy.specialFeatureId || "",
      enemy.legendaryAbilityId || "",
      enemy.enemyGroup || unit.roomGroup || "",
    ].join("|");
    if (!grouped.has(key)) grouped.set(key, { roomIndex: unit.roomIndex, enemy: { ...enemy, count: 0 } });
    grouped.get(key).enemy.count += 1;
  });

  grouped.forEach(({ roomIndex, enemy }) => {
    if (!rooms[roomIndex]) return;
    rooms[roomIndex].enemies.push(enemy);
    if (!rooms[roomIndex].markers.includes("ENEMY")) rooms[roomIndex].markers.push("ENEMY");
  });

  rooms.forEach((room) => {
    if (!(room.enemies || []).length) room.markers = room.markers.filter((marker) => marker !== "ENEMY");
  });
  return rooms;
}

function enforceRequestedRankDistribution(spec = {}, inputRooms = []) {
  const units = flattenUnits(inputRooms);
  if (!units.length) return cloneRooms(inputRooms);
  const desired = proceduralRankCounts(units.length);
  const assignments = assignmentForUnits(units, desired);
  return rebuildRooms(inputRooms, units, assignments, spec);
}

function actualRankCounts(rooms = []) {
  const result = { minion: 0, standard: 0, special: 0, legendary: 0 };
  rooms.forEach((room) => (room?.enemies || []).forEach((enemy) => {
    const rank = normalizedRank(enemy?.rank);
    result[rank] += count(enemy?.count);
  }));
  return result;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  // V5 is the encounter size before V6's historical forced ten-minion expansion.
  const plannedRooms = V5.balanceEncounterEnemies(spec, inputRooms);
  const plannedTotal = totalEnemies(plannedRooms);

  const current = V9.balanceEncounterEnemies(spec, inputRooms);
  const restoredTotal = plannedTotal > 0 ? trimForcedMinionOverflow(current, plannedTotal) : current;
  return enforceRequestedRankDistribution(spec, restoredTotal);
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const normalized = enforceRequestedRankDistribution(spec, rooms);
  const base = V9.summarizeEncounter(spec, normalized);
  const rankCounts = actualRankCounts(normalized);
  const total = Math.max(1, totalEnemies(normalized));
  return {
    ...base,
    rankCounts,
    rankShares: Object.fromEntries(RANKS.map((rank) => [rank, rankCounts[rank] / total])),
    requestedRankShares: { ...PROCEDURAL_RANK_SHARES },
    rankDistributionRule: "40% minion / 30% standard / 20% special / 10% legendary",
    legacyMinimumMinionsIgnored: true,
  };
}
