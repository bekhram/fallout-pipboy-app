import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import CombatAwareLocalGmChat from "./CombatAwareLocalGmChat.jsx";
import WorldOverview from "./WorldOverview.jsx";
import SessionMapPositionSync from "./SessionMapPositionSync.jsx";
import SettlementScreen from "../settlement/SettlementScreen.jsx";
import useSettlementStorage from "../../hooks/useSettlementStorage.js";
import { findTravelRoute, getCellKey } from "../../utils/mapMath.js";
import { getMapLanguageCode, mapUiText } from "./mapUiText.js";
import "./localMapMode.css";

const VIEW_COLS = 8;
const VIEW_ROWS = 8;

const SETTLEMENT_COPY = {
  en: { found: "FOUND SETTLEMENT", open: "OPEN SETTLEMENT", prompt: "Settlement name", fallback: "New Settlement" },
  ru: { found: "ОСНОВАТЬ ПОСЕЛЕНИЕ", open: "ОТКРЫТЬ ПОСЕЛЕНИЕ", prompt: "Название поселения", fallback: "Новое поселение" },
  uk: { found: "ЗАСНУВАТИ ПОСЕЛЕННЯ", open: "ВІДКРИТИ ПОСЕЛЕННЯ", prompt: "Назва поселення", fallback: "Нове поселення" },
  pl: { found: "ZAŁÓŻ OSADĘ", open: "OTWÓRZ OSADĘ", prompt: "Nazwa osady", fallback: "Nowa osada" },
};

function getWorldCoords(mapData, cell) {
  if (!cell) return null;
  const offset = mapData?.worldOffset || { x: 0, y: 0 };
  return {
    x: offset.x * (mapData?.cols || VIEW_COLS) + cell.x,
    y: offset.y * (mapData?.rows || VIEW_ROWS) + cell.y,
  };
}

function getStaticLocation(mapData, cell, locations = []) {
  const coords = getWorldCoords(mapData, cell);
  if (!coords) return null;
  return locations.find(
    (location) => location.worldX === coords.x && location.worldY === coords.y
  ) || null;
}

