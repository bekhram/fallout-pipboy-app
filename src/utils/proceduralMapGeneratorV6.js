import * as V5 from "./proceduralMapGeneratorV5.js";

export const MAP_TYPES = V5.MAP_TYPES;
export const makeProceduralSeed = V5.makeProceduralSeed;
export const proceduralLocationType = V5.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const base = V5.normalizeProceduralMapSpec(value);
  return { ...base, version: Math.max(10, Number(base.version || 0)) };
}

function removeFullMapCorridor(svg) {
  return String(svg).replace(
    /<rect x="65\.0" y="65\.0" width="[^"]+" height="[^"]+" rx="6" fill="[^"]+" stroke="[^"]+" stroke-width="6" opacity="0\.96"\/>/,
    "",
  );
}

export function generateProceduralMapSvg(input = {}) {
  const spec = normalizeProceduralMapSpec(input);
  const svg = V5.generateProceduralMapSvg(spec);
  const largeCommercial = (spec.type === "red_rocket" || spec.type === "super_duper_mart") && Math.max(spec.cols, spec.rows) > 12;
  return largeCommercial ? removeFullMapCorridor(svg) : svg;
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
