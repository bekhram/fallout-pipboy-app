export function getHitLocationByD20(value) {
  const roll = Number(value);

  if (roll >= 1 && roll <= 2) return "head";
  if (roll >= 3 && roll <= 8) return "torso";
  if (roll >= 9 && roll <= 11) return "leftArm";
  if (roll >= 12 && roll <= 14) return "rightArm";
  if (roll >= 15 && roll <= 17) return "leftLeg";
  if (roll >= 18 && roll <= 20) return "rightLeg";

  return "unknown";
}

export function getHitLocationLabel(location) {
  switch (location) {
    case "head":
      return "Head";
    case "torso":
      return "Torso";
    case "leftArm":
      return "Left Arm";
    case "rightArm":
      return "Right Arm";
    case "leftLeg":
      return "Left Leg";
    case "rightLeg":
      return "Right Leg";
    default:
      return "Unknown";
  }
}

export function rollHitLocationD20() {
  const value = Math.floor(Math.random() * 20) + 1;
  const location = getHitLocationByD20(value);

  return {
    type: "hit-location-d20",
    value,
    location,
    label: getHitLocationLabel(location),
    timestamp: new Date().toISOString(),
  };
}

export function rollSingleDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeEffects(effects = []) {
  return effects.map((item) => String(item).trim().toLowerCase());
}

function hasEffect(effects = [], effectName) {
  return normalizeEffects(effects).includes(String(effectName).trim().toLowerCase());
}

/* ---------- D20 CHECKS ---------- */

export function evaluateFalloutD20Value(
  value,
  { targetNumber = null, criticalRange = 1 } = {}
) {
  const safeCriticalRange = clamp(Number(criticalRange) || 1, 1, 20);
  const hasTarget = Number.isFinite(Number(targetNumber));
  const safeTargetNumber = hasTarget
    ? clamp(Number(targetNumber), 0, 20)
    : null;

  const isComplication = value === 20;

  let successes = 0;
  let isSuccess = false;
  let isCritical = false;

  if (safeTargetNumber !== null) {
    if (value <= safeTargetNumber) {
      isSuccess = true;

      if (value <= safeCriticalRange) {
        successes = 2;
        isCritical = true;
      } else {
        successes = 1;
      }
    }
  } else {
    if (value <= safeCriticalRange) {
      successes = 2;
      isCritical = true;
    }
  }

  return {
    value,
    successes,
    isSuccess,
    isCritical,
    isComplication,
  };
}

export function createSkillRoll({
  title,
  skillName,
  skill,
  testValue,
  diceCount = 2,
  difficulty = 1,
}) {
  const skillRank = Number(skill?.rank || 0);
  const isTagged = !!skill?.tagged;

  return {
    type: "skill",
    diceType: "d20",
    title,
    skillName,
    skill,
    targetNumber: testValue,
    criticalRange: isTagged ? clamp(skillRank, 1, 20) : 1,
    diceCount,
    difficulty,
  };
}

export function buildFalloutD20Result(
  rollValues,
  { targetNumber = null, criticalRange = 1, label = "" } = {}
) {
  const rolls = rollValues.map((value) =>
    evaluateFalloutD20Value(value, { targetNumber, criticalRange })
  );

  return {
    type: "fallout-d20-basic",
    label,
    diceCount: rolls.length,
    targetNumber:
      targetNumber === null || targetNumber === undefined
        ? null
        : Number(targetNumber),
    criticalRange: Number(criticalRange) || 1,
    rolls,
    totalSuccesses: rolls.reduce((sum, die) => sum + die.successes, 0),
    criticals: rolls.filter((die) => die.isCritical).length,
    complications: rolls.filter((die) => die.isComplication).length,
    timestamp: new Date().toISOString(),
  };
}

export function rollFalloutD20({
  diceCount = 2,
  targetNumber = null,
  criticalRange = 1,
  label = "",
} = {}) {
  const safeDiceCount = clamp(Number(diceCount) || 2, 1, 5);
  const rollValues = Array.from({ length: safeDiceCount }, () => rollSingleDie(20));

  return buildFalloutD20Result(rollValues, {
    targetNumber,
    criticalRange,
    label,
  });
}

export function rerollOneFalloutD20(
  result,
  dieIndex,
  { targetNumber, criticalRange, label } = {}
) {
  if (!result?.rolls?.length) return result;
  if (dieIndex < 0 || dieIndex >= result.rolls.length) return result;

  const nextValues = result.rolls.map((die, index) =>
    index === dieIndex ? rollSingleDie(20) : die.value
  );

  return buildFalloutD20Result(nextValues, {
    targetNumber:
      targetNumber !== undefined ? targetNumber : result?.targetNumber ?? null,
    criticalRange:
      criticalRange !== undefined ? criticalRange : result?.criticalRange ?? 1,
    label: label !== undefined ? label : result?.label ?? "",
  });
}

