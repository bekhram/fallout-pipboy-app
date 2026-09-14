function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`[pip2d20 profiles] Could not apply ${label}`);
  return source.replace(search, replacement);
}

export function pip2d20CharacterProfilesPlugin() {
  return {
    name: "pip2d20-character-profiles",
    enforce: "pre",
    transform(source, id) {
      const normalized = id.replace(/\\/g, "/").split("?")[0];

      if (normalized.endsWith("/src/hooks/useCharacterStorage.js")) {
        let code = source;
        code = replaceRequired(
          code,
          `import { buildPowerArmorInventoryItems } from "../utils/powerArmorInventory.js";`,
          `import { buildPowerArmorInventoryItems } from "../utils/powerArmorInventory.js";\nimport { saveActiveCharacterProfile } from "../utils/characterProfiles.js";`,
          "profile storage import"
        );

        code = replaceRequired(
          code,
          `  useEffect(() => {\n    localStorage.setItem(\n      STORAGE_KEY,\n      JSON.stringify({\n        updatedAt: new Date().toISOString(),\n        data: form,\n      })\n    );\n  }, [form]);`,
          `  useEffect(() => {\n    // Persist the complete character form. No field whitelist is used, so every\n    // current and future character-card property is kept in the active profile.\n    saveActiveCharacterProfile(form);\n  }, [form]);`,
          "full-form profile autosave"
        );

        return { code, map: null };
      }

      if (normalized.endsWith("/src/App.jsx")) {
        let code = source;
        code = replaceRequired(
          code,
          `  const [currentLuckPoints, setCurrentLuckPoints] = useState(\n    derived.luckPoints || 0\n  );\n\n  useEffect(() => {\n    setCurrentLuckPoints(derived.luckPoints || 0);\n  }, [derived.luckPoints]);`,
          `  const maxLuckPoints = Math.max(0, Number(derived.luckPoints || 0));\n  const [currentLuckPoints, setCurrentLuckPoints] = useState(() =>\n    Math.max(0, Math.min(maxLuckPoints, Number(form.currentLuckPoints ?? maxLuckPoints)))\n  );\n\n  useEffect(() => {\n    setCurrentLuckPoints((prev) =>\n      Math.max(0, Math.min(maxLuckPoints, Number(prev ?? form.currentLuckPoints ?? maxLuckPoints)))\n    );\n  }, [maxLuckPoints]);\n\n  useEffect(() => {\n    setForm((prev) => {\n      const value = String(Math.max(0, Math.min(maxLuckPoints, Number(currentLuckPoints || 0))));\n      if (String(prev.currentLuckPoints ?? "") === value) return prev;\n      return { ...prev, currentLuckPoints: value };\n    });\n  }, [currentLuckPoints, maxLuckPoints, setForm]);`,
          "current luck persistence"
        );
        return { code, map: null };
      }

      return null;
    },
  };
}
