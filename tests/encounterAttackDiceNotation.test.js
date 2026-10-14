import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import winterOfAtom from "../src/data/bestiary/winterOfAtom01.js";
import { extractAttackDamageDice, parseCombatDiceValue, rewriteAttackDamageDice } from "../src/utils/attackDamageNotation.js";
import { applyEncounterDifficultyPower } from "../src/utils/proceduralEncounterDifficultyPower.js";
import { parseAttackText, buildNpcAttackRollConfig, normalizeStructuredAttack, normalizeWeaponAttack } from "../src/utils/npcCombat.js";

const byId = (id) => winterOfAtom.find((item) => item.id === id);

test("real Winter of Atom shotgun and melee attacks without CD suffix parse their original dice", () => {
  const entry = byId("woa-child-of-atom-fanatic-shotgun");
  assert.ok(entry);
  const attacks = parseAttackText(entry.attacks);
  assert.equal(attacks.length, 2);
  assert.equal(attacks[0].name, "COMBAT SHOTGUN");
  assert.equal(attacks[0].damageDice, 5);
  assert.equal(attacks[1].name, "HEATED SUPER SLEDGE");
  assert.equal(attacks[1].damageDice, 8);
  assert.equal(buildNpcAttackRollConfig(attacks[0]).weapon.damage, "5 CD");
});

test("tier III adds +3 actual damage dice to each attack, including bare damage notation", () => {
  const entry = byId("woa-child-of-atom-fanatic-shotgun");
  const buffed = applyEncounterDifficultyPower({ attacks: entry.attacks, drBlock: entry.drBlock }, "standard", "strong");
  assert.match(buffed.attacks, /8 CD Physical/);
  assert.match(buffed.attacks, /11 CD Breaking Energy/);
  const attacks = parseAttackText(buffed.attacks);
  assert.equal(attacks[0].damageDice, 8);
  assert.equal(attacks[1].damageDice, 11);
  assert.equal(buildNpcAttackRollConfig(attacks[0], buffed).weapon.damage, "8 CD");
  assert.equal(buildNpcAttackRollConfig(attacks[1], buffed).weapon.damage, "11 CD");
  assert.match(attacks[0].effects, /Piercing 2/);
  assert.match(attacks[1].effects, /Vicious/);
  assert.match(attacks[1].effects, /Breaking/);
});

test("implicit Piercing 1 does not get mistaken for damage and never duplicates effects", () => {
  const entry = byId("woa-child-of-atom-fanatic-grappler");
  assert.ok(entry);
  const original = parseAttackText(entry.attacks);
  assert.deepEqual(original.map((a) => a.damageDice), [5,5,8]);
  const modified = applyEncounterDifficultyPower({ attacks: entry.attacks }, "standard", "strong");
  const attacks = parseAttackText(modified.attacks);
  assert.deepEqual(attacks.map((a) => a.damageDice), [8,8,11]);
  assert.equal(attacks[0].effects.includes("Piercing 1"), false);
  assert.match(attacks[0].effects, /Piercing 2/);
  const repeated = applyEncounterDifficultyPower(modified, "standard", "strong");
  assert.equal(repeated.attacks, modified.attacks);
  const reset = applyEncounterDifficultyPower(modified, "standard", "none");
  assert.equal(reset.attacks, entry.attacks);
});

test("hard/deadly difficulty and optional power compose without double-counting", () => {
  const attacks = byId("woa-child-of-atom-fanatic-shotgun").attacks;
  const hard = applyEncounterDifficultyPower({ attacks }, "hard", "medium");
  assert.deepEqual(parseAttackText(hard.attacks).map((a) => a.damageDice), [10,14]);
  const deadly = applyEncounterDifficultyPower(hard, "deadly", "strong");
  assert.deepEqual(parseAttackText(deadly.attacks).map((a) => a.damageDice), [13,19]);
  assert.deepEqual(parseAttackText(applyEncounterDifficultyPower(deadly, "standard", "none").attacks).map((a) => a.damageDice), [5,8]);
});

test("text and structured weapon/CD formats use identical combat dice in actual roll", () => {
  const source = "PIPE GUN — AGI + Small Guns (TN 8), 5 Physical, Range C";
  const scaled = applyEncounterDifficultyPower({
    attacks: source,
    customAttacks: [{ name: "Pistol", damageDice: "5 CD", damageType: "Physical" }],
    weapons: [{ name: "Laser", damage: "5 CD Energy damage", damageType: "Energy" }],
  }, "standard", "strong");
  assert.equal(parseAttackText(scaled.attacks)[0].damageDice, 8);
  assert.equal(scaled.customAttacks[0].damageDice, 8);
  assert.equal(scaled.weapons[0].damageDice, 8);
  assert.equal(normalizeStructuredAttack({ name: "Pistol", damageDice: "5 CD" }).damageDice, 5);
  assert.equal(normalizeWeaponAttack({ name: "Laser", damage: "5 CD Energy damage" }).damageDice, 5);
  for (const attack of [...parseAttackText(scaled.attacks), ...scaled.customAttacks, ...scaled.weapons]) {
    assert.equal(buildNpcAttackRollConfig(attack, scaled).weapon.damage, "8 CD");
  }
});

