import fortifiedCampAsset from "../assets/wasteland/fortified-camp/fortified-camp.webp";

const GRID = 24;
const FOOTPRINT = 18;
const BUFFER = 1;
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

export function isFortifiedCampType(type) {
  return ["fortified_camp", "raider_camp"].includes(String(type || ""));
}

export function buildFortifiedCampLayout(spec = {}) {
  const seed = String(spec.renderSeed || spec.seed || "1");
  const horizontalSlots = [2, 3, 4];
  const x = horizontalSlots[hashSeed(`${seed}:fortified-camp-x`) % horizontalSlots.length];
  const y = 1;
  const building = {
    id: "fortified-camp",
    label: "FORTIFIED CAMP",
    x,
    y,
    w: FOOTPRINT,
    h: FOOTPRINT,
    assetSrc: fortifiedCampAsset,
  };
  const reserved = {
    x: Math.max(0, building.x - BUFFER),
    y: Math.max(0, building.y - BUFFER),
    w: Math.min(GRID, building.w + BUFFER * 2),
    h: Math.min(GRID - 2, building.h + BUFFER * 2),
  };

  return {
    cols: GRID,
    rows: GRID,
    roadPlacement: "bottom-edge",
    roadRect: EDGE_ROAD,
    buildings: [building],
    reservedRects: [reserved],
    environmentReservedRects: [reserved],
  };
}

export function buildFortifiedCampMarkers(spec = {}) {
  const camp = buildFortifiedCampLayout(spec).buildings[0];
  const points = [
    ["entrance", "Entrance", 0.50, 0.91],
    ["watchtower-left", "Left Watchtower", 0.10, 0.31],
    ["watchtower-right", "Right Watchtower", 0.89, 0.27],
    ["campfire", "Central Campfire", 0.50, 0.53],
    ["large-tent", "Large Tent", 0.30, 0.40],
    ["small-tent", "Small Tent", 0.70, 0.63],
    ["storage", "Storage / Supplies", 0.62, 0.27],
    ["outer-perimeter", "Outer Perimeter", 0.18, 0.78],
  ];
  return points.map(([id, name, px, py], index) => ({
    id: `FC-${index + 1}`,
    roomId: id,
    name,
    marker: index + 1,
    markerX: camp.x + camp.w * px,
    markerY: camp.y + camp.h * py,
  }));
}
