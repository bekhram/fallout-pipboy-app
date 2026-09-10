import { buildResidentialRoomLayout } from "./proceduralResidential.js";

const CELL = 100;
const WALL = 10;

const GRID_RULES = {
  8: { market: "small", houses: 0, houseSize: "small" },
  12: { market: "medium", houses: 0, houseSize: "small" },
  18: { market: "medium", houses: 1, houseSize: "small" },
  24: { market: "medium", houses: 2, houseSize: "small" },
  30: { market: "medium", houses: 3, houseSize: "small" },
  42: { market: "large", houses: 4, houseSize: "small" },
  54: { market: "large", houses: 5, houseSize: "small" },
  66: { market: "large", houses: 6, houseSize: "medium" },
};

const ROOM_META = {
  sales: { label: "SALES FLOOR", source: "sales" },
  produce: { label: "PRODUCE", source: "sales" },
  bakery: { label: "BAKERY", source: "sales" },
  dairy: { label: "DAIRY", source: "sales" },
  meat_fish: { label: "MEAT & FISH", source: "sales" },
  freezer: { label: "FREEZER", source: "storage" },
  drinks: { label: "DRINKS", source: "sales" },
  household: { label: "HOUSEHOLD", source: "sales" },
  pharmacy: { label: "PHARMACY", source: "office" },
  checkout: { label: "CHECKOUT", source: "sales" },
  info: { label: "INFO", source: "office" },
  vestibule: { label: "VESTIBULE", source: "sales" },
  warehouse: { label: "WAREHOUSE", source: "storage" },
  receiving: { label: "RECEIVING", source: "storage" },
  cold_room: { label: "COLD ROOM", source: "storage" },
  freezer_room: { label: "FREEZER ROOM", source: "storage" },
  staff_room: { label: "STAFF ROOM", source: "break_room" },
  office: { label: "OFFICE", source: "office" },
  wc_staff: { label: "STAFF WC", source: "wc" },
  wc_visitors: { label: "VISITOR WC", source: "wc" },
};

