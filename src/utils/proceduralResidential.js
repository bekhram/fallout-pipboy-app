const CELL = 100;
const WALL = 10;

const ROOM_LABELS = {
  entry: "ENTRY",
  hall: "HALL",
  living_room: "LIVING ROOM",
  kitchen: "KITCHEN",
  dining: "DINING",
  bedroom: "BEDROOM",
  master_bedroom: "MASTER BEDROOM",
  child_room: "CHILD ROOM",
  bathroom: "BATHROOM",
  guest_bathroom: "GUEST WC",
  office: "OFFICE",
  storage: "STORAGE",
  utility: "UTILITY",
  laundry: "LAUNDRY",
  closet: "CLOSET",
  terrace: "TERRACE",
};

const HOUSE_TEMPLATES = {
  small: {
    base: [18, 14],
    rooms: [
      ["living_room", 1, 1, 9, 6],
      ["bedroom", 10, 1, 5, 6],
      ["bathroom", 15, 1, 2, 6],
      ["kitchen", 1, 7, 6, 5],
      ["hall", 7, 7, 4, 4],
      ["storage", 11, 7, 3, 5],
      ["utility", 14, 7, 3, 5],
      ["entry", 7, 11, 4, 2],
    ],
  },
  medium: {
    base: [24, 18],
    rooms: [
      ["kitchen", 1, 1, 7, 7],
      ["living_room", 8, 1, 8, 8],
      ["master_bedroom", 16, 1, 7, 6],
      ["bathroom", 1, 8, 5, 5],
      ["guest_bathroom", 6, 8, 2, 5],
      ["hall", 8, 9, 8, 5],
      ["bedroom", 16, 7, 7, 5],
      ["laundry", 1, 13, 7, 4],
      ["office", 16, 12, 7, 5],
      ["entry", 9, 14, 6, 3],
    ],
  },
  large: {
    base: [32, 20],
    rooms: [
      ["master_bedroom", 1, 1, 7, 7],
      ["living_room", 8, 1, 9, 8],
      ["kitchen", 17, 1, 8, 8],
      ["utility", 25, 1, 6, 5],
      ["closet", 1, 8, 5, 3],
      ["hall", 6, 9, 19, 2],
      ["storage", 22, 7, 3, 2],
      ["laundry", 25, 6, 6, 5],
      ["bathroom", 1, 11, 6, 8],
      ["office", 7, 11, 6, 8],
      ["entry", 13, 11, 6, 8],
      ["bedroom", 19, 11, 6, 8],
      ["child_room", 25, 11, 6, 4],
      ["bedroom", 25, 15, 6, 4],
      ["terrace", 9, 0, 14, 1],
    ],
  },
};

const ROOM_SOURCE_ALIAS = {
  entry: "store",
  hall: "sales",
  living_room: "sales",
  kitchen: "store",
  dining: "sales",
  bedroom: "office",
  master_bedroom: "office",
  child_room: "office",
  bathroom: "wc",
  guest_bathroom: "wc",
  office: "office",
  storage: "storage",
  utility: "garage",
  laundry: "storage",
  closet: "storage",
  terrace: "sales",
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

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
}

function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") {
  return `<rect x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" width="${Number(w).toFixed(1)}" height="${Number(h).toFixed(1)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke, sw = 4, extra = "") {
  return `<line x1="${Number(x1).toFixed(1)}" y1="${Number(y1).toFixed(1)}" x2="${Number(x2).toFixed(1)}" y2="${Number(y2).toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;
}

