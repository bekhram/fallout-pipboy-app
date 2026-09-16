import { SETTLEMENT_BUILDINGS } from "../data/settlement/buildings.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function add(target, key, value) {
  target[key] = (Number(target[key]) || 0) + (Number(value) || 0);
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
  const consumption = {
    food: Number(settlement.resources?.population || 0),
    water: Number(settlement.resources?.population || 0),
    power: 0,
  };
  let populationLimit = Number(settlement.basePopulationLimit || 8);
  let defense = 0;
  let happinessBonus = 0;

  for (const building of settlement.buildings || []) {
    if (building.state !== "active" || Number(building.condition ?? 100) <= 0) continue;
    const def = SETTLEMENT_BUILDINGS[building.type];
    if (!def) continue;
    const conditionMultiplier = Math.max(0, Math.min(1, Number(building.condition ?? 100) / 100));
    for (const [key, value] of Object.entries(def.productionPerDay || {})) add(production, key, value * conditionMultiplier);
    for (const [key, value] of Object.entries(def.consumptionPerDay || {})) add(consumption, key, value);
    populationLimit += Number(def.effects?.populationLimit || 0);
    defense += Number(def.effects?.defense || 0) * conditionMultiplier;
    happinessBonus += Number(def.effects?.happiness || 0);
  }

  const population = Number(settlement.resources?.population || 0);
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
    populationLimit,
    defense: Math.round(defense),
    targetHappiness,
  };
}

export function simulateSettlement(input, now = Date.now()) {
  let settlement = completeFinishedConstruction(input, now);
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
  resources.power = Number(stats.production.power || 0);
  resources.populationLimit = stats.populationLimit;
  resources.defense = stats.defense;

  const currentHappiness = Number(resources.happiness ?? 50);
  const maxShift = Math.max(0.25, 8 * days);
  const happinessDelta = Math.max(-maxShift, Math.min(maxShift, stats.targetHappiness - currentHappiness));
  resources.happiness = Math.max(0, Math.min(100, currentHappiness + happinessDelta));

  return {
    ...settlement,
    resources,
    lastSimulationAt: now,
  };
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
