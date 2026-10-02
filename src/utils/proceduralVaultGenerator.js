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

function growConnectedCells(rng, moduleCount, desiredCount, start) {
  const occupied = new Map([[key(start.x, start.y), { ...start, parent: null }]]);

  while (occupied.size < desiredCount) {
    const frontier = [];
    occupied.forEach((cell) => {
      neighborsOf(cell.x, cell.y, moduleCount).forEach((candidate) => {
        const candidateKey = key(candidate.x, candidate.y);
        if (occupied.has(candidateKey)) return;
        frontier.push({ ...candidate, parent: key(cell.x, cell.y) });
      });
    });

    if (!frontier.length) break;

    const deduped = [...new Map(frontier.map((item) => [key(item.x, item.y), item])).values()];
    const picked = chooseWeighted(rng, deduped, (candidate) => {
      const downwardBias = candidate.y >= start.y ? 1.5 : 0.65;
      const edgePenalty = candidate.x === 0 || candidate.x === moduleCount - 1 ? 0.85 : 1;
      const depthBonus = 1 + (candidate.y / Math.max(1, moduleCount - 1)) * 0.45;
      return downwardBias * edgePenalty * depthBonus;
    });

    if (!picked) break;
    occupied.set(key(picked.x, picked.y), {
      x: picked.x,
      y: picked.y,
      parent: picked.parent,
    });
  }

  return occupied;
}

function connectionSides(cell, occupied, moduleCount) {
  const doors = { n: false, e: false, s: false, w: false };
  neighborsOf(cell.x, cell.y, moduleCount).forEach((neighbor) => {
    if (occupied.has(key(neighbor.x, neighbor.y))) doors[neighbor.side] = true;
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
  const degree = SIDES.filter((side) => activeDoors[side]).length;
  let baseId = "corridor_cross";
  let baseDoors = { n: true, e: true, s: true, w: true };

  if (degree <= 1) {
    baseId = "corridor_dead_end";
    baseDoors = { n: true, e: false, s: false, w: false };
  } else if (degree === 2) {
    const opposite = (activeDoors.n && activeDoors.s) || (activeDoors.e && activeDoors.w);
    if (opposite) {
      baseId = "corridor_straight";
      baseDoors = { n: true, e: false, s: true, w: false };
    } else {
      baseId = "corridor_corner";
      baseDoors = { n: true, e: true, s: false, w: false };
    }
  } else if (degree === 3) {
    baseId = "corridor_t";
    baseDoors = { n: true, e: true, s: true, w: false };
  }

  for (let turns = 0; turns < 4; turns += 1) {
    if (sameDoors(rotateDoors(baseDoors, turns), activeDoors)) {
      return { tileId: baseId, rotation: turns * 90 };
    }
  }

  return { tileId: "corridor_cross", rotation: 0 };
}

function roomPoolEntry(rng, base, ruinedChance) {
  const ruined = rng() < ruinedChance;
  if (!ruined) return base;
  return VAULT_RUINED_ROOM_TILES.find((item) => item.ruinedOf === base.id) || base;
}

function assignRoomTiles(rng, roomCells, start, ruinedChance) {
  const startKey = key(start.x, start.y);
  const nonStart = roomCells
    .filter((cell) => key(cell.x, cell.y) !== startKey)
    .sort((a, b) => {
      const da = Math.abs(a.x - start.x) + Math.abs(a.y - start.y);
      const db = Math.abs(b.x - start.x) + Math.abs(b.y - start.y);
      return da - db;
    });

  const uniquePool = shuffled(rng, VAULT_ROOM_TILES);
  const securityIndex = uniquePool.findIndex((item) => item.id === "security_checkpoint");
  if (securityIndex > 0) {
    const [security] = uniquePool.splice(securityIndex, 1);
    uniquePool.unshift(security);
  }

  const assigned = new Map([[startKey, VAULT_START_TILE]]);
  nonStart.forEach((cell, index) => {
    const base = uniquePool[index] || VAULT_ROOM_TILES[int(rng, 0, VAULT_ROOM_TILES.length - 1)];
    assigned.set(key(cell.x, cell.y), roomPoolEntry(rng, base, ruinedChance));
  });
  return assigned;
}

function globalDoorCells(tile) {
  const ox = tile.cellX;
  const oy = tile.cellY;
  const bySide = {
    n: [{ x: ox + 2, y: oy }, { x: ox + 3, y: oy }],
    e: [{ x: ox + 5, y: oy + 2 }, { x: ox + 5, y: oy + 3 }],
    s: [{ x: ox + 2, y: oy + 5 }, { x: ox + 3, y: oy + 5 }],
    w: [{ x: ox, y: oy + 2 }, { x: ox, y: oy + 3 }],
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
    4,
    size === 24 ? 7 : size === 36 ? 14 : 26,
  );
  const targetCorridors = clamp(
    value.targetCorridors ?? int(rng, preset.minCorridors, preset.maxCorridors),
    3,
    Math.max(3, (size / VAULT_MODULE_SIZE) ** 2 - targetRooms),
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
  const occupied = growConnectedCells(rng, moduleCount, desiredOccupied, start);
  const actualRooms = Math.min(spec.targetRooms, occupied.size);
  const roomKeys = selectRoomCells(rng, occupied, moduleCount, start, actualRooms);
  const roomCells = [...occupied.values()].filter((cell) => roomKeys.has(key(cell.x, cell.y)));
  const roomAssignments = assignRoomTiles(rng, roomCells, start, spec.ruinedChance);

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
    };

    if (isRoom) {
      const tile = roomAssignments.get(cellKey) || VAULT_ROOM_TILES[0];
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
      };
    }

    const visual = corridorVisualFor(activeDoors);
    return {
      ...base,
      kind: "corridor",
      tileId: visual.tileId,
      label: visual.tileId,
      assetKey: `vault_${visual.tileId}`,
      assetPath: `/assets/battlemap/vault/corridors/${visual.tileId}.webp`,
      rotation: visual.rotation,
      sealedDoors: { n: false, e: false, s: false, w: false },
      tags: ["corridor"],
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
    },
  };
}

function wallSegment(id, x1, y1, x2, y2) {
  return { id, x1, y1, x2, y2 };
}

export function vaultLayoutStartZone(layout) {
  const start = (layout?.tiles || []).find((tile) => tile.id === layout?.startTileId);
  if (!start) return [];
  const x0 = start.cellX + 2;
  const y0 = start.cellY + 2;
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
    if (!tile.activeDoors?.n) pushWall(`${tile.id}-n`, x, y, x + w, y);
    if (!tile.activeDoors?.e) pushWall(`${tile.id}-e`, x + w, y, x + w, y + h);
    if (!tile.activeDoors?.s) pushWall(`${tile.id}-s`, x, y + h, x + w, y + h);
    if (!tile.activeDoors?.w) pushWall(`${tile.id}-w`, x, y, x, y + h);
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
