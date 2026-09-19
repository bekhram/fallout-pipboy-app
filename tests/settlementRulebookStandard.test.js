import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSettlementPower } from '../src/utils/settlementPower.js';
import { resolveSettlementResources, getTendedCropResult, reserveCropFertilizer } from '../src/utils/settlementResources.js';
import { populationNeeds } from '../src/utils/settlementResidents.js';
import { constructionRequirementBlockers } from '../src/utils/settlementDevelopment.js';
import { butcherSettlementBrahmin } from '../src/utils/settlementResources.js';
import { advanceSettlementDay } from '../src/utils/settlementDayEngine.js';
import { contractorConstructionRule, settlementLeaderProfile } from '../src/utils/settlementLeaderRules.js';
import { setOfficeRole, setMayorBonusAction, dailyActionTypes } from '../src/utils/settlementOffices.js';
import { buySettlementSupply, rollSettlementTradeDice, sellSettlementSurplus } from '../src/utils/settlementTrade.js';
import { setStoreSpecialty, storeTradeProfile } from '../src/utils/settlementStores.js';
import { plantSettlementCrop } from '../src/utils/settlementCrops.js';
import { getRulebookBuilding } from '../src/data/settlement/rulebookCatalog.js';

const building=(id,type,x=0,y=0,extra={})=>({id,type,x,y,state:'active',condition:100,rooms:[],...extra});
const person=(id,action=null,extra={})=>({id,name:id,health:100,status:action?'working':'idle',settlementAction:action?{type:action}:null,...extra});
const base=()=>({
  offlineStandalone:true,
  settlementDay:1,
  attributes:{people:1,food:1,water:1,power:0,defense:1,beds:1,happiness:10,income:0},
  resources:{population:1,food:1,water:1,power:0,defense:1,beds:1,happiness:10,income:0,caps:0,materials:100},
  stockpile:{materials:{common:100,uncommon:100,rare:100},provisions:{food:10,water:10},items:[],fertilizer:0},
  buildings:[],settlers:[person('a')],events:[],attacks:[],livestock:{brahmin:0},recruitment:{tally:0},
});

test('standalone powered objects require a pylon or siren; lights consume no Power',()=>{
  const s=base();
  s.buildings=[
    building('g','generator'),
    building('purifier','water_purifier'),
    building('light','lights'),
  ];
  let grid=resolveSettlementPower(s);
  assert.equal(grid.produced,3);
  assert.equal(grid.poweredBuildingIds.has('purifier'),false);
  assert.equal(grid.poweredBuildingIds.has('light'),false);
  s.buildings.push(building('pylon','power_pylon'));
  grid=resolveSettlementPower(s);
  assert.equal(grid.poweredBuildingIds.has('purifier'),true);
  assert.equal(grid.poweredBuildingIds.has('light'),true);
  assert.equal(grid.consumed,2);
  assert.equal(grid.available,1);
});

test('robots never count toward People needs',()=>{
  const s=base();
  s.settlers=[person('human'),person('robot',null,{isRobot:true}),person('robot2',null,{kind:'robot'})];
  assert.equal(populationNeeds(s),1);
});

test('garden plots consume water only for crops actually planted',()=>{
  const s=base();
  s.buildings=[building('pump','water_pump'),building('plot','crop_field',0,0,{crops:[]})];
  let resources=resolveSettlementResources(s);
  assert.equal(resources.cropSlots,4);
  assert.equal(resources.cropCount,0);
  assert.equal(resources.cropWater,0);
  assert.equal(resources.water,3);
  s.buildings[1].crops=[{id:'c1',type:'corn'},{id:'c2',type:'tato'},{id:'c3',type:'melon'}];
  resources=resolveSettlementResources(s);
  assert.equal(resources.cropCount,3);
  assert.equal(resources.cropWater,1);
  assert.equal(resources.water,2);
});

test('planting a crop consumes one food item and obeys plot capacity',()=>{
  let s=base();
  s.buildings=[building('plot','crop_field')];
  s=plantSettlementCrop(s,'plot','corn',10);
  assert.equal(s.buildings[0].crops.length,1);
  assert.equal(s.stockpile.provisions.food,9);
  for(const [i,type] of ['tato','melon','gourd'].entries())s=plantSettlementCrop(s,'plot',type,20+i);
  assert.equal(s.buildings[0].crops.length,4);
  assert.throws(()=>plantSettlementCrop(s,'plot','carrot',99),/CROP_PLOT_FULL/);
});

