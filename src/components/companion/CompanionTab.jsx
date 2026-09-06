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
    abilitiesPlaceholder: "Traits, companion abilities, special rules...",
    notesPlaceholder: "Equipment, behavior and useful reminders...",
    copy: "COPY",
    remove: "DELETE",
    editCard: "EDIT",
    doneEditing: "DONE",
    emptyTitle: "NO COMPANIONS YET",
    emptyText: "Add a companion or pet to create the first card.",
    addAttack: "+ ATTACK",
    attackName: "Attack",
    attackNamePlaceholder: "Bite, Claw, Laser...",
    attribute: "Attribute",
    skill: "Skill",
    damage: "Damage CD",
    damageType: "Damage type",
    effects: "Effects",
    effectsPlaceholder: "Vicious, Piercing 1...",
    difficulty: "Difficulty",
    diceCount: "D20",
    roll: "ROLL",
    removeAttack: "REMOVE",
    attackNotes: "Attack notes",
    attackNotesPlaceholder: "Legacy attack text or situational rules...",
    target: "TN",
    successes: "Successes",
    complications: "Complications",
    success: "SUCCESS",
    failure: "FAILURE",
    hit: "Hit",
    effectTriggers: "Effects",
    physical: "Physical",
    energy: "Energy",
    radiation: "Radiation",
    poison: "Poison",
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
    abilitiesPlaceholder: "Черты, способности компаньона, особые правила...",
    notesPlaceholder: "Снаряжение, поведение и важные заметки...",
    copy: "КОПИЯ",
    remove: "УДАЛИТЬ",
    editCard: "РЕДАКТИРОВАТЬ",
    doneEditing: "ГОТОВО",
    emptyTitle: "КОМПАНЬОНОВ ПОКА НЕТ",
    emptyText: "Добавь компаньона или питомца, чтобы создать первую карточку.",
    addAttack: "+ АТАКА",
    attackName: "Атака",
    attackNamePlaceholder: "Укус, когти, лазер...",
    attribute: "Характеристика",
    skill: "Навык",
    damage: "Урон CD",
    damageType: "Тип урона",
    effects: "Эффекты",
    effectsPlaceholder: "Vicious, Piercing 1...",
    difficulty: "Сложность",
    diceCount: "D20",
    roll: "БРОСИТЬ",
    removeAttack: "УБРАТЬ",
    attackNotes: "Заметки атак",
    attackNotesPlaceholder: "Старое описание атаки или ситуационные правила...",
    target: "TN",
    successes: "Успехи",
    complications: "Осложнения",
    success: "УСПЕХ",
    failure: "НЕУДАЧА",
    hit: "Попадание",
    effectTriggers: "Эффекты",
    physical: "Физический",
    energy: "Энергетический",
    radiation: "Радиационный",
    poison: "Яд",
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
    abilitiesPlaceholder: "Риси, здібності компаньйона, особливі правила...",
    notesPlaceholder: "Спорядження, поведінка та важливі нотатки...",
    copy: "КОПІЯ",
    remove: "ВИДАЛИТИ",
    editCard: "РЕДАГУВАТИ",
    doneEditing: "ГОТОВО",
    emptyTitle: "КОМПАНЬЙОНІВ ЩЕ НЕМАЄ",
    emptyText: "Додай компаньйона або улюбленця, щоб створити першу картку.",
    addAttack: "+ АТАКА",
    attackName: "Атака",
    attackNamePlaceholder: "Укус, кігті, лазер...",
    attribute: "Характеристика",
    skill: "Навичка",
    damage: "Шкода CD",
    damageType: "Тип шкоди",
    effects: "Ефекти",
    effectsPlaceholder: "Vicious, Piercing 1...",
    difficulty: "Складність",
    diceCount: "D20",
    roll: "КИНУТИ",
    removeAttack: "ПРИБРАТИ",
    attackNotes: "Нотатки атак",
    attackNotesPlaceholder: "Старий опис атаки або ситуаційні правила...",
    target: "TN",
    successes: "Успіхи",
    complications: "Ускладнення",
    success: "УСПІХ",
    failure: "НЕВДАЧА",
    hit: "Влучання",
    effectTriggers: "Ефекти",
    physical: "Фізична",
    energy: "Енергетична",
    radiation: "Радіаційна",
    poison: "Отрута",
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
    abilitiesPlaceholder: "Cechy, zdolności towarzysza, specjalne zasady...",
    notesPlaceholder: "Ekwipunek, zachowanie i ważne notatki...",
    copy: "KOPIUJ",
    remove: "USUŃ",
    editCard: "EDYTUJ",
    doneEditing: "GOTOWE",
    emptyTitle: "BRAK TOWARZYSZY",
    emptyText: "Dodaj towarzysza lub pupila, aby utworzyć pierwszą kartę.",
    addAttack: "+ ATAK",
    attackName: "Atak",
    attackNamePlaceholder: "Ugryzienie, pazury, laser...",
    attribute: "Atrybut",
    skill: "Umiejętność",
    damage: "Obrażenia CD",
    damageType: "Typ obrażeń",
    effects: "Efekty",
    effectsPlaceholder: "Vicious, Piercing 1...",
    difficulty: "Trudność",
    diceCount: "D20",
    roll: "RZUĆ",
    removeAttack: "USUŃ",
    attackNotes: "Notatki ataków",
    attackNotesPlaceholder: "Stary opis ataku lub zasady sytuacyjne...",
    target: "TN",
    successes: "Sukcesy",
    complications: "Komplikacje",
    success: "SUKCES",
    failure: "PORAŻKA",
    hit: "Trafienie",
    effectTriggers: "Efekty",
    physical: "Fizyczne",
    energy: "Energetyczne",
    radiation: "Radiacyjne",
    poison: "Trucizna",
  },
};

