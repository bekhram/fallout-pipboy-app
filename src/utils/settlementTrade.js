import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { INVENTORY_DATABASE } from '../data/inventoryDatabase.js';
import { resolveSettlementWorkplaces } from './settlementWorkplaces.js';
import { settlerActionBonus } from './settlementSettlerProfile.js';

export const TRADE_PRICES={
  1:{common:{buy:8,sell:4}},
  2:{common:{buy:7,sell:5},uncommon:{buy:20,sell:10}},
  3:{common:{buy:6,sell:5},uncommon:{buy:18,sell:12},rare:{buy:50,sell:30}},
};
const MARKET_RULES={
  1:{slots:4,maxRarity:1,categories:new Set(['food','beverages','aid'])},
  2:{slots:7,maxRarity:3,categories:new Set(['food','beverages','aid','tools','robot_parts'])},
  3:{slots:10,maxRarity:5,categories:new Set(['food','beverages','aid','tools','robot_parts','magazines'])},
};
function hashSeed(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function rarity(item){const n=Number(item?.rarity);return Number.isFinite(n)?Math.max(0,n):0;}
function cost(item){const n=Number(item?.cost);return Number.isFinite(n)?Math.max(1,Math.floor(n)):0;}
function merchantInfo(settlement,plan,storeId){
  const workerId=plan.byBuilding?.[storeId]?.workerIds?.[0];
  const worker=(settlement.settlers||[]).find(w=>w.id===workerId)||null;
  const bonus=worker?settlerActionBonus(worker,'business'):{rank:0,hasPerk:false};
  return {workerId,workerName:worker?.name||'',barter:Math.max(0,Number(bonus.rank||0)),trader:Boolean(bonus.hasPerk)};
}
function priceFactors(merchant,reputationRank=2){
  const repDelta=Math.max(-2,Math.min(3,Number(reputationRank||2)-2));
  const buy=Math.max(.72,1-(merchant.barter*.025)-(merchant.trader?.06:0)-(repDelta*.025));
  const sell=Math.min(1.35,1+(merchant.barter*.035)+(merchant.trader?.08:0)+(repDelta*.03));
  return {buy,sell};
}
function dailyInventory(settlement,tier){
  const rule=MARKET_RULES[tier];if(!rule)return[];
  const pool=INVENTORY_DATABASE.filter(item=>rule.categories.has(item.category)&&cost(item)>0&&rarity(item)<=rule.maxRarity);
  const rand=seeded(hashSeed(`${settlement.id||settlement.name||'settlement'}:${settlement.settlementDay||1}:${tier}`));
  const shuffled=[...pool].sort(()=>rand()-.5),seen=new Set(),result=[];
  for(const item of shuffled){
    const key=String(item.name||'').toLowerCase();if(!key||seen.has(key))continue;
    seen.add(key);
    result.push({...item,marketKey:`${settlement.settlementDay||1}:${item.name}`,quantity:1+Math.floor(rand()*Math.max(1,tier+1))});
    if(result.length>=rule.slots)break;
  }
  return result;
}
export function getSettlementMarket(settlement,reputationRank=2){
  const plan=resolveSettlementWorkplaces(settlement);
  let tier=0,storeId=null;
  for(const id of plan.staffedStoreIds||[]){
    const building=(settlement.buildings||[]).find(b=>b.id===id);
    const storeTier=Math.max(0,Number(getRulebookBuilding(building?.type)?.effects?.storeTier||0));
    if(storeTier>tier){tier=storeTier;storeId=id;}
  }
  const merchant=storeId?merchantInfo(settlement,plan,storeId):{barter:0,trader:false};
  const factors=priceFactors(merchant,reputationRank);
  const basePrices=TRADE_PRICES[tier]||{};
  const prices=Object.fromEntries(Object.entries(basePrices).map(([key,p])=>[key,{
    buy:Math.max(1,Math.ceil(Number(p.buy||0)*factors.buy)),
    sell:Math.max(1,Math.floor(Number(p.sell||0)*factors.sell)),
  }]));
  const purchases=settlement.marketPurchases||{};
  const inventory=dailyInventory(settlement,tier).map(item=>{
    const base=cost(item),bought=Math.max(0,Number(purchases[item.marketKey]||0));
    return {...item,available:Math.max(0,Number(item.quantity||0)-bought),
      buyPrice:Math.max(1,Math.ceil(base*factors.buy)),
      sellPrice:Math.max(1,Math.floor(base*.45*factors.sell))};
  });
  return {tier,storeId,prices,open:tier>0,merchant,factors,reputationRank:Number(reputationRank||2),inventory,day:Number(settlement.settlementDay||1)};
}
