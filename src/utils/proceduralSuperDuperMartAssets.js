import normalAsset from "../assets/wasteland/super-duper-mart/super-duper-mart-normal.png";
import raiderAsset from "../assets/wasteland/super-duper-mart/super-duper-mart-raider.png";
import swampAsset from "../assets/wasteland/super-duper-mart/super-duper-mart-swamp.png";

const GRID = 24;
const FOOTPRINT = 30;
const TOP_ENVIRONMENT_ROWS = 5;
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

/**
 * Fixed marker anchors for the cutaway Super Duper Mart art. Coordinates are
 * battlemap grid cells (24x24), not pixels, so the markers stay aligned while
 * the oversized image itself keeps its current 30-cell visual footprint.
 */
export function buildSuperDuperMartRoomLayout() {
  return [
    { id: "sales-floor", name: "Sales Floor", x: 5, y: 7, w: 11, h: 8, markerX: 10, markerY: 10 },
    { id: "checkout", name: "Checkout", x: 7, y: 14, w: 8, h: 4, markerX: 11, markerY: 16 },
    { id: "office", name: "Office", x: 3, y: 4, w: 5, h: 4, markerX: 5, markerY: 5 },
    { id: "restroom", name: "Restroom", x: 8, y: 3, w: 5, h: 4, markerX: 10, markerY: 4 },
    { id: "cold-room", name: "Cold Room", x: 13, y: 3, w: 5, h: 4, markerX: 15, markerY: 4 },
    { id: "warehouse", name: "Warehouse", x: 16, y: 7, w: 6, h: 8, markerX: 19, markerY: 10 },
    { id: "loading-bay", name: "Loading Bay", x: 17, y: 14, w: 6, h: 5, markerX: 20, markerY: 16 },
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
    // The market image has transparent/open space across the top of the map.
    // Reserve only the occupied lower area so wasteland props can generate in
    // those top rows without spawning over the building or the bottom road.
    environmentReservedRects: [
      { x: 0, y: TOP_ENVIRONMENT_ROWS, w: GRID, h: GRID - TOP_ENVIRONMENT_ROWS - 2 },
    ],
    roadRect: EDGE_ROAD,
  };
}
