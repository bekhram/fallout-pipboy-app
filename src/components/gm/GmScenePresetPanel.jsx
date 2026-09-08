import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./gmScenePresetPanel.css";

const PRESETS = [
  {
    id: "wasteland-day-12",
    biome: "wasteland",
    time: "day",
    label: { en: "Wasteland", ru: "Пустошь", uk: "Пустка", pl: "Pustkowia" },
    url: "/maps/encounters/12x12/wasteland-day.svg",
    name: "Wasteland · Day · 12x12",
  },
  {
    id: "desert-day-12",
    biome: "desert",
    time: "day",
    label: { en: "Desert", ru: "Пустыня", uk: "Пустеля", pl: "Pustynia" },
    url: "/maps/encounters/12x12/desert-day.svg",
    name: "Desert · Day · 12x12",
  },
];

const COPY = {
  en: { title: "[ RANDOM ENCOUNTER MAPS ]", subtitle: "Built-in 12×12 scene backgrounds", day: "DAY", random: "RANDOM MAP", grid: "GRID VISIBILITY", weak: "WEAK", normal: "NORMAL", strong: "STRONG", applied: "Map applied to scene" },
  ru: { title: "[ КАРТЫ СЛУЧАЙНЫХ ЭНКАУНТЕРОВ ]", subtitle: "Готовые фоны сцен 12×12", day: "ДЕНЬ", random: "СЛУЧАЙНАЯ КАРТА", grid: "ВИДИМОСТЬ ГРИДА", weak: "СЛАБЫЙ", normal: "ОБЫЧНЫЙ", strong: "КОНТРАСТНЫЙ", applied: "Карта применена к сцене" },
  uk: { title: "[ МАПИ ВИПАДКОВИХ ЕНКАУНТЕРІВ ]", subtitle: "Готові фони сцен 12×12", day: "ДЕНЬ", random: "ВИПАДКОВА МАПА", grid: "ВИДИМІСТЬ СІТКИ", weak: "СЛАБКА", normal: "ЗВИЧАЙНА", strong: "КОНТРАСТНА", applied: "Мапу застосовано до сцени" },
  pl: { title: "[ MAPY LOSOWYCH SPOTKAŃ ]", subtitle: "Gotowe tła scen 12×12", day: "DZIEŃ", random: "LOSOWA MAPA", grid: "WIDOCZNOŚĆ SIATKI", weak: "SŁABA", normal: "NORMALNA", strong: "KONTRASTOWA", applied: "Mapa zastosowana do sceny" },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function makeStartZone(cols = 12, rows = 12) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function contrastKey(sceneId) {
  return `pip2d20_gm_grid_contrast_v1:${sceneId || "default"}`;
}

function readContrast(sceneId) {
  try {
    const value = localStorage.getItem(contrastKey(sceneId));
    return ["weak", "normal", "strong"].includes(value) ? value : "strong";
  } catch {
    return "strong";
  }
}

function applyContrastClass(value) {
  if (typeof document === "undefined") return;
  document.querySelectorAll(".gm-tactical-map-core .tactical-grid").forEach((node) => {
    node.classList.remove("gm-grid-contrast-weak", "gm-grid-contrast-normal", "gm-grid-contrast-strong");
    node.classList.add(`gm-grid-contrast-${value}`);
  });
}

export default function GmScenePresetPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const [contrast, setContrast] = useState(() => readContrast(scene?.sceneId));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = readContrast(scene?.sceneId);
    setContrast(next);
    applyContrastClass(next);
  }, [scene?.sceneId]);

  useEffect(() => {
    applyContrastClass(contrast);
    if (typeof document === "undefined") return undefined;
    const observer = new MutationObserver(() => applyContrastClass(contrast));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [contrast]);

  const activePreset = useMemo(
    () => PRESETS.find((preset) => scene?.backgroundUrl === preset.url) || null,
    [scene?.backgroundUrl]
  );

  if (!scene || session?.mode !== "host") return null;

  const applyPreset = async (preset) => {
    if (!preset) return;
    await session.updateTacticalScene?.({
      cols: 12,
      rows: 12,
      startZone: makeStartZone(12, 12),
      backgroundUrl: preset.url,
      backgroundName: preset.name,
    });
    setMessage(text.applied);
    window.setTimeout(() => setMessage(""), 1800);
  };

  const changeContrast = (value) => {
    setContrast(value);
    try { localStorage.setItem(contrastKey(scene.sceneId), value); } catch { /* best effort */ }
    applyContrastClass(value);
  };

  return (
    <section className="gm-scene-presets pip-panel">
      <header className="gm-scene-presets__head">
        <div><strong>{text.title}</strong><small>{text.subtitle}</small></div>
        <button type="button" className="pip-btn" onClick={() => applyPreset(PRESETS[Math.floor(Math.random() * PRESETS.length)])}>{text.random}</button>
      </header>

      <div className="gm-scene-presets__cards">
        {PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            className={`gm-scene-preset-card${activePreset?.id === preset.id ? " is-active" : ""}`}
            onClick={() => applyPreset(preset)}
          >
            <span className="gm-scene-preset-card__preview" style={{ backgroundImage: `url(${preset.url})` }} />
            <span className="gm-scene-preset-card__copy"><b>{preset.label[lang] || preset.label.en}</b><small>12×12 · {text.day}</small></span>
          </button>
        ))}
      </div>

      <div className="gm-scene-presets__grid-control">
        <span>{text.grid}</span>
        <div className="gm-scene-presets__grid-buttons">
          {["weak", "normal", "strong"].map((value) => (
            <button key={value} type="button" className={`pip-btn${contrast === value ? " is-primary" : ""}`} onClick={() => changeContrast(value)}>{text[value]}</button>
          ))}
        </div>
      </div>
      {message ? <div className="gm-scene-presets__message">{message}</div> : null}
    </section>
  );
}
