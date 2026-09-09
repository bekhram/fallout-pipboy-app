const TYPES = ["wasteland", "red_rocket", "super_duper_mart", "raider_camp", "military_bunker"];

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

function rngFor(value) {
  let state = hashSeed(value);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function pick(rng, list) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function room(id, label, x, y, w, h, tags = []) {
  return { id, label, x, y, w, h, tags };
}

function door(id, x, y, orientation = "h", options = {}) {
  return {
    id,
    x,
    y,
    orientation,
    locked: Boolean(options.locked),
    difficulty: Number(options.difficulty || 0),
    connects: Array.isArray(options.connects) ? options.connects : [],
  };
}

function cover(id, x, y, type = "debris", rating = 1) {
  return { id, x, y, type, rating: clamp(rating, 1, 3) };
}

function obstacle(id, x, y, type = "rubble", blocksMovement = true) {
  return { id, x, y, type, blocksMovement };
}

function wallRect(target, idPrefix, x, y, w, h) {
  target.push(
    { id: `${idPrefix}-n`, x1: x, y1: y, x2: x + w, y2: y },
    { id: `${idPrefix}-e`, x1: x + w, y1: y, x2: x + w, y2: y + h },
    { id: `${idPrefix}-s`, x1: x, y1: y + h, x2: x + w, y2: y + h },
    { id: `${idPrefix}-w`, x1: x, y1: y, x2: x, y2: y + h },
  );
}

function emptyModel(spec) {
  return {
    version: 2,
    spec,
    rooms: [],
    walls: [],
    doors: [],
    covers: [],
    obstacles: [],
    points: [],
    spawnZones: [],
  };
}

function addRandomFieldObjects(model, rng, count, forbidden = () => false) {
  for (let i = 0; i < count; i += 1) {
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = int(rng, 0, model.spec.cols - 1);
      y = int(rng, 0, model.spec.rows - 1);
      tries += 1;
    } while (forbidden(x, y) && tries < 30);
    if (forbidden(x, y)) continue;
    if (rng() < 0.58) model.covers.push(cover(`cover-${i}`, x, y, pick(rng, ["wreck", "concrete", "debris", "rock"]), rng() > 0.78 ? 2 : 1));
    else model.obstacles.push(obstacle(`obstacle-${i}`, x, y, pick(rng, ["rubble", "wreck", "crate", "scrap"]), true));
  }
}

function buildWasteland(model, rng) {
  const { cols, rows, density } = model.spec;
  const vertical = rng() > 0.5;
  const road = vertical ? { x: int(rng, Math.max(1, Math.floor(cols * 0.3)), Math.max(1, Math.floor(cols * 0.7))), w: Math.max(2, Math.round(cols * 0.18)) }
    : { y: int(rng, Math.max(1, Math.floor(rows * 0.3)), Math.max(1, Math.floor(rows * 0.7))), h: Math.max(2, Math.round(rows * 0.18)) };
  model.points.push({ id: "road", type: "road", ...road });
  const ruins = Math.max(1, Math.round(1 + density * 3));
  for (let i = 0; i < ruins; i += 1) {
    const w = int(rng, 2, Math.max(2, Math.min(4, cols - 2)));
    const h = int(rng, 2, Math.max(2, Math.min(4, rows - 2)));
    const x = int(rng, 0, Math.max(0, cols - w));
    const y = int(rng, 0, Math.max(0, rows - h));
    const id = `ruin-${i + 1}`;
    model.rooms.push(room(id, `Ruin ${i + 1}`, x, y, w, h, ["ruin", "search"]));
    wallRect(model.walls, id, x, y, w, h);
    model.doors.push(door(`${id}-door`, x + Math.floor(w / 2), y + h, "h", { connects: [id, "outside"] }));
  }
  addRandomFieldObjects(model, rng, Math.round(4 + density * 9));
  model.spawnZones.push({ id: "party", type: "party", x: 0, y: Math.max(0, rows - 3), w: Math.min(3, cols), h: Math.min(3, rows) });
  model.spawnZones.push({ id: "enemy", type: "enemy", x: Math.max(0, cols - 3), y: 0, w: Math.min(3, cols), h: Math.min(3, rows) });
}

