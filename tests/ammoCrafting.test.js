import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { parseCSV } from "../src/utils/csvParser.js";
import { CRAFTING_RECIPES } from "../src/data/craftingRecipes.js";
import { buildAmmoCraftingCatalog, getCraftingRecipeCategory, parseAmmoBatchQuantity } from "../src/data/ammoCraftingRecipes.js";

// Bundle the real engine and inventory data for Node. Only the browser's i18n
// bootstrap is replaced; no crafting, dice or material calculation is mocked.
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../src/utils/craftingEngine.js", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "headless-i18n", setup(builder) {
    builder.onResolve({ filter: /\/i18n\.js$/ }, () => ({ path: "i18n", namespace: "test" }));
    builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({ contents: 'export default { language: "en", t: (key) => key };' }));
  } }],
});
const {
  getAmmoBatchProfile, getAmmoDismantleState, getAmmosmithDismantleMaterials,
  resolveCraftingAttempt, dismantleAmmunition,
  createCraftedInventoryItem,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const rows = parseCSV(readFileSync(new URL("../public/Ammo.csv", import.meta.url), "utf8"));
const catalog = buildAmmoCraftingCatalog(rows, CRAFTING_RECIPES);
const recipeByName = (name) => catalog.recipes.find((recipe) => recipe.name === name);
const shotgun = recipeByName("Shotgun Shell");
const item = (name, quantity, category = "ammo") => ({ name, category, quantity: String(quantity) });
const character = (rank = 2, inventoryItems = []) => ({
  special: { I: 10 }, skills: { Repair: { rank: 6 } },
  perksAndTraits: [{ id: "ammosmith", rank }], inventoryItems,
});
const materials = () => ["Common Materials", "Uncommon Materials", "Rare Materials"].map((name) => item(name, 1000, "junk"));

test("every supported archive ammo has exactly one recipe, including supplements", () => {
  const all = [...CRAFTING_RECIPES, ...catalog.recipes].filter((recipe) => recipe.outputCategory === "ammo");
  for (const row of rows.filter((row) => /^\d+$/.test(row.Rarity) && Number(row.Rarity) <= 5)) {
    assert.equal(all.filter((recipe) => (recipe.outputName || recipe.name) === row["Ammo Type"]).length, 1, row["Ammo Type"]);
  }
  for (const name of ["9mm", ".357 Magnum", "12.7mm", "40mm Grenade Round", "Cannonball", "Cryo Cell", "Harpoon"]) {
    assert.ok(recipeByName(name), name);
  }
  assert.equal(recipeByName("40mm Grenade Round").perks, "Ammosmith 3");
});

test("unsupported rarity and incomplete archive entries are explained, never free recipes", () => {
  assert.equal(catalog.unavailable.find((entry) => entry.name === "Mini-Nuke").reason, "rarity");
  assert.equal(catalog.unavailable.find((entry) => entry.name === "Grapple Rounds").reason, "data");
  assert.equal(catalog.unavailable.find((entry) => entry.name === "Tranq Ammunition").reason, "data");
  assert.ok(!recipeByName("Mini-Nuke"));
  assert.ok(!recipeByName("Tear Gas Canister"));
});

test("special and chemistry ammunition is classified as ammo without replacing its recipe", () => {
  for (const name of ["Cryo Arrow", "Explosive Crossbow Bolt", "Custom Shells", "Tranquilizer Darts", "Berserk"]) {
    const recipe = CRAFTING_RECIPES.find((entry) => entry.name === name);
    assert.ok(recipe, name);
    assert.equal(getCraftingRecipeCategory(recipe), "ammo");
  }
  const dart = CRAFTING_RECIPES.find((entry) => entry.name === "Tranquilizer Darts");
  assert.equal(dart.workbench, "chemistry");
  assert.equal(dart.perks, "Chemist");
  const arrow = createCraftedInventoryItem(CRAFTING_RECIPES.find((entry) => entry.name === "Cryo Arrow"));
  assert.equal(arrow.canonicalName, "Cryo Arrow");
  assert.equal(arrow.category, "ammo");
});

test("quantity parsing accepts archive formats and preserves 5mm x10", () => {
  assert.deepEqual(parseAmmoBatchQuantity("6+3 CD"), { base: 6, dice: 3, multiplier: 1 });
  assert.deepEqual(parseAmmoBatchQuantity("(12 + 6 CD) ×10"), { base: 12, dice: 6, multiplier: 10 });
  assert.equal(getAmmoBatchProfile(recipeByName("5mm")).looseBatchSize, 120);
  assert.equal(parseAmmoBatchQuantity(""), null);
  assert.equal(parseAmmoBatchQuantity("0+3"), null);
});

test("old/found ammunition is dismantled by standard batch, never by a single round", () => {
  const input = character(2, [item("Shotgun Shell", 8)]);
  const snapshot = JSON.stringify(input);
  const preview = getAmmoDismantleState(input, shotgun);
  assert.equal(preview.requiredQuantity, 6);
  const result = dismantleAmmunition(input, shotgun);
  assert.equal(result.consumedQuantity, 6);
  assert.equal(result.inventory.find((entry) => entry.category === "ammo").quantity, "2");
  assert.deepEqual(result.returnedMaterials, { "Common Materials": 1 });
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(dismantleAmmunition(character(2, [item("Shotgun Shell", 5)]), shotgun).error, "ammo_batch_missing");
});

test("Ammosmith 2 unlocks dismantling; Scrapper neither unlocks it nor changes refunds", () => {
  const input = character(1, [item("Shotgun Shell", 6)]);
  input.perksAndTraits.push({ id: "scrapper", rank: 2 });
  assert.equal(dismantleAmmunition(input, shotgun).error, "ammosmith_rank");
  input.perksAndTraits[0].rank = 2;
  assert.deepEqual(dismantleAmmunition(input, shotgun).returnedMaterials, { "Common Materials": 1 });
});

test("one rank-3 craft can only yield one refund, even after saving and changing perks", (t) => {
  t.mock.method(Math, "random", () => 0.99); // All effects: a large bonus batch.
  const input = character(3, materials());
  const crafted = resolveCraftingAttempt(input, shotgun);
  assert.ok(Number(crafted.output.quantity) > 100);
  const saved = JSON.parse(JSON.stringify({ ...input, inventoryItems: crafted.inventory }));
  saved.perksAndTraits[0].rank = 2;
  const preview = getAmmoDismantleState(saved, shotgun);
  assert.equal(preview.requiredQuantity, Number(crafted.output.quantity));
  assert.deepEqual(getAmmoDismantleState(saved, shotgun), preview);
  const dismantled = dismantleAmmunition(saved, shotgun);
  assert.equal(dismantled.consumedQuantity, Number(crafted.output.quantity));
  assert.equal(dismantled.inventory.find((entry) => entry.name === "Common Materials").quantity, "999");
  assert.equal(dismantleAmmunition({ ...saved, inventoryItems: dismantled.inventory }, shotgun).error, "ammo_batch_missing");
});

test("mixing 9- and 12-round crafted batches preserves exactly two refunds", (t) => {
  const random = t.mock.method(Math, "random", () => 0);
  let input = character(2, materials());
  let result = resolveCraftingAttempt(input, shotgun);
  assert.equal(result.output.quantity, "9");
  input = { ...input, inventoryItems: result.inventory };
  random.mock.mockImplementation(() => 0.25);
  result = resolveCraftingAttempt(input, shotgun);
  assert.equal(result.output.quantity, "12");
  input = { ...input, inventoryItems: result.inventory };
  assert.equal(input.inventoryItems.filter((entry) => entry.category === "ammo").length, 1);
  const first = dismantleAmmunition(input, shotgun);
  assert.equal(first.consumedQuantity, 11);
  const second = dismantleAmmunition({ ...input, inventoryItems: first.inventory }, shotgun);
  assert.equal(second.consumedQuantity, 10);
  assert.equal(second.inventory.find((entry) => entry.name === "Common Materials").quantity, "998");
});

test("a batch can span split and localized stacks, ignoring non-ammo with the same name", () => {
  const input = character(2, [item("Shotgun Shell", 100, "misc"), item("Shotgun Shell", 2),
    { name: "Дробь", canonicalName: "Shotgun Shell", category: "ammo", qty: 4 }, item("10mm", 20)]);
  const result = dismantleAmmunition(input, shotgun);
  assert.equal(result.consumedQuantity, 6);
  assert.ok(result.inventory.some((entry) => entry.category === "misc" && entry.quantity === "100"));
  assert.ok(result.inventory.some((entry) => entry.name === "10mm" && entry.quantity === "20"));
  assert.ok(!result.inventory.some((entry) => entry.canonicalName === "Shotgun Shell"));
});

test("shooting from a crafted batch reduces refundable materials instead of restoring a full batch", (t) => {
  t.mock.method(Math, "random", () => 0);
  const input = character(2, materials());
  const crafted = resolveCraftingAttempt(input, shotgun);
  const inventory = crafted.inventory.map((entry) => entry.category === "ammo" ? { ...entry, quantity: "4" } : entry);
  assert.equal(dismantleAmmunition({ ...input, inventoryItems: inventory }, shotgun).error, "ammo_batch_missing");
});

test("found stock retains its value when merged with a large crafted batch", (t) => {
  t.mock.method(Math, "random", () => 0.99);
  const input = character(3, [...materials(), item("Shotgun Shell", 6)]);
  const crafted = resolveCraftingAttempt(input, shotgun);
  const first = dismantleAmmunition({ ...input, inventoryItems: crafted.inventory }, shotgun);
  const second = dismantleAmmunition({ ...input, inventoryItems: first.inventory }, shotgun);
  assert.equal(first.consumedQuantity + second.consumedQuantity, 6 + Number(crafted.output.quantity));
  assert.equal(second.inventory.find((entry) => entry.name === "Common Materials").quantity, "1000");
});

test("refunds never invent zero-cost materials and handle each rarity separately", () => {
  assert.deepEqual(getAmmosmithDismantleMaterials({ materials: {
    "Common Materials": 5, "Uncommon Materials": 1, "Rare Materials": 0,
  } }), { "Common Materials": 2, "Uncommon Materials": 1 });
});

test("repeated mixed-roll crafting and dismantling cannot multiply materials for any supported ammo", (t) => {
  let seed = 4321;
  t.mock.method(Math, "random", () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  for (const recipe of catalog.recipes) {
    let input = character(3, materials());
    const crafts = 7;
    for (let i = 0; i < crafts; i += 1) {
      const result = resolveCraftingAttempt(input, recipe);
      assert.equal(result.success, true, recipe.name);
      input = { ...input, inventoryItems: result.inventory };
    }
    for (let i = 0; i < crafts; i += 1) {
      const result = dismantleAmmunition(input, recipe);
      assert.equal(result.success, true, `${recipe.name}, refund ${i + 1}`);
      input = { ...input, inventoryItems: result.inventory };
    }
    assert.equal(dismantleAmmunition(input, recipe).error, "ammo_batch_missing", recipe.name);
    for (const entry of input.inventoryItems) assert.ok(Number(entry.quantity) <= 1000, recipe.name);
  }
});
