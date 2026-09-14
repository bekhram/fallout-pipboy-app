import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeRequestedQuestType } from "../../utils/proceduralQuestOverride.js";

const TYPES = ["auto", "holdout", "rescue", "escort", "elimination", "hunt", "investigation", "search", "repair", "defense", "infiltration", "sabotage", "escape"];

const COPY = {
  en: { title: "QUEST TYPE", auto:"AUTO", holdout:"HOLDOUT", rescue:"RESCUE HOSTAGES", escort:"ESCORT", elimination:"ELIMINATE THREAT", hunt:"HUNT", investigation:"INVESTIGATION", search:"SEARCH", repair:"REPAIR", defense:"DEFEND OBJECTIVE", infiltration:"INFILTRATION", sabotage:"SABOTAGE", escape:"ESCAPE" },
  ru: { title: "ТИП КВЕСТА", auto:"АВТО", holdout:"ВЫДЕРЖАТЬ НАПАДЕНИЕ", rescue:"СПАСТИ ЗАЛОЖНИКОВ", escort:"СОПРОВОЖДЕНИЕ", elimination:"УСТРАНИТЬ УГРОЗУ", hunt:"ОХОТА", investigation:"РАССЛЕДОВАНИЕ", search:"ПОИСК", repair:"РЕМОНТ", defense:"ЗАЩИТА ЦЕЛИ", infiltration:"ПРОНИКНОВЕНИЕ", sabotage:"ДИВЕРСИЯ", escape:"ПОБЕГ" },
  uk: { title: "ТИП КВЕСТУ", auto:"АВТО", holdout:"ВИТРИМАТИ НАПАД", rescue:"ВРЯТУВАТИ ЗАРУЧНИКІВ", escort:"СУПРОВІД", elimination:"УСУНУТИ ЗАГРОЗУ", hunt:"ПОЛЮВАННЯ", investigation:"РОЗСЛІДУВАННЯ", search:"ПОШУК", repair:"РЕМОНТ", defense:"ЗАХИСТ ЦІЛІ", infiltration:"ПРОНИКНЕННЯ", sabotage:"ДИВЕРСІЯ", escape:"ВТЕЧА" },
  pl: { title: "TYP ZADANIA", auto:"AUTO", holdout:"UTRZYMAJ POZYCJĘ", rescue:"URATUJ ZAKŁADNIKÓW", escort:"ESKORTA", elimination:"USUŃ ZAGROŻENIE", hunt:"POLOWANIE", investigation:"ŚLEDZTWO", search:"POSZUKIWANIE", repair:"NAPRAWA", defense:"OBRONA CELU", infiltration:"INFILTRACJA", sabotage:"SABOTAŻ", escape:"UCIECZKA" },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

export default function GmQuestTypeSelector({ session }) {
  const { i18n } = useTranslation();
  const text = COPY[languageCode(i18n.resolvedLanguage || i18n.language)] || COPY.en;
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [value, setValue] = useState(() => normalizeRequestedQuestType(spec?.questType));

  useEffect(() => {
    setValue(normalizeRequestedQuestType(spec?.questType));
  }, [scene?.sceneId, spec?.questType]);

  if (!scene || !spec || session?.mode !== "host") return null;

  const change = async (event) => {
    const next = normalizeRequestedQuestType(event.target.value);
    setValue(next);
    await session.updateTacticalScene?.({
      environment: {
        ...(scene.environment || {}),
        proceduralMapSpec: {
          ...spec,
          questType: next,
        },
      },
    });
  };

  return (
    <section className="pip-panel gm-quest-type-selector">
      <label>
        <span>{text.title}</span>
        <select className="pip-input" value={value} onChange={change}>
          {TYPES.map((type) => <option key={type} value={type}>{text[type]}</option>)}
        </select>
      </label>
    </section>
  );
}
