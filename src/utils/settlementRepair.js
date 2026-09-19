import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { normalizeStockpile } from "./settlementDayEngine.js";

function missingPercent(building) {
  return Math.max(0, 100 - Math.max(0, Math.min(100, Number(building?.condition ?? 100))));
}

export function repairCostForBuilding(building) {
  const missing = missingPercent(building);
  const common = Math.max(0, Number(getRulebookBuilding(building?.type)?.materials?.common || 0));
  return Math.max(missing > 0 ? 1 : 0, Math.ceil(common * missing / 100));
}

export function damagedSettlementBuildings(settlement) {
  return (settlement?.buildings || []).filter((building) =>
    building?.type !== "settlement_hq"
    && building?.state !== "construction"
    && Number(building?.condition ?? 100) < 100
  );
}

export function startBuildingRepair(settlement, buildingId, now = Date.now()) {
  const building = (settlement.buildings || []).find((item) => item.id === buildingId);
  if (!building || building.type === "settlement_hq" || building.state === "construction") return settlement;
  const cost = repairCostForBuilding(building);
  if (!cost) return settlement;
  const stockpile = normalizeStockpile(settlement.stockpile, settlement.resources?.materials);
  if (Number(stockpile.materials.common || 0) < cost) throw new Error("INSUFFICIENT_REPAIR_MATERIALS");
  const materials = { ...stockpile.materials, common: Number(stockpile.materials.common || 0) - cost };
  return {
    ...settlement,
    stockpile: { ...stockpile, materials },
    resources: { ...(settlement.resources || {}), materials: materials.common },
    buildings: (settlement.buildings || []).map((item) => item.id === buildingId ? {
      ...item,
      repair: {
        startedAt: now,
        paidCommon: cost,
        workerIds: Array.isArray(item.repair?.workerIds) ? item.repair.workerIds : [],
      },
    } : item),
  };
}

export function assignRepairWorker(settlement, buildingId, workerId, assigned = true) {
  const building = (settlement.buildings || []).find((item) => item.id === buildingId);
  const worker = (settlement.settlers || []).find((item) => item.id === workerId);
  if (!building?.repair || !worker) return settlement;
  const current = new Set(building.repair.workerIds || []);
  if (assigned) current.add(workerId); else current.delete(workerId);
  return {
    ...settlement,
    buildings: (settlement.buildings || []).map((item) => item.id === buildingId ? {
      ...item,
      repair: { ...item.repair, workerIds: [...current].slice(0, 12) },
    } : item),
    settlers: (settlement.settlers || []).map((item) => item.id === workerId ? {
      ...item,
      status: assigned ? "repairing" : (item.status === "repairing" ? "idle" : item.status),
    } : item),
  };
}

export function advanceBuildingRepairs(settlement, now = Date.now()) {
  const validSettlers = new Set((settlement.settlers || []).map((item) => item.id));
  const completedWorkers = new Set();
  let changed = false;
  const buildings = (settlement.buildings || []).map((building) => {
    if (!building.repair) return building;
    const workers = (building.repair.workerIds || []).filter((id) => validSettlers.has(id));
    if (!workers.length) return { ...building, repair: { ...building.repair, workerIds: workers } };
    const before = Math.max(0, Math.min(100, Number(building.condition ?? 100)));
    const condition = Math.min(100, before + workers.length * 25);
    if (condition !== before) changed = true;
    if (condition >= 100) {
      workers.forEach((id) => completedWorkers.add(id));
      return { ...building, condition: 100, state: "active", repairedAt: now, repair: null };
    }
    return { ...building, condition, repair: { ...building.repair, workerIds: workers, updatedAt: now } };
  });
  if (!changed && !completedWorkers.size) return { ...settlement, buildings };
  return {
    ...settlement,
    buildings,
    settlers: (settlement.settlers || []).map((worker) => completedWorkers.has(worker.id)
      ? { ...worker, status: "idle" }
      : worker),
  };
}
