const CELL = 100;
const GRID = 24;
const ASSET_GAP = 1;

function clamp(v, min, max) { return Math.max(min, Math.min(max, Number(v) || 0)); }
function hashSeed(value) { const s = String(value ?? "0"); let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randint(rng, min, max) { return Math.floor(min + rng() * (max - min + 1)); }
function pick(rng, list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
function rect(x, y, w, h, fill, stroke = "none", sw = 0, rx = 0, extra = "") { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`; }
function line(x1, y1, x2, y2, stroke, sw = 4, dash = "") { return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`; }
function overlaps(a, b, pad = 0) { return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y); }
function visualCollisionRect(item, width, height) {
  const w = clamp(width, 0.25, GRID), h = clamp(height, 0.25, GRID);
  const initialCenterX = Number(item.x || 0) + Number(item.w || 0) / 2;
  const initialCenterY = Number(item.y || 0) + Number(item.h || 0) / 2;
  const centerX = clamp(initialCenterX, w / 2, GRID - w / 2);
  const centerY = clamp(initialCenterY, h / 2, GRID - h / 2);
  return { x: centerX - w / 2, y: centerY - h / 2, w, h };
}
function withCollisionRect(item, width, height) { return { ...item, collisionRect: visualCollisionRect(item, width, height) }; }

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

function placeItem(rng, occupied, itemFactory, pad = ASSET_GAP, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const item = itemFactory();
    const collisionRect = item.collisionRect || item;
    if (occupied.some((o) => overlaps(collisionRect, o, pad))) continue;
    occupied.push(collisionRect);
    const { collisionRect: _collisionRect, ...placedItem } = item;
    return placedItem;
  }
  return null;
}

function placeTerrain(rng, occupied) {
  const out = [];
  const terrainTypes = ["ruins", "ravine", "lake", "swamp", "hills"];
  const count = randint(rng, 2, 4);
  for (let i = 0; i < count; i += 1) {
    const type = pick(rng, terrainTypes);
    const item = placeItem(rng, occupied, () => {
      let w = 5, h = 5;
      if (type === "ruins") { w = randint(rng, 5, 7); h = randint(rng, 4, 6); }
      if (type === "ravine") { w = randint(rng, 6, 8); h = randint(rng, 3, 5); }
      if (type === "lake") { w = randint(rng, 5, 7); h = randint(rng, 5, 7); }
      if (type === "swamp") { w = randint(rng, 5, 7); h = randint(rng, 4, 7); }
      if (type === "hills") { w = randint(rng, 4, 6); h = randint(rng, 4, 6); }
      return withCollisionRect({ type, sprite: 0, x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h, rot: 0, impassable: type !== "swamp" }, w, h);
    }, ASSET_GAP, 180);
    if (item) out.push(item);
  }
  return out;
}

function placeObstacles(rng, occupied) {
  const out = [];
  for (let i = 0; i < randint(rng, 1, 3); i += 1) {
    const type = pick(rng, ["cliff", "rocks", "crater"]);
    const item = placeItem(rng, occupied, () => {
      const w = type === "cliff" ? randint(rng, 4, 6) : randint(rng, 3, 5);
      const h = type === "cliff" ? randint(rng, 4, 6) : randint(rng, 3, 5);
      const base = { type, sprite: randint(rng, 0, 2), x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h, rot: 0, impassable: true };
      if (type === "cliff") return withCollisionRect(base, w * 2, h * 2);
      if (type === "crater") return withCollisionRect(base, Math.max(4, w * 1.15), Math.max(4, h * 1.15));
      return withCollisionRect(base, w, h);
    }, ASSET_GAP);
    if (item) out.push(item);
  }
  return out;
}

function getVehicleFootprint(type) {
  if (type === "wreck_car") return { w: 2, h: 1 };
  if (type === "wreck_truck") return { w: 4, h: 2 };
  return { w: 1, h: 1 };
}

