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

function scaleDamageDice(value, multiplier) {
  return Math.max(0, Math.round(num(value, 0) * multiplier));
}

function scaleAttack(attack = {}, multiplier) {
  const current = attack.damageDice ?? attack.damage ?? attack.cd;
  if (current == null || current === "") return { ...attack };
  const scaled = scaleDamageDice(current, multiplier);
  const next = { ...attack, damageDice: scaled };
  if (Object.prototype.hasOwnProperty.call(attack, "damage")) next.damage = scaled;
  if (Object.prototype.hasOwnProperty.call(attack, "cd")) next.cd = scaled;
  return next;
}

function scaleAttackText(value, multiplier) {
  return String(value || "")
    .split(/\n/)
    .map((line) => line.replace(/(\d+(?:\.\d+)?)\s*(CD|КУ|DC)\b/gi, (_, amount, unit) => {
      return `${scaleDamageDice(amount, multiplier)} ${unit}`;
    }))
    .join("\n");
}

function scaleResistanceMap(value, multiplier) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(Object.entries(source).map(([key, amount]) => [
    key,
    Math.max(0, Math.round(num(amount, 0) * multiplier)),
  ]));
}

function scaleDrBlock(value, multiplier) {
  if (!value) return value;
  return String(value).replace(/\b\d+(?:\.\d+)?\b/g, (amount) => {
    return String(Math.max(0, Math.round(num(amount, 0) * multiplier)));
  });
}

export function applyEncounterDifficultyPower(stats = {}, difficultyValue = "standard") {
  const difficulty = normalizeEncounterPowerDifficulty(difficultyValue);
  const profile = encounterDifficultyPowerProfile(difficulty);

  const baseAttacks = stats.encounterBaseAttacks ?? stats.attacks ?? "";
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
    attacks: scaleAttackText(baseAttacks, profile.damageMultiplier),
    customAttacks: baseCustomAttacks.map((attack) => scaleAttack(attack, profile.damageMultiplier)),
    weapons: baseWeapons.map((weapon) => scaleAttack(weapon, profile.damageMultiplier)),
    drBlock: scaleDrBlock(baseDrBlock, profile.resistanceMultiplier),
    resistanceBonus: Math.max(0, Math.round(baseResistanceBonus * profile.resistanceMultiplier)),
    combatBuffResistance: scaleResistanceMap(baseBuffResistance, profile.resistanceMultiplier),
    ...(nextSummary ? { combatBuffSummary: nextSummary } : {}),
    damageMultiplier: profile.damageMultiplier,
    encounterDifficulty: difficulty,
    encounterDamageMultiplier: profile.damageMultiplier,
    encounterResistanceMultiplier: profile.resistanceMultiplier,
    encounterPowerRule: powerRule,
    encounterBaseAttacks: baseAttacks,
    encounterBaseCustomAttacks: baseCustomAttacks.map((attack) => ({ ...attack })),
    encounterBaseWeapons: baseWeapons.map((weapon) => ({ ...weapon })),
    encounterBaseDrBlock: baseDrBlock,
    encounterBaseResistanceBonus: baseResistanceBonus,
    encounterBaseCombatBuffResistance: { ...baseBuffResistance },
    encounterBaseCombatBuffSummaryResistance: { ...baseSummaryResistance },
  };
}
