import { calculateSettlementStats } from "./settlementEconomy.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";
import { simulateSettlementTowerDefense } from "./settlementTowerDefense.js";

function randomId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateAttackRisk(settlement) {
  const active = (settlement.attacks || []).find((attack) => attack.state === "warning" || attack.state === "active");
  if (active) return 100;
  const people = Number(settlement.attributes?.people ?? settlement.resources?.population ?? 0);
  const food = Number(settlement.attributes?.food ?? settlement.resources?.food ?? 0);
  const water = Number(settlement.attributes?.water ?? settlement.resources?.water ?? 0);
  if (food <= people && water <= people) return 0;
  return food > people && water > people ? 2 : 1;
}

function eligibleDefenderIds(settlement) {
  return new Set((settlement.settlers || [])
    .filter((settler) => Number(settler.health ?? 100) > 1)
    .map((settler) => settler.id));
}

function normalizeHeroParticipants(heroes = []) {
  const seen = new Set();
  return (Array.isArray(heroes) ? heroes : []).map((hero) => {
    const clientId = String(hero?.clientId || "").trim().slice(0, 120);
    if (!clientId || seen.has(clientId)) return null;
    seen.add(clientId);
    return {
      clientId,
      name: String(hero?.name || "Hero").trim().slice(0, 80) || "Hero",
      level: Math.max(1, Math.min(50, Number(hero?.level || 1))),
      defense: Math.max(0, Math.min(10, Number(hero?.defense || 0))),
      currentHp: Math.max(0, Math.min(999, Number(hero?.currentHp || 0))),
      maxHp: Math.max(0, Math.min(999, Number(hero?.maxHp || 0))),
    };
  }).filter(Boolean).slice(0, 12);
}

export function setSettlementDefensePlan(settlement, attackId, defenderIds = [], heroes = [], now = Date.now()) {
  if (typeof heroes === "number") { now = heroes; heroes = []; }
  const eligible = eligibleDefenderIds(settlement);
  const selected = [...new Set(Array.isArray(defenderIds) ? defenderIds : [])]
    .filter((id) => eligible.has(id))
    .slice(0, 50);
  const heroParticipants = normalizeHeroParticipants(heroes);
  let changed = false;
  const attacks = (settlement.attacks || []).map((attack) => {
    if (attack.id !== attackId || !["warning", "active"].includes(attack.state)) return attack;
    changed = true;
    return { ...attack, defenderIds: selected, heroParticipants, defensePlannedAt: now };
  });
  return changed ? { ...settlement, attacks } : settlement;
}

export function linkSettlementAttackBattle(settlement, attackId, tacticalSceneId, now = Date.now()) {
  const sceneId = String(tacticalSceneId || "").trim().slice(0, 120);
  if (!sceneId) return settlement;
  let changed = false;
  const attacks = (settlement.attacks || []).map((attack) => {
    if (attack.id !== attackId || !["warning", "active"].includes(attack.state)) return attack;
    changed = true;
    return { ...attack, tacticalSceneId: sceneId, tacticalLinkedAt: now };
  });
  return changed ? { ...settlement, attacks } : settlement;
}

function militiaDefenseBonus(settlement, attack) {
  const eligible = eligibleDefenderIds(settlement);
  return (attack?.defenderIds || []).filter((id) => eligible.has(id)).length;
}

function heroDefenseContribution(attack) {
  const heroes = normalizeHeroParticipants(attack?.heroParticipants || []).filter((hero) => hero.currentHp > 0 || hero.maxHp <= 0);
  const details = heroes.map((hero) => {
    const contribution = Math.max(2, Math.min(6, 2 + Math.floor(hero.level / 5) + Math.max(0, hero.defense - 1)));
    return { ...hero, contribution };
  });
  return { total: details.reduce((sum, hero) => sum + hero.contribution, 0), heroes: details };
}

function damageBuildings(buildings, count, minDamage, maxDamage) {
  const next = (buildings || []).map((building) => ({ ...building }));
  const candidates = next.filter((building) => building.state === "active" && Number(building.condition ?? 100) > 0 && building.type !== "settlement_hq");
  const damaged = [];
  for (let index = 0; index < Math.min(count, candidates.length); index += 1) {
    const pick = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
    if (!pick) break;
    const before = Number(pick.condition ?? 100);
    const damage = minDamage + Math.floor(Math.random() * Math.max(1, maxDamage - minDamage + 1));
    pick.condition = Math.max(0, before - damage);
    if (pick.condition <= 0) pick.state = "destroyed";
    damaged.push({ id: pick.id, type: pick.type, damage: before - pick.condition, condition: pick.condition, destroyed: pick.state === "destroyed" });
  }
  return { buildings: next, damaged };
}

function turretDefenseContribution(settlement) {
  const powerGrid = resolveSettlementPower(settlement);
  let total = 0, count = 0;
  for (const building of settlement.buildings || []) {
    if (building?.state !== "active" || Number(building.condition ?? 100) <= 0 || building.autoDisabled) continue;
    const effects = getRulebookBuilding(building.type)?.effects || {};
    if (!/turret/.test(String(building.type || ""))) continue;
    const required = Math.max(0, Number(effects.requiresPower || 0));
    if (required && !powerGrid.poweredBuildingIds.has(building.id)) continue;
    total += Math.max(0, Number(effects.defense || 0));
    count += 1;
  }
  return { count, defense: total };
}

export function resolveSettlementAttack(settlement, attackId, now = Date.now()) {
  const attack = (settlement.attacks || []).find((item) => item.id === attackId);
  if (!attack || attack.state === "resolved") return settlement;

  const simulation = simulateSettlementTowerDefense(settlement, attack);
  const victory = simulation.result === "victory";
  const happinessBefore = Number(settlement.attributes?.happiness ?? settlement.resources?.happiness ?? 10);
  const happiness = victory ? happinessBefore : Math.max(1, happinessBefore - 1);
  const report = {
    ...simulation.report,
    heroesCosmetic: (attack.heroParticipants || []).map((hero) => ({ clientId: hero.clientId, name: hero.name })),
    settlersCosmetic: (settlement.settlers || []).map((settler) => ({ id: settler.id, name: settler.name })).slice(0, 50),
  };

  return {
    ...simulation.settlement,
    attributes: { ...(simulation.settlement.attributes || {}), happiness },
    resources: { ...(simulation.settlement.resources || {}), happiness },
    attacks: (simulation.settlement.attacks || []).map((item) => item.id === attackId ? {
      ...item,
      state: "resolved",
      result: simulation.result,
      resolvedAt: now,
      battleReport: report,
    } : item),
    events: [{
      id: randomId("event"),
      type: "attack_result",
      attackId,
      result: simulation.result,
      battleReport: report,
      createdAt: now,
    }, ...(simulation.settlement.events || [])].slice(0, 100),
  };
}
export function processSettlementAttacks(input, now = Date.now()) {
  let settlement = { ...input };
  const warning = (settlement.attacks || []).find((attack) => attack.state === "warning");
  if (warning && now >= Number(warning.startsAt || Infinity)) {
    settlement = {
      ...settlement,
      attacks: (settlement.attacks || []).map((attack) => attack.id === warning.id ? { ...attack, state: "active", activatedAt: now } : attack),
    };
  }
  const active = (settlement.attacks || []).find((attack) => attack.state === "active");
  if (active && now >= Number(active.resolveAt || Infinity)) {
    settlement = resolveSettlementAttack(settlement, active.id, now);
  }
  return settlement;
}
