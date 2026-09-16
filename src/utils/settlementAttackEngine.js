import { calculateSettlementStats } from "./settlementEconomy.js";

const ATTACK_CHECK_MS = 6 * 60 * 60 * 1000;
const WARNING_MS = 4 * 60 * 60 * 1000;
const RESOLUTION_GRACE_MS = 6 * 60 * 60 * 1000;
const FACTIONS = ["raiders", "raiders", "feral_ghouls", "super_mutants"];

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateAttackRisk(settlement) {
  const stats = calculateSettlementStats(settlement);
  const population = Number(stats.population || 0);
  const food = Number(settlement.resources?.food || 0);
  const water = Number(settlement.resources?.water || 0);
  const caps = Number(settlement.resources?.caps || 0);
  const wealthPressure = population * 0.7 + food * 0.08 + water * 0.05 + caps * 0.015;
  const defenseRelief = Number(stats.defense || 0) * 0.65;
  return Math.round(clamp(5 + wealthPressure - defenseRelief, 2, 60));
}

function damageBuildings(buildings, count, minDamage, maxDamage) {
  const next = (buildings || []).map((building) => ({ ...building }));
  const candidates = next.filter((building) => building.state === "active" && Number(building.condition ?? 100) > 0);
  for (let index = 0; index < Math.min(count, candidates.length); index += 1) {
    const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    if (!pick) break;
    const damage = minDamage + Math.floor(Math.random() * Math.max(1, maxDamage - minDamage + 1));
    pick.condition = Math.max(0, Number(pick.condition ?? 100) - damage);
    if (pick.condition <= 0) pick.state = "destroyed";
  }
  return next;
}

export function resolveSettlementAttack(settlement, attackId, now = Date.now()) {
  const attack = (settlement.attacks || []).find((item) => item.id === attackId);
  if (!attack || attack.state === "resolved") return settlement;
  const stats = calculateSettlementStats(settlement);
  const defenseScore = Number(stats.defense || 0) + Math.floor(Math.random() * 11);
  const enemyScore = Number(attack.strength || 0) + Math.floor(Math.random() * 11);
  const victory = defenseScore >= enemyScore;
  const resources = { ...(settlement.resources || {}) };
  let buildings = settlement.buildings || [];
  let settlers = settlement.settlers || [];

  if (victory) {
    buildings = damageBuildings(buildings, 1, 5, 15);
    resources.happiness = clamp(Number(resources.happiness ?? 50) - 2, 0, 100);
  } else {
    buildings = damageBuildings(buildings, 2 + Math.floor(Math.random() * 3), 10, 35);
    resources.food = Math.max(0, Number(resources.food || 0) * 0.85);
    resources.water = Math.max(0, Number(resources.water || 0) * 0.9);
    resources.caps = Math.max(0, Number(resources.caps || 0) * 0.8);
    resources.happiness = clamp(Number(resources.happiness ?? 50) - 10, 0, 100);
    if (settlers.length) {
      const injuredIndex = Math.floor(Math.random() * settlers.length);
      settlers = settlers.map((settler, index) => index === injuredIndex ? { ...settler, health: Math.max(1, Number(settler.health ?? 100) - 20), status: "injured" } : settler);
    }
  }

  const result = victory ? "victory" : "defeat";
  return {
    ...settlement,
    resources,
    buildings,
    settlers,
    attacks: (settlement.attacks || []).map((item) => item.id === attackId ? { ...item, state: "resolved", result, resolvedAt: now, defenseScore, enemyScore } : item),
    events: [{ id: randomId("event"), type: "attack_result", attackId, result, createdAt: now }, ...(settlement.events || [])].slice(0, 100),
  };
}

export function processSettlementAttacks(input, now = Date.now()) {
  let settlement = { ...input };
  const unresolved = (settlement.attacks || []).find((attack) => attack.state === "warning" || attack.state === "active");

  if (unresolved) {
    if (unresolved.state === "warning" && now >= Number(unresolved.startsAt || Infinity)) {
      settlement = {
        ...settlement,
        attacks: (settlement.attacks || []).map((attack) => attack.id === unresolved.id ? { ...attack, state: "active", activatedAt: now } : attack),
      };
    }
    const current = (settlement.attacks || []).find((attack) => attack.id === unresolved.id);
    if (current?.state === "active" && now >= Number(current.resolveAt || Infinity)) {
      settlement = resolveSettlementAttack(settlement, current.id, now);
    }
    return settlement;
  }

  const nextCheckAt = Number(settlement.nextAttackCheckAt || 0);
  if (nextCheckAt && now < nextCheckAt) return settlement;

  const risk = calculateAttackRisk(settlement);
  const shouldAttack = Math.random() * 100 < risk;
  const nextBase = { ...settlement, nextAttackCheckAt: now + ATTACK_CHECK_MS, attackRisk: risk };
  if (!shouldAttack) return nextBase;

  const stats = calculateSettlementStats(settlement);
  const faction = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
  const strength = Math.max(8, Math.round(Number(stats.population || 0) * 2 + Math.random() * 10 + 4));
  const startsAt = now + WARNING_MS;
  const attack = {
    id: randomId("attack"),
    faction,
    strength,
    threatLevel: strength >= 30 ? 3 : strength >= 18 ? 2 : 1,
    state: "warning",
    createdAt: now,
    startsAt,
    resolveAt: startsAt + RESOLUTION_GRACE_MS,
  };

  return {
    ...nextBase,
    attacks: [attack, ...(settlement.attacks || [])].slice(0, 50),
    events: [{ id: randomId("event"), type: "attack_warning", attackId: attack.id, faction, createdAt: now }, ...(settlement.events || [])].slice(0, 100),
  };
}
