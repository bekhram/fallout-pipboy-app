import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERKS_DICTIONARY } from "../src/components/data/perks.js";
import { getPerkCalculationState } from "../src/utils/perkEffects.js";
import { POWER_ARMOR_SETS } from "../src/data/powerArmor.js";
import { CRAFTING_RECIPES } from "../src/data/craftingRecipes.js";
import { BESTIARY_ENTRIES } from "../src/data/bestiary.js";

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
    perksAndTraits: [{ id: "barbarian", rank: 1 }],
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


test("Errata V6 bestiary corrections are applied", () => {
  const byId = (id) => BESTIARY_ENTRIES.find((entry) => entry.id === id);

  const radstag = byId("radstag");
  assert.equal(radstag.body, "6");
  assert.equal(radstag.hp, "11");
  assert.match(radstag.attacks, /TN 9/);

  assert.equal(byId("glowing-one").hp, "17");

  const handy = byId("mister-handy");
  assert.deepEqual(handy.special, { STR:"6", PER:"8", END:"5", CHA:"7", INT:"7", AGI:"7", LCK:"5" });
  assert.equal(handy.hp, "16");
  assert.equal(handy.luckPoints, "3");
  assert.ok(handy.skills.some((s) => s.name === "Big Guns" && s.rating === 3 && s.tagged));
  assert.match(handy.attacks, /END \+ Big Guns \(TN 8\)/);

  const gutsy = byId("mister-gutsy");
  assert.deepEqual(gutsy.special, { STR:"6", PER:"9", END:"7", CHA:"5", INT:"7", AGI:"8", LCK:"4" });
  assert.equal(gutsy.hp, "18");
  assert.equal(gutsy.initiative, "19");
  assert.ok(gutsy.skills.some((s) => s.name === "Big Guns" && s.rating === 4 && s.tagged));

  const sentry = byId("sentry-bot");
  assert.match(sentry.attacks, /SELF DESTRUCT.*TN 14.*6 CD Physical.*Blast/s);
  assert.match(sentry.abilities, /BIG/);

  const master = byId("super-mutant-master");
  assert.equal(master.luckPoints, "3");
  assert.ok(master.skills.some((s) => s.name === "Big Guns" && s.rating === 4 && s.tagged));
  assert.ok(master.skills.some((s) => s.name === "Unarmed" && s.rating === 4));
  assert.match(master.attacks, /UNARMED STRIKE.*TN 14/);
  assert.match(master.attacks, /MINIGUN.*TN 12/);
  assert.match(master.attacks, /MISSILE LAUNCHER.*TN 12/);

  const courser = byId("synth-courser");
  assert.equal(courser.skills.find((s) => s.name === "Melee Weapons")?.tagged, undefined);
  assert.match(courser.attacks, /5 CD Vicious Piercing 1 Energy/);

  const boss = byId("raider-boss");
  assert.equal(boss.initiative, "21");
  assert.equal(boss.skills.find((s) => s.name === "Big Guns")?.rating, 2);
  assert.equal(boss.skills.find((s) => s.name === "Melee Weapons")?.rating, 3);
  assert.equal(boss.skills.find((s) => s.name === "Small Guns")?.rating, 4);
  assert.match(boss.attacks, /HUNTING RIFLE.*TN 12/);

  const atom = byId("children-of-atom");
  assert.equal(atom.special.LCK, "4");
  assert.equal(atom.hp, "12");
  assert.equal(atom.skills.find((s) => s.name === "Speech")?.tagged, true);

  const minuteman = byId("minuteman");
  assert.equal(minuteman.skills.find((s) => s.name === "Energy Weapons")?.tagged, true);
  assert.equal(minuteman.skills.find((s) => s.name === "Small Guns")?.rating, 2);
  assert.equal(minuteman.skills.find((s) => s.name === "Small Guns")?.tagged, undefined);
  assert.equal(minuteman.skills.find((s) => s.name === "Survival")?.rating, 2);
  assert.equal(minuteman.skills.find((s) => s.name === "Survival")?.tagged, true);

  const vault = byId("vault-dweller-npc");
  assert.equal(vault.skills.find((s) => s.name === "Survival")?.tagged, undefined);

  assert.match(byId("railroad-agent").attacks, /HUNTING RIFLE.*Physical/);

  const wastelander = byId("wastelander-npc");
  assert.deepEqual(wastelander.special, {STR:"6",PER:"5",END:"7",CHA:"4",INT:"5",AGI:"5",LCK:"4"});
  assert.equal(wastelander.hp, "9");
  assert.equal(wastelander.initiative, "10");
  assert.equal(wastelander.carryWeight, "210 lbs.");
  assert.match(wastelander.attacks, /UNARMED STRIKE.*TN 7/);
  assert.match(wastelander.attacks, /MACHETE.*TN 8/);
  assert.match(wastelander.attacks, /DOUBLE-BARRELLED SHOTGUN.*TN 7/);
  assert.match(wastelander.loot, /Wealth 1/);

  const zetan = byId("zetan");
  assert.equal(zetan.hp, "15");
  assert.doesNotMatch(zetan.attacks, /Blast/);
});


