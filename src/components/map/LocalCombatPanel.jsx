import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  advanceTurn,
  applyDamageToTarget,
  createCombatState,
  resolveDamage,
  rollAttack,
} from "../../utils/combatEngine.js";
import { rerollOneFalloutD20, rollFalloutD20 } from "../../utils/dice.js";
import "./localCombatPanel.css";
import "./localCombatActions.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const COMBAT_STORAGE_KEY = "fallout_pipboy_local_combat_v1";
const RESOURCE_STORAGE_KEY = "fallout_pipboy_local_check_resources_v1";
const MAX_AP = 6;
const RANGES = ["close", "medium", "long", "extreme"];
const LOCATIONS = ["", "head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];

const TEXT = {
  en: {
    combat: "COMBAT", start: "START COMBAT", gmEncounter: "GM ENCOUNTER", end: "END COMBAT", addEnemy: "ADD ENEMY",
    name: "NAME", hp: "HP", defense: "DEF", dr: "DR", initiative: "INIT", range: "RANGE", round: "ROUND", turn: "TURN",
    attack: "ATTACK", next: "END TURN", weapon: "WEAPON", target: "TARGET", location: "HIT LOCATION", random: "RANDOM",
    close: "CLOSE", medium: "MEDIUM", long: "LONG", extreme: "EXTREME", hit: "HIT", miss: "MISS", damage: "DAMAGE",
    raw: "RAW", armor: "DR", injury: "INJURY", noWeapons: "No weapons on character sheet", hint: "Combat math is resolved by the app. Auto GM chooses NPC actions.",
    remove: "REMOVE", gmThinking: "AUTO GM THINKING...", actions: "PLAYER ACTIONS", major: "MAJOR", minor: "MINOR", ap: "AP",
    aim: "AIM", moveCloser: "MOVE CLOSER", moveFarther: "MOVE FARTHER", defend: "DEFEND", sprintCloser: "SPRINT CLOSER",
    sprintFarther: "SPRINT FARTHER", firstAid: "FIRST AID", buyMajor: "BUY +1 MAJOR", buyMinor: "BUY +1 MINOR", used: "USED",
    attackDice: "ATTACK D20", cost: "COST", secondMajor: "+1 Difficulty: second Major Action", firstAidNote: "First Aid test resolved; healing is not auto-applied until the exact healing rule is encoded.",
  },
  ru: {
    combat: "БОЙ", start: "НАЧАТЬ БОЙ", gmEncounter: "БОЙ ОТ GM", end: "ЗАВЕРШИТЬ БОЙ", addEnemy: "ДОБАВИТЬ ПРОТИВНИКА",
    name: "ИМЯ", hp: "ОЗ", defense: "ЗАЩ", dr: "СОПР", initiative: "ИНИЦ", range: "ДИСТАНЦИЯ", round: "РАУНД", turn: "ХОД",
    attack: "АТАКОВАТЬ", next: "ЗАВЕРШИТЬ ХОД", weapon: "ОРУЖИЕ", target: "ЦЕЛЬ", location: "ЗОНА ПОПАДАНИЯ", random: "СЛУЧАЙНО",
    close: "БЛИЗКО", medium: "СРЕДНЕ", long: "ДАЛЕКО", extreme: "ЭКСТРЕМАЛЬНО", hit: "ПОПАДАНИЕ", miss: "ПРОМАХ", damage: "УРОН",
    raw: "ДО DR", armor: "DR", injury: "ТРАВМА", noWeapons: "В листе персонажа нет оружия", hint: "Математику боя считает приложение. Auto GM выбирает действия NPC.",
    remove: "УДАЛИТЬ", gmThinking: "AUTO GM ДУМАЕТ...", actions: "ДЕЙСТВИЯ ИГРОКА", major: "ОСНОВНОЕ", minor: "МАЛОЕ", ap: "ОД",
    aim: "ПРИЦЕЛИТЬСЯ", moveCloser: "ПОДОЙТИ", moveFarther: "ОТОЙТИ", defend: "ЗАЩИЩАТЬСЯ", sprintCloser: "РЫВОК БЛИЖЕ",
    sprintFarther: "РЫВОК ДАЛЬШЕ", firstAid: "ПЕРВАЯ ПОМОЩЬ", buyMajor: "КУПИТЬ +1 ОСНОВНОЕ", buyMinor: "КУПИТЬ +1 МАЛОЕ", used: "ИСПОЛЬЗОВАНО",
    attackDice: "D20 АТАКИ", cost: "ЦЕНА", secondMajor: "+1 к сложности: второе основное действие", firstAidNote: "Проверка первой помощи выполнена; лечение не применяется автоматически, пока точное правило лечения не внесено в движок.",
  },
  uk: {
    combat: "БІЙ", start: "ПОЧАТИ БІЙ", gmEncounter: "БІЙ ВІД GM", end: "ЗАВЕРШИТИ БІЙ", addEnemy: "ДОДАТИ ПРОТИВНИКА",
    name: "ІМ'Я", hp: "ОЗ", defense: "ЗАХ", dr: "ОПІР", initiative: "ІНІЦ", range: "ДИСТАНЦІЯ", round: "РАУНД", turn: "ХІД",
    attack: "АТАКУВАТИ", next: "ЗАВЕРШИТИ ХІД", weapon: "ЗБРОЯ", target: "ЦІЛЬ", location: "МІСЦЕ ВЛУЧАННЯ", random: "ВИПАДКОВО",
    close: "БЛИЗЬКО", medium: "СЕРЕДНЬО", long: "ДАЛЕКО", extreme: "ЕКСТРЕМАЛЬНО", hit: "ВЛУЧАННЯ", miss: "ПРОМАХ", damage: "ШКОДА",
    raw: "ДО DR", armor: "DR", injury: "ТРАВМА", noWeapons: "У листі персонажа немає зброї", hint: "Математику бою рахує застосунок. Auto GM обирає дії NPC.",
    remove: "ВИДАЛИТИ", gmThinking: "AUTO GM ДУМАЄ...", actions: "ДІЇ ГРАВЦЯ", major: "ОСНОВНА", minor: "МАЛА", ap: "ОД",
    aim: "ПРИЦІЛИТИСЯ", moveCloser: "НАБЛИЗИТИСЯ", moveFarther: "ВІДІЙТИ", defend: "ЗАХИЩАТИСЯ", sprintCloser: "РИВОК БЛИЖЧЕ",
    sprintFarther: "РИВОК ДАЛІ", firstAid: "ПЕРША ДОПОМОГА", buyMajor: "КУПИТИ +1 ОСНОВНУ", buyMinor: "КУПИТИ +1 МАЛУ", used: "ВИКОРИСТАНО",
    attackDice: "D20 АТАКИ", cost: "ЦІНА", secondMajor: "+1 до складності: друга основна дія", firstAidNote: "Перевірку першої допомоги виконано; лікування не застосовується автоматично, доки точне правило не внесене в рушій.",
  },
  pl: {
    combat: "WALKA", start: "ROZPOCZNIJ WALKĘ", gmEncounter: "WALKA OD GM", end: "ZAKOŃCZ WALKĘ", addEnemy: "DODAJ PRZECIWNIKA",
    name: "NAZWA", hp: "PW", defense: "OBR", dr: "ODP", initiative: "INIC", range: "DYSTANS", round: "RUNDA", turn: "TURA",
    attack: "ATAKUJ", next: "ZAKOŃCZ TURĘ", weapon: "BROŃ", target: "CEL", location: "MIEJSCE TRAFIENIA", random: "LOSOWO",
    close: "BLISKO", medium: "ŚREDNIO", long: "DALEKO", extreme: "EKSTREMALNIE", hit: "TRAFIENIE", miss: "PUDŁO", damage: "OBRAŻENIA",
    raw: "PRZED DR", armor: "DR", injury: "URAZ", noWeapons: "Brak broni na karcie postaci", hint: "Matematykę walki liczy aplikacja. Auto GM wybiera działania NPC.",
    remove: "USUŃ", gmThinking: "AUTO GM MYŚLI...", actions: "AKCJE GRACZA", major: "GŁÓWNA", minor: "MNIEJSZA", ap: "PA",
    aim: "CELOWANIE", moveCloser: "PODEJDŹ", moveFarther: "ODSUŃ SIĘ", defend: "OBRONA", sprintCloser: "SPRINT BLIŻEJ",
    sprintFarther: "SPRINT DALEJ", firstAid: "PIERWSZA POMOC", buyMajor: "KUP +1 GŁÓWNĄ", buyMinor: "KUP +1 MNIEJSZĄ", used: "UŻYTO",
    attackDice: "D20 ATAKU", cost: "KOSZT", secondMajor: "+1 trudności: druga akcja główna", firstAidNote: "Test pierwszej pomocy rozstrzygnięto; leczenie nie jest automatyczne, dopóki dokładna zasada nie zostanie zakodowana.",
  },
};

function readCharacter() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.data || null : null;
  } catch { return null; }
}

function readCombatStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMBAT_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

function writeCombatStore(store) {
  try { localStorage.setItem(COMBAT_STORAGE_KEY, JSON.stringify(store)); } catch { /* optional */ }
}

function readResources(character) {
  try {
    const saved = JSON.parse(localStorage.getItem(RESOURCE_STORAGE_KEY) || "null");
    const sheetAp = Number(character?.actionPoints ?? character?.ap ?? character?.AP ?? 0);
    return Math.max(0, Math.min(MAX_AP, Number.isFinite(saved?.ap) ? Number(saved.ap) : sheetAp));
  } catch { return 0; }
}

function saveAp(ap) {
  try {
    const saved = JSON.parse(localStorage.getItem(RESOURCE_STORAGE_KEY) || "{}") || {};
    localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify({ ...saved, ap: Math.max(0, Math.min(MAX_AP, Number(ap) || 0)) }));
  } catch { /* optional */ }
}

function normalizePlayer(character) {
  if (!character) return null;
  return {
    ...character,
    id: "player",
    side: "player",
    name: character.characterName || character.name || "Player",
    hp: {
      current: Number(character.currentHp ?? character.hpCurrent ?? character.hp?.current ?? 0),
      max: Number(character.maxHp ?? character.hpMax ?? character.hp?.max ?? character.currentHp ?? 0),
    },
    defense: Number(character.defenseOverride ?? character.defense ?? 1),
  };
}

