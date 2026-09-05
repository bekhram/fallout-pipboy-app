import React, { useEffect, useMemo, useState } from "react";
import {
  BESTIARY_CATEGORIES,
  BESTIARY_ENTRIES,
  createEmptyBestiaryEntry,
} from "../../data/bestiary.js";
import "./bestiary.css";

const STORAGE_KEY = "fallout_pipboy_bestiary_custom_v1";

const TEXT = {
  en: {
    title: "BESTIARY",
    subtitle: "Creatures, enemies, allies, robots, traps and hazards",
    search: "Search bestiary...",
    add: "+ ENTRY",
    edit: "EDIT",
    save: "SAVE",
    remove: "DELETE",
    noResults: "No matching entries.",
    noSelection: "Select an entry from the bestiary.",
    custom: "CUSTOM",
    builtIn: "REFERENCE",
    all: "ALL",
    creature: "CREATURES",
    enemy: "ENEMIES",
    ally: "ALLIES",
    robot: "ROBOTS",
    trap: "TRAPS",
    hazard: "HAZARDS",
    name: "NAME",
    category: "CATEGORY",
    tags: "TAGS",
    creatureType: "TYPE",
    level: "LEVEL",
    body: "BODY",
    mind: "MIND",
    melee: "MELEE",
    guns: "GUNS",
    other: "OTHER",
    hp: "HP",
    initiative: "INITIATIVE",
    defense: "DEFENSE",
    carryWeight: "CARRY WEIGHT",
    meleeBonus: "MELEE BONUS",
    physDr: "PHYS DR",
    energyDr: "ENERGY DR",
    radDr: "RAD DR",
    poisonDr: "POISON DR",
    attacks: "ATTACKS",
    abilities: "SPECIAL ABILITIES",
    tactics: "TACTICS",
    loot: "LOOT",
    summary: "DESCRIPTION",
    detectionDifficulty: "DETECTION DIFFICULTY",
    disarmDifficulty: "DISARM DIFFICULTY",
    trigger: "TRIGGER",
    damage: "DAMAGE",
    effect: "EFFECT",
    source: "SOURCE",
    notes: "NOTES",
    stats: "STAT BLOCK",
    trapData: "TRAP / HAZARD",
    referenceHint: "Reference summaries are intentionally concise. Exact stat blocks can be added as custom entries from your own rules material.",
    confirmDelete: "Delete this custom bestiary entry?",
  },
  ru: {
    title: "БЕСТИАРИЙ",
    subtitle: "Существа, противники, союзники, роботы, ловушки и опасности",
    search: "Поиск по бестиарию...",
    add: "+ ЗАПИСЬ",
    edit: "ИЗМЕНИТЬ",
    save: "СОХРАНИТЬ",
    remove: "УДАЛИТЬ",
    noResults: "Ничего не найдено.",
    noSelection: "Выберите запись из бестиария.",
    custom: "СВОЯ",
    builtIn: "СПРАВОЧНИК",
    all: "ВСЕ",
    creature: "СУЩЕСТВА",
    enemy: "ПРОТИВНИКИ",
    ally: "СОЮЗНИКИ",
    robot: "РОБОТЫ",
    trap: "ЛОВУШКИ",
    hazard: "ОПАСНОСТИ",
    name: "НАЗВАНИЕ",
    category: "КАТЕГОРИЯ",
    tags: "ТЕГИ",
    creatureType: "ТИП",
    level: "УРОВЕНЬ",
    body: "BODY",
    mind: "MIND",
    melee: "БЛИЖНИЙ БОЙ",
    guns: "ОРУЖИЕ",
    other: "ДРУГОЕ",
    hp: "HP",
    initiative: "ИНИЦИАТИВА",
    defense: "ЗАЩИТА",
    carryWeight: "ГРУЗОПОДЪЁМНОСТЬ",
    meleeBonus: "БОНУС БЛИЖНЕГО БОЯ",
    physDr: "ФИЗ DR",
    energyDr: "ЭНЕРГ DR",
    radDr: "РАД DR",
    poisonDr: "ЯД DR",
    attacks: "АТАКИ",
    abilities: "ОСОБЫЕ СПОСОБНОСТИ",
    tactics: "ТАКТИКА",
    loot: "ДОБЫЧА",
    summary: "ОПИСАНИЕ",
    detectionDifficulty: "СЛОЖНОСТЬ ОБНАРУЖЕНИЯ",
    disarmDifficulty: "СЛОЖНОСТЬ ОБЕЗВРЕЖИВАНИЯ",
    trigger: "ТРИГГЕР",
    damage: "УРОН",
    effect: "ЭФФЕКТ",
    source: "ИСТОЧНИК",
    notes: "ЗАМЕТКИ",
    stats: "ХАРАКТЕРИСТИКИ",
    trapData: "ЛОВУШКА / ОПАСНОСТЬ",
    referenceHint: "Встроенные описания сделаны краткими. Точные статблоки можно добавлять как пользовательские записи из ваших материалов правил.",
    confirmDelete: "Удалить эту пользовательскую запись?",
  },
  uk: {
    title: "БЕСТІАРІЙ",
    subtitle: "Істоти, противники, союзники, роботи, пастки та небезпеки",
    search: "Пошук у бестіарії...",
    add: "+ ЗАПИС",
    edit: "ЗМІНИТИ",
    save: "ЗБЕРЕГТИ",
    remove: "ВИДАЛИТИ",
    noResults: "Нічого не знайдено.",
    noSelection: "Оберіть запис із бестіарію.",
    custom: "ВЛАСНА",
    builtIn: "ДОВІДНИК",
    all: "УСІ",
    creature: "ІСТОТИ",
    enemy: "ПРОТИВНИКИ",
    ally: "СОЮЗНИКИ",
    robot: "РОБОТИ",
    trap: "ПАСТКИ",
    hazard: "НЕБЕЗПЕКИ",
    name: "НАЗВА",
    category: "КАТЕГОРІЯ",
    tags: "ТЕГИ",
    creatureType: "ТИП",
    level: "РІВЕНЬ",
    body: "BODY",
    mind: "MIND",
    melee: "БЛИЖНІЙ БІЙ",
    guns: "ЗБРОЯ",
    other: "ІНШЕ",
    hp: "HP",
    initiative: "ІНІЦІАТИВА",
    defense: "ЗАХИСТ",
    carryWeight: "ВАНТАЖОПІДЙОМНІСТЬ",
    meleeBonus: "БОНУС БЛИЖНЬОГО БОЮ",
    physDr: "ФІЗ DR",
    energyDr: "ЕНЕРГ DR",
    radDr: "РАД DR",
    poisonDr: "ОТРУТА DR",
    attacks: "АТАКИ",
    abilities: "ОСОБЛИВІ ЗДІБНОСТІ",
    tactics: "ТАКТИКА",
    loot: "ЗДОБИЧ",
    summary: "ОПИС",
    detectionDifficulty: "СКЛАДНІСТЬ ВИЯВЛЕННЯ",
    disarmDifficulty: "СКЛАДНІСТЬ ЗНЕШКОДЖЕННЯ",
    trigger: "ТРИГЕР",
    damage: "ШКОДА",
    effect: "ЕФЕКТ",
    source: "ДЖЕРЕЛО",
    notes: "НОТАТКИ",
    stats: "ХАРАКТЕРИСТИКИ",
    trapData: "ПАСТКА / НЕБЕЗПЕКА",
    referenceHint: "Вбудовані описи навмисно короткі. Точні статблоки можна додавати як власні записи з ваших матеріалів правил.",
    confirmDelete: "Видалити цей власний запис?",
  },
  pl: {
    title: "BESTIARIUSZ",
    subtitle: "Stworzenia, wrogowie, sojusznicy, roboty, pułapki i zagrożenia",
    search: "Szukaj w bestiariuszu...",
    add: "+ WPIS",
    edit: "EDYTUJ",
    save: "ZAPISZ",
    remove: "USUŃ",
    noResults: "Brak pasujących wpisów.",
    noSelection: "Wybierz wpis z bestiariusza.",
    custom: "WŁASNY",
    builtIn: "REFERENCJA",
    all: "WSZYSTKO",
    creature: "STWORZENIA",
    enemy: "WROGOWIE",
    ally: "SOJUSZNICY",
    robot: "ROBOTY",
    trap: "PUŁAPKI",
    hazard: "ZAGROŻENIA",
    name: "NAZWA",
    category: "KATEGORIA",
    tags: "TAGI",
    creatureType: "TYP",
    level: "POZIOM",
    body: "BODY",
    mind: "MIND",
    melee: "WALKA WRĘCZ",
    guns: "BROŃ",
    other: "INNE",
    hp: "HP",
    initiative: "INICJATYWA",
    defense: "OBRONA",
    carryWeight: "UDŹWIG",
    meleeBonus: "BONUS WRĘCZ",
    physDr: "FIZ DR",
    energyDr: "ENERG DR",
    radDr: "RAD DR",
    poisonDr: "TRUCIZNA DR",
    attacks: "ATAKI",
    abilities: "ZDOLNOŚCI SPECJALNE",
    tactics: "TAKTYKA",
    loot: "ŁUP",
    summary: "OPIS",
    detectionDifficulty: "TRUDNOŚĆ WYKRYCIA",
    disarmDifficulty: "TRUDNOŚĆ ROZBROJENIA",
    trigger: "WYZWALACZ",
    damage: "OBRAŻENIA",
    effect: "EFEKT",
    source: "ŹRÓDŁO",
    notes: "NOTATKI",
    stats: "STATYSTYKI",
    trapData: "PUŁAPKA / ZAGROŻENIE",
    referenceHint: "Wbudowane opisy są celowo zwięzłe. Dokładne statbloki można dodać jako własne wpisy z posiadanych materiałów zasad.",
    confirmDelete: "Usunąć ten własny wpis?",
  },
};

