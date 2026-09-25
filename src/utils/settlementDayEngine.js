import { provisions, collectDailySurplus } from "./settlementProvisions.js";
import { guardDefense, populationNeeds, residentNeeds } from "./settlementResidents.js";
import { advanceConstruction, cost } from "./settlementDevelopment.js";
import { ROOMS, SETTLEMENT_RULEBOOK } from "../data/settlement/rulebook.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";
import { getTendedCropResult, resolveSettlementResources } from "./settlementResources.js";
import { resolveSettlementWorkplaces, effectiveSettlementResidents } from './settlementWorkplaces.js';
import { advanceBuildingRepairs } from './settlementRepair.js';
import { addSettlerExperience, createSettlerProfile, randomSettlerName, settlerActionBonus } from './settlementSettlerProfile.js';
import { resolveSettlementDailyEvent } from './settlementEvents.js';
import { advanceSettlerRecovery } from './settlementHealth.js';
import { getSettlementTurretFirepower } from './settlementTowerDefense.js';
import { effectiveBuildingEffects, levelActionBonus } from './settlementBuildingLevels.js';
import { applySettlementOperatingCosts, getSettlementOperatingCosts } from './settlementOperatingCosts.js';

export const SETTLEMENT_DAY_MS = 24 * 60 * 60 * 1000;
export const SETTLEMENT_INCOME_CAPS_PER_POINT = 10;
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value) || 0));}
function randomId(prefix,now=Date.now()){return `${prefix}_${now}_${Math.random().toString(36).slice(2,8)}`;}
function rollCombatDice(count){let total=0,effects=0;const rolls=[];for(let index=0;index<count;index+=1){const die=1+Math.floor(Math.random()*6);rolls.push(die);if(die===1)total+=1;else if(die===2)total+=2;else if(die>=5){total+=1;effects+=1;}}return {total,effects,rolls};}
function resolveCaravanRun(worker,building){
  const bonus=settlerActionBonus(worker,'trade_caravan');
  const barterRank=Math.max(0,Number(bonus.rank||0));
  const trader=bonus.hasPerk?1:0;
  const capsRoll=20+Math.floor(Math.random()*21);
  const levelBonus=levelActionBonus(building);
  const caps=capsRoll+(barterRank*5)+(trader*10)+(levelBonus*10);
  const rawGoodsRoll=1+Math.floor(Math.random()*20);
  const goodsRoll=Math.min(20,rawGoodsRoll+barterRank+(trader?2:0)+levelBonus);
  const materials={common:0,uncommon:0,rare:0};
  if(goodsRoll<=10)materials.common=1;
  else if(goodsRoll<=15)materials.common=2;
  else if(goodsRoll<=18)materials.uncommon=1;
  else if(goodsRoll===19)materials.uncommon=2;
  else materials.rare=1;
  return {caps,capsRoll,goodsRoll,rawGoodsRoll,materials,barterRank,trader:Boolean(trader),levelBonus};
}
export function normalizeStockpile(stockpile={},legacyMaterials=0){
  const legacyCommon=Number(stockpile.common ?? legacyMaterials ?? 0) || 0;
  return {provisions:provisions(stockpile),capacityLbs:Number(stockpile.capacityLbs || SETTLEMENT_RULEBOOK.stockpile.baseCapacityLbs),materials:{common:Number(stockpile.materials?.common ?? legacyCommon) || 0,uncommon:Number(stockpile.materials?.uncommon ?? stockpile.uncommon ?? 0) || 0,rare:Number(stockpile.materials?.rare ?? stockpile.rare ?? 0) || 0},items:Array.isArray(stockpile.items) ? stockpile.items : [],foragingItems:Number(stockpile.foragingItems || 0)};
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
  const people=Array.isArray(settlement.settlers) ? settlement.settlers.length : Math.max(0,Math.floor(Number(settlement.attributes?.people ?? settlement.resources?.population ?? 0)));
  const powerGrid=resolveSettlementPower(settlement),resourceGrid=resolveSettlementResources(settlement);
  const base={people,needsPeople:populationNeeds(settlement),food:Math.max(0,Number(foodOverride ?? settlement.attributes?.food ?? settlement.resources?.food ?? 0)),water:Math.max(0,Number(resourceGrid.water || 0)+Number(settlement.activeDaySupplies?.water || 0)),power:Math.max(0,Number(powerGrid.produced || 0)),defense:Math.max(0,Number(dailyDefenseBonus || 0)),beds:0,happiness:clamp(settlement.attributes?.happiness ?? settlement.resources?.happiness ?? 10,1,20),income:Math.max(0,Number(settlement.attributes?.income ?? settlement.resources?.income ?? 0))};
  let storageBonus=0,noisyCount=0,guardStructures=0,officeCount=0,sirenCount=0,fortificationPoints=0;
  for(const building of settlement.buildings || []){
    if(!isActive(building))continue;
    const rule=getRulebookBuilding(building.type);if(!rule)continue;
    const effects=effectiveBuildingEffects(building,rule.effects || {}),requiresPower=Math.max(0,Number(effects.requiresPower || 0));
    const powered=!requiresPower || powerGrid.poweredBuildingIds.has(building.id);
    const isTurret=/turret/.test(String(building.type||""));
    if(powered){if(!isTurret)base.defense+=Number(effects.defense || 0);base.beds+=Number(effects.beds || 0);storageBonus+=Number(effects.storageLbs || 0);if(effects.guardActionDefenseBonus)guardStructures+=1;if(effects.defensePerGuardPost)sirenCount+=Number(effects.defensePerGuardPost || 0);}
    if(building.type==="wall_straight" || building.type==="wall_corner" || building.type==="wall_corner_reverse")fortificationPoints+=1;
    if(building.type==="gate")fortificationPoints+=2;
    if(effects.noisy)noisyCount+=1;
    for(const room of building.rooms || []){if(room.state!=="active")continue;const roomEffects=getRoomRule(room.type)?.effects || room.effects || {};base.beds+=Number(roomEffects.beds || 0);storageBonus+=Number(roomEffects.storageLbs || 0);if(roomEffects.office)officeCount+=1;}
  }
  base.defense+=sirenCount*guardStructures;
  if(dailyDefenseBonus===null)base.defense+=guardDefense(settlement,guardStructures);
  const wallDeterrence=Math.min(8,Math.floor(fortificationPoints/2));
  const turretFirepower=getSettlementTurretFirepower(settlement);
  return {...base,noisyCount,fortificationPoints,wallDeterrence,turretCount:turretFirepower.count,turretFirepower:turretFirepower.firepower,cropSlots:resourceGrid.cropSlots,cropStructures:resourceGrid.cropStructures,brahmin:resourceGrid.brahmin,brahminCapacity:resourceGrid.brahminCapacity,guardStructures,storageBonus,stockpileCapacityLbs:SETTLEMENT_RULEBOOK.stockpile.baseCapacityLbs+storageBonus,powerRequired:powerGrid.required,powerConsumed:powerGrid.consumed,powerAvailable:powerGrid.available,powerDeficit:powerGrid.deficit,unpoweredBuildings:powerGrid.unpoweredBuildingIds.size,officeCount};
}
function resolveConstruction(settlement,now){return advanceConstruction(settlement,now);}
function resolveResidentActions(input,now){
  let settlement=resolveConstruction(input,now);
  const settlers=effectiveSettlementResidents(settlement);
  const actionCounts=settlers.reduce((acc,settler)=>{const type=settler.settlementAction?.type;if(type)acc[type]=(acc[type] || 0)+1;return acc;},{});
  let stockpile=normalizeStockpile(settlement.stockpile,settlement.resources?.materials),dailyFood=0,dailyDefenseBonus=0;
  const events=[];
  const hunterList=settlers.filter(s=>s.settlementAction?.type==="hunting_gathering");
  const hunters=hunterList.length;
  if(hunters>0){const skillDice=hunterList.reduce((sum,s)=>sum+settlerActionBonus(s,"hunting_gathering").skillBonus,0);const perkDice=hunterList.filter(s=>settlerActionBonus(s,"hunting_gathering").hasPerk).length;const roll=rollCombatDice(3+Math.max(0,hunters-1)+skillDice+perkDice);dailyFood+=roll.total;stockpile={...stockpile,foragingItems:Number(stockpile.foragingItems || 0)+roll.effects};events.push({type:"hunting_gathering",workers:hunters,total:roll.total,effects:roll.effects,bonusDice:skillDice+perkDice});}
  const scavengerList=settlers.filter(s=>s.settlementAction?.type==="scavenging");
  const scavengers=scavengerList.length;
  if(scavengers>0){const skillDice=scavengerList.reduce((sum,s)=>sum+settlerActionBonus(s,"scavenging").skillBonus,0);const perkCommon=scavengerList.filter(s=>settlerActionBonus(s,"scavenging").hasPerk).length;const siteLevelDice=scavengerList.reduce((sum,s)=>{const b=(settlement.buildings||[]).find(x=>x.id===resolveSettlementWorkplaces(settlement).byWorker?.[s.id]?.buildingId);return sum+levelActionBonus(b);},0);const roll=rollCombatDice(3+Math.max(0,scavengers-1)+skillDice+siteLevelDice);const common=roll.total+perkCommon;stockpile={...stockpile,materials:{...stockpile.materials,common:Number(stockpile.materials.common || 0)+common,uncommon:Number(stockpile.materials.uncommon || 0)+roll.effects}};events.push({type:"scavenging",workers:scavengers,common,uncommon:roll.effects,bonusDice:skillDice+siteLevelDice,perkCommon});}
  const guardList=settlers.filter(s=>s.settlementAction?.type==="guard");
  const guards=guardList.length;
  if(guards>0){const staticStats=calculateStaticAttributes(settlement,0,dailyFood);const skillDefense=guardList.reduce((sum,s)=>sum+settlerActionBonus(s,"guard").skillBonus,0);const perkDefense=guardList.filter(s=>settlerActionBonus(s,"guard").hasPerk).length;dailyDefenseBonus=guards+Math.min(staticStats.guardStructures,guards*3)+skillDefense+perkDefense;events.push({type:"guard",workers:guards,defense:dailyDefenseBonus,skillDefense,perkDefense});}
  const cropList=settlers.filter(s=>s.settlementAction?.type==="tend_crops");
  const cropWorkers=cropList.length;
  if(cropWorkers>0){const cropResult=getTendedCropResult(settlement,cropWorkers);const skillFood=cropList.reduce((sum,s)=>sum+settlerActionBonus(s,"tend_crops").skillBonus,0);const perkFood=cropList.filter(s=>settlerActionBonus(s,"tend_crops").hasPerk).length;dailyFood+=cropResult.food+skillFood+perkFood;events.push({type:"tend_crops",...cropResult,skillFood,perkFood,food:cropResult.food+skillFood+perkFood});}
  const businessWorkers=Number(actionCounts.business || 0);
  const workplacePlan=resolveSettlementWorkplaces(settlement);
  const businessList=settlers.filter(s=>s.settlementAction?.type==="business");
  const businessSkill=businessList.reduce((sum,s)=>sum+settlerActionBonus(s,"business").skillBonus,0);
  const traderBonus=businessList.filter(s=>settlerActionBonus(s,"business").hasPerk).length;
  const dailyIncome=workplacePlan.income+businessSkill+traderBonus;
  const storeCaps=Math.max(0,Math.floor(dailyIncome*SETTLEMENT_INCOME_CAPS_PER_POINT));
  if(businessWorkers>0)events.push({type:"business",workers:businessWorkers,stores:workplacePlan.staffedStoreIds.length,storeIds:workplacePlan.staffedStoreIds,income:dailyIncome,caps:storeCaps,businessSkill,traderBonus});
  const caravanList=settlers.filter(s=>s.settlementAction?.type==="trade_caravan" && workplacePlan.byWorker[s.id]?.active);
  let caravanCaps=0;
  if(caravanList.length>0){
    for(const worker of caravanList){
      const caravanBuilding=(settlement.buildings||[]).find(b=>b.id===workplacePlan.byWorker?.[worker.id]?.buildingId);const run=resolveCaravanRun(worker,caravanBuilding);
      caravanCaps+=run.caps;
      stockpile={...stockpile,materials:{
        ...stockpile.materials,
        common:Number(stockpile.materials.common||0)+Number(run.materials.common||0),
        uncommon:Number(stockpile.materials.uncommon||0)+Number(run.materials.uncommon||0),
        rare:Number(stockpile.materials.rare||0)+Number(run.materials.rare||0),
      }};
      events.push({type:"trade_caravan",workers:1,workerId:worker.id,workerName:worker.name,caps:run.caps,goodsRoll:run.goodsRoll,rawGoodsRoll:run.rawGoodsRoll,common:run.materials.common,uncommon:run.materials.uncommon,rare:run.materials.rare,barterRank:run.barterRank,trader:run.trader});
    }
  }
  const resourceGrid=resolveSettlementResources(settlement);
  const attributes={...(settlement.attributes || {}),food:dailyFood+Number(settlement.nextDaySupplies?.food || 0),water:resourceGrid.water,income:dailyIncome};
  const activeIds=new Set(settlers.map(worker=>worker.id));
  const xpByAction={build:12,hunting_gathering:12,scavenging:12,guard:10,tend_crops:10,business:10,trade_caravan:12};
  const experienced=(settlement.settlers || []).map(worker=>{
    if(!activeIds.has(worker.id))return worker;
    const xp=Number(xpByAction[worker.settlementAction?.type] || 0);
    return xp ? addSettlerExperience(worker,xp) : worker;
  });
  return {settlement:{...settlement,settlers:experienced,activeDaySupplies:settlement.nextDaySupplies || {},attributes,stockpile,resources:{...(settlement.resources||{}),caps:Math.max(0,Number(settlement.resources?.caps||0))+caravanCaps+storeCaps}},dailyDefenseBonus,actionEvents:events};
}
function applyNeedsAndDeparture(input,dailyDefenseBonus,now){
  const stats=calculateStaticAttributes(input,dailyDefenseBonus,input.attributes?.food);let happiness=clamp(stats.happiness,1,20);const failedNeeds=[];
  for(const key of ["beds","food","water","defense"])if(Number(stats[key] || 0)<Number(stats.needsPeople || 0)){happiness=Math.max(1,happiness-1);failedNeeds.push(key);}
  let settlers=[...(input.settlers || [])],departed=null;
  if(populationNeeds(input) && happiness<populationNeeds(input)){departed=[...settlers].reverse().find(residentNeeds);settlers=settlers.filter(w=>w.id!==departed.id);}
  const attributes={...(input.attributes || {}),people:settlers.length,happiness},events=[];
  if(failedNeeds.length)events.push({id:randomId("event",now),type:"needs_failed",failedNeeds,createdAt:now});
  if(departed)events.push({id:randomId("event",now+1),type:"settler_left",settlerId:departed.id,settlerName:departed.name,createdAt:now});
  return {...input,settlers,attributes,events:[...events,...(input.events || [])].slice(0,100)};
}
function recruitmentCapacity(settlement,stats){
  const charisma=Math.max(0,Math.floor(Number(settlement.leader?.charisma || 0)));
  return Math.max(0,Math.min(Number(stats.beds || 0),10+charisma));
}
function createRecruit(settlement,now){
  const profile=createSettlerProfile();
  const name=randomSettlerName((settlement.settlers||[]).map(item=>item.name));
  return {id:randomId("settler",now),name,role:"unassigned",assignedBuildingId:null,settlementAction:null,health:100,status:"idle",joinedAt:now,...profile};
}
function resolveRecruitment(input,now){
  const stats=calculateStaticAttributes(input,null,input.attributes?.food);
  const people=Number(stats.people || 0),capacity=recruitmentCapacity(input,stats);
  const power=resolveSettlementPower(input);
  const beacon=(input.buildings || []).find(building=>{
    if(!isActive(building))return false;
    const effects=getRulebookBuilding(building.type)?.effects || {};
    return Boolean(effects.attractsPeople) && (!Number(effects.requiresPower || 0) || power.poweredBuildingIds.has(building.id));
  });
  if(!beacon || people>=capacity)return input;
  const supplied=Number(stats.food || 0)>=people+1 && Number(stats.water || 0)>=people+1 && Number(stats.beds || 0)>=people+1;
  if(!supplied)return input;
  const roll=1+Math.floor(Math.random()*20),target=clamp(stats.happiness,1,20),success=roll<=target;
  const check={id:randomId("event",now+3),type:"recruitment_check",roll,target,result:success?"success":"none",createdAt:now};
  if(!success)return {...input,events:[check,...(input.events || [])].slice(0,100)};
  const recruit=createRecruit(input,now);
  const settlers=[...(input.settlers || []),recruit];
  return {...input,settlers,attributes:{...(input.attributes || {}),people:settlers.length},resources:{...(input.resources || {}),population:settlers.length},events:[
    {id:randomId("event",now+4),type:"settler_joined",settlerId:recruit.id,settlerName:recruit.name,createdAt:now},
    check,...(input.events || [])
  ].slice(0,100)};
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
  const actionResult=resolveResidentActions(input,now);
  const production=calculateStaticAttributes(actionResult.settlement,actionResult.dailyDefenseBonus,actionResult.settlement.attributes.food);
  let settlement=applyNeedsAndDeparture(actionResult.settlement,actionResult.dailyDefenseBonus,now);
  settlement=collectDailySurplus(settlement,production);settlement=applySettlementOperatingCosts(settlement,now);settlement=advanceBuildingRepairs(settlement,now);settlement=advanceSettlerRecovery(settlement,now);settlement=resolveRecruitment(settlement,now);settlement=resolveSettlementDailyEvent(settlement,now);settlement=scheduleAttackAtEndOfDay(settlement,now);
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

export function getSettlementDailyForecast(settlement){
  const workplaces=resolveSettlementWorkplaces(settlement);
  const residents=effectiveSettlementResidents(settlement);
  const resourceGrid=resolveSettlementResources(settlement);
  const snapshot=calculateStaticAttributes(settlement,null,settlement.attributes?.food);

  const cropWorkers=residents.filter(s=>s.settlementAction?.type==="tend_crops");
  const cropBase=workplaces.food;
  const cropSkill=cropWorkers.reduce((sum,s)=>sum+settlerActionBonus(s,"tend_crops").skillBonus,0);
  const cropPerks=cropWorkers.filter(s=>settlerActionBonus(s,"tend_crops").hasPerk).length;
  const foodProduced=Math.max(0,cropBase+cropSkill+cropPerks);

  const businessWorkers=residents.filter(s=>s.settlementAction?.type==="business");
  const businessSkill=businessWorkers.reduce((sum,s)=>sum+settlerActionBonus(s,"business").skillBonus,0);
  const businessPerks=businessWorkers.filter(s=>settlerActionBonus(s,"business").hasPerk).length;
  const storeIncome=Math.max(0,workplaces.income+businessSkill+businessPerks);
  const storeCaps=storeIncome*SETTLEMENT_INCOME_CAPS_PER_POINT;

  const scavengers=residents.filter(s=>s.settlementAction?.type==="scavenging");
  const scavengerSkill=scavengers.reduce((sum,s)=>sum+settlerActionBonus(s,"scavenging").skillBonus,0);
  const scavengerPerks=scavengers.filter(s=>settlerActionBonus(s,"scavenging").hasPerk).length;
  const scavengingLevelDice=scavengers.reduce((sum,s)=>{const b=(settlement.buildings||[]).find(x=>x.id===workplaces.byWorker?.[s.id]?.buildingId);return sum+levelActionBonus(b);},0);
  const scavengingDice=scavengers.length ? 3+Math.max(0,scavengers.length-1)+scavengerSkill+scavengingLevelDice : 0;

  const caravans=residents.filter(s=>s.settlementAction?.type==="trade_caravan");
  const caravanRanges=caravans.map(worker=>{
    const bonus=settlerActionBonus(worker,"trade_caravan");
    const b=(settlement.buildings||[]).find(x=>x.id===workplaces.byWorker?.[worker.id]?.buildingId);const extra=Number(bonus.rank||0)*5+(bonus.hasPerk?10:0)+levelActionBonus(b)*10;
    return {workerId:worker.id,workerName:worker.name,minCaps:20+extra,maxCaps:40+extra,barter:Number(bonus.rank||0),trader:Boolean(bonus.hasPerk)};
  });
  const caravanCapsMin=caravanRanges.reduce((sum,row)=>sum+row.minCaps,0);
  const caravanCapsMax=caravanRanges.reduce((sum,row)=>sum+row.maxCaps,0);

  const operating=getSettlementOperatingCosts(settlement);
  const needs=Math.max(0,Number(snapshot.needsPeople||0));
  const waterProduced=Math.max(0,Number(resourceGrid.waterProduced||0));
  const waterCropUse=Math.max(0,Number(resourceGrid.cropWater||0));
  const waterAfterCrops=Math.max(0,Number(resourceGrid.water||0));
  const foodNet=foodProduced-needs;
  const waterNet=waterAfterCrops-needs;

  const idleBuildings=[];
  for(const site of Object.values(workplaces.byBuilding||{})){
    if(site.state!=="active")continue;
    if(["business","tend_crops","trade_caravan"].includes(site.action) && !site.workerIds.length)idleBuildings.push({id:site.id,type:site.type,reason:"no_worker"});
  }
  const power=resolveSettlementPower(settlement);
  for(const id of power.unpoweredBuildingIds||[])idleBuildings.push({id,type:(settlement.buildings||[]).find(b=>b.id===id)?.type||"",reason:"no_power"});

  return {
    people:needs,
    food:{produced:foodProduced,consumed:needs,net:foodNet},
    water:{produced:waterProduced,cropUse:waterCropUse,available:waterAfterCrops,consumed:needs,net:waterNet},
    caps:{stores:storeCaps,caravanMin:caravanCapsMin,caravanMax:caravanCapsMax,grossMin:storeCaps+caravanCapsMin,grossMax:storeCaps+caravanCapsMax,operating:operating.daily,debt:operating.debtBefore,totalMin:storeCaps+caravanCapsMin-operating.daily,totalMax:storeCaps+caravanCapsMax-operating.daily},
    materials:{scavengers:scavengers.length,dice:scavengingDice,commonBonus:scavengerPerks,caravanRuns:caravans.length},
    power:{produced:Number(power.produced||0),consumed:Number(power.consumed||0),available:Number(power.available||0),deficit:Number(power.deficit||0)},
    defense:Number(snapshot.defense||0),
    idleBuildings,
    caravanRanges,
  };
}
