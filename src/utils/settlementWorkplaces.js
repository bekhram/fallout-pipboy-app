import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { resolveSettlementPower } from './settlementPower.js';
import { createWorkplacePlan, assignWorkplace, workplaceAssignmentError } from './settlementWorkplacePlan.js';

export function workplaceBuildings(settlement) {
  const power = resolveSettlementPower(settlement);
  return (settlement.buildings || []).map(b => {
    const effects = getRulebookBuilding(b.type)?.effects || {};
    return { ...b, effects, powered: !Number(effects.requiresPower || 0) || power.poweredBuildingIds.has(b.id) };
  });
}
export function resolveSettlementWorkplaces(settlement) {
  return createWorkplacePlan(settlement.settlers || [], workplaceBuildings(settlement));
}
export function assignSettlementWorkplace(settlement, workerId, buildingId) {
  return assignWorkplace(settlement, workplaceBuildings(settlement), workerId, buildingId);
}
export function settlementWorkplaceError(settlement, workerId, buildingId) {
  return workplaceAssignmentError(settlement.settlers || [], workplaceBuildings(settlement), workerId, buildingId);
}
export function effectiveSettlementResidents(settlement) {
  const plan = resolveSettlementWorkplaces(settlement);
  return (settlement.settlers || []).filter(w => plan.byWorker[w.id]?.active);
}
