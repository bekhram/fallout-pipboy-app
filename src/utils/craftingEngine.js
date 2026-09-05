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
  const perkRequirements = parsePerkRequirements(recipe?.perks);
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

function getAmmosmithRank(character) {
  return getCharacterPerkRank(character, { id: "ammosmith", label: "Ammosmith" });
}

function resolveAmmosmithQuantity(character, recipe) {
  const perkRank = getAmmosmithRank(character);
  const rarity = Math.max(0, Number(recipe?.ammoRarity ?? recipe?.rarity ?? 0));
  if (perkRank < 3) {
    return { quantity: 1, perkRank, rarity, diceCount: 0, hits: 0, effects: 0 };
  }

  const diceCount = Math.max(1, 6 - rarity);
  const hiddenRoll = rollFalloutD6({ diceCount, effects: [] });
  const hits = (hiddenRoll?.rolls || []).filter((die) => Number(die?.damage || 0) > 0).length;
  const effects = Math.max(0, Number(hiddenRoll?.totalEffects || 0));
  const quantity = Math.max(1, (1 + hits) * (2 ** effects));

  return { quantity, perkRank, rarity, diceCount, hits, effects };
}

export function createCraftedInventoryItem(recipe) {
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
  const modLike = ["weapons", "armor", "power_armor", "robot"].includes(recipe?.workbench);
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

export function addCraftedInventoryItem(inventory = [], craftedItem) {
  const key = normalize(craftedItem?.canonicalName || craftedItem?.name);
  const craftedCategory = normalize(craftedItem?.category);
  const mergeByName = craftedCategory === "ammo";
  const index = inventory.findIndex((item) =>
    normalize(item?.canonicalName || item?.name) === key
    && normalize(item?.category) === craftedCategory
    && (mergeByName || normalize(item?.craftingRecipeId) === normalize(craftedItem?.craftingRecipeId))
  );
  if (index < 0) return [...inventory, craftedItem];
  const next = [...inventory];
  const current = next[index];
  next[index] = {
    ...current,
    quantity: String(
      Math.max(0, Number(current?.quantity || 0))
      + Math.max(1, Number(craftedItem?.quantity || 1))
    ),
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
      output = { ...output, quantity: String(ammoResult.quantity) };
    }
    inventory = addCraftedInventoryItem(inventory, output);
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