function MapGrid({
  background,
  markers = [],
  onMarker,
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
  locations,
  region,
  travelEncounter,
  onTravelEncounterHandled,
}) {
  const { t, i18n } = useTranslation();
  const language = getMapLanguageCode(i18n.resolvedLanguage || i18n.language || "en");
  const tx = (key, vars) => mapUiText(language, key, vars);
  const settlementCopy = SETTLEMENT_COPY[language] || SETTLEMENT_COPY.en;
  const settlementStore = useSettlementStorage();
  const [activeSettlementId, setActiveSettlementId] = useState(null);
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

  const route = useMemo(
    () => selectedCell ? findTravelRoute(mapData, playerPosition, selectedCell) : null,
    [mapData, playerPosition, selectedCell]
  );
  const deltaX = selectedCell ? selectedCell.x - playerPosition.x : 0;
  const deltaY = selectedCell ? selectedCell.y - playerPosition.y : 0;
  const direction = selectedCell
    ? `${deltaY < 0 ? "N" : deltaY > 0 ? "S" : ""}${deltaX > 0 ? "E" : deltaX < 0 ? "W" : ""}` || tx("here")
    : null;
  const selectedStaticLocation = selectedCell ? getStaticLocation(mapData, selectedCell, locations) : null;
  const translatedStaticName = selectedStaticLocation?.nameKey
    ? t(selectedStaticLocation.nameKey, { defaultValue: selectedStaticLocation.name })
    : selectedStaticLocation?.name;
  const destinationType = selectedStaticLocation ? tx("static") : tx("procedural");
  const destinationName =
    translatedStaticName ||
    selectedStaticLocation?.id?.replaceAll("_", " ") ||
    selectedCell?.poi?.name ||
    selectedCell?.poi?.id?.replaceAll("_", " ") ||
    (selectedCell ? `${tx("destination")} ${selectedCell.x},${selectedCell.y}` : null);
  const routeReady = Boolean(route && route.cells.length > 0);

  const currentWorld = getWorldCoords(mapData, playerPosition);
  const currentStaticLocationRaw = getStaticLocation(mapData, playerPosition, locations);
  const currentStaticLocation = currentStaticLocationRaw
    ? {
        ...currentStaticLocationRaw,
        name: currentStaticLocationRaw.nameKey
          ? t(currentStaticLocationRaw.nameKey, { defaultValue: currentStaticLocationRaw.name })
          : currentStaticLocationRaw.name,
      }
    : null;
  const currentSettlement = currentWorld
    ? settlementStore.byPosition(region?.id, currentWorld.x, currentWorld.y)
    : null;
  const activeSettlement = activeSettlementId
    ? settlementStore.settlements.find((item) => item.id === activeSettlementId) || null
    : null;

  const openLocal = () => setMapMode("local");
  const minimizeLocal = () => setMapMode("world");

  function handleSettlementAction() {
    if (!currentWorld || !region?.id) return;
    if (currentSettlement) {
      setActiveSettlementId(currentSettlement.id);
      return;
    }
    const fallback = `${settlementCopy.fallback} ${settlementStore.settlements.length + 1}`;
    const requestedName = typeof window !== "undefined"
      ? window.prompt(settlementCopy.prompt, fallback)
      : fallback;
    if (requestedName === null) return;
    const created = settlementStore.create({
      name: requestedName || fallback,
      regionId: region.id,
      worldX: currentWorld.x,
      worldY: currentWorld.y,
      ownerCharacterId: character?.id || character?.characterId || null,
    });
    setActiveSettlementId(created.id);
  }

  if (activeSettlement) {
    return (
      <div className="settlement-fullscreen-host">
        <SettlementScreen
          settlement={activeSettlement}
          onUpdate={(updater) => settlementStore.update(activeSettlement.id, updater)}
          onBack={() => setActiveSettlementId(null)}
        />
      </div>
    );
  }

  return (
    <div className={`pip-map-mode-shell ${mapMode === "local" ? "is-local" : mapMode === "overview" ? "is-overview" : "is-world"}`}>
      <SessionMapPositionSync
        character={character}
        mapData={mapData}
        playerPosition={playerPosition}
        region={region}
      />
      {mapMode === "local" ? (
        <div className="pip-map-local-fullscreen" role="dialog" aria-modal="true" aria-label="Auto GM">
          <div className="pip-map-local-fullscreen__bar">
            <strong>{tx("local")} // {tx("autoGm")}</strong>
            <button type="button" onClick={minimizeLocal} aria-label="Minimize Auto GM">—</button>
          </div>
          <div className="pip-map-local-fullscreen__content">
            <CombatAwareLocalGmChat
              mapData={mapData}
              playerPosition={playerPosition}
              selectedCell={selectedCell}
              characterData={character}
              weaponDatabase={weaponDatabase}
              locations={locations}
              region={region}
              travelEncounter={travelEncounter}
              onTravelEncounterHandled={onTravelEncounterHandled}
            />
          </div>
        </div>
      ) : mapMode === "overview" ? (
        <WorldOverview background={background} mapData={mapData} playerPosition={playerPosition} locations={locations} />
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
            <button
              type="button"
              className="pip-map-settlement-button"
              onClick={handleSettlementAction}
              title={currentSettlement?.name || settlementCopy.found}
            >
              ⌂ {currentSettlement ? settlementCopy.open : settlementCopy.found}
            </button>
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
          <PhaserMapViewport
            cols={VIEW_COLS} rows={VIEW_ROWS}
            sceneKey={`${region?.id}:${mapData.worldOffset?.x}:${mapData.worldOffset?.y}`}
            background={background}
            cells={visibleCells.map(cell => ({ ...cell, x: cell.x - viewport.startX, y: cell.y - viewport.startY, discovered: discoveredSet.has(getCellKey(cell.x, cell.y)) }))}
            markers={markers.map(marker => ({ ...marker, source: marker, x: marker.x - viewport.startX, y: marker.y - viewport.startY }))}
            onMarker={marker => onMarker?.(marker.source)}
            onCell={(x, y) => onSelectCell(cellIndex.get(getCellKey(x + viewport.startX, y + viewport.startY)))}
            player={{ x: playerPosition.x - viewport.startX, y: playerPosition.y - viewport.startY }}
            selected={selectedCell ? { x: selectedCell.x - viewport.startX, y: selectedCell.y - viewport.startY } : null}
            route={[playerPosition, ...(route?.cells || [])].map(cell => ({ x: cell.x - viewport.startX, y: cell.y - viewport.startY }))}
            label={tx("world")}
          />
        </>
      )}
    </div>
  );
}

export default React.memo(MapGrid);
