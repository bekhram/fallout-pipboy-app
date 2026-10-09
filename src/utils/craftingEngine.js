import { rollFalloutD20, rollFalloutD6 } from "./dice.js";
import { getEffectiveSpecialValue, getEffectiveSkillRank } from "../data/inventory/bobbleheads.js";
import { INVENTORY_DATABASE } from "../data/inventoryDatabase.js";
import { getComplexityMaterials } from "../data/craftingRecipes.js";

const PERK_IDS = {
  "ammosmith": "ammosmith",
  "armorer": "armorer",
  "blacksmith": "blacksmith",
  "chemist": "chemist",
  "demolition expert": "demolition_expert",
  "gun nut": "gun_nut",
  "robotics expert": "robotics_expert",
  "science!": "science",
  "science": "science",
};

const normalize = (value) => String(value || "").trim().toLowerCase();

function itemNames(item) {
  return [item?.canonicalName, item?.sourceName, item?.name]
    .map(normalize)
    .filter(Boolean);
}

export function getInventoryQuantity(inventory = [], name) {
  const wanted = normalize(name);
  return inventory.reduce((sum, item) => {
    if (!itemNames(item).includes(wanted)) return sum;
    return sum + Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));
  }, 0);
}

export function getRecipeMaterials(recipe) {
  if (recipe?.materials && typeof recipe.materials === "object") {
    return { ...recipe.materials };
  }
  return getComplexityMaterials(recipe?.complexity);
}

export function parsePerkRequirements(value) {
  const text = String(value || "").trim();
  if (!text || text === "–" || text === "-") return [];
  return text.split(",").map((part) => {
    const clean = part.trim();
    const match = clean.match(/^(.*?)(?:\s+(\d+))?$/);
    const label = String(match?.[1] || clean).trim();
    const rank = Math.max(1, Number(match?.[2] || 1));
    return {
      id: PERK_IDS[normalize(label)] || normalize(label).replace(/[^a-z0-9]+/g, "_"),
      label,
      rank,
    };
  });
}

function mergePerkRequirements(requirements = []) {
  const merged = new Map();
  requirements.forEach((requirement) => {
    if (!requirement?.id) return;
    const current = merged.get(requirement.id);
    if (!current || Number(requirement.rank || 1) > Number(current.rank || 1)) {
      merged.set(requirement.id, { ...requirement });
    }
  });
  return [...merged.values()];
}

function getRecipeItemRarity(recipe) {
  const candidates = [
    recipe?.itemRarity,
    recipe?.outputTemplate?.rarity,
    recipe?.ammoRarity,
  ];
  for (const candidate of candidates) {
    const value = Number.parseInt(String(candidate ?? ''), 10);
    if (Number.isFinite(value)) return Math.max(0, Math.min(7, value));
  }
  return 0;
}

function requiredPerkRankForItemRarity(rarity) {
  const value = Math.max(0, Math.min(7, Number(rarity) || 0));
  if (value <= 1) return 0;
  if (value === 2) return 2;
  if (value === 3) return 3;
  // Rarity 4 appears in both user-defined ranges; the stricter rank 4 wins.
  return 4;
}

function automaticCraftingPerkRequirements(recipe) {
  const requirements = [];
  const group = normalize(recipe?.group);
  const category = normalize(recipe?.category);

  if (group === 'explosives') {
    requirements.push({ id: 'demolition_expert', label: 'Demolition Expert', rank: 1 });
  }

  if (recipe?.appGeneratedBaseRecipe) {
    const rank = requiredPerkRankForItemRarity(getRecipeItemRarity(recipe));
    if (rank > 0) {
      if (category === 'armor') {
        requirements.push({ id: 'armorer', label: 'Armorer', rank });
      } else if (category === 'weapons') {
        const skill = normalize(recipe?.outputTemplate?.skill);
        if (skill === 'melee weapons' || skill === 'unarmed') {
          requirements.push({ id: 'blacksmith', label: 'Blacksmith', rank });
        } else if (skill === 'explosives') {
          requirements.push({ id: 'demolition_expert', label: 'Demolition Expert', rank });
        } else {
          requirements.push({ id: 'gun_nut', label: 'Gun Nut', rank });
        }
      }
    }
  }

  return requirements;
}

export function getRecipePerkRequirements(recipe) {
  return mergePerkRequirements([
    ...parsePerkRequirements(recipe?.perks),
    ...automaticCraftingPerkRequirements(recipe),
  ]);
}

