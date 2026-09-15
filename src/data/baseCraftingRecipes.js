const slug = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const clampComplexity = (rarity) => {
  const numeric = Number.parseInt(String(rarity ?? "0"), 10);
  return Math.min(7, Math.max(1, (Number.isFinite(numeric) ? numeric : 0) + 1));
};

const normalizeKey = (value) => String(value || "")
  .toLowerCase()
  .trim()
  .replace(/[\s-]+/g, "_");

const parseTags = (value) => String(value || "")
  .split(",")
  .map((entry) => normalizeKey(entry))
  .filter(Boolean);

const mapWeaponSkill = (weaponType) => {
  const value = normalizeKey(weaponType);
  if (value.includes("small")) return "Small Guns";
  if (value.includes("energy")) return "Energy Weapons";
  if (value.includes("big")) return "Big Guns";
  if (value.includes("melee")) return "Melee Weapons";
  if (value.includes("unarmed")) return "Unarmed";
  if (value.includes("explosive")) return "Explosives";
  if (value.includes("throw")) return "Throwing";
  return "Repair";
};

const specialForSkill = (skill) => ({
  "Small Guns": "A",
  "Energy Weapons": "P",
  "Big Guns": "E",
  "Melee Weapons": "S",
  Unarmed: "S",
  Explosives: "P",
  Throwing: "A",
}[skill] || "I");

const SUPPLEMENTAL_COOKING_RECIPES = [
  ["Cazador Omelet", 2, "Common", { "Cazador Egg": 2, "Purified Water": 1 }],
  ["Crispy Cave Cricket", 1, "Common", { "Cave Cricket Meat": 3 }],
  ["Gecko Kebab", 1, "Common", { "Gecko Meat": 1, "Common Materials": 1 }],
  ["Grilled Giant Mantis", 1, "Common", { "Giant Mantis Foreleg": 2, "Honey": 1 }],
  ["Gulper Slurry", 4, "Rare", { "Dirty Water": 1, "Gourd": 1, "Gulper Innards": 1, "Razorgrain": 1 }],
  ["Hermit Crab Steak", 1, "Uncommon", { "Hermit Crab Meat": 1 }],
  ["Honey", 1, "Uncommon", { "Honeycomb": 1 }],
  ["Honey Cake", 4, "Rare", { "Honey": 1, "Honeycomb": 1, "Razorgrain": 1, "Mirelurk Egg": 2 }],
  ["Lamb Chops", 1, "Rare", { "Sheepsquatch Meat": 1 }],
  ["Mega Sloth Steak", 1, "Uncommon", { "Mega Sloth Meat": 1 }],
  ["Mega Sloth Mushroom Soup", 2, "Uncommon", { "Dirty Water": 1, "Mega Sloth Mushroom": 1 }],
  ["Mongrel Ribs", 2, "Uncommon", { "Mongrel Dog Meat": 1, "Lure Weed": 1 }],
  ["Mutton Meat Pie", 4, "Rare", { "Sheepsquatch Meat": 2, "Razorgrain": 2, "Dirty Water": 1, "Carrot": 2 }],
  ["Poached Angler", 1, "Common", { "Angler Meat": 2 }],
  ["Roasted Radrat", 1, "Common", { "Radrat Meat": 1 }],
  ["Scorchbeast Steak", 1, "Uncommon", { "Scorchbeast Meat": 1 }],
  ["Scorchbeast Stew", 4, "Rare", { "Carrot": 1, "Dirty Water": 1, "Scorchbeast Meat": 1, "Tato": 1 }],
  ["Snallygaster Stew", 3, "Uncommon", { "Dirty Water": 1, "Snallygaster Innards": 1, "Tato": 1 }],
].map(([name, complexity, rarity, materials]) => ({
  id: `supplement-cooking-${slug(name)}`,
  category: "items",
  workbench: "cooking",
  group: "COOKING",
  name,
  complexity,
  perks: "",
  skill: "Survival",
  rarity,
  materials,
  outputCategory: "food",
  outputName: name,
  sourcePage: 119,
  appGeneratedSupplementRecipe: true,
}));

/**
 * Base item construction is an app/homebrew layer. The official crafting data
 * bundled with the app contains modifications, ammunition and other recipes,
 * but not a complete from-scratch recipe table for every base weapon/armor.
 * Complexity is therefore derived from the item's archive rarity so the UI can
 * expose usable base-item recipes without pretending they are printed rules.
 */
export function buildBaseWeaponRecipes(weaponRows = []) {
  return weaponRows
    .filter((row) => String(row?.name || "").trim())
    .map((row) => {
      const name = String(row.name).trim();
      const skill = mapWeaponSkill(row["Weapon type"]);
      const complexity = clampComplexity(row.Rarity);
      return {
        id: `app-base-weapon-${slug(name)}`,
        category: "weapons",
        workbench: "weapons",
        group: "BASE WEAPONS",
        name,
        complexity,
        perks: "",
        skill: "Repair",
        rarity: "Common",
        itemRarity: String(row.Rarity ?? "0"),
        materials: null,
        outputCategory: "weapons",
        outputName: name,
        sourcePage: null,
        appGeneratedBaseRecipe: true,
        outputTemplate: {
          name,
          category: "weapons",
          skill,
          specialKey: specialForSkill(skill),
          damage: String(row["Damage Rating"] || ""),
          effects: parseTags(row.Effects),
          customEffect: String(row.Effects || ""),
          type: normalizeKey(row["Damage type"]) || "physical",
          rate: String(row["Rate of Fire"] || ""),
          useRateForDamage: false,
          range: String(row.Range || "").trim().toUpperCase(),
          qualities: parseTags(row.Qualities),
          qualitiesCustom: String(row.Qualities || ""),
          ammo: String(row.Ammo || ""),
          cost: String(row.Cost || ""),
          weight: String(row.Weight || ""),
          rarity: String(row.Rarity || ""),
          mods: {},
          sourceType: "crafted_weapon",
        },
      };
    });
}

export function buildBaseArmorRecipes(armorItems = []) {
  const baseArmorRecipes = armorItems
    .filter((item) => item?.name && item?.family !== "robot")
    .map((item) => {
      const name = String(item.name).trim();
      return {
        id: `app-base-armor-${slug(name)}`,
        category: "armor",
        workbench: "armor",
        group: "BASE ARMOR",
        name,
        complexity: clampComplexity(item.rarity),
        perks: "",
        skill: "Repair",
        rarity: "Common",
        itemRarity: String(item.rarity ?? "0"),
        materials: null,
        outputCategory: "armor",
        outputName: name,
        sourcePage: null,
        appGeneratedBaseRecipe: true,
        outputTemplate: {
          name,
          category: "armor",
          physical: Number(item.physical || 0),
          energy: Number(item.energy || 0),
          radiation: Number(item.radiation || 0),
          locations: { ...(item.locations || {}) },
          weight: String(item.weight ?? ""),
          cost: String(item.cost ?? ""),
          rarity: String(item.rarity ?? ""),
          effect: String(item.effects || ""),
          armorItemId: item.id,
          armorFamily: item.family,
          armorGroup: item.group,
          sourceType: "crafted_armor",
        },
      };
    });

  return [...baseArmorRecipes, ...SUPPLEMENTAL_COOKING_RECIPES];
}
