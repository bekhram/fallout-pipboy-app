import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Actual changed modules; unchanged catalog, construction, attack and Phaser
// services are small test doubles. Not a live campaign / full application test.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skip = !vm.SourceTextModule;
const rules = {
 crop_field:{effects:{cropSlots:4}}, trading_post:{effects:{store:true,income:1}}, trading_emporium:{effects:{store:true,income:3}},
 water_pump:{effects:{water:3}}, water_purifier:{effects:{water:10,requiresPower:2}}, generator:{effects:{power:3}},
 guard_post:{effects:{guardActionDefenseBonus:1}}, scrap_yard:{effects:{improvedScavenging:true}}, caravan_post:{effects:{tradeOutpost:true}},
};
const b = (id,type,patch={}) => ({id,type,x:2,y:3,state:'active',condition:100,rooms:[],...patch});
const w = (id,action='',targetBuildingId) => ({id,name:id,settlementAction:action ? {type:action,...(targetBuildingId ? {targetBuildingId} : {})} : null});
const settlement = (buildings=[],settlers=[]) => ({id:'s',buildings,settlers,resources:{caps:100,materials:0},stockpile:{materials:{common:0,uncommon:0,rare:0}},attributes:{happiness:20},events:[],attacks:[],attackRiskBlockedUntil:Number.MAX_SAFE_INTEGER});

async function load(relative, extra={}) {
 const context=vm.createContext({console,Date,Math,Set,Map,Object,JSON,Number,String,Boolean,Array,Error});
 const fixtures={
  'src/data/settlement/rulebookCatalog.js':{getRulebookBuilding:id=>rules[id] || null},
  'src/data/settlement/rulebook.js':{ROOMS:{},SETTLEMENT_RULEBOOK:{stockpile:{baseCapacityLbs:300}},SETTLEMENT_ACTIONS:{}},
  'src/data/settlement/buildings.js':{SETTLEMENT_GRID_SIZE:24,SETTLEMENT_BUILDINGS:Object.fromEntries(Object.keys(rules).map(id=>[id,{id,footprint:{width:2,height:2},name:{en:id}}])),settlementBuildingName:def=>def?.name.en || ''},
  'src/utils/settlementDevelopment.js':{advanceConstruction:(s,now)=>({...s,constructionUpdatedAt:now}),cost:()=>({}),canSpend:(_s,actor)=>Boolean(actor?.allowed)},
  'src/utils/settlementAttackEngine.js':{resolveSettlementAttack:s=>s},
  'src/utils/settlementProvisions.js':{provisions:()=>({food:0,water:0}),collectDailySurplus:s=>s,reserveProvisions:s=>s},
  'src/utils/settlementPower.js':{resolveSettlementPower:s=>{
   const active=s.buildings.filter(b=>b.state==='active' && b.condition>0 && !b.autoDisabled);let produced=active.reduce((n,b)=>n+(rules[b.type]?.effects.power || 0),0),remaining=produced,required=0;
   const poweredBuildingIds=new Set(),unpoweredBuildingIds=new Set();for(const b of active){const need=rules[b.type]?.effects.requiresPower || 0;required+=need;if(need<=remaining){poweredBuildingIds.add(b.id);remaining-=need;}else unpoweredBuildingIds.add(b.id);}
   return {produced,required,consumed:produced-remaining,available:remaining,deficit:Math.max(0,required-produced),poweredBuildingIds,unpoweredBuildingIds};
  }}, ...extra,
 };
 const cache=new Map();
 function module(filename){
  if(cache.has(filename))return cache.get(filename);
  const key=path.relative(root,filename).split(path.sep).join('/'),fixture=fixtures[key];
  const m=fixture ? new vm.SyntheticModule(Object.keys(fixture),function(){for(const [k,v]of Object.entries(fixture))this.setExport(k,v);},{context,identifier:filename})
   : new vm.SourceTextModule(fs.readFileSync(filename,'utf8'),{context,identifier:filename});
  cache.set(filename,m);return m;
 }
 const m=module(path.join(root,relative));await m.link((name,parent)=>module(path.resolve(path.dirname(parent.identifier),name)));await m.evaluate();return m.namespace;
}