function text(x, y, value, size = 12, options = {}) {
  const { fill = "#302b26", anchor = "middle", weight = 900, opacity = 0.94 } = options;
  return `<text x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" opacity="${opacity}" font-family="monospace" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
}

export function isResidentialType(type) {
  return String(type || "") === "residential_house";
}

export function residentialSizeKey(spec = {}) {
  const explicit = String(spec.houseSize || "").toLowerCase();
  if (["small", "medium", "large"].includes(explicit)) return explicit;
  const size = Math.max(Number(spec.cols) || 12, Number(spec.rows) || 12);
  if (size <= 18) return "small";
  if (size <= 30) return "medium";
  return "large";
}

export function residentialSourceAlias(roomId) {
  return ROOM_SOURCE_ALIAS[roomId] || "office";
}

function scaleTemplateRoom(room, template, cols, rows) {
  const [id, x, y, w, h] = room;
  const [baseCols, baseRows] = template.base;
  const sx = cols / baseCols;
  const sy = rows / baseRows;
  const rx = clamp(Math.round(x * sx), 0, cols - 1);
  const ry = clamp(Math.round(y * sy), 0, rows - 1);
  const rw = clamp(Math.max(1, Math.round(w * sx)), 1, cols - rx);
  const rh = clamp(Math.max(1, Math.round(h * sy)), 1, rows - ry);
  return { id, baseRoomId: id, instance: 1, sourceSet: 0, slot: 0, zone: id === "terrace" ? "outside" : "main", label: ROOM_LABELS[id] || id.toUpperCase(), x: rx, y: ry, w: rw, h: rh };
}

export function buildResidentialRoomLayout(spec = {}) {
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  const sizeKey = residentialSizeKey(spec);
  const template = HOUSE_TEMPLATES[sizeKey];
  return template.rooms
    .map((room, index) => ({ ...scaleTemplateRoom(room, template, cols, rows), slot: index }))
    .filter((room) => room.w > 0 && room.h > 0);
}

export function buildResidentialRoomBlueprints(spec = {}) {
  return buildResidentialRoomLayout(spec).map(({ x, y, w, h, ...room }) => room);
}

function roomColor(id) {
  if (["bathroom", "guest_bathroom", "laundry", "utility"].includes(id)) return "#aaa9a0";
  if (["entry", "hall"].includes(id)) return "#b8aa8d";
  if (id === "terrace") return "#8f8878";
  return "#b8aa8f";
}

function furniture(room, rng) {
  const x = room.x * CELL;
  const y = room.y * CELL;
  const w = room.w * CELL;
  const h = room.h * CELL;
  const p = [];
  const dark = "#5b5145";
  const mid = "#766955";
  const light = "#d1c3a6";
  const addBox = (px, py, bw, bh, fill = mid, rx = 4) => p.push(rect(px, py, bw, bh, fill, dark, 2, rx));
  const inset = 24;
  if (w < 120 || h < 120) return "";

  switch (room.baseRoomId) {
    case "living_room":
      addBox(x + inset, y + inset + 34, Math.min(w * 0.44, 210), 48, light, 10);
      addBox(x + w * 0.47, y + h * 0.45, 58, 44, mid, 22);
      addBox(x + w - 34, y + inset + 20, 16, Math.min(120, h * 0.45), dark, 2);
      break;
    case "kitchen":
      addBox(x + inset, y + inset, Math.max(50, w - inset * 2), 38, "#8d8371", 2);
      addBox(x + inset, y + h - 62, Math.min(150, w * 0.52), 38, "#8d8371", 2);
      addBox(x + w * 0.52, y + h * 0.52, 60, 60, light, 4);
      break;
    case "bedroom":
    case "master_bedroom":
    case "child_room": {
      const bw = Math.min(room.baseRoomId === "master_bedroom" ? 170 : 125, w * 0.52);
      const bh = Math.min(190, h * 0.54);
      addBox(x + w * 0.48 - bw / 2, y + inset + 12, bw, bh, "#c8b99d", 5);
      addBox(x + inset, y + h - 58, Math.min(110, w * 0.35), 30, mid, 2);
      break;
    }
    case "bathroom":
    case "guest_bathroom":
      addBox(x + inset, y + inset, Math.min(95, w * 0.48), 42, light, 18);
      addBox(x + w - 62, y + h - 68, 34, 42, "#d9d6ca", 15);
      break;
    case "office":
      addBox(x + inset, y + h * 0.45, Math.min(150, w * 0.56), 46, mid, 2);
      addBox(x + w * 0.62, y + h * 0.52, 38, 38, dark, 19);
      break;
    case "storage":
    case "utility":
    case "laundry":
    case "closet":
      for (let i = 0; i < Math.min(4, Math.max(1, room.w)); i += 1) {
        addBox(x + inset + i * 44, y + inset + (i % 2) * 48, 34, 34, rng() > 0.5 ? mid : dark, 2);
      }
      break;
    case "dining":
      addBox(x + w * 0.28, y + h * 0.34, w * 0.44, h * 0.28, light, 6);
      break;
    default:
      break;
  }
  return p.join("");
}

function edgeDoor(a, b) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  if (ax2 === b.x || bx2 === a.x) {
    const from = Math.max(a.y, b.y);
    const to = Math.min(ay2, by2);
    if (to - from >= 1) return { vertical: true, x: (ax2 === b.x ? b.x : a.x) * CELL, y: (from + (to - from) / 2) * CELL };
  }
  if (ay2 === b.y || by2 === a.y) {
    const from = Math.max(a.x, b.x);
    const to = Math.min(ax2, bx2);
    if (to - from >= 1) return { vertical: false, x: (from + (to - from) / 2) * CELL, y: (ay2 === b.y ? b.y : a.y) * CELL };
  }
  return null;
}

function doors(layout) {
  const preferred = new Set(["entry:hall", "hall:living_room", "hall:bedroom", "hall:master_bedroom", "hall:child_room", "hall:bathroom", "hall:guest_bathroom", "hall:office", "living_room:kitchen", "kitchen:dining", "kitchen:storage", "utility:laundry", "master_bedroom:closet"]);
  const out = [];
  const seen = new Set();
  for (let i = 0; i < layout.length; i += 1) {
    for (let j = i + 1; j < layout.length; j += 1) {
      const a = layout[i];
      const b = layout[j];
      const key1 = `${a.baseRoomId}:${b.baseRoomId}`;
      const key2 = `${b.baseRoomId}:${a.baseRoomId}`;
      const door = edgeDoor(a, b);
      if (!door || (!preferred.has(key1) && !preferred.has(key2) && a.baseRoomId !== "hall" && b.baseRoomId !== "hall")) continue;
      const key = `${door.vertical ? "v" : "h"}:${Math.round(door.x)}:${Math.round(door.y)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const gap = 54;
      if (door.vertical) out.push(line(door.x, door.y - gap / 2, door.x, door.y + gap / 2, "#d7c9aa", WALL + 6));
      else out.push(line(door.x - gap / 2, door.y, door.x + gap / 2, door.y, "#d7c9aa", WALL + 6));
    }
  }
  return out.join("");
}

