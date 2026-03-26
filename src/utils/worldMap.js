import {
  FALLOUT_4_LOCATIONS,
  KM_PER_BLOCK,
} from "../data/map/bostonMap.js";

export function getSectorOrigin(worldOffset, cols, rows) {
  return {
    x: worldOffset.x * cols,
    y: worldOffset.y * rows,
  };
}

export function getLocationsInSector(worldOffset, cols, rows) {
  const origin = getSectorOrigin(worldOffset, cols, rows);

  return FALLOUT_4_LOCATIONS.filter((location) => {
    const localX = location.worldX - origin.x;
    const localY = location.worldY - origin.y;

    return localX >= 0 && localX < cols && localY >= 0 && localY < rows;
  }).map((location) => {
    const localX = location.worldX - origin.x;
    const localY = location.worldY - origin.y;

    return {
      ...location,
      localX,
      localY,
    };
  });
}

export function getLocationById(locationId) {
  return (
    FALLOUT_4_LOCATIONS.find((location) => location.id === locationId) || null
  );
}

export function getDistanceInBlocks(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getDistanceInKm(fromX, fromY, toX, toY) {
  return getDistanceInBlocks(fromX, fromY, toX, toY) * KM_PER_BLOCK;
}

export function getDirectionArrow(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;

  const horizontal = dx > 1 ? "E" : dx < -1 ? "W" : "";
  const vertical = dy > 1 ? "S" : dy < -1 ? "N" : "";

  return `${vertical}${horizontal}` || "HERE";
}