import test from "node:test";
import assert from "node:assert/strict";
import { applyEncounterDifficultyPower, applyGeneratedEncounterPower } from "../src/utils/proceduralEncounterDifficultyPower.js";
import { normalizeEncounterEnemyPowerTier } from "../src/utils/encounterEnemyPower.js";
import { applyNpcRank, buildNpcAttackRollConfig, parseAttackText, parseCombatAbilityAttacks } from "../src/utils/npcCombat.js";
import { buildFalloutD6Result } from "../src/utils/dice.js";

const base = {
  hp: 10, maxHp: 10, defense: 1, xp: 20,
  attacks: "RIFLE: AGI + Small Guns (TN 10), 4 CD Physical damage, Range M, FR 3, Reliable",
  customAttacks: [{ id: "claw", name: "Claw", damageDice: 3, effects: "Stun", targetNumber: 9 }],
  weapons: [{ id: "laser", name: "Laser", damage: 5, cd: 5, effect: "Piercing 4, Vicious", qualities: "Reliable" }],
  drBlock: "Physical 2 (Head 1-2); 4 (Torso 3-8) • Energy 0 • Radiation Immune",
  resistanceBonus: 2,
};

test("optional power tiers add predictable bonuses after difficulty scaling", () => {
  for (const [tier, bonus, effects] of [["none", 0, 0], ["light", 1, 1], ["medium", 2, 2], ["strong", 3, 3]]) {
    const stats = applyEncounterDifficultyPower(base, "hard", tier);
    assert.equal(parseAttackText(stats.attacks)[0].damageDice, 6 + bonus);
    assert.equal(stats.customAttacks[0].damageDice, 5 + bonus);
    assert.equal(stats.weapons[0].damage, 8 + bonus);
    assert.equal(stats.weapons[0].cd, 8 + bonus);
    assert.equal(stats.resistanceBonus, 4, "rank DR is scaled once");
    assert.match(stats.drBlock, new RegExp(`Physical ${4 + bonus} \\(Head 1-2\\); ${8 + bonus} \\(Torso 3-8\\)`));
    assert.match(stats.drBlock, /Radiation Immune/);
    assert.match(stats.drBlock, new RegExp(`Energy ${bonus}`));
    if (bonus) assert.match(stats.drBlock, new RegExp(`Poison ${bonus}`));
    assert.equal(stats.encounterAttackEffects.length, effects);
    assert.equal(stats.hp, base.hp);
    assert.equal(stats.xp, base.xp);
  }
});

test("reapplying, changing and disabling power never compounds bonuses or edits the source", () => {
  const original = structuredClone(base);
  const strong = applyEncounterDifficultyPower(base, "deadly", "strong");
  assert.deepEqual(applyEncounterDifficultyPower(strong, "deadly", "strong"), strong);
  assert.deepEqual(applyEncounterDifficultyPower(strong, "standard", "light"), applyEncounterDifficultyPower(base, "standard", "light"));
  assert.deepEqual(applyEncounterDifficultyPower(strong, "standard", "none"), applyEncounterDifficultyPower(base));
  assert.deepEqual(base, original);
});

test("attack effects reach the actual dice result and preserve stronger original effects", () => {
  const stats = applyEncounterDifficultyPower(base, "standard", "strong");
  const attack = parseAttackText(stats.attacks)[0];
  const config = buildNpcAttackRollConfig(attack, stats, "Raider");
  assert.equal(config.weapon.damage, "7 CD");
  const result = buildFalloutD6Result([5, 6, 1], { effects: config.weapon.effects });
  assert.equal(result.totalDamage, 5);
  assert.equal(result.triggeredEffects.piercingTotal, 4);
  assert.equal(result.triggeredEffects.breaking, true);
  assert.equal(stats.weapons[0].effects, "Piercing 4, Vicious, Breaking");
  assert.equal(stats.weapons[0].effect, stats.weapons[0].effects);
  assert.equal(parseAttackText("LASER: 5 CD Physical damage, Piercing 4")[0].effects, "Piercing 4");
  assert.equal(stats.weapons[0].qualities, "Reliable");
  assert.match(stats.customAttacks[0].effects, /Stun/);
});

test("all ranks retain their identity and roll the boosted damage once", () => {
  for (const rank of ["minion", "standard", "special", "legendary"]) {
    const ranked = applyNpcRank(base, { rank });
    const stats = applyGeneratedEncounterPower(ranked, { encounterDifficulty: "hard", enemyPowerTier: "medium" });
    assert.equal(stats.rank, rank);
    assert.equal(stats.maxHp, ranked.maxHp);
    assert.equal(stats.xp, ranked.xp);
    assert.equal(buildNpcAttackRollConfig(parseAttackText(stats.attacks)[0], stats).weapon.damage, "8 CD");
  }
});

test("friendly and neutral settlement occupants receive no hostile modifier", () => {
  for (const generatedDisposition of ["friendly", "neutral"]) {
    const stats = { ...base, generatedDisposition };
    assert.deepEqual(applyGeneratedEncounterPower(stats, { encounterDifficulty: "deadly", enemyPowerTier: "strong" }), stats);
  }
});

test("LET RIP keeps its extra damage and inherited attack effects", () => {
  const stats = applyEncounterDifficultyPower({ ...base, abilities: "LET RIP: RIFLE can fire for 7 CD total." }, "standard", "strong");
  const ability = parseCombatAbilityAttacks(stats.abilities, stats.attacks)[0];
  assert.equal(ability.damageDice, 10);
  assert.match(ability.effects, /Piercing 2/);
  assert.match(ability.effects, /Vicious/);
});

test("legacy scenes default to no modifier; zero damage and immunities stay intact", () => {
  assert.equal(normalizeEncounterEnemyPowerTier(undefined), "none");
  assert.equal(normalizeEncounterEnemyPowerTier("unexpected"), "none");
  const stats = applyEncounterDifficultyPower({ attacks: "SIGNAL: TN 8, 0 CD Energy damage", drBlock: "Physical/Energy Immune", customAttacks: [{ damage: 40 }] }, "deadly", "strong");
  assert.equal(parseAttackText(stats.attacks)[0].damageDice, 0);
  assert.equal(parseAttackText(stats.attacks)[0].effects, "");
  assert.match(stats.drBlock, /^Physical\/Energy Immune/);
  assert.equal(stats.customAttacks[0].damageDice, 50);
});
