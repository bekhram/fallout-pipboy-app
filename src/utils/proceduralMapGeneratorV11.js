import * as V10 from "./proceduralMapGeneratorV10.js";

export const MAP_TYPES = V10.MAP_TYPES;
export const makeProceduralSeed = V10.makeProceduralSeed;
export const proceduralLocationType = V10.proceduralLocationType;

const ALLOWED_SIZES = [24, 36, 48];

function normalizeSize(value, fallback = 24) {
  const n = Number(value);
  return ALLOWED_SIZES.includes(n) ? n : fallback;
}

export function normalizeProceduralMapSpec(value = {}) {
  const cols = normalizeSize(value.cols ?? value.rows, 24);
  const rows = normalizeSize(value.rows ?? value.cols, cols);
  const base = V10.normalizeProceduralMapSpec({ ...value, cols, rows });
  return { ...base, cols, rows, version: Math.max(17, Number(base.version || 0)) };
}

function stripDoorSwingArcs(svg) {
  return String(svg || "").replace(/<path\s+d="M\s[^\"]*\sA\s[^\"]*"[^>]*\/>/g, "");
}

export function generateProceduralMapSvg(input = {}) {
  const spec = normalizeProceduralMapSpec(input);
  const svg = V10.generateProceduralMapSvg(spec);
  return stripDoorSwingArcs(svg);
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
