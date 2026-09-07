import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import { INVENTORY_DATABASE } from "../../data/inventoryDatabase.js";
import { getLocalizedCraftingMaterial } from "../../data/inventory/craftingMaterials.js";
import "./gmToolkit.css";

const GM_STORAGE_KEY = "fallout_pipboy_gm_panel_v1";
const TOOLKIT_STORAGE_KEY = "fallout_pipboy_gm_toolkit_v1";

const COPY = {
  en: {
    title: "GM TOOLKIT",
    subtitle: "Bestiary, encounter builder and loot",
    library: "NPC / CREATURE LIBRARY",
    encounter: "ENCOUNTER BUILDER",
    loot: "LOOT GENERATOR",
    search: "Search bestiary...",
    all: "All",
    level: "LVL",
    hp: "HP",
    defense: "DEF",
    initiative: "INIT",
    addEncounter: "+ ENCOUNTER",
    addInitiative: "+ INITIATIVE",
    emptyEncounter: "Add creatures from the library to build an encounter.",
    quantity: "Qty",
    startEncounter: "START ENCOUNTER",
    clear: "CLEAR",
    encounterStarted: "Encounter added to initiative",
    quality: "Quality",
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    generateLoot: "GENERATE LOOT",
    caps: "Caps",
    transferAll: "TRANSFER ALL TO PLAYER",
    transferOne: "TAKE",
    transferred: "Loot transferred to character",
    noCharacter: "Load a character to transfer loot.",
    lootNotes: "Bestiary loot notes",
    noLoot: "Generate loot for the current scene or encounter.",
    category: "Category",
    items: "Items",
  },
  ru: {
    title: "ИНСТРУМЕНТЫ ГМ",
    subtitle: "Бестиарий, конструктор встреч и добыча",
    library: "БИБЛИОТЕКА NPC / СУЩЕСТВ",
    encounter: "КОНСТРУКТОР ВСТРЕЧИ",
    loot: "ГЕНЕРАТОР ДОБЫЧИ",
    search: "Поиск по бестиарию...",
    all: "Все",
    level: "УР.",
    hp: "HP",
    defense: "ЗАЩ",
    initiative: "ИНИЦ",
    addEncounter: "+ ВО ВСТРЕЧУ",
    addInitiative: "+ В ИНИЦИАТИВУ",
    emptyEncounter: "Добавьте существ из библиотеки, чтобы собрать встречу.",
    quantity: "Кол-во",
    startEncounter: "НАЧАТЬ ВСТРЕЧУ",
    clear: "ОЧИСТИТЬ",
    encounterStarted: "Встреча добавлена в инициативу",
    quality: "Качество",
    common: "Обычная",
    uncommon: "Необычная",
    rare: "Редкая",
    generateLoot: "СГЕНЕРИРОВАТЬ ДОБЫЧУ",
    caps: "Крышки",
    transferAll: "ПЕРЕДАТЬ ВСЁ ИГРОКУ",
    transferOne: "ЗАБРАТЬ",
    transferred: "Добыча передана персонажу",
    noCharacter: "Загрузите персонажа, чтобы передавать добычу.",
    lootNotes: "Заметки о добыче из бестиария",
    noLoot: "Сгенерируйте добычу для текущей сцены или встречи.",
    category: "Категория",
    items: "Предметы",
  },
  uk: {
    title: "ІНСТРУМЕНТИ ГМ",
    subtitle: "Бестіарій, конструктор зустрічей і здобич",
    library: "БІБЛІОТЕКА NPC / ІСТОТ",
    encounter: "КОНСТРУКТОР ЗУСТРІЧІ",
    loot: "ГЕНЕРАТОР ЗДОБИЧІ",
    search: "Пошук у бестіарії...",
    all: "Усі",
    level: "РІВ.",
    hp: "HP",
    defense: "ЗАХ",
    initiative: "ІНІЦ",
    addEncounter: "+ ДО ЗУСТРІЧІ",
    addInitiative: "+ ДО ІНІЦІАТИВИ",
    emptyEncounter: "Додайте істот із бібліотеки, щоб зібрати зустріч.",
    quantity: "К-сть",
    startEncounter: "ПОЧАТИ ЗУСТРІЧ",
    clear: "ОЧИСТИТИ",
    encounterStarted: "Зустріч додано до ініціативи",
    quality: "Якість",
    common: "Звичайна",
    uncommon: "Незвичайна",
    rare: "Рідкісна",
    generateLoot: "ЗГЕНЕРУВАТИ ЗДОБИЧ",
    caps: "Кришки",
    transferAll: "ПЕРЕДАТИ ВСЕ ГРАВЦЮ",
    transferOne: "ЗАБРАТИ",
    transferred: "Здобич передано персонажу",
    noCharacter: "Завантажте персонажа, щоб передавати здобич.",
    lootNotes: "Нотатки про здобич із бестіарію",
    noLoot: "Згенеруйте здобич для поточної сцени або зустрічі.",
    category: "Категорія",
    items: "Предмети",
  },
  pl: {
    title: "NARZĘDZIA MG",
    subtitle: "Bestiariusz, kreator spotkań i łup",
    library: "BIBLIOTEKA NPC / STWORZEŃ",
    encounter: "KREATOR SPOTKANIA",
    loot: "GENERATOR ŁUPU",
    search: "Szukaj w bestiariuszu...",
    all: "Wszystkie",
    level: "POZ.",
    hp: "HP",
    defense: "OBR",
    initiative: "INIC",
    addEncounter: "+ DO SPOTKANIA",
    addInitiative: "+ DO INICJATYWY",
    emptyEncounter: "Dodaj stworzenia z biblioteki, aby zbudować spotkanie.",
    quantity: "Ilość",
    startEncounter: "ROZPOCZNIJ SPOTKANIE",
    clear: "WYCZYŚĆ",
    encounterStarted: "Spotkanie dodano do inicjatywy",
    quality: "Jakość",
    common: "Pospolita",
    uncommon: "Niepospolita",
    rare: "Rzadka",
    generateLoot: "GENERUJ ŁUP",
    caps: "Kapsle",
    transferAll: "PRZEKAŻ WSZYSTKO GRACZOWI",
    transferOne: "WEŹ",
    transferred: "Łup przekazano postaci",
    noCharacter: "Wczytaj postać, aby przekazywać łup.",
    lootNotes: "Notatki o łupie z bestiariusza",
    noLoot: "Wygeneruj łup dla bieżącej sceny lub spotkania.",
    category: "Kategoria",
    items: "Przedmioty",
  },
};

