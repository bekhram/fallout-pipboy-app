import { encounterEnemyPowerProfile, normalizeEncounterEnemyPowerTier } from "./encounterEnemyPower.js";

const POWER_PROFILES = Object.freeze({
  easy: Object.freeze({ damageMultiplier: 1, resistanceMultiplier: 1 }),
  standard: Object.freeze({ damageMultiplier: 1, resistanceMultiplier: 1 }),
  hard: Object.freeze({ damageMultiplier: 1.5, resistanceMultiplier: 2 }),
  deadly: Object.freeze({ damageMultiplier: 2, resistanceMultiplier: 3 }),
});

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeEncounterPowerDifficulty(value) {
  const difficulty = String(value || "standard").toLowerCase();
  return Object.prototype.hasOwnProperty.call(POWER_PROFILES, difficulty) ? difficulty : "standard";
}

export function encounterDifficultyPowerProfile(value) {
  return POWER_PROFILES[normalizeEncounterPowerDifficulty(value)] || POWER_PROFILES.standard;
}

function scaleDamageDice(value, multiplier, bonus = 0) {
  const base = num(value, 0);
  return base > 0 ? Math.min(50, Math.round(base * multiplier) + bonus) : 0;
}

function addAttackEffects(value, effects) {
  let result = String(value || "");
  for (const effect of effects) {
    const piercing = effect.match(/^Piercing (\d+)$/);
    if (piercing) {
      const existing = [...result.matchAll(/\bPiercing\s+(\d+)\b/gi)];
      if (existing.length) {
        const rating = Math.max(Number(piercing[1]), ...existing.map(match => Number(match[1])));
        result = result.replace(/\bPiercing\s+\d+\b/gi, `Piercing ${rating}`);
        continue;
      }
    } else if (new RegExp(`\\b${effect}\\b`, "i").test(result)) continue;
    result = [result, effect].filter(Boolean).join(", ");
  }
  return result;
}

function scaleAttack(attack = {}, multiplier, power) {
  const current = attack.damageDice ?? attack.damage ?? attack.cd;
  if (current == null || current === "") return { ...attack };
  const scaled = scaleDamageDice(current, multiplier, power.damageBonus);
  const next = { ...attack, damageDice: scaled };
  if (scaled > 0 && power.effects.length) {
    next.effects = addAttackEffects(attack.effects ?? attack.effect, power.effects);
    next.effect = next.effects;
  }
  if (Object.prototype.hasOwnProperty.call(attack, "damage")) next.damage = scaled;
  if (Object.prototype.hasOwnProperty.call(attack, "cd")) next.cd = scaled;
  return next;
}

function scaleAttackText(value, multiplier, power) {
  return String(value || "")
    .split(/\n/)
    .map((line) => {
      let damaging = false;
      const scaled = line.replace(/(\d+(?:\.\d+)?)\s*(CD|КУ|DC)\b/gi, (_, amount, unit) => {
        const dice = scaleDamageDice(amount, multiplier, power.damageBonus);
        damaging ||= dice > 0;
        return `${dice} ${unit}`;
      });
      return damaging ? addAttackEffects(scaled, power.effects) : scaled;
    })
    .join("\n");
}

function scaleResistanceMap(value, multiplier) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(source).map(([key, amount]) => [
    key,
    Math.max(0, Math.round(num(amount, 0) * multiplier)),
  ]));
}

function scaleDrBlock(value, multiplier, bonus) {
  if (!value && !bonus) return value;
  // Only DR values are scaled; numbers in hit-location labels remain intact.
  let result = String(value || "").split("•").map(segment => segment.replace(
    /^(\s*(?:Physical(?:\s*\/\s*Energy)?|Energy(?:\s*\/\s*Physical)?|Radiation|Poison)\s*:?\s*)(.*)$/i,
    (_, prefix, tail) => prefix + tail.replace(/(^|;)(\s*)(\d+(?:\.\d+)?)/g,
      (_match, delimiter, space, amount) => `${delimiter}${space}${Math.max(0, Math.round(Number(amount) * multiplier) + bonus)}`),
  )).join("•");
  if (bonus) {
    for (const type of ["Physical", "Energy", "Radiation", "Poison"]) {
      if (!new RegExp(`\\b${type}\\b`, "i").test(result)) result = [result, `${type} ${bonus}`].filter(Boolean).join(" • ");
    }
  }
  return result;
}

