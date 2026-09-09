import {
  generateProceduralRoomData,
  roomDataById,
  roomPrimaryMarker,
} from "./proceduralRoomContent.js";

const MAP_TYPES = ["wasteland", "red_rocket", "super_duper_mart", "raider_camp", "military_bunker"];
const LOCATION_TYPE_BY_MAP = {
  wasteland: "wasteland",
  red_rocket: "red_rocket",
  super_duper_mart: "super_duper_mart",
  raider_camp: "raider_camp",
  military_bunker: "military_bunker",
};

const CELL = 100;
const WALL = 10;

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

function range(rng, min, max) {
  return min + (max - min) * rng();
}

function pick(rng, values) {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") {
  return `<rect x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" width="${Number(w).toFixed(1)}" height="${Number(h).toFixed(1)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function circle(x, y, r, fill, stroke = "none", sw = 0) {
  return `<circle cx="${Number(x).toFixed(1)}" cy="${Number(y).toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") {
  return `<line x1="${Number(x1).toFixed(1)}" y1="${Number(y1).toFixed(1)}" x2="${Number(x2).toFixed(1)}" y2="${Number(y2).toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}

function text(x, y, value, size = 16, options = {}) {
  const { fill = "#382f27", opacity = 0.9, weight = 800, anchor = "middle" } = options;
  return `<text x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" opacity="${opacity}" font-family="monospace" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
}

const gx = (col) => col * CELL;
const gy = (row) => row * CELL;
const gc = (cell) => cell * CELL + CELL / 2;

function roomRect(x, y, w, h, fill = "#a99d84") {
  return rect(gx(x), gy(y), w * CELL, h * CELL, fill, "#4e463c", WALL, 2);
}

function roomTitle(x, y, w, title) {
  const px = gx(x) + 14;
  const py = gy(y) + 14;
  const maxWidth = Math.max(72, Math.min(w * CELL - 28, 160));
  const fontSize = title.length > 13 ? 10 : 12;
  return `<g>${rect(px, py, maxWidth, 28, "#ded0b2", "#5a4c3e", 2, 4, `opacity="0.90"`)}${text(px + 10, py + 15, title, fontSize, { anchor: "start", fill: "#312b25", opacity: 1, weight: 900 })}</g>`;
}

const MARKER_META = {
  TERMINAL: { symbol: "T", fill: "#42695a" },
  SAFE: { symbol: "S", fill: "#67533d" },
  VENDING: { symbol: "V", fill: "#7b6335" },
  ENEMY: { symbol: "!", fill: "#8b3f32" },
  WORKBENCH: { symbol: "W", fill: "#5f6257" },
  LOOT: { symbol: "L", fill: "#806b3f" },
  MEDS: { symbol: "+", fill: "#6b7456" },
};

function roomMarker(roomData, x, y, w, h) {
  const marker = roomPrimaryMarker(roomData);
  if (!marker) return "";
  const meta = MARKER_META[marker] || { symbol: "•", fill: "#5c554a" };
  const px = gx(x + w) - 28;
  const py = gy(y) + 28;
  return `<g>${circle(px, py, 15, meta.fill, "#2f2923", 3)}${text(px, py + 1, meta.symbol, 14, { fill: "#eee2c6", opacity: 1, weight: 900 })}</g>`;
}

