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