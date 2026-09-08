import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_DATABASE } from "../../data/inventoryDatabase.js";
import { translateInventoryItemName } from "../../data/inventoryLocalization.js";
import { parseCSV } from "../../utils/csvParser.js";
import { parseArmorDatabase } from "../../utils/armorDatabase.js";
import { formatLootChatMessage, getLootTypeLabel } from "../../utils/lootChat.js";
import "./gmLootGenerator.css";

const TYPE_IDS = ["weapon", "armor", "ammo", "aid", "junk", "mod", "special", "caps"];
const RARITY_WEIGHTS = [100, 100, 60, 35, 20, 10, 5, 2];
const FILTER_KEY = "pip2d20_gm_loot_filters_v1";

const COPY = {
  en: {
    title: "LOOT GENERATOR", subtitle: "Generate loot by rarity, category and wealth, then send it to session chat.",
    rarity: "RARITY", from: "MIN", to: "MAX", rarityHint: "R0–R1 are common. Higher rarity becomes progressively less likely.",
    types: "LOOT TYPES", wealth: "WEALTH", wealthHint: "Wealth controls the number of generated positions: 1–10.",
    generate: "GENERATE + SEND TO CHAT", loading: "LOADING DATABASES...", noTypes: "Select at least one loot type.",
    noLoot: "No items match the selected rarity and type filters.", sent: "Loot sent to session chat.", localOnly: "Loot generated, but session chat is unavailable.",
    result: "RESULT", name: "NAME", cost: "VALUE", weight: "WEIGHT", itemRarity: "RARITY", qty: "QTY", caps: "caps",
  },
  ru: {
    title: "ГЕНЕРАТОР ЛУТА", subtitle: "Рандомный лут по редкости, типу и богатству с отправкой результата в чат сессии.",
    rarity: "РЕДКОСТЬ", from: "ОТ", to: "ДО", rarityHint: "R0–R1 выпадают часто. Чем выше редкость, тем ниже шанс выпадения.",
    types: "ТИП ЛУТА", wealth: "БОГАТСТВО", wealthHint: "Богатство определяет количество позиций: от 1 до 10.",
    generate: "СГЕНЕРИРОВАТЬ + В ЧАТ", loading: "ЗАГРУЗКА БАЗ...", noTypes: "Выберите хотя бы один тип лута.",
    noLoot: "Для выбранных типов и диапазона редкости предметов нет.", sent: "Лут отправлен в чат сессии.", localOnly: "Лут создан, но чат сессии сейчас недоступен.",
    result: "РЕЗУЛЬТАТ", name: "НАЗВАНИЕ", cost: "СТОИМОСТЬ", weight: "ВЕС", itemRarity: "РЕДКОСТЬ", qty: "КОЛ-ВО", caps: "кр.",
  },
  uk: {
    title: "ГЕНЕРАТОР ЛУТУ", subtitle: "Випадковий лут за рідкістю, типом і багатством з відправкою в чат сесії.",
    rarity: "РІДКІСТЬ", from: "ВІД", to: "ДО", rarityHint: "R0–R1 випадають часто. Чим вища рідкість, тим нижчий шанс.",
    types: "ТИП ЛУТУ", wealth: "БАГАТСТВО", wealthHint: "Багатство визначає кількість позицій: від 1 до 10.",
    generate: "ЗГЕНЕРУВАТИ + В ЧАТ", loading: "ЗАВАНТАЖЕННЯ БАЗ...", noTypes: "Оберіть хоча б один тип луту.",
    noLoot: "Для вибраних типів і діапазону рідкості предметів немає.", sent: "Лут надіслано в чат сесії.", localOnly: "Лут створено, але чат сесії зараз недоступний.",
    result: "РЕЗУЛЬТАТ", name: "НАЗВА", cost: "ВАРТІСТЬ", weight: "ВАГА", itemRarity: "РІДКІСТЬ", qty: "К-СТЬ", caps: "кр.",
  },
  pl: {
    title: "GENERATOR ŁUPÓW", subtitle: "Losuj łupy według rzadkości, typu i bogactwa oraz wysyłaj wynik na czat sesji.",
    rarity: "RZADKOŚĆ", from: "OD", to: "DO", rarityHint: "R0–R1 wypadają często. Im wyższa rzadkość, tym mniejsza szansa.",
    types: "TYP ŁUPU", wealth: "BOGACTWO", wealthHint: "Bogactwo określa liczbę pozycji: 1–10.",
    generate: "LOSUJ + WYŚLIJ NA CZAT", loading: "ŁADOWANIE BAZ...", noTypes: "Wybierz co najmniej jeden typ łupu.",
    noLoot: "Brak przedmiotów dla wybranych typów i zakresu rzadkości.", sent: "Łup wysłano na czat sesji.", localOnly: "Łup wygenerowano, ale czat sesji jest niedostępny.",
    result: "WYNIK", name: "NAZWA", cost: "WARTOŚĆ", weight: "WAGA", itemRarity: "RZADKOŚĆ", qty: "ILOŚĆ", caps: "kap.",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function numberValue(value, fallback = 0) {
  const number = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

function clampRarity(value, fallback = 0) {
  return Math.max(0, Math.min(7, Math.round(numberValue(value, fallback))));
}

function stableId(prefix, name, index) {
  return `${prefix}:${String(name || "loot").toLowerCase().replace(/[^a-z0-9а-яіїєąćęłńóśźż]+/gi, "-")}:${index}`;
}

function normalizeInventoryItem(item, index, language) {
  const category = String(item?.category || "").toLowerCase();
  let lootType = "special";
  if (["aid", "food", "beverages"].includes(category)) lootType = "aid";
  else if (category === "junk") lootType = "junk";
  else if (["magazines", "tools", "misc"].includes(category)) lootType = "special";
  else return null;

  const canonicalName = String(item?.name || "Loot");
  const localizedName = item?.localizedName?.[language]
    || item?.localizedName?.en
    || translateInventoryItemName(canonicalName, language)
    || canonicalName;
  const isPipBoy = canonicalName.toLowerCase() === "pip-boy";
  const rarity = isPipBoy ? 7 : clampRarity(item?.rarity, category === "junk" ? 0 : 1);

  return {
    id: stableId("inventory", canonicalName, index),
    name: localizedName,
    canonicalName,
    lootType,
    quantity: 1,
    weight: String(item?.weight ?? "0"),
    cost: String(item?.cost ?? "-"),
    rarity,
    category: item?.category || "misc",
    sourceType: item?.sourceType || "loot",
  };
}

function normalizeWeapons(rows) {
  return rows.map((row, index) => ({
    id: stableId("weapon", row?.name, index),
    name: String(row?.name || "Weapon"),
    canonicalName: String(row?.name || "Weapon"),
    lootType: "weapon",
    quantity: 1,
    weight: String(row?.Weight ?? "0"),
    cost: String(row?.Cost ?? "0"),
    rarity: clampRarity(row?.Rarity, 0),
    category: "weapons",
    sourceType: "weapon",
  })).filter((item) => item.name && item.name !== "Weapon");
}

function normalizeArmor(items, lootType = "armor") {
  return items.map((item, index) => ({
    id: stableId(lootType, item?.name, index),
    name: String(item?.name || (lootType === "mod" ? "Armor Mod" : "Armor")),
    canonicalName: String(item?.name || ""),
    lootType,
    quantity: 1,
    weight: String(item?.weight ?? "0"),
    cost: String(item?.cost ?? "0"),
    rarity: clampRarity(item?.rarity, lootType === "mod" ? 2 : 1),
    category: lootType === "mod" ? "misc" : "armor",
    sourceType: lootType === "mod" ? "armor_mod" : "armor",
  })).filter((item) => item.canonicalName);
}

function rollFoundQuantity(value) {
  const text = String(value || "1").trim();
  const match = text.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (!match) return Math.max(1, Number.parseInt(text, 10) || 1);
  const base = Number(match[1]);
  const bonus = Number(match[2]);
  return Math.max(1, base + Math.floor(Math.random() * (bonus + 1)));
}

function normalizeAmmo(rows) {
  return rows.map((row, index) => ({
    id: stableId("ammo", row?.["Ammo Type"], index),
    name: String(row?.["Ammo Type"] || "Ammo"),
    canonicalName: String(row?.["Ammo Type"] || "Ammo"),
    lootType: "ammo",
    quantityFormula: String(row?.["Quantity Found"] || "1"),
    quantity: 1,
    weight: String(row?.Weight ?? "0"),
    cost: String(row?.Cost ?? "0"),
    rarity: clampRarity(row?.Rarity, 0),
    category: "ammo",
    sourceType: "ammo",
  })).filter((item) => item.canonicalName && item.canonicalName !== "Ammo");
}

function capsEntry(language) {
  const names = { en: "Caps", ru: "Крышки", uk: "Кришки", pl: "Kapsle" };
  return {
    id: "caps:currency",
    name: names[language] || names.en,
    canonicalName: "Caps",
    lootType: "caps",
    quantity: 1,
    weight: "0",
    cost: "1",
    rarity: 0,
    category: "misc",
    sourceType: "caps",
  };
}

function weightedPick(values, weightFor) {
  const total = values.reduce((sum, value) => sum + Math.max(0, Number(weightFor(value)) || 0), 0);
  if (total <= 0) return values[0] || null;
  let roll = Math.random() * total;
  for (const value of values) {
    roll -= Math.max(0, Number(weightFor(value)) || 0);
    if (roll <= 0) return value;
  }
  return values[values.length - 1] || null;
}

function generateOne(pool, enabledTypes, minRarity, maxRarity, usedIds, wealth) {
  const eligible = pool.filter((item) => enabledTypes.has(item.lootType) && item.rarity >= minRarity && item.rarity <= maxRarity);
  if (!eligible.length) return null;

  const rarities = [...new Set(eligible.map((item) => item.rarity))];
  const rarity = weightedPick(rarities, (value) => RARITY_WEIGHTS[value] || 1);
  const atRarity = eligible.filter((item) => item.rarity === rarity);
  const unused = atRarity.filter((item) => !usedIds.has(item.id));
  const candidates = unused.length ? unused : atRarity;
  const base = candidates[Math.floor(Math.random() * candidates.length)];
  if (!base) return null;

  usedIds.add(base.id);
  let quantity = base.lootType === "ammo" ? rollFoundQuantity(base.quantityFormula) : 1;
  if (base.lootType === "caps") {
    const min = 4 + wealth * 2;
    const max = 12 + wealth * 10;
    quantity = min + Math.floor(Math.random() * (max - min + 1));
  }
  return { ...base, quantity };
}

function readSavedFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) || "null");
    if (!raw) return null;
    return {
      minRarity: clampRarity(raw.minRarity, 0),
      maxRarity: clampRarity(raw.maxRarity, 7),
      wealth: Math.max(1, Math.min(10, Number(raw.wealth) || 3)),
      types: Array.isArray(raw.types) ? raw.types.filter((type) => TYPE_IDS.includes(type)) : TYPE_IDS,
    };
  } catch {
    return null;
  }
}

