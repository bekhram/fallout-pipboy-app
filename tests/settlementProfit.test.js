import test from "node:test";
import assert from "node:assert/strict";
import { collectDailySurplus } from "../src/utils/settlementProvisions.js";
import { processSettlementCommerce } from "../src/utils/settlementCommerce.js";
import { claimSettlementProfit, settlementProfit, splitSettlementProfit } from "../src/utils/settlementProfit.js";

test("settlement profit uses a 50/50 split with odd units favoring the reserve", () => {
  assert.deepEqual(splitSettlementProfit(10), { total: 10, reserve: 5, claimable: 5 });
  assert.deepEqual(splitSettlementProfit(3), { total: 3, reserve: 2, claimable: 1 });
});

test("daily food and water surplus is split between reserve and player profit", () => {
  const settlement = {
    stockpile: { provisions: { food: 0, water: 0 } },
    nextDaySupplies: {},
  };
  const next = collectDailySurplus(settlement, { food: 10, water: 10, needsPeople: 4 });
  assert.deepEqual(next.stockpile.provisions, { food: 3, water: 2 });
  assert.deepEqual(next.lastDaySurplus.claimable, { food: 3, water: 1 });
  assert.deepEqual(settlementProfit(next).claimable, { caps: 0, food: 3, water: 1 });
});

test("store income adds half to treasury and half to claimable caps", () => {
  const settlers = [
    { id: "a", settlementAction: { type: "business" } },
    { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" },
  ];
  const settlement = {
    settlementDay: 2,
    commerceLastProcessedDay: 0,
    resources: { caps: 100 },
    attributes: {},
    settlers,
    buildings: [{ id: "shop", type: "trading_emporium", state: "active", condition: 100, rooms: [] }],
    events: [],
  };
  const next = processSettlementCommerce(settlement);
  assert.equal(next.attributes.income, 3);
  assert.equal(next.resources.caps, 102);
  assert.equal(settlementProfit(next).claimable.caps, 1);
});

test("claiming profit credits caps and supply stacks to the approved character", () => {
  const settlement = {
    profit: { claimable: { caps: 20, food: 4, water: 6 } },
    events: [],
  };
  const character = { name: "Vault Dweller", caps: "10", inventoryItems: [] };
  const result = claimSettlementProfit(settlement, character, { id: "player-1" }, 1234);
  assert.equal(result.character.caps, "30");
  assert.equal(result.character.inventoryItems.find(i => i.sourceType === "settlement_profit_food").quantity, "4");
  assert.equal(result.character.inventoryItems.find(i => i.sourceType === "settlement_profit_water").quantity, "6");
  assert.deepEqual(settlementProfit(result.settlement).claimable, { caps: 0, food: 0, water: 0 });
  assert.deepEqual(settlementProfit(result.settlement).claimed, { caps: 20, food: 4, water: 6 });
  assert.equal(result.settlement.events[0].type, "profit_claimed");
});
