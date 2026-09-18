import test from 'node:test';
import assert from 'node:assert/strict';
import { settlementConstructionView, constructionStage, ConstructionNoticeTracker } from '../src/utils/settlementConstructionView.js';
import { advanceConstruction, assignWorker, tasks, workerCounts } from '../src/utils/settlementDevelopment.js';
import { constructionCopy, constructionDuration } from '../src/components/settlement/constructionCopy.js';

const DAY = 86400000, NOW = 1789740000000;
const site = (id = 'a', extra = {}) => ({ id, type:'small_house', x:1, y:1, state:'construction', condition:100, constructionDaysRequired:1, constructionProgressDays:0, rooms:[], paidCost:{common:40}, ...extra });
const worker = (id, target = 'a') => ({ id, settlementAction: { type:'build', ...(target ? {targetBuildingId:target} : {}) } });
const save = (extra = {}) => ({ id:'settlement', constructionUpdatedAt:NOW, buildings:[site()], settlers:[worker('w1'),worker('w2')], stockpile:{materials:{common:23}}, resources:{caps:79}, events:[], ...extra });
const item = (s, time = NOW, key = 'building:a') => settlementConstructionView(s, time).byKey[key];
const freeze = value => { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; };

test('two builders halve the one-builder ETA', () => {
  const s = save(); assert.equal(item(s).workers, 2); assert.equal(item(s).etaMs, DAY/2);
  assert.equal(item({...s,settlers:[worker('w1')]}).etaMs, DAY);
});
test('progress advances from the saved clock without changing saved state', () => {
  const s=freeze(save()), before=JSON.stringify(s), view=item(s,NOW+DAY/4);
  assert.equal(view.percent,50); assert.equal(view.etaMs,DAY/4); assert.equal(JSON.stringify(s),before);
});
test('zero builders show waiting and no running ETA', () => {
  const v=item(save({settlers:[]}),NOW+DAY*3); assert.equal(v.state,'waiting'); assert.equal(v.percent,0); assert.equal(v.etaMs,null);
});
test('unrelated workers never accelerate construction', () => {
  const s=save({settlers:[{id:'f',settlementAction:{type:'tend_crops'}},{id:'idle'}]}); assert.equal(item(s).workers,0);
});
test('assignment removal settles elapsed work at the old rate first', () => {
  const half=advanceConstruction(save(),NOW+DAY/4);
  const changed=assignWorker(half,{id:'owner'},'w2',null);
  const v=item(changed,NOW+DAY/4); assert.equal(v.percent,50); assert.equal(v.workers,1); assert.equal(v.etaMs,DAY/2);
});
test('removing the last builder freezes the current percentage', () => {
  let s=advanceConstruction(save(),NOW+DAY/4);
  for(const id of ['w1','w2'])s=assignWorker(s,{id:'owner'},id,null);
  const v=item(s,NOW+DAY); assert.equal(v.state,'waiting'); assert.equal(v.percent,50);
});
test('predicted 100 percent is not a confirmed completion', () => {
  const s=save(), v=item(s,NOW+DAY); assert.equal(v.percent,100); assert.equal(v.state,'confirming');
  assert.equal(s.buildings[0].state,'construction'); assert.deepEqual(s.events,[]); assert.equal(v.etaMs,null);
});
test('confirmed completion removes the construction view', () => {
  const s=advanceConstruction(save(),NOW+DAY); assert.equal(item(s,NOW+DAY),undefined); assert.equal(s.buildings[0].state,'active');
});
test('almost-complete tasks never display 100 before they reach the end', () => {
  const v=item(save({buildings:[site('a',{constructionProgressDays:.99999})]})); assert.equal(v.percent,99); assert.equal(v.state,'building');
});
test('stage thresholds and malformed stage input are safe', () => {
  assert.equal(constructionStage(0),'site'); assert.equal(constructionStage(1/3),'frame'); assert.equal(constructionStage(2/3),'finishing');
  assert.equal(constructionStage(-1),'site'); assert.equal(constructionStage(NaN),'site'); assert.equal(constructionStage(9),'finishing');
});
test('automatic builders follow the existing queue', () => {
  const s=save({buildings:[site('a'),site('b',{queuePriority:1})],settlers:[worker('w1',null)]});
  assert.equal(item(s).workers,1); assert.equal(item(s,NOW,'building:b').state,'waiting');
  const next=advanceConstruction(s,NOW+DAY+DAY/4); assert.equal(item(next,NOW+DAY+DAY/4,'building:b').percent,25);
});
test('workers freed by a completion carry on to the next task', () => {
  const s=save({buildings:[site('a'),site('b',{queuePriority:1})]});
  const next=advanceConstruction(s,NOW+DAY*.75), view=item(next,NOW+DAY*.75,'building:b');
  assert.equal(view.percent,50); assert.equal(view.workers,2); assert.equal(workerCounts(next)['building:b'],2);
});
test('multiple explicitly staffed projects run in parallel', () => {
  const s=save({buildings:[site('a'),site('b')],settlers:[worker('a1','a'),worker('b1','b')]});
  const v=settlementConstructionView(s,NOW+DAY/4); assert.equal(v.byKey['building:a'].percent,25); assert.equal(v.byKey['building:b'].percent,25);
});
test('stale builder targets use the same queue fallback as the engine', () => {
  const s=save({settlers:[worker('w1','deleted')]}); assert.equal(item(s).workers,1); assert.equal(item(s).etaMs,DAY);
});
test('room tasks and upgrade tasks retain distinct keys', () => {
  const b=site('a',{state:'active',type:'generator',rooms:[{id:'r',type:'storage',state:'construction',constructionDaysRequired:1}],upgrade:{state:'construction',targetType:'generator_medium',constructionDaysRequired:2}});
  const s=save({buildings:[b],settlers:[{id:'r1',settlementAction:{type:'build',parentBuildingId:'a',targetRoomId:'r'}},{id:'u1',settlementAction:{type:'build',targetUpgradeId:'a'}}]});
  const v=settlementConstructionView(s,NOW); assert.equal(v.byKey['room:a:r'].etaMs,DAY); assert.equal(v.byKey['upgrade:a'].etaMs,DAY*2);
  assert.equal(v.byBuilding.a.tasks.length,2); assert.equal(v.byBuilding.a.workers,2);
});
test('no clock, invalid clock or backwards device time cannot invent elapsed work', () => {
  for(const anchor of [undefined,null,'invalid',NOW+DAY]){
    const s=save({constructionUpdatedAt:anchor}); assert.equal(item(s,NOW).percent,0);
  }
});
test('reopening and rerunning confirmed progress does not duplicate events or costs', () => {
  const initial=save(), first=advanceConstruction(initial,NOW+DAY), reopened=JSON.parse(JSON.stringify(first));
  const twice=advanceConstruction(reopened,NOW+DAY);
  assert.equal(twice.events.length,1); assert.deepEqual(twice.stockpile,initial.stockpile); assert.deepEqual(twice.resources,initial.resources);
  assert.deepEqual(tasks(twice),[]); assert.deepEqual(settlementConstructionView(twice,NOW+DAY).byKey,{});
});
test('repeated render projections never save inventory or completion events', () => {
  const s=freeze(save()), before=JSON.stringify(s);
  for(let i=0;i<20;i++)settlementConstructionView(s,NOW+DAY*(1+i)); assert.equal(JSON.stringify(s),before);
});
test('future queue staffing is not included as a guaranteed ETA', () => {
  const s=save({buildings:[site('a'),site('b')]}); assert.equal(item(s,NOW,'building:b').etaMs,null);
});
const completed=(id='a',createdAt=NOW)=>({id:`event-${id}`,type:'construction_completed',target:`building:${id}`,buildingType:'small_house',createdAt});
test('notifications ignore historical completions at initial open', () => {
  const t=new ConstructionNoticeTracker(); assert.deepEqual(t.read(save({events:[completed()],buildings:[site('a',{state:'active'})]})),[]);
});
test('new confirmed events notify once, including reordered history', () => {
  const t=new ConstructionNoticeTracker(), initial=save(); t.read(initial);
  const s=advanceConstruction(initial,NOW+DAY); assert.equal(t.read(s).length,1); assert.deepEqual(t.read(s),[]);
  assert.deepEqual(t.read({...s,events:[...s.events].reverse()}),[]);
});
test('switching settlements clears visible event baseline', () => {
  const t=new ConstructionNoticeTracker(); t.read(save());
  assert.deepEqual(t.read(save({id:'other',events:[completed()],buildings:[site('a',{state:'active'})]})),[]);
});
test('removed or still-unconfirmed buildings cannot announce as completed', () => {
  const t=new ConstructionNoticeTracker(); t.read(save()); assert.deepEqual(t.read(save({events:[completed()]})),[]);
});
test('duration handles zero, minutes, days and unavailable ETA in four languages', () => {
  assert.equal(constructionDuration(null,'ru'),'—'); assert.equal(constructionDuration(Infinity,'en'),'—');
  assert.equal(constructionDuration(0,'ru'),'1 мин'); assert.equal(constructionDuration(DAY,'ru'),'1 д 0 ч');
  for(const lang of ['en','ru','uk','pl']) assert.ok(constructionDuration(60000,lang).includes(constructionCopy(lang).minute));
});
test('all localization dictionaries have matching keys and region fallback', () => {
  const keys=Object.keys(constructionCopy('en')).sort();
  for(const lang of ['ru','uk','pl']) assert.deepEqual(Object.keys(constructionCopy(lang)).sort(),keys);
  assert.equal(constructionCopy('ru-RU'),constructionCopy('ru')); assert.equal(constructionCopy('unknown'),constructionCopy('en'));
});
