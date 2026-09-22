import test from "node:test";
import assert from "node:assert/strict";
import toolRows from "../src/data/inventory/tools.js";

function toolByName(name) {
  const row = toolRows.find(([itemName]) => itemName === name);
  if (!row) return null;
  const [itemName, effect, weight, cost, rarity] = row;
  return { name: itemName, category: "tools", effect, weight, cost, rarity };
}

test("Robot Repair Kit is available in the tools archive", () => {
  const item = toolByName("Robot Repair Kit");
  assert.ok(item);
  assert.equal(item.category, "tools");
  assert.match(item.effect, /4 HP/i);
});

test("Power Armor Repair Kit is available in the tools archive", () => {
  const item = toolByName("Power Armor Repair Kit");
  assert.ok(item);
  assert.equal(item.category, "tools");
  assert.match(item.effect, /power armor/i);
  assert.match(item.effect, /4 HP/i);
});
