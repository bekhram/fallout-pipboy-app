import { accrueSettlementProfit, splitSettlementProfit } from "./settlementProfit.js";
// Surplus is recorded as generic food/water units until individual items are selected.
const amount = n => Math.max(0, Math.floor(Number(n) || 0));
export function provisions(stockpile) {
  return { food: amount(stockpile?.provisions?.food), water: amount(stockpile?.provisions?.water) };
}
export function reserveProvisions(settlement, resource) {
  if (!['food','water'].includes(resource)) throw new Error('INVALID_RESOURCE');
  const stored = provisions(settlement.stockpile);
  if (stored[resource] < 2) throw new Error('insufficient');
  return { ...settlement,
    stockpile: { ...settlement.stockpile, provisions: { ...stored, [resource]: stored[resource] - 2 } },
    nextDaySupplies: { ...settlement.nextDaySupplies, [resource]: amount(settlement.nextDaySupplies?.[resource]) + 1 },
  };
}
export function collectDailySurplus(settlement, stats) {
  const stored = provisions(settlement.stockpile);
  // Supplied stock is not new production and cannot generate further surplus.
  const food = Math.max(0, amount(stats.food) - amount(settlement.nextDaySupplies?.food) - stats.needsPeople);
  const water = Math.floor(Math.max(0, amount(stats.water) - amount(settlement.nextDaySupplies?.water) - stats.needsPeople) / 2);
  if (settlement.offlineStandalone) {
    return { ...settlement, nextDaySupplies: {},
      stockpile: { ...settlement.stockpile, provisions: { food: stored.food + food, water: stored.water + water } },
      lastDaySurplus: {
        food, water,
        reserve: { food, water },
        claimable: { food: 0, water: 0 },
      },
    };
  }
  const foodSplit = splitSettlementProfit(food);
  const waterSplit = splitSettlementProfit(water);
  let next = { ...settlement, nextDaySupplies: {},
    stockpile: { ...settlement.stockpile, provisions: { food: stored.food + foodSplit.reserve, water: stored.water + waterSplit.reserve } },
    lastDaySurplus: {
      food, water,
      reserve: { food: foodSplit.reserve, water: waterSplit.reserve },
      claimable: { food: foodSplit.claimable, water: waterSplit.claimable },
    },
  };
  next = accrueSettlementProfit(next, { food: foodSplit.claimable, water: waterSplit.claimable });
  return next;
}
