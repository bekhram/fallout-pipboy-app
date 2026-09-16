import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SETTLEMENT_BUILDINGS,
  SETTLEMENT_BUILDING_LIST,
  SETTLEMENT_GRID_SIZE,
  settlementBuildingName,
} from "../../data/settlement/buildings.js";
import { calculateSettlementStats, formatBuildTime } from "../../utils/settlementEconomy.js";
import smallHouseAsset from "../../assets/settlement/small_house.png";
import "./settlement.css";

const BUILDING_ICONS = {
  crop_field: "🌾",
  water_pump: "💧",
  generator: "⚡",
  workshop: "🔧",
  trading_post: "¤",
  clinic: "+",
  guard_post: "▲",
  turret: "⌖",
};

const COPY = {
  en: { back: "WORLD MAP", build: "BUILD", cancel: "CANCEL", materials: "Materials", caps: "Caps", food: "Food", water: "Water", power: "Power", population: "Population", defense: "Defense", happiness: "Happiness", construction: "Construction", cannotPlace: "Cannot place here", insufficient: "Not enough resources", tapMap: "Choose a free area on the map", empty: "Choose a building below", manage: "BUILDING", move: "MOVE", demolish: "DEMOLISH", repair: "REPAIR", condition: "Condition", moving: "Choose a new location", active: "Active", building: "Building", people: "PEOPLE", unassigned: "Unassigned", workers: "Workers", needsWorker: "Needs worker" },
  ru: { back: "ГЛОБАЛЬНАЯ КАРТА", build: "СТРОИТЬ", cancel: "ОТМЕНА", materials: "Материалы", caps: "Крышки", food: "Еда", water: "Вода", power: "Энергия", population: "Население", defense: "Защита", happiness: "Счастье", construction: "Строительство", cannotPlace: "Здесь строить нельзя", insufficient: "Недостаточно ресурсов", tapMap: "Выберите свободное место на карте", empty: "Выберите постройку снизу", manage: "ПОСТРОЙКА", move: "ПЕРЕМЕСТИТЬ", demolish: "СНЕСТИ", repair: "РЕМОНТ", condition: "Состояние", moving: "Выберите новое место", active: "Работает", building: "Строится", people: "ЖИТЕЛИ", unassigned: "Не назначен", workers: "Работники", needsWorker: "Нужен работник" },
  uk: { back: "ГЛОБАЛЬНА МАПА", build: "БУДУВАТИ", cancel: "СКАСУВАТИ", materials: "Матеріали", caps: "Кришки", food: "Їжа", water: "Вода", power: "Енергія", population: "Населення", defense: "Захист", happiness: "Щастя", construction: "Будівництво", cannotPlace: "Тут будувати не можна", insufficient: "Недостатньо ресурсів", tapMap: "Оберіть вільне місце на мапі", empty: "Оберіть споруду знизу", manage: "СПОРУДА", move: "ПЕРЕМІСТИТИ", demolish: "ЗНЕСТИ", repair: "РЕМОНТ", condition: "Стан", moving: "Оберіть нове місце", active: "Працює", building: "Будується", people: "МЕШКАНЦІ", unassigned: "Не призначено", workers: "Працівники", needsWorker: "Потрібен працівник" },
  pl: { back: "MAPA ŚWIATA", build: "BUDUJ", cancel: "ANULUJ", materials: "Materiały", caps: "Kapsle", food: "Żywność", water: "Woda", power: "Energia", population: "Ludność", defense: "Obrona", happiness: "Szczęście", construction: "Budowa", cannotPlace: "Nie można tu budować", insufficient: "Za mało zasobów", tapMap: "Wybierz wolne miejsce na mapie", empty: "Wybierz budynek poniżej", manage: "BUDYNEK", move: "PRZENIEŚ", demolish: "ROZBIERZ", repair: "NAPRAW", condition: "Stan", moving: "Wybierz nowe miejsce", active: "Aktywny", building: "W budowie", people: "MIESZKAŃCY", unassigned: "Nieprzydzielony", workers: "Pracownicy", needsWorker: "Wymaga pracownika" },
};

