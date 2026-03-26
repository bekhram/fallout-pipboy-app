import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  createRandomMap,
  FALLOUT_4_LOCATIONS,
} from "../../data/map/bostonMap.js";
import { maybeRollTravelEncounter } from "../../utils/encounterEngine.js";
import MapGrid from "./MapGrid.jsx";
import { buildDefaultMapState } from "../../constants.js";
import "./map.css";
import bostonMapImage from "../../assets/map/boston-map.png";
import {
  canTravelToCell,
  getCell,
  getTerrainLabelKey,
  getTravelCost,
  getCellHazards,
  getHazardLabelKey,
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
  if (location.major) return "pip-map-poi--major";
  return "pip-map-poi--neutral";
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
  const fullText = `${t("mapPanel.day")} ${day}, ${t("mapPanel.month")} ${month} - ${timeText}`;

  return {
    year,
    month,
    day,
    hour,
    timeText,
    dateText,
    fullText,
  };
}

function getSectorKey(offset) {
  return `${offset.x},${offset.y}`;
}

function getPoiDisplayName(poi, t) {
  if (!poi) return t("mapPanel.unknown");

  if (poi.nameKey) {
    const translated = t(poi.nameKey);
    if (translated && translated !== poi.nameKey) {
      return translated;
    }
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
  if (!location) return t("mapPanel.unknown");

  if (location.nameKey) {
    const translated = t(location.nameKey);
    if (translated && translated !== location.nameKey) {
      return translated;
    }
  }

  if (location.name) return location.name;

  if (location.id) {
    return location.id
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return t("mapPanel.unknown");
}

export default function MapScreen({ mapState, onMapChange }) {
  const { t } = useTranslation();
  const [selectedCell, setSelectedCell] = useState(null);

  const safeMapState = useMemo(
    () => ({
      ...buildDefaultMapState(),
      ...(mapState || {}),
    }),
    [mapState]
  );

  const worldOffset = safeMapState.worldOffset;
  const worldTotalHours = safeMapState.worldTotalHours;
  const trackedLocationId = safeMapState.trackedLocationId;
  const discoveredKeys = safeMapState.discoveredKeys || [];
  const travelLog = safeMapState.travelLog?.length
    ? safeMapState.travelLog
    : [t("mapPanel.enteredWasteland")];
  const sectorCache = safeMapState.sectorCache || {};

  const sectorKey = useMemo(() => getSectorKey(worldOffset), [worldOffset]);

  const mapData = useMemo(() => {
    return (
      sectorCache[sectorKey] ||
      createRandomMap(MAP_ROWS, MAP_COLS, worldOffset)
    );
  }, [sectorCache, sectorKey, worldOffset]);

  const playerPosition = safeMapState.playerPosition || mapData.start;

  useEffect(() => {
    const missingCache = !sectorCache[sectorKey];
    const missingPlayer = !safeMapState.playerPosition;
    const missingDiscovery = !discoveredKeys.length;

    if (!missingCache && !missingPlayer && !missingDiscovery) return;

    onMapChange((prevMap) => {
      const base = {
        ...buildDefaultMapState(),
        ...(prevMap || {}),
      };

      return {
        ...base,
        sectorCache: {
          ...(base.sectorCache || {}),
          [sectorKey]: mapData,
        },
        playerPosition: base.playerPosition || mapData.start,
        discoveredKeys:
          base.discoveredKeys?.length
            ? base.discoveredKeys
            : revealAround(mapData, base.playerPosition || mapData.start, 1, []),
      };
    });
  }, [
    sectorCache,
    sectorKey,
    mapData,
    safeMapState.playerPosition,
    discoveredKeys,
    onMapChange,
  ]);

  const currentCell = useMemo(() => {
    return getCell(mapData, playerPosition.x, playerPosition.y);
  }, [mapData, playerPosition]);

  const currentHazards = currentCell ? getCellHazards(currentCell) : [];

  const canTravel =
    selectedCell && canTravelToCell(mapData, playerPosition, selectedCell);

  const selectedTravelCost =
    selectedCell && canTravel ? getTravelCost(mapData, selectedCell) : null;

  const atLeftEdge = playerPosition.x === 0;
  const atRightEdge = playerPosition.x === mapData.cols - 1;
  const atTopEdge = playerPosition.y === 0;
  const atBottomEdge = playerPosition.y === mapData.rows - 1;

  const viewStartX = Math.max(
    0,
    Math.min(
      playerPosition.x - Math.floor(VIEW_COLS / 2),
      mapData.cols - VIEW_COLS
    )
  );

  const viewStartY = Math.max(
    0,
    Math.min(
      playerPosition.y - Math.floor(VIEW_ROWS / 2),
      mapData.rows - VIEW_ROWS
    )
  );

  const playerWorldX = worldOffset.x * mapData.cols + playerPosition.x;
  const playerWorldY = worldOffset.y * mapData.rows + playerPosition.y;

  const worldDateTime = useMemo(
    () => getWorldDateTime(worldTotalHours, t),
    [worldTotalHours, t]
  );

  const trackedLocation = useMemo(
    () => getLocationById(trackedLocationId),
    [trackedLocationId]
  );

  const trackedDistanceBlocks = trackedLocation
    ? getDistanceInBlocks(
        playerWorldX,
        playerWorldY,
        trackedLocation.worldX,
        trackedLocation.worldY
      )
    : null;

  const trackedDistanceKm = trackedLocation
    ? getDistanceInKm(
        playerWorldX,
        playerWorldY,
        trackedLocation.worldX,
        trackedLocation.worldY
      )
    : null;

  const trackedDirection = trackedLocation
    ? getDirectionArrow(
        playerWorldX,
        playerWorldY,
        trackedLocation.worldX,
        trackedLocation.worldY
      )
    : null;

  const worldLocations = useMemo(() => {
    return getLocationsInSector(worldOffset, mapData.cols, mapData.rows);
  }, [worldOffset, mapData.cols, mapData.rows]);

  const visibleWorldLocations = useMemo(() => {
    return worldLocations.filter(
      (location) =>
        location.localX >= viewStartX &&
        location.localX < viewStartX + VIEW_COLS &&
        location.localY >= viewStartY &&
        location.localY < viewStartY + VIEW_ROWS
    );
  }, [worldLocations, viewStartX, viewStartY]);

  const randomPoiCells = useMemo(() => {
    const discoveredSet = new Set(discoveredKeys);
    return mapData.cells.filter(
      (cell) => cell.poi && discoveredSet.has(`${cell.x},${cell.y}`)
    );
  }, [mapData, discoveredKeys]);

  const visibleRandomPoiCells = useMemo(() => {
    return randomPoiCells.filter(
      (cell) =>
        cell.x >= viewStartX &&
        cell.x < viewStartX + VIEW_COLS &&
        cell.y >= viewStartY &&
        cell.y < viewStartY + VIEW_ROWS
    );
  }, [randomPoiCells, viewStartX, viewStartY]);

  function renderHazardBadges(hazards) {
    if (!hazards.length) {
      return (
        <span className="pip-map-hazard-empty">{t("mapPanel.none")}</span>
      );
    }

    return (
      <div className="pip-map-hazard-list">
        {hazards.map((hazardId) => (
          <span
            key={hazardId}
            className={`pip-map-hazard-badge pip-map-hazard-badge--${hazardId}`}
          >
            {t(getHazardLabelKey(hazardId))}
          </span>
        ))}
      </div>
    );
  }

  function handleTravel() {
    if (!selectedCell || !canTravel) return;

    const cost = getTravelCost(mapData, selectedCell) ?? 1;
    const encounter = maybeRollTravelEncounter(selectedCell.terrain, t);

    const locationText = selectedCell.poi
      ? t("mapPanel.locationFound", {
          name: getPoiDisplayName(selectedCell.poi, t),
        })
      : null;

    const nextPosition = { x: selectedCell.x, y: selectedCell.y };
    const nextDiscoveredKeys = revealAround(
      mapData,
      nextPosition,
      1,
      discoveredKeys
    );

    onMapChange((prevMap) => {
      const base = {
        ...buildDefaultMapState(),
        ...(prevMap || {}),
      };

      const nextLog = [
        t("mapPanel.movedTo", {
          x: selectedCell.x,
          y: selectedCell.y,
          terrain: t(getTerrainLabelKey(selectedCell.terrain)),
          cost,
        }),
        ...(base.travelLog || []),
      ];

      if (locationText) nextLog.unshift(locationText);
      if (encounter?.textKey) nextLog.unshift(t(encounter.textKey));
      else if (encounter?.text) nextLog.unshift(encounter.text);

      return {
        ...base,
        playerPosition: nextPosition,
        worldTotalHours: (base.worldTotalHours || 0) + cost,
        discoveredKeys: nextDiscoveredKeys,
        travelLog: nextLog.slice(0, MAX_LOG_ENTRIES),
        sectorCache: {
          ...(base.sectorCache || {}),
          [sectorKey]: mapData,
        },
      };
    });

    setSelectedCell(null);
  }

  function handleRegenerateMap() {
    const nextMap = createRandomMap(mapData.rows, mapData.cols, worldOffset);

    onMapChange((prevMap) => {
      const base = {
        ...buildDefaultMapState(),
        ...(prevMap || {}),
      };

      return {
        ...base,
        worldTotalHours: (base.worldTotalHours || 0) + 8,
        discoveredKeys: revealAround(nextMap, playerPosition, 1, []),
        travelLog: [t("mapPanel.campRest"), ...(base.travelLog || [])].slice(
          0,
          MAX_LOG_ENTRIES
        ),
        sectorCache: {
          ...(base.sectorCache || {}),
          [sectorKey]: nextMap,
        },
      };
    });

    setSelectedCell(null);
  }

  function shiftMap(direction) {
    const nextOffset = { ...worldOffset };
    let nextPlayer = { ...playerPosition };

    if (direction === "east") {
      nextOffset.x += 1;
      nextPlayer = { x: 1, y: playerPosition.y };
    }

    if (direction === "west") {
      nextOffset.x -= 1;
      nextPlayer = { x: mapData.cols - 2, y: playerPosition.y };
    }

    if (direction === "north") {
      nextOffset.y -= 1;
      nextPlayer = { x: playerPosition.x, y: mapData.rows - 2 };
    }

    if (direction === "south") {
      nextOffset.y += 1;
      nextPlayer = { x: playerPosition.x, y: 1 };
    }

    const nextSectorKey = getSectorKey(nextOffset);
    const nextMap =
      sectorCache[nextSectorKey] ||
      createRandomMap(mapData.rows, mapData.cols, nextOffset);

    onMapChange((prevMap) => {
      const base = {
        ...buildDefaultMapState(),
        ...(prevMap || {}),
      };

      return {
        ...base,
        worldOffset: nextOffset,
        playerPosition: nextPlayer,
        discoveredKeys: revealAround(nextMap, nextPlayer, 1, []),
        travelLog: [
          t("mapPanel.shiftedMap", {
            direction: t(`mapPanel.${direction}`),
          }),
          ...(base.travelLog || []),
        ].slice(0, MAX_LOG_ENTRIES),
        sectorCache: {
          ...(base.sectorCache || {}),
          [sectorKey]: mapData,
          [nextSectorKey]: base.sectorCache?.[nextSectorKey] || nextMap,
        },
      };
    });

    setSelectedCell(null);
  }

  return (
    <div className="pip-screen pip-map-screen">
      <div className="pip-screen-header">
        <div className="pip-map-screen__time">
          {t("mapPanel.worldTime")}: {worldDateTime.fullText}
        </div>

        <div className="pip-map-inline-hazards">
          {t("mapPanel.hazards")}: {renderHazardBadges(currentHazards)}
        </div>
      </div>

      <div className="pip-map-layout">
        <div className="pip-panel pip-map-panel">
          <button
            type="button"
            className="pip-map-edge-button pip-map-edge-button--north"
            onClick={() => shiftMap("north")}
            disabled={!atTopEdge}
          >
            {t("mapPanel.north")}
          </button>

          <button
            type="button"
            className="pip-map-edge-button pip-map-edge-button--west"
            onClick={() => shiftMap("west")}
            disabled={!atLeftEdge}
          >
            {t("mapPanel.west")}
          </button>

          <button
            type="button"
            className="pip-map-edge-button pip-map-edge-button--east"
            onClick={() => shiftMap("east")}
            disabled={!atRightEdge}
          >
            {t("mapPanel.east")}
          </button>

          <button
            type="button"
            className="pip-map-edge-button pip-map-edge-button--south"
            onClick={() => shiftMap("south")}
            disabled={!atBottomEdge}
          >
            {t("mapPanel.south")}
          </button>

          <div
            className="pip-map-board"
            style={{
              backgroundImage: `url(${bostonMapImage})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="pip-map-poi-layer">
              {visibleWorldLocations.map((location) => (
                <button
                  key={`world-${location.id}`}
                  type="button"
                  className={`pip-map-poi ${getWorldLocationClass(location)} ${
                    trackedLocationId === location.id ? "is-selected" : ""
                  }`}
                  style={{
                    left: `${((location.localX - viewStartX + 0.5) / VIEW_COLS) * 100}%`,
                    top: `${((location.localY - viewStartY + 0.5) / VIEW_ROWS) * 100}%`,
                  }}
                  title={getWorldLocationDisplayName(location, t)}
                  onClick={() => onMapChange({ trackedLocationId: location.id })}
                >
                  <span className="pip-map-poi__icon">{location.icon}</span>
                </button>
              ))}

              {visibleRandomPoiCells.map((cell) => (
                <button
                  key={`random-poi-${cell.x}-${cell.y}-${cell.poi.id}`}
                  type="button"
                  className={`pip-map-poi pip-map-poi--random ${getRandomPoiClass(
                    cell.poi
                  )} ${
                    selectedCell &&
                    selectedCell.x === cell.x &&
                    selectedCell.y === cell.y
                      ? "is-selected"
                      : ""
                  }`}
                  style={{
                    left: `${((cell.x - viewStartX + 0.5) / VIEW_COLS) * 100}%`,
                    top: `${((cell.y - viewStartY + 0.5) / VIEW_ROWS) * 100}%`,
                  }}
                  title={getPoiDisplayName(cell.poi, t)}
                  onClick={() => setSelectedCell(cell)}
                >
                  <span className="pip-map-poi__icon">{getPoiIcon(cell.poi)}</span>
                </button>
              ))}
            </div>

            <div className="pip-map-player-layer">
              <div
                className="pip-map-player-marker"
                style={{
                  left: `${((playerPosition.x - viewStartX + 0.5) / VIEW_COLS) * 100}%`,
                  top: `${((playerPosition.y - viewStartY + 0.5) / VIEW_ROWS) * 100}%`,
                }}
                title="Player"
              >
                <span className="pip-map-player-marker__inner">●</span>
              </div>
            </div>

            <div className="pip-map-grid-layer">
              <MapGrid
                mapData={mapData}
                playerPosition={playerPosition}
                selectedCell={selectedCell}
                discoveredKeys={discoveredKeys}
                onSelectCell={setSelectedCell}
              />
            </div>
          </div>
        </div>

        <div className="pip-map-sidebar">
          <div className="pip-panel pip-map-info">
            <label className="pip-map-select-label">
              {t("mapPanel.target")}
              <select
                className="pip-input"
                value={trackedLocationId}
                onChange={(e) =>
                  onMapChange({ trackedLocationId: e.target.value })
                }
              >
                {FALLOUT_4_LOCATIONS.filter((location) => location.major).map(
                  (location) => (
                    <option key={location.id} value={location.id}>
                      {location.nameKey ? t(location.nameKey) : location.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <div className="pip-map-inline-stats">
              <div>
                <strong>{t("mapPanel.terrain")}:</strong>{" "}
                {currentCell ? t(getTerrainLabelKey(currentCell.terrain)) : "-"}
              </div>

              <div>
                <strong>{t("mapPanel.time")}:</strong> {worldDateTime.timeText}
              </div>

              <div>
                <strong>{t("mapPanel.travel")}:</strong>{" "}
                {selectedTravelCost ?? "-"}
              </div>

              {trackedLocation ? (
                <>
                  <div>
                    <strong>{t("mapPanel.targetLabel")}:</strong>{" "}
                    {trackedLocation.nameKey
                      ? t(trackedLocation.nameKey)
                      : trackedLocation.name}
                  </div>
                  <div>
                    <strong>{t("mapPanel.direction")}:</strong>{" "}
                    {trackedDirection}
                  </div>
                  <div>
                    <strong>{t("mapPanel.blocks")}:</strong>{" "}
                    {trackedDistanceBlocks?.toFixed(1)}
                  </div>
                  <div>
                    <strong>{t("mapPanel.km")}:</strong>{" "}
                    {trackedDistanceKm?.toFixed(1)}
                  </div>
                </>
              ) : (
                <div>
                  <strong>{t("mapPanel.targetLabel")}:</strong>{" "}
                  {t("mapPanel.none")}
                </div>
              )}

              <button
                type="button"
                className="pip-action-button"
                onClick={handleTravel}
                disabled={!canTravel}
              >
                {t("mapPanel.travelButton")}
              </button>

              <button
                type="button"
                className="pip-action-button"
                onClick={handleRegenerateMap}
              >
                {t("mapPanel.campButton")}
              </button>
            </div>
          </div>

          <div className="pip-panel pip-map-info">
            <div className="pip-panel-title">{t("mapPanel.log")}</div>
            <div className="pip-map-log">
              {travelLog.map((entry, index) => (
                <div key={`${entry}-${index}`} className="pip-map-log__item">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}