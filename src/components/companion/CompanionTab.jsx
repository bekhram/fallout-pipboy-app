import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import "./companion.css";

const STORAGE_KEY = "fallout_pipboy_companion_v1";
const SPECIAL_KEYS = ["S", "P", "E", "C", "I", "A", "L"];

const COPY = {
  en: {
    title: "COMPANION / PET",
    subtitle: "Compact character card",
    companion: "Companion",
    pet: "Pet",
    name: "Name",
    namePlaceholder: "Dogmeat, Codsworth...",
    species: "Type / species",
    speciesPlaceholder: "Human, dog, robot...",
    level: "Level",
    hp: "HP",
    defense: "Defense",
    initiative: "Initiative",
    special: "SPECIAL",
    notes: "Notes",
    notesPlaceholder: "Abilities, equipment, behavior, useful reminders...",
    reset: "RESET",
    close: "BACK",
    unnamed: "UNNAMED",
  },
  ru: {
    title: "КОМПАНЬОН / ПИТОМЕЦ",
    subtitle: "Компактная карточка персонажа",
    companion: "Компаньон",
    pet: "Питомец",
    name: "Имя",
    namePlaceholder: "Догмит, Кодсворт...",
    species: "Тип / вид",
    speciesPlaceholder: "Человек, собака, робот...",
    level: "Уровень",
    hp: "HP",
    defense: "Защита",
    initiative: "Инициатива",
    special: "SPECIAL",
    notes: "Заметки",
    notesPlaceholder: "Способности, снаряжение, поведение, важные заметки...",
    reset: "ОЧИСТИТЬ",
    close: "НАЗАД",
    unnamed: "БЕЗ ИМЕНИ",
  },
  uk: {
    title: "КОМПАНЬЙОН / УЛЮБЛЕНЕЦЬ",
    subtitle: "Компактна картка персонажа",
    companion: "Компаньйон",
    pet: "Улюбленець",
    name: "Ім'я",
    namePlaceholder: "Догміт, Кодсворт...",
    species: "Тип / вид",
    speciesPlaceholder: "Людина, собака, робот...",
    level: "Рівень",
    hp: "HP",
    defense: "Захист",
    initiative: "Ініціатива",
    special: "SPECIAL",
    notes: "Нотатки",
    notesPlaceholder: "Здібності, спорядження, поведінка, важливі нотатки...",
    reset: "ОЧИСТИТИ",
    close: "НАЗАД",
    unnamed: "БЕЗ ІМЕНІ",
  },
  pl: {
    title: "TOWARZYSZ / PUPIL",
    subtitle: "Kompaktowa karta postaci",
    companion: "Towarzysz",
    pet: "Pupil",
    name: "Imię",
    namePlaceholder: "Dogmeat, Codsworth...",
    species: "Typ / gatunek",
    speciesPlaceholder: "Człowiek, pies, robot...",
    level: "Poziom",
    hp: "HP",
    defense: "Obrona",
    initiative: "Inicjatywa",
    special: "SPECIAL",
    notes: "Notatki",
    notesPlaceholder: "Zdolności, ekwipunek, zachowanie, ważne notatki...",
    reset: "WYCZYŚĆ",
    close: "WRÓĆ",
    unnamed: "BEZ IMIENIA",
  },
};

function getLanguage(value) {
  const key = String(value || "en").split("-")[0];
  return COPY[key] ? key : "en";
}

function createDefaultCompanion() {
  return {
    kind: "companion",
    name: "",
    species: "",
    level: "1",
    currentHp: "10",
    maxHp: "10",
    defense: "1",
    initiative: "",
    notes: "",
    special: SPECIAL_KEYS.reduce((result, key) => {
      result[key] = "5";
      return result;
    }, {}),
  };
}

function clampNumber(value, min = 0, max = 999) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(min);
  return String(Math.max(min, Math.min(max, numeric)));
}

