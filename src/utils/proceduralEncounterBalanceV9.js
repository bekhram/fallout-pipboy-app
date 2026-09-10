import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { enemyGroupForEntry } from "./proceduralEnemyGroups.js";
import * as V8 from "./proceduralEncounterBalanceV8.js";

export * from "./proceduralEncounterBalanceV8.js";

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizedRank(value) {
  const rank = String(value || "standard").toLowerCase();
  return ["minion", "standard", "special", "legendary"].includes(rank) ? rank : "standard";
}

const INSTITUTE_SCIENTIST_ID = "institute-scientist";

const INSTITUTE_COMBAT_SYNTHS = BESTIARY_ENTRIES.filter((entry) => {
  const id = String(entry?.id || "").toLowerCase();
  const text = `${entry?.name || ""} ${entry?.creatureType || ""} ${(entry?.tags || []).join(" ")}`.toLowerCase();
  return id !== INSTITUTE_SCIENTIST_ID
    && enemyGroupForEntry(entry) === "institute"
    && num(entry?.level) > 0
    && /\bsynth\b/.test(text);
});

function closestCombatSynth(level) {
  const wanted = Math.max(1, num(level, 1));
  return [...INSTITUTE_COMBAT_SYNTHS]
    .sort((a, b) => {
      const distance = Math.abs(num(a?.level, 1) - wanted) - Math.abs(num(b?.level, 1) - wanted);
      if (distance) return distance;
      return num(a?.level, 1) - num(b?.level, 1);
    })[0] || null;
}

function replaceRankedScientist(enemy, partyLevel) {
  const rank = normalizedRank(enemy?.rank);
  if (String(enemy?.npcId || "").toLowerCase() !== INSTITUTE_SCIENTIST_ID || rank === "standard") {
    return { ...enemy };
  }

  const replacement = closestCombatSynth(enemy?.baseLevel ?? enemy?.originalLevel ?? enemy?.level);
  if (!replacement) return { ...enemy, rank: "standard" };

  const baseLevel = Math.max(1, Math.floor(num(replacement?.level, 1)));
  const scale = V8.proceduralEnemyLevelScale(baseLevel, partyLevel);
  const baseXp = V8.normalNpcXpForLevel(scale.targetLevel);

  return {
    ...enemy,
    type: String(replacement?.name || "Synth"),
    npcId: String(replacement?.id || ""),
    candidates: [String(replacement?.name || "Synth")],
    enemyGroup: "institute",
    baseLevel: scale.originalLevel,
    originalLevel: scale.originalLevel,
    level: scale.targetLevel,
    levelScaleDifference: scale.levelDifference,
    levelAttackBonus: scale.attackBonus,
    levelDamageBonus: scale.damageBonus,
    levelScaled: scale.scaled,
    baseXp,
    xp: rank === "minion" ? V8.proceduralMinionXp(baseXp) : V8.rankXp(baseXp, rank),
    xpMultiplier: rank === "minion" ? 1 / 3 : (rank === "special" ? 2 : rank === "legendary" ? 3 : 1),
  };
}

function enforceInstituteScientistRole(spec = {}, inputRooms = []) {
  const { avgPartyLevel } = V8.normalizedPartyConfig(spec);
  return inputRooms.map((room) => ({
    ...room,
    markers: [...(room?.markers || [])],
    enemies: (room?.enemies || []).map((enemy) => replaceRankedScientist(enemy, avgPartyLevel)),
  }));
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  return enforceInstituteScientistRole(spec, V8.balanceEncounterEnemies(spec, inputRooms));
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const normalized = enforceInstituteScientistRole(spec, rooms);
  return {
    ...V8.summarizeEncounter(spec, normalized),
    instituteScientistRole: "standard-support-only",
  };
}