const STAT_FIELDS = [
  "level",
  "body",
  "mind",
  "melee",
  "guns",
  "other",
  "hp",
  "initiative",
  "defense",
  "carryWeight",
  "meleeBonus",
  "physDr",
  "energyDr",
  "radDr",
  "poisonDr",
];

const LONG_FIELDS = ["summary", "attacks", "abilities", "tactics", "loot", "effect", "source", "notes"];

function getLanguage(value) {
  const code = String(value || "en").split("-")[0];
  return TEXT[code] ? code : "en";
}

function readCustomEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Optional local reference storage.
  }
}

function searchableText(entry) {
  return [
    entry.name,
    entry.category,
    entry.creatureType,
    entry.summary,
    entry.attacks,
    entry.abilities,
    entry.tactics,
    entry.effect,
    ...(entry.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(entry, fields) {
  return fields.some((key) => String(entry?.[key] ?? "").trim() !== "");
}

function InfoField({ label, value }) {
  if (String(value ?? "").trim() === "") return null;
  return (
    <div className="bestiary-info-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EditField({ label, value, onChange, multiline = false, type = "text" }) {
  return (
    <label className={`bestiary-edit-field${multiline ? " is-wide" : ""}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          className="pip-textarea"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="pip-input"
          type={type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

export default function BestiaryPanel({ language: languageProp }) {
  const browserLanguage = typeof navigator !== "undefined" ? navigator.language : "en";
  const language = getLanguage(languageProp || browserLanguage);
  const copy = TEXT[language];
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [customEntries, setCustomEntries] = useState(readCustomEntries);
  const [selectedId, setSelectedId] = useState(BESTIARY_ENTRIES[0]?.id || null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    saveCustomEntries(customEntries);
  }, [customEntries]);

  const entries = useMemo(
    () => [...BESTIARY_ENTRIES, ...customEntries],
    [customEntries]
  );

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (needle && !searchableText(entry).includes(needle)) return false;
      return true;
    });
  }, [entries, category, query]);

  useEffect(() => {
    if (!filteredEntries.length) return;
    if (!filteredEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(filteredEntries[0].id);
      setEditing(false);
    }
  }, [filteredEntries, selectedId]);

  const selected = entries.find((entry) => entry.id === selectedId) || null;
  const isCustom = Boolean(selected?.custom);
  const isTrapLike = selected?.category === "trap" || selected?.category === "hazard";

  const updateSelected = (key, value) => {
    if (!selected?.custom) return;
    setCustomEntries((prev) =>
      prev.map((entry) => (entry.id === selected.id ? { ...entry, [key]: value } : entry))
    );
  };

  const addEntry = () => {
    const nextCategory = category === "all" ? "creature" : category;
    const next = createEmptyBestiaryEntry(nextCategory);
    setCustomEntries((prev) => [...prev, next]);
    setSelectedId(next.id);
    setEditing(true);
  };

  const removeSelected = () => {
    if (!selected?.custom) return;
    if (typeof window !== "undefined" && !window.confirm(copy.confirmDelete)) return;
    setCustomEntries((prev) => prev.filter((entry) => entry.id !== selected.id));
    const fallback = entries.find((entry) => entry.id !== selected.id);
    setSelectedId(fallback?.id || null);
    setEditing(false);
  };

  return (
    <section className="pip-panel pip-block bestiary-panel">
      <div className="pip-head bestiary-head">
        <div>
          <h2>[ {copy.title} ]</h2>
          <span>{copy.subtitle}</span>
        </div>
        <button type="button" className="pip-btn is-primary" onClick={addEntry}>
          {copy.add}
        </button>
      </div>

      <div className="bestiary-toolbar push-bottom">
        <input
          className="pip-input bestiary-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.search}
        />
        <div className="pip-tagrow is-wrap bestiary-filters">
          {BESTIARY_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              className={`pip-tag ${category === key ? "is-selected" : ""}`}
              onClick={() => setCategory(key)}
            >
              {copy[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="bestiary-layout">
        <div className="bestiary-list pip-logbox">
          {filteredEntries.length ? (
            filteredEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`bestiary-list-item ${selectedId === entry.id ? "is-selected" : ""}`}
                onClick={() => {
                  setSelectedId(entry.id);
                  setEditing(false);
                }}
              >
                <span className="bestiary-list-main">
                  <strong>{entry.name || "—"}</strong>
                  <small>{copy[entry.category] || entry.category}</small>
                </span>
                <span className="bestiary-list-kind">{entry.custom ? copy.custom : copy.builtIn}</span>
              </button>
            ))
          ) : (
            <div className="bestiary-empty">{copy.noResults}</div>
          )}
        </div>

        <div className="bestiary-detail">
          {!selected ? (
            <div className="pip-logbox bestiary-empty">{copy.noSelection}</div>
          ) : editing && isCustom ? (
            <div className="bestiary-editor">
              <div className="bestiary-detail-head">
                <div>
                  <span className="pip-tag is-selected">{copy.custom}</span>
                  <h3>{selected.name || copy.add.replace("+ ", "")}</h3>
                </div>
                <div className="pip-actions-inline">
                  <button type="button" className="pip-btn is-primary" onClick={() => setEditing(false)}>
                    {copy.save}
                  </button>
                  <button type="button" className="pip-btn" onClick={removeSelected}>
                    {copy.remove}
                  </button>
                </div>
              </div>

              <div className="bestiary-edit-grid">
                <EditField label={copy.name} value={selected.name} onChange={(value) => updateSelected("name", value)} />
                <label className="bestiary-edit-field">
                  <span>{copy.category}</span>
                  <select className="pip-input" value={selected.category} onChange={(event) => updateSelected("category", event.target.value)}>
                    {BESTIARY_CATEGORIES.filter((key) => key !== "all").map((key) => (
                      <option key={key} value={key}>{copy[key]}</option>
                    ))}
                  </select>
                </label>
                <EditField label={copy.creatureType} value={selected.creatureType} onChange={(value) => updateSelected("creatureType", value)} />
                <EditField
                  label={copy.tags}
                  value={(selected.tags || []).join(", ")}
                  onChange={(value) => updateSelected("tags", value.split(",").map((item) => item.trim()).filter(Boolean))}
                />

                {STAT_FIELDS.map((key) => (
                  <EditField key={key} label={copy[key]} value={selected[key]} onChange={(value) => updateSelected(key, value)} />
                ))}

                <EditField label={copy.detectionDifficulty} value={selected.detectionDifficulty} onChange={(value) => updateSelected("detectionDifficulty", value)} />
                <EditField label={copy.disarmDifficulty} value={selected.disarmDifficulty} onChange={(value) => updateSelected("disarmDifficulty", value)} />
                <EditField label={copy.trigger} value={selected.trigger} onChange={(value) => updateSelected("trigger", value)} multiline />
                <EditField label={copy.damage} value={selected.damage} onChange={(value) => updateSelected("damage", value)} multiline />

                {LONG_FIELDS.map((key) => (
                  <EditField key={key} label={copy[key]} value={selected[key]} onChange={(value) => updateSelected(key, value)} multiline />
                ))}
              </div>
            </div>
          ) : (
            <div className="bestiary-card">
              <div className="bestiary-detail-head">
                <div className="bestiary-title-block">
                  <div className="pip-tagrow is-wrap">
                    <span className="pip-tag is-selected">{copy[selected.category] || selected.category}</span>
                    <span className="pip-tag">{selected.custom ? copy.custom : copy.builtIn}</span>
                  </div>
                  <h3>{selected.name || "—"}</h3>
                  {selected.creatureType ? <span>{selected.creatureType}</span> : null}
                </div>
                {isCustom ? (
                  <button type="button" className="pip-btn" onClick={() => setEditing(true)}>
                    {copy.edit}
                  </button>
                ) : null}
              </div>

              {selected.tags?.length ? (
                <div className="pip-tagrow is-wrap bestiary-tags">
                  {selected.tags.map((tag) => <span className="pip-tag" key={tag}>{tag}</span>)}
                </div>
              ) : null}

              {hasAny(selected, STAT_FIELDS) ? (
                <div className="bestiary-section">
                  <h4>[ {copy.stats} ]</h4>
                  <div className="bestiary-stat-grid">
                    {STAT_FIELDS.map((key) => (
                      <InfoField key={key} label={copy[key]} value={selected[key]} />
                    ))}
                  </div>
                </div>
              ) : null}

              {isTrapLike && hasAny(selected, ["detectionDifficulty", "disarmDifficulty", "trigger", "damage", "effect"]) ? (
                <div className="bestiary-section">
                  <h4>[ {copy.trapData} ]</h4>
                  <div className="bestiary-stat-grid">
                    <InfoField label={copy.detectionDifficulty} value={selected.detectionDifficulty} />
                    <InfoField label={copy.disarmDifficulty} value={selected.disarmDifficulty} />
                  </div>
                  <InfoField label={copy.trigger} value={selected.trigger} />
                  <InfoField label={copy.damage} value={selected.damage} />
                  <InfoField label={copy.effect} value={selected.effect} />
                </div>
              ) : null}

              {LONG_FIELDS.map((key) => {
                if (key === "effect" && isTrapLike) return null;
                if (!String(selected[key] || "").trim()) return null;
                return (
                  <div className="bestiary-section" key={key}>
                    <h4>[ {copy[key]} ]</h4>
                    <div className="pip-logbox bestiary-text">{selected[key]}</div>
                  </div>
                );
              })}

              {!selected.custom ? (
                <div className="pip-logbox bestiary-reference-hint">{copy.referenceHint}</div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
