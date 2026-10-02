import * as V11 from "./proceduralMapGeneratorV11.js";
import { normalizeEnemyGroup } from "./proceduralEnemyGroups.js";
import {
  canonicalProceduralSeed,
  proceduralTerrainSeed,
} from "./proceduralSeed.js";

const RARITIES = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const DIFFICULTIES = ["easy", "standard", "hard", "deadly"];
const TERRAINS = ["wasteland", "forest", "swamp", "ruins"];
export const PROCEDURAL_MAP_SIZES = [24, 36, 48];

function normalizeMapSize(value) {
  const n = Number(value);
  if (PROCEDURAL_MAP_SIZES.includes(n)) return n;
  return 24;
}
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

function normalizeTerrain(value) {
  const raw = String(value || "wasteland").toLowerCase();
  return TERRAINS.includes(raw) ? raw : "wasteland";
}

function legacyInput(value = {}) {
  const rarity = normalizeRarity(value.lootRarity);
  return { ...value, lootRarity: R_TO_LEGACY[rarity] };
}

function terrainAwareInput(value = {}) {
  const terrain = normalizeTerrain(value.terrain);
  return {
    ...value,
    terrain,
    seed: proceduralTerrainSeed(value.seed, terrain),
  };
}

function visualMapInput(value = {}) {
  if (!["settlement", "red_rocket", "super_duper_mart"].includes(String(value?.type || ""))) return value;
  return {
    ...value,
    type: "wasteland",
  };
}

export const MAP_TYPES = [...new Set([...(V11.MAP_TYPES || []), "vault_tunnels"])];
export const makeProceduralSeed = V11.makeProceduralSeed;
export function proceduralLocationType(type) {
  return String(type || "") === "vault_tunnels" ? "vault_tunnels" : V11.proceduralLocationType(type);
}

export function normalizeProceduralMapSpec(value = {}) {
  const rarity = normalizeRarity(value.lootRarity);
  const terrain = normalizeTerrain(value.terrain);
  const isVault = String(value?.type || "") === "vault_tunnels";
  const base = V11.normalizeProceduralMapSpec(legacyInput(isVault ? { ...value, type: "wasteland" } : value));
  return {
    ...base,
    type: isVault ? "vault_tunnels" : base.type,
    seed: canonicalProceduralSeed(value.seed ?? base.seed),
    cols: normalizeMapSize(value.cols ?? value.rows ?? base.cols),
    rows: normalizeMapSize(value.rows ?? value.cols ?? base.rows),
    terrain,
    lootRarity: rarity,
    encounterDifficulty: normalizeDifficulty(value.encounterDifficulty ?? value.difficulty),
    enemyFaction: normalizeEnemyGroup(value.enemyFaction ?? value.enemyGroup ?? "auto"),
    version: Math.max(16, Number(base.version || 0)),
  };
}

export function generateProceduralMapSvg(input = {}) {
  const spec = normalizeProceduralMapSpec(input);
  const renderSpec = visualMapInput(spec);
  return V11.generateProceduralMapSvg(legacyInput(terrainAwareInput(renderSpec)));
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
