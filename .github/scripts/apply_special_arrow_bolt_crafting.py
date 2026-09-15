from pathlib import Path

path = Path("src/data/craftingRecipes.js")
text = path.read_text(encoding="utf-8")

marker = 'group: "SPECIAL ARROWS & BOLTS"'
if marker in text:
    print("Special arrow/bolt recipes already present")
    raise SystemExit(0)

anchor = 'const WEAPON_RECIPES = [\n'
if anchor not in text:
    raise SystemExit("Could not find WEAPON_RECIPES anchor")

block = '''  // App crafting layer for the supplemental arrow/bolt variants.\n  // Uses only the companion's abstract junk/material economy.\n  ...group({ workbench: "weapons", category: "weapons", group: "SPECIAL ARROWS & BOLTS", skill: "Repair", page: 59, outputCategory: "ammo" }, [\n    ["Cryo Arrow", 4, "", "Rare", null, { "Arrow": 1, "Common Materials": 2, "Uncommon Materials": 2, "Rare Materials": 1 }],\n    ["Cryo Crossbow Bolt", 4, "", "Rare", null, { "Crossbow Bolt": 1, "Common Materials": 2, "Uncommon Materials": 2, "Rare Materials": 1 }],\n    ["Explosive Arrow", 4, "", "Uncommon", null, { "Arrow": 1, "Common Materials": 3, "Uncommon Materials": 2 }],\n    ["Explosive Crossbow Bolt", 4, "", "Uncommon", null, { "Crossbow Bolt": 1, "Common Materials": 3, "Uncommon Materials": 2 }],\n    ["Flaming Arrow", 2, "", "Uncommon", null, { "Arrow": 1, "Common Materials": 3 }],\n    ["Flaming Crossbow Bolt", 2, "", "Uncommon", null, { "Crossbow Bolt": 1, "Common Materials": 3 }],\n    ["Serrated Arrow", 3, "", "Uncommon", null, { "Arrow": 1, "Common Materials": 2, "Uncommon Materials": 1 }],\n    ["Serrated Crossbow Bolt", 3, "", "Uncommon", null, { "Crossbow Bolt": 1, "Common Materials": 2, "Uncommon Materials": 1 }],\n    ["Plasma Arrow", 5, "", "Rare", null, { "Arrow": 1, "Common Materials": 2, "Uncommon Materials": 2, "Rare Materials": 2 }],\n    ["Plasma Crossbow Bolt", 5, "", "Rare", null, { "Crossbow Bolt": 1, "Common Materials": 2, "Uncommon Materials": 2, "Rare Materials": 2 }],\n    ["Poison Arrow", 3, "", "Uncommon", null, { "Arrow": 1, "Common Materials": 2, "Uncommon Materials": 1 }],\n    ["Poison Crossbow Bolt", 3, "", "Uncommon", null, { "Crossbow Bolt": 1, "Common Materials": 2, "Uncommon Materials": 1 }],\n  ]),\n'''

text = text.replace(anchor, anchor + block, 1)
path.write_text(text, encoding="utf-8")
print("Added 12 special arrow/bolt crafting recipes")
