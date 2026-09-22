import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERKS_DICTIONARY } from "../src/components/data/perks.js";
import { getPerkCalculationState } from "../src/utils/perkEffects.js";
import { POWER_ARMOR_SETS } from "../src/data/powerArmor.js";
import { CRAFTING_RECIPES } from "../src/data/craftingRecipes.js";

test("Errata V6 core perk corrections are applied", () => {
  assert.equal(PERKS_DICTIONARY.gun_nut.maxRanks, 4);
  assert.equal(PERKS_DICTIONARY.science.maxRanks, 4);
  assert.equal(PERKS_DICTIONARY.lock_and_load, undefined);
  assert.deepEqual(PERKS_DICTIONARY.armorer.rankRequirements, {
    1: "STR 5, INT 6",
    2: "STR 5, INT 6, Level 4+",
    3: "STR 5, INT 6, Level 8+",
    4: "STR 5, INT 6, Level 12+",
  });
});

test("Barbarian adds equal physical and energy resistance", () => {
  const form = {
    special: { S: 9 },
    perks: [{ id: "barbarian", rank: 1 }],
    armor: {},
    currentHp: "10",
  };
  const state = getPerkCalculationState(form);
  assert.equal(state.derived.physicalResistBonus, 2);
  assert.equal(state.derived.energyResistBonus, 2);
});

test("Errata V6 power armor costs are applied", () => {
  const t60 = POWER_ARMOR_SETS.find((set) => set.id === "t60");
  const x01 = POWER_ARMOR_SETS.find((set) => set.id === "x01");
  assert.deepEqual(
    [t60.parts.head.cost, t60.parts.torso.cost, t60.parts.arm.cost, t60.parts.leg.cost],
    [130, 250, 170, 170]
  );
  assert.deepEqual(
    [x01.parts.head.cost, x01.parts.torso.cost, x01.parts.arm.cost, x01.parts.leg.cost],
    [140, 280, 200, 200]
  );
});

test("Errata V6 corrected crafting recipes are present", () => {
  const byName = (name, group) => CRAFTING_RECIPES.find((r) => r.name === name && (!group || r.group === group));
  assert.deepEqual(byName("Mentats").materials, {
    "Uncommon Materials": 3,
    "Rare Materials": 2,
    "Brain Fungus": 2,
  });
  assert.deepEqual(byName("Mind Cloud").materials, {
    "Uncommon Materials": 2,
    "Rare Materials": 3,
    "Asbestos": 2,
    "Purified Water": 1,
  });
  assert.equal(byName("Large Magazine", "SMALL GUNS MAGAZINE MODS").complexity, 4);
  assert.equal(byName("Quick-Eject Mag", "SMALL GUNS MAGAZINE MODS").complexity, 5);
  assert.equal(byName("Large Quick-Eject Mag", "SMALL GUNS MAGAZINE MODS").complexity, 5);
  assert.deepEqual(byName("Squirrel Stew").materials, {
    Bloodleaf: 1,
    Carrot: 1,
    "Dirty Water": 2,
    "Squirrel Bits": 1,
    Tato: 1,
  });
});

test("Errata V6 weapon table corrections are applied", () => {
  const csv = readFileSync(new URL("../public/weapons.csv", import.meta.url), "utf8");
  assert.match(csv, /Sledgehammer[^\n]*Two-Handed/);
  assert.match(csv, /Nuka Grenade[^\n]*Breaking/);
  assert.match(csv, /Nuke Mine[^\n]*"Blast, Mine"/);
  assert.match(csv, /Plasma Mine[^\n]*"Blast, Mine"/);
  assert.match(csv, /Pulse Mine[^\n]*"Blast, Mine"/);
});
