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
function normalizeTerrain(value) {
  const terrain = String(value || "wasteland").toLowerCase();
  return ["wasteland", "forest", "swamp", "ruins"].includes(terrain) ? terrain : "wasteland";
}

function terrainProfile(terrain) {
  if (terrain === "forest") return { terrainCount: [0, 1], obstacleCount: [1, 2], carCount: [0, 1], truckCount: [0, 0], treeCount: [9, 15], treeGap: 0.45 };
  if (terrain === "swamp") return { terrainCount: [3, 5], obstacleCount: [0, 2], carCount: [0, 2], truckCount: [0, 1], treeCount: [2, 5], treeGap: 0.8 };
  if (terrain === "ruins") return { terrainCount: [3, 5], obstacleCount: [1, 3], carCount: [2, 5], truckCount: [0, 2], treeCount: [0, 2], treeGap: ASSET_GAP };
  return { terrainCount: [2, 4], obstacleCount: [1, 3], carCount: [1, 4], truckCount: [0, 2], treeCount: [1, 4], treeGap: ASSET_GAP };
}

function roadProfile(rng) {
  const roll = rng();
  // A wasteland grid may contain only one road route. Crossroads previously
  // rendered as two unrelated roads (and could read visually as road + rails).
  const type = roll < 0.36 ? "none" : roll < 0.82 ? "single" : "fragments";
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
      roads.push({ x: cx, y: 0, w: width, h: randint(rng, 7, 13) });
    } else {
      roads.push({ x: 0, y: cy, w: randint(rng, 7, 13), h: width });
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

function placeTerrain(rng, occupied, terrain, profile) {
  const out = [];
  const terrainTypes = terrain === "swamp"
    ? ["swamp", "swamp", "lake", "ravine"]
    : terrain === "ruins"
      ? ["ruins", "ruins", "ruins", "hills", "crater"]
      : ["ruins", "ravine", "lake", "swamp", "hills"];
  const count = randint(rng, profile.terrainCount[0], profile.terrainCount[1]);
  for (let i = 0; i < count; i += 1) {
    const type = pick(rng, terrainTypes);
    if (type === "crater") continue;
    const item = placeItem(rng, occupied, () => {
      let w = 5, h = 5;
      if (type === "ruins") { w = randint(rng, 5, 7); h = randint(rng, 4, 6); }
      if (type === "ravine") { w = randint(rng, 6, 8); h = randint(rng, 3, 5); }
      if (type === "lake") { w = randint(rng, 5, 7); h = randint(rng, 5, 7); }
      if (type === "swamp") { w = randint(rng, 5, 7); h = randint(rng, 4, 7); }
      if (type === "hills") { w = randint(rng, 4, 6); h = randint(rng, 4, 6); }
      const sprite = type === "ruins" ? randint(rng, 0, 2) : type === "hills" ? randint(rng, 0, 1) : 0;
      return withCollisionRect({ type, sprite, x: randint(rng, 1, GRID - w - 1), y: randint(rng, 1, GRID - h - 1), w, h, rot: 0, impassable: type !== "swamp" }, w, h);
    }, ASSET_GAP, 180);
    if (item) out.push(item);
  }
  return out;
}

function placeObstacles(rng, occupied, terrain, profile) {
  const out = [];
  const obstacleTypes = terrain === "forest" ? ["rocks", "rocks", "cliff"] : terrain === "ruins" ? ["rocks", "crater", "crater", "cliff"] : ["cliff", "rocks", "crater"];
  const count = randint(rng, profile.obstacleCount[0], profile.obstacleCount[1]);
  for (let i = 0; i < count; i += 1) {
    const type = pick(rng, obstacleTypes);
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
  if (type === "retro_car") return { w: 3, h: 3 };
  if (type === "retro_pickup") return { w: 4, h: 3 };
  if (type === "retro_motorcycle") return { w: 2.5, h: 2.5 };
  return { w: 1, h: 1 };
}

function placeVehicles(rng, occupied, roads, profile) {
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
    const spriteMax = type === "retro_car" ? 5 : type === "wreck_car" || type === "wreck_truck" ? 2 : 0;
    const base = { type, sprite: randint(rng, 0, spriteMax), x, y, w, h, rot: rng() < 0.5 ? 0 : 180, impassable: false };
    if (type === "wreck_car") return withCollisionRect(base, 3, 2);
    if (type === "wreck_truck") return withCollisionRect(base, 5, 3);
    return withCollisionRect(base, w, h);
  }, ASSET_GAP, 120);
  for (let i = 0; i < randint(rng, profile.carCount[0], profile.carCount[1]); i += 1) {
    const roll = rng();
    const type = roll < 0.48 ? "retro_car" : roll < 0.66 ? "retro_pickup" : roll < 0.82 ? "retro_motorcycle" : "wreck_car";
    const item = placeVehicle(type);
    if (item) out.push(item);
  }
  for (let i = 0; i < randint(rng, profile.truckCount[0], profile.truckCount[1]); i += 1) { const item = placeVehicle("wreck_truck"); if (item) out.push(item); }
  return out;
}

function placeTrees(rng, occupied, profile) {
  const out = [];
  const targetCount = randint(rng, profile.treeCount[0], profile.treeCount[1]);
  for (let i = 0; i < targetCount; i += 1) {
    const item = placeItem(
      rng,
      occupied,
      () => withCollisionRect({ type: "dead_tree", sprite: randint(rng, 0, 3), x: randint(rng, 1, GRID - 3), y: randint(rng, 1, GRID - 3), w: 2, h: 2, rot: 0 }, 3.4, 3.4),
      profile.treeGap,
      240
    );
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
  const terrainType = normalizeTerrain(spec.terrain || spec.terrainType);
  const profile = terrainProfile(terrainType);
  const rng = mulberry32(hashSeed(`${spec.seed || "1"}:${terrainType}:24x24:open-wasteland-assets-v9`));
  const road = roadProfile(rng);
  const roads = roadRects(road, rng);
  const occupied = [...roads];
  const terrain = placeTerrain(rng, occupied, terrainType, profile);
  const obstacles = placeObstacles(rng, occupied, terrainType, profile);
  const vehicles = placeVehicles(rng, occupied, roads, profile);
  const trees = placeTrees(rng, occupied, profile);
  return {
    cols: GRID,
    rows: GRID,
    terrainType,
    profile: { ...road, terrain: terrainType },
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