function makeEnemy(index) {
  return {
    id: `enemy-${Date.now()}-${index}`,
    name: `Enemy ${index + 1}`,
    hp: { current: 10, max: 10 }, defense: 1, initiative: 10, range: "close",
    special: { S: 5, P: 5, E: 5, C: 5, I: 5, A: 5, L: 5 },
    skills: { "Small Guns": { rank: 1, bonus: 0, tagged: false }, Athletics: { rank: 1, bonus: 0, tagged: false } },
    resistances: { physical: 0, energy: 0, radiation: 0, poison: 0 }, weapons: [],
  };
}

function normalizeWeapon(weapon = {}) {
  return {
    ...weapon,
    damage: Number(weapon.damage || 0), rate: Number(weapon.rate || 0),
    range: String(weapon.range || "close").toLowerCase(),
    damageType: String(weapon.damageType || weapon.damage_type || "physical").toLowerCase(),
    effects: weapon.effects || weapon.damageEffects || [],
  };
}

function dispatchCombatEvent(text, payload) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pip2d20-combat-event", { detail: { text, payload } }));
}

function rangeShift(value, delta) {
  const index = Math.max(0, RANGES.indexOf(value));
  return RANGES[Math.max(0, Math.min(RANGES.length - 1, index + delta))];
}

function attackDiceCost(count) {
  return count <= 2 ? 0 : count === 3 ? 1 : count === 4 ? 3 : 6;
}

function freshTurn(state) {
  if (!state?.combatants?.length) return state;
  const actor = state.combatants[state.turnIndex];
  let combatants = state.combatants;
  if (actor?.defenseBonus) {
    combatants = combatants.map((c) => c.id === actor.id ? { ...c, defense: Math.max(0, Number(c.defense || 0) - Number(c.defenseBonus || 0)), defenseBonus: 0 } : c);
  }
  return {
    ...state,
    combatants,
    turnActions: { actorId: actor?.id || null, round: state.round, majorUsed: 0, minorUsed: 0, majorLimit: 1, minorLimit: 1, aim: false },
  };
}

function rollSkill(actor, attribute, skillName, difficulty) {
  const skill = actor?.skills?.[skillName] || {};
  const special = actor?.special || actor?.SPECIAL || {};
  const targetNumber = Math.max(0, Math.min(20, Number(special?.[attribute] || 0) + Number(skill.rank || 0) + Number(skill.bonus || 0)));
  const criticalRange = skill.tagged ? Math.max(1, Number(skill.rank || 1)) : 1;
  const roll = rollFalloutD20({ diceCount: 2, targetNumber, criticalRange, label: `${attribute} + ${skillName}` });
  return { roll, difficulty, passed: roll.totalSuccesses >= difficulty, generatedAp: Math.max(0, roll.totalSuccesses - difficulty) };
}

