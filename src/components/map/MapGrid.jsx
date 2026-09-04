import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import MapCell from "./MapCell.jsx";
import LocalGmChat from "./LocalGmChat.jsx";
import WorldOverview from "./WorldOverview.jsx";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";
import { canTravelToCell, findTravelRoute, getCellKey } from "../../utils/mapMath.js";
import { getMapLanguageCode, mapUiText } from "./mapUiText.js";
import "./localMapMode.css";

const VIEW_COLS = 8;
const VIEW_ROWS = 8;

function getWorldCoords(mapData, cell) {
  if (!cell) return null;
  const offset = mapData?.worldOffset || { x: 0, y: 0 };
  return {
    x: offset.x * (mapData?.cols || VIEW_COLS) + cell.x,
    y: offset.y * (mapData?.rows || VIEW_ROWS) + cell.y,
  };
}

function getStaticLocation(mapData, cell) {
  const coords = getWorldCoords(mapData, cell);
  if (!coords) return null;
  return FALLOUT_4_LOCATIONS.find(
    (location) => location.worldX === coords.x && location.worldY === coords.y
  ) || null;
}

function MapGrid({
  mapData,
  playerPosition,
  selectedCell,
  discoveredKeys,
  onSelectCell,
  onTravel,
  character,
  weaponDatabase,
  mapMode,
  setMapMode,
}) {
  const { i18n } = useTranslation();
  const language = getMapLanguageCode(i18n.resolvedLanguage || i18n.language || "en");
  const tx = (key, vars) => mapUiText(language, key, vars);
  const discoveredSet = useMemo(() => new Set(discoveredKeys), [discoveredKeys]);

  const cellIndex = useMemo(() => {
    const index = new Map();
    for (const cell of mapData.cells) index.set(getCellKey(cell.x, cell.y), cell);
    return index;
  }, [mapData.cells]);

  const viewport = useMemo(() => {
    const halfCols = Math.floor(VIEW_COLS / 2);
    const halfRows = Math.floor(VIEW_ROWS / 2);
    let startX = playerPosition.x - halfCols;
    let startY = playerPosition.y - halfRows;
    startX = Math.max(0, Math.min(startX, mapData.cols - VIEW_COLS));
    startY = Math.max(0, Math.min(startY, mapData.rows - VIEW_ROWS));
    return { startX, startY };
  }, [playerPosition.x, playerPosition.y, mapData.cols, mapData.rows]);

  const visibleCells = useMemo(() => {
    const result = [];
    for (let y = viewport.startY; y < viewport.startY + VIEW_ROWS; y += 1) {
      for (let x = viewport.startX; x < viewport.startX + VIEW_COLS; x += 1) {
        const cell = cellIndex.get(getCellKey(x, y));
        if (cell) result.push(cell);
      }
    }
    return result;
  }, [viewport, cellIndex]);

  const reachableMap = useMemo(() => {
    const result = new Map();
    for (const cell of visibleCells) {
      result.set(getCellKey(cell.x, cell.y), canTravelToCell(mapData, playerPosition, cell));
    }
    return result;
  }, [visibleCells, mapData, playerPosition]);

  const route = useMemo(
    () => selectedCell ? findTravelRoute(mapData, playerPosition, selectedCell) : null,
    [mapData, playerPosition, selectedCell]
  );
  const routeKeys = useMemo(
    () => new Set((route?.cells || []).map((cell) => getCellKey(cell.x, cell.y))),
    [route]
  );

  const selectedKey = selectedCell ? getCellKey(selectedCell.x, selectedCell.y) : null;
  const deltaX = selectedCell ? selectedCell.x - playerPosition.x : 0;
  const deltaY = selectedCell ? selectedCell.y - playerPosition.y : 0;
  const direction = selectedCell
    ? `${deltaY < 0 ? "N" : deltaY > 0 ? "S" : ""}${deltaX > 0 ? "E" : deltaX < 0 ? "W" : ""}` || tx("here")
    : null;
  const selectedStaticLocation = selectedCell ? getStaticLocation(mapData, selectedCell) : null;
  const destinationType = selectedStaticLocation ? tx("static") : tx("procedural");
  const destinationName =
    selectedStaticLocation?.name ||
    selectedStaticLocation?.id?.replaceAll("_", " ") ||
    selectedCell?.poi?.name ||
    selectedCell?.poi?.id?.replaceAll("_", " ") ||
    (selectedCell ? `${tx("destination")} ${selectedCell.x},${selectedCell.y}` : null);
  const routeReady = Boolean(route && route.cells.length > 0);

  const currentWorld = getWorldCoords(mapData, playerPosition);
  const currentStaticLocation = getStaticLocation(mapData, playerPosition);
  const openLocal = () => setMapMode("local");
  const minimizeLocal = () => setMapMode("world");

  return (
    <div className={`pip-map-mode-shell ${mapMode === "local" ? "is-local" : mapMode === "overview" ? "is-overview" : "is-world"}`}>
      {mapMode === "local" ? (
        <div className="pip-map-local-fullscreen" role="dialog" aria-modal="true" aria-label="Auto GM">
          <div className="pip-map-local-fullscreen__bar">
            <strong>{tx("local")} // {tx("autoGm")}</strong>
            <button type="button" onClick={minimizeLocal} aria-label="Minimize Auto GM">—</button>
          </div>
          <div className="pip-map-local-fullscreen__content">
            <LocalGmChat
              mapData={mapData}
              playerPosition={playerPosition}
              selectedCell={selectedCell}
              characterData={character}
              weaponDatabase={weaponDatabase}
            />
          </div>
        </div>
      ) : mapMode === "overview" ? (
        <WorldOverview mapData={mapData} playerPosition={playerPosition} />
      ) : (
        <>
          <div className="pip-map-nav-hud">
            <span>{tx("you")} {playerPosition.x},{playerPosition.y}</span>
            {selectedCell ? (
              <>
                <span>{tx("destination")} {selectedCell.x},{selectedCell.y}</span>
                <span>{tx("direction")} {direction}</span>
                <span>{route ? `${route.cells.length} ${tx("steps")} · ${route.cost}H` : tx("noRoute")}</span>
              </>
            ) : (
              <span>{tx("tapAnyCell")}</span>
            )}
          </div>

          {selectedCell ? (
            <div className={`pip-map-route-card ${routeReady ? "is-ready" : "is-blocked"}`}>
              <div className="pip-map-route-card__topline">
                <span>{tx("route")} // {destinationType}</span>
                <button type="button" onClick={() => onSelectCell(null)}>×</button>
              </div>
              <strong>{destinationName}</strong>
              <div className="pip-map-route-card__meta">
                <span>{tx("direction")} {direction}</span>
                <span>{route ? `${route.cells.length} ${tx("steps")}` : tx("noSafeRoute")}</span>
                <span>{route ? `${tx("eta")} ${route.cost}H` : ""}</span>
              </div>
              <div className="pip-map-route-card__hint">{tx("travelHint")}</div>
              <button
                type="button"
                className="pip-map-route-card__travel"
                disabled={!routeReady}
                onClick={() => onTravel?.()}
              >
                {routeReady ? tx("startTravel") : tx("routeUnavailable")}
              </button>
            </div>
          ) : null}

          <div className="pip-map-compass" aria-hidden="true"><span>N</span><span>W</span><b>+</b><span>E</span><span>S</span></div>
          <div
            className="pip-map-grid pip-map-grid--wasteland"
            style={{ gridTemplateColumns: `repeat(${VIEW_COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${VIEW_ROWS}, minmax(0, 1fr))` }}
          >
            {visibleCells.map((cell) => {
              const key = getCellKey(cell.x, cell.y);
              return (
                <MapCell
                  key={key}
                  cell={cell}
                  isPlayerHere={playerPosition.x === cell.x && playerPosition.y === cell.y}
                  isSelected={selectedKey === key}
                  isDiscovered={discoveredSet.has(key)}
                  isReachable={reachableMap.get(key)}
                  isRoute={routeKeys.has(key)}
                  onSelect={onSelectCell}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default React.memo(MapGrid);
