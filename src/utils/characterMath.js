import {
  getCharacterEffectModifiers,
  applyEffectModifiersToDerived,
} from "./effects.js";
import { applyActiveConsumableEffects } from "./consumableEffects.js";
import { getPerkCalculationState } from "./perkEffects.js";
import { ORIGINS } from "../components/data/origins.js";
import {
  getBobbleheadBonuses,
  getEffectiveSpecialValue,
  getEffectiveSkillRank,
} from "../data/inventory/bobbleheads.js";

export function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function normalizeNonNegative(value) {
  if (value === "") return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return String(Math.max(0, num));
}

export function normalizeWeightValue(value) {
  if (value === "") return "";
  const normalized = String(value).replace(",", ".");
  const num = Number(normalized);
  if (Number.isNaN(num)) return "";
  return String(Math.max(0, num));
}

export function getEffectiveCharacterSpecial(form, key) {
  return getEffectiveSpecialValue(form, key);
}

export function getEffectiveCharacterSkillRank(form, skillName) {
  return getEffectiveSkillRank(form, skillName);
}

export function getDerivedStats(form) {
  const strength = getEffectiveSpecialValue(form, "S");
  const perception = getEffectiveSpecialValue(form, "P");
  const endurance = getEffectiveSpecialValue(form, "E");
  const agility = getEffectiveSpecialValue(form, "A");
  const luck = getEffectiveSpecialValue(form, "L");
  const level = Math.max(1, toNumber(form.level, 1));
  const bobbleheadBonuses = getBobbleheadBonuses(form);

  const originData = form.origin ? ORIGINS[form.origin] : null;

  const calculatedDefense = agility >= 9 ? 2 : 1;
  const calculatedInitiative = perception + agility;

  let calculatedMd = 0;
  if (strength >= 11) {
    calculatedMd = 3;
  } else if (strength >= 9) {
    calculatedMd = 2;
  } else if (strength >= 7) {
    calculatedMd = 1;
  }

  if (form.originTraits?.includes("heavy_handed")) {
    calculatedMd += 1;
  }

  let calculatedLuckPoints = luck;
  if (form.originTraits?.includes("gifted")) {
    calculatedLuckPoints = Math.max(0, luck - 1);
  }

  let calculatedMaxHp = Math.max(1, level - 1 + endurance + luck);
  if (originData?.maxHpModifier) {
    calculatedMaxHp += originData.maxHpModifier;
  }

  let calculatedCarryWeight = 150 + strength * 10;
  if (form.origin === "mister_handy") {
    calculatedCarryWeight = 150;
  } else if (form.originTraits?.includes("small_frame")) {
    calculatedCarryWeight = 150 + strength * 5;
  }

  const baseDerived = {
    defense:
      form.defenseOverride !== ""
        ? toNumber(form.defenseOverride)
        : calculatedDefense,

    initiative:
      form.initiativeOverride !== ""
        ? toNumber(form.initiativeOverride)
        : calculatedInitiative,

    md:
      form.mdOverride !== ""
        ? toNumber(form.mdOverride)
        : calculatedMd,

    luckPoints:
      form.luckPointsOverride !== ""
        ? toNumber(form.luckPointsOverride)
        : calculatedLuckPoints,

    maxHp:
      form.maxHpOverride !== ""
        ? Math.max(1, toNumber(form.maxHpOverride, 1))
        : calculatedMaxHp,

    carryWeight:
      form.carryWeightOverride !== ""
        ? toNumber(form.carryWeightOverride)
        : calculatedCarryWeight,
  };

  const effectMods = getCharacterEffectModifiers(form);
  applyActiveConsumableEffects(effectMods, form.activeConsumableEffects);
  const derivedWithEffects = applyEffectModifiersToDerived(
    baseDerived,
    effectMods
  );

  const effectiveSpecial = {
    S: strength,
    P: perception,
    E: endurance,
    C: getEffectiveSpecialValue(form, "C"),
    I: getEffectiveSpecialValue(form, "I"),
    A: agility,
    L: luck,
  };

  const perkState = getPerkCalculationState(form, {
    effectiveSpecial,
    currentHp: form.currentHp,
    baseMaxHp: derivedWithEffects.maxHp,
  });

  const derivedWithPerks = {
    ...derivedWithEffects,
    maxHp:
      toNumber(derivedWithEffects.maxHp) +
      toNumber(perkState.derived.maxHpBonus),
    carryWeight:
      toNumber(derivedWithEffects.carryWeight) +
      toNumber(perkState.derived.carryWeightBonus),
  };

  const maxHp = Math.max(1, toNumber(derivedWithPerks.maxHp, 1));
  const radiationHp = Math.max(0, toNumber(form.radiationHp));
  const effectiveMaxHp = Math.max(0, maxHp - radiationHp);
  const currentHp = Math.max(
    0,
    Math.min(toNumber(form.currentHp), effectiveMaxHp)
  );

  const currentCarryWeight = (form.inventoryItems || []).reduce((sum, item) => {
    return sum + toNumber(item.quantity) * toNumber(item.weight);
  }, 0);

  return {
    defense: toNumber(derivedWithPerks.defense),
    initiative: toNumber(derivedWithPerks.initiative),
    md: toNumber(derivedWithPerks.md),
    luckPoints: toNumber(derivedWithPerks.luckPoints),
    maxHp,
    radiationHp,
    effectiveMaxHp,
    currentHp,
    carryWeight: toNumber(derivedWithPerks.carryWeight),
    currentCarryWeight: Number(currentCarryWeight.toFixed(2)),

    effectiveSpecial,
    bobbleheadBonuses,

    physicalResistBonus:
      toNumber(effectMods.derived.physicalResistBonus) +
      toNumber(perkState.derived.physicalResistBonus),
    energyResistBonus:
      toNumber(effectMods.derived.energyResistBonus) +
      toNumber(perkState.derived.energyResistBonus),
    radiationResistBonus:
      toNumber(effectMods.derived.radiationResistBonus) +
      toNumber(perkState.derived.radiationResistBonus),
    poisonResistBonus:
      toNumber(effectMods.derived.poisonResistBonus) +
      toNumber(perkState.derived.poisonResistBonus),

    criticalHitThreshold: toNumber(perkState.contextual.criticalHitThreshold, 5),
    groupApMax: toNumber(perkState.contextual.groupApMax, 6),
    healingModifiers: perkState.healing,
    perkContextualModifiers: perkState.contextual,
    perkDerivedBonuses: perkState.derived,
    perkState: perkState.state,

    effectDerivedBonuses: effectMods.derived,
    testModifiers: effectMods.tests,
    combatModifiers: effectMods.combat,
    conditionFlags: effectMods.flags,
    activeStatuses: effectMods.activeStatuses,
    activeAddictions: effectMods.activeAddictions,
    activeEffectNotes: [...effectMods.notes, ...perkState.notes],
    activeConsumableEffects: Array.isArray(form.activeConsumableEffects)
      ? form.activeConsumableEffects
      : [],

    immunities: originData?.immunities || [],
  };
}

