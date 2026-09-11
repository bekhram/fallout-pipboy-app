import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { WastelandAssetLayer } from "./WastelandAssetPortal.jsx";
import {
  generateProceduralMapDataUrl,
  makeProceduralSeed,
  proceduralLocationType,
} from "../../utils/proceduralMapGenerator.js";
import {
  TERRAIN_TYPES,
  labelFor,
} from "../../utils/tacticalEnvironment.js";
import {
  generateProceduralEncounterSummary,
  normalizeLootRarity,
} from "../../utils/proceduralRoomContent.js";
import "./gmScenePresetPanel.css";

const MAP_TYPES = ["wasteland", "settlement", "residential_house", "red_rocket", "super_duper_mart", "raider_camp", "military_bunker"];
const FIXED_GRID = 24;
const LOOT_RARITIES = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const WEALTH_LEVELS = ["poor", "standard", "rich", "wealthy"];

const LABELS = {
  en: { wasteland: "Wasteland", settlement: "Settlement", residential_house: "Residential House", red_rocket: "Red Rocket", super_duper_mart: "Super-Duper Mart", raider_camp: "Raider Camp", military_bunker: "Military Bunker" },
  ru: { wasteland: "Пустошь", settlement: "Поселение", residential_house: "Жилой дом", red_rocket: "Красная Ракета", super_duper_mart: "Супер-Дупер Март", raider_camp: "Лагерь рейдеров", military_bunker: "Военный бункер" },
  uk: { wasteland: "Пустка", settlement: "Поселення", residential_house: "Житловий будинок", red_rocket: "Червона Ракета", super_duper_mart: "Супер-Дупер Март", raider_camp: "Табір рейдерів", military_bunker: "Військовий бункер" },
  pl: { wasteland: "Pustkowie", settlement: "Osada", residential_house: "Dom mieszkalny", red_rocket: "Red Rocket", super_duper_mart: "Super-Duper Mart", raider_camp: "Obóz raiderów", military_bunker: "Bunkier wojskowy" },
};

const COPY = {
  en: { title: "[ FALLOUT MAP GENERATOR ]", type: "LOCATION", terrain: "TERRAIN", grid: "MAP SIZE", seed: "SEED", newSeed: "NEW SEED", density: "DETAIL DENSITY", loot: "MAX LOOT RARITY", wealth: "LOCATION WEALTH", level: "AVG. PARTY LEVEL", party: "PARTY SIZE", generate: "GENERATE / APPLY", regenerate: "NEW VARIANT", upload: "UPLOAD CUSTOM BACKGROUND", applied: "Generated background applied to scene", fixed: "Procedural maps use a fixed 24×24 grid", weak: "WEAK", normal: "NORMAL", strong: "STRONG", gridVisibility: "GRID VISIBILITY" },
  ru: { title: "[ ГЕНЕРАТОР КАРТ FALLOUT ]", type: "ЛОКАЦИЯ", terrain: "ЛАНДШАФТ", grid: "РАЗМЕР КАРТЫ", seed: "SEED", newSeed: "НОВЫЙ SEED", density: "ПЛОТНОСТЬ ДЕТАЛЕЙ", loot: "МАКС. РЕДКОСТЬ ЛУТА", wealth: "БОГАТСТВО ЛОКАЦИИ", level: "СР. УРОВЕНЬ ГРУППЫ", party: "РАЗМЕР ГРУППЫ", generate: "СГЕНЕРИРОВАТЬ / ПРИМЕНИТЬ", regenerate: "НОВЫЙ ВАРИАНТ", upload: "ЗАГРУЗИТЬ СВОЙ ФОН", applied: "Сгенерированный фон применён к сцене", fixed: "Процедурные карты используют фиксированный грид 24×24", weak: "СЛАБЫЙ", normal: "ОБЫЧНЫЙ", strong: "КОНТРАСТНЫЙ", gridVisibility: "ВИДИМОСТЬ ГРИДА" },
  uk: { title: "[ ГЕНЕРАТОР МАП FALLOUT ]", type: "ЛОКАЦІЯ", terrain: "ЛАНДШАФТ", grid: "РОЗМІР МАПИ", seed: "SEED", newSeed: "НОВИЙ SEED", density: "ЩІЛЬНІСТЬ ДЕТАЛЕЙ", loot: "МАКС. РІДКІСТЬ ЛУТУ", wealth: "БАГАТСТВО ЛОКАЦІЇ", level: "СЕР. РІВЕНЬ ГРУПИ", party: "РОЗМІР ГРУПИ", generate: "ЗГЕНЕРУВАТИ / ЗАСТОСУВАТИ", regenerate: "НОВИЙ ВАРІАНТ", upload: "ЗАВАНТАЖИТИ ВЛАСНИЙ ФОН", applied: "Згенерований фон застосовано до сцени", fixed: "Процедурні мапи використовують фіксовану сітку 24×24", weak: "СЛАБКА", normal: "ЗВИЧАЙНА", strong: "КОНТРАСТНА", gridVisibility: "ВИДИМІСТЬ СІТКИ" },
  pl: { title: "[ GENERATOR MAP FALLOUT ]", type: "LOKACJA", terrain: "TEREN", grid: "ROZMIAR MAPY", seed: "SEED", newSeed: "NOWY SEED", density: "GĘSTOŚĆ SZCZEGÓŁÓW", loot: "MAKS. RZADKOŚĆ ŁUPU", wealth: "BOGACTWO LOKACJI", level: "ŚR. POZIOM DRUŻYNY", party: "ROZMIAR DRUŻYNY", generate: "GENERUJ / ZASTOSUJ", regenerate: "NOWY WARIANT", upload: "WGRAJ WŁASNE TŁO", applied: "Wygenerowane tło zastosowano do sceny", fixed: "Mapy proceduralne używają stałej siatki 24×24", weak: "SŁABA", normal: "NORMALNA", strong: "KONTRASTOWA", gridVisibility: "WIDOCZNOŚĆ SIATKI" },
};

