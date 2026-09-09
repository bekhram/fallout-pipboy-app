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

function int(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

function pick(rng, values) {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
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

function polygon(points, fill, stroke = "none", sw = 0, extra = "") {
  const value = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return `<polygon points="${value}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function terrainScatter(rng, width, height, density, palette) {
  const parts = [];
  const rockCount = Math.round(18 + density * 34);
  for (let i = 0; i < rockCount; i += 1) {
    const x = range(rng, 24, width - 24);
    const y = range(rng, 24, height - 24);
    const r = range(rng, 4, 14);
    parts.push(circle(x, y, r, pick(rng, palette.rocks), "#302a22", 1.5, `opacity="${range(rng, 0.45, 0.85).toFixed(2)}"`));
  }
  const crackCount = Math.round(8 + density * 18);
  for (let i = 0; i < crackCount; i += 1) {
    const x = range(rng, 0, width);
    const y = range(rng, 0, height);
    const len = range(rng, 24, 70);
    const angle = range(rng, 0, Math.PI * 2);
    parts.push(line(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len, "#3c3228", range(rng, 1.2, 2.8), "7 9"));
  }
  return parts.join("");
}

function vehicle(rng, x, y, scale = 1, rotation = 0) {
  const w = 54 * scale;
  const h = 30 * scale;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation.toFixed(1)})">${rect(-w / 2, -h / 2, w, h, pick(rng, ["#744637", "#5e6c62", "#696046", "#714b35"]), "#2d2723", 3, 5)}${rect(-w * 0.18, -h * 0.4, w * 0.36, h * 0.8, "#2a3434", "#1b2020", 1.5, 3)}${circle(-w * 0.28, -h * 0.58, 5 * scale, "#171717")}${circle(w * 0.28, -h * 0.58, 5 * scale, "#171717")}${circle(-w * 0.28, h * 0.58, 5 * scale, "#171717")}${circle(w * 0.28, h * 0.58, 5 * scale, "#171717")}</g>`;
}

function roomLabel(x, y, text) {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#5d5241" opacity="0.55" font-family="monospace" font-size="18" font-weight="700">${escapeText(text)}</text>`;
}

function buildingShell(x, y, w, h, floor = "#8b826e", wall = "#51483c") {
  return `${rect(x, y, w, h, floor, wall, 12, 2)}${rect(x + 12, y + 12, w - 24, h - 24, "none", "#aaa08a", 2, 0, `opacity="0.35"`)}`;
}

function generateWasteland(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density, palette)];
  const roadVertical = rng() > 0.5;
  const roadCenter = roadVertical ? range(rng, width * 0.32, width * 0.68) : range(rng, height * 0.32, height * 0.68);
  if (roadVertical) {
    parts.push(rect(roadCenter - width * 0.11, -20, width * 0.22, height + 40, "#555047", "#403b35", 4));
    parts.push(line(roadCenter, 0, roadCenter, height, "#b69a50", 4, "22 20"));
  } else {
    parts.push(rect(-20, roadCenter - height * 0.11, width + 40, height * 0.22, "#555047", "#403b35", 4));
    parts.push(line(0, roadCenter, width, roadCenter, "#b69a50", 4, "22 20"));
  }
  const ruins = Math.round(2 + density * 5);
  for (let i = 0; i < ruins; i += 1) {
    const w = range(rng, 70, 150);
    const h = range(rng, 60, 130);
    const x = range(rng, 20, width - w - 20);
    const y = range(rng, 20, height - h - 20);
    parts.push(rect(x, y, w, h, "#776c59", "#4d4438", 7, 1, `opacity="${range(rng, 0.55, 0.82).toFixed(2)}"`));
    if (rng() > 0.45) parts.push(rect(x + w * 0.18, y + h * 0.18, w * 0.48, h * 0.14, "#403a32", "none", 0));
  }
  for (let i = 0; i < 4 + Math.round(density * 5); i += 1) {
    parts.push(vehicle(rng, range(rng, 30, width - 30), range(rng, 30, height - 30), range(rng, 0.7, 1.05), range(rng, -45, 45)));
  }
  return parts.join("");
}

