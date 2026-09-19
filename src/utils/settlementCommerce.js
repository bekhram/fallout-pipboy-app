import { getRulebookBuilding } from "../data/settlement/rulebookCatalog.js";
import { resolveSettlementPower } from "./settlementPower.js";
import { accrueSettlementProfit, splitSettlementProfit } from "./settlementProfit.js";

function randomId(prefix, seed = Date.now()) {
  return `${prefix}_${seed}_${Math.random().toString(36).slice(2, 8)}`;
}

function isActive(building) {
  return building?.state === "active" && Number(building.condition ?? 100) > 0 && !building.autoDisabled;
}

function rollCombatDice(count) {
  let effects = 0;
  const rolls = [];
  for (let index = 0; index < count; index += 1) {
    const die = 1 + Math.floor(Math.random() * 6);
    rolls.push(die);
    if (die >= 5) effects += 1;
  }
  return { rolls, effects };
}

function countOffices(settlement) {
  let total = 0;
  for (const building of settlement.buildings || []) {
    if (!isActive(building)) continue;
    for (const room of building.rooms || []) {
      if (room.state !== "active") continue;
      if (room.type === "office" || room.effects?.office) total += 1;
    }
  }
  return total;
}

function getActiveStores(settlement) {
  const powerGrid = resolveSettlementPower(settlement);
  return (settlement.buildings || []).filter((building) => {
    if (!isActive(building)) return false;
    const effects = getRulebookBuilding(building.type)?.effects || {};
    if (!effects.store) return false;
    const need = Math.max(0, Number(effects.requiresPower || 0));
    return !need || powerGrid.poweredBuildingIds.has(building.id);
  });
}

function resolveBusinessIncome(settlement, day) {
  const workers = (settlement.settlers || []).filter((settler) => settler.settlementAction?.type === "business").length;
  const stores = getActiveStores(settlement).slice(0, workers);
  const people = (settlement.settlers || []).length;
  const populationMultiplier = Math.floor(people / 5);
  const officeCount = countOffices(settlement);

  let incomePerFive = 0;
  const storeBreakdown = stores.map((building, index) => {
    const rule = getRulebookBuilding(building.type);
    const baseIncome = Math.max(0, Number(rule?.effects?.income || 0));
    const officeBonus = index < officeCount ? 1 : 0;
    const effectiveIncome = baseIncome + officeBonus;
    incomePerFive += effectiveIncome;
    return { buildingId: building.id, type: building.type, baseIncome, officeBonus, effectiveIncome };
  });

  const income = populationMultiplier * incomePerFive;
  if (settlement.offlineStandalone) {
    const attributes = { ...(settlement.attributes || {}), income };
    const resources = { ...(settlement.resources || {}), income, caps: Math.max(0, Number(settlement.resources?.caps || 0)) + income };
    const event = {
      id: randomId("event", day), type: "store_income", day, workers,
      stores: storeBreakdown, people, populationMultiplier, income,
      reserveCaps: income, claimableCaps: 0, createdAt: Date.now(),
    };
    return { ...settlement, attributes, resources, events: [event, ...(settlement.events || [])].slice(0, 100) };
  }
  const split = splitSettlementProfit(income);
  const attributes = { ...(settlement.attributes || {}), income };
  const resources = { ...(settlement.resources || {}), income, caps: Math.max(0, Number(settlement.resources?.caps || 0)) + split.reserve };
  const event = {
    id: randomId("event", day), type: "store_income", day, workers,
    stores: storeBreakdown, people, populationMultiplier, income,
    reserveCaps: split.reserve, claimableCaps: split.claimable, createdAt: Date.now(),
  };
  return accrueSettlementProfit({
    ...settlement, attributes, resources, events: [event, ...(settlement.events || [])].slice(0, 100),
  }, { caps: split.claimable });
}

function getRecruitmentState(settlement) {
  return {
    tally: Math.max(0, Number(settlement.recruitment?.tally || 0)),
    pendingArrivalDay: settlement.recruitment?.pendingArrivalDay ?? null,
    lastRoll: settlement.recruitment?.lastRoll || null,
    status: settlement.recruitment?.status || "idle",
  };
}

