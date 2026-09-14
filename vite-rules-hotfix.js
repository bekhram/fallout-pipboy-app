function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`[pip2d20 rules] Could not apply ${label}`);
  }
  return source.replace(search, replacement);
}

function patchQuickCharacterWizard(source) {
  let code = source;

  code = replaceRequired(
    code,
    `  const usedSkillPoints = SKILL_KEYS.reduce(\n    (sum, key) => sum + Number(skills?.[key]?.rank || 0),\n    0\n  );`,
    `  const usedSkillPoints = SKILL_KEYS.reduce(\n    (sum, key) => sum + Number(skills?.[key]?.rank || 0),\n    0\n  );\n  const skillPointBudget = Math.max(9, Number(special?.I || 0) + 9);`,
    "Quick Start INT + 9 budget"
  );

  code = code.replaceAll("usedSkillPoints === 9", "usedSkillPoints === skillPointBudget");
  code = code.replaceAll("usedSkillPoints >= 9", "usedSkillPoints >= skillPointBudget");
  code = code.replaceAll("{usedSkillPoints}/9", "{usedSkillPoints}/{skillPointBudget}");

  code = code
    .replace("Assign 9 starting Skill ranks.", "Assign INT + 9 starting Skill ranks.")
    .replace("Assign exactly 9 Skill ranks and all required Tag Skills.", "Assign exactly INT + 9 Skill ranks and all required Tag Skills.")
    .replace("Распредели 9 стартовых рангов навыков.", "Распредели INT + 9 стартовых рангов навыков.")
    .replace("Нужно распределить ровно 9 рангов навыков и выбрать все обязательные Tag Skills.", "Нужно распределить ровно INT + 9 рангов навыков и выбрать все обязательные Tag Skills.")
    .replace("Розподіли 9 стартових рангів навичок.", "Розподіли INT + 9 стартових рангів навичок.")
    .replace("Потрібно розподілити рівно 9 рангів навичок і обрати всі обов'язкові Tag Skills.", "Потрібно розподілити рівно INT + 9 рангів навичок і обрати всі обов'язкові Tag Skills.")
    .replace("Rozdziel 9 początkowych rang umiejętności.", "Rozdziel INT + 9 początkowych rang umiejętności.")
    .replace("Przydziel dokładnie 9 rang umiejętności i wybierz wszystkie wymagane Tag Skills.", "Przydziel dokładnie INT + 9 rang umiejętności i wybierz wszystkie wymagane Tag Skills.");

  return code;
}

function patchAppCharacterRules(source) {
  const original = ` const updateSpecial = (key, value) =>\n    setForm((prev) => {\n      const currentOrigin = prev.origin && ORIGINS[prev.origin] ? ORIGINS[prev.origin] : null;\n      const limits = currentOrigin?.specialLimits || { min: 1, max: 10 };\n      const minAllowed = limits.min !== undefined ? limits.min : 1;\n      const maxAllowed = limits[key] !== undefined ? limits[key] : (limits.max !== undefined ? limits.max : 10);\n\n      return {\n        ...prev,\n        special: {\n          ...prev.special,\n          [key]: clampNumberString(value, minAllowed, maxAllowed),\n        },\n      };\n    });`;

  const replacement = ` const updateSpecial = (key, value) =>\n    setForm((prev) => {\n      const currentOrigin = prev.origin && ORIGINS[prev.origin] ? ORIGINS[prev.origin] : null;\n      const limits = currentOrigin?.specialLimits || { min: 1, max: 10 };\n      const minAllowed = Number(limits.min !== undefined ? limits.min : 1);\n      const maxAllowed = Number(limits[key] !== undefined ? limits[key] : (limits.max !== undefined ? limits.max : 10));\n      const special = prev.special || {};\n      const currentValue = Number(special[key] || minAllowed);\n      const currentTotal = Object.values(special).reduce((sum, entry) => sum + (Number(entry) || 0), 0);\n      const otherTotal = currentTotal - currentValue;\n      const budgetMax = Math.max(minAllowed, 40 - otherTotal);\n      const effectiveMax = Math.min(maxAllowed, budgetMax);\n\n      return {\n        ...prev,\n        special: {\n          ...special,\n          [key]: clampNumberString(value, minAllowed, effectiveMax),\n        },\n      };\n    });`;

  return replaceRequired(source, original, replacement, "40-point SPECIAL budget");
}

export function pip2d20CharacterRulesPlugin() {
  return {
    name: "pip2d20-character-rules",
    enforce: "pre",
    transform(source, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];
      if (normalized.endsWith("/src/components/characterCreation/QuickCharacterWizard.jsx")) {
        return { code: patchQuickCharacterWizard(source), map: null };
      }
      if (normalized.endsWith("/src/App.jsx")) {
        return { code: patchAppCharacterRules(source), map: null };
      }
      return null;
    },
  };
}
