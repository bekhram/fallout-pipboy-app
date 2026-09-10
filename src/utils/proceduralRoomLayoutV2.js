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
    }]),
  );
}

export function cellsInsideRoom(bounds) {
  if (!bounds) return [];
  const cells = [];
  for (let y = Number(bounds.y) || 0; y < (Number(bounds.y) || 0) + Math.max(1, Number(bounds.h) || 1); y += 1) {
    for (let x = Number(bounds.x) || 0; x < (Number(bounds.x) || 0) + Math.max(1, Number(bounds.w) || 1); x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}