function enemyCount(roomData) {
  return (roomData?.enemies || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
}

function compactRoom(roomData, x, y, w, h, title, fill) {
  return `${roomRect(x, y, w, h, fill)}${roomTitle(x, y, w, title)}${roomMarker(roomData, x, y, w, h)}${enemyCount(roomData) > 1 ? text(gx(x + w) - 28, gy(y) + 53, `×${enemyCount(roomData)}`, 9, { fill: "#593229", opacity: 1, weight: 900 }) : ""}`;
}

function doorH(col, boundaryRow, label = "") {
  const x = gc(col);
  const y = gy(boundaryRow);
  const gap = 60;
  return `<g>${line(x - gap / 2, y, x + gap / 2, y, "#e9d9b9", WALL + 5)}${line(x - gap / 2, y, x - gap / 2, y - 50, "#483e34", 4)}<path d="M ${x - gap / 2} ${y - 50} A 50 50 0 0 1 ${x + 18} ${y}" fill="none" stroke="#6c5b49" stroke-width="2" stroke-dasharray="5 5"/>${label ? text(x, y + 18, label, 9, { fill: "#403329", opacity: 1, weight: 900 }) : ""}</g>`;
}

function doorV(boundaryCol, row) {
  const x = gx(boundaryCol);
  const y = gc(row);
  const gap = 60;
  return `<g>${line(x, y - gap / 2, x, y + gap / 2, "#e9d9b9", WALL + 5)}${line(x, y - gap / 2, x + 50, y - gap / 2, "#483e34", 4)}<path d="M ${x + 50} ${y - gap / 2} A 50 50 0 0 1 ${x} ${y + 18}" fill="none" stroke="#6c5b49" stroke-width="2" stroke-dasharray="5 5"/></g>`;
}

function garageDoor(startCol, endCol, boundaryRow) {
  const x1 = gx(startCol) + 12;
  const x2 = gx(endCol) - 12;
  const y = gy(boundaryRow);
  return line(x1, y, x2, y, "#dfcfaf", WALL + 5, "18 10");
}

function entryArrow(col, row, direction = "up") {
  const x = gc(col);
  const y = gc(row);
  const rotation = { up: 0, right: 90, down: 180, left: -90 }[direction] || 0;
  return `<g transform="translate(${x} ${y}) rotate(${rotation})"><path d="M0 -28 L-15 -7 L-7 -7 L-7 19 L7 19 L7 -7 L15 -7 Z" fill="#9b3f31" stroke="#432a23" stroke-width="3"/></g>${text(x, y + (direction === "up" ? 34 : direction === "down" ? -34 : 0), "ENTRY", 10, { fill: "#5d2d25", opacity: 1, weight: 900 })}`;
}

function scatter(rng, cols, rows, density, reserved = new Set()) {
  const cells = [];
  for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) if (!reserved.has(`${x}:${y}`)) cells.push([x, y]);
  const parts = [];
  const count = Math.min(cells.length, Math.round(cols * rows * density * 0.12));
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(rng() * cells.length);
    const [x, y] = cells.splice(idx, 1)[0] || [0, 0];
    parts.push(circle(gc(x) + range(rng, -18, 18), gc(y) + range(rng, -18, 18), range(rng, 5, 11), pick(rng, ["#5f594c", "#6d6453", "#514d43", "#776c59"]), "#302a22", 1));
  }
  return parts.join("");
}

function vehicle(rng, col, row, rotation = 0) {
  const x = gc(col);
  const y = gc(row);
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">${rect(-27, -15, 54, 30, pick(rng, ["#744637", "#5e6c62", "#696046", "#714b35"]), "#2d2723", 3, 5)}${rect(-10, -11, 20, 22, "#2a3434", "#1b2020", 1, 3)}</g>`;
}

function renderWasteland(spec, rng, roomData) {
  const { cols, rows, density } = spec;
  const parts = [];
  const reserved = new Set();
  const vertical = rng() > 0.5;
  if (vertical) {
    const c = clamp(Math.floor(cols / 2), 1, cols - 2);
    parts.push(rect(gx(c), 0, CELL, rows * CELL, "#555047", "#403b35", 4));
    parts.push(line(gc(c), 0, gc(c), rows * CELL, "#b69a50", 4, "22 20"));
    for (let y = 0; y < rows; y += 1) reserved.add(`${c}:${y}`);
    parts.push(entryArrow(c, rows - 1, "up"));
  } else {
    const r = clamp(Math.floor(rows * 0.58), 1, rows - 2);
    parts.push(rect(0, gy(r), cols * CELL, CELL, "#555047", "#403b35", 4));
    parts.push(line(0, gc(r), cols * CELL, gc(r), "#b69a50", 4, "22 20"));
    for (let x = 0; x < cols; x += 1) reserved.add(`${x}:${r}`);
    parts.push(entryArrow(0, r, "right"));
  }
  const zones = [
    [1, 1, 2, 2, "ruins", "RUINS"],
    [Math.max(1, cols - 3), 1, 2, 2, "wreck", "WRECK"],
    [Math.max(1, cols - 3), Math.max(1, rows - 3), 2, 2, "camp", "CAMP"],
  ];
  zones.forEach(([x, y, w, h, id, title]) => {
    if (x + w > cols || y + h > rows) return;
    parts.push(compactRoom(roomDataById(roomData, id), x, y, w, h, title, "#776c59"));
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) reserved.add(`${xx}:${yy}`);
  });
  parts.unshift(scatter(rng, cols, rows, density, reserved));
  return parts.join("");
}

