import test from "node:test";
import assert from "node:assert/strict";
import { resolveSettlementAttack, setSettlementDefensePlan } from "../src/utils/settlementAttackEngine.js";

function fixture() {
  return {
    id: "settlement_test",
    attributes: { people: 3, food: 3, water: 3, happiness: 10 },
    resources: { population: 3, food: 3, water: 3, happiness: 10 },
    buildings: [],
    settlers: [
      { id: "a", name: "A", health: 100, status: "idle" },
      { id: "b", name: "B", health: 80, status: "idle" },
      { id: "down", name: "Down", health: 1, status: "injured" },
    ],
    attacks: [{ id: "raid_1", state: "warning", strength: 1, faction: "raiders" }],
    events: [],
  };
}

test("defense plan keeps only unique eligible settlers", () => {
  const settlement = fixture();
  const next = setSettlementDefensePlan(settlement, "raid_1", ["a", "a", "missing", "down", "b"], 1234);
  assert.deepEqual(next.attacks[0].defenderIds, ["a", "b"]);
  assert.equal(next.attacks[0].defensePlannedAt, 1234);
});

test("defense plan ignores missing or resolved attacks", () => {
  const settlement = fixture();
  const missing = setSettlementDefensePlan(settlement, "missing", ["a"], 10);
  assert.equal(missing, settlement);
  const resolved = { ...settlement, attacks: [{ ...settlement.attacks[0], state: "resolved" }] };
  const unchanged = setSettlementDefensePlan(resolved, "raid_1", ["a"], 10);
  assert.equal(unchanged, resolved);
});

test("selected militia contributes to auto defense", () => {
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    let settlement = fixture();
    settlement = setSettlementDefensePlan(settlement, "raid_1", ["a", "b"], 100);
    const resolved = resolveSettlementAttack(settlement, "raid_1", 200);
    const attack = resolved.attacks[0];
    assert.equal(attack.result, "victory");
    assert.equal(attack.militiaBonus, 2);
    assert.equal(attack.defenseScore, 2);
    assert.equal(attack.enemyScore, 1);
  } finally {
    Math.random = originalRandom;
  }
});