function buildRedRocket(model, rng) {
  const { cols, rows, density } = model.spec;
  const bx = Math.max(1, Math.floor(cols * 0.4));
  const by = Math.max(1, Math.floor(rows * 0.1));
  const bw = Math.max(5, Math.min(cols - bx - 1, Math.round(cols * 0.5)));
  const bh = Math.max(5, Math.min(rows - by - 2, Math.round(rows * 0.52)));
  const leftW = Math.max(2, Math.floor(bw * 0.55));
  const topH = Math.max(2, Math.floor(bh * 0.6));
  const bottomH = Math.max(1, bh - topH);
  const store = room("store", "Store", bx, by, leftW, topH, ["interior", "loot", "shop"]);
  const garage = room("garage", "Garage", bx + leftW, by, bw - leftW, topH, ["interior", "workshop", "vehicle"]);
  const office = room("office", "Office", bx, by + topH, Math.max(1, Math.floor(leftW / 2)), bottomH, ["interior", "terminal"]);
  const storage = room("storage", "Storage", bx + office.w, by + topH, leftW - office.w, bottomH, ["interior", "loot"]);
  const utility = room("utility", "Utility", bx + leftW, by + topH, bw - leftW, bottomH, ["interior", "utility"]);
  model.rooms.push(store, garage, office, storage, utility);
  wallRect(model.walls, "station", bx, by, bw, bh);
  model.walls.push({ id: "split-main", x1: bx + leftW, y1: by, x2: bx + leftW, y2: by + bh });
  model.walls.push({ id: "split-lower", x1: bx, y1: by + topH, x2: bx + bw, y2: by + topH });
  model.walls.push({ id: "split-office", x1: bx + office.w, y1: by + topH, x2: bx + office.w, y2: by + bh });
  model.doors.push(
    door("front-door", bx + Math.floor(leftW / 2), by + bh, "h", { connects: ["store", "outside"] }),
    door("garage-door", bx + leftW + Math.max(0, Math.floor((bw - leftW) / 2)), by + bh, "h", { connects: ["garage", "outside"] }),
    door("store-office", bx + Math.floor(office.w / 2), by + topH, "h", { connects: ["store", "office"] }),
    door("store-storage", bx + office.w + Math.max(0, Math.floor((leftW - office.w) / 2)), by + topH, "h", { locked: rng() > 0.55, difficulty: 1, connects: ["store", "storage"] }),
    door("garage-utility", bx + leftW + Math.max(0, Math.floor((bw - leftW) / 2)), by + topH, "h", { connects: ["garage", "utility"] }),
  );
  const pumpX = Math.max(1, Math.floor(cols * 0.12));
  const pumpY = Math.max(1, Math.floor(rows * 0.28));
  model.points.push({ id: "pump-island", type: "fuel_pumps", x: pumpX, y: pumpY, w: Math.max(2, Math.floor(cols * 0.22)), h: Math.max(2, Math.floor(rows * 0.24)) });
  model.points.push({ id: "terminal", type: "terminal", x: office.x + Math.max(0, office.w - 1), y: office.y });
  model.points.push({ id: "workbench", type: "workbench", x: garage.x, y: garage.y + Math.max(0, garage.h - 1) });
  addRandomFieldObjects(model, rng, Math.round(3 + density * 6), (x, y) => x >= bx && x < bx + bw && y >= by && y < by + bh);
  model.spawnZones.push({ id: "party", type: "party", x: 0, y: Math.max(0, rows - 3), w: Math.min(3, cols), h: Math.min(3, rows) });
}

function buildSuperDuperMart(model, rng) {
  const { cols, rows, density } = model.spec;
  const bx = 1;
  const by = 1;
  const bw = Math.max(6, cols - 2);
  const bh = Math.max(5, Math.floor(rows * 0.62));
  const storageW = Math.max(2, Math.floor(bw * 0.25));
  model.rooms.push(
    room("sales", "Sales Floor", bx, by, bw - storageW, bh, ["interior", "loot", "shelves"]),
    room("storage", "Storage", bx + bw - storageW, by, storageW, Math.max(2, bh - 2), ["interior", "loot"]),
    room("office", "Manager Office", bx + bw - storageW, by + Math.max(2, bh - 2), storageW, Math.min(2, bh), ["interior", "terminal"]),
  );
  wallRect(model.walls, "mart", bx, by, bw, bh);
  const splitX = bx + bw - storageW;
  model.walls.push({ id: "storage-wall", x1: splitX, y1: by, x2: splitX, y2: by + bh });
  model.doors.push(
    door("main-entrance", bx + Math.floor((bw - storageW) / 2), by + bh, "h", { connects: ["sales", "outside"] }),
    door("storage-door", splitX, by + Math.floor(bh / 2), "v", { locked: rng() > 0.45, difficulty: 1, connects: ["sales", "storage"] }),
    door("office-door", splitX, by + Math.max(1, bh - 1), "v", { locked: true, difficulty: 2, connects: ["sales", "office"] }),
  );
  const aisleCount = Math.max(2, Math.round(2 + density * 4));
  for (let i = 0; i < aisleCount; i += 1) {
    const x = bx + 1 + Math.floor(((bw - storageW - 2) * (i + 1)) / (aisleCount + 1));
    for (let y = by + 1; y < by + bh - 1; y += 2) model.covers.push(cover(`shelf-${i}-${y}`, x, y, "shelf", 1));
  }
  model.points.push({ id: "office-terminal", type: "terminal", x: bx + bw - 1, y: by + bh - 1 });
  addRandomFieldObjects(model, rng, Math.round(2 + density * 5), (x, y) => x >= bx && x < bx + bw && y >= by && y < by + bh);
  model.spawnZones.push({ id: "party", type: "party", x: 0, y: Math.max(0, rows - 3), w: Math.min(3, cols), h: Math.min(3, rows) });
}

