import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerWorld, workerPath, workerAnchor, resolveWorkerJob, createWorkerState, advanceWorkerState, commandWorkerMove } from '../src/utils/settlementWorkerRuntime.js';

const building = (id, x, y, extra = {}) => ({ id, type: id, x, y, state: 'active', powered: true, footprint: { width: 2, height: 2 }, effects: {}, ...extra });
const hq = () => building('home', 1, 1, { type: 'settlement_hq' });
const farm = extra => building('farm', 7, 5, { effects: { cropSlots: 6 }, ...extra });
const worker = (type, extra = {}) => ({ id: 'alice', name: 'Alice', settlementAction: type ? { type, ...extra } : null });
const world = (extra = []) => createWorkerWorld([hq(), farm(), ...extra], 12);
const run = (state, map, frames = 1800) => { const phases = new Set(); let cargo = false; for (let i = 0; i < frames; i++) { advanceWorkerState(state, map, 80); phases.add(state.phase); cargo ||= state.cargo; } return { phases, cargo }; };

function deepFreeze(object) { if (object && typeof object === 'object') { Object.freeze(object); Object.values(object).forEach(deepFreeze); } return object; }

test('paths stay inside the grid and outside every building footprint', () => {
  const map = world(), path = workerPath(map, { x: 0, y: 0 }, { x: 11, y: 11 });
  assert.ok(path.length > 0);
  path.forEach((p, i) => { assert.ok(map.allowed.has(`${p.x},${p.y}`)); if (i) assert.equal(Math.abs(p.x-path[i-1].x)+Math.abs(p.y-path[i-1].y), 1); });
});
test('disconnected goals return no path instead of a straight line', () => {
  const map = createWorkerWorld([building('wall', 5, 0, { footprint: { width: 1, height: 12 } })], 12);
  assert.deepEqual(workerPath(map, { x: 0, y: 0 }, { x: 11, y: 0 }), []);
});
test('invalid endpoints and an entirely occupied map are safe', () => {
  const map = createWorkerWorld([building('full', 0, 0, { footprint: { width: 2, height: 2 } })], 2);
  assert.equal(workerAnchor(map), null);
  assert.deepEqual(workerPath(map, null, { x: 0, y: 0 }), []);
  assert.equal(resolveWorkerJob(map, worker('build')).reason, 'no_space');
});
test('unassigned residents never act on legacy assignedBuildingId', () => {
  const job = resolveWorkerJob(world(), { ...worker(null), assignedBuildingId: 'farm', status: 'working' });
  assert.equal(job.kind, 'idle'); assert.equal(job.targetId, null);
});
test('a builder without a target waits rather than hammering the ground', () => {
  assert.equal(resolveWorkerJob(world(), worker('build')).reason, 'choose_target');
});
test('construction worker targets its own construction footprint', () => {
  const map = world([building('site', 7, 1, { state: 'construction' })]);
  const job = resolveWorkerJob(map, worker('build', { targetBuildingId: 'site' }));
  assert.equal(job.kind, 'work'); assert.equal(job.targetId, 'site'); assert.ok(map.allowed.has(`${job.goal.x},${job.goal.y}`));
});
test('completed construction stops work without assigning another building', () => {
  const job = resolveWorkerJob(world(), worker('build', { targetBuildingId: 'farm' }));
  assert.equal(job.reason, 'completed'); assert.equal(job.kind, 'waiting');
});
test('removed construction targets and rooms report the missing target', () => {
  assert.equal(resolveWorkerJob(world(), worker('build', { targetBuildingId: 'gone' })).reason, 'missing_target');
  assert.equal(resolveWorkerJob(world(), worker('build', { parentBuildingId: 'home', targetRoomId: 'gone' })).reason, 'missing_target');
});
test('room construction targets its active parent and stops after completion', () => {
  for (const state of ['construction', 'active']) {
    const map = createWorkerWorld([{ ...hq(), rooms: [{ id: 'room', state }] }], 12);
    const job = resolveWorkerJob(map, worker('build', { parentBuildingId: 'home', targetRoomId: 'room' }));
    assert.equal(job.targetId, 'home'); assert.equal(job.roomId, 'room');
    assert.equal(job.kind, state === 'construction' ? 'work' : 'waiting');
  }
});
test('crops use a compatible target instead of an old construction assignment', () => {
  const job = resolveWorkerJob(world(), { ...worker('tend_crops'), assignedBuildingId: 'home' });
  assert.equal(job.kind, 'work'); assert.equal(job.targetId, 'farm');
});
test('broken, disabled, unpowered and unfinished farms are not workplaces', () => {
  for (const patch of [{ condition: 0 }, { autoDisabled: true }, { powered: false }, { state: 'construction' }]) {
    const map = createWorkerWorld([hq(), farm(patch)], 12);
    assert.equal(resolveWorkerJob(map, worker('tend_crops')).reason, 'unavailable');
  }
});
test('explicit incompatible workplaces do not silently redirect the worker', () => {
  assert.equal(resolveWorkerJob(world(), worker('business', { targetBuildingId: 'farm' })).reason, 'missing_target');
});
test('jobs with mandatory buildings wait until the right building exists', () => {
  const map = createWorkerWorld([hq()], 12);
  for (const type of ['tend_crops', 'business', 'trade_caravan']) assert.equal(resolveWorkerJob(map, worker(type)).kind, 'waiting');
});
test('guarding and offsite gathering remain available without special buildings', () => {
  const map = createWorkerWorld([hq()], 12);
  for (const type of ['guard', 'scavenging', 'hunting_gathering']) {
    const job = resolveWorkerJob(map, worker(type));
    assert.notEqual(job.kind, 'waiting'); assert.ok(workerPath(map, job.home, job.goal).length);
  }
});
test('inaccessible construction gets blocked status, not a distant substitute goal', () => {
  const map = createWorkerWorld([hq(), building('wall', 5, 0, { footprint: { width: 1, height: 12 } }), building('site', 8, 5, { state: 'construction' })], 12);
  assert.equal(resolveWorkerJob(map, worker('build', { targetBuildingId: 'site' })).reason, 'blocked');
});
test('new residents spawn at reachable HQ entrances even when the top-left corner is isolated', () => {
  const map = createWorkerWorld([building('wall', 2, 0, { footprint: { width: 1, height: 12 } }), building('home', 4, 1, { type: 'settlement_hq' }), farm()], 12);
  const job = resolveWorkerJob(map, worker('tend_crops'));
  assert.equal(job.kind, 'work'); assert.ok(job.home.x > 2);
});
test('harvesting cycles through work, carrying and unloading', () => {
  const map = world(), job = resolveWorkerJob(map, worker('tend_crops'));
  const state = createWorkerState(map, job, job.home);
  const result = run(state, map);
  for (const phase of ['to_work', 'working', 'to_depot', 'unloading']) assert.ok(result.phases.has(phase), phase);
  assert.ok(result.cargo); assert.ok(state.cycle > 0);
});
test('builders fetch supplies and carry them back to the construction site', () => {
  const map = world([building('site', 7, 1, { state: 'construction' })]);
  const job = resolveWorkerJob(map, worker('build', { targetBuildingId: 'site' }));
  const state = createWorkerState(map, job, job.home), result = run(state, map);
  assert.ok(result.phases.has('loading')); assert.ok(result.phases.has('working')); assert.ok(result.cargo);
});
test('no reachable depot means no invented delivery loop', () => {
  const map = createWorkerWorld([farm()], 12), job = resolveWorkerJob(map, worker('tend_crops'));
  const result = run(createWorkerState(map, job, job.home), map);
  assert.equal(job.depotAvailable, false); assert.equal(result.cargo, false); assert.equal(result.phases.has('to_depot'), false);
});
test('patrol routes remain outside buildings over multiple cycles', () => {
  const map = world(), job = resolveWorkerJob(map, worker('guard'));
  const state = createWorkerState(map, job, job.home);
  for (let i = 0; i < 1800; i++) { advanceWorkerState(state, map, 80); const p = workerAnchor(map, state); assert.ok(map.allowed.has(`${p.x},${p.y}`)); }
  assert.ok(state.cycle > 0);
});
test('a long hidden-tab frame is clamped and does not skip a working day', () => {
  const map = world(), job = resolveWorkerJob(map, worker('tend_crops'));
  const state = createWorkerState(map, job, job.home), before = { x: state.x, y: state.y };
  advanceWorkerState(state, map, 86400000);
  assert.ok(Math.hypot(state.x-before.x, state.y-before.y) <= .072001); assert.equal(state.cycle, 0);
});
test('planning and many animation frames never mutate saved settlement data', () => {
  const saved = deepFreeze({ buildings: [hq(), farm()], settlers: [worker('tend_crops')], stockpile: { food: 10 }, constructionProgressDays: 2 });
  const before = JSON.stringify(saved), map = createWorkerWorld(saved.buildings, 12);
  const job = resolveWorkerJob(map, saved.settlers[0]); run(createWorkerState(map, job, job.home), map, 3600);
  assert.equal(JSON.stringify(saved), before);
});
test('reassignment discards an in-flight delivery and its cargo', () => {
  const map = world(), oldJob = resolveWorkerJob(map, worker('tend_crops'));
  const old = createWorkerState(map, oldJob, oldJob.home); old.cargo = true; old.phase = 'to_depot';
  const job = resolveWorkerJob(map, worker(null), 0, old), state = createWorkerState(map, job, old);
  assert.equal(state.phase, 'idle'); assert.equal(state.cargo, false); assert.deepEqual(state.path, []);
});


