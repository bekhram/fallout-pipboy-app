import test from 'node:test';
import assert from 'node:assert/strict';
import { SettlementWorkerActor } from '../src/components/settlement/SettlementWorkerActor.js';
import { createWorkerWorld, resolveWorkerJob } from '../src/utils/settlementWorkerRuntime.js';
import { WORKER_TEXTURE } from '../src/components/settlement/workerSpriteFrames.js';

// A display-object double, not a replacement for real Phaser/browser validation.
function sceneDouble() {
  const objects = [];
  function node(kind, ...args) {
    const item = { kind, x: args[0], y: args[1], texture: kind === 'sprite' ? args[2] : null,
      text: kind === 'text' ? args[2] : '', visible: true, handlers: {}, children: [],
      setDepth(value) { this.depth = value; return this; }, setOrigin() { return this; },
      setStrokeStyle() { return this; }, setVisible(value) { this.visible = value; return this; },
      setScale(value) { this.scale = value; return this; }, setFrame(value) { this.frame = value; return this; },
      setFlipX(value) { this.flipX = value; return this; }, setInteractive(config) { this.hit = config; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; }, setText(value) { this.text = value; return this; },
      on(event, handler) { this.handlers[event] = handler; return this; },
      add(children) { this.children.push(...children); return this; },
      destroy() { this.destroyed = true; this.children.forEach(child => child.destroy()); },
    };
    objects.push(item); return item;
  }
  return { objects, cameras:{main:{zoom:1}}, add: Object.fromEntries(['container', 'sprite', 'circle', 'text'].map(kind => [kind, (...args) => node(kind, ...args)])) };
}
const building = (id, x, y, extra = {}) => ({ id, type: id, x, y, state: 'active', powered: true, footprint: { width: 2, height: 2 }, ...extra });
const makeWorld = () => createWorkerWorld([building('home', 1, 1, {type:'settlement_hq'}),building('farm',6,6,{effects:{cropSlots:6}}),building('site',6,1,{state:'construction'})],10);
const resident = type => ({ id: 'alice', name: 'Alice', settlementAction: type ? { type } : null });
function actorFor(type, options = {}, target = null) {
  const scene = sceneDouble(), map = makeWorld(), actor = new SettlementWorkerActor(scene);
  const person = resident(type);
  if (target) person.settlementAction.targetBuildingId = target;
  const job = resolveWorkerJob(map, person);
  actor.configure(map, job, { resident: person, actionName: type || '', ...options });
  return { scene, map, actor, job, person };
}

