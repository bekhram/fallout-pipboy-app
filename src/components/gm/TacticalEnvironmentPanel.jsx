import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_TACTICAL_ENVIRONMENT,
  LOCATION_TYPES,
  TERRAIN_TYPES,
  ZONE_TYPES,
  TIME_TYPES,
  WEATHER_TYPES,
  ZONE_SUBTYPES,
  environmentEffects,
  labelFor,
  normalizeTacticalEnvironment,
} from "../../utils/tacticalEnvironment.js";
import "./tacticalEnvironmentPanel.css";

const COPY = {
  en: {
    title: "ENCOUNTER ENVIRONMENT",
    locationTerrain: "LOCATION / TERRAIN",
    location: "LOCATION",
    terrain: "TERRAIN",
    zone: "ZONE",
    feature: "FEATURE",
    time: "TIME",
    weather: "WEATHER",
    startCd: "START CD",
    growthCd: "+CD / ROUND",
    currentCd: "CURRENT CD",
    effects: "ACTIVE EFFECTS",
    asset: "MAP ASSET",
    pending: "Background assets will be linked here in the next step.",
    seed: "MAP VARIANT",
    auto: "LIGHTING",
    reset: "RESET",
    saving: "SAVING",
    saved: "SAVED",
    error: "SAVE ERROR",
    round: "ROUND",
    profile: "TACTICAL SCENE PROFILE",
    live: "LIVE",
    prep: "PREP",
    automatic: "AUTO",
    bright: "BRIGHT",
    dark: "DARK",
    emergency: "EMERGENCY",
  },
  ru: {
    title: "ОКРУЖЕНИЕ СЦЕНЫ",
    locationTerrain: "ЛОКАЦИЯ / ЛАНДШАФТ",
    location: "ЛОКАЦИЯ",
    terrain: "ЛАНДШАФТ",
    zone: "ЗОНА",
    feature: "ОСОБЕННОСТЬ",
    time: "ВРЕМЯ",
    weather: "ПОГОДА",
    startCd: "СТАРТ КУ",
    growthCd: "+КУ / РАУНД",
    currentCd: "ТЕКУЩИЕ КУ",
    effects: "АКТИВНЫЕ ЭФФЕКТЫ",
    asset: "ФОН КАРТЫ",
    pending: "Фоны для выбранной локации появятся здесь.",
    seed: "ВАРИАНТ КАРТЫ",
    auto: "ОСВЕЩЕНИЕ",
    reset: "СБРОСИТЬ",
    saving: "СОХРАНЕНИЕ",
    saved: "СОХРАНЕНО",
    error: "ОШИБКА",
    round: "РАУНД",
    profile: "ПРОФИЛЬ ТАКТИЧЕСКОЙ СЦЕНЫ",
    live: "АКТИВНА",
    prep: "ПОДГОТОВКА",
    automatic: "АВТО",
    bright: "ЯРКО",
    dark: "ТЕМНО",
    emergency: "АВАРИЙНОЕ",
  },
  uk: {
    title: "ОТОЧЕННЯ СЦЕНИ",
    locationTerrain: "ЛОКАЦІЯ / ЛАНДШАФТ",
    location: "ЛОКАЦІЯ",
    terrain: "ЛАНДШАФТ",
    zone: "ЗОНА",
    feature: "ОСОБЛИВІСТЬ",
    time: "ЧАС",
    weather: "ПОГОДА",
    startCd: "СТАРТ КУ",
    growthCd: "+КУ / РАУНД",
    currentCd: "ПОТОЧНІ КУ",
    effects: "АКТИВНІ ЕФЕКТИ",
    asset: "ФОН МАПИ",
    pending: "Фони для вибраної локації з'являться тут.",
    seed: "ВАРІАНТ МАПИ",
    auto: "ОСВІТЛЕННЯ",
    reset: "СКИНУТИ",
    saving: "ЗБЕРЕЖЕННЯ",
    saved: "ЗБЕРЕЖЕНО",
    error: "ПОМИЛКА",
    round: "РАУНД",
    profile: "ПРОФІЛЬ ТАКТИЧНОЇ СЦЕНИ",
    live: "АКТИВНА",
    prep: "ПІДГОТОВКА",
    automatic: "АВТО",
    bright: "ЯСКРАВО",
    dark: "ТЕМНО",
    emergency: "АВАРІЙНЕ",
  },
  pl: {
    title: "ŚRODOWISKO SPOTKANIA",
    locationTerrain: "LOKACJA / TEREN",
    location: "LOKACJA",
    terrain: "TEREN",
    zone: "STREFA",
    feature: "CECHA",
    time: "PORA",
    weather: "POGODA",
    startCd: "START CD",
    growthCd: "+CD / RUNDA",
    currentCd: "AKTUALNE CD",
    effects: "AKTYWNE EFEKTY",
    asset: "TŁO MAPY",
    pending: "Tła dla wybranej lokacji pojawią się tutaj.",
    seed: "WARIANT MAPY",
    auto: "OŚWIETLENIE",
    reset: "RESET",
    saving: "ZAPISYWANIE",
    saved: "ZAPISANO",
    error: "BŁĄD",
    round: "RUNDA",
    profile: "PROFIL SCENY TAKTYCZNEJ",
    live: "AKTYWNA",
    prep: "PRZYGOTOWANIE",
    automatic: "AUTO",
    bright: "JASNO",
    dark: "CIEMNO",
    emergency: "AWARYJNE",
  },
};

