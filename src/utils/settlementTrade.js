import { hasTradeOffice } from './settlementOffices.js';

const amount = value => Math.max(0, Math.floor(Number(value) || 0));

function combatDie(random=Math.random){
  const die=1+Math.floor(random()*6);
  if(die===1)return {die,total:1,effect:false};
  if(die===2)return {die,total:2,effect:false};
  if(die>=5)return {die,total:1,effect:true};
  return {die,total:0,effect:false};
}

export function rollSettlementTradeDice(count,{rerolls=0,effectsNegative=false,random=Math.random}={}){
  const n=Math.max(0,Math.floor(Number(count)||0));
  let dice=Array.from({length:n},()=>combatDie(random));
  let remaining=Math.max(0,Math.floor(Number(rerolls)||0));
  // Trade Office may re-roll up to 3 CD. Prefer zero results first.
  for(let i=0;i<dice.length&&remaining>0;i++){
    if(dice[i].total===0){dice[i]=combatDie(random);remaining--;}
  }
  const total=dice.reduce((sum,result)=>sum+(effectsNegative&&result.effect?-1:result.total),0);
  return {rolls:dice.map(result=>result.die),effects:dice.filter(result=>result.effect).length,total};
}

function tradeRerolls(settlement){return hasTradeOffice(settlement)?3:0;}

export function canSettlementTrade(settlement){
  return Boolean(settlement?.trade?.traderAvailable);
}

export function sellSettlementSurplus(settlement,resource,points=1,{random=Math.random}={}){
  if(!['food','water'].includes(resource))throw new Error('INVALID_RESOURCE');
  if(!canSettlementTrade(settlement))throw new Error('TRADER_REQUIRED');
  const count=Math.max(1,amount(points));
  const current=amount(settlement.attributes?.[resource] ?? settlement.resources?.[resource]);
  if(current<count)throw new Error('INSUFFICIENT_RESOURCE');
  const roll=rollSettlementTradeDice(count,{rerolls:tradeRerolls(settlement),random});
  const incomeGained=Math.max(0,1+roll.total);
  const income=amount(settlement.attributes?.income ?? settlement.resources?.income)+incomeGained;
  return {
    ...settlement,
    attributes:{...(settlement.attributes||{}),[resource]:current-count,income},
    resources:{...(settlement.resources||{}),[resource]:current-count,income},
    events:[{id:`trade_sell_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,type:'trade_sell',resource,points:count,incomeGained,rolls:roll.rolls,createdAt:Date.now()},...(settlement.events||[])].slice(0,100),
  };
}

export function buySettlementSupply(settlement,resource,incomeSpent=1,{random=Math.random}={}){
  if(!['food','water'].includes(resource))throw new Error('INVALID_RESOURCE');
  if(!canSettlementTrade(settlement))throw new Error('TRADER_REQUIRED');
  const spend=Math.max(1,amount(incomeSpent));
  const income=amount(settlement.attributes?.income ?? settlement.resources?.income);
  if(income<spend)throw new Error('INSUFFICIENT_INCOME');
  const roll=rollSettlementTradeDice(spend,{rerolls:tradeRerolls(settlement),random});
  const gained=Math.max(1,roll.total);
  const reserves={food:amount(settlement.tradeReserves?.food),water:amount(settlement.tradeReserves?.water)};
  reserves[resource]+=gained;
  return {
    ...settlement,
    tradeReserves:reserves,
    attributes:{...(settlement.attributes||{}),income:income-spend},
    resources:{...(settlement.resources||{}),income:income-spend},
    events:[{id:`trade_buy_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,type:'trade_buy',resource,incomeSpent:spend,gained,rolls:roll.rolls,createdAt:Date.now()},...(settlement.events||[])].slice(0,100),
  };
}

export function reservePurchasedSupply(settlement,resource,points=1){
  if(!['food','water'].includes(resource))throw new Error('INVALID_RESOURCE');
  const count=Math.max(1,amount(points));
  const reserves={food:amount(settlement.tradeReserves?.food),water:amount(settlement.tradeReserves?.water)};
  if(reserves[resource]<count)throw new Error('INSUFFICIENT_RESOURCE');
  reserves[resource]-=count;
  return {
    ...settlement,
    tradeReserves:reserves,
    nextDaySupplies:{...(settlement.nextDaySupplies||{}),[resource]:amount(settlement.nextDaySupplies?.[resource])+count},
  };
}

export function setCaravanTravelDays(settlement,days){
  const value=Math.max(1,Math.min(30,Math.floor(Number(days)||1)));
  return {...settlement,trade:{...(settlement.trade||{}),caravanTravelDays:value}};
}

export function startTradeCaravan(settlement,workers,day){
  const count=Math.max(0,Math.floor(Number(workers)||0));
  if(!count || settlement.trade?.caravanTrip)return settlement;
  const travelDays=Math.max(1,Math.min(30,Math.floor(Number(settlement.trade?.caravanTravelDays)||1)));
  return {
    ...settlement,
    trade:{...(settlement.trade||{}),caravanTrip:{workers:count,departedDay:day,returnDay:day+travelDays}},
    events:[{id:`caravan_depart_${day}_${Math.random().toString(36).slice(2,7)}`,type:'trade_caravan_departed',workers:count,returnDay:day+travelDays,createdAt:Date.now()},...(settlement.events||[])].slice(0,100),
  };
}

export function resolveTradeCaravanReturn(settlement,day,{random=Math.random}={}){
  const trip=settlement.trade?.caravanTrip;
  if(!trip || day<Number(trip.returnDay||Infinity))return settlement;
  const roll=rollSettlementTradeDice(Math.max(1,Number(trip.workers||1))*2,{effectsNegative:true,random});
  const gained=Math.max(0,roll.total);
  const income=amount(settlement.attributes?.income ?? settlement.resources?.income)+gained;
  return {
    ...settlement,
    trade:{...(settlement.trade||{}),caravanTrip:null},
    attributes:{...(settlement.attributes||{}),income},
    resources:{...(settlement.resources||{}),income},
    events:[{id:`caravan_return_${day}_${Math.random().toString(36).slice(2,7)}`,type:'trade_caravan_returned',workers:trip.workers,incomeGained:gained,rolls:roll.rolls,createdAt:Date.now()},...(settlement.events||[])].slice(0,100),
  };
}
