from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing patch anchor: {label}")
    return text.replace(old, new, 1)


# 1) Perk database
path = "src/components/data/perks.js"
text = read(path)
if '"ammosmith"' not in text:
    anchor = '  "armorer": { id: "armorer", maxRanks: 4, requirements: "STR 5, INT 6" },\n'
    addition = anchor + '  "ammosmith": { id: "ammosmith", name: "Ammosmith", description: "Craft ammunition at a weapons workbench. Higher ranks unlock ammunition up to rarity 3 and 5; rank 3 can produce additional rounds.", maxRanks: 3, requirements: "INT 7, Level 2+" },\n'
    text = replace_once(text, anchor, addition, "perks Ammosmith")
write(path, text)


# 2) Localized perk summary
path = "src/components/data/perkTranslations.js"
text = read(path)
if 'ammosmith:' not in text:
    anchor = 'const TEXT = {\n'
    addition = anchor + '  ammosmith: { ru: ["Ammosmith", "Позволяет создавать боеприпасы на оружейном верстаке; высокие ранги открывают более редкие боеприпасы и увеличивают результат крафта."], uk: ["Ammosmith", "Дозволяє створювати боєприпаси на збройовому верстаті; вищі ранги відкривають рідкісніші боєприпаси та збільшують результат крафту."], pl: ["Ammosmith", "Pozwala wytwarzać amunicję przy warsztacie broni; wyższe rangi odblokowują rzadszą amunicję i zwiększają wynik wytwarzania."] },\n'
    text = replace_once(text, anchor, addition, "perkTranslations Ammosmith")
write(path, text)


# 3) Ammunition recipes generated from the existing Ammo.csv values
path = "src/data/craftingRecipes.js"
text = read(path)
if "const AMMO_CRAFTING_ROWS = [" not in text:
    marker = "export const CRAFTING_RECIPES = [\n"
    ammo_block = '''const AMMO_CRAFTING_ROWS = [
  [".38", 0, 1, 0],
  ["10mm", 0, 2, 0],
  [".308", 1, 3, 0],
  ["Flare", 1, 1, 0],
  ["Shotgun Shell", 1, 3, 0],
  [".45", 2, 3, 0],
  ["Flamer Fuel", 2, 1, 0],
  ["Fusion Cell", 2, 3, 0],
  ["Gamma Round", 2, 10, 0],
  ["Railway Spike", 2, 1, 0],
  ["Syringer Ammo", 2, 1, 0],
  [".44 Magnum", 3, 3, 0],
  [".50", 3, 4, 0],
  ["5.56mm", 3, 2, 0],
  ["5mm", 3, 1, 0],
  ["Fusion Core", 3, 200, 4],
  ["Missile", 3, 25, 7],
  ["Plasma Cartridge", 4, 5, 0],
  ["2mm EC", 5, 10, 0],
  ["Mini-Nuke", 5, 100, 12],
];

const ammosmithRankForRarity = (rarity) => {
  const value = Number(rarity || 0);
  if (value <= 1) return 1;
  if (value <= 3) return 2;
  return 3;
};

const AMMO_RECIPES = AMMO_CRAFTING_ROWS.map(([name, rarity, cost, weight]) => ({
  id: slug(`weapons-ammunition-${name}`),
  category: "ammo",
  workbench: "weapons",
  group: "AMMUNITION",
  name,
  complexity: rarity,
  perks: `Ammosmith ${ammosmithRankForRarity(rarity)}`,
  skill: "Repair",
  rarity,
  materials: null,
  outputCategory: "ammo",
  outputName: name,
  sourcePage: 211,
  ammoCrafting: true,
  ammoRarity: rarity,
  ammoCost: cost,
  ammoWeight: weight,
}));

'''
    text = replace_once(text, marker, ammo_block + marker, "crafting ammo block")
    export_anchor = "export const CRAFTING_RECIPES = [\n  ...WEAPON_RECIPES,\n"
    export_new = "export const CRAFTING_RECIPES = [\n  ...AMMO_RECIPES,\n  ...WEAPON_RECIPES,\n"
    text = replace_once(text, export_anchor, export_new, "crafting ammo export")
