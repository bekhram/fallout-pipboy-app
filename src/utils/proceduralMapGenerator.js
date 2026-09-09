const MAP_TYPES = ["wasteland", "red_rocket", "super_duper_mart", "raider_camp", "military_bunker"];

const LOCATION_TYPE_BY_MAP = {
  wasteland: "wasteland",
  red_rocket: "red_rocket",
  super_duper_mart: "super_duper_mart",
  raider_camp: "raider_camp",
  military_bunker: "military_bunker",
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
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function circle(cx, cy, r, fill, stroke = "none", sw = 0, extra = "") {
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
}

function text(x, y, value, size = 18, options = {}) {
  const { fill = "#40382f", opacity = 0.9, weight = 700, anchor = "middle" } = options;
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${fill}" opacity="${opacity}" font-family="monospace" font-size="${size}" font-weight="${weight}">${escapeText(value)}</text>`;
}

function roomTag(x, y, title, note = "") {
  const width = Math.max(82, Math.min(190, Math.max(title.length * 11, note.length * 9) + 24));
  const height = note ? 46 : 28;
  return `<g>${rect(x - width / 2, y - height / 2, width, height, "#d7c7a5", "#554a3e", 2, 5, `opacity="0.90"`)}${text(x, y - (note ? 8 : 0), title, 15, { fill: "#332c25", opacity: 1, weight: 900 })}${note ? text(x, y + 11, note, 11, { fill: "#5a3f2f", opacity: 1, weight: 800 }) : ""}</g>`;
}

function marker(x, y, type, count = 1) {
  const label = count > 1 ? `${type} x${count}` : type;
  const fill = type === "ENEMY" ? "#8b3f32" : type === "TERMINAL" ? "#42695a" : type === "LOOT" ? "#806b3f" : type === "MEDS" ? "#6b7456" : "#5c554a";
  return `<g>${circle(x, y, 13, fill, "#2f2923", 3)}${text(x, y + 1, type === "TERMINAL" ? "T" : type === "LOOT" ? "$" : type === "ENEMY" ? "!" : type === "MEDS" ? "+" : "•", 13, { fill: "#eee2c6", opacity: 1, weight: 900 })}${text(x, y + 25, label, 10, { fill: "#382f28", opacity: 0.9, weight: 800 })}</g>`;
}

function doorHorizontal(x, y, width = 42, label = "") {
  const half = width / 2;
  return `<g>${line(x - half - 8, y, x - half, y, "#51483c", 12)}${line(x + half, y, x + half + 8, y, "#51483c", 12)}${line(x - half, y, x + half, y, "#eadcbd", 6)}${line(x - half, y, x - half, y - width * 0.7, "#4a4036", 4)}<path d="M ${x - half} ${y - width * 0.7} A ${width * 0.7} ${width * 0.7} 0 0 1 ${x + half * 0.4} ${y}" fill="none" stroke="#6b5a49" stroke-width="2" stroke-dasharray="5 5"/>${label ? text(x, y + 18, label, 10, { fill: "#362f28", opacity: 1, weight: 900 }) : ""}</g>`;
}

function doorVertical(x, y, width = 42, label = "") {
  const half = width / 2;
  return `<g>${line(x, y - half - 8, x, y - half, "#51483c", 12)}${line(x, y + half, x, y + half + 8, "#51483c", 12)}${line(x, y - half, x, y + half, "#eadcbd", 6)}${line(x, y - half, x + width * 0.7, y - half, "#4a4036", 4)}<path d="M ${x + width * 0.7} ${y - half} A ${width * 0.7} ${width * 0.7} 0 0 1 ${x} ${y + half * 0.4}" fill="none" stroke="#6b5a49" stroke-width="2" stroke-dasharray="5 5"/>${label ? text(x + 27, y, label, 10, { fill: "#362f28", opacity: 1, weight: 900, anchor: "start" }) : ""}</g>`;
}

function entryArrow(x, y, direction = "up", label = "ENTRY") {
  const rotations = { up: 0, right: 90, down: 180, left: -90 };
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotations[direction] || 0})"><path d="M0 -30 L-16 -7 L-7 -7 L-7 20 L7 20 L7 -7 L16 -7 Z" fill="#9b3f31" stroke="#432a23" stroke-width="3"/></g>${text(x, y + (direction === "up" ? 38 : direction === "down" ? -38 : 0), label, 13, { fill: "#5d2d25", opacity: 1, weight: 900 })}`;
}

