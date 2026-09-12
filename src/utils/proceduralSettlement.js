import { buildResidentialRoomLayout } from "./proceduralResidential.js";
import settlementBackground from "../assets/wasteland/backgrounds/settlement-bg-1.png";
import retroCar1 from "../assets/wasteland/objects/car-retro-1.png";
import retroCar2 from "../assets/wasteland/objects/car-retro-2.png";
import retroCar3 from "../assets/wasteland/objects/car-retro-3.png";
import pickupRetro1 from "../assets/wasteland/objects/pickup-retro-1.png";
import motorcycleRetro1 from "../assets/wasteland/objects/motorcycle-retro-1.png";
import hills1 from "../assets/wasteland/objects/hills-1.png";
import hills2 from "../assets/wasteland/objects/hills-2.png";
import rocks1 from "../assets/wasteland/objects/rocks-1.png";
import rocks2 from "../assets/wasteland/objects/rocks-2.png";
import deadTree3 from "../assets/wasteland/objects/dead-tree-3.png";
import deadTree4 from "../assets/wasteland/objects/dead-tree-4.png";
import civilianHouse from "../assets/wasteland/houses/house-civilian.png";
import ruinedHouse from "../assets/wasteland/houses/house-ruined.png";
import raiderHouse from "../assets/wasteland/houses/house-raider.png";

