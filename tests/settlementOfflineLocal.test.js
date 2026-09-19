import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineSettlementData, offlineSettlementData } from '../src/utils/offlineSettlementStore.js';
import { collectDailySurplus } from '../src/utils/settlementProvisions.js';
import { processSettlementCommerce } from '../src/utils/settlementCommerce.js';
import { settlementProfit } from '../src/utils/settlementProfit.js';

test('standalone settlement data strips campaign ownership and is marked local only',()=>{
  const s=createOfflineSettlementData({name:'Local Test'},1000);
  assert.equal(s.name,'Local Test');
  assert.equal(s.offlineStandalone,true);
  assert.equal(s.localOnly,true);
  assert.equal(s.ownerCharacterId,null);
  assert.equal(s.ownership.type,'local_device');
  assert.equal(Object.hasOwn(s,'campaignId'),false);
  assert.equal(Object.hasOwn(s,'access'),false);
});

test('normalizing an old campaign settlement detaches it from campaign identifiers',()=>{
  const s=offlineSettlementData({
    id:'settlement_old',name:'Detached',campaignId:'campaign_aaaaaaaaaaaaaaaaaaaaaaaa',
    access:{ownerId:'u'},ownerCharacterId:'u',ownership:{type:'party'},
    attributes:{people:1,food:1,water:1,power:0,defense:0,beds:0,happiness:10,income:0},
    resources:{population:1,food:1,water:1,power:0,defense:0,beds:0,happiness:10,income:0,materials:0,caps:0},
    stockpile:{materials:{common:0,uncommon:0,rare:0},provisions:{food:0,water:0},items:[]},
    buildings:[],settlers:[],events:[],attacks:[],createdAt:1000,settlementDay:1,lastDayAt:1000,nextDayAt:86401000,
  },1000);
  assert.equal(s.campaignId,undefined);
  assert.equal(s.access,undefined);
  assert.equal(s.ownerCharacterId,null);
  assert.equal(s.offlineStandalone,true);
});

test('offline food and water surplus stays entirely in the settlement',()=>{
  const next=collectDailySurplus({
    offlineStandalone:true,
    stockpile:{provisions:{food:0,water:0}},
    nextDaySupplies:{},
  },{food:10,water:10,needsPeople:4});
  assert.deepEqual(next.stockpile.provisions,{food:6,water:3});
  assert.deepEqual(next.lastDaySurplus.claimable,{food:0,water:0});
  assert.deepEqual(settlementProfit(next).claimable,{caps:0,food:0,water:0});
});

test('offline store income is kept as abstract settlement Income',()=>{
  const settlers=[
    {id:'a',settlementAction:{type:'business'}},{id:'b'},{id:'c'},{id:'d'},{id:'e'},
  ];
  const next=processSettlementCommerce({
    offlineStandalone:true,
    settlementDay:2,commerceLastProcessedDay:0,
    resources:{caps:100,income:0},attributes:{income:0},settlers,
    buildings:[{id:'shop',type:'trading_emporium',state:'active',condition:100,rooms:[]}],
    events:[],
  });
  assert.equal(next.attributes.income,3);
  assert.equal(next.resources.income,3);
  assert.equal(next.resources.caps,100);
  assert.equal(settlementProfit(next).claimable.caps,0);
});