test('workers use the bundled Tiny Swords sprite, not geometric body parts', () => {
  const { actor, scene } = actorFor(null);
  assert.equal(actor.body.kind,'sprite'); assert.equal(actor.body.texture,WORKER_TEXTURE);
  assert.equal(scene.objects.filter(item=>item.kind==='sprite').length,1);
});
test('builders hammer only at work and use a separate walking strip in transit', () => {
  const {actor}=actorFor('build',{},'site');let work=false,walk=false;
  for(let i=0;i<1800;i++){
    actor.update(i*80,80);work ||= actor.animationMode==='build';walk ||= actor.animationMode==='walk';
    if(actor.animationMode==='build')assert.equal(actor.state.phase,'working');
  }
  assert.ok(work);assert.ok(walk);
});
test('farmers retain work cycles and display carrying frames while delivering', () => {
  const { actor } = actorFor('tend_crops');let worked=false,cargo=false;
  for(let i=0;i<1800;i++){actor.update(i*80,80);worked ||= actor.state.phase==='working';cargo ||= actor.animationMode.startsWith('carry_');assert.notEqual(actor.animationMode,'build');}
  assert.ok(worked);assert.ok(cargo);
});
test('idle and invalid assignments never show hammer or carrying animations', () => {
  for(const action of [null,'build','unsupported']){
    const {actor}=actorFor(action);
    for(let i=0;i<50;i++)actor.update(i*80,80);
    assert.equal(actor.animationMode,'idle');assert.equal(actor.state.cargo,false);
  }
});
test('a repeated sync keeps position, phase, animation and cycle progress', () => {
  const {actor,map,job,person}=actorFor('tend_crops');
  for(let i=0;i<50;i++)actor.update(i*80,80);
  const state=actor.state,before=JSON.stringify(state),frame=actor.body.frame;
  actor.configure(map,job,{resident:person});
  assert.equal(actor.state,state);assert.equal(JSON.stringify(state),before);assert.equal(actor.body.frame,frame);
});
test('removing an assignment immediately clears cargo and its path', () => {
  const {actor,map}=actorFor('tend_crops');
  actor.state.cargo=true;actor.render(0);assert.ok(actor.animationMode.startsWith('carry_'));
  const person=resident(null),job=resolveWorkerJob(map,person,0,actor.state);
  actor.configure(map,job,{resident:person});
  assert.equal(actor.animationMode,'idle');assert.equal(actor.state.cargo,false);assert.equal(actor.state.phase,'idle');
});
test('reduced motion displays a static worker and frame at its assigned site', () => {
  const {actor,job}=actorFor('tend_crops',{reduced:true});
  const position=[actor.container.x,actor.container.y],frame=actor.body.frame;
  for(let i=0;i<500;i++)actor.update(i*80,80);
  assert.deepEqual([actor.container.x,actor.container.y],position);
  assert.deepEqual(position,[(job.goal.x+.5)*40,(job.goal.y+.5)*40]);
  assert.equal(actor.body.frame,frame);assert.equal(actor.state.phase,'working');assert.equal(actor.state.cargo,false);
});
test('turning reduced motion off resumes a valid route instead of a stale path', () => {
  const {actor,map,job,person}=actorFor('tend_crops',{reduced:true});
  actor.configure(map,job,{resident:person,reduced:false});
  for(let i=0;i<100;i++)actor.update(i*80,80);
  assert.notEqual(actor.state.phase,'waiting');
});
test('mobile taps pin/unpin labels; transparent margins do not capture map input', () => {
  const {actor}=actorFor('tend_crops');let stopped=0;
  const {hitArea,hitAreaCallback}=actor.body.hit;
  assert.equal(hitAreaCallback(hitArea,0,0),false);assert.equal(hitAreaCallback(hitArea,96,96),true);
  actor.body.handlers.pointerdown(null,0,0,{stopPropagation(){stopped++;}});
  assert.equal(actor.label.visible,true);actor.body.handlers.pointerout();assert.equal(actor.label.visible,true);
  actor.body.handlers.pointerdown(null,0,0,{stopPropagation(){stopped++;}});
  assert.equal(actor.label.visible,false);assert.equal(stopped,2);
});
test('waiting explanations remain localized in all four app languages', () => {
  for(const [language,phrase] of [['en','Choose a construction target'],['ru','Выберите цель строительства'],['uk','Оберіть ціль будівництва'],['pl','Wybierz cel budowy']]){
    const {actor}=actorFor('build',{language});assert.ok(actor.label.text.includes(phrase));
  }
});
test('empty worlds hide workers and recovery creates usable local presentation state', () => {
  const {actor,person,map}=actorFor('tend_crops');
  const full=createWorkerWorld([building('full',0,0,{footprint:{width:2,height:2}})],2);
  actor.configure(full,resolveWorkerJob(full,person),{resident:person,reset:true});assert.equal(actor.container.visible,false);
  actor.configure(map,resolveWorkerJob(map,person),{resident:person,reset:true});assert.equal(actor.container.visible,true);assert.notEqual(actor.state.phase,'waiting');
});
test('zoom preserves readable badges without stretching the worker', () => {
  const {actor,scene}=actorFor('tend_crops');scene.cameras.main.zoom=.5;actor.render(500);
  assert.equal(actor.badge.scale,2);assert.equal(actor.symbol.scale,2);assert.equal(actor.body.scale,.5);
});
test('destroying an actor removes every child and tolerates repeated cleanup', () => {
  const {actor,scene}=actorFor('tend_crops');actor.destroy();actor.destroy();actor.update(5000,100);
  assert.ok(scene.objects.every(object=>object.destroyed));
});
