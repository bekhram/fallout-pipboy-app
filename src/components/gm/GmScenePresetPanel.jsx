import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  generateProceduralMapDataUrl,
  makeProceduralSeed,
  proceduralLocationType,
} from "../../utils/proceduralMapGenerator.js";
import {
  generateProceduralEncounterSummary,
  normalizeLootRarity,
} from "../../utils/proceduralRoomContent.js";
import "./gmScenePresetPanel.css";

const MAP_TYPES = ["wasteland", "residential_house", "red_rocket", "super_duper_mart", "raider_camp", "military_bunker"];
const GRID_SIZES = ["8x8", "12x12", "18x18", "24x24", "30x30", "42x42", "54x54", "66x66"];
const LOOT_RARITIES = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const WEALTH_LEVELS = ["poor", "standard", "rich", "wealthy"];

const LABELS = {
  en: { wasteland: "Wasteland", residential_house: "Residential House", red_rocket: "Red Rocket", super_duper_mart: "Super-Duper Mart", raider_camp: "Raider Camp", military_bunker: "Military Bunker" },
  ru: { wasteland: "Пустошь", residential_house: "Жилой дом", red_rocket: "Красная Ракета", super_duper_mart: "Супер-Дупер Март", raider_camp: "Лагерь рейдеров", military_bunker: "Военный бункер" },
  uk: { wasteland: "Пустка", residential_house: "Житловий будинок", red_rocket: "Червона Ракета", super_duper_mart: "Супер-Дупер Март", raider_camp: "Табір рейдерів", military_bunker: "Військовий бункер" },
  pl: { wasteland: "Pustkowie", residential_house: "Dom mieszkalny", red_rocket: "Red Rocket", super_duper_mart: "Super-Duper Mart", raider_camp: "Obóz raiderów", military_bunker: "Bunkier wojskowy" },
};

const WEALTH_LABELS = {
  en: { poor: "Poor", standard: "Standard", rich: "Rich", wealthy: "Wealthy" },
  ru: { poor: "Бедная", standard: "Средняя", rich: "Богатая", wealthy: "Очень богатая" },
  uk: { poor: "Бідна", standard: "Середня", rich: "Багата", wealthy: "Дуже багата" },
  pl: { poor: "Biedna", standard: "Standardowa", rich: "Bogata", wealthy: "Bardzo bogata" },
};

const DIFFICULTY_LABELS = {
  en: { easy: "Easy", standard: "Standard", hard: "Hard", deadly: "Deadly" },
  ru: { easy: "Лёгкая", standard: "Обычная", hard: "Сложная", deadly: "Смертельно опасная" },
  uk: { easy: "Легка", standard: "Звичайна", hard: "Складна", deadly: "Смертельно небезпечна" },
  pl: { easy: "Łatwa", standard: "Standardowa", hard: "Trudna", deadly: "Śmiertelna" },
};