function terrainScatter(rng, width, height, density, palette) {
  const parts = [];
  const rockCount = Math.round(10 + density * 20);
  for (let i = 0; i < rockCount; i += 1) {
    parts.push(circle(range(rng, 24, width - 24), range(rng, 24, height - 24), range(rng, 4, 11), pick(rng, palette.rocks), "#302a22", 1.2, `opacity="${range(rng, 0.35, 0.65).toFixed(2)}"`));
  }
  const crackCount = Math.round(4 + density * 9);
  for (let i = 0; i < crackCount; i += 1) {
    const x = range(rng, 0, width);
    const y = range(rng, 0, height);
    const len = range(rng, 24, 65);
    const angle = range(rng, 0, Math.PI * 2);
    parts.push(line(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len, "#3c3228", range(rng, 1, 2), "6 9"));
  }
  return parts.join("");
}

function vehicle(rng, x, y, scale = 1, rotation = 0) {
  const w = 52 * scale;
  const h = 29 * scale;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation.toFixed(1)})">${rect(-w / 2, -h / 2, w, h, pick(rng, ["#744637", "#5e6c62", "#696046", "#714b35"]), "#2d2723", 3, 5)}${rect(-w * 0.18, -h * 0.4, w * 0.36, h * 0.8, "#2a3434", "#1b2020", 1.5, 3)}</g>`;
}

function buildingShell(x, y, w, h, floor = "#a79b83", wall = "#51483c") {
  return `${rect(x, y, w, h, floor, wall, 12, 2)}${rect(x + 11, y + 11, w - 22, h - 22, "none", "#c7b997", 2, 0, `opacity="0.45"`)}`;
}

function noteFor(rng, values) {
  return pick(rng, values);
}

function generateWasteland(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density, palette)];
  const vertical = rng() > 0.5;
  const roadCenter = vertical ? range(rng, width * 0.34, width * 0.66) : range(rng, height * 0.34, height * 0.66);
  if (vertical) {
    parts.push(rect(roadCenter - width * 0.1, -20, width * 0.2, height + 40, "#555047", "#403b35", 4));
    parts.push(line(roadCenter, 0, roadCenter, height, "#b69a50", 4, "22 20"));
    parts.push(entryArrow(roadCenter, height - 65, "up", "ENTRY"));
  } else {
    parts.push(rect(-20, roadCenter - height * 0.1, width + 40, height * 0.2, "#555047", "#403b35", 4));
    parts.push(line(0, roadCenter, width, roadCenter, "#b69a50", 4, "22 20"));
    parts.push(entryArrow(65, roadCenter, "right", "ENTRY"));
  }
  const zones = [
    { x: width * 0.2, y: height * 0.23, title: "RUINS", note: noteFor(rng, ["LOOT", "ENEMY x2", "EMPTY"]) },
    { x: width * 0.78, y: height * 0.25, title: "WRECK", note: noteFor(rng, ["LOOT", "MEDS", "TRAP"]) },
    { x: width * 0.74, y: height * 0.72, title: "CAMP", note: noteFor(rng, ["ENEMY x2", "CAMPFIRE", "CACHE"]) },
  ];
  zones.forEach((zone) => {
    parts.push(rect(zone.x - 70, zone.y - 50, 140, 100, "#776c59", "#4d4438", 7, 3, `opacity="0.75"`));
    parts.push(roomTag(zone.x, zone.y, zone.title, zone.note));
    if (zone.note.startsWith("ENEMY")) parts.push(marker(zone.x, zone.y + 56, "ENEMY", Number(zone.note.match(/x(\d+)/)?.[1] || 1)));
    if (zone.note === "LOOT" || zone.note === "CACHE") parts.push(marker(zone.x, zone.y + 56, "LOOT"));
    if (zone.note === "MEDS") parts.push(marker(zone.x, zone.y + 56, "MEDS"));
  });
  for (let i = 0; i < 3 + Math.round(density * 3); i += 1) parts.push(vehicle(rng, range(rng, 40, width - 40), range(rng, 40, height - 40), range(rng, 0.7, 1), range(rng, -40, 40)));
  return parts.join("");
}