function placeVehicles(rng, occupied, roads) {
  const out = [];
  const placeVehicle = (type) => placeItem(rng, occupied, () => {
    let road = null;
    if (roads.length && rng() < 0.68) road = pick(rng, roads);
    const { w, h } = getVehicleFootprint(type);
    let x = randint(rng, 1, GRID - w - 1);
    let y = randint(rng, 1, GRID - h - 1);
    if (road) {
      if (road.w >= road.h) {
        x = clamp(randint(rng, road.x, road.x + Math.max(0, road.w - w)), 1, GRID - w - 1);
        y = clamp(road.y + (rng() < 0.5 ? -h - 2 : road.h + 2), 1, GRID - h - 1);
      } else {
        y = clamp(randint(rng, road.y, road.y + Math.max(0, road.h - h)), 1, GRID - h - 1);
        x = clamp(road.x + (rng() < 0.5 ? -w - 2 : road.w + 2), 1, GRID - w - 1);
      }
    }
    const base = { type, sprite: randint(rng, 0, 2), x, y, w, h, rot: 0, impassable: false };
    return type === "wreck_car" ? withCollisionRect(base, 3, 2) : withCollisionRect(base, 5, 3);
  }, ASSET_GAP, 120);
  for (let i = 0; i < randint(rng, 1, 4); i += 1) { const item = placeVehicle("wreck_car"); if (item) out.push(item); }
  for (let i = 0; i < randint(rng, 0, 2); i += 1) { const item = placeVehicle("wreck_truck"); if (item) out.push(item); }
  return out;
}

function placeTrees(rng, occupied) {
  const out = [];
  for (let i = 0; i < randint(rng, 1, 4); i += 1) {
    const item = placeItem(rng, occupied, () => withCollisionRect({ type: "dead_tree", sprite: randint(rng, 0, 2), x: randint(rng, 1, GRID - 3), y: randint(rng, 1, GRID - 3), w: 2, h: 2, rot: 0 }, 3.4, 3.4), ASSET_GAP, 120);
    if (item) out.push(item);
  }
  return out;
}

function roadSvg(road, surface) {
  const x = road.x * CELL, y = road.y * CELL, w = road.w * CELL, h = road.h * CELL;
  if (surface === "dirt") return rect(x, y, w, h, "#765b3a", "#493420", 4, 0, 'opacity="0.92"');
  if (surface === "cobblestone") {
    let out = rect(x, y, w, h, "#59564f", "#34312d", 4, 0, 'opacity="0.94"');
    for (let yy = y; yy < y + h; yy += 26) out += line(x, yy, x + w, yy, "#767167", 1);
    for (let xx = x; xx < x + w; xx += 34) out += line(xx, y, xx, y + h, "#3d3a35", 1);
    return out;
  }
  return `${rect(x, y, w, h, "#3e3f3c", "#232422", 4, 0, 'opacity="0.94"')}${w > h ? line(x, y + h / 2, x + w, y + h / 2, "#aea06f", 3, "28 24") : line(x + w / 2, y, x + w / 2, y + h, "#aea06f", 3, "28 24")}`;
}

export function buildOpenWastelandSite(spec = {}) {
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:24x24:open-wasteland-assets-v8`));
  const profile = roadProfile(rng);
  const roads = roadRects(profile, rng);
  const occupied = [...roads];
  const terrain = placeTerrain(rng, occupied);
  const obstacles = placeObstacles(rng, occupied);
  const vehicles = placeVehicles(rng, occupied, roads);
  const trees = placeTrees(rng, occupied);
  return {
    cols: GRID,
    rows: GRID,
    profile,
    roads,
    terrain,
    obstacles,
    ruins: terrain.filter((item) => item.type === "ruins"),
    vehicles,
    trees,
    buildings: buildOpenWastelandRoomLayout(spec),
  };
}

export function buildOpenWastelandRoomLayout() { return []; }
export function buildOpenWastelandRoomBlueprints() { return []; }

export function generateOpenWastelandSvg(input = {}) {
  const site = buildOpenWastelandSite(input);
  const width = GRID * CELL, height = GRID * CELL;
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`];
  site.roads.forEach((road) => out.push(roadSvg(road, site.profile.surface)));
  out.push("</svg>");
  return out.join("");
}
