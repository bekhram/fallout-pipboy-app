import * as V4 from "./proceduralMapGeneratorV4.js";
import {
  generateProceduralRoomData,
  roomDataById,
} from "./proceduralRoomContent.js";
import {
  buildProceduralRoomLayout,
  proceduralRoomLabel,
} from "./proceduralRoomScale.js";

const CELL = 100;
const WALL = 10;

const THEMES = {
  wasteland: {
    outside: "#5d584b",
    corridor: "#716a58",
    rooms: ["#827563", "#756956", "#8b7b64"],
    wall: "#403b33",
    accent: "#9b5b36",
    label: "WASTELAND",
  },
  red_rocket: {
    outside: "#57534a",
    corridor: "#817b6d",
    rooms: ["#a69a82", "#8f897d", "#968a78"],
    wall: "#49423a",
    accent: "#a33d32",
    label: "RED ROCKET",
  },
  super_duper_mart: {
    outside: "#5c594f",
    corridor: "#8a8477",
    rooms: ["#aaa18e", "#99917f", "#b0a591"],
    wall: "#49443d",
    accent: "#9b3f31",
    label: "SUPER-DUPER MART",
  },
  raider_camp: {
    outside: "#51483f",
    corridor: "#695d4d",
    rooms: ["#765a46", "#80644d", "#6c594b"],
    wall: "#382d27",
    accent: "#b45e2d",
    label: "RAIDER CAMP",
  },
  military_bunker: {
    outside: "#4c514d",
    corridor: "#686d68",
    rooms: ["#7c8079", "#85877f", "#727871"],
    wall: "#353b38",
    accent: "#8f493d",
    label: "MILITARY BUNKER",
  },
};

