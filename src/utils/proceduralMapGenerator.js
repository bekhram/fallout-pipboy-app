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

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") {
  return `<rect x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" width="${Number(w).toFixed(1)}" height="${Number(h).toFixed(1)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function circle(cx, cy, r, fill, stroke = "none", sw = 0, extra = "") {
  return `<circle cx="${Number(cx).toFixed(1)}" cy="${Number(cy).toFixed(1)}" r="${Number(r).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") {
  return `<line x1="${Number(x1).toFixed(1)}" y1="${Number(y1).toFixed(1)}" x2="${Number(x2).toFixed(1)}" y2="${Number(y2).toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}

function text(x, y, value, size = 18, options = {}) {
  const { fill = "#40382f", opacity = 0.9, weight = 700, anchor = "middle" } = options;
  return `<text x="${Number(x).toFixed(1)}" y="${Number(y).toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" opacity="${opacity}" font-family="monospace" font-size="${size}" font-weight="${weight}">${escapeText(value)}</text>`;
}

function gx(col) { return col * CELL; }
function gy(row) { return row * CELL; }
function gc(col) { return col * CELL + CELL / 2; }

function gridRoom(x, y, w, h, floor = "#a79b83", wall = "#51483c") {
  return rect(gx(x), gy(y), w * CELL, h * CELL, floor, wall, WALL, 2);
}

function roomNoteCell(col, row, title, note = "") {
  const x = gc(col);
  const y = gc(row);
  const width = 88;
  const height = note ? 52 : 32;
  return `<g>${rect(x - width / 2, y - height / 2, width, height, "#ded0b2", "#5a4c3e", 2, 5, `opacity="0.88"`)}${text(x, y - (note ? 9 : 0), title, title.length > 12 ? 10 : 12, { fill: "#312b25", opacity: 1, weight: 900 })}${note ? text(x, y + 12, note, note.length > 11 ? 8 : 9, { fill: "#654233", opacity: 1, weight: 800 }) : ""}</g>`;
}

function markerCell(col, row, type, count = 1) {
  const x = gc(col);
  const y = gc(row);
  const label = count > 1 ? `${type} x${count}` : type;
  const fill = type === "ENEMY" ? "#8b3f32" : type === "TERMINAL" ? "#42695a" : type === "LOOT" ? "#806b3f" : type === "MEDS" ? "#6b7456" : "#5c554a";
  const symbol = type === "TERMINAL" ? "T" : type === "LOOT" ? "$" : type === "ENEMY" ? "!" : type === "MEDS" ? "+" : "•";
  return `<g>${circle(x, y, 15, fill, "#2f2923", 3)}${text(x, y + 1, symbol, 14, { fill: "#eee2c6", opacity: 1, weight: 900 })}${text(x, y + 26, label, 9, { fill: "#382f28", opacity: 0.9, weight: 800 })}</g>`;
}

function doorH(col, boundaryRow, label = "") {
  const x = gc(col);
  const y = gy(boundaryRow);
  const gap = 64;
  return `<g>${line(x - gap / 2, y, x + gap / 2, y, "#e7d7b7", WALL + 4)}${line(x - gap / 2, y, x - gap / 2, y - 54, "#473d33", 4)}<path d="M ${x - gap / 2} ${y - 54} A 54 54 0 0 1 ${x + 20} ${y}" fill="none" stroke="#6c5b49" stroke-width="2" stroke-dasharray="5 5"/>${label ? text(x, y + 18, label, 9, { fill: "#362f28", opacity: 1, weight: 900 }) : ""}</g>`;
}

function doorV(boundaryCol, row, label = "") {
  const x = gx(boundaryCol);
  const y = gc(row);
  const gap = 64;
  return `<g>${line(x, y - gap / 2, x, y + gap / 2, "#e7d7b7", WALL + 4)}${line(x, y - gap / 2, x + 54, y - gap / 2, "#473d33", 4)}<path d="M ${x + 54} ${y - gap / 2} A 54 54 0 0 1 ${x} ${y + 20}" fill="none" stroke="#6c5b49" stroke-width="2" stroke-dasharray="5 5"/>${label ? text(x + 30, y, label, 9, { fill: "#362f28", opacity: 1, weight: 900, anchor: "start" }) : ""}</g>`;
}

function garageDoorH(startCol, endCol, boundaryRow, label = "GARAGE") {
  const x1 = gx(startCol) + 12;
  const x2 = gx(endCol) - 12;
  const y = gy(boundaryRow);
  return `<g>${line(x1, y, x2, y, "#d5c5a6", WALL + 6, "18 9")}${text((x1 + x2) / 2, y + 18, label, 9, { fill: "#362f28", opacity: 1, weight: 900 })}</g>`;
}

function entryArrowCell(col, row, direction = "up", label = "ENTRY") {
  const x = gc(col);
  const y = gc(row);
  const rotations = { up: 0, right: 90, down: 180, left: -90 };
  return `<g transform="translate(${x} ${y}) rotate(${rotations[direction] || 0})"><path d="M0 -30 L-16 -7 L-7 -7 L-7 20 L7 20 L7 -7 L16 -7 Z" fill="#9b3f31" stroke="#432a23" stroke-width="3"/></g>${text(x, y + (direction === "up" ? 38 : direction === "down" ? -38 : 0), label, 11, { fill: "#5d2d25", opacity: 1, weight: 900 })}`;
}

function terrainScatter(rng, cols, rows, density, palette, reserved = new Set()) {
  const parts = [];
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!reserved.has(`${x}:${y}`)) cells.push([x, y]);
    }
  }
  const count = Math.min(cells.length, Math.round((cols * rows) * density * 0.16));
  for (let i = 0; i < count; i += 1) {
    const index = Math.floor(rng() * cells.length);
    const [x, y] = cells.splice(index, 1)[0] || [0, 0];
    parts.push(circle(gc(x) + range(rng, -18, 18), gc(y) + range(rng, -18, 18), range(rng, 5, 12), pick(rng, palette.rocks), "#302a22", 1.2, `opacity="${range(rng, 0.35, 0.62).toFixed(2)}"`));
  }
  return parts.join("");
}

function vehicleCell(rng, col, row, rotation = 0) {
  const x = gc(col);
  const y = gc(row);
  const w = 54;
  const h = 30;
  return `<g transform="translate(${x} ${y}) rotate(${rotation})">${rect(-w / 2, -h / 2, w, h, pick(rng, ["#744637", "#5e6c62", "#696046", "#714b35"]), "#2d2723", 3, 5)}${rect(-w * 0.18, -h * 0.4, w * 0.36, h * 0.8, "#2a3434", "#1b2020", 1.5, 3)}</g>`;
}

function noteFor(rng, values) {
  return pick(rng, values);
}

function generateWasteland(rng, cols, rows, density, palette) {
  const parts = [];
  const vertical = rng() > 0.5;
  const reserved = new Set();
  if (vertical) {
    const roadCol = clamp(Math.floor(cols * 0.5), 1, cols - 2);
    parts.push(rect(gx(roadCol), 0, CELL, rows * CELL, "#555047", "#403b35", 4));
    parts.push(line(gc(roadCol), 0, gc(roadCol), rows * CELL, "#b69a50", 4, "22 20"));
    for (let y = 0; y < rows; y += 1) reserved.add(`${roadCol}:${y}`);
    parts.push(entryArrowCell(roadCol, Math.max(0, rows - 1), "up", "ENTRY"));
  } else {
    const roadRow = clamp(Math.floor(rows * 0.55), 1, rows - 2);
    parts.push(rect(0, gy(roadRow), cols * CELL, CELL, "#555047", "#403b35", 4));
    parts.push(line(0, gc(roadRow), cols * CELL, gc(roadRow), "#b69a50", 4, "22 20"));
    for (let x = 0; x < cols; x += 1) reserved.add(`${x}:${roadRow}`);
    parts.push(entryArrowCell(0, roadRow, "right", "ENTRY"));
  }

  const zoneCandidates = [
    [1, 1, "RUINS", ["LOOT", "ENEMY x2", "EMPTY"]],
    [Math.max(1, cols - 3), 1, "WRECK", ["LOOT", "MEDS", "TRAP"]],
    [Math.max(1, cols - 3), Math.max(1, rows - 3), "CAMP", ["ENEMY x2", "CAMPFIRE", "CACHE"]],
  ];
  zoneCandidates.forEach(([x, y, title, notes]) => {
    const w = Math.min(2, cols - x);
    const h = Math.min(2, rows - y);
    if (w <= 0 || h <= 0) return;
    const note = noteFor(rng, notes);
    parts.push(gridRoom(x, y, w, h, "#776c59", "#4d4438"));
    parts.push(roomNoteCell(x, y, title, note));
    if (note.startsWith("ENEMY")) parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, y + h - 1), "ENEMY", Number(note.match(/x(\d+)/)?.[1] || 1)));
    else if (note === "LOOT" || note === "CACHE") parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, y + h - 1), "LOOT"));
    else if (note === "MEDS") parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, y + h - 1), "MEDS"));
    for (let yy = y; yy < y + h; yy += 1) for (let xx = x; xx < x + w; xx += 1) reserved.add(`${xx}:${yy}`);
  });
  parts.unshift(terrainScatter(rng, cols, rows, density, palette, reserved));
  return parts.join("");
}

function generateRedRocket(rng, cols, rows, density, palette) {
  const parts = [];
  const roadRows = rows >= 10 ? 2 : 1;
  const roadStart = rows - roadRows;
  parts.push(rect(0, gy(roadStart), cols * CELL, roadRows * CELL, "#514d47", "#3a3631", 4));
  parts.push(line(0, gy(roadStart) + roadRows * CELL * 0.55, cols * CELL, gy(roadStart) + roadRows * CELL * 0.55, "#b79b51", 4, "26 22"));

  const left = clamp(Math.floor(cols * 0.38), 2, Math.max(2, cols - 4));
  const right = cols - 1;
  const top = 1;
  const bottom = Math.max(top + 4, roadStart - 1);
  const bw = Math.max(4, right - left);
  const bh = Math.max(4, bottom - top);
  const midX = left + Math.max(2, Math.floor(bw * 0.56));
  const splitY = top + Math.max(2, Math.floor(bh * 0.62));

  parts.push(gridRoom(left, top, right - left, bottom - top, "#9b907a", "#484139"));
  parts.push(gridRoom(left, top, midX - left, splitY - top, "#a99d84", "#554a3d"));
  parts.push(gridRoom(midX, top, right - midX, splitY - top, "#88877d", "#514d46"));

  const bottomWidth = right - left;
  const officeW = Math.max(1, Math.floor(bottomWidth * 0.32));
  const storageW = Math.max(1, Math.floor(bottomWidth * 0.36));
  const wcW = Math.max(1, bottomWidth - officeW - storageW);
  const officeX = left;
  const storageX = officeX + officeW;
  const wcX = storageX + storageW;
  if (splitY < bottom) {
    parts.push(gridRoom(officeX, splitY, officeW, bottom - splitY, "#887f70", "#4d463c"));
    parts.push(gridRoom(storageX, splitY, storageW, bottom - splitY, "#81786b", "#4d463c"));
    parts.push(gridRoom(wcX, splitY, wcW, bottom - splitY, "#78736a", "#4d463c"));
  }

  const storeNote = noteFor(rng, ["LOOT", "ENEMY x2", "REGISTER"]);
  const garageNote = noteFor(rng, ["WORKBENCH", "ENEMY", "TOOLS"]);
  const officeNote = noteFor(rng, ["TERMINAL", "SAFE", "LOGS"]);
  const storageNote = noteFor(rng, ["LOOT", "JUNK", "AMMO"]);
  const wcNote = noteFor(rng, ["EMPTY", "MEDS", "CACHE"]);

  parts.push(roomNoteCell(left, top, "STORE", storeNote));
  parts.push(roomNoteCell(midX, top, "GARAGE", garageNote));
  if (splitY < bottom) {
    parts.push(roomNoteCell(officeX, splitY, "OFFICE", officeNote));
    parts.push(roomNoteCell(storageX, splitY, "STORAGE", storageNote));
    parts.push(roomNoteCell(wcX, splitY, "WC", wcNote));
  }

  const entryCol = clamp(left + 1, left, right - 1);
  parts.push(doorH(entryCol, bottom, "MAIN"));
  if (roadStart - 1 >= 0) parts.push(entryArrowCell(entryCol, roadStart - 1, "up", "ENTRY"));
  if (midX < right) parts.push(doorV(midX, top + 1));
  if (splitY < bottom) {
    parts.push(doorH(officeX, splitY));
    parts.push(doorH(storageX, splitY));
    parts.push(doorH(wcX, splitY));
  }
  if (right - midX >= 2) parts.push(garageDoorH(midX, right, splitY, "GARAGE"));

  if (officeNote === "TERMINAL") parts.push(markerCell(officeX, Math.min(rows - 1, splitY + 1), "TERMINAL"));
  if (storeNote === "LOOT") parts.push(markerCell(Math.min(cols - 1, left + 1), Math.min(rows - 1, top + 1), "LOOT"));
  if (garageNote.startsWith("ENEMY")) parts.push(markerCell(Math.min(cols - 1, midX + 1), Math.min(rows - 1, top + 1), "ENEMY", Number(garageNote.match(/x(\d+)/)?.[1] || 1)));

  const canopyRight = Math.max(1, left - 1);
  if (canopyRight > 0) {
    const canopyTop = Math.min(rows - 2, 2);
    const canopyH = Math.min(3, Math.max(1, roadStart - canopyTop - 1));
    parts.push(gridRoom(0, canopyTop, canopyRight, canopyH, "#6d655a", "#433d35"));
    for (let y = canopyTop; y < canopyTop + canopyH; y += 1) {
      for (let x = 0; x < canopyRight; x += 1) {
        if ((x + y) % 2 === 0) parts.push(rect(gc(x) - 10, gc(y) - 20, 20, 40, "#8c3f32", "#4e2b28", 3, 4));
      }
    }
  }
  parts.push(text((gx(left) + gx(right)) / 2, gy(top) - 24, "RED ROCKET", 28, { fill: "#8d3c31", opacity: 1, weight: 900 }));

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) reserved.add(`${x}:${y}`);
  for (let y = roadStart; y < rows; y += 1) for (let x = 0; x < cols; x += 1) reserved.add(`${x}:${y}`);
  parts.unshift(terrainScatter(rng, cols, rows, density * 0.45, palette, reserved));
  const carRow = Math.max(0, roadStart);
  if (carRow < rows) {
    for (let i = 0; i < Math.min(3, Math.max(1, Math.round(density * 3))); i += 1) {
      const c = clamp(1 + i * Math.max(1, Math.floor(cols / 4)), 0, cols - 1);
      parts.push(vehicleCell(rng, c, carRow, i % 2 ? -18 : 12));
    }
  }
  return parts.join("");
}

function generateSuperDuperMart(rng, cols, rows, density, palette) {
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

  parts.push(gridRoom(left, top, right - left, bottom - top, "#a29a87", "#49433b"));
  parts.push(gridRoom(left, top, storageStart - left, bottom - top, "#ada28b", "#51483d"));
  parts.push(gridRoom(storageStart, top, right - storageStart, officeSplit - top, "#847b6c", "#4c473f"));
  if (officeSplit < bottom) parts.push(gridRoom(storageStart, officeSplit, right - storageStart, bottom - officeSplit, "#8d8372", "#4c473f"));

  const salesNote = noteFor(rng, ["ENEMY x2", "LOOT", "SCAVENGERS"]);
  const storageNote = noteFor(rng, ["LOOT", "LOCKED CACHE", "ENEMY"]);
  parts.push(roomNoteCell(left, top, "SALES", salesNote));
  parts.push(roomNoteCell(storageStart, top, "STORAGE", storageNote));
  if (officeSplit < bottom) parts.push(roomNoteCell(storageStart, officeSplit, "OFFICE", "TERMINAL"));

  const shelfCols = [];
  for (let x = left + 1; x < storageStart; x += 1) shelfCols.push(x);
  shelfCols.slice(0, 4).forEach((x) => {
    parts.push(rect(gc(x) - 9, gy(top + 1) + 10, 18, Math.max(50, (bottom - top - 2) * CELL - 20), "#4f473b", "#302a24", 2, 2));
  });

  const entryCol = clamp(left + Math.floor((storageStart - left) / 2), left, storageStart - 1);
  parts.push(doorH(entryCol, bottom, "MAIN"));
  if (parkingStart - 1 >= 0) parts.push(entryArrowCell(entryCol, parkingStart - 1, "up", "ENTRY"));
  parts.push(doorV(storageStart, top + 1));
  if (officeSplit < bottom) parts.push(doorH(storageStart, officeSplit));
  parts.push(markerCell(storageStart, Math.min(rows - 1, officeSplit), "TERMINAL"));
  if (salesNote.startsWith("ENEMY")) parts.push(markerCell(Math.min(storageStart - 1, left + 1), Math.min(bottom - 1, top + 1), "ENEMY", Number(salesNote.match(/x(\d+)/)?.[1] || 1)));
  if (storageNote === "LOOT" || storageNote === "LOCKED CACHE") parts.push(markerCell(storageStart, Math.min(bottom - 1, top + 1), "LOOT"));

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) reserved.add(`${x}:${y}`);
  for (let y = parkingStart; y < rows; y += 1) for (let x = 0; x < cols; x += 1) reserved.add(`${x}:${y}`);
  parts.unshift(terrainScatter(rng, cols, rows, density * 0.35, palette, reserved));
  for (let i = 0; i < Math.min(4, Math.max(1, Math.round(density * 4))); i += 1) {
    const c = clamp(1 + i * Math.max(1, Math.floor(cols / 4)), 0, cols - 1);
    parts.push(vehicleCell(rng, c, parkingStart, i % 2 ? 180 : 0));
  }
  return parts.join("");
}

function generateRaiderCamp(rng, cols, rows, density, palette) {
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
  parts.push(garageDoorH(gateCol, gateCol + 1, bottom, "GATE"));
  parts.push(entryArrowCell(gateCol, Math.max(0, bottom - 1), "up", "ENTRY"));

  const roomW = Math.max(2, Math.floor((right - left - 1) / 2));
  const roomH = Math.max(2, Math.floor((bottom - top - 1) / 2));
  const locations = [
    [left, top, "BARRACK", noteFor(rng, ["ENEMY x2", "BEDS", "LOOT"])],
    [Math.max(left, right - roomW), top, "BOSS", noteFor(rng, ["ENEMY", "LOOT", "TERMINAL"])],
    [left, Math.max(top, bottom - roomH), "STORAGE", noteFor(rng, ["LOOT", "AMMO", "TRAP"])],
    [Math.max(left, right - roomW), Math.max(top, bottom - roomH), "WORKSHOP", noteFor(rng, ["WORKBENCH", "JUNK", "ENEMY"])],
  ];
  locations.forEach(([x, y, title, note], index) => {
    const w = Math.min(roomW, right - x);
    const h = Math.min(roomH, bottom - y);
    if (w < 1 || h < 1) return;
    parts.push(gridRoom(x, y, w, h, index % 2 ? "#6a6250" : "#76583f", "#3d342b"));
    parts.push(roomNoteCell(x, y, title, note));
    parts.push(doorH(x, y + h));
    if (String(note).startsWith("ENEMY")) parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, y + h - 1), "ENEMY", Number(String(note).match(/x(\d+)/)?.[1] || 1)));
    else if (note === "LOOT") parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, y + h - 1), "LOOT"));
    else if (note === "TERMINAL") parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, y + h - 1), "TERMINAL"));
  });

  const centerCol = clamp(Math.floor(cols / 2), 0, cols - 1);
  const centerRow = clamp(Math.floor(rows / 2), 0, rows - 1);
  parts.push(circle(gc(centerCol), gc(centerRow), 26, "#3a3028", "#211b17", 4));
  parts.push(circle(gc(centerCol), gc(centerRow), 12, "#c46d2a", "#6d341d", 2, `opacity="0.85"`));
  parts.push(roomNoteCell(centerCol, Math.max(0, centerRow - 1), "COURTYARD", noteFor(rng, ["ENEMY x3", "PRISONER", "CAMPFIRE"])));

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) reserved.add(`${x}:${y}`);
  parts.unshift(terrainScatter(rng, cols, rows, density * 0.5, palette, reserved));
  return parts.join("");
}

function generateMilitaryBunker(rng, cols, rows, density, palette) {
  const parts = [];
  const left = 1;
  const right = cols - 1;
  const top = 1;
  const bottom = rows - 2;
  const corridorRow = clamp(top + Math.floor((bottom - top) / 2), top + 1, bottom - 1);
  const width = right - left;
  const baseRoomW = Math.max(1, Math.floor(width / 3));

  parts.push(gridRoom(left, top, width, bottom - top, "#87877c", "#44453f"));
  parts.push(rect(gx(left), gy(corridorRow), width * CELL, CELL, "#6d6f68", "#484944", 4));

  const topNames = [["ARMORY", noteFor(rng, ["WEAPONS", "LOOT", "LOCKED"])], ["CONTROL", "TERMINAL"], ["BARRACKS", noteFor(rng, ["ENEMY x2", "BEDS", "EMPTY"])]];
  const bottomNames = [["STORAGE", noteFor(rng, ["LOOT", "AMMO", "JUNK"])], ["GENERATOR", noteFor(rng, ["TERMINAL", "WORKBENCH", "POWER"])], ["MEDICAL", noteFor(rng, ["MEDS", "LOOT", "EMPTY"])]];

  let x = left;
  for (let i = 0; i < 3; i += 1) {
    const remaining = right - x;
    const w = i === 2 ? remaining : Math.min(baseRoomW, remaining - (2 - i));
    const topH = corridorRow - top;
    const bottomY = corridorRow + 1;
    const bottomH = bottom - bottomY;
    if (w <= 0) break;
    if (topH > 0) {
      parts.push(gridRoom(x, top, w, topH, "#86877e", "#4c4d48"));
      parts.push(roomNoteCell(x, top, topNames[i][0], topNames[i][1]));
      parts.push(doorH(x, corridorRow));
      if (topNames[i][1] === "TERMINAL") parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, top + topH - 1), "TERMINAL"));
      if (String(topNames[i][1]).startsWith("ENEMY")) parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, top + topH - 1), "ENEMY", Number(String(topNames[i][1]).match(/x(\d+)/)?.[1] || 1)));
    }
    if (bottomH > 0) {
      parts.push(gridRoom(x, bottomY, w, bottomH, "#7b7d75", "#474943"));
      parts.push(roomNoteCell(x, bottomY, bottomNames[i][0], bottomNames[i][1]));
      parts.push(doorH(x, bottomY));
      if (bottomNames[i][1] === "MEDS") parts.push(markerCell(Math.min(cols - 1, x + w - 1), Math.min(rows - 1, bottomY + bottomH - 1), "MEDS"));
    }
    x += w;
  }

  const entryCol = clamp(Math.floor((left + right) / 2), left, right - 1);
  parts.push(doorH(entryCol, bottom, "BULKHEAD"));
  if (bottom + 1 < rows) parts.push(entryArrowCell(entryCol, bottom + 1, "up", "ENTRY"));
  parts.push(text((gx(left) + gx(right)) / 2, gc(corridorRow), "MAIN CORRIDOR", 14, { fill: "#363a35", opacity: 0.72, weight: 900 }));

  const reserved = new Set();
  for (let y = top; y < bottom; y += 1) for (let xx = left; xx < right; xx += 1) reserved.add(`${xx}:${y}`);
  parts.unshift(terrainScatter(rng, cols, rows, density * 0.35, palette, reserved));
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
    version: 3,
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
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${spec.cols}x${spec.rows}:${spec.density.toFixed(2)}:v3-grid-aware`));
  const palette = {
    ground: pick(rng, ["#9b8663", "#927b59", "#a18a64"]),
    ground2: pick(rng, ["#796a52", "#806d51", "#74634d"]),
    rocks: ["#5f594c", "#6d6453", "#514d43", "#776c59"],
  };

  let content = "";
  if (spec.type === "red_rocket") content = generateRedRocket(rng, spec.cols, spec.rows, spec.density, palette);
  else if (spec.type === "super_duper_mart") content = generateSuperDuperMart(rng, spec.cols, spec.rows, spec.density, palette);
  else if (spec.type === "raider_camp") content = generateRaiderCamp(rng, spec.cols, spec.rows, spec.density, palette);
  else if (spec.type === "military_bunker") content = generateMilitaryBunker(rng, spec.cols, spec.rows, spec.density, palette);
  else content = generateWasteland(rng, spec.cols, spec.rows, spec.density, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.ground}"/><stop offset="1" stop-color="${palette.ground2}"/></linearGradient><pattern id="grain" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="2" fill="#2f2a23" opacity="0.12"/><circle cx="34" cy="29" r="1.6" fill="#d1b77e" opacity="0.09"/><path d="M4 42L18 37M29 7L43 3" stroke="#41382c" stroke-width="1.2" opacity="0.10"/></pattern></defs>${rect(0, 0, width, height, "url(#ground)")}${rect(0, 0, width, height, "url(#grain)")}${content}<rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#3a3229" stroke-width="8" opacity="0.55"/></svg>`;
}

export function generateProceduralMapDataUrl(input = {}) {
  const svg = generateProceduralMapSvg(input);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export { MAP_TYPES };
