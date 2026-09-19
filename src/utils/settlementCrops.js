import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { provisions } from './settlementProvisions.js';

export const CROP_TYPES=['carrot','corn','gourd','melon','mutfruit','razorgrain','tato'];

export function cropCapacity(building){
  return Math.max(0,Math.floor(Number(getRulebookBuilding(building?.type)?.effects?.cropSlots || 0)));
}

export function plantedCrops(building){
  return Array.isArray(building?.crops)?building.crops:[];
}

export function totalPlantedCrops(settlement){
  return (settlement.buildings||[]).reduce((sum,building)=>sum+plantedCrops(building).length,0);
}

export function plantSettlementCrop(settlement,buildingId,type,now=Date.now()){
  if(!CROP_TYPES.includes(type))throw new Error('INVALID_CROP');
  const building=(settlement.buildings||[]).find(item=>item.id===buildingId);
  if(!building||building.state!=='active'||Number(building.condition??100)<=0)throw new Error('NOT_FOUND');
  const capacity=cropCapacity(building),crops=plantedCrops(building);
  if(!capacity||crops.length>=capacity)throw new Error('CROP_PLOT_FULL');
  const stock=provisions(settlement.stockpile);
  // Food surplus represents chosen/rolled food items from the foraging table.
  // Choosing a plantable crop consumes one such food item.
  if(stock.food<1)throw new Error('CROP_ITEM_REQUIRED');
  const crop={id:`crop_${now}_${Math.random().toString(36).slice(2,7)}`,type,plantedAt:now};
  return {
    ...settlement,
    stockpile:{...(settlement.stockpile||{}),provisions:{...stock,food:stock.food-1}},
    buildings:(settlement.buildings||[]).map(item=>item.id===buildingId?{...item,crops:[...crops,crop]}:item),
    events:[{id:`crop_planted_${now}_${Math.random().toString(36).slice(2,7)}`,type:'crop_planted',cropType:type,buildingId,createdAt:now},...(settlement.events||[])].slice(0,100),
  };
}

export function removeSettlementCrop(settlement,buildingId,cropId,now=Date.now()){
  const building=(settlement.buildings||[]).find(item=>item.id===buildingId);
  const crop=plantedCrops(building).find(item=>item.id===cropId);
  if(!building||!crop)throw new Error('NOT_FOUND');
  const stock=provisions(settlement.stockpile);
  return {
    ...settlement,
    stockpile:{...(settlement.stockpile||{}),provisions:{...stock,food:stock.food+1}},
    buildings:(settlement.buildings||[]).map(item=>item.id===buildingId?{...item,crops:plantedCrops(item).filter(entry=>entry.id!==cropId)}:item),
    events:[{id:`crop_removed_${now}_${Math.random().toString(36).slice(2,7)}`,type:'crop_removed',cropType:crop.type,buildingId,createdAt:now},...(settlement.events||[])].slice(0,100),
  };
}
