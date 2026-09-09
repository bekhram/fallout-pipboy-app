import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { generateLocalizedProceduralRooms } from "../../utils/proceduralRoomContent.js";
import "./gmProceduralRoomDescriptions.css";

const COPY = {
  en: {
    title: "[ ROOM DESCRIPTIONS ]",
    subtitle: "Generated from the same seed as the map",
    noMap: "Apply a generated map to see its room contents.",
    terminal: "T",
    safe: "S",
    vending: "V",
    enemy: "!",
    workbench: "W",
    loot: "L",
    meds: "+",
  },
  ru: {
    title: "[ ОПИСАНИЕ КОМНАТ ]",
    subtitle: "Генерируется из того же seed, что и карта",
    noMap: "Примените сгенерированную карту, чтобы увидеть содержимое комнат.",
    terminal: "T",
    safe: "S",
    vending: "V",
    enemy: "!",
    workbench: "W",
    loot: "L",
    meds: "+",
  },
  uk: {
    title: "[ ОПИС КІМНАТ ]",
    subtitle: "Генерується з того самого seed, що й мапа",
    noMap: "Застосуйте згенеровану мапу, щоб побачити вміст кімнат.",
    terminal: "T",
    safe: "S",
    vending: "V",
    enemy: "!",
    workbench: "W",
    loot: "L",
    meds: "+",
  },
  pl: {
    title: "[ OPIS POMIESZCZEŃ ]",
    subtitle: "Generowany z tego samego seed co mapa",
    noMap: "Zastosuj wygenerowaną mapę, aby zobaczyć zawartość pomieszczeń.",
    terminal: "T",
    safe: "S",
    vending: "V",
    enemy: "!",
    workbench: "W",
    loot: "L",
    meds: "+",
  },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

const SYMBOLS = {
  TERMINAL: "T",
  SAFE: "S",
  VENDING: "V",
  ENEMY: "!",
  WORKBENCH: "W",
  LOOT: "L",
  MEDS: "+",
};

function specFromScene(scene) {
  const spec = scene?.environment?.proceduralMapSpec;
  if (!spec || typeof spec !== "object") return null;
  return spec;
}

export default function GmProceduralRoomDescriptions({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const spec = specFromScene(scene);
  const rooms = useMemo(
    () => (spec ? generateLocalizedProceduralRooms(spec, lang) : []),
    [spec?.type, spec?.seed, spec?.cols, spec?.rows, spec?.density, lang]
  );

  if (session?.mode !== "host") return null;

  return (
    <section className="gm-room-descriptions pip-panel">
      <header className="gm-room-descriptions__head">
        <strong>{text.title}</strong>
        <small>{text.subtitle}</small>
      </header>

      {!spec ? <div className="gm-room-descriptions__empty">{text.noMap}</div> : null}

      {rooms.length ? (
        <div className="gm-room-descriptions__list">
          {rooms.map((room) => (
            <article key={room.id} className="gm-room-card">
              <div className="gm-room-card__head">
                <strong>{room.name}</strong>
                <div className="gm-room-card__markers" aria-label="room markers">
                  {(room.markers || []).slice(0, 5).map((marker, index) => (
                    <span key={`${marker}-${index}`} title={marker}>{SYMBOLS[marker] || "•"}</span>
                  ))}
                </div>
              </div>
              <div className="gm-room-card__lines">
                {room.lines.map((line, index) => <div key={`${room.id}-${index}`}>{line}</div>)}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
