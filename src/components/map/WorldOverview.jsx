import React, { useMemo, useState } from "react";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;
const PADDING = 4;

function locationName(location) {
  if (!location) return "Unknown";
  return location.name || location.id?.replaceAll("_", " ") || "Unknown";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function WorldOverview({ mapData, playerPosition }) {
  const worldOffset = mapData?.worldOffset || { x: 0, y: 0 };
  const cols = mapData?.cols || 8;
  const rows = mapData?.rows || 8;
  const playerWorld = {
    x: worldOffset.x * cols + (playerPosition?.x || 0),
    y: worldOffset.y * rows + (playerPosition?.y || 0),
  };

  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const select = document.querySelector(".pip-map-select-label select");
      return select?.value || FALLOUT_4_LOCATIONS[0]?.id || "";
    } catch {
      return FALLOUT_4_LOCATIONS[0]?.id || "";
    }
  });

  const selected = FALLOUT_4_LOCATIONS.find((location) => location.id === selectedId) || null;

  const bounds = useMemo(() => {
    const xs = [playerWorld.x, ...FALLOUT_4_LOCATIONS.map((location) => location.worldX)];
    const ys = [playerWorld.y, ...FALLOUT_4_LOCATIONS.map((location) => location.worldY)];
    const minX = Math.min(...xs) - PADDING;
    const maxX = Math.max(...xs) + PADDING;
    const minY = Math.min(...ys) - PADDING;
    const maxY = Math.max(...ys) + PADDING;
    return { minX, maxX, minY, maxY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }, [playerWorld.x, playerWorld.y]);

  function point(worldX, worldY) {
    return {
      left: `${((worldX - bounds.minX) / bounds.width) * 100}%`,
      top: `${((worldY - bounds.minY) / bounds.height) * 100}%`,
    };
  }

  const sectorLines = useMemo(() => {
    const vertical = [];
    const horizontal = [];
    const startSectorX = Math.floor(bounds.minX / cols);
    const endSectorX = Math.ceil(bounds.maxX / cols);
    const startSectorY = Math.floor(bounds.minY / rows);
    const endSectorY = Math.ceil(bounds.maxY / rows);
    for (let sx = startSectorX; sx <= endSectorX; sx += 1) {
      const x = sx * cols;
      vertical.push(((x - bounds.minX) / bounds.width) * 100);
    }
    for (let sy = startSectorY; sy <= endSectorY; sy += 1) {
      const y = sy * rows;
      horizontal.push(((y - bounds.minY) / bounds.height) * 100);
    }
    return { vertical, horizontal };
  }, [bounds, cols, rows]);

  function chooseLocation(location) {
    setSelectedId(location.id);
    try {
      const select = document.querySelector(".pip-map-select-label select");
      if (select) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
        setter?.call(select, location.id);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } catch {
      // Sidebar synchronization is optional; overview still works independently.
    }
  }

  const playerPoint = point(playerWorld.x, playerWorld.y);
  const targetPoint = selected ? point(selected.worldX, selected.worldY) : null;
  const routeX1 = parseFloat(playerPoint.left);
  const routeY1 = parseFloat(playerPoint.top);
  const routeX2 = targetPoint ? parseFloat(targetPoint.left) : routeX1;
  const routeY2 = targetPoint ? parseFloat(targetPoint.top) : routeY1;
  const distance = selected
    ? Math.hypot(selected.worldX - playerWorld.x, selected.worldY - playerWorld.y)
    : 0;

  return (
    <section className="pip-world-overview">
      <div className="pip-world-overview__toolbar">
        <div>
          <strong>WORLD OVERVIEW</strong>
          <span>{selected ? `ROUTE // ${locationName(selected).toUpperCase()}` : "SELECT A STATIC LOCATION"}</span>
        </div>
        <div className="pip-world-overview__zoom">
          <button type="button" onClick={() => setZoom((value) => clamp(value - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => clamp(value + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}>+</button>
          <button type="button" onClick={() => setZoom(1)}>FIT</button>
        </div>
      </div>

      <div className="pip-world-overview__viewport">
        <div className="pip-world-overview__canvas" style={{ transform: `scale(${zoom})` }}>
          {sectorLines.vertical.map((left, index) => (
            <span key={`v-${index}`} className="pip-world-overview__sector-line is-vertical" style={{ left: `${left}%` }} />
          ))}
          {sectorLines.horizontal.map((top, index) => (
            <span key={`h-${index}`} className="pip-world-overview__sector-line is-horizontal" style={{ top: `${top}%` }} />
          ))}

          {selected ? (
            <svg className="pip-world-overview__route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1={routeX1} y1={routeY1} x2={routeX2} y2={routeY2} />
            </svg>
          ) : null}

          {FALLOUT_4_LOCATIONS.map((location) => {
            const pos = point(location.worldX, location.worldY);
            return (
              <button
                key={location.id}
                type="button"
                className={`pip-world-overview__poi${location.id === selectedId ? " is-selected" : ""}${location.major ? " is-major" : ""}`}
                style={pos}
                onClick={() => chooseLocation(location)}
                title={locationName(location)}
              >
                <span>{location.icon || "◆"}</span>
                <em>{locationName(location)}</em>
              </button>
            );
          })}

          <div className="pip-world-overview__player" style={playerPoint} title="Current position">
            <span>▲</span>
            <em>YOU</em>
          </div>
        </div>
      </div>

      <div className="pip-world-overview__status">
        <span>WORLD {playerWorld.x},{playerWorld.y}</span>
        {selected ? <span>TARGET {selected.worldX},{selected.worldY}</span> : null}
        {selected ? <span>~{distance.toFixed(1)} BLOCKS</span> : null}
        <span>{Math.ceil(bounds.width / cols)}×{Math.ceil(bounds.height / rows)} SECTOR VIEW</span>
      </div>
    </section>
  );
}
