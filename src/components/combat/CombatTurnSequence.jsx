import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ActiveBestiaryCombatPanel from "./ActiveBestiaryCombatPanel.jsx";
import {
  BESTIARY_COMBAT_ACTION_EVENT,
  BESTIARY_COMBAT_CHANGED_EVENT,
  readCombatForSession,
  readLatestCombat,
} from "../../utils/bestiaryCombatContext.js";
import {
  advanceCombatTurn,
  ensureCombatTurnOrder,
  getActiveCombatActor,
  isCombatActorTurn,
  readCombatCompanion,
} from "../../utils/combatTurnOrder.js";
import { applyCompanionAttackResult, resolveCompanionAttack } from "../../utils/companionCombatTurn.js";
import {
  ENEMY_TARGET_RANGES,
  applyResolvedEnemyAttack,
  parseBestiaryAttackProfiles,
  recordEnemyTurnAction,
  requestEnemyTurnDirective,
  resolveEnemyBestiaryAttack,
} from "../../utils/enemyBestiaryTurn.js";
import "./combatTurnSequence.css";

const TEXT = {
  en: { round:"ROUND", turn:"TURN", player:"PLAYER", companion:"COMPANION", enemy:"ENEMY", end:"END TURN", wait:"WAITING", attack:"ATTACK", target:"TARGET", noAttack:"NO ATTACKS", enemyTurn:"AUTO GM ENEMY TURN", thinking:"AUTO GM...", range:"DISTANCE", hit:"HIT", miss:"MISS", damage:"DAMAGE", skip:"SKIP TURN" },
  ru: { round:"РАУНД", turn:"ХОД", player:"ИГРОК", companion:"КОМПАНЬОН", enemy:"ВРАГ", end:"ЗАВЕРШИТЬ ХОД", wait:"ОЖИДАНИЕ", attack:"АТАКОВАТЬ", target:"ЦЕЛЬ", noAttack:"НЕТ АТАК", enemyTurn:"ХОД ВРАГА // AUTO GM", thinking:"AUTO GM...", range:"ДИСТАНЦИЯ", hit:"ПОПАДАНИЕ", miss:"ПРОМАХ", damage:"УРОН", skip:"ПРОПУСТИТЬ ХОД" },
  uk: { round:"РАУНД", turn:"ХІД", player:"ГРАВЕЦЬ", companion:"КОМПАНЬЙОН", enemy:"ВОРОГ", end:"ЗАВЕРШИТИ ХІД", wait:"ОЧІКУВАННЯ", attack:"АТАКУВАТИ", target:"ЦІЛЬ", noAttack:"НЕМАЄ АТАК", enemyTurn:"ХІД ВОРОГА // AUTO GM", thinking:"AUTO GM...", range:"ДИСТАНЦІЯ", hit:"ВЛУЧАННЯ", miss:"ПРОМАХ", damage:"ШКОДА", skip:"ПРОПУСТИТИ ХІД" },
  pl: { round:"RUNDA", turn:"TURA", player:"GRACZ", companion:"TOWARZYSZ", enemy:"WRÓG", end:"ZAKOŃCZ TURĘ", wait:"OCZEKIWANIE", attack:"ATAKUJ", target:"CEL", noAttack:"BRAK ATAKÓW", enemyTurn:"TURA WROGA // AUTO GM", thinking:"AUTO GM...", range:"DYSTANS", hit:"TRAFIENIE", miss:"PUDŁO", damage:"OBRAŻENIA", skip:"POMIŃ TURĘ" },
};

