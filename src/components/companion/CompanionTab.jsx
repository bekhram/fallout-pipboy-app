import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./companion.css";

const STORAGE_KEY = "fallout_pipboy_companions_v2";
const LEGACY_STORAGE_KEY = "fallout_pipboy_companion_v1";

const COPY = {
  en: {
    title: "COMPANIONS / PETS",
    subtitle: "Fallout 2d20 creature cards",
    addCompanion: "+ COMPANION",
    addPet: "+ PET",
    companion: "Companion",
    pet: "Pet",
    unnamed: "Unnamed",
    name: "Name",
    type: "Type / creature",
    level: "Level",
    body: "Body",
    mind: "Mind",
    melee: "Melee",
    guns: "Guns",
    other: "Other",
    hp: "HP",
    initiative: "Initiative",
    defense: "Defense",
    carryWeight: "Carry Weight",
    meleeBonus: "Melee Bonus",
    physDr: "Phys. DR",
    energyDr: "Energy DR",
    radDr: "Rad. DR",
    poisonDr: "Poison DR",
    attacks: "Attacks",
    abilities: "Special Abilities",
    notes: "Notes",
    attacksPlaceholder: "Bite — Body + Melee, damage, effects...",
    abilitiesPlaceholder: "Traits, companion abilities, special rules...",
    notesPlaceholder: "Equipment, behavior and useful reminders...",
    copy: "COPY",
    remove: "DELETE",
    emptyTitle: "NO COMPANIONS YET",
    emptyText: "Add a companion or pet to create the first card.",
  },
  ru: {
    title: "КОМПАНЬОНЫ / ПИТОМЦЫ",
    subtitle: "Карточки существ Fallout 2d20",
    addCompanion: "+ КОМПАНЬОН",
    addPet: "+ ПИТОМЕЦ",
    companion: "Компаньон",
    pet: "Питомец",
    unnamed: "Без имени",
    name: "Имя",
    type: "Тип / существо",
    level: "Уровень",
    body: "Тело",
    mind: "Разум",
    melee: "Ближний бой",
    guns: "Стрельба",
    other: "Другое",
    hp: "HP",
    initiative: "Инициатива",
    defense: "Защита",
    carryWeight: "Переносимый вес",
    meleeBonus: "Бонус ближнего боя",
    physDr: "Физ. СУ",
    energyDr: "Энерг. СУ",
    radDr: "Рад. СУ",
    poisonDr: "Яд СУ",
    attacks: "Атаки",
    abilities: "Особые способности",
    notes: "Заметки",
    attacksPlaceholder: "Укус — Тело + Ближний бой, урон, эффекты...",
    abilitiesPlaceholder: "Черты, способности компаньона, особые правила...",
    notesPlaceholder: "Снаряжение, поведение и важные заметки...",
    copy: "КОПИЯ",
    remove: "УДАЛИТЬ",
    emptyTitle: "КОМПАНЬОНОВ ПОКА НЕТ",
    emptyText: "Добавь компаньона или питомца, чтобы создать первую карточку.",
  },
  uk: {
    title: "КОМПАНЬЙОНИ / УЛЮБЛЕНЦІ",
    subtitle: "Картки істот Fallout 2d20",
    addCompanion: "+ КОМПАНЬЙОН",
    addPet: "+ УЛЮБЛЕНЕЦЬ",
    companion: "Компаньйон",
    pet: "Улюбленець",
    unnamed: "Без імені",
    name: "Ім'я",
    type: "Тип / істота",
    level: "Рівень",
    body: "Тіло",
    mind: "Розум",
    melee: "Ближній бій",
    guns: "Стрільба",
    other: "Інше",
    hp: "HP",
    initiative: "Ініціатива",
    defense: "Захист",
    carryWeight: "Вантажопідйомність",
    meleeBonus: "Бонус ближнього бою",
    physDr: "Фіз. ОП",
    energyDr: "Енерг. ОП",
    radDr: "Рад. ОП",
    poisonDr: "Отрута ОП",
    attacks: "Атаки",
    abilities: "Особливі здібності",
    notes: "Нотатки",
    attacksPlaceholder: "Укус — Тіло + Ближній бій, шкода, ефекти...",
    abilitiesPlaceholder: "Риси, здібності компаньйона, особливі правила...",
    notesPlaceholder: "Спорядження, поведінка та важливі нотатки...",
    copy: "КОПІЯ",
    remove: "ВИДАЛИТИ",
    emptyTitle: "КОМПАНЬЙОНІВ ЩЕ НЕМАЄ",
    emptyText: "Додай компаньйона або улюбленця, щоб створити першу картку.",
  },
  pl: {
    title: "TOWARZYSZE / PUPILE",
    subtitle: "Karty stworzeń Fallout 2d20",
    addCompanion: "+ TOWARZYSZ",
    addPet: "+ PUPIL",
    companion: "Towarzysz",
    pet: "Pupil",
    unnamed: "Bez imienia",
    name: "Imię",
    type: "Typ / stworzenie",
    level: "Poziom",
    body: "Ciało",
    mind: "Umysł",
    melee: "Walka wręcz",
    guns: "Broń palna",
    other: "Inne",
    hp: "HP",
    initiative: "Inicjatywa",
    defense: "Obrona",
    carryWeight: "Udźwig",
    meleeBonus: "Premia wręcz",
    physDr: "Fiz. DR",
    energyDr: "Energia DR",
    radDr: "Rad. DR",
    poisonDr: "Trucizna DR",
    attacks: "Ataki",
    abilities: "Zdolności specjalne",
    notes: "Notatki",
    attacksPlaceholder: "Ugryzienie — Ciało + Walka wręcz, obrażenia, efekty...",
    abilitiesPlaceholder: "Cechy, zdolności towarzysza, specjalne zasady...",
    notesPlaceholder: "Ekwipunek, zachowanie i ważne notatki...",
    copy: "KOPIUJ",
    remove: "USUŃ",
    emptyTitle: "BRAK TOWARZYSZY",
    emptyText: "Dodaj towarzysza lub pupila, aby utworzyć pierwszą kartę.",
  },
};

