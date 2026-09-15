import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { WEAPON_EFFECT_OPTIONS, WEAPON_QUALITY_OPTIONS } from "../../constants.js";
import { createWeaponRoll } from "../../utils/dice.js";
import { applyWeaponMods, getWeaponModGroups, MOD_SLOT_LABELS } from "../../data/weaponMods.js";
import "./vehicleCombatPanel.css";

const COPY = {
  en: { title: "VEHICLE WEAPONS", vehicle: "Vehicle", attack: "ATTACK", aim: "AIM", fireRate: "FIRE RATE", effects: "Effects", qualities: "Qualities", mods: "Weapon mods", edit: "EDIT", close: "CLOSE", add: "ADD WEAPON", noWeapons: "No mounted weapons", noVehicles: "No vehicles in garage", damage: "Damage", rate: "Fire Rate", type: "Damage type", range: "Range", skill: "Skill", name: "Name", noMods: "No compatible mods" },
  ru: { title: "ОРУЖИЕ ТРАНСПОРТА", vehicle: "Транспорт", attack: "АТАКА", aim: "ПРИЦЕЛИТЬСЯ", fireRate: "СКОРОСТРЕЛЬНОСТЬ", effects: "Эффекты", qualities: "Качества", mods: "Моды оружия", edit: "НАСТРОИТЬ", close: "ЗАКРЫТЬ", add: "ДОБАВИТЬ ОРУЖИЕ", noWeapons: "Нет установленного оружия", noVehicles: "В гараже нет транспорта", damage: "Урон", rate: "Скорострельность", type: "Тип урона", range: "Дальность", skill: "Навык", name: "Название", noMods: "Совместимых модов нет" },
  uk: { title: "ЗБРОЯ ТРАНСПОРТУ", vehicle: "Транспорт", attack: "АТАКА", aim: "ПРИЦІЛИТИСЯ", fireRate: "СКОРОСТРІЛЬНІСТЬ", effects: "Ефекти", qualities: "Якості", mods: "Моди зброї", edit: "НАЛАШТУВАТИ", close: "ЗАКРИТИ", add: "ДОДАТИ ЗБРОЮ", noWeapons: "Немає встановленої зброї", noVehicles: "У гаражі немає транспорту", damage: "Шкода", rate: "Скорострільність", type: "Тип шкоди", range: "Дальність", skill: "Навичка", name: "Назва", noMods: "Сумісних модів немає" },
  pl: { title: "BROŃ POJAZDU", vehicle: "Pojazd", attack: "ATAK", aim: "CELOWANIE", fireRate: "SZYBKOSTRZELNOŚĆ", effects: "Efekty", qualities: "Cechy", mods: "Mody broni", edit: "EDYTUJ", close: "ZAMKNIJ", add: "DODAJ BROŃ", noWeapons: "Brak zamontowanej broni", noVehicles: "Brak pojazdów w garażu", damage: "Obrażenia", rate: "Szybkostrzelność", type: "Typ obrażeń", range: "Zasięg", skill: "Umiejętność", name: "Nazwa", noMods: "Brak zgodnych modów" },
};

const norm = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : String(value || "").split(/[,;]/).map((v) => v.trim()).filter(Boolean);
const lang = (value) => { const code = String(value || "en").toLowerCase().split("-")[0]; return COPY[code] ? code : "en"; };

function inferSkill(weapon) {
  const name = String(weapon?.name || "").toLowerCase();
  if (name.includes("laser")) return "Energy Weapons";
  return weapon?.skill || "Big Guns";
}

function baseName(weapon) {
  const name = String(weapon?.name || "Mounted Weapon");
  if (/minigun/i.test(name)) return "Minigun";
  if (/gatling laser/i.test(name)) return "Gatling Laser";
  return weapon?.modBaseName || name;
}

function normalizeWeapon(weapon) {
  const base = {
    ...weapon,
    name: baseName(weapon),
    skill: inferSkill(weapon),
    damage: Number(weapon?.damage || 0),
    rate: Number(weapon?.rate ?? weapon?.fireRate ?? 0),
    effects: list(weapon?.effects),
    qualities: list(weapon?.qualities),
    mods: { ...(weapon?.mods || {}) },
  };
  const modified = applyWeaponMods(base);
  return { ...modified, name: weapon?.name || modified.name };
}

function translated(option, t, field) {
  const key = field === "name" ? option.nameKey : option.descriptionKey;
  const fallback = field === "name" ? option.name : option.description;
  if (!key) return fallback || "";
  const value = t(key);
  return value === key ? fallback || "" : value;
}

