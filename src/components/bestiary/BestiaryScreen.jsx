import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BESTIARY_CATEGORIES,
  BESTIARY_ENTRIES,
  createEmptyBestiaryEntry,
} from "../../data/bestiary.js";
import "./bestiary.css";
import DiceRollModal from "../dice/DiceRollModal.jsx";
import { attackRollConfig, normalizeBestiaryAttacks } from "../../utils/bestiaryAttacks.js";
import { creatureAbilityList } from "../../data/creatureModifiers.js";

const CUSTOM_STORAGE_KEY = "fallout_pipboy_bestiary_custom_v1";
const INDEX_CACHE_PREFIX = "fallout_pipboy_bestiary_index_i18n_v1";
const DETAIL_CACHE_PREFIX = "fallout_pipboy_bestiary_detail_i18n_v1";

const TEXT = {
  en: {
    title: "BESTIARY", subtitle: "Core Rulebook creatures, NPCs, robots, traps and hazards",
    search: "Search bestiary...", add: "+ ENTRY", edit: "EDIT", save: "SAVE", remove: "DELETE", cancel: "CANCEL",
    all: "ALL", creature: "CREATURES", enemy: "ENEMIES", ally: "ALLIES", npc: "NPC", robot: "ROBOTS", trap: "TRAPS", hazard: "HAZARDS", obstacle: "OBSTACLES",
    reference: "RULEBOOK", custom: "CUSTOM", translating: "Translating…", translationReady: "Translated", translationFallback: "Original text",
    level: "LEVEL", xp: "XP", type: "TYPE", hp: "HP", initiative: "INITIATIVE", defense: "DEFENSE", carryWeight: "CARRY WEIGHT", meleeBonus: "MELEE BONUS", luckPoints: "LUCK",
    body: "BODY", mind: "MIND", melee: "MELEE", guns: "GUNS", other: "OTHER", dr: "DAMAGE RESISTANCE", special: "S.P.E.C.I.A.L.", skills: "SKILLS",
    attacks: "ATTACKS", abilities: "SPECIAL ABILITIES", tactics: "TACTICS", loot: "INVENTORY / LOOT", summary: "DESCRIPTION", source: "SOURCE", notes: "NOTES",
    detectionDifficulty: "DETECTION", disarmDifficulty: "DISARM", trigger: "TRIGGER", damage: "DAMAGE", effect: "EFFECT",
    noResults: "No matching entries.", noSelection: "Select an entry.", confirmDelete: "Delete this custom entry?", tags: "TAGS", category: "CATEGORY", name: "NAME",
  },
  ru: {
    title: "БЕСТИАРИЙ", subtitle: "Существа, NPC, роботы, ловушки и опасности из основной книги правил",
    search: "Поиск по бестиарию...", add: "+ ЗАПИСЬ", edit: "ИЗМЕНИТЬ", save: "СОХРАНИТЬ", remove: "УДАЛИТЬ", cancel: "ОТМЕНА",
    all: "ВСЕ", creature: "СУЩЕСТВА", enemy: "ПРОТИВНИКИ", ally: "СОЮЗНИКИ", npc: "NPC", robot: "РОБОТЫ", trap: "ЛОВУШКИ", hazard: "ОПАСНОСТИ", obstacle: "ПРЕПЯТСТВИЯ",
    reference: "ПРАВИЛА", custom: "СВОЯ", translating: "Перевод…", translationReady: "Переведено", translationFallback: "Оригинальный текст",
    level: "УРОВЕНЬ", xp: "XP", type: "ТИП", hp: "HP", initiative: "ИНИЦИАТИВА", defense: "ЗАЩИТА", carryWeight: "ГРУЗОПОДЪЁМНОСТЬ", meleeBonus: "БОНУС БЛИЖНЕГО БОЯ", luckPoints: "УДАЧА",
    body: "BODY", mind: "MIND", melee: "БЛИЖНИЙ БОЙ", guns: "СТРЕЛЬБА", other: "ДРУГОЕ", dr: "СОПРОТИВЛЕНИЕ УРОНУ", special: "S.P.E.C.I.A.L.", skills: "НАВЫКИ",
    attacks: "АТАКИ", abilities: "ОСОБЫЕ СПОСОБНОСТИ", tactics: "ТАКТИКА", loot: "ИНВЕНТАРЬ / ДОБЫЧА", summary: "ОПИСАНИЕ", source: "ИСТОЧНИК", notes: "ЗАМЕТКИ",
    detectionDifficulty: "ОБНАРУЖЕНИЕ", disarmDifficulty: "ОБЕЗВРЕЖИВАНИЕ", trigger: "ТРИГГЕР", damage: "УРОН", effect: "ЭФФЕКТ",
    noResults: "Ничего не найдено.", noSelection: "Выберите запись.", confirmDelete: "Удалить эту пользовательскую запись?", tags: "ТЕГИ", category: "КАТЕГОРИЯ", name: "НАЗВАНИЕ",
  },
  uk: {
    title: "БЕСТІАРІЙ", subtitle: "Істоти, NPC, роботи, пастки та небезпеки з основної книги правил",
    search: "Пошук у бестіарії...", add: "+ ЗАПИС", edit: "ЗМІНИТИ", save: "ЗБЕРЕГТИ", remove: "ВИДАЛИТИ", cancel: "СКАСУВАТИ",
    all: "УСІ", creature: "ІСТОТИ", enemy: "ПРОТИВНИКИ", ally: "СОЮЗНИКИ", npc: "NPC", robot: "РОБОТИ", trap: "ПАСТКИ", hazard: "НЕБЕЗПЕКИ", obstacle: "ПЕРЕШКОДИ",
    reference: "ПРАВИЛА", custom: "ВЛАСНА", translating: "Переклад…", translationReady: "Перекладено", translationFallback: "Оригінальний текст",
    level: "РІВЕНЬ", xp: "XP", type: "ТИП", hp: "HP", initiative: "ІНІЦІАТИВА", defense: "ЗАХИСТ", carryWeight: "ВАНТАЖОПІДЙОМНІСТЬ", meleeBonus: "БОНУС БЛИЖНЬОГО БОЮ", luckPoints: "УДАЧА",
    body: "BODY", mind: "MIND", melee: "БЛИЖНІЙ БІЙ", guns: "СТРІЛЬБА", other: "ІНШЕ", dr: "ОПІР ШКОДІ", special: "S.P.E.C.I.A.L.", skills: "НАВИЧКИ",
    attacks: "АТАКИ", abilities: "ОСОБЛИВІ ЗДІБНОСТІ", tactics: "ТАКТИКА", loot: "ІНВЕНТАР / ЗДОБИЧ", summary: "ОПИС", source: "ДЖЕРЕЛО", notes: "НОТАТКИ",
    detectionDifficulty: "ВИЯВЛЕННЯ", disarmDifficulty: "ЗНЕШКОДЖЕННЯ", trigger: "ТРИГЕР", damage: "ШКОДА", effect: "ЕФЕКТ",
    noResults: "Нічого не знайдено.", noSelection: "Оберіть запис.", confirmDelete: "Видалити цей власний запис?", tags: "ТЕГИ", category: "КАТЕГОРІЯ", name: "НАЗВА",
  },
  pl: {
    title: "BESTIARIUSZ", subtitle: "Stworzenia, NPC, roboty, pułapki i zagrożenia z podręcznika głównego",
    search: "Szukaj w bestiariuszu...", add: "+ WPIS", edit: "EDYTUJ", save: "ZAPISZ", remove: "USUŃ", cancel: "ANULUJ",
    all: "WSZYSTKO", creature: "STWORZENIA", enemy: "WROGOWIE", ally: "SOJUSZNICY", npc: "NPC", robot: "ROBOTY", trap: "PUŁAPKI", hazard: "ZAGROŻENIA", obstacle: "PRZESZKODY",
    reference: "ZASADY", custom: "WŁASNY", translating: "Tłumaczenie…", translationReady: "Przetłumaczono", translationFallback: "Tekst oryginalny",
    level: "POZIOM", xp: "XP", type: "TYP", hp: "HP", initiative: "INICJATYWA", defense: "OBRONA", carryWeight: "UDŹWIG", meleeBonus: "BONUS WRĘCZ", luckPoints: "SZCZĘŚCIE",
    body: "BODY", mind: "MIND", melee: "WALKA WRĘCZ", guns: "STRZELECTWO", other: "INNE", dr: "ODPORNOŚĆ NA OBRAŻENIA", special: "S.P.E.C.I.A.L.", skills: "UMIEJĘTNOŚCI",
    attacks: "ATAKI", abilities: "ZDOLNOŚCI SPECJALNE", tactics: "TAKTYKA", loot: "EKWIPUNEK / ŁUP", summary: "OPIS", source: "ŹRÓDŁO", notes: "NOTATKI",
    detectionDifficulty: "WYKRYCIE", disarmDifficulty: "ROZBROJENIE", trigger: "WYZWALACZ", damage: "OBRAŻENIA", effect: "EFEKT",
    noResults: "Brak wyników.", noSelection: "Wybierz wpis.", confirmDelete: "Usunąć ten własny wpis?", tags: "TAGI", category: "KATEGORIA", name: "NAZWA",
  },
};

