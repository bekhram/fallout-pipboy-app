import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import GmScenePresetPanel from "./GmScenePresetPanel.jsx";
import { generateProceduralEncounterSummary } from "../../utils/proceduralRoomContent.js";
import { normalizeEncounterDifficulty } from "../../utils/proceduralEncounterBalance.js";
import "./gmScenePresetPanelV2.css";

const DIFFICULTIES = ["easy", "standard", "hard", "deadly"];

const COPY = {
  en: {
    title: "ENCOUNTER DIFFICULTY",
    easy: "EASY", standard: "STANDARD", hard: "HARD", deadly: "DEADLY",
    target: "Target XP", actual: "Generated XP", reward: "XP / player",
    minion: "Minions", normal: "Standard", special: "Special", legendary: "Legendary",
    note: "Difficulty changes the XP budget and enemy rank mix. At most one legendary enemy is generated.",
  },
  ru: {
    title: "СЛОЖНОСТЬ ЭНКАУНТЕРА",
    easy: "ЛЁГКАЯ", standard: "ОБЫЧНАЯ", hard: "СЛОЖНАЯ", deadly: "СМЕРТЕЛЬНАЯ",
    target: "Целевой XP", actual: "XP врагов", reward: "XP / игрока",
    minion: "Миньоны", normal: "Стандартные", special: "Особые", legendary: "Легендарные",
    note: "Сложность меняет XP-бюджет и состав рангов. Легендарный враг — максимум один.",
  },
  uk: {
    title: "СКЛАДНІСТЬ ЕНКАУНТЕРА",
    easy: "ЛЕГКА", standard: "ЗВИЧАЙНА", hard: "СКЛАДНА", deadly: "СМЕРТЕЛЬНА",
    target: "Цільовий XP", actual: "XP ворогів", reward: "XP / гравця",
    minion: "Міньйони", normal: "Звичайні", special: "Особливі", legendary: "Легендарні",
    note: "Складність змінює XP-бюджет і склад рангів. Легендарний ворог — максимум один.",
  },
  pl: {
    title: "TRUDNOŚĆ SPOTKANIA",
    easy: "ŁATWA", standard: "STANDARDOWA", hard: "TRUDNA", deadly: "ŚMIERTELNA",
    target: "Docelowe XP", actual: "XP wrogów", reward: "XP / gracza",
    minion: "Sługi", normal: "Zwykli", special: "Specjalni", legendary: "Legendarni",
    note: "Trudność zmienia budżet XP i mieszankę rang. Maksymalnie jeden legendarny wróg.",
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
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)];
  const scene = session?.tacticalScene || null;
  const savedSpec = specFromScene(scene);
  const [difficulty, setDifficulty] = useState(() => normalizeEncounterDifficulty(savedSpec?.encounterDifficulty));

  useEffect(() => {
    setDifficulty(normalizeEncounterDifficulty(specFromScene(scene)?.encounterDifficulty));
  }, [scene?.sceneId]);

  const sessionWithDifficulty = useMemo(() => {
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
            },
          },
        });
      },
    };
  }, [session, difficulty]);

  const previewSpec = savedSpec ? { ...savedSpec, encounterDifficulty: difficulty } : null;
  const encounter = useMemo(
    () => (previewSpec ? generateProceduralEncounterSummary(previewSpec) : null),
    [previewSpec?.type, previewSpec?.seed, previewSpec?.avgPartyLevel, previewSpec?.partySize, previewSpec?.lootRarity, previewSpec?.wealth, difficulty]
  );

  const changeDifficulty = async (value) => {
    const next = normalizeEncounterDifficulty(value);
    setDifficulty(next);
    const spec = specFromScene(scene);
    if (!spec) return;
    await session.updateTacticalScene?.({
      environment: {
        ...(scene?.environment || {}),
        proceduralMapSpec: {
          ...spec,
          encounterDifficulty: next,
        },
      },
    });
  };

  const ranks = encounter?.rankCounts || { minion: 0, standard: 0, special: 0, legendary: 0 };

  return (
    <div className="gm-scene-preset-v2">
      <section className="gm-encounter-difficulty pip-panel">
        <label>
          <span>{text.title}</span>
          <select className="pip-input" value={difficulty} onChange={(event) => changeDifficulty(event.target.value)}>
            {DIFFICULTIES.map((value) => <option key={value} value={value}>{text[value]}</option>)}
          </select>
        </label>

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
      <GmScenePresetPanel session={sessionWithDifficulty} />
    </div>
  );
}
