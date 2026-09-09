function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function tokenSize(token) {
  const next = number(token?.stats?.footprint ?? token?.size, 1);
  return next >= 2 ? 2 : 1;
}

function cellKey(x, y) {
  return `${x}:${y}`;
}

export function getProceduralMap(scene) {
  const model = scene?.environment?.proceduralMap;
  return model && Number(model.version || 0) >= 2 ? model : null;
}

export function getDoorRuntimeState(scene, door) {
  const override = scene?.environment?.proceduralDoorStates?.[door?.id] || {};
  const locked = Object.prototype.hasOwnProperty.call(override, "locked")
    ? Boolean(override.locked)
    : Boolean(door?.locked);
  const open = !locked && Boolean(override.open);
  return { open, locked };
}

export function proceduralDoorStates(scene) {
  return scene?.environment?.proceduralDoorStates || {};
}

function obstacleCell(item) {
  return {
    x: Math.max(0, Math.floor(number(item?.x))),
    y: Math.max(0, Math.floor(number(item?.y))),
  };
}

function occupiedByBlockingObstacle(model) {
  const blocked = new Set();
  (Array.isArray(model?.obstacles) ? model.obstacles : []).forEach((item) => {
    if (item?.blocksMovement === false || item?.blocking === false) return;
    const cell = obstacleCell(item);
    blocked.add(cellKey(cell.x, cell.y));
  });
  return blocked;
}

function footprintCells(x, y, size = 1) {
  const cells = [];
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) cells.push({ x: x + dx, y: y + dy });
  }
  return cells;
}

function tokenOccupiedCells(tokens, movingId) {
  const occupied = new Set();
  (Array.isArray(tokens) ? tokens : []).forEach((token) => {
    if (!token || token.id === movingId) return;
    const size = tokenSize(token);
    footprintCells(number(token.x), number(token.y), size).forEach((cell) => {
      occupied.add(cellKey(cell.x, cell.y));
    });
  });
  return occupied;
}

export function isProceduralFootprintBlocked(scene, x, y, size = 1, tokens = [], movingId = null) {
  const model = getProceduralMap(scene);
  if (!model) return false;
  const cols = Math.max(1, number(scene?.cols ?? model?.spec?.cols, 12));
  const rows = Math.max(1, number(scene?.rows ?? model?.spec?.rows, 12));
  const footprint = footprintCells(x, y, size);
  if (footprint.some((cell) => cell.x < 0 || cell.y < 0 || cell.x >= cols || cell.y >= rows)) return true;

  const obstacles = occupiedByBlockingObstacle(model);
  if (footprint.some((cell) => obstacles.has(cellKey(cell.x, cell.y)))) return true;

  const occupied = tokenOccupiedCells(tokens, movingId);
  return footprint.some((cell) => occupied.has(cellKey(cell.x, cell.y)));
}

function between(value, a, b, epsilon = 0.0001) {
  const min = Math.min(number(a), number(b)) - epsilon;
  const max = Math.max(number(a), number(b)) + epsilon;
  return value >= min && value <= max;
}

function wallAt(model, axis, boundary, along) {
  return (Array.isArray(model?.walls) ? model.walls : []).some((wall) => {
    const x1 = number(wall?.x1);
    const x2 = number(wall?.x2);
    const y1 = number(wall?.y1);
    const y2 = number(wall?.y2);
    if (axis === "v") return Math.abs(x1 - x2) < 0.001 && Math.abs(x1 - boundary) < 0.001 && between(along, y1, y2);
    return Math.abs(y1 - y2) < 0.001 && Math.abs(y1 - boundary) < 0.001 && between(along, x1, x2);
  });
}

function doorAt(scene, model, axis, boundary, along) {
  const candidates = (Array.isArray(model?.doors) ? model.doors : []).filter((door) => {
    const orientation = door?.orientation === "v" ? "v" : "h";
    if (orientation !== axis) return false;
    if (axis === "v") {
      if (Math.abs(number(door?.x) - boundary) > 0.001) return false;
      return Math.abs(along - (number(door?.y) + 0.5)) <= 0.51;
    }
    if (Math.abs(number(door?.y) - boundary) > 0.001) return false;
    return Math.abs(along - (number(door?.x) + 0.5)) <= 0.51;
  });
  if (!candidates.length) return null;
  const open = candidates.find((door) => getDoorRuntimeState(scene, door).open);
  return open || candidates[0];
}

