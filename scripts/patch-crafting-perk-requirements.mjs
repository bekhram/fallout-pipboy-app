import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Anchor not found: ${label}`);
  return text.replace(from, to);
}

// Centralize automatic crafting perk requirements.
{
  const path = 'src/utils/craftingEngine.js';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    `export function getCharacterPerkRank(character, requirement) {\n`,
    `function mergePerkRequirements(requirements = []) {\n  const merged = new Map();\n  requirements.forEach((requirement) => {\n    if (!requirement?.id) return;\n    const current = merged.get(requirement.id);\n    if (!current || Number(requirement.rank || 1) > Number(current.rank || 1)) {\n      merged.set(requirement.id, { ...requirement });\n    }\n  });\n  return [...merged.values()];\n}\n\nfunction getRecipeItemRarity(recipe) {\n  const candidates = [\n    recipe?.itemRarity,\n    recipe?.outputTemplate?.rarity,\n    recipe?.ammoRarity,\n  ];\n  for (const candidate of candidates) {\n    const value = Number.parseInt(String(candidate ?? ''), 10);\n    if (Number.isFinite(value)) return Math.max(0, Math.min(7, value));\n  }\n  return 0;\n}\n\nfunction requiredPerkRankForItemRarity(rarity) {\n  const value = Math.max(0, Math.min(7, Number(rarity) || 0));\n  if (value <= 1) return 0;\n  if (value === 2) return 2;\n  if (value === 3) return 3;\n  // Rarity 4 appears in both user-defined ranges; the stricter rank 4 wins.\n  return 4;\n}\n\nfunction automaticCraftingPerkRequirements(recipe) {\n  const requirements = [];\n  const group = normalize(recipe?.group);\n  const category = normalize(recipe?.category);\n\n  if (group === 'explosives') {\n    requirements.push({ id: 'demolition_expert', label: 'Demolition Expert', rank: 1 });\n  }\n\n  if (recipe?.appGeneratedBaseRecipe) {\n    const rank = requiredPerkRankForItemRarity(getRecipeItemRarity(recipe));\n    if (rank > 0) {\n      if (category === 'armor') {\n        requirements.push({ id: 'armorer', label: 'Armorer', rank });\n      } else if (category === 'weapons') {\n        const skill = normalize(recipe?.outputTemplate?.skill);\n        if (skill === 'melee weapons' || skill === 'unarmed') {\n          requirements.push({ id: 'blacksmith', label: 'Blacksmith', rank });\n        } else if (skill === 'explosives') {\n          requirements.push({ id: 'demolition_expert', label: 'Demolition Expert', rank });\n        } else {\n          requirements.push({ id: 'gun_nut', label: 'Gun Nut', rank });\n        }\n      }\n    }\n  }\n\n  return requirements;\n}\n\nexport function getRecipePerkRequirements(recipe) {\n  return mergePerkRequirements([\n    ...parsePerkRequirements(recipe?.perks),\n    ...automaticCraftingPerkRequirements(recipe),\n  ]);\n}\n\nexport function getCharacterPerkRank(character, requirement) {\n`,
    'automatic perk helpers'
  );

  text = replaceOnce(
    text,
    `  const perkRequirements = parsePerkRequirements(recipe?.perks);\n`,
    `  const perkRequirements = getRecipePerkRequirements(recipe);\n`,
    'use effective perk requirements'
  );

  fs.writeFileSync(path, text);
}

// Preserve the numeric source rarity on generated base recipes.
{
  const path = 'src/data/baseCraftingRecipes.js';
  let text = fs.readFileSync(path, 'utf8');

  text = replaceOnce(
    text,
    `        rarity: "Common",\n        materials: null,\n        outputCategory: "weapons",\n`,
    `        rarity: "Common",\n        itemRarity: String(row.Rarity ?? "0"),\n        materials: null,\n        outputCategory: "weapons",\n`,
    'weapon item rarity'
  );

  text = replaceOnce(
    text,
    `        rarity: "Common",\n        materials: null,\n        outputCategory: "armor",\n`,
    `        rarity: "Common",\n        itemRarity: String(item.rarity ?? "0"),\n        materials: null,\n        outputCategory: "armor",\n`,
    'armor item rarity'
  );

  fs.writeFileSync(path, text);
}

