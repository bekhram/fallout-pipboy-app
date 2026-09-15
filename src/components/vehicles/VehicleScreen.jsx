import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  STOCK_VEHICLES,
  VEHICLE_QUALITIES,
  cloneVehicle,
  getVehicleCraftCost,
  getVehicleRepairPlan,
} from "../../data/vehicles.js";
import "./vehicleScreen.css";

const COPY = {
  en: { title: "VEHICLES", garage: "GARAGE", catalog: "CATALOG", custom: "CUSTOM", empty: "No vehicles in garage.", add: "ADD OWNED", craft: "CRAFT", active: "ACTIVE", setActive: "SET ACTIVE", remove: "REMOVE", repair: "REPAIR +5 HP", damage: "DAMAGE -5 HP", resources: "RESOURCES", noResources: "Not enough resources", repairTitle: "REPAIR", location: "Repair location", difficulty: "Difficulty", hp: "HP", scale: "Scale", cover: "Cover", speed: "Speed", passengers: "Passengers", impact: "Impact", qualities: "Qualities", weapons: "Weapons", hitLocations: "D20 LOCATIONS", build: "BUILD CUSTOM", name: "Name", cargo: "Cargo", note: "Vehicle crafting/repair costs are an app rule layer; stock vehicle stats come from the vehicle profiles." },
  ru: { title: "ТРАНСПОРТ", garage: "ГАРАЖ", catalog: "КАТАЛОГ", custom: "СВОЙ ТРАНСПОРТ", empty: "В гараже пока нет транспорта.", add: "ДОБАВИТЬ ИМЕЮЩИЙСЯ", craft: "СКРАФТИТЬ", active: "АКТИВНЫЙ", setActive: "СДЕЛАТЬ АКТИВНЫМ", remove: "УДАЛИТЬ", repair: "РЕМОНТ +5 HP", damage: "УРОН -5 HP", resources: "РЕСУРСЫ", noResources: "Не хватает ресурсов", repairTitle: "РЕМОНТ", location: "Узел ремонта", difficulty: "Сложность", hp: "HP", scale: "Масштаб", cover: "Укрытие", speed: "Скорость", passengers: "Пассажиры", impact: "Таран", qualities: "Свойства", weapons: "Оружие", hitLocations: "ЛОКАЦИИ D20", build: "СОБРАТЬ СВОЙ", name: "Название", cargo: "Груз", note: "Стоимость крафта и ремонта — игровая система приложения; базовые характеристики транспорта взяты из профилей транспорта." },
  uk: { title: "ТРАНСПОРТ", garage: "ГАРАЖ", catalog: "КАТАЛОГ", custom: "ВЛАСНИЙ ТРАНСПОРТ", empty: "У гаражі ще немає транспорту.", add: "ДОДАТИ НАЯВНИЙ", craft: "СКРАФТИТИ", active: "АКТИВНИЙ", setActive: "ЗРОБИТИ АКТИВНИМ", remove: "ВИДАЛИТИ", repair: "РЕМОНТ +5 HP", damage: "ШКОДА -5 HP", resources: "РЕСУРСИ", noResources: "Не вистачає ресурсів", repairTitle: "РЕМОНТ", location: "Вузол ремонту", difficulty: "Складність", hp: "HP", scale: "Масштаб", cover: "Укриття", speed: "Швидкість", passengers: "Пасажири", impact: "Таран", qualities: "Властивості", weapons: "Зброя", hitLocations: "ЛОКАЦІЇ D20", build: "ЗІБРАТИ ВЛАСНИЙ", name: "Назва", cargo: "Вантаж", note: "Вартість крафту й ремонту — система застосунку; базові характеристики взято з профілів транспорту." },
  pl: { title: "POJAZDY", garage: "GARAŻ", catalog: "KATALOG", custom: "WŁASNY POJAZD", empty: "Brak pojazdów w garażu.", add: "DODAJ POSIADANY", craft: "WYTWÓRZ", active: "AKTYWNY", setActive: "USTAW AKTYWNY", remove: "USUŃ", repair: "NAPRAW +5 HP", damage: "OBRAŻENIA -5 HP", resources: "ZASOBY", noResources: "Za mało zasobów", repairTitle: "NAPRAWA", location: "Naprawiana część", difficulty: "Trudność", hp: "HP", scale: "Skala", cover: "Osłona", speed: "Prędkość", passengers: "Pasażerowie", impact: "Uderzenie", qualities: "Cechy", weapons: "Broń", hitLocations: "LOKACJE D20", build: "ZBUDUJ WŁASNY", name: "Nazwa", cargo: "Ładunek", note: "Koszty budowy i naprawy są warstwą zasad aplikacji; statystyki bazowe pochodzą z profili pojazdów." },
};

