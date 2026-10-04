import {
  VAULT_MODULE_SIZE,
  VAULT_ROOM_TILES,
  VAULT_RUINED_ROOM_TILES,
  VAULT_START_TILE,
  normalizeVaultGridSize,
  vaultPresetForGrid,
} from "./proceduralVaultTiles.js";

const SIDES = ["n", "e", "s", "w"];
const DELTAS = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};
const OPPOSITE = { n: "s", e: "w", s: "n", w: "e" };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function hashSeed(value) {
  const text = String(value ?? "1");
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

function int(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function key(x, y) {
  return `${x}:${y}`;
}

function parseKey(value) {
  const [x, y] = String(value).split(":").map(Number);
  return { x, y };
}

function inBounds(x, y, size) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

function shuffled(rng, values) {
  return [...values]
    .map((value) => ({ value, sort: rng() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
}

function neighborsOf(x, y, size) {
  return SIDES
    .map((side) => ({ side, x: x + DELTAS[side].x, y: y + DELTAS[side].y }))
    .filter((item) => inBounds(item.x, item.y, size));
}

function chooseWeighted(rng, values, weightFor) {
  const weighted = values.map((value) => ({ value, weight: Math.max(0.0001, Number(weightFor(value)) || 0.0001) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return weighted[weighted.length - 1]?.value ?? null;
}

function edgeKey(a, b) {
  const ka = typeof a === "string" ? a : key(a.x, a.y);
  const kb = typeof b === "string" ? b : key(b.x, b.y);
  return ka < kb ? `${ka}>${kb}` : `${kb}>${ka}`;
}

function connectCells(occupied, a, b) {
  if (!occupied.connections) occupied.connections = new Set();
  occupied.connections.add(edgeKey(a, b));
}

function addNetworkCell(occupied, cell, parent = null, networkRole = "branch") {
  const cellKey = key(cell.x, cell.y);
  if (!occupied.has(cellKey)) {
    occupied.set(cellKey, {
      x: cell.x,
      y: cell.y,
      parent: parent ? key(parent.x, parent.y) : null,
      networkRole,
    });
  }
  if (parent) connectCells(occupied, parent, cell);
  return occupied.get(cellKey);
}

function areConnected(occupied, a, b) {
  if (!occupied?.connections) return false;
  return occupied.connections.has(edgeKey(a, b));
}

function addArchitecturalLoops(rng, occupied, moduleCount) {
  const loopBudget = moduleCount <= 4 ? 0 : moduleCount <= 6 ? 1 : 3;
  if (!loopBudget) return;
  const candidates = [];
  occupied.forEach((cell) => {
    neighborsOf(cell.x, cell.y, moduleCount).forEach((neighbor) => {
      const other = occupied.get(key(neighbor.x, neighbor.y));
      if (!other || areConnected(occupied, cell, other)) return;
      if (key(cell.x, cell.y) > key(other.x, other.y)) return;
      candidates.push({ a: cell, b: other, roll: rng() });
    });
  });
  candidates
    .sort((a, b) => a.roll - b.roll)
    .slice(0, loopBudget)
    .forEach(({ a, b }) => connectCells(occupied, a, b));
}

function buildArchitecturalNetwork(rng, moduleCount, desiredCount, start, seed) {
  const occupied = new Map();
  occupied.connections = new Set();
  addNetworkCell(occupied, start, null, "atrium");

  // Primary circulation spine: every vault begins with a direct route away
  // from the entrance hatch and continues toward the deepest row.
  let previous = start;
  for (let y = start.y + 1; y < moduleCount && occupied.size < desiredCount; y += 1) {
    const next = { x: start.x, y };
    addNetworkCell(occupied, next, previous, y === 1 ? "entry-spine" : "main-spine");
    previous = next;
  }

  const mirrored = (hashSeed(`vault-wing-mirror:${seed}`) & 1) === 1;
  const left = mirrored ? "e" : "w";
  const right = mirrored ? "w" : "e";
  const branchPlans = moduleCount <= 4
    ? [
        { row: 1, side: left, length: 1 },
        { row: 2, side: right, length: 2 },
        { row: 3, side: left, length: 1 },
      ]
    : moduleCount <= 6
      ? [
          { row: 1, side: left, length: 2 },
          { row: 2, side: right, length: 2 },
          { row: 3, side: left, length: 3 },
          { row: 4, side: right, length: 3 },
          { row: 5, side: left, length: 2 },
        ]
      : [
          { row: 1, side: left, length: 3 },
          { row: 2, side: right, length: 3 },
          { row: 3, side: left, length: 4 },
          { row: 4, side: right, length: 4 },
          { row: 5, side: left, length: 4 },
          { row: 6, side: right, length: 4 },
          { row: 7, side: left, length: 3 },
        ];

  const branchEnds = [];
  for (const plan of branchPlans) {
    if (occupied.size >= desiredCount) break;
    const row = clamp(plan.row, 0, moduleCount - 1);
    let cursor = occupied.get(key(start.x, row));
    if (!cursor) continue;
    const delta = DELTAS[plan.side];
    for (let step = 0; step < plan.length && occupied.size < desiredCount; step += 1) {
      const next = { x: cursor.x + delta.x, y: cursor.y + delta.y };
      if (!inBounds(next.x, next.y, moduleCount)) break;
      const existing = occupied.get(key(next.x, next.y));
      if (existing) {
        if (!areConnected(occupied, cursor, existing)) connectCells(occupied, cursor, existing);
        cursor = existing;
        continue;
      }
      cursor = addNetworkCell(
        occupied,
        next,
        cursor,
        step === 0 ? "junction-wing" : "branch-corridor",
      );
    }
    if (cursor) branchEnds.push(cursor);
  }

  // Add short perpendicular spurs from wing ends. These create believable
  // room pockets and dead ends instead of filling rectangular blocks.
  const spurDirections = mirrored ? ["s", "n"] : ["n", "s"];
  for (let index = 0; index < branchEnds.length && occupied.size < desiredCount; index += 1) {
    let cursor = branchEnds[index];
    const preferred = spurDirections[index % spurDirections.length];
    const alternatives = [preferred, preferred === "n" ? "s" : "n"];
    const side = alternatives.find((candidate) => {
      const d = DELTAS[candidate];
      return inBounds(cursor.x + d.x, cursor.y + d.y, moduleCount)
        && !occupied.has(key(cursor.x + d.x, cursor.y + d.y));
    });
    if (!side) continue;
    const d = DELTAS[side];
    const spurLength = moduleCount <= 4 ? 1 : moduleCount <= 6 ? 1 + (index % 2) : 1 + (index % 3 === 0 ? 1 : 0);
    for (let step = 0; step < spurLength && occupied.size < desiredCount; step += 1) {
      const next = { x: cursor.x + d.x, y: cursor.y + d.y };
      if (!inBounds(next.x, next.y, moduleCount) || occupied.has(key(next.x, next.y))) break;
      cursor = addNetworkCell(occupied, next, cursor, step === spurLength - 1 ? "dead-end" : "branch-corridor");
    }
  }

  // If a large map still has free budget, grow from existing endpoints while
  // strongly preferring low-degree cells. This keeps branches narrow.
  let guard = 0;
  while (occupied.size < desiredCount && guard < desiredCount * 40) {
    guard += 1;
    const frontier = [];
    occupied.forEach((cell) => {
      const currentDegree = neighborsOf(cell.x, cell.y, moduleCount)
        .filter((n) => occupied.has(key(n.x, n.y)) && areConnected(occupied, cell, occupied.get(key(n.x, n.y))))
        .length;
      if (currentDegree >= 3) return;
      neighborsOf(cell.x, cell.y, moduleCount).forEach((candidate) => {
        if (occupied.has(key(candidate.x, candidate.y))) return;
        const adjacentCount = neighborsOf(candidate.x, candidate.y, moduleCount)
          .filter((n) => occupied.has(key(n.x, n.y))).length;
        if (adjacentCount > 2) return;
        frontier.push({
          ...candidate,
          parentCell: cell,
          currentDegree,
          adjacentCount,
          roll: rng(),
        });
      });
    });
    if (!frontier.length) break;

    const deduped = [...new Map(frontier.map((item) => [key(item.x, item.y), item])).values()];
    deduped.sort((a, b) => {
      if (a.currentDegree !== b.currentDegree) return a.currentDegree - b.currentDegree;
      if (a.adjacentCount !== b.adjacentCount) return a.adjacentCount - b.adjacentCount;
      return a.roll - b.roll;
    });
    const picked = deduped[0];
    addNetworkCell(occupied, picked, picked.parentCell, "secondary-branch");
  }

  addArchitecturalLoops(rng, occupied, moduleCount);
  return occupied;
}

function connectionSides(cell, occupied, moduleCount) {
  const doors = { n: false, e: false, s: false, w: false };
  neighborsOf(cell.x, cell.y, moduleCount).forEach((neighbor) => {
    const other = occupied.get(key(neighbor.x, neighbor.y));
    if (other && areConnected(occupied, cell, other)) doors[neighbor.side] = true;
  });
  return doors;
}

function degreeFor(cell, occupied, moduleCount) {
  return Object.values(connectionSides(cell, occupied, moduleCount)).filter(Boolean).length;
}

function selectRoomCells(rng, occupied, moduleCount, start, targetRooms) {
  const startKey = key(start.x, start.y);
  const candidates = [...occupied.values()]
    .filter((cell) => key(cell.x, cell.y) !== startKey)
    .map((cell) => ({
      ...cell,
      degree: degreeFor(cell, occupied, moduleCount),
      distance: Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y),
      random: rng(),
    }))
    .sort((a, b) => {
      const leafA = a.degree <= 1 ? 1 : 0;
      const leafB = b.degree <= 1 ? 1 : 0;
      if (leafA !== leafB) return leafB - leafA;
      if (a.degree !== b.degree) return a.degree - b.degree;
      if (a.distance !== b.distance) return b.distance - a.distance;
      return a.random - b.random;
    });

  const selected = new Set([startKey]);
  candidates.slice(0, Math.max(0, targetRooms - 1)).forEach((cell) => selected.add(key(cell.x, cell.y)));
  return selected;
}

function rotateDoors(doors, quarterTurns) {
  let next = { ...doors };
  for (let i = 0; i < ((quarterTurns % 4) + 4) % 4; i += 1) {
    next = { n: next.w, e: next.n, s: next.e, w: next.s };
  }
  return next;
}

function sameDoors(a, b) {
  return SIDES.every((side) => Boolean(a?.[side]) === Boolean(b?.[side]));
}

function corridorVisualFor(activeDoors) {
  const d = activeDoors || {};
  const degree = SIDES.filter((side) => d[side]).length;

  if (degree <= 1) {
    const side = SIDES.find((value) => d[value]) || "n";
    const rotationBySide = { n: 0, e: 90, s: 180, w: 270 };
    return {
      tileId: "corridor_dead_end",
      assetFile: "corridor_dead_end.png",
      rotation: rotationBySide[side] || 0,
    };
  }

  if (degree === 2) {
    if (d.n && d.s) return { tileId: "corridor_straight", assetFile: "corridor_straight_vertical.png", rotation: 0 };
    if (d.e && d.w) return { tileId: "corridor_straight", assetFile: "corridor_straight_horizontal.png", rotation: 0 };
    if (d.n && d.e) return { tileId: "corridor_corner", assetFile: "corridor_corner_ne.png", rotation: 0 };
    if (d.e && d.s) return { tileId: "corridor_corner", assetFile: "corridor_corner_es.png", rotation: 0 };
    if (d.s && d.w) return { tileId: "corridor_corner", assetFile: "corridor_corner_sw.png", rotation: 0 };
    if (d.w && d.n) return { tileId: "corridor_corner", assetFile: "corridor_corner_wn.png", rotation: 0 };
  }

  if (degree === 3) {
    if (!d.s) return { tileId: "corridor_t", assetFile: "corridor_t_north.png", rotation: 0 };
    if (!d.w) return { tileId: "corridor_t", assetFile: "corridor_t_east.png", rotation: 0 };
    if (!d.n) return { tileId: "corridor_t", assetFile: "corridor_t_south.png", rotation: 0 };
    if (!d.e) return { tileId: "corridor_t", assetFile: "corridor_t_west.png", rotation: 0 };
  }

  return { tileId: "corridor_cross", assetFile: "corridor_cross.png", rotation: 0 };
}

const VAULT_SECTOR_POOLS = {
  entrance: ["security_checkpoint", "entrance_airlock", "command_room", "armory"],
  administration: ["command_room", "security_checkpoint", "medbay", "armory", "storage"],
  residential: ["living_quarters", "cafeteria", "medbay", "hydroponics", "storage"],
  engineering: ["workshop", "power_reactor", "water_treatment", "storage", "hydroponics"],
  damaged: ["storage", "workshop", "living_quarters", "medbay", "water_treatment", "hydroponics"],
};

function roomById(id) {
  return VAULT_ROOM_TILES.find((tile) => tile.id === id) || null;
}

function ruinedRoomFor(base) {
  return VAULT_RUINED_ROOM_TILES.find((item) => item.ruinedOf === base?.id) || base;
}

function sectorAnchors(moduleCount, seed) {
  const damagedLeft = (hashSeed(`vault-damaged-side:${seed}`) & 1) === 0;
  return {
    damagedLeft,
    damagedX: damagedLeft ? 0 : moduleCount - 1,
    engineeringX: damagedLeft ? moduleCount - 1 : 0,
  };
}

function sectorForCell(cell, start, moduleCount, seed) {
  const anchors = sectorAnchors(moduleCount, seed);
  const x = Number(cell.x);
  const y = Number(cell.y);
  const distance = Math.abs(x - start.x) + Math.abs(y - start.y);

  if (distance <= 1 || y <= 1) return "entrance";
  if (moduleCount <= 4) {
    if (y >= moduleCount - 1 && Math.abs(x - anchors.damagedX) <= 1) return "damaged";
    return x <= start.x ? "residential" : "engineering";
  }

  if (y >= Math.ceil(moduleCount * 0.58) && Math.abs(x - anchors.damagedX) <= Math.ceil(moduleCount * 0.34)) {
    return "damaged";
  }
  if (y >= Math.floor(moduleCount * 0.48) && Math.abs(x - anchors.engineeringX) <= Math.ceil(moduleCount * 0.42)) {
    return "engineering";
  }
  if (x < start.x && y >= 2) return anchors.damagedLeft ? "administration" : "residential";
  if (x > start.x && y >= 2) return anchors.damagedLeft ? "residential" : "administration";
  return y <= Math.floor(moduleCount * 0.45) ? "administration" : "residential";
}

function sectorRuinChance(sector, baseChance, moduleCount) {
  if (sector === "damaged") return clamp(Math.max(0.72, baseChance + 0.5), 0, 0.95);
  if (sector === "engineering") return clamp(baseChance * 0.85, 0, 0.55);
  if (sector === "entrance") return clamp(baseChance * 0.18, 0, 0.18);
  if (moduleCount <= 4) return clamp(baseChance * 0.65, 0, 0.45);
  return clamp(baseChance * 0.45, 0, 0.38);
}

const VAULT_REQUIRED_ROOMS = {
  24: ["security_checkpoint"],
  36: ["security_checkpoint", "living_quarters", "medbay"],
  48: [
    "security_checkpoint", "command_room", "living_quarters",
    "medbay", "workshop", "power_reactor",
  ],
};

const VAULT_END_ROOM_BIAS = new Set([
  "power_reactor", "water_treatment", "armory", "hydroponics", "storage", "workshop",
]);

function requiredRoomsForSize(moduleCount) {
  return VAULT_REQUIRED_ROOMS[moduleCount * VAULT_MODULE_SIZE] || VAULT_REQUIRED_ROOMS[24];
}

function preferredSectorForRoom(roomId) {
  if (["security_checkpoint", "entrance_airlock", "command_room"].includes(roomId)) return "entrance";
  if (["living_quarters", "cafeteria", "medbay", "hydroponics"].includes(roomId)) return "residential";
  if (["workshop", "power_reactor", "water_treatment"].includes(roomId)) return "engineering";
  if (roomId === "armory") return "administration";
  if (roomId === "storage") return "damaged";
  return "administration";
}

function chooseSectorRoom(rng, sector, usedUnique) {
  const preferred = VAULT_SECTOR_POOLS[sector] || VAULT_SECTOR_POOLS.administration;
  const availablePreferred = preferred
    .map(roomById)
    .filter(Boolean)
    .filter((tile) => !tile.unique || !usedUnique.has(tile.id));
  const availableAny = VAULT_ROOM_TILES.filter((tile) => !tile.unique || !usedUnique.has(tile.id));
  const pool = availablePreferred.length ? availablePreferred : availableAny.length ? availableAny : VAULT_ROOM_TILES;
  return chooseWeighted(rng, pool, (tile) => {
    const preferredIndex = preferred.indexOf(tile.id);
    const sectorWeight = preferredIndex >= 0 ? Math.max(1.2, 4.6 - preferredIndex * 0.55) : 0.65;
    return sectorWeight * Math.max(0.2, Number(tile.weight || 1));
  });
}

function assignRoomTiles(rng, roomCells, start, ruinedChance, moduleCount, seed, occupied) {
  const startKey = key(start.x, start.y);
  const assigned = new Map([[startKey, { tile: VAULT_START_TILE, sector: "entrance" }]]);
  const usedUnique = new Set();

  const pending = roomCells
    .filter((cell) => key(cell.x, cell.y) !== startKey)
    .map((cell) => ({
      ...cell,
      sector: sectorForCell(cell, start, moduleCount, seed),
      distance: Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y),
      degree: degreeFor(cell, occupied, moduleCount),
    }));

  const takeCellFor = (roomId) => {
    if (!pending.length) return null;
    const preferredSector = preferredSectorForRoom(roomId);
    const sectorMatches = pending.filter((cell) => cell.sector === preferredSector);
    const candidates = sectorMatches.length ? sectorMatches : pending;
    const endBiased = VAULT_END_ROOM_BIAS.has(roomId);
    const chosen = chooseWeighted(rng, candidates, (cell) => {
      const sectorBonus = cell.sector === preferredSector ? 2.6 : 1;
      const topologyBonus = endBiased
        ? (cell.degree <= 1 ? 4.8 : cell.degree === 2 ? 1.8 : 0.45)
        : (cell.degree >= 2 ? 2.2 : 1);
      const depthBonus = 1 + cell.distance * 0.12;
      return sectorBonus * topologyBonus * depthBonus;
    });
    const index = pending.findIndex((cell) => key(cell.x, cell.y) === key(chosen.x, chosen.y));
    if (index >= 0) pending.splice(index, 1);
    return chosen;
  };

  for (const roomId of requiredRoomsForSize(moduleCount)) {
    if (!pending.length) break;
    const base = roomById(roomId);
    if (!base) continue;
    const cell = takeCellFor(roomId);
    if (!cell) continue;
    if (base.unique) usedUnique.add(base.id);
    const ruined = rng() < sectorRuinChance(cell.sector, ruinedChance, moduleCount);
    assigned.set(key(cell.x, cell.y), {
      tile: ruined ? ruinedRoomFor(base) : base,
      sector: cell.sector,
    });
  }

  while (pending.length) {
    const cell = pending.shift();
    const base = chooseSectorRoom(rng, cell.sector, usedUnique) || VAULT_ROOM_TILES[0];
    if (base.unique) usedUnique.add(base.id);
    const ruined = rng() < sectorRuinChance(cell.sector, ruinedChance, moduleCount);
    assigned.set(key(cell.x, cell.y), {
      tile: ruined ? ruinedRoomFor(base) : base,
      sector: cell.sector,
    });
  }

  return assigned;
}

function globalDoorCells(tile) {
  const ox = tile.cellX;
  const oy = tile.cellY;
  const centerA = Math.floor(VAULT_MODULE_SIZE / 2) - 1;
  const centerB = centerA + 1;
  const edge = VAULT_MODULE_SIZE - 1;
  const bySide = {
    n: [{ x: ox + centerA, y: oy }, { x: ox + centerB, y: oy }],
    e: [{ x: ox + edge, y: oy + centerA }, { x: ox + edge, y: oy + centerB }],
    s: [{ x: ox + centerA, y: oy + edge }, { x: ox + centerB, y: oy + edge }],
    w: [{ x: ox, y: oy + centerA }, { x: ox, y: oy + centerB }],
  };
  return Object.fromEntries(SIDES.map((side) => [side, bySide[side]]));
}

export function normalizeVaultGeneratorSpec(value = {}) {
  const size = normalizeVaultGridSize(value.cols ?? value.rows ?? value.size);
  const preset = vaultPresetForGrid(size);
  const seed = String(value.seed || "1").slice(0, 80);
  const rng = mulberry32(hashSeed(`vault-count:${seed}:${size}`));
  const roomVariance = int(rng, -preset.roomVariance, preset.roomVariance);
  const targetRooms = clamp(
    value.targetRooms ?? preset.targetRooms + roomVariance,
    2,
    size === 24 ? 3 : size === 36 ? 5 : 8,
  );
  const targetCorridors = clamp(
    value.targetCorridors ?? int(rng, preset.minCorridors, preset.maxCorridors),
    1,
    Math.max(1, (size / VAULT_MODULE_SIZE) ** 2 - targetRooms),
  );

  return {
    version: 1,
    type: "vault_tunnels",
    seed,
    cols: size,
    rows: size,
    moduleSize: VAULT_MODULE_SIZE,
    moduleCols: size / VAULT_MODULE_SIZE,
    moduleRows: size / VAULT_MODULE_SIZE,
    targetRooms,
    targetCorridors,
    ruinedChance: clamp(value.ruinedChance ?? 0.22, 0, 0.8),
  };
}

export function generateVaultLayout(input = {}) {
  const spec = normalizeVaultGeneratorSpec(input);
  const rng = mulberry32(hashSeed(`vault-layout:${spec.seed}:${spec.cols}`));
  const moduleCount = spec.moduleCols;
  const start = { x: Math.floor((moduleCount - 1) / 2), y: 0 };
  const maxTiles = moduleCount * moduleCount;
  const desiredOccupied = Math.min(maxTiles, spec.targetRooms + spec.targetCorridors);
  const occupied = buildArchitecturalNetwork(rng, moduleCount, desiredOccupied, start, spec.seed);
  const actualRooms = Math.min(spec.targetRooms, occupied.size);
  const roomKeys = selectRoomCells(rng, occupied, moduleCount, start, actualRooms);
  const roomCells = [...occupied.values()].filter((cell) => roomKeys.has(key(cell.x, cell.y)));
  const roomAssignments = assignRoomTiles(rng, roomCells, start, spec.ruinedChance, moduleCount, spec.seed, occupied);

  const tiles = [...occupied.values()].map((cell) => {
    const cellKey = key(cell.x, cell.y);
    const activeDoors = connectionSides(cell, occupied, moduleCount);
    const isRoom = roomKeys.has(cellKey);
    const base = {
      id: `vault-module-${cell.x}-${cell.y}`,
      moduleX: cell.x,
      moduleY: cell.y,
      cellX: cell.x * VAULT_MODULE_SIZE,
      cellY: cell.y * VAULT_MODULE_SIZE,
      w: VAULT_MODULE_SIZE,
      h: VAULT_MODULE_SIZE,
      activeDoors,
      networkRole: cell.networkRole || "branch",
    };

    if (isRoom) {
      const assignment = roomAssignments.get(cellKey) || { tile: VAULT_ROOM_TILES[0], sector: sectorForCell(cell, start, moduleCount, spec.seed) };
      const tile = assignment.tile;
      const allowedDoors = { ...tile.doors };
      const effectiveDoors = Object.fromEntries(
        SIDES.map((side) => [side, Boolean(activeDoors[side] && allowedDoors[side])]),
      );
      const sealedDoors = Object.fromEntries(
        SIDES.map((side) => [side, Boolean(allowedDoors[side] && !effectiveDoors[side])]),
      );
      return {
        ...base,
        kind: tile.kind,
        tileId: tile.id,
        label: tile.label,
        assetKey: tile.assetKey,
        assetPath: tile.assetPath,
        rotation: 0,
        activeDoors: effectiveDoors,
        sealedDoors,
        tags: tile.tags || [],
        sector: assignment.sector,
      };
    }

    const visual = corridorVisualFor(activeDoors);
    return {
      ...base,
      kind: "corridor",
      tileId: visual.tileId,
      label: visual.tileId,
      assetKey: `vault_${visual.tileId}`,
      assetPath: `/assets/battlemap/vault/corridors/${visual.assetFile}`,
      rotation: visual.rotation,
      sealedDoors: { n: false, e: false, s: false, w: false },
      tags: ["corridor"],
      sector: sectorForCell(cell, start, moduleCount, spec.seed),
    };
  });

  tiles.forEach((tile) => {
    tile.doorCells = globalDoorCells(tile);
  });

  const tileByModule = new Map(tiles.map((tile) => [key(tile.moduleX, tile.moduleY), tile]));
  const links = [];
  tiles.forEach((tile) => {
    ["e", "s"].forEach((side) => {
      if (!tile.activeDoors[side]) return;
      const delta = DELTAS[side];
      const other = tileByModule.get(key(tile.moduleX + delta.x, tile.moduleY + delta.y));
      if (!other || !other.activeDoors[OPPOSITE[side]]) return;
      links.push({
        id: `${tile.id}:${side}:${other.id}`,
        from: tile.id,
        to: other.id,
        fromSide: side,
        toSide: OPPOSITE[side],
      });
    });
  });

  const rooms = tiles.filter((tile) => tile.kind !== "corridor");
  const corridors = tiles.filter((tile) => tile.kind === "corridor");

  return {
    version: 1,
    spec,
    startTileId: `vault-module-${start.x}-${start.y}`,
    tiles,
    rooms,
    corridors,
    links,
    stats: {
      rooms: rooms.length,
      corridors: corridors.length,
      occupiedModules: tiles.length,
      totalModules: maxTiles,
      ruinedRooms: rooms.filter((tile) => tile.kind === "ruined_room").length,
      sectors: rooms.reduce((acc, tile) => {
        const sector = tile.sector || "unknown";
        acc[sector] = (acc[sector] || 0) + 1;
        return acc;
      }, {}),
      junctions: tiles.filter((tile) => Object.values(tile.activeDoors || {}).filter(Boolean).length >= 3).length,
      deadEnds: tiles.filter((tile) => Object.values(tile.activeDoors || {}).filter(Boolean).length === 1).length,
      mainSpineModules: tiles.filter((tile) => ["atrium", "entry-spine", "main-spine"].includes(tile.networkRole)).length,
    },
  };
}

function wallSegment(id, x1, y1, x2, y2) {
  return { id, x1, y1, x2, y2 };
}

export function vaultLayoutStartZone(layout) {
  const start = (layout?.tiles || []).find((tile) => tile.id === layout?.startTileId);
  if (!start) return [];
  const x0 = start.cellX + Math.floor(VAULT_MODULE_SIZE / 2) - 1;
  const y0 = start.cellY + Math.floor(VAULT_MODULE_SIZE / 2) - 1;
  return [
    { x: x0, y: y0 },
    { x: x0 + 1, y: y0 },
    { x: x0, y: y0 + 1 },
    { x: x0 + 1, y: y0 + 1 },
  ];
}

export function vaultLayoutToProceduralMap(layout) {
  const tiles = Array.isArray(layout?.tiles) ? layout.tiles : [];
  const walls = [];
  const rooms = [];
  const seenWalls = new Set();

  const pushWall = (id, x1, y1, x2, y2) => {
    const canonical = x1 < x2 || (x1 === x2 && y1 <= y2)
      ? `${x1}:${y1}:${x2}:${y2}`
      : `${x2}:${y2}:${x1}:${y1}`;
    if (seenWalls.has(canonical)) return;
    seenWalls.add(canonical);
    walls.push(wallSegment(id, x1, y1, x2, y2));
  };

  tiles.forEach((tile) => {
    const x = Number(tile.cellX || 0);
    const y = Number(tile.cellY || 0);
    const w = Number(tile.w || VAULT_MODULE_SIZE);
    const h = Number(tile.h || VAULT_MODULE_SIZE);
    rooms.push({
      id: tile.id,
      label: tile.label || tile.tileId,
      x, y, w, h,
      tags: [tile.kind, ...(tile.tags || [])],
      baseRoomId: tile.tileId,
      markerX: x + w / 2,
      markerY: y + h / 2,
    });
    const openingStart = Math.floor(VAULT_MODULE_SIZE / 2) - 1;
    const openingEnd = openingStart + 2;
    if (tile.activeDoors?.n) {
      pushWall(`${tile.id}-n-a`, x, y, x + openingStart, y);
      pushWall(`${tile.id}-n-b`, x + openingEnd, y, x + w, y);
    } else pushWall(`${tile.id}-n`, x, y, x + w, y);

    if (tile.activeDoors?.e) {
      pushWall(`${tile.id}-e-a`, x + w, y, x + w, y + openingStart);
      pushWall(`${tile.id}-e-b`, x + w, y + openingEnd, x + w, y + h);
    } else pushWall(`${tile.id}-e`, x + w, y, x + w, y + h);

    if (tile.activeDoors?.s) {
      pushWall(`${tile.id}-s-a`, x, y + h, x + openingStart, y + h);
      pushWall(`${tile.id}-s-b`, x + openingEnd, y + h, x + w, y + h);
    } else pushWall(`${tile.id}-s`, x, y + h, x + w, y + h);

    if (tile.activeDoors?.w) {
      pushWall(`${tile.id}-w-a`, x, y, x, y + openingStart);
      pushWall(`${tile.id}-w-b`, x, y + openingEnd, x, y + h);
    } else pushWall(`${tile.id}-w`, x, y, x, y + h);
  });

  return {
    version: 2,
    spec: layout?.spec || {},
    rooms,
    walls,
    doors: [],
    covers: [],
    obstacles: [],
    points: [
      ...(layout?.startTileId ? [{ id: "vault-hatch", type: "vault_hatch", roomId: layout.startTileId }] : []),
    ],
    spawnZones: [{
      id: "party",
      type: "party",
      cells: vaultLayoutStartZone(layout),
    }],
    vaultLayout: layout,
  };
}

export function validateVaultLayout(layout) {
  const errors = [];
  if (!layout?.spec || layout.spec.type !== "vault_tunnels") errors.push("INVALID_SPEC");
  const tiles = Array.isArray(layout?.tiles) ? layout.tiles : [];
  if (!tiles.length) errors.push("NO_TILES");

  const byId = new Map(tiles.map((tile) => [tile.id, tile]));
  const start = byId.get(layout?.startTileId);
  if (!start || start.tileId !== "atrium_vault_entrance") errors.push("MISSING_ATRIUM");
  if (start?.activeDoors?.n) errors.push("ATRIUM_NORTH_MUST_BE_VAULT_HATCH");

  const expectedSize = Number(layout?.spec?.moduleSize || VAULT_MODULE_SIZE);
  tiles.forEach((tile) => {
    if (tile.w !== expectedSize || tile.h !== expectedSize) errors.push(`BAD_TILE_SIZE:${tile.id}`);
    SIDES.forEach((side) => {
      if (!tile.activeDoors?.[side]) return;
      const delta = DELTAS[side];
      const other = tiles.find(
        (candidate) =>
          candidate.moduleX === tile.moduleX + delta.x &&
          candidate.moduleY === tile.moduleY + delta.y,
      );
      if (!other || !other.activeDoors?.[OPPOSITE[side]]) {
        errors.push(`BROKEN_CONNECTION:${tile.id}:${side}`);
      }
    });
  });

  return { ok: errors.length === 0, errors };
}


export function vaultSpecFromScene(scene = {}) {
  const environment = scene?.environment && typeof scene.environment === "object" ? scene.environment : {};
  const rawSpec = environment.proceduralMapSpec && typeof environment.proceduralMapSpec === "object"
    ? environment.proceduralMapSpec
    : {};
  const backgroundName = String(scene?.backgroundName || "");
  const mapAssetId = String(environment?.mapAssetId || "");
  const locationType = String(environment?.locationType || rawSpec?.type || "");
  const isVault = locationType === "vault_tunnels"
    || String(rawSpec?.type || "") === "vault_tunnels"
    || mapAssetId.startsWith("procedural:vault_tunnels:")
    || backgroundName.includes("VAULT TUNNELS");

  if (!isVault) return null;

  let seed = rawSpec?.seed || environment?.mapVariantSeed || "";
  if (!seed && backgroundName.includes("VAULT TUNNELS")) {
    const parts = backgroundName.split("//").map((part) => part.trim()).filter(Boolean);
    seed = parts[parts.length - 1] || "";
  }

  return normalizeVaultGeneratorSpec({
    ...rawSpec,
    type: "vault_tunnels",
    seed: seed || "1",
    cols: rawSpec?.cols || scene?.cols || 24,
    rows: rawSpec?.rows || scene?.rows || 24,
  });
}
