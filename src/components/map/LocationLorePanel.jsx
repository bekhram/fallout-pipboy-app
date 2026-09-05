import React, { useEffect, useMemo, useState } from "react";
import { getLocationWikiMeta } from "../../data/map/locationLore.js";

const COPY = {
  en: { help: "REFERENCE", loading: "Loading Wiki reference...", unavailable: "Reference unavailable.", source: "Source", close: "CLOSE", retry: "RETRY", fallback: "Offline summary" },
  ru: { help: "СПРАВКА", loading: "Загрузка справки Wiki...", unavailable: "Справка недоступна.", source: "Источник", close: "ЗАКРЫТЬ", retry: "ПОВТОРИТЬ", fallback: "Офлайн-сводка" },
  uk: { help: "ДОВІДКА", loading: "Завантаження довідки Wiki...", unavailable: "Довідка недоступна.", source: "Джерело", close: "ЗАКРИТИ", retry: "ПОВТОРИТИ", fallback: "Офлайн-зведення" },
  pl: { help: "INFO", loading: "Ładowanie informacji z Wiki...", unavailable: "Informacje niedostępne.", source: "Źródło", close: "ZAMKNIJ", retry: "PONÓW", fallback: "Opis offline" },
};

function getLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function cacheKey(regionId, locationId, language) {
  return `pip_location_lore_v1:${language}:${regionId || "region"}:${locationId}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional cache */ }
}

export default function LocationLorePanel({ location, regionId, language, displayName }) {
  const lang = getLanguage(language);
  const copy = COPY[lang];
  const meta = useMemo(() => getLocationWikiMeta(location), [location]);
  const key = meta ? cacheKey(regionId, meta.id, lang) : null;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOpen(false);
    setError("");
    setData(key ? readCache(key) : null);
  }, [key]);

  if (!meta) return null;

  const load = async (force = false) => {
    if (loading) return;
    if (!force && data) {
      setOpen(true);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/location-lore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meta.wikiTitle,
          locationName: displayName || location?.name || meta.wikiTitle,
          language: lang,
          coreLore: meta.coreLore || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || copy.unavailable);
      setData(payload);
      if (key) writeCache(key, payload);
    } catch (requestError) {
      if (meta.coreLore) {
        const fallback = {
          title: displayName || location?.name || meta.wikiTitle,
          summary: meta.coreLore,
          details: [],
          sourceUrl: meta.sourceUrl,
          sourceLabel: "Fallout Wiki",
          fallback: true,
        };
        setData(fallback);
      } else {
        setError(requestError?.message || copy.unavailable);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pip-location-lore">
      <button
        type="button"
        className="pip-map-world-route__lore"
        onClick={() => open ? setOpen(false) : load(false)}
      >
        {open ? copy.close : copy.help}
      </button>

      {open ? (
        <div className="pip-location-lore__panel">
          <div className="pip-location-lore__head">
            <strong>[ {displayName || location?.name || meta.wikiTitle} ]</strong>
            {data?.fallback ? <span>{copy.fallback}</span> : null}
          </div>

          {loading && !data ? <div className="pip-location-lore__status">{copy.loading}</div> : null}
          {error && !data ? (
            <div className="pip-location-lore__status">
              <span>{error}</span>
              <button type="button" className="pip-btn" onClick={() => load(true)}>{copy.retry}</button>
            </div>
          ) : null}

          {data ? (
            <>
              <p>{data.summary}</p>
              {Array.isArray(data.details) && data.details.length ? (
                <ul>
                  {data.details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
                </ul>
              ) : null}
              <a href={data.sourceUrl || meta.sourceUrl} target="_blank" rel="noreferrer" className="pip-location-lore__source">
                {copy.source}: {data.sourceLabel || "Fallout Wiki"} ↗
              </a>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
