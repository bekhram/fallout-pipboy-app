import { ROOMS, SETTLEMENT_RULEBOOK } from "../data/settlement/rulebook.js";
import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";

export const SETTLEMENT_DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function randomId(prefix, now = Date.now()) {
  return `${prefix}_${now}_${Math.random().toString(36).slice(2, 8)}`;
}

function rollCombatDice(count) {
  let total = 0;
  let effects = 0;
  const rolls = [];
  for (let index = 0; index < count; index += 1) {
    const die = 1 + Math.floor(Math.random() * 6);
    rolls.push(die);
    if (die === 1) total += 1;
    else if (die === 2) total += 2;
    else if (die >= 5) {
      total += 1;
      effects += 1;
    }
  }
  return { total, effects, rolls };
}

export function normalizeStockpile(stockpile = {}, legacyMaterials = 0) {
  const legacyCommon = Number(stockpile.common ?? legacyMaterials ?? 0) || 0;
  const legacyUncommon = Number(stockpile.uncommon || 0) || 0;
  const legacyRare = Number(stockpile.rare || 0) || 0;
  return {
    capacityLbs: Number(stockpile.capacityLbs || SETTLEMENT_RULEBOOK.stockpile.baseCapacityLbs),
    materials: {
      common: Number(stockpile.materials?.common ?? legacyCommon) || 0,
      uncommon: Number(stockpile.materials?.uncommon ?? legacyUncommon) || 0,
      rare: Number(stockpile.materials?.rare ?? legacyRare) || 0,
    },
    items: Array.isArray(stockpile.items) ? stockpile.items : [],
    foragingItems: Number(stockpile.foragingItems || 0),
  };
}

function canAffordMaterials(settlement, rule) {
  if (!rule) return false;
  const stockpile = normalizeStockpile(settlement.stockpile, settlement.resources?.materials);
  const caps = Number(settlement.resources?.caps || 0);
  return ["common", "uncommon", "rare"].every((key) => (
    Number(stockpile.materials[key] || 0) >= Number(rule.materials?.[key] || 0)
  )) && caps >= Number(rule.caps || 0);
}

function payCost(settlement, rule) {
  if (!rule || !canAffordMaterials(settlement, rule)) return settlement;
  const stockpile = normalizeStockpile(settlement.stockpile, settlement.resources?.materials);
  const materials = { ...stockpile.materials };
  for (const key of ["common", "uncommon", "rare"]) {
    materials[key] = Math.max(0, Number(materials[key] || 0) - Number(rule.materials?.[key] || 0));
  }
  return {
    ...settlement,
    stockpile: { ...stockpile, materials },
    resources: {
      ...(settlement.resources || {}),
      caps: Math.max(0, Number(settlement.resources?.caps || 0) - Number(rule.caps || 0)),
      materials: materials.common,
    },
  };
}

export function canAffordRulebookBuilding(settlement, buildingType) {
  return canAffordMaterials(settlement, getRulebookBuilding(buildingType));
}

export function payRulebookBuildingCost(settlement, buildingType) {
  return payCost(settlement, getRulebookBuilding(buildingType));
}

export function getRoomRule(roomType) {
  return ROOMS?.[roomType] || null;
}

export function canAffordRoom(settlement, roomType) {
  return canAffordMaterials(settlement, getRoomRule(roomType));
}

export function payRoomCost(settlement, roomType) {
  return payCost(settlement, getRoomRule(roomType));
}

export function createRoomConstruction(roomType, now = Date.now()) {
  const rule = getRoomRule(roomType);
  if (!rule) return null;
  return {
    id: randomId("room", now),
    type: roomType,
    state: "construction",
    constructionDaysRequired: Math.max(1, Number(rule.constructionDays || 1)),
    constructionProgressDays: 0,
    createdAt: now,
  };
}