function renderRedRocket(spec, rng, roomData) {
  const { cols, rows, density } = spec;
  const parts = [];
  const roadRows = rows >= 10 ? 2 : 1;
  const roadStart = rows - roadRows;
  parts.push(rect(0, gy(roadStart), cols * CELL, roadRows * CELL, "#514d47", "#3a3631", 4));
  parts.push(line(0, gy(roadStart) + roadRows * CELL * 0.55, cols * CELL, gy(roadStart) + roadRows * CELL * 0.55, "#b79b51", 4, "26 22"));

  const left = clamp(Math.floor(cols * 0.36), 2, Math.max(2, cols - 5));
  const right = cols - 1;
  const top = 1;
  const bottom = Math.max(top + 4, roadStart - 1);
  const width = right - left;
  const height = bottom - top;
  const midX = left + Math.max(2, Math.floor(width * 0.57));
  const splitY = top + Math.max(2, Math.floor(height * 0.62));
  const lowerH = Math.max(1, bottom - splitY);
  const lowerW = right - left;
  const officeW = Math.max(1, Math.floor(lowerW * 0.32));
  const storageW = Math.max(1, Math.floor(lowerW * 0.36));
  const wcW = Math.max(1, lowerW - officeW - storageW);

  parts.push(compactRoom(roomDataById(roomData, "store"), left, top, midX - left, splitY - top, "STORE", "#a99d84"));
  parts.push(compactRoom(roomDataById(roomData, "garage"), midX, top, right - midX, splitY - top, "GARAGE", "#88877d"));
  if (lowerH > 0) {
    parts.push(compactRoom(roomDataById(roomData, "office"), left, splitY, officeW, lowerH, "OFFICE", "#887f70"));
    parts.push(compactRoom(roomDataById(roomData, "storage"), left + officeW, splitY, storageW, lowerH, "STORAGE", "#81786b"));
    parts.push(compactRoom(roomDataById(roomData, "wc"), left + officeW + storageW, splitY, wcW, lowerH, "WC", "#78736a"));
  }

  parts.push(doorV(midX, top + 1));
  if (lowerH > 0) {
    parts.push(doorH(left, splitY));
    parts.push(doorH(left + officeW, splitY));
    parts.push(doorH(left + officeW + storageW, splitY));
  }
  parts.push(garageDoor(midX, right, splitY));
  const entryCol = clamp(left + 1, left, right - 1);
  parts.push(doorH(entryCol, bottom, "MAIN"));
  if (roadStart - 1 >= 0) parts.push(entryArrow(entryCol, roadStart - 1, "up"));
  parts.push(text((gx(left) + gx(right)) / 2, gy(top) - 24, "RED ROCKET", 25, { fill: "#8d3c31", opacity: 1, weight: 900 }));

  const canopyRight = Math.max(1, left - 1);
  if (canopyRight > 0) {
    const canopyTop = Math.min(rows - 2, 2);
    const canopyH = Math.min(3, Math.max(1, roadStart - canopyTop - 1));
    parts.push(roomRect(0, canopyTop, canopyRight, canopyH, "#6d655a"));
    for (let y = canopyTop; y < canopyTop + canopyH; y += 1) for (let x = 0; x < canopyRight; x += 1) if ((x + y) % 2 === 0) parts.push(rect(gc(x) - 10, gc(y) - 20, 20, 40, "#8c3f32", "#4e2b28", 3, 4));
  }

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) reserved.add(`${x}:${y}`);
  for (let y = roadStart; y < rows; y += 1) for (let x = 0; x < cols; x += 1) reserved.add(`${x}:${y}`);
  parts.unshift(scatter(rng, cols, rows, density * 0.45, reserved));
  for (let i = 0; i < Math.min(3, Math.max(1, Math.round(density * 3))); i += 1) parts.push(vehicle(rng, clamp(1 + i * Math.max(1, Math.floor(cols / 4)), 0, cols - 1), roadStart, i % 2 ? -18 : 12));
  return parts.join("");
}

