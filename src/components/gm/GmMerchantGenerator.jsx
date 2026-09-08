import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_DATABASE } from "../../data/inventoryDatabase.js";
import { translateInventoryItemName } from "../../data/inventoryLocalization.js";
import { getWeaponModGroups } from "../../data/weaponMods.js";
import { parseCSV } from "../../utils/csvParser.js";
import { parseArmorDatabase } from "../../utils/armorDatabase.js";
import {
  MERCHANT_TYPES,
  clampMerchantRarity,
  getMerchantTypeLabel,
  merchantAcceptsItem,
  merchantBuyPrice,
  merchantItemRarity,
} from "../../utils/merchantSystem.js";
import "./gmMerchantGenerator.css";

const FILTER_KEY = "pip2d20_gm_merchant_filters_v1";
const RARITY_WEIGHTS = [100, 100, 60, 35, 20, 10, 5, 2];
const NAMES = [
  "Mara Voss", "Hank Mercer", "Nora Pike", "Eli Cross", "June Calder", "Rook Mason",
  "Tess Ward", "Silas Reed", "Ivy Boone", "Milo Crane", "Ada Knox", "Cole Danner",
  "Rhea Flint", "Gus Harper", "Mae Hollow", "Vera Sloan", "Otis Bell", "Lena Crow",
];

