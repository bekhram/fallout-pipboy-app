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

  const defense = form.defenseOverride !== "" ? toNumber(form.defenseOverride) : calculatedDefense;
  const initiative = form.initiativeOverride !== "" ? toNumber(form.initiativeOverride) : calculatedInitiative;
  const md = form.mdOverride !== "" ? toNumber(form.mdOverride) : calculatedMd;
  const luckPoints = form.luckPointsOverride !== "" ? toNumber(form.luckPointsOverride) : calculatedLuckPoints;
  const maxHp = form.maxHpOverride !== "" ? Math.max(1, toNumber(form.maxHpOverride, 1)) : calculatedMaxHp;
  const carryWeight = form.carryWeightOverride !== "" ? toNumber(form.carryWeightOverride) : calculatedCarryWeight;

  const radiationHp = Math.max(0, toNumber(form.radiationHp));
  const effectiveMaxHp = Math.max(0, maxHp - radiationHp);
  const currentHp = Math.max(0, Math.min(toNumber(form.currentHp), effectiveMaxHp));

  const currentCarryWeight = (form.inventoryItems || []).reduce((sum, item) => {
    return sum + toNumber(item.quantity) * toNumber(item.weight);
  }, 0);

  return {
    defense,
    initiative,
    md,
    luckPoints,
    maxHp,
    radiationHp,
    effectiveMaxHp,
    currentHp,
    carryWeight,
    currentCarryWeight: Number(currentCarryWeight.toFixed(2)),
  };
}