export function getCharacterPerkRank(character, requirement) {
  const requiredId = requirement?.id;
  const requiredLabel = normalize(requirement?.label);
  let best = 0;
  for (const perk of character?.perksAndTraits || []) {
    if (perk?.isOriginTrait) continue;
    const perkId = normalize(perk?.id).replace(/[^a-z0-9]+/g, "_");
    const perkName = normalize(perk?.name);
    if (perkId !== requiredId && perkName !== requiredLabel) continue;
    best = Math.max(best, Math.max(1, Number(perk?.rank || 1)));
  }
  return best;
}

export function getCraftingSkillProfile(character, skillName) {
  const skill = character?.skills?.[skillName] || {};
  const baseEffectiveRank = getEffectiveSkillRank(character, skillName);
  const intelligence = getEffectiveSpecialValue(character, "I");
  const tagBonus = skill?.tagged ? 2 : 0;
  const effectiveRank = baseEffectiveRank + tagBonus;
  const bonus = Number(skill?.bonus || 0);
  const targetNumber = Math.max(0, Math.min(20, intelligence + effectiveRank + bonus));
  const criticalRange = skill?.tagged
    ? Math.max(1, Math.min(20, effectiveRank || 1))
    : 1;
  return {
    skillName,
    intelligence,
    effectiveRank,
    baseEffectiveRank,
    baseRank: Number(skill?.rank || 0),
    tagged: Boolean(skill?.tagged),
    tagBonus,
    bonus,
    targetNumber,
    criticalRange,
  };
}

export function getCraftingRecipeState(character, recipe) {
  const inventory = character?.inventoryItems || [];
  const skill = getCraftingSkillProfile(character, recipe?.skill);
  const difficulty = Math.max(0, Number(recipe?.complexity || 0) - skill.effectiveRank);
  const materials = getRecipeMaterials(recipe);
  const materialState = Object.entries(materials).map(([name, required]) => {
    const available = getInventoryQuantity(inventory, name);
    return {
      name,
      required: Number(required || 0),
      available,
      enough: available >= Number(required || 0),
    };
  });
  const perkRequirements = getRecipePerkRequirements(recipe);
  const perkState = perkRequirements.map((requirement) => {
    const currentRank = getCharacterPerkRank(character, requirement);
    return {
      ...requirement,
      currentRank,
      met: currentRank >= requirement.rank,
    };
  });
  const knownRare = normalize(recipe?.rarity) !== "rare"
    || (character?.craftingKnownRecipes || []).includes(recipe?.id);
  return {
    skill,
    difficulty,
    materials,
    materialState,
    hasMaterials: materialState.every((entry) => entry.enough),
    perkState,
    hasPerks: perkState.every((entry) => entry.met),
    knownRare,
  };
}

export function consumeCraftingMaterials(inventory = [], materials = {}) {
  const remaining = { ...materials };
  return inventory.map((item) => {
    const names = itemNames(item);
    const matchName = Object.keys(remaining).find((name) => names.includes(normalize(name)) && remaining[name] > 0);
    if (!matchName) return item;
    const current = Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));
    const spent = Math.min(current, Number(remaining[matchName] || 0));
    remaining[matchName] -= spent;
    return { ...item, quantity: String(Math.max(0, current - spent)) };
  }).filter((item) => Number(item?.quantity ?? item?.qty ?? 0) > 0);
}

function findDatabaseOutput(name) {
  const wanted = normalize(name);
  return INVENTORY_DATABASE.find((item) => normalize(item?.name) === wanted) || null;
}

function isPowerArmorStealthBoyRecipe(recipe) {
  return normalize(recipe?.workbench) === "power_armor"
    && normalize(recipe?.name) === "stealth boy";
}

function isAmmoCraftingRecipe(recipe) {
  return Boolean(recipe?.ammoCrafting) || normalize(recipe?.group) === "ammunition";
}

export function getAmmosmithRank(character) {
  return getCharacterPerkRank(character, { id: "ammosmith", label: "Ammosmith" });
}

export function getAmmoBatchProfile(recipe) {
  const base = Math.max(1, Number(recipe?.ammoQuantityBase) || 1);
  const dice = Math.max(0, Number(recipe?.ammoQuantityDice) || 0);
  const multiplier = Math.max(1, Number(recipe?.ammoQuantityMultiplier) || 1);
  const expression = dice ? `${base} + ${dice} CD` : String(base);
  return {
    base, dice, multiplier,
    formula: multiplier > 1 ? `(${expression}) × ${multiplier}` : expression,
    // Old/looted stock has no recorded crafting yield. Its standard batch is
    // the fixed part of Quantity Found, explicitly displayed in the UI.
    looseBatchSize: base * multiplier,
  };
}

