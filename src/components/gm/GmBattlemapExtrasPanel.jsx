import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { generateLocalizedProceduralBattlemapExtras } from "../../utils/proceduralBattlemapExtras.js";
import "./gmProceduralRoomDescriptions.css";

const COPY = {
  en: {
    title: "[ BATTLEMAP EVENTS & DISCOVERIES ]",
    subtitle: "Numbered markers use the same map seed as the scene",
    position: "Map",
    legend: "! trap · E event · L loot · W workbench · ? discovery",
  },
  ru: {
    title: "[ СОБЫТИЯ И НАХОДКИ НА КАРТЕ ]",
    subtitle: "Номер метки соответствует тому же seed и позиции на тактической карте",
    position: "Карта",
    legend: "! ловушка · E событие · L лут · W верстак · ? находка",
  },
  uk: {
    title: "[ ПОДІЇ ТА ЗНАХІДКИ НА МАПІ ]",
    subtitle: "Номер мітки відповідає тому самому seed і позиції на тактичній мапі",
    position: "Мапа",
    legend: "! пастка · E подія · L лут · W верстак · ? знахідка",
  },
  pl: {
    title: "[ ZDARZENIA I ODKRYCIA NA MAPIE ]",
    subtitle: "Numer znacznika odpowiada temu samemu seedowi i pozycji na mapie taktycznej",
    position: "Mapa",
    legend: "! pułapka · E zdarzenie · L łup · W warsztat · ? odkrycie",
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
        <small>{text.subtitle}</small>
      </header>
      <div className="gm-room-descriptions__summary">
        <span>{text.legend}</span>
      </div>
      <div className="gm-room-descriptions__list">
        {extras.map((extra) => (
          <article key={extra.id} className="gm-room-card">
            <div className="gm-room-card__head">
              <div className="gm-room-card__title">
                <strong>{extra.marker}. {extra.name}</strong>
                <small>{extra.category} · {text.position}: {extra.x + 1}:{extra.y + 1}</small>
              </div>
              <div className="gm-room-card__markers"><span>{extra.symbol}</span></div>
            </div>
            <div className="gm-room-card__body">
              <p>{extra.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
