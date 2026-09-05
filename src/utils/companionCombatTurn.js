import { rollFalloutD20, rollFalloutD6, rollHitLocationD20 } from "./dice.js";
import {
  BESTIARY_COMBAT_ACTION_EVENT,
  BESTIARY_COMBAT_CHANGED_EVENT,
  BESTIARY_COMBAT_STORAGE_KEY,
  getBestiaryResistance,
  hasBestiaryLocationSpecificDr,
} from "./bestiaryCombatContext.js";

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

function parseEffects(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[\s_-]/g, "");
}

function piercingRating(effects) {
  for (const effect of effects) {
    const match = String(effect).match(/piercing\s*(\d+)?/i);
    if (match) return Math.max(1, Number(match[1]) || 1);
  }
  return 0;
}

function readStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BESTIARY_COMBAT_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { bySession: parsed.bySession || {}, latestSessionKey: parsed.latestSessionKey || null }
      : { bySession: {}, latestSessionKey: null };
  } catch {
    return { bySession: {}, latestSessionKey: null };
  }
}

function writeStore(store) {
  window.localStorage.setItem(BESTIARY_COMBAT_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_CHANGED_EVENT));
}

export function resolveCompanionAttack({ companion, attack, enemy } = {}) {
  if (!companion || !attack || !enemy) return { error: "missing_companion_attack_data" };
  const attribute = Number(companion?.[attack.attribute] || 0);
  const skill = Number(companion?.[attack.skill] || 0);
  const targetNumber = Math.max(0, Math.min(20, attribute + skill));
  const configuredDifficulty = Math.max(0, Math.min(10, Number(attack.difficulty) || 1));
  const difficulty = Math.max(Number(enemy?.defense || 1), configuredDifficulty);
  const diceCount = Math.max(1, Math.min(5, Number(attack.diceCount) || 2));
  const attackRoll = rollFalloutD20({
    diceCount,
    targetNumber,
    criticalRange: 1,
    label: `${companion.name || "Companion"}: ${attack.name || "Attack"}`,
  });
  const hit = attackRoll.totalSuccesses >= difficulty;
  const effects = parseEffects(attack.effects);
  const damageType = String(attack.damageType || "physical").toLowerCase();

  const base = {
    kind: "companion_attack",
    actor: { id: companion.id, name: companion.name || "Companion", initiative: Number(companion.initiative || 0) },
    attack: {
      id: attack.id,
      name: attack.name || "Attack",
      targetNumber,
      difficulty,
      damageDice: Math.max(0, Number(attack.damage) || 0),
      damageType,
      effects,
    },
    target: { instanceId: enemy.instanceId, name: enemy.name, defense: Number(enemy.defense || 1) },
    attackRoll: {
      dice: attackRoll.rolls.map((die) => ({ value: die.value, successes: die.successes, critical: die.isCritical, complication: die.isComplication })),
      totalSuccesses: attackRoll.totalSuccesses,
      complications: attackRoll.complications,
    },
    hit,
  };

  if (!hit) return { ...base, totalFinalDamage: 0 };

  const locationSpecific = hasBestiaryLocationSpecificDr(enemy, damageType);
  if (locationSpecific && enemy?.statKind !== "character") {
    return { ...base, error: "creature_hit_location_table_unavailable", needsHitLocationRule: true, totalFinalDamage: 0 };
  }
  const hitLocation = locationSpecific ? rollHitLocationD20() : null;
  const location = hitLocation?.location || "all";
  const damageRoll = rollFalloutD6({ diceCount: Math.max(0, Number(attack.damage) || 0), effects });
  const effectTriggers = Number(damageRoll.totalEffects || 0);
  const piercing = piercingRating(effects);
  const piercingIgnored = piercing * effectTriggers;
  const resistance = getBestiaryResistance(enemy, damageType, location);
  const effectiveDr = resistance >= 9999 ? 9999 : Math.max(0, Number(resistance || 0) - piercingIgnored);
  const finalDamage = resistance >= 9999 ? 0 : Math.max(0, Number(damageRoll.totalDamage || 0) - effectiveDr);
  const stunned = effects.some((effect) => normalizeToken(effect).includes("stun")) && effectTriggers > 0;
  const persistent = effects.some((effect) => normalizeToken(effect).includes("persistent"));

  return {
    ...base,
    hitLocation: location,
    hitLocationLabel: hitLocation?.label || "All",
    hitLocationRoll: hitLocation?.value || null,
    damageType,
    damageRoll: {
      dice: damageRoll.rolls.map((die) => ({ value: die.value, damage: die.damage, effect: die.effect })),
      rawDamage: damageRoll.totalDamage,
      effectTriggers,
    },
    piercingRating: piercing,
    piercingIgnored,
    resistance: resistance >= 9999 ? "immune" : resistance,
    effectiveDr,
    totalFinalDamage: finalDamage,
    stunned,
    persistentRounds: persistent ? effectTriggers : 0,
    criticalInjury: finalDamage >= 5,
  };
}

export function applyCompanionAttackResult(sessionKey, companion, enemyId, result) {
  if (!sessionKey || !companion || !enemyId || !result) return null;
  const store = readStore();
  const combat = store.bySession?.[sessionKey];
  if (!combat) return null;
  let before = null;
  let after = null;
  const enemies = (combat.enemies || []).map((enemy) => {
    if (enemy.instanceId !== enemyId) return enemy;
    before = clone(enemy);
    const current = Math.max(0, Number(enemy?.hp?.current || 0));
    const max = Math.max(0, Number(enemy?.hp?.max || current));
    const damage = Math.max(0, Number(result.totalFinalDamage || 0));
    const nextCurrent = Math.max(0, current - damage);
    after = {
      ...enemy,
      hp: { current: nextCurrent, max },
      combatStatuses: {
        ...(enemy.combatStatuses || {}),
        ...(result.stunned ? { stunned: true } : {}),
        ...(result.persistentRounds > 0 ? { persistent: { rounds: result.persistentRounds, damageType: result.damageType } } : {}),
      },
      defeated: nextCurrent <= 0,
    };
    return after;
  });
  if (!before || !after) return null;

  const action = {
    token: `combat-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "companion_attack",
    at: Date.now(),
    actor: { id: companion.id, name: companion.name || "Companion" },
    target: { instanceId: enemyId, name: before.name, hpBefore: before.hp, hpAfter: after.hp, defeated: after.defeated },
    result: clone(result),
  };
  const allDefeated = enemies.length > 0 && enemies.every((enemy) => enemy.defeated || Number(enemy?.hp?.current || 0) <= 0);
  const nextCombat = {
    ...combat,
    enemies,
    status: allDefeated ? "resolved" : "active",
    lastAction: action,
    log: [...(Array.isArray(combat.log) ? combat.log : []), action].slice(-30),
    updatedAt: Date.now(),
  };
  store.bySession[sessionKey] = nextCombat;
  store.latestSessionKey = sessionKey;
  writeStore(store);
  window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_ACTION_EVENT, { detail: { sessionKey, action, combat: nextCombat } }));
  return { combat: nextCombat, action };
}