function crossingBlocked(scene, axis, boundary, along) {
  const model = getProceduralMap(scene);
  if (!model || !wallAt(model, axis, boundary, along)) return false;
  const door = doorAt(scene, model, axis, boundary, along);
  if (!door) return true;
  return !getDoorRuntimeState(scene, door).open;
}

export function canProceduralStep(scene, fromX, fromY, toX, toY, size = 1) {
  const model = getProceduralMap(scene);
  if (!model) return true;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

  if (dx === 1) {
    const boundary = fromX + size;
    for (let offset = 0; offset < size; offset += 1) {
      if (crossingBlocked(scene, "v", boundary, fromY + offset + 0.5)) return false;
    }
  } else if (dx === -1) {
    const boundary = fromX;
    for (let offset = 0; offset < size; offset += 1) {
      if (crossingBlocked(scene, "v", boundary, fromY + offset + 0.5)) return false;
    }
  } else if (dy === 1) {
    const boundary = fromY + size;
    for (let offset = 0; offset < size; offset += 1) {
      if (crossingBlocked(scene, "h", boundary, fromX + offset + 0.5)) return false;
    }
  } else if (dy === -1) {
    const boundary = fromY;
    for (let offset = 0; offset < size; offset += 1) {
      if (crossingBlocked(scene, "h", boundary, fromX + offset + 0.5)) return false;
    }
  }
  return true;
}

export function findProceduralPath(scene, token, targetX, targetY, tokens = []) {
  const model = getProceduralMap(scene);
  if (!model) return { ok: true, path: [{ x: targetX, y: targetY }], reason: "" };
  if (!token) return { ok: false, path: [], reason: "NO_TOKEN" };

  const cols = Math.max(1, number(scene?.cols ?? model?.spec?.cols, 12));
  const rows = Math.max(1, number(scene?.rows ?? model?.spec?.rows, 12));
  const size = tokenSize(token);
  const start = { x: Math.floor(number(token.x)), y: Math.floor(number(token.y)) };
  const target = { x: Math.floor(number(targetX)), y: Math.floor(number(targetY)) };
  if (target.x < 0 || target.y < 0 || target.x + size > cols || target.y + size > rows) {
    return { ok: false, path: [], reason: "OUT_OF_BOUNDS" };
  }
  if (isProceduralFootprintBlocked(scene, target.x, target.y, size, tokens, token.id)) {
    return { ok: false, path: [], reason: "BLOCKED_CELL" };
  }
  if (start.x === target.x && start.y === target.y) return { ok: true, path: [start], reason: "" };

  const queue = [start];
  const seen = new Set([cellKey(start.x, start.y)]);
  const previous = new Map();
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of directions) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = cellKey(next.x, next.y);
      if (seen.has(key)) continue;
      if (next.x < 0 || next.y < 0 || next.x + size > cols || next.y + size > rows) continue;
      if (isProceduralFootprintBlocked(scene, next.x, next.y, size, tokens, token.id)) continue;
      if (!canProceduralStep(scene, current.x, current.y, next.x, next.y, size)) continue;
      seen.add(key);
      previous.set(key, current);
      if (next.x === target.x && next.y === target.y) {
        const path = [next];
        let cursor = current;
        while (cursor) {
          path.push(cursor);
          if (cursor.x === start.x && cursor.y === start.y) break;
          cursor = previous.get(cellKey(cursor.x, cursor.y));
        }
        path.reverse();
        return { ok: true, path, reason: "" };
      }
      queue.push(next);
    }
  }

  return { ok: false, path: [], reason: "NO_PATH" };
}

export function proceduralCoverAt(scene, x, y) {
  const model = getProceduralMap(scene);
  if (!model) return 0;
  let rating = 0;
  (Array.isArray(model.covers) ? model.covers : []).forEach((item) => {
    const cx = Math.floor(number(item?.x));
    const cy = Math.floor(number(item?.y));
    if (cx === Math.floor(x) && cy === Math.floor(y)) rating = Math.max(rating, Math.max(1, Math.min(3, number(item?.rating, 1))));
  });
  return rating;
}

export function proceduralCoverForToken(scene, token) {
  if (!token) return 0;
  const size = tokenSize(token);
  let rating = 0;
  footprintCells(number(token.x), number(token.y), size).forEach((cell) => {
    rating = Math.max(rating, proceduralCoverAt(scene, cell.x, cell.y));
  });
  return rating;
}
