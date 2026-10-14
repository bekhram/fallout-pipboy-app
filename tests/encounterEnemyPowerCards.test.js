import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

import {
  applyGeneratedEncounterPower,
  applyEncounterPowerToSceneTokens,
} from "../src/utils/proceduralEncounterDifficultyPower.js";
import { encounterEnemyPowerCopy } from "../src/utils/encounterEnemyPower.js";

const base = {
  hp: 12, maxHp: 12, xp: 30, rank: "standard",
  attacks: "LASER: AGI + Small Guns (TN 10), 4 CD Energy damage, Range M",
  drBlock: "Physical 1; Energy 2; Poison 0",
};

test("already placed GM enemy cards update to tier III without changing HP or creating new tokens", () => {
  const original = { id: "existing-npc", kind: "npc", x: 4, y: 7, stats: { ...base } };
  const player = { id: "player", kind: "player", stats: { ...base } };
  const ally = { id: "ally", kind: "npc", stats: { ...base, generatedDisposition: "friendly" } };
  const scenery = { id: "scenery", kind: "marker", stats: { ...base } };
  const scene = [original, player, ally, scenery];
  const update = applyEncounterPowerToSceneTokens(scene, {
    enemyPowerTier: "strong", encounterDifficulty: "standard",
  });
  assert.equal(update.updated, 1);
  assert.equal(update.tokens.length, 4);
  assert.equal(update.tokens[0].id, original.id);
  assert.equal(update.tokens[0].x, 4);
  assert.equal(update.tokens[0].y, 7);
  assert.equal(update.tokens[0].stats.enemyPowerTier, "strong");
  assert.match(update.tokens[0].stats.attacks, /7 CD/);
  assert.match(update.tokens[0].stats.attacks, /Piercing 2/);
  assert.match(update.tokens[0].stats.attacks, /Vicious/);
  assert.match(update.tokens[0].stats.attacks, /Breaking/);
  assert.match(update.tokens[0].stats.drBlock, /Physical 4; Energy 5; Poison 3/);
  assert.equal(update.tokens[0].stats.hp, 12);
  assert.equal(update.tokens[0].stats.xp, 30);
  assert.equal(original.stats.enemyPowerTier, undefined, "original objects cannot be mutated");
  assert.equal(update.tokens[1], player);
  assert.equal(update.tokens[2], ally);
  assert.equal(update.tokens[3], scenery);
});

test("changes of strength or encounter difficulty replace previous bonuses, not stack", () => {
  const source = [{ id: "npc", kind: "npc", stats: { ...base } }];
  const strong = applyEncounterPowerToSceneTokens(source, { enemyPowerTier: "strong", encounterDifficulty: "hard" });
  const repeated = applyEncounterPowerToSceneTokens(strong.tokens, { enemyPowerTier: "strong", encounterDifficulty: "hard" });
  assert.deepEqual(repeated.tokens, strong.tokens);
  const light = applyEncounterPowerToSceneTokens(strong.tokens, { enemyPowerTier: "light", encounterDifficulty: "standard" });
  assert.match(light.tokens[0].stats.attacks, /5 CD/);
  assert.match(light.tokens[0].stats.drBlock, /Physical 2; Energy 3; Poison 1/);
  assert.equal(light.tokens[0].stats.enemyPowerTier, "light");
  const none = applyEncounterPowerToSceneTokens(light.tokens, { enemyPowerTier: "none", encounterDifficulty: "standard" });
  assert.equal(none.tokens[0].stats.attacks, base.attacks);
  assert.equal(none.tokens[0].stats.drBlock, base.drBlock);
  assert.equal(none.tokens[0].stats.hp, 12);
  assert.deepEqual(none.tokens[0].stats.encounterAttackEffects, []);
});

test("manual and procedural spawns calculate identical effective dice and resistances", () => {
  const spec = { encounterDifficulty: "deadly", enemyPowerTier: "medium" };
  const created = applyGeneratedEncounterPower(base, spec);
  const placed = applyEncounterPowerToSceneTokens([{ kind: "npc", stats: { ...base } }], spec).tokens[0].stats;
  assert.deepEqual(placed, created);
  assert.equal(created.enemyPowerTier, "medium");
  assert.match(created.attacks, /10 CD/);
  assert.match(created.attacks, /Piercing 1/);
});

test("UI includes a strength badge on compact GM enemy cards and attack chips show damage dice", () => {
  const cardSource = readFileSync(new URL("../src/components/gm/GmUnifiedTokenManagerV4.jsx", import.meta.url), "utf8");
  assert.match(cardSource, /<EnemyPowerBadge stats=\{stats\}/);
  assert.match(cardSource, /\{attack\.name\}<small>\{profile\.damageDice\} CD<\/small>/);
  for (const language of ["en", "ru", "uk", "pl"]) {
    const copy = encounterEnemyPowerCopy(language);
    assert.ok(copy.strong);
    assert.ok(copy.updated);
  }
});

test("a GM tier change persists all existing NPC stats in one campaign mutation", async () => {
  const source = readFileSync(new URL("../src/hooks/useGmAuthoritativeSessionV2.js", import.meta.url), "utf8");
  const part = source.slice(source.indexOf("  const reapplyEncounterEnemyPower ="),
    source.indexOf("  const updateSharedMapMarkup =", source.indexOf("  const reapplyEncounterEnemyPower =")));
  assert.ok(part.includes("const reapplyEncounterEnemyPower"));
  const scene = { sceneId: "tactical-1", revision: 1, tokens: [
    { kind: "npc", id: "hostile", stats: { ...base } },
    { kind: "npc", id: "neutral", stats: { ...base, generatedDisposition: "neutral" } },
  ] };
  const snapshot = { selectedSceneId: "tactical-1", scenes: [scene] };
  let commits = 0;
  const context = {
    modeRef: { current: "host" }, gmStateRef: { current: snapshot },
    sceneById: (campaign, id) => campaign.scenes.find(s => s.sceneId === id),
    applyEncounterPowerToSceneTokens,
    safeClone: structuredClone,
    mutateGmState: async update => {
      commits++;
      const next = structuredClone(snapshot);
      const result = update(next);
      if (result?.ok === false) return result;
      snapshot.scenes = next.scenes;
      return { ok: true, ...result };
    },
  };
  const apply = vm.runInNewContext(`${part}\nreapplyEncounterEnemyPower;`, context);
  const result = await apply({ enemyPowerTier: "strong", encounterDifficulty: "standard" });
  assert.equal(result.ok, true);
  assert.equal(result.updated, 1);
  assert.equal(commits, 1);
  assert.match(snapshot.scenes[0].tokens[0].stats.attacks, /7 CD/);
  assert.equal(snapshot.scenes[0].tokens[1].stats.enemyPowerTier, undefined);
});
