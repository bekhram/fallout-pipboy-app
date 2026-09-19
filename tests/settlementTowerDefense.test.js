import test from "node:test";
import assert from "node:assert/strict";
import { simulateSettlementTowerDefense, stealSettlementResources } from "../src/utils/settlementTowerDefense.js";

function baseSettlement(extraBuildings = []) {
  return {
    id: "s1",
    attributes: { people: 4, happiness: 10 },
    resources: { caps: 1000, materials: 100, happiness: 10 },
    stockpile: {
      materials: { common: 100, uncommon: 40, rare: 20 },
      provisions: { food: 50, water: 30 },
      foragingItems: 10,
      items: [{ name: "Stimpak", quantity: 10 }],
    },
    buildings: [
      { id: "hq", type: "settlement_hq", x: 10, y: 10, state: "active", condition: 100 },
      ...extraBuildings,
    ],
    settlers: [],
    attacks: [],
  };
}

test("resource theft removes the same percentage of accumulated resources", () => {
  const { settlement, stolen } = stealSettlementResources(baseSettlement(), 25);
  assert.equal(stolen.percent, 25);
  assert.equal(stolen.caps, 250);
  assert.equal(stolen.common, 25);
  assert.equal(stolen.uncommon, 10);
  assert.equal(stolen.rare, 5);
  assert.equal(stolen.food, 12);
  assert.equal(stolen.water, 7);
  assert.equal(settlement.resources.caps, 750);
  assert.equal(settlement.stockpile.materials.common, 75);
});

test("undefended settlement is breached and loses 10 percent with deterministic roll", () => {
  const result = simulateSettlementTowerDefense(
    baseSettlement(),
    { id: "raid", faction: "raiders", strength: 2 },
    { random: () => 0, maxRounds: 40 }
  );
  assert.equal(result.result, "defeat");
  assert.ok(result.report.enemiesBreached > 0);
  assert.equal(result.report.stolen.percent, 10);
  assert.equal(result.settlement.resources.caps, 900);
});

test("enough machine gun turrets can stop a weak raid before HQ", () => {
  const turrets = [
    [8,8],[10,8],[12,8],[14,8],[8,14],[10,14],[12,14],[14,14],
  ].map(([x,y], index) => ({ id:`t${index}`, type:"machine_gun_turret", x, y, state:"active", condition:100 }));
  const result = simulateSettlementTowerDefense(
    baseSettlement(turrets),
    { id:"raid", faction:"raiders", strength:1 },
    { random: () => 0, maxRounds:40 }
  );
  assert.equal(result.result, "victory");
  assert.equal(result.report.enemiesBreached, 0);
  assert.equal(result.report.enemiesDefeated, result.report.enemyCount);
  assert.ok(result.report.turretShots > 0);
});

test("enemies destroy a wall when it is the only route to HQ", () => {
  const walls=[];
  let i=0;
  for(let x=9;x<=14;x++){walls.push({id:`w${i++}`,type:"wall_straight",x,y:9,state:"active",condition:100});walls.push({id:`w${i++}`,type:"wall_straight",x,y:14,state:"active",condition:100});}
  for(let y=10;y<=13;y++){walls.push({id:`w${i++}`,type:"wall_straight",x:9,y,state:"active",condition:100});walls.push({id:`w${i++}`,type:"wall_straight",x:14,y,state:"active",condition:100});}
  const result = simulateSettlementTowerDefense(
    baseSettlement(walls),
    { id:"raid", faction:"raiders", strength:2 },
    { random: () => 0, maxRounds:40 }
  );
  assert.ok(result.report.destroyedWalls.length > 0);
  assert.equal(result.result, "defeat");
});
