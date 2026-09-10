import * as V11 from "./proceduralMapGeneratorV11.js";
import { normalizeEnemyGroup } from "./proceduralEnemyGroups.js";

const RARITIES = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const DIFFICULTIES = ["easy", "standard", "hard", "deadly"];
const LEGACY_TO_R = { common: "r1", uncommon: "r3", rare: "r5", legendary: "r7" };
const R_TO_LEGACY = { r0: "common", r1: "common", r2: "uncommon", r3: "uncommon", r4: "rare", r5: "rare", r6: "legendary", r7: "legendary" };

function normalizeRarity(value) {
  const raw = String(value || "").toLowerCase();
  if (RARITIES.includes(raw)) return raw;
  return LEGACY_TO_R[raw] || "r3";
}

function normalizeDifficulty(value) {
  const raw = String(value || "standard").toLowerCase();
  return DIFFICULTIES.includes(raw) ? raw : "standard";
}

function legacyInput(value = {}) {
  const rarity = normalizeRarity(value.lootRarity);
  return { ...value, lootRarity: R_TO_LEGACY[rarity] };
}

export const MAP_TYPES = V11.MAP_TYPES;
export const makeProceduralSeed = V11.makeProceduralSeed;
export const proceduralLocationType = V11.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const rarity = normalizeRarity(value.lootRarity);
  const base = V11.normalizeProceduralMapSpec(legacyInput(value));
  return {
    ...base,
    cols: 24,
    rows: 24,
    lootRarity: rarity,
    encounterDifficulty: normalizeDifficulty(value.encounterDifficulty ?? value.difficulty),
    enemyFaction: normalizeEnemyGroup(value.enemyFaction ?? value.enemyGroup ?? "auto"),
    version: Math.max(15, Number(base.version || 0)),
  };
}

export function generateProceduralMapSvg(input = {}) {
  return V11.generateProceduralMapSvg(legacyInput({ ...input, cols: 24, rows: 24 }));
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
