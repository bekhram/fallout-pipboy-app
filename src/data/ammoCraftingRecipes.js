const normalize = (value) => String(value || "").trim().toLowerCase();
const slug = (value) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Quantity Found is the companion's house rule for a crafting batch. Keep the
// archive as the single source, while preserving its existing 5mm x10 rule.
export function parseAmmoBatchQuantity(value, name = "") {
  const expression = String(value || "").replace(/\s|CD|[()]/gi, "");
  const match = expression.match(/^(\d+)(?:\+(\d+))?(?:[x×*](\d+))?$/i);
  if (!match || Number(match[1]) < 1) return null;
  const multiplier = match[3] ? Number(match[3]) : normalize(name) === "5mm" ? 10 : 1;
  if (multiplier < 1) return null;
  return { base: Number(match[1]), dice: Number(match[2] || 0), multiplier };
}

export function buildAmmoCraftingCatalog(rows = [], existingRecipes = []) {
  const covered = new Set(existingRecipes
    .filter((recipe) => recipe.outputCategory === "ammo")
    .map((recipe) => normalize(recipe.outputName || recipe.name)));
  const recipes = [];
  const unavailable = [];
  for (const row of rows) {
    const name = String(row["Ammo Type"] || "").trim();
    if (!name || covered.has(normalize(name))) continue;
    covered.add(normalize(name));
    const rawRarity = String(row.Rarity ?? "").trim();
    const rarity = /^\d+$/.test(rawRarity) ? Number(rawRarity) : null;
    const batch = parseAmmoBatchQuantity(row["Quantity Found"], name);
    if (rarity !== null && rarity > 5) {
      unavailable.push({ name, reason: "rarity", rarity });
      continue;
    }
    if (rarity === null || !batch) {
      unavailable.push({ name, reason: "data" });
      continue;
    }
    recipes.push({
      id: slug(`weapons-ammunition-${name}`),
      category: "ammo", workbench: "weapons", group: "AMMUNITION", name,
      complexity: rarity,
      perks: `Ammosmith ${rarity <= 1 ? 1 : rarity <= 3 ? 2 : 3}`,
      skill: "Repair", rarity, materials: null,
      outputCategory: "ammo", outputName: name,
      sourceBook: "Settler’s Guide", sourcePage: 18,
      ammoCrafting: true, ammoRarity: rarity,
      ammoCost: row.Cost ?? "", ammoWeight: row.Weight ?? "0",
      ammoQuantityBase: batch.base,
      ammoQuantityDice: batch.dice,
      ammoQuantityMultiplier: batch.multiplier,
    });
  }
  return { recipes, unavailable };
}

export function getCraftingRecipeCategory(recipe) {
  if (recipe?.outputCategory === "ammo" || recipe?.ammoCrafting) return "ammo";
  const group = String(recipe?.group || "").toUpperCase();
  if (group === "EXPLOSIVES") return "explosives";
  if (group.includes(" MOD") || group.endsWith("MODS") || group.includes("UPGRADE")
    || group.includes("PLATING") || group.includes("SYSTEM") || group.includes("MATERIAL")
    || group.includes("LINING") || group === "BALLISTIC WEAVE" || group === "ROBOT ARMOR") return "mods";
  return ["weapons", "armor"].includes(recipe?.category) ? recipe.category : "items";
}