test('production command is rejected before assignment when spending permission is absent',{skip},async()=>{
 const m=await load('src/utils/settlementCommands.js'),s=settlement([b('f','crop_field')],[w('a')]);
 assert.throws(()=>m.applySettlementCommand(s,null,{allowed:false},{type:'workplace',workerId:'a',buildingId:'f'},100),/FORBIDDEN/);assert.equal(s.settlers[0].settlementAction,null);
});
test('authorized production command saves exactly one explicit building target',{skip},async()=>{
 const m=await load('src/utils/settlementCommands.js'),s=settlement([b('f','crop_field')],[w('a')]);
 const next=m.applySettlementCommand(s,null,{allowed:true},{type:'workplace',workerId:'a',buildingId:'f'},100).settlement;
 assert.equal(next.settlers[0].settlementAction.type,'tend_crops');assert.equal(next.settlers[0].settlementAction.targetBuildingId,'f');assert.equal(next.resources.caps,100);
});
test('the command boundary rejects a second manual worker in an occupied store',{skip},async()=>{
 const m=await load('src/utils/settlementCommands.js'),s=settlement([b('s','trading_post')],[w('a','business','s'),w('b')]);
 assert.throws(()=>m.applySettlementCommand(s,null,{allowed:true},{type:'workplace',workerId:'b',buildingId:'s'},100),/WORKPLACE_FULL/);
});
test('real adapter and resource helper agree on explicit crop output',{skip},async()=>{
 const s=settlement([b('one','crop_field'),b('two','crop_field')],[w('a','tend_crops','two')]);
 const model=await load('src/utils/settlementWorkplaces.js'),resources=await load('src/utils/settlementResources.js');
 assert.equal(model.resolveSettlementWorkplaces(s).food,2);assert.equal(resources.getTendedCropResult(s,1).food,2);
});
test('daily production uses selected store and records its id',{skip},async()=>{
 const m=await load('src/utils/settlementDayEngine.js'),s=settlement([b('one','trading_post'),b('two','trading_emporium')],[w('a','business','two'),w('b'),w('c'),w('d'),w('e')]);
 const next=m.advanceSettlementDay(s,1000);assert.equal(next.attributes.income,3);assert.equal(next.resources.income,3);
 const event=next.events.find(e=>e.type==='business');assert.equal(event.storeIds[0],'two');assert.equal(event.stores,1);assert.equal(next.resources.caps,100);
});
test('daily crop event matches the building forecast rather than pooled unused fields',{skip},async()=>{
 const m=await load('src/utils/settlementDayEngine.js'),s=settlement([b('one','crop_field'),b('two','crop_field')],[w('a','tend_crops','two')]);
 const next=m.advanceSettlementDay(s,1000);assert.equal(next.attributes.food,2);assert.equal(next.events.find(e=>e.type==='tend_crops').food,2);
});
test('disabled water objects contribute nothing to the real resource resolver',{skip},async()=>{
 const m=await load('src/utils/settlementResources.js'),s=settlement([b('pump','water_pump',{autoDisabled:true})]);assert.equal(m.resolveSettlementResources(s).waterProduced,0);
});
test('power availability is reflected by workplace status and resource output',{skip},async()=>{
 const a=await load('src/utils/settlementWorkplaces.js'),r=await load('src/utils/settlementResources.js');const s=settlement([b('p','water_purifier')]);
 assert.equal(a.resolveSettlementWorkplaces(s).byBuilding.p.state,'unpowered');assert.equal(r.resolveSettlementResources(s).waterProduced,0);
 s.buildings.push(b('g','generator'));assert.equal(a.resolveSettlementWorkplaces(s).byBuilding.p.state,'active');assert.equal(r.resolveSettlementResources(s).waterProduced,10);
});
test('elapsed-day processing does not apply the same daily yield twice on reopen',{skip},async()=>{
 const m=await load('src/utils/settlementDayEngine.js'),s={...settlement([b('f','crop_field')],[w('a','tend_crops','f')]),nextDayAt:1000};
 const once=m.processAutomaticSettlementDays(s,1000),again=m.processAutomaticSettlementDays(once,1000);
 assert.equal(again.settlementDay,once.settlementDay);assert.equal(again.events.length,once.events.length);
});

