import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BESTIARY_COMBAT_CHANGED_EVENT,
  clearCombatForSession,
  readLatestCombat,
  updateCombatEnemyHp,
} from "../../utils/bestiaryCombatContext.js";
import "./activeBestiaryCombat.css";

const TEXT = {
  en: { title: "ACTIVE ENCOUNTER", hp: "HP", defense: "DEF", initiative: "INIT", level: "LVL", resolved: "RESOLVED", end: "END ENCOUNTER", attacks: "ATTACKS", dr: "DR" },
  ru: { title: "АКТИВНАЯ ВСТРЕЧА", hp: "HP", defense: "ЗАЩ", initiative: "ИНИЦ", level: "УР", resolved: "ЗАВЕРШЕНО", end: "ЗАВЕРШИТЬ ВСТРЕЧУ", attacks: "АТАКИ", dr: "DR" },
  uk: { title: "АКТИВНА ЗУСТРІЧ", hp: "HP", defense: "ЗАХ", initiative: "ІНІЦ", level: "РІВ", resolved: "ЗАВЕРШЕНО", end: "ЗАВЕРШИТИ ЗУСТРІЧ", attacks: "АТАКИ", dr: "DR" },
  pl: { title: "AKTYWNE SPOTKANIE", hp: "HP", defense: "OBR", initiative: "INIC", level: "POZ", resolved: "ZAKOŃCZONE", end: "ZAKOŃCZ SPOTKANIE", attacks: "ATAKI", dr: "DR" },
};

function getLanguage(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

export default function ActiveBestiaryCombatPanel() {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = TEXT[language];
  const [state, setState] = useState(() => readLatestCombat());
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const refresh = () => setState(readLatestCombat());
    window.addEventListener(BESTIARY_COMBAT_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(BESTIARY_COMBAT_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const enemies = useMemo(() => state?.enemies || [], [state]);
  if (!state || !enemies.length) return null;

  const changeHp = (enemy, delta) => {
    const next = Number(enemy?.hp?.current || 0) + delta;
    updateCombatEnemyHp(state.sessionKey, enemy.instanceId, next);
  };

  const endEncounter = () => {
    clearCombatForSession(state.sessionKey);
    setState(null);
  };

  return (
    <section className="pip-panel pip-active-combat" aria-label={copy.title}>
      <div className="pip-active-combat__head">
        <strong>[ {copy.title} ]</strong>
        {state.status === "resolved" ? <span>{copy.resolved}</span> : null}
      </div>

      <div className="pip-active-combat__list">
        {enemies.map((enemy) => {
          const current = Number(enemy?.hp?.current || 0);
          const max = Number(enemy?.hp?.max || 0);
          const expanded = expandedId === enemy.instanceId;
          return (
            <article key={enemy.instanceId} className={`pip-active-combat__enemy${enemy.defeated ? " is-defeated" : ""}`}>
              <button
                type="button"
                className="pip-active-combat__summary"
                onClick={() => setExpandedId(expanded ? null : enemy.instanceId)}
              >
                <span className="pip-active-combat__name">{enemy.name}</span>
                <span>{copy.level} {enemy.level ?? "—"}</span>
                <span>{copy.hp} {current}/{max}</span>
                <span>{copy.defense} {enemy.defense ?? "—"}</span>
                <span>{copy.initiative} {enemy.initiative ?? "—"}</span>
              </button>

              <div className="pip-active-combat__hp-controls">
                <button type="button" onClick={() => changeHp(enemy, -1)} disabled={current <= 0}>−1</button>
                <button type="button" onClick={() => changeHp(enemy, -5)} disabled={current <= 0}>−5</button>
                <div className="pip-active-combat__bar" aria-label={`${copy.hp} ${current}/${max}`}>
                  <span style={{ width: `${max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0}%` }} />
                </div>
                <button type="button" onClick={() => changeHp(enemy, 1)} disabled={current >= max}>+1</button>
              </div>

              {expanded ? (
                <div className="pip-active-combat__details">
                  {enemy.drBlock ? <div><strong>{copy.dr}:</strong> {enemy.drBlock}</div> : null}
                  {enemy.attacks ? <div><strong>{copy.attacks}:</strong><pre>{enemy.attacks}</pre></div> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <button type="button" className="pip-btn pip-active-combat__end" onClick={endEncounter}>
        {copy.end}
      </button>
    </section>
  );
}
