import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRandomMap } from "../../data/map/bostonMap.js";
import { MAP_REGIONS, getMapRegion, getRegionName } from "../../data/map/mapRegions.js";
import { maybeRollTravelEncounter } from "../../utils/encounterEngine.js";
import {
  PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT,
  resolveTravelEncounter,
} from "../../utils/travelEncounterResolution.js";
import {
  formatEnvironmentalHazardLog,
  processEnvironmentalExposure,
} from "../../utils/environmentSystem.js";
import {
  PIPBOY_WINTER_TRAVEL_EFFECT_EVENT,
  formatWinterTravelLog,
  readWinterTravelSettings,
  resolveAutomaticWinterExposure,
} from "../../utils/winterTravelAutomation.js";
import MapGrid from "./MapGrid.jsx";
import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import { mapUiText } from "./mapUiText.js";
import { buildDefaultMapState } from "../../constants.js";
import CampsiteWorldPanel from "./CampsiteWorldPanel.jsx";
import SettlementReputationPanel from "./SettlementReputationPanel.jsx";
import WinterTravelResolver from "./WinterTravelResolver.jsx";
import "./map.css";
import bostonMapImage from "../../assets/map/boston-map.png";
import fallout1MapAsset from "../../assets/map/fallout1-southern-california.js";
import fallout2MapAsset from "../../assets/map/fallout2-northern-california.js";
import fallout3MapAsset from "../../assets/map/fallout3-capital-wasteland.js";
import newVegasMapAsset from "../../assets/map/new-vegas-mojave.js";
import {
  findTravelRoute,
  getCell,
  getCellHazards,
  getCellMoveCost,
  getHazardLabelKey,
  getTerrain,
  getTerrainLabelKey,
  revealAround,
} from "../../utils/mapMath.js";
import {
  getLocationsInSector,
  getDistanceInBlocks,
  getDistanceInKm,
  getDirectionArrow,
  getLocationById,
} from "../../utils/worldMap.js";

const MAP_ROWS = 8;
const MAP_COLS = 8;
const VIEW_COLS = 8;
const VIEW_ROWS = 8;
const MAX_LOG_ENTRIES = 50;
const HOURS_IN_DAY = 24;
const DAYS_IN_MONTH = 30;
const MONTHS_IN_YEAR = 12;
const WORLD_ROUTE_MARGIN = 6;
const PIPBOY_SURVIVAL_TRAVEL_EVENT = "pipboy:survival-travel-hours";
const PIPBOY_CAMP_REST_EVENT = "pipboy:survival-camp-rest";
const REPUTATION_STORAGE_KEY = "pip2d20_settlement_reputations_v2";
const REPUTATION_LABELS = ["Hostile","Cautious","Neutral","Friendly","Trusting","Allied"];
const HISTORY_COPY = {
  en:{camp:"Camp",route:"Travel",reputation:"Reputation",survival:"Survival check",routeStopped:"Route stopped",arrived:"Arrived",campApplied:"Camp set",risk:"Risk"},
  ru:{camp:"Лагерь",route:"Путь",reputation:"Репутация",survival:"Проверка Survival",routeStopped:"Маршрут остановлен",arrived:"Прибытие",campApplied:"Лагерь установлен",risk:"Риск"},
  uk:{camp:"Табір",route:"Подорож",reputation:"Репутація",survival:"Перевірка Survival",routeStopped:"Маршрут зупинено",arrived:"Прибуття",campApplied:"Табір встановлено",risk:"Ризик"},
  pl:{camp:"Obóz",route:"Podróż",reputation:"Reputacja",survival:"Test Survival",routeStopped:"Trasa zatrzymana",arrived:"Przybycie",campApplied:"Obóz rozstawiony",risk:"Ryzyko"}
};
function readReputationRows(){if(typeof window==="undefined")return[];try{return JSON.parse(window.localStorage.getItem(REPUTATION_STORAGE_KEY)||"{}")?.rows||[];}catch{return[];}}
function appendActivity(base,entry){const item={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type:entry.type||"note",text:String(entry.text||""),worldHours:Number(entry.worldHours??base.worldTotalHours??0),at:Date.now()};return [item,...(Array.isArray(base.activityLog)?base.activityLog:[])].slice(0,40);}

const REGION_MAP_ASSETS = {
  commonwealth: bostonMapImage,
  california_fo1: fallout1MapAsset,
  california_fo2: fallout2MapAsset,
  capital_wasteland: fallout3MapAsset,
  mojave: newVegasMapAsset,
};

const RESUME_ROUTE_TEXT = {
  en: { title: "ROUTE INTERRUPTED", button: "CONTINUE ROUTE", activeCombat: "Resolve the active combat before continuing the route." },
  ru: { title: "МАРШРУТ ПРЕРВАН", button: "ПРОДОЛЖИТЬ МАРШРУТ", activeCombat: "Сначала завершите активный бой." },
  uk: { title: "МАРШРУТ ПЕРЕРВАНО", button: "ПРОДОВЖИТИ МАРШРУТ", activeCombat: "Спочатку завершіть активний бій." },
  pl: { title: "TRASA PRZERWANA", button: "KONTYNUUJ TRASĘ", activeCombat: "Najpierw zakończ aktywną walkę." },
};

function getPoiIcon(poi) {
  if (!poi) return null;
  const id = poi.id || "";
  if (id.includes("settlement")) return "⌂";
  if (id.includes("metro")) return "M";
  if (id.includes("cave")) return "◖";
  if (id.includes("bunker")) return "B";
  if (id.includes("hospital")) return "H";
  if (id.includes("factory")) return "F";
  if (id.includes("power")) return "⚛︎";
  if (id.includes("police")) return "P";
  if (id.includes("military")) return "★";
  if (id.includes("radio")) return "⌁";
  if (id.includes("bank")) return "$";
  if (id.includes("office")) return "▣";
  if (id.includes("farm")) return "≋";
  if (id.includes("junk")) return "J";
  if (id.includes("red_rocket")) return "R";
  if (id.includes("vault")) return "⚙︎";
  if (id.includes("outpost")) return "▲";
  return "◆";
}

function getWorldLocationClass(location) {
  if (!location) return "pip-map-poi--neutral";
  return location.major ? "pip-map-poi--major" : "pip-map-poi--neutral";
}

function getRandomPoiClass(poi) {
  if (!poi) return "pip-map-poi--neutral";
  if ((poi.danger ?? 0) >= 4) return "pip-map-poi--danger";
  if ((poi.loot ?? 0) >= 4) return "pip-map-poi--loot";
  return "pip-map-poi--neutral";
}

function getWorldDateTime(totalHours, t) {
  const safeHours = Math.max(0, totalHours);
  const totalDays = Math.floor(safeHours / HOURS_IN_DAY);
  const hour = safeHours % HOURS_IN_DAY;
  const monthIndex = Math.floor(totalDays / DAYS_IN_MONTH);
  const day = (totalDays % DAYS_IN_MONTH) + 1;
  const month = (monthIndex % MONTHS_IN_YEAR) + 1;
  const year = Math.floor(monthIndex / MONTHS_IN_YEAR) + 1;
  const timeText = `${String(hour).padStart(2, "0")}:00`;
  const dateText = `${t("mapPanel.day")} ${day}, ${t("mapPanel.month")} ${month}`;
  return { year, month, day, hour, timeText, dateText, fullText: `${dateText} - ${timeText}` };
}

