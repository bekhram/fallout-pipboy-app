import { createWorkerWorld, workerAnchor, workerPath } from './settlementWorkerRuntime.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0));
const aliveEnemy = enemy => enemy.alive && enemy.hp > 0;
const activeUnit = unit => unit.alive && !unit.retreated && unit.hp > 0;

function nearestAllowed(world, point) {
  return workerAnchor(world, point);
}

function edgeCells(world) {
  return world.cells.filter(cell => cell.x === 0 || cell.y === 0 || cell.x === world.size - 1 || cell.y === world.size - 1);
}

function hqPosition(buildings, world) {
  const hq = buildings.find(building => building.type === 'settlement_hq');
  if (!hq) return nearestAllowed(world, { x: world.size / 2, y: world.size / 2 });
  const footprint = hq.footprint || { width: 1, height: 1 };
  return nearestAllowed(world, { x: hq.x + footprint.width / 2, y: hq.y + footprint.height + 1 });
}

function formationGoals(world, target, count) {
  const anchor = nearestAllowed(world, target);
  if (!anchor) return [];
  const candidates = [...world.cells]
    .filter(cell => Math.abs(cell.x - anchor.x) <= 3 && Math.abs(cell.y - anchor.y) <= 3)
    .sort((a, b) => distance(a, anchor) - distance(b, anchor) || a.y - b.y || a.x - b.x);
  return candidates.slice(0, Math.max(1, count));
}

function assignPath(entity, world, goal) {
  const start = workerAnchor(world, entity), end = nearestAllowed(world, goal);
  if (!start || !end) { entity.path = []; return false; }
  const path = workerPath(world, start, end);
  if (!path.length) { entity.path = []; return false; }
  entity.path = path.slice(1);
  entity.goal = { x: end.x, y: end.y };
  return true;
}

function moveEntity(entity, world, deltaMs, speed) {
  if (!entity.path?.length) return false;
  const dt = Math.min(100, Math.max(0, Number(deltaMs) || 0));
  const next = entity.path[0];
  const dx = next.x - entity.x, dy = next.y - entity.y;
  const d = Math.hypot(dx, dy);
  const step = speed * dt / 1000;
  if (d <= step) {
    entity.x = next.x; entity.y = next.y; entity.path.shift();
  } else if (d > 0) {
    entity.x += dx / d * step; entity.y += dy / d * step;
  }
  return true;
}

function chooseEnemyTarget(state, enemy) {
  const units = state.units.filter(activeUnit);
  const nearby = units.filter(unit => distance(unit, enemy) <= 6)
    .sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
  return nearby ? { type: 'unit', entity: nearby } : { type: 'hq', entity: state.hq };
}

function refreshEnemyPath(state, enemy, target) {
  const id = target.type === 'unit' ? target.entity.id : 'hq';
  if (enemy.targetId === id && enemy.path?.length) return;
  enemy.targetId = id;
  const point = target.type === 'unit' ? target.entity : state.hq.position;
  assignPath(enemy, state.world, point);
}

export function createRtsCombatState({ buildings = [], workers = [], size = 24 } = {}) {
  const world = createWorkerWorld(buildings, size);
  const free = [...world.cells].sort((a, b) => distance(a, { x: size / 2, y: size / 2 }) - distance(b, { x: size / 2, y: size / 2 }));
  const units = workers.map((worker, index) => {
    const spawn = nearestAllowed(world, worker.position) || free[index % Math.max(1, free.length)] || { x: 0, y: 0 };
    return {
      id: worker.id || `worker-${index}`, name: worker.name || `Worker ${index + 1}`,
      x: spawn.x, y: spawn.y, hp: 100, maxHp: 100, alive: true, retreated: false,
      selected: false, command: 'hold', path: [], goal: null, patrol: null,
      speed: 2.2, range: 4.5, damage: 12, cooldown: 0,
    };
  });
  const position = hqPosition(buildings, world) || { x: Math.floor(size / 2), y: Math.floor(size / 2) };
  return {
    world, buildings, units, enemies: [], wave: 0, phase: 'ready', elapsed: 0,
    hq: { hp: 300, maxHp: 300, position },
    message: 'ready', lastEvents: [],
  };
}

