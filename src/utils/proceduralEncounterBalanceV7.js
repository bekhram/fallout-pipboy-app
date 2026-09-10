import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { enemyGroupForEntry } from "./proceduralEnemyGroups.js";
import * as V6 from "./proceduralEncounterBalanceV6.js";

export * from "./proceduralEncounterBalanceV6.js";

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

function combatEntry(entry) {
  const category = String(entry?.category || "").toLowerCase();
  return num(entry?.level) > 0 && !["trap", "hazard", "obstacle", "ally"].includes(category);
}

function entryText(entry = {}) {
  return [
    entry?.name,
    entry?.creatureType,
    entry?.category,
    entry?.abilities,
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
  ].filter(Boolean).join(" ").toLowerCase();
}

export function isLargeProceduralEnemy(entry = {}) {
  const explicit = Number(entry?.baseSize ?? entry?.size ?? entry?.footprint);
  if (Number.isFinite(explicit) && explicit >= 2) return true;
  const source = entryText(entry);
  return /\b(big|massive|large|huge|giant)\b|крупн|огромн|великан|великий|duz(?:y|a|e)|duży|duża|duże/i.test(source);
}

const COMBAT_ENTRIES = BESTIARY_ENTRIES.filter(combatEntry);
const ENTRY_BY_ID = new Map(COMBAT_ENTRIES.map((entry) => [String(entry?.id || ""), entry]));

function findCurrentEntry(enemy = {}) {
  const id = String(enemy?.npcId || "");
  if (id && ENTRY_BY_ID.has(id)) return ENTRY_BY_ID.get(id);
  const name = String(enemy?.type || "").toLowerCase().trim();
  if (!name) return null;
  return COMBAT_ENTRIES.find((entry) => String(entry?.name || "").toLowerCase().trim() === name) || null;
}

const weakestSmallCache = new Map();
const weakestAnyCache = new Map();

function sortedGroupEntries(group, allowLarge) {
  return COMBAT_ENTRIES
    .filter((entry) => enemyGroupForEntry(entry) === group)
    .filter((entry) => allowLarge || !isLargeProceduralEnemy(entry))
    .sort((a, b) => {
      const levelDiff = num(a?.level, 1) - num(b?.level, 1);
      if (levelDiff) return levelDiff;
      const xpDiff = V6.normalNpcXpForLevel(a?.level || 1) - V6.normalNpcXpForLevel(b?.level || 1);
      if (xpDiff) return xpDiff;
      const hpDiff = num(a?.maxHp ?? a?.hp ?? a?.health, 0) - num(b?.maxHp ?? b?.hp ?? b?.health, 0);
      if (hpDiff) return hpDiff;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    });
}

export function weakestProceduralMinionForGroup(group) {
  const key = String(group || "other");
  if (!weakestSmallCache.has(key)) weakestSmallCache.set(key, sortedGroupEntries(key, false)[0] || null);
  return weakestSmallCache.get(key);
}

function weakestAnyForGroup(group) {
  const key = String(group || "other");
  if (!weakestAnyCache.has(key)) weakestAnyCache.set(key, sortedGroupEntries(key, true)[0] || null);
  return weakestAnyCache.get(key);
}

function scaledProfile(entry, partyLevel, wantedRank = "minion") {
  const baseLevel = Math.max(1, Math.floor(num(entry?.level, 1)));
  const scale = V6.proceduralEnemyLevelScale(baseLevel, partyLevel);
  const baseXp = V6.normalNpcXpForLevel(scale.targetLevel);
  const minion = wantedRank === "minion";
  return {
    type: String(entry?.name || "NPC"),
    npcId: String(entry?.id || ""),
    candidates: [String(entry?.name || "NPC")],
    rank: wantedRank,
    baseLevel: scale.originalLevel,
    originalLevel: scale.originalLevel,
    level: scale.targetLevel,
    levelScaleDifference: scale.levelDifference,
    levelAttackBonus: scale.attackBonus,
    levelDamageBonus: scale.damageBonus,
    levelScaled: scale.scaled,
    baseXp,
    xp: minion ? V6.proceduralMinionXp(baseXp) : V6.rankXp(baseXp, wantedRank),
    xpMultiplier: minion ? 1 / 3 : 1,
    specialFeatureId: "",
    specialFeature: "",
    legendaryAbilityId: "",
    legendaryAbility: "",
    legendaryRewardType: "",
    legendaryReward: "",
  };
}

function groupFor(enemy, room) {
  const explicit = String(enemy?.enemyGroup || room?.enemyGroup || "").trim();
  if (explicit) return explicit;
  const entry = findCurrentEntry(enemy);
  return entry ? enemyGroupForEntry(entry) : "other";
}

function hasNonMinionForGroup(rooms, group) {
  return rooms.some((room) => (room?.enemies || []).some((enemy) => {
    return count(enemy?.count) > 0 && rank(enemy?.rank) !== "minion" && groupFor(enemy, room) === group;
  }));
}

function enforceMinionSpeciesRules(spec = {}, inputRooms = []) {
  const { avgPartyLevel } = V6.normalizedPartyConfig(spec);
  const rooms = inputRooms.map((room) => ({
    ...room,
    markers: [...(room?.markers || [])],
    enemies: (room?.enemies || []).map((enemy) => ({ ...enemy })),
  }));
  const fallbackAdded = new Set();

  rooms.forEach((room) => {
    const next = [];
    (room?.enemies || []).forEach((enemy) => {
      if (rank(enemy?.rank) !== "minion" || count(enemy?.count) <= 0) {
        next.push(enemy);
        return;
      }

      const group = groupFor(enemy, room);
      const weakest = weakestProceduralMinionForGroup(group);

      if (weakest) {
        next.push({
          ...enemy,
          ...scaledProfile(weakest, avgPartyLevel, "minion"),
          count: count(enemy.count),
          enemyGroup: group,
        });
        return;
      }

      // Some factions/species only have large profiles. Never create a large minion merely to
      // satisfy the ten-minion rule. If the encounter would otherwise have no non-minion from
      // this group, keep one weakest member as a STANDARD enemy instead.
      if (!hasNonMinionForGroup(rooms, group) && !fallbackAdded.has(group)) {
        const fallback = weakestAnyForGroup(group);
        if (fallback) {
          next.push({
            ...enemy,
            ...scaledProfile(fallback, avgPartyLevel, "standard"),
            count: 1,
            enemyGroup: group,
          });
          fallbackAdded.add(group);
        }
      }
    });
    room.enemies = next;
    if (!(room.enemies || []).length) room.markers = room.markers.filter((marker) => marker !== "ENEMY");
  });

  return rooms;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  return enforceMinionSpeciesRules(spec, V6.balanceEncounterEnemies(spec, inputRooms));
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const normalized = enforceMinionSpeciesRules(spec, rooms);
  const base = V6.summarizeEncounter(spec, normalized);
  return {
    ...base,
    minionRule: "weakest-small-faction-member",
    largeMinionsAllowed: false,
  };
}
