import * as V7 from "./proceduralMapGeneratorV7.js";
import {
  generateSettlementMapSvg,
  isSettlementType,
  normalizeSettlementSpec,
} from "./proceduralSettlement.js";

export const MAP_TYPES = [...new Set([...(V7.MAP_TYPES || []), "settlement"])];
export const makeProceduralSeed = V7.makeProceduralSeed;

export function proceduralLocationType(type) {
  return isSettlementType(type) ? "settlement" : V7.proceduralLocationType(type);
}

export function normalizeProceduralMapSpec(value = {}) {
  if (isSettlementType(value?.type)) {
    const base = V7.normalizeProceduralMapSpec({ ...value, type: "wasteland" });
    return {
      ...normalizeSettlementSpec({ ...base, ...value }),
      cols: Number(value.cols || base.cols || 12),
      rows: Number(value.rows || base.rows || 12),
      version: Math.max(12, Number(base.version || 0)),
    };
  }
  const base = V7.normalizeProceduralMapSpec(value);
  return { ...base, version: Math.max(12, Number(base.version || 0)) };
}

export function generateProceduralMapSvg(input = {}) {
  if (isSettlementType(input?.type)) {
    return generateSettlementMapSvg(normalizeProceduralMapSpec(input));
  }
  return V7.generateProceduralMapSvg(input);
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