export function selectedRtsUnits(state) {
  return state.units.filter(unit => unit.selected && unit.alive && !unit.retreated);
}

export function toggleRtsSelection(state, unitId, additive = true) {
  const target = state.units.find(unit => unit.id === unitId && unit.alive && !unit.retreated);
  if (!target) return state;
  if (!additive) state.units.forEach(unit => { unit.selected = false; });
  target.selected = !target.selected;
  return state;
}

export function selectAllRtsUnits(state) {
  state.units.forEach(unit => { unit.selected = unit.alive && !unit.retreated; });
  return state;
}

export function clearRtsSelection(state) {
  state.units.forEach(unit => { unit.selected = false; });
  return state;
}

export function issueRtsCommand(state, command, target = null) {
  const units = selectedRtsUnits(state);
  if (!units.length) return false;
  if (command === 'hold') {
    for (const unit of units) {
      unit.command = 'hold'; unit.path = []; unit.goal = null; unit.patrol = null;
    }
    state.message = 'holding';
    return true;
  }
  if (!target || !['move', 'patrol'].includes(command)) return false;
  const goals = formationGoals(state.world, target, units.length);
  let changed = false;
  units.forEach((unit, index) => {
    const goal = goals[index % Math.max(1, goals.length)] || target;
    if (command === 'move') {
      changed = assignPath(unit, state.world, goal) || changed;
      unit.command = 'move'; unit.patrol = null;
    } else {
      const start = nearestAllowed(state.world, unit);
      if (!start) return;
      unit.patrol = { a: { x: start.x, y: start.y }, b: { x: goal.x, y: goal.y }, next: 'b' };
      changed = assignPath(unit, state.world, unit.patrol.b) || changed;
      unit.command = 'patrol';
    }
  });
  state.message = command;
  return changed;
}

export function spawnRtsWave(state) {
  if (state.phase === 'active') return false;
  state.wave += 1;
  state.phase = 'active';
  state.hq.hp = state.hq.maxHp;
  state.units.forEach(unit => {
    unit.hp = unit.maxHp; unit.alive = true; unit.retreated = false; unit.cooldown = 0;
    unit.selected = false; unit.command = 'hold'; unit.path = []; unit.patrol = null;
  });
  const edges = edgeCells(state.world);
  const count = Math.min(12, 4 + state.wave * 2);
  const hp = 42 + state.wave * 8;
  state.enemies = Array.from({ length: count }, (_, index) => {
    const spawn = edges[Math.floor((index + .5) * edges.length / count) % Math.max(1, edges.length)] || { x: 0, y: 0 };
    return {
      id: `raider-${state.wave}-${index + 1}`, x: spawn.x, y: spawn.y,
      hp, maxHp: hp, alive: true, path: [], goal: null, targetId: null,
      speed: 1.25 + Math.min(.5, state.wave * .05), damage: 9 + state.wave,
      cooldown: 0, range: .85,
    };
  });
  state.message = 'wave';
  return true;
}

function processPatrol(state, unit) {
  if (unit.command !== 'patrol' || unit.path.length || !unit.patrol) return;
  const goal = unit.patrol.next === 'b' ? unit.patrol.a : unit.patrol.b;
  unit.patrol.next = unit.patrol.next === 'b' ? 'a' : 'b';
  assignPath(unit, state.world, goal);
}

function processRetreat(state, unit, events) {
  if (!unit.alive || unit.retreated || unit.hp > 25) return;
  unit.command = 'retreat'; unit.patrol = null; unit.selected = false;
  if (!assignPath(unit, state.world, state.hq.position)) {
    unit.retreated = true; unit.path = [];
  }
  events.push({ type: 'retreat', unitId: unit.id });
}