const WEALTH_LABELS = {
  en: { poor: "Poor", standard: "Standard", rich: "Rich", wealthy: "Wealthy" },
  ru: { poor: "Бедная", standard: "Средняя", rich: "Богатая", wealthy: "Очень богатая" },
  uk: { poor: "Бідна", standard: "Середня", rich: "Багата", wealthy: "Дуже багата" },
  pl: { poor: "Biedna", standard: "Standardowa", rich: "Bogata", wealthy: "Bardzo bogata" },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}
function clampInteger(value, min, max, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
function makeStartZone() {
  const result = [];
  for (let y = FIXED_GRID - 3; y < FIXED_GRID; y += 1) for (let x = 0; x < 3; x += 1) result.push({ x, y });
  return result;
}
function contrastKey(sceneId) { return `pip2d20_gm_grid_contrast_v1:${sceneId || "default"}`; }
function readContrast(sceneId) {
  try { const value = localStorage.getItem(contrastKey(sceneId)); return ["weak", "normal", "strong"].includes(value) ? value : "strong"; }
  catch { return "strong"; }
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
  const saved = scene?.environment?.proceduralMapSpec || {};
  const detectedPlayers = Math.max(0, (scene?.tokens || []).filter((token) => token?.kind === "player").length);

  const [type, setType] = useState(saved.type || "wasteland");
  const [terrain, setTerrain] = useState(saved.terrain || scene?.environment?.terrain || "wasteland");
  const [seed, setSeed] = useState(saved.seed || makeProceduralSeed());
  const [density, setDensity] = useState(Math.round(Number(saved.density ?? 0.55) * 100));
  const [lootRarity, setLootRarity] = useState(normalizeLootRarity(saved.lootRarity));
  const [wealth, setWealth] = useState(saved.wealth || "standard");
  const [avgPartyLevel, setAvgPartyLevel] = useState(clampInteger(saved.avgPartyLevel, 1, 50, 1));
  const [partySize, setPartySize] = useState(clampInteger(saved.partySize, 1, 8, detectedPlayers || 4));
  const [contrast, setContrast] = useState(() => readContrast(scene?.sceneId));
  const [message, setMessage] = useState("");

  useEffect(() => {
    const spec = scene?.environment?.proceduralMapSpec;
    if (spec) {
      setType(spec.type || "wasteland");
      setTerrain(spec.terrain || scene?.environment?.terrain || "wasteland");
      setSeed(spec.seed || makeProceduralSeed());
      setDensity(Math.round(Number(spec.density ?? 0.55) * 100));
      setLootRarity(normalizeLootRarity(spec.lootRarity));
      setWealth(spec.wealth || "standard");
      setAvgPartyLevel(clampInteger(spec.avgPartyLevel, 1, 50, 1));
      setPartySize(clampInteger(spec.partySize, 1, 8, detectedPlayers || 4));
    } else {
      setTerrain(scene?.environment?.terrain || "wasteland");
    }
    const next = readContrast(scene?.sceneId);
    setContrast(next);
    applyContrastClass(next);
  }, [scene?.sceneId]);

  const generationSpec = useMemo(() => ({
    version: 16,
    type,
    terrain,
    seed,
    cols: FIXED_GRID,
    rows: FIXED_GRID,
    density: density / 100,
    lootRarity,
    wealth,
    avgPartyLevel,
    partySize,
  }), [type, terrain, seed, density, lootRarity, wealth, avgPartyLevel, partySize]);

  const previewUrl = useMemo(() => generateProceduralMapDataUrl(generationSpec), [generationSpec]);
  const encounter = useMemo(() => generateProceduralEncounterSummary(generationSpec), [generationSpec]);

  if (!scene || session?.mode !== "host") return null;

  const generate = async ({ newSeed = false } = {}) => {
    const nextSeed = newSeed ? makeProceduralSeed() : (seed || makeProceduralSeed());
    if (nextSeed !== seed) setSeed(nextSeed);
    const nextSpec = { ...generationSpec, seed: nextSeed };
    await session.updateTacticalScene?.({
      cols: FIXED_GRID,
      rows: FIXED_GRID,
      startZone: makeStartZone(),
      backgroundUrl: "",
      backgroundName: `PROC // ${LABELS.en[type]} // ${labelFor("terrain", terrain, "en")} // ${nextSeed}`,
      environment: {
        ...(scene.environment || {}),
        locationType: proceduralLocationType(type),
        terrain,
        mapAssetId: `procedural:${type}:${terrain}:24x24-v2`,
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

  return (
    <section className="gm-scene-presets gm-proc-map pip-panel">
      <header className="gm-scene-presets__head"><div><strong>{text.title}</strong><small>{text.fixed}</small></div></header>
      <div className="gm-proc-map__preview" style={{ position: "relative", backgroundImage: `url(${JSON.stringify(previewUrl)})` }}>
        {type === "wasteland" ? <WastelandAssetLayer spec={generationSpec} preview /> : null}
        <span>{LABELS[lang]?.[type] || LABELS.en[type]} · {labelFor("terrain", terrain, lang)}</span><small>24×24 · seed {seed}</small>
      </div>
      <div className="gm-proc-map__controls">
        <label><span>{text.type}</span><select className="pip-input" value={type} onChange={(e) => setType(e.target.value)}>{MAP_TYPES.map((value) => <option key={value} value={value}>{LABELS[lang]?.[value] || LABELS.en[value]}</option>)}</select></label>
        <label><span>{text.terrain}</span><select className="pip-input" value={terrain} onChange={(e) => setTerrain(e.target.value)}>{TERRAIN_TYPES.map((value) => <option key={value} value={value}>{labelFor("terrain", value, lang)}</option>)}</select></label>
        <label><span>{text.grid}</span><input className="pip-input" value="24×24" disabled /></label>
        <label><span>{text.loot}</span><select className="pip-input" value={lootRarity} onChange={(e) => setLootRarity(e.target.value)}>{LOOT_RARITIES.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
        <label><span>{text.wealth}</span><select className="pip-input" value={wealth} onChange={(e) => setWealth(e.target.value)}>{WEALTH_LEVELS.map((value) => <option key={value} value={value}>{WEALTH_LABELS[lang][value]}</option>)}</select></label>
        <label><span>{text.level}</span><input className="pip-input" type="number" min="1" max="50" value={avgPartyLevel} onChange={(e) => setAvgPartyLevel(clampInteger(e.target.value, 1, 50, 1))} /></label>
        <label><span>{text.party}</span><input className="pip-input" type="number" min="1" max="8" value={partySize} onChange={(e) => setPartySize(clampInteger(e.target.value, 1, 8, 4))} /></label>
        <label className="gm-proc-map__seed"><span>{text.seed}</span><div><input className="pip-input" value={seed} maxLength={40} onChange={(e) => setSeed(e.target.value)} /><button type="button" className="pip-btn" onClick={() => setSeed(makeProceduralSeed())}>{text.newSeed}</button></div></label>
        <label className="gm-proc-map__density"><span>{text.density}: {density}%</span><input type="range" min="10" max="100" step="5" value={density} onChange={(e) => setDensity(Number(e.target.value))} /></label>
      </div>
      <div className="gm-proc-map__balance"><strong>ENCOUNTER</strong><div><span>Enemies</span><b>{encounter.totalEnemies}</b></div><div><span>Target XP</span><b>{encounter.targetXp}</b></div><div><span>XP / player</span><b>{encounter.xpPerPlayer}</b></div></div>
      <div className="gm-proc-map__actions"><button type="button" className="pip-btn is-primary" onClick={() => generate()}>{text.generate}</button><button type="button" className="pip-btn" onClick={() => generate({ newSeed: true })}>{text.regenerate}</button><button type="button" className="pip-btn" onClick={() => document.querySelector(".gm-tactical-map-core .tactical-background-input")?.click()}>{text.upload}</button></div>
      <div className="gm-scene-presets__grid-control"><span>{text.gridVisibility}</span><div className="gm-scene-presets__grid-buttons">{["weak", "normal", "strong"].map((value) => <button key={value} type="button" className={`pip-btn${contrast === value ? " is-primary" : ""}`} onClick={() => changeContrast(value)}>{text[value]}</button>)}</div></div>
      {message ? <div className="gm-scene-presets__message">{message}</div> : null}
    </section>
  );
}