function generateRedRocket(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density * 0.45, palette)];
  const roadH = height * 0.22;
  parts.push(rect(0, height - roadH, width, roadH, "#514d47", "#3a3631", 4));
  parts.push(line(0, height - roadH * 0.5, width, height - roadH * 0.5, "#b79b51", 4, "26 22"));

  const bx = width * 0.40;
  const by = height * 0.10;
  const bw = width * 0.50;
  const bh = height * 0.53;
  parts.push(buildingShell(bx, by, bw, bh, "#9b907a", "#484139"));

  const store = { x: bx + bw * 0.04, y: by + bh * 0.05, w: bw * 0.48, h: bh * 0.55 };
  const garage = { x: bx + bw * 0.56, y: by + bh * 0.05, w: bw * 0.39, h: bh * 0.55 };
  const office = { x: bx + bw * 0.04, y: by + bh * 0.64, w: bw * 0.23, h: bh * 0.31 };
  const storage = { x: bx + bw * 0.31, y: by + bh * 0.64, w: bw * 0.27, h: bh * 0.31 };
  const wc = { x: bx + bw * 0.62, y: by + bh * 0.64, w: bw * 0.14, h: bh * 0.31 };

  [
    [store, "STORE", noteFor(rng, ["LOOT", "ENEMY x2", "CASH REGISTER"])],
    [garage, "GARAGE", noteFor(rng, ["WORKBENCH", "ENEMY", "TOOLS"])],
    [office, "OFFICE", "TERMINAL"],
    [storage, "STORAGE", noteFor(rng, ["LOOT", "LOCKED CACHE", "JUNK"])],
    [wc, "WC", noteFor(rng, ["MEDS", "EMPTY", "STASH"])],
  ].forEach(([room, title, note]) => {
    parts.push(rect(room.x, room.y, room.w, room.h, "#a99c84", "#554a3d", 5));
    parts.push(roomTag(room.x + room.w / 2, room.y + room.h / 2, title, note));
  });

  for (let i = 0; i < 3; i += 1) parts.push(rect(store.x + store.w * 0.12, store.y + store.h * (0.22 + i * 0.2), store.w * 0.58, 10, "#4e463b", "#312c26", 1.5, 2));
  parts.push(vehicle(rng, garage.x + garage.w * 0.52, garage.y + garage.h * 0.45, 1.05, 90));

  parts.push(doorHorizontal(store.x + store.w * 0.48, store.y + store.h, 46, "MAIN"));
  parts.push(entryArrow(store.x + store.w * 0.48, store.y + store.h + 70, "up", "ENTRY"));
  parts.push(doorHorizontal(garage.x + garage.w * 0.50, garage.y + garage.h, 74, "GARAGE"));
  parts.push(doorHorizontal(office.x + office.w * 0.5, office.y, 34));
  parts.push(doorHorizontal(storage.x + storage.w * 0.5, storage.y, 34));
  parts.push(doorHorizontal(wc.x + wc.w * 0.5, wc.y, 28));
  parts.push(doorVertical(store.x + store.w, store.y + store.h * 0.5, 38));

  parts.push(marker(office.x + office.w * 0.5, office.y + office.h * 0.76, "TERMINAL"));
  if (rng() > 0.45) parts.push(marker(storage.x + storage.w * 0.5, storage.y + storage.h * 0.77, "LOOT"));
  if (rng() > 0.5) parts.push(marker(garage.x + garage.w * 0.52, garage.y + garage.h * 0.78, "ENEMY", 1));

  const canopyX = width * 0.07;
  const canopyY = height * 0.18;
  const canopyW = width * 0.27;
  const canopyH = height * 0.30;
  parts.push(rect(canopyX, canopyY, canopyW, canopyH, "#6d655a", "#433d35", 7, 10, `opacity="0.82"`));
  for (let py = 0; py < 2; py += 1) for (let px = 0; px < 2; px += 1) {
    const x = canopyX + canopyW * (0.3 + px * 0.4);
    const y = canopyY + canopyH * (0.32 + py * 0.38);
    parts.push(rect(x - 12, y - 20, 24, 40, "#8c3f32", "#4e2b28", 3, 4));
  }
  parts.push(text(bx + bw * 0.5, by - 20, "RED ROCKET", 29, { fill: "#8d3c31", opacity: 1, weight: 900 }));
  for (let i = 0; i < 2 + Math.round(density * 2); i += 1) parts.push(vehicle(rng, range(rng, 35, width - 35), range(rng, height * 0.68, height - 35), range(rng, 0.7, 1), range(rng, -30, 30)));
  return parts.join("");
}

