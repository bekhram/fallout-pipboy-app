import test from "node:test";
import assert from "node:assert/strict";
import { INVENTORY_DATABASE } from "../src/data/inventoryDatabase.js";

test("Robot Repair Kit is available in the tools archive", () => {
  const item = INVENTORY_DATABASE.find((entry) => entry.name === "Robot Repair Kit");
  assert.ok(item);
  assert.equal(item.category, "tools");
  assert.match(item.effect, /4 HP/i);
});
