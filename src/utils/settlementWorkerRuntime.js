// Local presentation state only. Never award resources or persist animation frames.
const key = p => `${p.x},${p.y}`;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ACTIONS = new Set(['build', 'repair', 'tend_crops', 'business', 'scavenging', 'hunting_gathering', 'trade_caravan', 'guard']);
const CARRY_ACTIONS = new Set(['tend_crops', 'scavenging', 'hunting_gathering', 'trade_caravan']);
const active = b => b.state === 'active' && Number(b.condition ?? 100) > 0 && !b.autoDisabled && b.powered !== false;

/** Buildings are enriched by the caller with the existing catalog and power resolver. */
export function createWorkerWorld(buildings = [], size = 24) {
  const blocked = new Set();
  for (const b of buildings) {
    if (!b.footprint || !Number.isInteger(b.x) || !Number.isInteger(b.y)) continue;
    for (let y = b.y; y < b.y + b.footprint.height; y++)
      for (let x = b.x; x < b.x + b.footprint.width; x++) blocked.add(`${x},${y}`);
  }
  const cells = Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size) }))
    .filter(p => !blocked.has(key(p)));
  return { buildings, size, cells, allowed: new Set(cells.map(key)) };
}

export function workerPath(world, start, goal) {
  if (!start || !goal || !world.allowed.has(key(start)) || !world.allowed.has(key(goal))) return [];
  const queue = [start], previous = new Map([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(goal)) {
      const result = [];
      for (let current = p; current; current = previous.get(key(current))) result.push(current);
      return result.reverse();
    }
    for (const [dx, dy] of DIRECTIONS) {
      const next = { x: p.x + dx, y: p.y + dy }, id = key(next);
      if (world.allowed.has(id) && !previous.has(id)) { previous.set(id, p); queue.push(next); }
    }
  }
  return [];
}

