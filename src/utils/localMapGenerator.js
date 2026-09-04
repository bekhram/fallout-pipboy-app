const SIZE = 6;

function hashSeed(seed) {
  const text = String(seed ?? "vault-111");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function key(x, y) {
  return `${x},${y}`;
}

export function generateLocalZone(seed = Date.now()) {
  const random = mulberry32(hashSeed(seed));
  const start = { x: 2, y: 3 };
  const reserved = new Set([key(start.x, start.y)]);
  const cells = [];

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const edge = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      let terrain = "floor";
      let walkable = true;
      let object = null;

      if (!reserved.has(key(x, y))) {
        const roll = random();
        if (edge && roll < 0.28) {
          terrain = "wall";
          walkable = false;
        } else if (roll < 0.12) {
          terrain = "rubble";
          object = "rubble";
        } else if (roll < 0.2) {
          terrain = "floor";
          object = random() < 0.5 ? "crate" : "barrel";
          walkable = false;
        }
      }

      cells.push({ x, y, terrain, walkable, object });
    }
  }

  // Guarantee several exits so later zones can connect cleanly.
  const exits = [
    { x: 2, y: 0, direction: "north" },
    { x: 5, y: 3, direction: "east" },
    { x: 2, y: 5, direction: "south" },
    { x: 0, y: 3, direction: "west" },
  ];

  exits.forEach((exit) => {
    const cell = cells.find((item) => item.x === exit.x && item.y === exit.y);
    if (cell) {
      cell.terrain = "door";
      cell.walkable = true;
      cell.object = "door";
      cell.direction = exit.direction;
    }
  });

  const startCell = cells.find((cell) => cell.x === start.x && cell.y === start.y);
  if (startCell) {
    startCell.terrain = "floor";
    startCell.walkable = true;
    startCell.object = null;
  }

  return {
    id: `local-${String(seed)}`,
    seed: String(seed),
    size: SIZE,
    rows: SIZE,
    cols: SIZE,
    start,
    cells,
  };
}

export function getLocalCell(zone, x, y) {
  return zone?.cells?.find((cell) => cell.x === x && cell.y === y) || null;
}

export function findLocalPath(zone, start, target, maxCost = 6) {
  if (!zone || !start || !target) return null;
  const targetCell = getLocalCell(zone, target.x, target.y);
  if (!targetCell?.walkable) return null;

  const startKey = key(start.x, start.y);
  const queue = [{ x: start.x, y: start.y, cost: 0, path: [] }];
  const best = new Map([[startKey, 0]]);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (current.x === target.x && current.y === target.y) {
      return { cost: current.cost, path: current.path };
    }

    for (const [dx, dy] of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      const cell = getLocalCell(zone, x, y);
      if (!cell?.walkable) continue;

      const stepCost = cell.terrain === "rubble" ? 2 : 1;
      const nextCost = current.cost + stepCost;
      if (nextCost > maxCost) continue;

      const cellKey = key(x, y);
      if ((best.get(cellKey) ?? Infinity) <= nextCost) continue;
      best.set(cellKey, nextCost);
      queue.push({
        x,
        y,
        cost: nextCost,
        path: [...current.path, { x, y }],
      });
    }
  }

  return null;
}