test('manual RTS move order temporarily overrides movement then resumes the saved job', () => {
  const map = world(), job = resolveWorkerJob(map, worker('tend_crops'));
  const state = createWorkerState(map, job, job.home);
  const goal = map.cells.find(cell => cell.x === 11 && cell.y === 11);
  assert.ok(goal);
  assert.equal(commandWorkerMove(state, map, goal), true);
  assert.equal(state.phase, 'manual_move');
  assert.equal(state.cargo, false);
  let sawHold = false;
  for (let i = 0; i < 2200; i++) {
    advanceWorkerState(state, map, 80);
    sawHold ||= state.phase === 'manual_hold';
    if (sawHold && state.phase !== 'manual_hold' && state.phase !== 'manual_move') break;
  }
  assert.equal(sawHold, true);
  assert.notEqual(state.phase, 'manual_move');
  assert.notEqual(state.phase, 'manual_hold');
  assert.equal(state.job, job);
});

test('manual RTS move rejects missing destinations without changing the worker', () => {
  const map = world(), job = resolveWorkerJob(map, worker('guard'));
  const state = createWorkerState(map, job, job.home);
  const before = JSON.stringify(state);
  assert.equal(commandWorkerMove(state, map, null), false);
  assert.equal(JSON.stringify(state), before);
});
