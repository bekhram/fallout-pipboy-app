import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createRandomMap } from "../../data/map/bostonMap.js";
import { MAP_REGIONS, getMapRegion, getRegionName } from "../../data/map/mapRegions.js";
import { maybeRollTravelEncounter } from "../../utils/encounterEngine.js";
import MapGrid from "./MapGrid.jsx";
import { mapUiText } from "./mapUiText.js";
import { buildDefaultMapState } from "../../constants.js";
import "./map.css";
import bostonMapImage from "../../assets/map/boston-map.png";
import fallout1MapAsset from "../../assets/map/fallout1-southern-california.js";
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

function mergeTravelLog(base, entries) {
  const cleanEntries = (entries || [])
    .filter((entry) => entry !== null && entry !== undefined && String(entry).trim())
    .map((entry) => String(entry));
  return [...cleanEntries, ...(Array.isArray(base.travelLog) ? base.travelLog : [])].slice(0, MAX_LOG_ENTRIES);
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

export default function MapScreen({ mapState, onMapChange, character, weaponDatabase }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const tx = (key, vars) => mapUiText(language, key, vars);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mapMode, setMapMode] = useState("world");

  const safeMapState = useMemo(
    () => ({ ...buildDefaultMapState(), ...(mapState || {}) }),
    [mapState]
  );
  const activeRegion = getMapRegion(safeMapState.regionId);
  const regionLocations = activeRegion.locations;

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

  const atLeftEdge = playerPosition.x === 0;
  const atRightEdge = playerPosition.x === mapData.cols - 1;
  const atTopEdge = playerPosition.y === 0;
  const atBottomEdge = playerPosition.y === mapData.rows - 1;
  const viewStartX = Math.max(0, Math.min(playerPosition.x - Math.floor(VIEW_COLS / 2), mapData.cols - VIEW_COLS));
  const viewStartY = Math.max(0, Math.min(playerPosition.y - Math.floor(VIEW_ROWS / 2), mapData.rows - VIEW_ROWS));
  const playerWorldX = worldOffset.x * mapData.cols + playerPosition.x;
  const playerWorldY = worldOffset.y * mapData.rows + playerPosition.y;
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

  function handleTravel() {
    if (!selectedCell || !selectedRoute?.cells?.length) return;

    let totalCost = 0;
    let finalPosition = { ...playerPosition };
    let nextDiscoveredKeys = [...discoveredKeys];
    let stoppedEncounter = null;
    let reachedDestination = true;
    const detailLog = [];

    for (const step of selectedRoute.cells) {
      const stepCost = getCellMoveCost(step) ?? 1;
      totalCost += stepCost;
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
      const encounter = maybeRollTravelEncounter(step.terrain, t);
      if (encounter) {
        stoppedEncounter = encounter;
        reachedDestination = step.x === selectedCell.x && step.y === selectedCell.y;
        detailLog.push(encounterText(encounter, t, tx("travelEncounter")));
        break;
      }
    }

    const summary = stoppedEncounter && !reachedDestination
      ? tx("routeInterrupted")
      : tx("routeComplete", { steps: selectedRoute.cells.length, hours: totalCost });
    const routeLog = [summary, ...detailLog.reverse()];

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        playerPosition: finalPosition,
        worldTotalHours: (base.worldTotalHours || 0) + totalCost,
        discoveredKeys: nextDiscoveredKeys,
        travelLog: mergeTravelLog(base, routeLog),
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: mapData },
      };
    });

    if (reachedDestination) setSelectedCell(null);
  }

  function handleWorldTravel() {
    if (!trackedLocation || trackedAtCurrentPosition) return;

    const workingCache = { ...sectorCache, [sectorKey]: mapData };
    const start = { x: playerWorldX, y: playerWorldY };
    const target = { x: trackedLocation.worldX, y: trackedLocation.worldY };
    const route = findWorldTravelRoute(start, target, workingCache, mapData.cols, mapData.rows);
    const targetName = getWorldLocationDisplayName(trackedLocation, t);

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
    let previousSectorKey = sectorKey;
    const detailLog = [tx("worldRouteStart", { name: targetName, blocks: route.steps.length })];

    for (const step of route.steps) {
      const stepCost = getCellMoveCost(step.cell) ?? 1;
      totalCost += stepCost;
      finalStep = step;

      if (step.key !== previousSectorKey) {
        detailLog.push(tx("enteredSector", { x: step.offset.x, y: step.offset.y }));
        previousSectorKey = step.key;
      }

      const staticLocation = regionLocations.find(
        (location) => location.worldX === step.worldX && location.worldY === step.worldY
      );
      if (staticLocation && staticLocation.id !== trackedLocation.id) {
        detailLog.push(tx("passed", { name: getWorldLocationDisplayName(staticLocation, t) }));
      }

      const encounter = maybeRollTravelEncounter(step.cell.terrain, t);
      if (encounter) {
        stoppedEncounter = encounter;
        detailLog.push(encounterText(encounter, t, tx("travelEncounter")));
        break;
      }
    }

    if (!finalStep) return;

    const reachedTarget = finalStep.worldX === target.x && finalStep.worldY === target.y;
    const summary = reachedTarget
      ? tx("arrived", { name: targetName, hours: totalCost })
      : stoppedEncounter
        ? tx("worldRouteInterrupted")
        : tx("worldRouteStopped");
    const routeLog = [summary, ...detailLog.reverse()];

    const finalSector = worldToSectorPosition(finalStep.worldX, finalStep.worldY, mapData.cols, mapData.rows);
    const finalMap = route.cache[finalSector.key] || finalStep.map;
    const finalDiscovery = revealAround(finalMap, finalSector.local, 1, []);

    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldOffset: finalSector.offset,
        playerPosition: finalSector.local,
        worldTotalHours: (base.worldTotalHours || 0) + totalCost,
        discoveredKeys: finalDiscovery,
        sectorCache: { ...(base.sectorCache || {}), ...route.cache },
        travelLog: mergeTravelLog(base, routeLog),
      };
    });

    setSelectedCell(null);
  }

  function handleRegenerateMap() {
    const nextMap = createRandomMap(mapData.rows, mapData.cols, worldOffset);
    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldTotalHours: (base.worldTotalHours || 0) + 8,
        discoveredKeys: revealAround(nextMap, playerPosition, 1, []),
        travelLog: mergeTravelLog(base, [t("mapPanel.campRest")]),
        sectorCache: { ...(base.sectorCache || {}), [sectorKey]: nextMap },
      };
    });
    setSelectedCell(null);
  }

  function shiftMap(direction) {
    const nextOffset = { ...worldOffset };
    let nextPlayer = { ...playerPosition };
    if (direction === "east") { nextOffset.x += 1; nextPlayer = { x: 1, y: playerPosition.y }; }
    if (direction === "west") { nextOffset.x -= 1; nextPlayer = { x: mapData.cols - 2, y: playerPosition.y }; }
    if (direction === "north") { nextOffset.y -= 1; nextPlayer = { x: playerPosition.x, y: mapData.rows - 2 }; }
    if (direction === "south") { nextOffset.y += 1; nextPlayer = { x: playerPosition.x, y: 1 }; }

    const nextSectorKey = getSectorKey(nextOffset);
    const nextMap = sectorCache[nextSectorKey] || createRandomMap(mapData.rows, mapData.cols, nextOffset);
    onMapChange((prevMap) => {
      const base = { ...buildDefaultMapState(), ...(prevMap || {}) };
      return {
        ...base,
        worldOffset: nextOffset,
        playerPosition: nextPlayer,
        discoveredKeys: revealAround(nextMap, nextPlayer, 1, []),
        travelLog: mergeTravelLog(base, [t("mapPanel.shiftedMap", { direction: t(`mapPanel.${direction}`) })]),
        sectorCache: {
          ...(base.sectorCache || {}),
          [sectorKey]: mapData,
          [nextSectorKey]: base.sectorCache?.[nextSectorKey] || nextMap,
        },
      };
    });
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
    setMapMode("world");
  }

  function selectStaticLocation(location) {
    onMapChange({ trackedLocationId: location.id });
    const cell = getCell(mapData, location.localX, location.localY);
    if (cell) setSelectedCell(cell);
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
      </div>

      <div className="pip-map-layout">
        <div className="pip-map-column">
          {mapMode !== "local" ? (
            <div className="pip-map-mode-switch pip-map-mode-switch--external" role="tablist" aria-label="Map mode">
              <button type="button" role="tab" aria-selected={mapMode === "world"} className={mapMode === "world" ? "is-active" : ""} onClick={() => setMapMode("world")}>{tx("world")}</button>
              <button type="button" role="tab" aria-selected={mapMode === "overview"} className={mapMode === "overview" ? "is-active" : ""} onClick={() => setMapMode("overview")}>{tx("overview")}</button>
              <button type="button" role="tab" aria-selected={false} onClick={() => setMapMode("local")}>{tx("local")}</button>
            </div>
          ) : null}

          <div className="pip-panel pip-map-panel">
          <button type="button" className="pip-map-edge-button pip-map-edge-button--north" onClick={() => shiftMap("north")} disabled={!atTopEdge}>{t("mapPanel.north")}</button>
          <button type="button" className="pip-map-edge-button pip-map-edge-button--west" onClick={() => shiftMap("west")} disabled={!atLeftEdge}>{t("mapPanel.west")}</button>
          <button type="button" className="pip-map-edge-button pip-map-edge-button--east" onClick={() => shiftMap("east")} disabled={!atRightEdge}>{t("mapPanel.east")}</button>
          <button type="button" className="pip-map-edge-button pip-map-edge-button--south" onClick={() => shiftMap("south")} disabled={!atBottomEdge}>{t("mapPanel.south")}</button>

          <div className={`pip-map-board pip-map-board--${activeRegion.id}`} data-region={activeRegion.id} style={{ backgroundImage: activeRegion.id === "commonwealth" ? `url(${bostonMapImage})` : activeRegion.id === "california_fo1" ? `url(${fallout1MapAsset})` : "none", backgroundPosition: "center", backgroundSize: "cover", backgroundRepeat: "no-repeat" }}>
            <div className="pip-map-poi-layer">
              {visibleWorldLocations.map((location) => (
                <button
                  key={`world-${location.id}`}
                  type="button"
                  className={`pip-map-poi ${getWorldLocationClass(location)} ${trackedLocationId === location.id ? "is-selected" : ""}`}
                  style={{ left: `${((location.localX - viewStartX + 0.5) / VIEW_COLS) * 100}%`, top: `${((location.localY - viewStartY + 0.5) / VIEW_ROWS) * 100}%` }}
                  title={getWorldLocationDisplayName(location, t)}
                  onClick={() => selectStaticLocation(location)}
                >
                  <span className="pip-map-poi__icon">{location.icon}</span>
                </button>
              ))}

              {visibleRandomPoiCells.map((cell) => (
                <button
                  key={`random-poi-${cell.x}-${cell.y}-${cell.poi.id}`}
                  type="button"
                  className={`pip-map-poi pip-map-poi--random ${getRandomPoiClass(cell.poi)} ${selectedCell && selectedCell.x === cell.x && selectedCell.y === cell.y ? "is-selected" : ""}`}
                  style={{ left: `${((cell.x - viewStartX + 0.5) / VIEW_COLS) * 100}%`, top: `${((cell.y - viewStartY + 0.5) / VIEW_ROWS) * 100}%` }}
                  title={getPoiDisplayName(cell.poi, t)}
                  onClick={() => setSelectedCell(cell)}
                >
                  <span className="pip-map-poi__icon">{getPoiIcon(cell.poi)}</span>
                </button>
              ))}
            </div>

            <div className="pip-map-player-layer">
              <div className="pip-map-player-marker" style={{ left: `${((playerPosition.x - viewStartX + 0.5) / VIEW_COLS) * 100}%`, top: `${((playerPosition.y - viewStartY + 0.5) / VIEW_ROWS) * 100}%` }} title={tx("currentPosition")}>
                <span className="pip-map-player-marker__inner">●</span>
              </div>
            </div>

            <div className="pip-map-grid-layer">
              <MapGrid
                key={activeRegion.id}
                mapData={mapData}
                playerPosition={playerPosition}
                selectedCell={selectedCell}
                discoveredKeys={discoveredKeys}
                onSelectCell={setSelectedCell}
                onTravel={handleTravel}
                character={character}
                weaponDatabase={weaponDatabase}
                mapMode={mapMode}
                setMapMode={setMapMode}
                locations={regionLocations}
              />
            </div>
          </div>
        </div>
        </div>

        <div className="pip-map-sidebar">
          <div className="pip-panel pip-map-info">
            <label className="pip-map-select-label">
              {t("mapPanel.target")}
              <select className="pip-input" value={trackedLocationId} onChange={(e) => onMapChange({ trackedLocationId: e.target.value })}>
                {regionLocations.map((location) => (
                  <option key={location.id} value={location.id}>{location.nameKey ? t(location.nameKey) : location.name}</option>
                ))}
              </select>
            </label>

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
                  onClick={handleWorldTravel}
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
              <div><strong>{t("mapPanel.travel")}:</strong> {selectedTravelCost ?? "-"}</div>
              {trackedLocation ? (
                <>
                  <div><strong>{t("mapPanel.targetLabel")}:</strong> {trackedLocation.nameKey ? t(trackedLocation.nameKey) : trackedLocation.name}</div>
                  <div><strong>{t("mapPanel.direction")}:</strong> {trackedDirection}</div>
                </>
              ) : (
                <div><strong>{t("mapPanel.targetLabel")}:</strong> {t("mapPanel.none")}</div>
              )}

              <button type="button" className="pip-action-button" onClick={handleTravel} disabled={!canTravel}>
                {t("mapPanel.travelButton")}
              </button>
              <button type="button" className="pip-action-button" onClick={handleRegenerateMap}>
                {t("mapPanel.campButton")}
              </button>
            </div>
          </div>

          <div className="pip-panel pip-map-info">
            <div className="pip-panel-title">{t("mapPanel.log")}</div>
            <div className="pip-map-log" key={travelLog.join("|")}>
              {travelLog.map((entry, index) => (
                <div key={`${entry}-${index}`} className="pip-map-log__item">{entry}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