export function applyEncounterDifficultyPower(stats = {}, difficultyValue = "standard", enemyPowerTier = "none") {
  const difficulty = normalizeEncounterPowerDifficulty(difficultyValue);
  const profile = encounterDifficultyPowerProfile(difficulty);
  const tier = normalizeEncounterEnemyPowerTier(enemyPowerTier);
  const power = encounterEnemyPowerProfile(tier);

  const baseAttacks = stats.encounterBaseAttacks ?? stats.attacks ?? "";
  const baseAbilities = stats.encounterBaseAbilities ?? stats.abilities ?? "";
  const baseCustomAttacks = Array.isArray(stats.encounterBaseCustomAttacks)
    ? stats.encounterBaseCustomAttacks
    : Array.isArray(stats.customAttacks) ? stats.customAttacks : [];
  const baseWeapons = Array.isArray(stats.encounterBaseWeapons)
    ? stats.encounterBaseWeapons
    : Array.isArray(stats.weapons) ? stats.weapons : [];
  const baseDrBlock = stats.encounterBaseDrBlock ?? stats.drBlock ?? "";
  const baseResistanceBonus = num(stats.encounterBaseResistanceBonus ?? stats.resistanceBonus, 0);
  const baseBuffResistance = stats.encounterBaseCombatBuffResistance && typeof stats.encounterBaseCombatBuffResistance === "object"
    ? stats.encounterBaseCombatBuffResistance
    : stats.combatBuffResistance && typeof stats.combatBuffResistance === "object"
      ? stats.combatBuffResistance
      : {};
  const summary = stats.combatBuffSummary && typeof stats.combatBuffSummary === "object"
    ? stats.combatBuffSummary
    : null;
  const baseSummaryResistance = stats.encounterBaseCombatBuffSummaryResistance && typeof stats.encounterBaseCombatBuffSummaryResistance === "object"
    ? stats.encounterBaseCombatBuffSummaryResistance
    : summary?.resistance && typeof summary.resistance === "object"
      ? summary.resistance
      : {};

  const nextSummary = summary
    ? { ...summary, resistance: scaleResistanceMap(baseSummaryResistance, profile.resistanceMultiplier) }
    : summary;
  const powerRule = difficulty === "hard"
    ? "HARD: attack damage dice x1.5; all resistance values x2"
    : difficulty === "deadly"
      ? "DEADLY: attack damage dice x2; all resistance values x3"
      : "No encounter power multiplier";

  return {
    ...stats,
    attacks: scaleAttackText(baseAttacks, profile.damageMultiplier, power),
    abilities: scaleAttackText(baseAbilities, profile.damageMultiplier, power),
    customAttacks: baseCustomAttacks.map((attack) => scaleAttack(attack, profile.damageMultiplier, power)),
    weapons: baseWeapons.map((weapon) => scaleAttack(weapon, profile.damageMultiplier, power)),
    drBlock: scaleDrBlock(baseDrBlock, profile.resistanceMultiplier, power.resistanceBonus),
    resistanceBonus: Math.max(0, Math.round(baseResistanceBonus * profile.resistanceMultiplier)),
    combatBuffResistance: scaleResistanceMap(baseBuffResistance, profile.resistanceMultiplier),
    ...(nextSummary ? { combatBuffSummary: nextSummary } : {}),
    damageMultiplier: profile.damageMultiplier,
    encounterDifficulty: difficulty,
    encounterDamageMultiplier: profile.damageMultiplier,
    encounterResistanceMultiplier: profile.resistanceMultiplier,
    encounterPowerRule: powerRule,
    enemyPowerTier: tier,
    encounterDamageBonus: power.damageBonus,
    encounterResistanceBonus: power.resistanceBonus,
    encounterAttackEffects: [...power.effects],
    encounterBaseAttacks: baseAttacks,
    encounterBaseAbilities: baseAbilities,
    encounterBaseCustomAttacks: baseCustomAttacks.map((attack) => ({ ...attack })),
    encounterBaseWeapons: baseWeapons.map((weapon) => ({ ...weapon })),
    encounterBaseDrBlock: baseDrBlock,
    encounterBaseResistanceBonus: baseResistanceBonus,
    encounterBaseCombatBuffResistance: { ...baseBuffResistance },
    encounterBaseCombatBuffSummaryResistance: { ...baseSummaryResistance },
  };
}


export function applyGeneratedEncounterPower(stats = {}, spec = {}) {
  const disposition = String(stats.generatedDisposition || "hostile").toLowerCase();
  if (disposition !== "hostile") return stats;
  return applyEncounterDifficultyPower(stats, spec.encounterDifficulty ?? spec.difficulty, spec.enemyPowerTier);
}
