import fs from 'node:fs';

const path = 'src/data/craftingRecipes.js';
let text = fs.readFileSync(path, 'utf8');

const robotRepairRow = '    ["Robot Repair Kit", 4, "", "Common", null, { "Rare Materials": 2, "Fusion Cell": 4, "Uncommon Materials": 2, "Common Materials": 1 }],\n';
if (!text.includes(robotRepairRow)) {
  throw new Error('Robot Repair Kit row not found');
}
text = text.replace(robotRepairRow, '');

const exportAnchor = 'export const CRAFTING_RECIPES = [\n';
if (!text.includes(exportAnchor)) {
  throw new Error('CRAFTING_RECIPES export anchor not found');
}

const utilityRecipes = `const UTILITY_RECIPES = [
  {
    id: "chemistry-repair-kits-robot-repair-kit",
    category: "items",
    workbench: "chemistry",
    group: "REPAIR KITS",
    name: "Robot Repair Kit",
    complexity: 4,
    perks: "",
    skill: "Science",
    rarity: "Common",
    materials: { "Common Materials": 1, "Uncommon Materials": 2, "Rare Materials": 2, "Fusion Cell": 4 },
    outputCategory: "misc",
    outputName: "Robot Repair Kit",
    outputTemplate: {
      name: "Robot Repair Kit",
      category: "misc",
      weight: "1",
      cost: "",
      rarity: "4",
      effect: "Repair consumable for robots.",
      localizedName: { en: "Robot Repair Kit", ru: "Ремкомплект для робота", uk: "Ремкомплект для робота", pl: "Zestaw naprawczy robota" },
      localizedEffect: { en: "Repair consumable for robots.", ru: "Расходник для ремонта роботов.", uk: "Витратний предмет для ремонту роботів.", pl: "Przedmiot do naprawy robotów." },
    },
    appGeneratedRecipe: true,
  },
  {
    id: "power-armor-repair-kits-power-armor-repair-kit",
    category: "items",
    workbench: "power_armor",
    group: "REPAIR KITS",
    name: "Power Armor Repair Kit",
    complexity: 5,
    perks: "Armorer 2",
    skill: "Repair",
    rarity: "Uncommon",
    materials: { "Common Materials": 3, "Uncommon Materials": 3, "Rare Materials": 2 },
    outputCategory: "misc",
    outputName: "Power Armor Repair Kit",
    outputTemplate: {
      name: "Power Armor Repair Kit",
      category: "misc",
      weight: "2",
      cost: "",
      rarity: "4",
      effect: "Repair consumable for power armor.",
      localizedName: { en: "Power Armor Repair Kit", ru: "Ремкомплект силовой брони", uk: "Ремкомплект силової броні", pl: "Zestaw naprawczy pancerza wspomaganego" },
      localizedEffect: { en: "Repair consumable for power armor.", ru: "Расходник для ремонта силовой брони.", uk: "Витратний предмет для ремонту силової броні.", pl: "Przedmiot do naprawy pancerza wspomaganego." },
    },
    appGeneratedRecipe: true,
  },
  {
    id: "chemistry-utility-stealth-boy-consumable",
    category: "items",
    workbench: "chemistry",
    group: "UTILITY DEVICES",
    name: "Stealth Boy (Consumable)",
    complexity: 5,
    perks: "Science! 2",
    skill: "Science",
    rarity: "Uncommon",
    materials: { "Common Materials": 2, "Uncommon Materials": 3, "Rare Materials": 2 },
    outputCategory: "misc",
    outputName: "Stealth Boy",
    appGeneratedRecipe: true,
  },
];

`;

text = text.replace(exportAnchor, utilityRecipes + exportAnchor);
text = text.replace('  ...COOKING_RECIPES,\n];', '  ...COOKING_RECIPES,\n  ...UTILITY_RECIPES,\n];');

fs.writeFileSync(path, text);