test('one farmer tends six units; brahmin count as crops and fertilizer doubles up to six crops',()=>{
  const s=base();
  s.buildings=[building('plot','crop_field',0,0,{crops:[
    {id:'1',type:'corn'},{id:'2',type:'corn'},{id:'3',type:'tato'},{id:'4',type:'melon'},
  ]})];
  s.settlers=[person('farmer','tend_crops')];
  s.livestock={brahmin:2};
  s.nextDayFertilizer=1;
  const result=getTendedCropResult(s,1);
  assert.equal(result.tendedCrops,4);
  assert.equal(result.tendedBrahmin,2);
  assert.equal(result.fertilizedCrops,4);
  assert.equal(result.food,5); // 6 tended units => 3 Food, four fertilized crops add +2.
});

test('fertilizer reservation consumes stockpile units',()=>{
  const s=base();s.stockpile.fertilizer=2;
  const next=reserveCropFertilizer(s,1);
  assert.equal(next.stockpile.fertilizer,1);
  assert.equal(next.nextDayFertilizer,1);
});

test('mayor office enables one resident bonus action',()=>{
  let s=base();
  s.buildings=[building('house','small_house',0,0,{rooms:[{id:'office',type:'office',state:'active'}]})];
  s=setOfficeRole(s,'house','office','mayor');
  s=setMayorBonusAction(s,'a','guard');
  const actions=dailyActionTypes(s).filter(entry=>entry.workerId==='a');
  assert.equal(actions.length,1);
  assert.equal(actions[0].bonus,true);
  assert.equal(actions[0].action.type,'guard');
});

test('store office raises only its assigned store Income rating',()=>{
  let s=base();
  s.buildings=[
    building('store1','trading_post',0,0,{storeSpecialty:'general'}),
    building('store2','trading_shop',3,0,{storeSpecialty:'armor'}),
    building('house','small_house',0,4,{rooms:[{id:'office',type:'office',state:'active'}]}),
  ];
  s=setOfficeRole(s,'house','office','store:store1');
  assert.equal(storeTradeProfile(s,s.buildings[0]).incomeRating,2);
  assert.equal(storeTradeProfile(s,s.buildings[1]).incomeRating,2);
});

test('food and drink store specialty adds one Happiness and duplicate types are rejected',()=>{
  let s=base();s.buildings=[building('store1','trading_post',0,0,{storeSpecialty:'general'}),building('store2','trading_shop',3,0,{storeSpecialty:'armor'})];
  s=setStoreSpecialty(s,'store1','food_drink');
  assert.equal(s.attributes.happiness,11);
  assert.throws(()=>setStoreSpecialty(s,'store2','food_drink'),/STORE_TYPE_EXISTS/);
  s=setStoreSpecialty(s,'store1','general');
  assert.equal(s.attributes.happiness,10);
});

test('trade uses abstract Income and purchased Food is held for a future day',()=>{
  let s=base();s.trade={traderAvailable:true};s.attributes.food=5;s.resources.food=5;
  s=sellSettlementSurplus(s,'food',1,{random:()=>0}); // 1 CD rolls 1 => 1 base + 1 rolled.
  assert.equal(s.attributes.food,4);
  assert.equal(s.attributes.income,2);
  s=buySettlementSupply(s,'water',1,{random:()=>0});
  assert.equal(s.attributes.income,1);
  assert.equal(s.tradeReserves.water,1);
});

test('trade office can reroll zero CD results',()=>{
  const values=[.4,0];let index=0; // first d6=3 (zero), reroll d6=1.
  const roll=rollSettlementTradeDice(1,{rerolls:3,random:()=>values[index++]??0});
  assert.equal(roll.total,1);
  assert.deepEqual(roll.rolls,[1]);
});

test('Contractor rank 1 halves materials; careful mode doubles time without Happiness penalty',()=>{
  const character={perksAndTraits:[{name:'Contractor',rank:1}]};
  const rule={materials:{common:5,uncommon:2},constructionDays:4};
  const cheap=contractorConstructionRule(rule,character,'cheap');
  assert.deepEqual(cheap.materials,{common:3,uncommon:1});
  assert.equal(cheap.constructionDays,4);
  assert.equal(cheap.happinessPenalty,2);
  const careful=contractorConstructionRule(rule,character,'careful');
  assert.deepEqual(careful.materials,{common:3,uncommon:1});
  assert.equal(careful.constructionDays,8);
  assert.equal(careful.happinessPenalty,0);
});