write(path, text)


# 4) Crafting engine: recognize Ammosmith and resolve hidden CD quantity roll
path = "src/utils/craftingEngine.js"
text = read(path)
text = text.replace('import { rollFalloutD20 } from "./dice.js";', 'import { rollFalloutD20, rollFalloutD6 } from "./dice.js";')
if '"ammosmith": "ammosmith"' not in text:
    anchor = 'const PERK_IDS = {\n  "armorer": "armorer",\n'
    addition = 'const PERK_IDS = {\n  "ammosmith": "ammosmith",\n  "armorer": "armorer",\n'
    text = replace_once(text, anchor, addition, "crafting perk id")

if "function isAmmoCraftingRecipe" not in text:
    anchor = '''function isPowerArmorStealthBoyRecipe(recipe) {
  return normalize(recipe?.workbench) === "power_armor"
    && normalize(recipe?.name) === "stealth boy";
}

'''
    addition = anchor + '''function isAmmoCraftingRecipe(recipe) {
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

'''
    text = replace_once(text, anchor, addition, "ammo helpers")

if 'if (isAmmoCraftingRecipe(recipe)) {' not in text:
    anchor = '''export function createCraftedInventoryItem(recipe) {
  if (isPowerArmorStealthBoyRecipe(recipe)) {
'''
    addition = '''export function createCraftedInventoryItem(recipe) {
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
'''
    text = replace_once(text, anchor, addition, "ammo output item")

old = '''  next[index] = {
    ...current,
    quantity: String(Math.max(0, Number(current?.quantity || 0)) + 1),
  };
'''
new = '''  next[index] = {
    ...current,
    quantity: String(
      Math.max(0, Number(current?.quantity || 0))
      + Math.max(1, Number(craftedItem?.quantity || 1))
    ),
  };
'''
if old in text:
    text = text.replace(old, new, 1)

old = '''  let output = null;
  if (success) {
    output = createCraftedInventoryItem(recipe);
    inventory = addCraftedInventoryItem(inventory, output);
  }

  return {
'''
new = '''  let output = null;
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
'''
text = replace_once(text, old, new, "ammo quantity result")
old = '''    inventory,
    output,
  };
}
'''
new = '''    inventory,
    output,
    ammoResult,
  };
}
'''
text = replace_once(text, old, new, "ammo result return")
write(path, text)


# 5) Crafting UI: dedicated AMMO filter and hidden rolls for ammunition
path = "src/components/crafting/CraftingScreen.jsx"
text = read(path)
text = text.replace('subtitle: "WORKBENCH // CORE RULEBOOK RECIPES"', 'subtitle: "WORKBENCH // RECIPES"')
text = text.replace('subtitle: "ВЕРСТАК // РЕЦЕПТЫ CORE RULEBOOK"', 'subtitle: "ВЕРСТАК // РЕЦЕПТЫ"')
text = text.replace('subtitle: "ВЕРСТАТ // РЕЦЕПТИ CORE RULEBOOK"', 'subtitle: "ВЕРСТАТ // РЕЦЕПТИ"')
text = text.replace('subtitle: "WARSZTAT // RECEPTURY CORE RULEBOOK"', 'subtitle: "WARSZTAT // RECEPTURY"')
text = text.replace('weapons: "WEAPONS", armor: "ARMOR", mods: "MODS", explosives: "EXPLOSIVES", items: "OTHER",', 'weapons: "WEAPONS", ammo: "AMMO", armor: "ARMOR", mods: "MODS", explosives: "EXPLOSIVES", items: "OTHER",')
text = text.replace('weapons: "ОРУЖИЕ", armor: "БРОНЯ", mods: "МОДЫ", explosives: "ВЗРЫВЧАТКА", items: "ДРУГОЕ",', 'weapons: "ОРУЖИЕ", ammo: "ПАТРОНЫ", armor: "БРОНЯ", mods: "МОДЫ", explosives: "ВЗРЫВЧАТКА", items: "ДРУГОЕ",')
text = text.replace('weapons: "ЗБРОЯ", armor: "БРОНЯ", mods: "МОДИ", explosives: "ВИБУХІВКА", items: "ІНШЕ",', 'weapons: "ЗБРОЯ", ammo: "ПАТРОНИ", armor: "БРОНЯ", mods: "МОДИ", explosives: "ВИБУХІВКА", items: "ІНШЕ",')
text = text.replace('weapons: "BROŃ", armor: "PANCERZ", mods: "MODY", explosives: "MATERIAŁY WYBUCHOWE", items: "INNE",', 'weapons: "BROŃ", ammo: "AMUNICJA", armor: "PANCERZ", mods: "MODY", explosives: "MATERIAŁY WYBUCHOWE", items: "INNE",')
text = text.replace('const CATEGORIES = ["weapons", "armor", "mods", "explosives", "items"];', 'const CATEGORIES = ["weapons", "ammo", "armor", "mods", "explosives", "items"];')
text = text.replace('const WORKBENCHES = {\n  weapons: ["weapons"],', 'const WORKBENCHES = {\n  weapons: ["weapons"],\n  ammo: ["weapons"],')
text = text.replace('  if (group === "EXPLOSIVES") return "explosives";\n', '  if (group === "EXPLOSIVES") return "explosives";\n  if (group === "AMMUNITION") return "ammo";\n')
text = text.replace('            rolls: (result.roll?.rolls || []).map((die) => die.value),', '            rolls: recipe.ammoCrafting ? [] : (result.roll?.rolls || []).map((die) => die.value),')

