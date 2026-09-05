import {
  rollFalloutD20,
  rollFalloutD6,
  rollHitLocationD20,
} from "./dice.js";
import {
  getDerivedStats,
  getIncomingDamageModifier,
  getTotalResistanceForPart,
} from "./characterMath.js";
import { getTimeOfDay, getWeatherSnapshot } from "./environmentSystem.js";
import {
  BESTIARY_COMBAT_ACTION_EVENT,
  BESTIARY_COMBAT_CHANGED_EVENT,
  BESTIARY_COMBAT_STORAGE_KEY,
} from "./bestiaryCombatContext.js";

const DAMAGE_TYPES = ["physical", "energy", "radiation", "poison"];
const RANGE_DISTANCE = { close: 0, medium: 1, long: 2, extreme: 3 };
export const ENEMY_TARGET_RANGES = ["reach", "close", "medium", "long", "extreme"];

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function normalizeToken(value) {
  return String(value || "").toLowerCase().replace(/[\s_-]/g, "");
}

function normalizeRange(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text || text === "melee" || text.includes("reach")) return "reach";
  if (text === "c" || text.includes("close")) return "close";
  if (text === "m" || text.includes("medium")) return "medium";
  if (text === "l" || text.includes("long")) return "long";
  if (text === "x" || text.includes("extreme")) return "extreme";
  return "close";
}

function rangeAtLeast(targetRange, minimum) {
  const normalized = targetRange === "reach" ? "close" : targetRange;
  return (RANGE_DISTANCE[normalized] ?? 0) >= (RANGE_DISTANCE[minimum] ?? 0);
}

