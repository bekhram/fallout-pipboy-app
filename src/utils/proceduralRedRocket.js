import { buildOpenWastelandSite } from "./proceduralWastelandOpen.js";
import redRocket1 from "../assets/wasteland/red-rocket/red-rocket-1.png";
import redRocket2 from "../assets/wasteland/red-rocket/red-rocket-2.png";
import redRocket3 from "../assets/wasteland/red-rocket/red-rocket-3.png";

const GRID = 24;
const FOOTPRINT = 10;
const BORDER = 1;
const ROUTE_CLEARANCE = 0.75;
const RAIL_WIDTH = 2.67;
const ASSETS = [redRocket1, redRocket2, redRocket3];

const ROOM_TEMPLATE = [
  { baseRoomId: "sales", dx: 1, dy: 1, w: 4, h: 4 },
  { baseRoomId: "office", dx: 5, dy: 1, w: 2, h: 3 },
  { baseRoomId: "wc", dx: 7, dy: 1, w: 2, h: 3 },
  { baseRoomId: "garage", dx: 5, dy: 4, w: 4, h: 4 },
  { baseRoomId: "storage", dx: 1, dy: 5, w: 4, h: 3 },
  { baseRoomId: "coffee_area", dx: 1, dy: 8, w: 8, h: 1 },
];

const LABELS = {
  sales: "SALES FLOOR",
  office: "OFFICE",
  wc: "WC",
  garage: "GARAGE",
  storage: "STORAGE",
  coffee_area: "COFFEE AREA",
};

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(rng, values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function overlaps(a, b, pad = 0) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function routeReservations(spec = {}) {
  const seed = String(spec.renderSeed || spec.seed || "1");
  const terrain = String(spec.terrain || spec.terrainType || "wasteland");
  const routeKind = hashSeed(`route:${seed}:${terrain}`) % 4 === 0 ? "rail" : "road";

  if (routeKind === "rail") {
    const railSeed = hashSeed(`rail:${seed}:${terrain}`);
    const axis = (railSeed & 1) === 0 ? "h" : "v";
    const fixed = Math.max(6, Math.min(18, 6 + ((railSeed >>> 3) % 13)));
    const rail = axis === "h"
      ? { x: 0, y: fixed - RAIL_WIDTH / 2, w: GRID, h: RAIL_WIDTH }
      : { x: fixed - RAIL_WIDTH / 2, y: 0, w: RAIL_WIDTH, h: GRID };
    return { routeKind, reservations: [rail] };
  }

  const site = buildOpenWastelandSite({
    ...spec,
    type: "wasteland",
    cols: GRID,
    rows: GRID,
    reservedRects: [],
  });
  return { routeKind, reservations: site.roads || [] };
}

function placementCandidates(reservations) {
  const result = [];
  const max = GRID - FOOTPRINT - BORDER;
  for (let y = BORDER; y <= max; y += 1) {
    for (let x = BORDER; x <= max; x += 1) {
      const candidate = { x, y, w: FOOTPRINT, h: FOOTPRINT };
      if (reservations.some((route) => overlaps(candidate, route, ROUTE_CLEARANCE))) continue;
      result.push(candidate);
    }
  }
  return result;
}

function fallbackPlacement(reservations) {
  const candidates = [];
  for (let y = 0; y <= GRID - FOOTPRINT; y += 1) {
    for (let x = 0; x <= GRID - FOOTPRINT; x += 1) {
      const candidate = { x, y, w: FOOTPRINT, h: FOOTPRINT };
      const collisions = reservations.filter((route) => overlaps(candidate, route)).length;
      candidates.push({ ...candidate, collisions });
    }
  }
  candidates.sort((a, b) => a.collisions - b.collisions || a.y - b.y || a.x - b.x);
  const { collisions: _collisions, ...placement } = candidates[0] || { x: 7, y: 7, w: FOOTPRINT, h: FOOTPRINT };
  return placement;
}

export function isRedRocketType(type) {
  return String(type || "") === "red_rocket";
}

export function buildRedRocketLayout(spec = {}) {
  const seed = String(spec.renderSeed || spec.seed || "1");
  const terrain = String(spec.terrain || spec.terrainType || "wasteland");
  const rng = mulberry32(hashSeed(`${seed}:${terrain}:red-rocket-layout-v1`));
  const { routeKind, reservations } = routeReservations(spec);
  const candidates = shuffled(rng, placementCandidates(reservations));
  const placed = candidates[0] || fallbackPlacement(reservations);
  const assetIndex = hashSeed(`${seed}:${terrain}:red-rocket-asset-v1`) % ASSETS.length;
  const building = {
    id: "red-rocket",
    label: "RED ROCKET",
    assetIndex,
    assetSrc: ASSETS[assetIndex],
    ...placed,
  };

  return {
    cols: GRID,
    rows: GRID,
    routeKind,
    routeReservations: reservations,
    buildings: [building],
    reservedRects: [{ x: building.x, y: building.y, w: building.w, h: building.h }],
  };
}

export function buildRedRocketRoomLayout(spec = {}) {
  const building = buildRedRocketLayout(spec).buildings[0];
  return ROOM_TEMPLATE.map((room, index) => ({
    id: room.baseRoomId,
    baseRoomId: room.baseRoomId,
    instance: 1,
    sourceSet: 0,
    slot: index,
    zone: "red_rocket",
    label: LABELS[room.baseRoomId] || room.baseRoomId.toUpperCase(),
    x: building.x + room.dx,
    y: building.y + room.dy,
    w: room.w,
    h: room.h,
  }));
}

export function buildRedRocketRoomBlueprints(spec = {}) {
  return buildRedRocketRoomLayout(spec).map(({ x, y, w, h, ...room }) => room);
}
