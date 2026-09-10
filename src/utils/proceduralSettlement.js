const CELL = 100;
const WALL = 9;

const HOUSE_COUNT_BY_GRID = [
  [8, 2], [12, 3], [18, 5], [24, 7], [30, 9], [42, 13], [54, 17], [66, 22],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function tierValue(size, table) {
  for (const [maxSize, value] of table) if (size <= maxSize) return value;
  return table[table.length - 1][1];
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

function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") {
  return `<line x1="${Number(x1).toFixed(1)}" y1="${Number(y1).toFixed(1)}" x2="${Number(x2).toFixed(1)}" y2="${Number(y2).toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}

function circle(x, y, r, fill, stroke = "none", sw = 0) {
  return `<circle cx="${Number(x).toFixed(1)}" cy="${Number(y).toFixed(1)}" r="${Number(r).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

function text(x, y, value, size = 12, options = {}) {
  const { fill = "#302b26", anchor = "middle", weight = 900, opacity = 0.95 } = options;
  return `<text x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" opacity="${opacity}" font-family="monospace" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
}

export function isSettlementType(type) {
  return String(type || "") === "settlement";
}

export function normalizeSettlementSpec(spec = {}) {
  const settlementStyle = ["civilian", "scrappy", "fortified", "raider"].includes(spec.settlementStyle)
    ? spec.settlementStyle
    : "scrappy";
  return { ...spec, type: "settlement", settlementStyle };
}

function houseDimensions(size, rng) {
  if (size <= 12) return rng() > 0.55 ? [3, 3] : [2, 3];
  if (size <= 24) return rng() > 0.5 ? [4, 3] : [3, 3];
  if (size <= 42) return rng() > 0.55 ? [5, 4] : [4, 4];
  return rng() > 0.5 ? [6, 5] : [5, 4];
}

function overlaps(a, b, pad = 1) {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

function roadCells(cols, rows) {
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);
  const width = Math.max(1, Math.min(2, Math.floor(Math.min(cols, rows) / 18) + 1));
  const cells = new Set();
  for (let y = 0; y < rows; y += 1) {
    for (let dx = 0; dx < width; dx += 1) cells.add(`${clamp(cx + dx - Math.floor(width / 2), 0, cols - 1)}:${y}`);
  }
  for (let x = 0; x < cols; x += 1) {
    for (let dy = 0; dy < width; dy += 1) cells.add(`${x}:${clamp(cy + dy - Math.floor(width / 2), 0, rows - 1)}`);
  }
  return { cells, cx, cy, width };
}

function touchesRoad(house, roads) {
  for (let y = Math.max(0, house.y - 1); y <= house.y + house.h; y += 1) {
    for (let x = Math.max(0, house.x - 1); x <= house.x + house.w; x += 1) {
      if (roads.cells.has(`${x}:${y}`)) return true;
    }
  }
  return false;
}

export function buildSettlementHouseLayout(spec = {}) {
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  const size = Math.max(cols, rows);
  const target = tierValue(size, HOUSE_COUNT_BY_GRID);
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:${cols}x${rows}:settlement-houses-v2`));
  const roads = roadCells(cols, rows);
  const houses = [];
  const margin = size <= 12 ? 0 : 1;

  for (let index = 0; index < target; index += 1) {
    let placed = null;
    for (let attempt = 0; attempt < 180 && !placed; attempt += 1) {
      let [w, h] = houseDimensions(size, rng);
      if (rng() > 0.5) [w, h] = [h, w];
      w = Math.min(w, Math.max(2, cols - margin * 2));
      h = Math.min(h, Math.max(2, rows - margin * 2));
      const x = margin + Math.floor(rng() * Math.max(1, cols - w - margin * 2 + 1));
      const y = margin + Math.floor(rng() * Math.max(1, rows - h - margin * 2 + 1));
      const candidate = { x, y, w, h };
      let blockedByRoad = false;
      for (let yy = y; yy < y + h && !blockedByRoad; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
          if (roads.cells.has(`${xx}:${yy}`)) { blockedByRoad = true; break; }
        }
      }
      if (blockedByRoad) continue;
      if (houses.some((house) => overlaps(candidate, house, size <= 12 ? 0 : 1))) continue;
      if (size > 12 && !touchesRoad(candidate, roads) && attempt < 110) continue;
      placed = candidate;
    }
    if (!placed) break;
    houses.push({
      id: index === 0 ? "house" : `house__${index + 1}`,
      baseRoomId: "house",
      instance: index + 1,
      sourceSet: index,
      slot: index,
      zone: "settlement",
      label: `HOUSE ${index + 1}`,
      ...placed,
    });
  }
  return houses;
}