// Make rare-recipe learning explicit and one-way in the UI; show numeric rarity on generated base gear.
{
  const path = 'src/components/crafting/CraftingScreen.jsx';
  let text = fs.readFileSync(path, 'utf8');

  const textReplacements = [
    ['recipeFound: "RECIPE FOUND", forgetRecipe: "REMOVE RECIPE",', 'learnRecipe: "LEARN RECIPE", recipeLearned: "RECIPE LEARNED",'],
    ['recipeFound: "РЕЦЕПТ НАЙДЕН", forgetRecipe: "УБРАТЬ РЕЦЕПТ",', 'learnRecipe: "ВЫУЧИТЬ РЕЦЕПТ", recipeLearned: "РЕЦЕПТ ИЗУЧЕН",'],
    ['recipeFound: "РЕЦЕПТ ЗНАЙДЕНО", forgetRecipe: "ПРИБРАТИ РЕЦЕПТ",', 'learnRecipe: "ВИВЧИТИ РЕЦЕПТ", recipeLearned: "РЕЦЕПТ ВИВЧЕНО",'],
    ['recipeFound: "RECEPTURA ZNALEZIONA", forgetRecipe: "USUŃ RECEPTURĘ",', 'learnRecipe: "NAUCZ SIĘ RECEPTURY", recipeLearned: "RECEPTURA POZNANA",'],
  ];
  for (const [from, to] of textReplacements) {
    text = replaceOnce(text, from, to, `rare recipe copy ${from}`);
  }

  text = replaceOnce(
    text,
    `  const toggleKnownRecipe = (recipe) => {\n    if (!setCharacter) return;\n    setCharacter((prev) => {\n      const known = new Set(prev?.craftingKnownRecipes || []);\n      if (known.has(recipe.id)) known.delete(recipe.id);\n      else known.add(recipe.id);\n      return { ...prev, craftingKnownRecipes: [...known] };\n    });\n  };\n`,
    `  const learnRareRecipe = (recipe) => {\n    if (!setCharacter) return;\n    setCharacter((prev) => {\n      const known = new Set(prev?.craftingKnownRecipes || []);\n      known.add(recipe.id);\n      return { ...prev, craftingKnownRecipes: [...known] };\n    });\n  };\n`,
    'learn rare recipe handler'
  );

  text = replaceOnce(
    text,
    `                    <span className={\`craft-rarity is-\${String(recipe.rarity).toLowerCase()}\`}>\n                      {recipe.ammoCrafting ? \`R\${recipe.ammoRarity}\` : rarityLabel(recipe.rarity, copy)}\n                    </span>\n`,
    `                    <span className={\`craft-rarity is-\${String(recipe.rarity).toLowerCase()}\`}>\n                      {recipe.appGeneratedBaseRecipe\n                        ? \`R\${recipe.itemRarity ?? recipe.outputTemplate?.rarity ?? 0}\`\n                        : recipe.ammoCrafting\n                          ? \`R\${recipe.ammoRarity}\`\n                          : rarityLabel(recipe.rarity, copy)}\n                    </span>\n`,
    'generated base rarity badge'
  );

  text = replaceOnce(
    text,
    `                      {String(recipe.rarity).toLowerCase() === "rare" ? (\n                        <button\n                          type="button"\n                          className={\`pip-btn \${state.knownRare ? "is-primary" : ""}\`}\n                          onClick={() => toggleKnownRecipe(recipe)}\n                          disabled={!setCharacter}\n                        >\n                          {state.knownRare ? copy.forgetRecipe : copy.recipeFound}\n                        </button>\n                      ) : null}\n`,
    `                      {String(recipe.rarity).toLowerCase() === "rare" ? (\n                        <button\n                          type="button"\n                          className={\`pip-btn \${state.knownRare ? "is-primary" : ""}\`}\n                          onClick={() => learnRareRecipe(recipe)}\n                          disabled={!setCharacter || state.knownRare}\n                        >\n                          {state.knownRare ? copy.recipeLearned : copy.learnRecipe}\n                        </button>\n                      ) : null}\n`,
    'rare recipe learn button'
  );

  fs.writeFileSync(path, text);
}

console.log('Crafting perk requirements patch applied.');
