import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { isProceduralSupportForGroup, proceduralSupportTypeForEntry } from "./proceduralFactionSupport.js";
import * as V7 from "./proceduralEncounterBalanceV7.js";

export * from "./proceduralEncounterBalanceV7.js";

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function count(value) {
  return Math.max(0, Math.floor(num(value, 0)));
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

function rngFrom(value) {
  let state = hashSeed(value);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TURRETS = BESTIARY_ENTRIES.filter((entry) => {
  return num(entry?.level) > 0 && proceduralSupportTypeForEntry(entry) === "turret";
});

function scaledSupportEnemy(entry, faction, partyLevel) {
  const baseLevel = Math.max(1, Math.floor(num(entry?.level, 1)));
  const scale = V7.proceduralEnemyLevelScale(baseLevel, partyLevel);
  const baseXp = V7.normalNpcXpForLevel(scale.targetLevel);
  return {
    type: String(entry?.name || "Turret"),
    npcId: String(entry?.id || ""),
    candidates: [String(entry?.name || "Turret")],
    count: 1,
    rank: "standard",
    enemyGroup: faction,
    supportUnit: true,
    supportType: "turret",
    supportFaction: faction,
    baseLevel: scale.originalLevel,
    originalLevel: scale.originalLevel,
    level: scale.targetLevel,
    levelScaleDifference: scale.levelDifference,
    levelAttackBonus: scale.attackBonus,
    levelDamageBonus: scale.damageBonus,
    levelScaled: scale.scaled,
    baseXp,
    xp: V7.rankXp(baseXp, "standard"),
    xpMultiplier: 1,
    specialFeatureId: "",
    specialFeature: "",
    legendaryAbilityId: "",
    legendaryAbility: "",
    legendaryRewardType: "",
    legendaryReward: "",
  };
}

function supportChance(difficulty) {
  if (difficulty === "easy") return 0.2;
  if (difficulty === "hard") return 0.5;
  if (difficulty === "deadly") return 0.65;
  return 0.35;
}

function chooseTurret(faction, partyLevel, replacementXp, rng) {
  const eligible = TURRETS.filter((entry) => isProceduralSupportForGroup(entry, faction));
  if (!eligible.length) return null;

  const reasonable = eligible.filter((entry) => num(entry?.level, 1) <= partyLevel + 2);
  const pool = reasonable.length ? reasonable : eligible;
  return [...pool]
    .map((entry) => {
      const profile = scaledSupportEnemy(entry, faction, partyLevel);
      const levelDistance = Math.abs(num(entry?.level, 1) - partyLevel);
      const xpDistance = Math.abs(num(profile.xp, 0) - replacementXp) / Math.max(1, replacementXp);
      return { entry, score: levelDistance * 0.08 + xpDistance + rng() * 0.03 };
    })
    .sort((a, b) => a.score - b.score)[0]?.entry || null;
}

function addFactionSupport(spec = {}, inputRooms = []) {
  const { avgPartyLevel } = V7.normalizedPartyConfig(spec);
  const difficulty = V7.normalizeEncounterDifficulty(spec?.encounterDifficulty ?? spec?.difficulty);
  const chance = supportChance(difficulty);
  const rooms = inputRooms.map((room) => ({
    ...room,
    markers: [...(room?.markers || [])],
    enemies: (room?.enemies || []).map((enemy) => ({ ...enemy })),
  }));

  let supportCount = 0;
  const maxSupport = difficulty === "deadly" ? 2 : 1;

  rooms.forEach((room) => {
    if (supportCount >= maxSupport) return;
    const faction = String(room?.enemyGroup || "").trim();
    if (!faction) return;
    if (!TURRETS.some((entry) => isProceduralSupportForGroup(entry, faction))) return;
    if ((room.enemies || []).some((enemy) => enemy?.supportUnit || /turret/i.test(String(enemy?.type || "")))) return;

    const roomRng = rngFrom(`${spec?.type}:${spec?.seed}:${room?.id}:${faction}:${difficulty}:support-turret-v1`);
    if (roomRng() > chance) return;

    const replaceIndex = (room.enemies || []).findIndex((enemy) => {
      return String(enemy?.rank || "standard").toLowerCase() === "standard" && count(enemy?.count) > 0 && !enemy?.supportUnit;
    });
    if (replaceIndex < 0) return;

    const replaced = room.enemies[replaceIndex];
    const replacementXp = Math.max(1, num(replaced?.xp, 1));
    const turretEntry = chooseTurret(faction, avgPartyLevel, replacementXp, roomRng);
    if (!turretEntry) return;

    const turret = scaledSupportEnemy(turretEntry, faction, avgPartyLevel);
    const existingCount = count(replaced?.count);
    if (existingCount > 1) {
      room.enemies[replaceIndex] = { ...replaced, count: existingCount - 1 };
      room.enemies.push(turret);
    } else {
      room.enemies.splice(replaceIndex, 1, turret);
    }
    supportCount += 1;
  });

  return rooms;
}

export function balanceEncounterEnemies(spec = {}, inputRooms = []) {
  return addFactionSupport(spec, V7.balanceEncounterEnemies(spec, inputRooms));
}

export function summarizeEncounter(spec = {}, rooms = []) {
  const normalized = addFactionSupport(spec, rooms);
  const base = V7.summarizeEncounter(spec, normalized);
  const supportTurrets = normalized.reduce((sum, room) => sum + (room?.enemies || []).reduce((roomSum, enemy) => {
    return roomSum + (enemy?.supportUnit && enemy?.supportType === "turret" ? count(enemy?.count) : 0);
  }, 0), 0);
  return {
    ...base,
    supportTurrets,
    factionSupportRules: "brotherhood+institute:turrets",
  };
}