test("combat effect ratings, target numbers, FR and other incidental numbers are not damage dice", () => {
  assert.equal(extractAttackDamageDice("PIPE GUN — AGI + Small Guns (TN 11), 5 Piercing 1 Physical, FR 2"), 5);
  assert.equal(extractAttackDamageDice("ATTACK — BODY + Melee (TN 7), 0 CD Physical damage"), 0);
  assert.equal(extractAttackDamageDice("ATTACK — BODY + Melee (TN 7), FR 3, Piercing 1"), null);
  assert.equal(extractAttackDamageDice("RELOAD — spend 2 AP, FR 3, Piercing 1"), null);
  assert.equal(parseCombatDiceValue("5 CD Energy damage"), 5);
  assert.equal(parseCombatDiceValue("5КУ Physical"), 5);
  assert.equal(rewriteAttackDamageDice("ATTACK — BODY + Melee (TN 7), 0 CD Physical", value => value > 0 ? value + 3 : 0).text.includes("0 CD"), true);
  const noDamage = applyEncounterDifficultyPower({ attacks: "ATTACK — BODY + Melee (TN 7), 0 CD Physical" }, "standard", "strong");
  assert.equal(parseAttackText(noDamage.attacks)[0].damageDice, 0);
  assert.equal(parseAttackText(noDamage.attacks)[0].effects, "");
});

test("collapsed GM card selects the stronger scaled attack instead of a stale duplicate", () => {
  const source = readFileSync(new URL("../src/components/gm/GmUnifiedTokenManagerV10.jsx", import.meta.url), "utf8");
  const begin = source.indexOf("function num(");
  const end = source.indexOf("function buffSummaryFor(", begin);
  assert.ok(begin >= 0 && end > begin);
  const dedupe = vm.runInNewContext(
    source.slice(begin, end) + "\ndedupeAttackSources;",
    { normalizeStructuredAttack, normalizeWeaponAttack, parseAttackText },
  );

  const originalText = "LASER: BODY + Guns (TN 12), 4 CD Energy damage";
  const boostedText = "LASER: BODY + Guns (TN 12), 8 CD Energy damage, Piercing 2, Vicious";
  const staleWeapon = { name: "LASER", damageDice: 4, effects: "" };
  const boostedWeapon = { name: "LASER", damageDice: 8, effects: "Piercing 2, Vicious" };

  const fromText = dedupe({ weapons: [staleWeapon], attacks: boostedText });
  assert.equal(fromText.weapons.length, 0);
  assert.equal(parseAttackText(fromText.attacks)[0].damageDice, 8);
  assert.equal(buildNpcAttackRollConfig(parseAttackText(fromText.attacks)[0]).weapon.damage, "8 CD");

  const fromWeapon = dedupe({ weapons: [boostedWeapon], attacks: originalText });
  assert.equal(fromWeapon.attacks, "");
  assert.equal(fromWeapon.weapons.length, 1);
  assert.equal(buildNpcAttackRollConfig(normalizeWeaponAttack(fromWeapon.weapons[0])).weapon.damage, "8 CD");
  assert.match(fromWeapon.weapons[0].effects, /Piercing 2/);

  const customWins = dedupe({
    customAttacks: [{ name: "LASER", damageDice: 7 }],
    weapons: [staleWeapon],
    attacks: originalText,
  });
  assert.equal(customWins.customAttacks.length, 1);
  assert.equal(customWins.weapons.length, 0);
  assert.equal(customWins.attacks, "");

  const multiple = dedupe({
    attacks: originalText + "\nBITE: BODY + Melee (TN 9), 2 CD Physical damage",
  });
  assert.deepEqual(parseAttackText(multiple.attacks).map(a => a.damageDice), [4, 2]);
});

test("GM card no longer revives old bestiary attacks after deduplication", () => {
  const card = readFileSync(new URL("../src/components/gm/GmUnifiedTokenManagerV4.jsx", import.meta.url), "utf8");
  assert.match(card, /parseAttackText\(stats\.attacks \?\? linkedEntry\?\.attacks \?\? ""\)/);
  assert.match(card, /\.\.\.weapons, \.\.\.custom, \.\.\.parsed/);
});
