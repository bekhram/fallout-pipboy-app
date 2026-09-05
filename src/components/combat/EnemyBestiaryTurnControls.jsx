import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BESTIARY_COMBAT_CHANGED_EVENT,
  readLatestCombat,
} from "../../utils/bestiaryCombatContext.js";
import {
  ENEMY_TARGET_RANGES,
  applyResolvedEnemyAttack,
  recordEnemyTurnAction,
  requestEnemyTurnDirective,
  resolveEnemyBestiaryAttack,
} from "../../utils/enemyBestiaryTurn.js";
import { getDerivedStats } from "../../utils/characterMath.js";
import "./enemyBestiaryTurn.css";

const TEXT = {
  en: {
    title: "ENEMY TURN // AUTO GM", range: "DISTANCE", player: "PLAYER", enemy: "ENEMY", initiative: "INIT",
    act: "ENEMY TURN", thinking: "AUTO GM...", attack: "ATTACK", move: "MOVE", aim: "AIM", defend: "DEFEND", pass: "PASS",
    hit: "HIT", miss: "MISS", damage: "DAMAGE", location: "LOCATION", dr: "DR", hp: "HP", roll: "ROLL",
    noCombat: "No active enemy turn.", gmError: "Auto GM could not choose the enemy action.", incomplete: "This attack profile is incomplete and was not auto-resolved.",
    reach: "REACH", close: "CLOSE", medium: "MEDIUM", long: "LONG", extreme: "EXTREME", piercing: "Piercing rating is missing in the imported stat block; no DR was ignored automatically.",
  },
  ru: {
    title: "ХОД ПРОТИВНИКА // AUTO GM", range: "ДИСТАНЦИЯ", player: "ИГРОК", enemy: "ВРАГ", initiative: "ИНИЦ",
    act: "ХОД ВРАГА", thinking: "AUTO GM...", attack: "АТАКА", move: "ДВИЖЕНИЕ", aim: "ПРИЦЕЛИВАНИЕ", defend: "ЗАЩИТА", pass: "ПРОПУСК",
    hit: "ПОПАДАНИЕ", miss: "ПРОМАХ", damage: "УРОН", location: "ЗОНА", dr: "DR", hp: "HP", roll: "БРОСОК",
    noCombat: "Нет активного хода противника.", gmError: "Auto GM не смог выбрать действие противника.", incomplete: "В статблоке этой атаки не хватает данных, поэтому она не была рассчитана автоматически.",
    reach: "ВПЛОТНУЮ", close: "БЛИЗКО", medium: "СРЕДНЕ", long: "ДАЛЕКО", extreme: "ЭКСТРЕМАЛЬНО", piercing: "В импортированном статблоке не указан рейтинг Piercing; DR автоматически не игнорировался.",
  },
  uk: {
    title: "ХІД ПРОТИВНИКА // AUTO GM", range: "ДИСТАНЦІЯ", player: "ГРАВЕЦЬ", enemy: "ВОРОГ", initiative: "ІНІЦ",
    act: "ХІД ВОРОГА", thinking: "AUTO GM...", attack: "АТАКА", move: "РУХ", aim: "ПРИЦІЛЮВАННЯ", defend: "ЗАХИСТ", pass: "ПРОПУСК",
    hit: "ВЛУЧАННЯ", miss: "ПРОМАХ", damage: "ШКОДА", location: "ЗОНА", dr: "DR", hp: "HP", roll: "КИДОК",
    noCombat: "Немає активного ходу противника.", gmError: "Auto GM не зміг обрати дію противника.", incomplete: "У статблоці цієї атаки бракує даних, тому її не було розраховано автоматично.",
    reach: "ВПРИТУЛ", close: "БЛИЗЬКО", medium: "СЕРЕДНЯ", long: "ДАЛЕКА", extreme: "ЕКСТРЕМАЛЬНА", piercing: "В імпортованому статблоці не вказано рейтинг Piercing; DR автоматично не ігнорувався.",
  },
  pl: {
    title: "TURA PRZECIWNIKA // AUTO GM", range: "DYSTANS", player: "GRACZ", enemy: "WRÓG", initiative: "INIC",
    act: "TURA WROGA", thinking: "AUTO GM...", attack: "ATAK", move: "RUCH", aim: "CELOWANIE", defend: "OBRONA", pass: "POMIŃ",
    hit: "TRAFIENIE", miss: "PUDŁO", damage: "OBRAŻENIA", location: "LOKACJA", dr: "DR", hp: "HP", roll: "RZUT",
    noCombat: "Brak aktywnej tury przeciwnika.", gmError: "Auto GM nie mógł wybrać działania przeciwnika.", incomplete: "W profilu tego ataku brakuje danych, więc nie został rozliczony automatycznie.",
    reach: "ZASIĘG RĘKI", close: "BLISKI", medium: "ŚREDNI", long: "DALEKI", extreme: "EKSTREMALNY", piercing: "W zaimportowanym bloku nie ma wartości Piercing; DR nie zostało automatycznie zignorowane.",
  },
};

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