function buildRaiderCamp(model, rng) {
  const { cols, rows, density } = model.spec;
  const margin = Math.max(1, Math.floor(Math.min(cols, rows) * 0.12));
  model.points.push({ id: "perimeter", type: "fence", x: margin, y: margin, w: cols - margin * 2, h: rows - margin * 2 });
  const shackCount = Math.max(2, Math.round(2 + density * 4));
  for (let i = 0; i < shackCount; i += 1) {
    const w = int(rng, 2, Math.min(4, Math.max(2, cols - margin * 2)));
    const h = int(rng, 2, Math.min(3, Math.max(2, rows - margin * 2)));
    const x = int(rng, margin, Math.max(margin, cols - margin - w));
    const y = int(rng, margin, Math.max(margin, rows - margin - h));
    const id = `shack-${i + 1}`;
    model.rooms.push(room(id, `Raider Shack ${i + 1}`, x, y, w, h, ["interior", i === 0 ? "boss" : "loot"]));
    wallRect(model.walls, id, x, y, w, h);
    model.doors.push(door(`${id}-door`, x + Math.floor(w / 2), y + h, "h", { connects: [id, "camp"] }));
  }
  const fireCount = Math.max(1, Math.round(density * 3));
  for (let i = 0; i < fireCount; i += 1) model.points.push({ id: `fire-${i}`, type: "campfire", x: int(rng, margin, cols - margin - 1), y: int(rng, margin, rows - margin - 1) });
  addRandomFieldObjects(model, rng, Math.round(6 + density * 8));
  model.spawnZones.push({ id: "party", type: "party", x: 0, y: Math.max(0, rows - 3), w: Math.min(3, cols), h: Math.min(3, rows) });
  model.spawnZones.push({ id: "raiders", type: "enemy", x: margin, y: margin, w: Math.max(2, cols - margin * 2), h: Math.max(2, rows - margin * 2) });
}