function createSettler(settlement, day) {
  const index = (settlement.settlers || []).length + 1;
  return {
    id: randomId("settler", `${day}_${index}`),
    name: `Settler ${index}`,
    role: "unassigned",
    assignedBuildingId: null,
    settlementAction: null,
    health: 100,
    status: "idle",
    joinedOnSettlementDay: day,
  };
}

function resolveRecruitment(settlement, day) {
  let next = { ...settlement };
  let recruitment = getRecruitmentState(next);
  let settlers = [...(next.settlers || [])];
  const maxPeople = 10 + Math.max(0, Math.floor(Number(next.leader?.charisma || 0)));

  if (recruitment.pendingArrivalDay != null && day >= Number(recruitment.pendingArrivalDay) && settlers.length < maxPeople) {
    const newcomer = createSettler(next, day);
    settlers.push(newcomer);
    recruitment = { tally: 0, pendingArrivalDay: null, lastRoll: recruitment.lastRoll, status: "arrived" };
    next = {
      ...next,
      settlers,
      attributes: { ...(next.attributes || {}), people: settlers.length },
      resources: { ...(next.resources || {}), population: settlers.length },
      events: [{ id: randomId("event", `${day}_arrival`), type: "settler_arrived", settlerId: newcomer.id, settlerName: newcomer.name, createdAt: Date.now() }, ...(next.events || [])].slice(0, 100),
    };
  }

  const powerGrid = resolveSettlementPower(next);
  const beacons = (next.buildings || []).filter((building) => {
    if (!isActive(building) || building.type !== "radio_beacon") return false;
    return powerGrid.poweredBuildingIds.has(building.id);
  });

  if (!beacons.length) return { ...next, recruitment: { ...recruitment, status: "inactive" } };

  if (settlers.length >= maxPeople) {
    return {
      ...next,
      buildings: (next.buildings || []).map((building) => building.type === "radio_beacon" ? { ...building, autoDisabled: true } : building),
      recruitment: { ...recruitment, status: "population-cap" },
    };
  }

  next = {
    ...next,
    buildings: (next.buildings || []).map((building) => building.type === "radio_beacon" && building.autoDisabled ? { ...building, autoDisabled: false } : building),
  };

  if (recruitment.pendingArrivalDay != null) return { ...next, recruitment: { ...recruitment, status: "arrival-pending" } };

  const tally = recruitment.tally + 1;
  const overPeople = Math.max(0, tally - settlers.length);
  if (!overPeople) return { ...next, recruitment: { ...recruitment, tally, status: "broadcasting" } };

  const roll = rollCombatDice(overPeople);
  const pendingArrivalDay = roll.effects > 0 ? day + 1 : null;
  const event = {
    id: randomId("event", `${day}_beacon`), type: "radio_beacon_roll", tally,
    people: settlers.length, dice: overPeople, rolls: roll.rolls, effects: roll.effects,
    recruited: Boolean(pendingArrivalDay), createdAt: Date.now(),
  };

  return {
    ...next,
    recruitment: {
      tally,
      pendingArrivalDay,
      lastRoll: { day, rolls: roll.rolls, effects: roll.effects },
      status: pendingArrivalDay ? "arrival-pending" : "broadcasting",
    },
    events: [event, ...(next.events || [])].slice(0, 100),
  };
}

export function processSettlementCommerce(settlement) {
  const completedDay = Math.max(0, Math.floor(Number(settlement.settlementDay || 1)) - 1);
  let next = { ...settlement };
  let lastProcessedDay = Math.max(0, Math.floor(Number(next.commerceLastProcessedDay || 0)));

  while (lastProcessedDay < completedDay) {
    lastProcessedDay += 1;
    next = resolveBusinessIncome(next, lastProcessedDay);
    next = resolveRecruitment(next, lastProcessedDay);
  }

  return { ...next, commerceLastProcessedDay: completedDay };
}