function occupies(building, x, y) {
  const def = SETTLEMENT_BUILDINGS[building.type];
  return Boolean(def && x >= building.x && y >= building.y && x < building.x + def.footprint.width && y < building.y + def.footprint.height);
}

function canPlace(settlement, def, x, y, ignoreBuildingId = null) {
  if (!def || x < 0 || y < 0 || x + def.footprint.width > SETTLEMENT_GRID_SIZE || y + def.footprint.height > SETTLEMENT_GRID_SIZE) return false;
  for (let yy = y; yy < y + def.footprint.height; yy += 1) {
    for (let xx = x; xx < x + def.footprint.width; xx += 1) {
      if ((settlement.buildings || []).some((building) => building.id !== ignoreBuildingId && occupies(building, xx, yy))) return false;
    }
  }
  return true;
}

function BuildingVisual({ building, def, language, staffed }) {
  if (building.state === "construction") {
    return <div className="settlement-construction-scaffold"><span>🛠</span><small>{formatBuildTime(Number(building.completesAt) - Date.now())}</small></div>;
  }
  if (building.type === "small_house") return <img src={smallHouseAsset} alt={settlementBuildingName(def, language)} draggable="false" />;
  return <div className={`settlement-generic-building settlement-generic-building--${building.type} ${staffed === false ? "is-unstaffed" : ""}`}>{BUILDING_ICONS[building.type] || "⌂"}</div>;
}

function getRepairCost(def, condition) {
  const missing = Math.max(0, Math.min(1, (100 - Number(condition ?? 100)) / 100));
  return {
    materials: Math.ceil(Number(def?.cost?.materials || 0) * missing * 0.5),
    caps: Math.ceil(Number(def?.cost?.caps || 0) * missing * 0.5),
  };
}

