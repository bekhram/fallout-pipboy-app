import { creditPersonalResources } from "./personalResources.js";

const amount = value => Math.max(0, Math.floor(Number(value) || 0));
export const PROFIT_SHARE = 0.5;

export function settlementProfit(settlement) {
  const source = settlement?.profit || {};
  return {
    claimable: {
      caps: amount(source.claimable?.caps),
      food: amount(source.claimable?.food),
      water: amount(source.claimable?.water),
    },
    lifetime: {
      caps: amount(source.lifetime?.caps),
      food: amount(source.lifetime?.food),
      water: amount(source.lifetime?.water),
    },
    claimed: {
      caps: amount(source.claimed?.caps),
      food: amount(source.claimed?.food),
      water: amount(source.claimed?.water),
    },
  };
}

export function splitSettlementProfit(value) {
  const total = amount(value);
  const claimable = Math.floor(total * PROFIT_SHARE);
  return { total, reserve: total - claimable, claimable };
}

export function accrueSettlementProfit(settlement, income = {}) {
  const profit = settlementProfit(settlement);
  const claimable = { ...profit.claimable };
  const lifetime = { ...profit.lifetime };
  for (const key of ["caps", "food", "water"]) {
    const value = amount(income[key]);
    claimable[key] += value;
    lifetime[key] += value;
  }
  return { ...settlement, profit: { ...profit, claimable, lifetime } };
}

function addSupplyStack(items, kind, quantity) {
  if (!quantity) return items;
  const definition = kind === "food"
    ? { name: "Settlement Food Supply", category: "food" }
    : { name: "Settlement Water Supply", category: "beverage" };
  const marker = `settlement_profit_${kind}`;
  const next = structuredClone(items || []);
  const existing = next.find(item => item?.sourceType === marker);
  if (existing) {
    existing.quantity = String(amount(existing.quantity ?? existing.qty) + quantity);
    if (Object.hasOwn(existing, "qty")) existing.qty = amount(existing.qty) + quantity;
  } else {
    next.push({
      sourceType: marker,
      canonicalName: definition.name,
      name: definition.name,
      category: definition.category,
      quantity: String(quantity),
      cost: "0",
      weight: "1",
    });
  }
  return next;
}

export function claimSettlementProfit(settlement, character, actor, now = Date.now()) {
  if (!character || !Array.isArray(character.inventoryItems)) throw new Error("CHARACTER_NOT_APPROVED");
  const profit = settlementProfit(settlement);
  const reward = { ...profit.claimable };
  if (!reward.caps && !reward.food && !reward.water) throw new Error("NO_SETTLEMENT_PROFIT");

  let nextCharacter = creditPersonalResources(character, { caps: reward.caps, common: 0, uncommon: 0, rare: 0 });
  nextCharacter = {
    ...nextCharacter,
    inventoryItems: addSupplyStack(addSupplyStack(nextCharacter.inventoryItems, "food", reward.food), "water", reward.water),
  };

  const claimed = {
    caps: profit.claimed.caps + reward.caps,
    food: profit.claimed.food + reward.food,
    water: profit.claimed.water + reward.water,
  };
  const nextSettlement = {
    ...settlement,
    profit: { ...profit, claimable: { caps: 0, food: 0, water: 0 }, claimed },
    events: [{
      id: `profit_claimed_${now}_${Math.random().toString(36).slice(2, 8)}`,
      type: "profit_claimed",
      memberId: actor?.id || null,
      memberName: character.name || "Player",
      reward,
      createdAt: now,
    }, ...(settlement.events || [])].slice(0, 100),
  };
  return { settlement: nextSettlement, character: nextCharacter, reward };
}
