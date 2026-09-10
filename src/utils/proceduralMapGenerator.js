import * as V10 from "./proceduralMapGeneratorV10.js";
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

export const MAP_TYPES = V10.MAP_TYPES;
export const makeProceduralSeed = V10.makeProceduralSeed;
export const proceduralLocationType = V10.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const rarity = normalizeRarity(value.lootRarity);
  const base = V10.normalizeProceduralMapSpec(legacyInput(value));
  return {
    ...base,
    lootRarity: rarity,
    encounterDifficulty: normalizeDifficulty(value.encounterDifficulty ?? value.difficulty),
    enemyFaction: normalizeEnemyGroup(value.enemyFaction ?? value.enemyGroup ?? "auto"),
    version: Math.max(14, Number(base.version || 0)),
  };
}

export function generateProceduralMapSvg(input = {}) {
  return V10.generateProceduralMapSvg(legacyInput(input));
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
