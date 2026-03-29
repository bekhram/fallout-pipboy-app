import {
  getCharacterEffectModifiers,
  applyEffectModifiersToDerived,
} from "./effects.js";

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

export function getDerivedStats(form) {
  const strength = toNumber(form.special?.S, 0);
  const perception = toNumber(form.special?.P, 0);
  const endurance = toNumber(form.special?.E, 0);
  const agility = toNumber(form.special?.A, 0);
  const luck = toNumber(form.special?.L, 0);
  const level = Math.max(1, toNumber(form.level, 1));

  const calculatedDefense = agility >= 9 ? 2 : 1;
  const calculatedInitiative = perception + agility;
  const calculatedMd = strength >= 11 ? 3 : strength >= 9 ? 2 : 1;
  const calculatedLuckPoints = luck;
  const calculatedMaxHp = Math.max(1, level - 1 + endurance + luck);
  const calculatedCarryWeight = 150 + strength * 10;

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
  const derivedWithEffects = applyEffectModifiersToDerived(
    baseDerived,
    effectMods
  );

  const maxHp = Math.max(1, toNumber(derivedWithEffects.maxHp, 1));
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
    defense: toNumber(derivedWithEffects.defense),
    initiative: toNumber(derivedWithEffects.initiative),
    md: toNumber(derivedWithEffects.md),
    luckPoints: toNumber(derivedWithEffects.luckPoints),
    maxHp,
    radiationHp,
    effectiveMaxHp,
    currentHp,
    carryWeight: toNumber(derivedWithEffects.carryWeight),
    currentCarryWeight: Number(currentCarryWeight.toFixed(2)),

    physicalResistBonus: toNumber(effectMods.derived.physicalResistBonus),
    energyResistBonus: toNumber(effectMods.derived.energyResistBonus),
    radiationResistBonus: toNumber(effectMods.derived.radiationResistBonus),
    poisonResistBonus: toNumber(effectMods.derived.poisonResistBonus),

    effectDerivedBonuses: effectMods.derived,
    testModifiers: effectMods.tests,
    combatModifiers: effectMods.combat,
    conditionFlags: effectMods.flags,
    activeStatuses: effectMods.activeStatuses,
    activeAddictions: effectMods.activeAddictions,
    activeEffectNotes: effectMods.notes,
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