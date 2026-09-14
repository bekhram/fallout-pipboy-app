import { buildProceduralEncounterContext as buildBaseProceduralEncounterContext } from "./proceduralEncounterContext.js";
import { generateProceduralQuest } from "./proceduralQuestEngine.js";
import { applyRequestedQuestType } from "./proceduralQuestOverride.js";

export function buildProceduralEncounterContext(options = {}) {
  const base = buildBaseProceduralEncounterContext(options);
  const spec = options?.spec || {};
  const scene = options?.scene || {};
  const placedTokens = Array.isArray(options?.placedTokens) ? options.placedTokens : [];
  const language = options?.language || "en";

  const automaticQuest = generateProceduralQuest({
    areas: Array.isArray(base?.areas) ? base.areas : [],
    markers: Array.isArray(base?.markers) ? base.markers : [],
    enemyGroups: Array.isArray(base?.enemies?.groups) ? base.enemies.groups : [],
    placedTokens,
    language,
    seed: spec?.seed || scene?.sceneId || "encounter",
    locationType: spec?.type || base?.location?.type || "unknown",
  });

  const quest = applyRequestedQuestType(automaticQuest, spec?.questType, language);

  return {
    ...base,
    version: Math.max(2, Number(base?.version || 1)),
    quest,
    gmTruth: {
      ...(base?.gmTruth || {}),
      questGeneration: quest?.generation || {},
    },
    narrationPolicy: {
      ...(base?.narrationPolicy || {}),
      questRule: "Present only the quest intro and currently discoverable objectives. Never expose quest.generation, gmTruth, hidden enemy identities, hidden target locations, or undiscovered solutions. Advance the quest through playerKnowledge and revealedFacts. If quest.generation.selectionMode is manual, respect the selected primary quest type.",
    },
  };
}