const SKILL_NAMES = {
  ru: { Athletics: "Атлетика", Barter: "Бартер", "Big Guns": "Тяжёлое оружие", "Energy Weapons": "Энергетическое оружие", Explosives: "Взрывчатка", Lockpick: "Взлом", Medicine: "Медицина", "Melee Weapons": "Холодное оружие", Pilot: "Пилотирование", Repair: "Ремонт", Science: "Наука", "Small Guns": "Стрелковое оружие", Sneak: "Скрытность", Speech: "Красноречие", Survival: "Выживание", Throwing: "Метание", Unarmed: "Безоружный бой" },
  uk: { Athletics: "Атлетика", Barter: "Бартер", "Big Guns": "Важка зброя", "Energy Weapons": "Енергетична зброя", Explosives: "Вибухівка", Lockpick: "Злам", Medicine: "Медицина", "Melee Weapons": "Холодна зброя", Pilot: "Пілотування", Repair: "Ремонт", Science: "Наука", "Small Guns": "Стрілецька зброя", Sneak: "Скритність", Speech: "Красномовство", Survival: "Виживання", Throwing: "Метання", Unarmed: "Беззбройний бій" },
  pl: { Athletics: "Atletyka", Barter: "Handel", "Big Guns": "Broń ciężka", "Energy Weapons": "Broń energetyczna", Explosives: "Materiały wybuchowe", Lockpick: "Otwieranie zamków", Medicine: "Medycyna", "Melee Weapons": "Broń biała", Pilot: "Pilotaż", Repair: "Naprawa", Science: "Nauka", "Small Guns": "Broń strzelecka", Sneak: "Skradanie", Speech: "Retoryka", Survival: "Przetrwanie", Throwing: "Rzucanie", Unarmed: "Walka bez broni" },
};

function normalizeLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return TEXT[code] ? code : "en";
}

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* optional cache */ }
}

function readCharacterWeapons() {
  const saved = readJson("fallout_pipboy_v4_last_character", {});
  return Array.isArray(saved?.data?.weapons) ? saved.data.weapons : [];
}

function searchable(entry) {
  return [entry.name, entry.creatureType, entry.summary, entry.attacks, entry.abilities, ...(entry.tags || [])]
    .filter(Boolean).join(" ").toLowerCase();
}

function localizeDr(value, language) {
  if (language === "en") return value;
  const maps = {
    ru: { Physical: "Физический", Energy: "Энергетический", Radiation: "Радиационный", Poison: "Яд", Immune: "Иммунитет", All: "Все", Torso: "Торс", Arms: "Руки", Legs: "Ноги", Head: "Голова", Face: "Лицо" },
    uk: { Physical: "Фізична", Energy: "Енергетична", Radiation: "Радіаційна", Poison: "Отрута", Immune: "Імунітет", All: "Усі", Torso: "Торс", Arms: "Руки", Legs: "Ноги", Head: "Голова", Face: "Обличчя" },
    pl: { Physical: "Fizyczne", Energy: "Energetyczne", Radiation: "Radiacyjne", Poison: "Trucizna", Immune: "Odporność", All: "Wszystkie", Torso: "Tułów", Arms: "Ręce", Legs: "Nogi", Head: "Głowa", Face: "Twarz" },
  };
  let result = String(value || "");
  for (const [from, to] of Object.entries(maps[language] || {})) result = result.replaceAll(from, to);
  return result;
}

function Field({ label, value }) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return <div className="bestiary-info-field"><span>{label}</span><strong>{String(value)}</strong></div>;
}

function Section({ title, children }) {
  if (!children) return null;
  return <section className="bestiary-section"><h4>[ {title} ]</h4>{children}</section>;
}

