import * as V6 from "./proceduralMapGeneratorV6.js";
import {
  generateResidentialMapSvg,
  isResidentialType,
  normalizeResidentialSpec,
} from "./proceduralResidential.js";

export const MAP_TYPES = [...new Set([...(V6.MAP_TYPES || []), "residential_house"])];
export const makeProceduralSeed = V6.makeProceduralSeed;

export function proceduralLocationType(type) {
  return isResidentialType(type) ? "residential_house" : V6.proceduralLocationType(type);
}

export function normalizeProceduralMapSpec(value = {}) {
  if (isResidentialType(value?.type)) {
    const base = V6.normalizeProceduralMapSpec({ ...value, type: "wasteland" });
    return {
      ...normalizeResidentialSpec({ ...base, ...value }),
      cols: Number(value.cols || base.cols || 12),
      rows: Number(value.rows || base.rows || 12),
      version: Math.max(11, Number(base.version || 0)),
    };
  }
  const base = V6.normalizeProceduralMapSpec(value);
  return { ...base, version: Math.max(11, Number(base.version || 0)) };
}

export function generateProceduralMapSvg(input = {}) {
  if (isResidentialType(input?.type)) {
    return generateResidentialMapSvg(normalizeProceduralMapSpec(input));
  }
  return V6.generateProceduralMapSvg(input);
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