const HIT_LOCATION_LABELS = {
  en: { head: "Head", torso: "Torso", leftArm: "Left arm", rightArm: "Right arm", leftLeg: "Left leg", rightLeg: "Right leg" },
  ru: { head: "Голова", torso: "Торс", leftArm: "Левая рука", rightArm: "Правая рука", leftLeg: "Левая нога", rightLeg: "Правая нога" },
  uk: { head: "Голова", torso: "Торс", leftArm: "Ліва рука", rightArm: "Права рука", leftLeg: "Ліва нога", rightLeg: "Права нога" },
  pl: { head: "Głowa", torso: "Tułów", leftArm: "Lewa ręka", rightArm: "Prawa ręka", leftLeg: "Lewa noga", rightLeg: "Prawa noga" },
};

function getLanguage(value) {
  const key = String(value || "en").split("-")[0];
  return COPY[key] ? key : "en";
}

function makeId(prefix = "cmp") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createAttack(seed = {}) {
  return {
    id: seed.id || makeId("atk"),
    name: String(seed.name || ""),
    attribute: seed.attribute === "mind" ? "mind" : "body",
    skill: ["melee", "guns", "other"].includes(seed.skill) ? seed.skill : "melee",
    damage: String(seed.damage ?? "2"),
    damageType: ["physical", "energy", "radiation", "poison"].includes(seed.damageType)
      ? seed.damageType
      : "physical",
    effects: String(seed.effects || ""),
    difficulty: String(seed.difficulty ?? "1"),
    diceCount: String(seed.diceCount ?? "2"),
  };
}

