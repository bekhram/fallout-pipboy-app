import { settlerSkillRank, settlerHasPerk } from './settlementSettlerProfile.js';
import { applySettlerCondition } from './settlementHealth.js';

function id(prefix,now){return `${prefix}_${now}_${Math.random().toString(36).slice(2,8)}`;}
function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
function bestSkill(settlement,skill){
  return Math.max(0,...(settlement.settlers||[]).map(worker=>settlerSkillRank(worker,skill)));
}
function hasPerk(settlement,perk){
  return (settlement.settlers||[]).some(worker=>settlerHasPerk(worker,perk));
}
function pushEvent(settlement,event){
  return {...settlement,events:[event,...(settlement.events||[])].slice(0,100)};
}
function randomWorker(settlement){
  const list=(settlement.settlers||[]).filter(Boolean);
  return list.length?list[Math.floor(Math.random()*list.length)]:null;
}
function randomActiveBuilding(settlement){
  const list=(settlement.buildings||[]).filter(b=>b.type!=='settlement_hq'&&b.state==='active'&&Number(b.condition??100)>0);
  return list.length?list[Math.floor(Math.random()*list.length)]:null;
}

const EVENTS=['travelling_merchant','lucky_find','minor_illness','equipment_failure','settler_dispute','good_harvest','wanderer_story'];

export function resolveSettlementDailyEvent(input,now=Date.now()){
  if(!(input.settlers||[]).length)return input;
  if(Math.random()>0.35)return input;
  const type=EVENTS[Math.floor(Math.random()*EVENTS.length)];
  let settlement=input;
  let data={id:id('event',now),type,createdAt:now};

  if(type==='travelling_merchant'){
    const barter=bestSkill(settlement,'Barter');
    const trader=hasPerk(settlement,'trader');
    const caps=5+barter*2+(trader?3:0);
    settlement={...settlement,resources:{...(settlement.resources||{}),caps:Number(settlement.resources?.caps||0)+caps}};
    data={...data,caps,skill:'Barter',skillRank:barter,mitigated:barter>=2||trader};
  } else if(type==='lucky_find'){
    const survival=bestSkill(settlement,'Survival');
    const common=2+survival;
    const stock=settlement.stockpile||{},materials=stock.materials||{};
    settlement={...settlement,stockpile:{...stock,materials:{...materials,common:Number(materials.common||0)+common}},resources:{...(settlement.resources||{}),materials:Number(materials.common||0)+common}};
    data={...data,common,skill:'Survival',skillRank:survival};
  } else if(type==='minor_illness'){
    const medicine=bestSkill(settlement,'Medicine');
    const medic=hasPerk(settlement,'medic');
    const worker=randomWorker(settlement);
    if(worker){
      const loss=Math.max(0,20-medicine*5-(medic?5:0));
      settlement=loss?applySettlerCondition(settlement,worker.id,'sick',loss,now):settlement;
      data={...data,settlerId:worker.id,settlerName:worker.name,healthLoss:loss,condition:loss?'sick':'none',skill:'Medicine',skillRank:medicine,mitigated:loss===0};
    }
  } else if(type==='equipment_failure'){
    const repair=bestSkill(settlement,'Repair');
    const mechanic=hasPerk(settlement,'mechanic');
    const building=randomActiveBuilding(settlement);
    if(building){
      const damage=Math.max(0,20-repair*4-(mechanic?5:0));
      settlement={...settlement,buildings:settlement.buildings.map(item=>item.id===building.id?{...item,condition:clamp(Number(item.condition??100)-damage,1,100)}:item)};
      data={...data,buildingId:building.id,buildingType:building.type,conditionLoss:damage,skill:'Repair',skillRank:repair,mitigated:damage===0};
    }
  } else if(type==='settler_dispute'){
    const barter=bestSkill(settlement,'Barter');
    const loss=Math.max(0,2-Math.floor(barter/2));
    settlement={...settlement,attributes:{...(settlement.attributes||{}),happiness:clamp(Number(settlement.attributes?.happiness||10)-loss,1,20)},resources:{...(settlement.resources||{}),happiness:clamp(Number(settlement.attributes?.happiness||10)-loss,1,20)}};
    data={...data,happinessLoss:loss,skill:'Barter',skillRank:barter,mitigated:loss===0};
  } else if(type==='good_harvest'){
    const survival=bestSkill(settlement,'Survival');
    const green=hasPerk(settlement,'green_thumb');
    const food=2+survival+(green?2:0);
    settlement={...settlement,attributes:{...(settlement.attributes||{}),food:Number(settlement.attributes?.food||0)+food},resources:{...(settlement.resources||{}),food:Number(settlement.resources?.food||0)+food}};
    data={...data,food,skill:'Survival',skillRank:survival};
  } else if(type==='wanderer_story'){
    const happiness=1;
    settlement={...settlement,attributes:{...(settlement.attributes||{}),happiness:clamp(Number(settlement.attributes?.happiness||10)+happiness,1,20)},resources:{...(settlement.resources||{}),happiness:clamp(Number(settlement.attributes?.happiness||10)+happiness,1,20)}};
    data={...data,happiness};
  }

  return pushEvent(settlement,data);
}
