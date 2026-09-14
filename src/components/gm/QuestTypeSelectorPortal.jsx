import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  PROCEDURAL_QUEST_SELECTION_OPTIONS,
  normalizeRequestedQuestType,
} from "../../utils/proceduralQuestOverride.js";

const COPY = {
  en: {
    label: "QUEST TYPE",
    note: "AUTO chooses a quest from the generated encounter. Manual selection forces the primary quest type; compatible secondary objectives can still be added.",
    auto: "AUTO",
    holdout: "Hold the Line",
    rescue: "Hostage Rescue",
    escort: "Escort",
    elimination: "Eliminate Threat",
    hunt: "Hunt",
    investigation: "Investigation",
    search: "Search",
    repair: "Repair",
    defense: "Defense",
    infiltration: "Infiltration",
    sabotage: "Sabotage",
    escape: "Escape",
  },
  ru: {
    label: "ТИП КВЕСТА",
    note: "АВТО выбирает квест по содержимому энкаунтера. Ручной выбор фиксирует основную цель; совместимые вторичные задачи могут добавляться автоматически.",
    auto: "АВТО",
    holdout: "Выдержать нападение",
    rescue: "Спасти заложников",
    escort: "Сопровождение",
    elimination: "Устранить угрозу",
    hunt: "Охота",
    investigation: "Расследование",
    search: "Поиск",
    repair: "Ремонт",
    defense: "Защита",
    infiltration: "Проникновение",
    sabotage: "Диверсия",
    escape: "Побег",
  },
  uk: {
    label: "ТИП КВЕСТУ",
    note: "АВТО обирає квест за вмістом енкаунтера. Ручний вибір фіксує основну ціль; сумісні другорядні завдання можуть додаватися автоматично.",
    auto: "АВТО",
    holdout: "Витримати напад",
    rescue: "Врятувати заручників",
    escort: "Супровід",
    elimination: "Усунути загрозу",
    hunt: "Полювання",
    investigation: "Розслідування",
    search: "Пошук",
    repair: "Ремонт",
    defense: "Захист",
    infiltration: "Проникнення",
    sabotage: "Диверсія",
    escape: "Втеча",
  },
  pl: {
    label: "TYP ZADANIA",
    note: "AUTO dobiera zadanie do wygenerowanego spotkania. Wybór ręczny wymusza główny typ zadania; zgodne cele poboczne nadal mogą być dodawane automatycznie.",
    auto: "AUTO",
    holdout: "Utrzymaj pozycję",
    rescue: "Uratuj zakładników",
    escort: "Eskorta",
    elimination: "Usuń zagrożenie",
    hunt: "Polowanie",
    investigation: "Śledztwo",
    search: "Poszukiwanie",
    repair: "Naprawa",
    defense: "Obrona",
    infiltration: "Infiltracja",
    sabotage: "Sabotaż",
    escape: "Ucieczka",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function currentSpec(session) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec;
  return spec && typeof spec === "object" ? spec : null;
}

export default function QuestTypeSelectorPortal({ session }) {
  const { i18n } = useTranslation();
  const lang = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const [target, setTarget] = useState(null);
  const spec = currentSpec(session);
  const savedValue = normalizeRequestedQuestType(spec?.questType);
  const [value, setValue] = useState(savedValue);

  useEffect(() => {
    setValue(normalizeRequestedQuestType(currentSpec(session)?.questType));
  }, [session?.tacticalScene?.sceneId, session?.tacticalScene?.environment?.proceduralMapSpec?.questType]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    let frame = 0;
    const locate = () => {
      const node = document.querySelector(".gm-scene-preset-v2 .gm-encounter-difficulty__controls");
      if (node) setTarget(node);
      else frame = window.requestAnimationFrame(locate);
    };
    locate();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [session?.tacticalScene?.sceneId]);

  const disabled = !spec || !session?.isActive || session?.mode !== "host";
  const options = useMemo(() => PROCEDURAL_QUEST_SELECTION_OPTIONS, []);

  const change = async (nextValue) => {
    const next = normalizeRequestedQuestType(nextValue);
    setValue(next);
    const latest = currentSpec(session);
    if (!latest) return;
    await session.updateTacticalScene?.({
      environment: {
        ...(session?.tacticalScene?.environment || {}),
        proceduralMapSpec: {
          ...latest,
          questType: next,
        },
      },
    });
  };

  if (!target) return null;

  return createPortal(
    <label className="gm-quest-type-selector">
      <span>{text.label}</span>
      <select className="pip-input" value={value} disabled={disabled} onChange={(event) => change(event.target.value)}>
        {options.map((type) => <option key={type} value={type}>{text[type]}</option>)}
      </select>
      <small>{text.note}</small>
    </label>,
    target,
  );
}
