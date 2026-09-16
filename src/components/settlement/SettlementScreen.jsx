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
import cropFieldAsset from "../../assets/settlement/crop_field.png";
import waterTowerAsset from "../../assets/settlement/water_tower.png";
import generatorAsset from "../../assets/settlement/generator.png";
import workshopAsset from "../../assets/settlement/workshop.png";
import tradingPostAsset from "../../assets/settlement/trading_post.png";
import clinicAsset from "../../assets/settlement/clinic.png";
import watchtowerAsset from "../../assets/settlement/watchtower.png";
import turretAsset from "../../assets/settlement/turret.png";
import constructionSmallAsset from "../../assets/settlement/construction_small.png";
import constructionMediumAsset from "../../assets/settlement/construction_medium.png";
import "./settlement.css";

const ASSETS = {
  "small_house.png": smallHouseAsset,
  "crop_field.png": cropFieldAsset,
  "water_tower.png": waterTowerAsset,
  "generator.png": generatorAsset,
  "workshop.png": workshopAsset,
  "trading_post.png": tradingPostAsset,
  "clinic.png": clinicAsset,
  "watchtower.png": watchtowerAsset,
  "turret.png": turretAsset,
};

const CONSTRUCTION_ASSETS = {
  small: constructionSmallAsset,
  medium: constructionMediumAsset,
  large: constructionMediumAsset,
};

const COPY = {
  en: { back: "WORLD MAP", build: "BUILD", cancel: "CANCEL", materials: "Materials", caps: "Caps", food: "Food", water: "Water", power: "Power", population: "Population", defense: "Defense", happiness: "Happiness", construction: "Construction", cannotPlace: "Cannot place here", insufficient: "Not enough resources", tapMap: "Choose a free area on the map", empty: "Choose a building below" },
  ru: { back: "ГЛОБАЛЬНАЯ КАРТА", build: "СТРОИТЬ", cancel: "ОТМЕНА", materials: "Материалы", caps: "Крышки", food: "Еда", water: "Вода", power: "Энергия", population: "Население", defense: "Защита", happiness: "Счастье", construction: "Строительство", cannotPlace: "Здесь строить нельзя", insufficient: "Недостаточно ресурсов", tapMap: "Выберите свободное место на карте", empty: "Выберите постройку снизу" },
  uk: { back: "ГЛОБАЛЬНА МАПА", build: "БУДУВАТИ", cancel: "СКАСУВАТИ", materials: "Матеріали", caps: "Кришки", food: "Їжа", water: "Вода", power: "Енергія", population: "Населення", defense: "Захист", happiness: "Щастя", construction: "Будівництво", cannotPlace: "Тут будувати не можна", insufficient: "Недостатньо ресурсів", tapMap: "Оберіть вільне місце на мапі", empty: "Оберіть споруду знизу" },
  pl: { back: "MAPA ŚWIATA", build: "BUDUJ", cancel: "ANULUJ", materials: "Materiały", caps: "Kapsle", food: "Żywność", water: "Woda", power: "Energia", population: "Ludność", defense: "Obrona", happiness: "Szczęście", construction: "Budowa", cannotPlace: "Nie można tu budować", insufficient: "Za mało zasobów", tapMap: "Wybierz wolne miejsce na mapie", empty: "Wybierz budynek poniżej" },
};

function occupies(building, x, y) {
  const def = SETTLEMENT_BUILDINGS[building.type];
  if (!def) return false;
  return x >= building.x && y >= building.y && x < building.x + def.footprint.width && y < building.y + def.footprint.height;
}

function canPlace(settlement, def, x, y) {
  if (!def) return false;
  if (x < 0 || y < 0 || x + def.footprint.width > SETTLEMENT_GRID_SIZE || y + def.footprint.height > SETTLEMENT_GRID_SIZE) return false;
  for (let yy = y; yy < y + def.footprint.height; yy += 1) {
    for (let xx = x; xx < x + def.footprint.width; xx += 1) {
      if ((settlement.buildings || []).some((building) => occupies(building, xx, yy))) return false;
    }
  }
  return true;
}

