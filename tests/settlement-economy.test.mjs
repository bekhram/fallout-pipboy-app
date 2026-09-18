import test from 'node:test';
import assert from 'node:assert/strict';
import { gardenCommand, donateGardenItem, plantedCrops } from '../src/utils/settlementGarden.js';
import { tradeCommand, useTradeSupply, reputationCommand, merchantPresent } from '../src/utils/settlementTrade.js';
import { resolveSettlementResources, getTendedCropResult } from '../src/utils/settlementResources.js';
import { createConstructionBuilding, advanceSettlementDay } from '../src/utils/settlementDayEngine.js';
import { processSettlementCommerce } from '../src/utils/settlementCommerce.js';
const b=(id,type)=>({id,type,state:'active',condition:100,rooms:[]});
const base=()=>({settlementDay:7,buildings:[{...b('garden','crop_field'),crops:[]},b('post','caravan_post')],settlers:[],attributes:{happiness:20},stockpile:{items:[{id:'corn',name:'Corn',quantity:4},{id:'f',name:'Fertilizer',quantity:1}],materials:{},provisions:{food:2,water:2}},trade:{income:3},attacks:[]});
test('planting and fertilizer consume items, empty plots consume no water, legacy output survives',()=>{
 let s=base();assert.equal(resolveSettlementResources(s).cropWater,0);
 assert.deepEqual(createConstructionBuilding({id:'n',type:'crop_field',x:0,y:0}).crops,[]);
 assert.equal(plantedCrops(b('old','crop_field')).length,4);
 for(let i=0;i<4;i++)s=gardenCommand(s,{type:'plant',buildingId:'garden',itemId:'corn'});
 assert.equal(resolveSettlementResources(s).cropWater,2);
 assert.equal(getTendedCropResult(s,1).food,2);
 assert.equal(getTendedCropResult(s,0).food,0);
 assert.throws(()=>gardenCommand(s,{type:'plant',buildingId:'garden',itemId:'corn'}));
 s=gardenCommand(s,{type:'fertilize',buildingId:'garden',itemId:'f'});
 assert.equal(getTendedCropResult(s,1).food,4);assert.equal(s.stockpile.items.length,0);
 s=gardenCommand(s,{type:'uproot',buildingId:'garden',index:0});assert.equal(plantedCrops(s.buildings[0]).length,3);
 assert.throws(()=>gardenCommand(s,{type:'uproot',buildingId:'garden',index:-1}));
});
test('inventory donation is atomic and rejects fractional, excessive or unrelated items',()=>{
 const s=base(),c={inventoryItems:[{id:'seed',name:'Corn',quantity:'3',weight:1}]};
 const r=donateGardenItem(s,c,{itemId:'seed',quantity:2});
 assert.equal(r.character.inventoryItems[0].quantity,'1');assert.equal(c.inventoryItems[0].quantity,'3');
 assert.equal(r.settlement.stockpile.items.at(-1).quantity,2);
 for(const quantity of [-1,0,1.5,4,NaN])assert.throws(()=>donateGardenItem(s,c,{itemId:'seed',quantity}));
 assert.throws(()=>donateGardenItem({...s,stockpile:{...s.stockpile,capacityLbs:1}},c,{itemId:'seed',quantity:2}),/STORAGE_FULL/);
});
test('trade validates merchant and balance; purchased supply cannot generate new saleable stock',()=>{
 let s=base(),actor={id:'gm',isGM:true};
 assert.ok(merchantPresent(s));assert.ok(!merchantPresent({...s,settlementDay:8}));
 assert.throws(()=>tradeCommand({...s,settlementDay:8},{type:'tradeSell',resource:'food',quantity:1},actor),/NO_MERCHANT/);
 s=tradeCommand(s,{type:'tradeSell',resource:'food',quantity:2},actor,1,()=>0);
 assert.equal(s.trade.income,6);assert.equal(s.stockpile.provisions.food,0);
 assert.throws(()=>tradeCommand(s,{type:'tradeSell',resource:'food',quantity:1},actor),/insufficient/);
 s=tradeCommand(s,{type:'tradeBuy',resource:'food',quantity:6},actor,2,()=>0.5);
 assert.equal(s.trade.income,0);assert.equal(s.trade.supplies.food,1);
 s=useTradeSupply(s,'food');assert.throws(()=>useTradeSupply(s,'food'));
 s=advanceSettlementDay(s,1000);assert.equal(s.stockpile.provisions.food,0);assert.equal(s.nextDaySupplies.food,undefined);
 for(const quantity of [-1,1.1,Infinity,101])assert.throws(()=>tradeCommand(base(),{type:'tradeBuy',resource:'food',quantity},actor));
});
test('GM reputation ledger enforces range and reason; hostile player cannot trade',()=>{
 let s=base();assert.throws(()=>reputationCommand(s,{memberId:'p',rank:5,reason:'x'},{id:'p'}),/FORBIDDEN/);
 s=reputationCommand(s,{memberId:'p',rank:0,reason:'Story consequence'},{id:'gm',isGM:true},1);
 assert.equal(s.reputationHistory[0].previous,2);assert.equal(s.reputation.p.rank,0);
 assert.throws(()=>tradeCommand(s,{type:'tradeBuy',resource:'food',quantity:1},{id:'p'}),/FORBIDDEN/);
 assert.throws(()=>reputationCommand(s,{memberId:'p',rank:6,reason:'x'},{isGM:true}));
 assert.throws(()=>reputationCommand(s,{memberId:'p',rank:3,reason:' '},{isGM:true}));
});
test('store income accumulates once for a completed day and survives repeated processing',()=>{
 const s={...base(),settlementDay:2,commerceLastProcessedDay:0,trade:{income:0},buildings:[b('shop','trading_post')],settlers:Array.from({length:5},(_,i)=>({id:String(i),settlementAction:i?null:{type:'business'}}))};
 const next=processSettlementCommerce(s);assert.equal(next.trade.income,1);
 assert.equal(processSettlementCommerce(next).trade.income,1);
});
