import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GmScenePresetPanel from "./GmScenePresetPanel.jsx";
import { generateProceduralEncounterSummary } from "../../utils/proceduralRoomContent.js";
import {
  MAX_MANUAL_ENEMY_COUNT,
  normalizeEncounterDifficulty,
  normalizeEnemyCountOverride,
} from "../../utils/proceduralEncounterBalance.js";
import {
  ENEMY_GROUP_OPTIONS,
  enemyGroupLabel,
  normalizeEnemyGroup,
} from "../../utils/proceduralEnemyGroups.js";
import {
  normalizeTrapCount,
  normalizeTrapLethality,
} from "../../utils/proceduralBattlemapExtras.js";
import "./gmScenePresetPanelV2.css";

const DIFFICULTIES = ["easy", "standard", "hard", "deadly"];
const TRAP_LETHALITIES = ["low", "standard", "high", "deadly"];

const COPY = {
  en: {
    title: "ENCOUNTER DIFFICULTY",
    faction: "ENEMY FACTION / TYPE",
    enemyCount: "ENEMY COUNT (0 = AUTO)",
    enemies: "Enemies",
    easy: "EASY", standard: "STANDARD", hard: "HARD", deadly: "DEADLY",
    target: "Target XP", actual: "Generated XP", reward: "XP / player",
    minion: "Minions", normal: "Standard", special: "Special", legendary: "Legendary",
    note: "Enemies are grouped by faction/type. Set enemy count to 0 for automatic difficulty-based generation, or choose an exact total manually.",
    traps: "TRAPS", trapCount: "TRAP COUNT", trapLethality: "TRAP LETHALITY",
    low: "LOW", high: "HIGH",
  },
  ru: {
    title: "СЛОЖНОСТЬ ЭНКАУНТЕРА",
    faction: "ФРАКЦИЯ / ТИП ВРАГОВ",
    enemyCount: "КОЛИЧЕСТВО ВРАГОВ (0 = АВТО)",
    enemies: "Врагов",
    easy: "ЛЁГКАЯ", standard: "ОБЫЧНАЯ", hard: "СЛОЖНАЯ", deadly: "СМЕРТЕЛЬНАЯ",
    target: "Целевой XP", actual: "XP врагов", reward: "XP / игрока",
    minion: "Миньоны", normal: "Стандартные", special: "Особые", legendary: "Легендарные",
    note: "При значении 0 количество врагов рассчитывается автоматически по сложности. Любое другое число задаёт точное общее количество врагов, сохраняя выбранную сложность и распределение рангов.",
    traps: "ЛОВУШКИ", trapCount: "КОЛИЧЕСТВО ЛОВУШЕК", trapLethality: "СМЕРТЕЛЬНОСТЬ ЛОВУШЕК",
    low: "НИЗКАЯ", high: "ВЫСОКАЯ",
  },
  uk: {
    title: "СКЛАДНІСТЬ ЕНКАУНТЕРА",
    faction: "ФРАКЦІЯ / ТИП ВОРОГІВ",
    enemyCount: "КІЛЬКІСТЬ ВОРОГІВ (0 = АВТО)",
    enemies: "Ворогів",
    easy: "ЛЕГКА", standard: "ЗВИЧАЙНА", hard: "СКЛАДНА", deadly: "СМЕРТЕЛЬНА",
    target: "Цільовий XP", actual: "XP ворогів", reward: "XP / гравця",
    minion: "Міньйони", normal: "Звичайні", special: "Особливі", legendary: "Легендарні",
    note: "За значення 0 кількість ворогів розраховується автоматично за складністю. Інше число задає точну загальну кількість ворогів, зберігаючи вибрану складність і розподіл рангів.",
    traps: "ПАСТКИ", trapCount: "КІЛЬКІСТЬ ПАСТОК", trapLethality: "СМЕРТЕЛЬНІСТЬ ПАСТОК",
    low: "НИЗЬКА", high: "ВИСОКА",
  },
  pl: {
    title: "TRUDNOŚĆ SPOTKANIA",
    faction: "FRAKCJA / TYP WROGÓW",
    enemyCount: "LICZBA WROGÓW (0 = AUTO)",
    enemies: "Wrogowie",
    easy: "ŁATWA", standard: "STANDARDOWA", hard: "TRUDNA", deadly: "ŚMIERTELNA",
    target: "Docelowe XP", actual: "XP wrogów", reward: "XP / gracza",
    minion: "Sługi", normal: "Zwykli", special: "Specjalni", legendary: "Legendarni",
    note: "Wartość 0 oblicza liczbę wrogów automatycznie z poziomu trudności. Inna liczba ustawia dokładną liczbę wrogów, zachowując trudność i podział rang.",
    traps: "PUŁAPKI", trapCount: "LICZBA PUŁAPEK", trapLethality: "ŚMIERTELNOŚĆ PUŁAPEK",
    low: "NISKA", high: "WYSOKA",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function specFromScene(scene) {
  const spec = scene?.environment?.proceduralMapSpec;
  return spec && typeof spec === "object" ? spec : null;
}

export default function GmScenePresetPanelV2({ session }) {
  const { i18n } = useTranslation();
  const lang = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const savedSpec = specFromScene(scene);
  const [difficulty, setDifficulty] = useState(() => normalizeEncounterDifficulty(savedSpec?.encounterDifficulty));
  const [enemyFaction, setEnemyFaction] = useState(() => normalizeEnemyGroup(savedSpec?.enemyFaction));
  const [enemyCountOverride, setEnemyCountOverride] = useState(() => normalizeEnemyCountOverride(savedSpec?.enemyCountOverride));
  const [trapCount, setTrapCount] = useState(() => normalizeTrapCount(savedSpec?.trapCount));
  const [trapLethality, setTrapLethality] = useState(() => normalizeTrapLethality(savedSpec?.trapLethality));

  useEffect(() => {
    const spec = specFromScene(scene);
    setDifficulty(normalizeEncounterDifficulty(spec?.encounterDifficulty));
    setEnemyFaction(normalizeEnemyGroup(spec?.enemyFaction));
    setEnemyCountOverride(normalizeEnemyCountOverride(spec?.enemyCountOverride));
    setTrapCount(normalizeTrapCount(spec?.trapCount));
    setTrapLethality(normalizeTrapLethality(spec?.trapLethality));
  }, [scene?.sceneId]);

  const sessionWithEncounterSettings = useMemo(() => {
    if (!session) return session;
    return {
      ...session,
      updateTacticalScene: async (patch = {}) => {
        const environment = patch?.environment;
        const proceduralMapSpec = environment?.proceduralMapSpec;
        if (!proceduralMapSpec) return session.updateTacticalScene?.(patch);
        return session.updateTacticalScene?.({
          ...patch,
          environment: {
            ...environment,
            proceduralMapSpec: {
              ...proceduralMapSpec,
              encounterDifficulty: difficulty,
              enemyFaction,
              enemyCountOverride,
              trapCount,
              trapLethality,
            },
          },
        });
      },
    };
  }, [session, difficulty, enemyFaction, enemyCountOverride, trapCount, trapLethality]);

  const previewSpec = savedSpec
    ? { ...savedSpec, encounterDifficulty: difficulty, enemyFaction, enemyCountOverride, trapCount, trapLethality }
    : null;
  const encounter = useMemo(
    () => (previewSpec ? generateProceduralEncounterSummary(previewSpec) : null),
    [
      previewSpec?.type,
      previewSpec?.seed,
      previewSpec?.avgPartyLevel,
      previewSpec?.partySize,
      previewSpec?.lootRarity,
      previewSpec?.wealth,
      difficulty,
      enemyFaction,
      enemyCountOverride,
    ]
  );

  const persistSetting = async (patch) => {
    const spec = specFromScene(scene);
    if (!spec) return;
    await session.updateTacticalScene?.({
      environment: {
        ...(scene?.environment || {}),
        proceduralMapSpec: {
          ...spec,
          encounterDifficulty: difficulty,
          enemyFaction,
          enemyCountOverride,
          trapCount,
          trapLethality,
          ...patch,
        },
      },
    });
  };

  const changeDifficulty = async (value) => {
    const next = normalizeEncounterDifficulty(value);
    setDifficulty(next);
    await persistSetting({ encounterDifficulty: next, enemyFaction });
  };

  const changeEnemyFaction = async (value) => {
    const next = normalizeEnemyGroup(value);
    setEnemyFaction(next);
    await persistSetting({ enemyFaction: next, encounterDifficulty: difficulty });
  };

  const changeEnemyCount = async (value) => {
    const next = normalizeEnemyCountOverride(value);
    setEnemyCountOverride(next);
    await persistSetting({ enemyCountOverride: next });
  };

  const changeTrapCount = async (value) => {
    const next = normalizeTrapCount(value);
    setTrapCount(next);
    await persistSetting({ trapCount: next });
  };

  const changeTrapLethality = async (value) => {
    const next = normalizeTrapLethality(value);
    setTrapLethality(next);
    await persistSetting({ trapLethality: next });
  };

  const ranks = encounter?.rankCounts || { minion: 0, standard: 0, special: 0, legendary: 0 };
  const generatedEnemyCount = encounter?.enemyCount ?? (ranks.minion + ranks.standard + ranks.special + ranks.legendary);

  return (
    <div className="gm-scene-preset-v2">
      <section className="gm-encounter-difficulty pip-panel">
        <div className="gm-encounter-difficulty__controls">
          <label>
            <span>{text.title}</span>
            <select className="pip-input" value={difficulty} onChange={(event) => changeDifficulty(event.target.value)}>
              {DIFFICULTIES.map((value) => <option key={value} value={value}>{text[value]}</option>)}
            </select>
          </label>

          <label>
            <span>{text.faction}</span>
            <select className="pip-input" value={enemyFaction} onChange={(event) => changeEnemyFaction(event.target.value)}>
              {ENEMY_GROUP_OPTIONS.map((value) => (
                <option key={value} value={value}>{enemyGroupLabel(value, lang)}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{text.enemyCount}</span>
            <input
              className="pip-input"
              type="number"
              min="0"
              max={MAX_MANUAL_ENEMY_COUNT}
              value={enemyCountOverride}
              onChange={(event) => changeEnemyCount(event.target.value)}
            />
          </label>

          <label>
            <span>{text.trapCount}</span>
            <input className="pip-input" type="number" min="0" max="8" value={trapCount} onChange={(event) => changeTrapCount(event.target.value)} />
          </label>

          <label>
            <span>{text.trapLethality}</span>
            <select className="pip-input" value={trapLethality} onChange={(event) => changeTrapLethality(event.target.value)}>
              {TRAP_LETHALITIES.map((value) => <option key={value} value={value}>{text[value]}</option>)}
            </select>
          </label>
        </div>

        {encounter ? (
          <div className="gm-encounter-difficulty__summary">
            <span>{text.enemies}<b>{generatedEnemyCount}</b></span>
            <span>{text.target}<b>{encounter.targetXp}</b></span>
            <span>{text.actual}<b>{encounter.actualXp}</b></span>
            <span>{text.reward}<b>{encounter.xpPerPlayer}</b></span>
          </div>
        ) : null}

        {encounter ? (
          <div className="gm-encounter-difficulty__ranks">
            <span>{text.minion}<b>{ranks.minion}</b></span>
            <span>{text.normal}<b>{ranks.standard}</b></span>
            <span>{text.special}<b>{ranks.special}</b></span>
            <span>{text.legendary}<b>{ranks.legendary}</b></span>
          </div>
        ) : null}

        <small>{text.note}</small>
      </section>
      <GmScenePresetPanel session={sessionWithEncounterSettings} />
    </div>
  );
}