const MARKET_TEMPLATES = {
  small: {
    base: [12, 9],
    rooms: [
      ["warehouse", 0, 0, 3, 2], ["receiving", 3, 0, 2, 2], ["cold_room", 5, 0, 2, 2],
      ["staff_room", 7, 0, 2, 2], ["office", 9, 0, 2, 2], ["wc_staff", 11, 0, 1, 2],
      ["produce", 0, 2, 2, 4], ["bakery", 2, 2, 2, 2], ["dairy", 4, 2, 3, 2],
      ["freezer", 7, 2, 2, 2], ["drinks", 9, 2, 3, 2], ["sales", 2, 4, 7, 3],
      ["household", 9, 4, 3, 3], ["checkout", 4, 7, 4, 1], ["vestibule", 5, 8, 2, 1],
    ],
  },
  medium: {
    base: [18, 12],
    rooms: [
      ["warehouse", 0, 0, 4, 2], ["receiving", 4, 0, 2, 2], ["cold_room", 6, 0, 3, 2],
      ["freezer_room", 9, 0, 3, 2], ["staff_room", 12, 0, 2, 2], ["office", 14, 0, 2, 2], ["wc_staff", 16, 0, 2, 2],
      ["produce", 0, 2, 3, 6], ["bakery", 3, 2, 3, 2], ["dairy", 6, 2, 5, 2], ["meat_fish", 11, 2, 4, 2],
      ["freezer", 13, 4, 3, 3], ["drinks", 16, 4, 2, 3], ["sales", 3, 4, 10, 5], ["household", 13, 7, 5, 2],
      ["checkout", 6, 9, 5, 2], ["info", 12, 9, 3, 2], ["vestibule", 7, 11, 4, 1],
    ],
  },
  large: {
    base: [24, 15],
    rooms: [
      ["warehouse", 0, 0, 5, 3], ["receiving", 5, 0, 3, 3], ["cold_room", 8, 0, 3, 3], ["freezer_room", 11, 0, 3, 3],
      ["staff_room", 16, 0, 3, 3], ["office", 19, 0, 3, 3], ["wc_staff", 22, 0, 1, 3], ["wc_visitors", 23, 0, 1, 3],
      ["produce", 0, 3, 3, 8], ["bakery", 3, 3, 3, 2], ["dairy", 6, 3, 6, 2], ["meat_fish", 12, 3, 5, 2],
      ["freezer", 17, 3, 3, 3], ["drinks", 20, 3, 4, 3], ["sales", 3, 5, 14, 6], ["household", 17, 6, 3, 5], ["pharmacy", 20, 6, 4, 5],
      ["checkout", 7, 11, 6, 2], ["info", 14, 11, 4, 2], ["vestibule", 9, 13, 5, 2],
    ],
  },
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function hashSeed(value) { const text = String(value ?? "0"); let hash = 2166136261; for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return hash >>> 0; }
function mulberry32(seed) { let state = seed >>> 0; return () => { state += 0x6d2b79f5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function esc(value) { return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }
function text(x, y, value, size = 11, anchor = "middle", fill = "#302b27") { return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" font-family="monospace" font-size="${size}" font-weight="900">${esc(value)}</text>`; }

export function isSuperDuperMartType(type) { return String(type || "") === "super_duper_mart"; }

function nearestRule(size) {
  const keys = Object.keys(GRID_RULES).map(Number).sort((a, b) => a - b);
  return GRID_RULES[keys.find((key) => size <= key) || keys[keys.length - 1]];
}

export function superDuperRule(spec = {}) {
  return nearestRule(Math.max(Number(spec.cols) || 12, Number(spec.rows) || 12));
}

function effectiveCondition(spec, rng) {
  const explicit = String(spec.marketCondition || "auto");
  if (["intact", "looted", "raider_occupied", "ruined"].includes(explicit)) return explicit;
  const roll = rng();
  if (roll < 0.14) return "intact";
  if (roll < 0.48) return "looted";
  if (roll < 0.72) return "raider_occupied";
  return "ruined";
}

function marketBounds(spec, rule) {
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  if (Math.max(cols, rows) <= 12) return { x: 1, y: 1, w: Math.max(6, cols - 2), h: Math.max(6, rows - 2) };
  const h = clamp(Math.round(rows * (rule.houses ? 0.52 : 0.72)), 7, rows - 3);
  const w = clamp(Math.round(cols * (rule.market === "large" ? 0.72 : 0.78)), 8, cols - 2);
  return { x: Math.max(1, Math.floor((cols - w) / 2)), y: 1, w, h };
}

function scaledRoom(raw, template, bounds, index) {
  const [id, x, y, w, h] = raw;
  const [baseW, baseH] = template.base;
  const rx = bounds.x + Math.floor((x / baseW) * bounds.w);
  const ry = bounds.y + Math.floor((y / baseH) * bounds.h);
  const rx2 = bounds.x + Math.ceil(((x + w) / baseW) * bounds.w);
  const ry2 = bounds.y + Math.ceil(((y + h) / baseH) * bounds.h);
  const meta = ROOM_META[id] || { label: id.toUpperCase(), source: "sales" };
  return { id, baseRoomId: meta.source, semanticType: id, instance: 1, sourceSet: 0, slot: index, zone: "market", label: meta.label, x: rx, y: ry, w: Math.max(1, rx2 - rx), h: Math.max(1, ry2 - ry) };
}

function houseDimensions(size, grid) {
  if (size === "medium") return grid >= 66 ? { w: 11, h: 9 } : { w: 10, h: 8 };
  if (grid >= 42) return { w: 9, h: 7 };
  if (grid >= 24) return { w: 8, h: 6 };
  return { w: 7, h: 6 };
}

function houseSlots(cols, rows, bounds, count, dims) {
  const bandTop = Math.min(rows - dims.h, bounds.y + bounds.h + 2);
  const bottom = Math.max(bandTop, rows - dims.h - 1);
  const candidates = [
    { x: 1, y: bandTop },
    { x: Math.max(1, cols - dims.w - 1), y: bandTop },
    { x: Math.max(1, Math.floor((cols - dims.w) / 2)), y: bottom },
    { x: 1, y: bottom },
    { x: Math.max(1, cols - dims.w - 1), y: bottom },
    { x: Math.max(1, Math.floor(cols * 0.28) - Math.floor(dims.w / 2)), y: bottom },
  ];
  return candidates.slice(0, count);
}

function buildResidentialHouses(spec, rule, bounds) {
  const cols = Number(spec.cols) || 12;
  const rows = Number(spec.rows) || 12;
  const grid = Math.max(cols, rows);
  const dims = houseDimensions(rule.houseSize, grid);
  const slots = houseSlots(cols, rows, bounds, rule.houses, dims);
  const out = [];

  slots.forEach((slot, houseIndex) => {
    const local = buildResidentialRoomLayout({
      type: "residential_house",
      cols: dims.w,
      rows: dims.h,
      houseSize: rule.houseSize,
      seed: `${spec.seed || "1"}:sdm-house:${houseIndex + 1}`,
    });

    local.forEach((room, roomIndex) => {
      out.push({
        ...room,
        id: `house_${houseIndex + 1}__${room.id}`,
        baseRoomId: room.baseRoomId,
        semanticType: room.baseRoomId,
        instance: houseIndex + 1,
        sourceSet: houseIndex + 1,
        slot: 100 + houseIndex * 30 + roomIndex,
        zone: "outskirts",
        houseIndex: houseIndex + 1,
        houseSize: rule.houseSize,
        x: slot.x + room.x,
        y: slot.y + room.y,
        label: room.label,
      });
    });
  });

  return out;
}

export function buildSuperDuperRoomLayout(spec = {}) {
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  const rule = superDuperRule({ ...spec, cols, rows });
  const bounds = marketBounds({ ...spec, cols, rows }, rule);
  const template = MARKET_TEMPLATES[rule.market];
  const marketRooms = template.rooms.map((room, index) => scaledRoom(room, template, bounds, index));
  return [...marketRooms, ...buildResidentialHouses({ ...spec, cols, rows }, rule, bounds)];
}

export function buildSuperDuperRoomBlueprints(spec = {}) {
  return buildSuperDuperRoomLayout(spec).map(({ x, y, w, h, ...room }) => room);
}

function drawShelves(room, rng) {
  const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
  if (room.semanticType !== "sales" || w < 260 || h < 220) return "";
  const out = [];
  const shelfCount = clamp(Math.floor(w / 150), 2, 8);
  const gap = w / (shelfCount + 1);
  for (let i = 1; i <= shelfCount; i += 1) {
    const sx = x + gap * i - 18;
    out.push(rect(sx, y + 60, 36, Math.max(70, h - 105), rng() > 0.5 ? "#6f6759" : "#827563", "#403a32", 2, 3));
    for (let sy = y + 76; sy < y + h - 42; sy += 28) out.push(line(sx + 4, sy, sx + 32, sy, "#c4a866", 3));
  }
  return out.join("");
}

function drawMarketRoom(room, rng) {
  const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
  const service = ["warehouse", "receiving", "cold_room", "freezer_room"].includes(room.semanticType);
  const fill = service ? "#9c9b96" : ["wc_staff", "wc_visitors"].includes(room.semanticType) ? "#b6b7b3" : "#d2ccc0";
  const out = [rect(x, y, w, h, fill, "#33312d", WALL, 2)];
  if (w > 80 && h > 65) out.push(text(x + w / 2, y + Math.min(28, h / 2), room.label, room.label.length > 14 ? 8 : 10));
  out.push(drawShelves(room, rng));
  if (["warehouse", "receiving"].includes(room.semanticType) && w > 130 && h > 100) {
    for (let xx = x + 25; xx < x + w - 35; xx += 58) out.push(rect(xx, y + h * 0.48, 38, 34, "#806b4d", "#4c4134", 2, 2));
  }
  if (room.semanticType === "checkout" && w > 160) {
    for (let xx = x + 28; xx < x + w - 24; xx += 70) out.push(rect(xx, y + 28, 42, Math.max(32, h - 56), "#55585a", "#2e3031", 2, 5));
  }
  if (room.semanticType === "produce" && w > 100 && h > 100) {
    for (let yy = y + 55; yy < y + h - 35; yy += 55) out.push(rect(x + 24, yy, Math.max(46, w - 48), 32, "#766949", "#41392e", 2, 2));
  }
  return out.join("");
}

function residentialRoomFill(type) {
  if (["bathroom", "guest_bathroom", "laundry", "utility"].includes(type)) return "#aaa9a0";
  if (["entry", "hall"].includes(type)) return "#b8aa8d";
  if (type === "terrace") return "#8f8878";
  return "#b8aa8f";
}

function drawResidentialFurniture(room, rng) {
  const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
  if (w < 95 || h < 85) return "";
  const out = [];
  const box = (px, py, bw, bh, fill = "#766955", rx = 3) => out.push(rect(px, py, bw, bh, fill, "#51483d", 2, rx));
  const inset = 14;
  switch (room.semanticType) {
    case "living_room":
      box(x + inset, y + Math.min(42, h * 0.28), Math.min(90, w * 0.42), 28, "#c6b99e", 8);
      box(x + w * 0.55, y + h * 0.55, 30, 24, "#8a7659", 10);
      break;
    case "kitchen":
      box(x + inset, y + inset, Math.max(30, w - inset * 2), 22, "#8d8371", 2);
      if (h > 120) box(x + w * 0.45, y + h * 0.58, 36, 30, "#c8baa0", 3);
      break;
    case "bedroom":
    case "master_bedroom":
    case "child_room":
      box(x + w * 0.28, y + Math.min(34, h * 0.25), Math.min(70, w * 0.44), Math.min(90, h * 0.52), "#c8b99d", 4);
      break;
    case "bathroom":
    case "guest_bathroom":
      box(x + inset, y + inset, Math.min(52, w * 0.45), 24, "#d9d6ca", 10);
      box(x + w - 35, y + h - 44, 20, 27, "#d9d6ca", 8);
      break;
    case "office":
      box(x + inset, y + h * 0.48, Math.min(72, w * 0.52), 26, "#806f55", 2);
      break;
    case "storage":
    case "utility":
    case "laundry":
    case "closet":
      for (let i = 0; i < Math.min(3, Math.max(1, room.w)); i += 1) box(x + inset + i * 28, y + inset + (i % 2) * 30, 22, 22, rng() > 0.5 ? "#766955" : "#5b5145", 2);
      break;
    default:
      break;
  }
  return out.join("");
}

function drawResidentialHouseRooms(rooms, rng) {
  const out = [];
  const grouped = new Map();
  rooms.forEach((room) => {
    const list = grouped.get(room.houseIndex) || [];
    list.push(room);
    grouped.set(room.houseIndex, list);
  });

  grouped.forEach((houseRooms, index) => {
    const minX = Math.min(...houseRooms.map((r) => r.x));
    const minY = Math.min(...houseRooms.map((r) => r.y));
    const maxX = Math.max(...houseRooms.map((r) => r.x + r.w));
    const maxY = Math.max(...houseRooms.map((r) => r.y + r.h));
    out.push(rect(minX * CELL - 8, minY * CELL - 8, (maxX - minX) * CELL + 16, (maxY - minY) * CELL + 16, "#6e6556", "#2f2b26", 5, 4));
    out.push(text((minX + maxX) * CELL / 2, minY * CELL - 24, `HOUSE ${index}`, 10, "middle", "#ddd0b5"));
    houseRooms.forEach((room) => {
      const x = room.x * CELL, y = room.y * CELL, w = room.w * CELL, h = room.h * CELL;
      out.push(rect(x, y, w, h, residentialRoomFill(room.semanticType), "#34312b", 8, 2));
      if (w >= 78 && h >= 62) {
        const label = room.label || String(room.semanticType || "ROOM").toUpperCase();
        const font = label.length > 14 ? 7 : label.length > 10 ? 8 : 9;
        out.push(text(x + w / 2, y + Math.min(22, h * 0.28), label, font));
      }
      out.push(drawResidentialFurniture(room, rng));
    });
  });
  return out.join("");
}

function drawCar(x, y, rotation, rng) {
  const fill = rng() > 0.66 ? "#765047" : rng() > 0.5 ? "#59665e" : "#69614d";
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">${rect(-31, -17, 62, 34, fill, "#292724", 3, 8)}${rect(-12, -13, 24, 26, "#303738", "#1f2323", 1, 4)}</g>`;
}

function drawParking(spec, bounds, rng) {
  const cols = Number(spec.cols) || 12, rows = Number(spec.rows) || 12;
  if (Math.max(cols, rows) <= 12) return "";
  const y1 = Math.min(rows - 1, bounds.y + bounds.h + 0.35) * CELL;
  const y2 = Math.min(rows - 0.5, y1 / CELL + Math.max(1.4, Math.floor(rows * 0.09))) * CELL;
  const x1 = Math.max(CELL, bounds.x * CELL);
  const x2 = Math.min((cols - 1) * CELL, (bounds.x + bounds.w) * CELL);
  const out = [rect(x1, y1, Math.max(CELL, x2 - x1), Math.max(CELL * 0.7, y2 - y1), "#5b5a55", "#44433f", 4, 2)];
  const spaces = clamp(Math.floor((x2 - x1) / 120), 3, 12);
  for (let i = 1; i < spaces; i += 1) out.push(line(x1 + (i * (x2 - x1)) / spaces, y1 + 10, x1 + (i * (x2 - x1)) / spaces, y2 - 10, "#b1a98f", 3));
  const carCount = clamp(Math.floor(spaces * (0.2 + rng() * 0.3)), 1, 5);
  for (let i = 0; i < carCount; i += 1) out.push(drawCar(x1 + ((i + 0.6) * (x2 - x1)) / spaces, y1 + (y2 - y1) * 0.52, rng() > 0.5 ? 90 : -90, rng));
  return out.join("");
}

function drawLoadingBay(spec, bounds, rng) {
  if (Math.max(Number(spec.cols) || 12, Number(spec.rows) || 12) < 18) return "";
  const x = bounds.x * CELL + 20, y = Math.max(0, bounds.y * CELL - 75), w = Math.min(bounds.w * CELL * 0.36, 360);
  const out = [rect(x, y, w, 68, "#696760", "#3d3b37", 3, 2), text(x + w / 2, y + 19, "LOADING", 9, "middle", "#d7cfb9")];
  for (let xx = x + 28; xx < x + w - 30; xx += 62) out.push(rect(xx, y + 31, 38, 28, rng() > 0.5 ? "#775d42" : "#655847", "#3b322a", 2, 2));
  return out.join("");
}

function drawFence(spec, condition) {
  const cols = Number(spec.cols) || 12, rows = Number(spec.rows) || 12;
  if (Math.max(cols, rows) < 30 || condition === "intact") return "";
  const margin = 0.6 * CELL, x1 = margin, y1 = margin, x2 = cols * CELL - margin, y2 = rows * CELL - margin;
  const dash = condition === "ruined" ? "22 20" : "16 8";
  return [line(x1, y1, x2, y1, "#5b5145", 5, dash), line(x1, y1, x1, y2, "#5b5145", 5, dash), line(x2, y1, x2, y2, "#5b5145", 5, dash), line(x1, y2, x2, y2, "#5b5145", 5, dash)].join("");
}

function damageOverlay(spec, condition, rng) {
  const ratio = { intact: 0.008, looted: 0.025, raider_occupied: 0.045, ruined: 0.085 }[condition] || 0.025;
  const count = Math.min(110, Math.round((Number(spec.cols) || 12) * (Number(spec.rows) || 12) * ratio));
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const x = (0.6 + rng() * Math.max(1, (Number(spec.cols) || 12) - 1.2)) * CELL;
    const y = (0.6 + rng() * Math.max(1, (Number(spec.rows) || 12) - 1.2)) * CELL;
    const s = 10 + rng() * 25;
    out.push(rect(x - s / 2, y - s / 3, s, s * 0.62, rng() > 0.5 ? "#625a4f" : "#756b5d", "#403a33", 1, 3, 'opacity="0.88"'));
  }
  if (condition === "raider_occupied") {
    const cx = (Number(spec.cols) || 12) * CELL * 0.5, cy = (Number(spec.rows) || 12) * CELL * 0.72;
    out.push(rect(cx - 58, cy - 16, 116, 32, "#694238", "#382923", 3, 3));
    out.push(text(cx, cy, "RAIDER CAMP", 9, "middle", "#e4cfac"));
  }
  return out.join("");
}

export function normalizeSuperDuperSpec(spec = {}) {
  const condition = ["auto", "intact", "looted", "raider_occupied", "ruined"].includes(spec.marketCondition) ? spec.marketCondition : "auto";
  return { ...spec, type: "super_duper_mart", marketCondition: condition };
}

export function generateSuperDuperMartSvg(input = {}) {
  const spec = normalizeSuperDuperSpec(input);
  const cols = clamp(spec.cols || 12, 6, 66), rows = clamp(spec.rows || 12, 6, 66);
  const width = cols * CELL, height = rows * CELL;
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:${cols}x${rows}:sdm-render-v3`));
  const condition = effectiveCondition(spec, rng);
  const rule = superDuperRule({ ...spec, cols, rows });
  const bounds = marketBounds({ ...spec, cols, rows }, rule);
  const layout = buildSuperDuperRoomLayout({ ...spec, cols, rows });
  const marketRooms = layout.filter((room) => room.zone === "market");
  const houseRooms = layout.filter((room) => room.zone === "outskirts");
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  out.push(rect(0, 0, width, height, "#787267"));
  out.push(rect(0, height * 0.72, width, height * 0.28, "#625f58"));
  out.push(drawParking({ ...spec, cols, rows }, bounds, rng));
  out.push(drawLoadingBay({ ...spec, cols, rows }, bounds, rng));
  marketRooms.forEach((room) => out.push(drawMarketRoom(room, rng)));
  out.push(drawResidentialHouseRooms(houseRooms, rng));
  out.push(drawFence({ ...spec, cols, rows }, condition));
  out.push(damageOverlay({ ...spec, cols, rows }, condition, rng));
  out.push(rect(18, 18, Math.min(width - 36, 475), 42, "#d8c9a8", "#40372e", 2, 4, 'opacity="0.94"'));
  out.push(text(34, 40, `SUPER DUPER MART // ${cols}x${rows} // ${condition.toUpperCase()}`, 11, "start"));
  out.push("</svg>");
  return out.join("");
}
