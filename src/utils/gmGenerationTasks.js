import { generateProceduralMapDataUrl } from "./proceduralMapGenerator.js";
import { generateProceduralEncounterSummary } from "./proceduralRoomContent.js";
import { generateVaultEncounterPlan } from "./proceduralVaultEncounter.js";

// Pure, serializable result shared by the module Worker and its browser fallback.
// Never transfer complete encounter plans/bestiary entries back to the UI.
export function computeGmGeneration(spec = {}, includePreview = false) {
  const vault = spec?.type === "vault_tunnels";
  const summary = vault
    ? { totalEnemies: generateVaultEncounterPlan(spec).total }
    : generateProceduralEncounterSummary(spec);
  return {
    encounter: {
      totalEnemies: summary?.totalEnemies ?? 0,
      targetXp: summary?.targetXp ?? 0,
      xpPerPlayer: summary?.xpPerPlayer ?? 0,
    },
    previewUrl: includePreview && !vault ? generateProceduralMapDataUrl(spec) : "",
  };
}