function getSectorKey(offset) {
  return `${offset.x},${offset.y}`;
}

function getPoiDisplayName(poi, t) {
  if (!poi) return t("mapPanel.unknown");
  if (poi.nameKey) {
    const translated = t(poi.nameKey);
    if (translated && translated !== poi.nameKey) return translated;
  }
  if (poi.name) return poi.name;
  if (poi.id) {
    return poi.id
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return t("mapPanel.unknown");
}

function getWorldLocationDisplayName(location, t) {
  return getPoiDisplayName(location, t);
}

function encounterText(encounter, t, fallback) {
  if (!encounter) return null;
  if (encounter.textKey) return t(encounter.textKey);
  return encounter.text || encounter.name || encounter.id || fallback;
}

function createTravelEncounterContext(encounter, description, details = {}) {
  if (!encounter) return null;
  return {
    token: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    id: encounter.id || "travel_encounter",
    type: encounter.type || "encounter",
    text: String(description || encounter.text || encounter.name || encounter.id || "Travel encounter"),
    source: "global_travel",
    generationSource: encounter.generationSource || "app_custom",
    tableName: encounter.tableName || null,
    tableRoll: encounter.roll ?? null,
    weirdRoll: encounter.weirdRoll ?? null,
    rulesSource: encounter.rulesSource || null,
    rulesPage: encounter.rulesPage || null,
    bestiaryRefs: Array.isArray(encounter.bestiaryRefs) ? encounter.bestiaryRefs : [],
    groupSize: encounter.groupSize ?? null,
    autoCombat: encounter.autoCombat === true,
    combatBestiaryIds: Array.isArray(encounter.combatBestiaryIds) ? encounter.combatBestiaryIds : [],
    ...details,
  };
}

function mergeTravelLog(base, entries) {
  const cleanEntries = (entries || [])
    .filter((entry) => entry !== null && entry !== undefined && String(entry).trim())
    .map((entry) => String(entry));
  return [...cleanEntries, ...(Array.isArray(base.travelLog) ? base.travelLog : [])].slice(0, MAX_LOG_ENTRIES);
}

function addHazardExposureHours(bucket, cell, hours) {
  const safeHours = Math.max(0, Number(hours) || 0);
  if (!cell || safeHours <= 0) return;
  for (const hazardId of getCellHazards(cell)) {
    bucket[hazardId] = (Number(bucket[hazardId]) || 0) + safeHours;
  }
}

function dispatchEnvironmentEffects(effects) {
  if (typeof window === "undefined") return;
  for (const effect of effects || []) {
    if (!effect?.resolution) continue;
    window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
      detail: { token: effect.token, resolution: effect.resolution },
    }));
  }
}

function modulo(value, size) {
  return ((value % size) + size) % size;
}

function worldToSectorPosition(worldX, worldY, cols = MAP_COLS, rows = MAP_ROWS) {
  const offset = {
    x: Math.floor(worldX / cols),
    y: Math.floor(worldY / rows),
  };
  return {
    offset,
    local: {
      x: modulo(worldX, cols),
      y: modulo(worldY, rows),
    },
    key: getSectorKey(offset),
  };
}

function getWorldCell(worldX, worldY, cache, cols = MAP_COLS, rows = MAP_ROWS) {
  const position = worldToSectorPosition(worldX, worldY, cols, rows);
  let sectorMap = cache[position.key];
  if (!sectorMap) {
    sectorMap = createRandomMap(rows, cols, position.offset);
    cache[position.key] = sectorMap;
  }
  return {
    ...position,
    map: sectorMap,
    cell: getCell(sectorMap, position.local.x, position.local.y),
  };
}

function findWorldTravelRoute(start, target, cache, cols = MAP_COLS, rows = MAP_ROWS) {
  if (start.x === target.x && start.y === target.y) {
    return { steps: [], cost: 0, cache };
  }

  const minX = Math.min(start.x, target.x) - WORLD_ROUTE_MARGIN;
  const maxX = Math.max(start.x, target.x) + WORLD_ROUTE_MARGIN;
  const minY = Math.min(start.y, target.y) - WORLD_ROUTE_MARGIN;
  const maxY = Math.max(start.y, target.y) + WORLD_ROUTE_MARGIN;
  const keyOf = (x, y) => `${x},${y}`;
  const targetKey = keyOf(target.x, target.y);
  const startKey = keyOf(start.x, start.y);
  const frontier = [{ x: start.x, y: start.y, cost: 0, score: 0 }];
  const costs = new Map([[startKey, 0]]);
  const previous = new Map();
  const infoByKey = new Map();
  const directions = [-1, 0, 1].flatMap((dy) =>
    [-1, 0, 1]
      .filter((dx) => dx !== 0 || dy !== 0)
      .map((dx) => ({ dx, dy }))
  );

  let found = false;
  let safety = 0;
  while (frontier.length && safety < 12000) {
    safety += 1;
    frontier.sort((a, b) => a.score - b.score);
    const current = frontier.shift();
    const currentKey = keyOf(current.x, current.y);
    if (currentKey === targetKey) {
      found = true;
      break;
    }

    for (const { dx, dy } of directions) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      const info = getWorldCell(x, y, cache, cols, rows);
      if (!info.cell || getTerrain(info.cell.terrain)?.blocked) continue;

      const nextKey = keyOf(x, y);
      const moveCost = getCellMoveCost(info.cell) ?? 1;
      const diagonalCost = dx !== 0 && dy !== 0 ? 0.25 : 0;
      const nextCost = current.cost + moveCost + diagonalCost;
      if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;

      costs.set(nextKey, nextCost);
      previous.set(nextKey, currentKey);
      infoByKey.set(nextKey, { worldX: x, worldY: y, ...info });
      const heuristic = Math.max(Math.abs(target.x - x), Math.abs(target.y - y));
      frontier.push({ x, y, cost: nextCost, score: nextCost + heuristic * 0.5 });
    }
  }

  if (!found) return null;

  const steps = [];
  let cursor = targetKey;
  while (cursor !== startKey) {
    const info = infoByKey.get(cursor);
    const parent = previous.get(cursor);
    if (!info || !parent) return null;
    steps.push(info);
    cursor = parent;
  }
  steps.reverse();
  return { steps, cost: costs.get(targetKey) ?? 0, cache };
}

