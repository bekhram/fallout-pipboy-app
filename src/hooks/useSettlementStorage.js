import { useCallback, useEffect, useMemo, useState } from "react";
import { STARTING_SETTLEMENT_RESOURCES } from "../data/settlement/buildings.js";
import { simulateSettlement } from "../utils/settlementEconomy.js";
import { processSettlementAttacks } from "../utils/settlementAttackEngine.js";

const STORAGE_KEY = "pip2d20:settlements:v1";

function runSimulation(settlement) {
  return processSettlementAttacks(simulateSettlement(settlement));
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

function createInitialSettlers(createdAt, count = 4) {
  return Array.from({ length: count }, (_, index) => ({
    id: `settler_${createdAt}_${index + 1}`,
    name: `Settler ${index + 1}`,
    role: "unassigned",
    assignedBuildingId: null,
    health: 100,
    status: "idle",
  }));
}

export function createSettlement({ name, regionId, worldX, worldY, ownerCharacterId = null }) {
  const now = Date.now();
  const population = Number(STARTING_SETTLEMENT_RESOURCES.population || 4);
  return {
    id: `settlement_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || "New Settlement").trim() || "New Settlement",
    regionId,
    worldX,
    worldY,
    ownerCharacterId,
    ownership: { type: "party" },
    map: { width: 24, height: 24 },
    basePopulationLimit: 8,
    resources: { ...STARTING_SETTLEMENT_RESOURCES },
    buildings: [],
    settlers: createInitialSettlers(now, population),
    events: [],
    attacks: [],
    attackRisk: 0,
    nextAttackCheckAt: now + 6 * 60 * 60 * 1000,
    createdAt: now,
    lastSimulationAt: now,
  };
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
