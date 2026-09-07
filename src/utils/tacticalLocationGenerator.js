const PRESETS = {
  ruins: { partitions: 4, doorsPerWall: 1, obstacles: 0.13, cover: 0.08, hazards: 0.04, shortWalls: 4 },
  vault: { partitions: 5, doorsPerWall: 2, obstacles: 0.05, cover: 0.05, hazards: 0.02, shortWalls: 1 },
  warehouse: { partitions: 2, doorsPerWall: 2, obstacles: 0.18, cover: 0.12, hazards: 0.02, shortWalls: 1 },
  camp: { partitions: 1, doorsPerWall: 1, obstacles: 0.08, cover: 0.15, hazards: 0.03, shortWalls: 2 },
};

const DENSITY = {
  sparse: 0.7,
  normal: 1,
  dense: 1.35,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function keyOf(x, y) {
  return `${x}:${y}`;
}

function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  if (high <= low) return low;
  return low + Math.floor(Math.random() * (high - low + 1));
}

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sanitizeStartZone(startZone, cols, rows) {
  return new Set((Array.isArray(startZone) ? startZone : []).map((cell) => keyOf(
    clamp(Number(cell?.x || 0), 0, cols - 1),
    clamp(Number(cell?.y || 0), 0, rows - 1)
  )));
}

function putTile(tileMap, protectedKeys, tile) {
  const key = keyOf(tile.x, tile.y);
  if (protectedKeys.has(key)) return false;
  tileMap.set(key, tile);
  return true;
}

function makePartition(tileMap, protectedKeys, cols, rows, orientation, coordinate, doorsPerWall = 1) {
  const line = [];
  if (orientation === "vertical") {
    for (let y = 0; y < rows; y += 1) {
      const key = keyOf(coordinate, y);
      if (!protectedKeys.has(key)) line.push({ x: coordinate, y });
    }
  } else {
    for (let x = 0; x < cols; x += 1) {
      const key = keyOf(x, coordinate);
      if (!protectedKeys.has(key)) line.push({ x, y: coordinate });
    }
  }
  if (line.length < 3) return;
  line.forEach((cell) => putTile(tileMap, protectedKeys, { ...cell, kind: "wall" }));

  const doorCandidates = line.slice(1, -1).filter((cell) => !protectedKeys.has(keyOf(cell.x, cell.y)));
  shuffle(doorCandidates).slice(0, Math.max(1, doorsPerWall)).forEach((cell) => {
    tileMap.set(keyOf(cell.x, cell.y), { ...cell, kind: "door", open: false });
  });
}

function makeShortWall(tileMap, protectedKeys, cols, rows) {
  const orientation = Math.random() < 0.5 ? "vertical" : "horizontal";
  const length = randomInt(2, Math.max(2, Math.min(5, orientation === "vertical" ? rows - 2 : cols - 2)));
  const startX = randomInt(1, Math.max(1, cols - (orientation === "horizontal" ? length : 2)));
  const startY = randomInt(1, Math.max(1, rows - (orientation === "vertical" ? length : 2)));
  for (let i = 0; i < length; i += 1) {
    const x = orientation === "horizontal" ? startX + i : startX;
    const y = orientation === "vertical" ? startY + i : startY;
    if (x >= 0 && x < cols && y >= 0 && y < rows) putTile(tileMap, protectedKeys, { x, y, kind: "wall" });
  }
}

function fillScatter(tileMap, protectedKeys, cols, rows, kind, count) {
  const candidates = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const key = keyOf(x, y);
      if (!protectedKeys.has(key) && !tileMap.has(key)) candidates.push({ x, y });
    }
  }
  shuffle(candidates).slice(0, Math.max(0, count)).forEach((cell) => {
    tileMap.set(keyOf(cell.x, cell.y), { ...cell, kind });
  });
}

export function generateTacticalLocation({ cols = 12, rows = 12, preset = "ruins", density = "normal", startZone = [] } = {}) {
  const safeCols = clamp(Math.floor(Number(cols || 12)), 6, 30);
  const safeRows = clamp(Math.floor(Number(rows || 12)), 6, 30);
  const config = PRESETS[preset] || PRESETS.ruins;
  const densityFactor = DENSITY[density] || 1;
  const protectedKeys = sanitizeStartZone(startZone, safeCols, safeRows);
  const tileMap = new Map();

  const partitionCount = Math.max(0, Math.round(config.partitions * densityFactor));
  for (let index = 0; index < partitionCount; index += 1) {
    const orientation = index % 2 === 0 ? "vertical" : "horizontal";
    const maxCoordinate = orientation === "vertical" ? safeCols - 3 : safeRows - 3;
    if (maxCoordinate < 2) continue;
    const coordinate = randomInt(2, maxCoordinate);
    makePartition(tileMap, protectedKeys, safeCols, safeRows, orientation, coordinate, config.doorsPerWall);
  }

  const shortWallCount = Math.max(0, Math.round(config.shortWalls * densityFactor));
  for (let index = 0; index < shortWallCount; index += 1) makeShortWall(tileMap, protectedKeys, safeCols, safeRows);

  const area = safeCols * safeRows;
  fillScatter(tileMap, protectedKeys, safeCols, safeRows, "obstacle", Math.round(area * config.obstacles * densityFactor));
  fillScatter(tileMap, protectedKeys, safeCols, safeRows, "cover", Math.round(area * config.cover * densityFactor));
  fillScatter(tileMap, protectedKeys, safeCols, safeRows, "hazard", Math.round(area * config.hazards * densityFactor));

  return {
    preset,
    density,
    generatedAt: new Date().toISOString(),
    tiles: Array.from(tileMap.values()),
  };
}

export function getTacticalTile(layout, x, y) {
  if (!layout || !Array.isArray(layout.tiles)) return null;
  return layout.tiles.find((tile) => Number(tile.x) === Number(x) && Number(tile.y) === Number(y)) || null;
}

export function isTacticalCellBlocked(layout, x, y) {
  const tile = getTacticalTile(layout, x, y);
  if (!tile) return false;
  if (tile.kind === "wall" || tile.kind === "obstacle" || tile.kind === "cover") return true;
  if (tile.kind === "door") return !tile.open;
  return false;
}

export function toggleTacticalDoor(layout, x, y) {
  if (!layout || !Array.isArray(layout.tiles)) return layout;
  let changed = false;
  const tiles = layout.tiles.map((tile) => {
    if (tile.kind !== "door" || Number(tile.x) !== Number(x) || Number(tile.y) !== Number(y)) return tile;
    changed = true;
    return { ...tile, open: !tile.open };
  });
  return changed ? { ...layout, tiles } : layout;
}

export function tacticalTileGlyph(tile) {
  if (!tile) return "";
  if (tile.kind === "wall") return "█";
  if (tile.kind === "door") return tile.open ? "▯" : "▣";
  if (tile.kind === "obstacle") return "◆";
  if (tile.kind === "cover") return "▦";
  if (tile.kind === "hazard") return "☢";
  return "";
}

export const TACTICAL_LOCATION_PRESETS = Object.freeze(Object.keys(PRESETS));