export function getRoomConstructionProgress(room) {
  const rule = getRoomRule(room?.type);
  const required = Math.max(1, Number(room?.constructionDaysRequired || rule?.constructionDays || 1));
  const progress = Math.max(0, Number(room?.constructionProgressDays || 0));
  return { progress, required, remaining: Math.max(0, required - progress) };
}

export function getStructureRoomCapacity(building) {
  return Math.max(0, Number(getRulebookBuilding(building?.type)?.effects?.roomCapacity || 0));
}

function isActive(building) {
  return building?.state === "active" && Number(building.condition ?? 100) > 0;
}

function isActiveRoom(room) {
  return room?.state === "active";
}

function calculateStaticAttributes(settlement, dailyDefenseBonus = 0) {
  const people = Array.isArray(settlement.settlers)
    ? settlement.settlers.length
    : Math.max(0, Math.floor(Number(settlement.attributes?.people ?? settlement.resources?.population ?? 0)));
  const base = {
    people,
    food: Math.max(0, Number(settlement.attributes?.food ?? settlement.resources?.food ?? people)),
    water: Math.max(0, Number(settlement.attributes?.water ?? settlement.resources?.water ?? people)),
    power: 0,
    defense: Math.max(0, Number(dailyDefenseBonus || 0)),
    beds: 0,
    happiness: clamp(settlement.attributes?.happiness ?? settlement.resources?.happiness ?? 10, 1, 20),
    income: Math.max(0, Number(settlement.attributes?.income ?? settlement.resources?.income ?? 0)),
  };

  let storageBonus = 0;
  let noisyCount = 0;
  let cropSlots = 0;
  let guardStructures = 0;
  let powerRequired = 0;
  let officeCount = 0;

  for (const building of settlement.buildings || []) {
    if (!isActive(building)) continue;
    const rule = getRulebookBuilding(building.type);
    if (rule) {
      const effects = rule.effects || {};
      base.power += Number(effects.power || 0);
      base.water += Number(effects.water || 0);
      base.defense += Number(effects.defense || 0);
      base.beds += Number(effects.beds || 0);
      storageBonus += Number(effects.storageLbs || 0);
      cropSlots += Number(effects.cropSlots || 0);
      if (effects.guardActionDefenseBonus) guardStructures += 1;
      if (effects.noisy) noisyCount += 1;
      powerRequired += Number(effects.requiresPower || 0);
    }

    for (const room of building.rooms || []) {
      if (!isActiveRoom(room)) continue;
      const effects = getRoomRule(room.type)?.effects || {};
      base.beds += Number(effects.beds || 0);
      storageBonus += Number(effects.storageLbs || 0);
      if (effects.office) officeCount += 1;
    }
  }

  return {
    ...base,
    noisyCount,
    cropSlots,
    guardStructures,
    storageBonus,
    stockpileCapacityLbs: SETTLEMENT_RULEBOOK.stockpile.baseCapacityLbs + storageBonus,
    powerRequired,
    officeCount,
  };
}

