import test from "node:test";
import assert from "node:assert/strict";
import { getSettlementRulebookSnapshot } from "../src/utils/settlementDayEngine.js";

function base(buildings) {
  return {
    attributes: { people: 1, food: 2, water: 2, happiness: 10 },
    resources: { population: 1, food: 2, water: 2, happiness: 10 },
    buildings,
    settlers: [{ id: "s1", name: "Settler", health: 100 }],
    stockpile: {},
  };
}

test("two active wall sections reduce raid roll by one", () => {
  const snapshot = getSettlementRulebookSnapshot(base([
    { id: "w1", type: "wall_straight", state: "active", condition: 100 },
    { id: "w2", type: "wall_corner", state: "active", condition: 100 },
  ]));
  assert.equal(snapshot.fortificationPoints, 2);
  assert.equal(snapshot.wallDeterrence, 1);
});

test("a gate counts as two fortification points", () => {
  const snapshot = getSettlementRulebookSnapshot(base([
    { id: "g1", type: "gate", state: "active", condition: 100 },
  ]));
  assert.equal(snapshot.fortificationPoints, 2);
  assert.equal(snapshot.wallDeterrence, 1);
});

test("broken and unfinished walls do not deter raids and bonus is capped", () => {
  const buildings = [
    { id: "broken", type: "wall_straight", state: "active", condition: 0 },
    { id: "building", type: "wall_corner", state: "construction", condition: 100 },
    ...Array.from({ length: 24 }, (_, index) => ({ id: `wall-${index}`, type: "wall_straight", state: "active", condition: 100 })),
  ];
  const snapshot = getSettlementRulebookSnapshot(base(buildings));
  assert.equal(snapshot.fortificationPoints, 24);
  assert.equal(snapshot.wallDeterrence, 8);
});
