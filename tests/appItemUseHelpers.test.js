import test from "node:test";
import assert from "node:assert/strict";
import {
  consumeInventoryItemAt,
  getRepairKitTargetKind,
  getStimpakInfo,
  isRobotCompanion,
  normalizeUtilityName,
  stripPowerArmorCurrentOverrides,
} from "../src/utils/appItemUseHelpers.js";

test("utility names normalize consistently", () => {
  assert.equal(normalizeUtilityName("  Super   Stimpak "), "super stimpak");
  assert.equal(normalizeUtilityName(null), "");
});

test("inventory consumption decrements and removes exhausted items", () => {
  const source = [
    { name: "A", quantity: "2" },
    { name: "B", quantity: "1" },
  ];
  assert.deepEqual(consumeInventoryItemAt(source, 0), [
    { name: "A", quantity: "1" },
    { name: "B", quantity: "1" },
  ]);
  assert.deepEqual(consumeInventoryItemAt(source, 1), [
    { name: "A", quantity: "2" },
  ]);
});

test("stimpak metadata uses canonical healing values", () => {
  assert.deepEqual(getStimpakInfo({ name: "Stimpak", quantity: "2" }, 4), {
    index: 4,
    name: "Stimpak",
    canonicalName: "stimpak",
    healingHp: 4,
    quantity: 2,
  });
  assert.equal(getStimpakInfo({ name: "Unknown", quantity: "2" }, 0), null);
  assert.equal(getStimpakInfo({ name: "Stimpak", quantity: "0" }, 0), null);
});

test("power armor overrides are stripped without mutating base slot data", () => {
  const loadout = {
    frame: "test",
    slots: {
      head: {
        id: "helmet",
        currentHp: 1,
        currentPhysical: 2,
        currentEnergy: 3,
        currentRadiation: 4,
        currentPoison: 5,
      },
    },
  };
  const clean = stripPowerArmorCurrentOverrides(loadout);
  assert.equal(clean.frame, "test");
  assert.deepEqual(clean.slots.head, { id: "helmet" });
  assert.equal(loadout.slots.head.currentHp, 1);
});

test("robot companion detection covers common robot families", () => {
  assert.equal(isRobotCompanion({ creatureType: "Robobrain" }), true);
  assert.equal(isRobotCompanion({ name: "Mister Handy" }), true);
  assert.equal(isRobotCompanion({ creatureType: "Human" }), false);
});

test("repair kits have isolated target types", () => {
  assert.equal(getRepairKitTargetKind("Robot Repair Kit"), "robot");
  assert.equal(getRepairKitTargetKind("Power Armor Repair Kit"), "powerArmor");
  assert.equal(getRepairKitTargetKind("Stimpak"), null);
});
