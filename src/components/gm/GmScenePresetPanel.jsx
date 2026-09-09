import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  generateProceduralMapDataUrl,
  makeProceduralSeed,
  proceduralLocationType,
} from "../../utils/proceduralMapGenerator.js";
import "./gmScenePresetPanel.css";

const MAP_TYPES = ["wasteland", "red_rocket", "super_duper_mart", "raider_camp", "military_bunker"];
const GRID_SIZES = ["8x8", "12x12", "16x12", "16x16"];

const LABELS = {
  en: {
    wasteland: "Wasteland",
    red_rocket: "Red Rocket",
    super_duper_mart: "Super-Duper Mart",
    raider_camp: "Raider Camp",
    military_bunker: "Military Bunker",
  },
  ru: {
    wasteland: "Пустошь",
    red_rocket: "Красная Ракета",
    super_duper_mart: "Супер-Дупер Март",
    raider_camp: "Лагерь рейдеров",
    military_bunker: "Военный бункер",
  },
  uk: {
    wasteland: "Пустка",
    red_rocket: "Червона Ракета",
    super_duper_mart: "Супер-Дупер Март",
    raider_camp: "Табір рейдерів",
    military_bunker: "Військовий бункер",
  },
  pl: {
    wasteland: "Pustkowie",
    red_rocket: "Red Rocket",
    super_duper_mart: "Super-Duper Mart",
    raider_camp: "Obóz raiderów",
    military_bunker: "Bunkier wojskowy",
  },
};

