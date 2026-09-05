from pathlib import Path
import re

recipes_path = Path('src/data/craftingRecipes.js')
engine_path = Path('src/utils/craftingEngine.js')

recipes = recipes_path.read_text()
engine = engine_path.read_text()

rows = '''const AMMO_CRAFTING_ROWS = [
  [".38", 0, 1, 0, "10+5"],
  ["10mm", 0, 2, 0, "8+4"],
  [".308", 1, 3, 0, "6+3"],
  ["Flare", 1, 1, 0, "2+1"],
  ["Shotgun Shell", 1, 3, 0, "6+3"],
  [".45", 2, 3, 0, "8+4"],
  ["Flamer Fuel", 2, 1, 0, "12+6"],
  ["Fusion Cell", 2, 3, 0, "14+7"],
  ["Gamma Round", 2, 10, 0, "4+2"],
  ["Railway Spike", 2, 1, 0, "6+3"],
  ["Syringer Ammo", 2, 1, 0, "4+2"],
  [".44 Magnum", 3, 3, 0, "4+2"],
  [".50", 3, 4, 0, "4+2"],
  ["5.56mm", 3, 2, 0, "8+4"],
  ["5mm", 3, 1, 0, "12+6"],
  ["Fusion Core", 3, 200, 4, "1"],
  ["Missile", 3, 25, 7, "2+1"],
  ["Plasma Cartridge", 4, 5, 0, "10+5"],
  ["2mm EC", 5, 10, 0, "6+3"],
  ["Mini-Nuke", 6, 100, 12, "1+1"],
];'''

recipes, n = re.subn(
    r'const AMMO_CRAFTING_ROWS = \[.*?\n\];(?=\n\nconst ammosmithRankForRarity)',
    rows,
    recipes,
    flags=re.S,
)
assert n == 1, f'AMMO_CRAFTING_ROWS replacement count={n}'

old_map = '.map(([name, rarity, cost, weight]) => ({'
new_map = '.map(([name, rarity, cost, weight, quantityFound]) => ({'
assert old_map in recipes, 'ammo recipe map signature not found'
recipes = recipes.replace(old_map, new_map, 1)

needle = '  ammoWeight: weight,\n}));'
replacement = '  ammoWeight: weight,\n  ammoQuantityFound: quantityFound,\n}));'
assert needle in recipes, 'ammoWeight output block not found'
recipes = recipes.replace(needle, replacement, 1)

new_engine_block = '''function rollAmmoTableQuantity(expression) {
  const match = String(expression || "1").trim().match(/^(\\d+)(?:\\+(\\d+))?$/);
  const base = Math.max(1, Number(match?.[1] || 1));
  const diceCount = Math.max(0, Number(match?.[2] || 0));
  if (!diceCount) {
    return { quantity: base, base, diceCount: 0, hits: 0 };
  }

  const hiddenRoll = rollFalloutD6({ diceCount, effects: [] });
  const hits = Math.max(0, Number(hiddenRoll?.baseDamage || 0));
  return { quantity: base + hits, base, diceCount, hits };
}

function resolveAmmosmithQuantity(character, recipe) {
  const perkRank = getAmmosmithRank(character);
  const rarity = Math.max(0, Number(recipe?.ammoRarity ?? recipe?.rarity ?? 0));
  const tableRoll = rollAmmoTableQuantity(recipe?.ammoQuantityFound || "1");

  if (perkRank < 3) {
    return {
      quantity: tableRoll.quantity,
      perkRank,
      rarity,
      tableBase: tableRoll.base,
      tableDiceCount: tableRoll.diceCount,
      tableHits: tableRoll.hits,
      diceCount: 0,
      hits: 0,
      effects: 0,
    };
  }

  const diceCount = Math.max(1, 6 - rarity);
  const hiddenRoll = rollFalloutD6({ diceCount, effects: [] });
  const hits = Math.max(0, Number(hiddenRoll?.baseDamage || 0));
  const effects = Math.max(0, Number(hiddenRoll?.totalEffects || 0));
  const quantity = Math.max(1, (tableRoll.quantity + hits) * (2 ** effects));

  return {
    quantity,
    perkRank,
    rarity,
    tableBase: tableRoll.base,
    tableDiceCount: tableRoll.diceCount,
    tableHits: tableRoll.hits,
    diceCount,
    hits,
    effects,
  };
}
'''

engine, n = re.subn(
    r'function resolveAmmosmithQuantity\(character, recipe\) \{.*?\n\}\n\n(?=export function getAmmosmithDismantleMaterials)',
    new_engine_block + '\n',
    engine,
    flags=re.S,
)
assert n == 1, f'resolveAmmosmithQuantity replacement count={n}'

recipes_path.write_text(recipes)
engine_path.write_text(engine)
print('Applied ammo craft quantity table integration')
