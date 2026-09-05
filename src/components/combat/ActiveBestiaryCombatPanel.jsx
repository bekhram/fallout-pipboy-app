import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BESTIARY_COMBAT_CHANGED_EVENT,
  applyCombatAttackResult,
  clearCombatForSession,
  readLatestCombat,
  updateCombatEnemyHp,
} from "../../utils/bestiaryCombatContext.js";
import {
  COMBAT_TARGET_RANGES,
  getCombatWeaponAmmoState,
  prepareCombatWeapon,
  resolvePlayerBestiaryAttack,
} from "../../utils/playerBestiaryAttack.js";
import { getEnvironmentSnapshot } from "../../utils/environmentSystem.js";
import "./activeBestiaryCombat.css";

const TEXT = {
  en: {
    title: "ACTIVE ENCOUNTER", hp: "HP", defense: "DEF", initiative: "INIT", level: "LVL", resolved: "RESOLVED", end: "END ENCOUNTER", attacks: "ATTACKS", dr: "DR",
    attack: "ATTACK", weapon: "WEAPON", range: "RANGE", light: "LIGHT", useLight: "USE LIGHT", noWeapons: "No weapons configured.", noAmmo: "No ammunition", hit: "HIT", miss: "MISS", tn: "TN", difficulty: "DIFF", damage: "DAMAGE", location: "LOCATION", effects: "EFFECTS", immune: "IMMUNE", roll: "ROLL", environment: "ENV", creatureTable: "Creature hit-location table is not available in the imported stat block; damage was not auto-applied.",
    reach: "REACH", close: "CLOSE", medium: "MEDIUM", long: "LONG", extreme: "EXTREME",
  },
  ru: {
    title: "АКТИВНАЯ ВСТРЕЧА", hp: "HP", defense: "ЗАЩ", initiative: "ИНИЦ", level: "УР", resolved: "ЗАВЕРШЕНО", end: "ЗАВЕРШИТЬ ВСТРЕЧУ", attacks: "АТАКИ", dr: "DR",
    attack: "АТАКОВАТЬ", weapon: "ОРУЖИЕ", range: "ДИСТАНЦИЯ", light: "СВЕТ", useLight: "ВКЛЮЧИТЬ СВЕТ", noWeapons: "У персонажа нет оружия.", noAmmo: "Нет боеприпасов", hit: "ПОПАДАНИЕ", miss: "ПРОМАХ", tn: "ЦЕЛЬ", difficulty: "СЛОЖН", damage: "УРОН", location: "ЗОНА", effects: "ЭФФЕКТЫ", immune: "ИММУНИТЕТ", roll: "БРОСОК", environment: "СРЕДА", creatureTable: "В импортированном статблоке нет таблицы зон попадания этого существа; урон автоматически не применён.",
    reach: "ВПЛОТНУЮ", close: "БЛИЗКО", medium: "СРЕДНЕ", long: "ДАЛЕКО", extreme: "ЭКСТРЕМАЛЬНО",
  },
  uk: {
    title: "АКТИВНА ЗУСТРІЧ", hp: "HP", defense: "ЗАХ", initiative: "ІНІЦ", level: "РІВ", resolved: "ЗАВЕРШЕНО", end: "ЗАВЕРШИТИ ЗУСТРІЧ", attacks: "АТАКИ", dr: "DR",
    attack: "АТАКУВАТИ", weapon: "ЗБРОЯ", range: "ДИСТАНЦІЯ", light: "СВІТЛО", useLight: "УВІМКНУТИ СВІТЛО", noWeapons: "У персонажа немає зброї.", noAmmo: "Немає боєприпасів", hit: "ВЛУЧАННЯ", miss: "ПРОМАХ", tn: "ЦІЛЬ", difficulty: "СКЛАДН", damage: "ШКОДА", location: "ЗОНА", effects: "ЕФЕКТИ", immune: "ІМУНІТЕТ", roll: "КИДОК", environment: "СЕРЕДОВИЩЕ", creatureTable: "В імпортованому статблоці немає таблиці зон влучання цієї істоти; шкоду автоматично не застосовано.",
    reach: "ВПРИТУЛ", close: "БЛИЗЬКО", medium: "СЕРЕДНЯ", long: "ДАЛЕКА", extreme: "ЕКСТРЕМАЛЬНА",
  },
  pl: {
    title: "AKTYWNE SPOTKANIE", hp: "HP", defense: "OBR", initiative: "INIC", level: "POZ", resolved: "ZAKOŃCZONE", end: "ZAKOŃCZ SPOTKANIE", attacks: "ATAKI", dr: "DR",
    attack: "ATAKUJ", weapon: "BROŃ", range: "ZASIĘG", light: "ŚWIATŁO", useLight: "UŻYJ ŚWIATŁA", noWeapons: "Postać nie ma skonfigurowanej broni.", noAmmo: "Brak amunicji", hit: "TRAFIENIE", miss: "PUDŁO", tn: "CEL", difficulty: "TRUDN", damage: "OBRAŻENIA", location: "LOKACJA", effects: "EFEKTY", immune: "ODPORNOŚĆ", roll: "RZUT", environment: "ŚRODOWISKO", creatureTable: "W zaimportowanym bloku statystyk brak tabeli lokalizacji trafień tego stworzenia; obrażenia nie zostały zastosowane automatycznie.",
    reach: "ZASIĘG RĘKI", close: "BLISKI", medium: "ŚREDNI", long: "DALEKI", extreme: "EKSTREMALNY",
  },
};

