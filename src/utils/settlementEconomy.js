import { SETTLEMENT_BUILDINGS } from "../data/settlement/buildings.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function ensureSettlers(input) {
  const wanted = Math.max(0, Math.floor(Number(input.attributes?.people ?? input.resources?.population ?? 0)));
  const settlers = Array.isArray(input.settlers) ? [...input.settlers] : [];
  if (settlers.length >= wanted) return input;
  const stamp = Number(input.createdAt || 0);
  for (let index = settlers.length; index < wanted; index += 1) {
    settlers.push({
      id: `settler_${stamp}_${index + 1}`,
      name: `Settler ${index + 1}`,
      role: "unassigned",
      assignedBuildingId: null,
      settlementAction: null,
      health: 100,
      status: "idle",
    });
  }
  return { ...input, settlers };
}

export function completeFinishedConstruction(settlement, now = Date.now()) {
  let changed = false;
  const buildings = (settlement.buildings || []).map((building) => {
    if (building.state !== "construction" || !Number(building.completesAt) || Number(building.completesAt) > now) return building;
    changed = true;
    return { ...building, state: "active", completedAt: now };
  });
  return changed ? { ...settlement, buildings } : settlement;
}

export function calculateSettlementStats(settlement) {
  const stored = settlement.attributes || {};
  const people = Array.isArray(settlement.settlers) && settlement.settlers.length
    ? settlement.settlers.length
    : Math.max(0, Math.floor(Number(stored.people ?? settlement.resources?.population ?? 0)));
  const leaderCharisma = Math.max(0, Math.floor(Number(settlement.leader?.charisma || 0)));
  const peopleMax = 10 + leaderCharisma;
  const buildingStatus = {};
  const powerGrid = resolveSettlementPower(settlement);

  let waterBonus = 0;
  let defense = 0;
  let bedsBonus = 0;
  let incomeBonus = 0;
  let cropSlots = 0;
  let storageBonus = 0;
  let happinessBonus = 0;

  for (const building of settlement.buildings || []) {
    const def = SETTLEMENT_BUILDINGS[building.type];
    if (!def) continue;
    const active = building.state === "active" && Number(building.condition ?? 100) > 0;
    const assignedWorkers = (settlement.settlers || []).filter((settler) => settler.assignedBuildingId === building.id).length;
    const actionWorkers = (settlement.settlers || []).filter((settler) => settler.settlementAction?.targetBuildingId === building.id).length;
    const requiredWorkers = Number(def.workersRequired || 0);
    const staffed = requiredWorkers === 0 || assignedWorkers >= requiredWorkers;
    const effects = getRulebookBuilding(building.type)?.effects || {};
    const requiresPower = Math.max(0, Number(effects.requiresPower || 0));
    const powered = !requiresPower || powerGrid.poweredBuildingIds.has(building.id);
    buildingStatus[building.id] = { active, staffed, assignedWorkers, actionWorkers, requiredWorkers, powered, requiresPower };
    if (!active || !powered) continue;

    waterBonus += Number(effects.water || 0);
    defense += Number(effects.defense || 0);
    bedsBonus += Number(effects.beds || 0);
    incomeBonus += Number(effects.income || 0);
    cropSlots += Number(effects.cropSlots || 0);
    storageBonus += Number(effects.storageLbs || 0);
    happinessBonus += Number(effects.happiness || 0);
  }

  for (const building of settlement.buildings || []) {
    if (building.state !== "active") continue;
    for (const room of building.rooms || []) {
      if (room.state !== "active") continue;
      const roomEffects = room.effects || {};
      bedsBonus += Number(roomEffects.beds || 0);
      storageBonus += Number(roomEffects.storageLbs || 0);
    }
  }

  const attributes = {
    people,
    food: Math.max(0, Math.floor(Number(stored.food ?? settlement.resources?.food ?? people))),
    water: Math.max(0, Math.floor(Number(stored.water ?? settlement.resources?.water ?? people) + waterBonus)),
    power: Math.max(0, Math.floor(powerGrid.produced)),
    defense: Math.max(0, Math.floor(defense)),
    beds: Math.max(0, Math.floor(bedsBonus)),
    happiness: clamp(Number(stored.happiness ?? settlement.resources?.happiness ?? 10), 1, 20),
    income: Math.max(0, Math.floor(Number(stored.income ?? settlement.resources?.income ?? 0) + incomeBonus)),
  };

  return {
    attributes,
    people,
    population: people,
    peopleMax,
    populationLimit: peopleMax,
    defense: attributes.defense,
    cropSlots,
    storageCapacityLbs: Number(settlement.stockpile?.capacityLbs || 300) + storageBonus,
    buildingStatus,
    happinessBonus,
    powerGrid: {
      produced: powerGrid.produced,
      required: powerGrid.required,
      consumed: powerGrid.consumed,
      available: powerGrid.available,
      deficit: powerGrid.deficit,
      unpowered: powerGrid.unpoweredBuildingIds.size,
    },
    production: { food: 0, water: waterBonus, power: powerGrid.produced, materials: 0, caps: 0 },
    consumption: { food: 0, water: 0, power: powerGrid.consumed },
    balance: { food: 0, water: 0, power: powerGrid.available, materials: 0, caps: 0 },
  };
}

export function simulateSettlement(input, now = Date.now()) {
  let settlement = ensureSettlers(input);
  settlement = completeFinishedConstruction(settlement, now);
  const stats = calculateSettlementStats(settlement);
  const attributes = { ...stats.attributes };
  const resources = {
    ...(settlement.resources || {}),
    population: attributes.people,
    food: attributes.food,
    water: attributes.water,
    power: attributes.power,
    defense: attributes.defense,
    beds: attributes.beds,
    happiness: attributes.happiness,
    income: attributes.income,
  };
  return { ...settlement, attributes, resources, lastSimulationAt: now };
}

export function formatBuildTime(ms) {
  const remaining = Math.max(0, Number(ms) || 0);
  const days = Math.floor(remaining / DAY_MS);
  const hours = Math.floor((remaining % DAY_MS) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}
