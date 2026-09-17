import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";

function isActive(building) {
  return building?.state === "active" && Number(building.condition ?? 100) > 0;
}

export function resolveSettlementResources(settlement) {
  const powerGrid = resolveSettlementPower(settlement);
  let water = 0;
  let cropSlots = 0;
  let cropStructures = 0;
  let brahminCapacity = 0;

  const resourceBuildings = {};

  for (const building of settlement.buildings || []) {
    if (!isActive(building)) continue;
    const rule = getRulebookBuilding(building.type);
    if (!rule) continue;

    const effects = rule.effects || {};
    const requiresPower = Math.max(0, Number(effects.requiresPower || 0));
    const powered = !requiresPower || powerGrid.poweredBuildingIds.has(building.id);

    const isResourceObject = Boolean(
      effects.water
      || effects.cropSlots
      || effects.brahminCapacity
    );
    if (!isResourceObject) continue;

    resourceBuildings[building.id] = {
      type: building.type,
      powered,
      requiresPower,
      water: powered ? Math.max(0, Number(effects.water || 0)) : 0,
      cropSlots: powered ? Math.max(0, Number(effects.cropSlots || 0)) : 0,
      brahminCapacity: powered ? Math.max(0, Number(effects.brahminCapacity || 0)) : 0,
    };

    if (!powered) continue;
    water += Math.max(0, Number(effects.water || 0));
    cropSlots += Math.max(0, Number(effects.cropSlots || 0));
    brahminCapacity += Math.max(0, Number(effects.brahminCapacity || 0));
    if (effects.cropSlots) cropStructures += 1;
  }

  const brahmin = Math.max(0, Math.floor(Number(settlement.livestock?.brahmin || 0)));

  return {
    water,
    cropSlots,
    cropStructures,
    brahmin,
    brahminCapacity,
    resourceBuildings,
  };
}

export function getTendedCropResult(settlement, workers) {
  const resources = resolveSettlementResources(settlement);
  const workerCount = Math.max(0, Math.floor(Number(workers || 0)));
  const tendedCrops = Math.min(resources.cropSlots, workerCount * 6);
  return {
    workers: workerCount,
    cropSlots: resources.cropSlots,
    tendedCrops,
    food: Math.floor(tendedCrops / 2),
  };
}