const MARKER_SYMBOLS = {
  ENEMY: "!",
  TRAP: "^",
  TERMINAL: "T",
  SAFE: "S",
  AMMO_CRATE: "A",
  MEDKIT: "+",
  VENDING: "V",
  SUPPLIES: "P",
  WORKBENCH: "W",
  LOOT: "L",
  MEDS: "+",
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

function pick(rng, list) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function range(rng, min, max) {
  return min + (max - min) * rng();
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char]));
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
  const { fill = "#302b26", opacity = 0.95, weight = 800, anchor = "middle" } = options;
  return `<text x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" opacity="${opacity}" font-family="monospace" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
}

function roomTitle(room, theme) {
  const x = room.x * CELL;
  const y = room.y * CELL;
  const width = room.w * CELL;
  const label = room.label || proceduralRoomLabel(room.baseRoomId, room.instance);
  const maxWidth = Math.max(70, Math.min(width - 24, 190));
  const fontSize = label.length > 16 ? 10 : label.length > 11 ? 11 : 12;
  return `<g>${rect(x + 12, y + 12, maxWidth, 30, "#ded0b2", theme.wall, 2, 4, 'opacity="0.92"')}${text(x + 22, y + 28, label, fontSize, { anchor: "start", fill: "#2e2924", opacity: 1, weight: 900 })}</g>`;
}

function roomMarkers(room, raw, theme) {
  const markers = [...new Set(raw?.markers || [])].slice(0, 3);
  if (!markers.length) return "";
  const right = (room.x + room.w) * CELL - 24;
  const top = room.y * CELL + 27;
  return markers.map((marker, index) => {
    const x = right - index * 34;
    const symbol = MARKER_SYMBOLS[marker] || "•";
    return `<g>${circle(x, top, 14, theme.accent, theme.wall, 2)}${text(x, top + 1, symbol, 12, { fill: "#f0e4c7", opacity: 1, weight: 900 })}</g>`;
  }).join("");
}

function decorForRoom(room, rng, theme) {
  const x = room.x * CELL;
  const y = room.y * CELL;
  const w = room.w * CELL;
  const h = room.h * CELL;
  if (w < 130 || h < 130) return "";
  const id = room.baseRoomId;
  const parts = [];
  const innerLeft = x + 28;
  const innerTop = y + 58;
  const innerRight = x + w - 28;
  const innerBottom = y + h - 28;

  const smallBox = () => {
    const bw = Math.min(44, Math.max(24, w * 0.12));
    const bh = Math.min(34, Math.max(20, h * 0.1));
    const px = range(rng, innerLeft, Math.max(innerLeft, innerRight - bw));
    const py = range(rng, innerTop, Math.max(innerTop, innerBottom - bh));
    parts.push(rect(px, py, bw, bh, pick(rng, ["#5f5548", "#6a5d4c", "#4f4a42"]), theme.wall, 2, 3));
  };

  if (["storage", "armory", "wreck"].includes(id)) {
    const count = Math.max(2, Math.min(7, Math.floor((room.w * room.h) / 5)));
    for (let i = 0; i < count; i += 1) smallBox();
  } else if (["sales", "store"].includes(id)) {
    const shelfCount = Math.max(2, Math.min(6, room.w - 1));
    for (let i = 0; i < shelfCount; i += 1) {
      const px = innerLeft + ((innerRight - innerLeft) * (i + 0.5)) / shelfCount;
      parts.push(line(px, innerTop + 8, px, innerBottom - 8, "#5a5146", 12));
      parts.push(line(px, innerTop + 8, px, innerBottom - 8, "#91816a", 5));
    }
  } else if (["barrack", "barracks", "medical"].includes(id)) {
    const rows = Math.max(1, Math.min(4, Math.floor(room.h / 2)));
    for (let i = 0; i < rows; i += 1) {
      const py = innerTop + ((innerBottom - innerTop) * (i + 0.5)) / rows;
      parts.push(rect(innerLeft, py - 13, Math.max(36, Math.min(90, w * 0.27)), 26, "#5c6259", theme.wall, 2, 3));
    }
  } else if (["office", "control"].includes(id)) {
    const count = Math.max(2, Math.min(6, Math.floor((room.w * room.h) / 6)));
    for (let i = 0; i < count; i += 1) {
      smallBox();
      if (rng() < 0.7) parts.push(circle(range(rng, innerLeft, innerRight), range(rng, innerTop, innerBottom), 5, theme.accent, theme.wall, 1));
    }
  } else if (["garage", "workshop", "generator"].includes(id)) {
    const count = Math.max(2, Math.min(6, Math.floor((room.w * room.h) / 7)));
    for (let i = 0; i < count; i += 1) {
      const px = range(rng, innerLeft, innerRight);
      const py = range(rng, innerTop, innerBottom);
      parts.push(circle(px, py, range(rng, 10, 18), "#555d58", theme.wall, 3));
      parts.push(circle(px, py, range(rng, 3, 7), theme.accent, theme.wall, 1));
    }
  } else {
    const count = Math.max(1, Math.min(6, Math.floor((room.w * room.h) / 6)));
    for (let i = 0; i < count; i += 1) smallBox();
  }
  return parts.join("");
}

function roomDoor(room, theme) {
  const x = (room.x + room.w / 2) * CELL;
  const y = (room.y + room.h) * CELL;
  const gap = Math.min(56, Math.max(34, room.w * 18));
  return `<g>${line(x - gap / 2, y, x + gap / 2, y, theme.corridor, WALL + 5)}${line(x - gap / 2, y, x - gap / 2, y - 42, theme.wall, 4)}<path d="M ${x - gap / 2} ${y - 42} A 42 42 0 0 1 ${x + 14} ${y}" fill="none" stroke="${theme.wall}" stroke-width="2" stroke-dasharray="5 5"/></g>`;
}

function outsideScatter(spec, rng, theme) {
  const parts = [];
  const count = Math.min(180, Math.round(spec.cols * spec.rows * spec.density * 0.035));
  for (let index = 0; index < count; index += 1) {
    const x = range(rng, 18, spec.cols * CELL - 18);
    const y = range(rng, 18, spec.rows * CELL - 18);
    parts.push(circle(x, y, range(rng, 3, 8), pick(rng, [theme.wall, "#625b4f", "#776d5d"]), "none", 0));
  }
  return parts.join("");
}

function entryMarker(spec, theme) {
  const x = spec.cols * CELL / 2;
  const y = spec.rows * CELL - 46;
  return `<g transform="translate(${x} ${y})"><path d="M0 -25 L-14 -5 L-6 -5 L-6 20 L6 20 L6 -5 L14 -5 Z" fill="${theme.accent}" stroke="${theme.wall}" stroke-width="3"/></g>${text(x, y + 31, "ENTRY", 10, { fill: "#e7d8b8", opacity: 0.95, weight: 900 })}`;
}

export const MAP_TYPES = V4.MAP_TYPES;
export const makeProceduralSeed = V4.makeProceduralSeed;
export const proceduralLocationType = V4.proceduralLocationType;

export function normalizeProceduralMapSpec(value = {}) {
  const base = V4.normalizeProceduralMapSpec(value);
  return {
    ...base,
    version: Math.max(8, Number(base.version || 0)),
    cols: clamp(value.cols || base.cols || 12, 6, 66),
    rows: clamp(value.rows || base.rows || 12, 6, 66),
  };
}

export function generateProceduralMapSvg(input = {}) {
  const spec = normalizeProceduralMapSpec(input);
  const width = spec.cols * CELL;
  const height = spec.rows * CELL;
  const theme = THEMES[spec.type] || THEMES.wasteland;
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${spec.cols}x${spec.rows}:${spec.density}:scalable-map-v5`));
  const rooms = generateProceduralRoomData(spec);
  const layout = buildProceduralRoomLayout(spec);
  const parts = [];

  parts.push(rect(0, 0, width, height, theme.outside));
  parts.push(outsideScatter(spec, rng, theme));
  parts.push(rect(CELL * 0.65, CELL * 0.65, width - CELL * 1.3, height - CELL * 1.3, theme.corridor, theme.wall, 6, 6, 'opacity="0.96"'));

  layout.forEach((room, index) => {
    const raw = roomDataById(rooms, room.id);
    const fill = theme.rooms[index % theme.rooms.length];
    const x = room.x * CELL;
    const y = room.y * CELL;
    const w = room.w * CELL;
    const h = room.h * CELL;
    const roomRng = mulberry32(hashSeed(`${spec.seed}:${room.id}:visual-room-v1`));
    parts.push(rect(x, y, w, h, fill, theme.wall, WALL, 3));
    parts.push(roomTitle(room, theme));
    parts.push(roomMarkers(room, raw, theme));
    parts.push(decorForRoom(room, roomRng, theme));
    parts.push(roomDoor(room, theme));
  });

  parts.push(entryMarker(spec, theme));
  parts.push(rect(18, 18, Math.min(290, width - 36), 42, "#ded0b2", theme.wall, 3, 4, 'opacity="0.92"'));
  parts.push(text(34, 40, `${theme.label} // ${layout.length} ROOMS`, 13, { anchor: "start", fill: "#2e2924", opacity: 1, weight: 900 }));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none"><rect width="100%" height="100%" fill="${theme.outside}"/>${parts.join("")}</svg>`;
}

export function generateProceduralMapDataUrl(input = {}) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(generateProceduralMapSvg(input))}`;
}
