import test from "node:test";
import assert from "node:assert/strict";
import { buildSettlementRaidRoster, settlementRaidEnemyCount, startSettlementRaidBattle } from "../src/utils/settlementRaidBattle.js";

test("raid enemy count scales with strength and stays bounded", () => {
  assert.equal(settlementRaidEnemyCount(1), 2);
  assert.equal(settlementRaidEnemyCount(6), 2);
  assert.equal(settlementRaidEnemyCount(7), 3);
  assert.equal(settlementRaidEnemyCount(100), 8);
});

test("raid roster includes selected healthy defenders and online heroes", () => {
  const settlement = {
    settlers: [
      { id: "a", name: "Ada", health: 100 },
      { id: "b", name: "Ben", health: 1 },
      { id: "c", name: "Cam", health: 80 },
    ],
  };
  const attack = { id: "raid", strength: 7, faction: "super_mutants" };
  const players = [
    { clientId: "p1", name: "One", online: true, character: { name: "Hero One" } },
    { clientId: "p2", name: "Two", online: false },
  ];
  const roster = buildSettlementRaidRoster(settlement, attack, ["a", "b", "c"], players);
  assert.deepEqual(roster.defenders.map((item) => item.id), ["a", "c"]);
  assert.deepEqual(roster.heroes.map((item) => item.name), ["Hero One"]);
  assert.equal(roster.enemies.length, 3);
  assert.equal(roster.enemies[0].faction, "super_mutants");
});

test("battle setup reopens an existing linked scene without duplicating tokens", async () => {
  const calls = [];
  const session = {
    mode: "host",
    status: "online",
    liveSceneId: "",
    tacticalScenes: [{ sceneId: "scene-existing", cols: 24, rows: 24, startZone: [{ x: 1, y: 20 }] }],
    switchTacticalScene: async (sceneId) => { calls.push(["switch", sceneId]); return { ok: true }; },
    enableTacticalScene: async (payload) => { calls.push(["enable", payload]); return { ok: true }; },
    createTacticalScene: async () => { throw new Error("should not create"); },
  };
  const result = await startSettlementRaidBattle(
    session,
    { id: "settlement", name: "Sanctuary", settlers: [] },
    { id: "raid", state: "warning", tacticalSceneId: "scene-existing", strength: 4, faction: "raiders" },
    []
  );
  assert.equal(result.ok, true);
  assert.equal(result.resumed, true);
  assert.deepEqual(calls.map((item) => item[0]), ["switch", "enable"]);
});

test("battle setup creates scene, heroes, defenders and enemies", async () => {
  const calls = [];
  const session = {
    mode: "host",
    status: "online",
    liveSceneId: "",
    tacticalScenes: [],
    players: [{ clientId: "p1", online: true, character: { name: "Vault Dweller" } }],
    createTacticalScene: async (payload) => { calls.push(["scene", payload]); return { ok: true, scene: { sceneId: "scene-new" } }; },
    enableTacticalScene: async (payload) => { calls.push(["enable", payload]); return { ok: true }; },
    createAssignedPlayerToken: async (payload) => { calls.push(["hero", payload]); return { ok: true }; },
    createNpcToken: async (payload) => { calls.push([payload.stats?.settlementDefender ? "defender" : "enemy", payload]); return { ok: true }; },
  };
  const result = await startSettlementRaidBattle(
    session,
    { id: "settlement", name: "Sanctuary", settlers: [{ id: "s1", name: "Preston", health: 90 }] },
    { id: "raid", state: "warning", strength: 4, faction: "raiders" },
    ["s1"]
  );
  assert.equal(result.ok, true);
  assert.equal(result.sceneId, "scene-new");
  assert.equal(calls.filter((item) => item[0] === "hero").length, 1);
  assert.equal(calls.filter((item) => item[0] === "defender").length, 1);
  assert.equal(calls.filter((item) => item[0] === "enemy").length, 2);
});
