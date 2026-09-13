from pathlib import Path

# Triggered after workflow installation.

def replace_once(path, old, new):
    text = Path(path).read_text()
    if old not in text:
        raise SystemExit(f"Expected block not found in {path}: {old[:80]!r}")
    Path(path).write_text(text.replace(old, new, 1))


d20 = "src/components/dice/FalloutD20Roller.jsx"
replace_once(
    d20,
    'import { playSound } from "../../utils/soundManager";\n',
    'import { playSound } from "../../utils/soundManager";\nimport { getDerivedStats } from "../../utils/characterMath.js";\nimport { getEffectiveSpecialValue, getEffectiveSkillRank } from "../../data/inventory/bobbleheads.js";\n',
)

replace_once(
    d20,
    '''function getSkillTestValue(skill, form) {\n  if (!skill || !form) return 0;\n\n  const rank = Number(skill.rank || 0);\n  const attributeKey = skill.attribute || "A";\n  const attrValue = Number(form.special?.[attributeKey] || 0);\n  const tagBonus = skill.tagged ? 2 : 0;\n  const bonus = Number(skill.bonus || 0);\n\n  return rank + attrValue + tagBonus + bonus;\n}\n\nfunction getSkillCriticalRange(skill) {\n  if (!skill) return 1;\n\n  const rank = Math.min(20, Number(skill.rank || 0));\n  return skill.tagged ? Math.max(1, rank) : 1;\n}\n''',
    '''function getSkillTestValue(skill, form, skillName = "") {\n  if (!skill || !form) return 0;\n\n  const rank = skillName\n    ? getEffectiveSkillRank(form, skillName)\n    : Number(skill.rank || 0);\n  const attributeKey = skill.attribute || "A";\n  const effectiveAttrValue = getEffectiveSpecialValue(form, attributeKey);\n  const perkStrength = attributeKey === "S"\n    ? Number(getDerivedStats(form)?.perkContextualModifiers?.strengthForStrengthTests)\n    : NaN;\n  const attrValue = Number.isFinite(perkStrength)\n    ? Math.max(effectiveAttrValue, perkStrength)\n    : effectiveAttrValue;\n  const tagBonus = skill.tagged ? 2 : 0;\n  const bonus = Number(skill.bonus || 0);\n\n  return rank + attrValue + tagBonus + bonus;\n}\n\nfunction getSkillCriticalRange(skill, form = null, skillName = "") {\n  if (!skill) return 1;\n\n  const rawRank = form && skillName\n    ? getEffectiveSkillRank(form, skillName)\n    : Number(skill.rank || 0);\n  const rank = Math.min(20, rawRank);\n  return skill.tagged ? Math.max(1, rank) : 1;\n}\n''',
)

replace_once(
    d20,
    '  return getSkillTestValue(skill, form);\n}\n\nfunction getWeaponCriticalRange',
    '  return getSkillTestValue(skill, form, skillName);\n}\n\nfunction getWeaponCriticalRange',
)
replace_once(
    d20,
    '  return getSkillCriticalRange(skill);\n}\n\nfunction getWeaponDamageDiceCount',
    '  return getSkillCriticalRange(skill, form, skillName);\n}\n\nfunction getWeaponDamageDiceCount',
)

replace_once(
    d20,
    '''  const baseDamageDiceCount = getWeaponDamageDiceCount(rollConfig?.weapon);\n  const extraRateDiceCount = rollConfig?.useRate\n    ? Number(rollConfig?.rate) || 0\n    : 0;\n\n  const totalDamageDiceCount = baseDamageDiceCount + extraRateDiceCount;\n''',
    '''  const baseDamageDiceCount = getWeaponDamageDiceCount(rollConfig?.weapon);\n  const weaponSkill = String(rollConfig?.weapon?.skill || "").trim();\n  const meleeDamageDiceCount = ["Melee Weapons", "Unarmed"].includes(weaponSkill)\n    ? Number(getDerivedStats(form)?.md || 0)\n    : 0;\n  const extraRateDiceCount = rollConfig?.useRate\n    ? Number(rollConfig?.rate) || 0\n    : 0;\n\n  const totalDamageDiceCount = baseDamageDiceCount + meleeDamageDiceCount + extraRateDiceCount;\n''',
)

weapon = "src/components/weapons/WeaponCard.jsx"
replace_once(
    weapon,
    'import { createWeaponRoll } from "../../utils/dice";\n',
    'import { createWeaponRoll } from "../../utils/dice";\nimport { getDerivedStats } from "../../utils/characterMath.js";\n',
)
replace_once(
    weapon,
    '  const allTags = [...processedQualities, ...processedEffects];\n',
    '''  const allTags = [...processedQualities, ...processedEffects];\n  const weaponSkill = String(calculatedWeapon?.skill || "").trim();\n  const meleeDamageDiceBonus = ["Melee Weapons", "Unarmed"].includes(weaponSkill)\n    ? Number(getDerivedStats(form)?.md || 0)\n    : 0;\n  const rawDamageDisplay = String(calculatedWeapon.damage || "0");\n  const damageNumberMatch = rawDamageDisplay.match(/\\d+/);\n  const effectiveDamageDisplay = meleeDamageDiceBonus > 0 && damageNumberMatch\n    ? rawDamageDisplay.replace(\n        damageNumberMatch[0],\n        String(Number(damageNumberMatch[0]) + meleeDamageDiceBonus)\n      )\n    : rawDamageDisplay;\n''',
)
replace_once(
    weapon,
    '{calculatedWeapon.damage || "0"}',
    '{effectiveDamageDisplay}',
)

print("Power armor effective Strength now drives skill/weapon rolls and melee damage.")