test('leader profile reads CHA and settlement perk ranks',()=>{
  const profile=settlementLeaderProfile({
    special:{charisma:8},
    perksAndTraits:[{name:'Community Organizer',rank:2},{name:'Contractor',rank:1},{name:'Local Leader',rank:2}],
  });
  assert.deepEqual(profile,{charisma:8,communityOrganizerRank:2,contractorRank:1,localLeaderRank:2});
});

test('Community Organizer adds Food and Defense only when those resources are maintained',()=>{
  const s=base();
  s.leaderRuleProfile={communityOrganizerRank:2};
  s.settlers=[person('hunter','hunting_gathering'),person('guard','guard')];
  s.attributes={...s.attributes,people:2,beds:2,food:2,water:2,defense:2,happiness:10};
  s.resources={...s.resources,population:2,beds:2,food:2,water:2,defense:2,happiness:10};
  const oldRandom=Math.random;
  Math.random=()=>0; // every CD rolls 1
  try{
    const next=advanceSettlementDay(s,86400000);
    const organizer=next.events.find(event=>event.type==='community_organizer');
    const guard=next.events.find(event=>event.type==='guard');
    assert.equal(organizer.food,2);
    assert.equal(organizer.defense,2);
    assert.equal(guard.communityOrganizerDefense,2);
  }finally{Math.random=oldRandom;}
});

test('catalog includes book-correct pylon, powered pump and industrial purifier',()=>{
  assert.equal(getRulebookBuilding('power_pylon').skill.rank,2);
  assert.equal(getRulebookBuilding('powered_water_pump').effects.water,10);
  assert.equal(getRulebookBuilding('powered_water_pump').effects.requiresPower,4);
  assert.equal(getRulebookBuilding('industrial_water_purifier').effects.water,40);
  assert.equal(getRulebookBuilding('industrial_water_purifier').effects.requiresPower,5);
});


test('Rare settlement objects require a learned specific recipe',()=>{
  const character={skills:{Speech:{rank:2}},perksAndTraits:[]};
  const rule=getRulebookBuilding('caravan_post');
  assert.ok(constructionRequirementBlockers(character,rule,'caravan_post').some(blocker=>blocker.kind==='recipe'));
  const learned={...character,settlementRecipes:['caravan_post']};
  assert.equal(constructionRequirementBlockers(learned,rule,'caravan_post').some(blocker=>blocker.kind==='recipe'),false);
});

test('scavenging stations grant three rerolls per station',()=>{
  const s=base();
  s.buildings=[building('station','scrap_yard')];
  s.settlers=[person('scav','scavenging')];
  s.attributes={...s.attributes,food:5,water:5,beds:1,defense:1};
  const values=[.4,.4,.4,0,0,0];let index=0; // three initial 3s become three 1s.
  const oldRandom=Math.random;
  Math.random=()=>values[index++]??0;
  try{
    const next=advanceSettlementDay(s,86400000);
    const event=next.events.find(item=>item.type==='scavenging');
    assert.equal(event.stations,1);
    assert.deepEqual(event.rolls.slice(0,3),[1,1,1]);
  }finally{Math.random=oldRandom;}
});

test('brahmin can be butchered only as part of Tend Crops and is removed afterwards',()=>{
  const s=base();s.livestock={brahmin:1};
  assert.throws(()=>butcherSettlementBrahmin(s,'food'),/TEND_CROPS_REQUIRED/);
  s.settlers=[person('farmer','tend_crops')];
  const next=butcherSettlementBrahmin(s,'food',100);
  assert.equal(next.livestock.brahmin,0);
  assert.equal(next.nextDayBrahminFoodBonus,2);
});

test('start-of-day shortages reduce Happiness before end-of-day departure',()=>{
  const s=base();
  s.settlers=Array.from({length:5},(_,i)=>person('p'+i));
  s.attributes={people:5,food:0,water:0,power:0,defense:0,beds:0,happiness:5,income:0};
  s.resources={...s.resources,population:5,food:0,water:0,defense:0,beds:0,happiness:5};
  const next=advanceSettlementDay(s,86400000);
  assert.equal(next.attributes.happiness,1);
  assert.equal(next.settlers.length,4);
  assert.ok(next.events.some(event=>event.type==='needs_failed'));
  assert.ok(next.events.some(event=>event.type==='settler_left'));
});
