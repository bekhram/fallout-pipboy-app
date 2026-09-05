from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(path, replacements):
    file = ROOT / path
    text = file.read_text(encoding="utf-8")
    for old, new, label in replacements:
        if old not in text:
            raise RuntimeError(f"Anchor not found in {path}: {label}")
        text = text.replace(old, new, 1)
    file.write_text(text, encoding="utf-8")


patch("src/utils/playerBestiaryAttack.js", [
    (
        'import { applyWeaponMods } from "../data/weaponMods.js";\n',
        'import { applyWeaponMods } from "../data/weaponMods.js";\nimport { getEffectiveSpecialValue, getEffectiveSkillRank } from "../data/inventory/bobbleheads.js";\n',
        "bobblehead import",
    ),
    (
        '  const attributeValue = Number(character?.special?.[attribute] || 0);\n  const rank = Number(skill?.rank || 0);',
        '  const attributeValue = getEffectiveSpecialValue(character, attribute);\n  const rank = getEffectiveSkillRank(character, skillName);',
        "effective combat skill",
    ),
])

patch("src/components/inventory/InventoryEditor.jsx", [
    (
        '  const showEffect = ["weapons", "armor", "aid", "food", "beverages", "magazines", "tools"].includes(draft.category);',
        '  const showEffect = ["weapons", "armor", "aid", "food", "beverages", "magazines", "tools", "misc"].includes(draft.category);',
        "misc effect field",
    ),
])

patch("src/components/map/LocalGmChat.jsx", [
    (
        'import { getEnvironmentSnapshot } from "../../utils/environmentSystem.js";\n',
        'import { getEnvironmentSnapshot } from "../../utils/environmentSystem.js";\nimport { getBobbleheadBonuses, getEffectiveSpecialValue, getEffectiveSkillRank } from "../../data/inventory/bobbleheads.js";\n',
        "gm bobblehead import",
    ),
    (
        '    special: character.special || character.SPECIAL || null,\n    skills: character.skills || null,',
        '    special: character.special\n      ? Object.fromEntries(["S", "P", "E", "C", "I", "A", "L"].map((key) => [key, getEffectiveSpecialValue(character, key)]))\n      : character.SPECIAL || null,\n    skills: character.skills\n      ? Object.fromEntries(Object.entries(character.skills).map(([name, skill]) => [name, {\n          ...skill,\n          rank: String(getEffectiveSkillRank(character, name)),\n          bobbleheadBonus: Number(getBobbleheadBonuses(character).skills?.[name] || 0),\n        }]))\n      : null,',
        "gm effective stats",
    ),
])
