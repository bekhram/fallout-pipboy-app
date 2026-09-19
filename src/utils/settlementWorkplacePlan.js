// Pure allocation shared by daily accounting, the building UI and Phaser.
// Enriched buildings carry catalog effects and a `powered` flag from the adapter.
const nonnegative = value => Math.max(0, Number(value) || 0);
export function workplaceAction(building) {
  const e = building.effects || {};
  if (e.cropSlots) return 'tend_crops';
  if (e.store) return 'business';
  if (e.guardActionDefenseBonus) return 'guard';
  if (e.tradeOutpost) return 'trade_caravan';
  if (e.improvedScavenging) return 'scavenging';
  return '';
}
export function workplaceState(building) {
  if (building.state === 'construction') return 'construction';
  if (building.state !== 'active' || Number(building.condition ?? 100) <= 0) return 'broken';
  if (building.autoDisabled) return 'disabled';
  if (building.powered === false) return 'unpowered';
  return 'active';
}
const cropCount = building => Array.isArray(building?.crops) ? building.crops.length : nonnegative(building?.effects?.cropSlots);
export function workplaceCapacity(building) {
  const action = workplaceAction(building);
  if (action === 'tend_crops') return Math.ceil(cropCount(building) / 6);
  if (action === 'business' || action === 'guard') return 1;
  return action ? null : 0; // null means the catalog sets no per-building worker limit.
}
const manualTarget = worker => worker.settlementAction?.targetBuildingId || null;
const requiredSite = new Set(['business', 'tend_crops', 'trade_caravan']);

export function createWorkplacePlan(settlers = [], buildings = []) {
  const byBuilding = Object.create(null), byWorker = Object.create(null);
  for (const b of buildings) byBuilding[b.id] = {
    id: b.id, type: b.type, effects: b.effects || {}, crops: b.crops || [], action: workplaceAction(b),
    state: workplaceState(b), capacity: workplaceCapacity(b),
    workerIds: [], manualWorkerIds: [], tendedCrops: 0, food: 0, income: 0,
  };
  const workers = [...settlers].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const attach = (worker, site, crops = 0) => {
    const record = byWorker[worker.id];
    if (!record.buildingId) record.buildingId = site.id;
    if (!record.buildingIds.includes(site.id)) record.buildingIds.push(site.id);
    if (!site.workerIds.includes(worker.id)) site.workerIds.push(worker.id);
    site.tendedCrops += crops;
    record.active = true; record.reason = '';
  };
  for (const worker of workers) {
    const action = worker.settlementAction?.type || '';
    byWorker[worker.id] = { action, buildingId: null, buildingIds: [], active: Boolean(action), reason: '' };
    // Construction uses the existing construction queue, not production slots.
    if (!action || action === 'build') continue;
    const id = manualTarget(worker);
    if (!id) continue;
    const site = byBuilding[id], record = byWorker[worker.id];
    record.buildingId = id; record.active = false;
    if (!site || site.action !== action) { record.reason = 'missing_target'; continue; }
    if (site.state !== 'active') { record.reason = site.state; continue; }
    if (site.capacity !== null && site.manualWorkerIds.length >= site.capacity) { record.reason = 'full'; continue; }
    site.manualWorkerIds.push(worker.id);
    const crops = action === 'tend_crops' ? Math.min(6, site.crops.length - site.tendedCrops) : 0;
    attach(worker, site, crops);
  }
  // Legacy action-only residents stay automatic. A farmer can cover six crops
  // across multiple fields; manual assignments reserve a specific field first.
  for (const worker of workers) {
    const action = worker.settlementAction?.type || '', record = byWorker[worker.id];
    if (!action || action === 'build' || manualTarget(worker)) continue;
    const sites = Object.values(byBuilding).filter(s => s.action === action && s.state === 'active');
    record.active = !requiredSite.has(action);
    if (action === 'tend_crops') {
      let budget = 6;
      for (const site of sites) {
        const crops = Math.min(budget, site.crops.length - site.tendedCrops);
        if (crops > 0) { attach(worker, site, crops); budget -= crops; }
        if (!budget) break;
      }
    } else {
      const site = sites.find(s => s.capacity === null || s.workerIds.length < s.capacity);
      if (site) attach(worker, site);
    }
    if (!record.active) record.reason = sites.length ? 'full' : 'unavailable';
  }
  let tendedCrops = 0, income = 0;
  const staffedStoreIds = [];
  const multiplier = Math.floor(settlers.length / 5);
  for (const site of Object.values(byBuilding)) {
    // Allocate the pooled rounding remainder to a single field: per-building
    // previews must add up to the same integer food value used by the day engine.
    site.food = Math.floor((tendedCrops + site.tendedCrops) / 2) - Math.floor(tendedCrops / 2);
    tendedCrops += site.tendedCrops;
    if (site.action === 'business' && site.workerIds.length) {
      site.income = multiplier * nonnegative(site.effects.income);
      income += site.income; staffedStoreIds.push(site.id);
    }
  }
  return { byBuilding, byWorker, tendedCrops, food: Math.floor(tendedCrops / 2), income, staffedStoreIds };
}

export function workplaceAssignmentError(settlers, buildings, workerId, buildingId) {
  const worker = settlers.find(w => w.id === workerId), building = buildings.find(b => b.id === buildingId);
  if (!worker || !building) return 'NOT_FOUND';
  const action = workplaceAction(building);
  if (!action) return 'INVALID_ACTION';
  if (workplaceState(building) !== 'active') return 'WORKPLACE_UNAVAILABLE';
  const capacity = workplaceCapacity(building);
  const occupied = settlers.filter(w => w.id !== workerId && w.settlementAction?.type === action && manualTarget(w) === buildingId).length;
  if (capacity !== null && occupied >= capacity) return 'WORKPLACE_FULL';
  return '';
}

export function assignWorkplace(settlement, buildings, workerId, buildingId) {
  const settlers = settlement.settlers || [];
  const error = workplaceAssignmentError(settlers, buildings, workerId, buildingId);
  if (error) throw new Error(error);
  const action = workplaceAction(buildings.find(b => b.id === buildingId));
  const current = settlers.find(w => w.id === workerId);
  if (current.settlementAction?.type === action && manualTarget(current) === buildingId && current.assignedBuildingId === buildingId) return settlement;
  return { ...settlement, settlers: settlers.map(w => w.id === workerId
    ? { ...w, settlementAction: { type: action, targetBuildingId: buildingId }, assignedBuildingId: buildingId, status: 'working' }
    : w) };
}
