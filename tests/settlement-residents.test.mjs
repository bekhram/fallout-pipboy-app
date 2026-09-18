import test from 'node:test';
import assert from 'node:assert/strict';
import { getSettlementRulebookSnapshot, advanceSettlementDay, normalizeStockpile } from '../src/utils/settlementDayEngine.js';
import { availableSettlementActions } from '../src/utils/settlementResidents.js';
import { reserveProvisions } from '../src/utils/settlementProvisions.js';
import { residentWalkableCells, residentPath } from '../src/utils/settlementResidentPaths.js';
import { applySettlementCommand } from '../src/utils/settlementCommands.js';
const building=(id,type,x=3,y=3)=>({id,type,x,y,state:'active',condition:100,rooms:[]});
const resident=(id,type='guard')=>({id,name:id,settlementAction:{type}});
const base=()=>({id:'s',ownerCharacterId:'owner',settlers:[resident('a')],buildings:[],attributes:{happiness:20,food:0},resources:{},stockpile:{materials:{common:0,uncommon:0,rare:0},items:[]},settlementDay:1,attacks:[]});

test('guard posts and powered sirens are counted independent of building order',()=>{
 const s=base();s.buildings=[building('s','siren'),building('g','generator'),building('p','guard_post')];
 const forward=getSettlementRulebookSnapshot(s);const reverse=getSettlementRulebookSnapshot({...s,buildings:[...s.buildings].reverse()});
 assert.equal(forward.defense,3);assert.equal(reverse.defense,forward.defense);
 const next=advanceSettlementDay(s,100000);assert.equal(next.attributes.defense,3);
});
test('robots have no food, water or bed needs',()=>{
 const s=base();s.settlers=[{...resident('r'),isRobot:true}];
 assert.equal(getSettlementRulebookSnapshot(s).needsPeople,0);
 assert.equal(advanceSettlementDay(s,100000).attributes.happiness,20);
});
test('assignments requiring structures are unavailable and rejected by commands',()=>{
 const s=base();assert.ok(!availableSettlementActions(s).some(a=>a.id==='business'));
 assert.throws(()=>applySettlementCommand(s,{}, {id:'owner'}, {type:'action',workerId:'a',action:'business'},1000),/INVALID_ACTION/);
 s.buildings=[building('store','trading_post')];assert.ok(availableSettlementActions(s).some(a=>a.id==='business'));
});
test('water surplus accumulates once per day; a reserve is spent only once',()=>{
 let s=base();s.buildings=[building('pump','water_pump')];
 s=advanceSettlementDay(s,1000);assert.equal(s.stockpile.provisions.water,1);
 s=advanceSettlementDay(s,2000);assert.equal(s.stockpile.provisions.water,2);
 s=reserveProvisions(s,'water');assert.equal(s.stockpile.provisions.water,0);assert.equal(s.nextDaySupplies.water,1);
 assert.throws(()=>reserveProvisions(s,'water'),/insufficient/);
 s=advanceSettlementDay(s,3000);assert.equal(s.attributes.water,4);assert.equal(s.stockpile.provisions.water,1);
 s=advanceSettlementDay(s,4000);assert.equal(s.attributes.water,3);
 assert.equal(normalizeStockpile(s.stockpile).provisions.water,2);
});
test('resident routes avoid occupied building cells and use adjacent steps',()=>{
 const s=base();s.buildings=[building('house','small_house',1,1)];
 const cells=residentWalkableCells(s), route=residentPath({x:0,y:1},{x:5,y:1},cells);
 assert.ok(route.length>6);assert.ok(!cells.some(p=>p.x===1&&p.y===1));
 route.forEach((p,i)=>{assert.ok(cells.some(c=>c.x===p.x&&c.y===p.y));if(i)assert.equal(Math.abs(p.x-route[i-1].x)+Math.abs(p.y-route[i-1].y),1);});
 assert.deepEqual(residentPath({x:1,y:1},{x:5,y:1},cells),[]);
});
