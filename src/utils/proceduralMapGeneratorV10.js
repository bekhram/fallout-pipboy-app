import * as V9 from "./proceduralMapGeneratorV9.js";
import { generateOpenWastelandBackgroundSvg } from "./proceduralWastelandBackgroundV2.js";

export const MAP_TYPES = V9.MAP_TYPES;
export const makeProceduralSeed = V9.makeProceduralSeed;
export const proceduralLocationType = V9.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const base = V9.normalizeProceduralMapSpec(value);
  if (String(value?.type || "wasteland") === "wasteland") {
    return { ...base, cols: 24, rows: 24, version: Math.max(16, Number(base.version || 0)) };
  }
  return { ...base, version: Math.max(16, Number(base.version || 0)) };
}

export function generateProceduralMapSvg(input = {}) {
  if (String(input?.type || "wasteland") === "wasteland") {
    return generateOpenWastelandBackgroundSvg(normalizeProceduralMapSpec(input));
  }
  return V9.generateProceduralMapSvg(input);
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