function lang(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

function actorLabel(copy, actor) {
  if (!actor) return copy.wait;
  const kind = copy[actor.kind] || actor.kind;
  return `${kind}: ${actor.name}`;
}

function actionMatchesActor(action, actor) {
  if (!action || !actor) return false;
  if (actor.kind === "player") return action.type === "player_attack";
  if (actor.kind === "companion") return action.type === "companion_attack" && action?.actor?.id === actor.id;
  return (action.type === "enemy_attack" || action.type === "enemy_action") && action?.actor?.instanceId === actor.id;
}

function TurnHeader({ character, state, setState, copy }) {
  const handled = useRef(new Set());
  const active = getActiveCombatActor(state);

  useEffect(() => {
    if (!state?.sessionKey || state.status === "resolved") return;
    if (!state.turn?.activeActorId) {
      const next = ensureCombatTurnOrder(state.sessionKey, character);
      if (next?.sessionKey) setState(next);
    }
  }, [state?.sessionKey, state?.turn?.activeActorId, state?.status, character, setState]);

  useEffect(() => {
    const onAction = (event) => {
      const detail = event?.detail || {};
      const token = String(detail?.action?.token || "");
      if (!token || handled.current.has(token)) return;
      const current = readCombatForSession(detail.sessionKey);
      const actor = getActiveCombatActor(current);
      if (!actionMatchesActor(detail.action, actor)) return;
      handled.current.add(token);
      const next = advanceCombatTurn(detail.sessionKey, character, detail.action.type);
      if (next?.sessionKey) setState(next);
    };
    window.addEventListener(BESTIARY_COMBAT_ACTION_EVENT, onAction);
    return () => window.removeEventListener(BESTIARY_COMBAT_ACTION_EVENT, onAction);
  }, [character, setState]);

  if (!state || state.status === "resolved") return null;
  const order = state.turn?.order || [];
  return (
    <section className="pip-panel combat-turn-sequence__tracker">
      <div className="combat-turn-sequence__head">
        <strong>[ {copy.round} {state.turn?.round || state.round || 1} ]</strong>
        <span>{copy.turn}: {actorLabel(copy, active)}</span>
      </div>
      <div className="combat-turn-sequence__queue">
        {order.map((actor, index) => (
          <span key={`${actor.kind}:${actor.id}`} className={actor.id === active?.id ? "is-active" : ""}>
            {index + 1}. {actor.name} <small>{actor.initiative}</small>
          </span>
        ))}
      </div>
      {active?.kind === "player" ? (
        <button type="button" className="pip-btn combat-turn-sequence__end" onClick={() => {
          const next = advanceCombatTurn(state.sessionKey, character, "player_end_turn");
          if (next?.sessionKey) setState(next);
        }}>{copy.end}</button>
      ) : null}
    </section>
  );
}

function CompanionTurn({ character, state, copy }) {
  const active = getActiveCombatActor(state);
  const companion = active?.kind === "companion" ? readCombatCompanion(active.id) : null;
  const enemies = (state?.enemies || []).filter((enemy) => !enemy?.defeated && Number(enemy?.hp?.current || 0) > 0);
  const [attackIndex, setAttackIndex] = useState(0);
  const [targetId, setTargetId] = useState(enemies[0]?.instanceId || "");
  const [last, setLast] = useState(null);

  useEffect(() => {
    if (!enemies.some((enemy) => enemy.instanceId === targetId)) setTargetId(enemies[0]?.instanceId || "");
  }, [enemies, targetId]);

  if (!companion || !state?.sessionKey) return null;
  const attacks = Array.isArray(companion.attacks) ? companion.attacks : [];
  const attack = attacks[Math.min(attackIndex, Math.max(0, attacks.length - 1))] || null;
  const enemy = enemies.find((item) => item.instanceId === targetId) || enemies[0] || null;

  const doAttack = () => {
    if (!attack || !enemy) return;
    const result = resolveCompanionAttack({ companion, attack, enemy });
    setLast(result);
    if (!result?.error || result?.attackRoll) applyCompanionAttackResult(state.sessionKey, companion, enemy.instanceId, result);
  };

  return (
    <section className="pip-panel combat-turn-sequence__actor-panel">
      <strong>[ {copy.companion}: {companion.name || "Companion"} ]</strong>
      <div className="combat-turn-sequence__controls">
        <select className="pip-input" value={attackIndex} onChange={(e) => setAttackIndex(Number(e.target.value) || 0)} disabled={!attacks.length}>
          {attacks.length ? attacks.map((item, index) => <option key={item.id || index} value={index}>{item.name || `Attack ${index + 1}`}</option>) : <option>{copy.noAttack}</option>}
        </select>
        <select className="pip-input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {enemies.map((item) => <option key={item.instanceId} value={item.instanceId}>{item.name} HP {item.hp?.current}/{item.hp?.max}</option>)}
        </select>
        <button type="button" className="pip-btn is-primary" onClick={doAttack} disabled={!attack || !enemy}>{copy.attack}</button>
        <button type="button" className="pip-btn" onClick={() => advanceCombatTurn(state.sessionKey, character, "companion_skip")}>{copy.skip}</button>
      </div>
      {last?.attackRoll ? <div className="combat-turn-sequence__result">{last.hit ? copy.hit : copy.miss} // TN {last.attack?.targetNumber} // D {last.attack?.difficulty} // {copy.damage} {last.totalFinalDamage || 0}</div> : null}
    </section>
  );
}

function EnemyTurn({ character, setCharacter, state, copy, language }) {
  const active = getActiveCombatActor(state);
  const enemy = active?.kind === "enemy" ? (state?.enemies || []).find((item) => item.instanceId === active.id) : null;
  const [targetRange, setTargetRange] = useState("close");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState(null);
  if (!enemy || !state?.sessionKey) return null;

  const run = async () => {
    if (busy) return;
    setBusy(true);
    setLast(null);
    try {
      const { directive, attacks } = await requestEnemyTurnDirective({
        sessionKey: state.sessionKey,
        combat: state,
        enemy,
        character,
        targetRange,
        language,
        location: { regionId: character?.mapData?.regionId || "commonwealth", worldTotalHours: Number(character?.mapData?.worldTotalHours || 0), targetRange },
      });
      const action = String(directive?.action || "pass").toLowerCase();
      if (action !== "attack") {
        if (action === "move" && directive?.moveToRange && ENEMY_TARGET_RANGES.includes(directive.moveToRange)) setTargetRange(directive.moveToRange);
        recordEnemyTurnAction({ sessionKey: state.sessionKey, enemy, directive });
        setLast({ directive });
        return;
      }
      const index = Math.max(0, Math.min(attacks.length - 1, Number(directive?.weaponIndex || 0)));
      const attack = attacks[index];
      if (!attack?.usable) {
        recordEnemyTurnAction({ sessionKey: state.sessionKey, enemy, directive });
        setLast({ directive, error: "incomplete_attack" });
        return;
      }
      const result = resolveEnemyBestiaryAttack({ character, enemy, attack, targetRange, diceCount: 2 });
      const applied = applyResolvedEnemyAttack(character, result);
      if (result?.hit && applied?.nextCharacter && typeof setCharacter === "function") setCharacter(() => applied.nextCharacter);
      recordEnemyTurnAction({ sessionKey: state.sessionKey, enemy, directive, result, hpBefore: applied.hpBefore, hpAfter: applied.hpAfter || applied.hpBefore });
      setLast({ directive, result });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pip-panel combat-turn-sequence__actor-panel">
      <strong>[ {copy.enemyTurn}: {enemy.name} ]</strong>
      <div className="combat-turn-sequence__controls">
        <label><span>{copy.range}</span><select className="pip-input" value={targetRange} onChange={(e) => setTargetRange(e.target.value)}>{ENEMY_TARGET_RANGES.map((range) => <option key={range} value={range}>{range.toUpperCase()}</option>)}</select></label>
        <button type="button" className="pip-btn is-primary" onClick={run} disabled={busy}>{busy ? copy.thinking : copy.enemyTurn}</button>
      </div>
      {last?.result ? <div className="combat-turn-sequence__result">{last.result.hit ? copy.hit : copy.miss} // {last.result.attack?.name} // {copy.damage} {last.result.totalFinalDamage || 0}</div> : null}
      {last?.directive && !last?.result ? <div className="combat-turn-sequence__result">{String(last.directive.action || "pass").toUpperCase()} {last.directive.narration || ""}</div> : null}
    </section>
  );
}

export default function CombatTurnSequence({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const language = lang(i18n.resolvedLanguage || i18n.language);
  const copy = TEXT[language];
  const [state, setState] = useState(() => readLatestCombat());

  useEffect(() => {
    const refresh = () => setState(readLatestCombat());
    window.addEventListener(BESTIARY_COMBAT_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BESTIARY_COMBAT_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const active = useMemo(() => getActiveCombatActor(state), [state]);
  if (!state) return null;

  return (
    <div className="combat-turn-sequence">
      <TurnHeader character={character} state={state} setState={setState} copy={copy} />
      <div className={isCombatActorTurn(state, "player") ? "combat-turn-sequence__player is-active" : "combat-turn-sequence__player is-locked"}>
        <ActiveBestiaryCombatPanel character={character} setCharacter={setCharacter} />
      </div>
      {active?.kind === "companion" ? <CompanionTurn character={character} state={state} copy={copy} /> : null}
      {active?.kind === "enemy" ? <EnemyTurn character={character} setCharacter={setCharacter} state={state} copy={copy} language={language} /> : null}
    </div>
  );
}
