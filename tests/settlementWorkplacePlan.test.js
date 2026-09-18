import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkplacePlan, assignWorkplace, workplaceAssignmentError, workplaceState, workplaceCapacity } from '../src/utils/settlementWorkplacePlan.js';
import { buildingIndicators, workerIndicator, JOB_SYMBOLS } from '../src/components/settlement/workplaceIndicators.js';
import { workplaceCopy } from '../src/components/settlement/workplaceCopy.js';
const field = (id, patch={}) => ({ id, type:'crop_field', state:'active', powered:true, effects:{cropSlots:4}, ...patch });
const store = (id, income=1, patch={}) => ({ id, type:'trading_post', state:'active', powered:true, effects:{store:true,income}, ...patch });
const worker = (id, type='', targetBuildingId) => ({ id, name:id, settlementAction:type ? {type,...(targetBuildingId ? {targetBuildingId} : {})} : null });
const people = (count, jobs=[]) => Array.from({length:count},(_,i)=>jobs[i] || worker(`idle${i}`));
const plan = (settlers,buildings) => createWorkplacePlan(settlers,buildings);

test('legacy crop pool still tends six plants across separate four-plant fields',()=>{
 const p=plan([worker('a','tend_crops')],[field('one'),field('two')]);
 assert.equal(p.tendedCrops,6);assert.equal(p.food,3);assert.deepEqual(p.byWorker.a.buildingIds,['one','two']);
});
test('two automatic crop workers cover eight plants without double production',()=>{
 const p=plan([worker('a','tend_crops'),worker('b','tend_crops')],[field('one'),field('two')]);assert.equal(p.tendedCrops,8);assert.equal(p.food,4);
});
test('a manual farmer works only its chosen field',()=>{
 const p=plan([worker('a','tend_crops','two')],[field('one'),field('two')]);assert.equal(p.byBuilding.one.food,0);assert.equal(p.byBuilding.two.food,2);assert.equal(p.food,2);
});
test('manual crop reservations precede automatic allocation regardless of resident order',()=>{
 const p=plan([worker('a','tend_crops'),worker('z','tend_crops','one')],[field('one'),field('two'),field('three')]);
 assert.equal(p.byBuilding.one.tendedCrops,4);assert.deepEqual(p.byWorker.a.buildingIds,['two','three']);assert.equal(p.food,5);
});
test('automatic allocation is deterministic after residents reorder',()=>{
 const w=[worker('a','business'),worker('b','business')], b=[store('one'),store('two')];assert.deepEqual(plan(w,b),plan([...w].reverse(),b));
});
test('manually choosing the second store credits that store, not the first',()=>{
 const p=plan(people(5,[worker('a','business','second')]),[store('first',1),store('second',3)]);
 assert.deepEqual(p.staffedStoreIds,['second']);assert.equal(p.income,3);assert.equal(p.byBuilding.first.income,0);
});
test('manual store assignments move automatic traders to another available store',()=>{
 const p=plan(people(10,[worker('a','business'),worker('z','business','first')]),[store('first',1),store('second',3)]);
 assert.equal(p.byWorker.a.buildingId,'second');assert.equal(p.income,8);
});
test('one store cannot pay out twice for corrupt duplicate manual assignments',()=>{
 const p=plan(people(5,[worker('a','business','first'),worker('b','business','first')]),[store('first',3)]);
 assert.equal(p.income,3);assert.equal(p.byWorker.b.active,false);assert.equal(p.byWorker.b.reason,'full');
});
test('extra automatic traders wait without producing more income',()=>{
 const p=plan(people(5,[worker('a','business'),worker('b','business')]),[store('first',3)]);assert.equal(p.income,3);assert.equal(p.byWorker.b.reason,'full');
});
test('damaged, disabled, unfinished and unpowered sites never produce',()=>{
 for(const patch of [{condition:0},{autoDisabled:true},{state:'construction'},{powered:false}]) {
  const p=plan(people(5,[worker('a','business','s'),worker('b','tend_crops','f')]),[store('s',3,patch),field('f',patch)]);
  assert.equal(p.income,0);assert.equal(p.food,0);assert.equal(p.byWorker.a.active,false);assert.equal(p.byWorker.b.active,false);
 }
});
test('missing and incompatible explicit assignments do not silently switch jobs',()=>{
 const p=plan([worker('a','business','gone'),worker('b','tend_crops','store')],[store('store'),field('field')]);
 assert.equal(p.income,0);assert.equal(p.food,0);assert.equal(p.byWorker.a.reason,'missing_target');assert.equal(p.byWorker.b.reason,'missing_target');
});
test('freestanding hunting, scavenging and guard actions do not require a building',()=>{
 for(const action of ['hunting_gathering','scavenging','guard'])assert.equal(plan([worker('a',action)],[]).byWorker.a.active,true);
});
test('automatic caravans require an active caravan post',()=>{
 const w=[worker('a','trade_caravan')];assert.equal(plan(w,[]).byWorker.a.active,false);
 assert.equal(plan(w,[field('post',{effects:{tradeOutpost:true}})]).byWorker.a.active,true);
});
test('crop previews sum to the pooled rounded total, including odd plant counts',()=>{
 const p=plan([worker('a','tend_crops')],[field('a',{effects:{cropSlots:3}}),field('b',{effects:{cropSlots:3}})]);
 assert.equal(Object.values(p.byBuilding).reduce((n,b)=>n+b.food,0),p.food);assert.equal(p.food,3);
});
test('zero residents produces zero staffed food and store income',()=>{
 const p=plan([],[field('a'),store('b')]);assert.equal(p.food,0);assert.equal(p.income,0);
});
test('income retains the existing population multiplier, including fewer than five',()=>{
 for(const n of [1,4,5,9,10])assert.equal(plan(people(n,[worker('a','business','s')]),[store('s',3)]).income,Math.floor(n/5)*3);
});
test('unknown or idle workers do not take a workplace because of stale assignedBuildingId',()=>{
 const w={...worker('a'),assignedBuildingId:'f'};assert.equal(plan([w],[field('f')]).byBuilding.f.workerIds.length,0);
});
test('capacities are based on catalog effects, not a forced worker on an automatic pump',()=>{
 assert.equal(workplaceCapacity(field('f')),1);assert.equal(workplaceCapacity(store('s')),1);
 assert.equal(workplaceCapacity(field('pump',{effects:{water:3}})),0);assert.equal(workplaceCapacity(field('yard',{effects:{improvedScavenging:true}})),null);
});
test('assignment is immutable and clears a previous construction target',()=>{
 const b=[field('f')],s={settlers:[worker('a','build','old')],stockpile:{food:7}};const before=JSON.stringify(s);
 const next=assignWorkplace(s,b,'a','f');assert.equal(JSON.stringify(s),before);assert.equal(next.settlers[0].assignedBuildingId,'f');
 assert.deepEqual(next.settlers[0].settlementAction,{type:'tend_crops',targetBuildingId:'f'});assert.equal(next.stockpile,s.stockpile);
});
test('repeating an identical assignment is a no-op',()=>{
 const b=[field('f')];const s=assignWorkplace({settlers:[worker('a')]},b,'a','f');assert.equal(assignWorkplace(s,b,'a','f'),s);
});
test('assignment validates deleted residents, deleted buildings and unsupported objects',()=>{
 const w=[worker('a')],b=[field('f'),field('p',{effects:{power:3}})];
 assert.equal(workplaceAssignmentError(w,b,'gone','f'),'NOT_FOUND');assert.equal(workplaceAssignmentError(w,b,'a','gone'),'NOT_FOUND');assert.equal(workplaceAssignmentError(w,b,'a','p'),'INVALID_ACTION');
});
test('assignment rejects unpowered sites and occupied manual slots',()=>{
 const w=[worker('a','business','s'),worker('b')];assert.equal(workplaceAssignmentError(w,[store('s')],'b','s'),'WORKPLACE_FULL');
 assert.equal(workplaceAssignmentError(w,[store('s',1,{powered:false})],'a','s'),'WORKPLACE_UNAVAILABLE');
 assert.throws(()=>assignWorkplace({settlers:w},[store('s')],'b','s'),/WORKPLACE_FULL/);
});
test('a manual assignment can displace an automatic slot without duplicating staff',()=>{
 const s={settlers:people(5,[worker('a','business'),worker('b')])},b=[store('s')];
 const next=assignWorkplace(s,b,'b','s'),p=plan(next.settlers,b);assert.deepEqual(p.byBuilding.s.workerIds,['b']);assert.equal(p.byWorker.a.reason,'full');
});
test('all expected resource categories have a distinct indicator',()=>{
 for(const [effects,kind] of [[{cropSlots:4},'food'],[{water:3},'water'],[{power:3},'power'],[{store:true},'income'],[{improvedScavenging:true},'materials'],[{guardActionDefenseBonus:1},'defense'],[{crafting:true},'crafting'],[{tradeOutpost:true},'caravan']]) {
  const b=field('b',{effects}),site=plan([],[b]).byBuilding.b;assert.equal(buildingIndicators(b,site)[0].kind,kind);
 }
});
test('automatic water and power show output without a resident',()=>{
 for(const [effects,kind] of [[{water:3},'water'],[{power:3},'power']]){const b=field('b',{effects});assert.equal(buildingIndicators(b,plan([],[b]).byBuilding.b)[0].amount,3);}
});
test('construction and unpowered resource badges retain type but show no output',()=>{
 for(const patch of [{state:'construction'},{powered:false}]){const b=field('b',{effects:{water:3},...patch});const i=buildingIndicators(b,plan([],[b]).byBuilding.b)[0];assert.equal(i.kind,'water');assert.equal(i.amount,0);}
});
test('crafting stations and material sites do not invent guaranteed daily resource amounts',()=>{
 for(const effects of [{crafting:true},{improvedScavenging:true}]){const b=field('b',{effects});assert.equal(buildingIndicators(b,plan([],[b]).byBuilding.b)[0].amount,null);}
});
test('worker profession remains visible when waiting or carrying cargo',()=>{
 for(const action of Object.keys(JOB_SYMBOLS))for(const phase of ['working','waiting','to_depot']) {
  assert.equal(workerIndicator(action,phase,true).symbol,JOB_SYMBOLS[action]);
 }
 assert.equal(workerIndicator('tend_crops','waiting',true).status,'!');assert.equal(workerIndicator('tend_crops','to_depot',true).status,'▣');
});
test('building statuses are distinguishable without relying on color',()=>{
 assert.equal(workplaceState(field('f',{powered:false})),'unpowered');assert.equal(workplaceState(field('f',{condition:0})),'broken');assert.equal(workplaceState(field('f',{autoDisabled:true})),'disabled');
});
test('UI translations and assignment error messages exist in all four languages',()=>{
 for(const lang of ['en','ru','uk','pl'])for(const key of ['workers','assign','production','unpowered','WORKPLACE_FULL','WORKPLACE_UNAVAILABLE'])assert.ok(workplaceCopy(lang)[key]);
 assert.equal(workplaceCopy('ru-RU').workers,'Рабочие');assert.equal(workplaceCopy('xx').workers,'Workers');
});