function resolveAmmosmithQuantity(character, recipe) {
  const perkRank = getAmmosmithRank(character);
  const rarity = Math.max(0, Number(recipe?.ammoRarity ?? recipe?.rarity ?? 0));

  // The ammunition table's Quantity Found expression is also the base craft output
  // for this app: static amount + the total from the listed Combat Dice.
  const { base: quantityBase, dice: quantityDice, multiplier: quantityMultiplier } = getAmmoBatchProfile(recipe);
  const quantityRoll = quantityDice > 0
    ? rollFalloutD6({ diceCount: quantityDice, effects: [] })
    : null;
  const quantityRollTotal = Math.max(0, Number(quantityRoll?.totalDamage || 0));
  const baseCraftQuantity = Math.max(
    1,
    (quantityBase + quantityRollTotal) * quantityMultiplier
  );

  if (perkRank < 3) {
    return {
      quantity: baseCraftQuantity,
      baseCraftQuantity,
      perkRank,
      rarity,
      quantityBase,
      quantityDice,
      quantityMultiplier,
      quantityRollTotal,
      diceCount: 0,
      hits: 0,
      effects: 0,
    };
  }

  // Ammosmith rank 3 adds a second hidden Combat Dice roll on top of the
  // normal batch quantity. Each hit adds +1; each Effect doubles the batch.
  const diceCount = Math.max(1, 6 - rarity);
  const hiddenRoll = rollFalloutD6({ diceCount, effects: [] });
  const hits = Math.max(0, Number(hiddenRoll?.totalDamage || 0));
  const effects = Math.max(0, Number(hiddenRoll?.totalEffects || 0));
  const quantity = Math.max(1, (baseCraftQuantity + hits) * (2 ** effects));

  return {
    quantity,
    baseCraftQuantity,
    perkRank,
    rarity,
    quantityBase,
    quantityDice,
    quantityMultiplier,
    quantityRollTotal,
    diceCount,
    hits,
    effects,
  };
}


export function getAmmosmithDismantleMaterials(recipe) {
  const materials = getRecipeMaterials(recipe);
  return Object.fromEntries(
    Object.entries(materials).filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) > 0).map(([name, amount]) => [
      name,
      Math.max(1, Math.floor(Number(amount || 0) / 2)),
    ])
  );
}

function wholeInventoryQuantity(item) {
  const quantity = Number(item?.quantity ?? item?.qty ?? 0);
  return Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;
}

function ammoSalvageUnitsPerRound(item, recipe) {
  const saved = item?.ammoSalvage;
  const units = Number(saved?.unitsPerRound);
  if (saved?.recipeId === recipe?.id && Number.isFinite(units) && units > 0) return units;
  return 1 / getAmmoBatchProfile(recipe).looseBatchSize;
}

// A complete crafted output is worth ONE recipe refund, including random and
// Ammosmith 3 bonus rounds. Merged stacks carry a weighted value per round;
// firing/removing rounds decreases their total refundable value naturally.
export function getAmmoDismantleState(character, recipe) {
  const ammoName = recipe?.outputName || recipe?.name;
  const { looseBatchSize } = getAmmoBatchProfile(recipe);
  let remainingUnits = 1;
  let available = 0;
  let consumedQuantity = 0;
  const consumption = [];
  const epsilon = 1e-9;
  for (const [index, item] of (character?.inventoryItems || []).entries()) {
    if (normalize(item?.category) !== "ammo" || !itemNames(item).includes(normalize(ammoName))) continue;
    const quantity = wholeInventoryQuantity(item);
    available += quantity;
    if (!quantity || remainingUnits <= epsilon) continue;
    const unitsPerRound = ammoSalvageUnitsPerRound(item, recipe);
    const needed = Math.max(1, Math.ceil(remainingUnits / unitsPerRound - epsilon));
    const take = Math.min(quantity, needed);
    consumption.push({ index, quantity: take });
    consumedQuantity += take;
    remainingUnits -= take * unitsPerRound;
  }
  const hasBatch = remainingUnits <= epsilon;
  return {
    ammoName, available, hasBatch, consumption, consumedQuantity,
    roundingCredit: hasBatch ? Math.max(0, -remainingUnits) : 0,
    requiredQuantity: consumedQuantity + (hasBatch ? 0 : Math.ceil(remainingUnits * looseBatchSize - epsilon)),
    returnedMaterials: getAmmosmithDismantleMaterials(recipe),
    hasPerk: getAmmosmithRank(character) >= 2,
    looseBatchSize,
  };
}

