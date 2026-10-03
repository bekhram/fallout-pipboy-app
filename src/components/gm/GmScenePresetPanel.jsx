import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  generateProceduralMapDataUrl,
  makeProceduralSeed,
  proceduralLocationType,
  PROCEDURAL_MAP_SIZES,
} from "../../utils/proceduralMapGenerator.js";
import {
  TERRAIN_TYPES,
  labelFor,
} from "../../utils/tacticalEnvironment.js";
import {
  generateProceduralEncounterSummary,
  normalizeLootRarity,
} from "../../utils/proceduralRoomContent.js";
import { generateVaultLayout, vaultLayoutStartZone, vaultLayoutToProceduralMap } from "../../utils/proceduralVaultGenerator.js";
import "./gmScenePresetPanel.css";

const LazyWastelandPreview = lazy(() => import("./WastelandAssetPortal.jsx").then((m) => ({ default: m.WastelandAssetLayer })));
const LazySettlementPreview = lazy(() => import("./SettlementAssetPortal.jsx").then((m) => ({ default: m.SettlementAssetLayer })));
const LazyRedRocketPreview = lazy(() => import("./RedRocketAssetPortal.jsx").then((m) => ({ default: m.RedRocketAssetLayer })));
const LazySuperDuperPreview = lazy(() => import("./SuperDuperMartAssetPortal.jsx").then((m) => ({ default: m.SuperDuperMartAssetLayer })));
const LazyVaultPreview = lazy(() => import("./VaultAssetPortal.jsx").then((m) => ({ default: m.VaultAssetLayer })));

const MAP_TYPES = ["wasteland", "settlement", "red_rocket", "super_duper_mart", "vault_tunnels"];
const LOOT_RARITIES = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const WEALTH_LEVELS = ["poor", "standard", "rich", "wealthy"];

const LABELS = {
  en: { wasteland: "Wasteland", settlement: "Settlement", residential_house: "Residential House", red_rocket: "Red Rocket", super_duper_mart: "Super-Duper Mart", vault_tunnels: "Vault Tunnels", raider_camp: "Raider Camp", military_bunker: "Military Bunker" },
  ru: { wasteland: "Пустошь", settlement: "Поселение", residential_house: "Жилой дом", red_rocket: "Красная Ракета", super_duper_mart: "Супердупермарт", vault_tunnels: "Туннели / Убежище", raider_camp: "Лагерь рейдеров", military_bunker: "Военный бункер" },
  uk: { wasteland: "Пустка", settlement: "Поселення", residential_house: "Житловий будинок", red_rocket: "Червона Ракета", super_duper_mart: "Супер-Дупер Март", vault_tunnels: "Тунелі / Сховище", raider_camp: "Табір рейдерів", military_bunker: "Військовий бункер" },
  pl: { wasteland: "Pustkowie", settlement: "Osada", residential_house: "Dom mieszkalny", red_rocket: "Red Rocket", super_duper_mart: "Super-Duper Mart", vault_tunnels: "Tunele / Schron", raider_camp: "Obóz raiderów", military_bunker: "Bunkier wojskowy" },
};

