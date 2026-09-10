import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GmScenePresetPanel from "./GmScenePresetPanel.jsx";
import { generateProceduralEncounterSummary } from "../../utils/proceduralRoomContent.js";
import { normalizeEncounterDifficulty } from "../../utils/proceduralEncounterBalance.js";
import {
  ENEMY_GROUP_OPTIONS,
  enemyGroupLabel,
  normalizeEnemyGroup,
} from "../../utils/proceduralEnemyGroups.js";
import "./gmScenePresetPanelV2.css";

const DIFFICULTIES = ["easy", "standard", "hard", "deadly"];

const COPY = {
  en: {
    title: "ENCOUNTER DIFFICULTY",
    faction: "ENEMY FACTION / TYPE",
    easy: "EASY", standard: "STANDARD", hard: "HARD", deadly: "DEADLY",
    target: "Target XP", actual: "Generated XP", reward: "XP / player",
    minion: "Minions", normal: "Standard", special: "Special", legendary: "Legendary",
    note: "Enemies are grouped by faction/type. A room never mixes incompatible groups. Auto can use different groups in different rooms.",
  },
  ru: {
    title: "СЛОЖНОСТЬ ЭНКАУНТЕРА",
    faction: "ФРАКЦИЯ / ТИП ВРАГОВ",
    easy: "ЛЁГКАЯ", standard: "ОБЫЧНАЯ", hard: "СЛОЖНАЯ", deadly: "СМЕРТЕЛЬНАЯ",
    target: "Целевой XP", actual: "XP врагов", reward: "XP / игрока",
    minion: "Миньоны", normal: "Стандартные", special: "Особые", legendary: "Легендарные",
    note: "Враги разделены по фракциям и типам. В одной комнате несовместимые группы не смешиваются. В режиме АВТО разные комнаты могут иметь разные группы.",
  },
  uk: {
    title: "СКЛАДНІСТЬ ЕНКАУНТЕРА",
    faction: "ФРАКЦІЯ / ТИП ВОРОГІВ",
    easy: "ЛЕГКА", standard: "ЗВИЧАЙНА", hard: "СКЛАДНА", deadly: "СМЕРТЕЛЬНА",
    target: "Цільовий XP", actual: "XP ворогів", reward: "XP / гравця",
    minion: "Міньйони", normal: "Звичайні", special: "Особливі", legendary: "Легендарні",
    note: "Вороги розділені за фракціями й типами. В одній кімнаті несумісні групи не змішуються. В режимі АВТО різні кімнати можуть мати різні групи.",
  },
  pl: {
    title: "TRUDNOŚĆ SPOTKANIA",
    faction: "FRAKCJA / TYP WROGÓW",
    easy: "ŁATWA", standard: "STANDARDOWA", hard: "TRUDNA", deadly: "ŚMIERTELNA",
    target: "Docelowe XP", actual: "XP wrogów", reward: "XP / gracza",
    minion: "Sługi", normal: "Zwykli", special: "Specjalni", legendary: "Legendarni",
    note: "Wrogowie są dzieleni według frakcji i typu. Jedno pomieszczenie nigdy nie miesza niekompatybilnych grup. AUTO może użyć różnych grup w różnych pokojach.",
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

  useEffect(() => {
    const spec = specFromScene(scene);
    setDifficulty(normalizeEncounterDifficulty(spec?.encounterDifficulty));
    setEnemyFaction(normalizeEnemyGroup(spec?.enemyFaction));
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
            },
          },
        });
      },
    };
  }, [session, difficulty, enemyFaction]);

  const previewSpec = savedSpec
    ? { ...savedSpec, encounterDifficulty: difficulty, enemyFaction }
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

  const ranks = encounter?.rankCounts || { minion: 0, standard: 0, special: 0, legendary: 0 };

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
        </div>

        {encounter ? (
          <div className="gm-encounter-difficulty__summary">
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
