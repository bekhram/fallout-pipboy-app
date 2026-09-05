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

// Only consequences that the application can apply immediately belong here.
// Narrative outcomes stay unresolved until Auto GM handles them in Local mode.
const FIXED_CONSEQUENCES = {
  hunger_crash: {
    kind: "survival",
    satietySet: 0,
    vigorDelta: -1,
    summary: "SAT 0 // VIG -1",
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
      ? `COMBAT // ${enemy.name} // HP ${enemy.hp.current}/${enemy.hp.max} // DEF ${enemy.defense} // INIT ${enemy.initiative ?? "—"}`
      : "COMBAT // BESTIARY",
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

  // Narrative-only encounters are described exactly once by Auto GM.
  // No synthetic fallback resolution is created because the app has not
  // resolved dice, damage, inventory, conditions, or character-sheet changes.
  return null;
}