function Chips({ values, options, t }) {
  const [active, setActive] = useState(null);
  const items = list(values);
  const optionFor = (value) => options.find((option) => norm(option.key) === norm(value) || norm(option.name) === norm(value));
  return <div className="vehicle-combat-properties">
    <div className="vehicle-combat-chips">{items.map((value, index) => { const option = optionFor(value); return <button type="button" key={`${value}-${index}`} onClick={() => setActive(active === index ? null : index)}>{option ? translated(option, t, "name") : value}</button>; })}</div>
    {active !== null && optionFor(items[active]) ? <div className="vehicle-combat-description"><b>{translated(optionFor(items[active]), t, "name")}</b><span>{translated(optionFor(items[active]), t, "description")}</span></div> : null}
  </div>;
}

function WeaponEditor({ weapon, labels, t, onChange, onClose }) {
  const modSource = { ...weapon, name: baseName(weapon), skill: inferSkill(weapon), rate: Number(weapon?.rate ?? weapon?.fireRate ?? 0) };
  const groups = getWeaponModGroups(modSource);
  const set = (key, value) => onChange({ ...weapon, [key]: value });
  const toggle = (key, value) => {
    const current = list(weapon?.[key]);
    const exists = current.some((item) => norm(item) === norm(value));
    set(key, exists ? current.filter((item) => norm(item) !== norm(value)) : [...current, value]);
  };
  const slots = Object.entries(groups).filter(([, mods]) => Array.isArray(mods) && mods.length);
  return <div className="vehicle-combat-editor">
    <div className="vehicle-combat-head"><b>{labels.edit}</b><button className="pip-btn" type="button" onClick={onClose}>{labels.close}</button></div>
    <div className="vehicle-combat-fields">
      <label>{labels.name}<input value={weapon.name || ""} onChange={(e) => set("name", e.target.value)} /></label>
      <label>{labels.damage}<input type="number" min="0" value={weapon.damage ?? 0} onChange={(e) => set("damage", Number(e.target.value))} /></label>
      <label>{labels.rate}<input type="number" min="0" value={weapon.fireRate ?? weapon.rate ?? 0} onChange={(e) => set("fireRate", Number(e.target.value))} /></label>
      <label>{labels.type}<select value={weapon.type || "Physical"} onChange={(e) => set("type", e.target.value)}><option>Physical</option><option>Energy</option><option>Radiation</option><option>Poison</option></select></label>
      <label>{labels.range}<select value={weapon.range || "M"} onChange={(e) => set("range", e.target.value)}><option value="C">C</option><option value="M">M</option><option value="L">L</option><option value="E">E</option></select></label>
      <label>{labels.skill}<select value={weapon.skill || inferSkill(weapon)} onChange={(e) => set("skill", e.target.value)}><option>Big Guns</option><option>Energy Weapons</option><option>Small Guns</option><option>Explosives</option></select></label>
    </div>
    <h4>{labels.effects}</h4>
    <div className="vehicle-combat-options">{WEAPON_EFFECT_OPTIONS.map((option) => <label key={option.key}><span><input type="checkbox" checked={list(weapon.effects).some((v) => norm(v) === norm(option.key))} onChange={() => toggle("effects", option.key)} /> {translated(option, t, "name")}</span><small>{translated(option, t, "description")}</small></label>)}</div>
    <h4>{labels.qualities}</h4>
    <div className="vehicle-combat-options">{WEAPON_QUALITY_OPTIONS.map((option) => <label key={option.key}><span><input type="checkbox" checked={list(weapon.qualities).some((v) => norm(v) === norm(option.key))} onChange={() => toggle("qualities", option.key)} /> {translated(option, t, "name")}</span><small>{translated(option, t, "description")}</small></label>)}</div>
    <h4>{labels.mods}</h4>
    {slots.length ? <div className="vehicle-combat-mods">{slots.map(([slot, mods]) => <label key={slot}>{MOD_SLOT_LABELS[slot] || slot}<select value={weapon?.mods?.[slot] || ""} onChange={(e) => onChange({ ...weapon, mods: { ...(weapon.mods || {}), [slot]: e.target.value } })}><option value="">—</option>{mods.map((mod) => <option value={mod.name} key={mod.name}>{mod.name} · {mod.effect}</option>)}</select></label>)}</div> : <small>{labels.noMods}</small>}
  </div>;
}