const COPY = {
  en: {
    title: "MERCHANT GENERATOR", subtitle: "Create a shared session merchant with persistent stock and caps.",
    type: "MERCHANT TYPE", rarity: "RARITY", from: "MIN", to: "MAX", wealth: "WEALTH",
    wealthHint: "Higher wealth means more stock and more starting caps.", generate: "GENERATE MERCHANT",
    trade: "TRADE / SEND TO CHAT", loading: "LOADING DATABASES...", noLoot: "No goods match this merchant and rarity range.",
    created: "Merchant created for the whole session.", createFailed: "Could not create merchant in the session.",
    offerSent: "Merchant offer sent to chat.", offerFailed: "Could not send merchant offer.", stock: "STOCK",
    caps: "CAPS", items: "ITEMS", name: "NAME", qty: "QTY", price: "PRICE", itemRarity: "RARITY",
  },
  ru: {
    title: "ГЕНЕРАТОР ТОРГОВЦЕВ", subtitle: "Создаёт общего для всей сессии торговца с единым ассортиментом и кассой.",
    type: "ТИП ТОРГОВЦА", rarity: "РЕДКОСТЬ", from: "ОТ", to: "ДО", wealth: "БОГАТСТВО",
    wealthHint: "Чем выше богатство, тем больше товаров и стартовых крышек.", generate: "СГЕНЕРИРОВАТЬ ТОРГОВЦА",
    trade: "ТОРГОВАТЬ / ОТПРАВИТЬ В ЧАТ", loading: "ЗАГРУЗКА БАЗ...", noLoot: "Для этого типа торговца и диапазона редкости нет товаров.",
    created: "Торговец создан для всей сессии.", createFailed: "Не удалось создать торговца в сессии.",
    offerSent: "Ассортимент отправлен в чат.", offerFailed: "Не удалось отправить торговца в чат.", stock: "ТОВАРЫ",
    caps: "КРЫШКИ", items: "ПОЗИЦИЙ", name: "НАЗВАНИЕ", qty: "КОЛ-ВО", price: "ЦЕНА", itemRarity: "РЕДКОСТЬ",
  },
  uk: {
    title: "ГЕНЕРАТОР ТОРГОВЦІВ", subtitle: "Створює спільного для всієї сесії торговця з єдиним асортиментом і касою.",
    type: "ТИП ТОРГОВЦЯ", rarity: "РІДКІСТЬ", from: "ВІД", to: "ДО", wealth: "БАГАТСТВО",
    wealthHint: "Що вище багатство, то більше товарів і стартових кришок.", generate: "ЗГЕНЕРУВАТИ ТОРГОВЦЯ",
    trade: "ТОРГУВАТИ / В ЧАТ", loading: "ЗАВАНТАЖЕННЯ БАЗ...", noLoot: "Для цього типу і діапазону рідкості немає товарів.",
    created: "Торговця створено для всієї сесії.", createFailed: "Не вдалося створити торговця.",
    offerSent: "Асортимент надіслано в чат.", offerFailed: "Не вдалося надіслати торговця в чат.", stock: "ТОВАРИ",
    caps: "КРИШКИ", items: "ПОЗИЦІЙ", name: "НАЗВА", qty: "К-СТЬ", price: "ЦІНА", itemRarity: "РІДКІСТЬ",
  },
  pl: {
    title: "GENERATOR HANDLARZY", subtitle: "Tworzy wspólnego dla sesji handlarza ze wspólnym towarem i kapslami.",
    type: "TYP HANDLARZA", rarity: "RZADKOŚĆ", from: "OD", to: "DO", wealth: "BOGACTWO",
    wealthHint: "Większe bogactwo oznacza więcej towaru i kapsli.", generate: "GENERUJ HANDLARZA",
    trade: "HANDLUJ / WYŚLIJ NA CZAT", loading: "ŁADOWANIE BAZ...", noLoot: "Brak towarów dla tego typu i zakresu rzadkości.",
    created: "Handlarz utworzony dla całej sesji.", createFailed: "Nie udało się utworzyć handlarza.",
    offerSent: "Oferta wysłana na czat.", offerFailed: "Nie udało się wysłać oferty.", stock: "TOWAR",
    caps: "KAPSLE", items: "POZYCJE", name: "NAZWA", qty: "ILOŚĆ", price: "CENA", itemRarity: "RZADKOŚĆ",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function stableId(prefix, name, index) {
  return `${prefix}:${String(name || "item").toLowerCase().replace(/[^a-z0-9а-яіїєąćęłńóśźż]+/gi, "-")}:${index}`;
}

function rollFoundQuantity(value) {
  const text = String(value || "1").trim();
  const match = text.match(/^(\d+)\s*\+\s*(\d+)$/);
  if (!match) return Math.max(1, Number.parseInt(text, 10) || 1);
  return Math.max(1, Number(match[1]) + Math.floor(Math.random() * (Number(match[2]) + 1)));
}

function normalizeInventory(item, index, language) {
  const category = String(item?.category || "misc").toLowerCase();
  const canonicalName = String(item?.name || "Item");
  const name = item?.localizedName?.[language]
    || item?.localizedName?.en
    || translateInventoryItemName(canonicalName, language)
    || canonicalName;
  let lootType = "special";
  if (category === "junk") lootType = "junk";
  else if (category === "aid") lootType = "aid";
  else if (category === "food") lootType = "food";
  else if (category === "beverages") lootType = "beverages";
  return {
    id: stableId("inventory", canonicalName, index), name, canonicalName, quantity: 1,
    weight: String(item?.weight ?? "0"), cost: String(item?.cost ?? ""),
    rarity: merchantItemRarity(item, category === "junk" ? 0 : 1), category,
    sourceType: String(item?.sourceType || "loot"), sourceId: item?.sourceId ?? null,
    effect: String(item?.effect || ""), lootType,
  };
}

function normalizeWeapons(rows) {
  return rows.map((row, index) => ({
    id: stableId("weapon", row?.name, index),
    name: String(row?.name || "Weapon"), canonicalName: String(row?.name || "Weapon"), quantity: 1,
    weight: String(row?.Weight ?? "0"), cost: String(row?.Cost ?? "0"), rarity: clampMerchantRarity(row?.Rarity, 0),
    category: "weapons", sourceType: "weapon", sourceId: null, effect: String(row?.Effects || ""), lootType: "weapon",
  })).filter((item) => item.canonicalName !== "Weapon");
}

function weaponSkill(row) {
  const value = String(row?.["Weapon type"] || row?.skill || "").trim().toLowerCase();
  if (value.includes("small")) return "small_guns";
  if (value.includes("energy")) return "energy_weapons";
  return value.replace(/[\s-]+/g, "_");
}

function weaponModRarity(mod) {
  const ranks = String(mod?.perks || "").match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  if (!ranks.length) return 1;
  return clampMerchantRarity(Math.max(...ranks), 1);
}

function normalizeWeaponMods(rows) {
  const unique = new Map();
  for (const row of rows) {
    const groups = getWeaponModGroups({ name: row?.name, skill: weaponSkill(row) }) || {};
    for (const [slot, mods] of Object.entries(groups)) {
      for (const mod of Array.isArray(mods) ? mods : []) {
        const name = String(mod?.name || "Weapon Mod");
        const effect = String(mod?.effect || "");
        const key = `${slot}::${name.toLowerCase()}::${effect.toLowerCase()}`;
        if (unique.has(key)) continue;
        const rarity = weaponModRarity(mod);
        unique.set(key, {
          id: stableId("weapon-mod", `${slot}-${name}`, unique.size),
          name, canonicalName: name, quantity: 1,
          weight: String(mod?.weight ?? "0"), cost: String(mod?.cost ?? "0"), rarity,
          category: "misc", sourceType: "weapon_mod", sourceId: null,
          effect, lootType: "mod", modSlot: slot,
        });
      }
    }
  }
  return [...unique.values()];
}

function normalizeArmor(items, isMod = false) {
  return (Array.isArray(items) ? items : []).map((item, index) => ({
    id: stableId(isMod ? "armor-mod" : "armor", item?.name, index),
    name: String(item?.name || (isMod ? "Armor Mod" : "Armor")), canonicalName: String(item?.name || ""), quantity: 1,
    weight: String(item?.weight ?? "0"), cost: String(item?.cost ?? "0"), rarity: merchantItemRarity(item, isMod ? 2 : 1),
    category: isMod ? "misc" : "armor", sourceType: isMod ? "armor_mod" : "armor", sourceId: item?.id || null,
    effect: String(item?.effects || ""), lootType: isMod ? "mod" : "armor",
  })).filter((item) => item.canonicalName);
}

function normalizeAmmo(rows) {
  return rows.map((row, index) => ({
    id: stableId("ammo", row?.["Ammo Type"], index),
    name: String(row?.["Ammo Type"] || "Ammo"), canonicalName: String(row?.["Ammo Type"] || "Ammo"),
    quantity: 1, quantityFormula: String(row?.["Quantity Found"] || "1"), weight: String(row?.Weight ?? "0"),
    cost: String(row?.Cost ?? "0"), rarity: clampMerchantRarity(row?.Rarity, 0), category: "ammo", sourceType: "ammo",
    sourceId: null, effect: "", lootType: "ammo",
  })).filter((item) => item.canonicalName !== "Ammo");
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

function pickStock(pool, merchantType, minRarity, maxRarity, wealth) {
  const eligible = pool.filter((item) => merchantAcceptsItem(merchantType, item) && item.rarity >= minRarity && item.rarity <= maxRarity);
  if (!eligible.length) return [];
  const targetCount = Math.min(24, 3 + wealth * 2);
  const used = new Set();
  const result = [];

  for (let index = 0; index < targetCount; index += 1) {
    const available = eligible.filter((item) => !used.has(item.id));
    if (!available.length) break;
    const source = available;
    const rarities = [...new Set(source.map((item) => item.rarity))];
    const rarity = weightedPick(rarities, (value) => RARITY_WEIGHTS[value] || 1);
    const candidates = source.filter((item) => item.rarity === rarity);
    const chosen = weightedPick(candidates, (item) => {
      if (merchantType === "gunsmith" && item.category === "ammo") return 0.35;
      return 1;
    });
    if (!chosen) continue;
    used.add(chosen.id);
    const quantity = chosen.category === "ammo" ? rollFoundQuantity(chosen.quantityFormula) : 1;
    result.push({
      ...chosen,
      stockId: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      quantity,
      cost: String(merchantBuyPrice(chosen)),
    });
  }
  return result;
}

function merchantCaps(wealth) {
  const min = 50 + (wealth - 1) * 50;
  const max = Math.min(1000, 100 + (wealth - 1) * 100);
  return Math.max(50, Math.min(1000, min + Math.floor(Math.random() * (Math.max(0, max - min) + 1))));
}

function savedFilters() {
  try {
    const raw = JSON.parse(localStorage.getItem(FILTER_KEY) || "null");
    if (!raw) return null;
    return {
      merchantType: MERCHANT_TYPES.includes(raw.merchantType) ? raw.merchantType : "armorer",
      minRarity: clampMerchantRarity(raw.minRarity, 0), maxRarity: clampMerchantRarity(raw.maxRarity, 7),
      wealth: Math.max(1, Math.min(10, Number(raw.wealth) || 3)),
    };
  } catch { return null; }
}

export default function GmMerchantGenerator({ session = null }) {
  const { i18n } = useTranslation();
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const copy = COPY[language];
  const saved = useMemo(savedFilters, []);
  const [merchantType, setMerchantType] = useState(saved?.merchantType || "armorer");
  const [minRarity, setMinRarity] = useState(saved?.minRarity ?? 0);
  const [maxRarity, setMaxRarity] = useState(saved?.maxRarity ?? 7);
  const [wealth, setWealth] = useState(saved?.wealth ?? 3);
  const [dynamicPool, setDynamicPool] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ merchantType, minRarity, maxRarity, wealth }));
  }, [merchantType, minRarity, maxRarity, wealth]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/weapons.csv").then((response) => response.ok ? response.text() : ""),
      fetch("/Armor.csv").then((response) => response.ok ? response.text() : ""),
      fetch("/Ammo.csv").then((response) => response.ok ? response.text() : ""),
    ]).then(([weaponsText, armorText, ammoText]) => {
      if (!active) return;
      const weaponRows = weaponsText ? parseCSV(weaponsText) : [];
      const armor = armorText ? parseArmorDatabase(armorText) : { items: [], mods: [] };
      setDynamicPool([
        ...normalizeWeapons(weaponRows),
        ...normalizeWeaponMods(weaponRows),
        ...normalizeArmor(armor.items || [], false),
        ...normalizeArmor(armor.mods || [], true),
        ...(ammoText ? normalizeAmmo(parseCSV(ammoText)) : []),
      ]);
    }).catch(() => { if (active) setDynamicPool([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const staticPool = useMemo(
    () => INVENTORY_DATABASE.map((item, index) => normalizeInventory(item, index, language)).filter(Boolean),
    [language]
  );
  const pool = useMemo(() => [...dynamicPool, ...staticPool], [dynamicPool, staticPool]);
  const sharedMerchant = generated ? (session?.merchants || []).find((merchant) => merchant.id === generated.id) || null : null;
  const liveMerchant = sharedMerchant || generated;
  const tradeMerchantId = sharedMerchant?.id || generated?.id || "";

  const changeMin = (value) => {
    const next = clampMerchantRarity(value, 0); setMinRarity(next); if (next > maxRarity) setMaxRarity(next);
  };
  const changeMax = (value) => {
    const next = clampMerchantRarity(value, 7); setMaxRarity(next); if (next < minRarity) setMinRarity(next);
  };

  const generate = () => {
    setStatus("");
    const stock = pickStock(pool, merchantType, minRarity, maxRarity, wealth);
    if (!stock.length) { setGenerated(null); setStatus(copy.noLoot); return; }
    const caps = merchantCaps(wealth);
    const merchant = {
      id: `merchant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: NAMES[Math.floor(Math.random() * NAMES.length)], merchantType, wealth, minRarity, maxRarity,
      caps, initialCaps: caps, stock, createdAt: Date.now(),
    };
    const created = Boolean(session?.createMerchant?.(merchant));
    setGenerated(merchant);
    setStatus(created ? copy.created : copy.createFailed);
  };

  const trade = () => {
    if (!tradeMerchantId) return;
    const sent = Boolean(session?.publishMerchantOffer?.(tradeMerchantId));
    setStatus(sent ? copy.offerSent : copy.offerFailed);
  };

  return <section className="gm-merchant-generator">
    <header className="gm-merchant-generator__head"><div><div className="pip-bootline">PIP 2D20 // GM</div><h2>[ {copy.title} ]</h2><p>{copy.subtitle}</p></div></header>
    <div className="gm-merchant-controls">
      <section className="gm-merchant-card"><strong>{copy.type}</strong><select className="pip-input" value={merchantType} onChange={(event)=>setMerchantType(event.target.value)}>{MERCHANT_TYPES.map((type)=><option key={type} value={type}>{getMerchantTypeLabel(type, language)}</option>)}</select></section>
      <section className="gm-merchant-card"><strong>{copy.rarity}</strong><div className="gm-merchant-rarity"><label>{copy.from}<select value={minRarity} onChange={(event)=>changeMin(event.target.value)}>{Array.from({length:8},(_,value)=><option key={value} value={value}>R{value}</option>)}</select></label><span>—</span><label>{copy.to}<select value={maxRarity} onChange={(event)=>changeMax(event.target.value)}>{Array.from({length:8},(_,value)=><option key={value} value={value}>R{value}</option>)}</select></label></div></section>
      <section className="gm-merchant-card"><strong>{copy.wealth}: {wealth}</strong><input type="range" min="1" max="10" step="1" value={wealth} onChange={(event)=>setWealth(Math.max(1,Math.min(10,Number(event.target.value)||1)))}/><div className="gm-merchant-scale"><span>1</span><span>10</span></div><small>{copy.wealthHint}</small></section>
    </div>
    <div className="gm-merchant-actions"><button type="button" className="pip-btn is-primary" disabled={loading} onClick={generate}>{loading?copy.loading:copy.generate}</button><button type="button" className="pip-btn" disabled={!tradeMerchantId} onClick={trade}>{copy.trade}</button></div>
    {status?<div className="gm-merchant-status">{status}</div>:null}
    {liveMerchant?<section className="gm-merchant-result"><div className="gm-merchant-result__summary"><div><div className="pip-bootline">{getMerchantTypeLabel(liveMerchant.merchantType, language)}</div><h3>{liveMerchant.name}</h3></div><div><strong>💰 {liveMerchant.caps}</strong><span>{copy.caps}</span></div><div><strong>{liveMerchant.stock.length}</strong><span>{copy.items}</span></div></div><h3>[ {copy.stock} ]</h3><div className="gm-merchant-table"><div className="gm-merchant-row is-head"><span>{copy.name}</span><span>{copy.qty}</span><span>{copy.price}</span><span>{copy.itemRarity}</span></div>{liveMerchant.stock.map((item)=><div className="gm-merchant-row" key={item.stockId}><span>{item.name}</span><span>{item.quantity}</span><span>💰 {merchantBuyPrice(item)}</span><span>R{item.rarity}</span></div>)}</div></section>:null}
  </section>;
}
