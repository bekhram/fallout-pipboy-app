import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { SETTLEMENT_ACTIONS } from '../data/settlement/rulebook.js';
import { effectiveSettlementResidents } from './settlementWorkplaces.js';

export const residentNeeds = resident => !(resident?.isRobot || resident?.kind === 'robot');
export const populationNeeds = s => (s.settlers || []).filter(residentNeeds).length;
export const activeSettlementBuildings = s => (s.buildings || []).filter(b => b.state === 'active' && Number(b.condition ?? 100) > 0 && !b.autoDisabled);
export function availableSettlementActions(s) {
  const effects = activeSettlementBuildings(s).map(b => getRulebookBuilding(b.type)?.effects || {});
  return Object.values(SETTLEMENT_ACTIONS).filter(a => a.alwaysAvailable ||
    (a.id === 'tend_crops' && effects.some(e => e.cropSlots)) ||
    (a.id === 'business' && effects.some(e => e.store)) ||
    (a.id === 'trade_caravan' && effects.some(e => e.tradeOutpost)));
}
export function guardDefense(s, posts) {
  const active=effectiveSettlementResidents(s);
  const guards=active.reduce((total,w)=>total+(w.settlementAction?.type==='guard'?1:0)+(w.bonusSettlementAction?.type==='guard'?1:0),0);
  return guards + Math.min(posts, guards * 3);
}
