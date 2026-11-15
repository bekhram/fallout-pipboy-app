import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { CRAFTING_RECIPES } from "../src/data/craftingRecipes.js";
import { getCraftingRecipeCategory } from "../src/data/ammoCraftingRecipes.js";
import { localizeCraftingRecipe } from "../src/data/craftingLocalization.js";
import { getLocalizedInventoryItem } from "../src/data/inventoryLocalizationAll.js";

const bundle = await build({
  entryPoints: [new URL("../src/utils/craftingEngine.js", import.meta.url).pathname],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [{ name: "test-i18n", setup(builder) {
    builder.onResolve({ filter: /\/i18n\.js$/ }, () => ({ path: "i18n", namespace: "test-i18n" }));
    builder.onLoad({ filter: /.*/, namespace: "test-i18n" }, () => ({
      contents: 'export default { language: "en", t: (key) => key };',
    }));
  } }],
});
const { createCraftedInventoryItem, getRecipeMaterials, resolveCraftingAttempt } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const recipes = CRAFTING_RECIPES.filter((recipe) => recipe.workbench === "power_armor");
const recipe = (name) => recipes.find((entry) => entry.name === name);

test("power armor recipes reference compatible gear and keep stable recipe IDs", () => {
  const counts = { upgrade: 0, system: 0, plating: 0 };
  for (const entry of recipes) {
    assert.equal(getCraftingRecipeCategory(entry), "mods");
    assert.equal(entry.powerArmor.mods.length, entry.powerArmor.kind === "upgrade" ? 4 : 1, entry.name);
    counts[entry.powerArmor.kind] += 1;
  }
  assert.deepEqual(counts, { upgrade: 21, system: 22, plating: 7 });
  assert.equal(new Set(recipes.map((entry) => entry.id)).size, 50);
  assert.equal(recipe("T-60b").id, "power-armor-power-armor-upgrades-t-60b");
  assert.deepEqual(recipe("EMP Shielding (X-01 only)").powerArmor.mods[0].onlySets, ["x01"]);
  assert.deepEqual(recipe("Winterized Coating (not on X-01)").powerArmor.mods[0].excludedSets, ["x01"]);
  assert.deepEqual(recipe("Welded Rebar (Raider only)").powerArmor.mods[0].onlySets, ["raider"]);
});

test("torso upgrades cost one extra uncommon material and create the correct part", () => {
  const head = { ...recipe("T-60b"), powerArmorPart: "head" };
  const torso = { ...head, powerArmorPart: "torso" };
  assert.deepEqual(getRecipeMaterials(head), { "Common Materials": 4, "Uncommon Materials": 2 });
  const expected = { "Common Materials": 4, "Uncommon Materials": 3 };
  assert.deepEqual(getRecipeMaterials(torso), expected);

  const inventoryItems = Object.entries(expected).map(([name, quantity]) => ({
    name, category: "junk", quantity: String(quantity),
  }));
  const character = { special: { I: 8 }, skills: { Repair: { rank: 4 } }, inventoryItems };
  const crafted = resolveCraftingAttempt(character, torso);
  assert.equal(crafted.success, true);
  assert.deepEqual(crafted.inventory, [crafted.output]);
  assert.equal(crafted.output.sourceId, "t60-b-torso");
  assert.equal(crafted.output.craftingRecipeId, torso.id);
  assert.equal(crafted.output.name, "T-60b Chest Piece");
  assert.equal(crafted.output.weight, "1");
  assert.equal(crafted.output.cost, "37");
  assert.equal(character.inventoryItems.length, 2);
  assert.equal(getLocalizedInventoryItem(crafted.output, "ru").displayName, "T-60b — Нагрудник");
});

test("system crafting produces a power armor mod instead of the consumable Stealth Boy", () => {
  const system = recipe("Stealth Boy");
  const crafted = createCraftedInventoryItem(system);
  assert.equal(system.skill, "Science");
  assert.equal(system.perks, "Science! 4");
  assert.equal(system.complexity, 6);
  assert.equal(crafted.sourceType, "power_armor_mod");
  assert.equal(crafted.sourceId, "stealth-boy");
  assert.match(crafted.canonicalName, /Power Armor Systems/i);
  assert.notEqual(crafted.canonicalName, "Stealth Boy");
  for (const language of ["ru", "uk", "pl"]) {
    const localized = getLocalizedInventoryItem(crafted, language);
    assert.notEqual(localized.displayName, crafted.name, language);
    assert.notEqual(localized.displayEffect, crafted.effect, language);
  }
});

test("localized power armor recipe titles are usable independently of their search IDs", () => {
  const shocks = recipe("Calibrated Shocks");
  const localized = {
    ru: "Калиброванные амортизаторы",
    uk: "Калібровані амортизатори",
    pl: "Kalibrowane amortyzatory",
  };
  for (const [language, title] of Object.entries(localized)) {
    assert.equal(localizeCraftingRecipe(shocks, language).title, title);
    assert.notEqual(localizeCraftingRecipe(shocks, language).group, shocks.group);
  }
});