function resolveConstruction(settlement, now) {
  const buildingWorkers = new Map();
  const roomWorkers = new Map();

  for (const settler of settlement.settlers || []) {
    const action = settler.settlementAction;
    if (action?.type !== "build") continue;
    if (action.targetRoomId) roomWorkers.set(action.targetRoomId, (roomWorkers.get(action.targetRoomId) || 0) + 1);
    else if (action.targetBuildingId) buildingWorkers.set(action.targetBuildingId, (buildingWorkers.get(action.targetBuildingId) || 0) + 1);
  }

  const completedTargets = new Set();
  let happinessDelta = 0;

  const buildings = (settlement.buildings || []).map((building) => {
    let nextBuilding = building;
    if (building.state === "construction") {
      const workers = buildingWorkers.get(building.id) || 0;
      if (workers > 0) {
        const rule = getRulebookBuilding(building.type);
        const required = Math.max(1, Number(building.constructionDaysRequired || rule?.constructionDays || 1));
        const progress = Number(building.constructionProgressDays || 0) + workers;
        if (progress >= required) {
          completedTargets.add(`building:${building.id}`);
          nextBuilding = { ...building, state: "active", constructionDaysRequired: required, constructionProgressDays: required, completedAt: now };
        } else {
          nextBuilding = { ...building, constructionDaysRequired: required, constructionProgressDays: progress };
        }
      }
    }

    if (!(nextBuilding.rooms || []).length) return nextBuilding;
    const rooms = (nextBuilding.rooms || []).map((room) => {
      if (room.state !== "construction") return room;
      const workers = roomWorkers.get(room.id) || 0;
      if (!workers) return room;
      const rule = getRoomRule(room.type);
      const required = Math.max(1, Number(room.constructionDaysRequired || rule?.constructionDays || 1));
      const progress = Number(room.constructionProgressDays || 0) + workers;
      if (progress < required) return { ...room, constructionDaysRequired: required, constructionProgressDays: progress };
      completedTargets.add(`room:${room.id}`);
      happinessDelta += Number(rule?.effects?.happiness || 0);
      return { ...room, state: "active", constructionDaysRequired: required, constructionProgressDays: required, completedAt: now, happinessApplied: true };
    });
    return { ...nextBuilding, rooms };
  });

  const settlers = (settlement.settlers || []).map((settler) => {
    const action = settler.settlementAction;
    const targetKey = action?.targetRoomId ? `room:${action.targetRoomId}` : action?.targetBuildingId ? `building:${action.targetBuildingId}` : null;
    return targetKey && completedTargets.has(targetKey)
      ? { ...settler, settlementAction: null, status: "idle", assignedBuildingId: null }
      : settler;
  });

  const attributes = { ...(settlement.attributes || {}) };
  if (happinessDelta) attributes.happiness = clamp(Number(attributes.happiness || 10) + happinessDelta, 1, 20);
  return { ...settlement, buildings, settlers, attributes };
}