export default function MapScreen({ mapState, onMapChange, character, setCharacter, weaponDatabase, onRoll }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const tx = (key, vars) => mapUiText(language, key, vars);
  const resumeCopy = RESUME_ROUTE_TEXT[String(language).split("-")[0]] || RESUME_ROUTE_TEXT.en;
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedWorldTarget, setSelectedWorldTarget] = useState(null);
  const [mapMode, setMapMode] = useState("world");
  const [campOpen,setCampOpen]=useState(false);
  const [selectedSettlement,setSelectedSettlement]=useState(null);
  const [travelResolver,setTravelResolver]=useState(null);
  const [reputationRows,setReputationRows]=useState(()=>readReputationRows());

  const safeMapState = useMemo(
    () => ({ ...buildDefaultMapState(), ...(mapState || {}) }),
    [mapState]
  );

  useEffect(() => {
    const pending = safeMapState.pendingTravelEncounter;
    if (!pending?.token) return;

    if (pending.resolution) return;

    const resolution = resolveTravelEncounter(pending, character);
    if (!resolution) return;

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      if (base.pendingTravelEncounter?.token !== pending.token) return base;
      if (base.pendingTravelEncounter?.resolution) return base;
      return {
        ...base,
        pendingTravelEncounter: {
          ...base.pendingTravelEncounter,
          resolution,
        },
      };
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: pending.token, resolution },
      }));
    }
    // Resolve legacy pending encounters created before exact encounter mechanics existed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMapState.pendingTravelEncounter?.token]);

  useEffect(()=>{
    const sync=(event)=>setReputationRows(Array.isArray(event?.detail?.rows)?event.detail.rows:readReputationRows());
    window.addEventListener("pip2d20:settlement-reputation-changed",sync);
    return()=>window.removeEventListener("pip2d20:settlement-reputation-changed",sync);
  },[]);

  const activeRegion = getMapRegion(safeMapState.regionId);
  const regionLocations = activeRegion.locations;
  const winterModeEnabled = activeRegion.id === "commonwealth";

  const worldOffset = safeMapState.worldOffset;
  const worldTotalHours = safeMapState.worldTotalHours;
  const trackedLocationId = safeMapState.trackedLocationId;
  const discoveredKeys = safeMapState.discoveredKeys || [];
  const travelLog = safeMapState.travelLog?.length
    ? safeMapState.travelLog
    : [t("mapPanel.enteredWasteland")];
  const sectorCache = safeMapState.sectorCache || {};
  const sectorKey = useMemo(() => getSectorKey(worldOffset), [worldOffset]);

  const mapData = useMemo(
    () => sectorCache[sectorKey] || createRandomMap(MAP_ROWS, MAP_COLS, worldOffset),
    [sectorCache, sectorKey, worldOffset]
  );
  const playerPosition = safeMapState.playerPosition || mapData.start;

  useEffect(() => {
    const missingCache = !sectorCache[sectorKey];
    const missingPlayer = !safeMapState.playerPosition;
    const missingDiscovery = !discoveredKeys.length;
    if (!missingCache && !missingPlayer && !missingDiscovery) return;

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      const start = base.playerPosition || mapData.start;
      return {
        ...base,
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: mapData },
        playerPosition: start,
        discoveredKeys: base.discoveredKeys?.length
          ? base.discoveredKeys
          : revealAround(mapData, start, 1, []),
      };
    });
  }, [sectorCache, sectorKey, mapData, safeMapState.playerPosition, discoveredKeys, onMapChange]);

  const currentCell = useMemo(
    () => getCell(mapData, playerPosition.x, playerPosition.y),
    [mapData, playerPosition]
  );
  const currentHazards = currentCell ? getCellHazards(currentCell) : [];
  const selectedRoute = useMemo(
    () => (selectedCell ? findTravelRoute(mapData, playerPosition, selectedCell) : null),
    [mapData, playerPosition, selectedCell]
  );
  const canTravel = Boolean(selectedRoute?.cells?.length);
  const selectedTravelCost = selectedRoute?.cost ?? null;

  const viewStartX = Math.max(0, Math.min(playerPosition.x - Math.floor(VIEW_COLS / 2), mapData.cols - VIEW_COLS));
  const viewStartY = Math.max(0, Math.min(playerPosition.y - Math.floor(VIEW_ROWS / 2), mapData.rows - VIEW_ROWS));
  const playerWorldX = worldOffset.x * mapData.cols + playerPosition.x;
  const playerWorldY = worldOffset.y * mapData.rows + playerPosition.y;
  const historyText=HISTORY_COPY[String(language).split("-")[0]]||HISTORY_COPY.en;
  const reputationMarkers=useMemo(()=>reputationRows.flatMap(row=>{
    if(row?.sourceId){
      const loc=regionLocations.find(item=>item.id===row.sourceId);
      return loc?[{...row,worldX:loc.worldX,worldY:loc.worldY,regionId:activeRegion.id}]:[];
    }
    return row?.regionId===activeRegion.id&&Number.isFinite(Number(row?.worldX))&&Number.isFinite(Number(row?.worldY))?[row]:[];
  }),[reputationRows,regionLocations,activeRegion.id]);
  const campMarker=useMemo(()=>{
    const camp=character?.activeCampsite;
    if(!camp)return null;
    const region=camp.regionId||activeRegion.id;
    if(region!==activeRegion.id)return null;
    const x=Number.isFinite(Number(camp.worldX))?Number(camp.worldX):playerWorldX;
    const y=Number.isFinite(Number(camp.worldY))?Number(camp.worldY):playerWorldY;
    return {id:"active-camp-marker",x,y,icon:"▲",label:`${historyText.camp} T${camp.tier||1}`,campMarker:true};
  },[character?.activeCampsite,activeRegion.id,playerWorldX,playerWorldY,historyText.camp]);
  const worldSelectionRoute = useMemo(() => {
    if (!selectedWorldTarget || (selectedWorldTarget.worldX === playerWorldX && selectedWorldTarget.worldY === playerWorldY)) return null;
    const workingCache = { ...sectorCache, [sectorKey]: mapData };
    return findWorldTravelRoute(
      { x: playerWorldX, y: playerWorldY },
      { x: selectedWorldTarget.worldX, y: selectedWorldTarget.worldY },
      workingCache,
      mapData.cols,
      mapData.rows
    );
  }, [selectedWorldTarget, playerWorldX, playerWorldY, sectorCache, sectorKey, mapData]);
  const worldSelectionCost = worldSelectionRoute?.cost ?? null;
  const worldSelectionRoutePoints = useMemo(
    () => selectedWorldTarget && worldSelectionRoute
      ? [{ x: playerWorldX, y: playerWorldY }, ...worldSelectionRoute.steps.map(step => ({ x: step.worldX, y: step.worldY }))]
      : [],
    [selectedWorldTarget, worldSelectionRoute, playerWorldX, playerWorldY]
  );
  const worldDateTime = useMemo(() => getWorldDateTime(worldTotalHours, t), [worldTotalHours, t]);
  const trackedLocation = useMemo(() => getLocationById(trackedLocationId, regionLocations), [trackedLocationId, regionLocations]);
  const trackedDistanceBlocks = trackedLocation
    ? getDistanceInBlocks(playerWorldX, playerWorldY, trackedLocation.worldX, trackedLocation.worldY)
    : null;
  const trackedDistanceKm = trackedLocation
    ? getDistanceInKm(playerWorldX, playerWorldY, trackedLocation.worldX, trackedLocation.worldY)
    : null;
  const trackedDirection = trackedLocation
    ? getDirectionArrow(playerWorldX, playerWorldY, trackedLocation.worldX, trackedLocation.worldY)
    : null;
  const trackedSector = trackedLocation
    ? worldToSectorPosition(trackedLocation.worldX, trackedLocation.worldY, mapData.cols, mapData.rows)
    : null;
  const trackedAtCurrentPosition = Boolean(
    trackedLocation &&
    trackedLocation.worldX === playerWorldX &&
    trackedLocation.worldY === playerWorldY
  );
  const trackedIsInterSector = Boolean(
    trackedSector &&
    (trackedSector.offset.x !== worldOffset.x || trackedSector.offset.y !== worldOffset.y)
  );
  const trackedSectorDistance = trackedSector
    ? Math.max(
        Math.abs(trackedSector.offset.x - worldOffset.x),
        Math.abs(trackedSector.offset.y - worldOffset.y)
      )
    : 0;

  const worldLocations = useMemo(
    () => getLocationsInSector(worldOffset, mapData.cols, mapData.rows, regionLocations),
    [worldOffset, mapData.cols, mapData.rows, regionLocations]
  );
  const visibleWorldLocations = useMemo(
    () => worldLocations.filter((location) =>
      location.localX >= viewStartX && location.localX < viewStartX + VIEW_COLS &&
      location.localY >= viewStartY && location.localY < viewStartY + VIEW_ROWS
    ),
    [worldLocations, viewStartX, viewStartY]
  );
  const randomPoiCells = useMemo(() => {
    const discoveredSet = new Set(discoveredKeys);
    return mapData.cells.filter((cell) => cell.poi && discoveredSet.has(`${cell.x},${cell.y}`));
  }, [mapData, discoveredKeys]);
  const visibleRandomPoiCells = useMemo(
    () => randomPoiCells.filter((cell) =>
      cell.x >= viewStartX && cell.x < viewStartX + VIEW_COLS &&
      cell.y >= viewStartY && cell.y < viewStartY + VIEW_ROWS
    ),
    [randomPoiCells, viewStartX, viewStartY]
  );

  function renderHazardBadges(hazards) {
    if (!hazards.length) return <span className="pip-map-hazard-empty">{t("mapPanel.none")}</span>;
    return (
      <div className="pip-map-hazard-list">
        {hazards.map((hazardId) => (
          <span key={hazardId} className={`pip-map-hazard-badge pip-map-hazard-badge--${hazardId}`}>
            {t(getHazardLabelKey(hazardId))}
          </span>
        ))}
      </div>
    );
  }

  function requestLocalTravel(target=selectedCell){
    if(!target)return;
    const route=findTravelRoute(mapData,playerPosition,target);
    if(!route?.cells?.length)return;
    setTravelResolver({kind:"local",target,baseHours:Math.max(1,Number(route.cost||route.cells.length||1))});
  }

  function requestWorldTravel(target=selectedWorldTarget||trackedLocation){
    if(!target)return;
    const workingCache={...sectorCache,[sectorKey]:mapData};
    const route=findWorldTravelRoute({x:playerWorldX,y:playerWorldY},{x:Number(target.worldX),y:Number(target.worldY)},workingCache,mapData.cols,mapData.rows);
    if(!route?.steps?.length)return;
    setTravelResolver({kind:"world",target,baseHours:Math.max(1,Number(route.cost||route.steps.length||1))});
  }

  function resolveTravelPlan(plan){
    const pending=travelResolver;
    setTravelResolver(null);
    if(!pending)return;
    if(pending.kind==="world")handleWorldTravel(pending.target,plan);
    else handleTravel(pending.target,plan);
  }

  function handleTravel(targetOverride = null, travelPlan = null) {
    const targetCell = targetOverride && Number.isFinite(Number(targetOverride.x)) && Number.isFinite(Number(targetOverride.y))
      ? targetOverride
      : selectedCell;
    const travelRoute = targetCell ? findTravelRoute(mapData, playerPosition, targetCell) : null;
    if (!targetCell || !travelRoute?.cells?.length) return;

    let totalCost = 0;
    let finalPosition = { ...playerPosition };
    let nextDiscoveredKeys = [...discoveredKeys];
    let stoppedEncounter = null;
    let reachedDestination = true;
    let luckyBreakUsed = false;
    const detailLog = [];
    const exposureHoursByHazard = {};

    for (const step of travelRoute.cells) {
      const stepCost = getCellMoveCost(step) ?? 1;
      totalCost += stepCost;
      addHazardExposureHours(exposureHoursByHazard, step, stepCost);
      finalPosition = { x: step.x, y: step.y };
      nextDiscoveredKeys = revealAround(mapData, finalPosition, 1, nextDiscoveredKeys);
      detailLog.push(
        t("mapPanel.movedTo", {
          x: step.x,
          y: step.y,
          terrain: t(getTerrainLabelKey(step.terrain)),
          cost: stepCost,
        })
      );
      if (step.poi) {
        detailLog.push(t("mapPanel.locationFound", { name: getPoiDisplayName(step.poi, t) }));
      }
      const encounter = maybeRollTravelEncounter(step.terrain, { regionId: activeRegion.id, language, winterMode: winterModeEnabled });
      if (encounter) {
        if (travelPlan?.luckyBreak && !luckyBreakUsed) {
          luckyBreakUsed = true;
          detailLog.push("LUCKY BREAK // encounter avoided");
        } else {
          stoppedEncounter = encounter;
          reachedDestination = step.x === targetCell.x && step.y === targetCell.y;
          detailLog.push(encounterText(encounter, t, tx("travelEncounter")));
          break;
        }
      }
    }

    const travelHours = Math.max(0.5, totalCost * Math.max(0.25, Number(travelPlan?.durationMultiplier || 1)));
    const nav = travelPlan?.navigation || null;
    const navLog = nav ? [
      `NAVIGATION // D${travelPlan.difficulty} // ${nav.successes}S // ${nav.success ? "SUCCESS" : "FAILURE"}`,
      ...(nav.complicationResults || []).map(item=>`COMPLICATION ${item.roll} // ${item.text}`),
      ...(nav.scavenging ? [`SCAVENGING ${nav.scavenging.total} // ${nav.scavenging.text}`] : []),
    ] : [];
    const summary = stoppedEncounter && !reachedDestination
      ? tx("routeInterrupted")
      : tx("routeComplete", { steps: travelRoute.cells.length, hours: travelHours });
    const environmentExposure = processEnvironmentalExposure({
      previousRemainders: safeMapState.hazardExposureRemainders || {},
      exposureHoursByHazard,
      character,
    });
    const environmentLog = environmentExposure.effects
      .map((effect) => formatEnvironmentalHazardLog(effect, language))
      .filter(Boolean);
    const winterResolution = winterModeEnabled
      ? resolveAutomaticWinterExposure({
          character,
          hours: travelHours,
          settings: readWinterTravelSettings(),
        })
      : null;
    const winterLog = winterResolution
      ? [formatWinterTravelLog(winterResolution, language)].filter(Boolean)
      : [];
    const routeLog = [summary, ...navLog, ...winterLog, ...environmentLog, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
      ? resolveTravelEncounter(stoppedEncounter, character)
      : null;
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(
          stoppedEncounter,
          encounterText(stoppedEncounter, t, tx("travelEncounter")),
          {
            regionId: activeRegion.id,
            terrain: getCell(mapData, finalPosition.x, finalPosition.y)?.terrain || null,
            hours: travelHours,
            worldX: worldOffset.x * mapData.cols + finalPosition.x,
            worldY: worldOffset.y * mapData.rows + finalPosition.y,
            resolution: encounterResolution,
          }
        )
      : null;

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        playerPosition: finalPosition,
        worldTotalHours: (base.worldTotalHours || 0) + travelHours,
        discoveredKeys: nextDiscoveredKeys,
        travelLog: mergeTravelLog(base, routeLog),
        activityLog: appendActivity(base,{type:"route",worldHours:(base.worldTotalHours||0)+travelHours,text:stoppedEncounter?historyText.routeStopped:`${historyText.route}: ${travelRoute.cells.length} · ${travelHours}h`}),
        hazardExposureRemainders: environmentExposure.remainders,
        lastWinterTravel: winterResolution,
        nextCampsiteDifficultyReduction: Math.max(Number(base.nextCampsiteDifficultyReduction||0),Number(travelPlan?.campsiteDifficultyReduction||0)),
        pendingTravelEncounter: encounterContext,
        interruptedRoute: stoppedEncounter
          ? {
              kind: "local",
              regionId: activeRegion.id,
              sectorKey,
              destination: { x: targetCell.x, y: targetCell.y },
              destinationName: targetCell.poi ? getPoiDisplayName(targetCell.poi, t) : `${targetCell.x},${targetCell.y}`,
              encounterToken: encounterContext?.token || null,
              interruptedAt: Date.now(),
            }
          : null,
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: mapData },
      };
    });

    if (typeof window !== "undefined" && travelHours > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: travelHours },
      }));
      if (winterResolution) {
        window.dispatchEvent(new CustomEvent(PIPBOY_WINTER_TRAVEL_EFFECT_EVENT, {
          detail: { resolution: winterResolution },
        }));
      }
    }
    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    dispatchEnvironmentEffects(environmentExposure.effects);
    if (reachedDestination && !stoppedEncounter) setSelectedCell(null);
  }

  function handleWorldTravel(targetOverride = null, travelPlan = null) {
    const targetLocation = targetOverride && Number.isFinite(Number(targetOverride.worldX)) && Number.isFinite(Number(targetOverride.worldY))
      ? targetOverride
      : trackedLocation;
    const targetAtCurrentPosition = Boolean(
      targetLocation && targetLocation.worldX === playerWorldX && targetLocation.worldY === playerWorldY
    );
    if (!targetLocation || targetAtCurrentPosition) return;

    const workingCache = { ...sectorCache, [sectorKey]: mapData };
    const start = { x: playerWorldX, y: playerWorldY };
    const target = { x: targetLocation.worldX, y: targetLocation.worldY };
    const route = findWorldTravelRoute(start, target, workingCache, mapData.cols, mapData.rows);
    const targetName = getWorldLocationDisplayName(targetLocation, t);

    if (!route?.steps?.length) {
      onMapChange((prevMap) => {
        const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
        return {
          ...base,
          travelLog: mergeTravelLog(base, [tx("worldRouteFailed", { name: targetName })]),
        };
      });
      return;
    }

    let totalCost = 0;
    let finalStep = null;
    let stoppedEncounter = null;
    let luckyBreakUsed = false;
    let previousSectorKey = sectorKey;
    const detailLog = [tx("worldRouteStart", { name: targetName, blocks: route.steps.length })];
    const exposureHoursByHazard = {};

    for (const step of route.steps) {
      const stepCost = getCellMoveCost(step.cell) ?? 1;
      totalCost += stepCost;
      addHazardExposureHours(exposureHoursByHazard, step.cell, stepCost);
      finalStep = step;

      if (step.key !== previousSectorKey) {
        detailLog.push(tx("enteredSector", { x: step.offset.x, y: step.offset.y }));
        previousSectorKey = step.key;
      }

      const staticLocation = regionLocations.find(
        (location) => location.worldX === step.worldX && location.worldY === step.worldY
      );
      if (staticLocation && staticLocation.id !== targetLocation.id) {
        detailLog.push(tx("passed", { name: getWorldLocationDisplayName(staticLocation, t) }));
      }

      const encounter = maybeRollTravelEncounter(step.cell.terrain, { regionId: activeRegion.id, language, winterMode: winterModeEnabled });
      if (encounter) {
        if (travelPlan?.luckyBreak && !luckyBreakUsed) {
          luckyBreakUsed = true;
          detailLog.push("LUCKY BREAK // encounter avoided");
        } else {
          stoppedEncounter = encounter;
          detailLog.push(encounterText(encounter, t, tx("travelEncounter")));
          break;
        }
      }
    }

    if (!finalStep) return;

    const travelHours = Math.max(0.5, totalCost * Math.max(0.25, Number(travelPlan?.durationMultiplier || 1)));
    const nav = travelPlan?.navigation || null;
    const navLog = nav ? [
      `NAVIGATION // D${travelPlan.difficulty} // ${nav.successes}S // ${nav.success ? "SUCCESS" : "FAILURE"}`,
      ...(nav.complicationResults || []).map(item=>`COMPLICATION ${item.roll} // ${item.text}`),
      ...(nav.scavenging ? [`SCAVENGING ${nav.scavenging.total} // ${nav.scavenging.text}`] : []),
    ] : [];
    const reachedTarget = finalStep.worldX === target.x && finalStep.worldY === target.y;
    const summary = reachedTarget
      ? tx("arrived", { name: targetName, hours: travelHours })
      : stoppedEncounter
        ? tx("worldRouteInterrupted")
        : tx("worldRouteStopped");
    const environmentExposure = processEnvironmentalExposure({
      previousRemainders: safeMapState.hazardExposureRemainders || {},
      exposureHoursByHazard,
      character,
    });
    const environmentLog = environmentExposure.effects
      .map((effect) => formatEnvironmentalHazardLog(effect, language))
      .filter(Boolean);
    const winterResolution = winterModeEnabled
      ? resolveAutomaticWinterExposure({
          character,
          hours: travelHours,
          settings: readWinterTravelSettings(),
        })
      : null;
    const winterLog = winterResolution
      ? [formatWinterTravelLog(winterResolution, language)].filter(Boolean)
      : [];
    const routeLog = [summary, ...navLog, ...winterLog, ...environmentLog, ...detailLog.reverse()];
    const encounterResolution = stoppedEncounter
      ? resolveTravelEncounter(stoppedEncounter, character)
      : null;
    const encounterContext = stoppedEncounter
      ? createTravelEncounterContext(
          stoppedEncounter,
          encounterText(stoppedEncounter, t, tx("travelEncounter")),
          {
            regionId: activeRegion.id,
            terrain: finalStep.cell?.terrain || null,
            hours: travelHours,
            worldX: finalStep.worldX,
            worldY: finalStep.worldY,
            destinationId: targetLocation.id,
            destinationName: targetName,
            resolution: encounterResolution,
          }
        )
      : null;

    const finalSector = worldToSectorPosition(finalStep.worldX, finalStep.worldY, mapData.cols, mapData.rows);
    const finalMap = route.cache[finalSector.key] || finalStep.map;
    const finalDiscovery = revealAround(finalMap, finalSector.local, 1, []);

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldOffset: finalSector.offset,
        playerPosition: finalSector.local,
        worldTotalHours: (base.worldTotalHours || 0) + travelHours,
        discoveredKeys: finalDiscovery,
        sectorCache: { ...(base.sectorCache || {}), ...route.cache },
        travelLog: mergeTravelLog(base, routeLog),
        activityLog: appendActivity(base,{type:"route",worldHours:(base.worldTotalHours||0)+travelHours,text:reachedTarget?`${historyText.arrived}: ${targetName} · ${travelHours}h`:historyText.routeStopped}),
        hazardExposureRemainders: environmentExposure.remainders,
        lastWinterTravel: winterResolution,
        nextCampsiteDifficultyReduction: Math.max(Number(base.nextCampsiteDifficultyReduction||0),Number(travelPlan?.campsiteDifficultyReduction||0)),
        pendingTravelEncounter: encounterContext,
        interruptedRoute: stoppedEncounter
          ? {
              kind: "world",
              regionId: activeRegion.id,
              destinationId: targetLocation.id || null,
              destinationName: targetName,
              worldX: targetLocation.worldX,
              worldY: targetLocation.worldY,
              encounterToken: encounterContext?.token || null,
              interruptedAt: Date.now(),
            }
          : null,
      };
    });

    if (typeof window !== "undefined" && travelHours > 0) {
      window.dispatchEvent(new CustomEvent(PIPBOY_SURVIVAL_TRAVEL_EVENT, {
        detail: { hours: travelHours },
      }));
      if (winterResolution) {
        window.dispatchEvent(new CustomEvent(PIPBOY_WINTER_TRAVEL_EFFECT_EVENT, {
          detail: { resolution: winterResolution },
        }));
      }
    }
    if (typeof window !== "undefined" && encounterContext?.resolution) {
      window.dispatchEvent(new CustomEvent(PIPBOY_TRAVEL_ENCOUNTER_EFFECT_EVENT, {
        detail: { token: encounterContext.token, resolution: encounterContext.resolution },
      }));
    }
    dispatchEnvironmentEffects(environmentExposure.effects);
    setSelectedCell(null);
    setSelectedWorldTarget(null);
  }

  function handleRegenerateMap() {
    const nextMap = createRandomMap(mapData.rows, mapData.cols, worldOffset);
    const exposureHoursByHazard = {};
    addHazardExposureHours(exposureHoursByHazard, currentCell, 8);
    const environmentExposure = processEnvironmentalExposure({
      previousRemainders: safeMapState.hazardExposureRemainders || {},
      exposureHoursByHazard,
      character,
    });
    const environmentLog = environmentExposure.effects
      .map((effect) => formatEnvironmentalHazardLog(effect, language))
      .filter(Boolean);

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldTotalHours: (base.worldTotalHours || 0) + 8,
        discoveredKeys: revealAround(nextMap, playerPosition, 1, []),
        travelLog: mergeTravelLog(base, [t("mapPanel.campRest"), ...environmentLog]),
        hazardExposureRemainders: environmentExposure.remainders,
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: nextMap },
      };
    });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(PIPBOY_CAMP_REST_EVENT));
    }
    dispatchEnvironmentEffects(environmentExposure.effects);
    setSelectedCell(null);
  }

  function handleRegionChange(regionId) {
    const nextRegion = getMapRegion(regionId);
    const worldX = nextRegion.start.x;
    const worldY = nextRegion.start.y;
    const nextOffset = { x: Math.floor(worldX / MAP_COLS), y: Math.floor(worldY / MAP_ROWS) };
    const nextPlayer = { x: modulo(worldX, MAP_COLS), y: modulo(worldY, MAP_ROWS) };
    const nextMap = createRandomMap(MAP_ROWS, MAP_COLS, nextOffset);
    onMapChange({
      regionId: nextRegion.id,
      worldOffset: nextOffset,
      playerPosition: nextPlayer,
      trackedLocationId: nextRegion.defaultTargetId,
      discoveredKeys: revealAround(nextMap, nextPlayer, 1, []),
      travelLog: [`${getRegionName(nextRegion, language)} // ${tx("enteredRegion")}`],
      sectorCache: { [getSectorKey(nextOffset)]: nextMap },
    });
    setSelectedCell(null);
    setSelectedWorldTarget(null);
    setMapMode("world");
  }

  function selectStaticLocation(location) {
    onMapChange({ trackedLocationId: location.id });
    const cell = getCell(mapData, location.localX, location.localY);
    if (cell) setSelectedCell(cell);
  }

  function hasActiveBestiaryCombat() {
    if (typeof window === "undefined") return false;
    try {
      const store = JSON.parse(window.localStorage.getItem("fallout_pipboy_bestiary_combat_v1") || "null");
      const latestKey = store?.latestSessionKey;
      return Boolean(latestKey && store?.bySession?.[latestKey]?.status === "active");
    } catch {
      return false;
    }
  }

  function resumeInterruptedRoute() {
    const interrupted = safeMapState.interruptedRoute;
    if (!interrupted) return;
    if (hasActiveBestiaryCombat()) {
      setMapMode("local");
      return;
    }
    if (interrupted.regionId && interrupted.regionId !== activeRegion.id) {
      onMapChange({ interruptedRoute: null });
      return;
    }

    if (interrupted.kind === "world") {
      const target = regionLocations.find((location) => location.id === interrupted.destinationId) || (
        Number.isFinite(Number(interrupted.worldX)) && Number.isFinite(Number(interrupted.worldY))
          ? { id: interrupted.destinationId, name: interrupted.destinationName, worldX: Number(interrupted.worldX), worldY: Number(interrupted.worldY) }
          : null
      );
      if (!target) {
        onMapChange({ interruptedRoute: null });
        return;
      }
      if (target.id) onMapChange({ trackedLocationId: target.id });
      handleWorldTravel(target);
      return;
    }

    if (interrupted.kind === "local") {
      if (interrupted.sectorKey && interrupted.sectorKey !== sectorKey) {
        onMapChange({ interruptedRoute: null });
        return;
      }
      const destination = interrupted.destination || {};
      const targetCell = getCell(mapData, Number(destination.x), Number(destination.y));
      if (!targetCell) {
        onMapChange({ interruptedRoute: null });
        return;
      }
      setSelectedCell(targetCell);
      handleTravel(targetCell);
    }
  }

  function handleTravelEncounterHandled(token) {
    if (!token) return;
    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      if (base.pendingTravelEncounter?.token !== token) return base;
      return { ...base, pendingTravelEncounter: null };
    });
  }

  return (
    <div className="pip-screen pip-map-screen">
      <div className="pip-screen-header">
        <div className="pip-map-screen__time">{t("mapPanel.worldTime")}: {worldDateTime.fullText}</div>
        <label className="pip-map-region-select">
          <span>{tx("region")}</span>
          <select className="pip-input" value={activeRegion.id} onChange={(event) => handleRegionChange(event.target.value)}>
            {MAP_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>{region.game} — {getRegionName(region, language)}</option>
            ))}
          </select>
        </label>
        <div className="pip-map-inline-hazards">{t("mapPanel.hazards")}: {renderHazardBadges(currentHazards)}</div>
        {winterModeEnabled && safeMapState.lastWinterTravel ? (
          <div className="pip-map-winter-last" title={tx("winterLast")}>
            D{safeMapState.lastWinterTravel.difficulty} · {safeMapState.lastWinterTravel.successes}S · {safeMapState.lastWinterTravel.success ? "✓" : "FAT +" + safeMapState.lastWinterTravel.fatigue}
          </div>
        ) : null}
      </div>

      <div className="pip-map-layout">
        <div className="pip-map-column">
          {mapMode !== "local" ? (
            <div className="pip-map-mode-switch pip-map-mode-switch--external" role="tablist" aria-label="Map mode">
              <button type="button" role="tab" aria-selected={mapMode === "world"} className={mapMode === "world" ? "is-active" : ""} onClick={() => setMapMode("world")}>{tx("world")}</button>
              <button type="button" role="tab" aria-selected={mapMode === "overview"} className={mapMode === "overview" ? "is-active" : ""} onClick={() => setMapMode("overview")}>{tx("overview")}</button>
              <button type="button" role="tab" aria-selected={false} onClick={() => setMapMode("local")}>{tx("local")}</button>
              <button type="button" role="tab" aria-selected={mapMode === "reputation"} className={mapMode === "reputation" ? "is-active" : ""} onClick={() => setMapMode("reputation")}>{tx("reputation")}</button>
            </div>
          ) : null}

          {mapMode === "reputation" ? (
            <SettlementReputationPanel language={language} readOnly={false} locations={regionLocations} regionId={activeRegion.id} currentPosition={{worldX:playerWorldX,worldY:playerWorldY}} onActivity={(entry)=>onMapChange(base=>({...base,activityLog:appendActivity(base,{...entry,worldHours:base.worldTotalHours})}))} />
          ) : <div className="pip-panel pip-map-panel">
          <div className={`pip-map-board pip-map-board--${activeRegion.id}`} data-region={activeRegion.id}>
            <div className="pip-map-grid-layer">
              {mapMode === "world" ? (
                <div className="pip-seamless-world-map">
                  <PhaserMapViewport
                    cols={64}
                    rows={64}
                    sceneKey={`personal-world:${activeRegion.id}`}
                    background={REGION_MAP_ASSETS[activeRegion.id] || bostonMapImage}
                    cells={mapData.cells.map(cell => ({
                      ...cell,
                      x: worldOffset.x * mapData.cols + cell.x,
                      y: worldOffset.y * mapData.rows + cell.y,
                      discovered: discoveredKeys.includes(`${cell.x},${cell.y}`),
                    }))}
                    markers={[
                      ...regionLocations.map(location => ({
                        ...location,
                        x: location.worldX,
                        y: location.worldY,
                        icon: getPoiIcon(location),
                        staticLocation: true,
                        reputationRow: reputationRows.find(row=>row.sourceId===location.id)||null,
                      })),
                      ...randomPoiCells.map(cell => ({
                        id: `poi-${sectorKey}-${cell.x}-${cell.y}`,
                        x: worldOffset.x * mapData.cols + cell.x,
                        y: worldOffset.y * mapData.rows + cell.y,
                        icon: getPoiIcon(cell.poi),
                        poiCell: cell,
                      })),
                      ...reputationMarkers.filter(row=>!row.sourceId).map(row=>({id:`rep-${row.id}`,x:Number(row.worldX),y:Number(row.worldY),icon:"⌂",label:row.name,reputationRow:row})),
                      ...(campMarker?[campMarker]:[]),
                    ]}
                    onMarker={marker => {
                      if(marker.campMarker){setCampOpen(true);return;}
                      if(marker.reputationRow)setSelectedSettlement(marker.reputationRow); else setSelectedSettlement(null);
                      if (marker.staticLocation) onMapChange({ trackedLocationId: marker.id });
                      setSelectedWorldTarget({
                        id: marker.id || null,
                        name: marker.reputationRow?.name || (marker.staticLocation ? getWorldLocationDisplayName(marker, t) : getPoiDisplayName(marker.poiCell?.poi, t)),
                        worldX: marker.x,
                        worldY: marker.y,
                      });
                    }}
                    onCell={(x, y) => setSelectedWorldTarget({ id: null, name: `${x},${y}`, worldX: x, worldY: y })}
                    player={{ x: playerWorldX, y: playerWorldY }}
                    selected={selectedWorldTarget ? { x: selectedWorldTarget.worldX, y: selectedWorldTarget.worldY } : null}
                    route={worldSelectionRoutePoints}
                    label={tx("world")}
                  />
                  {selectedWorldTarget ? (
                    <div className="pip-seamless-world-route">
                      <span>{tx("destination")} {selectedWorldTarget.name || `${selectedWorldTarget.worldX},${selectedWorldTarget.worldY}`}</span>
                      <span>{worldSelectionRoute ? `${worldSelectionRoute.steps.length} ${tx("steps")} · ${worldSelectionCost?.toFixed?.(1) ?? worldSelectionCost}H` : tx("noRoute")}</span>
                      <button type="button" className="pip-action-button" disabled={!worldSelectionRoute?.steps?.length} onClick={() => requestWorldTravel(selectedWorldTarget)}>{tx("travelToTarget")}</button>
                      <button type="button" className="pip-action-button" onClick={() => setSelectedWorldTarget(null)}>×</button>
                    </div>
                  ) : null}
                  {selectedSettlement ? <div className="pip-map-settlement-card">
                    <div><small>⌂ ${historyText.reputation}</small><strong>${selectedSettlement.name}</strong></div>
                    <span className="pip-map-settlement-card__rank">${REPUTATION_LABELS[Math.max(0,Math.min(5,Number(selectedSettlement.rank||2)))]}</span>
                    <div className="pip-map-settlement-card__notes"><span><b>+</b> ${selectedSettlement.bonus||"—"}</span><span><b>−</b> ${selectedSettlement.penalty||"—"}</span></div>
                    <div className="pip-map-settlement-card__actions"><button type="button" className="pip-btn" onClick={()=>setMapMode("reputation")}>${tx("reputation")}</button><button type="button" className="pip-btn" onClick={()=>setSelectedSettlement(null)}>×</button></div>
                  </div> : null}
                </div>
              ) : (
                <MapGrid
                  key={activeRegion.id}
                  background={REGION_MAP_ASSETS[activeRegion.id] || bostonMapImage}
                  markers={[...visibleWorldLocations.map(location => ({ ...location, x: location.localX, y: location.localY })), ...visibleRandomPoiCells.map(cell => ({ id: `poi-${cell.x}-${cell.y}`, x: cell.x, y: cell.y, icon: getPoiIcon(cell.poi), cell }))]}
                  onMarker={marker => marker.cell ? setSelectedCell(marker.cell) : selectStaticLocation(marker)}
                  mapData={mapData}
                  playerPosition={playerPosition}
                  selectedCell={selectedCell}
                  discoveredKeys={discoveredKeys}
                  onSelectCell={setSelectedCell}
                  onTravel={()=>requestLocalTravel(selectedCell)}
                  character={character}
                  weaponDatabase={weaponDatabase}
                  mapMode={mapMode}
                  setMapMode={setMapMode}
                  locations={regionLocations}
                  region={{ id: activeRegion.id, game: activeRegion.game, name: getRegionName(activeRegion, language) }}
                  travelEncounter={safeMapState.pendingTravelEncounter || null}
                  onTravelEncounterHandled={handleTravelEncounterHandled}
                />
              )}
            </div>
          </div>
        </div>}
        </div>

        {mapMode !== "reputation" ? <div className="pip-map-sidebar">
          <div className="pip-panel pip-map-info">
            <label className="pip-map-select-label">
              {t("mapPanel.target")}
              <select className="pip-input" value={trackedLocationId} onChange={(e) => onMapChange({ trackedLocationId: e.target.value })}>
                {regionLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.nameKey ? t(location.nameKey) : location.name}</option>
                ))}
              </select>
            </label>

            {safeMapState.interruptedRoute && !safeMapState.pendingTravelEncounter ? (
              <div className="pip-map-world-route is-inter-sector">
                <div className="pip-map-world-route__topline">
                  <span>{resumeCopy.title}</span>
                  <span>{safeMapState.interruptedRoute.kind === "world" ? tx("world") : tx("currentSector")}</span>
                </div>
                <strong>{safeMapState.interruptedRoute.destinationName || resumeCopy.title}</strong>
                <button type="button" className="pip-map-world-route__travel" onClick={resumeInterruptedRoute}>
                  {resumeCopy.button}
                </button>
              </div>
            ) : null}

            {trackedLocation ? (
              <div className={`pip-map-world-route ${trackedIsInterSector ? "is-inter-sector" : "is-local-sector"}`}>
                <div className="pip-map-world-route__topline">
                  <span>{tx("worldRouteStatic")}</span>
                  <span>{trackedIsInterSector ? `${trackedSectorDistance} ${tx("sectors")}` : tx("currentSector")}</span>
                </div>
                <strong>{getWorldLocationDisplayName(trackedLocation, t)}</strong>
                <div className="pip-map-world-route__meta">
                  <span>{tx("direction")} {trackedDirection || "-"}</span>
                  <span>{trackedDistanceBlocks?.toFixed(1) ?? "-"} {tx("blocks")}</span>
                  <span>{trackedDistanceKm?.toFixed(1) ?? "-"} {tx("km")}</span>
                </div>
                <button
                  type="button"
                  className="pip-map-world-route__travel"
                  onClick={()=>requestWorldTravel(trackedLocation)}
                  disabled={trackedAtCurrentPosition}
                >
                  {trackedAtCurrentPosition ? tx("youAreHere") : tx("travelToTarget")}
                </button>
                <div className="pip-map-world-route__hint">{tx("worldRouteHint")}</div>
              </div>
            ) : null}

            <div className="pip-map-inline-stats">
              <div><strong>{t("mapPanel.terrain")}:</strong> {currentCell ? t(getTerrainLabelKey(currentCell.terrain)) : "-"}</div>
              <div><strong>{t("mapPanel.time")}:</strong> {worldDateTime.timeText}</div>
              <div><strong>{t("mapPanel.travel")}:</strong> {mapMode === "world" ? (worldSelectionCost ?? "-") : (selectedTravelCost ?? "-")}</div>
              {trackedLocation ? (
                <>
                  <div><strong>{t("mapPanel.targetLabel")}:</strong> {trackedLocation.nameKey ? t(trackedLocation.nameKey) : trackedLocation.name}</div>
                  <div><strong>{t("mapPanel.direction")}:</strong> {trackedDirection}</div>
                </>
              ) : (
                <div><strong>{t("mapPanel.targetLabel")}:</strong> {t("mapPanel.none")}</div>
              )}

              <button type="button" className="pip-action-button" onClick={() => mapMode === "world" ? requestWorldTravel(selectedWorldTarget) : requestLocalTravel(selectedCell)} disabled={mapMode === "world" ? !worldSelectionRoute?.steps?.length : !canTravel}>
                {t("mapPanel.travelButton")}
              </button>
              <button type="button" className="pip-action-button pip-map-camp-button" onClick={()=>setCampOpen(true)}>
                ▲ {t("mapPanel.campButton")}
              </button>
            </div>
          </div>

          <details className="pip-panel pip-map-info pip-map-history" open>
            <summary className="pip-panel-title">{t("mapPanel.log")} · {(safeMapState.activityLog||[]).length}</summary>
            <div className="pip-map-log">
              {(safeMapState.activityLog||[]).length ? (safeMapState.activityLog||[]).slice(0,8).map(entry=><div key={entry.id} className="pip-map-log__item"><small>{String(Math.floor((Number(entry.worldHours)||0)%24)).padStart(2,"0")}:00</small><span>{entry.text}</span></div>) : travelLog.filter(entry=>!/encounter|встреч|зустріч|spotkani/i.test(String(entry))).slice(0,6).map((entry,index)=><div key={`${entry}-${index}`} className="pip-map-log__item"><span>{entry}</span></div>)}
            </div>
          </details>
        </div> : null}
      </div>
      <WinterTravelResolver
        open={Boolean(travelResolver)}
        character={character}
        language={language}
        baseHours={travelResolver?.baseHours||1}
        onRoll={onRoll}
        onCancel={()=>setTravelResolver(null)}
        onResolve={resolveTravelPlan}
      />
      <CampsiteWorldPanel buildDifficultyReduction={Number(safeMapState.nextCampsiteDifficultyReduction||0)} open={campOpen} onClose={()=>setCampOpen(false)} character={character} setCharacter={setCharacter} language={language} winterMode={winterModeEnabled} onRoll={onRoll} regionId={activeRegion.id} currentPosition={{worldX:playerWorldX,worldY:playerWorldY}} onApplied={(result)=>onMapChange(base=>({...base,nextCampsiteDifficultyReduction:0,activityLog:appendActivity(base,{type:"camp",worldHours:base.worldTotalHours,text:`${historyText.campApplied}: T${result.tier}${result.penalty?` · Survival -${result.penalty}`:""}${result.risks?.length?` · ${historyText.risk}: ${result.risks.join("/")}`:""}`})}))} />
    </div>
  );
}