function formatDice(values) {
  if (!Array.isArray(values)) return "—";
  return values.map((die) => `[${die?.value ?? die}]`).join(" ");
}

function actionLabel(copy, directive) {
  const action = String(directive?.action || "pass").toLowerCase();
  return copy[action] || action.toUpperCase();
}

export default function EnemyBestiaryTurnControls({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = TEXT[language];
  const [state, setState] = useState(() => readLatestCombat());
  const [targetRange, setTargetRange] = useState("close");
  const [busyId, setBusyId] = useState(null);
  const [lastByEnemy, setLastByEnemy] = useState({});

  useEffect(() => {
    const refresh = () => setState(readLatestCombat());
    window.addEventListener(BESTIARY_COMBAT_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BESTIARY_COMBAT_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const derived = useMemo(() => getDerivedStats(character || {}), [character]);
  const enemies = useMemo(
    () => (state?.enemies || []).filter((enemy) => !enemy?.defeated && Number(enemy?.hp?.current || 0) > 0),
    [state]
  );

  if (!state || !enemies.length || state.status === "resolved") return null;

  const runEnemyTurn = async (enemy) => {
    if (!character || busyId) return;
    setBusyId(enemy.instanceId);
    setLastByEnemy((prev) => ({ ...prev, [enemy.instanceId]: null }));

    try {
      const location = {
        regionId: character?.mapData?.regionId || "commonwealth",
        worldTotalHours: Number(character?.mapData?.worldTotalHours || 0),
        targetRange,
      };
      const { directive, attacks } = await requestEnemyTurnDirective({
        sessionKey: state.sessionKey,
        combat: state,
        enemy,
        character,
        targetRange,
        language,
        location,
      });

      const action = String(directive?.action || "pass").toLowerCase();
      if (action !== "attack") {
        if (action === "move" && directive?.moveToRange && ENEMY_TARGET_RANGES.includes(directive.moveToRange)) {
          setTargetRange(directive.moveToRange);
        }
        const recorded = recordEnemyTurnAction({
          sessionKey: state.sessionKey,
          enemy,
          directive,
        });
        setLastByEnemy((prev) => ({
          ...prev,
          [enemy.instanceId]: { directive, action: recorded?.action || null },
        }));
        return;
      }

      const attackIndex = Math.max(0, Math.min(attacks.length - 1, Number(directive?.weaponIndex || 0)));
      const attack = attacks[attackIndex];
      if (!attack?.usable) {
        recordEnemyTurnAction({ sessionKey: state.sessionKey, enemy, directive });
        setLastByEnemy((prev) => ({
          ...prev,
          [enemy.instanceId]: { directive, error: "incomplete_attack_profile", attack },
        }));
        return;
      }

      const result = resolveEnemyBestiaryAttack({
        character,
        enemy,
        attack,
        targetRange,
        diceCount: 2,
      });
      if (result?.error) {
        recordEnemyTurnAction({ sessionKey: state.sessionKey, enemy, directive });
        setLastByEnemy((prev) => ({ ...prev, [enemy.instanceId]: { directive, error: result.error, result } }));
        return;
      }

      const applied = applyResolvedEnemyAttack(character, result);
      const hpAfter = applied.hpAfter || applied.hpBefore;
      if (result.hit && applied.nextCharacter && typeof setCharacter === "function") {
        setCharacter(() => applied.nextCharacter);
      }
      const recorded = recordEnemyTurnAction({
        sessionKey: state.sessionKey,
        enemy,
        directive,
        result,
        hpBefore: applied.hpBefore,
        hpAfter,
      });
      setLastByEnemy((prev) => ({
        ...prev,
        [enemy.instanceId]: {
          directive,
          result,
          hpBefore: applied.hpBefore,
          hpAfter,
          action: recorded?.action || null,
        },
      }));
    } catch (error) {
      setLastByEnemy((prev) => ({
        ...prev,
        [enemy.instanceId]: { error: "gm_error", message: String(error?.message || error || "") },
      }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="pip-panel pip-enemy-turn" aria-label={copy.title}>
      <div className="pip-enemy-turn__head">
        <strong>[ {copy.title} ]</strong>
        <span>{copy.player} {copy.initiative} {derived?.initiative ?? "—"}</span>
      </div>

      <label className="pip-enemy-turn__range">
        <span>{copy.range}</span>
        <select className="pip-input" value={targetRange} onChange={(event) => setTargetRange(event.target.value)}>
          {ENEMY_TARGET_RANGES.map((range) => (
            <option key={range} value={range}>{copy[range] || range}</option>
          ))}
        </select>
      </label>

      <div className="pip-enemy-turn__list">
        {enemies.map((enemy) => {
          const last = lastByEnemy[enemy.instanceId];
          const result = last?.result;
          const directive = last?.directive;
          return (
            <article className="pip-enemy-turn__enemy" key={enemy.instanceId}>
              <div className="pip-enemy-turn__enemy-head">
                <strong>{enemy.name}</strong>
                <span>{copy.enemy} {copy.initiative} {enemy.initiative ?? "—"}</span>
              </div>

              <button
                type="button"
                className="pip-btn is-primary pip-enemy-turn__button"
                onClick={() => runEnemyTurn(enemy)}
                disabled={Boolean(busyId) || !character}
              >
                {busyId === enemy.instanceId ? copy.thinking : copy.act}
              </button>

              {last?.error ? (
                <div className="pip-enemy-turn__result is-error">
                  {last.error === "gm_error" ? copy.gmError : copy.incomplete}
                  {last.message ? <small>{last.message}</small> : null}
                </div>
              ) : null}

              {directive && !result ? (
                <div className="pip-enemy-turn__result">
                  <strong>{actionLabel(copy, directive)}</strong>
                  {directive.narration ? <span>{directive.narration}</span> : null}
                  {directive.moveToRange ? <span>{copy.range}: {copy[directive.moveToRange] || directive.moveToRange}</span> : null}
                </div>
              ) : null}

              {result ? (
                <div className={`pip-enemy-turn__result${result.hit ? " is-hit" : " is-miss"}`}>
                  <div className="pip-enemy-turn__result-head">
                    <strong>{result.attack?.name || copy.attack}</strong>
                    <span>{result.hit ? copy.hit : copy.miss}</span>
                  </div>
                  <span>
                    {copy.roll}: {formatDice(result.attackRoll?.dice)} // TN {result.attack?.targetNumber ?? "—"} // D {result.difficulty ?? "—"} // S {result.attackRoll?.totalSuccesses ?? 0}
                  </span>
                  {result.hit && result.damageRoll ? (
                    <>
                      <span>{copy.location}: {result.hitLocationLabel || "—"} ({result.hitLocationRoll ?? "—"})</span>
                      <span>
                        {copy.damage}: {result.attack?.damageDice ?? 0} CD {formatDice(result.damageRoll?.dice)} = {result.damageRoll?.rawDamage ?? 0} // {copy.dr} {result.resistance === "immune" ? "IMMUNE" : result.resistance ?? 0} // final {result.totalFinalDamage ?? 0}
                      </span>
                      {result.piercingUnresolved ? <span className="is-warning">{copy.piercing}</span> : null}
                      {last?.hpBefore && last?.hpAfter ? (
                        <span>
                          {copy.hp}: {last.hpBefore.current}/{last.hpBefore.max} → {last.hpAfter.current}/{last.hpAfter.effectiveMax ?? last.hpAfter.max}
                          {Number(last.hpAfter.radiation || 0) !== Number(last.hpBefore.radiation || 0)
                            ? ` // RAD ${last.hpBefore.radiation} → ${last.hpAfter.radiation}`
                            : ""}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
