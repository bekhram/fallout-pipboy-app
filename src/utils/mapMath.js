import { TERRAIN_TYPES } from "../data/map/terrainTypes.js";
import { ZONE_HAZARDS } from "../data/map/zoneHazards.js";

export function getCellKey(x, y) {
  return `${x},${y}`;
}

export function getCell(mapData, x, y) {
  return mapData.cells.find((cell) => cell.x === x && cell.y === y) || null;
}

export function getTerrain(terrainId) {
  return TERRAIN_TYPES[terrainId] || TERRAIN_TYPES.road;
}

export function getTerrainLabelKey(terrainId) {
  return `terrain.${terrainId}`;
}

export function getHazard(hazardId) {
  return ZONE_HAZARDS[hazardId] || null;
}

export function getHazardLabelKey(hazardId) {
  return getHazard(hazardId)?.labelKey || `hazards.${hazardId}`;
}

export function getCellHazards(cell) {
  if (!cell) return [];

  const terrain = getTerrain(cell.terrain);
  const terrainHazards = terrain.baseHazards || [];
  const cellHazards = cell.hazards || [];

  return [...new Set([...terrainHazards, ...cellHazards])];
}

export function isInsideMap(mapData, x, y) {
  return x >= 0 && y >= 0 && x < mapData.cols && y < mapData.rows;
}

export function isNeighbor(from, to) {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

export function canTravelToCell(mapData, from, to) {
  if (!isInsideMap(mapData, to.x, to.y)) return false;
  if (!isNeighbor(from, to)) return false;

  const targetCell = getCell(mapData, to.x, to.y);
  if (!targetCell) return false;

  const terrain = getTerrain(targetCell.terrain);
  if (terrain.blocked) return false;

  return true;
}

export function getCellMoveCost(cell) {
  if (!cell) return null;

  const terrain = getTerrain(cell.terrain);
  let cost = terrain.moveCost ?? 1;

  const hazards = getCellHazards(cell);

  hazards.forEach((hazardId) => {
    const hazard = getHazard(hazardId);
    if (hazard?.extraMoveCost) {
      cost += hazard.extraMoveCost;
    }
  });

  return cost;
}

export function getTravelCost(mapData, to) {
  const targetCell = getCell(mapData, to.x, to.y);
  if (!targetCell) return null;

  return getCellMoveCost(targetCell);
}

export function findTravelRoute(mapData, from, to) {
  if (!mapData || !from || !to) return null;
  if (!isInsideMap(mapData, to.x, to.y)) return null;
  if (from.x === to.x && from.y === to.y) return { cells: [], cost: 0 };

  const destination = getCell(mapData, to.x, to.y);
  if (!destination || getTerrain(destination.terrain).blocked) return null;

  const startKey = getCellKey(from.x, from.y);
  const targetKey = getCellKey(to.x, to.y);
  const distance = new Map([[startKey, 0]]);
  const previous = new Map();
  const queue = [{ x: from.x, y: from.y, cost: 0 }];

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    const currentKey = getCellKey(current.x, current.y);
    if (current.cost !== distance.get(currentKey)) continue;
    if (currentKey === targetKey) break;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const x = current.x + dx;
        const y = current.y + dy;
        if (!isInsideMap(mapData, x, y)) continue;

        const cell = getCell(mapData, x, y);
        if (!cell || getTerrain(cell.terrain).blocked) continue;

        const moveCost = getCellMoveCost(cell) ?? 1;
        const diagonalPenalty = dx !== 0 && dy !== 0 ? 0.25 : 0;
        const nextCost = current.cost + moveCost + diagonalPenalty;
        const key = getCellKey(x, y);

        if (nextCost < (distance.get(key) ?? Infinity)) {
          distance.set(key, nextCost);
          previous.set(key, currentKey);
          queue.push({ x, y, cost: nextCost });
        }
      }
    }
  }

  if (!distance.has(targetKey)) return null;

  const keys = [];
  let cursor = targetKey;
  while (cursor !== startKey) {
    keys.push(cursor);
    cursor = previous.get(cursor);
    if (!cursor) return null;
  }
  keys.reverse();

  const cells = keys.map((key) => {
    const [x, y] = key.split(",").map(Number);
    return getCell(mapData, x, y);
  }).filter(Boolean);

  const cost = cells.reduce((sum, cell) => sum + (getCellMoveCost(cell) ?? 1), 0);
  return { cells, cost };
}

export function getCellsInRadius(mapData, center, radius = 1) {
  const result = [];

  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      if (!isInsideMap(mapData, x, y)) continue;
      result.push({ x, y });
    }
  }

  return result;
}

export function revealAround(mapData, center, radius = 1, discoveredKeys = []) {
  const next = new Set(discoveredKeys);

  getCellsInRadius(mapData, center, radius).forEach((cell) => {
    next.add(getCellKey(cell.x, cell.y));
  });

  return Array.from(next);
}