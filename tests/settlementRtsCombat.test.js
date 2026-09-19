import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRtsCombatState, toggleRtsSelection, selectAllRtsUnits,
  issueRtsCommand, spawnRtsWave, stepRtsCombat, rtsCombatSummary,
} from '../src/utils/settlementRtsCombat.js';

const building = (id, type, x, y, width = 2, height = 2) => ({ id, type, x, y, footprint:{width,height}, state:'active', condition:100 });
const buildings = [
  building('hq','settlement_hq',5,5,3,3),
  building('farm','crop_field',1,1,2,2),
];
const workers = [
  { id:'a', name:'A', position:{x:4,y:6} },
  { id:'b', name:'B', position:{x:9,y:6} },
];
const state = () => createRtsCombatState({ buildings, workers, size:12 });

test('RTS selection supports multiple defenders', () => {
  const s=state();
  toggleRtsSelection(s,'a');toggleRtsSelection(s,'b');
  assert.equal(rtsCombatSummary(s).selected,2);
  toggleRtsSelection(s,'a');
  assert.equal(rtsCombatSummary(s).selected,1);
});

test('move command gives selected defenders formation paths and hold cancels them', () => {
  const s=state();selectAllRtsUnits(s);
  assert.equal(issueRtsCommand(s,'move',{x:10,y:10}),true);
  assert.ok(s.units.every(unit=>unit.path.length>0));
  issueRtsCommand(s,'hold');
  assert.ok(s.units.every(unit=>unit.command==='hold' && unit.path.length===0));
});

test('patrol command remains active and reverses between endpoints during combat', () => {
  const s=state();spawnRtsWave(s);toggleRtsSelection(s,'a');
  assert.equal(issueRtsCommand(s,'patrol',{x:10,y:10}),true);
  const unit=s.units[0], first=unit.patrol.next;
  for(let i=0;i<220;i++)stepRtsCombat(s,100);
  assert.equal(unit.command,'patrol');assert.notEqual(unit.patrol.next, first);
});

test('wave spawns enemies and defenders automatically fire in range', () => {
  const s=state();spawnRtsWave(s);
  const unit=s.units[0],enemy=s.enemies[0];
  enemy.x=unit.x+1;enemy.y=unit.y;enemy.path=[];
  const before=enemy.hp;
  const events=stepRtsCombat(s,100);
  assert.ok(enemy.hp<before);
  assert.ok(events.some(event=>event.type==='shot'));
});

test('low-health defenders automatically retreat toward HQ', () => {
  const s=state();spawnRtsWave(s);
  s.units[0].hp=20;
  const events=stepRtsCombat(s,100);
  assert.equal(s.units[0].command,'retreat');
  assert.ok(events.some(event=>event.type==='retreat'));
});

test('clearing a wave produces victory and destroyed HQ produces defeat', () => {
  const win=state();spawnRtsWave(win);win.enemies.forEach(enemy=>{enemy.hp=0;enemy.alive=false;});
  stepRtsCombat(win,100);assert.equal(win.phase,'victory');
  const lose=state();spawnRtsWave(lose);lose.hq.hp=0;
  stepRtsCombat(lose,100);assert.equal(lose.phase,'defeat');
});