function generateRedRocket(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density * 0.55, palette)];
  const roadH = height * 0.24;
  parts.push(rect(0, height - roadH, width, roadH, "#514d47", "#3a3631", 4));
  parts.push(line(0, height - roadH * 0.48, width, height - roadH * 0.48, "#b79b51", 4, "26 22"));

  const bx = width * 0.42;
  const by = height * 0.12;
  const bw = width * 0.48;
  const bh = height * 0.48;
  parts.push(buildingShell(bx, by, bw, bh, "#817765", "#484139"));
  parts.push(rect(bx + bw * 0.04, by + bh * 0.06, bw * 0.5, bh * 0.54, "#a38f78", "#554a3d", 5));
  parts.push(roomLabel(bx + bw * 0.29, by + bh * 0.33, "STORE"));
  parts.push(rect(bx + bw * 0.57, by + bh * 0.06, bw * 0.38, bh * 0.54, "#77766e", "#514d46", 5));
  parts.push(roomLabel(bx + bw * 0.76, by + bh * 0.33, "GARAGE"));
  parts.push(rect(bx + bw * 0.04, by + bh * 0.64, bw * 0.24, bh * 0.3, "#766f62", "#4d463c", 5));
  parts.push(roomLabel(bx + bw * 0.16, by + bh * 0.79, "OFFICE"));
  parts.push(rect(bx + bw * 0.31, by + bh * 0.64, bw * 0.28, bh * 0.3, "#70695e", "#4d463c", 5));
  parts.push(roomLabel(bx + bw * 0.45, by + bh * 0.79, "STORAGE"));
  parts.push(rect(bx + bw * 0.62, by + bh * 0.64, bw * 0.14, bh * 0.3, "#6b675f", "#4d463c", 5));
  parts.push(roomLabel(bx + bw * 0.69, by + bh * 0.79, "WC"));

  for (let i = 0; i < 3; i += 1) {
    const sy = by + bh * (0.16 + i * 0.14);
    parts.push(rect(bx + bw * 0.12, sy, bw * 0.32, 12, "#4e463b", "#312c26", 1.5, 2));
  }
  parts.push(vehicle(rng, bx + bw * 0.76, by + bh * 0.33, 1.1, 90));

  const canopyX = width * 0.08;
  const canopyY = height * 0.18;
  const canopyW = width * 0.28;
  const canopyH = height * 0.32;
  parts.push(rect(canopyX, canopyY, canopyW, canopyH, "#6d655a", "#433d35", 7, 10, `opacity="0.82"`));
  for (let py = 0; py < 2; py += 1) for (let px = 0; px < 2; px += 1) {
    const x = canopyX + canopyW * (0.3 + px * 0.4);
    const y = canopyY + canopyH * (0.32 + py * 0.38);
    parts.push(rect(x - 12, y - 20, 24, 40, "#8c3f32", "#4e2b28", 3, 4));
  }
  const rocketX = canopyX + canopyW * 0.05;
  const rocketY = canopyY + canopyH * 0.14;
  parts.push(circle(rocketX, rocketY, 38, "#50483d", "#332d28", 4));
  parts.push(polygon([[rocketX, rocketY - 52], [rocketX - 16, rocketY + 30], [rocketX, rocketY + 18], [rocketX + 16, rocketY + 30]], "#9f3e31", "#552820", 3));
  parts.push(`<text x="${(bx + bw * 0.5).toFixed(1)}" y="${(by - 18).toFixed(1)}" text-anchor="middle" fill="#a84b38" stroke="#3d251e" stroke-width="1" font-family="monospace" font-size="30" font-weight="900">RED ROCKET</text>`);
  for (let i = 0; i < 3 + Math.round(density * 3); i += 1) parts.push(vehicle(rng, range(rng, 30, width - 30), range(rng, height * 0.62, height - 30), range(rng, 0.7, 1), range(rng, -35, 35)));
  return parts.join("");
}

