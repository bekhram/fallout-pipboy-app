import { rollFalloutD20, rollFalloutD6, rollHitLocationD20 } from "./dice.js";

export const MAX_GROUP_AP = 6;
export const MAX_TEST_D20 = 5;
export const RANGE_BANDS = ["close", "medium", "long", "extreme"];

const RANGE_DISTANCE = { close: 0, medium: 1, long: 2, extreme: 3 };

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

export function getInitiative(character = {}, creature = false) {
  if (creature) return Number(character.body || 0) + Number(character.mind || 0) + Number(character.initiativeBonus || 0);
  const special = character.special || character.SPECIAL || {};
  return Number(special.P || 0) + Number(special.A || 0) + Number(character.initiativeBonus || 0);
}

export function sortInitiative(combatants = []) {
  return [...combatants].sort((a, b) => {
    const diff = Number(b.initiative || 0) - Number(a.initiative || 0);
    if (diff !== 0) return diff;
    return Number(a.order || 0) - Number(b.order || 0);
  });
}

export function getRangeDifficultyModifier(weaponRange, targetRange) {
  const ideal = RANGE_DISTANCE[String(weaponRange || "").toLowerCase()];
  const target = RANGE_DISTANCE[String(targetRange || "").toLowerCase()];
  if (!Number.isFinite(ideal) || !Number.isFinite(target)) return 0;
  return Math.abs(ideal - target);
}

export function getAttackTestProfile(weapon = {}) {
  const type = String(weapon.attackType || weapon.type || weapon.skill || "").toLowerCase();
  if (type.includes("unarmed")) return { attribute: "S", skill: "Unarmed" };
  if (type.includes("melee")) return { attribute: "S", skill: "Melee Weapons" };
  if (type.includes("big gun")) return { attribute: "E", skill: "Big Guns" };
  if (type.includes("energy")) return { attribute: "P", skill: "Energy Weapons" };
  if (type.includes("throw") || type.includes("explosive")) {
    const isExplosive = type.includes("explosive");
    return { attribute: isExplosive ? "P" : "A", skill: isExplosive ? "Explosives" : "Throwing" };
  }
  return { attribute: "A", skill: "Small Guns" };
}

export function buildAttackCheck({ attacker = {}, target = {}, weapon = {}, targetRange = "close", withinReach = false, chosenLocation = false } = {}) {
  const profile = getAttackTestProfile(weapon);
  const skill = attacker.skills?.[profile.skill] || {};
  const special = attacker.special || attacker.SPECIAL || {};
  const targetNumber = clamp(Number(special?.[profile.attribute] || 0) + Number(skill.rank || 0) + Number(skill.bonus || 0), 0, 20);
  const criticalRange = skill.tagged ? clamp(Number(skill.rank || 1), 1, 20) : 1;
  const ranged = !["Melee Weapons", "Unarmed"].includes(profile.skill);
  const rangeMod = ranged ? getRangeDifficultyModifier(weapon.range, targetRange) : 0;
  const reachMod = ranged && withinReach ? 2 : 0;
  const locationMod = chosenLocation ? 1 : 0;
  const difficulty = Math.max(0, Number(target.defense || 1) + rangeMod + reachMod + locationMod);
  return {
    ...profile,
    targetNumber,
    criticalRange,
    difficulty,
    baseDifficulty: Number(target.defense || 1),
    modifiers: { range: rangeMod, withinReach: reachMod, chosenLocation: locationMod },
  };
}

export function rollAttack(args = {}) {
  const check = buildAttackCheck(args);
  const diceCount = clamp(args.diceCount || 2, 1, MAX_TEST_D20);
  const roll = rollFalloutD20({ diceCount, targetNumber: check.targetNumber, criticalRange: check.criticalRange, label: `${check.attribute} + ${check.skill}` });
  return {
    check,
    roll,
    passed: roll.totalSuccesses >= check.difficulty,
    generatedAp: Math.max(0, roll.totalSuccesses - check.difficulty),
  };
}

