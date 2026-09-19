import { calculateSettlementStats } from "./settlementEconomy.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";

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

export function setSettlementDefensePlan(settlement, attackId, defenderIds = [], now = Date.now()) {
  const eligible = eligibleDefenderIds(settlement);
  const selected = [...new Set(Array.isArray(defenderIds) ? defenderIds : [])]
    .filter((id) => eligible.has(id))
    .slice(0, 50);
  let changed = false;
  const attacks = (settlement.attacks || []).map((attack) => {
    if (attack.id !== attackId || !["warning", "active"].includes(attack.state)) return attack;
    changed = true;
    return { ...attack, defenderIds: selected, defensePlannedAt: now };
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
  const stats = calculateSettlementStats(settlement);
  const militiaBonus = militiaDefenseBonus(settlement, attack);
  const defenseScore = Number(stats.defense || 0) + militiaBonus + Math.floor(Math.random() * 11);
  const enemyScore = Number(attack.strength || 0) + Math.floor(Math.random() * 11);
  const victory = defenseScore >= enemyScore;
  const resources = { ...(settlement.resources || {}) };
  let buildings = settlement.buildings || [];
  let settlers = settlement.settlers || [];
  let buildingDamage = [];

  if (victory) {
    const damaged = damageBuildings(buildings, 1, 5, 15);
    buildings = damaged.buildings;
    buildingDamage = damaged.damaged;
  } else {
    const damaged = damageBuildings(buildings, 2 + Math.floor(Math.random() * 3), 10, 35);
    buildings = damaged.buildings;
    buildingDamage = damaged.damaged;
    if (settlers.length) {
      const defenderSet = new Set(attack.defenderIds || []);
      const exposed = settlers.map((settler, index) => ({ settler, index })).filter(({ settler }) => defenderSet.has(settler.id));
      const pool = exposed.length ? exposed : settlers.map((settler, index) => ({ settler, index }));
      const injuredIndex = pool[Math.floor(Math.random() * pool.length)]?.index;
      settlers = settlers.map((settler, index) => index === injuredIndex ? { ...settler, health: Math.max(1, Number(settler.health ?? 100) - 20), status: "injured" } : settler);
    }
  }

  const result = victory ? "victory" : "defeat";
  const turret = turretDefenseContribution(settlement);
  const defendersCommitted = (attack.defenderIds || []).filter((id) => eligibleDefenderIds(settlement).has(id)).length;
  const injuredDefenders = settlers.filter((settler) => Number(settler.health ?? 100) < Number((settlement.settlers || []).find((item) => item.id === settler.id)?.health ?? 100)).map((settler) => ({ id: settler.id, name: settler.name, health: settler.health }));
  const attackerCount = Math.max(2, Math.min(8, Math.ceil(Math.max(1, Number(attack.strength || 1)) / 3)));
  const attackersDefeated = victory ? attackerCount : Math.max(0, Math.min(attackerCount - 1, Math.floor(attackerCount * defenseScore / Math.max(1, defenseScore + enemyScore))));
  const rounds = Math.max(1, Math.min(8, 1 + Math.ceil(Number(attack.strength || 1) / Math.max(1, Number(stats.defense || 0) + militiaBonus + 2))));
  const battleReport = {
    rounds,
    attackerCount,
    attackersDefeated,
    defendersCommitted,
    defendersInjured: injuredDefenders,
    turretCount: turret.count,
    turretDefense: turret.defense,
    baseDefense: Number(stats.defense || 0),
    militiaBonus,
    defenseScore,
    enemyScore,
    wallDeterrence: Number(attack.wallDeterrence || 0),
    buildingDamage,
    buildingsDamaged: buildingDamage.length,
    buildingsDestroyed: buildingDamage.filter((item) => item.destroyed).length,
  };
  return {
    ...settlement,
    resources,
    buildings,
    settlers,
    attacks: (settlement.attacks || []).map((item) => item.id === attackId ? { ...item, state: "resolved", result, resolvedAt: now, defenseScore, enemyScore, militiaBonus, battleReport } : item),
    events: [{ id: randomId("event"), type: "attack_result", attackId, result, battleReport, createdAt: now }, ...(settlement.events || [])].slice(0, 100),
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