const ARMOR_PART_KEY_MAP = {
  head: "Head",
  leftArm: "Left Arm",
  rightArm: "Right Arm",
  torso: "Torso",
  leftLeg: "Left Leg",
  rightLeg: "Right Leg",

  Head: "Head",
  "Left Arm": "Left Arm",
  "Right Arm": "Right Arm",
  Torso: "Torso",
  "Left Leg": "Left Leg",
  "Right Leg": "Right Leg",
};

export function getArmorPartKey(part) {
  return ARMOR_PART_KEY_MAP[part] || part;
}

export function getBaseArmorForPart(armor, part, damageType = "physical") {
  const armorKey = getArmorPartKey(part);
  const partArmor = armor?.[armorKey] || {};
  return toNumber(partArmor?.[damageType], 0);
}

export function getEffectResistBonusByType(derived, damageType = "physical") {
  switch (damageType) {
    case "physical":
      return toNumber(derived?.physicalResistBonus, 0);
    case "energy":
      return toNumber(derived?.energyResistBonus, 0);
    case "radiation":
      return toNumber(derived?.radiationResistBonus, 0);
    case "poison":
      return toNumber(derived?.poisonResistBonus, 0);
    default:
      return 0;
  }
}

export function getTotalResistanceForPart({
  armor,
  part,
  damageType = "physical",
  derived,
}) {
  if (derived?.immunities?.includes(damageType)) {
    return 9999;
  }

  const baseArmor = getBaseArmorForPart(armor, part, damageType);
  const effectBonus = getEffectResistBonusByType(derived, damageType);
  return Math.max(0, baseArmor + effectBonus);
}

export function getIncomingDamageModifier(derived, damageType = "physical") {
  const combat = derived?.combatModifiers || {};
  const incomingFlat = combat?.incomingDamageFlat || {};

  let value = toNumber(incomingFlat?.[damageType], 0);

  if (damageType === "physical") {
    value += toNumber(combat?.physicalDamageTakenCdBonus, 0);
  }

  return value;
}

export function getAdjustedArmorSnapshotForPart({ armor, part, derived }) {
  return {
    physical: getTotalResistanceForPart({
      armor,
      part,
      damageType: "physical",
      derived,
    }),
    energy: getTotalResistanceForPart({
      armor,
      part,
      damageType: "energy",
      derived,
    }),
    radiation: getTotalResistanceForPart({
      armor,
      part,
      damageType: "radiation",
      derived,
    }),
    poison: getTotalResistanceForPart({
      armor,
      part,
      damageType: "poison",
      derived,
    }),
  };
}

export function calculateFinalIncomingDamage({
  rawDamage,
  damageType = "physical",
  part = "torso",
  armor,
  derived,
}) {
  const safeRawDamage = Math.max(0, toNumber(rawDamage, 0));

  if (derived?.immunities?.includes(damageType)) {
    return {
      rawDamage: safeRawDamage,
      incomingModifier: 0,
      modifiedIncoming: 0,
      resistance: 9999,
      finalDamage: 0,
    };
  }

  const incomingModifier = getIncomingDamageModifier(derived, damageType);
  const modifiedIncoming = Math.max(0, safeRawDamage + incomingModifier);

  const resistance = getTotalResistanceForPart({
    armor,
    part,
    damageType,
    derived,
  });

  const finalDamage = Math.max(0, modifiedIncoming - resistance);

  return {
    rawDamage: safeRawDamage,
    incomingModifier,
    modifiedIncoming,
    resistance,
    finalDamage,
  };
}
