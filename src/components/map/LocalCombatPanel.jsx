import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  advanceTurn,
  applyDamageToTarget,
  createCombatState,
  resolveDamage,
  rollAttack,
} from "../../utils/combatEngine.js";
import { rollFalloutD20 } from "../../utils/dice.js";
import "./localCombatPanel.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const COMBAT_STORAGE_KEY = "fallout_pipboy_local_combat_v1";

const TEXT = {
  en: {
    combat: "COMBAT", start: "START COMBAT", gmEncounter: "GM ENCOUNTER", end: "END COMBAT", addEnemy: "ADD ENEMY", enemy: "ENEMY",
    name: "NAME", hp: "HP", defense: "DEF", dr: "DR", initiative: "INIT", range: "RANGE", round: "ROUND",
    turn: "TURN", attack: "ATTACK", next: "NEXT TURN", weapon: "WEAPON", target: "TARGET", location: "HIT LOCATION",
    random: "RANDOM", close: "CLOSE", medium: "MEDIUM", long: "LONG", extreme: "EXTREME", hit: "HIT", miss: "MISS",
    damage: "DAMAGE", raw: "RAW", armor: "DR", injury: "INJURY", noWeapons: "No weapons on character sheet",
    hint: "Combat math is resolved by the app. Auto GM chooses NPC actions.", remove: "REMOVE", gmThinking: "AUTO GM THINKING...",
  },
  ru: {
    combat: "БОЙ", start: "НАЧАТЬ БОЙ", gmEncounter: "БОЙ ОТ GM", end: "ЗАВЕРШИТЬ БОЙ", addEnemy: "ДОБАВИТЬ ПРОТИВНИКА", enemy: "ПРОТИВНИК",
    name: "ИМЯ", hp: "ОЗ", defense: "ЗАЩ", dr: "СОПР", initiative: "ИНИЦ", range: "ДИСТАНЦИЯ", round: "РАУНД",
    turn: "ХОД", attack: "АТАКОВАТЬ", next: "СЛЕДУЮЩИЙ ХОД", weapon: "ОРУЖИЕ", target: "ЦЕЛЬ", location: "ЗОНА ПОПАДАНИЯ",
    random: "СЛУЧАЙНО", close: "БЛИЗКО", medium: "СРЕДНЕ", long: "ДАЛЕКО", extreme: "ЭКСТРЕМАЛЬНО", hit: "ПОПАДАНИЕ", miss: "ПРОМАХ",
    damage: "УРОН", raw: "ДО DR", armor: "DR", injury: "ТРАВМА", noWeapons: "В листе персонажа нет оружия",
    hint: "Математику боя считает приложение. Auto GM выбирает действия NPC.", remove: "УДАЛИТЬ", gmThinking: "AUTO GM ДУМАЕТ...",
  },
  uk: {
    combat: "БІЙ", start: "ПОЧАТИ БІЙ", gmEncounter: "БІЙ ВІД GM", end: "ЗАВЕРШИТИ БІЙ", addEnemy: "ДОДАТИ ПРОТИВНИКА", enemy: "ПРОТИВНИК",
    name: "ІМ'Я", hp: "ОЗ", defense: "ЗАХ", dr: "ОПІР", initiative: "ІНІЦ", range: "ДИСТАНЦІЯ", round: "РАУНД",
    turn: "ХІД", attack: "АТАКУВАТИ", next: "НАСТУПНИЙ ХІД", weapon: "ЗБРОЯ", target: "ЦІЛЬ", location: "МІСЦЕ ВЛУЧАННЯ",
    random: "ВИПАДКОВО", close: "БЛИЗЬКО", medium: "СЕРЕДНЬО", long: "ДАЛЕКО", extreme: "ЕКСТРЕМАЛЬНО", hit: "ВЛУЧАННЯ", miss: "ПРОМАХ",
    damage: "ШКОДА", raw: "ДО DR", armor: "DR", injury: "ТРАВМА", noWeapons: "У листі персонажа немає зброї",
    hint: "Математику бою рахує застосунок. Auto GM обирає дії NPC.", remove: "ВИДАЛИТИ", gmThinking: "AUTO GM ДУМАЄ...",
  },
  pl: {
    combat: "WALKA", start: "ROZPOCZNIJ WALKĘ", gmEncounter: "WALKA OD GM", end: "ZAKOŃCZ WALKĘ", addEnemy: "DODAJ PRZECIWNIKA", enemy: "PRZECIWNIK",
    name: "NAZWA", hp: "PW", defense: "OBR", dr: "ODP", initiative: "INIC", range: "DYSTANS", round: "RUNDA",
    turn: "TURA", attack: "ATAKUJ", next: "NASTĘPNA TURA", weapon: "BROŃ", target: "CEL", location: "MIEJSCE TRAFIENIA",
    random: "LOSOWO", close: "BLISKO", medium: "ŚREDNIO", long: "DALEKO", extreme: "EKSTREMALNIE", hit: "TRAFIENIE", miss: "PUDŁO",
    damage: "OBRAŻENIA", raw: "PRZED DR", armor: "DR", injury: "URAZ", noWeapons: "Brak broni na karcie postaci",
    hint: "Matematykę walki liczy aplikacja. Auto GM wybiera działania NPC.", remove: "USUŃ", gmThinking: "AUTO GM MYŚLI...",
  },
};

