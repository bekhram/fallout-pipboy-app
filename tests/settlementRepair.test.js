import test from "node:test";
import assert from "node:assert/strict";
import { advanceBuildingRepairs, assignRepairWorker, damagedSettlementBuildings, repairCostForBuilding, startBuildingRepair } from "../src/utils/settlementRepair.js";

function fixture() {
  return {
    resources: { materials: 50 },
    stockpile: { materials: { common: 50, uncommon: 0, rare: 0 } },
    buildings: [
      { id: "turret", type: "machine_gun_turret", state: "active", condition: 50 },
      { id: "wall", type: "wall_straight", state: "destroyed", condition: 0 },
    ],
    settlers: [
      { id: "a", name: "A", status: "working", settlementAction: { type: "scavenging" }, assignedBuildingId: "yard" },
      { id: "b", name: "B", status: "idle", settlementAction: null, assignedBuildingId: null },
    ],
  };
}

test("repair cost scales with missing condition", () => {
  const settlement = fixture();
  assert.equal(repairCostForBuilding(settlement.buildings[0]), 4);
  assert.equal(repairCostForBuilding(settlement.buildings[1]), 3);
  assert.equal(damagedSettlementBuildings(settlement).length, 2);
});

test("starting repair spends common materials and preserves damage", () => {
  const settlement = fixture();
  const next = startBuildingRepair(settlement, "turret", 100);
  assert.equal(next.stockpile.materials.common, 46);
  assert.equal(next.buildings[0].condition, 50);
  assert.equal(next.buildings[0].repair.paidCommon, 4);
});

test("repair worker is removed from normal work and can repair only one building", () => {
  let settlement = fixture();
  settlement = startBuildingRepair(settlement, "turret", 100);
  settlement = startBuildingRepair(settlement, "wall", 100);
  settlement = assignRepairWorker(settlement, "turret", "a", true);
  settlement = assignRepairWorker(settlement, "wall", "a", true);
  assert.deepEqual(settlement.buildings.find((b) => b.id === "turret").repair.workerIds, []);
  assert.deepEqual(settlement.buildings.find((b) => b.id === "wall").repair.workerIds, ["a"]);
  const worker = settlement.settlers.find((w) => w.id === "a");
  assert.equal(worker.status, "repairing");
  assert.equal(worker.settlementAction, null);
  assert.equal(worker.assignedBuildingId, null);
});

test("each repair worker restores 25 condition per settlement day", () => {
  let settlement = fixture();
  settlement = startBuildingRepair(settlement, "turret", 100);
  settlement = assignRepairWorker(settlement, "turret", "a", true);
  settlement = assignRepairWorker(settlement, "turret", "b", true);
  const next = advanceBuildingRepairs(settlement, 200);
  const building = next.buildings.find((b) => b.id === "turret");
  assert.equal(building.condition, 100);
  assert.equal(building.state, "active");
  assert.equal(building.repair, null);
  assert.equal(next.settlers.find((w) => w.id === "a").status, "idle");
});

test("destroyed building returns to active after full repair", () => {
  let settlement = fixture();
  settlement = startBuildingRepair(settlement, "wall", 100);
  settlement = assignRepairWorker(settlement, "wall", "a", true);
  settlement = advanceBuildingRepairs(settlement, 200);
  settlement = advanceBuildingRepairs(settlement, 300);
  settlement = advanceBuildingRepairs(settlement, 400);
  settlement = advanceBuildingRepairs(settlement, 500);
  const wall = settlement.buildings.find((b) => b.id === "wall");
  assert.equal(wall.condition, 100);
  assert.equal(wall.state, "active");
});
