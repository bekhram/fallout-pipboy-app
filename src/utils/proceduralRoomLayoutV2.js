import { buildProceduralRoomLayout } from "./proceduralRoomScale.js";

export function getProceduralRoomBounds(spec = {}) {
  return Object.fromEntries(
    buildProceduralRoomLayout(spec).map((room) => [room.id, {
      x: room.x,
      y: room.y,
      w: room.w,
      h: room.h,
      baseRoomId: room.baseRoomId,
      roomInstance: room.instance,
      markerX: Number.isFinite(Number(room.markerX)) ? Number(room.markerX) : null,
      markerY: Number.isFinite(Number(room.markerY)) ? Number(room.markerY) : null,
      spawnCells: Array.isArray(room.spawnCells)
        ? room.spawnCells.map((cell) => ({ x: Number(cell.x), y: Number(cell.y) }))
        : [],
    }]),
  );
}

export function cellsInsideRoom(bounds) {
  if (!bounds) return [];

  if (Array.isArray(bounds.spawnCells) && bounds.spawnCells.length) {
    return bounds.spawnCells
      .map((cell) => ({ x: Number(cell?.x), y: Number(cell?.y) }))
      .filter((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y));
  }

  const cells = [];
  for (let y = Number(bounds.y) || 0; y < (Number(bounds.y) || 0) + Math.max(1, Number(bounds.h) || 1); y += 1) {
    for (let x = Number(bounds.x) || 0; x < (Number(bounds.x) || 0) + Math.max(1, Number(bounds.w) || 1); x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}
