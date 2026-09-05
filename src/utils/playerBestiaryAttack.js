import {
  rollFalloutD20,
  rollFalloutD6,
  rollHitLocationD20,
} from "./dice.js";
import { getDerivedStats } from "./characterMath.js";
import { getEnvironmentSnapshot } from "./environmentSystem.js";
import { applyWeaponMods } from "../data/weaponMods.js";
import {
  getBestiaryResistance,
  hasBestiaryLocationSpecificDr,
} from "./bestiaryCombatContext.js";

const RANGE_DISTANCE = {
  close: 0,
  medium: 1,
  long: 2,
  extreme: 3,
};

export const COMBAT_TARGET_RANGES = ["reach", "close", "medium", "long", "extreme"];

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[\s_-]/g, "");
}

function normalizeRange(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "close";
  if (text === "melee" || text.includes("reach")) return "reach";
  if (text === "c" || text.includes("close")) return "close";
  if (text === "m" || text.includes("medium")) return "medium";
  if (text === "l" || text.includes("long")) return "long";
  if (text === "x" || text.includes("extreme")) return "extreme";
  return "close";
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectEffects(weapon) {
  return [
    ...normalizeList(weapon?.effects),
    ...normalizeList(weapon?.customEffect),
  ];
}

function collectQualities(weapon) {
  return [
    ...normalizeList(weapon?.qualities),
    ...normalizeList(weapon?.qualitiesCustom),
  ];
}

function hasNamed(values, name) {
  const wanted = normalizeToken(name);
  return values.some((value) => normalizeToken(value).includes(wanted));
}

function parsePiercingRating(effects) {
  for (const effect of effects) {
    const match = String(effect).match(/piercing\s*(\d+)?/i);
    if (match) return Math.max(1, Number(match[1]) || 1);
  }
  return 0;
}

function criticalThresholdForEnemy(enemy) {
  const match = String(enemy?.abilities || "").match(/critical hit threshold is\s*(\d+)/i);
  return match ? Math.max(1, Number(match[1]) || 5) : 5;
}

function getWeaponProfile(weapon) {
  return applyWeaponMods({ ...(weapon || {}) });
}

function getSkillProfile(character, weapon) {
  const skillName = weapon?.skill || "";
  const skill = character?.skills?.[skillName] || null;
  if (!skill) return null;
  const attribute = skill.attribute || weapon?.specialKey || "A";
  const attributeValue = Number(character?.special?.[attribute] || 0);
  const rank = Number(skill?.rank || 0);
  const tagBonus = skill?.tagged ? 2 : 0;
  const bonus = Number(skill?.bonus || 0);
  return {
    skillName,
    attribute,
    rank,
    tagged: Boolean(skill?.tagged),
    tagBonus,
    bonus,
    targetNumber: Math.max(0, Math.min(20, attributeValue + rank + tagBonus + bonus)),
    criticalRange: skill?.tagged ? Math.max(1, Math.min(20, rank)) : 1,
  };
}

function isMeleeWeapon(weapon) {
  const skill = String(weapon?.skill || "").toLowerCase();
  return skill.includes("melee") || skill.includes("unarmed") || normalizeRange(weapon?.range) === "reach";
}

function isThrownWeapon(weapon) {
  const skill = String(weapon?.skill || "").toLowerCase();
  return skill.includes("throw") || skill.includes("explosive");
}

function getRangeDifficulty(weapon, targetRange) {
  if (isMeleeWeapon(weapon)) {
    return targetRange === "reach"
      ? { valid: true, range: 0, reach: 0 }
      : { valid: false, range: 0, reach: 0 };
  }

  const idealRange = normalizeRange(weapon?.range);
  const targetBand = targetRange === "reach" ? "close" : targetRange;
  const idealDistance = RANGE_DISTANCE[idealRange === "reach" ? "close" : idealRange];
  const targetDistance = RANGE_DISTANCE[targetBand] ?? 0;
  const range = Math.abs((idealDistance ?? 0) - targetDistance);
  const qualities = collectQualities(weapon);
  const closeQuarters = hasNamed(qualities, "closequarters");
  const reach = targetRange === "reach" && !closeQuarters ? 2 : 0;
  return { valid: true, range, reach };
}

function rangeAtLeast(targetRange, minimum) {
  const normalized = targetRange === "reach" ? "close" : targetRange;
  return (RANGE_DISTANCE[normalized] ?? 0) >= (RANGE_DISTANCE[minimum] ?? 0);
}

function getEnvironmentDifficulty(environment, weapon, targetRange, useLight) {
  if (isMeleeWeapon(weapon)) return { delta: 0, modifiers: [] };
  const isThrown = isThrownWeapon(weapon);
  const applied = [];

  for (const modifier of environment?.checkModifiers || []) {
    let use = false;
    switch (modifier.id) {
      case "darkness_ranged":
        use = !useLight;
        break;
      case "fog_ranged":
      case "dust_ranged":
        use = rangeAtLeast(targetRange, "medium");
        break;
      case "rain_ranged":
      case "wind_ranged":
      case "heat_haze_visual":
        use = rangeAtLeast(targetRange, "long");
        break;
      case "wind_thrown":
        use = isThrown && rangeAtLeast(targetRange, "medium");
        break;
      default:
        use = false;
    }
    if (use) applied.push(modifier);
  }

  return {
    delta: applied.reduce((sum, modifier) => sum + Number(modifier.difficultyDelta || 0), 0),
    modifiers: applied.map((modifier) => ({
      id: modifier.id,
      difficultyDelta: Number(modifier.difficultyDelta || 0),
      reason: modifier.reason || null,
    })),
  };
}

function locationForAttack(enemy, damageType) {
  const locationSpecific = hasBestiaryLocationSpecificDr(enemy, damageType);
  if (!locationSpecific) {
    return {
      valid: true,
      hitLocation: "all",
      hitLocationLabel: "All",
      hitLocationRoll: null,
    };
  }

  if (enemy?.statKind !== "character") {
    return {
      valid: false,
      reason: "creature_hit_location_table_unavailable",
      hitLocation: null,
      hitLocationLabel: null,
      hitLocationRoll: null,
    };
  }

  const hit = rollHitLocationD20();
  return {
    valid: true,
    hitLocation: hit.location,
    hitLocationLabel: hit.label,
    hitLocationRoll: hit.value,
  };
}

function finalDamageAgainstDr(rawDamage, resistance, piercing) {
  if (resistance >= 9999) {
    return { resistance: "immune", effectiveDr: 9999, finalDamage: 0 };
  }
  const effectiveDr = Math.max(0, Number(resistance || 0) - Math.max(0, Number(piercing || 0)));
  return {
    resistance: Math.max(0, Number(resistance || 0)),
    effectiveDr,
    finalDamage: Math.max(0, Number(rawDamage || 0) - effectiveDr),
  };
}

export function prepareCombatWeapon(weapon) {
  return getWeaponProfile(weapon);
}

export function getCombatWeaponAmmoState(character, weapon) {
  const ammo = String(weapon?.ammo || "").trim();
  if (!ammo) return { required: false, ammo: null, quantity: null, available: true };
  const item = (character?.inventoryItems || []).find(
    (entry) => String(entry?.name || "").trim().toLowerCase() === ammo.toLowerCase()
  );
  const quantity = Math.max(0, Number(item?.quantity || 0));
  return { required: true, ammo, quantity, available: quantity > 0 };
}

export function resolvePlayerBestiaryAttack({
  character,
  weapon,
  enemy,
  targetRange = "close",
  useLight = false,
  diceCount = 2,
} = {}) {
  if (!character || !weapon || !enemy) return { error: "missing_attack_data" };

  const modifiedWeapon = getWeaponProfile(weapon);
  const skill = getSkillProfile(character, modifiedWeapon);
  if (!skill) return { error: "missing_weapon_skill", weaponName: modifiedWeapon?.name || null };

  const safeTargetRange = COMBAT_TARGET_RANGES.includes(targetRange) ? targetRange : "close";
  const rangeDifficulty = getRangeDifficulty(modifiedWeapon, safeTargetRange);
  if (!rangeDifficulty.valid) {
    return {
      error: "target_out_of_melee_reach",
      weaponName: modifiedWeapon?.name || null,
      targetRange: safeTargetRange,
    };
  }

  const environment = getEnvironmentSnapshot({
    totalHours: Number(character?.mapData?.worldTotalHours || 0),
    regionId: character?.mapData?.regionId || "commonwealth",
    hazards: [],
    character,
  });
  const canUseLight = Boolean(environment?.equipment?.hasLightSource && !environment?.equipment?.hasNightVision);
  const lightActive = Boolean(useLight && canUseLight);
  const environmentDifficulty = getEnvironmentDifficulty(
    environment,
    modifiedWeapon,
    safeTargetRange,
    lightActive
  );

  const difficulty = Math.max(
    0,
    Math.min(
      10,
      Number(enemy?.defense || 1) +
        Number(rangeDifficulty.range || 0) +
        Number(rangeDifficulty.reach || 0) +
        Number(environmentDifficulty.delta || 0)
    )
  );

  const attackRoll = rollFalloutD20({
    diceCount: Math.max(1, Math.min(5, Number(diceCount) || 2)),
    targetNumber: skill.targetNumber,
    criticalRange: skill.criticalRange,
    label: modifiedWeapon?.name || "Weapon Attack",
  });
  const hit = attackRoll.totalSuccesses >= difficulty;

  const baseResult = {
    kind: "player_attack",
    weapon: {
      name: modifiedWeapon?.name || "Weapon",
      skill: modifiedWeapon?.skill || null,
      damage: Number(modifiedWeapon?.damage || 0),
      damageType: String(modifiedWeapon?.type || "physical").toLowerCase(),
      range: modifiedWeapon?.range || null,
      rate: Number(modifiedWeapon?.rate || 0),
      ammo: modifiedWeapon?.ammo || null,
      effects: collectEffects(modifiedWeapon),
      qualities: collectQualities(modifiedWeapon),
    },
    target: {
      instanceId: enemy.instanceId,
      name: enemy.name,
      defense: Number(enemy?.defense || 1),
    },
    targetRange: safeTargetRange,
    skill,
    difficulty,
    difficultyBreakdown: {
      defense: Number(enemy?.defense || 1),
      range: Number(rangeDifficulty.range || 0),
      withinReach: Number(rangeDifficulty.reach || 0),
      environment: Number(environmentDifficulty.delta || 0),
      environmentModifiers: environmentDifficulty.modifiers,
    },
    environment: {
      time: environment?.time || null,
      weather: environment?.weather || null,
      equipment: environment?.equipment || null,
      usedLight: lightActive,
    },
    attackRoll: {
      dice: attackRoll.rolls.map((die) => ({
        value: die.value,
        successes: die.successes,
        critical: die.isCritical,
        complication: die.isComplication,
      })),
      totalSuccesses: attackRoll.totalSuccesses,
      complications: attackRoll.complications,
    },
    hit,
    ammoSpent: modifiedWeapon?.ammo ? 1 : 0,
  };

  if (!hit) {
    return {
      ...baseResult,
      totalFinalDamage: 0,
      radioactiveFinalDamage: 0,
      defeated: false,
    };
  }

  const damageType = String(modifiedWeapon?.type || "physical").toLowerCase();
  const location = locationForAttack(enemy, damageType);
  if (!location.valid) {
    return {
      ...baseResult,
      hit: true,
      needsHitLocationRule: true,
      error: location.reason,
      totalFinalDamage: 0,
      radioactiveFinalDamage: 0,
    };
  }

  const effects = collectEffects(modifiedWeapon);
  const derived = getDerivedStats(character);
  const meleeBonus = isMeleeWeapon(modifiedWeapon) ? Math.max(0, Number(derived?.md || 0)) : 0;
  const damageDiceCount = Math.max(0, Number(modifiedWeapon?.damage || 0) + meleeBonus);
  const damageRoll = damageDiceCount > 0
    ? rollFalloutD6({ diceCount: damageDiceCount, effects })
    : { rolls: [], totalDamage: 0, totalEffects: 0, spreadHits: [] };
  const piercingRating = parsePiercingRating(effects);
  const piercingIgnored = piercingRating * Number(damageRoll.totalEffects || 0);
  const resistance = getBestiaryResistance(enemy, damageType, location.hitLocation);
  const mainDamage = finalDamageAgainstDr(
    damageRoll.totalDamage,
    resistance,
    piercingIgnored
  );

  const spreadHits = (damageRoll.spreadHits || []).map((spread) => {
    const spreadResistance = getBestiaryResistance(enemy, damageType, spread.location);
    const resolved = finalDamageAgainstDr(spread.damage, spreadResistance, piercingIgnored);
    return {
      ...spread,
      resistance: resolved.resistance,
      effectiveDr: resolved.effectiveDr,
      finalDamage: resolved.finalDamage,
    };
  });
  const spreadFinalDamage = spreadHits.reduce((sum, spread) => sum + Number(spread.finalDamage || 0), 0);
  const totalFinalDamage = mainDamage.finalDamage + spreadFinalDamage;

  const radioactive = effects.some((effect) => normalizeToken(effect).includes("radioactive"));
  let radioactiveFinalDamage = 0;
  let radioactiveResistance = null;
  if (radioactive && Number(damageRoll.totalEffects || 0) > 0) {
    const radResistance = getBestiaryResistance(enemy, "radiation", location.hitLocation);
    const resolvedRad = finalDamageAgainstDr(damageRoll.totalEffects, radResistance, 0);
    radioactiveResistance = resolvedRad.resistance;
    radioactiveFinalDamage = resolvedRad.finalDamage;
  }

  const criticalThreshold = criticalThresholdForEnemy(enemy);
  const highestSingleHit = Math.max(
    mainDamage.finalDamage,
    ...spreadHits.map((spread) => Number(spread.finalDamage || 0)),
    0
  );
  const persistent = effects.some((effect) => normalizeToken(effect).includes("persistent"));
  const stunned = effects.some((effect) => normalizeToken(effect).includes("stun")) && Number(damageRoll.totalEffects || 0) > 0;
  const breaking = effects.some((effect) => normalizeToken(effect).includes("breaking"));

  return {
    ...baseResult,
    damageType,
    hitLocation: location.hitLocation,
    hitLocationLabel: location.hitLocationLabel,
    hitLocationRoll: location.hitLocationRoll,
    meleeBonus,
    damageDiceCount,
    damageRoll: {
      dice: damageRoll.rolls.map((die) => ({
        value: die.value,
        damage: die.damage,
        effect: die.effect,
      })),
      rawDamage: damageRoll.totalDamage,
      effectTriggers: damageRoll.totalEffects,
    },
    piercingRating,
    piercingIgnored,
    resistance: mainDamage.resistance,
    effectiveDr: mainDamage.effectiveDr,
    mainFinalDamage: mainDamage.finalDamage,
    spreadHits,
    spreadFinalDamage,
    totalFinalDamage,
    radioactiveResistance,
    radioactiveFinalDamage,
    criticalThreshold,
    criticalInjury: highestSingleHit >= criticalThreshold,
    stunned,
    persistentRounds: persistent ? Number(damageRoll.totalEffects || 0) : 0,
    breakingTriggers: breaking ? Number(damageRoll.totalEffects || 0) : 0,
    burstExtraTargets: damageRoll.burstTargets?.length || 0,
  };
}
