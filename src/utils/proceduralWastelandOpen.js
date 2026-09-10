const CELL = 100;
const GRID = 24;

function clamp(v, min, max) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function hashSeed(value) { const s = String(value ?? "0"); let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randint(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function pick(rng, list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }
function ellipse(cx, cy, rx, ry, fill, stroke = "none", sw = 0) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`; }
function overlaps(a, b, pad = 0) { return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y); }

function roadProfile(rng) {
  const roll = rng();
  const type = roll < 0.36 ? "none" : roll < 0.61 ? "single" : roll < 0.86 ? "cross" : "fragments";
  return { type, surface: pick(rng, ["asphalt", "dirt", "cobblestone"]) };
}

function roadRects(profile, rng) {
  const roads = [];
  const cx = clamp(12 + randint(rng, -3, 3), 4, 19);
  const cy = clamp(12 + randint(rng, -3, 3), 4, 19);
  const width = 2;
  if (profile.type === "single") {
    if (rng() < 0.5) roads.push({ x: cx, y: 0, w: width, h: GRID });
    else roads.push({ x: 0, y: cy, w: GRID, h: width });
  } else if (profile.type === "cross") {
    roads.push({ x: cx, y: 0, w: width, h: GRID });
    roads.push({ x: 0, y: cy, w: GRID, h: width });
  } else if (profile.type === "fragments") {
    const vertical = rng() < 0.5;
    if (vertical) {
      roads.push({ x: cx, y: 0, w: width, h: randint(rng, 5, 9) });
      roads.push({ x: cx, y: randint(rng, 13, 17), w: width, h: randint(rng, 5, 8) });
    } else {
      roads.push({ x: 0, y: cy, w: randint(rng, 5, 9), h: width });
      roads.push({ x: randint(rng, 13, 17), y: cy, w: randint(rng, 5, 8), h: width });
    }
  }
  return roads;
}

function placeItem(rng, occupied, itemFactory, pad = 1, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const item = itemFactory();
    if (occupied.some((o) => overlaps(item, o, pad))) continue;
    occupied.push(item);
    return item;
  }
  return null;
}

function placeObstacles(rng, occupied) {
  const out = [];
  for (let i = 0; i < randint(rng, 1, 3); i += 1) {
    const type = pick(rng, ["cliff", "rocks", "crater", "ravine"]);
    const item = placeItem(rng, occupied, () => {
      const w = type === "ravine" ? randint(rng, 5, 7) : type === "cliff" ? randint(rng, 4, 6) : randint(rng, 3, 5);
      const h = type === "ravine" ? randint(rng, 2, 4) : type === "cliff" ? randint(rng, 4, 6) : randint(rng, 3, 5);
      return { type, sprite: randint(rng, 0, 2), x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h, rot: randint(rng, 0, 3) * 90, impassable: true };
    }, 1);
    if (item) out.push(item);
  }
  return out;
}

function placeVehicles(rng, occupied, roads) {
  const out = [];
  const placeVehicle = (type, w, h) => placeItem(rng, occupied, () => {
    let x = randint(rng, 1, GRID - w - 1), y = randint(rng, 1, GRID - h - 1), rot = pick(rng, [0, 90, 180, 270]);
    if (roads.length && rng() < 0.68) {
      const road = pick(rng, roads);
      if (road.w >= road.h) {
        x = clamp(randint(rng, road.x, road.x + Math.max(0, road.w - 1)), 1, GRID - w - 1);
        y = clamp(road.y + (rng() < 0.5 ? -h : road.h), 1, GRID - h - 1);
        rot = pick(rng, [0, 180]);
      } else {
        y = clamp(randint(rng, road.y, road.y + Math.max(0, road.h - 1)), 1, GRID - h - 1);
        x = clamp(road.x + (rng() < 0.5 ? -w : road.w), 1, GRID - w - 1);
        rot = pick(rng, [90, 270]);
      }
    }
    return { type, sprite: randint(rng, 0, 2), x, y, w, h, rot, impassable: false };
  }, 0, 90);
  for (let i = 0; i < randint(rng, 1, 4); i += 1) { const item = placeVehicle("wreck_car", 2, 1); if (item) out.push(item); }
  for (let i = 0; i < randint(rng, 0, 2); i += 1) { const item = placeVehicle("wreck_truck", 3, 2); if (item) out.push(item); }
  return out;
}

function placeTrees(rng, occupied) {
  const out = [];
  for (let i = 0; i < randint(rng, 1, 4); i += 1) {
    const item = placeItem(rng, occupied, () => ({ type: "dead_tree", sprite: randint(rng, 0, 2), x: randint(rng, 1, GRID - 3), y: randint(rng, 1, GRID - 3), w: 2, h: 2, rot: randint(rng, 0, 3) * 90 }), 0, 70);
    if (item) out.push(item);
  }
  return out;
}

function roadSvg(road, surface) {
  const x = road.x * CELL, y = road.y * CELL, w = road.w * CELL, h = road.h * CELL;
  if (surface === "dirt") return rect(x, y, w, h, "#8a7658", "#5d503e", 4, 0, 'opacity="0.95"');
  if (surface === "cobblestone") {
    let out = rect(x, y, w, h, "#77736b", "#514e48", 4);
    for (let yy = y; yy < y + h; yy += 26) out += line(x, yy, x + w, yy, "#918b80", 1);
    for (let xx = x; xx < x + w; xx += 34) out += line(xx, y, xx, y + h, "#5f5b54", 1);
    return out;
  }
  return `${rect(x, y, w, h, "#555654", "#3e403e", 4)}${w > h ? line(x, y + h / 2, x + w, y + h / 2, "#918a70", 3, "28 24") : line(x + w / 2, y, x + w / 2, y + h, "#918a70", 3, "28 24")}`;
}

function obstacleSvg(obj) {
  if (obj.type === "cliff" || obj.type === "rocks" || obj.type === "crater") return "";
  const x = obj.x * CELL, y = obj.y * CELL, w = obj.w * CELL, h = obj.h * CELL;
  const pts = [`${x + 10},${y + h * 0.2}`, `${x + w * 0.25},${y + h * 0.44}`, `${x + w * 0.52},${y + h * 0.28}`, `${x + w - 10},${y + h * 0.7}`, `${x + w * 0.58},${y + h - 10}`, `${x + w * 0.2},${y + h * 0.72}`].join(" ");
  return `<polygon points="${pts}" fill="#3b3731" stroke="#26231f" stroke-width="12"/>`;
}

function scatterSvg(rng, blocked) {
  let out = "";
  for (let i = 0; i < 70; i += 1) {
    const gx = randint(rng, 0, GRID - 1), gy = randint(rng, 0, GRID - 1);
    if (blocked.some((o) => gx >= o.x && gx < o.x + o.w && gy >= o.y && gy < o.y + o.h)) continue;
    const cx = (gx + 0.25 + rng() * 0.5) * CELL, cy = (gy + 0.25 + rng() * 0.5) * CELL, r = 3 + rng() * 8;
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${rng() > 0.5 ? "#5b5549" : "#817660"}" opacity="0.75"/>`;
  }
  return out;
}