old = '''        <div>
          {lastResult.automatic
            ? copy.automatic
            : `${copy.roll}: [${diceText(lastResult.roll)}] // ${copy.target} ${lastResult.state.skill.targetNumber} // D${lastResult.state.difficulty} // ${lastResult.roll?.totalSuccesses || 0} ${copy.successes}`}
        </div>
        <div>{copy.complications}: {lastResult.complications}</div>
        <div>{copy.duration}: {lastResult.durationMinutes} {copy.minutes}</div>
        {lastResult.success ? <div>{copy.output}: {lastResult.output?.name || recipe.outputName || recipe.name}</div> : null}
'''
new = '''        {recipe.ammoCrafting ? (
          lastResult.success
            ? <div>{copy.output}: {lastResult.output?.name || recipe.name} ×{lastResult.output?.quantity || 1}</div>
            : null
        ) : (
          <>
            <div>
              {lastResult.automatic
                ? copy.automatic
                : `${copy.roll}: [${diceText(lastResult.roll)}] // ${copy.target} ${lastResult.state.skill.targetNumber} // D${lastResult.state.difficulty} // ${lastResult.roll?.totalSuccesses || 0} ${copy.successes}`}
            </div>
            <div>{copy.complications}: {lastResult.complications}</div>
          </>
        )}
        <div>{copy.duration}: {lastResult.durationMinutes} {copy.minutes}</div>
        {!recipe.ammoCrafting && lastResult.success ? <div>{copy.output}: {lastResult.output?.name || recipe.outputName || recipe.name}</div> : null}
'''
text = replace_once(text, old, new, "hide ammo dice")

old = '''                    <span className={`craft-rarity is-${String(recipe.rarity).toLowerCase()}`}>{rarityLabel(recipe.rarity, copy)}</span>
'''
new = '''                    <span className={`craft-rarity is-${String(recipe.rarity).toLowerCase()}`}>
                      {recipe.ammoCrafting ? `R${recipe.ammoRarity}` : rarityLabel(recipe.rarity, copy)}
                    </span>
'''
text = replace_once(text, old, new, "ammo rarity chip")

old = '''                        {copy.craft} // {copy.target} {state.skill.targetNumber} // D{state.difficulty}
'''
new = '''                        {recipe.ammoCrafting
                          ? `${copy.craft} // R${recipe.ammoRarity}`
                          : `${copy.craft} // ${copy.target} ${state.skill.targetNumber} // D${state.difficulty}`}
'''
text = replace_once(text, old, new, "ammo craft button")
write(path, text)