function windows(layout, cols, rows) {
  const out = [];
  layout.forEach((room) => {
    if (["hall", "entry", "storage", "closet"].includes(room.baseRoomId)) return;
    const x1 = room.x * CELL;
    const y1 = room.y * CELL;
    const x2 = (room.x + room.w) * CELL;
    const y2 = (room.y + room.h) * CELL;
    const span = Math.max(42, Math.min(100, Math.max(room.w, room.h) * 24));
    if (room.y <= 1) out.push(line((x1 + x2) / 2 - span / 2, y1, (x1 + x2) / 2 + span / 2, y1, "#9fc0c7", 12));
    if (room.x <= 1) out.push(line(x1, (y1 + y2) / 2 - span / 2, x1, (y1 + y2) / 2 + span / 2, "#9fc0c7", 12));
    if (room.x + room.w >= cols - 1) out.push(line(x2, (y1 + y2) / 2 - span / 2, x2, (y1 + y2) / 2 + span / 2, "#9fc0c7", 12));
    if (room.y + room.h >= rows - 1 && room.baseRoomId !== "entry") out.push(line((x1 + x2) / 2 - span / 2, y2, (x1 + x2) / 2 + span / 2, y2, "#9fc0c7", 12));
  });
  return out.join("");
}

function damageOverlay(spec, rng) {
  const condition = String(spec.houseCondition || "damaged");
  const ratio = { intact: 0.01, damaged: 0.04, ruined: 0.09, heavily_ruined: 0.15 }[condition] ?? 0.04;
  const count = Math.round((Number(spec.cols) || 12) * (Number(spec.rows) || 12) * ratio);
  const out = [];
  for (let i = 0; i < Math.min(90, count); i += 1) {
    const x = (0.8 + rng() * Math.max(1, (Number(spec.cols) || 12) - 1.6)) * CELL;
    const y = (0.8 + rng() * Math.max(1, (Number(spec.rows) || 12) - 1.6)) * CELL;
    const size = 10 + rng() * 22;
    out.push(rect(x - size / 2, y - size / 2, size, size * 0.66, rng() > 0.5 ? "#625a4f" : "#756b5d", "#403a33", 1, 3, 'opacity="0.86"'));
  }
  return out.join("");
}

