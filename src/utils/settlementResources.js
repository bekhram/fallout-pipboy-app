import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";
import { resolveSettlementWorkplaces } from './settlementWorkplaces.js';
import { plantedCrops } from './settlementCrops.js';

function isActive(building) {
  return building?.state === "active" && Number(building.condition ?? 100) > 0 && !building.autoDisabled;
}
export function resolveSettlementResources(settlement) {
  const powerGrid = resolveSettlementPower(settlement);
  let water = 0, cropSlots = 0, cropCount = 0, cropStructures = 0, brahminCapacity = 0;
  const resourceBuildings = {};
  for (const building of settlement.buildings || []) {
    if (!isActive(building)) continue;
    const rule = getRulebookBuilding(building.type);
    if (!rule) continue;
    const effects = rule.effects || {};
    const requiresPower = Math.max(0, Number(effects.requiresPower || 0));
    const powered = !requiresPower || powerGrid.poweredBuildingIds.has(building.id);
    if (!effects.water && !effects.cropSlots && !effects.brahminCapacity) continue;
    resourceBuildings[building.id] = {
      type: building.type, powered, requiresPower,
      water: powered ? Math.max(0, Number(effects.water || 0)) : 0,
      cropSlots: powered ? Math.max(0, Number(effects.cropSlots || 0)) : 0,
      cropCount: powered ? plantedCrops(building).length : 0,
      brahminCapacity: powered ? Math.max(0, Number(effects.brahminCapacity || 0)) : 0,
    };
    if (!powered) continue;
    water += Math.max(0, Number(effects.water || 0));
    cropSlots += Math.max(0, Number(effects.cropSlots || 0));
    cropCount += effects.cropSlots ? plantedCrops(building).length : 0;
    brahminCapacity += Math.max(0, Number(effects.brahminCapacity || 0));
    if (effects.cropSlots) cropStructures += 1;
  }
  const brahmin = Math.max(0, Math.floor(Number(settlement.livestock?.brahmin || 0)));
  return { water: Math.max(0, water - Math.ceil(cropCount / 3)), waterProduced: water,
    cropWater: Math.ceil(cropCount / 3), cropSlots, cropCount, cropStructures, brahmin, brahminCapacity, resourceBuildings };
}
export function reserveCropFertilizer(settlement, units = 1) {
  const count = Math.max(1, Math.floor(Number(units) || 1));
  const available = Math.max(0, Math.floor(Number(settlement.stockpile?.fertilizer || 0)));
  if (available < count) throw new Error('INSUFFICIENT_FERTILIZER');
  return {
    ...settlement,
    nextDayFertilizer: Math.max(0, Math.floor(Number(settlement.nextDayFertilizer || 0))) + count,
    stockpile: { ...(settlement.stockpile || {}), fertilizer: available - count },
  };
}

export function getTendedCropResult(settlement, workers) {
  const resources = resolveSettlementResources(settlement);
  const workerCount = Math.max(0, Math.floor(Number(workers || 0)));
  const actionCapacity = workerCount * 6;
  const hasAssignments = (settlement.settlers || []).some(w => w.settlementAction?.type === 'tend_crops');
  const planned = hasAssignments ? resolveSettlementWorkplaces(settlement).tendedCrops : 0;
  const tendedCrops = Math.min(resources.cropCount, Math.max(planned, actionCapacity));
  const remainingCapacity = Math.max(0, actionCapacity - tendedCrops);
  const tendedBrahmin = Math.min(resources.brahmin, remainingCapacity);
  const tendedUnits = tendedCrops + tendedBrahmin;
  const fertilizerUnits = Math.max(0, Math.floor(Number(settlement.nextDayFertilizer || 0)));
  const fertilizedCrops = Math.min(tendedCrops, fertilizerUnits * 6);
  const baseFood = Math.floor(tendedUnits / 2);
  const fertilizerBonusFood = Math.floor(fertilizedCrops / 2);
  return {
    workers: workerCount,
    cropSlots: resources.cropSlots,
    tendedCrops,
    tendedBrahmin,
    fertilizedCrops,
    fertilizerUnits,
    food: baseFood + fertilizerBonusFood,
  };
}


export function butcherSettlementBrahmin(settlement,mode='food',now=Date.now()){
  const brahmin=Math.max(0,Math.floor(Number(settlement.livestock?.brahmin||0)));
  if(!brahmin)throw new Error('NO_BRAHMIN');
  if(!(settlement.settlers||[]).some(worker=>worker.settlementAction?.type==='tend_crops'||worker.bonusSettlementAction?.type==='tend_crops'))throw new Error('TEND_CROPS_REQUIRED');
  if(!['food','meat'].includes(mode))throw new Error('INVALID_RESOURCE');
  const stock={...(settlement.stockpile||{})};
  let next={...settlement,livestock:{...(settlement.livestock||{}),brahmin:brahmin-1}};
  if(mode==='food'){
    next={...next,nextDayBrahminFoodBonus:Math.max(0,Number(settlement.nextDayBrahminFoodBonus||0))+2};
  }else{
    const p=provisions(stock);
    next={...next,stockpile:{...stock,provisions:{...p,food:p.food+2},brahminMeat:Math.max(0,Number(stock.brahminMeat||0))+2}};
  }
  return {...next,events:[{id:`brahmin_butchered_${now}_${Math.random().toString(36).slice(2,7)}`,type:'brahmin_butchered',mode,createdAt:now},...(settlement.events||[])].slice(0,100)};
}