function normalizeEffectList(effects = []) {
  return (Array.isArray(effects) ? effects : String(effects || "").split(","))
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function getPiercingRating(effects) {
  for (const effect of effects) {
    const match = effect.match(/piercing\s*(\d+)/i);
    if (match) return Number(match[1]) || 0;
  }
  return 0;
}

function getLocationResistance(target = {}, location, damageType) {
  const armor = target.armor || {};
  const locationArmor = armor[location] || armor[String(location || "").replace(/([A-Z])/g, " $1").trim()] || {};
  const type = String(damageType || "physical").toLowerCase();
  const fromLocation = Number(locationArmor[type] ?? locationArmor[`${type}Resistance`]);
  if (Number.isFinite(fromLocation)) return Math.max(0, fromLocation);
  const generic = Number(target.resistances?.[type] ?? target[`${type}Resistance`] ?? target[`${type}DR`]);
  return Number.isFinite(generic) ? Math.max(0, generic) : 0;
}

export function resolveDamage({ weapon = {}, target = {}, location = null, extraDamageDice = 0, coverDr = 0 } = {}) {
  const effects = normalizeEffectList(weapon.effects || weapon.damageEffects);
  const damageType = String(weapon.damageType || "physical").toLowerCase();
  const baseDice = Math.max(0, Number(weapon.damage || 0));
  const diceCount = Math.max(0, baseDice + Number(extraDamageDice || 0));
  const hitLocation = location || rollHitLocationD20().location;
  const roll = rollFalloutD6({ diceCount, effects });
  const piercing = getPiercingRating(effects) * roll.totalEffects;
  const baseDr = getLocationResistance(target, hitLocation, damageType) + Math.max(0, Number(coverDr || 0));
  const effectiveDr = Math.max(0, baseDr - piercing);
  const finalDamage = Math.max(0, roll.totalDamage - effectiveDr);
  const criticalHit = finalDamage >= 5;
  const radioactive = effects.includes("radioactive") ? roll.totalEffects : 0;
  const persistentEffect = effects.find((effect) => effect.startsWith("persistent")) || null;
  return {
    hitLocation,
    damageType,
    diceCount,
    roll,
    baseDr,
    piercing,
    effectiveDr,
    finalDamage,
    criticalHit,
    injury: criticalHit ? hitLocation : null,
    statuses: {
      stunned: effects.includes("stun") && roll.totalEffects > 0,
      persistent: persistentEffect && roll.totalEffects > 0 ? { effect: persistentEffect, rounds: roll.totalEffects } : null,
      radiation: radioactive,
    },
    secondary: {
      spreadHits: roll.spreadHits || [],
      burstTargets: roll.burstTargets || [],
      breaking: effects.includes("breaking") ? roll.totalEffects : 0,
    },
  };
}

export function applyDamageToTarget(target = {}, damageResult = {}) {
  const currentHp = Math.max(0, Number(target.hp?.current ?? target.currentHp ?? 0));
  const maxHp = Math.max(0, Number(target.hp?.max ?? target.maxHp ?? currentHp));
  const damage = Math.max(0, Number(damageResult.finalDamage || 0));
  let nextMaxHp = maxHp;
  let nextHp = Math.max(0, currentHp - damage);
  if (damageResult.damageType === "radiation") {
    nextMaxHp = Math.max(0, maxHp - damage);
    nextHp = Math.min(nextHp, nextMaxHp);
  }
  return {
    hp: { current: nextHp, max: nextMaxHp },
    defeated: nextHp <= 0,
    dying: nextHp <= 0,
    injury: damageResult.criticalHit ? damageResult.hitLocation : null,
  };
}

export function createCombatState({ player, enemies = [], gmAp = null, groupAp = 0 } = {}) {
  const combatants = [
    player ? { id: "player", side: "player", initiative: getInitiative(player), ...player } : null,
    ...enemies.map((enemy, index) => ({
      id: enemy.id || `enemy-${index + 1}`,
      side: "enemy",
      initiative: getInitiative(enemy, Boolean(enemy.body !== undefined || enemy.mind !== undefined)),
      ...enemy,
    })),
  ].filter(Boolean);
  return {
    round: 1,
    turnIndex: 0,
    groupAp: clamp(groupAp, 0, MAX_GROUP_AP),
    gmAp: gmAp == null ? 1 : Math.max(0, Number(gmAp || 0)),
    combatants: sortInitiative(combatants),
    log: [],
  };
}

export function advanceTurn(state) {
  const combatants = state?.combatants || [];
  if (!combatants.length) return state;
  const currentIndex = Number(state.turnIndex || 0);
  let nextIndex = currentIndex;
  let wrapped = false;
  let inspected = 0;
  do {
    nextIndex = (nextIndex + 1) % combatants.length;
    if (nextIndex === 0) wrapped = true;
    inspected += 1;
  } while (inspected < combatants.length && combatants[nextIndex]?.defeated);

  return {
    ...state,
    turnIndex: nextIndex,
    round: wrapped ? Number(state.round || 1) + 1 : Number(state.round || 1),
  };
}