function renderMart(spec, rng, roomData) {
  const { cols, rows, density } = spec;
  const parts = [];
  const parkingRows = rows >= 10 ? 3 : 2;
  const parkingStart = rows - parkingRows;
  parts.push(rect(0, gy(parkingStart), cols * CELL, parkingRows * CELL, "#53504a", "#393633", 4));
  for (let x = 1; x < cols; x += 1) parts.push(line(gx(x), gy(parkingStart) + 18, gx(x), rows * CELL - 18, "#9d8d67", 2, "16 10"));

  const left = 1;
  const right = cols - 1;
  const top = 1;
  const bottom = Math.max(top + 4, parkingStart - 1);
  const storageStart = Math.max(left + 3, right - Math.max(2, Math.floor((right - left) * 0.28)));
  const officeSplit = top + Math.max(2, Math.floor((bottom - top) * 0.62));

  parts.push(compactRoom(roomDataById(roomData, "sales"), left, top, storageStart - left, bottom - top, "SALES FLOOR", "#ada28b"));
  parts.push(compactRoom(roomDataById(roomData, "storage"), storageStart, top, right - storageStart, officeSplit - top, "STORAGE", "#847b6c"));
  if (officeSplit < bottom) parts.push(compactRoom(roomDataById(roomData, "office"), storageStart, officeSplit, right - storageStart, bottom - officeSplit, "OFFICE", "#8d8372"));

  for (let x = left + 1; x < Math.min(storageStart, left + 5); x += 1) parts.push(rect(gc(x) - 9, gy(top + 1) + 10, 18, Math.max(50, (bottom - top - 2) * CELL - 20), "#4f473b", "#302a24", 2, 2));
  parts.push(doorV(storageStart, top + 1));
  if (officeSplit < bottom) parts.push(doorH(storageStart, officeSplit));
  const entryCol = clamp(left + Math.floor((storageStart - left) / 2), left, storageStart - 1);
  parts.push(doorH(entryCol, bottom, "MAIN"));
  if (parkingStart - 1 >= 0) parts.push(entryArrow(entryCol, parkingStart - 1, "up"));

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) reserved.add(`${x}:${y}`);
  for (let y = parkingStart; y < rows; y += 1) for (let x = 0; x < cols; x += 1) reserved.add(`${x}:${y}`);
  parts.unshift(scatter(rng, cols, rows, density * 0.35, reserved));
  for (let i = 0; i < Math.min(4, Math.max(1, Math.round(density * 4))); i += 1) parts.push(vehicle(rng, clamp(1 + i * Math.max(1, Math.floor(cols / 4)), 0, cols - 1), parkingStart, i % 2 ? 180 : 0));
  return parts.join("");
}

function renderRaider(spec, rng, roomData) {
  const { cols, rows, density } = spec;
  const parts = [];
  const left = 1;
  const right = cols - 1;
  const top = 1;
  const bottom = rows - 1;
  const gateCol = clamp(Math.floor(cols / 2), left, right - 1);
  parts.push(line(gx(left), gy(top), gx(right), gy(top), "#5d4b3c", 14));
  parts.push(line(gx(left), gy(top), gx(left), gy(bottom), "#5d4b3c", 14));
  parts.push(line(gx(right), gy(top), gx(right), gy(bottom), "#5d4b3c", 14));
  parts.push(line(gx(left), gy(bottom), gx(gateCol) - 36, gy(bottom), "#5d4b3c", 14));
  parts.push(line(gx(gateCol) + 36, gy(bottom), gx(right), gy(bottom), "#5d4b3c", 14));
  parts.push(garageDoor(gateCol, gateCol + 1, bottom));
  parts.push(entryArrow(gateCol, Math.max(0, bottom - 1), "up"));

  const roomW = Math.max(2, Math.floor((right - left - 1) / 2));
  const roomH = Math.max(2, Math.floor((bottom - top - 1) / 2));
  const configs = [
    [left, top, "barrack", "BARRACK", "#76583f"],
    [Math.max(left, right - roomW), top, "boss", "BOSS SHACK", "#6a6250"],
    [left, Math.max(top, bottom - roomH), "storage", "STORAGE", "#76583f"],
    [Math.max(left, right - roomW), Math.max(top, bottom - roomH), "workshop", "WORKSHOP", "#6a6250"],
  ];
  configs.forEach(([x, y, id, title, fill]) => {
    const w = Math.min(roomW, right - x);
    const h = Math.min(roomH, bottom - y);
    if (w < 1 || h < 1) return;
    parts.push(compactRoom(roomDataById(roomData, id), x, y, w, h, title, fill));
    parts.push(doorH(x, y + h));
  });
  const centerCol = clamp(Math.floor(cols / 2), 0, cols - 1);
  const centerRow = clamp(Math.floor(rows / 2), 0, rows - 1);
  parts.push(circle(gc(centerCol), gc(centerRow), 26, "#3a3028", "#211b17", 4));
  parts.push(circle(gc(centerCol), gc(centerRow), 12, "#c46d2a", "#6d341d", 2));
  parts.push(roomTitle(Math.max(0, centerCol - 1), Math.max(0, centerRow - 1), 2, "COURTYARD"));
  parts.push(roomMarker(roomDataById(roomData, "courtyard"), Math.max(0, centerCol - 1), Math.max(0, centerRow - 1), 2, 2));

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) reserved.add(`${x}:${y}`);
  parts.unshift(scatter(rng, cols, rows, density * 0.5, reserved));
  return parts.join("");
}