function addCraftingMaterial(inventory = [], materialName, amount) {
  const wanted = normalize(materialName);
  const index = inventory.findIndex((item) =>
    normalize(item?.category) === "junk" && itemNames(item).includes(wanted)
  );
  if (index >= 0) {
    const next = [...inventory];
    const current = next[index];
    next[index] = {
      ...current,
      quantity: String(Math.max(0, Number(current?.quantity ?? current?.qty ?? 0)) + amount),
    };
    return next;
  }

  const template = findDatabaseOutput(materialName);
  return [
    ...inventory,
    {
      ...(template || {}),
      name: template?.name || materialName,
      canonicalName: template?.name || materialName,
      category: "junk",
      quantity: String(amount),
    },
  ];
}

export function dismantleAmmunition(character, recipe) {
  if (!isAmmoCraftingRecipe(recipe)) return { error: "not_ammo" };
  const state = getAmmoDismantleState(character, recipe);
  if (!state.hasPerk) return { error: "ammosmith_rank", state };
  if (!state.hasBatch) return { error: "ammo_batch_missing", state };

  const { ammoName, returnedMaterials, consumedQuantity } = state;
  const consumption = new Map(state.consumption.map((entry) => [entry.index, entry.quantity]));
  let inventory = (character?.inventoryItems || []).flatMap((item, index) => {
    if (!consumption.has(index)) return [item];
    const quantity = wholeInventoryQuantity(item) - consumption.get(index);
    return quantity > 0 ? [{ ...item, quantity: String(quantity) }] : [];
  });
  // Whole rounds can overshoot a single refund fraction. Retain that fraction
  // in the remaining stock so merging, e.g. 9- and 10-round batches does not
  // lose the second batch's refund to integer rounding.
  if (state.roundingCredit > 1e-9) {
    const index = inventory.findIndex((item) => normalize(item?.category) === "ammo"
      && itemNames(item).includes(normalize(ammoName)) && wholeInventoryQuantity(item) > 0);
    if (index >= 0) {
      const item = inventory[index];
      inventory[index] = { ...item, ammoSalvage: {
        recipeId: recipe.id,
        unitsPerRound: ammoSalvageUnitsPerRound(item, recipe) + state.roundingCredit / wholeInventoryQuantity(item),
      } };
    }
  }
  for (const [name, amount] of Object.entries(returnedMaterials)) {
    inventory = addCraftingMaterial(inventory, name, amount);
  }

  return {
    success: true,
    action: "dismantle",
    ammoName,
    consumedQuantity,
    returnedMaterials,
    inventory,
  };
}

export function createCraftedInventoryItem(recipe) {
  if (recipe?.outputTemplate && typeof recipe.outputTemplate === "object") {
    const template = recipe.outputTemplate;
    const name = template.name || recipe?.outputName || recipe?.name || "Crafted item";
    return {
      ...template,
      name,
      canonicalName: name,
      category: recipe?.outputCategory || template.category || "misc",
      quantity: "1",
      crafted: true,
      craftingRecipeId: recipe.id,
      craftingWorkbench: recipe?.workbench || "",
    };
  }

  if (isAmmoCraftingRecipe(recipe)) {
    const name = recipe?.outputName || recipe?.name || "Ammunition";
    return {
      name,
      canonicalName: name,
      category: "ammo",
      quantity: "1",
      cost: String(recipe?.ammoCost ?? ""),
      weight: String(recipe?.ammoWeight ?? "0"),
      rarity: String(recipe?.ammoRarity ?? recipe?.rarity ?? ""),
      crafted: true,
      craftingRecipeId: recipe.id,
      craftingWorkbench: "weapons",
    };
  }

  if (isPowerArmorStealthBoyRecipe(recipe)) {
    const name = "Stealth Boy — Power Armor System";
    return {
      name,
      canonicalName: name,
      category: "misc",
      quantity: "1",
      cost: "",
      weight: "0",
      effect: "Crafted Power Armor system modification",
      crafted: true,
      craftingRecipeId: recipe.id,
      craftingWorkbench: "power_armor",
    };
  }

  const databaseItem = findDatabaseOutput(recipe?.outputName || recipe?.name);
  if (databaseItem) {
    return {
      ...databaseItem,
      quantity: "1",
      canonicalName: databaseItem.name,
      crafted: true,
      craftingRecipeId: recipe.id,
    };
  }
  const modLike = recipe?.outputCategory !== "ammo"
    && ["weapons", "armor", "power_armor", "robot"].includes(recipe?.workbench);
  const name = modLike ? `${recipe.name} — ${recipe.group}` : (recipe?.outputName || recipe?.name || "Crafted item");
  return {
    name,
    canonicalName: name,
    category: recipe?.outputCategory || "misc",
    quantity: "1",
    cost: "",
    weight: "0",
    effect: modLike ? `Crafted modification (${recipe.group})` : "Crafted item",
    crafted: true,
    craftingRecipeId: recipe.id,
    craftingWorkbench: recipe?.workbench || "",
  };
}

