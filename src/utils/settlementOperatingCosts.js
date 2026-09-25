import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";
import { effectiveSettlementResidents, resolveSettlementWorkplaces } from "./settlementWorkplaces.js";
import { effectiveBuildingEffects, buildingLevel } from "./settlementBuildingLevels.js";

export const WORKER_WAGE_CAPS = 2;

function active(building){
  return building?.state==="active" && Number(building.condition??100)>0 && !building.autoDisabled;
}

function buildingUpkeep(building,power){
  if(!active(building))return 0;
  const raw=getRulebookBuilding(building.type)?.effects||{};
  const effects=effectiveBuildingEffects(building,raw);
  const powered=!Number(effects.requiresPower||0)||power.poweredBuildingIds.has(building.id);
  if(!powered && Number(effects.requiresPower||0)>0)return 0;

  let caps=0;
  if(effects.store)caps+=2+Math.max(1,Number(effects.storeTier||1))*3;
  if(effects.tradeOutpost)caps+=5+(buildingLevel(building)-1)*2;
  if(effects.improvedScavenging)caps+=4+(buildingLevel(building)-1)*2;
  if(Number(effects.power||0)>0)caps+=Math.max(1,Math.ceil(Number(effects.power||0)/5));
  if(Number(effects.water||0)>0)caps+=Math.max(1,Math.ceil(Number(effects.water||0)/5));
  if(Number(effects.storageLbs||0)>0)caps+=Math.max(1,buildingLevel(building));
  if(Number(effects.cropSlots||0)>0)caps+=Math.max(1,Math.ceil(Number(effects.cropSlots||0)/6));
  if(/turret/.test(String(building.type||"")))caps+=Math.max(1,Math.ceil(Number(raw.defense||1)/2));
  if(effects.guardActionDefenseBonus)caps+=1;
  if(effects.defensePerGuardPost)caps+=1;
  return Math.max(0,Math.floor(caps));
}

export function getSettlementOperatingCosts(settlement){
  const power=resolveSettlementPower(settlement);
  const plan=resolveSettlementWorkplaces(settlement);
  const buildingRows=(settlement.buildings||[]).map(building=>({
    id:building.id,
    type:building.type,
    level:buildingLevel(building),
    caps:buildingUpkeep(building,power),
  })).filter(row=>row.caps>0);

  const workers=effectiveSettlementResidents(settlement).filter(worker=>{
    const type=worker.settlementAction?.type;
    return Boolean(type && type!=="build" && plan.byWorker?.[worker.id]?.active);
  });
  const wages=workers.length*WORKER_WAGE_CAPS;
  const buildingUpkeepCaps=buildingRows.reduce((sum,row)=>sum+row.caps,0);
  const debtBefore=Math.max(0,Math.floor(Number(settlement.maintenanceDebt||0)));
  return {
    workerCount:workers.length,
    wagePerWorker:WORKER_WAGE_CAPS,
    wages,
    buildingUpkeep:buildingUpkeepCaps,
    daily:buildingUpkeepCaps+wages,
    debtBefore,
    due:buildingUpkeepCaps+wages+debtBefore,
    buildingRows,
  };
}

export function applySettlementOperatingCosts(settlement,now=Date.now()){
  const costs=getSettlementOperatingCosts(settlement);
  const caps=Math.max(0,Math.floor(Number(settlement.resources?.caps||0)));
  const paid=Math.min(caps,costs.due);
  const debtAfter=Math.max(0,costs.due-paid);
  const dailyPaid=Math.min(costs.daily,paid);
  const event={
    id:`operating_cost_${now}_${Math.random().toString(36).slice(2,7)}`,
    type:"operating_cost",
    daily:costs.daily,
    wages:costs.wages,
    buildingUpkeep:costs.buildingUpkeep,
    debtBefore:costs.debtBefore,
    paid,
    debtAfter,
    createdAt:now,
  };
  return {
    ...settlement,
    maintenanceDebt:debtAfter,
    lastOperatingCost:{...event,dailyPaid},
    resources:{...(settlement.resources||{}),caps:caps-paid},
    events:[event,...(settlement.events||[])].slice(0,100),
  };
}