export default function GmLootGenerator({ session = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const saved = useMemo(readSavedFilters, []);
  const [minRarity, setMinRarity] = useState(saved?.minRarity ?? 0);
  const [maxRarity, setMaxRarity] = useState(saved?.maxRarity ?? 7);
  const [wealth, setWealth] = useState(saved?.wealth ?? 3);
  const [enabledTypes, setEnabledTypes] = useState(() => new Set(saved?.types?.length ? saved.types : TYPE_IDS));
  const [dynamicPool, setDynamicPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ minRarity, maxRarity, wealth, types: [...enabledTypes] }));
  }, [minRarity, maxRarity, wealth, enabledTypes]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/weapons.csv").then((response) => response.ok ? response.text() : ""),
      fetch("/Armor.csv").then((response) => response.ok ? response.text() : ""),
      fetch("/Ammo.csv").then((response) => response.ok ? response.text() : ""),
    ]).then(([weaponText, armorText, ammoText]) => {
      if (!active) return;
      const armorDatabase = armorText ? parseArmorDatabase(armorText) : { items: [], mods: [] };
      setDynamicPool([
        ...(weaponText ? normalizeWeapons(parseCSV(weaponText)) : []),
        ...normalizeArmor(armorDatabase.items || [], "armor"),
        ...normalizeArmor(armorDatabase.mods || [], "mod"),
        ...(ammoText ? normalizeAmmo(parseCSV(ammoText)) : []),
      ]);
    }).catch(() => {
      if (active) setDynamicPool([]);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const staticPool = useMemo(() => {
    const items = INVENTORY_DATABASE.map((item, index) => normalizeInventoryItem(item, index, language)).filter(Boolean);
    return [...items, capsEntry(language)];
  }, [language]);
  const pool = useMemo(() => [...dynamicPool, ...staticPool], [dynamicPool, staticPool]);

  const toggleType = (type) => {
    setEnabledTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const changeMin = (value) => {
    const next = clampRarity(value, 0);
    setMinRarity(next);
    if (next > maxRarity) setMaxRarity(next);
  };
  const changeMax = (value) => {
    const next = clampRarity(value, 7);
    setMaxRarity(next);
    if (next < minRarity) setMinRarity(next);
  };

  const generate = async () => {
    setStatus("");
    if (!enabledTypes.size) {
      setResults([]);
      setStatus(copy.noTypes);
      return;
    }

    const usedIds = new Set();
    const next = [];
    for (let index = 0; index < wealth; index += 1) {
      const item = generateOne(pool, enabledTypes, minRarity, maxRarity, usedIds, wealth);
      if (item) next.push(item);
    }

    setResults(next);
    if (!next.length) {
      setStatus(copy.noLoot);
      return;
    }

    if (typeof session?.sendChat === "function") {
      try {
        for (const item of next) {
          await session.sendChat(formatLootChatMessage(item, language));
        }
        setStatus(copy.sent);
      } catch {
        setStatus(copy.localOnly);
      }
    } else {
      setStatus(copy.localOnly);
    }
  };

  return (
    <section className="gm-loot-generator">
      <header className="gm-loot-generator__head">
        <div>
          <div className="pip-bootline">PIP 2D20 // GM</div>
          <h2>[ {copy.title} ]</h2>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <div className="gm-loot-generator__controls">
        <section className="gm-loot-filter-card">
          <strong>{copy.rarity}</strong>
          <div className="gm-loot-rarity-row">
            <label>{copy.from}<select value={minRarity} onChange={(event) => changeMin(event.target.value)}>{Array.from({ length: 8 }, (_, value) => <option key={value} value={value}>R{value}</option>)}</select></label>
            <span>—</span>
            <label>{copy.to}<select value={maxRarity} onChange={(event) => changeMax(event.target.value)}>{Array.from({ length: 8 }, (_, value) => <option key={value} value={value}>R{value}</option>)}</select></label>
          </div>
          <small>{copy.rarityHint}</small>
        </section>

        <section className="gm-loot-filter-card">
          <strong>{copy.wealth}: {wealth}</strong>
          <input type="range" min="1" max="10" step="1" value={wealth} onChange={(event) => setWealth(Math.max(1, Math.min(10, Number(event.target.value) || 1)))} />
          <div className="gm-loot-wealth-scale"><span>1</span><span>10</span></div>
          <small>{copy.wealthHint}</small>
        </section>
      </div>

      <section className="gm-loot-filter-card gm-loot-filter-card--types">
        <strong>{copy.types}</strong>
        <div className="gm-loot-type-grid">
          {TYPE_IDS.map((type) => (
            <label key={type} className={`gm-loot-type-chip${enabledTypes.has(type) ? " is-active" : ""}`}>
              <input type="checkbox" checked={enabledTypes.has(type)} onChange={() => toggleType(type)} />
              <span>{getLootTypeLabel(type, language)}</span>
            </label>
          ))}
        </div>
      </section>

      <button type="button" className="pip-btn is-primary gm-loot-generate" disabled={loading} onClick={generate}>
        {loading ? copy.loading : copy.generate}
      </button>
      {status ? <div className="gm-loot-status">{status}</div> : null}

      {results.length ? (
        <section className="gm-loot-results">
          <h3>[ {copy.result}: {results.length} ]</h3>
          <div className="gm-loot-results__table">
            <div className="gm-loot-results__row is-head"><span>{copy.name}</span><span>{copy.qty}</span><span>{copy.cost}</span><span>{copy.weight}</span><span>{copy.itemRarity}</span></div>
            {results.map((item, index) => (
              <div className="gm-loot-results__row" key={`${item.id}:${index}`}>
                <span><b>{item.name}</b><small>{getLootTypeLabel(item.lootType, language)}</small></span>
                <span>{item.quantity}</span>
                <span>{item.cost}{item.lootType === "caps" ? ` ${copy.caps}` : ""}</span>
                <span>{item.weight}</span>
                <span>R{item.rarity}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
