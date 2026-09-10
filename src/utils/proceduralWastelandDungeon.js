// Wasteland layout adapter inspired by domasx2/dungeon-generator (MIT).
// Dungeon rooms become residential buildings; corridors become roads.
import { buildResidentialRoomLayout } from "./proceduralResidential.js";

const CELL = 100;
const WALL = 9;

const HOUSE_COUNTS = [
  [8, 1], [12, 2], [18, 4], [24, 6], [30, 8], [42, 12], [54, 16], [66, 20],
];

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function hashSeed(value) { const text = String(value ?? "0"); let h = 2166136261; for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randint(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function pick(rng, values) { return values[Math.min(values.length - 1, Math.floor(rng() * values.length))]; }
function esc(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="square" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }
function text(x, y, value, size = 10, anchor = "middle", fill = "#302c27") { return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" font-family="monospace" font-size="${size}" font-weight="900">${esc(value)}</text>`; }

function countForSize(size) { for (const [max, value] of HOUSE_COUNTS) if (size <= max) return value; return HOUSE_COUNTS[HOUSE_COUNTS.length - 1][1]; }
function overlaps(a, b, pad = 0) { return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y); }
function pointInRect(x, y, r, pad = 0) { return x >= r.x - pad && x < r.x + r.w + pad && y >= r.y - pad && y < r.y + r.h + pad; }

function houseSizeForMap(rng, size) {
  if (size <= 12) return [5, 4];
  if (size <= 18) return [randint(rng, 5, 6), randint(rng, 4, 5)];
  if (size <= 30) return [randint(rng, 5, 7), randint(rng, 4, 6)];
  return [randint(rng, 6, 9), randint(rng, 5, 7)];
}

function center(room) { return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }; }

function corridorFrom(parent, side, length) {
  const c = center(parent);
  if (side === "n") return { x1: c.x, y1: parent.y, x2: c.x, y2: parent.y - length, side };
  if (side === "s") return { x1: c.x, y1: parent.y + parent.h - 1, x2: c.x, y2: parent.y + parent.h - 1 + length, side };
  if (side === "w") return { x1: parent.x, y1: c.y, x2: parent.x - length, y2: c.y, side };
  return { x1: parent.x + parent.w - 1, y1: c.y, x2: parent.x + parent.w - 1 + length, y2: c.y, side: "e" };
}

function roomAtCorridorEnd(corridor, w, h) {
  const { x2, y2, side } = corridor;
  if (side === "n") return { x: x2 - Math.floor(w / 2), y: y2 - h, w, h };
  if (side === "s") return { x: x2 - Math.floor(w / 2), y: y2 + 1, w, h };
  if (side === "w") return { x: x2 - w, y: y2 - Math.floor(h / 2), w, h };
  return { x: x2 + 1, y: y2 - Math.floor(h / 2), w, h };
}

function corridorCells(c) {
  const out = [];
  if (c.x1 === c.x2) {
    const from = Math.min(c.y1, c.y2), to = Math.max(c.y1, c.y2);
    for (let y = from; y <= to; y += 1) out.push({ x: c.x1, y });
  } else {
    const from = Math.min(c.x1, c.x2), to = Math.max(c.x1, c.x2);
    for (let x = from; x <= to; x += 1) out.push({ x, y: c.y1 });
  }
  return out;
}

function validCandidate(candidate, corridor, houses, cols, rows) {
  if (candidate.x < 1 || candidate.y < 1 || candidate.x + candidate.w > cols - 1 || candidate.y + candidate.h > rows - 1) return false;
  if (houses.some((room) => overlaps(candidate, room, 1))) return false;
  const cells = corridorCells(corridor);
  return !cells.some((p) => houses.some((room) => pointInRect(p.x, p.y, room, 0) && room !== houses[houses.length - 1]));
}

export function buildDungeonWastelandSite(spec = {}) {
  const cols = clamp(spec.cols || 12, 6, 66), rows = clamp(spec.rows || 12, 6, 66);
  const size = Math.max(cols, rows);
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:${cols}x${rows}:dungeon-wasteland-v1`));
  const target = countForSize(size);
  const firstSize = houseSizeForMap(rng, size);
  const first = {
    id: "house__1", x: clamp(Math.floor(cols / 2 - firstSize[0] / 2), 1, Math.max(1, cols - firstSize[0] - 1)),
    y: clamp(Math.floor(rows / 2 - firstSize[1] / 2), 1, Math.max(1, rows - firstSize[1] - 1)),
    w: firstSize[0], h: firstSize[1], houseSize: size >= 42 ? "medium" : "small",
  };
  const houses = [first];
  const roads = [];
  const sides = ["n", "e", "s", "w"];
  let attempts = 0;

  while (houses.length < target && attempts < target * 45) {
    attempts += 1;
    const parent = pick(rng, houses);
    const side = pick(rng, sides);
    const roadLength = randint(rng, size <= 18 ? 1 : 2, size <= 30 ? 4 : 7);
    const corridor = corridorFrom(parent, side, roadLength);
    const [w, h] = houseSizeForMap(rng, size);
    const candidate = roomAtCorridorEnd(corridor, w, h);
    if (!validCandidate(candidate, corridor, houses, cols, rows)) continue;
    const index = houses.length + 1;
    houses.push({ ...candidate, id: `house__${index}`, houseSize: size >= 54 && index % 4 === 0 ? "medium" : "small" });
    roads.push({ ...corridor, id: `road__${roads.length + 1}`, from: parent.id, to: `house__${index}` });
  }

  return { cols, rows, houses, roads };
}

export function buildDungeonWastelandRoomLayout(spec = {}) {
  const site = buildDungeonWastelandSite(spec);
  const rooms = [];
  site.houses.forEach((house, houseIndex) => {
    const local = buildResidentialRoomLayout({ type: "residential_house", cols: house.w, rows: house.h, houseSize: house.houseSize });
    local.forEach((room, roomIndex) => rooms.push({
      ...room,
      id: `${house.id}__${room.id}`,
      sourceSet: houseIndex,
      slot: houseIndex * 100 + roomIndex,
      zone: "wasteland_house",
      houseId: house.id,
      houseInstance: houseIndex + 1,
      x: house.x + room.x,
      y: house.y + room.y,
      label: room.label,
    }));
  });
  return rooms;
}

export function buildDungeonWastelandRoomBlueprints(spec = {}) {
  return buildDungeonWastelandRoomLayout(spec).map(({ x, y, w, h, ...room }) => room);
}

function drawRoad(road) {
  const x1 = (road.x1 + 0.5) * CELL, y1 = (road.y1 + 0.5) * CELL;
  const x2 = (road.x2 + 0.5) * CELL, y2 = (road.y2 + 0.5) * CELL;
  return `${line(x1, y1, x2, y2, "#53504a", CELL * 0.72)}${line(x1, y1, x2, y2, "#8a7f62", 4, "24 22")}`;
}

function roomFill(type) {
  if (["bathroom", "guest_bathroom", "utility", "laundry"].includes(type)) return "#aaa8a0";
  if (["hall", "entry"].includes(type)) return "#b6a98b";
  return "#b9aa8d";
}

function drawFurniture(room) {
  const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
  if (w < 90 || h < 80) return "";
  if (["bedroom", "master_bedroom", "child_room"].includes(room.baseRoomId)) return rect(x + 18, y + 35, Math.min(70, w * 0.42), Math.min(105, h * 0.5), "#cbbda1", "#625746", 2, 4);
  if (room.baseRoomId === "living_room") return `${rect(x + 18, y + 38, Math.min(100, w * 0.5), 34, "#c6baa0", "#625746", 2, 7)}${rect(x + w * 0.58, y + h * 0.55, 34, 28, "#756852", "#50463a", 2, 12)}`;
  if (room.baseRoomId === "kitchen") return rect(x + 15, y + 38, Math.max(42, w - 30), 28, "#837765", "#51483d", 2, 2);
  if (["storage", "utility", "laundry", "closet"].includes(room.baseRoomId)) return rect(x + 18, y + 38, Math.min(55, w - 34), 32, "#79664d", "#504235", 2, 2);
  if (["bathroom", "guest_bathroom"].includes(room.baseRoomId)) return rect(x + 18, y + 40, Math.min(50, w - 32), 28, "#d6d3c7", "#66645e", 2, 10);
  return "";
}

function drawHouseRooms(house, rooms) {
  const out = [];
  out.push(rect(house.x * CELL, house.y * CELL, house.w * CELL, house.h * CELL, "#a99a7e", "#2f2b26", WALL + 4, 3));
  rooms.forEach((room) => {
    const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
    out.push(rect(x, y, w, h, roomFill(room.baseRoomId), "#3b362f", WALL, 1));
    if (w >= 72 && h >= 62) out.push(text(x + w / 2, y + Math.min(24, h / 2), room.label, room.label.length > 12 ? 7 : 8));
    out.push(drawFurniture(room));
  });
  out.push(text((house.x + house.w / 2) * CELL, house.y * CELL - 16, `HOUSE ${Number(house.id.split("__")[1]) || 1}`, 9, "middle", "#ded1b5"));
  return out.join("");
}

function wastelandScatter(spec, rng, houses) {
  const out = [];
  const count = Math.min(150, Math.round((Number(spec.cols) || 12) * (Number(spec.rows) || 12) * 0.045));
  for (let i = 0; i < count; i += 1) {
    const gx = randint(rng, 0, Math.max(0, (Number(spec.cols) || 12) - 1));
    const gy = randint(rng, 0, Math.max(0, (Number(spec.rows) || 12) - 1));
    if (houses.some((h) => pointInRect(gx, gy, h, 0))) continue;
    const px = (gx + 0.5) * CELL + randint(rng, -22, 22), py = (gy + 0.5) * CELL + randint(rng, -22, 22);
    const r = randint(rng, 7, 18);
    out.push(`<circle cx="${px}" cy="${py}" r="${r}" fill="${rng() > 0.5 ? "#68604f" : "#77705c"}" stroke="#4a4439" stroke-width="2"/>`);
  }
  return out.join("");
}

export function generateDungeonWastelandSvg(input = {}) {
  const cols = clamp(input.cols || 12, 6, 66), rows = clamp(input.rows || 12, 6, 66);
  const site = buildDungeonWastelandSite({ ...input, cols, rows });
  const roomLayout = buildDungeonWastelandRoomLayout({ ...input, cols, rows });
  const width = cols * CELL, height = rows * CELL;
  const rng = mulberry32(hashSeed(`${input.seed || "1"}:${cols}x${rows}:dungeon-wasteland-render-v1`));
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  out.push(rect(0, 0, width, height, "#766d5b"));
  out.push(wastelandScatter({ ...input, cols, rows }, rng, site.houses));
  site.roads.forEach((road) => out.push(drawRoad(road)));
  site.houses.forEach((house) => out.push(drawHouseRooms(house, roomLayout.filter((room) => room.houseId === house.id))));
  out.push(rect(18, 18, Math.min(width - 36, 480), 42, "#d4c5a4", "#40372e", 2, 4, 'opacity="0.94"'));
  out.push(text(34, 40, `WASTELAND // DUNGEON-GROWTH // ${site.houses.length} HOUSES`, 11, "start"));
  out.push("</svg>");
  return out.join("");
}