export function workerAnchor(world, position) {
  if (!world.cells.length) return null;
  const p = position && Number.isFinite(position.x) && Number.isFinite(position.y) ? position : world.cells[0];
  const rounded = { x: Math.round(p.x), y: Math.round(p.y) };
  if (world.allowed.has(key(rounded))) return rounded;
  return world.cells.reduce((best, cell) =>
    Math.hypot(cell.x - p.x, cell.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? cell : best);
}

function ports(world, building) {
  const f = building.footprint;
  if (!f) return [];
  const points = [];
  for (let x = building.x; x < building.x + f.width; x++) {
    points.push({ x, y: building.y + f.height }, { x, y: building.y - 1 });
  }
  for (let y = building.y; y < building.y + f.height; y++) {
    points.push({ x: building.x - 1, y }, { x: building.x + f.width, y });
  }
  return points.filter(p => world.allowed.has(key(p)));
}

function reachable(world, start, candidates, index = 0) {
  if (!start || !candidates.length) return null;
  const offset = Math.abs(index) % candidates.length;
  for (let i = 0; i < candidates.length; i++) {
    const goal = candidates[(i + offset) % candidates.length];
    if (workerPath(world, start, goal).length) return goal;
  }
  return null;
}

function supports(building, action) {
  const e = building.effects || {};
  return action === 'tend_crops' ? Boolean(e.cropSlots) : action === 'business' ? Boolean(e.store) :
    action === 'trade_caravan' ? Boolean(e.tradeOutpost) : action === 'guard' ? Boolean(e.guardActionDefenseBonus) :
    action === 'scavenging' ? building.type === 'scrap_yard' : false;
}

/** Resolve a visual task from the saved assignment, not from a stale status string. */
export function resolveWorkerJob(world, resident, index = 0, position) {
  const action = resident.settlementAction || {};
  const hq = world.buildings.find(b => b.type === 'settlement_hq' && active(b));
  const entrances = hq ? ports(world, hq) : [];
  const start = workerAnchor(world, position || entrances[index % Math.max(1, entrances.length)]);
  const depot = hq && reachable(world, start, entrances, index);
  const home = depot || start;
  const base = { action: action.type || '', home, depotAvailable: Boolean(depot), goal: home, targetId: null, roomId: null, reason: '', kind: 'idle' };
  const wait = reason => ({ ...base, kind: 'waiting', reason });
  if (!start) return wait('no_space');
  if (!action.type) return base;
  if (!ACTIONS.has(action.type)) return wait('unavailable');

  let target;
  if (action.type === 'build' || action.type === 'repair') {
    const id = action.targetRoomId ? action.parentBuildingId : action.targetBuildingId;
    if (!id) return wait('choose_target');
    target = world.buildings.find(b => b.id === id);
    base.targetId = id;
    base.roomId = action.targetRoomId || null;
    if (!target) return wait('missing_target');
    if (action.type === 'repair') {
      if (!target.repair || Number(target.condition ?? 100) >= 100) return wait('completed');
    } else if (action.targetRoomId) {
      const room = (target.rooms || []).find(r => r.id === action.targetRoomId);
      if (!room) return wait('missing_target');
      if (room.state !== 'construction') return wait('completed');
      if (target.state !== 'active' || Number(target.condition ?? 100) <= 0 || target.autoDisabled) return wait('unavailable');
    } else if (target.state !== 'construction') return wait('completed');
  } else {
    // Legacy assignedBuildingId may still point at the previous construction job.
    // Only honor it when it is compatible with the current action.
    const explicitId = action.targetBuildingId || action.parentBuildingId;
    const preferredId = explicitId || resident.assignedBuildingId;
    const preferred = world.buildings.find(b => b.id === preferredId);
    if (explicitId && (!preferred || !supports(preferred, action.type))) return wait('missing_target');
    if (preferred && supports(preferred, action.type)) {
      target = preferred;
      base.targetId = target.id;
      if (!active(target)) return wait('unavailable');
    } else {
      const candidates = world.buildings.filter(b => active(b) && supports(b, action.type));
      target = candidates[index % Math.max(1, candidates.length)];
    }
    if (!target && ['tend_crops', 'business', 'trade_caravan'].includes(action.type)) return wait('unavailable');
  }

  let goal;
  if (target) {
    base.targetId = target.id;
    goal = reachable(world, start, ports(world, target), index);
  } else {
    const candidates = world.cells.filter(p => action.type === 'guard'
      ? Math.abs(p.x - home.x) + Math.abs(p.y - home.y) <= 4
      : p.x === 0 || p.y === 0 || p.x === world.size - 1 || p.y === world.size - 1);
    goal = reachable(world, start, candidates, index * 17);
  }
  if (!goal) return wait('blocked');
  return { ...base, goal, kind: action.type === 'guard' ? 'patrol' : 'work' };
}

function route(state, world, destination, phase) {
  const start = workerAnchor(world, state);
  const path = workerPath(world, start, destination);
  if (!path.length) { state.phase = 'waiting'; state.reason = 'blocked'; state.path = []; state.cargo = false; return; }
  state.x = start.x; state.y = start.y;
  state.path = path.slice(1); state.phase = phase; state.elapsed = 0;
}

export function createWorkerState(world, job, position, index = 0) {
  const start = workerAnchor(world, position);
  const state = { x: start?.x ?? 0, y: start?.y ?? 0, job, index, path: [], phase: job.kind, reason: job.reason, elapsed: 0, cycle: 0, cargo: false };
  if (job.kind === 'work' || job.kind === 'patrol') route(state, world, job.goal, 'to_work');
  return state;
}

// RTS movement orders are intentionally presentation-only. They never write to the
// settlement or award production; after a short hold the saved assignment resumes.
export function commandWorkerMove(state, world, destination) {
  if (!state || !world || !destination) return false;
  const start = workerAnchor(world, state), goal = workerAnchor(world, destination);
  if (!start || !goal) return false;
  const path = workerPath(world, start, goal);
  if (!path.length) return false;
  state.x = start.x; state.y = start.y;
  state.path = path.slice(1);
  state.phase = 'manual_move';
  state.reason = '';
  state.elapsed = 0;
  state.cargo = false;
  return true;
}

export function resumeWorkerJob(state, world) {
  if (!state?.job || !world) return state;
  const resumed = createWorkerState(world, state.job, state, state.index);
  Object.assign(state, resumed);
  return state;
}

/** Advance a cosmetic cycle. Long/hidden frames never advance settlement production. */
export function advanceWorkerState(state, world, deltaMs) {
  const dt = Math.min(80, Math.max(0, Number(deltaMs) || 0));
  if (state.phase === 'idle' || state.phase === 'waiting' || !dt) return state;
  if (state.path.length) {
    const next = state.path[0], dx = next.x - state.x, dy = next.y - state.y;
    const distance = Math.hypot(dx, dy), step = dt * 0.0009;
    if (distance <= step) { state.x = next.x; state.y = next.y; state.path.shift(); }
    else { state.x += dx / distance * step; state.y += dy / distance * step; }
    return state;
  }
  if (state.phase === 'manual_move') {
    state.phase = 'manual_hold'; state.elapsed = 0; state.cargo = false;
    return state;
  }
  if (state.phase === 'manual_hold') {
    state.elapsed += dt;
    if (state.elapsed >= 2500) resumeWorkerJob(state, world);
    return state;
  }
  if (state.phase === 'to_work') {
    state.phase = state.job.kind === 'patrol' ? 'patrolling' : 'working';
    state.elapsed = 0; state.cargo = false;
  } else if (state.phase === 'to_depot') {
    state.phase = state.job.action === 'build' ? 'loading' : 'unloading'; state.elapsed = 0;
  }
  state.elapsed += dt;
  if (state.phase === 'working' && state.elapsed >= 3200 + (state.index % 5) * 200) {
    if (state.job.depotAvailable && (CARRY_ACTIONS.has(state.job.action) || state.job.action === 'build')) {
      state.cargo = CARRY_ACTIONS.has(state.job.action);
      route(state, world, state.job.home, 'to_depot');
    } else state.elapsed = 0;
  } else if ((state.phase === 'loading' || state.phase === 'unloading') && state.elapsed >= 1000) {
    state.cargo = state.job.action === 'build'; state.cycle++;
    route(state, world, state.job.goal, 'to_work');
  } else if (state.phase === 'patrolling' && state.elapsed >= 1800) {
    const candidates = world.cells.filter(p => Math.abs(p.x - state.job.goal.x) + Math.abs(p.y - state.job.goal.y) <= 3);
    const goal = reachable(world, workerAnchor(world, state), candidates, state.index * 7 + ++state.cycle * 11);
    if (goal) route(state, world, goal, 'to_work');
    else { state.phase = 'waiting'; state.reason = 'blocked'; }
  }
  return state;
}
