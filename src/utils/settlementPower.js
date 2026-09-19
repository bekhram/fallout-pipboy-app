import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";

function isActive(building) {
  return building?.state === "active"
    && Number(building.condition ?? 100) > 0
    && !building.autoDisabled;
}

export function resolveSettlementPower(settlement) {
  const activeBuildings = (settlement.buildings || []).filter(isActive);
  const effectsFor = building => getRulebookBuilding(building.type)?.effects || {};
  const transmitters = activeBuildings.filter(building => effectsFor(building).transmitsPower);
  const hasDistribution = transmitters.length > 0;

  let produced = 0;
  let required = 0;
  for (const building of activeBuildings) {
    const effects = effectsFor(building);
    produced += Math.max(0, Number(effects.power || 0));
    required += Math.max(0, Number(effects.requiresPower || 0));
  }

  let remaining = produced;
  let consumed = 0;
  const poweredBuildingIds = new Set();
  const unpoweredBuildingIds = new Set();

  for (const building of activeBuildings) {
    const effects = effectsFor(building);
    const need = Math.max(0, Number(effects.requiresPower || 0));
    const needsConnection = Boolean(effects.needsPowerConnection || need > 0);

    if (!needsConnection) {
      poweredBuildingIds.add(building.id);
      continue;
    }

    // The tabletop rules require power to be distributed through pylons.
    // Sirens also count as pylons. Physical wire routing is abstracted here:
    // one active transmitter establishes the settlement power network.
    if (!hasDistribution) {
      unpoweredBuildingIds.add(building.id);
      continue;
    }

    if (need === 0) {
      // Lights require a live connection but draw negligible Power.
      if (produced > 0) poweredBuildingIds.add(building.id);
      else unpoweredBuildingIds.add(building.id);
      continue;
    }

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
    distributionOnline: hasDistribution,
    transmitterIds: new Set(transmitters.map(building => building.id)),
    poweredBuildingIds,
    unpoweredBuildingIds,
  };
}

export function isBuildingPowered(settlement, buildingId) {
  return resolveSettlementPower(settlement).poweredBuildingIds.has(buildingId);
}