export function normalizeResidentialSpec(spec = {}) {
  const houseSize = residentialSizeKey(spec);
  const houseTheme = ["civilian", "scavenged", "raider", "survivalist"].includes(spec.houseTheme) ? spec.houseTheme : "civilian";
  const houseCondition = ["intact", "damaged", "ruined", "heavily_ruined"].includes(spec.houseCondition) ? spec.houseCondition : "damaged";
  return { ...spec, type: "residential_house", houseSize, houseTheme, houseCondition };
}

export function generateResidentialMapSvg(input = {}) {
  const spec = normalizeResidentialSpec(input);
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  const width = cols * CELL;
  const height = rows * CELL;
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:${cols}x${rows}:${spec.houseSize}:${spec.houseTheme}:${spec.houseCondition}:residential-v1`));
  let layout = buildResidentialRoomLayout({ ...spec, cols, rows });
  if (rng() > 0.5) {
    layout = layout.map((room) => ({ ...room, x: Math.max(0, cols - room.x - room.w) }));
  }

  const parts = [];
  parts.push(rect(0, 0, width, height, "#5d594e"));
  parts.push(rect(CELL * 0.45, CELL * 0.45, width - CELL * 0.9, height - CELL * 0.9, "#817967", "#3f3a32", 5, 4));

  layout.forEach((room) => {
    const x = room.x * CELL;
    const y = room.y * CELL;
    const w = room.w * CELL;
    const h = room.h * CELL;
    parts.push(rect(x, y, w, h, roomColor(room.baseRoomId), "#34312b", WALL, 2));
    if (w >= 125 && h >= 90) {
      const label = room.label;
      const font = label.length > 14 ? 9 : label.length > 10 ? 10 : 12;
      parts.push(text(x + w / 2, y + Math.min(h - 20, 32), label, font, { fill: "#38322a" }));
    }
    parts.push(furniture(room, rng));
  });

  parts.push(doors(layout));
  parts.push(windows(layout, cols, rows));
  parts.push(damageOverlay({ ...spec, cols, rows }, rng));

  const entry = layout.find((room) => room.baseRoomId === "entry");
  if (entry) {
    const ex = (entry.x + entry.w / 2) * CELL;
    const ey = Math.min(height - 24, (entry.y + entry.h) * CELL - 24);
    parts.push(`<g transform="translate(${ex} ${ey})"><path d="M0 -24 L-13 -5 L-6 -5 L-6 18 L6 18 L6 -5 L13 -5 Z" fill="#9b5b36" stroke="#3a3028" stroke-width="3"/></g>`);
  }

  const title = `RESIDENTIAL HOUSE // ${String(spec.houseSize).toUpperCase()} // ${String(spec.houseCondition).toUpperCase()}`;
  parts.push(rect(18, 18, Math.min(width - 36, 430), 42, "#d8c9a8", "#40372e", 2, 4, 'opacity="0.93"'));
  parts.push(text(34, 40, title, 12, { anchor: "start", fill: "#332d27" }));
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${parts.join("")}</svg>`);
  return parts.pop();
}
