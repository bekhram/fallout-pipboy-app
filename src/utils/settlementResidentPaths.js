import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE as SIZE } from '../data/settlement/buildings.js';
import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';

export function residentWalkableCells(settlement) {
  const blocked = new Set();
  for (const b of settlement.buildings || []) {
    const footprint = SETTLEMENT_BUILDINGS[b.type]?.footprint;
    if (!footprint) continue;
    for (let y = b.y; y < b.y + footprint.height; y++)
      for (let x = b.x; x < b.x + footprint.width; x++) blocked.add(`${x},${y}`);
  }
  return Array.from({ length: SIZE * SIZE }, (_, i) => ({ x: i % SIZE, y: Math.floor(i / SIZE) }))
    .filter(p => !blocked.has(`${p.x},${p.y}`));
}
export function residentPath(start, goal, cells) {
  if (!start || !goal) return [];
  const key = p => `${p.x},${p.y}`;
  const allowed = new Set(cells.map(key));
  if (!allowed.has(key(start)) || !allowed.has(key(goal))) return [];
  const queue = [start], previous = new Map([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(goal)) {
      const result = []; let current = p;
      while (current) { result.push(current); current = previous.get(key(current)); }
      return result.reverse();
    }
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const next = { x: p.x + dx, y: p.y + dy }, id = key(next);
      if (allowed.has(id) && !previous.has(id)) { previous.set(id, p); queue.push(next); }
    }
  }
  return [];
}
export function residentDestination(settlement, resident, cells, index = 0) {
  if (!cells.length) return null;
  const action = resident.settlementAction || {};
  let target = (settlement.buildings || []).find(b => b.id === (action.targetBuildingId || action.parentBuildingId || resident.assignedBuildingId));
  if (!target) {
    const matches = (settlement.buildings || []).filter(b => {
      if (b.state !== 'active') return false;
      const e = getRulebookBuilding(b.type)?.effects || {};
      return action.type === 'tend_crops' ? e.cropSlots : action.type === 'business' ? e.store :
        action.type === 'guard' ? e.guardActionDefenseBonus : action.type === 'trade_caravan' ? e.tradeOutpost :
        action.type === 'scavenging' ? b.type === 'scrap_yard' : false;
    });
    target = matches[index % Math.max(1, matches.length)];
  }
  if (!target) return cells[(index * 47 + (action.type ? 23 : 5)) % cells.length];
  const f = SETTLEMENT_BUILDINGS[target.type]?.footprint || { width: 1, height: 1 };
  const x = target.x + f.width / 2, y = target.y + f.height;
  return [...cells].sort((a,b) => Math.hypot(a.x+.5-x,a.y+.5-y)-Math.hypot(b.x+.5-x,b.y+.5-y))[index % Math.min(3,cells.length)];
}