function generateSuperDuperMart(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density * 0.4, palette)];
  const parkingY = height * 0.7;
  parts.push(rect(0, parkingY, width, height - parkingY, "#53504a", "#393633", 4));
  for (let i = 1; i < 8; i += 1) parts.push(line(width * (i / 8), parkingY + 20, width * (i / 8), height - 20, "#9d8d67", 2, "16 10"));

  const bx = width * 0.08;
  const by = height * 0.08;
  const bw = width * 0.84;
  const bh = height * 0.57;
  parts.push(buildingShell(bx, by, bw, bh, "#8d8778", "#49433b"));
  const storageW = bw * 0.24;
  parts.push(rect(bx + bw - storageW - 14, by + 14, storageW, bh - 28, "#716c62", "#4c473f", 5));
  parts.push(roomLabel(bx + bw - storageW / 2 - 14, by + bh * 0.5, "STORAGE"));
  const salesW = bw - storageW - 42;
  for (let i = 0; i < 5; i += 1) {
    const sx = bx + 48 + (salesW - 90) * (i / 4);
    parts.push(rect(sx, by + bh * 0.22, 18, bh * 0.48, "#4f473b", "#302a24", 2, 2));
  }
  for (let i = 0; i < 4; i += 1) {
    parts.push(rect(bx + 34 + i * 62, by + bh - 70, 44, 28, "#665d50", "#403930", 3, 3));
  }
  parts.push(roomLabel(bx + salesW * 0.46, by + 52, "SUPER-DUPER MART"));
  for (let i = 0; i < 3 + Math.round(density * 4); i += 1) parts.push(vehicle(rng, range(rng, 60, width - 60), range(rng, parkingY + 30, height - 30), range(rng, 0.7, 1), rng() > 0.5 ? 0 : 180));
  return parts.join("");
}

function generateRaiderCamp(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density, palette)];
  const cx = width * 0.5;
  const cy = height * 0.5;
  const rx = width * 0.38;
  const ry = height * 0.36;
  const segments = 18;
  for (let i = 0; i < segments; i += 1) {
    const a1 = (Math.PI * 2 * i) / segments;
    const a2 = (Math.PI * 2 * (i + 0.75)) / segments;
    const p1 = [cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry];
    const p2 = [cx + Math.cos(a2) * rx, cy + Math.sin(a2) * ry];
    parts.push(line(p1[0], p1[1], p2[0], p2[1], pick(rng, ["#4e493e", "#6b543f", "#5d4b3c"]), range(rng, 9, 15)));
  }
  const shackCount = 3 + Math.round(density * 4);
  for (let i = 0; i < shackCount; i += 1) {
    const w = range(rng, 70, 120);
    const h = range(rng, 55, 100);
    const x = range(rng, cx - rx * 0.7, cx + rx * 0.7 - w);
    const y = range(rng, cy - ry * 0.65, cy + ry * 0.65 - h);
    parts.push(rect(x, y, w, h, pick(rng, ["#76583f", "#6a6250", "#654a38"]), "#3d342b", 5, 3));
  }
  for (let i = 0; i < 2 + Math.round(density * 3); i += 1) {
    const x = range(rng, cx - rx * 0.5, cx + rx * 0.5);
    const y = range(rng, cy - ry * 0.5, cy + ry * 0.5);
    parts.push(circle(x, y, 22, "#3a3028", "#211b17", 4));
    parts.push(circle(x, y, 10, "#c46d2a", "#6d341d", 2, `opacity="0.85"`));
  }
  for (let i = 0; i < 4; i += 1) parts.push(rect(range(rng, cx - rx * 0.55, cx + rx * 0.55), range(rng, cy - ry * 0.55, cy + ry * 0.55), range(rng, 28, 62), range(rng, 16, 28), "#4b4439", "#302a24", 2, 2));
  return parts.join("");
}

