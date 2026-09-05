import {
  rollFalloutD6,
  rollHitLocationD20,
} from "./dice.js";
import {
  calculateFinalIncomingDamage,
  getDerivedStats,
} from "./characterMath.js";
import { buildBestiaryCombatForEncounter } from "./bestiaryCombatContext.js";

export const PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT = "pipboy:travel-encounter-effect";

const DAMAGE_PROFILES = {
  building_collapse: { diceCount: 5, damageType: "physical", hitLocation: true },
  radioactive_puddle: { diceCount: 4, damageType: "radiation", hitLocation: false, part: "torso" },
  rad_waste_pit: { diceCount: 4, damageType: "radiation", hitLocation: false, part: "torso" },
  grenade_tripwire: { diceCount: 6, damageType: "physical", hitLocation: true, area: true },
  toxic_puddle: { diceCount: 3, damageType: "poison", hitLocation: true },
};

const FIXED_CONSEQUENCES = {
  hunger_crash: {
    kind: "survival",
    satietySet: 0,
    vigorDelta: -1,
    summary: "Hunger drops to 0 and vigor drops by 1.",
  },
  stuck_in_textures: {
    kind: "condition",
    summary: "Movement is blocked until a long rest resolves the encounter.",
  },
  overload: {
    kind: "choice",
    summary: "The player must drop enough carried weight or accept 1 level of exhaustion.",
  },
  pickpocket: {
    kind: "inventory",
    summary: "One unequipped inventory item may be stolen; Auto GM must establish which item before changing inventory.",
  },
  fatal_breakdown: {
    kind: "equipment",
    summary: "An equipped weapon or armor piece may break; Auto GM must identify the affected item before changing equipment.",
  },
  food_poisoning: {
    kind: "condition",
    summary: "Food poisoning becomes the immediate scene consequence; Auto GM should resolve any required test before adding a lasting condition.",
  },
};

function resolveDamage(encounter, character, profile) {
  const damageRoll = rollFalloutD6({ diceCount: profile.diceCount });
  const hit = profile.hitLocation
    ? rollHitLocationD20()
    : { value: null, location: profile.part || "torso", label: profile.part || "Torso" };
  const derived = getDerivedStats(character || {});
  const calculation = calculateFinalIncomingDamage({
    rawDamage: damageRoll.totalDamage,
    damageType: profile.damageType,
    part: hit.location,
    armor: character?.armor,
    derived,
  });

  return {
    kind: "damage",
    damageType: profile.damageType,
    diceCount: profile.diceCount,
    dice: damageRoll.rolls.map((die) => die.value),
    rawDamage: damageRoll.totalDamage,
    effectTriggers: damageRoll.totalEffects,
    hitLocation: hit.location,
    hitLocationLabel: hit.label,
    hitLocationRoll: hit.value,
    resistance: calculation.resistance >= 9999 ? "immune" : calculation.resistance,
    incomingModifier: calculation.incomingModifier,
    finalDamage: calculation.finalDamage,
    criticalInjury: calculation.finalDamage >= 5,
    area: profile.area === true,
    hpEffect: profile.damageType === "radiation"
      ? { radiationHpDelta: calculation.finalDamage }
      : { currentHpDelta: -calculation.finalDamage },
  };
}

function resolveCombat(encounter, character) {
  const combat = buildBestiaryCombatForEncounter(encounter, character);
  if (!combat) return null;
  const enemy = combat.enemies?.[0];
  return {
    kind: "combat",
    combat,
    summary: enemy
      ? `Combat encounter: ${enemy.name}. HP ${enemy.hp.current}/${enemy.hp.max}, Defense ${enemy.defense}, Initiative ${enemy.initiative ?? "—"}. Exact attacks, DR and abilities are attached from the Core Rulebook bestiary.`
      : "Combat encounter created from the Core Rulebook bestiary.",
  };
}

export function resolveTravelEncounter(encounter, character) {
  if (!encounter?.id) return null;

  const damageProfile = DAMAGE_PROFILES[encounter.id];
  if (damageProfile) return resolveDamage(encounter, character, damageProfile);

  const consequence = FIXED_CONSEQUENCES[encounter.id];
  if (consequence) return { ...consequence };

  const combatResolution = resolveCombat(encounter, character);
  if (combatResolution) return combatResolution;

  return {
    kind: "scene",
    summary: "No automatic damage is applied. Resolve the encounter through Auto GM before changing the character sheet.",
  };
}