function languageCode(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function option(group, key, language) {
  return (
    <option key={key} value={key}>
      {labelFor(group, key, language)}
    </option>
  );
}

function environmentKey(value) {
  try {
    return JSON.stringify(normalizeTacticalEnvironment(value));
  } catch {
    return "";
  }
}

export function TacticalEnvironmentSummary({ scene, compact = false, effectsOnly = false }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const env = normalizeTacticalEnvironment(scene?.environment);
  const text = COPY[language] || COPY.en;
  const effects = useMemo(
    () => environmentEffects(env, language),
    [env.locationType, env.terrain, env.zoneType, env.zoneSubtype, env.timeOfDay, env.weather, env.hazardBaseCd, env.hazardGrowthCd, language]
  );

  if (effectsOnly) {
    return (
      <section className="tactical-environment-summary is-effects-only">
        <div className="tactical-environment-summary__effects">
          <strong>[ {text.effects} ]</strong>
          {effects.map((effect, index) => <span key={`${effect}-${index}`}>{effect}</span>)}
        </div>
      </section>
    );
  }

  return (
    <section className={`tactical-environment-summary${compact ? " is-compact" : ""}`}>
      <div className="tactical-environment-summary__chips">
        <span className="is-location-terrain">
          <b>{text.locationTerrain}</b>
          {labelFor("locationType", env.locationType, language)} · {labelFor("terrain", env.terrain, language)}
        </span>
        <span className={`is-zone-${env.zoneType}`}>
          <b>{text.zone}</b>
          {labelFor("zoneType", env.zoneType, language)}
          {env.zoneSubtype ? ` · ${labelFor("zoneSubtype", env.zoneSubtype, language)}` : ""}
        </span>
        <span><b>{text.time}</b>{labelFor("timeOfDay", env.timeOfDay, language)}</span>
        <span><b>{text.weather}</b>{labelFor("weather", env.weather, language)}</span>
      </div>
      {!compact ? (
        <div className="tactical-environment-summary__effects">
          {effects.map((effect, index) => <span key={`${effect}-${index}`}>{effect}</span>)}
        </div>
      ) : null}
    </section>
  );
}

export default function TacticalEnvironmentPanel({ scene, session }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language] || COPY.en;
  const incomingKey = environmentKey(scene?.environment);
  const [env, setEnv] = useState(() => normalizeTacticalEnvironment(scene?.environment));
  const [saveState, setSaveState] = useState("saved");
  const envRef = useRef(env);
  const saveSequenceRef = useRef(0);

  useEffect(() => {
    const next = normalizeTacticalEnvironment(scene?.environment);
    envRef.current = next;
    setEnv(next);
  }, [scene?.sceneId, incomingKey]);

  useEffect(() => {
    envRef.current = env;
  }, [env]);

  const effects = useMemo(
    () => environmentEffects(env, language),
    [env.locationType, env.terrain, env.zoneType, env.zoneSubtype, env.timeOfDay, env.weather, env.hazardBaseCd, env.hazardGrowthCd, language]
  );
  const round = Math.max(1, Number(session?.turnState?.round || 1));
  const hazard = env.zoneType !== "normal";
  const currentCd = hazard
    ? Math.max(1, Number(env.hazardBaseCd || 1) + (round - 1) * Math.max(0, Number(env.hazardGrowthCd || 0)))
    : 0;
  const subtypes = ZONE_SUBTYPES[env.zoneType] || [""];

  if (!scene || !session?.isActive || session?.mode !== "host") return null;

  const save = async (patch) => {
    const source = envRef.current;
    const next = normalizeTacticalEnvironment({ ...source, ...patch });
    if (Object.prototype.hasOwnProperty.call(patch, "zoneType")) {
      const allowed = ZONE_SUBTYPES[next.zoneType] || [""];
      if (!allowed.includes(next.zoneSubtype)) next.zoneSubtype = allowed[0] || "";
    }
    envRef.current = next;
    setEnv(next);
    const sequence = ++saveSequenceRef.current;
    setSaveState("saving");
    try {
      const response = await session.updateTacticalScene?.({ environment: next });
      if (sequence === saveSequenceRef.current) setSaveState(response?.ok === false ? "error" : "saved");
      return response;
    } catch {
      if (sequence === saveSequenceRef.current) setSaveState("error");
      return { ok: false, error: "ENVIRONMENT_SAVE_FAILED" };
    }
  };

  const reset = () => save({ ...DEFAULT_TACTICAL_ENVIRONMENT });

  return (
    <section className="pip-panel tactical-environment-panel">
      <header className="tactical-environment-panel__head">
        <div>
          <div className="pip-bootline">{text.profile}</div>
          <h2>[ {text.title} ]</h2>
        </div>
        <div className="tactical-environment-panel__status">
          <span>{scene.active ? text.live : text.prep}</span>
          <span>{text.round} {round}</span>
          <span className={`is-${saveState}`}>
            {saveState === "saving" ? text.saving : saveState === "error" ? text.error : text.saved}
          </span>
          <button type="button" className="pip-btn" onClick={reset}>{text.reset}</button>
        </div>
      </header>

      <div className="tactical-environment-grid">
        <div className="tactical-environment-location-terrain">
          <span className="tactical-environment-location-terrain__title">{text.locationTerrain}</span>
          <label>
            <span>{text.location}</span>
            <select className="pip-input" value={env.locationType} onChange={(e) => save({ locationType: e.target.value })}>
              {LOCATION_TYPES.map((key) => option("locationType", key, language))}
            </select>
          </label>
          <label>
            <span>{text.terrain}</span>
            <select className="pip-input" value={env.terrain} onChange={(e) => save({ terrain: e.target.value })}>
              {TERRAIN_TYPES.map((key) => option("terrain", key, language))}
            </select>
          </label>
        </div>

        <label>
          <span>{text.time}</span>
          <select className="pip-input" value={env.timeOfDay} onChange={(e) => save({ timeOfDay: e.target.value })}>
            {TIME_TYPES.map((key) => option("timeOfDay", key, language))}
          </select>
        </label>
        <label>
          <span>{text.weather}</span>
          <select className="pip-input" value={env.weather} onChange={(e) => save({ weather: e.target.value })}>
            {WEATHER_TYPES.map((key) => option("weather", key, language))}
          </select>
        </label>
        <label>
          <span>{text.zone}</span>
          <select className="pip-input" value={env.zoneType} onChange={(e) => save({ zoneType: e.target.value })}>
            {ZONE_TYPES.map((key) => option("zoneType", key, language))}
          </select>
        </label>
        <label>
          <span>{text.feature}</span>
          <select className="pip-input" value={env.zoneSubtype} disabled={subtypes.length <= 1} onChange={(e) => save({ zoneSubtype: e.target.value })}>
            {subtypes.map((key) => option("zoneSubtype", key, language))}
          </select>
        </label>
        <label>
          <span>{text.startCd}</span>
          <input className="pip-input" type="number" min="1" max="12" disabled={!hazard} value={env.hazardBaseCd} onChange={(e) => save({ hazardBaseCd: Number(e.target.value) || 1 })} />
        </label>
        <label>
          <span>{text.growthCd}</span>
          <input className="pip-input" type="number" min="0" max="6" disabled={!hazard} value={env.hazardGrowthCd} onChange={(e) => save({ hazardGrowthCd: Number(e.target.value) || 0 })} />
        </label>
      </div>

      {hazard ? (
        <div className={`tactical-environment-current-hazard is-${env.zoneType}`}>
          <span>{text.currentCd}</span>
          <strong>{currentCd} CD</strong>
          <small>{text.round} {round}</small>
        </div>
      ) : null}

      <div className="tactical-environment-effects">
        <strong>[ {text.effects} ]</strong>
        {effects.map((effect, index) => <span key={`${effect}-${index}`}>{effect}</span>)}
      </div>

      <div className="tactical-environment-map-slot">
        <div>
          <strong>{text.asset}</strong>
          <span>{env.mapAssetId || text.pending}</span>
        </div>
        <label>
          <span>{text.seed}</span>
          <input className="pip-input" value={env.mapVariantSeed} placeholder={text.automatic} maxLength={80} onChange={(e) => save({ mapVariantSeed: e.target.value })} />
        </label>
        <label>
          <span>{text.auto}</span>
          <select className="pip-input" value={env.lightingPreset} onChange={(e) => save({ lightingPreset: e.target.value })}>
            <option value="auto">{text.automatic}</option>
            <option value="bright">{text.bright}</option>
            <option value="dark">{text.dark}</option>
            <option value="emergency">{text.emergency}</option>
          </select>
        </label>
      </div>
    </section>
  );
}
