import { buildOpenWastelandSite } from "./proceduralWastelandOpen.js";
import {
  canonicalProceduralSeed,
  proceduralTerrainSeed,
} from "./proceduralSeed.js";
import settlementBackground from "../assets/wasteland/backgrounds/settlement-bg-1.png";
import civilianHouse from "../assets/wasteland/houses/house-civilian.png";
import ruinedHouse from "../assets/wasteland/houses/house-ruined.png";
import raiderHouse from "../assets/wasteland/houses/house-raider.png";

const CELL = 100;
const GRID = 24;
const MIN_HOUSES = 2;
const MAX_HOUSES = 4;
const HOUSE_CELLS = 10;
const HOUSE_GAP = 1;
const HOUSE_BORDER = 1;
const ROAD_HOUSE_CLEARANCE = 2.25;
const RAIL_HOUSE_CLEARANCE = 0.5;
const RAIL_WIDTH = 2.67;
const ROAD_TYPES = ["asphalt", "dirt", "cobblestone"];
const HOUSE_TYPES = ["civilian", "ruined", "raider"];

const HOUSE_ROOM_TEMPLATE = [
  {
    baseRoomId: "kitchen",
    dx: 0, dy: 0, w: 3, h: 4,
    marker: [1, 1],
    spawn: [[1, 2], [2, 2], [1, 1], [2, 1]],
  },
  {
    baseRoomId: "bedroom",
    dx: 3, dy: 0, w: 3, h: 4,
    marker: [4, 1],
    spawn: [[4, 2], [4, 1], [5, 2], [5, 1]],
  },
  {
    baseRoomId: "master_bedroom",
    dx: 6, dy: 0, w: 4, h: 4,
    marker: [8, 1],
    spawn: [[7, 2], [8, 2], [7, 1], [8, 1]],
  },
  {
    baseRoomId: "living_room",
    dx: 0, dy: 4, w: 5, h: 6,
    marker: [2, 6],
    spawn: [[2, 6], [3, 6], [2, 7], [3, 7], [1, 6], [4, 6]],
  },
  {
    baseRoomId: "hall",
    dx: 5, dy: 4, w: 1, h: 6,
    marker: [5, 6],
    spawn: [[5, 6], [5, 7], [5, 5], [5, 8]],
  },
  {
    baseRoomId: "bathroom",
    dx: 6, dy: 4, w: 4, h: 3,
    marker: [8, 5],
    spawn: [[7, 5], [8, 5], [7, 6], [8, 6]],
  },
  {
    baseRoomId: "storage",
    dx: 6, dy: 7, w: 4, h: 3,
    marker: [8, 8],
    spawn: [[7, 8], [8, 8], [7, 9], [8, 9]],
  },
];