function generateMilitaryBunker(rng, width, height, density, palette) {
  const parts = [terrainScatter(rng, width, height, density * 0.55, palette)];
  const bx = width * 0.16;
  const by = height * 0.16;
  const bw = width * 0.68;
  const bh = height * 0.62;
  parts.push(rect(bx - 18, by - 18, bw + 36, bh + 36, "#55564e", "#35362f", 8, 12));
  parts.push(buildingShell(bx, by, bw, bh, "#77776d", "#44453f"));
  const corridorH = bh * 0.18;
  parts.push(rect(bx + 18, by + bh * 0.41, bw - 36, corridorH, "#686a63", "#484944", 4));
  const roomW = (bw - 52) / 3;
  for (let i = 0; i < 3; i += 1) {
    const x = bx + 18 + i * (roomW + 8);
    parts.push(rect(x, by + 18, roomW, bh * 0.32, "#73746d", "#4c4d48", 5));
    parts.push(roomLabel(x + roomW / 2, by + bh * 0.17, ["ARMORY", "CONTROL", "BARRACKS"][i]));
    parts.push(rect(x, by + bh * 0.64, roomW, bh * 0.28, "#6b6d66", "#474943", 5));
    parts.push(roomLabel(x + roomW / 2, by + bh * 0.78, ["STORAGE", "GENERATOR", "MEDICAL"][i]));
  }
  parts.push(rect(bx + bw * 0.44, by + bh - 10, bw * 0.12, 44, "#41433e", "#2b2d29", 5, 3));
  parts.push(line(bx + bw * 0.5, by + bh + 34, bx + bw * 0.5, height, "#57564f", 32));
  for (let i = 0; i < 4 + Math.round(density * 4); i += 1) {
    const x = range(rng, 20, width - 20);
    const y = range(rng, 20, height - 20);
    parts.push(rect(x, y, range(rng, 32, 56), range(rng, 18, 28), "#5a5a51", "#383832", 2, 2));
  }
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
    version: 1,
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
  const rng = mulberry32(hashSeed(`${spec.type}:${spec.seed}:${spec.cols}x${spec.rows}:${spec.density.toFixed(2)}`));
  const palette = {
    ground: pick(rng, ["#8b7656", "#806b4e", "#917a57"]),
    ground2: pick(rng, ["#6e604b", "#77664c", "#6b5b45"]),
    rocks: ["#5f594c", "#6d6453", "#514d43", "#776c59"],
  };

  let content = "";
  if (spec.type === "red_rocket") content = generateRedRocket(rng, width, height, spec.density, palette);
  else if (spec.type === "super_duper_mart") content = generateSuperDuperMart(rng, width, height, spec.density, palette);
  else if (spec.type === "raider_camp") content = generateRaiderCamp(rng, width, height, spec.density, palette);
  else if (spec.type === "military_bunker") content = generateMilitaryBunker(rng, width, height, spec.density, palette);
  else content = generateWasteland(rng, width, height, spec.density, palette);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ground" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${palette.ground}"/><stop offset="1" stop-color="${palette.ground2}"/></linearGradient><pattern id="grain" width="48" height="48" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="2" fill="#2f2a23" opacity="0.18"/><circle cx="34" cy="29" r="1.6" fill="#d1b77e" opacity="0.12"/><path d="M4 42L18 37M29 7L43 3" stroke="#41382c" stroke-width="1.4" opacity="0.14"/></pattern></defs>${rect(0, 0, width, height, "url(#ground)")}${rect(0, 0, width, height, "url(#grain)")}${content}<rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#3a3229" stroke-width="8" opacity="0.55"/></svg>`;
}

export function generateProceduralMapDataUrl(input = {}) {
  const svg = generateProceduralMapSvg(input);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export { MAP_TYPES };