export function buildSettlementHouseBlueprints(spec = {}) {
  return buildSettlementHouseLayout(spec).map(({ x, y, w, h, ...item }) => item);
}

function drawRoads(cols, rows, roads) {
  const parts = [];
  const roadFill = "#625d54";
  const edge = "#403c36";
  roads.cells.forEach((key) => {
    const [x, y] = key.split(":").map(Number);
    parts.push(rect(x * CELL, y * CELL, CELL, CELL, roadFill, edge, 1));
  });
  parts.push(line((roads.cx + 0.5) * CELL, 0, (roads.cx + 0.5) * CELL, rows * CELL, "#8a7d5c", 3, "22 22"));
  parts.push(line(0, (roads.cy + 0.5) * CELL, cols * CELL, (roads.cy + 0.5) * CELL, "#8a7d5c", 3, "22 22"));
  return parts.join("");
}

function houseInterior(house, index, rng) {
  const x = house.x * CELL;
  const y = house.y * CELL;
  const w = house.w * CELL;
  const h = house.h * CELL;
  const parts = [];
  const wall = "#37332d";
  const floor = index % 3 === 0 ? "#a79a82" : index % 3 === 1 ? "#9b907b" : "#ad9e84";
  parts.push(rect(x, y, w, h, floor, wall, WALL, 2));

  if (house.w >= 4) {
    const splitX = x + Math.max(2, Math.floor(house.w * (0.48 + (rng() - 0.5) * 0.12))) * CELL;
    parts.push(line(splitX, y, splitX, y + h, wall, WALL));
  }
  if (house.h >= 4) {
    const splitY = y + Math.max(2, Math.floor(house.h * (0.52 + (rng() - 0.5) * 0.12))) * CELL;
    parts.push(line(x, splitY, x + w, splitY, wall, WALL));
  }

  const doorX = x + w / 2;
  const roadIsBelow = house.y < Math.floor((house.y + house.h + 2));
  const doorY = roadIsBelow ? y + h : y;
  parts.push(line(doorX - 28, doorY, doorX + 28, doorY, "#d7c8a9", WALL + 5));

  if (w >= 250 && h >= 220) {
    parts.push(rect(x + 24, y + 58, Math.min(105, w * 0.32), 34, "#746653", wall, 2, 3));
    parts.push(rect(x + w - Math.min(125, w * 0.34) - 24, y + h - 74, Math.min(125, w * 0.34), 45, "#c5b89b", wall, 2, 5));
  }
  parts.push(rect(x + 12, y + 12, Math.min(105, w - 24), 28, "#d6c6a4", wall, 2, 3, 'opacity="0.92"'));
  parts.push(text(x + 20, y + 27, `HOUSE ${index + 1}`, house.w <= 3 ? 9 : 10, { anchor: "start", fill: "#332d27" }));
  return parts.join("");
}