function createCompanion(kind = "companion", seed = {}) {
  const legacySpecial = seed.special || {};
  const attacks = Array.isArray(seed.attacks)
    ? seed.attacks.map((attack) => createAttack(attack))
    : [];
  const attackNotes = seed.attackNotes || (!Array.isArray(seed.attacks) ? String(seed.attacks || "") : "");

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
    attacks,
    attackNotes,
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

function NumberField({ label, value, onChange, min = 0, max = 999, readOnly = false }) {
  return (
    <label className="pip-top-field companion-stat-cell">
      <span>{label}</span>
      <input
        className="pip-inline-input"
        inputMode="numeric"
        value={value}
        readOnly={readOnly}
        onChange={readOnly ? undefined : (event) => onChange(clamp(event.target.value, min, max))}
      />
    </label>
  );
}

function parseEffects(value) {
  return String(value || "")
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function attackTargetNumber(companion, attack) {
  const attribute = Number(companion?.[attack?.attribute] || 0);
  const skill = Number(companion?.[attack?.skill] || 0);
  return Math.max(0, Math.min(20, attribute + skill));
}

export default function CompanionTab({ onRoll = null }) {
  const { i18n } = useTranslation();
  const language = getLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const [state, setState] = useState({ items: [], activeId: null });
  const [ready, setReady] = useState(false);
  const [editingAttackId, setEditingAttackId] = useState(null);
  const [isEditingCard, setIsEditingCard] = useState(false);

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

  useEffect(() => {
    setEditingAttackId(null);
    setIsEditingCard(false);
  }, [active?.id]);

  const add = (kind) => {
    const item = createCompanion(kind);
    setEditingAttackId(null);
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
      attacks: (active.attacks || []).map((attack) => ({ ...attack, id: undefined })),
    });
    setEditingAttackId(null);
    setState((prev) => ({ items: [...prev.items, duplicate], activeId: duplicate.id }));
  };

  const removeActive = () => {
    if (!active) return;
    setEditingAttackId(null);
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

  const addAttack = () => {
    if (!active) return;
    const attack = createAttack();
    updateActive({ attacks: [...(active.attacks || []), attack] });
    setEditingAttackId(attack.id);
  };

  const updateAttack = (attackId, patch) => {
    if (!active) return;
    updateActive({
      attacks: (active.attacks || []).map((attack) =>
        attack.id === attackId ? { ...attack, ...patch } : attack
      ),
    });
  };

  const removeAttack = (attackId) => {
    if (!active) return;
    updateActive({ attacks: (active.attacks || []).filter((attack) => attack.id !== attackId) });
    if (editingAttackId === attackId) setEditingAttackId(null);
  };

  const rollAttack = (attack) => {
    if (!active || typeof onRoll !== "function") return;

    const targetNumber = attackTargetNumber(active, attack);
    const diceCount = Math.max(1, Math.min(5, Number(attack.diceCount) || 2));
    const difficulty = Math.max(0, Math.min(10, Number(attack.difficulty) || 1));
    const damageDice = Math.max(0, Math.min(50, Number(attack.damage) || 0));
    const effects = parseEffects(attack.effects);

    onRoll({
      id: `companion-attack-${active.id}-${attack.id}-${Date.now()}`,
      type: "weapon",
      title: `${active.name || copy.unnamed}: ${attack.name || copy.attackName}`,
      targetNumber,
      criticalRange: 1,
      diceCount,
      difficulty,
      useRate: false,
      weapon: {
        name: attack.name || copy.attackName,
        damage: String(damageDice),
        effects,
        customEffect: "",
        type: attack.damageType,
        ammo: "",
      },
    });
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
          <div className={`companion-content ${isEditingCard ? "is-editing" : "is-readonly"}`}>
            <div className="companion-card-actions" aria-label={copy.title}>
              <button
                type="button"
                className={`pip-btn companion-icon-btn ${isEditingCard ? "is-primary" : ""}`}
                onClick={() => {
                  setIsEditingCard((value) => !value);
                  if (isEditingCard) setEditingAttackId(null);
                }}
                title={isEditingCard ? copy.doneEditing : copy.editCard}
                aria-label={isEditingCard ? copy.doneEditing : copy.editCard}
              >
                {isEditingCard ? "✓" : "✎"}
              </button>
              <button
                type="button"
                className="pip-btn companion-icon-btn"
                onClick={copyActive}
                title={copy.copy}
                aria-label={copy.copy}
              >
                ⧉
              </button>
              <button
                type="button"
                className="pip-btn companion-icon-btn companion-delete-btn"
                onClick={removeActive}
                title={copy.remove}
                aria-label={copy.remove}
              >
                ⌫
              </button>
            </div>

            <div className="companion-summary-row push-bottom">
              <div className="pip-inline-stats companion-summary">
                <span>{active.name || copy.unnamed}</span>
                <span>{active.creatureType || (active.kind === "pet" ? copy.pet : copy.companion)}</span>
                <span>LV {active.level || "1"}</span>
              </div>
            </div>

            <div className="companion-identity-grid push-bottom">
              <label className="pip-top-field companion-name-field">
                <span>{copy.name}</span>
                <input className="pip-inline-input" value={active.name} readOnly={!isEditingCard} placeholder={copy.unnamed} onChange={isEditingCard ? (event) => updateActive({ name: event.target.value }) : undefined} />
              </label>
              <label className="pip-top-field companion-type-field">
                <span>{copy.type}</span>
                <input className="pip-inline-input" value={active.creatureType} readOnly={!isEditingCard} placeholder={active.kind === "pet" ? copy.pet : copy.companion} onChange={isEditingCard ? (event) => updateActive({ creatureType: event.target.value }) : undefined} />
              </label>
              <NumberField label={copy.level} value={active.level} min={1} max={999} readOnly={!isEditingCard} onChange={(value) => updateActive({ level: value || "1" })} />
            </div>

            <div className="pip-tagrow is-wrap push-bottom companion-kind-row">
              <button type="button" className={`pip-tag ${active.kind === "companion" ? "is-selected" : ""}`} disabled={!isEditingCard} onClick={() => updateActive({ kind: "companion" })}>{copy.companion}</button>
              <button type="button" className={`pip-tag ${active.kind === "pet" ? "is-selected" : ""}`} disabled={!isEditingCard} onClick={() => updateActive({ kind: "pet" })}>{copy.pet}</button>
            </div>

            <div className="companion-stat-grid companion-main-stats push-bottom">
              <NumberField label={copy.body} value={active.body} min={0} max={20} readOnly={!isEditingCard} onChange={(body) => updateActive({ body })} />
              <NumberField label={copy.mind} value={active.mind} min={0} max={20} readOnly={!isEditingCard} onChange={(mind) => updateActive({ mind })} />
              <NumberField label={copy.melee} value={active.melee} min={0} max={20} readOnly={!isEditingCard} onChange={(melee) => updateActive({ melee })} />
              <NumberField label={copy.guns} value={active.guns} min={0} max={20} readOnly={!isEditingCard} onChange={(guns) => updateActive({ guns })} />
              <NumberField label={copy.other} value={active.other} min={0} max={20} readOnly={!isEditingCard} onChange={(other) => updateActive({ other })} />
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
                <input className="pip-inline-input" inputMode="numeric" value={active.maxHp} readOnly={!isEditingCard} onChange={isEditingCard ? (event) => updateMaxHp(event.target.value) : undefined} />
                <button type="button" className="pip-btn" onClick={() => updateHp(1)}>+</button>
              </div>
            </div>

            <div className="companion-stat-grid companion-combat-stats push-bottom">
              <NumberField label={copy.initiative} value={active.initiative} min={0} max={999} readOnly={!isEditingCard} onChange={(initiative) => updateActive({ initiative })} />
              <NumberField label={copy.defense} value={active.defense} min={0} max={99} readOnly={!isEditingCard} onChange={(defense) => updateActive({ defense })} />
              <NumberField label={copy.carryWeight} value={active.carryWeight} min={0} max={9999} readOnly={!isEditingCard} onChange={(carryWeight) => updateActive({ carryWeight })} />
              <NumberField label={copy.meleeBonus} value={active.meleeBonus} min={0} max={99} readOnly={!isEditingCard} onChange={(meleeBonus) => updateActive({ meleeBonus })} />
            </div>

            <div className="companion-stat-grid companion-dr-stats push-bottom">
              <NumberField label={copy.physDr} value={active.physDr} min={0} max={99} readOnly={!isEditingCard} onChange={(physDr) => updateActive({ physDr })} />
              <NumberField label={copy.energyDr} value={active.energyDr} min={0} max={99} readOnly={!isEditingCard} onChange={(energyDr) => updateActive({ energyDr })} />
              <NumberField label={copy.radDr} value={active.radDr} min={0} max={99} readOnly={!isEditingCard} onChange={(radDr) => updateActive({ radDr })} />
              <NumberField label={copy.poisonDr} value={active.poisonDr} min={0} max={99} readOnly={!isEditingCard} onChange={(poisonDr) => updateActive({ poisonDr })} />
            </div>

            <div className="pip-logbox companion-attacks-block push-bottom">
              <div className="companion-section-head">
                <strong>[ {copy.attacks} ]</strong>
                {isEditingCard ? <button type="button" className="pip-btn is-primary" onClick={addAttack}>{copy.addAttack}</button> : null}
              </div>

              {(active.attacks || []).length === 0 ? (
                <div className="companion-attacks-empty">—</div>
              ) : (
                <div className="companion-attack-list">
                  {(active.attacks || []).map((attack) => {
                    const tn = attackTargetNumber(active, attack);
                    const damageTypeLabel = copy[attack.damageType] || attack.damageType;
                    const isEditing = editingAttackId === attack.id;
                    return (
                      <div className="companion-attack-card" key={attack.id}>
                        {isEditing ? (
                          <>
                            <div className="companion-attack-head">
                              <label className="pip-top-field companion-attack-name">
                                <span>{copy.attackName}</span>
                                <input
                                  className="pip-inline-input"
                                  value={attack.name}
                                  autoFocus
                                  placeholder={copy.attackNamePlaceholder}
                                  onChange={(event) => updateAttack(attack.id, { name: event.target.value })}
                                />
                              </label>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button type="button" className="pip-btn is-primary" onClick={() => setEditingAttackId(null)} title="Save">✓</button>
                                <button type="button" className="pip-btn" onClick={() => removeAttack(attack.id)}>{copy.removeAttack}</button>
                              </div>
                            </div>

                            <div className="companion-attack-grid">
                              <label className="pip-top-field">
                                <span>{copy.attribute}</span>
                                <select className="pip-inline-input" value={attack.attribute} onChange={(event) => updateAttack(attack.id, { attribute: event.target.value })}>
                                  <option value="body">{copy.body}</option>
                                  <option value="mind">{copy.mind}</option>
                                </select>
                              </label>
                              <label className="pip-top-field">
                                <span>{copy.skill}</span>
                                <select className="pip-inline-input" value={attack.skill} onChange={(event) => updateAttack(attack.id, { skill: event.target.value })}>
                                  <option value="melee">{copy.melee}</option>
                                  <option value="guns">{copy.guns}</option>
                                  <option value="other">{copy.other}</option>
                                </select>
                              </label>
                              <label className="pip-top-field">
                                <span>{copy.damage}</span>
                                <input className="pip-inline-input" inputMode="numeric" value={attack.damage} onChange={(event) => updateAttack(attack.id, { damage: clamp(event.target.value, 0, 50) })} />
                              </label>
                              <label className="pip-top-field">
                                <span>{copy.difficulty}</span>
                                <input className="pip-inline-input" inputMode="numeric" value={attack.difficulty} onChange={(event) => updateAttack(attack.id, { difficulty: clamp(event.target.value, 0, 10) })} />
                              </label>
                              <label className="pip-top-field">
                                <span>{copy.diceCount}</span>
                                <input className="pip-inline-input" inputMode="numeric" value={attack.diceCount} onChange={(event) => updateAttack(attack.id, { diceCount: clamp(event.target.value, 1, 5) })} />
                              </label>
                              <label className="pip-top-field">
                                <span>{copy.damageType}</span>
                                <select className="pip-inline-input" value={attack.damageType} onChange={(event) => updateAttack(attack.id, { damageType: event.target.value })}>
                                  <option value="physical">{copy.physical}</option>
                                  <option value="energy">{copy.energy}</option>
                                  <option value="radiation">{copy.radiation}</option>
                                  <option value="poison">{copy.poison}</option>
                                </select>
                              </label>
                              <label className="pip-top-field companion-attack-effects">
                                <span>{copy.effects}</span>
                                <input className="pip-inline-input" value={attack.effects} placeholder={copy.effectsPlaceholder} onChange={(event) => updateAttack(attack.id, { effects: event.target.value })} />
                              </label>
                            </div>

                            <div className="companion-attack-footer">
                              <div className="pip-inline-stats companion-attack-summary">
                                <span>{copy.target}: {tn}</span>
                                <span>{attack.diceCount || 2}d20</span>
                                <span>D{attack.difficulty || 1}</span>
                                <span>{attack.damage || 0} CD</span>
                                <span>{damageTypeLabel}</span>
                              </div>
                              <button type="button" className="pip-btn is-primary" onClick={() => setEditingAttackId(null)} title="Save">✓</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="pip-btn is-primary companion-attack-roll"
                              onClick={() => rollAttack(attack)}
                              title={copy.roll}
                            >
                              <strong>{attack.name || copy.attackName}</strong>
                              <span className="companion-attack-roll-meta">
                                <span>{copy.target}: {tn}</span>
                                <span>{attack.diceCount || 2}d20</span>
                                <span>D{attack.difficulty || 1}</span>
                                <span>{attack.damage || 0} CD</span>
                                <span>{damageTypeLabel}</span>
                              </span>
                              {attack.effects ? <span className="companion-attack-roll-effects">{copy.effects}: {attack.effects}</span> : null}
                            </button>

                            {isEditingCard ? (
                              <div className="companion-attack-footer">
                                <div className="pip-inline-stats companion-attack-summary" />
                                <div className="companion-attack-actions">
                                  <button type="button" className="pip-btn" onClick={() => setEditingAttackId(attack.id)} title={copy.attackName}>✎</button>
                                  <button type="button" className="pip-btn" onClick={() => removeAttack(attack.id)}>{copy.removeAttack}</button>
                                </div>
                              </div>
                            ) : null}
                          </>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

              <label className="companion-attack-notes">
                <span>{copy.attackNotes}</span>
                <textarea
                  className="pip-input"
                  rows={2}
                  value={active.attackNotes || ""}
                  placeholder={copy.attackNotesPlaceholder}
                  readOnly={!isEditingCard}
                  onChange={isEditingCard ? (event) => updateActive({ attackNotes: event.target.value }) : undefined}
                />
              </label>
            </div>

            <div className="companion-long-grid">
              <label className="pip-logbox companion-long-field">
                <span>[ {copy.abilities} ]</span>
                <textarea className="pip-input" rows={6} value={active.specialAbilities} readOnly={!isEditingCard} placeholder={copy.abilitiesPlaceholder} onChange={isEditingCard ? (event) => updateActive({ specialAbilities: event.target.value }) : undefined} />
              </label>

              <label className="pip-logbox companion-long-field companion-notes-field">
                <span>[ {copy.notes} ]</span>
                <textarea className="pip-input" rows={3} value={active.notes} readOnly={!isEditingCard} placeholder={copy.notesPlaceholder} onChange={isEditingCard ? (event) => updateActive({ notes: event.target.value }) : undefined} />
              </label>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