function sceneDouble(){
 const objects=[];let shutdown;const scene={objects,cameras:{main:{zoom:.5,scrollX:0}},scale:{width:390},events:{once:(_e,fn)=>{shutdown=fn;}}};
 const create=(kind,...args)=>{const item={kind,x:args[0],y:args[1],visible:true,text:kind==='text'?args[2]:'',handlers:{},children:[],setDepth(n){this.depth=n;return this;},setFillStyle(){return this;},setStrokeStyle(){return this;},setOrigin(){return this;},setVisible(v){this.visible=v;return this;},setScale(v){this.scale=v;return this;},setPosition(x,y){this.x=x;this.y=y;return this;},setText(t){this.text=t;return this;},setInteractive(){return this;},on(e,fn){this.handlers[e]=fn;return this;},add(children){this.children.push(...children);return this;},destroy(){this.destroyed=true;this.children.forEach(c=>c.destroy());}};objects.push(item);return item;};
 scene.add=Object.fromEntries(['container','circle','text','rectangle','ellipse'].map(kind=>[kind,(...args)=>create(kind,...args)]));scene.shutdown=()=>shutdown?.();return scene;
}
test('building badges preserve resource type and add construction / unavailable status',{skip},async()=>{
 const {SettlementBuildingBadges}=await load('src/components/settlement/SettlementBuildingBadges.js'),scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{}),s=settlement([b('f','crop_field',{state:'construction'})]);
 badges.sync(s,'ru');const unit=badges.units.get('f');assert.equal(unit.icon.text,'🌾');assert.equal(unit.status.text,'⚒');assert.ok(unit.tooltip.text.includes('Еда: 0'));
 s.buildings[0].state='active';badges.sync(s,'ru');assert.equal(unit.status.text,'!');assert.equal(unit.icon.text,'🌾');
});
test('badge screen size stays constant at different zoom levels',{skip},async()=>{
 const {SettlementBuildingBadges}=await load('src/components/settlement/SettlementBuildingBadges.js'),scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{});
 badges.sync(settlement([b('p','water_pump')]),'en');const unit=badges.units.get('p');assert.equal(unit.root.scale*scene.cameras.main.zoom,1);
 scene.cameras.main.zoom=1.5;badges.resize();assert.equal(unit.root.scale*scene.cameras.main.zoom,1);
});
test('a badge tap selects its building; a drag does not',{skip},async()=>{
 const {SettlementBuildingBadges}=await load('src/components/settlement/SettlementBuildingBadges.js'),scene=sceneDouble(),calls=[],badges=new SettlementBuildingBadges(scene,id=>calls.push(id));
 badges.sync(settlement([b('p','water_pump')]),'en');const target=badges.units.get('p').icon;
 target.handlers.pointerdown({x:10,y:10});target.handlers.pointerup({x:10,y:10});assert.deepEqual(calls,['p']);
 target.handlers.pointerdown({x:10,y:10});target.handlers.pointerup({x:50,y:50});assert.equal(calls.length,1);
});
test('building removal and scene shutdown destroy badge display objects',{skip},async()=>{
 const {SettlementBuildingBadges}=await load('src/components/settlement/SettlementBuildingBadges.js'),scene=sceneDouble(),badges=new SettlementBuildingBadges(scene,()=>{});
 badges.sync(settlement([b('p','water_pump')]),'en');const old=badges.units.get('p');badges.sync(settlement([]),'en');assert.equal(old.root.destroyed,true);assert.equal(badges.units.size,0);
 badges.sync(settlement([b('p','water_pump')]),'en');scene.shutdown();assert.equal(badges.units.size,0);assert.ok(scene.objects.every(o=>o.destroyed));
});

