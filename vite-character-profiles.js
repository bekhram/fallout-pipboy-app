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
          `localStorage.setItem(STORAGE_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), data: form }));`,
          `saveActiveCharacterProfile(form);`,
          "full-form profile autosave"
        );

        return { code, map: null };
      }

      // Luck Point persistence now lives in App.jsx itself. Do not rewrite that
      // state at build time: Luck SPECIAL and spendable Luck Points are separate.
      if (normalized.endsWith("/src/App.jsx")) {
        return { code: source, map: null };
      }

      return null;
    },
  };
}