export default function LocalCombatPanel({ language = "en", sessionKey = "local", sectorKey = "sector", persistent = false, disabled = false, location = null }) {
  const tx = TEXT[language] || TEXT.en;
  const character = useMemo(() => readCharacter(), []);
  const player = useMemo(() => normalizePlayer(character), [character]);
  const weapons = useMemo(() => (character?.weapons || []).map(normalizeWeapon), [character]);
  const storageKey = `${sessionKey}`;
  const npcHandledRef = useRef("");

  const [enemyDrafts, setEnemyDrafts] = useState(() => [makeEnemy(0)]);
  const [combat, setCombat] = useState(() => readCombatStore()?.[storageKey]?.combat || null);
  const [weaponIndex, setWeaponIndex] = useState(0);
  const [targetId, setTargetId] = useState("");
  const [targetRange, setTargetRange] = useState("close");
  const [chosenLocation, setChosenLocation] = useState("");
  const [attackDice, setAttackDice] = useState(2);
  const [lastAttack, setLastAttack] = useState(() => readCombatStore()?.[storageKey]?.lastAttack || null);
  const [gmBusy, setGmBusy] = useState(false);
  const [gmNarration, setGmNarration] = useState("");
  const [gmError, setGmError] = useState("");

  useEffect(() => {
    const store = readCombatStore();
    let changed = false;
    for (const [key, saved] of Object.entries(store)) {
      if (saved?.temporary && saved?.sectorKey !== sectorKey) { delete store[key]; changed = true; }
    }
    if (changed) writeCombatStore(store);
    setCombat(store?.[storageKey]?.combat || null);
    setLastAttack(store?.[storageKey]?.lastAttack || null);
    setGmNarration(store?.[storageKey]?.gmNarration || "");
    npcHandledRef.current = "";
  }, [storageKey, sectorKey]);

  function persistCombat(nextCombat, attack = lastAttack, narration = gmNarration) {
    const store = readCombatStore();
    if (!nextCombat) delete store[storageKey];
    else {
      store[storageKey] = { combat: nextCombat, lastAttack: attack || null, gmNarration: narration || "", persistent, temporary: !persistent, sectorKey: persistent ? null : sectorKey, updatedAt: Date.now() };
    }
    writeCombatStore(store);
    if (nextCombat) saveAp(nextCombat.groupAp);
    setCombat(nextCombat);
  }

  async function callCombatGm(mode, payload = {}) {
    setGmBusy(true); setGmError("");
    try {
      const response = await fetch("/api/combat-gm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, character, combat: payload.combat ?? combat, language, location, event: payload.event || null }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Combat GM ${response.status}`);
      return data;
    } catch (error) { setGmError(error?.message || "Combat GM error"); return null; }
    finally { setGmBusy(false); }
  }

  async function narrateResolved(event, nextCombat) {
    const result = await callCombatGm("narrate_result", { event, combat: nextCombat });
    if (result?.narration) { setGmNarration(result.narration); persistCombat(nextCombat, lastAttack, result.narration); }
  }

  function patchEnemy(index, patch) {
    setEnemyDrafts((current) => current.map((enemy, i) => i === index ? { ...enemy, ...patch } : enemy));
  }

  function buildCombatFromEnemies(inputEnemies) {
    const enemies = inputEnemies.map((enemy, index) => ({
      ...enemy, id: enemy.id || `enemy-${index + 1}`,
      hp: { current: Math.max(1, Number(enemy.hp?.current ?? enemy.hp ?? 1)), max: Math.max(1, Number(enemy.hp?.max ?? enemy.hp?.current ?? enemy.hp ?? 1)) },
      defense: Math.max(0, Number(enemy.defense || 1)), initiative: Number(enemy.initiative || 0), range: RANGES.includes(enemy.range) ? enemy.range : "close",
      resistances: { physical: Math.max(0, Number(enemy.resistances?.physical || 0)), energy: Math.max(0, Number(enemy.resistances?.energy ?? enemy.resistances?.physical ?? 0)), radiation: Math.max(0, Number(enemy.resistances?.radiation || 0)), poison: Math.max(0, Number(enemy.resistances?.poison || 0)) },
      weapons: (enemy.weapons || []).map(normalizeWeapon),
    }));
    const next = freshTurn(createCombatState({ player, enemies, groupAp: readResources(character) }));
    persistCombat(next, null); setTargetId(enemies[0]?.id || ""); setLastAttack(null); setAttackDice(2); npcHandledRef.current = ""; return next;
  }

  function startCombat() {
    if (!player || disabled) return;
    const next = buildCombatFromEnemies(enemyDrafts);
    dispatchCombatEvent(`[COMBAT ENGINE] Combat started. Initiative: ${next.combatants.map((c) => `${c.name || c.id} ${c.initiative}`).join(", ")}.`, { type: "combat_start", combat: next });
  }

  async function startGmEncounter() {
    if (!player || disabled || gmBusy) return;
    const result = await callCombatGm("create_encounter", { combat: null });
    if (!result?.enemies?.length) return;
    setEnemyDrafts(result.enemies); if (result.narration) setGmNarration(result.narration);
    const next = buildCombatFromEnemies(result.enemies); persistCombat(next, null, result.narration || "");
  }

  function endCombat() {
    if (disabled) return;
    dispatchCombatEvent("[COMBAT ENGINE] Combat ended.", { type: "combat_end", combat });
    persistCombat(null, null, ""); setLastAttack(null); setGmNarration(""); npcHandledRef.current = "";
  }

  function nextTurnFrom(state) {
    const next = freshTurn(advanceTurn(state));
    persistCombat(next); npcHandledRef.current = ""; setAttackDice(2);
    const nextActor = next.combatants?.[next.turnIndex];
    dispatchCombatEvent(`[COMBAT ENGINE] Round ${next.round}, turn: ${nextActor?.name || nextActor?.id}.`, { type: "turn", combat: next, active: nextActor });
    return next;
  }

  function patchTurn(state, patch) {
    const next = { ...state, turnActions: { ...(state.turnActions || {}), ...patch } };
    persistCombat(next); return next;
  }

  function changeRange(delta, major = false) {
    if (!combat) return;
    const turn = combat.turnActions || {};
    if (major ? turn.majorUsed >= turn.majorLimit : turn.minorUsed >= turn.minorLimit) return;
    const steps = major ? delta * 2 : delta;
    const next = {
      ...combat,
      combatants: combat.combatants.map((c) => c.side === "enemy" && !c.defeated ? { ...c, range: rangeShift(c.range || "close", steps) } : c),
      turnActions: { ...turn, majorUsed: turn.majorUsed + (major ? 1 : 0), minorUsed: turn.minorUsed + (major ? 0 : 1) },
    };
    persistCombat(next);
    const liveTarget = next.combatants.find((c) => c.id === (targetId || selectedTargetId));
    if (liveTarget?.range) setTargetRange(liveTarget.range);
    dispatchCombatEvent(`[COMBAT ENGINE] Player ${major ? "sprinted" : "moved"}; relative ranges updated.`, { type: major ? "player_sprint" : "player_move", combat: next });
  }

  function aim() {
    if (!combat) return;
    const turn = combat.turnActions || {};
    if (turn.minorUsed >= turn.minorLimit) return;
    patchTurn(combat, { minorUsed: turn.minorUsed + 1, aim: true });
  }

  function buyExtraMinor() {
    if (!combat) return;
    const turn = combat.turnActions || {};
    if (turn.minorLimit >= 2 || combat.groupAp < 1) return;
    persistCombat({ ...combat, groupAp: combat.groupAp - 1, turnActions: { ...turn, minorLimit: 2 } });
  }

  function buyExtraMajor() {
    if (!combat) return;
    const turn = combat.turnActions || {};
    if (turn.majorLimit >= 2 || combat.groupAp < 2) return;
    persistCombat({ ...combat, groupAp: combat.groupAp - 2, turnActions: { ...turn, majorLimit: 2 } });
  }

  async function defend() {
    if (!combat || gmBusy) return;
    const turn = combat.turnActions || {};
    if (turn.majorUsed >= turn.majorLimit) return;
    const actor = combat.combatants.find((c) => c.id === "player");
    const secondPenalty = turn.majorUsed >= 1 ? 1 : 0;
    const result = rollSkill(actor, "A", "Athletics", Number(actor.defense || 1) + secondPenalty);
    let groupAp = Math.min(MAX_AP, combat.groupAp + result.generatedAp);
    const next = {
      ...combat, groupAp,
      combatants: combat.combatants.map((c) => c.id === "player" && result.passed ? { ...c, defense: Number(c.defense || 1) + 1, defenseBonus: 1 } : c),
      turnActions: { ...turn, majorUsed: turn.majorUsed + 1 },
    };
    persistCombat(next);
    const event = { type: "player_defend", passed: result.passed, roll: result.roll, difficulty: result.difficulty };
    dispatchCombatEvent("[COMBAT ENGINE RESULT] Player Defend action resolved.", { ...event, combat: next });
    await narrateResolved(event, next);
  }

  async function firstAid() {
    if (!combat || gmBusy) return;
    const turn = combat.turnActions || {};
    if (turn.majorUsed >= turn.majorLimit) return;
    const actor = combat.combatants.find((c) => c.id === "player");
    const secondPenalty = turn.majorUsed >= 1 ? 1 : 0;
    const result = rollSkill(actor, "I", "Medicine", 1 + secondPenalty);
    const next = { ...combat, groupAp: Math.min(MAX_AP, combat.groupAp + result.generatedAp), turnActions: { ...turn, majorUsed: turn.majorUsed + 1 } };
    persistCombat(next);
    const event = { type: "player_first_aid", passed: result.passed, roll: result.roll, difficulty: result.difficulty, note: tx.firstAidNote };
    dispatchCombatEvent("[COMBAT ENGINE RESULT] First Aid test resolved; HP was not changed automatically.", { ...event, combat: next });
    await narrateResolved(event, next);
  }

  async function playerAttack() {
    if (!combat || disabled || !weapons.length || gmBusy) return;
    const turn = combat.turnActions || {};
    if (turn.majorUsed >= turn.majorLimit) return;
    const attacker = combat.combatants.find((c) => c.id === "player") || player;
    const target = combat.combatants.find((c) => c.id === (targetId || selectedTargetId) && c.side === "enemy" && !c.defeated);
    const weapon = weapons[weaponIndex];
    if (!attacker || !target || !weapon) return;

    const diceCost = attackDiceCost(attackDice);
    const canPayFromPool = diceCost <= combat.groupAp;
    const canGiveGmAp = diceCost > 0 && combat.groupAp === 0;
    if (diceCost > 0 && !canPayFromPool && !canGiveGmAp) return;

    const secondPenalty = turn.majorUsed >= 1 ? 1 : 0;
    let attackResult = rollAttack({ attacker, target, weapon, targetRange: target.range || targetRange, withinReach: false, chosenLocation: Boolean(chosenLocation), diceCount: attackDice });
    if (turn.aim) {
      const rerollIndex = attackResult.roll.rolls.findIndex((die) => die.successes === 0);
      if (rerollIndex >= 0) {
        const rerolled = rerollOneFalloutD20(attackResult.roll, rerollIndex, { targetNumber: attackResult.check.targetNumber, criticalRange: attackResult.check.criticalRange, label: attackResult.roll.label });
        attackResult = { ...attackResult, roll: rerolled };
      }
    }
    const effectiveDifficulty = attackResult.check.difficulty + secondPenalty;
    attackResult = { ...attackResult, check: { ...attackResult.check, difficulty: effectiveDifficulty }, passed: attackResult.roll.totalSuccesses >= effectiveDifficulty, generatedAp: Math.max(0, attackResult.roll.totalSuccesses - effectiveDifficulty) };

    let groupAp = canPayFromPool ? combat.groupAp - diceCost : combat.groupAp;
    let gmAp = canGiveGmAp ? Number(combat.gmAp || 0) + diceCost : Number(combat.gmAp || 0);
    groupAp = Math.min(MAX_AP, groupAp + attackResult.generatedAp);
    let damageResult = null; let applied = null;
    let nextCombat = { ...combat, groupAp, gmAp, turnActions: { ...turn, majorUsed: turn.majorUsed + 1, aim: false } };
    if (attackResult.passed) {
      damageResult = resolveDamage({ weapon, target, location: chosenLocation || null });
      applied = applyDamageToTarget(target, damageResult);
      nextCombat = { ...nextCombat, combatants: nextCombat.combatants.map((c) => c.id === target.id ? { ...c, hp: applied.hp, defeated: applied.defeated, dying: applied.dying, injury: applied.injury || c.injury } : c) };
    }
    const card = { side: "player", attackResult, damageResult, applied, weapon, targetId: target.id, targetName: target.name || target.id, range: target.range || targetRange, chosenLocation, diceCost, secondMajorPenalty: secondPenalty };
    setLastAttack(card); persistCombat(nextCombat, card);
    const event = { type: "player_attack", card };
    dispatchCombatEvent("[COMBAT ENGINE RESULT] Player attack resolved by the engine.", { ...event, combat: nextCombat });
    await narrateResolved(event, nextCombat);
  }

  async function resolveNpcTurn(state, actor, directive) {
    let nextCombat = state; let event = { type: "npc_action", actorId: actor.id, action: directive.action };
    if (directive.narration) setGmNarration(directive.narration);
    if (directive.action === "attack") {
      const target = state.combatants.find((c) => c.id === "player");
      const weapon = (actor.weapons || [])[Number(directive.weaponIndex || 0)] || actor.weapons?.[0];
      if (target && weapon) {
        const attackResult = rollAttack({ attacker: actor, target, weapon, targetRange: directive.targetRange || actor.range || "close", withinReach: false, chosenLocation: Boolean(directive.chosenLocation), diceCount: 2 });
        let damageResult = null; let applied = null;
        if (attackResult.passed) {
          damageResult = resolveDamage({ weapon, target, location: directive.chosenLocation || null });
          applied = applyDamageToTarget(target, damageResult);
          nextCombat = { ...state, combatants: state.combatants.map((c) => c.id === target.id ? { ...c, hp: applied.hp, defeated: applied.defeated, dying: applied.dying, injury: applied.injury || c.injury } : c) };
        }
        const card = { side: "enemy", attackerId: actor.id, attackerName: actor.name, attackResult, damageResult, applied, weapon, targetId: "player", targetName: target.name || "Player", range: directive.targetRange || actor.range || "close", chosenLocation: directive.chosenLocation || "" };
        setLastAttack(card); persistCombat(nextCombat, card, directive.narration || gmNarration); event = { type: "npc_attack", card };
      }
    } else if (directive.action === "move") {
      nextCombat = { ...state, combatants: state.combatants.map((c) => c.id === actor.id ? { ...c, range: directive.moveToRange || directive.targetRange || c.range || "close" } : c) };
      persistCombat(nextCombat, lastAttack, directive.narration || gmNarration); event = { type: "npc_move", actorId: actor.id, range: directive.moveToRange || directive.targetRange };
    } else if (directive.action === "defend") {
      const result = rollSkill(actor, "A", "Athletics", Number(actor.defense || 1));
      nextCombat = { ...state, combatants: state.combatants.map((c) => c.id === actor.id && result.passed ? { ...c, defense: Number(c.defense || 1) + 1, defenseBonus: 1 } : c) };
      persistCombat(nextCombat, lastAttack, directive.narration || gmNarration); event = { type: "npc_defend", actorId: actor.id, passed: result.passed, roll: result.roll };
    } else if (directive.action === "aim") {
      nextCombat = { ...state, combatants: state.combatants.map((c) => c.id === actor.id ? { ...c, aimed: true } : c) };
      persistCombat(nextCombat, lastAttack, directive.narration || gmNarration); event = { type: "npc_aim", actorId: actor.id };
    } else event = { type: "npc_pass", actorId: actor.id };
    dispatchCombatEvent("[COMBAT ENGINE RESULT] NPC action resolved by the engine.", { ...event, combat: nextCombat });
    await narrateResolved(event, nextCombat); nextTurnFrom(nextCombat);
  }

  const active = combat?.combatants?.[combat.turnIndex] || null;
  const enemies = (combat?.combatants || []).filter((c) => c.side === "enemy");
  const selectedTargetId = targetId || enemies.find((enemy) => !enemy.defeated)?.id || enemies[0]?.id || "";
  const turn = combat?.turnActions || {};
  const isPlayerTurn = active?.id === "player";
  const canMajor = isPlayerTurn && turn.majorUsed < turn.majorLimit;
  const canMinor = isPlayerTurn && turn.minorUsed < turn.minorLimit;
  const diceCost = attackDiceCost(attackDice);
  const canAffordDice = diceCost <= Number(combat?.groupAp || 0) || (diceCost > 0 && Number(combat?.groupAp || 0) === 0);

  useEffect(() => {
    if (!combat || !active || active.side !== "enemy" || active.defeated || disabled || gmBusy) return;
    const key = `${combat.round}:${combat.turnIndex}:${active.id}`;
    if (npcHandledRef.current === key) return;
    npcHandledRef.current = key;
    (async () => {
      const directive = await callCombatGm("npc_turn", { combat });
      if (!directive) { npcHandledRef.current = ""; return; }
      await resolveNpcTurn(combat, active, directive);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat?.round, combat?.turnIndex, active?.id, active?.side, disabled]);

  return (
    <section className="pip-local-combat">
      <div className="pip-local-combat__head">
        <div><div className="pip-local-combat__eyebrow">{tx.combat} // AUTO GM + 2D20 ENGINE</div><strong>{combat ? `${tx.round} ${combat.round} · ${tx.turn}: ${active?.name || active?.id || "-"}` : tx.hint}</strong></div>
        {combat ? <button type="button" className="pip-btn" onClick={endCombat} disabled={disabled || gmBusy}>{tx.end}</button> : null}
      </div>
      {gmBusy ? <div className="pip-local-combat__warning">{tx.gmThinking}</div> : null}
      {gmError ? <div className="pip-local-combat__warning">{gmError}</div> : null}
      {gmNarration ? <div className="pip-local-combat__gm"><strong>AUTO GM</strong><span>{gmNarration}</span></div> : null}

      {!combat ? (
        <div className="pip-local-combat__setup">
          <div className="pip-local-combat__actions"><button type="button" className="pip-action-button" onClick={startGmEncounter} disabled={disabled || !player || gmBusy}>{tx.gmEncounter}</button><button type="button" className="pip-btn" onClick={startCombat} disabled={disabled || !player || gmBusy}>{tx.start}</button></div>
          {enemyDrafts.map((enemy, index) => <div className="pip-local-combat__enemy-edit" key={enemy.id}>
            <input value={enemy.name} onChange={(e) => patchEnemy(index, { name: e.target.value })} aria-label={tx.name} />
            <label>{tx.hp}<input type="number" min="1" value={enemy.hp.current} onChange={(e) => patchEnemy(index, { hp: { current: Number(e.target.value), max: Number(e.target.value) } })} /></label>
            <label>{tx.defense}<input type="number" min="0" value={enemy.defense} onChange={(e) => patchEnemy(index, { defense: Number(e.target.value) })} /></label>
            <label>{tx.dr}<input type="number" min="0" value={enemy.resistances.physical} onChange={(e) => patchEnemy(index, { resistances: { ...enemy.resistances, physical: Number(e.target.value), energy: Number(e.target.value) } })} /></label>
            <label>{tx.initiative}<input type="number" value={enemy.initiative} onChange={(e) => patchEnemy(index, { initiative: Number(e.target.value) })} /></label>
            <button type="button" className="pip-btn" onClick={() => setEnemyDrafts((current) => current.filter((_, i) => i !== index))} disabled={enemyDrafts.length <= 1}>{tx.remove}</button>
          </div>)}
          <button type="button" className="pip-btn" onClick={() => setEnemyDrafts((current) => [...current, makeEnemy(current.length)])}>{tx.addEnemy}</button>
        </div>
      ) : <>
        <div className="pip-local-combat__combatants">{combat.combatants.map((c, index) => <div key={c.id} className={`pip-local-combat__combatant${index === combat.turnIndex ? " is-active" : ""}${c.defeated ? " is-defeated" : ""}`}><strong>{c.name || c.id}</strong><span>{tx.initiative}: {c.initiative}</span><span>{tx.hp}: {c.hp?.current ?? c.currentHp ?? "-"}/{c.hp?.max ?? c.maxHp ?? "-"}</span><span>{tx.defense}: {c.defense ?? 1}</span>{c.side === "enemy" ? <span>{tx.range}: {tx[c.range] || c.range}</span> : null}</div>)}</div>

        {isPlayerTurn ? <div className="pip-local-combat__turn-actions">
          <div className="pip-local-combat__turn-head"><strong>{tx.actions}</strong><span>{tx.ap}: {combat.groupAp}/{MAX_AP} · GM AP: {combat.gmAp || 0}</span><span>{tx.major}: {turn.majorUsed}/{turn.majorLimit} · {tx.minor}: {turn.minorUsed}/{turn.minorLimit}</span></div>
          <div className="pip-local-combat__action-grid">
            <button type="button" className="pip-btn" onClick={aim} disabled={!canMinor || gmBusy}>{tx.aim}</button>
            <button type="button" className="pip-btn" onClick={() => changeRange(-1, false)} disabled={!canMinor || gmBusy}>{tx.moveCloser}</button>
            <button type="button" className="pip-btn" onClick={() => changeRange(1, false)} disabled={!canMinor || gmBusy}>{tx.moveFarther}</button>
            <button type="button" className="pip-btn" onClick={defend} disabled={!canMajor || gmBusy}>{tx.defend}</button>
            <button type="button" className="pip-btn" onClick={() => changeRange(-1, true)} disabled={!canMajor || gmBusy}>{tx.sprintCloser}</button>
            <button type="button" className="pip-btn" onClick={() => changeRange(1, true)} disabled={!canMajor || gmBusy}>{tx.sprintFarther}</button>
            <button type="button" className="pip-btn" onClick={firstAid} disabled={!canMajor || gmBusy}>{tx.firstAid}</button>
            <button type="button" className="pip-btn" onClick={buyExtraMinor} disabled={turn.minorLimit >= 2 || combat.groupAp < 1 || gmBusy}>{tx.buyMinor} · 1 {tx.ap}</button>
            <button type="button" className="pip-btn" onClick={buyExtraMajor} disabled={turn.majorLimit >= 2 || combat.groupAp < 2 || gmBusy}>{tx.buyMajor} · 2 {tx.ap}</button>
          </div>
          {turn.majorUsed >= 1 && turn.majorLimit > 1 ? <div className="pip-local-combat__rule-note">{tx.secondMajor}</div> : null}
        </div> : null}

        <div className="pip-local-combat__controls">
          <label>{tx.weapon}<select value={weaponIndex} onChange={(e) => setWeaponIndex(Number(e.target.value))} disabled={!weapons.length}>{weapons.map((weapon, index) => <option value={index} key={`${weapon.name}-${index}`}>{weapon.name || `Weapon ${index + 1}`}</option>)}</select></label>
          <label>{tx.target}<select value={selectedTargetId} onChange={(e) => { setTargetId(e.target.value); const t = enemies.find((x) => x.id === e.target.value); if (t?.range) setTargetRange(t.range); }}>{enemies.filter((enemy) => !enemy.defeated).map((enemy) => <option key={enemy.id} value={enemy.id}>{enemy.name || enemy.id} · {enemy.hp?.current ?? 0} HP</option>)}</select></label>
          <label>{tx.range}<select value={targetRange} onChange={(e) => setTargetRange(e.target.value)}>{RANGES.map((range) => <option key={range} value={range}>{tx[range]}</option>)}</select></label>
          <label>{tx.location}<select value={chosenLocation} onChange={(e) => setChosenLocation(e.target.value)}>{LOCATIONS.map((key) => <option key={key || "random"} value={key}>{key || tx.random}</option>)}</select></label>
          <label>{tx.attackDice}<select value={attackDice} onChange={(e) => setAttackDice(Number(e.target.value))}>{[2,3,4,5].map((n) => <option key={n} value={n}>{n}d20 · {tx.cost} {attackDiceCost(n)} {tx.ap}</option>)}</select></label>
        </div>
        {!weapons.length ? <div className="pip-local-combat__warning">{tx.noWeapons}</div> : null}
        <div className="pip-local-combat__actions"><button type="button" className="pip-action-button" onClick={playerAttack} disabled={disabled || gmBusy || !canMajor || !weapons.length || !enemies.some((enemy) => !enemy.defeated) || !canAffordDice}>{tx.attack}</button><button type="button" className="pip-btn" onClick={() => nextTurnFrom(combat)} disabled={disabled || gmBusy || active?.side === "enemy"}>{tx.next}</button></div>

        {lastAttack ? <div className={`pip-local-combat__result ${lastAttack.attackResult?.passed ? "is-hit" : "is-miss"}`}><strong>{lastAttack.attackResult?.passed ? tx.hit : tx.miss}</strong><span>{lastAttack.attackerName ? `${lastAttack.attackerName} → ` : ""}{lastAttack.targetName}</span><span>{lastAttack.weapon?.name}</span><span>d20: [{lastAttack.attackResult?.roll?.rolls?.map((die) => die.value).join(", ")}]</span><span>{lastAttack.attackResult?.roll?.totalSuccesses}/{lastAttack.attackResult?.check?.difficulty}</span>{lastAttack.damageResult ? <><span>{tx.location}: {lastAttack.damageResult.hitLocation}</span><span>{tx.raw}: {lastAttack.damageResult.roll.totalDamage}</span><span>{tx.armor}: {lastAttack.damageResult.effectiveDr}</span><span>{tx.damage}: {lastAttack.damageResult.finalDamage}</span>{lastAttack.damageResult.criticalHit ? <span>{tx.injury}: {lastAttack.damageResult.hitLocation}</span> : null}</> : null}</div> : null}
      </>}
    </section>
  );
}