function buildMilitaryBunker(model, rng) {
  const { cols, rows, density } = model.spec;
  const bx = 1;
  const by = 1;
  const bw = Math.max(6, cols - 2);
  const bh = Math.max(6, rows - 3);
  const corridorY = by + Math.floor(bh / 2);
  const roomW = Math.max(2, Math.floor(bw / 3));
  const labelsTop = ["Armory", "Control", "Barracks"];
  const labelsBottom = ["Storage", "Generator", "Medical"];
  for (let i = 0; i < 3; i += 1) {
    const x = bx + i * roomW;
    const w = i === 2 ? bx + bw - x : roomW;
    const topId = `top-${i}`;
    const bottomId = `bottom-${i}`;
    model.rooms.push(room(topId, labelsTop[i], x, by, w, Math.max(2, corridorY - by), ["interior", labelsTop[i].toLowerCase()]));
    model.rooms.push(room(bottomId, labelsBottom[i], x, corridorY + 1, w, Math.max(2, by + bh - corridorY - 1), ["interior", labelsBottom[i].toLowerCase()]));
    model.doors.push(door(`${topId}-door`, x + Math.floor(w / 2), corridorY, "h", { locked: i === 0 && rng() > 0.35, difficulty: i === 0 ? 2 : 0, connects: [topId, "corridor"] }));
    model.doors.push(door(`${bottomId}-door`, x + Math.floor(w / 2), corridorY + 1, "h", { locked: i === 1 && rng() > 0.6, difficulty: i === 1 ? 1 : 0, connects: [bottomId, "corridor"] }));
  }
  wallRect(model.walls, "bunker", bx, by, bw, bh);
  model.walls.push({ id: "corridor-n", x1: bx, y1: corridorY, x2: bx + bw, y2: corridorY });
  model.walls.push({ id: "corridor-s", x1: bx, y1: corridorY + 1, x2: bx + bw, y2: corridorY + 1 });
  model.walls.push({ id: "top-split-1", x1: bx + roomW, y1: by, x2: bx + roomW, y2: corridorY });
  model.walls.push({ id: "top-split-2", x1: bx + roomW * 2, y1: by, x2: bx + roomW * 2, y2: corridorY });
  model.walls.push({ id: "bottom-split-1", x1: bx + roomW, y1: corridorY + 1, x2: bx + roomW, y2: by + bh });
  model.walls.push({ id: "bottom-split-2", x1: bx + roomW * 2, y1: corridorY + 1, x2: bx + roomW * 2, y2: by + bh });
  model.doors.push(door("bunker-entry", bx + Math.floor(bw / 2), by + bh, "h", { locked: rng() > 0.45, difficulty: 2, connects: ["corridor", "outside"] }));
  model.points.push({ id: "control-terminal", type: "terminal", x: bx + roomW + Math.floor(roomW / 2), y: by + 1 });
  model.points.push({ id: "generator", type: "generator", x: bx + roomW + Math.floor(roomW / 2), y: Math.min(rows - 2, corridorY + 2) });
  for (let i = 0; i < Math.round(2 + density * 5); i += 1) model.covers.push(cover(`crate-${i}`, int(rng, bx, bx + bw - 1), int(rng, by, by + bh - 1), "crate", rng() > 0.7 ? 2 : 1));
  model.spawnZones.push({ id: "party", type: "party", x: Math.max(0, Math.floor(cols / 2) - 1), y: Math.max(0, rows - 2), w: Math.min(3, cols), h: 2 });
}

export function normalizeProceduralStructureSpec(value = {}) {
  return {
    version: 2,
    type: TYPES.includes(value.type) ? value.type : "wasteland",
    seed: String(value.seed || "1").slice(0, 40),
    cols: clamp(value.cols || 12, 6, 30),
    rows: clamp(value.rows || 12, 6, 30),
    density: clamp(value.density ?? 0.55, 0.1, 1),
  };
}

export function generateProceduralMapStructure(input = {}) {
  const spec = normalizeProceduralStructureSpec(input);
  const rng = rngFor(`structure:${spec.type}:${spec.seed}:${spec.cols}x${spec.rows}:${spec.density.toFixed(2)}`);
  const model = emptyModel(spec);
  if (spec.type === "red_rocket") buildRedRocket(model, rng);
  else if (spec.type === "super_duper_mart") buildSuperDuperMart(model, rng);
  else if (spec.type === "raider_camp") buildRaiderCamp(model, rng);
  else if (spec.type === "military_bunker") buildMilitaryBunker(model, rng);
  else buildWasteland(model, rng);
  return model;
}

export function summarizeProceduralMapStructure(model = {}) {
  return {
    version: 2,
    rooms: Array.isArray(model.rooms) ? model.rooms.map(({ id, label, x, y, w, h, tags }) => ({ id, label, x, y, w, h, tags })) : [],
    doors: Array.isArray(model.doors) ? model.doors.map(({ id, x, y, orientation, locked, difficulty, connects }) => ({ id, x, y, orientation, locked, difficulty, connects })) : [],
    covers: Array.isArray(model.covers) ? model.covers.map(({ id, x, y, type, rating }) => ({ id, x, y, type, rating })) : [],
    obstacles: Array.isArray(model.obstacles) ? model.obstacles.map(({ id, x, y, type, blocksMovement }) => ({ id, x, y, type, blocksMovement })) : [],
    points: Array.isArray(model.points) ? model.points : [],
    spawnZones: Array.isArray(model.spawnZones) ? model.spawnZones : [],
    wallCount: Array.isArray(model.walls) ? model.walls.length : 0,
  };
}

export function proceduralStructureStats(model = {}) {
  return {
    rooms: model.rooms?.length || 0,
    doors: model.doors?.length || 0,
    lockedDoors: model.doors?.filter((item) => item.locked).length || 0,
    covers: model.covers?.length || 0,
    obstacles: model.obstacles?.length || 0,
    walls: model.walls?.length || 0,
  };
}
