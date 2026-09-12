import {
  aggregateCombatBuffs,
  applyCombatBuffsToAttack,
  applyCombatBuffsToStats,
  combatBuffsByTier,
} from "./combatBuffs.js";
import { parseAttackText } from "./npcCombat.js";

export const ENCOUNTER_BUFF_TIERS = ["light", "medium", "strong"];
export const RANDOM_ENCOUNTER_BUFF_CHANCE = 50;

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function normalizeEncounterBuffTier(value) {
  const tier = String(value || "light").toLowerCase();
  return ENCOUNTER_BUFF_TIERS.includes(tier) ? tier : "light";
}

function splitEffects(value) {
  return String(value || "")
    .split(/[,;•]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buffAttackText(value, buffIds) {
  if (!buffIds.length) return String(value || "");
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const profile = parseAttackText(line)[0];
      if (!profile) return line;
      const buffed = applyCombatBuffsToAttack(profile, buffIds);
      let next = line.replace(/(\d+)\s*(CD|КУ|DC)\b/i, `${Math.max(0, num(buffed.damageDice, 0))} $2`);
      const lower = next.toLowerCase();
      const missingEffects = splitEffects(buffed.effects)
        .filter((effect) => !lower.includes(effect.toLowerCase()));
      if (missingEffects.length) next = `${next}, ${missingEffects.join(", ")}`;
      return next;
    })
    .join("\n");
}

function uniqueIds(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))];
}

function noRandomBuff(stats, tier) {
  return {
    ...stats,
    generatedRandomCombatBuffs: [],
    generatedRandomCombatBuffNames: [],
    generatedRandomCombatBuffTier: tier,
    generatedRandomCombatBuffChance: RANDOM_ENCOUNTER_BUFF_CHANCE,
  };
}

export function applyRandomEncounterEnemyBuff(stats = {}, options = {}) {
  const tier = normalizeEncounterBuffTier(options.tier);
  if (!options.enabled) return stats;
  if (String(options.disposition || stats.generatedDisposition || "hostile").toLowerCase() === "friendly") {
    return noRandomBuff(stats, tier);
  }

  const seed = String(options.seed || stats.generatedEncounterSeed || "1");
  const roll = hashSeed(`${seed}:random-encounter-buff:roll`) % 100;
  if (roll >= RANDOM_ENCOUNTER_BUFF_CHANCE) return noRandomBuff(stats, tier);

  const existingIds = uniqueIds(stats.activeCombatBuffs);
  const pool = combatBuffsByTier(tier).filter((item) => !existingIds.includes(item.id));
  if (!pool.length) return noRandomBuff(stats, tier);

  const picked = pool[hashSeed(`${seed}:random-encounter-buff:${tier}:pick`) % pool.length];
  if (!picked) return noRandomBuff(stats, tier);
  const newIds = [picked.id];

  const customAttacks = (Array.isArray(stats.customAttacks) ? stats.customAttacks : [])
    .map((attack) => applyCombatBuffsToAttack(attack, newIds));
  const weapons = (Array.isArray(stats.weapons) ? stats.weapons : [])
    .map((weapon) => applyCombatBuffsToAttack(weapon, newIds));
  const attacks = buffAttackText(stats.attacks, newIds);

  const buffed = applyCombatBuffsToStats({
    ...stats,
    attacks,
    customAttacks,
    weapons,
  }, newIds);

  const combinedIds = uniqueIds([...existingIds, ...newIds]);
  const combinedSummary = aggregateCombatBuffs(combinedIds);

  return {
    ...buffed,
    activeCombatBuffs: combinedIds,
    combatBuffSummary: combinedSummary,
    combatBuffResistance: { ...(combinedSummary.resistance || {}) },
    combatBuffImmediateAp: num(combinedSummary.immediateAp, 0),
    combatBuffApPerTurn: num(combinedSummary.apPerTurn, 0),
    combatBuffExtraActionApReduction: num(combinedSummary.extraActionApReduction, 0),
    combatBuffMaxHpBonus: num(combinedSummary.maxHpBonus, 0),
    combatBuffDefenseBonus: num(combinedSummary.defenseBonus, 0),
    generatedRandomCombatBuffs: newIds,
    generatedRandomCombatBuffNames: [picked.name],
    generatedRandomCombatBuffTier: tier,
    generatedRandomCombatBuffChance: RANDOM_ENCOUNTER_BUFF_CHANCE,
  };
}
