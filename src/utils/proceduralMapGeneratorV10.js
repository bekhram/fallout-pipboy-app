import * as V9 from "./proceduralMapGeneratorV9.js";
import { generateOpenWastelandBackgroundSvg } from "./proceduralWastelandBackgroundV2.js";

export const MAP_TYPES = V9.MAP_TYPES;
export const makeProceduralSeed = V9.makeProceduralSeed;
export const proceduralLocationType = V9.proceduralLocationType;

const ALLOWED_SIZES = [24, 36, 48];

function normalizeSize(value, fallback = 24) {
  const n = Number(value);
  return ALLOWED_SIZES.includes(n) ? n : fallback;
}

export function normalizeProceduralMapSpec(value = {}) {
  const cols = normalizeSize(value.cols ?? value.rows, 24);
  const rows = normalizeSize(value.rows ?? value.cols, cols);
  const base = V9.normalizeProceduralMapSpec({ ...value, cols, rows });
  if (String(value?.type || "wasteland") === "wasteland") {
    return { ...base, cols, rows, version: Math.max(17, Number(base.version || 0)) };
  }
  return { ...base, cols, rows, version: Math.max(17, Number(base.version || 0)) };
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
