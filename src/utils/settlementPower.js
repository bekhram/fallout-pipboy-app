import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";

function isActive(building) {
  return building?.state === "active" && Number(building.condition ?? 100) > 0;
}

export function resolveSettlementPower(settlement) {
  const activeBuildings = (settlement.buildings || []).filter(isActive);
  let produced = 0;
  let required = 0;

  for (const building of activeBuildings) {
    const effects = getRulebookBuilding(building.type)?.effects || {};
    produced += Math.max(0, Number(effects.power || 0));
    required += Math.max(0, Number(effects.requiresPower || 0));
  }

  let remaining = produced;
  let consumed = 0;
  const poweredBuildingIds = new Set();
  const unpoweredBuildingIds = new Set();

  // Power producers and objects without a power requirement are always online.
  for (const building of activeBuildings) {
    const effects = getRulebookBuilding(building.type)?.effects || {};
    const need = Math.max(0, Number(effects.requiresPower || 0));
    if (!need) poweredBuildingIds.add(building.id);
  }

  // Allocate the shared settlement power pool deterministically in map/build order.
  for (const building of activeBuildings) {
    const effects = getRulebookBuilding(building.type)?.effects || {};
    const need = Math.max(0, Number(effects.requiresPower || 0));
    if (!need) continue;
    if (remaining >= need) {
      remaining -= need;
      consumed += need;
      poweredBuildingIds.add(building.id);
    } else {
      unpoweredBuildingIds.add(building.id);
    }
  }

  return {
    produced,
    required,
    consumed,
    available: Math.max(0, produced - consumed),
    deficit: Math.max(0, required - produced),
    poweredBuildingIds,
    unpoweredBuildingIds,
  };
}

export function isBuildingPowered(settlement, buildingId) {
  return resolveSettlementPower(settlement).poweredBuildingIds.has(buildingId);
}