const runtimeDouble = {
 createWorkerState:(_world,job,position,index)=>({x:position?.x || 0,y:position?.y || 0,index,path:[],phase:job.kind==='work'?'working':job.kind,reason:job.reason,elapsed:0,cycle:0,cargo:false}),
 advanceWorkerState:state=>state,
};
test('the actual worker actor keeps its profession icon when cargo / waiting status changes',{skip},async()=>{
 const {SettlementWorkerActor}=await load('src/components/settlement/SettlementWorkerActor.js',{'src/utils/settlementWorkerRuntime.js':runtimeDouble});
 const scene=sceneDouble(),actor=new SettlementWorkerActor(scene),world={cells:[{x:0,y:0}]},job={kind:'work',action:'tend_crops',home:{x:0,y:0},goal:{x:0,y:0},reason:''};
 actor.configure(world,job,{resident:w('a','tend_crops'),language:'ru'});assert.equal(actor.symbol.text,'🌾');
 actor.state.phase='to_depot';actor.state.cargo=true;actor.render(0);assert.equal(actor.symbol.text,'🌾');assert.equal(actor.activity.text,'▣');
 actor.state.phase='waiting';actor.state.reason='unpowered';actor.render(0);assert.equal(actor.symbol.text,'🌾');assert.equal(actor.activity.text,'!');assert.ok(actor.label.text.includes('Нет энергии'));
});
test('the actual worker actor supports badge tapping and cleans up all icon objects',{skip},async()=>{
 const {SettlementWorkerActor}=await load('src/components/settlement/SettlementWorkerActor.js',{'src/utils/settlementWorkerRuntime.js':runtimeDouble});
 const scene=sceneDouble(),actor=new SettlementWorkerActor(scene);actor.configure({cells:[{x:0,y:0}]},{kind:'idle',action:'',home:{x:0,y:0},goal:{x:0,y:0}},{resident:w('a')});
 let stopped=false;actor.symbol.handlers.pointerdown(null,0,0,{stopPropagation(){stopped=true;}});assert.equal(actor.label.visible,true);assert.equal(stopped,true);
 actor.destroy();assert.ok(scene.objects.every(o=>o.destroyed));
});

const queueDouble = (queue) => ({
 advanceConstruction:s=>s, cost:()=>({}), canSpend:()=>true,
 tasks:()=>queue, assignedKey:w=>w.settlementAction?.targetUpgradeId ? `upgrade:${w.settlementAction.targetUpgradeId}` : null,
});
function residentRuntimeDouble(calls) {
 return { createWorkerWorld:buildings=>({buildings,cells:[{x:0,y:0}]}),
  resolveWorkerJob:(world,worker)=>{calls.push({world,worker});return {kind:'work',action:worker.settlementAction.type,targetId:worker.settlementAction.targetBuildingId,home:{x:0,y:0},goal:{x:0,y:0}};},
 };
}
const actorDouble = {SettlementWorkerActor:class {
 configure(_world,job){this.job=job;} destroy(){} update(){}
}};
test('resident renderer follows the automatic construction queue without changing the save',{skip},async()=>{
 const calls=[],s=settlement([b('site','crop_field',{state:'construction'})],[w('a','build')]),before=JSON.stringify(s);
 const {SettlementResidents}=await load('src/components/settlement/SettlementResidents.js',{
  'src/utils/settlementDevelopment.js':queueDouble([{key:'building:site',kind:'building',buildingId:'site'}]),
  'src/utils/settlementWorkerRuntime.js':residentRuntimeDouble(calls),
  'src/components/settlement/SettlementWorkerActor.js':actorDouble,
 });
 const residents=new SettlementResidents(sceneDouble());residents.sync(s,'en');
 assert.equal(calls[0].worker.settlementAction.targetBuildingId,'site');assert.equal(JSON.stringify(s),before);
 residents.sync(s,'en');assert.equal(calls.length,1);
});
test('upgrade assignments use the upgrade construction site without changing building state',{skip},async()=>{
 const calls=[],person={...w('a','build'),settlementAction:{type:'build',targetUpgradeId:'site'}},s=settlement([b('site','trading_post',{upgrade:{state:'construction',targetType:'trading_emporium'}})],[person]);
 const {SettlementResidents}=await load('src/components/settlement/SettlementResidents.js',{
  'src/utils/settlementDevelopment.js':queueDouble([{key:'upgrade:site',kind:'upgrade',buildingId:'site'}]),
  'src/utils/settlementWorkerRuntime.js':residentRuntimeDouble(calls),
  'src/components/settlement/SettlementWorkerActor.js':actorDouble,
 });
 new SettlementResidents(sceneDouble()).sync(s,'en');
 assert.equal(calls[0].worker.settlementAction.targetBuildingId,'site');assert.equal(calls[0].world.buildings[0].state,'construction');assert.equal(s.buildings[0].state,'active');
});