test("Wanderer's Guide errata V6 weapon data is applied", () => {
  const csv = readFileSync(new URL("../public/weapons.csv", import.meta.url), "utf8");
  assert.match(csv, /Arc Welder[^\n]*Fusion Cell/);
  assert.doesNotMatch(csv, /M79 Grenade Launcher[^\n]*Two-Handed/);

  const source = readFileSync(new URL("../src/data/weaponMods.js", import.meta.url), "utf8");
  for (const name of [
    "Armor Piercing Automatic Receiver",
    "Hardened Automatic Receiver",
    "Rapid Automatic Receiver",
    "Powerful Automatic Receiver",
    "Hardened Piercing Auto Receiver",
  ]) {
    const line = source.split("\n").find((row) => row.includes(name));
    assert.ok(line);
    assert.match(line, /Burst/);
  }
  assert.match(
    source,
    /Improved Splitter"[\s\S]*?"Science! 1"/
  );
});

test("Wanderer's Guide errata V6 crafting recipes are applied", () => {
  const byName = (name, group) => CRAFTING_RECIPES.find((r) => r.name === name && (!group || r.group === group));

  assert.equal(byName("Ported Barrel", "GATLING PLASMA MODS").complexity, 5);
  assert.equal(byName("Comfort Grip", "GATLING PLASMA MODS").complexity, 3);
  assert.equal(byName("Reflex Sight", "GATLING PLASMA MODS").complexity, 4);
  assert.equal(byName("Beam Splitter", "GATLING PLASMA MODS").complexity, 5);
  assert.equal(byName("Beam Focuser", "GATLING PLASMA MODS").complexity, 4);

  assert.equal(byName("Tri-Barrel", "GAUSS MINIGUN MODS").complexity, 5);
  assert.equal(byName("Penta-Barrel", "GAUSS MINIGUN MODS").complexity, 5);
  assert.equal(byName("Tesla Coil Capacitor", "GAUSS MINIGUN MODS").complexity, 5);
  assert.equal(byName("Tesla Coil Dynamo", "GAUSS MINIGUN MODS").complexity, 6);
  assert.equal(byName("Gunner Sight", "GAUSS MINIGUN MODS").complexity, 4);

  assert.equal(byName("Overcharged Capacitor", "ADDITIONAL ENERGY WEAPON MODS").perks, "Science! 3");
  assert.equal(byName("Improved Automatic Barrel", "ADDITIONAL ENERGY WEAPON MODS").perks, "Science! 2");
  assert.equal(byName("Improved Sniper Barrel", "ADDITIONAL ENERGY WEAPON MODS").perks, "Science! 2");
  assert.equal(byName("Improved Splitter", "ADDITIONAL ENERGY WEAPON MODS").perks, "Science! 1");
});


test("Settler's Guide errata V6 NPC corrections are applied", () => {
  const recruit = BESTIARY_ENTRIES.find((entry) => entry.id === "settlers-ncr-recruit");
  assert.ok(recruit);
  assert.match(recruit.attacks, /COMBAT RIFLE.*TN 8.*5 CD Physical.*FR 2/);
  assert.doesNotMatch(recruit.attacks, /HUNTING RIFLE/);
  assert.match(recruit.loot, /Combat Rifle/);

  const x688 = BESTIARY_ENTRIES.find((entry) => entry.id === "settlers-x6-88");
  assert.ok(x688);
  assert.match(x688.attacks, /10MM PISTOL.*TN 11/);
});