const COPY = {
  en: {
    title: "[ FALLOUT MAP GENERATOR ]", subtitle: "Donjon-style visual map · generated locally from a compact seed", type: "LOCATION", gridSize: "MAP SIZE", seed: "SEED", density: "DETAIL DENSITY", newSeed: "NEW SEED",
    lootRarity: "MAX LOOT RARITY", wealth: "LOCATION WEALTH", partyLevel: "AVG. PARTY LEVEL", partySize: "PARTY SIZE", detected: "player token(s) detected", useDetected: "USE DETECTED",
    balance: "ENCOUNTER BALANCE", enemies: "Enemies", xpBudget: "Target XP", actualXp: "Generated XP", xpPerPlayer: "XP / player", difficulty: "Difficulty",
    generate: "GENERATE / APPLY", regenerate: "NEW VARIANT", customUpload: "UPLOAD CUSTOM BACKGROUND", custom: "Custom PNG/JPEG/WebP remains fully supported if you do not want to use the generator.",
    visualOnly: "Rooms, walls, doors and scenery are visual parts of the background only. They do not block token movement or apply combat rules.", grid: "GRID VISIBILITY", weak: "WEAK", normal: "NORMAL", strong: "STRONG", applied: "Generated background applied to scene",
    deterministic: "Same seed + settings = same map, loot and encounter without storing a full-size map image.",
  },
  ru: {
    title: "[ ГЕНЕРАТОР КАРТ FALLOUT ]", subtitle: "Визуальная карта в стиле donjon · локальная генерация из компактного seed", type: "ЛОКАЦИЯ", gridSize: "РАЗМЕР КАРТЫ", seed: "SEED", density: "ПЛОТНОСТЬ ДЕТАЛЕЙ", newSeed: "НОВЫЙ SEED",
    lootRarity: "МАКС. РЕДКОСТЬ ЛУТА", wealth: "БОГАТСТВО ЛОКАЦИИ", partyLevel: "СР. УРОВЕНЬ ГРУППЫ", partySize: "РАЗМЕР ГРУППЫ", detected: "токенов игроков обнаружено", useDetected: "ВЗЯТЬ ИЗ СЦЕНЫ",
    balance: "БАЛАНС ЭНКАУНТЕРА", enemies: "Врагов", xpBudget: "Целевой XP", actualXp: "XP врагов", xpPerPlayer: "XP / игрока", difficulty: "Сложность",
    generate: "СГЕНЕРИРОВАТЬ / ПРИМЕНИТЬ", regenerate: "НОВЫЙ ВАРИАНТ", customUpload: "ЗАГРУЗИТЬ СВОЙ ФОН", custom: "PNG/JPEG/WebP можно по-прежнему загрузить вручную, если генератор не нужен.",
    visualOnly: "Комнаты, стены, двери и декорации — только часть рисунка. Они не блокируют токены и не добавляют боевых правил.", grid: "ВИДИМОСТЬ ГРИДА", weak: "СЛАБЫЙ", normal: "ОБЫЧНЫЙ", strong: "КОНТРАСТНЫЙ", applied: "Сгенерированный фон применён к сцене",
    deterministic: "Одинаковый seed + настройки = одинаковая карта, лут и энкаунтер без хранения полноразмерной картинки.",
  },
  uk: {
    title: "[ ГЕНЕРАТОР МАП FALLOUT ]", subtitle: "Візуальна мапа у стилі donjon · локальна генерація з компактного seed", type: "ЛОКАЦІЯ", gridSize: "РОЗМІР МАПИ", seed: "SEED", density: "ЩІЛЬНІСТЬ ДЕТАЛЕЙ", newSeed: "НОВИЙ SEED",
    lootRarity: "МАКС. РІДКІСТЬ ЛУТУ", wealth: "БАГАТСТВО ЛОКАЦІЇ", partyLevel: "СЕР. РІВЕНЬ ГРУПИ", partySize: "РОЗМІР ГРУПИ", detected: "токенів гравців виявлено", useDetected: "ВЗЯТИ ЗІ СЦЕНИ",
    balance: "БАЛАНС ЕНКАУНТЕРА", enemies: "Ворогів", xpBudget: "Цільовий XP", actualXp: "XP ворогів", xpPerPlayer: "XP / гравця", difficulty: "Складність",
    generate: "ЗГЕНЕРУВАТИ / ЗАСТОСУВАТИ", regenerate: "НОВИЙ ВАРІАНТ", customUpload: "ЗАВАНТАЖИТИ ВЛАСНИЙ ФОН", custom: "PNG/JPEG/WebP як і раніше можна завантажити вручну, якщо генератор не потрібен.",
    visualOnly: "Кімнати, стіни, двері та декорації — лише частина малюнка. Вони не блокують токени й не додають бойових правил.", grid: "ВИДИМІСТЬ СІТКИ", weak: "СЛАБКА", normal: "ЗВИЧАЙНА", strong: "КОНТРАСТНА", applied: "Згенерований фон застосовано до сцени",
    deterministic: "Однаковий seed + налаштування = однакова мапа, лут і енкаунтер без зберігання повнорозмірного зображення.",
  },
  pl: {
    title: "[ GENERATOR MAP FALLOUT ]", subtitle: "Wizualna mapa w stylu donjon · lokalna generacja z kompaktowego seed", type: "LOKACJA", gridSize: "ROZMIAR MAPY", seed: "SEED", density: "GĘSTOŚĆ SZCZEGÓŁÓW", newSeed: "NOWY SEED",
    lootRarity: "MAKS. RZADKOŚĆ ŁUPU", wealth: "BOGACTWO LOKACJI", partyLevel: "ŚR. POZIOM DRUŻYNY", partySize: "ROZMIAR DRUŻYNY", detected: "tokenów graczy wykryto", useDetected: "UŻYJ WYKRYTYCH",
    balance: "BALANS SPOTKANIA", enemies: "Wrogowie", xpBudget: "Docelowe XP", actualXp: "XP wrogów", xpPerPlayer: "XP / gracza", difficulty: "Trudność",
    generate: "GENERUJ / ZASTOSUJ", regenerate: "NOWY WARIANT", customUpload: "WGRAJ WŁASNE TŁO", custom: "PNG/JPEG/WebP nadal można wgrać ręcznie, jeśli generator nie jest potrzebny.",
    visualOnly: "Pomieszczenia, ściany, drzwi i dekoracje są tylko częścią obrazu. Nie blokują tokenów i nie dodają zasad walki.", grid: "WIDOCZNOŚĆ SIATKI", weak: "SŁABA", normal: "NORMALNA", strong: "KONTRASTOWA", applied: "Wygenerowane tło zastosowano do sceny",
    deterministic: "Ten sam seed + ustawienia = ta sama mapa, łup i spotkanie bez przechowywania pełnego obrazu mapy.",
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

function contrastKey(sceneId) { return `pip2d20_gm_grid_contrast_v1:${sceneId || "default"}`; }

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

function clampInteger(value, min, max, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function cleanDigits(value, maxLength = 2) {
  return String(value ?? "").replace(/\D+/g, "").slice(0, maxLength);
}

export default function GmScenePresetPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const savedSpec = scene?.environment?.proceduralMapSpec || null;
  const detectedPlayers = Math.max(0, (scene?.tokens || []).filter((token) => token?.kind === "player").length);

  const initialLevel = clampInteger(savedSpec?.avgPartyLevel, 1, 50, 1);
  const initialPartySize = clampInteger(savedSpec?.partySize, 1, 8, detectedPlayers || 4);

  const [type, setType] = useState(savedSpec?.type || "wasteland");
  const [gridSize, setGridSize] = useState(() => sceneGrid(scene));
  const [seed, setSeed] = useState(() => savedSpec?.seed || makeProceduralSeed());
  const [density, setDensity] = useState(() => Math.round(Number(savedSpec?.density ?? 0.55) * 100));
  const [lootRarity, setLootRarity] = useState(() => normalizeLootRarity(savedSpec?.lootRarity));
  const [wealth, setWealth] = useState(savedSpec?.wealth || "standard");
  const [avgPartyLevel, setAvgPartyLevel] = useState(initialLevel);
  const [partyLevelDraft, setPartyLevelDraft] = useState(String(initialLevel));
  const [partySize, setPartySize] = useState(initialPartySize);
  const [partySizeDraft, setPartySizeDraft] = useState(String(initialPartySize));
  const [contrast, setContrast] = useState(() => readContrast(scene?.sceneId));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGridSize(sceneGrid(scene));
    const spec = scene?.environment?.proceduralMapSpec;
    if (spec) {
      const nextLevel = clampInteger(spec.avgPartyLevel, 1, 50, 1);
      const nextSize = clampInteger(spec.partySize, 1, 8, detectedPlayers || 4);
      setType(spec.type || "wasteland");
      setSeed(spec.seed || makeProceduralSeed());
      setDensity(Math.round(Number(spec.density ?? 0.55) * 100));
      setLootRarity(normalizeLootRarity(spec.lootRarity));
      setWealth(spec.wealth || "standard");
      setAvgPartyLevel(nextLevel);
      setPartyLevelDraft(String(nextLevel));
      setPartySize(nextSize);
      setPartySizeDraft(String(nextSize));
    } else {
      const nextSize = detectedPlayers || 4;
      setPartySize(nextSize);
      setPartySizeDraft(String(nextSize));
    }
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

  const [cols, rows] = useMemo(() => gridSize.split("x").map(Number), [gridSize]);
  const generationSpec = useMemo(() => ({
    version: 11,
    type,
    seed,
    cols,
    rows,
    density: density / 100,
    lootRarity,
    wealth,
    avgPartyLevel,
    partySize,
  }), [type, seed, cols, rows, density, lootRarity, wealth, avgPartyLevel, partySize]);

  const previewUrl = useMemo(() => generateProceduralMapDataUrl(generationSpec), [generationSpec]);
  const encounter = useMemo(() => generateProceduralEncounterSummary(generationSpec), [generationSpec]);

  if (!scene || session?.mode !== "host") return null;

  const updateLevelDraft = (value) => {
    const clean = cleanDigits(value, 2);
    setPartyLevelDraft(clean);
    if (clean !== "") {
      const parsed = Number(clean);
      if (parsed >= 1 && parsed <= 50) setAvgPartyLevel(parsed);
    }
  };

  const commitLevelDraft = () => {
    const next = clampInteger(partyLevelDraft, 1, 50, avgPartyLevel || 1);
    setAvgPartyLevel(next);
    setPartyLevelDraft(String(next));
  };

  const updatePartySizeDraft = (value) => {
    const clean = cleanDigits(value, 1);
    setPartySizeDraft(clean);
    if (clean !== "") {
      const parsed = Number(clean);
      if (parsed >= 1 && parsed <= 8) setPartySize(parsed);
    }
  };

  const commitPartySizeDraft = () => {
    const next = clampInteger(partySizeDraft, 1, 8, partySize || 4);
    setPartySize(next);
    setPartySizeDraft(String(next));
  };

  const useDetectedParty = () => {
    if (!detectedPlayers) return;
    const next = clampInteger(detectedPlayers, 1, 8, 4);
    setPartySize(next);
    setPartySizeDraft(String(next));
  };

  const generate = async ({ newSeed = false } = {}) => {
    commitLevelDraft();
    commitPartySizeDraft();
    const nextSeed = newSeed ? makeProceduralSeed() : seed || makeProceduralSeed();
    if (nextSeed !== seed) setSeed(nextSeed);
    const nextSpec = {
      ...generationSpec,
      seed: nextSeed,
      avgPartyLevel: clampInteger(partyLevelDraft, 1, 50, avgPartyLevel),
      partySize: clampInteger(partySizeDraft, 1, 8, partySize),
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
        mapAssetId: `procedural:${type}:scalable-v1`,
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
    try { localStorage.setItem(contrastKey(scene.sceneId), value); } catch { /* best effort */ }
    applyContrastClass(value);
  };

  const uploadCustom = () => {
    if (typeof document === "undefined") return;
    document.querySelector(".gm-tactical-map-core .tactical-background-input")?.click();
  };

  return (
    <section className="gm-scene-presets gm-proc-map pip-panel">
      <header className="gm-scene-presets__head">
        <div><strong>{text.title}</strong><small>{text.subtitle}</small></div>
      </header>

      <div className="gm-proc-map__preview" style={{ backgroundImage: `url(${JSON.stringify(previewUrl)})` }}>
        <span>{LABELS[lang]?.[type] || LABELS.en[type]}</span>
        <small>{cols}×{rows} · seed {seed}</small>
      </div>

      <div className="gm-proc-map__controls">
        <label>
          <span>{text.type}</span>
          <select className="pip-input" value={type} onChange={(event) => setType(event.target.value)}>
            {MAP_TYPES.map((value) => <option key={value} value={value}>{LABELS[lang]?.[value] || LABELS.en[value]}</option>)}
          </select>
        </label>

        <label>
          <span>{text.gridSize}</span>
          <select className="pip-input" value={gridSize} onChange={(event) => setGridSize(event.target.value)}>
            {GRID_SIZES.map((value) => <option key={value} value={value}>{value.replace("x", "×")}</option>)}
          </select>
        </label>

        <label>
          <span>{text.lootRarity}</span>
          <select className="pip-input" value={lootRarity} onChange={(event) => setLootRarity(event.target.value)}>
            {LOOT_RARITIES.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
          </select>
        </label>

        <label>
          <span>{text.wealth}</span>
          <select className="pip-input" value={wealth} onChange={(event) => setWealth(event.target.value)}>
            {WEALTH_LEVELS.map((value) => <option key={value} value={value}>{WEALTH_LABELS[lang][value]}</option>)}
          </select>
        </label>

        <label>
          <span>{text.partyLevel}</span>
          <input
            className="pip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={partyLevelDraft}
            onChange={(event) => updateLevelDraft(event.target.value)}
            onBlur={commitLevelDraft}
            aria-label={text.partyLevel}
          />
        </label>

        <label>
          <span>{text.partySize}</span>
          <input
            className="pip-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={partySizeDraft}
            onChange={(event) => updatePartySizeDraft(event.target.value)}
            onBlur={commitPartySizeDraft}
            aria-label={text.partySize}
          />
          <small>{detectedPlayers} {text.detected}</small>
          {detectedPlayers ? <button type="button" className="pip-btn gm-proc-map__detected" onClick={useDetectedParty}>{text.useDetected}</button> : null}
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

      <div className="gm-proc-map__balance">
        <strong>{text.balance}</strong>
        <div><span>{text.enemies}</span><b>{encounter.totalEnemies}</b></div>
        <div><span>{text.xpBudget}</span><b>{encounter.targetXp}</b></div>
        <div><span>{text.actualXp}</span><b>{encounter.actualXp}</b></div>
        <div><span>{text.xpPerPlayer}</span><b>{encounter.xpPerPlayer}</b></div>
        <div><span>{text.difficulty}</span><b>{DIFFICULTY_LABELS[lang]?.[encounter.difficulty] || encounter.difficulty}</b></div>
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
