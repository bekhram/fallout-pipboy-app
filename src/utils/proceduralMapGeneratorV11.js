import * as V10 from "./proceduralMapGeneratorV10.js";

export const MAP_TYPES = V10.MAP_TYPES;
export const makeProceduralSeed = V10.makeProceduralSeed;
export const proceduralLocationType = V10.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const base = V10.normalizeProceduralMapSpec({ ...value, cols: 24, rows: 24 });
  return { ...base, cols: 24, rows: 24, version: Math.max(15, Number(base.version || 0)) };
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