function splitAttackLines(value) {
  return String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDamageType(text) {
  const match = String(text || "").match(/\b(Physical|Energy|Radiation|Poison)\b(?:\s+damage)?/i);
  if (!match) return null;
  const type = match[1].toLowerCase();
  return DAMAGE_TYPES.includes(type) ? type : null;
}

function parseEffects(text) {
  const source = String(text || "");
  const effects = [];
  for (const name of ["Vicious", "Spread", "Stun", "Persistent", "Radioactive", "Breaking", "Burst"]) {
    if (new RegExp(`\\b${name}\\b`, "i").test(source)) effects.push(name);
  }
  const piercingMatch = source.match(/\bPiercing(?:\s+(\d+))?/i);
  if (piercingMatch) effects.push(piercingMatch[1] ? `Piercing ${piercingMatch[1]}` : "Piercing");
  return effects;
}

function parseQualities(text) {
  const source = String(text || "");
  const qualities = [];
  const known = [
    ["Blast", /\bBlast\b/i],
    ["Throwing", /\bThrowing\b/i],
    ["Close Quarters", /\bClose\s+Quarters\b/i],
    ["Inaccurate", /\bInaccurate\b/i],
    ["Two-Handed", /\bTwo[- ]Handed\b/i],
  ];
  for (const [name, pattern] of known) {
    if (pattern.test(source)) qualities.push(name);
  }
  return qualities;
}

function parseAttackLine(line, index) {
  const cleaned = String(line || "").replace(/^•\s*/, "").trim();
  const divider = cleaned.match(/^(.*?)(?::|\s+—\s+)(.*)$/);
  const name = divider?.[1]?.trim() || `Attack ${index + 1}`;
  const body = divider?.[2]?.trim() || cleaned;
  const tnMatch = body.match(/\bTN\s*(\d+)\b/i);
  const damageMatch = body.match(/(\d+)\s*CD\b/i);
  const testMatch = body.match(/\b([A-Z]{1,4}|BODY|MIND)\s*\+\s*([A-Za-z][A-Za-z ]*?)\s*\(TN\s*\d+\)/i);
  const rangeMatch = body.match(/\bRange\s+([CMLX])\b/i);
  const fireRateMatch = body.match(/\bFR\s*(\d+)\b/i);
  const damageType = parseDamageType(body);
  const effects = parseEffects(body);
  const qualities = parseQualities(body);
  const piercingMatch = body.match(/\bPiercing(?:\s+(\d+))?/i);

  return {
    index,
    name,
    sourceText: line,
    targetNumber: tnMatch ? Number(tnMatch[1]) : null,
    damageDice: damageMatch ? Number(damageMatch[1]) : null,
    damageType,
    attribute: testMatch?.[1]?.toUpperCase() || null,
    skillName: testMatch?.[2]?.trim() || null,
    range: rangeMatch ? normalizeRange(rangeMatch[1]) : "reach",
    fireRate: fireRateMatch ? Number(fireRateMatch[1]) : 0,
    effects,
    qualities,
    piercingRating: piercingMatch?.[1] ? Number(piercingMatch[1]) : null,
    piercingUnresolved: Boolean(piercingMatch && !piercingMatch[1]),
    usable: Boolean(tnMatch && damageMatch && damageType),
    missing: [
      !tnMatch ? "TN" : null,
      !damageMatch ? "CD" : null,
      !damageType ? "damageType" : null,
    ].filter(Boolean),
  };
}

export function parseBestiaryAttackProfiles(enemy) {
  return splitAttackLines(enemy?.attacks).map(parseAttackLine);
}

function getAttackCriticalRange(enemy, attack) {
  if (enemy?.statKind !== "character" || !attack?.skillName) return 1;
  const wanted = normalizeToken(attack.skillName);
  const skill = (enemy?.skills || []).find((entry) => normalizeToken(entry?.name) === wanted);
  if (!skill?.tagged) return 1;
  return Math.max(1, Math.min(20, Number(skill?.rating || 1)));
}

function isMeleeAttack(attack) {
  return attack?.range === "reach" || /melee|unarmed/i.test(String(attack?.skillName || ""));
}

function getRangeDifficulty(attack, targetRange) {
  if (isMeleeAttack(attack)) {
    return targetRange === "reach"
      ? { valid: true, range: 0, reach: 0 }
      : { valid: false, range: 0, reach: 0 };
  }

  const idealRange = attack?.range === "reach" ? "close" : (attack?.range || "close");
  const targetBand = targetRange === "reach" ? "close" : targetRange;
  const idealDistance = RANGE_DISTANCE[idealRange] ?? 0;
  const targetDistance = RANGE_DISTANCE[targetBand] ?? 0;
  const range = Math.abs(idealDistance - targetDistance);
  const closeQuarters = (attack?.qualities || []).some((quality) => normalizeToken(quality).includes("closequarters"));
  const reach = targetRange === "reach" && !closeQuarters ? 2 : 0;
  return { valid: true, range, reach };
}

function enemyHasNightVision(enemy) {
  const text = [enemy?.abilities, enemy?.attacks, ...(enemy?.tags || [])].filter(Boolean).join(" | ");
  return /night[- ]?vision|infrared|thermal vision/i.test(text);
}

function getEnvironmentDifficulty(character, enemy, attack, targetRange) {
  if (isMeleeAttack(attack)) return { delta: 0, modifiers: [], time: null, weather: null };
  const totalHours = Number(character?.mapData?.worldTotalHours || 0);
  const regionId = character?.mapData?.regionId || "commonwealth";
  const time = getTimeOfDay(totalHours);
  const weather = getWeatherSnapshot(regionId, totalHours);
  const applied = [];

  if (time.isDark && !enemyHasNightVision(enemy)) {
    applied.push({ id: "darkness_ranged", difficultyDelta: 1, reason: "Darkness impairs normal ranged aiming." });
  }
  if ((weather.id === "fog" || weather.id === "dust") && rangeAtLeast(targetRange, "medium")) {
    applied.push({ id: `${weather.id}_ranged`, difficultyDelta: 1, reason: "Poor visibility obscures the target." });
  }
  if (weather.id === "rain" && rangeAtLeast(targetRange, "long")) {
    applied.push({ id: "rain_ranged", difficultyDelta: 1, reason: "Rain makes long-range aiming harder." });
  }
  if ((weather.id === "wind" || weather.id === "dust") && rangeAtLeast(targetRange, "long")) {
    applied.push({ id: "wind_ranged", difficultyDelta: 1, reason: "Strong wind disrupts long-range shots." });
  }
  if (weather.id === "heat_haze" && rangeAtLeast(targetRange, "long")) {
    applied.push({ id: "heat_haze_ranged", difficultyDelta: 1, reason: "Heat haze distorts distant targets." });
  }

  return {
    delta: applied.reduce((sum, item) => sum + Number(item.difficultyDelta || 0), 0),
    modifiers: applied,
    time,
    weather,
  };
}

function resolveOneDamageHit({ character, derived, rawDamage, damageType, hitLocation, piercingIgnored = 0 }) {
  const incomingModifier = getIncomingDamageModifier(derived, damageType);
  const modifiedIncoming = Math.max(0, Number(rawDamage || 0) + Number(incomingModifier || 0));
  const resistance = getTotalResistanceForPart({
    armor: character?.armor,
    part: hitLocation,
    damageType,
    derived,
  });
  if (resistance >= 9999) {
    return {
      rawDamage: Number(rawDamage || 0), incomingModifier, modifiedIncoming,
      resistance: "immune", effectiveDr: 9999, finalDamage: 0,
    };
  }
  const effectiveDr = Math.max(0, Number(resistance || 0) - Math.max(0, Number(piercingIgnored || 0)));
  return {
    rawDamage: Number(rawDamage || 0),
    incomingModifier,
    modifiedIncoming,
    resistance: Math.max(0, Number(resistance || 0)),
    effectiveDr,
    finalDamage: Math.max(0, modifiedIncoming - effectiveDr),
  };
}

function applyCharacterDamage(character, result) {
  const derived = getDerivedStats(character || {});
  const maxHp = Math.max(1, Number(derived?.maxHp || 1));
  const hpBefore = {
    current: Math.max(0, Number(character?.currentHp || 0)),
    radiation: Math.max(0, Number(character?.radiationHp || 0)),
    max: maxHp,
  };

  const primaryRadiation = result?.damageType === "radiation"
    ? Math.max(0, Number(result?.totalFinalDamage || 0))
    : 0;
  const hpDamage = result?.damageType === "radiation"
    ? 0
    : Math.max(0, Number(result?.totalFinalDamage || 0));
  const radiationDamage = primaryRadiation + Math.max(0, Number(result?.radioactiveFinalDamage || 0));

  const nextRadiation = Math.min(maxHp, hpBefore.radiation + radiationDamage);
  const nextEffectiveMax = Math.max(0, maxHp - nextRadiation);
  const nextCurrent = Math.min(nextEffectiveMax, Math.max(0, hpBefore.current - hpDamage));

  const injuries = { ...(character?.injuries || {}) };
  for (const injury of result?.criticalInjuries || []) {
    const location = injury?.location;
    if (location && Object.prototype.hasOwnProperty.call(injuries, location) && injuries[location] === "normal") {
      injuries[location] = "crippled";
    }
  }

  const statuses = {
    ...(character?.statuses || {}),
    ...(result?.stunned ? { stunned: true } : {}),
    ...(result?.persistentRounds > 0 ? { persistentDamage: true } : {}),
  };

  return {
    nextCharacter: {
      ...character,
      currentHp: String(nextCurrent),
      radiationHp: String(nextRadiation),
      injuries,
      statuses,
    },
    hpBefore,
    hpAfter: {
      current: nextCurrent,
      radiation: nextRadiation,
      max: maxHp,
      effectiveMax: nextEffectiveMax,
    },
  };
}

export function resolveEnemyBestiaryAttack({
  character,
  enemy,
  attack,
  targetRange = "close",
  diceCount = 2,
} = {}) {
  if (!character || !enemy || !attack) return { error: "missing_enemy_attack_data" };
  if (!attack.usable) return { error: "incomplete_attack_profile", attack, missing: attack.missing || [] };

  const rangeInfo = getRangeDifficulty(attack, targetRange);
  if (!rangeInfo.valid) {
    return { error: "target_out_of_melee_reach", attack, targetRange };
  }

  const derived = getDerivedStats(character);
  const environment = getEnvironmentDifficulty(character, enemy, attack, targetRange);
  const difficulty = Math.max(0, Math.min(10,
    Number(derived?.defense || 1) +
    Number(rangeInfo.range || 0) +
    Number(rangeInfo.reach || 0) +
    Number(environment.delta || 0)
  ));
  const criticalRange = getAttackCriticalRange(enemy, attack);
  const attackRoll = rollFalloutD20({
    diceCount: Math.max(1, Math.min(5, Number(diceCount) || 2)),
    targetNumber: Number(attack.targetNumber),
    criticalRange,
    label: `${enemy.name}: ${attack.name}`,
  });
  const hit = attackRoll.totalSuccesses >= difficulty;

  const base = {
    kind: "enemy_attack",
    actor: { instanceId: enemy.instanceId, name: enemy.name, initiative: enemy.initiative },
    attack: clone(attack),
    target: { name: character?.characterName || "Player", defense: Number(derived?.defense || 1) },
    targetRange,
    difficulty,
    difficultyBreakdown: {
      defense: Number(derived?.defense || 1),
      range: Number(rangeInfo.range || 0),
      withinReach: Number(rangeInfo.reach || 0),
      environment: Number(environment.delta || 0),
      environmentModifiers: environment.modifiers,
    },
    environment: { time: environment.time, weather: environment.weather, enemyNightVision: enemyHasNightVision(enemy) },
    criticalRange,
    attackRoll: {
      dice: attackRoll.rolls.map((die) => ({
        value: die.value,
        successes: die.successes,
        critical: die.isCritical,
        complication: die.isComplication,
      })),
      totalSuccesses: attackRoll.totalSuccesses,
      complications: attackRoll.complications,
    },
    hit,
  };

  if (!hit) return { ...base, totalFinalDamage: 0, radioactiveFinalDamage: 0 };

  const hitLocation = rollHitLocationD20();
  const damageRoll = rollFalloutD6({
    diceCount: Number(attack.damageDice || 0),
    effects: attack.effects || [],
  });
  const effectTriggers = Number(damageRoll.totalEffects || 0);
  const piercingIgnored = attack.piercingRating
    ? Math.max(0, Number(attack.piercingRating || 0) * effectTriggers)
    : 0;
  const main = resolveOneDamageHit({
    character, derived,
    rawDamage: damageRoll.totalDamage,
    damageType: attack.damageType,
    hitLocation: hitLocation.location,
    piercingIgnored,
  });

  const spreadHits = (damageRoll.spreadHits || []).map((spread) => {
    const resolved = resolveOneDamageHit({
      character, derived,
      rawDamage: spread.damage,
      damageType: attack.damageType,
      hitLocation: spread.location,
      piercingIgnored,
    });
    return { ...spread, ...resolved };
  });
  const spreadFinalDamage = spreadHits.reduce((sum, spread) => sum + Number(spread.finalDamage || 0), 0);
  const totalFinalDamage = main.finalDamage + spreadFinalDamage;

  const radioactive = (attack.effects || []).some((effect) => normalizeToken(effect).includes("radioactive"));
  let radioactiveFinalDamage = 0;
  let radioactiveResistance = null;
  if (radioactive && effectTriggers > 0) {
    const rad = resolveOneDamageHit({
      character, derived,
      rawDamage: effectTriggers,
      damageType: "radiation",
      hitLocation: hitLocation.location,
      piercingIgnored: 0,
    });
    radioactiveResistance = rad.resistance;
    radioactiveFinalDamage = rad.finalDamage;
  }

  const criticalInjuries = [];
  if (attack.damageType !== "radiation" && main.finalDamage >= 5) {
    criticalInjuries.push({ location: hitLocation.location, damage: main.finalDamage });
  }
  for (const spread of spreadHits) {
    if (attack.damageType !== "radiation" && Number(spread.finalDamage || 0) >= 5) {
      criticalInjuries.push({ location: spread.location, damage: spread.finalDamage });
    }
  }

  const stunned = (attack.effects || []).some((effect) => normalizeToken(effect).includes("stun")) && effectTriggers > 0;
  const persistent = (attack.effects || []).some((effect) => normalizeToken(effect).includes("persistent"));

  return {
    ...base,
    damageType: attack.damageType,
    hitLocation: hitLocation.location,
    hitLocationLabel: hitLocation.label,
    hitLocationRoll: hitLocation.value,
    damageRoll: {
      dice: damageRoll.rolls.map((die) => ({ value: die.value, damage: die.damage, effect: die.effect })),
      rawDamage: damageRoll.totalDamage,
      effectTriggers,
    },
    piercingRating: attack.piercingRating,
    piercingUnresolved: attack.piercingUnresolved,
    piercingIgnored,
    resistance: main.resistance,
    effectiveDr: main.effectiveDr,
    mainFinalDamage: main.finalDamage,
    spreadHits,
    spreadFinalDamage,
    totalFinalDamage,
    radioactiveResistance,
    radioactiveFinalDamage,
    criticalInjuries,
    stunned,
    persistentRounds: persistent ? effectTriggers : 0,
    burstExtraTargets: damageRoll.burstTargets?.length || 0,
  };
}

export function applyResolvedEnemyAttack(character, result) {
  if (!character || !result?.attackRoll || !result?.hit) {
    return {
      nextCharacter: character,
      hpBefore: {
        current: Math.max(0, Number(character?.currentHp || 0)),
        radiation: Math.max(0, Number(character?.radiationHp || 0)),
        max: Math.max(1, Number(getDerivedStats(character || {})?.maxHp || 1)),
      },
      hpAfter: null,
    };
  }
  return applyCharacterDamage(character, result);
}

function readCombatStore() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BESTIARY_COMBAT_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { bySession: parsed.bySession || {}, latestSessionKey: parsed.latestSessionKey || null }
      : { bySession: {}, latestSessionKey: null };
  } catch {
    return { bySession: {}, latestSessionKey: null };
  }
}