function getLanguage(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

function isMeleeWeapon(weapon) {
  const skill = String(weapon?.skill || "").toLowerCase();
  return skill.includes("melee") || skill.includes("unarmed") || String(weapon?.range || "").toLowerCase() === "melee";
}

function formatDice(dice) {
  if (!Array.isArray(dice)) return "—";
  return dice.map((die) => `[${die?.value ?? die}]`).join(" ");
}

export default function ActiveBestiaryCombatPanel({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = TEXT[language];
  const [state, setState] = useState(() => readLatestCombat());
  const [expandedId, setExpandedId] = useState(null);
  const [selectedWeaponIndex, setSelectedWeaponIndex] = useState(0);
  const [targetRange, setTargetRange] = useState("close");
  const [useLight, setUseLight] = useState(false);
  const [lastResult, setLastResult] = useState(null);

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
  const weapons = useMemo(
    () => (Array.isArray(character?.weapons) ? character.weapons.filter((weapon) => String(weapon?.name || "").trim()) : []),
    [character?.weapons]
  );
  const selectedWeapon = weapons[selectedWeaponIndex] || weapons[0] || null;
  const modifiedWeapon = useMemo(
    () => selectedWeapon ? prepareCombatWeapon(selectedWeapon) : null,
    [selectedWeapon]
  );
  const environment = useMemo(
    () => getEnvironmentSnapshot({
      totalHours: Number(character?.mapData?.worldTotalHours || 0),
      regionId: character?.mapData?.regionId || "commonwealth",
      hazards: [],
      character,
    }),
    [character]
  );
  const lightToggleAvailable = Boolean(
    environment?.time?.isDark &&
    environment?.equipment?.hasLightSource &&
    !environment?.equipment?.hasNightVision
  );

  useEffect(() => {
    if (!modifiedWeapon) return;
    setTargetRange(isMeleeWeapon(modifiedWeapon) ? "reach" : "close");
    setLastResult(null);
  }, [selectedWeaponIndex]);

  useEffect(() => {
    if (!lightToggleAvailable) setUseLight(false);
  }, [lightToggleAvailable]);

  if (!state || !enemies.length) return null;

  const changeHp = (enemy, delta) => {
    const next = Number(enemy?.hp?.current || 0) + delta;
    updateCombatEnemyHp(state.sessionKey, enemy.instanceId, next);
  };

  const consumeOneAmmo = (weapon) => {
    if (!weapon?.ammo || typeof setCharacter !== "function") return;
    const ammo = String(weapon.ammo).trim().toLowerCase();
    setCharacter((prev) => {
      const items = Array.isArray(prev?.inventoryItems) ? [...prev.inventoryItems] : [];
      const index = items.findIndex(
        (item) => String(item?.name || "").trim().toLowerCase() === ammo
      );
      if (index < 0) return prev;
      const quantity = Math.max(0, Number(items[index]?.quantity || 0));
      if (quantity <= 0) return prev;
      items[index] = { ...items[index], quantity: String(quantity - 1) };
      return { ...prev, inventoryItems: items };
    });
  };

  const attackEnemy = (enemy) => {
    if (!selectedWeapon || enemy?.defeated || state.status === "resolved") return;
    const ammoState = getCombatWeaponAmmoState(character, modifiedWeapon);
    if (!ammoState.available) {
      setLastResult({ error: "no_ammo", ammo: ammoState.ammo, enemyId: enemy.instanceId });
      return;
    }

    const result = resolvePlayerBestiaryAttack({
      character,
      weapon: selectedWeapon,
      enemy,
      targetRange,
      useLight,
      diceCount: 2,
    });

    if (result?.attackRoll && result?.ammoSpent > 0) consumeOneAmmo(modifiedWeapon);

    if (!result?.attackRoll) {
      setLastResult({ ...result, enemyId: enemy.instanceId });
      return;
    }

    const applied = applyCombatAttackResult(state.sessionKey, enemy.instanceId, result);
    setLastResult({
      ...result,
      enemyId: enemy.instanceId,
      targetState: applied?.action?.target || null,
    });
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

      <div className="pip-active-combat__attack-toolbar">
        <label>
          <span>{copy.weapon}</span>
          <select
            className="pip-input"
            value={Math.min(selectedWeaponIndex, Math.max(0, weapons.length - 1))}
            onChange={(event) => setSelectedWeaponIndex(Number(event.target.value) || 0)}
            disabled={!weapons.length}
          >
            {weapons.length ? weapons.map((weapon, index) => (
              <option key={`${weapon?.inventoryId || weapon?.name || "weapon"}-${index}`} value={index}>
                {weapon?.name || `Weapon ${index + 1}`}
              </option>
            )) : <option value={0}>{copy.noWeapons}</option>}
          </select>
        </label>

        <label>
          <span>{copy.range}</span>
          <select className="pip-input" value={targetRange} onChange={(event) => setTargetRange(event.target.value)}>
            {COMBAT_TARGET_RANGES.map((range) => (
              <option key={range} value={range}>{copy[range] || range}</option>
            ))}
          </select>
        </label>

        {lightToggleAvailable ? (
          <label className="pip-active-combat__light-toggle">
            <span>{copy.light}</span>
            <button type="button" className={`pip-btn${useLight ? " is-primary" : ""}`} onClick={() => setUseLight((value) => !value)}>
              {copy.useLight}
            </button>
          </label>
        ) : null}
      </div>

      <div className="pip-active-combat__list">
        {enemies.map((enemy) => {
          const current = Number(enemy?.hp?.current || 0);
          const max = Number(enemy?.hp?.max || 0);
          const expanded = expandedId === enemy.instanceId;
          const ammoState = modifiedWeapon ? getCombatWeaponAmmoState(character, modifiedWeapon) : null;
          const result = lastResult?.enemyId === enemy.instanceId ? lastResult : null;
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

              <div className="pip-active-combat__attack-row">
                <button
                  type="button"
                  className="pip-btn is-primary pip-active-combat__attack-button"
                  onClick={() => attackEnemy(enemy)}
                  disabled={!selectedWeapon || enemy.defeated || state.status === "resolved" || (ammoState?.required && !ammoState.available)}
                >
                  {copy.attack}
                </button>
                {ammoState?.required ? (
                  <span className={!ammoState.available ? "is-alert" : ""}>
                    {ammoState.ammo}: {ammoState.quantity}
                  </span>
                ) : null}
              </div>

              {result ? (
                <div className={`pip-active-combat__result${result.hit ? " is-hit" : " is-miss"}`}>
                  {result.error === "no_ammo" ? (
                    <strong>{copy.noAmmo}: {result.ammo || "—"}</strong>
                  ) : result.needsHitLocationRule ? (
                    <>
                      <strong>{copy.hit}</strong>
                      <div>{copy.creatureTable}</div>
                    </>
                  ) : result.attackRoll ? (
                    <>
                      <div className="pip-active-combat__result-head">
                        <strong>{result.hit ? copy.hit : copy.miss}</strong>
                        <span>{copy.tn} {result.skill?.targetNumber ?? "—"}</span>
                        <span>{copy.difficulty} {result.difficulty ?? "—"}</span>
                      </div>
                      <div>{copy.roll}: {formatDice(result.attackRoll?.dice)} → {result.attackRoll?.totalSuccesses ?? 0}</div>
                      {result.difficultyBreakdown?.environment ? (
                        <div>{copy.environment}: {result.difficultyBreakdown.environment > 0 ? "+" : ""}{result.difficultyBreakdown.environment} {copy.difficulty}</div>
                      ) : null}
                      {result.hit && result.damageRoll ? (
                        <>
                          <div>{copy.location}: {result.hitLocationLabel || "—"}</div>
                          <div>{copy.damage}: {result.damageDiceCount} CD {formatDice(result.damageRoll?.dice)} = {result.damageRoll?.rawDamage ?? 0}</div>
                          <div>
                            DR: {result.resistance === "immune" ? copy.immune : result.resistance ?? 0}
                            {result.piercingIgnored ? ` → ${result.effectiveDr} (${copy.effects}: Piercing −${result.piercingIgnored})` : ""}
                          </div>
                          <strong>{copy.damage}: {result.totalFinalDamage ?? 0} HP</strong>
                          {result.radioactiveFinalDamage > 0 ? <div>RAD: {result.radioactiveFinalDamage}</div> : null}
                          {result.targetState ? <div>{copy.hp}: {result.targetState.hpBefore?.current ?? "—"} → {result.targetState.hpAfter?.current ?? "—"}</div> : null}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <strong>{result.error || "—"}</strong>
                  )}
                </div>
              ) : null}

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
