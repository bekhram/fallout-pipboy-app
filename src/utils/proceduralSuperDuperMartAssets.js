import normalAsset from "../assets/wasteland/super-duper-mart/super-duper-mart-normal.png";
import raiderAsset from "../assets/wasteland/super-duper-mart/super-duper-mart-raider.png";
import swampAsset from "../assets/wasteland/super-duper-mart/super-duper-mart-swamp.png";

const GRID = 24;
const FOOTPRINT = 30;
const EDGE_ROAD = { x: 0, y: GRID - 2, w: GRID, h: 2 };

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeTerrain(spec = {}) {
  const terrain = String(
    spec.terrain ?? spec.backgroundType ?? spec.terrainType ?? "wasteland",
  ).toLowerCase();
  return ["wasteland", "forest", "swamp", "ruins"].includes(terrain)
    ? terrain
    : "wasteland";
}

export function isSuperDuperMartAssetType(type) {
  return String(type || "") === "super_duper_mart";
}

export function superDuperMartAssetPool(spec = {}) {
  const terrain = normalizeTerrain(spec);
  if (terrain === "swamp") {
    return [{ src: swampAsset, variant: "swamp" }];
  }
  return [
    { src: normalAsset, variant: "normal" },
    { src: raiderAsset, variant: "raider" },
  ];
}

export function buildSuperDuperMartAssetLayout(spec = {}) {
  const terrain = normalizeTerrain(spec);
  const pool = superDuperMartAssetPool(spec);
  const assetIndex = pool.length === 1
    ? 0
    : hashSeed(`${spec.seed || "1"}:${terrain}:super-duper-mart`) % pool.length;
  const chosen = pool[assetIndex];
const building = {
  id: "super-duper-mart",
  x: 0,
  y: -1,
  w: FOOTPRINT,
  h: FOOTPRINT,
  assetSrc: chosen.src,
  assetIndex,
  assetVariant: chosen.variant,
};

  return {
    grid: GRID,
    terrain,
    buildings: [building],
    environmentReservedRects: [
      { x: building.x, y: building.y, w: building.w, h: building.h },
    ],
    roadRect: EDGE_ROAD,
  };
}