const LOCATIONS = ["", "head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];
const RANGES = ["close", "medium", "long", "extreme"];

function readCharacter() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.data || null : null;
  } catch {
    return null;
  }
}

function readCombatStore() {
  try {
    const raw = localStorage.getItem(COMBAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCombatStore(store) {
  try { localStorage.setItem(COMBAT_STORAGE_KEY, JSON.stringify(store)); } catch { /* optional */ }
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
    hp: { current: 10, max: 10 },
    defense: 1,
    initiative: 10,
    range: "close",
    special: { S: 5, P: 5, E: 5, C: 5, I: 5, A: 5, L: 5 },
    skills: { "Small Guns": { rank: 1, bonus: 0, tagged: false } },
    resistances: { physical: 0, energy: 0, radiation: 0, poison: 0 },
    weapons: [],
  };
}

function normalizeWeapon(weapon = {}) {
  return {
    ...weapon,
    damage: Number(weapon.damage || 0),
    rate: Number(weapon.rate || 0),
    range: String(weapon.range || "close").toLowerCase(),
    damageType: String(weapon.damageType || weapon.damage_type || "physical").toLowerCase(),
    effects: weapon.effects || weapon.damageEffects || [],
  };
}

function dispatchCombatEvent(text, payload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("pip2d20-combat-event", { detail: { text, payload } }));
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
  const [lastAttack, setLastAttack] = useState(() => readCombatStore()?.[storageKey]?.lastAttack || null);
  const [gmBusy, setGmBusy] = useState(false);
  const [gmNarration, setGmNarration] = useState("");
  const [gmError, setGmError] = useState("");

  useEffect(() => {
    const store = readCombatStore();
    let changed = false;
    for (const [key, saved] of Object.entries(store)) {
      if (saved?.temporary && saved?.sectorKey !== sectorKey) {
        delete store[key];
        changed = true;
      }
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
      store[storageKey] = {
        combat: nextCombat,
        lastAttack: attack || null,
        gmNarration: narration || "",
        persistent,
        temporary: !persistent,
        sectorKey: persistent ? null : sectorKey,
        updatedAt: Date.now(),
      };
    }
    writeCombatStore(store);
    setCombat(nextCombat);
  }

  async function callCombatGm(mode, payload = {}) {
    setGmBusy(true);
    setGmError("");
    try {
      const response = await fetch("/api/combat-gm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, character, combat: payload.combat ?? combat, language, location, event: payload.event || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Combat GM ${response.status}`);
      return data;
    } catch (error) {
      setGmError(error?.message || "Combat GM error");
      return null;
    } finally {
      setGmBusy(false);
    }
  }

  async function narrateResolved(event, nextCombat) {
    const result = await callCombatGm("narrate_result", { event, combat: nextCombat });
    if (result?.narration) {
      setGmNarration(result.narration);
      persistCombat(nextCombat, lastAttack, result.narration);
    }
  }

  function patchEnemy(index, patch) {
    setEnemyDrafts((current) => current.map((enemy, i) => i === index ? { ...enemy, ...patch } : enemy));
  }

  function buildCombatFromEnemies(inputEnemies) {
    const enemies = inputEnemies.map((enemy, index) => ({
      ...enemy,
      id: enemy.id || `enemy-${index + 1}`,
      hp: { current: Math.max(1, Number(enemy.hp?.current ?? enemy.hp ?? 1)), max: Math.max(1, Number(enemy.hp?.max ?? enemy.hp?.current ?? enemy.hp ?? 1)) },
      defense: Math.max(0, Number(enemy.defense || 1)),
      initiative: Number(enemy.initiative || 0),
      range: RANGES.includes(enemy.range) ? enemy.range : "close",
      resistances: {
        physical: Math.max(0, Number(enemy.resistances?.physical || 0)),
        energy: Math.max(0, Number(enemy.resistances?.energy ?? enemy.resistances?.physical ?? 0)),
        radiation: Math.max(0, Number(enemy.resistances?.radiation || 0)),
        poison: Math.max(0, Number(enemy.resistances?.poison || 0)),
      },
      weapons: (enemy.weapons || []).map(normalizeWeapon),
    }));
    const next = createCombatState({ player, enemies });
    persistCombat(next, null);
    setTargetId(enemies[0]?.id || "");
    setLastAttack(null);
    npcHandledRef.current = "";
    return next;
  }

  function startCombat() {
    if (!player || disabled) return;
    const next = buildCombatFromEnemies(enemyDrafts);
    dispatchCombatEvent(`[COMBAT ENGINE] Combat started. Round 1. Initiative order: ${next.combatants.map((c) => `${c.name || c.id} ${c.initiative}`).join(", ")}.`, { type: "combat_start", combat: next });
  }

  async function startGmEncounter() {
    if (!player || disabled || gmBusy) return;
    const result = await callCombatGm("create_encounter", { combat: null });
    if (!result?.enemies?.length) return;
    setEnemyDrafts(result.enemies);
    if (result.narration) setGmNarration(result.narration);
    const next = buildCombatFromEnemies(result.enemies);
    persistCombat(next, null, result.narration || "");
    dispatchCombatEvent(`[COMBAT ENGINE] Auto GM created the encounter. Initiative is authoritative: ${next.combatants.map((c) => `${c.name || c.id} ${c.initiative}`).join(", ")}.`, { type: "combat_start", combat: next });
  }

  function endCombat() {
    if (disabled) return;
    dispatchCombatEvent("[COMBAT ENGINE] Combat ended.", { type: "combat_end", combat });
    persistCombat(null, null, "");
    setLastAttack(null);
    setGmNarration("");
    npcHandledRef.current = "";
  }

  function nextTurnFrom(state) {
    const next = advanceTurn(state);
    persistCombat(next);
    npcHandledRef.current = "";
    const active = next.combatants?.[next.turnIndex];
    dispatchCombatEvent(`[COMBAT ENGINE] Round ${next.round}, turn: ${active?.name || active?.id}.`, { type: "turn", combat: next, active });
    return next;
  }

  function nextTurn() {
    if (!combat || disabled || gmBusy) return;
    nextTurnFrom(combat);
  }

  async function playerAttack() {
    if (!combat || disabled || !weapons.length || gmBusy) return;
    const attacker = combat.combatants.find((c) => c.id === "player") || player;
    const target = combat.combatants.find((c) => c.id === targetId && c.side === "enemy");
    const weapon = weapons[weaponIndex];
    if (!attacker || !target || !weapon) return;

    const attackResult = rollAttack({ attacker, target, weapon, targetRange, withinReach: false, chosenLocation: Boolean(chosenLocation), diceCount: 2 });
    let damageResult = null;
    let applied = null;
    let nextCombat = combat;

    if (attackResult.passed) {
      damageResult = resolveDamage({ weapon, target, location: chosenLocation || null });
      applied = applyDamageToTarget(target, damageResult);
      nextCombat = {
        ...combat,
        combatants: combat.combatants.map((c) => c.id === target.id ? { ...c, hp: applied.hp, defeated: applied.defeated, dying: applied.dying, injury: applied.injury || c.injury } : c),
      };
    }

    const card = { side: "player", attackResult, damageResult, applied, weapon, targetId: target.id, targetName: target.name || target.id, range: targetRange, chosenLocation };
    setLastAttack(card);
    persistCombat(nextCombat, card);
    const event = { type: "player_attack", card };
    dispatchCombatEvent("[COMBAT ENGINE RESULT] Player attack resolved by the engine.", { ...event, combat: nextCombat });
    await narrateResolved(event, nextCombat);
  }

  async function resolveNpcTurn(state, actor, directive) {
    let nextCombat = state;
    let event = { type: "npc_action", actorId: actor.id, action: directive.action };

    if (directive.narration) setGmNarration(directive.narration);

    if (directive.action === "attack") {
      const target = state.combatants.find((c) => c.id === "player");
      const weapon = (actor.weapons || [])[Number(directive.weaponIndex || 0)] || actor.weapons?.[0];
      if (target && weapon) {
        const attackResult = rollAttack({
          attacker: actor,
          target,
          weapon,
          targetRange: directive.targetRange || actor.range || "close",
          withinReach: false,
          chosenLocation: Boolean(directive.chosenLocation),
          diceCount: 2,
        });
        let damageResult = null;
        let applied = null;
        if (attackResult.passed) {
          damageResult = resolveDamage({ weapon, target, location: directive.chosenLocation || null });
          applied = applyDamageToTarget(target, damageResult);
          nextCombat = {
            ...state,
            combatants: state.combatants.map((c) => c.id === target.id ? { ...c, hp: applied.hp, defeated: applied.defeated, dying: applied.dying, injury: applied.injury || c.injury } : c),
          };
        }
        const card = { side: "enemy", attackerId: actor.id, attackerName: actor.name, attackResult, damageResult, applied, weapon, targetId: "player", targetName: target.name || "Player", range: directive.targetRange || actor.range || "close", chosenLocation: directive.chosenLocation || "" };
        setLastAttack(card);
        persistCombat(nextCombat, card, directive.narration || gmNarration);
        event = { type: "npc_attack", card };
      }
    } else if (directive.action === "move") {
      nextCombat = {
        ...state,
        combatants: state.combatants.map((c) => c.id === actor.id ? { ...c, range: directive.moveToRange || directive.targetRange || c.range || "close" } : c),
      };
      persistCombat(nextCombat, lastAttack, directive.narration || gmNarration);
      event = { type: "npc_move", actorId: actor.id, range: directive.moveToRange || directive.targetRange };
    } else if (directive.action === "defend") {
      const athletics = actor.skills?.Athletics || {};
      const targetNumber = Number(actor.special?.A || 0) + Number(athletics.rank || 0) + Number(athletics.bonus || 0);
      const result = rollFalloutD20({ diceCount: 2, targetNumber, criticalRange: athletics.tagged ? Math.max(1, Number(athletics.rank || 1)) : 1, label: "A + Athletics" });
      const passed = result.totalSuccesses >= Number(actor.defense || 1);
      nextCombat = {
        ...state,
        combatants: state.combatants.map((c) => c.id === actor.id ? { ...c, defense: passed ? Number(c.defense || 1) + 1 : c.defense } : c),
      };
      persistCombat(nextCombat, lastAttack, directive.narration || gmNarration);
      event = { type: "npc_defend", actorId: actor.id, passed, roll: result };
    } else if (directive.action === "aim") {
      nextCombat = { ...state, combatants: state.combatants.map((c) => c.id === actor.id ? { ...c, aimed: true } : c) };
      persistCombat(nextCombat, lastAttack, directive.narration || gmNarration);
      event = { type: "npc_aim", actorId: actor.id };
    } else {
      event = { type: "npc_pass", actorId: actor.id };
    }

    dispatchCombatEvent("[COMBAT ENGINE RESULT] NPC action resolved by the engine.", { ...event, combat: nextCombat });
    await narrateResolved(event, nextCombat);
    nextTurnFrom(nextCombat);
  }

  const active = combat?.combatants?.[combat.turnIndex] || null;
  const enemies = (combat?.combatants || []).filter((c) => c.side === "enemy");
  const selectedTargetId = targetId || enemies.find((enemy) => !enemy.defeated)?.id || enemies[0]?.id || "";

  useEffect(() => {
    if (!combat || !active || active.side !== "enemy" || active.defeated || disabled || gmBusy) return;
    const key = `${combat.round}:${combat.turnIndex}:${active.id}`;
    if (npcHandledRef.current === key) return;
    npcHandledRef.current = key;
    (async () => {
      const directive = await callCombatGm("npc_turn", { combat });
      if (!directive) {
        npcHandledRef.current = "";
        return;
      }
      await resolveNpcTurn(combat, active, directive);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combat?.round, combat?.turnIndex, active?.id, active?.side, disabled]);

  return (
    <section className="pip-local-combat">
      <div className="pip-local-combat__head">
        <div>
          <div className="pip-local-combat__eyebrow">{tx.combat} // AUTO GM + 2D20 ENGINE</div>
          <strong>{combat ? `${tx.round} ${combat.round} · ${tx.turn}: ${active?.name || active?.id || "-"}` : tx.hint}</strong>
        </div>
        {combat ? <button type="button" className="pip-btn" onClick={endCombat} disabled={disabled || gmBusy}>{tx.end}</button> : null}
      </div>

      {gmBusy ? <div className="pip-local-combat__warning">{tx.gmThinking}</div> : null}
      {gmError ? <div className="pip-local-combat__warning">{gmError}</div> : null}
      {gmNarration ? <div className="pip-local-combat__gm"><strong>AUTO GM</strong><span>{gmNarration}</span></div> : null}

      {!combat ? (
        <div className="pip-local-combat__setup">
          <div className="pip-local-combat__actions">
            <button type="button" className="pip-action-button" onClick={startGmEncounter} disabled={disabled || !player || gmBusy}>{tx.gmEncounter}</button>
            <button type="button" className="pip-btn" onClick={startCombat} disabled={disabled || !player || gmBusy}>{tx.start}</button>
          </div>
          {enemyDrafts.map((enemy, index) => (
            <div className="pip-local-combat__enemy-edit" key={enemy.id}>
              <input value={enemy.name} onChange={(e) => patchEnemy(index, { name: e.target.value })} aria-label={tx.name} />
              <label>{tx.hp}<input type="number" min="1" value={enemy.hp.current} onChange={(e) => patchEnemy(index, { hp: { current: Number(e.target.value), max: Number(e.target.value) } })} /></label>
              <label>{tx.defense}<input type="number" min="0" value={enemy.defense} onChange={(e) => patchEnemy(index, { defense: Number(e.target.value) })} /></label>
              <label>{tx.dr}<input type="number" min="0" value={enemy.resistances.physical} onChange={(e) => patchEnemy(index, { resistances: { ...enemy.resistances, physical: Number(e.target.value), energy: Number(e.target.value) } })} /></label>
              <label>{tx.initiative}<input type="number" value={enemy.initiative} onChange={(e) => patchEnemy(index, { initiative: Number(e.target.value) })} /></label>
              <button type="button" className="pip-btn" onClick={() => setEnemyDrafts((current) => current.filter((_, i) => i !== index))} disabled={enemyDrafts.length <= 1}>{tx.remove}</button>
            </div>
          ))}
          <button type="button" className="pip-btn" onClick={() => setEnemyDrafts((current) => [...current, makeEnemy(current.length)])}>{tx.addEnemy}</button>
        </div>
      ) : (
        <>
          <div className="pip-local-combat__combatants">
            {combat.combatants.map((combatant, index) => (
              <div key={combatant.id} className={`pip-local-combat__combatant${index === combat.turnIndex ? " is-active" : ""}${combatant.defeated ? " is-defeated" : ""}`}>
                <strong>{combatant.name || combatant.id}</strong>
                <span>{tx.initiative}: {combatant.initiative}</span>
                <span>{tx.hp}: {combatant.hp?.current ?? combatant.currentHp ?? "-"}/{combatant.hp?.max ?? combatant.maxHp ?? "-"}</span>
                <span>{tx.defense}: {combatant.defense ?? 1}</span>
                {combatant.side === "enemy" ? <span>{tx.range}: {tx[combatant.range] || combatant.range}</span> : null}
              </div>
            ))}
          </div>

          <div className="pip-local-combat__controls">
            <label>{tx.weapon}<select value={weaponIndex} onChange={(e) => setWeaponIndex(Number(e.target.value))} disabled={!weapons.length}>{weapons.map((weapon, index) => <option value={index} key={`${weapon.name}-${index}`}>{weapon.name || `Weapon ${index + 1}`}</option>)}</select></label>
            <label>{tx.target}<select value={selectedTargetId} onChange={(e) => setTargetId(e.target.value)}>{enemies.filter((enemy) => !enemy.defeated).map((enemy) => <option key={enemy.id} value={enemy.id}>{enemy.name || enemy.id} · {enemy.hp?.current ?? 0} HP</option>)}</select></label>
            <label>{tx.range}<select value={targetRange} onChange={(e) => setTargetRange(e.target.value)}>{RANGES.map((range) => <option key={range} value={range}>{tx[range]}</option>)}</select></label>
            <label>{tx.location}<select value={chosenLocation} onChange={(e) => setChosenLocation(e.target.value)}>{LOCATIONS.map((locationKey) => <option key={locationKey || "random"} value={locationKey}>{locationKey || tx.random}</option>)}</select></label>
          </div>

          {!weapons.length ? <div className="pip-local-combat__warning">{tx.noWeapons}</div> : null}

          <div className="pip-local-combat__actions">
            <button type="button" className="pip-action-button" onClick={playerAttack} disabled={disabled || gmBusy || active?.id !== "player" || !weapons.length || !enemies.some((enemy) => !enemy.defeated)}>{tx.attack}</button>
            <button type="button" className="pip-btn" onClick={nextTurn} disabled={disabled || gmBusy || active?.side === "enemy"}>{tx.next}</button>
          </div>

          {lastAttack ? (
            <div className={`pip-local-combat__result ${lastAttack.attackResult?.passed ? "is-hit" : "is-miss"}`}>
              <strong>{lastAttack.attackResult?.passed ? tx.hit : tx.miss}</strong>
              <span>{lastAttack.attackerName ? `${lastAttack.attackerName} → ` : ""}{lastAttack.targetName}</span>
              <span>{lastAttack.weapon?.name}</span>
              <span>d20: [{lastAttack.attackResult?.roll?.rolls?.map((die) => die.value).join(", ")}]</span>
              <span>{lastAttack.attackResult?.roll?.totalSuccesses}/{lastAttack.attackResult?.check?.difficulty}</span>
              {lastAttack.damageResult ? <>
                <span>{tx.location}: {lastAttack.damageResult.hitLocation}</span>
                <span>{tx.raw}: {lastAttack.damageResult.roll.totalDamage}</span>
                <span>{tx.armor}: {lastAttack.damageResult.effectiveDr}</span>
                <span>{tx.damage}: {lastAttack.damageResult.finalDamage}</span>
                {lastAttack.damageResult.criticalHit ? <span>{tx.injury}: {lastAttack.damageResult.hitLocation}</span> : null}
              </> : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
