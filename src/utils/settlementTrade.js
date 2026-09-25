import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { resolveSettlementWorkplaces } from './settlementWorkplaces.js';

export const TRADE_PRICES={
  1:{common:{buy:8,sell:4}},
  2:{common:{buy:7,sell:5},uncommon:{buy:20,sell:10}},
  3:{common:{buy:6,sell:5},uncommon:{buy:18,sell:12},rare:{buy:50,sell:30}},
};
export function getSettlementMarket(settlement){
  const plan=resolveSettlementWorkplaces(settlement);
  let tier=0,storeId=null;
  for(const id of plan.staffedStoreIds||[]){
    const building=(settlement.buildings||[]).find(b=>b.id===id);
    const storeTier=Math.max(0,Number(getRulebookBuilding(building?.type)?.effects?.storeTier||0));
    if(storeTier>tier){tier=storeTier;storeId=id;}
  }
  return {tier,storeId,prices:TRADE_PRICES[tier]||{},open:tier>0};
}