test("Winter of Atom errata V6 first bestiary batch is imported corrected", () => {
  const byId = (id) => BESTIARY_ENTRIES.find((entry) => entry.id === id);

  const wastelander = byId("woa-wastelander");
  assert.deepEqual(wastelander.special, {STR:"6",PER:"5",END:"7",CHA:"4",INT:"5",AGI:"5",LCK:"4"});
  assert.equal(wastelander.hp, "9");
  assert.equal(wastelander.initiative, "10");
  assert.match(wastelander.attacks, /MACHETE.*TN 8.*Piercing 1/);
  assert.match(wastelander.attacks, /TIRE IRON.*TN 8/);
  assert.doesNotMatch(wastelander.attacks, /TIRE IRON.*Piercing/);

  const scavenger = byId("woa-scavenger");
  assert.equal(scavenger.skills.find((s) => s.name === "Sneak")?.rating, 1);
  assert.equal(scavenger.skills.find((s) => s.name === "Repair")?.tagged, true);
  assert.equal(scavenger.skills.find((s) => s.name === "Survival")?.tagged, true);

  const turret = byId("woa-machine-gun-turret-mk1");
  assert.doesNotMatch(turret.attacks, /Stun/);
  assert.match(turret.abilities, /must be repaired/i);

  const atom = byId("woa-child-of-atom");
  assert.equal(atom.skills.find((s) => s.name === "Speech")?.tagged, true);
  assert.equal(atom.skills.find((s) => s.name === "Survival")?.tagged, true);
  assert.match(atom.attacks, /GAMMA GUN/);
  assert.match(atom.attacks, /MACHETE.*3 CD Piercing 1/);

  const tinkerer = byId("woa-child-of-atom-tinkerer");
  assert.equal(tinkerer.skills.find((s) => s.name === "Explosives")?.tagged, true);
  assert.equal(tinkerer.skills.find((s) => s.name === "Science")?.tagged, true);
  assert.equal(tinkerer.skills.find((s) => s.name === "Speech")?.rating, 1);

  const dragon = byId("woa-elizas-dragon");
  assert.match(dragon.attacks, /DRAGON'S FLAME — Body \+ Other/);
  assert.match(dragon.abilities, /Remote Controlled/);

  const schumacher = byId("woa-brother-schumacher");
  for (const skill of ["Barter","Repair","Speech"]) {
    assert.equal(schumacher.skills.find((s) => s.name === skill)?.tagged, true);
  }
  assert.match(schumacher.attacks, /TN 9/);

  for (const id of ["woa-child-of-atom-fanatic-shotgun","woa-child-of-atom-fanatic-grappler"]) {
    const fanatic = byId(id);
    assert.equal(fanatic.luckPoints, "—");
    assert.equal(fanatic.skills.find((s) => s.name === "Melee Weapons")?.tagged, true);
    assert.equal(fanatic.skills.find((s) => s.name === "Small Guns")?.tagged, true);
    assert.match(fanatic.attacks, /HEATED SUPER SLEDGE.*STR \+ Energy Weapons.*8 Breaking Energy/);
  }

  const rifleman = byId("woa-minuteman-rifleman");
  assert.equal(rifleman.level, "8");
  assert.equal(rifleman.skills.find((s) => s.name === "Energy Weapons")?.tagged, true);
  assert.equal(rifleman.skills.find((s) => s.name === "Survival")?.tagged, true);

  const yarrow = byId("woa-dr-yarrow");
  for (const skill of ["Medicine","Science","Small Guns","Survival"]) {
    assert.equal(yarrow.skills.find((s) => s.name === skill)?.tagged, true);
  }
  assert.match(yarrow.abilities, /Yellow Belly/);

  const yao = byId("woa-yao-guai");
  assert.match(yao.abilities, /Defense -1 to minimum 1/);

  const scrapjaw = byId("woa-brother-scrapjaw");
  for (const skill of ["Athletics","Energy Weapons","Melee Weapons"]) {
    assert.equal(scrapjaw.skills.find((s) => s.name === skill)?.tagged, true);
  }
  assert.match(scrapjaw.attacks, /CURVED RIPPER.*8 CD Piercing 1, Vicious Physical/);
  assert.match(scrapjaw.loot, /one Agitated Recoil Compensated Plasma Rifle/);
});
