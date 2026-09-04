import React, { useMemo, useState } from "react";
import MapCell from "./MapCell.jsx";
import LocalGmChat from "./LocalGmChat.jsx";
import { canTravelToCell, getCellKey } from "../../utils/mapMath.js";
import "./localMapMode.css";

const VIEW_COLS = 8;
const VIEW_ROWS = 8;

function MapGrid({
  mapData,
  playerPosition,
  selectedCell,
  discoveredKeys,
  onSelectCell,
}) {
  const [mapMode, setMapMode] = useState("world");

  const discoveredSet = useMemo(() => {
    return new Set(discoveredKeys);
  }, [discoveredKeys]);

  const cellIndex = useMemo(() => {
    const index = new Map();

    for (const cell of mapData.cells) {
      index.set(getCellKey(cell.x, cell.y), cell);
    }

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
      const key = getCellKey(cell.x, cell.y);
      result.set(key, canTravelToCell(mapData, playerPosition, cell));
    }

    return result;
  }, [visibleCells, mapData, playerPosition]);

  const selectedKey = selectedCell
    ? getCellKey(selectedCell.x, selectedCell.y)
    : null;

  return (
    <div className={`pip-map-mode-shell ${mapMode === "local" ? "is-local" : "is-world"}`}>
      <div className="pip-map-mode-switch" role="tablist" aria-label="Map mode">
        <button
          type="button"
          role="tab"
          aria-selected={mapMode === "world"}
          className={mapMode === "world" ? "is-active" : ""}
          onClick={() => setMapMode("world")}
        >
          WORLD
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mapMode === "local"}
          className={mapMode === "local" ? "is-active" : ""}
          onClick={() => setMapMode("local")}
        >
          LOCAL
        </button>
      </div>

      {mapMode === "local" ? (
        <div className="pip-map-local-mode">
          <LocalGmChat
            mapData={mapData}
            playerPosition={playerPosition}
            selectedCell={selectedCell}
          />
        </div>
      ) : (
        <div
          className="pip-map-grid pip-map-grid--wasteland"
          style={{
            gridTemplateColumns: `repeat(${VIEW_COLS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${VIEW_ROWS}, minmax(0, 1fr))`,
          }}
        >
          {visibleCells.map((cell) => {
            const key = getCellKey(cell.x, cell.y);

            return (
              <MapCell
                key={key}
                cell={cell}
                isPlayerHere={
                  playerPosition.x === cell.x && playerPosition.y === cell.y
                }
                isSelected={selectedKey === key}
                isDiscovered={discoveredSet.has(key)}
                isReachable={reachableMap.get(key)}
                onSelect={onSelectCell}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default React.memo(MapGrid);