export default function BestiaryScreen() {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = TEXT[language];
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [customEntries, setCustomEntries] = useState(() => readJson(CUSTOM_STORAGE_KEY, []));
  const [selectedId, setSelectedId] = useState(BESTIARY_ENTRIES[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const [indexTranslations, setIndexTranslations] = useState({});
  const [detailTranslations, setDetailTranslations] = useState({});
  const [translationState, setTranslationState] = useState("idle");
  const [diceRoll, setDiceRoll] = useState(null);
  const [pendingAutoD6, setPendingAutoD6] = useState(null);
  const characterWeapons = useMemo(readCharacterWeapons, []);

  useEffect(() => writeJson(CUSTOM_STORAGE_KEY, customEntries), [customEntries]);

  useEffect(() => {
    setIndexTranslations({});
    setDetailTranslations({});
    if (language === "en") return;

    const cached = readJson(`${INDEX_CACHE_PREFIX}:${language}`, null);
    if (cached && typeof cached === "object") {
      setIndexTranslations(cached);
      return;
    }

    let cancelled = false;
    fetch("/api/bestiary-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "index",
        language,
        entries: BESTIARY_ENTRIES.map(({ id, name, creatureType, tags }) => ({ id, name, creatureType, tags })),
      }),
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("index translation failed")))
      .then(({ translated }) => {
        if (cancelled || !Array.isArray(translated)) return;
        const map = Object.fromEntries(translated.filter((item) => item?.id).map((item) => [item.id, item]));
        setIndexTranslations(map);
        writeJson(`${INDEX_CACHE_PREFIX}:${language}`, map);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [language]);

  const entries = useMemo(() => [...BESTIARY_ENTRIES, ...customEntries], [customEntries]);

  const displayIndexEntry = (entry) => entry.custom || language === "en"
    ? entry
    : { ...entry, ...(indexTranslations[entry.id] || {}) };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      const display = displayIndexEntry(entry);
      return !needle || searchable(display).includes(needle) || searchable(entry).includes(needle);
    });
  }, [entries, category, query, indexTranslations, language]);

  useEffect(() => {
    if (filtered.length && !filtered.some((entry) => entry.id === selectedId)) {
      setSelectedId(filtered[0].id);
      setEditing(false);
    }
  }, [filtered, selectedId]);

  const selected = entries.find((entry) => entry.id === selectedId) || null;

  useEffect(() => {
    if (!selected || selected.custom || language === "en") {
      setTranslationState("idle");
      return;
    }

    const memory = detailTranslations[selected.id];
    if (memory) {
      setTranslationState("ready");
      return;
    }

    const cacheKey = `${DETAIL_CACHE_PREFIX}:${language}:${selected.id}`;
    const cached = readJson(cacheKey, null);
    if (cached?.id === selected.id) {
      setDetailTranslations((prev) => ({ ...prev, [selected.id]: cached }));
      setTranslationState("ready");
      return;
    }

    let cancelled = false;
    setTranslationState("loading");
    fetch("/api/bestiary-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "detail", language, entry: selected }),
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("detail translation failed")))
      .then(({ translated }) => {
        if (cancelled || !translated?.id) return;
        setDetailTranslations((prev) => ({ ...prev, [selected.id]: translated }));
        writeJson(cacheKey, translated);
        setTranslationState("ready");
      })
      .catch(() => { if (!cancelled) setTranslationState("fallback"); });

    return () => { cancelled = true; };
  }, [selectedId, language]);

  const shown = selected && !selected.custom && language !== "en"
    ? { ...selected, ...(indexTranslations[selected.id] || {}), ...(detailTranslations[selected.id] || {}) }
    : selected;

  const addEntry = () => {
    const next = createEmptyBestiaryEntry(category === "all" ? "creature" : category);
    setCustomEntries((prev) => [...prev, next]);
    setSelectedId(next.id);
    setEditing(true);
  };

  const updateCustom = (key, value) => {
    if (!selected?.custom) return;
    setCustomEntries((prev) => prev.map((entry) => entry.id === selected.id ? { ...entry, [key]: value } : entry));
  };

  const updateCategory = (value) => {
    updateCustom("category", value);
    updateCustom("statKind", ["trap", "hazard", "obstacle"].includes(value) ? "rule" : value === "npc" ? "character" : "creature");
  };

  const removeCustom = () => {
    if (!selected?.custom) return;
    if (!window.confirm(copy.confirmDelete)) return;
    setCustomEntries((prev) => prev.filter((entry) => entry.id !== selected.id));
    setSelectedId(BESTIARY_ENTRIES[0]?.id || null);
    setEditing(false);
  };

  const updateAttack = (index, patch) => updateCustom("attackProfiles", (selected.attackProfiles || []).map((attack, i) => i === index ? { ...attack, ...patch } : attack));
  const addAttack = () => updateCustom("attackProfiles", [...(selected.attackProfiles || []), { id: `attack-${Date.now()}`, name: "", targetNumber: 10, diceCount: 2, difficulty: 1, damage: 3, effects: "", range: "" }]);
  const addWeapon = (weaponIndex) => {
    const weapon = characterWeapons[Number(weaponIndex)];
    if (!weapon) return;
    const damage = Number(String(weapon.damage || "").match(/\d+/)?.[0] || 0);
    const effects = [...(Array.isArray(weapon.effects) ? weapon.effects : []), weapon.customEffect].filter(Boolean).join(", ");
    updateCustom("attackProfiles", [...(selected.attackProfiles || []), { id: `weapon-${Date.now()}`, name: weapon.name || "Weapon", targetNumber: 10, diceCount: 2, difficulty: 1, damage, effects, range: weapon.range || "", weapon }]);
  };
  const rollAttack = (entry, attack) => {
    setPendingAutoD6(null);
    setDiceRoll(attackRollConfig(entry, attack, entry.groupSize));
  };

  const renderSkills = () => {
    if (!Array.isArray(shown?.skills) || !shown.skills.length) return null;
    return shown.skills.map((skill, index) => {
      const rawName = typeof skill === "string" ? skill : (skill.name || skill.skill || "");
      const value = typeof skill === "string" ? "" : (skill.rank ?? skill.value ?? "");
      const tagged = typeof skill === "object" && Boolean(skill.tagged || skill.tag);
      const name = SKILL_NAMES[language]?.[rawName] || rawName;
      return <span className={`bestiary-skill-chip${tagged ? " is-tagged" : ""}`} key={`${rawName}-${index}`}>{name}{value !== "" ? ` ${value}` : ""}{tagged ? " ★" : ""}</span>;
    });
  };

  return (
    <section className="pip-panel pip-block bestiary-screen">
      <div className="pip-head bestiary-head">
        <div><h2>[ {copy.title} ]</h2><span>{copy.subtitle}</span></div>
        <button type="button" className="pip-btn is-primary" onClick={addEntry}>{copy.add}</button>
      </div>

      <div className="bestiary-toolbar">
        <input className="pip-input bestiary-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.search} />
        <div className="pip-tagrow is-wrap bestiary-filters">
          {BESTIARY_CATEGORIES.map((key) => <button key={key} type="button" className={`pip-tag ${category === key ? "is-selected" : ""}`} onClick={() => setCategory(key)}>{copy[key] || key}</button>)}
        </div>
      </div>

      <div className="bestiary-layout">
        <div className="bestiary-list pip-logbox">
          {filtered.length ? filtered.map((entry) => {
            const display = displayIndexEntry(entry);
            return <button key={entry.id} type="button" className={`bestiary-list-item ${entry.id === selectedId ? "is-selected" : ""}`} onClick={() => { setSelectedId(entry.id); setEditing(false); }}>
              <span className="bestiary-list-main"><strong>{display.name || "—"}</strong><small>{copy[entry.category] || entry.category}{entry.level ? ` • ${copy.level} ${entry.level}` : ""}</small></span>
              <span className="bestiary-list-kind">{entry.custom ? copy.custom : copy.reference}</span>
            </button>;
          }) : <div className="bestiary-empty">{copy.noResults}</div>}
        </div>

        <div className="bestiary-detail">
          {!shown ? <div className="pip-logbox bestiary-empty">{copy.noSelection}</div> : editing && selected.custom ? (
            <div className="bestiary-editor">
              <div className="bestiary-detail-head"><h3>{selected.name || copy.add}</h3><div className="pip-actions-inline"><button className="pip-btn is-primary" type="button" onClick={() => setEditing(false)}>{copy.save}</button><button className="pip-btn" type="button" onClick={removeCustom}>{copy.remove}</button></div></div>
              <div className="bestiary-edit-grid">
                <label><span>{copy.name}</span><input className="pip-input" value={selected.name || ""} onChange={(e) => updateCustom("name", e.target.value)} /></label>
                <label><span>{copy.category}</span><select className="pip-input" value={selected.category || "creature"} onChange={(e) => updateCategory(e.target.value)}>{BESTIARY_CATEGORIES.filter((x) => x !== "all").map((x) => <option value={x} key={x}>{copy[x] || x}</option>)}</select></label>
                <label><span>{copy.level}</span><input className="pip-input" value={selected.level || ""} onChange={(e) => updateCustom("level", e.target.value)} /></label>
                <label><span>{copy.type}</span><input className="pip-input" value={selected.creatureType || ""} onChange={(e) => updateCustom("creatureType", e.target.value)} /></label>
                {(selected.statKind === "character" ? ["hp","initiative","defense","carryWeight","luckPoints"] : ["body","mind","melee","guns","other","hp","initiative","defense","carryWeight","meleeBonus"]).map((key) => <label key={key}><span>{copy[key]}</span><input className="pip-input" value={selected[key] || ""} onChange={(e) => updateCustom(key, e.target.value)} /></label>)}
                {selected.statKind === "character" ? ["STR","PER","END","CHA","INT","AGI","LCK"].map((key) => <label key={key}><span>{key}</span><input className="pip-input" type="number" min="1" max="20" value={selected.special?.[key] || ""} onChange={(e) => updateCustom("special", { ...(selected.special || {}), [key]: e.target.value })} /></label>) : null}
                <label><span>МОДИФИКАТОР</span><select className="pip-input" value={selected.modifier || "standard"} onChange={(e) => updateCustom("modifier", e.target.value)}><option value="minion">MINION</option><option value="standard">STANDARD</option><option value="special">SPECIAL</option><option value="legendary">LEGENDARY</option></select></label>
                <label><span>ТОЛПА</span><select className="pip-input" value={selected.groupSize || 1} onChange={(e) => updateCustom("groupSize", Number(e.target.value))}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
                {creatureAbilityList(selected.modifier).length ? <label><span>{copy.abilities}</span><select className="pip-input" value={selected.specialAbilityId || ""} onChange={(e) => { const ability = creatureAbilityList(selected.modifier).find((item) => item.id === e.target.value); updateCustom("specialAbilityId", e.target.value); updateCustom("specialAbility", ability ? `${ability.name}: ${ability.summary}` : ""); }}><option value="">—</option>{creatureAbilityList(selected.modifier).map((ability) => <option key={ability.id} value={ability.id}>{ability.name}</option>)}</select></label> : null}
                {selected.modifier === "legendary" ? <label className="is-wide"><span>ЛЕГЕНДАРНАЯ НАГРАДА</span><input className="pip-input" value={selected.legendaryReward || ""} onChange={(e) => updateCustom("legendaryReward", e.target.value)} /></label> : null}
                <div className="is-wide bestiary-attack-editor">
                  <div className="bestiary-attack-editor-head"><strong>{copy.attacks}</strong><button type="button" className="pip-btn" onClick={addAttack}>+ {copy.attacks}</button></div>
                  {selected.category === "npc" && characterWeapons.length ? <select className="pip-input" defaultValue="" onChange={(e) => { addWeapon(e.target.value); e.target.value = ""; }}><option value="">+ ОРУЖИЕ ИЗ КАРТОЧКИ</option>{characterWeapons.map((weapon, index) => <option key={`${weapon.inventoryId || weapon.name}-${index}`} value={index}>{weapon.name || `Weapon ${index + 1}`}</option>)}</select> : null}
                  {(selected.attackProfiles || []).map((attack, index) => <div className="bestiary-attack-edit-row" key={attack.id || index}><input className="pip-input" placeholder="Название" value={attack.name || ""} onChange={(e) => updateAttack(index, { name: e.target.value })} /><input className="pip-input" type="number" title="TN" min="1" max="20" value={attack.targetNumber ?? 10} onChange={(e) => updateAttack(index, { targetNumber: e.target.value })} /><input className="pip-input" type="number" title="d20" min="1" max="10" value={attack.diceCount ?? 2} onChange={(e) => updateAttack(index, { diceCount: e.target.value })} /><input className="pip-input" type="number" title="CD" min="0" max="30" value={attack.damage ?? 0} onChange={(e) => updateAttack(index, { damage: e.target.value })} /><button type="button" className="pip-btn" onClick={() => updateCustom("attackProfiles", selected.attackProfiles.filter((_, i) => i !== index))}>×</button></div>)}
                </div>
                {["summary","attacks","abilities","tactics","loot","notes"].map((key) => <label className="is-wide" key={key}><span>{copy[key]}</span><textarea className="pip-textarea" value={selected[key] || ""} onChange={(e) => updateCustom(key, e.target.value)} /></label>)}
              </div>
            </div>
          ) : (
            <article className="bestiary-card">
              <div className="bestiary-detail-head">
                <div className="bestiary-title-block"><div className="pip-tagrow is-wrap"><span className="pip-tag is-selected">{copy[shown.category] || shown.category}</span><span className="pip-tag">{shown.custom ? copy.custom : copy.reference}</span></div><h3>{shown.name}</h3>{shown.creatureType ? <span>{shown.creatureType}</span> : null}</div>
                {shown.custom ? <button type="button" className="pip-btn" onClick={() => setEditing(true)}>{copy.edit}</button> : language !== "en" ? <span className={`bestiary-translation-state is-${translationState}`}>{translationState === "loading" ? copy.translating : translationState === "ready" ? copy.translationReady : copy.translationFallback}</span> : null}
              </div>

              <div className="bestiary-stat-grid">
                <Field label={copy.level} value={shown.level} /><Field label={copy.xp} value={shown.xp} /><Field label={copy.hp} value={shown.hp} /><Field label={copy.initiative} value={shown.initiative} /><Field label={copy.defense} value={shown.defense} /><Field label={copy.carryWeight} value={shown.carryWeight} /><Field label={copy.meleeBonus} value={shown.meleeBonus} /><Field label={copy.luckPoints} value={shown.luckPoints} />
              </div>

              {shown.statKind === "creature" ? <Section title={copy.type}><div className="bestiary-stat-grid"><Field label={copy.body} value={shown.body} /><Field label={copy.mind} value={shown.mind} /><Field label={copy.melee} value={shown.melee} /><Field label={copy.guns} value={shown.guns} /><Field label={copy.other} value={shown.other} /></div></Section> : null}

              {shown.special && Object.values(shown.special).some((v) => String(v ?? "").trim()) ? <Section title={copy.special}><div className="bestiary-special-grid">{["STR","PER","END","CHA","INT","AGI","LCK"].map((key) => <Field key={key} label={key} value={shown.special[key]} />)}</div></Section> : null}
              {Array.isArray(shown.skills) && shown.skills.length ? <Section title={copy.skills}><div className="bestiary-skill-list">{renderSkills()}</div></Section> : null}
              {shown.drBlock ? <Section title={copy.dr}><div className="pip-logbox bestiary-text">{localizeDr(shown.drBlock, language)}</div></Section> : null}
              {normalizeBestiaryAttacks(shown).length ? <Section title={copy.attacks}><div className="bestiary-attack-buttons">{normalizeBestiaryAttacks(shown).map((attack) => <button type="button" className="pip-btn is-primary" key={attack.id} onClick={() => rollAttack(shown, attack)}>{attack.name}</button>)}</div></Section> : null}

              {["detectionDifficulty","disarmDifficulty","trigger","damage","effect"].some((key) => shown[key]) ? <Section title={copy[shown.category] || copy.hazard}><div className="bestiary-stat-grid"><Field label={copy.detectionDifficulty} value={shown.detectionDifficulty} /><Field label={copy.disarmDifficulty} value={shown.disarmDifficulty} /></div>{shown.trigger ? <div className="pip-logbox bestiary-text"><strong>{copy.trigger}: </strong>{shown.trigger}</div> : null}{shown.damage ? <div className="pip-logbox bestiary-text"><strong>{copy.damage}: </strong>{shown.damage}</div> : null}{shown.effect ? <div className="pip-logbox bestiary-text"><strong>{copy.effect}: </strong>{shown.effect}</div> : null}</Section> : null}

              {["summary","abilities","tactics","loot","notes"].map((key) => shown[key] ? <Section title={copy[key]} key={key}><div className="pip-logbox bestiary-text">{shown[key]}</div></Section> : null)}
              {shown.source ? <Section title={copy.source}><div className="pip-logbox bestiary-source">{shown.source}</div></Section> : null}
            </article>
          )}
        </div>
      </div>
      <DiceRollModal isOpen={Boolean(diceRoll)} onClose={() => setDiceRoll(null)} rollConfig={diceRoll} pendingAutoD6={pendingAutoD6} setPendingAutoD6={setPendingAutoD6} />
    </section>
  );
}