function resolveResidentActions(input, now) {
  let settlement = resolveConstruction(input, now);
  const settlers = settlement.settlers || [];
  const actionCounts = settlers.reduce((acc, settler) => {
    const type = settler.settlementAction?.type;
    if (type) acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const attributes = { ...(settlement.attributes || {}) };
  let stockpile = normalizeStockpile(settlement.stockpile, settlement.resources?.materials);
  let dailyDefenseBonus = 0;
  const events = [];

  const hunters = Number(actionCounts.hunting_gathering || 0);
  if (hunters > 0) {
    const roll = rollCombatDice(3 + Math.max(0, hunters - 1));
    attributes.food = Math.max(0, Number(attributes.food || 0) + roll.total);
    stockpile = { ...stockpile, foragingItems: Number(stockpile.foragingItems || 0) + roll.effects };
    events.push({ type: "hunting_gathering", workers: hunters, total: roll.total, effects: roll.effects });
  }

  const scavengers = Number(actionCounts.scavenging || 0);
  if (scavengers > 0) {
    const roll = rollCombatDice(3 + Math.max(0, scavengers - 1));
    stockpile = {
      ...stockpile,
      materials: {
        ...stockpile.materials,
        common: Number(stockpile.materials.common || 0) + roll.total,
        uncommon: Number(stockpile.materials.uncommon || 0) + roll.effects,
      },
    };
    events.push({ type: "scavenging", workers: scavengers, common: roll.total, uncommon: roll.effects });
  }

  const guards = Number(actionCounts.guard || 0);
  if (guards > 0) {
    const staticStats = calculateStaticAttributes({ ...settlement, attributes }, 0);
    dailyDefenseBonus = guards + Math.min(staticStats.guardStructures, guards * 3);
    events.push({ type: "guard", workers: guards, defense: dailyDefenseBonus });
  }

  const cropWorkers = Number(actionCounts.tend_crops || 0);
  if (cropWorkers > 0) {
    const staticStats = calculateStaticAttributes({ ...settlement, attributes }, dailyDefenseBonus);
    const tended = Math.min(staticStats.cropSlots, cropWorkers * 6);
    const food = Math.floor(tended / 2);
    attributes.food = Math.max(0, Number(attributes.food || 0) + food);
    events.push({ type: "tend_crops", workers: cropWorkers, crops: tended, food });
  }

  const businessWorkers = Number(actionCounts.business || 0);
  if (businessWorkers > 0) {
    const stores = (settlement.buildings || []).filter((building) => isActive(building) && getRulebookBuilding(building.type)?.effects?.store);
    const multiplier = Math.floor((settlement.settlers || []).length / 5);
    const staffedStores = stores.slice(0, businessWorkers);
    const income = multiplier * staffedStores.reduce((sum, building) => sum + Number(getRulebookBuilding(building.type)?.effects?.income || 0), 0);
    attributes.income = Math.max(0, Number(attributes.income || 0) + income);
    events.push({ type: "business", workers: businessWorkers, stores: staffedStores.length, income });
  }

  const caravanWorkers = Number(actionCounts.trade_caravan || 0);
  if (caravanWorkers > 0) events.push({ type: "trade_caravan", workers: caravanWorkers });

  return { settlement: { ...settlement, attributes, stockpile }, dailyDefenseBonus, actionEvents: events };
}

function applyNeedsAndDeparture(input, dailyDefenseBonus, now) {
  const stats = calculateStaticAttributes(input, dailyDefenseBonus);
  let happiness = clamp(stats.happiness, 1, 20);
  const failedNeeds = [];
  for (const key of ["beds", "food", "water", "defense"]) {
    if (Number(stats[key] || 0) < Number(stats.people || 0)) {
      happiness = Math.max(1, happiness - 1);
      failedNeeds.push(key);
    }
  }

  let settlers = [...(input.settlers || [])];
  let departed = null;
  if (settlers.length && happiness < settlers.length) {
    departed = settlers[settlers.length - 1];
    settlers = settlers.slice(0, -1);
  }

  const attributes = { ...(input.attributes || {}), people: settlers.length, happiness };
  const events = [];
  if (failedNeeds.length) events.push({ id: randomId("event", now), type: "needs_failed", failedNeeds, createdAt: now });
  if (departed) events.push({ id: randomId("event", now + 1), type: "settler_left", settlerId: departed.id, settlerName: departed.name, createdAt: now });
  return { ...input, settlers, attributes, events: [...events, ...(input.events || [])].slice(0, 100) };
}

function scheduleAttackAtEndOfDay(input, now) {
  const unresolved = (input.attacks || []).some((attack) => attack.state === "warning" || attack.state === "active");
  if (unresolved || now < Number(input.attackRiskBlockedUntil || 0)) return input;
  const stats = calculateStaticAttributes(input, 0);
  const foodSurplus = Number(stats.food || 0) > Number(stats.people || 0);
  const waterSurplus = Number(stats.water || 0) > Number(stats.people || 0);
  if (!foodSurplus && !waterSurplus) return input;

  const diceCount = foodSurplus && waterSurplus ? 2 : 1;
  const rolls = Array.from({ length: diceCount }, () => 1 + Math.floor(Math.random() * 20));
  if (rolls.length && stats.noisyCount > 0) rolls[0] += stats.noisyCount;
  const attacked = rolls.some((roll) => roll > Number(stats.defense || 0));
  if (!attacked) {
    return { ...input, events: [{ id: randomId("event", now), type: "attack_check", rolls, defense: stats.defense, result: "safe", createdAt: now }, ...(input.events || [])].slice(0, 100) };
  }

  const delayRoll = rollCombatDice(3);
  const delayDays = Math.max(1, delayRoll.total);
  const startsAt = now + delayDays * SETTLEMENT_DAY_MS;
  const people = Number(stats.people || 0);
  const strength = Math.max(6, people + Math.floor(Math.random() * Math.max(4, people + 4)));
  const factionPool = ["raiders", "feral_ghouls", "super_mutants"];
  const faction = factionPool[Math.floor(Math.random() * factionPool.length)];
  const attack = {
    id: randomId("attack", now), faction, strength, state: "warning", createdAt: now, startsAt,
    resolveAt: startsAt + SETTLEMENT_DAY_MS,
    rulebookRiskRolls: rolls,
    rulebookDelayRoll: delayRoll.rolls,
    rulebookDelayDays: delayDays,
  };
  return {
    ...input,
    attackRiskBlockedUntil: startsAt + 5 * SETTLEMENT_DAY_MS,
    attacks: [attack, ...(input.attacks || [])].slice(0, 50),
    events: [{ id: randomId("event", now + 1), type: "attack_warning", attackId: attack.id, faction, startsAt, createdAt: now }, ...(input.events || [])].slice(0, 100),
  };
}

export function advanceSettlementDay(input, now = Date.now()) {
  const actionResult = resolveResidentActions(input, now);
  let settlement = applyNeedsAndDeparture(actionResult.settlement, actionResult.dailyDefenseBonus, now);
  settlement = scheduleAttackAtEndOfDay(settlement, now);
  const derived = calculateStaticAttributes(settlement, 0);
  const stockpile = {
    ...normalizeStockpile(settlement.stockpile, settlement.resources?.materials),
    capacityLbs: derived.stockpileCapacityLbs,
  };
  return {
    ...settlement,
    settlementDay: Math.max(1, Number(settlement.settlementDay || 1) + 1),
    lastDayAt: now,
    nextDayAt: now + SETTLEMENT_DAY_MS,
    stockpile,
    attributes: {
      ...(settlement.attributes || {}),
      people: derived.people,
      power: derived.power,
      defense: derived.defense,
      beds: derived.beds,
      happiness: clamp(settlement.attributes?.happiness ?? derived.happiness, 1, 20),
    },
    resources: {
      ...(settlement.resources || {}),
      population: derived.people,
      food: derived.food,
      water: derived.water,
      power: derived.power,
      defense: derived.defense,
      beds: derived.beds,
      happiness: clamp(settlement.attributes?.happiness ?? derived.happiness, 1, 20),
      income: Number(settlement.attributes?.income || 0),
      materials: Number(stockpile.materials.common || 0),
    },
    events: actionResult.actionEvents.map((event, index) => ({ id: randomId("event", now + 10 + index), createdAt: now, ...event })).concat(settlement.events || []).slice(0, 100),
  };
}

export function processAutomaticSettlementDays(input, now = Date.now()) {
  let settlement = { ...input };
  if (!Number(settlement.nextDayAt || 0)) {
    const anchor = Number(settlement.lastDayAt || now);
    settlement.lastDayAt = anchor;
    settlement.nextDayAt = anchor + SETTLEMENT_DAY_MS;
  }
  let safety = 0;
  while (now >= Number(settlement.nextDayAt || Infinity) && safety < 90) {
    safety += 1;
    settlement = advanceSettlementDay(settlement, Number(settlement.nextDayAt));
  }
  return settlement;
}

export function createConstructionBuilding({ id, type, x, y, now = Date.now() }) {
  const rule = getRulebookBuilding(type);
  return {
    id,
    type,
    x,
    y,
    rotation: 0,
    state: "construction",
    condition: 100,
    rooms: [],
    startedAt: now,
    constructionDaysRequired: Math.max(1, Number(rule?.constructionDays || 1)),
    constructionProgressDays: 0,
  };
}

export function getConstructionProgress(building) {
  const rule = getRulebookBuilding(building?.type);
  const required = Math.max(1, Number(building?.constructionDaysRequired || rule?.constructionDays || 1));
  const progress = Math.max(0, Number(building?.constructionProgressDays || 0));
  return { progress, required, remaining: Math.max(0, required - progress) };
}

export function getSettlementRulebookSnapshot(settlement) {
  return calculateStaticAttributes(settlement, 0);
}