function generateSuperDuperMart(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density * 0.35, palette)];
  const parkingY = height * 0.72;
  parts.push(rect(0, parkingY, width, height - parkingY, "#53504a", "#393633", 4));
  for (let i = 1; i < 8; i += 1) parts.push(line(width * (i / 8), parkingY + 20, width * (i / 8), height - 20, "#9d8d67", 2, "16 10"));

  const bx = width * 0.07;
  const by = height * 0.08;
  const bw = width * 0.86;
  const bh = height * 0.58;
  parts.push(buildingShell(bx, by, bw, bh, "#a29a87", "#49433b"));
  const sales = { x: bx + 14, y: by + 14, w: bw * 0.68, h: bh - 28 };
  const storage = { x: bx + bw * 0.72, y: by + 14, w: bw * 0.25, h: bh * 0.56 };
  const office = { x: bx + bw * 0.72, y: by + bh * 0.62, w: bw * 0.25, h: bh * 0.31 };
  parts.push(rect(sales.x, sales.y, sales.w, sales.h, "#ada28b", "#51483d", 5));
  parts.push(rect(storage.x, storage.y, storage.w, storage.h, "#847b6c", "#4c473f", 5));
  parts.push(rect(office.x, office.y, office.w, office.h, "#8d8372", "#4c473f", 5));
  parts.push(roomTag(sales.x + sales.w * 0.5, sales.y + 45, "SALES FLOOR", noteFor(rng, ["ENEMY x2", "LOOT", "SCAVENGERS"])));
  parts.push(roomTag(storage.x + storage.w / 2, storage.y + storage.h / 2, "STORAGE", noteFor(rng, ["LOOT", "LOCKED CACHE", "ENEMY"])));
  parts.push(roomTag(office.x + office.w / 2, office.y + office.h / 2, "OFFICE", "TERMINAL"));
  for (let i = 0; i < 5; i += 1) parts.push(rect(sales.x + sales.w * (0.16 + i * 0.15), sales.y + sales.h * 0.27, 16, sales.h * 0.48, "#4f473b", "#302a24", 2, 2));
  parts.push(doorHorizontal(sales.x + sales.w * 0.46, sales.y + sales.h, 78, "MAIN"));
  parts.push(entryArrow(sales.x + sales.w * 0.46, sales.y + sales.h + 70, "up", "ENTRY"));
  parts.push(doorVertical(storage.x, storage.y + storage.h * 0.45, 38));
  parts.push(doorHorizontal(office.x + office.w * 0.5, office.y, 34));
  parts.push(marker(office.x + office.w * 0.5, office.y + office.h * 0.78, "TERMINAL"));
  if (rng() > 0.4) parts.push(marker(storage.x + storage.w * 0.5, storage.y + storage.h * 0.76, "LOOT"));
  for (let i = 0; i < 2 + Math.round(density * 3); i += 1) parts.push(vehicle(rng, range(rng, 60, width - 60), range(rng, parkingY + 30, height - 30), range(rng, 0.7, 1), rng() > 0.5 ? 0 : 180));
  return parts.join("");
}