function processUnitCombat(state, unit, events) {
  if (!activeUnit(unit)) return;
  unit.cooldown = Math.max(0, unit.cooldown);
  const target = state.enemies.filter(aliveEnemy)
    .filter(enemy => distance(unit, enemy) <= unit.range)
    .sort((a, b) => distance(unit, a) - distance(unit, b))[0];
  if (!target || unit.cooldown > 0) return;
  target.hp -= unit.damage;
  unit.cooldown = 650;
  if (target.hp <= 0) { target.hp = 0; target.alive = false; target.path = []; }
  events.push({ type: 'shot', from: unit.id, to: target.id, killed: !target.alive });
}

function processEnemy(state, enemy, deltaMs, events) {
  if (!aliveEnemy(enemy)) return;
  enemy.cooldown = Math.max(0, enemy.cooldown);
  const target = chooseEnemyTarget(state, enemy);
  const point = target.type === 'unit' ? target.entity : state.hq.position;
  if (distance(enemy, point) <= enemy.range) {
    enemy.path = [];
    if (enemy.cooldown > 0) return;
    enemy.cooldown = 900;
    if (target.type === 'unit') {
      target.entity.hp = clamp(target.entity.hp - enemy.damage, 0, target.entity.maxHp);
      if (target.entity.hp <= 0) {
        target.entity.alive = false; target.entity.selected = false; target.entity.path = [];
        events.push({ type: 'unit_down', unitId: target.entity.id, enemyId: enemy.id });
      } else events.push({ type: 'enemy_hit', enemyId: enemy.id, unitId: target.entity.id });
    } else {
      state.hq.hp = clamp(state.hq.hp - enemy.damage, 0, state.hq.maxHp);
      events.push({ type: 'hq_hit', enemyId: enemy.id });
    }
    return;
  }
  refreshEnemyPath(state, enemy, target);
  moveEntity(enemy, state.world, deltaMs, enemy.speed);
}

export function stepRtsCombat(state, deltaMs) {
  const dt = Math.min(100, Math.max(0, Number(deltaMs) || 0));
  const events = [];
  if (!dt || state.phase !== 'active') { state.lastEvents = events; return events; }
  state.elapsed += dt;
  for (const unit of state.units) {
    unit.cooldown = Math.max(0, unit.cooldown - dt);
    processRetreat(state, unit, events);
    if (!unit.alive || unit.retreated) continue;
    if (unit.command === 'retreat') {
      if (unit.path.length) moveEntity(unit, state.world, dt, unit.speed * 1.2);
      if (!unit.path.length) { unit.retreated = true; events.push({ type: 'retreated', unitId: unit.id }); }
      continue;
    }
    if (unit.path.length) moveEntity(unit, state.world, dt, unit.speed);
    else if (unit.command === 'move') unit.command = 'hold';
    processPatrol(state, unit);
    processUnitCombat(state, unit, events);
  }
  for (const enemy of state.enemies) {
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    processEnemy(state, enemy, dt, events);
  }

  const enemiesAlive = state.enemies.filter(aliveEnemy).length;
  const defendersAvailable = state.units.filter(activeUnit).length;
  if (state.hq.hp <= 0) {
    state.phase = 'defeat'; state.message = 'hq_lost';
  } else if (state.enemies.length && enemiesAlive === 0) {
    state.phase = 'victory'; state.message = 'victory';
  } else if (!defendersAvailable && state.enemies.length && enemiesAlive > 0) {
    state.message = 'defenders_down';
  }
  state.lastEvents = events;
  return events;
}

export function rtsCombatSummary(state) {
  return {
    phase: state.phase, wave: state.wave,
    selected: selectedRtsUnits(state).length,
    defendersAlive: state.units.filter(unit => unit.alive && !unit.retreated).length,
    defendersRetreated: state.units.filter(unit => unit.retreated).length,
    enemiesAlive: state.enemies.filter(aliveEnemy).length,
    enemiesTotal: state.enemies.length,
    hqHp: state.hq.hp, hqMaxHp: state.hq.maxHp,
    message: state.message,
    units: state.units.map(unit => ({ id: unit.id, name: unit.name, hp: unit.hp, maxHp: unit.maxHp, alive: unit.alive, retreated: unit.retreated, selected: unit.selected, command: unit.command })),
  };
}
