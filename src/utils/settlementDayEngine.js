import { provisions, collectDailySurplus } from "./settlementProvisions.js";
import { guardDefense, populationNeeds, residentNeeds } from "./settlementResidents.js";
import { advanceConstruction, cost } from "./settlementDevelopment.js";
import { ROOMS, SETTLEMENT_RULEBOOK } from "../data/settlement/rulebook.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";
import { getTendedCropResult, resolveSettlementResources } from "./settlementResources.js";
import { resolveSettlementWorkplaces, effectiveSettlementResidents } from './settlementWorkplaces.js';
import { advanceBuildingRepairs } from './settlementRepair.js';
import { dailyActionTypes } from './settlementOffices.js';
import { resolveTradeCaravanReturn, startTradeCaravan } from './settlementTrade.js';

export const SETTLEMENT_DAY_MS = 24 * 60 * 60 * 1000;
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value) || 0));}
function randomId(prefix,now=Date.now()){return `${prefix}_${now}_${Math.random().toString(36).slice(2,8)}`;}
function rollCombatDice(count){let total=0,effects=0;const rolls=[];for(let index=0;index<count;index+=1){const die=1+Math.floor(Math.random()*6);rolls.push(die);if(die===1)total+=1;else if(die===2)total+=2;else if(die>=5){total+=1;effects+=1;}}return {total,effects,rolls};}
export function normalizeStockpile(stockpile={},legacyMaterials=0){
  const legacyCommon=Number(stockpile.common ?? legacyMaterials ?? 0) || 0;
  return {
    provisions:provisions(stockpile),
    capacityLbs:Number(stockpile.capacityLbs || SETTLEMENT_RULEBOOK.stockpile.baseCapacityLbs),
    materials:{common:Number(stockpile.materials?.common ?? legacyCommon) || 0,uncommon:Number(stockpile.materials?.uncommon ?? stockpile.uncommon ?? 0) || 0,rare:Number(stockpile.materials?.rare ?? stockpile.rare ?? 0) || 0},
    items:Array.isArray(stockpile.items) ? stockpile.items : [],
    foragingItems:Number(stockpile.foragingItems || 0),
    brahminMilk:Number(stockpile.brahminMilk || 0),
    fertilizer:Number(stockpile.fertilizer || 0),
  };
}
function canAffordMaterials(settlement,rule){if(!rule)return false;const stockpile=normalizeStockpile(settlement.stockpile,settlement.resources?.materials);const caps=Number(settlement.resources?.caps || 0);return ["common","uncommon","rare"].every(key=>Number(stockpile.materials[key] || 0)>=Number(rule.materials?.[key] || 0)) && caps>=Number(rule.caps || 0);}
function payCost(settlement,rule){
  if(!rule || !canAffordMaterials(settlement,rule))return settlement;
  const stockpile=normalizeStockpile(settlement.stockpile,settlement.resources?.materials);const materials={...stockpile.materials};
  for(const key of ["common","uncommon","rare"])materials[key]=Math.max(0,Number(materials[key] || 0)-Number(rule.materials?.[key] || 0));
  return {...settlement,stockpile:{...stockpile,materials},resources:{...(settlement.resources || {}),caps:Math.max(0,Number(settlement.resources?.caps || 0)-Number(rule.caps || 0)),materials:materials.common}};
}
export function canAffordRulebookBuilding(settlement,buildingType){return canAffordMaterials(settlement,getRulebookBuilding(buildingType));}
export function payRulebookBuildingCost(settlement,buildingType){return payCost(settlement,getRulebookBuilding(buildingType));}
export function getRoomRule(roomType){return ROOMS?.[roomType] || null;}
export function canAffordRoom(settlement,roomType){return canAffordMaterials(settlement,getRoomRule(roomType));}
export function payRoomCost(settlement,roomType){return payCost(settlement,getRoomRule(roomType));}
export function createRoomConstruction(roomType,now=Date.now()){
  const rule=getRoomRule(roomType);if(!rule)return null;
  return {id:randomId("room",now),type:roomType,state:"construction",constructionDaysRequired:Math.max(1,Number(rule.constructionDays || 1)),constructionProgressDays:0,paidCost:cost(rule),createdAt:now};
}
export function getRoomConstructionProgress(room){const rule=getRoomRule(room?.type);const required=Math.max(1,Number(room?.constructionDaysRequired || rule?.constructionDays || 1));const progress=Math.max(0,Number(room?.constructionProgressDays || 0));return {progress,required,remaining:Math.max(0,required-progress)};}
export function getStructureRoomCapacity(building){return Math.max(0,Number(getRulebookBuilding(building?.type)?.effects?.roomCapacity || 0));}
function isActive(building){return building?.state==="active" && Number(building.condition ?? 100)>0 && !building.autoDisabled;}
function calculateStaticAttributes(settlement,dailyDefenseBonus=null,foodOverride=null){
  const people=Array.isArray(settlement.settlers) ? populationNeeds(settlement) : Math.max(0,Math.floor(Number(settlement.attributes?.people ?? settlement.resources?.population ?? 0)));
  const powerGrid=resolveSettlementPower(settlement),resourceGrid=resolveSettlementResources(settlement);
  const base={people,needsPeople:populationNeeds(settlement),food:Math.max(0,Number(foodOverride ?? settlement.attributes?.food ?? settlement.resources?.food ?? 0)),water:Math.max(0,Number(resourceGrid.water || 0)+Number(settlement.activeDaySupplies?.water || 0)),power:Math.max(0,Number(powerGrid.produced || 0)),defense:Math.max(0,Number(dailyDefenseBonus || 0)),beds:0,happiness:clamp(settlement.attributes?.happiness ?? settlement.resources?.happiness ?? 10,1,20),income:Math.max(0,Number(settlement.attributes?.income ?? settlement.resources?.income ?? 0))};
  let storageBonus=0,noisyCount=0,guardStructures=0,officeCount=0,sirenCount=0,fortificationPoints=0;
  for(const building of settlement.buildings || []){
    if(!isActive(building))continue;
    const rule=getRulebookBuilding(building.type);if(!rule)continue;
    const effects=rule.effects || {},requiresPower=Math.max(0,Number(effects.requiresPower || 0));
    const powered=!requiresPower || powerGrid.poweredBuildingIds.has(building.id);
    if(powered){base.defense+=Number(effects.defense || 0);base.beds+=Number(effects.beds || 0);storageBonus+=Number(effects.storageLbs || 0);if(effects.guardActionDefenseBonus)guardStructures+=1;if(effects.defensePerGuardPost)sirenCount+=Number(effects.defensePerGuardPost || 0);}
    if(building.type==="wall_straight" || building.type==="wall_corner")fortificationPoints+=1;
    if(building.type==="gate")fortificationPoints+=2;
    if(effects.noisy)noisyCount+=1;
    for(const room of building.rooms || []){if(room.state!=="active")continue;const roomEffects=getRoomRule(room.type)?.effects || room.effects || {};base.beds+=Number(roomEffects.beds || 0);storageBonus+=Number(roomEffects.storageLbs || 0);if(roomEffects.office)officeCount+=1;}
  }
  base.defense+=sirenCount*guardStructures;
  if(dailyDefenseBonus===null)base.defense+=guardDefense(settlement,guardStructures);
  const wallDeterrence=Math.min(8,Math.floor(fortificationPoints/2));
  return {...base,noisyCount,fortificationPoints,wallDeterrence,cropSlots:resourceGrid.cropSlots,cropStructures:resourceGrid.cropStructures,brahmin:resourceGrid.brahmin,brahminCapacity:resourceGrid.brahminCapacity,guardStructures,storageBonus,stockpileCapacityLbs:SETTLEMENT_RULEBOOK.stockpile.baseCapacityLbs+storageBonus,powerRequired:powerGrid.required,powerConsumed:powerGrid.consumed,powerAvailable:powerGrid.available,powerDeficit:powerGrid.deficit,unpoweredBuildings:powerGrid.unpoweredBuildingIds.size,officeCount};
}
function resolveConstruction(settlement,now){return advanceConstruction(settlement,now);}
function resolveResidentActions(input,now){
  let settlement=resolveConstruction(input,now);
  const settlers=effectiveSettlementResidents(settlement);
  const activeIds=new Set(settlers.map(settler=>settler.id));
  const actionCounts=dailyActionTypes(settlement).reduce((acc,entry)=>{
    if(!activeIds.has(entry.workerId))return acc;
    const type=entry.action?.type;
    if(type)acc[type]=(acc[type] || 0)+1;
    return acc;
  },{});
  let stockpile=normalizeStockpile(settlement.stockpile,settlement.resources?.materials),dailyFood=0,dailyDefenseBonus=0;
  const events=[];
  const communityOrganizerRank=Math.max(0,Math.floor(Number(settlement.leaderRuleProfile?.communityOrganizerRank ?? settlement.leader?.communityOrganizerRank ?? 0)));
  const hunters=Number(actionCounts.hunting_gathering || 0);
  if(hunters>0){const roll=rollCombatDice(3+Math.max(0,hunters-1)+communityOrganizerRank);dailyFood+=roll.total;stockpile={...stockpile,foragingItems:Number(stockpile.foragingItems || 0)+roll.effects};events.push({type:"hunting_gathering",workers:hunters,total:roll.total,effects:roll.effects,communityOrganizerDice:communityOrganizerRank});}
  const scavengers=Number(actionCounts.scavenging || 0);
  if(scavengers>0){
    let roll=rollCombatDice(3+Math.max(0,scavengers-1)+communityOrganizerRank);
    const stationCount=(settlement.buildings || []).filter(building=>isActive(building)&&Number(getRulebookBuilding(building.type)?.effects?.scavengingRerolls || 0)>0).length;
    let rerolls=stationCount*3;
    if(rerolls>0){
      const next=[...roll.rolls];
      for(let index=0;index<next.length&&rerolls>0;index+=1){
        if(next[index]===3||next[index]===4){next[index]=1+Math.floor(Math.random()*6);rerolls-=1;}
      }
      let total=0,effects=0;
      for(const die of next){if(die===1)total+=1;else if(die===2)total+=2;else if(die>=5){total+=1;effects+=1;}}
      roll={rolls:next,total,effects};
    }
    stockpile={...stockpile,materials:{...stockpile.materials,common:Number(stockpile.materials.common || 0)+roll.total,uncommon:Number(stockpile.materials.uncommon || 0)+roll.effects}};
    events.push({type:"scavenging",workers:scavengers,common:roll.total,uncommon:roll.effects,stations:stationCount,rolls:roll.rolls});
  }
  const guards=Number(actionCounts.guard || 0);
  if(guards>0){const staticStats=calculateStaticAttributes(settlement,0,dailyFood);dailyDefenseBonus=guards+Math.min(staticStats.guardStructures,guards*3)+communityOrganizerRank;events.push({type:"guard",workers:guards,defense:dailyDefenseBonus,communityOrganizerDefense:communityOrganizerRank});}
  const cropWorkers=Number(actionCounts.tend_crops || 0);
  if(cropWorkers>0){const cropResult=getTendedCropResult(settlement,cropWorkers);dailyFood+=cropResult.food;events.push({type:"tend_crops",...cropResult});}
  if(communityOrganizerRank>0 && (hunters>0 || cropWorkers>0)){
    dailyFood+=communityOrganizerRank;
    events.push({type:"community_organizer",food:communityOrganizerRank,defense:guards>0?communityOrganizerRank:0});
  }
  const brahmin=Math.max(0,Math.floor(Number(settlement.livestock?.brahmin || 0)));
  if(brahmin>0){
    const fertilizerRoll=rollCombatDice(brahmin*2);
    stockpile={...stockpile,brahminMilk:Number(stockpile.brahminMilk || 0)+brahmin,fertilizer:Number(stockpile.fertilizer || 0)+fertilizerRoll.total};
    events.push({type:"brahmin_production",brahmin,milk:brahmin,fertilizer:fertilizerRoll.total,rolls:fertilizerRoll.rolls});
  }
  const businessWorkers=Number(actionCounts.business || 0);
  const workplacePlan=resolveSettlementWorkplaces(settlement);
  const dailyIncome=workplacePlan.income;
  if(businessWorkers>0)events.push({type:"business",workers:businessWorkers,stores:workplacePlan.staffedStoreIds.length,storeIds:workplacePlan.staffedStoreIds,income:dailyIncome});
  const caravanWorkers=Number(actionCounts.trade_caravan || 0);
  if(caravanWorkers>0){
    const beforeTrip=settlement.trade?.caravanTrip;
    settlement=startTradeCaravan(settlement,caravanWorkers,Number(settlement.settlementDay || 1));
    if(!beforeTrip && settlement.trade?.caravanTrip)events.push({type:"trade_caravan",workers:caravanWorkers,returnDay:settlement.trade.caravanTrip.returnDay});
  }
  const resourceGrid=resolveSettlementResources(settlement);
  const attributes={...(settlement.attributes || {}),food:dailyFood+Number(settlement.nextDaySupplies?.food || 0),water:resourceGrid.water,income:dailyIncome};
  return {settlement:{...settlement,activeDaySupplies:settlement.nextDaySupplies || {},activeDayFertilizer:Number(settlement.nextDayFertilizer || 0),nextDayFertilizer:0,attributes,stockpile},dailyDefenseBonus,actionEvents:events};
}
function applyStartOfDayNeeds(input,now){
  const stats=calculateStaticAttributes(input,null,input.attributes?.food);
  let happiness=clamp(stats.happiness,1,20);
  const failedNeeds=[];
  for(const key of ["beds","food","water","defense"]){
    if(Number(stats[key] || 0)<Number(stats.needsPeople || 0)){happiness=Math.max(1,happiness-1);failedNeeds.push(key);}
  }
  if(!failedNeeds.length)return input;
  return {...input,
    attributes:{...(input.attributes || {}),happiness},
    resources:{...(input.resources || {}),happiness},
    events:[{id:randomId("event",now),type:"needs_failed",failedNeeds,createdAt:now},...(input.events || [])].slice(0,100),
  };
}
function applyEndOfDayDeparture(input,now){
  const people=populationNeeds(input),happiness=clamp(input.attributes?.happiness,1,20);
  if(!people || happiness>=people)return input;
  const settlers=[...(input.settlers || [])],departed=[...settlers].reverse().find(residentNeeds);
  if(!departed)return input;
  const nextSettlers=settlers.filter(worker=>worker.id!==departed.id);
  const nextPeople=nextSettlers.filter(residentNeeds).length;
  return {...input,settlers:nextSettlers,
    attributes:{...(input.attributes || {}),people:nextPeople},
    resources:{...(input.resources || {}),population:nextPeople},
    events:[{id:randomId("event",now+1),type:"settler_left",settlerId:departed.id,settlerName:departed.name,createdAt:now},...(input.events || [])].slice(0,100),
  };
}
function scheduleAttackAtEndOfDay(input,now){
  const unresolved=(input.attacks || []).some(attack=>attack.state==="warning" || attack.state==="active");if(unresolved || now<Number(input.attackRiskBlockedUntil || 0))return input;
  const stats=calculateStaticAttributes(input,null,input.attributes?.food),foodSurplus=Number(stats.food || 0)>Number(stats.people || 0),waterSurplus=Number(stats.water || 0)>Number(stats.people || 0);if(!foodSurplus && !waterSurplus)return input;
  const diceCount=foodSurplus && waterSurplus ? 2 : 1,rawRolls=Array.from({length:diceCount},()=>1+Math.floor(Math.random()*20));if(rawRolls.length && stats.noisyCount>0)rawRolls[0]+=stats.noisyCount;
  const wallDeterrence=Number(stats.wallDeterrence || 0),rolls=rawRolls.map(roll=>Math.max(1,roll-wallDeterrence));
  const attacked=rolls.some(roll=>roll>Number(stats.defense || 0));
  if(!attacked)return {...input,events:[{id:randomId("event",now),type:"attack_check",rawRolls,rolls,wallDeterrence,defense:stats.defense,result:"safe",createdAt:now},...(input.events || [])].slice(0,100)};
  const delayRoll=rollCombatDice(3),delayDays=Math.max(1,delayRoll.total),startsAt=now+delayDays*SETTLEMENT_DAY_MS,people=Number(stats.people || 0),strength=Math.max(6,people+Math.floor(Math.random()*Math.max(4,people+4))),factionPool=["raiders","feral_ghouls","super_mutants"],faction=factionPool[Math.floor(Math.random()*factionPool.length)];
  const attack={id:randomId("attack",now),faction,strength,state:"warning",createdAt:now,startsAt,resolveAt:startsAt+SETTLEMENT_DAY_MS,rulebookRiskRawRolls:rawRolls,rulebookRiskRolls:rolls,wallDeterrence,rulebookDelayRoll:delayRoll.rolls,rulebookDelayDays:delayDays};
  return {...input,attackRiskBlockedUntil:startsAt+5*SETTLEMENT_DAY_MS,attacks:[attack,...(input.attacks || [])].slice(0,50),events:[{id:randomId("event",now+1),type:"attack_warning",attackId:attack.id,faction,startsAt,createdAt:now},...(input.events || [])].slice(0,100)};
}
export function advanceSettlementDay(input,now=Date.now()){
  const returned=resolveTradeCaravanReturn(input,Number(input.settlementDay || 1));
  const started=applyStartOfDayNeeds(returned,now);
  const actionResult=resolveResidentActions(started,now);
  const production=calculateStaticAttributes(actionResult.settlement,actionResult.dailyDefenseBonus,actionResult.settlement.attributes.food);
  let settlement=applyEndOfDayDeparture(actionResult.settlement,now);
  settlement=collectDailySurplus(settlement,production);settlement=advanceBuildingRepairs(settlement,now);settlement=scheduleAttackAtEndOfDay(settlement,now);
  const derived=calculateStaticAttributes(settlement,null,settlement.attributes?.food);
  const stockpile={...normalizeStockpile(settlement.stockpile,settlement.resources?.materials),capacityLbs:derived.stockpileCapacityLbs};
  return {...settlement,livestock:{...(settlement.livestock || {}),brahmin:Math.min(Math.max(0,Number(settlement.livestock?.brahmin || 0)),derived.brahminCapacity)},settlementDay:Math.max(1,Number(settlement.settlementDay || 1)+1),lastDayAt:now,nextDayAt:now+SETTLEMENT_DAY_MS,stockpile,
    attributes:{...(settlement.attributes || {}),people:derived.people,food:derived.food,water:derived.water,power:derived.power,defense:derived.defense,beds:derived.beds,happiness:clamp(settlement.attributes?.happiness ?? derived.happiness,1,20),income:Number(settlement.attributes?.income || 0)},
    resources:{...(settlement.resources || {}),population:derived.people,food:derived.food,water:derived.water,power:derived.power,defense:derived.defense,beds:derived.beds,happiness:clamp(settlement.attributes?.happiness ?? derived.happiness,1,20),income:Number(settlement.attributes?.income || 0),materials:Number(stockpile.materials.common || 0)},
    events:actionResult.actionEvents.map((event,index)=>({id:randomId("event",now+10+index),createdAt:now,...event})).concat(settlement.events || []).slice(0,100)};
}
export function processAutomaticSettlementDays(input,now=Date.now()){
  let settlement={...input};if(!Number(settlement.nextDayAt || 0)){const anchor=Number(settlement.lastDayAt || now);settlement.lastDayAt=anchor;settlement.nextDayAt=anchor+SETTLEMENT_DAY_MS;}
  let safety=0;while(now>=Number(settlement.nextDayAt || Infinity) && safety<90){safety+=1;settlement=advanceSettlementDay(settlement,Number(settlement.nextDayAt));}
  return advanceConstruction(settlement,now);
}
export function createConstructionBuilding({id,type,x,y,now=Date.now()}){
  const rule=getRulebookBuilding(type);return {id,type,x,y,rotation:0,state:"construction",condition:100,rooms:[],startedAt:now,constructionDaysRequired:Math.max(1,Number(rule?.constructionDays || 1)),constructionProgressDays:0,paidCost:cost(rule)};
}
export function getConstructionProgress(building){const rule=getRulebookBuilding(building?.type),required=Math.max(1,Number(building?.constructionDaysRequired || rule?.constructionDays || 1)),progress=Math.max(0,Number(building?.constructionProgressDays || 0));return {progress,required,remaining:Math.max(0,required-progress)};}
export function getSettlementRulebookSnapshot(settlement){return calculateStaticAttributes(settlement,null,settlement.attributes?.food);}
