import {
  SETTLEMENT_BUILDINGS,
  SETTLEMENT_GRID_SIZE,
  STARTING_SETTLEMENT_RESOURCES,
} from "../data/settlement/buildings.js";
import { processSettlementAttacks } from "./settlementAttackEngine.js";
import { processSettlementCommerce } from "./settlementCommerce.js";
import { createSettlerProfile, randomSettlerName } from "./settlementSettlerProfile.js";
import {
  normalizeStockpile,
  processAutomaticSettlementDays,
  SETTLEMENT_DAY_MS,
} from "./settlementDayEngine.js";

function ensureSettlementHQ(settlement) {
  if (!settlement || (settlement.buildings || []).some((building) => building.type === "settlement_hq")) return settlement;
  const def = SETTLEMENT_BUILDINGS.settlement_hq;
  const width = Number(def?.footprint?.width || 4);
  const height = Number(def?.footprint?.height || 4);
  const x = Math.max(0, Math.floor((SETTLEMENT_GRID_SIZE - width) / 2));
  const y = Math.max(0, Math.floor((SETTLEMENT_GRID_SIZE - height) / 2));
  const createdAt = Number(settlement.createdAt || Date.now());
  return {
    ...settlement,
    buildings: [{
      id: `settlement_hq_${settlement.id || createdAt}`,
      type: "settlement_hq",
      x,
      y,
      rotation: 0,
      state: "active",
      condition: 100,
      startedAt: createdAt,
      completedAt: createdAt,
      locked: true,
    }, ...(settlement.buildings || [])],
  };
}

function createInitialSettlers(createdAt, count = 4) {
  const names=[];
  return Array.from({ length: count }, (_, index) => {
    const name=randomSettlerName(names);names.push(name);
    return {
      id: `settler_${createdAt}_${index + 1}`,
      name,
      role: "unassigned",
      assignedBuildingId: null,
      settlementAction: null,
      health: 100,
      status: "idle",
      ...createSettlerProfile(),
    };
  });
}

function clampHappiness(value) {
  return Math.max(1, Math.min(20, Math.round(Number(value) || 10)));
}

function ensureRulebookState(input) {
  const settlement = ensureSettlementHQ(input);
  const legacy = { ...(settlement.resources || {}) };
  const existingAttributes = settlement.attributes || {};
  const people = Array.isArray(settlement.settlers)
    ? settlement.settlers.length
    : Math.max(0, Math.floor(Number(existingAttributes.people ?? legacy.population ?? 4)));
  const migratedHappiness = existingAttributes.happiness ?? legacy.happiness;
  const now = Date.now();
  const lastDayAt = Number(settlement.lastDayAt || now);
  const stockpile = normalizeStockpile(settlement.stockpile, legacy.materials);
  const attributes = {
    people,
    food: Math.max(0, Math.floor(Number(existingAttributes.food ?? legacy.food ?? people))),
    water: Math.max(0, Math.floor(Number(existingAttributes.water ?? legacy.water ?? people))),
    power: Math.max(0, Math.floor(Number(existingAttributes.power ?? legacy.power ?? 0))),
    defense: Math.max(0, Math.floor(Number(existingAttributes.defense ?? legacy.defense ?? 0))),
    beds: Math.max(0, Math.floor(Number(existingAttributes.beds ?? legacy.beds ?? 0))),
    happiness: clampHappiness(Number(migratedHappiness) > 20 ? 10 : migratedHappiness),
    income: Math.max(0, Math.floor(Number(existingAttributes.income ?? legacy.income ?? 0))),
  };

  return {
    ...settlement,
    rulesVersion: 5,
    settlementDay: Math.max(1, Math.floor(Number(settlement.settlementDay || 1))),
    lastDayAt,
    nextDayAt: Number(settlement.nextDayAt || (lastDayAt + SETTLEMENT_DAY_MS)),
    basePopulationLimit: 10,
    leader: settlement.leader || { characterId: settlement.ownerCharacterId || null, charisma: 0 },
    attributes,
    resources: {
      ...legacy,
      population: people,
      food: attributes.food,
      water: attributes.water,
      power: attributes.power,
      defense: attributes.defense,
      beds: attributes.beds,
      happiness: attributes.happiness,
      income: attributes.income,
      materials: Number(stockpile.materials.common || 0),
    },
    livestock: {
      brahmin: Math.max(0, Math.floor(Number(settlement.livestock?.brahmin || 0))),
    },
    recruitment: {
      tally: Math.max(0, Number(settlement.recruitment?.tally || 0)),
      pendingArrivalDay: settlement.recruitment?.pendingArrivalDay ?? null,
      lastRoll: settlement.recruitment?.lastRoll || null,
      status: settlement.recruitment?.status || "idle",
    },
    commerceLastProcessedDay: Math.max(0, Number(settlement.commerceLastProcessedDay || 0)),
    stockpile,
    settlers: (settlement.settlers || createInitialSettlers(Number(settlement.createdAt || now), people)).map((settler) => ({
      settlementAction: null,
      ...settler,
    })),
  };
}

export function runSimulation(settlement, now = Date.now()) {
  const normalized = ensureRulebookState(settlement);
  const advanced = processAutomaticSettlementDays(normalized, now);
  const withCommerce = processSettlementCommerce(advanced);
  return processSettlementAttacks(withCommerce, now);
}

export function createSettlement({ name, regionId, worldX, worldY, ownerCharacterId = null, leaderCharisma = 0 }) {
  const now = Date.now();
  const people = Math.max(1, Number(STARTING_SETTLEMENT_RESOURCES.population || 4));
  return ensureRulebookState({
    id: `settlement_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "New Settlement").trim() || "New Settlement",
    regionId,
    worldX,
    worldY,
    ownerCharacterId,
    ownership: { type: "party" },
    map: { width: 24, height: 24 },
    basePopulationLimit: 10,
    leader: { characterId: ownerCharacterId, charisma: Math.max(0, Number(leaderCharisma || 0)) },
    attributes: { people, food: people, water: people, power: 0, defense: 0, beds: 0, happiness: 10, income: 0 },
    resources: { ...STARTING_SETTLEMENT_RESOURCES, population: people, food: people, water: people, power: 0, defense: 0, beds: 0, happiness: 10, income: 0 },
    livestock: { brahmin: 0 },
    recruitment: { tally: 0, pendingArrivalDay: null, lastRoll: null, status: "idle" },
    commerceLastProcessedDay: 0,
    stockpile: {
      capacityLbs: 300,
      materials: { common: Number(STARTING_SETTLEMENT_RESOURCES.materials || 0), uncommon: 0, rare: 0 },
      items: [],
      foragingItems: 0,
    },
    buildings: [],
    settlers: createInitialSettlers(now, people),
    events: [],
    attacks: [],
    attackRiskBlockedUntil: 0,
    createdAt: now,
    settlementDay: 1,
    lastDayAt: now,
    nextDayAt: now + SETTLEMENT_DAY_MS,
  });
}

