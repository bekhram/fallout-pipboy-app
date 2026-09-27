import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { generateLocalizedProceduralBattlemapExtras } from "../../utils/proceduralBattlemapExtras.js";
import "./gmProceduralRoomDescriptions.css";

const COPY = {
  en: {
    title: "[ BATTLEMAP EVENTS & DISCOVERIES ]",
    position: "Map",
    legend: "! trap · E event · L loot · W workbench · ? discovery",
    type: "Type",
    details: "Details",
  },
  ru: {
    title: "[ СОБЫТИЯ И НАХОДКИ НА КАРТЕ ]",
    position: "Координаты",
    legend: "! ловушка · E событие · L лут · W верстак · ? находка",
    type: "Тип",
    details: "Детали",
  },
  uk: {
    title: "[ ПОДІЇ ТА ЗНАХІДКИ НА МАПІ ]",
    position: "Координати",
    legend: "! пастка · E подія · L лут · W верстак · ? знахідка",
    type: "Тип",
    details: "Деталі",
  },
  pl: {
    title: "[ ZDARZENIA I ODKRYCIA NA MAPIE ]",
    position: "Pozycja",
    legend: "! pułapka · E zdarzenie · L łup · W warsztat · ? odkrycie",
    type: "Typ",
    details: "Szczegóły",
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
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec || null;

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
          </article>
        ))}
      </div>
    </section>
  );
}