function generateRaiderCamp(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density, palette)];
  const cx = width * 0.5;
  const cy = height * 0.5;
  const rx = width * 0.38;
  const ry = height * 0.36;
  const gateCenter = Math.PI / 2;
  const segments = 20;
  for (let i = 0; i < segments; i += 1) {
    const a1 = (Math.PI * 2 * i) / segments;
    const a2 = (Math.PI * 2 * (i + 0.72)) / segments;
    const mid = (a1 + a2) / 2;
    if (Math.abs(mid - gateCenter) < 0.22) continue;
    parts.push(line(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry, cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry, pick(rng, ["#4e493e", "#6b543f", "#5d4b3c"]), range(rng, 9, 14)));
  }
  parts.push(entryArrow(cx, cy + ry + 62, "up", "GATE"));
  parts.push(doorHorizontal(cx, cy + ry, 82, "GATE"));

  const shackData = [
    [cx - rx * 0.48, cy - ry * 0.34, "BARRACK", noteFor(rng, ["ENEMY x2", "BEDS", "LOOT"])],
    [cx + rx * 0.36, cy - ry * 0.31, "BOSS SHACK", noteFor(rng, ["ENEMY", "LOOT", "TERMINAL"])],
    [cx - rx * 0.38, cy + ry * 0.25, "STORAGE", noteFor(rng, ["LOOT", "AMMO", "TRAP"])],
    [cx + rx * 0.38, cy + ry * 0.22, "WORKSHOP", noteFor(rng, ["WORKBENCH", "JUNK", "ENEMY"])],
  ];
  shackData.forEach(([x, y, title, note], index) => {
    const w = width * 0.16;
    const h = height * 0.12;
    parts.push(rect(x - w / 2, y - h / 2, w, h, index % 2 ? "#6a6250" : "#76583f", "#3d342b", 5, 3));
    parts.push(roomTag(x, y, title, note));
    parts.push(doorHorizontal(x, y + h / 2, 32));
    if (String(note).startsWith("ENEMY")) parts.push(marker(x, y + h * 0.9, "ENEMY", Number(String(note).match(/x(\d+)/)?.[1] || 1)));
    if (note === "LOOT") parts.push(marker(x, y + h * 0.9, "LOOT"));
    if (note === "TERMINAL") parts.push(marker(x, y + h * 0.9, "TERMINAL"));
  });
  parts.push(circle(cx, cy, 26, "#3a3028", "#211b17", 4));
  parts.push(circle(cx, cy, 12, "#c46d2a", "#6d341d", 2, `opacity="0.85"`));
  parts.push(roomTag(cx, cy - 60, "COURTYARD", noteFor(rng, ["ENEMY x3", "PRISONER", "CAMPFIRE"])));
  return parts.join("");
}