/* ---------- D6 DAMAGE ---------- */

export function evaluateFalloutD6Value(value) {
  if (value === 1) {
    return { value, damage: 1, effect: 0, label: "1" };
  }

  if (value === 2) {
    return { value, damage: 2, effect: 0, label: "2" };
  }

  if (value === 3 || value === 4) {
    return { value, damage: 0, effect: 0, label: "0" };
  }

  if (value === 5 || value === 6) {
    return { value, damage: 1, effect: 1, label: "1+" };
  }

  return { value, damage: 0, effect: 0, label: "0" };
}

export function buildFalloutD6Result(rollValues, { effects = [] } = {}) {
  const rolls = rollValues.map((value) => evaluateFalloutD6Value(value));

  const rawEffects = Array.isArray(effects) ? effects : [];
  const normalizedEffects = normalizeEffects(rawEffects);

  const hasVicious = hasEffect(normalizedEffects, "vicious");
  const hasSpread = hasEffect(normalizedEffects, "spread");
  const hasBurst = hasEffect(normalizedEffects, "burst");

  let baseDamage = 0;
  let totalDamage = 0;
  let totalEffects = 0;

  const processedRolls = rolls.map((die) => {
    const normalDamage = die.damage;
    const effectCount = die.effect;

    baseDamage += normalDamage;
    totalEffects += effectCount;

    let finalDamage = normalDamage;

    if (hasVicious && die.label === "1+") {
      finalDamage = 2;
    }

    totalDamage += finalDamage;

    return {
      ...die,
      normalDamage,
      damage: finalDamage,
      viciousBonus: finalDamage - normalDamage,
    };
  });

  const spreadDamagePerHit = Math.floor(baseDamage / 2);
  const spreadHits = [];

  if (hasSpread && totalEffects > 0 && spreadDamagePerHit > 0) {
    for (let i = 0; i < totalEffects; i += 1) {
      const hit = rollHitLocationD20();

      spreadHits.push({
        location: hit.location,
        label: hit.label,
        roll: hit.value,
        damage: spreadDamagePerHit,
      });
    }
  }

  const burstTargets = [];
  const burstDamagePerTarget = baseDamage;

  if (hasBurst && totalEffects > 0 && burstDamagePerTarget > 0) {
    for (let i = 0; i < totalEffects; i += 1) {
      burstTargets.push({
        target: i + 1,
        damage: burstDamagePerTarget,
      });
    }
  }

  return {
    type: "fallout-d6-damage",
    diceCount: processedRolls.length,
    rolls: processedRolls,
    totalDamage,
    totalEffects,
    baseDamage,
    rawEffects,
    effects: normalizedEffects,
    recognizedEffects: {
      vicious: hasVicious,
      spread: hasSpread,
      burst: hasBurst,
    },
    hasVicious,
    hasSpread,
    hasBurst,
    spreadDamagePerHit,
    spreadHits,
    burstDamagePerTarget,
    burstTargets,
    timestamp: new Date().toISOString(),
  };
}

export function rollFalloutD6({ diceCount = 4, effects = [] } = {}) {
  const safeDiceCount = clamp(Number(diceCount) || 4, 1, 50);
  const rollValues = Array.from({ length: safeDiceCount }, () => rollSingleDie(6));

  return buildFalloutD6Result(rollValues, { effects });
}

export function rerollOneFalloutD6(result, dieIndex, { effects } = {}) {
  if (!result?.rolls?.length) return result;
  if (dieIndex < 0 || dieIndex >= result.rolls.length) return result;

  const nextValues = result.rolls.map((die, index) =>
    index === dieIndex ? rollSingleDie(6) : die.value
  );

  return buildFalloutD6Result(nextValues, {
    effects: effects !== undefined ? effects : result?.rawEffects || result?.effects || [],
  });
}

export function createWeaponRoll({
  weapon,
  diceCount = 2,
  difficulty = 1,
  useRate = false,
}) {
  return {
    type: "weapon",
    diceType: "d20",
    title: weapon?.name || "Weapon Attack",
    weapon,
    diceCount,
    difficulty,
    damage: Number(weapon?.damage) || 0,
    rate: Number(weapon?.rate) || 0,
    useRate,
  };
}