const COPY = {
  en: { title: "[ FALLOUT MAP GENERATOR ]", type: "LOCATION", terrain: "TERRAIN", grid: "MAP SIZE", seed: "SEED", newSeed: "NEW SEED", density: "DETAIL DENSITY", loot: "MAX LOOT RARITY", wealth: "LOCATION WEALTH", level: "AVG. PARTY LEVEL", party: "PARTY SIZE", generate: "GENERATE / APPLY", regenerate: "NEW VARIANT", upload: "UPLOAD CUSTOM BACKGROUND", applied: "Generated background applied to scene", fixed: "Procedural map size: 24×24 / 36×36 / 48×48", weak: "WEAK", normal: "NORMAL", strong: "STRONG", gridVisibility: "GRID VISIBILITY" },
  ru: { title: "[ ГЕНЕРАТОР КАРТ FALLOUT ]", type: "ЛОКАЦИЯ", terrain: "ЛАНДШАФТ", grid: "РАЗМЕР КАРТЫ", seed: "SEED", newSeed: "НОВЫЙ SEED", density: "ПЛОТНОСТЬ ДЕТАЛЕЙ", loot: "МАКС. РЕДКОСТЬ ЛУТА", wealth: "БОГАТСТВО ЛОКАЦИИ", level: "СР. УРОВЕНЬ ГРУППЫ", party: "РАЗМЕР ГРУППЫ", generate: "СГЕНЕРИРОВАТЬ / ПРИМЕНИТЬ", regenerate: "НОВЫЙ ВАРИАНТ", upload: "ЗАГРУЗИТЬ СВОЙ ФОН", applied: "Сгенерированный фон применён к сцене", fixed: "Размер процедурной карты: 24×24 / 36×36 / 48×48", weak: "СЛАБЫЙ", normal: "ОБЫЧНЫЙ", strong: "КОНТРАСТНЫЙ", gridVisibility: "ВИДИМОСТЬ ГРИДА" },
  uk: { title: "[ ГЕНЕРАТОР МАП FALLOUT ]", type: "ЛОКАЦІЯ", terrain: "ЛАНДШАФТ", grid: "РОЗМІР МАПИ", seed: "SEED", newSeed: "НОВИЙ SEED", density: "ЩІЛЬНІСТЬ ДЕТАЛЕЙ", loot: "МАКС. РІДКІСТЬ ЛУТУ", wealth: "БАГАТСТВО ЛОКАЦІЇ", level: "СЕР. РІВЕНЬ ГРУПИ", party: "РОЗМІР ГРУПИ", generate: "ЗГЕНЕРУВАТИ / ЗАСТОСУВАТИ", regenerate: "НОВИЙ ВАРІАНТ", upload: "ЗАВАНТАЖИТИ ВЛАСНИЙ ФОН", applied: "Згенерований фон застосовано до сцени", fixed: "Процедурні мапи використовують фіксовану сітку 24×24", weak: "СЛАБКА", normal: "ЗВИЧАЙНА", strong: "КОНТРАСТНА", gridVisibility: "ВИДИМІСТЬ СІТКИ" },
  pl: { title: "[ GENERATOR MAP FALLOUT ]", type: "LOKACJA", terrain: "TEREN", grid: "ROZMIAR MAPY", seed: "SEED", newSeed: "NOWY SEED", density: "GĘSTOŚĆ SZCZEGÓŁÓW", loot: "MAKS. RZADKOŚĆ ŁUPU", wealth: "BOGACTWO LOKACJI", level: "ŚR. POZIOM DRUŻYNY", party: "ROZMIAR DRUŻYNY", generate: "GENERUJ / ZASTOSUJ", regenerate: "NOWY WARIANT", upload: "WGRAJ WŁASNE TŁO", applied: "Wygenerowane tło zastosowano do sceny", fixed: "Rozmiar mapy proceduralnej: 24×24 / 36×36 / 48×48", weak: "SŁABA", normal: "NORMALNA", strong: "KONTRASTOWA", gridVisibility: "WIDOCZNOŚĆ SIATKI" },
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
function selectableMapType(value) {
  return MAP_TYPES.includes(value) ? value : "wasteland";
}
function clampInteger(value, min, max, fallback) {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}
function normalizeGridSize(value) {
  const n = Number(value);
  return PROCEDURAL_MAP_SIZES.includes(n) ? n : 24;
}
function makeStartZone(size) {
  const grid = normalizeGridSize(size);
  const result = [];
  for (let y = grid - 3; y < grid; y += 1) for (let x = 0; x < 3; x += 1) result.push({ x, y });
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

  const [type, setType] = useState(selectableMapType(saved.type));
  const [gridSize, setGridSize] = useState(normalizeGridSize(saved.cols || saved.rows || scene?.cols || 24));
  const [terrain, setTerrain] = useState(saved.terrain || scene?.environment?.terrain || "wasteland");
  const [seed, setSeed] = useState(saved.seed || makeProceduralSeed());
  const [density, setDensity] = useState(Math.round(Number(saved.density ?? 0.55) * 100));
  const [lootRarity, setLootRarity] = useState(normalizeLootRarity(saved.lootRarity));
  const [wealth, setWealth] = useState(saved.wealth || "standard");
  const [avgPartyLevel, setAvgPartyLevel] = useState(clampInteger(saved.avgPartyLevel, 1, 50, 1));
  const [partySize, setPartySize] = useState(clampInteger(saved.partySize, 1, 8, detectedPlayers || 4));
  const [contrast, setContrast] = useState(() => readContrast(scene?.sceneId));
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const spec = scene?.environment?.proceduralMapSpec;
    if (spec) {
      setType(selectableMapType(spec.type));
      setGridSize(normalizeGridSize(spec.cols || spec.rows || scene?.cols || 24));
      setTerrain(spec.terrain || scene?.environment?.terrain || "wasteland");
      setSeed(spec.seed || makeProceduralSeed());
      setDensity(Math.round(Number(spec.density ?? 0.55) * 100));
      setLootRarity(normalizeLootRarity(spec.lootRarity));
      setWealth(spec.wealth || "standard");
      setAvgPartyLevel(clampInteger(spec.avgPartyLevel, 1, 50, 1));
      setPartySize(clampInteger(spec.partySize, 1, 8, detectedPlayers || 4));
    } else {
      setGridSize(normalizeGridSize(scene?.cols || scene?.rows || 24));
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
    cols: gridSize,
    rows: gridSize,
    density: density / 100,
    lootRarity,
    wealth,
    avgPartyLevel,
    partySize,
  }), [type, terrain, seed, gridSize, density, lootRarity, wealth, avgPartyLevel, partySize]);

  const previewUrl = useMemo(
    () => (previewOpen && type !== "vault_tunnels" ? generateProceduralMapDataUrl(generationSpec) : ""),
    [previewOpen, generationSpec],
  );
  const encounter = useMemo(
    () => (type === "vault_tunnels" ? null : generateProceduralEncounterSummary(generationSpec)),
    [type, generationSpec],
  );

  if (!scene || session?.mode !== "host") return null;

  const generate = async ({ newSeed = false } = {}) => {
    const nextSeed = newSeed ? makeProceduralSeed() : (seed || makeProceduralSeed());
    if (nextSeed !== seed) setSeed(nextSeed);
    const nextSpec = { ...generationSpec, seed: nextSeed };
    const isVault = type === "vault_tunnels";
    const vaultLayout = isVault ? generateVaultLayout(nextSpec) : null;
    await session.updateTacticalScene?.({
      cols: gridSize,
      rows: gridSize,
      startZone: isVault ? vaultLayoutStartZone(vaultLayout) : makeStartZone(gridSize),
      backgroundUrl: "",
      backgroundName: isVault
        ? `PROC // VAULT TUNNELS // ${gridSize}x${gridSize} // ${nextSeed}`
        : `PROC // ${LABELS.en[type]} // ${labelFor("terrain", terrain, "en")} // ${nextSeed}`,
      environment: {
        ...(scene.environment || {}),
        locationType: isVault ? "vault_tunnels" : proceduralLocationType(type),
        terrain,
        mapAssetId: isVault
          ? `procedural:vault_tunnels:${gridSize}x${gridSize}-v1`
          : `procedural:${type}:${terrain}:${gridSize}x${gridSize}-v3`,
        mapVariantSeed: nextSeed,
        proceduralMapSpec: nextSpec,
        proceduralMap: isVault ? vaultLayoutToProceduralMap(vaultLayout) : null,
        vaultLayout,
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

  const previewBackground = previewOpen && previewUrl ? `url(${JSON.stringify(previewUrl)})` : "";

  return (
    <section className="gm-scene-presets gm-proc-map pip-panel">
      <header className="gm-scene-presets__head"><div><strong>{text.title}</strong><small>{text.fixed}</small></div></header>
      <div className="gm-proc-map__preview-toggle">
        <button type="button" className="pip-btn" onClick={() => setPreviewOpen((value) => !value)}>
          {previewOpen ? "− PREVIEW" : "+ PREVIEW"}
        </button>
      </div>
      {previewOpen ? (
        <div className="gm-proc-map__preview" style={{ position: "relative", backgroundImage: previewBackground, backgroundSize: "100% 100%", backgroundPosition: "0 0", backgroundRepeat: "no-repeat" }}>
          <Suspense fallback={<small>…</small>}>
            {type === "wasteland" ? <LazyWastelandPreview spec={generationSpec} preview /> : null}
            {type === "settlement" ? <LazySettlementPreview spec={generationSpec} preview /> : null}
            {type === "red_rocket" ? <LazyRedRocketPreview spec={generationSpec} preview /> : null}
            {type === "super_duper_mart" ? <LazySuperDuperPreview spec={generationSpec} preview /> : null}
            {type === "vault_tunnels" ? <LazyVaultPreview spec={generationSpec} preview /> : null}
          </Suspense>
          <span>{LABELS[lang]?.[type] || LABELS.en[type]} · {labelFor("terrain", terrain, lang)}</span><small>{gridSize}×{gridSize} · seed {seed}</small>
        </div>
      ) : null}
      <div className="gm-proc-map__controls">
        <label><span>{text.type}</span><select className="pip-input" value={type} onChange={(e) => setType(e.target.value)}>{MAP_TYPES.map((value) => <option key={value} value={value}>{LABELS[lang]?.[value] || LABELS.en[value]}</option>)}</select></label>
        <label><span>{text.terrain}</span><select className="pip-input" value={terrain} onChange={(e) => setTerrain(e.target.value)}>{TERRAIN_TYPES.map((value) => <option key={value} value={value}>{labelFor("terrain", value, lang)}</option>)}</select></label>
        <label><span>{text.grid}</span><select className="pip-input" value={gridSize} onChange={(e) => setGridSize(normalizeGridSize(e.target.value))}>{PROCEDURAL_MAP_SIZES.map((size) => <option key={size} value={size}>{size}×{size}</option>)}</select></label>
        <label><span>{text.loot}</span><select className="pip-input" value={lootRarity} onChange={(e) => setLootRarity(e.target.value)}>{LOOT_RARITIES.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label>
        <label><span>{text.wealth}</span><select className="pip-input" value={wealth} onChange={(e) => setWealth(e.target.value)}>{WEALTH_LEVELS.map((value) => <option key={value} value={value}>{WEALTH_LABELS[lang][value]}</option>)}</select></label>
        <label><span>{text.level}</span><input className="pip-input" type="number" min="1" max="50" value={avgPartyLevel} onChange={(e) => setAvgPartyLevel(clampInteger(e.target.value, 1, 50, 1))} /></label>
        <label><span>{text.party}</span><input className="pip-input" type="number" min="1" max="8" value={partySize} onChange={(e) => setPartySize(clampInteger(e.target.value, 1, 8, 4))} /></label>
        <label className="gm-proc-map__seed"><span>{text.seed}</span><div><input className="pip-input" value={seed} maxLength={40} onChange={(e) => setSeed(e.target.value)} /><button type="button" className="pip-btn" onClick={() => setSeed(makeProceduralSeed())}>{text.newSeed}</button></div></label>
        <label className="gm-proc-map__density"><span>{text.density}: {density}%</span><input type="range" min="10" max="100" step="5" value={density} onChange={(e) => setDensity(Number(e.target.value))} /></label>
      </div>
      {type === "vault_tunnels" ? (
        <div className="gm-proc-map__balance">
          <strong>ENCOUNTER</strong>
          <div><span>Vault enemies</span><b>—</b></div>
          <div><span>Room markers</span><b>—</b></div>
          <div><span>Status</span><b>COMING NEXT</b></div>
        </div>
      ) : (
        <div className="gm-proc-map__balance"><strong>ENCOUNTER</strong><div><span>Enemies</span><b>{encounter?.totalEnemies ?? 0}</b></div><div><span>Target XP</span><b>{encounter?.targetXp ?? 0}</b></div><div><span>XP / player</span><b>{encounter?.xpPerPlayer ?? 0}</b></div></div>
      )}
      <div className="gm-proc-map__actions"><button type="button" className="pip-btn is-primary" onClick={() => generate()}>{text.generate}</button><button type="button" className="pip-btn" onClick={() => generate({ newSeed: true })}>{text.regenerate}</button><button type="button" className="pip-btn" onClick={() => document.querySelector(".gm-tactical-map-core .tactical-background-input")?.click()}>{text.upload}</button></div>
      <div className="gm-scene-presets__grid-control"><span>{text.gridVisibility}</span><div className="gm-scene-presets__grid-buttons">{["weak", "normal", "strong"].map((value) => <button key={value} type="button" className={`pip-btn${contrast === value ? " is-primary" : ""}`} onClick={() => changeContrast(value)}>{text[value]}</button>)}</div></div>
      {message ? <div className="gm-scene-presets__message">{message}</div> : null}
    </section>
  );
}
