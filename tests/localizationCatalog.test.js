import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import i18next from "i18next";
import { PERKS_DICTIONARY, PERKS_LIST } from "../src/components/data/perks.js";
import { getPerkCatalogText, getPerkDisplayText, PERK_LANGUAGES } from "../src/components/data/perkLocalization.js";
import { localizeCraftingMaterial, localizeCraftingRecipe } from "../src/data/craftingLocalization.js";
import { CRAFTING_RECIPES } from "../src/data/craftingRecipes.js";
import { buildAmmoCraftingCatalog } from "../src/data/ammoCraftingRecipes.js";
import { buildBaseArmorRecipes, buildBaseWeaponRecipes } from "../src/data/baseCraftingRecipes.js";
import { getLocalizedInventoryItem } from "../src/data/inventoryLocalizationAll.js";
import { parseCSV } from "../src/utils/csvParser.js";
import { parseArmorDatabase } from "../src/utils/armorDatabase.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const i18n = i18next.createInstance();
await i18n.init({
  lng: "en",
  fallbackLng: "en",
  showSupportNotice: false,
  resources: Object.fromEntries(PERK_LANGUAGES.map((language) => [
    language, { translation: JSON.parse(read(`../src/locales/${language}/common.json`)) },
  ])),
});
const secondaryLanguages = PERK_LANGUAGES.filter((language) => language !== "en");
const ammo = parseCSV(read("../public/Ammo.csv"));
const weapons = parseCSV(read("../public/weapons.csv")).filter((row) => row.name);
const armor = parseArmorDatabase(read("../public/Armor.csv")).items;
const recipes = [
  ...CRAFTING_RECIPES,
  ...buildBaseWeaponRecipes(weapons),
  ...buildBaseArmorRecipes(armor),
  ...buildAmmoCraftingCatalog(ammo, CRAFTING_RECIPES).recipes,
];

const unchangedCalibers = /^(?:\.\d+(?: Magnum)?|\d+(?:\.\d+)?mm(?: EC)?)$/;
const unchangedModels = /^(?:T-(?:45|51|60)[b-f]|X-01 Mk [IV]+)$/;
const unchangedPolishNames = new Set([
  "Addictol", "Buffjet", "Buffout", "Bufftats", "Calmex", "Daddy-O", "Day Tripper", "Jet", "Med-X", "Overdrive", "Psycho",
  "Psycho Jet", "Psychobuff", "Psychotats", "Rad-X", "RadAway", "Skeeto Spit", "Stimpak", "Super Stimpak", "Ultra Jet",
  "X-Cell", "Berserk", "Endangerol", "Pax", "Cram", "Melon", "Tato", "Bourbon", "Nuka-Cherry", "Nuka-Cola",
  "Nuka-Cola Quantum", "Rum", "Whiskey", "Pip-Boy", "Radio", "Stealth Boy", "Minigun", "Shishkebab", "Tomahawk",
  "Detonator", "Mesmetron",
]);
const canKeepName = (name, language) => unchangedCalibers.test(name) || unchangedModels.test(name)
  || (language === "pl" && unchangedPolishNames.has(name));

test("every built-in perk has a name and description in each language", () => {
  for (const language of PERK_LANGUAGES) {
    const t = i18n.getFixedT(language);
    for (const perk of PERKS_LIST) {
      const localized = getPerkCatalogText(perk, language, t);
      assert.ok(localized.name && localized.name !== perk.id, `${language} name: ${perk.id}`);
      assert.ok(localized.description.trim(), `${language} description: ${perk.id}`);
    }
  }
});

test("saved catalog perks relocalize while custom perk text stays intact", async () => {
  const perk = PERKS_DICTIONARY.armorer;
  const from = getPerkCatalogText(perk, "ru", i18n.getFixedT("ru"));
  const to = getPerkCatalogText(perk, "uk", i18n.getFixedT("uk"));
  const legacy = {
    id: perk.id,
    name: from.name,
    description: `${from.description}\n[Req: ${perk.requirements} | Max Rank: ${perk.maxRanks}]`,
  };
  await i18n.changeLanguage("uk");
  assert.deepEqual(getPerkDisplayText(legacy, perk.id, i18n), to);
  assert.deepEqual(getPerkDisplayText({ name: "Custom perk", description: "Custom note" }, perk.id, i18n),
    { name: "Custom perk", description: "Custom note" });
});

test("all recipe groups, titles and ingredients resolve in the supported languages", () => {
  for (const language of secondaryLanguages) {
    for (const recipe of recipes) {
      const { title, group } = localizeCraftingRecipe(recipe, language);
      assert.ok(group && group !== recipe.group, `${language} recipe group: ${recipe.group}`);
      assert.ok(title && (title !== recipe.name || canKeepName(recipe.name, language)),
        `${language} recipe: ${recipe.name}`);
      for (const material of Object.keys(recipe.materials || {})) {
        const translated = localizeCraftingMaterial(material, language);
        assert.ok(translated && (translated !== material || canKeepName(material, language)),
          `${language} ingredient: ${material}`);
      }
    }
  }
});

test("inventory archive names and effects resolve, including supplemental entries", async () => {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL("../src/data/inventoryDatabase.js", import.meta.url))],
    bundle: true, write: false, format: "esm", platform: "node",
    plugins: [{ name: "test-i18n", setup(builder) {
      builder.onResolve({ filter: /\/i18n\.js$/ }, () => ({ path: "i18n", namespace: "test-i18n" }));
      builder.onLoad({ filter: /.*/, namespace: "test-i18n" }, () => ({
        contents: 'export default { language: "en" };',
      }));
    } }],
  });
  const { INVENTORY_DATABASE } = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
  );
  const inventory = [
    ...INVENTORY_DATABASE,
    ...weapons.map((row) => ({ name: row.name, category: "weapons", effect: row.Effects })),
    ...armor.map((row) => ({ name: row.name, category: "armor", effect: row.effects })),
    ...ammo.filter((row) => row["Ammo Type"]).map((row) => ({ name: row["Ammo Type"], category: "ammo" })),
  ];
  for (const language of secondaryLanguages) {
    const t = i18n.getFixedT(language);
    for (const item of inventory) {
      const { displayName, displayEffect } = getLocalizedInventoryItem(item, language, t);
      assert.ok(displayName && (displayName !== item.name || canKeepName(item.name, language)),
        `${language} item: ${item.name}`);
      const effect = item.effect?.trim();
      if (effect && !/^(?:-+|None|—|0)$/i.test(effect)) {
        assert.ok(displayEffect && displayEffect !== effect, `${language} effect: ${item.name}`);
      }
    }
  }
});
