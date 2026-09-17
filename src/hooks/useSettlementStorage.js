import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SETTLEMENT_BUILDINGS,
  SETTLEMENT_GRID_SIZE,
  STARTING_SETTLEMENT_RESOURCES,
} from "../data/settlement/buildings.js";
import { processSettlementAttacks } from "../utils/settlementAttackEngine.js";
import {
  normalizeStockpile,
  processAutomaticSettlementDays,
  SETTLEMENT_DAY_MS,
} from "../utils/settlementDayEngine.js";

const STORAGE_KEY = "pip2d20:settlements:v1";

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
  return Array.from({ length: count }, (_, index) => ({
    id: `settler_${createdAt}_${index + 1}`,
    name: `Settler ${index + 1}`,
    role: "unassigned",
    assignedBuildingId: null,
    settlementAction: null,
    health: 100,
    status: "idle",
  }));
}

function clampHappiness(value) {
  return Math.max(1, Math.min(20, Math.round(Number(value) || 10)));
}

function ensureRulebookState(input) {
  const settlement = ensureSettlementHQ(input);
  const legacy = { ...(settlement.resources || {}) };
  const existingAttributes = settlement.attributes || {};
  const people = Array.isArray(settlement.settlers) && settlement.settlers.length
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
    rulesVersion: 4,
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
    stockpile,
    settlers: (settlement.settlers || createInitialSettlers(Number(settlement.createdAt || now), people)).map((settler) => ({
      settlementAction: null,
      ...settler,
    })),
  };
}

function runSimulation(settlement, now = Date.now()) {
  const normalized = ensureRulebookState(settlement);
  const advanced = processAutomaticSettlementDays(normalized, now);
  return processSettlementAttacks(advanced, now);
}

function readAll() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(settlements) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settlements));
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

export default function useSettlementStorage() {
  const [settlements, setSettlements] = useState(() => readAll().map((item) => runSimulation(item)));

  useEffect(() => {
    writeAll(settlements);
  }, [settlements]);

  const refreshSimulation = useCallback(() => {
    setSettlements((current) => current.map((item) => runSimulation(item)));
  }, []);

  useEffect(() => {
    const id = window.setInterval(refreshSimulation, 60_000);
    return () => window.clearInterval(id);
  }, [refreshSimulation]);

  const create = useCallback((input) => {
    const next = createSettlement(input);
    setSettlements((current) => [...current, next]);
    return next;
  }, []);

  const update = useCallback((id, updater) => {
    setSettlements((current) => current.map((item) => {
      if (item.id !== id) return item;
      const base = runSimulation(item);
      const next = typeof updater === "function" ? updater(base) : { ...base, ...updater };
      return runSimulation(next);
    }));
  }, []);

  const byPosition = useCallback((regionId, worldX, worldY) => settlements.find((item) => (
    item.regionId === regionId && Number(item.worldX) === Number(worldX) && Number(item.worldY) === Number(worldY)
  )) || null, [settlements]);

  return useMemo(() => ({ settlements, create, update, byPosition, refreshSimulation }), [settlements, create, update, byPosition, refreshSimulation]);
}