function getLanguage(value) {
  const key = String(value || "en").split("-")[0];
  return COPY[key] ? key : "en";
}

function makeId() {
  return `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createCompanion(kind = "companion", seed = {}) {
  const legacySpecial = seed.special || {};
  return {
    id: seed.id || makeId(),
    kind: seed.kind || kind,
    name: seed.name || "",
    creatureType: seed.creatureType || seed.species || "",
    level: String(seed.level || "1"),
    body: String(seed.body ?? legacySpecial.S ?? "5"),
    mind: String(seed.mind ?? legacySpecial.I ?? "4"),
    melee: String(seed.melee ?? "0"),
    guns: String(seed.guns ?? "0"),
    other: String(seed.other ?? "0"),
    currentHp: String(seed.currentHp ?? seed.hp ?? "6"),
    maxHp: String(seed.maxHp ?? seed.hp ?? "6"),
    initiative: String(seed.initiative ?? ""),
    defense: String(seed.defense ?? "1"),
    carryWeight: String(seed.carryWeight ?? ""),
    meleeBonus: String(seed.meleeBonus ?? ""),
    physDr: String(seed.physDr ?? "0"),
    energyDr: String(seed.energyDr ?? "0"),
    radDr: String(seed.radDr ?? "0"),
    poisonDr: String(seed.poisonDr ?? "0"),
    attacks: seed.attacks || "",
    specialAbilities: seed.specialAbilities || "",
    notes: seed.notes || "",
  };
}

function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return { items: [], activeId: null };
  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => createCompanion(item.kind || "companion", item))
    : [];
  const activeId = items.some((item) => item.id === raw.activeId)
    ? raw.activeId
    : items[0]?.id || null;
  return { items, activeId };
}

function clamp(value, min = 0, max = 999) {
  const text = String(value ?? "").trim();
  if (text === "") return "";
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return String(min);
  return String(Math.max(min, Math.min(max, numeric)));
}

function NumberField({ label, value, onChange, min = 0, max = 999 }) {
  return (
    <label className="pip-top-field companion-stat-cell">
      <span>{label}</span>
      <input
        className="pip-inline-input"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(clamp(event.target.value, min, max))}
      />
    </label>
  );
}

export default function CompanionTab() {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const [state, setState] = useState({ items: [], activeId: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        setState(normalizeState(saved));
      } else {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
        if (legacy && typeof legacy === "object") {
          const migrated = createCompanion(legacy.kind || "companion", legacy);
          setState({ items: [migrated], activeId: migrated.id });
        }
      }
    } catch {
      setState({ items: [], activeId: null });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const active = useMemo(
    () => state.items.find((item) => item.id === state.activeId) || state.items[0] || null,
    [state]
  );

  const add = (kind) => {
    const item = createCompanion(kind);
    setState((prev) => ({ items: [...prev.items, item], activeId: item.id }));
  };

  const updateActive = (patch) => {
    if (!active) return;
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => item.id === active.id ? { ...item, ...patch } : item),
    }));
  };

  const copyActive = () => {
    if (!active) return;
    const duplicate = createCompanion(active.kind, {
      ...active,
      id: makeId(),
      name: active.name ? `${active.name} Copy` : "",
    });
    setState((prev) => ({ items: [...prev.items, duplicate], activeId: duplicate.id }));
  };

  const removeActive = () => {
    if (!active) return;
    setState((prev) => {
      const items = prev.items.filter((item) => item.id !== active.id);
      return { items, activeId: items[0]?.id || null };
    });
  };

  const updateHp = (delta) => {
    if (!active) return;
    const maxHp = Math.max(1, Number(active.maxHp || 1));
    const nextHp = Math.max(0, Math.min(maxHp, Number(active.currentHp || 0) + delta));
    updateActive({ currentHp: String(nextHp) });
  };

  const updateMaxHp = (value) => {
    if (!active) return;
    const nextMax = Math.max(1, Number(value || 1));
    const nextCurrent = Math.min(nextMax, Math.max(0, Number(active.currentHp || 0)));
    updateActive({ maxHp: String(nextMax), currentHp: String(nextCurrent) });
  };

  const hpPercent = active
    ? Math.max(0, Math.min(100, (Number(active.currentHp || 0) / Math.max(1, Number(active.maxHp || 1))) * 100))
    : 0;

  return (
    <div className="pip-screen-grid companion-screen">
      <section className="pip-panel pip-block">
        <div className="pip-head companion-head">
          <div className="companion-head-copy">
            <h2>[ {copy.title} ]</h2>
            <span>{copy.subtitle}</span>
          </div>
          <button type="button" className="pip-btn is-primary" onClick={() => add("companion")}> 
            {copy.addCompanion}
          </button>
        </div>

        <div className="pip-inventory-actions push-bottom companion-actions">
          <button type="button" className="pip-btn" onClick={() => add("pet")}>{copy.addPet}</button>
          <button type="button" className="pip-btn" onClick={copyActive} disabled={!active}>{copy.copy}</button>
          <button type="button" className="pip-btn companion-delete-btn" onClick={removeActive} disabled={!active}>{copy.remove}</button>
        </div>

        {state.items.length > 0 && (
          <div className="pip-tagrow is-wrap push-bottom companion-roster" role="tablist" aria-label={copy.title}>
            {state.items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active?.id === item.id}
                className={`pip-tag companion-roster-tag ${active?.id === item.id ? "is-selected" : ""}`}
                onClick={() => setState((prev) => ({ ...prev, activeId: item.id }))}
              >
                <span>{item.name || copy.unnamed}</span>
                <small>LV {item.level || "1"}</small>
              </button>
            ))}
          </div>
        )}

        {!active ? (
          <div className="pip-logbox companion-empty">
            <strong>{copy.emptyTitle}</strong>
            <span>{copy.emptyText}</span>
          </div>
        ) : (
          <div className="companion-content">
            <div className="pip-inline-stats companion-summary push-bottom">
              <span>{active.name || copy.unnamed}</span>
              <span>{active.creatureType || (active.kind === "pet" ? copy.pet : copy.companion)}</span>
              <span>LV {active.level || "1"}</span>
            </div>

            <div className="companion-identity-grid push-bottom">
              <label className="pip-top-field companion-name-field">
                <span>{copy.name}</span>
                <input className="pip-inline-input" value={active.name} placeholder={copy.unnamed} onChange={(event) => updateActive({ name: event.target.value })} />
              </label>
              <label className="pip-top-field companion-type-field">
                <span>{copy.type}</span>
                <input className="pip-inline-input" value={active.creatureType} placeholder={active.kind === "pet" ? copy.pet : copy.companion} onChange={(event) => updateActive({ creatureType: event.target.value })} />
              </label>
              <NumberField label={copy.level} value={active.level} min={1} max={999} onChange={(value) => updateActive({ level: value || "1" })} />
            </div>

            <div className="pip-tagrow is-wrap push-bottom companion-kind-row">
              <button type="button" className={`pip-tag ${active.kind === "companion" ? "is-selected" : ""}`} onClick={() => updateActive({ kind: "companion" })}>{copy.companion}</button>
              <button type="button" className={`pip-tag ${active.kind === "pet" ? "is-selected" : ""}`} onClick={() => updateActive({ kind: "pet" })}>{copy.pet}</button>
            </div>

            <div className="companion-stat-grid companion-main-stats push-bottom">
              <NumberField label={copy.body} value={active.body} min={0} max={20} onChange={(body) => updateActive({ body })} />
              <NumberField label={copy.mind} value={active.mind} min={0} max={20} onChange={(mind) => updateActive({ mind })} />
              <NumberField label={copy.melee} value={active.melee} min={0} max={20} onChange={(melee) => updateActive({ melee })} />
              <NumberField label={copy.guns} value={active.guns} min={0} max={20} onChange={(guns) => updateActive({ guns })} />
              <NumberField label={copy.other} value={active.other} min={0} max={20} onChange={(other) => updateActive({ other })} />
            </div>

            <div className="pip-logbox companion-hp-section push-bottom">
              <div className="companion-hp-heading">
                <strong>{copy.hp}</strong>
                <span>{active.currentHp || 0} / {active.maxHp || 1}</span>
              </div>
              <div className="companion-hp-track"><div className="companion-hp-fill" style={{ width: `${hpPercent}%` }} /></div>
              <div className="companion-hp-controls">
                <button type="button" className="pip-btn" onClick={() => updateHp(-1)}>−</button>
                <input className="pip-inline-input" inputMode="numeric" value={active.currentHp} onChange={(event) => updateActive({ currentHp: clamp(event.target.value, 0, Math.max(1, Number(active.maxHp || 1))) })} />
                <span>/</span>
                <input className="pip-inline-input" inputMode="numeric" value={active.maxHp} onChange={(event) => updateMaxHp(event.target.value)} />
                <button type="button" className="pip-btn" onClick={() => updateHp(1)}>+</button>
              </div>
            </div>

            <div className="companion-stat-grid companion-combat-stats push-bottom">
              <NumberField label={copy.initiative} value={active.initiative} min={0} max={999} onChange={(initiative) => updateActive({ initiative })} />
              <NumberField label={copy.defense} value={active.defense} min={0} max={99} onChange={(defense) => updateActive({ defense })} />
              <NumberField label={copy.carryWeight} value={active.carryWeight} min={0} max={9999} onChange={(carryWeight) => updateActive({ carryWeight })} />
              <NumberField label={copy.meleeBonus} value={active.meleeBonus} min={0} max={99} onChange={(meleeBonus) => updateActive({ meleeBonus })} />
            </div>

            <div className="companion-stat-grid companion-dr-stats push-bottom">
              <NumberField label={copy.physDr} value={active.physDr} min={0} max={99} onChange={(physDr) => updateActive({ physDr })} />
              <NumberField label={copy.energyDr} value={active.energyDr} min={0} max={99} onChange={(energyDr) => updateActive({ energyDr })} />
              <NumberField label={copy.radDr} value={active.radDr} min={0} max={99} onChange={(radDr) => updateActive({ radDr })} />
              <NumberField label={copy.poisonDr} value={active.poisonDr} min={0} max={99} onChange={(poisonDr) => updateActive({ poisonDr })} />
            </div>

            <div className="companion-long-grid">
              <label className="pip-logbox companion-long-field">
                <span>[ {copy.attacks} ]</span>
                <textarea className="pip-input" rows={4} value={active.attacks} placeholder={copy.attacksPlaceholder} onChange={(event) => updateActive({ attacks: event.target.value })} />
              </label>

              <label className="pip-logbox companion-long-field">
                <span>[ {copy.abilities} ]</span>
                <textarea className="pip-input" rows={6} value={active.specialAbilities} placeholder={copy.abilitiesPlaceholder} onChange={(event) => updateActive({ specialAbilities: event.target.value })} />
              </label>

              <label className="pip-logbox companion-long-field companion-notes-field">
                <span>[ {copy.notes} ]</span>
                <textarea className="pip-input" rows={3} value={active.notes} placeholder={copy.notesPlaceholder} onChange={(event) => updateActive({ notes: event.target.value })} />
              </label>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