export default function SettlementScreen({ settlement, onUpdate, onBack }) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const text = COPY[language] || COPY.en;
  const [selectedType, setSelectedType] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [movingBuildingId, setMovingBuildingId] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [notice, setNotice] = useState("");
  const stats = useMemo(() => calculateSettlementStats(settlement), [settlement]);
  const selectedDef = selectedType ? SETTLEMENT_BUILDINGS[selectedType] : null;
  const selectedBuilding = (settlement.buildings || []).find((building) => building.id === selectedBuildingId) || null;
  const movingBuilding = (settlement.buildings || []).find((building) => building.id === movingBuildingId) || null;
  const movingDef = movingBuilding ? SETTLEMENT_BUILDINGS[movingBuilding.type] : null;
  const placementDef = movingDef || selectedDef;
  const placementValid = hoverCell && placementDef ? canPlace(settlement, placementDef, hoverCell.x, hoverCell.y, movingBuildingId) : false;
  const resource = (key) => Math.floor(Number(settlement.resources?.[key] || 0));
  const enoughResources = selectedDef ? resource("materials") >= Number(selectedDef.cost?.materials || 0) && resource("caps") >= Number(selectedDef.cost?.caps || 0) : true;
  const assignableBuildings = (settlement.buildings || []).filter((building) => building.state === "active" && Number(SETTLEMENT_BUILDINGS[building.type]?.workersRequired || 0) > 0);

  function createBuildingAt(x, y) {
    if (!selectedDef) return;
    if (!canPlace(settlement, selectedDef, x, y)) { setNotice(text.cannotPlace); return; }
    if (!enoughResources) { setNotice(text.insufficient); return; }
    const now = Date.now();
    onUpdate((current) => ({
      ...current,
      resources: {
        ...current.resources,
        materials: Math.max(0, Number(current.resources?.materials || 0) - Number(selectedDef.cost?.materials || 0)),
        caps: Math.max(0, Number(current.resources?.caps || 0) - Number(selectedDef.cost?.caps || 0)),
      },
      buildings: [...(current.buildings || []), { id: `building_${now}_${Math.random().toString(36).slice(2, 7)}`, type: selectedDef.id, x, y, rotation: 0, state: "construction", condition: 100, startedAt: now, completesAt: now + selectedDef.buildTimeMs }],
    }));
    setSelectedType(null);
    setHoverCell(null);
    setNotice("");
  }

  function moveBuildingTo(x, y) {
    if (!movingBuilding || !movingDef) return;
    if (!canPlace(settlement, movingDef, x, y, movingBuilding.id)) { setNotice(text.cannotPlace); return; }
    onUpdate((current) => ({ ...current, buildings: (current.buildings || []).map((building) => building.id === movingBuilding.id ? { ...building, x, y } : building) }));
    setMovingBuildingId(null);
    setSelectedBuildingId(movingBuilding.id);
    setHoverCell(null);
    setNotice("");
  }

  function handleCellClick(x, y) {
    setHoverCell({ x, y });
    if (movingBuildingId) { moveBuildingTo(x, y); return; }
    if (selectedType) createBuildingAt(x, y);
  }

  function demolishSelected() {
    if (!selectedBuilding) return;
    const def = SETTLEMENT_BUILDINGS[selectedBuilding.type];
    if (!def) return;
    const refundRate = selectedBuilding.state === "construction" ? 0.75 : 0.5;
    const refundMaterials = Math.floor(Number(def.cost?.materials || 0) * refundRate);
    const refundCaps = Math.floor(Number(def.cost?.caps || 0) * refundRate);
    onUpdate((current) => ({
      ...current,
      resources: { ...current.resources, materials: Number(current.resources?.materials || 0) + refundMaterials, caps: Number(current.resources?.caps || 0) + refundCaps },
      buildings: (current.buildings || []).filter((building) => building.id !== selectedBuilding.id),
      settlers: (current.settlers || []).map((settler) => settler.assignedBuildingId === selectedBuilding.id ? { ...settler, assignedBuildingId: null, role: "unassigned", status: "idle" } : settler),
    }));
    setSelectedBuildingId(null);
  }

  function repairSelected() {
    if (!selectedBuilding) return;
    const def = SETTLEMENT_BUILDINGS[selectedBuilding.type];
    const cost = getRepairCost(def, selectedBuilding.condition);
    if (resource("materials") < cost.materials || resource("caps") < cost.caps) { setNotice(text.insufficient); return; }
    onUpdate((current) => ({
      ...current,
      resources: { ...current.resources, materials: Math.max(0, Number(current.resources?.materials || 0) - cost.materials), caps: Math.max(0, Number(current.resources?.caps || 0) - cost.caps) },
      buildings: (current.buildings || []).map((building) => building.id === selectedBuilding.id ? { ...building, condition: 100 } : building),
    }));
  }

  function assignSettler(settlerId, buildingId) {
    onUpdate((current) => ({
      ...current,
      settlers: (current.settlers || []).map((settler) => {
        if (settler.id !== settlerId) return settler;
        const building = (current.buildings || []).find((item) => item.id === buildingId);
        const def = building ? SETTLEMENT_BUILDINGS[building.type] : null;
        return {
          ...settler,
          assignedBuildingId: buildingId || null,
          role: def?.category || "unassigned",
          status: buildingId ? "working" : "idle",
        };
      }),
    }));
  }

  const repairCost = selectedBuilding ? getRepairCost(SETTLEMENT_BUILDINGS[selectedBuilding.type], selectedBuilding.condition) : null;

  return (
    <div className="pip-screen settlement-screen">
      <div className="settlement-topbar">
        <button type="button" className="pip-action-button settlement-back" onClick={onBack}>{text.back}</button>
        <div className="settlement-title"><strong>{settlement.name}</strong><span>24 × 24</span></div>
        <div className="settlement-stats">
          <span>👥 {text.population} <b>{resource("population")}/{Math.floor(stats.populationLimit)}</b></span><span>🍲 {text.food} <b>{resource("food")}</b></span><span>💧 {text.water} <b>{resource("water")}</b></span><span>⚡ {text.power} <b>{Math.floor(stats.balance.power)}</b></span><span>🛡 {text.defense} <b>{stats.defense}</b></span><span>☺ {text.happiness} <b>{resource("happiness")}%</b></span><span>⚙ {text.materials} <b>{resource("materials")}</b></span><span>● {text.caps} <b>{resource("caps")}</b></span>
        </div>
      </div>

      <div className="settlement-layout">
        <div className="settlement-map-wrap">
          <div className="settlement-map" onMouseLeave={() => setHoverCell(null)}>
            {Array.from({ length: SETTLEMENT_GRID_SIZE * SETTLEMENT_GRID_SIZE }, (_, index) => {
              const x = index % SETTLEMENT_GRID_SIZE;
              const y = Math.floor(index / SETTLEMENT_GRID_SIZE);
              return <button key={`${x}-${y}`} type="button" className="settlement-cell" aria-label={`${x},${y}`} onMouseEnter={() => setHoverCell({ x, y })} onFocus={() => setHoverCell({ x, y })} onClick={() => handleCellClick(x, y)} />;
            })}
            {(settlement.buildings || []).map((building) => {
              const def = SETTLEMENT_BUILDINGS[building.type];
              if (!def) return null;
              const status = stats.buildingStatus?.[building.id];
              return <button type="button" key={building.id} className={`settlement-building ${building.state === "construction" ? "is-construction" : ""} ${selectedBuildingId === building.id ? "is-selected" : ""} ${movingBuildingId === building.id ? "is-moving" : ""} ${status && !status.staffed ? "is-unstaffed" : ""}`} style={{ left: `${building.x / SETTLEMENT_GRID_SIZE * 100}%`, top: `${building.y / SETTLEMENT_GRID_SIZE * 100}%`, width: `${def.footprint.width / SETTLEMENT_GRID_SIZE * 100}%`, height: `${def.footprint.height / SETTLEMENT_GRID_SIZE * 100}%` }} title={settlementBuildingName(def, language)} onClick={(event) => { event.stopPropagation(); if (!selectedType && !movingBuildingId) { setSelectedBuildingId(building.id); setNotice(""); } }}><BuildingVisual building={building} def={def} language={language} staffed={status?.staffed} /></button>;
            })}
            {placementDef && hoverCell ? <div className={`settlement-placement ${placementValid && enoughResources ? "is-valid" : "is-invalid"}`} style={{ left: `${hoverCell.x / SETTLEMENT_GRID_SIZE * 100}%`, top: `${hoverCell.y / SETTLEMENT_GRID_SIZE * 100}%`, width: `${placementDef.footprint.width / SETTLEMENT_GRID_SIZE * 100}%`, height: `${placementDef.footprint.height / SETTLEMENT_GRID_SIZE * 100}%` }} /> : null}
          </div>
          <div className="settlement-map-hint">{notice || (movingBuildingId ? text.moving : selectedDef ? text.tapMap : text.empty)}</div>
        </div>

        <aside className="settlement-summary pip-panel">
          <div className="pip-panel-title">{selectedBuilding ? text.manage : text.build}</div>
          <div className="settlement-balance"><span>{text.food}/day</span><b>{stats.balance.food >= 0 ? "+" : ""}{stats.balance.food.toFixed(1)}</b></div>
          <div className="settlement-balance"><span>{text.water}/day</span><b>{stats.balance.water >= 0 ? "+" : ""}{stats.balance.water.toFixed(1)}</b></div>
          <div className="settlement-balance"><span>{text.materials}/day</span><b>{stats.balance.materials >= 0 ? "+" : ""}{stats.balance.materials.toFixed(1)}</b></div>
          <div className="settlement-balance"><span>{text.caps}/day</span><b>{stats.balance.caps >= 0 ? "+" : ""}{stats.balance.caps.toFixed(1)}</b></div>
          {selectedDef ? <div className="settlement-selected-card"><strong>{settlementBuildingName(selectedDef, language)}</strong><span>{selectedDef.footprint.width}×{selectedDef.footprint.height}</span><span>{text.materials}: {selectedDef.cost?.materials || 0}</span><span>{text.caps}: {selectedDef.cost?.caps || 0}</span><span>{text.construction}: {formatBuildTime(selectedDef.buildTimeMs)}</span>{selectedDef.workersRequired ? <span>{text.workers}: {selectedDef.workersRequired}</span> : null}<button type="button" className="pip-action-button" onClick={() => { setSelectedType(null); setHoverCell(null); }}>{text.cancel}</button></div> : null}
          {selectedBuilding ? <div className="settlement-selected-card"><strong>{settlementBuildingName(SETTLEMENT_BUILDINGS[selectedBuilding.type], language)}</strong><span>{selectedBuilding.state === "construction" ? `${text.building}: ${formatBuildTime(Number(selectedBuilding.completesAt) - Date.now())}` : text.active}</span><span>{text.condition}: {Math.round(Number(selectedBuilding.condition ?? 100))}%</span>{stats.buildingStatus?.[selectedBuilding.id]?.requiredWorkers ? <span>{text.workers}: {stats.buildingStatus[selectedBuilding.id].assignedWorkers}/{stats.buildingStatus[selectedBuilding.id].requiredWorkers}{!stats.buildingStatus[selectedBuilding.id].staffed ? ` · ${text.needsWorker}` : ""}</span> : null}<button type="button" className="pip-action-button" onClick={() => { setMovingBuildingId(selectedBuilding.id); setSelectedType(null); setNotice(""); }}>{text.move}</button>{Number(selectedBuilding.condition ?? 100) < 100 ? <button type="button" className="pip-action-button" onClick={repairSelected}>{text.repair} · ⚙{repairCost.materials} · ●{repairCost.caps}</button> : null}<button type="button" className="pip-action-button settlement-danger" onClick={demolishSelected}>{text.demolish}</button><button type="button" className="pip-action-button" onClick={() => { setSelectedBuildingId(null); setMovingBuildingId(null); }}>{text.cancel}</button></div> : null}

          <div className="settlement-people">
            <div className="pip-panel-title">{text.people}</div>
            {(settlement.settlers || []).map((settler) => <label key={settler.id} className="settlement-person"><span><strong>{settler.name}</strong><small>{settler.role === "unassigned" ? text.unassigned : settler.role}</small></span><select className="pip-input" value={settler.assignedBuildingId || ""} onChange={(event) => assignSettler(settler.id, event.target.value)}><option value="">{text.unassigned}</option>{assignableBuildings.map((building) => <option key={building.id} value={building.id}>{settlementBuildingName(SETTLEMENT_BUILDINGS[building.type], language)}</option>)}</select></label>)}
          </div>
        </aside>
      </div>

      <div className="settlement-build-menu">
        {SETTLEMENT_BUILDING_LIST.map((def) => <button key={def.id} type="button" className={selectedType === def.id ? "is-selected" : ""} onClick={() => { setSelectedType(def.id); setSelectedBuildingId(null); setMovingBuildingId(null); setNotice(""); }}><div className="settlement-build-menu__preview">{def.id === "small_house" ? <img src={smallHouseAsset} alt="" /> : <span>{BUILDING_ICONS[def.id] || "⌂"}</span>}</div><span>{settlementBuildingName(def, language)}</span><small>{def.footprint.width}×{def.footprint.height} · ⚙{def.cost?.materials || 0} · ●{def.cost?.caps || 0}</small></button>)}
      </div>
    </div>
  );
}