function writeCombatStore(store) {
  try {
    window.localStorage.setItem(BESTIARY_COMBAT_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_CHANGED_EVENT));
  } catch {
    // Optional combat persistence.
  }
}

export function recordEnemyTurnAction({ sessionKey, enemy, directive, result = null, hpBefore = null, hpAfter = null }) {
  if (!sessionKey || !enemy) return null;
  const store = readCombatStore();
  const combat = store.bySession?.[sessionKey];
  if (!combat) return null;

  const action = {
    token: `combat-action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: result?.attackRoll ? "enemy_attack" : "enemy_action",
    at: Date.now(),
    actor: { instanceId: enemy.instanceId, name: enemy.name },
    target: {
      name: result?.target?.name || "Player",
      hpBefore: hpBefore || null,
      hpAfter: hpAfter || null,
    },
    directive: clone(directive || {}),
    result: result ? clone(result) : null,
  };

  const nextCombat = {
    ...combat,
    round: Math.max(1, Number(combat.round || 1)) + 1,
    lastAction: action,
    log: [...(Array.isArray(combat.log) ? combat.log : []), action].slice(-30),
    updatedAt: Date.now(),
  };
  store.bySession[sessionKey] = nextCombat;
  store.latestSessionKey = sessionKey;
  writeCombatStore(store);

  window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_ACTION_EVENT, {
    detail: { sessionKey, action, combat: nextCombat },
  }));
  return { action, combat: nextCombat };
}

export async function requestEnemyTurnDirective({
  sessionKey,
  combat,
  enemy,
  character,
  targetRange,
  language,
  location = null,
} = {}) {
  const attacks = parseBestiaryAttackProfiles(enemy);
  const response = await fetch("/api/combat-gm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "npc_turn",
      sessionKey,
      language,
      character: {
        name: character?.characterName || "Player",
        hp: Number(character?.currentHp || 0),
        defense: Number(getDerivedStats(character || {})?.defense || 1),
        initiative: Number(getDerivedStats(character || {})?.initiative || 0),
      },
      location,
      combat: {
        status: combat?.status || "active",
        round: Number(combat?.round || 1),
        currentTargetRange: targetRange === "reach" ? "close" : targetRange,
        engineInstruction: "Use the supplied activeEnemy.weapons only. Prefer attack when one is tactically legal. If no attack is sensible from the current range, move toward a legal range. weaponIndex must point to one supplied attack; never invent a weapon or attack.",
        activeEnemy: {
          id: enemy.instanceId,
          name: enemy.name,
          hp: enemy.hp,
          defense: enemy.defense,
          initiative: enemy.initiative,
          abilities: enemy.abilities,
          weapons: attacks.map((attack) => ({
            name: attack.name,
            skill: attack.skillName || "Melee Weapons",
            damage: attack.damageDice || 1,
            damageType: attack.damageType || "physical",
            rate: attack.fireRate || 0,
            range: attack.range === "reach" ? "close" : attack.range,
            effects: attack.effects || [],
            sourceIndex: attack.index,
            usable: attack.usable,
          })),
        },
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Combat GM request failed");
  return { directive: payload, attacks };
}
