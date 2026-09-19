import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';

export const STORE_SPECIALTIES=['general','armor','weapons','food_drink','clothing'];

export function storeSpecialty(building){
  const effects=getRulebookBuilding(building?.type)?.effects||{};
  if(effects.storeFamily==='medical')return 'medical';
  if(effects.storeFamily!=='trading')return '';
  return STORE_SPECIALTIES.includes(building?.storeSpecialty)?building.storeSpecialty:'general';
}

export function usedStoreSpecialties(settlement,ignoreId=null){
  return new Set((settlement.buildings||[])
    .filter(building=>building.id!==ignoreId&&building.state!=='destroyed'&&getRulebookBuilding(building.type)?.effects?.storeFamily==='trading')
    .map(storeSpecialty));
}

export function nextStoreSpecialty(settlement){
  const used=usedStoreSpecialties(settlement);
  return STORE_SPECIALTIES.find(type=>!used.has(type))||null;
}

export function canUseStoreSpecialty(settlement,specialty,ignoreId=null){
  if(!STORE_SPECIALTIES.includes(specialty))return false;
  return !usedStoreSpecialties(settlement,ignoreId).has(specialty);
}

export function setStoreSpecialty(settlement,buildingId,specialty){
  if(!canUseStoreSpecialty(settlement,specialty,buildingId))throw new Error('STORE_TYPE_EXISTS');
  const target=(settlement.buildings||[]).find(building=>building.id===buildingId);
  if(!target||getRulebookBuilding(target.type)?.effects?.storeFamily!=='trading')throw new Error('NOT_FOUND');
  const before=storeSpecialty(target),beforeBonus=before==='food_drink'?1:0,afterBonus=specialty==='food_drink'?1:0;
  const happiness=Math.max(1,Math.min(20,Number(settlement.attributes?.happiness||10)+afterBonus-beforeBonus));
  return {
    ...settlement,
    buildings:(settlement.buildings||[]).map(building=>building.id===buildingId?{...building,storeSpecialty:specialty}:building),
    attributes:{...(settlement.attributes||{}),happiness},
    resources:{...(settlement.resources||{}),happiness},
  };
}

export function storeTradeProfile(settlement,building){
  const effects=getRulebookBuilding(building?.type)?.effects||{};
  if(!effects.store)return null;
  const tier=Math.max(1,Math.min(3,Number(effects.storeTier||effects.income||1)));
  const specialty=storeSpecialty(building);
  const specialized=specialty&&specialty!=='general'&&specialty!=='medical';
  const standardRarity=specialty==='medical'?tier:specialized?tier:Math.max(0,tier-1);
  const office=(settlement.buildings||[]).some(owner=>(owner.rooms||[]).some(room=>room.state==='active'&&room.type==='office'&&room.officeRole===`store:${building.id}`));
  const incomeRating=tier+(office?1:0);
  const capsBase=incomeRating>=4?300:incomeRating===3?200:incomeRating===2?100:50;
  const capsDice=incomeRating>=4?7:incomeRating===3?5:incomeRating===2?3:1;
  const rareChecks=Math.min(3,tier);
  return {specialty,tier,incomeRating,standardRarity,capsBase,capsDice,rareChecks};
}