function generateMilitaryBunker(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density * 0.35, palette)];
  const bx = width * 0.12;
  const by = height * 0.12;
  const bw = width * 0.76;
  const bh = height * 0.68;
  parts.push(rect(bx - 16, by - 16, bw + 32, bh + 32, "#55564e", "#35362f", 8, 12));
  parts.push(buildingShell(bx, by, bw, bh, "#87877c", "#44453f"));
  const corridorY = by + bh * 0.49;
  parts.push(rect(bx + 16, corridorY - 28, bw - 32, 56, "#6d6f68", "#484944", 4));
  const roomW = (bw - 64) / 3;
  const topNames = [["ARMORY", noteFor(rng, ["WEAPONS", "LOOT", "LOCKED"])], ["CONTROL", "TERMINAL"], ["BARRACKS", noteFor(rng, ["ENEMY x2", "BEDS", "EMPTY"])]];
  const bottomNames = [["STORAGE", noteFor(rng, ["LOOT", "AMMO", "JUNK"])], ["GENERATOR", noteFor(rng, ["TERMINAL", "WORKBENCH", "POWER"])], ["MEDICAL", noteFor(rng, ["MEDS", "LOOT", "EMPTY"])]];
  for (let i = 0; i < 3; i += 1) {
    const x = bx + 18 + i * (roomW + 14);
    const top = { x, y: by + 18, w: roomW, h: bh * 0.32 };
    const bottom = { x, y: by + bh * 0.64, w: roomW, h: bh * 0.28 };
    parts.push(rect(top.x, top.y, top.w, top.h, "#86877e", "#4c4d48", 5));
    parts.push(rect(bottom.x, bottom.y, bottom.w, bottom.h, "#7b7d75", "#474943", 5));
    parts.push(roomTag(top.x + top.w / 2, top.y + top.h / 2, topNames[i][0], topNames[i][1]));
    parts.push(roomTag(bottom.x + bottom.w / 2, bottom.y + bottom.h / 2, bottomNames[i][0], bottomNames[i][1]));
    parts.push(doorHorizontal(top.x + top.w / 2, top.y + top.h, 34));
    parts.push(doorHorizontal(bottom.x + bottom.w / 2, bottom.y, 34));
    if (topNames[i][1] === "TERMINAL") parts.push(marker(top.x + top.w * 0.5, top.y + top.h * 0.78, "TERMINAL"));
    if (bottomNames[i][1] === "MEDS") parts.push(marker(bottom.x + bottom.w * 0.5, bottom.y + bottom.h * 0.76, "MEDS"));
  }
  parts.push(doorHorizontal(bx + bw * 0.5, by + bh, 70, "BULKHEAD"));
  parts.push(entryArrow(bx + bw * 0.5, by + bh + 72, "up", "ENTRY"));
  parts.push(text(bx + bw * 0.5, corridorY, "MAIN CORRIDOR", 14, { fill: "#363a35", opacity: 0.7, weight: 900 }));
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
    version: 2,
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
  const width = spec.cols * 100;
  const height = spec.rows * 100;
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${spec.cols}x${spec.rows}:${spec.density.toFixed(2)}:v2`));
  const palette = {
    ground: pick(rng, ["#9b8663", "#927b59", "#a18a64"]),
    ground2: pick(rng, ["#796a52", "#806d51", "#74634d"]),
    rocks: ["#5f594c", "#6d6453", "#514d43", "#776c59"],
  };

  let content = "";
  if (spec.type === "red_rocket") content = generateRedRocket(rng, width, height, spec.density, palette);
  else if (spec.type === "super_duper_mart") content = generateSuperDuperMart(rng, width, height, spec.density, palette);
  else if (spec.type === "raider_camp") content = generateRaiderCamp(rng, width, height, spec.density, palette);
  else if (spec.type === "military_bunker") content = generateMilitaryBunker(rng, width, height, spec.density, palette);
  else content = generateWasteland(rng, width, height, spec.density, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.ground}"/><stop offset="1" stop-color="${palette.ground2}"/></linearGradient><pattern id="grain" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="2" fill="#2f2a23" opacity="0.14"/><circle cx="34" cy="29" r="1.6" fill="#d1b77e" opacity="0.10"/><path d="M4 42L18 37M29 7L43 3" stroke="#41382c" stroke-width="1.2" opacity="0.11"/></pattern></defs>${rect(0, 0, width, height, "url(#ground)")}${rect(0, 0, width, height, "url(#grain)")}${content}<rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#3a3229" stroke-width="8" opacity="0.50"/></svg>`;
}

export function generateProceduralMapDataUrl(input = {}) {
  const svg = generateProceduralMapSvg(input);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export { MAP_TYPES };