const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliases = {
  Steel: ["steel", "steel scrap"], Aluminum: ["aluminum", "aluminium"], Rubber: ["rubber"],
  Gears: ["gears", "gear"], Screws: ["screws", "screw"], Springs: ["springs", "spring"],
  Adhesive: ["adhesive"], Oil: ["oil"], Circuitry: ["circuitry", "circuit"], "Nuclear Material": ["nuclear material"],
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function itemQuantity(item) { return Math.max(0, Number(item?.quantity ?? item?.qty ?? 0) || 0); }
function isMaterial(item, material) {
  const key = normalize(item?.canonicalName || item?.name);
  return (aliases[material] || [normalize(material)]).some((name) => key === normalize(name));
}
function countMaterial(items, material) {
  return (items || []).reduce((sum, item) => sum + (isMaterial(item, material) ? itemQuantity(item) : 0), 0);
}
function canPay(items, cost) {
  return Object.entries(cost || {}).every(([material, qty]) => countMaterial(items, material) >= qty);
}
function spendMaterials(items, cost) {
  const remaining = { ...(cost || {}) };
  return (items || []).map((item) => {
    const material = Object.keys(remaining).find((key) => remaining[key] > 0 && isMaterial(item, key));
    if (!material) return item;
    const qty = itemQuantity(item);
    const spent = Math.min(qty, remaining[material]);
    remaining[material] -= spent;
    return { ...item, quantity: String(qty - spent) };
  }).filter((item) => itemQuantity(item) > 0 || !Object.keys(cost || {}).some((key) => isMaterial(item, key)));
}

function Cost({ cost, inventory, labels }) {
  return <div className="vehicle-cost"><strong>{labels.resources}:</strong> {Object.entries(cost || {}).map(([key, qty]) => {
    const have = countMaterial(inventory, key);
    return <span key={key} className={have < qty ? "is-missing" : ""}>{key} {have}/{qty}</span>;
  })}</div>;
}

function VehicleStats({ vehicle, labels }) {
  return (
    <div className="vehicle-stats">
      <span><b>{labels.scale}</b>{vehicle.scale}</span><span><b>{labels.hp}</b>{vehicle.currentHp ?? vehicle.maxHp}/{vehicle.maxHp}</span>
      <span><b>{labels.cover}</b>{vehicle.cover}</span><span><b>{labels.speed}</b>{vehicle.speedZones}/{vehicle.speedMph} mph</span>
      <span><b>{labels.passengers}</b>{vehicle.passengers}</span><span><b>{labels.impact}</b>{vehicle.impact} CD</span><span><b>{labels.cargo}</b>{vehicle.cargo || 0} lb</span>
    </div>
  );
}

function VehicleDetails({ vehicle, labels }) {
  return <>
    <VehicleStats vehicle={vehicle} labels={labels} />
    <p className="vehicle-qualities"><b>{labels.qualities}:</b> {(vehicle.qualities || []).join(", ") || "—"}</p>
    {(vehicle.locations || []).length > 0 && <div className="vehicle-table-wrap"><table className="vehicle-table"><thead><tr><th>D20</th><th>{labels.hitLocations}</th><th>P DR</th><th>E DR</th></tr></thead><tbody>{vehicle.locations.map((entry, index) => <tr key={`${entry.roll}-${index}`}><td>{entry.roll}</td><td>{entry.name}</td><td>{entry.physical}</td><td>{entry.energy}</td></tr>)}</tbody></table></div>}
    {(vehicle.weapons || []).length > 0 && <div><h4>{labels.weapons}</h4>{vehicle.weapons.map((entry, index) => <div className="vehicle-weapon" key={`${entry.name}-${index}`}><b>{entry.name}</b> — {entry.damage} CD {entry.type}; {entry.effects || "—"}; FR {entry.fireRate}; {entry.range}</div>)}</div>}
  </>;
}

const CUSTOM_DEFAULT = { name: "Wasteland Vehicle", scale: 2, maxHp: 25, cover: "2", speedZones: 2, speedMph: 45, passengers: "4", impact: 5, cargo: 100, qualities: ["Cargo", "Exposed"], locations: [], weapons: [] };

export default function VehicleScreen({ character = null, setCharacter = null }) {
  const { i18n } = useTranslation();
  const labels = COPY[langCode(i18n.resolvedLanguage || i18n.language)];
  const [mode, setMode] = useState("garage");
  const [expanded, setExpanded] = useState(null);
  const [repairLocation, setRepairLocation] = useState("Chassis");
  const [draft, setDraft] = useState(CUSTOM_DEFAULT);
  const vehicles = Array.isArray(character?.vehicles) ? character.vehicles : [];
  const inventory = Array.isArray(character?.inventoryItems) ? character.inventoryItems : [];
  const activeId = character?.activeVehicleId;

  const updateCharacter = (updater) => setCharacter?.((prev) => updater(prev || {}));
  const addOwned = (template) => updateCharacter((prev) => ({ ...prev, vehicles: [...(prev.vehicles || []), cloneVehicle(template)] }));
  const craft = (template, custom = false) => {
    const cost = getVehicleCraftCost(template);
    if (!canPay(inventory, cost)) { window.alert(labels.noResources); return; }
    updateCharacter((prev) => ({ ...prev, inventoryItems: spendMaterials(prev.inventoryItems || [], cost), vehicles: [...(prev.vehicles || []), cloneVehicle(template, { custom })] }));
  };
  const setHp = (vehicleId, delta) => updateCharacter((prev) => ({ ...prev, vehicles: (prev.vehicles || []).map((vehicle) => vehicle.id === vehicleId ? { ...vehicle, currentHp: Math.max(0, Math.min(Number(vehicle.maxHp || 1), Number(vehicle.currentHp ?? vehicle.maxHp) + delta)) } : vehicle) }));
  const removeVehicle = (vehicleId) => updateCharacter((prev) => ({ ...prev, vehicles: (prev.vehicles || []).filter((vehicle) => vehicle.id !== vehicleId), activeVehicleId: prev.activeVehicleId === vehicleId ? "" : prev.activeVehicleId }));
  const repair = (vehicle) => {
    const plan = getVehicleRepairPlan(vehicle, repairLocation);
    if (plan.restore <= 0) return;
    if (!canPay(inventory, plan.cost)) { window.alert(labels.noResources); return; }
    updateCharacter((prev) => ({ ...prev, inventoryItems: spendMaterials(prev.inventoryItems || [], plan.cost), vehicles: (prev.vehicles || []).map((entry) => entry.id === vehicle.id ? { ...entry, currentHp: Math.min(Number(entry.maxHp || 1), Number(entry.currentHp || 0) + plan.restore) } : entry) }));
  };

  const preview = useMemo(() => ({ ...CUSTOM_DEFAULT, ...draft, currentHp: Number(draft.maxHp || 1), qualities: draft.qualities || [] }), [draft]);
  const field = (key, type = "number") => <input type={type} value={draft[key]} onChange={(e) => setDraft((prev) => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))} />;

  return <div className="vehicle-screen">
    <section className="pip-panel vehicle-header"><h2>{labels.title}</h2><div className="vehicle-modes"><button className={`pip-btn ${mode === "garage" ? "is-primary" : ""}`} onClick={() => setMode("garage")}>{labels.garage}</button><button className={`pip-btn ${mode === "catalog" ? "is-primary" : ""}`} onClick={() => setMode("catalog")}>{labels.catalog}</button><button className={`pip-btn ${mode === "custom" ? "is-primary" : ""}`} onClick={() => setMode("custom")}>{labels.custom}</button></div><small>{labels.note}</small></section>

    {mode === "garage" && <section>{vehicles.length === 0 && <div className="pip-panel">{labels.empty}</div>}{vehicles.map((vehicle) => {
      const plan = getVehicleRepairPlan(vehicle, repairLocation);
      return <article className={`pip-panel vehicle-card ${activeId === vehicle.id ? "is-active" : ""}`} key={vehicle.id}><div className="vehicle-card-head"><h3>{vehicle.name}</h3>{activeId === vehicle.id && <b>{labels.active}</b>}</div><VehicleStats vehicle={vehicle} labels={labels}/><div className="vehicle-actions"><button className="pip-btn" onClick={() => updateCharacter((prev) => ({ ...prev, activeVehicleId: vehicle.id }))}>{labels.setActive}</button><button className="pip-btn" onClick={() => setHp(vehicle.id, -5)}>{labels.damage}</button><button className="pip-btn" onClick={() => setExpanded(expanded === vehicle.id ? null : vehicle.id)}>{expanded === vehicle.id ? "▲" : "▼"}</button><button className="pip-btn" onClick={() => removeVehicle(vehicle.id)}>{labels.remove}</button></div>{expanded === vehicle.id && <div className="vehicle-detail"><VehicleDetails vehicle={vehicle} labels={labels}/><div className="vehicle-repair"><h4>{labels.repairTitle}</h4><label>{labels.location}<select value={repairLocation} onChange={(e) => setRepairLocation(e.target.value)}>{["Chassis", ...(vehicle.locations || []).map((entry) => entry.name).filter((name, index, all) => all.indexOf(name) === index)].map((name) => <option key={name}>{name}</option>)}</select></label><p>{labels.difficulty}: D{plan.difficulty} · +{plan.restore} HP</p><Cost cost={plan.cost} inventory={inventory} labels={labels}/><button className="pip-btn is-primary" disabled={plan.restore <= 0 || !canPay(inventory, plan.cost)} onClick={() => repair(vehicle)}>{labels.repair}</button></div></div>}</article>;
    })}</section>}

    {mode === "catalog" && <section className="vehicle-catalog">{STOCK_VEHICLES.map((vehicle) => { const cost = getVehicleCraftCost(vehicle); return <article className="pip-panel vehicle-card" key={vehicle.id}><h3>{vehicle.name}</h3><VehicleDetails vehicle={{ ...vehicle, currentHp: vehicle.maxHp }} labels={labels}/><Cost cost={cost} inventory={inventory} labels={labels}/><div className="vehicle-actions"><button className="pip-btn" onClick={() => addOwned(vehicle)}>{labels.add}</button><button className="pip-btn is-primary" disabled={!canPay(inventory, cost)} onClick={() => craft(vehicle)}>{labels.craft}</button></div></article>; })}</section>}

    {mode === "custom" && <section className="pip-panel vehicle-builder"><h3>{labels.custom}</h3><div className="vehicle-form"><label>{labels.name}{field("name", "text")}</label><label>{labels.scale}{field("scale")}</label><label>Max HP{field("maxHp")}</label><label>{labels.cover}{field("cover", "text")}</label><label>Speed zones{field("speedZones")}</label><label>mph{field("speedMph")}</label><label>{labels.passengers}{field("passengers", "text")}</label><label>{labels.impact}{field("impact")}</label><label>{labels.cargo}{field("cargo")}</label></div><div className="vehicle-quality-picker">{VEHICLE_QUALITIES.map((quality) => <label key={quality}><input type="checkbox" checked={(draft.qualities || []).includes(quality)} onChange={() => setDraft((prev) => ({ ...prev, qualities: prev.qualities.includes(quality) ? prev.qualities.filter((entry) => entry !== quality) : [...prev.qualities, quality] }))}/>{quality}</label>)}</div><VehicleStats vehicle={preview} labels={labels}/><Cost cost={getVehicleCraftCost(preview)} inventory={inventory} labels={labels}/><button className="pip-btn is-primary" disabled={!String(draft.name || "").trim() || !canPay(inventory, getVehicleCraftCost(preview))} onClick={() => craft(preview, true)}>{labels.build}</button></section>}
  </div>;
}