export function addCraftedInventoryItem(inventory = [], craftedItem, recipe = null) {
  const key = normalize(craftedItem?.canonicalName || craftedItem?.name);
  const craftedCategory = normalize(craftedItem?.category);
  const mergeByName = craftedCategory === "ammo";
  const index = inventory.findIndex((item) =>
    itemNames(item).includes(key)
    && normalize(item?.category) === craftedCategory
    && (mergeByName || normalize(item?.craftingRecipeId) === normalize(craftedItem?.craftingRecipeId))
  );
  if (index < 0) return [...inventory, craftedItem];
  const next = [...inventory];
  const current = next[index];
  const currentQuantity = wholeInventoryQuantity(current);
  const addedQuantity = Math.max(1, wholeInventoryQuantity(craftedItem));
  const quantity = currentQuantity + addedQuantity;
  const ammoSalvage = recipe && isAmmoCraftingRecipe(recipe) ? {
    recipeId: recipe.id,
    unitsPerRound: (
      currentQuantity * ammoSalvageUnitsPerRound(current, recipe)
      + addedQuantity * ammoSalvageUnitsPerRound(craftedItem, recipe)
    ) / quantity,
  } : null;
  next[index] = {
    ...current,
    ...(ammoSalvage ? { ammoSalvage } : {}),
    quantity: String(quantity),
  };
  return next;
}

export function resolveCraftingAttempt(character, recipe) {
  const state = getCraftingRecipeState(character, recipe);
  if (!state.hasMaterials) return { error: "materials", state };
  if (!state.hasPerks) return { error: "perks", state };
  if (!state.knownRare) return { error: "recipe_unknown", state };

  let roll = null;
  let success = true;
  if (state.difficulty > 0) {
    roll = rollFalloutD20({
      diceCount: 2,
      targetNumber: state.skill.targetNumber,
      criticalRange: state.skill.criticalRange,
      label: `${recipe.name} crafting`,
    });
    success = roll.totalSuccesses >= state.difficulty;
  }

  const complications = Number(roll?.complications || 0);
  const cooking = recipe?.workbench === "cooking";
  const chemistry = recipe?.workbench === "chemistry";
  const baseMinutes = cooking ? 20 : 60;
  const extraMinutes = complications * (cooking ? 10 : 30);
  const consumeOnFailure = cooking || chemistry;
  const shouldConsume = success || consumeOnFailure;
  let inventory = character?.inventoryItems || [];
  if (shouldConsume) inventory = consumeCraftingMaterials(inventory, state.materials);
  let output = null;
  let ammoResult = null;
  if (success) {
    output = createCraftedInventoryItem(recipe);
    if (isAmmoCraftingRecipe(recipe)) {
      ammoResult = resolveAmmosmithQuantity(character, recipe);
      output = {
        ...output,
        quantity: String(ammoResult.quantity),
        ammoSalvage: { recipeId: recipe.id, unitsPerRound: 1 / ammoResult.quantity },
      };
    }
    inventory = addCraftedInventoryItem(inventory, output, recipe);
  }

  return {
    success,
    automatic: state.difficulty === 0,
    state,
    roll,
    complications,
    durationMinutes: baseMinutes + extraMinutes,
    canHalveTimeWith2AP: success,
    consumedMaterials: shouldConsume,
    complicationMaterialLossNeedsGm: !success && !consumeOnFailure && complications > 0,
    inventory,
    output,
    ammoResult,
  };
}
