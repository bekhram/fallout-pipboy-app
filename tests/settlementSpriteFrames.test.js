import test from 'node:test';
import assert from 'node:assert/strict';
import { workerSpritePose, workerFacesLeft, WORKER_ROWS } from '../src/components/settlement/workerSpriteFrames.js';
const state = (extra = {}) => ({ x: 3, y: 3, path: [], phase: 'idle', cargo: false, reason: '', ...extra });
test('only an actual builder at work uses the six hammer frames', () => {
  for (let i = 0; i < 6; i++) assert.deepEqual(workerSpritePose(state({phase:'working'}), 'build', {time:i*100}), {mode:'build',frame:12+i});
  assert.equal(workerSpritePose(state({phase:'waiting',reason:'completed'}), 'build').mode, 'idle');
  assert.equal(workerSpritePose(state({phase:'working',reason:'blocked'}), 'build').mode, 'idle');
});
test('walking and carrying use their own strips, never hammer frames', () => {
  assert.equal(workerSpritePose(state({path:[{x:4,y:3}]}), 'build').mode, 'walk');
  assert.equal(workerSpritePose(state({path:[{x:4,y:3}],cargo:true}), 'build').mode, 'carry_walk');
  assert.equal(workerSpritePose(state({cargo:true}), 'build').mode, 'carry_idle');
});
test('unsupported work does not invent a farming or shopkeeper tool', () => {
  for (const action of ['tend_crops','business','guard','unknown']) assert.equal(workerSpritePose(state({phase:'working'}),action).mode,'idle');
  assert.equal(workerSpritePose(state({phase:'working'}),'hunting_gathering').mode,'chop');
});
test('all poses remain inside their six-frame strip and loop every 600 ms', () => {
  for (const action of ['build','scavenging','hunting_gathering',null]) {
    for (let time = 0; time < 1800; time += 50) {
      const pose=workerSpritePose(state({phase:'working'}),action,{time});
      assert.ok(pose.frame>=WORKER_ROWS[pose.mode]*6 && pose.frame<WORKER_ROWS[pose.mode]*6+6);
      assert.deepEqual(pose,workerSpritePose(state({phase:'working'}),action,{time:time+600}));
    }
  }
});
test('reduced motion is static for every actor and never advances walking', () => {
  const s=state({phase:'working'});
  assert.deepEqual(workerSpritePose(s,'build',{time:0,index:0,reduced:true}),workerSpritePose(s,'build',{time:987654,index:9,reduced:true}));
  assert.equal(workerSpritePose(state({path:[{x:4,y:3}]}),'build',{reduced:true}).mode,'idle');
});
test('mirroring follows horizontal travel and faces the work site without rotating', () => {
  assert.equal(workerFacesLeft(state({path:[{x:2,y:3}]}),{}),true);
  assert.equal(workerFacesLeft(state({path:[{x:3,y:2}]}),{},[],true),true);
  assert.equal(workerFacesLeft(state({phase:'working'}),{targetId:'a'},[{id:'a',x:6,footprint:{width:2}}],true),false);
});
test('rendering does not mutate saved inputs and tolerates non-finite clocks', () => {
  const s=Object.freeze({...state(),path:Object.freeze([])});
  const before=JSON.stringify(s);
  assert.ok(Number.isInteger(workerSpritePose(s,null,{time:NaN,index:Infinity}).frame));
  workerFacesLeft(s,{});assert.equal(JSON.stringify(s),before);
});