function WeaponCard({ vehicleId, index, weapon, labels, t, onRoll, onChange }) {
  const [aimed, setAimed] = useState(false);
  const [useRate, setUseRate] = useState(false);
  const [editing, setEditing] = useState(false);
  const calculated = useMemo(() => normalizeWeapon(weapon), [weapon]);
  const inaccurate = list(calculated.qualities).some((v) => norm(v) === "inaccurate");
  const attack = () => {
    const rerolls = aimed && !inaccurate ? 1 : 0;
    const roll = createWeaponRoll({ weapon: { ...calculated, attackContext: { aimed }, perkRerollD20: rerolls }, diceCount: 2, difficulty: 1, useRate: Number(calculated.rate || 0) > 0 && useRate });
    onRoll?.({ ...roll, perkRerollD20: rerolls, attackContext: { aimed }, source: "vehicle", vehicleId, weaponIndex: index });
  };
  return <article className="vehicle-combat-weapon">
    <div className="vehicle-combat-head"><div><h4>{weapon.name}</h4><small>{calculated.damage} CD · {calculated.type} · FR {calculated.rate} · {calculated.range}</small></div><button type="button" className="pip-btn" onClick={() => setEditing((v) => !v)}>⚙</button></div>
    <div><small>{labels.effects}</small><Chips values={calculated.effects} options={WEAPON_EFFECT_OPTIONS} t={t} /></div>
    <div><small>{labels.qualities}</small><Chips values={calculated.qualities} options={WEAPON_QUALITY_OPTIONS} t={t} /></div>
    <div className="vehicle-combat-actions"><label><input type="checkbox" checked={aimed} disabled={inaccurate} onChange={(e) => setAimed(e.target.checked)} /> {labels.aim}</label><label><input type="checkbox" checked={useRate} disabled={Number(calculated.rate || 0) <= 0} onChange={(e) => setUseRate(e.target.checked)} /> {labels.fireRate} +{calculated.rate}</label><button type="button" className="pip-btn is-primary" onClick={attack}>{labels.attack}</button></div>
    {editing ? <WeaponEditor weapon={weapon} labels={labels} t={t} onChange={onChange} onClose={() => setEditing(false)} /> : null}
  </article>;
}

const NEW_WEAPON = { name: "Mounted Weapon", damage: 4, type: "Physical", fireRate: 0, range: "M", skill: "Big Guns", effects: [], qualities: [], mods: {} };

export default function VehicleCombatPanel({ character, setCharacter, onRoll }) {
  const { t, i18n } = useTranslation();
  const labels = COPY[lang(i18n.resolvedLanguage || i18n.language)];
  const vehicles = Array.isArray(character?.vehicles) ? character.vehicles : [];
  const preferred = character?.activeVehicleId && vehicles.some((v) => v.id === character.activeVehicleId) ? character.activeVehicleId : vehicles[0]?.id || "";
  const [vehicleId, setVehicleId] = useState(preferred);
  const selectedId = vehicles.some((v) => v.id === vehicleId) ? vehicleId : preferred;
  const vehicle = vehicles.find((v) => v.id === selectedId);
  const update = (updater) => setCharacter?.((prev) => updater(prev || {}));
  const updateWeapon = (index, next) => update((prev) => ({ ...prev, vehicles: (prev.vehicles || []).map((v) => v.id !== selectedId ? v : { ...v, weapons: (v.weapons || []).map((w, i) => i === index ? next : w) }) }));
  const addWeapon = () => update((prev) => ({ ...prev, vehicles: (prev.vehicles || []).map((v) => v.id !== selectedId ? v : { ...v, weapons: [...(v.weapons || []), { ...NEW_WEAPON }] }) }));

  if (!vehicles.length) return <section className="pip-panel vehicle-combat-panel"><h3>[ {labels.title} ]</h3><small>{labels.noVehicles}</small></section>;
  return <section className="pip-panel vehicle-combat-panel">
    <div className="vehicle-combat-head"><h3>[ {labels.title} ]</h3><button type="button" className="pip-btn" onClick={addWeapon}>+ {labels.add}</button></div>
    <label className="vehicle-combat-vehicle-select">{labels.vehicle}<select value={selectedId} onChange={(e) => setVehicleId(e.target.value)}>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
    {(vehicle?.weapons || []).length ? vehicle.weapons.map((weapon, index) => <WeaponCard key={`${weapon.name}-${index}`} vehicleId={vehicle.id} index={index} weapon={weapon} labels={labels} t={t} onRoll={onRoll} onChange={(next) => updateWeapon(index, next)} />) : <small>{labels.noWeapons}</small>}
  </section>;
}
