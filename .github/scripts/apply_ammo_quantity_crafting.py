from pathlib import Path

recipes_path = Path('src/data/craftingRecipes.js')
engine_path = Path('src/utils/craftingEngine.js')

recipes = recipes_path.read_text()
engine = engine_path.read_text()

old_rows = '''const AMMO_CRAFTING_ROWS = [
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
  ["Mini-Nuke", 6, 100, 12],
];'''

new_rows = '''const AMMO_CRAFTING_ROWS = [
  // name, rarity, cost, weight, static quantity, quantity CD, multiplier
  [".38", 0, 1, 0, 10, 5, 1],
  ["10mm", 0, 2, 0, 8, 4, 1],
  [".308", 1, 3, 0, 6, 3, 1],
  ["Flare", 1, 1, 0, 2, 1, 1],
  ["Shotgun Shell", 1, 3, 0, 6, 3, 1],
  [".45", 2, 3, 0, 8, 4, 1],
  ["Flamer Fuel", 2, 1, 0, 12, 6, 1],
  ["Fusion Cell", 2, 3, 0, 14, 7, 1],
  ["Gamma Round", 2, 10, 0, 4, 2, 1],
  ["Railway Spike", 2, 1, 0, 6, 3, 1],
  ["Syringer Ammo", 2, 1, 0, 4, 2, 1],
  [".44 Magnum", 3, 3, 0, 4, 2, 1],
  [".50", 3, 4, 0, 4, 2, 1],
  ["5.56mm", 3, 2, 0, 8, 4, 1],
  ["5mm", 3, 1, 0, 12, 6, 10],
  ["Fusion Core", 3, 200, 4, 1, 0, 1],
  ["Missile", 3, 25, 7, 2, 1, 1],
  ["Plasma Cartridge", 4, 5, 0, 10, 5, 1],
  ["2mm EC", 5, 10, 0, 6, 3, 1],
  ["Mini-Nuke", 6, 100, 12, 1, 1, 1],
];'''

if old_rows not in recipes:
    raise SystemExit('AMMO_CRAFTING_ROWS block not found')
recipes = recipes.replace(old_rows, new_rows)

old_map = '''  .map(([name, rarity, cost, weight]) => ({
  id: slug(`weapons-ammunition-${name}`),'''
new_map = '''  .map(([name, rarity, cost, weight, quantityBase, quantityDice, quantityMultiplier]) => ({
  id: slug(`weapons-ammunition-${name}`),'''
if old_map not in recipes:
    raise SystemExit('AMMO_RECIPES map signature not found')
recipes = recipes.replace(old_map, new_map)

old_fields = '''  ammoCost: cost,
  ammoWeight: weight,
}));'''
new_fields = '''  ammoCost: cost,
  ammoWeight: weight,
  ammoQuantityBase: quantityBase,
  ammoQuantityDice: quantityDice,
  ammoQuantityMultiplier: quantityMultiplier,
}));'''
if old_fields not in recipes:
    raise SystemExit('Ammo recipe output fields not found')
recipes = recipes.replace(old_fields, new_fields)

old_quantity = '''function resolveAmmosmithQuantity(character, recipe) {
  const perkRank = getAmmosmithRank(character);
  const rarity = Math.max(0, Number(recipe?.ammoRarity ?? recipe?.rarity ?? 0));
  if (perkRank < 3) {
    return { quantity: 1, perkRank, rarity, diceCount: 0, hits: 0, effects: 0 };
  }

  const diceCount = Math.max(1, 6 - rarity);
  const hiddenRoll = rollFalloutD6({ diceCount, effects: [] });
  const hits = Math.max(0, Number(hiddenRoll?.baseDamage || 0));
  const effects = Math.max(0, Number(hiddenRoll?.totalEffects || 0));
  const quantity = Math.max(1, (1 + hits) * (2 ** effects));

  return { quantity, perkRank, rarity, diceCount, hits, effects };
}'''

new_quantity = '''function resolveAmmosmithQuantity(character, recipe) {
  const perkRank = getAmmosmithRank(character);
  const rarity = Math.max(0, Number(recipe?.ammoRarity ?? recipe?.rarity ?? 0));

  // The ammunition table's Quantity Found expression is also the base craft output
  // for this app: static amount + the total from the listed Combat Dice.
  const quantityBase = Math.max(1, Number(recipe?.ammoQuantityBase ?? 1));
  const quantityDice = Math.max(0, Number(recipe?.ammoQuantityDice ?? 0));
  const quantityMultiplier = Math.max(1, Number(recipe?.ammoQuantityMultiplier ?? 1));
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
}'''

if old_quantity not in engine:
    raise SystemExit('resolveAmmosmithQuantity block not found')
engine = engine.replace(old_quantity, new_quantity)

recipes_path.write_text(recipes)
engine_path.write_text(engine)
print('Ammo crafting quantity rules patched')