export default function SettlementScreen({ settlement, onUpdate, onBack }) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const text = COPY[language] || COPY.en;
  const [selectedType, setSelectedType] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [notice, setNotice] = useState("");
  const stats = useMemo(() => calculateSettlementStats(settlement), [settlement]);
  const selectedDef = selectedType ? SETTLEMENT_BUILDINGS[selectedType] : null;
  const placementValid = hoverCell && selectedDef ? canPlace(settlement, selectedDef, hoverCell.x, hoverCell.y) : false;

  const resource = (key) => Math.floor(Number(settlement.resources?.[key] || 0));
  const enoughResources = selectedDef ? (
    resource("materials") >= Number(selectedDef.cost?.materials || 0) && resource("caps") >= Number(selectedDef.cost?.caps || 0)
  ) : false;

  function placeBuilding() {
    if (!selectedDef || !hoverCell) return;
    if (!placementValid) { setNotice(text.cannotPlace); return; }
    if (!enoughResources) { setNotice(text.insufficient); return; }
    const now = Date.now();
    onUpdate((current) => ({
      ...current,
      resources: {
        ...current.resources,
        materials: Math.max(0, Number(current.resources?.materials || 0) - Number(selectedDef.cost?.materials || 0)),
        caps: Math.max(0, Number(current.resources?.caps || 0) - Number(selectedDef.cost?.caps || 0)),
      },
      buildings: [
        ...(current.buildings || []),
        {
          id: `building_${now}_${Math.random().toString(36).slice(2, 7)}`,
          type: selectedDef.id,
          x: hoverCell.x,
          y: hoverCell.y,
          rotation: 0,
          state: "construction",
          condition: 100,
          startedAt: now,
          completesAt: now + selectedDef.buildTimeMs,
        },
      ],
    }));
    setSelectedType(null);
    setHoverCell(null);
    setNotice("");
  }

  return (
    <div className="pip-screen settlement-screen">
      <div className="settlement-topbar">
        <button type="button" className="pip-action-button settlement-back" onClick={onBack}>{text.back}</button>
        <div className="settlement-title"><strong>{settlement.name}</strong><span>24 × 24</span></div>
        <div className="settlement-stats">
          <span>👥 {text.population} <b>{resource("population")}/{Math.floor(stats.populationLimit)}</b></span>
          <span>🍲 {text.food} <b>{resource("food")}</b></span>
          <span>💧 {text.water} <b>{resource("water")}</b></span>
          <span>⚡ {text.power} <b>{Math.floor(stats.production.power)}</b></span>
          <span>🛡 {text.defense} <b>{stats.defense}</b></span>
          <span>☺ {text.happiness} <b>{Math.floor(resource("happiness"))}%</b></span>
          <span>⚙ {text.materials} <b>{resource("materials")}</b></span>
          <span>● {text.caps} <b>{resource("caps")}</b></span>
        </div>
      </div>

      <div className="settlement-layout">
        <div className="settlement-map-wrap">
          <div
            className="settlement-map"
            onMouseLeave={() => setHoverCell(null)}
            onClick={placeBuilding}
          >
            {Array.from({ length: SETTLEMENT_GRID_SIZE * SETTLEMENT_GRID_SIZE }, (_, index) => {
              const x = index % SETTLEMENT_GRID_SIZE;
              const y = Math.floor(index / SETTLEMENT_GRID_SIZE);
              return <button key={`${x}-${y}`} type="button" className="settlement-cell" aria-label={`${x},${y}`} onMouseEnter={() => setHoverCell({ x, y })} onFocus={() => setHoverCell({ x, y })} />;
            })}

            {(settlement.buildings || []).map((building) => {
              const def = SETTLEMENT_BUILDINGS[building.type];
              if (!def) return null;
              const underConstruction = building.state === "construction";
              const asset = underConstruction ? CONSTRUCTION_ASSETS[def.constructionSize || "medium"] : ASSETS[def.asset];
              return (
                <div
                  key={building.id}
                  className={`settlement-building ${underConstruction ? "is-construction" : ""}`}
                  style={{
                    left: `${(building.x / SETTLEMENT_GRID_SIZE) * 100}%`,
                    top: `${(building.y / SETTLEMENT_GRID_SIZE) * 100}%`,
                    width: `${(def.footprint.width / SETTLEMENT_GRID_SIZE) * 100}%`,
                    height: `${(def.footprint.height / SETTLEMENT_GRID_SIZE) * 100}%`,
                  }}
                  title={settlementBuildingName(def, language)}
                >
                  <img src={asset} alt="" draggable="false" />
                  {underConstruction ? <span className="settlement-build-timer">{formatBuildTime(Number(building.completesAt) - Date.now())}</span> : null}
                </div>
              );
            })}

            {selectedDef && hoverCell ? (
              <div
                className={`settlement-placement ${placementValid && enoughResources ? "is-valid" : "is-invalid"}`}
                style={{
                  left: `${(hoverCell.x / SETTLEMENT_GRID_SIZE) * 100}%`,
                  top: `${(hoverCell.y / SETTLEMENT_GRID_SIZE) * 100}%`,
                  width: `${(selectedDef.footprint.width / SETTLEMENT_GRID_SIZE) * 100}%`,
                  height: `${(selectedDef.footprint.height / SETTLEMENT_GRID_SIZE) * 100}%`,
                }}
              />
            ) : null}
          </div>
          <div className="settlement-map-hint">{notice || (selectedDef ? text.tapMap : text.empty)}</div>
        </div>

        <aside className="settlement-summary pip-panel">
          <div className="pip-panel-title">{text.build}</div>
          <div className="settlement-balance"><span>{text.food}/day</span><b>{stats.balance.food >= 0 ? "+" : ""}{stats.balance.food.toFixed(1)}</b></div>
          <div className="settlement-balance"><span>{text.water}/day</span><b>{stats.balance.water >= 0 ? "+" : ""}{stats.balance.water.toFixed(1)}</b></div>
          <div className="settlement-balance"><span>{text.materials}/day</span><b>+{stats.balance.materials.toFixed(1)}</b></div>
          <div className="settlement-balance"><span>{text.caps}/day</span><b>+{stats.balance.caps.toFixed(1)}</b></div>
          {selectedDef ? (
            <div className="settlement-selected-card">
              <strong>{settlementBuildingName(selectedDef, language)}</strong>
              <span>{selectedDef.footprint.width}×{selectedDef.footprint.height}</span>
              <span>{text.materials}: {selectedDef.cost?.materials || 0}</span>
              <span>{text.caps}: {selectedDef.cost?.caps || 0}</span>
              <span>{text.construction}: {formatBuildTime(selectedDef.buildTimeMs)}</span>
              <button type="button" className="pip-action-button" onClick={() => { setSelectedType(null); setHoverCell(null); }}>{text.cancel}</button>
            </div>
          ) : null}
        </aside>
      </div>

      <div className="settlement-build-menu">
        {SETTLEMENT_BUILDING_LIST.map((def) => (
          <button key={def.id} type="button" className={selectedType === def.id ? "is-selected" : ""} onClick={() => { setSelectedType(def.id); setNotice(""); }}>
            <img src={ASSETS[def.asset]} alt="" />
            <span>{settlementBuildingName(def, language)}</span>
            <small>{def.footprint.width}×{def.footprint.height} · ⚙{def.cost?.materials || 0} · ●{def.cost?.caps || 0}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