export function buildOpenWastelandSite(spec = {}) {
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:24x24:open-wasteland-assets-v3`));
  const profile = roadProfile(rng);
  const roads = roadRects(profile, rng);
  const occupied = [...roads];
  const obstacles = placeObstacles(rng, occupied);
  const vehicles = placeVehicles(rng, occupied, roads);
  const trees = placeTrees(rng, occupied);
  return { cols: GRID, rows: GRID, profile, roads, obstacles, ruins: [], vehicles, trees };
}

export function buildOpenWastelandRoomLayout() { return []; }
export function buildOpenWastelandRoomBlueprints() { return []; }

export function generateOpenWastelandSvg(input = {}) {
  const site = buildOpenWastelandSite(input);
  const rng = mulberry32(hashSeed(`${input.seed || "1"}:24x24:open-wasteland-assets-render-v3`));
  const width = GRID * CELL, height = GRID * CELL;
  const blocked = [...site.roads, ...site.obstacles, ...site.vehicles, ...site.trees];
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  out.push(rect(0, 0, width, height, "#756b58"));
  out.push(scatterSvg(rng, blocked));
  site.roads.forEach((road) => out.push(roadSvg(road, site.profile.surface)));
  site.obstacles.forEach((obj) => out.push(obstacleSvg(obj)));
  out.push(rect(18, 18, 500, 42, "#d2c3a2", "#40372e", 2, 4, 'opacity="0.93"'));
  out.push(`<text x="34" y="40" text-anchor="start" dominant-baseline="middle" fill="#332d27" font-family="monospace" font-size="11" font-weight="900">WASTELAND // 24x24 // ${site.profile.type.toUpperCase()}${site.profile.type !== "none" ? ` // ${site.profile.surface.toUpperCase()}` : ""}</text>`);
  out.push("</svg>");
  return out.join("");
}
