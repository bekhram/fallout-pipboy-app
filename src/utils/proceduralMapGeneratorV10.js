import * as V9 from "./proceduralMapGeneratorV9.js";
import { generateDungeonWastelandSvg } from "./proceduralWastelandDungeon.js";

export const MAP_TYPES = V9.MAP_TYPES;
export const makeProceduralSeed = V9.makeProceduralSeed;
export const proceduralLocationType = V9.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const base = V9.normalizeProceduralMapSpec(value);
  return { ...base, version: Math.max(14, Number(base.version || 0)) };
}

export function generateProceduralMapSvg(input = {}) {
  if (String(input?.type || "wasteland") === "wasteland") {
    return generateDungeonWastelandSvg(normalizeProceduralMapSpec(input));
  }
  return V9.generateProceduralMapSvg(input);
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
