import * as V8 from "./proceduralMapGeneratorV8.js";
import {
  generateSuperDuperMartSvg,
  isSuperDuperMartType,
  normalizeSuperDuperSpec,
} from "./proceduralSuperDuperMart.js";

export const MAP_TYPES = V8.MAP_TYPES;
export const makeProceduralSeed = V8.makeProceduralSeed;

export function proceduralLocationType(type) {
  return isSuperDuperMartType(type) ? "super_duper_mart" : V8.proceduralLocationType(type);
}

export function normalizeProceduralMapSpec(value = {}) {
  if (isSuperDuperMartType(value?.type)) {
    const base = V8.normalizeProceduralMapSpec(value);
    return {
      ...normalizeSuperDuperSpec({ ...base, ...value }),
      cols: Number(value.cols || base.cols || 12),
      rows: Number(value.rows || base.rows || 12),
      version: Math.max(13, Number(base.version || 0)),
    };
  }
  const base = V8.normalizeProceduralMapSpec(value);
  return { ...base, version: Math.max(13, Number(base.version || 0)) };
}

export function generateProceduralMapSvg(input = {}) {
  if (isSuperDuperMartType(input?.type)) {
    return generateSuperDuperMartSvg(normalizeProceduralMapSpec(input));
  }
  return V8.generateProceduralMapSvg(input);
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