function languageCode(value) {
  const code = String(value || "en").split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(code) ? code : "en";
}

function makeId(prefix = "gm") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Optional persistence only.
  }
}

function updateGmState(updater) {
  const current = readJson(GM_STORAGE_KEY, {
    scene: { title: "", type: "exploration", weather: "clear", time: "day", description: "" },
    initiative: [],
    activeInitiative: 0,
    round: 1,
    ap: { players: 0, gm: 0, max: 6 },
    notes: "",
    log: [],
    gmHistory: [],
  });
  const next = typeof updater === "function" ? updater(current) : updater;
  writeJson(GM_STORAGE_KEY, next);
  return next;
}

function creatureEntries() {
  return BESTIARY_ENTRIES.filter((entry) =>
    entry &&
    entry.statKind !== "rule" &&
    !["trap", "hazard", "obstacle"].includes(entry.category)
  );
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function mergeInventory(existing = [], loot = []) {
  const next = [...existing];
  loot.forEach(({ item, quantity }) => {
    const canonicalName = item?.canonicalName || item?.name || "Loot";
    const category = item?.category || "misc";
    const index = next.findIndex((candidate) =>
      normalize(candidate?.canonicalName || candidate?.name) === normalize(canonicalName) &&
      (candidate?.category || "misc") === category
    );
    if (index >= 0) {
      const currentQty = Math.max(0, Number(next[index]?.quantity ?? next[index]?.qty ?? 0));
      next[index] = { ...next[index], quantity: String(currentQty + quantity) };
    } else {
      next.push({
        ...item,
        canonicalName,
        quantity: String(quantity),
      });
    }
  });
  return next;
}

function getDisplayName(item, language) {
  const material = getLocalizedCraftingMaterial(item, language);
  if (material?.displayName) return material.displayName;
  return item?.localizedName?.[language] || item?.localizedName?.en || item?.name || "Loot";
}

function rarityScore(item) {
  if (item?.materialTier === "rare") return 5;
  if (item?.materialTier === "uncommon") return 3;
  if (item?.materialTier === "common") return 1;
  const numeric = Number(item?.rarity);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function uniqueRandomItems(pool, count) {
  const copy = [...pool];
  const selected = [];
  while (copy.length && selected.length < count) {
    const index = Math.floor(Math.random() * copy.length);
    selected.push(copy.splice(index, 1)[0]);
  }
  return selected;
}

export default function GmToolkit({ character = null, setCharacter = null, onGmStateChanged }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language] || COPY.en;
  const allCreatures = useMemo(() => creatureEntries(), []);
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(allCreatures.map((entry) => entry.category).filter(Boolean))).sort()],
    [allCreatures]
  );

  const initial = useMemo(() => readJson(TOOLKIT_STORAGE_KEY, {}), []);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [encounter, setEncounter] = useState(Array.isArray(initial.encounter) ? initial.encounter : []);
  const [quality, setQuality] = useState(initial.quality || "common");
  const [loot, setLoot] = useState(Array.isArray(initial.loot) ? initial.loot : []);
  const [lootCaps, setLootCaps] = useState(Number(initial.lootCaps || 0));
  const [notice, setNotice] = useState("");

  useEffect(() => {
    writeJson(TOOLKIT_STORAGE_KEY, { encounter, quality, loot, lootCaps });
  }, [encounter, quality, loot, lootCaps]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    return allCreatures
      .filter((entry) => category === "all" || entry.category === category)
      .filter((entry) => {
        if (!needle) return true;
        const haystack = [entry.name, entry.creatureType, entry.category, ...(entry.tags || [])].join(" ").toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 36);
  }, [allCreatures, category, query]);

  const encounterDetails = useMemo(() => encounter.map((slot) => ({
    ...slot,
    entry: allCreatures.find((entry) => entry.id === slot.entryId) || null,
  })).filter((slot) => slot.entry), [encounter, allCreatures]);

  const addToEncounter = (entry) => {
    setEncounter((previous) => {
      const existing = previous.find((slot) => slot.entryId === entry.id);
      if (existing) {
        return previous.map((slot) => slot.entryId === entry.id
          ? { ...slot, quantity: Math.min(20, Number(slot.quantity || 1) + 1) }
          : slot
        );
      }
      return [...previous, { entryId: entry.id, quantity: 1 }];
    });
  };

  const changeEncounterQuantity = (entryId, nextQuantity) => {
    const quantity = Math.max(1, Math.min(20, Number(nextQuantity || 1)));
    setEncounter((previous) => previous.map((slot) => slot.entryId === entryId ? { ...slot, quantity } : slot));
  };

  const removeEncounterEntry = (entryId) => {
    setEncounter((previous) => previous.filter((slot) => slot.entryId !== entryId));
  };

  const addEntriesToInitiative = (entries, logMessage) => {
    updateGmState((gm) => {
      const initiative = [...(Array.isArray(gm.initiative) ? gm.initiative : []), ...entries]
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      const log = logMessage
        ? [{ id: makeId("log"), at: Date.now(), message: logMessage }, ...(gm.log || [])].slice(0, 30)
        : gm.log || [];
      return { ...gm, initiative, activeInitiative: 0, round: Math.max(1, Number(gm.round || 1)), log };
    });
    onGmStateChanged?.();
  };

  const addSingleToInitiative = (entry) => {
    addEntriesToInitiative([{
      id: makeId("init"),
      name: entry.name,
      score: Number(entry.initiative || 0),
      type: "npc",
      bestiaryId: entry.id,
      hp: Number(entry.hp || 0),
      defense: entry.defense || null,
      level: Number(entry.level || 0),
    }], `${entry.name} → ${text.initiative}`);
    setNotice(`${entry.name}: ${text.addInitiative}`);
  };

  const startEncounter = () => {
    const expanded = [];
    encounterDetails.forEach(({ entry, quantity }) => {
      const count = Math.max(1, Number(quantity || 1));
      for (let index = 0; index < count; index += 1) {
        expanded.push({
          id: makeId("init"),
          name: count > 1 ? `${entry.name} ${index + 1}` : entry.name,
          score: Number(entry.initiative || 0),
          type: "npc",
          bestiaryId: entry.id,
          hp: Number(entry.hp || 0),
          defense: entry.defense || null,
          level: Number(entry.level || 0),
        });
      }
    });
    if (!expanded.length) return;
    const summary = encounterDetails.map(({ entry, quantity }) => `${quantity}× ${entry.name}`).join(", ");
    addEntriesToInitiative(expanded, `${text.encounterStarted}: ${summary}`);
    setNotice(text.encounterStarted);
  };

  const generateLoot = () => {
    const thresholds = { common: 2, uncommon: 4, rare: 99 };
    const counts = { common: 2, uncommon: 3, rare: 4 };
    const capRanges = { common: [4, 20], uncommon: [15, 55], rare: [35, 120] };
    const threshold = thresholds[quality] ?? 2;
    let pool = INVENTORY_DATABASE.filter((item) => rarityScore(item) <= threshold);
    if (quality === "rare") pool = INVENTORY_DATABASE;
    const picked = uniqueRandomItems(pool, counts[quality] || 2).map((item) => {
      const isMaterial = item?.sourceType === "crafting_material";
      const quantity = isMaterial ? 1 + Math.floor(Math.random() * 3) : 1 + (Math.random() < 0.2 ? 1 : 0);
      return { id: makeId("loot"), item, quantity };
    });
    const [minCaps, maxCaps] = capRanges[quality] || capRanges.common;
    setLoot(picked);
    setLootCaps(minCaps + Math.floor(Math.random() * (maxCaps - minCaps + 1)));
    setNotice("");
  };

  const transferLoot = (lootToTransfer, capsToTransfer = 0) => {
    if (typeof setCharacter !== "function") {
      setNotice(text.noCharacter);
      return false;
    }
    setCharacter((previous) => ({
      ...previous,
      caps: String(Math.max(0, Number(previous?.caps || 0)) + Math.max(0, Number(capsToTransfer || 0))),
      inventoryItems: mergeInventory(previous?.inventoryItems || [], lootToTransfer),
    }));
    updateGmState((gm) => ({
      ...gm,
      log: [{ id: makeId("log"), at: Date.now(), message: text.transferred }, ...(gm.log || [])].slice(0, 30),
    }));
    onGmStateChanged?.();
    setNotice(text.transferred);
    return true;
  };

  const transferAll = () => {
    if (!transferLoot(loot, lootCaps)) return;
    setLoot([]);
    setLootCaps(0);
  };

  const transferOne = (lootId) => {
    const target = loot.find((item) => item.id === lootId);
    if (!target || !transferLoot([target], 0)) return;
    setLoot((previous) => previous.filter((item) => item.id !== lootId));
  };

  const lootNotes = encounterDetails
    .map(({ entry }) => entry.loot ? `${entry.name}: ${entry.loot}` : null)
    .filter(Boolean)
    .slice(0, 5);

  return (
    <section className="gm-toolkit pip-screen">
      <header className="gm-toolkit__header">
        <div>
          <div className="gm-toolkit__eyebrow">ROBCO // TACTICAL SUPPORT MODULE</div>
          <h2>[ {text.title} ]</h2>
          <p>{text.subtitle}</p>
        </div>
        {notice ? <div className="gm-toolkit__notice">{notice}</div> : null}
      </header>

      <div className="gm-toolkit__grid">
        <article className="pip-panel gm-tool-card gm-tool-card--library">
          <div className="gm-tool-card__head"><h3>[ {text.library} ]</h3><span>{filtered.length}/{allCreatures.length}</span></div>
          <div className="gm-toolkit__filters">
            <input className="pip-input" value={query} placeholder={text.search} onChange={(event) => setQuery(event.target.value)} />
            <select className="pip-input" value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((value) => <option key={value} value={value}>{value === "all" ? text.all : value}</option>)}
            </select>
          </div>
          <div className="gm-library-list">
            {filtered.map((entry) => (
              <div key={entry.id} className="gm-library-row">
                <div className="gm-library-row__main">
                  <strong>{entry.name}</strong>
                  <span>{entry.creatureType || entry.category}</span>
                  <div className="gm-library-row__stats">
                    <b>{text.level} {entry.level || "-"}</b>
                    <b>{text.hp} {entry.hp || "-"}</b>
                    <b>{text.defense} {entry.defense || "-"}</b>
                    <b>{text.initiative} {entry.initiative || "-"}</b>
                  </div>
                </div>
                <div className="gm-library-row__actions">
                  <button type="button" className="pip-btn" onClick={() => addToEncounter(entry)}>{text.addEncounter}</button>
                  <button type="button" className="pip-btn" onClick={() => addSingleToInitiative(entry)}>{text.addInitiative}</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="gm-toolkit__side">
          <article className="pip-panel gm-tool-card">
            <div className="gm-tool-card__head"><h3>[ {text.encounter} ]</h3><span>{encounterDetails.reduce((sum, item) => sum + Number(item.quantity || 1), 0)}</span></div>
            {!encounterDetails.length ? <div className="gm-toolkit__empty">{text.emptyEncounter}</div> : (
              <div className="gm-encounter-list">
                {encounterDetails.map(({ entry, quantity }) => (
                  <div key={entry.id} className="gm-encounter-row">
                    <div><strong>{entry.name}</strong><small>{text.hp} {entry.hp || "-"} · {text.initiative} {entry.initiative || "-"}</small></div>
                    <label><span>{text.quantity}</span><input className="pip-input" type="number" min="1" max="20" value={quantity} onChange={(event) => changeEncounterQuantity(entry.id, event.target.value)} /></label>
                    <button type="button" onClick={() => removeEncounterEntry(entry.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="gm-toolkit__button-row">
              <button type="button" className="pip-btn" disabled={!encounterDetails.length} onClick={() => setEncounter([])}>{text.clear}</button>
              <button type="button" className="pip-btn gm-toolkit__primary" disabled={!encounterDetails.length} onClick={startEncounter}>{text.startEncounter}</button>
            </div>
          </article>

          <article className="pip-panel gm-tool-card">
            <div className="gm-tool-card__head"><h3>[ {text.loot} ]</h3><span>{text.items}: {loot.length}</span></div>
            <label className="gm-toolkit__quality"><span>{text.quality}</span><select className="pip-input" value={quality} onChange={(event) => setQuality(event.target.value)}><option value="common">{text.common}</option><option value="uncommon">{text.uncommon}</option><option value="rare">{text.rare}</option></select></label>
            <button type="button" className="pip-btn gm-toolkit__primary" onClick={generateLoot}>{text.generateLoot}</button>
            {loot.length || lootCaps ? (
              <div className="gm-loot-list">
                <div className="gm-loot-row gm-loot-row--caps"><div><strong>{text.caps}</strong><small>¤</small></div><b>{lootCaps}</b></div>
                {loot.map((entry) => (
                  <div key={entry.id} className="gm-loot-row">
                    <div><strong>{getDisplayName(entry.item, language)}</strong><small>{text.category}: {entry.item.category || "misc"}</small></div>
                    <b>×{entry.quantity}</b>
                    <button type="button" className="pip-btn" disabled={typeof setCharacter !== "function"} onClick={() => transferOne(entry.id)}>{text.transferOne}</button>
                  </div>
                ))}
              </div>
            ) : <div className="gm-toolkit__empty">{text.noLoot}</div>}
            <button type="button" className="pip-btn" disabled={(!loot.length && !lootCaps) || typeof setCharacter !== "function"} onClick={transferAll}>{text.transferAll}</button>
            {lootNotes.length ? (
              <details className="gm-loot-notes">
                <summary>{text.lootNotes}</summary>
                {lootNotes.map((note) => <p key={note}>{note}</p>)}
              </details>
            ) : null}
            {typeof setCharacter !== "function" ? <div className="gm-toolkit__hint">{text.noCharacter}</div> : null}
          </article>
        </div>
      </div>
    </section>
  );
}