export const SETTLEMENT_HOUSE_RULES = {
  civilian: {
    src: civilianHouse,
    disposition: "friendly",
    allowedGroups: ["npc", "settler", "factionless", "wastelander", "minuteman"],
    encounterMode: "friendly-residents",
  },
  ruined: {
    src: ruinedHouse,
    disposition: "hostile",
    allowedGroups: ["any"],
    encounterMode: "any-hostile",
  },
  raider: {
    src: raiderHouse,
    disposition: "hostile",
    allowedGroups: ["raider", "super_mutant"],
    encounterMode: "restricted-hostiles",
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randint(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function overlaps(a, b, pad = 0) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function shuffled(rng, values) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function expandRect(rect, pad) {
  return {
    x: Number(rect.x || 0) - pad,
    y: Number(rect.y || 0) - pad,
    w: Number(rect.w || 0) + pad * 2,
    h: Number(rect.h || 0) + pad * 2,
  };
}

function sortPlacementsReadingOrder(placements = []) {
  return [...placements].sort((a, b) => {
    const ay = Number(a?.y || 0);
    const by = Number(b?.y || 0);
    if (ay !== by) return ay - by;
    return Number(a?.x || 0) - Number(b?.x || 0);
  });
}

export function isSettlementType(type) {
  return String(type || "") === "settlement";
}

export function normalizeSettlementSpec(spec = {}) {
  const settlementStyle = ["civilian", "scrappy", "fortified", "raider"].includes(spec.settlementStyle)
    ? spec.settlementStyle
    : "scrappy";
  const roadType = ROAD_TYPES.includes(spec.roadType) ? spec.roadType : "auto";
  const terrain = ["wasteland", "forest", "swamp", "ruins"].includes(spec.terrain)
    ? spec.terrain
    : "wasteland";
  const seed = canonicalProceduralSeed(spec.seed);
  const terrainSeed = proceduralTerrainSeed(seed, terrain);

  return {
    ...spec,
    type: "settlement",
    cols: GRID,
    rows: GRID,
    terrain,
    seed,
    renderSeed: seed,
    terrainSeed,
    settlementStyle,
    roadType,
  };
}

export { settlementBackground };

function renderedRouteKind(spec) {
  const seed = String(spec.renderSeed || spec.seed || "1");
  const terrain = String(spec.terrain || spec.terrainType || "wasteland");
  return hashSeed(`route:${seed}:${terrain}`) % 4 === 0 ? "rail" : "road";
}

function railReservation(spec) {
  const renderSeed = String(spec.renderSeed || spec.seed || "1");
  const terrain = String(spec.terrain || spec.terrainType || "wasteland");
  const seed = hashSeed(`rail:${renderSeed}:${terrain}`);
  const axis = (seed & 1) === 0 ? "h" : "v";
  const fixed = clamp(6 + ((seed >>> 3) % 13), 6, 18);

  return axis === "h"
    ? { x: 0, y: fixed - RAIL_WIDTH / 2, w: GRID, h: RAIL_WIDTH }
    : { x: fixed - RAIL_WIDTH / 2, y: 0, w: RAIL_WIDTH, h: GRID };
}

function routePlan(spec) {
  const renderSeed = String(spec.renderSeed || spec.seed || "1");
  const kind = renderedRouteKind(spec);

  if (kind === "rail") {
    const rail = railReservation(spec);
    return {
      kind,
      roads: [],
      reserved: [expandRect(rail, RAIL_HOUSE_CLEARANCE)],
    };
  }

  const wastelandSite = buildOpenWastelandSite({
    ...spec,
    type: "wasteland",
    seed: renderSeed,
    cols: GRID,
    rows: GRID,
    reservedRects: [],
  });

  return {
    kind,
    roads: [...(wastelandSite.roads || [])],
    reserved: (wastelandSite.roads || []).map((road) =>
      expandRect(road, ROAD_HOUSE_CLEARANCE)
    ),
  };
}

function houseCandidates(blocked) {
  const out = [];
  const max = GRID - HOUSE_CELLS - HOUSE_BORDER;

  for (let y = HOUSE_BORDER; y <= max; y += 1) {
    for (let x = HOUSE_BORDER; x <= max; x += 1) {
      const candidate = { x, y, w: HOUSE_CELLS, h: HOUSE_CELLS };
      if (blocked.some((rect) => overlaps(candidate, rect))) continue;
      out.push(candidate);
    }
  }

  return out;
}

function findHouseSet(rng, blocked, count) {
  const candidates = shuffled(rng, houseCandidates(blocked));
  const chosen = [];
  let guard = 0;

  function search(startIndex) {
    if (chosen.length >= count) return true;
    if (guard > 120000) return false;

    for (let i = startIndex; i < candidates.length; i += 1) {
      guard += 1;
      const candidate = candidates[i];
      if (chosen.some((house) => overlaps(candidate, house, HOUSE_GAP))) continue;

      chosen.push(candidate);
      if (search(i + 1)) return true;
      chosen.pop();
    }

    return false;
  }

  return search(0) ? [...chosen] : null;
}

function createSettlementSite(normalized) {
  const terrainSeed = normalized.terrainSeed || proceduralTerrainSeed(normalized.seed, normalized.terrain);
  const rng = mulberry32(hashSeed(`${terrainSeed}:settlement-houses-v4`));
  const route = routePlan(normalized);
  const requestedHouseCount = randint(rng, MIN_HOUSES, MAX_HOUSES);

  let placements = null;
  for (let count = requestedHouseCount; count >= MIN_HOUSES; count -= 1) {
    placements = findHouseSet(rng, route.reserved, count);
    if (placements) break;
  }

  if (!placements || placements.length < MIN_HOUSES) {
    const fallbackCandidates = houseCandidates(route.reserved);
    placements = [];
    for (const candidate of fallbackCandidates) {
      if (placements.every((house) => !overlaps(candidate, house, 0))) {
        placements.push(candidate);
        if (placements.length >= MIN_HOUSES) break;
      }
    }
  }

  const orderedPlacements = sortPlacementsReadingOrder(placements || []);
  const typeOffset = hashSeed(`${terrainSeed}:settlement-house-types`) % HOUSE_TYPES.length;
  const houses = orderedPlacements.slice(0, MAX_HOUSES).map((placed, index) => {
    const houseType = HOUSE_TYPES[(index + typeOffset) % HOUSE_TYPES.length];
    const rule = SETTLEMENT_HOUSE_RULES[houseType];

    return {
      id: index === 0 ? "house" : `house__${index + 1}`,
      baseRoomId: "house",
      instance: index + 1,
      sourceSet: index,
      slot: index,
      zone: "settlement",
      label: `HOUSE ${index + 1}`,
      houseSize: "large",
      houseType,
      assetSrc: rule.src,
      disposition: rule.disposition,
      allowedGroups: [...rule.allowedGroups],
      encounterMode: rule.encounterMode,
      ...placed,
    };
  });

  return {
    cols: GRID,
    rows: GRID,
    renderSeed: normalized.renderSeed,
    routeKind: route.kind,
    roads: route.roads,
    routeReservations: route.reserved,
    houses,
  };
}

export function buildSettlementSite(spec = {}) {
  return createSettlementSite(normalizeSettlementSpec(spec));
}

export function buildSettlementLayout(spec = {}) {
  const site = buildSettlementSite(spec);
  return {
    ...site,
    reservedRects: site.houses.map(({ x, y, w, h }) => ({ x, y, w, h })),
    decor: [],
  };
}

export function buildSettlementDecor() {
  return [];
}

function fixedHouseRooms(house) {
  return HOUSE_ROOM_TEMPLATE.map((template, roomIndex) => {
    const {
      baseRoomId,
      dx,
      dy,
      w,
      h,
      marker,
      spawn,
    } = template;

    return {
      id: `${house.id}__${baseRoomId}`,
      baseRoomId,
      instance: house.instance,
      sourceSet: house.sourceSet,
      slot: house.slot * HOUSE_ROOM_TEMPLATE.length + roomIndex,
      zone: "settlement_house",
      houseId: house.id,
      houseType: house.houseType,
      disposition: house.disposition,
      allowedGroups: [...house.allowedGroups],
      encounterMode: house.encounterMode,
      label: `${house.label} · ${baseRoomId.toUpperCase().replace(/_/g, " ")}`,
      x: house.x + dx,
      y: house.y + dy,
      w,
      h,
      markerX: house.x + marker[0],
      markerY: house.y + marker[1],
      spawnCells: spawn.map(([sx, sy]) => ({
        x: house.x + sx,
        y: house.y + sy,
      })),
    };
  });
}

export function buildSettlementHouseLayout(spec = {}) {
  return buildSettlementLayout(spec).houses.flatMap(fixedHouseRooms);
}

export function buildSettlementHouseBlueprints(spec = {}) {
  return buildSettlementHouseLayout(spec).map(({ x, y, w, h, markerX, markerY, spawnCells, ...item }) => item);
}

export function generateSettlementMapSvg(input = {}) {
  const site = buildSettlementLayout(input);
  const width = GRID * CELL;
  const height = GRID * CELL;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent"/>`,
    `<text x="20" y="40" fill="#d6c8a8" font-family="monospace" font-size="22" font-weight="900">SETTLEMENT // ${site.houses.length} HOUSES</text>`,
    "</svg>",
  ].join("");
}