function renderBunker(spec, rng, roomData) {
  const { cols, rows, density } = spec;
  const parts = [];
  const left = 1;
  const right = cols - 1;
  const top = 1;
  const bottom = rows - 2;
  const corridorRow = clamp(top + Math.floor((bottom - top) / 2), top + 1, bottom - 1);
  const width = right - left;
  const baseRoomW = Math.max(1, Math.floor(width / 3));
  parts.push(roomRect(left, top, width, bottom - top, "#87877c"));
  parts.push(rect(gx(left), gy(corridorRow), width * CELL, CELL, "#6d6f68", "#484944", 4));
  const idsTop = [["armory", "ARMORY"], ["control", "CONTROL"], ["barracks", "BARRACKS"]];
  const idsBottom = [["storage", "STORAGE"], ["generator", "GENERATOR"], ["medical", "MEDICAL"]];
  let x = left;
  for (let i = 0; i < 3; i += 1) {
    const remaining = right - x;
    const w = i === 2 ? remaining : Math.min(baseRoomW, remaining - (2 - i));
    if (w <= 0) break;
    const topH = corridorRow - top;
    const bottomY = corridorRow + 1;
    const bottomH = bottom - bottomY;
    if (topH > 0) {
      parts.push(compactRoom(roomDataById(roomData, idsTop[i][0]), x, top, w, topH, idsTop[i][1], "#86877e"));
      parts.push(doorH(x, corridorRow));
    }
    if (bottomH > 0) {
      parts.push(compactRoom(roomDataById(roomData, idsBottom[i][0]), x, bottomY, w, bottomH, idsBottom[i][1], "#7b7d75"));
      parts.push(doorH(x, bottomY));
    }
    x += w;
  }
  const entryCol = clamp(Math.floor((left + right) / 2), left, right - 1);
  parts.push(doorH(entryCol, bottom, "BULKHEAD"));
  if (bottom + 1 < rows) parts.push(entryArrow(entryCol, bottom + 1, "up"));
  parts.push(text((gx(left) + gx(right)) / 2, gc(corridorRow), "MAIN CORRIDOR", 13, { fill: "#363a35", opacity: 0.7, weight: 900 }));
  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let xx = left; xx < right; xx += 1) reserved.add(`${xx}:${y}`);
  parts.unshift(scatter(rng, cols, rows, density * 0.35, reserved));
  return parts.join("");
}

export function makeProceduralSeed() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return String(value[0] >>> 0);
  }
  return String(Math.floor(Math.random() * 4294967295));
}

export function normalizeProceduralMapSpec(value = {}) {
  const type = MAP_TYPES.includes(value.type) ? value.type : "wasteland";
  return {
    version: 4,
    type,
    seed: String(value.seed || "1").slice(0, 40),
    cols: clamp(value.cols || 12, 6, 30),
    rows: clamp(value.rows || 12, 6, 30),
    density: clamp(value.density ?? 0.55, 0.1, 1),
  };
}

export function proceduralLocationType(type) {
  return LOCATION_TYPE_BY_MAP[type] || "wasteland";
}

export function generateProceduralMapSvg(input = {}) {
  const spec = normalizeProceduralMapSpec(input);
  const width = spec.cols * CELL;
  const height = spec.rows * CELL;
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${spec.cols}x${spec.rows}:${spec.density.toFixed(2)}:v4-clean`));
  const roomData = generateProceduralRoomData(spec);
  const groundA = pick(rng, ["#9b8663", "#927b59", "#a18a64"]);
  const groundB = pick(rng, ["#796a52", "#806d51", "#74634d"]);
  let content = "";
  if (spec.type === "red_rocket") content = renderRedRocket(spec, rng, roomData);
  else if (spec.type === "super_duper_mart") content = renderMart(spec, rng, roomData);
  else if (spec.type === "raider_camp") content = renderRaider(spec, rng, roomData);
  else if (spec.type === "military_bunker") content = renderBunker(spec, rng, roomData);
  else content = renderWasteland(spec, rng, roomData);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${groundA}"/><stop offset="1" stop-color="${groundB}"/></linearGradient><pattern id="grain" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="2" fill="#2f2a23" opacity="0.10"/><circle cx="34" cy="29" r="1.6" fill="#d1b77e" opacity="0.07"/></pattern></defs>${rect(0, 0, width, height, "url(#ground)")}${rect(0, 0, width, height, "url(#grain)")}${content}<rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#3a3229" stroke-width="8" opacity="0.55"/></svg>`;
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}

export { MAP_TYPES };