export default function CompanionTab({ open, onClose }) {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const [data, setData] = useState(createDefaultCompanion);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        setData({
          ...createDefaultCompanion(),
          ...saved,
          special: {
            ...createDefaultCompanion().special,
            ...(saved.special || {}),
          },
        });
      }
    } catch {
      setData(createDefaultCompanion());
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const hpPercent = useMemo(() => {
    const max = Math.max(1, Number(data.maxHp || 1));
    return Math.max(0, Math.min(100, (Number(data.currentHp || 0) / max) * 100));
  }, [data.currentHp, data.maxHp]);

  const update = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateHp = (delta) => {
    setData((prev) => {
      const maxHp = Math.max(1, Number(prev.maxHp || 1));
      const nextHp = Math.max(0, Math.min(maxHp, Number(prev.currentHp || 0) + delta));
      return { ...prev, currentHp: String(nextHp) };
    });
  };

  const updateMaxHp = (value) => {
    setData((prev) => {
      const maxHp = Math.max(1, Number(value || 1));
      const currentHp = Math.min(maxHp, Math.max(0, Number(prev.currentHp || 0)));
      return { ...prev, maxHp: String(maxHp), currentHp: String(currentHp) };
    });
  };

  const updateSpecial = (key, value) => {
    setData((prev) => ({
      ...prev,
      special: {
        ...prev.special,
        [key]: clampNumber(value, 1, 20),
      },
    }));
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <section className="companion-tab-screen" aria-label={copy.title}>
      <div className="companion-tab-inner">
        <div className="pip-panel pip-block companion-card">
          <div className="pip-head companion-card-head">
            <div>
              <h2>[ {copy.title} ]</h2>
              <span>{copy.subtitle}</span>
            </div>
            <button type="button" className="pip-btn" onClick={onClose}>
              {copy.close}
            </button>
          </div>

          <div className="companion-kind-toggle">
            <button
              type="button"
              className={`pip-btn ${data.kind === "companion" ? "is-primary" : ""}`}
              onClick={() => update("kind", "companion")}
            >
              {copy.companion}
            </button>
            <button
              type="button"
              className={`pip-btn ${data.kind === "pet" ? "is-primary" : ""}`}
              onClick={() => update("kind", "pet")}
            >
              {copy.pet}
            </button>
          </div>

          <div className="companion-summary">
            <div className="companion-avatar" aria-hidden="true">
              {(data.name || "?").trim().slice(0, 1).toUpperCase() || "?"}
            </div>
            <div className="companion-summary-copy">
              <strong>{data.name?.trim() || copy.unnamed}</strong>
              <span>{data.species?.trim() || (data.kind === "pet" ? copy.pet : copy.companion)}</span>
            </div>
            <div className="companion-level-chip">LV {data.level || "1"}</div>
          </div>

          <div className="companion-form-grid">
            <label className="companion-field companion-field-wide">
              <span>{copy.name}</span>
              <input
                className="pip-input"
                value={data.name}
                placeholder={copy.namePlaceholder}
                onChange={(event) => update("name", event.target.value)}
              />
            </label>

            <label className="companion-field companion-field-wide">
              <span>{copy.species}</span>
              <input
                className="pip-input"
                value={data.species}
                placeholder={copy.speciesPlaceholder}
                onChange={(event) => update("species", event.target.value)}
              />
            </label>

            <label className="companion-field">
              <span>{copy.level}</span>
              <input
                className="pip-input"
                inputMode="numeric"
                value={data.level}
                onChange={(event) => update("level", clampNumber(event.target.value, 1, 999))}
              />
            </label>

            <label className="companion-field">
              <span>{copy.defense}</span>
              <input
                className="pip-input"
                inputMode="numeric"
                value={data.defense}
                onChange={(event) => update("defense", clampNumber(event.target.value, 0, 99))}
              />
            </label>

            <label className="companion-field">
              <span>{copy.initiative}</span>
              <input
                className="pip-input"
                inputMode="numeric"
                value={data.initiative}
                onChange={(event) => update("initiative", event.target.value.replace(/[^0-9+-]/g, ""))}
              />
            </label>
          </div>

          <div className="companion-hp-block">
            <div className="companion-hp-head">
              <strong>{copy.hp}</strong>
              <span>{data.currentHp} / {data.maxHp}</span>
            </div>
            <div className="companion-hp-track">
              <div className="companion-hp-fill" style={{ width: `${hpPercent}%` }} />
            </div>
            <div className="companion-hp-controls">
              <button type="button" className="pip-btn" onClick={() => updateHp(-1)}>−</button>
              <input
                className="pip-input"
                inputMode="numeric"
                value={data.currentHp}
                onChange={(event) => {
                  const max = Math.max(1, Number(data.maxHp || 1));
                  update("currentHp", clampNumber(event.target.value, 0, max));
                }}
              />
              <span>/</span>
              <input
                className="pip-input"
                inputMode="numeric"
                value={data.maxHp}
                onChange={(event) => updateMaxHp(event.target.value)}
              />
              <button type="button" className="pip-btn" onClick={() => updateHp(1)}>+</button>
            </div>
          </div>

          <div className="companion-special-block">
            <div className="companion-section-label">[ {copy.special} ]</div>
            <div className="companion-special-grid">
              {SPECIAL_KEYS.map((key) => (
                <label key={key} className="companion-special-cell">
                  <span>{key}</span>
                  <input
                    className="pip-input"
                    inputMode="numeric"
                    value={data.special?.[key] ?? "5"}
                    onChange={(event) => updateSpecial(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="companion-field companion-notes">
            <span>{copy.notes}</span>
            <textarea
              className="pip-input"
              rows={4}
              value={data.notes}
              placeholder={copy.notesPlaceholder}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>

          <div className="companion-card-footer">
            <button
              type="button"
              className="pip-btn"
              onClick={() => setData(createDefaultCompanion())}
            >
              {copy.reset}
            </button>
          </div>
        </div>
      </div>
    </section>,
    document.body
  );
}