function settlementProps(spec, houses, roads, rng) {
  const cols = Number(spec.cols) || 12;
  const rows = Number(spec.rows) || 12;
  const size = Math.max(cols, rows);
  const parts = [];
  const occupied = (x, y) => houses.some((house) => x >= house.x && x < house.x + house.w && y >= house.y && y < house.y + house.h) || roads.cells.has(`${x}:${y}`);

  const centerX = (roads.cx + 0.5) * CELL;
  const centerY = (roads.cy + 0.5) * CELL;
  parts.push(circle(centerX, centerY, Math.min(34, CELL * 0.34), "#6d796f", "#343933", 4));
  parts.push(text(centerX, centerY + 2, "PUMP", 8, { fill: "#e1d4b5" }));

  if (size >= 18) {
    const candidates = [
      [roads.cx + 2, roads.cy + 2], [roads.cx - 3, roads.cy + 2], [roads.cx + 2, roads.cy - 3], [roads.cx - 3, roads.cy - 3],
    ];
    const [mx, my] = candidates.find(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows && !occupied(x, y)) || [1, 1];
    parts.push(rect(mx * CELL, my * CELL, CELL * 1.5, CELL, "#83745b", "#3e372e", 5, 3));
    parts.push(text((mx + 0.75) * CELL, (my + 0.5) * CELL, "MARKET", 9, { fill: "#e4d6b7" }));
  }

  if (size >= 30) {
    const wx = clamp(roads.cx + 2, 1, cols - 3);
    const wy = clamp(roads.cy - 4, 1, rows - 3);
    if (!occupied(wx, wy)) {
      parts.push(rect(wx * CELL, wy * CELL, CELL * 2, CELL * 2, "#777064", "#34312b", 6, 3));
      parts.push(text((wx + 1) * CELL, (wy + 1) * CELL, "WORKSHOP", 9, { fill: "#e1d5b9" }));
    }
  }

  const debrisCount = Math.min(90, Math.round(cols * rows * (Number(spec.density) || 0.55) * 0.055));
  for (let i = 0; i < debrisCount; i += 1) {
    const gx = Math.floor(rng() * cols);
    const gy = Math.floor(rng() * rows);
    if (occupied(gx, gy)) continue;
    parts.push(circle((gx + 0.2 + rng() * 0.6) * CELL, (gy + 0.2 + rng() * 0.6) * CELL, 4 + rng() * 7, rng() > 0.5 ? "#514c43" : "#766d5d"));
  }
  return parts.join("");
}

function perimeter(spec) {
  const cols = Number(spec.cols) || 12;
  const rows = Number(spec.rows) || 12;
  const size = Math.max(cols, rows);
  if (size < 24 || String(spec.settlementStyle || "") === "civilian") return "";
  const stroke = "#4d463d";
  const gap = Math.max(120, Math.min(260, cols * CELL * 0.08));
  const bottomY = rows * CELL - 28;
  const mid = cols * CELL / 2;
  return [
    line(28, 28, cols * CELL - 28, 28, stroke, 12, "30 12"),
    line(28, 28, 28, bottomY, stroke, 12, "30 12"),
    line(cols * CELL - 28, 28, cols * CELL - 28, bottomY, stroke, 12, "30 12"),
    line(28, bottomY, mid - gap / 2, bottomY, stroke, 12, "30 12"),
    line(mid + gap / 2, bottomY, cols * CELL - 28, bottomY, stroke, 12, "30 12"),
  ].join("");
}

export function generateSettlementMapSvg(input = {}) {
  const spec = normalizeSettlementSpec(input);
  const cols = clamp(spec.cols || 12, 6, 66);
  const rows = clamp(spec.rows || 12, 6, 66);
  const width = cols * CELL;
  const height = rows * CELL;
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:${cols}x${rows}:${spec.settlementStyle}:settlement-map-v2`));
  const roads = roadCells(cols, rows);
  const houses = buildSettlementHouseLayout({ ...spec, cols, rows });
  const parts = [];

  parts.push(rect(0, 0, width, height, "#5c584e"));
  parts.push(drawRoads(cols, rows, roads));
  parts.push(settlementProps({ ...spec, cols, rows }, houses, roads, rng));
  houses.forEach((house, index) => parts.push(houseInterior(house, index, mulberry32(hashSeed(`${spec.seed}:${house.id}:house`)))));
  parts.push(perimeter({ ...spec, cols, rows }));

  const entranceX = (roads.cx + 0.5) * CELL;
  const entranceY = height - 42;
  parts.push(`<g transform="translate(${entranceX} ${entranceY})"><path d="M0 -24 L-13 -5 L-6 -5 L-6 18 L6 18 L6 -5 L13 -5 Z" fill="#9b5b36" stroke="#392f28" stroke-width="3"/></g>`);
  parts.push(rect(18, 18, Math.min(width - 36, 360), 42, "#d6c8a8", "#40382f", 2, 4, 'opacity="0.93"'));
  parts.push(text(32, 40, `SETTLEMENT // ${houses.length} HOUSES // ${cols}×${rows}`, 12, { anchor: "start", fill: "#332d27" }));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${parts.join("")}</svg>`;
}
