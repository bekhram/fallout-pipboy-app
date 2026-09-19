import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRtsCombatState, toggleRtsSelection, selectAllRtsUnits,
  inspectRtsEnemy, issueRtsFocusFire, issueRtsCommand, spawnRtsWave, stepRtsCombat, rtsCombatSummary,
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
  const unit=s.units[0], first=unit.patrol.next;let reversed=false;
  for(let i=0;i<220;i++){stepRtsCombat(s,100);reversed ||= unit.patrol?.next !== first;}
  assert.equal(unit.command,'patrol');assert.equal(reversed,true);
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


test('defender archetypes expose distinct combat profiles', () => {
  const s=createRtsCombatState({buildings,size:12,workers:[
    {id:'r',name:'R',archetype:'rifleman',position:{x:3,y:8}},
    {id:'b',name:'B',archetype:'bruiser',position:{x:4,y:8}},
    {id:'h',name:'H',archetype:'heavy',position:{x:9,y:8}},
    {id:'m',name:'M',archetype:'medic',position:{x:10,y:8}},
  ]});
  const byType=Object.fromEntries(s.units.map(unit=>[unit.archetype,unit]));
  assert.ok(byType.bruiser.maxHp>byType.rifleman.maxHp);
  assert.ok(byType.rifleman.range>byType.bruiser.range);
  assert.ok(byType.heavy.damage>byType.rifleman.damage);
  assert.ok(byType.medic.heal>0);
});

test('focus fire prioritizes the tapped enemy and appears in the inspector', () => {
  const s=state();spawnRtsWave(s);selectAllRtsUnits(s);
  const target=s.enemies[0],other=s.enemies[1],unit=s.units[0];
  target.x=unit.x+1;target.y=unit.y;target.path=[];
  other.x=unit.x+1.2;other.y=unit.y;other.path=[];
  const beforeTarget=target.hp,beforeOther=other.hp;
  assert.ok(inspectRtsEnemy(s,target.id));
  assert.equal(issueRtsFocusFire(s,target.id),true);
  stepRtsCombat(s,100);
  assert.ok(target.hp<beforeTarget);
  assert.equal(other.hp,beforeOther);
  const summary=rtsCombatSummary(s);
  assert.equal(summary.inspectedEnemy.id,target.id);
  assert.equal(summary.inspectedEnemy.focusedBy,2);
});

test('ranged raiders back away when a defender gets too close', () => {
  const s=state();spawnRtsWave(s);
  s.units.forEach(unit=>{unit.damage=0;});
  const unit=s.units[0],enemy=s.enemies.find(item=>item.role==='ranged');
  enemy.x=unit.x+1;enemy.y=unit.y;enemy.path=[];
  const before=Math.hypot(enemy.x-unit.x,enemy.y-unit.y);
  for(let i=0;i<25;i++)stepRtsCombat(s,100);
  const after=Math.hypot(enemy.x-unit.x,enemy.y-unit.y);
  assert.ok(after>before);
});

test('siege raiders prioritize the HQ unless a defender blocks them', () => {
  const s=state();spawnRtsWave(s);
  const heavy=s.enemies.find(item=>item.role==='siege');
  heavy.x=0;heavy.y=0;heavy.path=[];heavy.targetId=null;
  s.units.forEach((unit,index)=>{unit.x=10;unit.y=10-index;});
  stepRtsCombat(s,100);
  assert.equal(heavy.targetId,'hq');
});

test('medic automatically restores a nearby injured defender', () => {
  const s=createRtsCombatState({buildings,size:12,workers:[
    {id:'r',name:'R',archetype:'rifleman',position:{x:3,y:8}},
    {id:'m',name:'M',archetype:'medic',position:{x:4,y:8}},
  ]});
  spawnRtsWave(s);
  const patient=s.units.find(unit=>unit.id==='r');
  patient.hp-=25;
  const before=patient.hp;
  const events=stepRtsCombat(s,100);
  assert.ok(patient.hp>before);
  assert.ok(events.some(event=>event.type==='heal'&&event.to==='r'));
});
