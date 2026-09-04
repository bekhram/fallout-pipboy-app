import React, { useMemo, useState } from "react";
import MapCell from "./MapCell.jsx";
import LocalGmChat from "./LocalGmChat.jsx";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";
import { canTravelToCell, findTravelRoute, getCellKey } from "../../utils/mapMath.js";
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
}) {
  const [mapMode, setMapMode] = useState("world");

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
    ? `${deltaY < 0 ? "N" : deltaY > 0 ? "S" : ""}${deltaX > 0 ? "E" : deltaX < 0 ? "W" : ""}` || "HERE"
    : null;
  const selectedStaticLocation = selectedCell ? getStaticLocation(mapData, selectedCell) : null;
  const destinationType = selectedStaticLocation ? "STATIC" : "PROCEDURAL";
  const destinationName =
    selectedStaticLocation?.name ||
    selectedStaticLocation?.id?.replaceAll("_", " ") ||
    selectedCell?.poi?.name ||
    selectedCell?.poi?.id?.replaceAll("_", " ") ||
    (selectedCell ? `CELL ${selectedCell.x},${selectedCell.y}` : null);
  const routeReady = Boolean(route && route.cells.length > 0);

  return (
    <div className={`pip-map-mode-shell ${mapMode === "local" ? "is-local" : "is-world"}`}>
      <div className="pip-map-mode-switch" role="tablist" aria-label="Map mode">
        <button type="button" role="tab" aria-selected={mapMode === "world"} className={mapMode === "world" ? "is-active" : ""} onClick={() => setMapMode("world")}>WORLD</button>
        <button type="button" role="tab" aria-selected={mapMode === "local"} className={mapMode === "local" ? "is-active" : ""} onClick={() => setMapMode("local")}>LOCAL</button>
      </div>

      {mapMode === "local" ? (
        <div className="pip-map-local-mode">
          <LocalGmChat mapData={mapData} playerPosition={playerPosition} selectedCell={selectedCell} />
        </div>
      ) : (
        <>
          <div className="pip-map-nav-hud">
            <span>YOU {playerPosition.x},{playerPosition.y}</span>
            {selectedCell ? (
              <>
                <span>DEST {selectedCell.x},{selectedCell.y}</span>
                <span>DIR {direction}</span>
                <span>{route ? `${route.cells.length} STEPS · ${route.cost}H` : "NO ROUTE"}</span>
              </>
            ) : (
              <span>TAP ANY CELL TO PLAN A ROUTE</span>
            )}
          </div>

          {selectedCell ? (
            <div className={`pip-map-route-card ${routeReady ? "is-ready" : "is-blocked"}`}>
              <div className="pip-map-route-card__topline">
                <span>ROUTE // {destinationType}</span>
                <button type="button" onClick={() => onSelectCell(null)}>×</button>
              </div>
              <strong>{destinationName}</strong>
              <div className="pip-map-route-card__meta">
                <span>DIR {direction}</span>
                <span>{route ? `${route.cells.length} STEPS` : "NO SAFE ROUTE"}</span>
                <span>{route ? `ETA ${route.cost}H` : ""}</span>
              </div>
              <div className="pip-map-route-card__hint">
                Travel follows the highlighted route and stops automatically if an encounter occurs.
              </div>
              <button
                type="button"
                className="pip-map-route-card__travel"
                disabled={!routeReady}
                onClick={() => onTravel?.()}
              >
                {routeReady ? "START TRAVEL" : "ROUTE UNAVAILABLE"}
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