const COPY = {
  en: {
    title: "[ FALLOUT MAP GENERATOR ]",
    subtitle: "Donjon-style visual map · generated locally from a compact seed",
    type: "LOCATION",
    gridSize: "MAP SIZE",
    seed: "SEED",
    density: "DETAIL DENSITY",
    newSeed: "NEW SEED",
    generate: "GENERATE / APPLY",
    regenerate: "NEW VARIANT",
    customUpload: "UPLOAD CUSTOM BACKGROUND",
    custom: "Custom PNG/JPEG/WebP remains fully supported if you do not want to use the generator.",
    visualOnly: "Rooms, walls, doors and scenery are visual parts of the background only. They do not block token movement or apply combat rules.",
    grid: "GRID VISIBILITY",
    weak: "WEAK",
    normal: "NORMAL",
    strong: "STRONG",
    applied: "Generated background applied to scene",
    deterministic: "Same seed + settings = same background for every player without storing a full-size map image.",
  },
  ru: {
    title: "[ ГЕНЕРАТОР КАРТ FALLOUT ]",
    subtitle: "Визуальная карта в стиле donjon · локальная генерация из компактного seed",
    type: "ЛОКАЦИЯ",
    gridSize: "РАЗМЕР КАРТЫ",
    seed: "SEED",
    density: "ПЛОТНОСТЬ ДЕТАЛЕЙ",
    newSeed: "НОВЫЙ SEED",
    generate: "СГЕНЕРИРОВАТЬ / ПРИМЕНИТЬ",
    regenerate: "НОВЫЙ ВАРИАНТ",
    customUpload: "ЗАГРУЗИТЬ СВОЙ ФОН",
    custom: "PNG/JPEG/WebP можно по-прежнему загрузить вручную, если генератор не нужен.",
    visualOnly: "Комнаты, стены, двери и декорации — только часть рисунка. Они не блокируют токены и не добавляют боевых правил.",
    grid: "ВИДИМОСТЬ ГРИДА",
    weak: "СЛАБЫЙ",
    normal: "ОБЫЧНЫЙ",
    strong: "КОНТРАСТНЫЙ",
    applied: "Сгенерированный фон применён к сцене",
    deterministic: "Одинаковый seed + настройки = одинаковый фон у всех игроков без хранения полноразмерной картинки.",
  },
  uk: {
    title: "[ ГЕНЕРАТОР МАП FALLOUT ]",
    subtitle: "Візуальна мапа у стилі donjon · локальна генерація з компактного seed",
    type: "ЛОКАЦІЯ",
    gridSize: "РОЗМІР МАПИ",
    seed: "SEED",
    density: "ЩІЛЬНІСТЬ ДЕТАЛЕЙ",
    newSeed: "НОВИЙ SEED",
    generate: "ЗГЕНЕРУВАТИ / ЗАСТОСУВАТИ",
    regenerate: "НОВИЙ ВАРІАНТ",
    customUpload: "ЗАВАНТАЖИТИ ВЛАСНИЙ ФОН",
    custom: "PNG/JPEG/WebP як і раніше можна завантажити вручну, якщо генератор не потрібен.",
    visualOnly: "Кімнати, стіни, двері та декорації — лише частина малюнка. Вони не блокують токени й не додають бойових правил.",
    grid: "ВИДИМІСТЬ СІТКИ",
    weak: "СЛАБКА",
    normal: "ЗВИЧАЙНА",
    strong: "КОНТРАСТНА",
    applied: "Згенерований фон застосовано до сцени",
    deterministic: "Однаковий seed + налаштування = однаковий фон у всіх гравців без зберігання повнорозмірного зображення.",
  },
  pl: {
    title: "[ GENERATOR MAP FALLOUT ]",
    subtitle: "Wizualna mapa w stylu donjon · lokalna generacja z kompaktowego seed",
    type: "LOKACJA",
    gridSize: "ROZMIAR MAPY",
    seed: "SEED",
    density: "GĘSTOŚĆ SZCZEGÓŁÓW",
    newSeed: "NOWY SEED",
    generate: "GENERUJ / ZASTOSUJ",
    regenerate: "NOWY WARIANT",
    customUpload: "WGRAJ WŁASNE TŁO",
    custom: "PNG/JPEG/WebP nadal można wgrać ręcznie, jeśli generator nie jest potrzebny.",
    visualOnly: "Pomieszczenia, ściany, drzwi i dekoracje są tylko częścią obrazu. Nie blokują tokenów i nie dodają zasad walki.",
    grid: "WIDOCZNOŚĆ SIATKI",
    weak: "SŁABA",
    normal: "NORMALNA",
    strong: "KONTRASTOWA",
    applied: "Wygenerowane tło zastosowano do sceny",
    deterministic: "Ten sam seed + ustawienia = to samo tło u wszystkich graczy bez przechowywania pełnego obrazu mapy.",
  },
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

function sceneGrid(scene) {
  const value = `${Number(scene?.cols || 12)}x${Number(scene?.rows || 12)}`;
  return GRID_SIZES.includes(value) ? value : "12x12";
}

export default function GmScenePresetPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const [type, setType] = useState("wasteland");
  const [gridSize, setGridSize] = useState(() => sceneGrid(scene));
  const [seed, setSeed] = useState(() => makeProceduralSeed());
  const [density, setDensity] = useState(55);
  const [contrast, setContrast] = useState(() => readContrast(scene?.sceneId));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGridSize(sceneGrid(scene));
    const next = readContrast(scene?.sceneId);
    setContrast(next);
    applyContrastClass(next);
  }, [scene?.sceneId, scene?.cols, scene?.rows]);

  useEffect(() => {
    applyContrastClass(contrast);
    if (typeof document === "undefined") return undefined;
    const observer = new MutationObserver(() => applyContrastClass(contrast));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [contrast]);

  const [cols, rows] = useMemo(() => gridSize.split("x").map(Number), [gridSize]);
  const generationSpec = useMemo(
    () => ({ type, seed, cols, rows, density: density / 100 }),
    [type, seed, cols, rows, density]
  );
  const previewUrl = useMemo(() => generateProceduralMapDataUrl(generationSpec), [generationSpec]);

  if (!scene || session?.mode !== "host") return null;

  const generate = async ({ newSeed = false } = {}) => {
    const nextSeed = newSeed ? makeProceduralSeed() : seed || makeProceduralSeed();
    if (nextSeed !== seed) setSeed(nextSeed);
    const nextSpec = {
      type,
      seed: nextSeed,
      cols,
      rows,
      density: density / 100,
    };
    const locationType = proceduralLocationType(type);
    await session.updateTacticalScene?.({
      cols,
      rows,
      startZone: makeStartZone(cols, rows),
      backgroundUrl: "",
      backgroundName: `PROC // ${LABELS.en[type]} // ${nextSeed}`,
      environment: {
        ...(scene.environment || {}),
        locationType,
        mapAssetId: `procedural:${type}:visual-v1`,
        mapVariantSeed: nextSeed,
        proceduralMapSpec: nextSpec,
        proceduralMap: null,
        proceduralDoorStates: {},
      },
    });
    setMessage(text.applied);
    window.setTimeout(() => setMessage(""), 1800);
  };

  const changeContrast = (value) => {
    setContrast(value);
    try {
      localStorage.setItem(contrastKey(scene.sceneId), value);
    } catch {
      /* best effort */
    }
    applyContrastClass(value);
  };

  const uploadCustom = () => {
    if (typeof document === "undefined") return;
    document.querySelector(".gm-tactical-map-core .tactical-background-input")?.click();
  };

  return (
    <section className="gm-scene-presets gm-proc-map pip-panel">
      <header className="gm-scene-presets__head">
        <div>
          <strong>{text.title}</strong>
          <small>{text.subtitle}</small>
        </div>
      </header>

      <div className="gm-proc-map__preview" style={{ backgroundImage: `url(${JSON.stringify(previewUrl)})` }}>
        <span>{LABELS[lang]?.[type] || LABELS.en[type]}</span>
        <small>{cols}×{rows} · seed {seed}</small>
      </div>

      <div className="gm-proc-map__controls">
        <label>
          <span>{text.type}</span>
          <select className="pip-input" value={type} onChange={(event) => setType(event.target.value)}>
            {MAP_TYPES.map((value) => (
              <option key={value} value={value}>{LABELS[lang]?.[value] || LABELS.en[value]}</option>
            ))}
          </select>
        </label>

        <label>
          <span>{text.gridSize}</span>
          <select className="pip-input" value={gridSize} onChange={(event) => setGridSize(event.target.value)}>
            {GRID_SIZES.map((value) => <option key={value} value={value}>{value.replace("x", "×")}</option>)}
          </select>
        </label>

        <label className="gm-proc-map__seed">
          <span>{text.seed}</span>
          <div>
            <input className="pip-input" value={seed} maxLength={40} onChange={(event) => setSeed(event.target.value)} />
            <button type="button" className="pip-btn" onClick={() => setSeed(makeProceduralSeed())}>{text.newSeed}</button>
          </div>
        </label>

        <label className="gm-proc-map__density">
          <span>{text.density}: {density}%</span>
          <input type="range" min="10" max="100" step="5" value={density} onChange={(event) => setDensity(Number(event.target.value))} />
        </label>
      </div>

      <div className="gm-proc-map__actions">
        <button type="button" className="pip-btn is-primary" onClick={() => generate()}>{text.generate}</button>
        <button type="button" className="pip-btn" onClick={() => generate({ newSeed: true })}>{text.regenerate}</button>
        <button type="button" className="pip-btn" onClick={uploadCustom}>{text.customUpload}</button>
      </div>

      <div className="gm-proc-map__note">{text.visualOnly}</div>
      <div className="gm-proc-map__note">{text.deterministic}</div>
      <div className="gm-proc-map__custom">{text.custom}</div>

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
