const MATERIAL_NAMES = {
  common: "Common Materials",
  uncommon: "Uncommon Materials",
  rare: "Rare Materials",
};

function tierOf(item) {
  const tier = String(item?.materialTier || "").toLowerCase();
  if (["common","uncommon","rare"].includes(tier)) return tier;
  const name = String(item?.canonicalName || item?.name || "").toLowerCase();
  if (name === "common materials") return "common";
  if (name === "uncommon materials") return "uncommon";
  if (name === "rare materials") return "rare";
  return null;
}

export function countCraftingMaterials(inventory = []) {
  const totals = { common: 0, uncommon: 0, rare: 0 };
  for (const item of inventory || []) {
    const tier = tierOf(item);
    if (!tier) continue;
    totals[tier] += Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));
  }
  return totals;
}

export function canAffordMaterials(inventory = [], cost = {}) {
  const totals = countCraftingMaterials(inventory);
  return ["common","uncommon","rare"].every((tier) => totals[tier] >= Math.max(0, Number(cost?.[tier] || 0)));
}

export function spendCraftingMaterials(inventory = [], cost = {}) {
  const remaining = {
    common: Math.max(0, Number(cost?.common || 0)),
    uncommon: Math.max(0, Number(cost?.uncommon || 0)),
    rare: Math.max(0, Number(cost?.rare || 0)),
  };
  const next = [];
  for (const item of inventory || []) {
    const tier = tierOf(item);
    if (!tier || remaining[tier] <= 0) { next.push(item); continue; }
    const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));
    const used = Math.min(quantity, remaining[tier]);
    remaining[tier] -= used;
    const left = quantity - used;
    if (left > 0) next.push({ ...item, quantity: String(left) });
  }
  if (Object.values(remaining).some((value) => value > 0)) return null;
  return next;
}

export function addCraftingMaterials(inventory = [], materials = {}) {
  const next = [...(inventory || [])];
  for (const tier of ["common","uncommon","rare"]) {
    const amount = Math.max(0, Number(materials?.[tier] || 0));
    if (!amount) continue;
    const index = next.findIndex((item) => tierOf(item) === tier);
    if (index >= 0) {
      const current = Math.max(0, Number(next[index]?.quantity ?? next[index]?.qty ?? 0));
      next[index] = { ...next[index], quantity: String(current + amount) };
    } else {
      next.push({
        name: MATERIAL_NAMES[tier], canonicalName: MATERIAL_NAMES[tier], quantity: String(amount),
        category: "junk", sourceType: "crafting_material", materialTier: tier,
        weight: "1", cost: tier === "common" ? "1" : tier === "uncommon" ? "3" : "5",
        effect: tier.charAt(0).toUpperCase() + tier.slice(1) + " crafting material unit.",
      });
    }
  }
  return next;
}

export function applyCampsiteBuild(character = {}, campsite = {}) {
  const spent = spendCraftingMaterials(character.inventoryItems || [], campsite.materials || {});
  if (!spent) return null;
  return {
    ...character,
    inventoryItems: spent,
    activeCampsite: {
      tier: Number(campsite.builtTier || campsite.tier || 1),
      attemptedTier: Number(campsite.attemptedTier || campsite.tier || 1),
      materials: { ...(campsite.materials || {}) },
      teardownRefund: { ...(campsite.teardownRefund || {}) },
      featureSlots: Number(campsite.featureSlots || 0),
      features: Array.isArray(campsite.features) ? [...campsite.features] : [],
      builtAt: new Date().toISOString(),
    },
  };
}

export function dismantleActiveCampsite(character = {}) {
  const campsite = character?.activeCampsite;
  if (!campsite) return character;
  return {
    ...character,
    inventoryItems: addCraftingMaterials(character.inventoryItems || [], campsite.teardownRefund || {}),
    activeCampsite: null,
    campsiteMaxHpBonus: "0",
  };
}

export function applyWinterCampRest(character = {}, { hours = 6 } = {}) {
  const campsite = character?.activeCampsite || {};
  const features = new Set(Array.isArray(campsite.features) ? campsite.features : []);
  const warmShelter = features.has("campfire") && features.has("shelter");
  const restHours = Math.max(0, Number(hours) || 0);
  const required = Math.max(0, Number(character?.coldExposureRecoveryHours || 0));
  const canRecoverColdFatigue = warmShelter && required > 0 && restHours >= required;
  const bedding = features.has("bedding");
  return {
    ...character,
    vigor: restHours >= 6 ? "5" : String(character?.vigor ?? "0"),
    fatigue: canRecoverColdFatigue ? "0" : String(character?.fatigue ?? "0"),
    coldExposureRecoveryHours: canRecoverColdFatigue ? "0" : String(character?.coldExposureRecoveryHours ?? "0"),
    coldExposureLocked: canRecoverColdFatigue ? false : Boolean(character?.coldExposureLocked),
    campsiteMaxHpBonus: restHours >= 6 && bedding ? "2" : "0",
    lastCampRest: { hours: restHours, warmShelter, recoveredColdFatigue: canRecoverColdFatigue, beddingBonus: restHours >= 6 && bedding, at: new Date().toISOString() },
  };
}

export function normalizeFeatureSelection(features = [], maxSlots = 0) {
  const selected = [];
  const seen = new Set();
  let defensibleCount = 0;
  for (const feature of features || []) {
    const id = String(feature || "");
    if (!id || selected.length >= Math.max(0, Number(maxSlots) || 0)) break;
    if (id === "defensible") {
      if (defensibleCount >= 3) continue;
      defensibleCount += 1;
      selected.push(id);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    selected.push(id);
  }
  return selected;
}
