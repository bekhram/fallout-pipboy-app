import { SETTLEMENT_BUILDINGS } from "../data/settlement/buildings.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function add(target, key, value) {
  target[key] = (Number(target[key]) || 0) + (Number(value) || 0);
}

function ensureSettlers(input) {
  const wanted = Math.max(0, Math.floor(Number(input.resources?.population || 0)));
  const settlers = Array.isArray(input.settlers) ? [...input.settlers] : [];
  if (settlers.length >= wanted) return input;
  const stamp = Number(input.createdAt || 0);
  for (let index = settlers.length; index < wanted; index += 1) {
    settlers.push({
      id: `settler_${stamp}_${index + 1}`,
      name: `Settler ${index + 1}`,
      role: "unassigned",
      assignedBuildingId: null,
      health: 100,
      status: "idle",
    });
  }
  return { ...input, settlers };
}

export function completeFinishedConstruction(settlement, now = Date.now()) {
  let changed = false;
  const buildings = (settlement.buildings || []).map((building) => {
    if (building.state !== "construction" || Number(building.completesAt) > now) return building;
    changed = true;
    return { ...building, state: "active", completedAt: now };
  });
  return changed ? { ...settlement, buildings } : settlement;
}

export function calculateSettlementStats(settlement) {
  const production = { food: 0, water: 0, power: 0, materials: 0, caps: 0 };
  const population = Array.isArray(settlement.settlers) && settlement.settlers.length
    ? settlement.settlers.length
    : Number(settlement.resources?.population || 0);
  const consumption = { food: population, water: population, power: 0 };
  let populationLimit = Number(settlement.basePopulationLimit || 8);
  let defense = 0;
  let happinessBonus = 0;
  const buildingStatus = {};

  for (const building of settlement.buildings || []) {
    const def = SETTLEMENT_BUILDINGS[building.type];
    if (!def) continue;
    const active = building.state === "active" && Number(building.condition ?? 100) > 0;
    const assignedWorkers = (settlement.settlers || []).filter((settler) => settler.assignedBuildingId === building.id).length;
    const requiredWorkers = Number(def.workersRequired || 0);
    const staffed = requiredWorkers === 0 || assignedWorkers >= requiredWorkers;
    buildingStatus[building.id] = { active, staffed, assignedWorkers, requiredWorkers };
    if (!active) continue;

    const conditionMultiplier = Math.max(0, Math.min(1, Number(building.condition ?? 100) / 100));
    populationLimit += Number(def.effects?.populationLimit || 0);
    if (!staffed) continue;
    for (const [key, value] of Object.entries(def.productionPerDay || {})) add(production, key, value * conditionMultiplier);
    for (const [key, value] of Object.entries(def.consumptionPerDay || {})) add(consumption, key, value);
    defense += Number(def.effects?.defense || 0) * conditionMultiplier;
    happinessBonus += Number(def.effects?.happiness || 0);
  }

  const foodBalance = production.food - consumption.food;
  const waterBalance = production.water - consumption.water;
  const targetHappiness = Math.max(0, Math.min(100,
    50 + happinessBonus +
    (foodBalance >= 0 ? 5 : -15) +
    (waterBalance >= 0 ? 5 : -20) +
    (population <= populationLimit ? 3 : -10)
  ));

  return {
    production,
    consumption,
    balance: {
      food: foodBalance,
      water: waterBalance,
      power: production.power - consumption.power,
      materials: production.materials,
      caps: production.caps,
    },
    population,
    populationLimit,
    defense: Math.round(defense),
    targetHappiness,
    buildingStatus,
  };
}

export function simulateSettlement(input, now = Date.now()) {
  let settlement = ensureSettlers(input);
  settlement = completeFinishedConstruction(settlement, now);
  const last = Number(settlement.lastSimulationAt || now);
  const elapsedMs = Math.max(0, now - last);
  if (!elapsedMs) return settlement;

  const stats = calculateSettlementStats(settlement);
  const days = elapsedMs / DAY_MS;
  const resources = { ...(settlement.resources || {}) };

  for (const key of ["food", "water", "materials", "caps"]) {
    const delta = Number(stats.balance[key] || 0) * days;
    resources[key] = Math.max(0, Number(resources[key] || 0) + delta);
  }
  resources.population = stats.population;
  resources.power = Number(stats.production.power || 0);
  resources.populationLimit = stats.populationLimit;
  resources.defense = stats.defense;

  const currentHappiness = Number(resources.happiness ?? 50);
  const maxShift = Math.max(0.25, 8 * days);
  const happinessDelta = Math.max(-maxShift, Math.min(maxShift, stats.targetHappiness - currentHappiness));
  resources.happiness = Math.max(0, Math.min(100, currentHappiness + happinessDelta));

  return { ...settlement, resources, lastSimulationAt: now };
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
