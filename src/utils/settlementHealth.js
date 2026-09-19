import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { settlerSkillRank, settlerHasPerk } from './settlementSettlerProfile.js';

export const UNAVAILABLE_SETTLER_STATUSES = new Set(['sick','injured','recovering']);

export function settlerAvailableForWork(settler){
  return !UNAVAILABLE_SETTLER_STATUSES.has(settler?.status);
}

export function settlementMedicalCapacity(settlement){
  const medicalBuildings=(settlement.buildings||[]).filter(building=>{
    if(building.state!=='active'||Number(building.condition??100)<=0||building.autoDisabled)return false;
    return Boolean(getRulebookBuilding(building.type)?.effects?.medical);
  });
  const medics=(settlement.settlers||[]).filter(settler=>settlerAvailableForWork(settler));
  const bestMedicine=Math.max(0,...medics.map(settler=>settlerSkillRank(settler,'Medicine')));
  const hasMedicPerk=medics.some(settler=>settlerHasPerk(settler,'medic'));
  const clinicBonus=medicalBuildings.reduce((sum,building)=>{
    const tier=Number(getRulebookBuilding(building.type)?.effects?.storeTier||1);
    return sum+Math.max(1,tier);
  },0);
  return {medicalBuildings:medicalBuildings.length,bestMedicine,hasMedicPerk,clinicBonus};
}

export function advanceSettlerRecovery(settlement,now=Date.now()){
  const capacity=settlementMedicalCapacity(settlement);
  const patients=(settlement.settlers||[]).filter(settler=>UNAVAILABLE_SETTLER_STATUSES.has(settler.status));
  if(!patients.length)return settlement;
  const events=[];
  const settlers=(settlement.settlers||[]).map(settler=>{
    if(!UNAVAILABLE_SETTLER_STATUSES.has(settler.status))return settler;
    const base=settler.status==='injured'?8:10;
    const medical=capacity.bestMedicine*3+(capacity.hasMedicPerk?5:0)+capacity.clinicBonus*4;
    const restOnly=capacity.medicalBuildings?0:5;
    const heal=Math.max(5,base+medical+restOnly);
    const health=Math.min(100,Number(settler.health??100)+heal);
    if(health>=100){
      events.push({id:`event_${now}_${settler.id}_recovered`,type:'settler_recovered',settlerId:settler.id,settlerName:settler.name,heal,createdAt:now});
      return {...settler,health:100,status:'idle',recoveredAt:now};
    }
    return {...settler,health,status:'recovering',recoveryUpdatedAt:now};
  });
  return {...settlement,settlers,events:[...events,...(settlement.events||[])].slice(0,100)};
}

export function applySettlerCondition(settlement,workerId,status,healthLoss=0,now=Date.now()){
  if(!UNAVAILABLE_SETTLER_STATUSES.has(status))return settlement;
  const worker=(settlement.settlers||[]).find(item=>item.id===workerId);
  if(!worker)return settlement;
  const health=Math.max(1,Number(worker.health??100)-Math.max(0,Number(healthLoss||0)));
  return {
    ...settlement,
    settlers:(settlement.settlers||[]).map(item=>item.id===workerId?{
      ...item,
      health,
      status,
      previousSettlementAction:item.settlementAction||item.previousSettlementAction||null,
      settlementAction:null,
      assignedBuildingId:null,
      conditionStartedAt:now,
    }:item),
  };
}
