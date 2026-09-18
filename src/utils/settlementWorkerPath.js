// Cosmetic actors use grid coordinates, independently of camera zoom and saves.
export function workerGrid(buildings, definitions, size) {
  const blocked = new Set();
  for (const b of buildings) {
    const d = definitions[b.type];
    if (!d || !Number.isInteger(b.x) || !Number.isInteger(b.y)) continue;
    for (let y = b.y; y < b.y + d.footprint.height; y++) {
      for (let x = b.x; x < b.x + d.footprint.width; x++) blocked.add(`${x},${y}`);
    }
  }
  return { size, blocked };
}

export function workerCellFree(grid, cell) {
  return cell && cell.x >= 0 && cell.y >= 0 && cell.x < grid.size && cell.y < grid.size
    && !grid.blocked.has(`${cell.x},${cell.y}`);
}

export function workerWorkPoints(building, definition, grid) {
  if (!building || !definition) return [];
  const { x, y } = building;
  const { width, height } = definition.footprint;
  const points = [];
  // Prefer the front edge so the worker remains visible beside the sprite.
  for (let dx = 0; dx < width; dx++) points.push({ x: x + dx, y: y + height });
  for (let dy = 0; dy < height; dy++) points.push({ x: x + width, y: y + dy }, { x: x - 1, y: y + dy });
  for (let dx = 0; dx < width; dx++) points.push({ x: x + dx, y: y - 1 });
  return points.filter(p => workerCellFree(grid, p));
}

export function workerPath(grid, start, goals) {
  if (!workerCellFree(grid, start)) return null;
  const key = p => `${p.x},${p.y}`;
  const targets = new Set(goals.filter(p => workerCellFree(grid, p)).map(key));
  const queue = [start], previous = new Map([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (targets.has(key(p))) {
      const route = [];
      for (let cursor = p; previous.get(key(cursor)); cursor = previous.get(key(cursor))) route.push(cursor);
      return route.reverse();
    }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const next = { x: p.x + dx, y: p.y + dy };
      if (!workerCellFree(grid, next) || previous.has(key(next))) continue;
      previous.set(key(next), p);
      queue.push(next);
    }
  }
  return null;
}