const CELL = 100;
const WALL = 9;
const GRID = 24;
const TARGET_HOUSES = 4;
const ROAD_TYPES = ["asphalt", "dirt", "cobblestone"];
const SETTLEMENT_DECOR = {
  vehicle: [retroCar1, retroCar2, retroCar3, pickupRetro1, motorcycleRetro1],
  hills: [hills1, hills2],
  rocks: [rocks1, rocks2],
  dead_tree: [deadTree3, deadTree4],
};
const HOUSE_TYPES = ["civilian", "ruined", "raider"];
export const SETTLEMENT_HOUSE_RULES = {
  civilian: {
    src: civilianHouse,
    disposition: "friendly",
    allowedGroups: ["npc", "settler", "factionless", "wastelander", "minuteman"],
  },
  ruined: {
    src: ruinedHouse,
    disposition: "hostile",
    allowedGroups: ["any"],
  },
  raider: {
    src: raiderHouse,
    disposition: "hostile",
    allowedGroups: ["raider", "super_mutant"],
  },
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function hashSeed(value) { const text = String(value ?? "0"); let hash = 2166136261; for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function mulberry32(seed) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randint(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function pick(rng, values) { return values[Math.min(values.length - 1, Math.floor(rng() * values.length))]; }
function esc(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="square" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }
function text(x, y, value, size = 10, anchor = "middle", fill = "#302c27") { return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" font-family="monospace" font-size="${size}" font-weight="900">${esc(value)}</text>`; }

export function isSettlementType(type) { return String(type || "") === "settlement"; }

export function normalizeSettlementSpec(spec = {}) {
  const settlementStyle = ["civilian", "scrappy", "fortified", "raider"].includes(spec.settlementStyle) ? spec.settlementStyle : "scrappy";
  const roadType = ROAD_TYPES.includes(spec.roadType) ? spec.roadType : "auto";
  const terrain = ["wasteland", "forest", "swamp", "ruins"].includes(spec.terrain) ? spec.terrain : "wasteland";
  const rawSeed = String(spec.seed || "1");
  const seed = rawSeed.endsWith(`:terrain:${terrain}`) ? rawSeed : `${rawSeed}:terrain:${terrain}`;
  return { ...spec, type: "settlement", cols: GRID, rows: GRID, terrain, seed, settlementStyle, roadType };
}

function buildRoadNetwork(spec, rng) {
  const offsetX = randint(rng, -1, 1);
  const offsetY = randint(rng, -1, 1);
  const cx = clamp(Math.floor(GRID / 2) + offsetX, 7, GRID - 8);
  const cy = clamp(Math.floor(GRID / 2) + offsetY, 7, GRID - 8);
  const width = 2;
  const type = ROAD_TYPES.includes(spec.roadType) ? spec.roadType : pick(rng, ROAD_TYPES);
  const cells = new Set();
  for (let x = 0; x < GRID; x += 1) for (let dy = 0; dy < width; dy += 1) cells.add(`${x}:${cy + dy}`);
  for (let y = 0; y < GRID; y += 1) for (let dx = 0; dx < width; dx += 1) cells.add(`${cx + dx}:${y}`);
  return { cx, cy, width, type, cells };
}

function houseDims(rng) {
  rng();
  return [6, 6];
}

function overlaps(a, b, pad = 1) {
  return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
}

function overlapsRoad(candidate, roads, pad = 0) {
  for (let y = candidate.y - pad; y < candidate.y + candidate.h + pad; y += 1) {
    for (let x = candidate.x - pad; x < candidate.x + candidate.w + pad; x += 1) {
      if (roads.cells.has(`${x}:${y}`)) return true;
    }
  }
  return false;
}

export { settlementBackground };

function createSettlementDecor(spec, site) {
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:settlement-layout-v1:decor`));
  const placed = [];
  const plan = ["vehicle", "vehicle", "hills", "rocks", "rocks", "dead_tree", "dead_tree"];
  for (const type of plan) {
    const [w, h] = type === "hills" ? [5, 5] : type === "vehicle" ? [3, 3] : [3, 3];
    for (let attempt = 0; attempt < 180; attempt += 1) {
      const candidate = { x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h };
      if (overlapsRoad(candidate, site.roads, type === "vehicle" ? 0 : 1)) continue;
      if (site.houses.some((house) => overlaps(candidate, house, 2.5))) continue;
      if (placed.some((item) => overlaps(candidate, item, 1))) continue;
      if (type === "vehicle" && distanceToRoad(candidate, site.roads) > 2) continue;
      placed.push({
        ...candidate,
        type,
        src: pick(rng, SETTLEMENT_DECOR[type]),
        rot: type === "vehicle" && rng() > 0.5 ? 180 : 0,
      });
      break;
    }
  }
  return placed;
}

function distanceToRoad(candidate, roads) {
  const left = candidate.x + candidate.w <= roads.cx ? roads.cx - (candidate.x + candidate.w) : 99;
  const right = candidate.x >= roads.cx + roads.width ? candidate.x - (roads.cx + roads.width) : 99;
  const top = candidate.y + candidate.h <= roads.cy ? roads.cy - (candidate.y + candidate.h) : 99;
  const bottom = candidate.y >= roads.cy + roads.width ? candidate.y - (roads.cy + roads.width) : 99;
  return Math.min(left, right, top, bottom);
}

function createSettlementSite(normalized) {
  const roadRng = mulberry32(hashSeed(`${normalized.seed || "1"}:settlement-layout-v1:roads`));
  const houseRng = mulberry32(hashSeed(`${normalized.seed || "1"}:settlement-layout-v1:houses`));
  const roads = buildRoadNetwork(normalized, roadRng);
  const houses = [];
  const typeOffset = hashSeed(`${normalized.seed || "1"}:settlement-house-types`) % HOUSE_TYPES.length;
  const slots = [
    { x: 1, y: 1 },
    { x: GRID - 7, y: 1 },
    { x: 1, y: GRID - 7 },
    { x: GRID - 7, y: GRID - 7 },
  ];

  for (let index = 0; index < TARGET_HOUSES; index += 1) {
    const [w, h] = houseDims(houseRng);
    const placed = { ...slots[index], w, h };
    const houseType = HOUSE_TYPES[(index + typeOffset) % HOUSE_TYPES.length];
    const houseRule = SETTLEMENT_HOUSE_RULES[houseType];
    houses.push({
      id: index === 0 ? "house" : `house__${index + 1}`,
      baseRoomId: "house",
      instance: index + 1,
      sourceSet: index,
      slot: index,
      zone: "settlement",
      label: `HOUSE ${index + 1}`,
      houseSize: "small",
      houseType,
      assetSrc: houseRule.src,
      disposition: houseRule.disposition,
      allowedGroups: [...houseRule.allowedGroups],
      ...placed,
    });
  }
  return { cols: GRID, rows: GRID, roads, houses };
}

export function buildSettlementLayout(spec = {}) {
  const normalized = normalizeSettlementSpec(spec);
  const site = createSettlementSite(normalized);
  return {
    ...site,
    decor: createSettlementDecor(normalized, site),
  };
}

export function buildSettlementSite(spec = {}) { return buildSettlementLayout(spec); }
export function buildSettlementDecor(spec = {}) { return buildSettlementLayout(spec).decor; }
function fixedHouseRooms(house) {
  const template = [
    ["kitchen", 0, 0, 2, 3],
    ["bedroom", 2, 0, 2, 3],
    ["master_bedroom", 4, 0, 2, 3],
    ["living_room", 0, 3, 3, 3],
    ["hall", 3, 3, 1, 3],
    ["bathroom", 4, 3, 2, 2],
    ["storage", 4, 5, 2, 1],
  ];
  return template.map(([baseRoomId, dx, dy, w, h], roomIndex) => ({
    id: `${house.id}__${baseRoomId}`,
    baseRoomId,
    instance: house.instance,
    sourceSet: house.sourceSet,
    slot: house.slot * template.length + roomIndex,
    zone: "settlement_house",
    houseId: house.id,
    houseType: house.houseType,
    disposition: house.disposition,
    allowedGroups: [...house.allowedGroups],
    label: `${house.label} · ${baseRoomId.toUpperCase().replace(/_/g, " ")}`,
    x: house.x + dx,
    y: house.y + dy,
    w,
    h,
  }));
}

export function buildSettlementHouseLayout(spec = {}) {
  return buildSettlementLayout(spec).houses.flatMap(fixedHouseRooms);
}
export function buildSettlementHouseBlueprints(spec = {}) { return buildSettlementHouseLayout(spec).map(({ x, y, w, h, ...item }) => item); }

function buildHouseRooms(house) {
  return buildResidentialRoomLayout({ type: "residential_house", cols: house.w, rows: house.h, houseSize: house.houseSize }).map((room) => ({
    ...room,
    x: house.x + room.x,
    y: house.y + room.y,
  }));
}

function roomFill(type) {
  if (["bathroom", "guest_bathroom", "utility", "laundry"].includes(type)) return "#aaa8a0";
  if (["hall", "entry"].includes(type)) return "#b6a98b";
  return "#b9aa8d";
}

function edgeDoor(a, b) {
  const ax2 = a.x + a.w, ay2 = a.y + a.h, bx2 = b.x + b.w, by2 = b.y + b.h;
  if (ax2 === b.x || bx2 === a.x) {
    const from = Math.max(a.y, b.y), to = Math.min(ay2, by2);
    if (to - from >= 1) return { vertical: true, x: (ax2 === b.x ? b.x : a.x) * CELL, y: (from + (to - from) / 2) * CELL };
  }
  if (ay2 === b.y || by2 === a.y) {
    const from = Math.max(a.x, b.x), to = Math.min(ax2, bx2);
    if (to - from >= 1) return { vertical: false, x: (from + (to - from) / 2) * CELL, y: (ay2 === b.y ? b.y : a.y) * CELL };
  }
  return null;
}

function drawDoors(rooms) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < rooms.length; i += 1) {
    for (let j = i + 1; j < rooms.length; j += 1) {
      const door = edgeDoor(rooms[i], rooms[j]);
      if (!door) continue;
      const key = `${door.vertical}:${Math.round(door.x)}:${Math.round(door.y)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const gap = 54;
      if (door.vertical) {
        out.push(line(door.x, door.y - gap / 2, door.x, door.y + gap / 2, "#d8c9aa", WALL + 6));
        out.push(line(door.x, door.y - 22, door.x, door.y + 22, "#6e5138", 7));
      } else {
        out.push(line(door.x - gap / 2, door.y, door.x + gap / 2, door.y, "#d8c9aa", WALL + 6));
        out.push(line(door.x - 22, door.y, door.x + 22, door.y, "#6e5138", 7));
      }
    }
  }
  return out.join("");
}

function drawHouse(house, index) {
  const rooms = buildHouseRooms(house);
  const out = [];
  out.push(rect(house.x * CELL, house.y * CELL, house.w * CELL, house.h * CELL, "#a99a7e", "#2f2b26", WALL + 4, 3));
  rooms.forEach((room) => {
    const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
    out.push(rect(x, y, w, h, roomFill(room.baseRoomId), "#3b362f", WALL, 1));
    if (w >= 72 && h >= 62) out.push(text(x + w / 2, y + Math.min(24, h / 2), room.label, room.label.length > 12 ? 7 : 8));
  });
  out.push(drawDoors(rooms));
  const entry = rooms.find((room) => room.baseRoomId === "entry");
  if (entry) {
    const ex = (entry.x + entry.w / 2) * CELL;
    const ey = Math.min((house.y + house.h) * CELL, (entry.y + entry.h) * CELL);
    out.push(line(ex - 28, ey, ex + 28, ey, "#d8c9aa", WALL + 6));
    out.push(line(ex - 22, ey, ex + 22, ey, "#6e5138", 7));
  }
  out.push(text((house.x + house.w / 2) * CELL, house.y * CELL - 14, `HOUSE ${index + 1}`, 9, "middle", "#ded1b5"));
  return out.join("");
}

function drawAsphalt(roads) {
  const out = [];
  roads.cells.forEach((key) => { const [x, y] = key.split(":").map(Number); out.push(rect(x * CELL, y * CELL, CELL, CELL, "#55575a", "#45474a", 1)); });
  out.push(line((roads.cx + roads.width / 2) * CELL, 0, (roads.cx + roads.width / 2) * CELL, GRID * CELL, "#aaa47e", 4, "32 28"));
  out.push(line(0, (roads.cy + roads.width / 2) * CELL, GRID * CELL, (roads.cy + roads.width / 2) * CELL, "#aaa47e", 4, "32 28"));
  return out.join("");
}

function drawDirt(roads, rng) {
  const out = [];
  roads.cells.forEach((key) => { const [x, y] = key.split(":").map(Number); out.push(rect(x * CELL, y * CELL, CELL, CELL, "#88735a", "#76624d", 1)); });
  for (let i = 0; i < 75; i += 1) {
    const vertical = rng() > 0.5;
    const x = vertical ? (roads.cx + rng() * roads.width) * CELL : rng() * GRID * CELL;
    const y = vertical ? rng() * GRID * CELL : (roads.cy + rng() * roads.width) * CELL;
    out.push(`<circle cx="${x}" cy="${y}" r="${2 + rng() * 5}" fill="#5e5141" opacity="0.55"/>`);
  }
  return out.join("");
}

function drawCobblestone(roads) {
  const out = [];
  roads.cells.forEach((key) => {
    const [x, y] = key.split(":").map(Number);
    out.push(rect(x * CELL, y * CELL, CELL, CELL, "#77736b", "#4f4c47", 1));
    for (let yy = 8; yy < CELL; yy += 24) for (let xx = 6; xx < CELL; xx += 30) out.push(rect(x * CELL + xx + (Math.floor(yy / 24) % 2 ? 10 : 0), y * CELL + yy, 20, 12, "#8d8980", "#5b5852", 1, 3));
  });
  return out.join("");
}

function drawRoads(roads, rng) {
  if (roads.type === "dirt") return drawDirt(roads, rng);
  if (roads.type === "cobblestone") return drawCobblestone(roads);
  return drawAsphalt(roads);
}

function scatter(rng, site) {
  const out = [];
  for (let i = 0; i < 42; i += 1) {
    const x = randint(rng, 0, GRID - 1), y = randint(rng, 0, GRID - 1);
    if (site.roads.cells.has(`${x}:${y}`)) continue;
    if (site.houses.some((h) => x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h)) continue;
    out.push(`<circle cx="${(x + 0.3 + rng() * 0.4) * CELL}" cy="${(y + 0.3 + rng() * 0.4) * CELL}" r="${5 + rng() * 8}" fill="#625b4c" opacity="0.8"/>`);
  }
  return out.join("");
}

export function generateSettlementMapSvg(input = {}) {
  const spec = normalizeSettlementSpec(input);
  const site = buildSettlementSite(spec);
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:settlement-render-v3`));
  const width = GRID * CELL, height = GRID * CELL;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  out.push(rect(0, 0, width, height, "transparent"));
  // Roads are rendered from the shared PNG road assets in SettlementAssetLayer.
  out.push(scatter(rng, site));
  // House floor plans are rendered from fixed PNG assets in SettlementAssetLayer.
  out.push(rect(18, 18, 390, 42, "#d6c8a8", "#40382f", 2, 4, 'opacity="0.93"'));
  out.push(text(32, 40, `SETTLEMENT // 24×24 // ${site.roads.type.toUpperCase()} // ${site.houses.length} HOUSES`, 11, "start"));
  out.push("</svg>");
  return out.join("");
}
