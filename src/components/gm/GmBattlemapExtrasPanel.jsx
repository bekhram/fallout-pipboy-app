import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateLocalizedProceduralBattlemapExtras } from "../../utils/proceduralBattlemapExtras.js";
import "./gmProceduralRoomDescriptions.css";

const LazyGmNarrativeEditor = lazy(() => import("./GmNarrativeEditor.jsx"));

const COPY = {
  en: {
    title: "[ BATTLEMAP EVENTS & DISCOVERIES ]",
    position: "Map",
    legend: "! trap · E event · L loot · W workbench · ? discovery",
    type: "Type",
    details: "Details", describe: "DESCRIBE", close: "CLOSE DESCRIPTION",
  },
  ru: {
    title: "[ СОБЫТИЯ И НАХОДКИ НА КАРТЕ ]",
    position: "Координаты",
    legend: "! ловушка · E событие · L лут · W верстак · ? находка",
    type: "Тип",
    details: "Детали", describe: "ОПИСАТЬ", close: "ЗАКРЫТЬ ОПИСАНИЕ",
  },
  uk: {
    title: "[ ПОДІЇ ТА ЗНАХІДКИ НА МАПІ ]",
    position: "Координати",
    legend: "! пастка · E подія · L лут · W верстак · ? знахідка",
    type: "Тип",
    details: "Деталі", describe: "ОПИСАТИ", close: "ЗАКРИТИ ОПИС",
  },
  pl: {
    title: "[ ZDARZENIA I ODKRYCIA NA MAPIE ]",
    position: "Pozycja",
    legend: "! pułapka · E zdarzenie · L łup · W warsztat · ? odkrycie",
    type: "Typ",
    details: "Szczegóły", describe: "OPISZ", close: "ZAMKNIJ OPIS",
  },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

export default function GmBattlemapExtrasPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [openNarrativeEventId, setOpenNarrativeEventId] = useState("");

  const key = spec ? [
    spec.type,
    spec.seed,
    spec.terrain,
    spec.density,
    spec.lootRarity,
    spec.wealth,
    spec.trapCount,
    spec.trapLethality,
  ].join("|") : "";

  const extras = useMemo(
    () => (spec ? generateLocalizedProceduralBattlemapExtras(spec, lang) : []),
    [key, lang],
  );

  useEffect(() => {
    setOpenNarrativeEventId("");
  }, [scene?.sceneId, key]);

  if (session?.mode !== "host" || !spec || !extras.length) return null;

  return (
    <section className="gm-room-descriptions pip-panel">
      <header className="gm-room-descriptions__head">
        <strong>{text.title}</strong>
      </header>
      <div className="gm-room-descriptions__summary">
        <span>{text.legend}</span>
      </div>
      <div className="gm-room-descriptions__list">
        {extras.map((extra) => (
          <article key={extra.id} className="gm-room-card gm-room-card--compact-extra">
            <div className="gm-room-card__head">
              <div className="gm-room-card__title">
                <strong>{extra.marker}. {extra.name}</strong>
                <small>{text.type}: {extra.category} · {text.position}: {extra.x + 1}:{extra.y + 1}</small>
              </div>
              <div className="gm-room-card__markers"><span>{extra.symbol}</span></div>
            </div>
            <div className="gm-room-card__body">
              <p>{extra.description}</p>
              {extra.meta ? <small className="gm-room-card__meta">{extra.meta}</small> : null}
            </div>
            <button type="button" className="pip-btn gm-narrative-toggle"
              aria-expanded={openNarrativeEventId === extra.id}
              onClick={() => setOpenNarrativeEventId((current) => current === extra.id ? "" : extra.id)}>
              {openNarrativeEventId === extra.id ? text.close : text.describe} · #{extra.marker}
            </button>
            {openNarrativeEventId === extra.id ? (
              <Suspense fallback={<small>…</small>}>
                <LazyGmNarrativeEditor session={session} target={{
                  kind: "event", id: extra.id, number: extra.marker, name: extra.name,
                  hidden: extra.kind === "trap",
                  source: [
                    `Type: ${extra.category} · ${extra.kind}`,
                    `Map position: ${Number(extra.x) + 1}:${Number(extra.y) + 1}`,
                    extra.description, extra.meta || "",
                  ].filter(Boolean).join("\n"),
                }} />
              </Suspense>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
