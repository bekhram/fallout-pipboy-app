import test from 'node:test';
import assert from 'node:assert/strict';
import { SettlementWorkerActor } from '../src/components/settlement/SettlementWorkerActor.js';
import { createWorkerWorld, resolveWorkerJob } from '../src/utils/settlementWorkerRuntime.js';

// A display-object double, not a replacement for browser / real Phaser validation.
function sceneDouble() {
  const objects = [];
  function node(kind, ...args) {
    const item = { kind, x: args[0], y: args[1], text: kind === 'text' ? args[2] : '', visible: true, handlers: {}, children: [],
      setDepth(value) { this.depth = value; return this; }, setOrigin() { return this; },
      setStrokeStyle() { return this; }, setVisible(value) { this.visible = value; return this; },
      setFillStyle(value) { this.fill = value; return this; }, setInteractive() { return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; }, setText(value) { this.text = value; return this; },
      on(event, handler) { this.handlers[event] = handler; return this; },
      add(children) { this.children.push(...children); return this; },
      destroy() { this.destroyed = true; this.children.forEach(child => child.destroy()); },
    };
    objects.push(item); return item;
  }
  return { objects, add: Object.fromEntries(['container', 'ellipse', 'rectangle', 'circle', 'text'].map(kind => [kind, (...args) => node(kind, ...args)])) };
}
const building = (id, x, y, extra = {}) => ({ id, type: id, x, y, state: 'active', powered: true, footprint: { width: 2, height: 2 }, ...extra });
const makeWorld = () => createWorkerWorld([building('home', 1, 1, { type: 'settlement_hq' }), building('farm', 6, 6, { effects: { cropSlots: 6 } })], 10);
const resident = type => ({ id: 'alice', name: 'Alice', settlementAction: type ? { type } : null });
function actorFor(type, options = {}) {
  const scene = sceneDouble(), map = makeWorld(), actor = new SettlementWorkerActor(scene);
  const person = resident(type), job = resolveWorkerJob(map, person);
  actor.configure(map, job, { resident: person, actionName: type || '', ...options });
  return { scene, map, actor, job, person };
}

test('actors show tools only while working and cargo while delivering', () => {
  const { actor } = actorFor('tend_crops');
  assert.equal(actor.tool.visible, false);
  let tool = false, cargo = false;
  for (let i = 0; i < 1800; i++) { actor.update(i * 80, 80); tool ||= actor.tool.visible; cargo ||= actor.cargo.visible; }
  assert.ok(tool); assert.ok(cargo);
});
test('idle and invalid assignments never show tools or cargo', () => {
  for (const action of [null, 'build', 'unsupported']) {
    const { actor } = actorFor(action);
    for (let i = 0; i < 50; i++) actor.update(i * 80, 80);
    assert.equal(actor.tool.visible, false); assert.equal(actor.cargo.visible, false);
  }
});
test('a repeated sync keeps position, phase and cycle progress', () => {
  const { actor, map, job, person } = actorFor('tend_crops');
  for (let i = 0; i < 50; i++) actor.update(i * 80, 80);
  const state = actor.state, before = JSON.stringify(state);
  actor.configure(map, job, { resident: person });
  assert.equal(actor.state, state); assert.equal(JSON.stringify(actor.state), before);
});
test('removing an assignment immediately hides a carried crate and clears its path', () => {
  const { actor, map } = actorFor('tend_crops');
  actor.state.cargo = true; actor.render(0); assert.equal(actor.cargo.visible, true);
  const person = resident(null), job = resolveWorkerJob(map, person, 0, actor.state);
  actor.configure(map, job, { resident: person });
  assert.equal(actor.cargo.visible, false); assert.equal(actor.tool.visible, false); assert.equal(actor.state.phase, 'idle');
});
test('reduced motion displays a static worker at its assigned site', () => {
  const { actor, job } = actorFor('tend_crops', { reduced: true });
  const position = [actor.container.x, actor.container.y];
  for (let i = 0; i < 500; i++) actor.update(i * 80, 80);
  assert.deepEqual([actor.container.x, actor.container.y], position);
  assert.deepEqual(position, [(job.goal.x + .5) * 40, (job.goal.y + .5) * 40]);
  assert.equal(actor.state.phase, 'working'); assert.equal(actor.cargo.visible, false);
});
test('turning reduced motion off resumes a valid route instead of a stale path', () => {
  const { actor, map, job, person } = actorFor('tend_crops', { reduced: true });
  actor.configure(map, job, { resident: person, reduced: false });
  for (let i = 0; i < 100; i++) actor.update(i * 80, 80);
  assert.notEqual(actor.state.phase, 'waiting');
});
test('mobile taps pin and unpin the status label and stop map click propagation', () => {
  const { actor } = actorFor('tend_crops'); let stopped = 0;
  actor.body.handlers.pointerdown(null, 0, 0, { stopPropagation() { stopped++; } });
  assert.equal(actor.label.visible, true); actor.body.handlers.pointerout(); assert.equal(actor.label.visible, true);
  actor.body.handlers.pointerdown(null, 0, 0, { stopPropagation() { stopped++; } });
  assert.equal(actor.label.visible, false); assert.equal(stopped, 2);
});
test('waiting explanations are localized in all four app languages', () => {
  for (const [language, phrase] of [['en', 'Choose a construction target'], ['ru', 'Выберите цель строительства'], ['uk', 'Оберіть ціль будівництва'], ['pl', 'Wybierz cel budowy']]) {
    const { actor } = actorFor('build', { language }); assert.ok(actor.label.text.includes(phrase));
  }
});
test('empty worlds hide workers and recovery creates a usable local state', () => {
  const { actor, person, map } = actorFor('tend_crops');
  const full = createWorkerWorld([building('full', 0, 0, { footprint: { width: 2, height: 2 } })], 2);
  actor.configure(full, resolveWorkerJob(full, person), { resident: person, reset: true });
  assert.equal(actor.container.visible, false);
  actor.configure(map, resolveWorkerJob(map, person), { resident: person, reset: true });
  assert.equal(actor.container.visible, true); assert.notEqual(actor.state.phase, 'waiting');
});
test('destroying an actor removes all its child display objects', () => {
  const { actor, scene } = actorFor('tend_crops'); actor.destroy();
  assert.ok(scene.objects.every(object => object.destroyed));
});
