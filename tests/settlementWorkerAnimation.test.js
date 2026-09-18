import test from 'node:test';
import assert from 'node:assert/strict';
import { SettlementWorker } from '../src/components/settlement/SettlementWorker.js';
import { workerCellFree } from '../src/utils/settlementWorkerPath.js';

function fixture(action = null, construction = true) {
  const objects = [];
  const make = () => {
    const o = { x: 0, y: 0, visible: true,
      setPosition(x,y) { this.x=x; this.y=y; return this; },
      setVisible(v) { this.visible=v; return this; },
      setDepth() { return this; }, setOrigin() { return this; }, setScale() { return this; },
      setFlipX() { return this; }, play(key) { this.animation=key; return this; },
      fillStyle() { return this; }, fillRect() { return this; }, lineStyle() { return this; },
      strokeRect() { return this; }, lineBetween() { return this; }, destroy() { this.destroyed=true; },
    }; objects.push(o); return o;
  };
  const animations=[];
  const scene = { add: { sprite: make, graphics: make }, anims: {
    exists: () => false, create: a => animations.push(a), generateFrameNumbers: (_, frames) => frames,
  } };
  const settlement = { id:'s', settlers:[{id:'p', health:100, settlementAction:action}], buildings:[
    { id:'hq', type:'settlement_hq', x:8, y:8, state:'active' },
    ...(construction ? [{id:'site',type:'small_house',x:15,y:14,state:'construction'}] : []),
  ] };
  const worker = new SettlementWorker(scene,40);
  worker.sync(settlement);
  return {worker,settlement,objects,animations};
}
function run(worker, ticks=900) {
  const states=new Set();
  for(let i=0;i<ticks;i++) {
    worker.update(100);
    states.add(`${worker.phase}:${worker.sprite.animation.split('blue-')[1]}:${worker.cargo.visible}`);
    assert.ok(workerCellFree(worker.grid,worker.cell));
    assert.ok(workerCellFree(worker.grid,{x:Math.floor(worker.sprite.x/40),y:Math.floor(worker.sprite.y/40)}));
  }
  return states;
}
test('builder loads, carries, builds and returns without changing saved data',()=>{
  const {worker,settlement,animations}=fixture(); const before=JSON.stringify(settlement);
  const states=run(worker);
  for(const s of ['loading:carryIdle:true','outbound:carryWalk:true','work:build:false','inbound:walk:false','rest:idle:false']) assert.ok(states.has(s),s);
  assert.equal(JSON.stringify(settlement),before);
  assert.equal(animations.length,6);
  assert.equal(animations.at(-1).frames.end,35);
});
test('scavenger walks out, chops materials, carries them home and unloads',()=>{
  const {worker}=fixture({type:'scavenging'},false);const states=run(worker);
  for(const s of ['outbound:walk:false','work:chop:false','pickup:carryIdle:true','inbound:carryWalk:true','unloading:carryIdle:true','rest:idle:false']) assert.ok(states.has(s),s);
  assert.equal(worker.materials.visible,true);
});
test('changing an action with unchanged target replaces animation and clears cargo',()=>{
  const {worker,settlement}=fixture();
  for(let i=0;i<30;i++)worker.update(100);
  assert.equal(worker.carrying,true);
  settlement.settlers[0].settlementAction={type:'guard'};
  worker.sync(settlement);
  assert.equal(worker.job,'patrol');assert.equal(worker.cargo.visible,false);
  const states=run(worker);
  assert.ok(![...states].some(s=>s.includes('carry')||s.includes('build')||s.includes('chop')));
});
test('no settlers hides props; scene shutdown destroys all objects',()=>{
  const {worker,settlement,objects}=fixture({type:'scavenging'},false);
  settlement.settlers=[];worker.sync(settlement);
  assert.ok(objects.every(o=>!o.visible));
  worker.destroy(); assert.ok(objects.every(o=>o.destroyed));
});
test('unreachable sites leave the worker idle without passing through obstacles',()=>{
  const {worker,settlement}=fixture();
  // Enclose the entire HQ perimeter with neighboring building footprints.
  for(let x=7;x<=12;x++)for(let y=7;y<=12;y++)if(x===7||x===12||y===7||y===12)
    settlement.buildings.push({id:`wall-${x}-${y}`,type:'lights',x,y,state:'active'});
  worker.sync(settlement);assert.equal(worker.sprite.visible,false);assert.equal(worker.route.length,0);
});
