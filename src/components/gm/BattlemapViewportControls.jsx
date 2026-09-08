import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./battlemapViewport.css";

const BASE_CELL_SIZE = 44;
const MIN_ZOOM = 15;
const MAX_ZOOM = 200;

export const BATTLEMAP_GRID_PRESETS = [
  [12, 12],
  [18, 18],
  [24, 24],
  [36, 36],
  [48, 48],
  [60, 60],
  [12, 24],
  [18, 30],
  [24, 36],
  [36, 48],
  [48, 60],
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min));
}

function makeStartZone(cols, rows) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function zoomKey(role) {
  return `pip2d20_battlemap_zoom_${role === "player" ? "player" : "gm"}_v1`;
}

function readZoom(role) {
  try {
    const saved = Number(localStorage.getItem(zoomKey(role)));
    return Number.isFinite(saved) ? clamp(saved, MIN_ZOOM, MAX_ZOOM) : 100;
  } catch {
    return 100;
  }
}

function selectors(role) {
  if (role === "player") {
    return {
      container: ".session-tactical-player",
      grid: ".session-tactical-player .gm-session-map__grid.tactical-grid",
      toolbar: null,
    };
  }
  return {
    container: ".gm-tactical-map-core .gm-session-map.tactical-map",
    grid: ".gm-tactical-map-core .gm-session-map__grid.tactical-grid",
    toolbar: ".gm-tactical-map-core .tactical-toolbar",
  };
}

export default function BattlemapViewportControls({ session, role = "gm", activeTab = "" }) {
  const scene = session?.tacticalScene || null;
  const [zoom, setZoom] = useState(() => readZoom(role));
  const [targets, setTargets] = useState({ container: null, grid: null, toolbar: null });
  const query = useMemo(() => selectors(role), [role]);
  const cols = Math.max(1, Number(scene?.cols || 12));
  const rows = Math.max(1, Number(scene?.rows || 12));
  const cellSize = Math.max(6, Math.round(BASE_CELL_SIZE * zoom / 100));

  useEffect(() => {
    try { localStorage.setItem(zoomKey(role), String(Math.round(zoom))); } catch { /* noop */ }
  }, [role, zoom]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => {
      const next = {
        container: document.querySelector(query.container),
        grid: document.querySelector(query.grid),
        toolbar: query.toolbar ? document.querySelector(query.toolbar) : null,
      };
      setTargets((current) => current.container === next.container && current.grid === next.grid && current.toolbar === next.toolbar ? current : next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [query]);

  useEffect(() => {
    const grid = targets.grid;
    const container = targets.container;
    if (!grid || !container) return undefined;

    const apply = () => {
      grid.classList.add("battlemap-scroll-grid");
      grid.classList.toggle("is-overview-zoom", zoom < 45);
      grid.style.setProperty("--battlemap-cell", `${cellSize}px`);
      grid.style.setProperty("--battlemap-cols", String(cols));
      grid.style.setProperty("--battlemap-rows", String(rows));
      grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
      grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;
      grid.style.backgroundSize = `${cols * cellSize}px ${rows * cellSize}px`;
      grid.style.backgroundAttachment = "local";
      container.classList.add("has-battlemap-controls");
      container.style.setProperty("--battlemap-grid-top", `${Math.max(0, grid.offsetTop)}px`);
    };

    apply();
    const resize = new ResizeObserver(apply);
    resize.observe(container);
    resize.observe(grid);
    window.addEventListener("resize", apply);
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((value) => clamp(value + (event.deltaY > 0 ? -10 : 10), MIN_ZOOM, MAX_ZOOM));
    };
    grid.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", apply);
      grid.removeEventListener("wheel", onWheel);
      grid.classList.remove("battlemap-scroll-grid", "is-overview-zoom");
      container.classList.remove("has-battlemap-controls");
    };
  }, [targets.grid, targets.container, cols, rows, cellSize, zoom, activeTab]);

  useEffect(() => {
    const grid = targets.grid;
    if (!grid || !scene?.sceneId) return;
    requestAnimationFrame(() => grid.scrollTo({ left: 0, top: 0 }));
  }, [scene?.sceneId, targets.grid]);

  if (!scene || !targets.container || !targets.grid) return null;

  const nudge = (x, y) => {
    const grid = targets.grid;
    if (!grid) return;
    const dx = Math.max(160, Math.round(grid.clientWidth * 0.68));
    const dy = Math.max(160, Math.round(grid.clientHeight * 0.68));
    grid.scrollBy({ left: x * dx, top: y * dy, behavior: "smooth" });
  };

  const fit = () => {
    const grid = targets.grid;
    if (!grid) return;
    const width = Math.max(120, grid.clientWidth - 20);
    const height = Math.max(120, grid.clientHeight - 20);
    const cell = Math.min(width / cols, height / rows);
    setZoom(clamp(Math.floor(cell / BASE_CELL_SIZE * 100), MIN_ZOOM, MAX_ZOOM));
    requestAnimationFrame(() => grid.scrollTo({ left: 0, top: 0, behavior: "smooth" }));
  };

  const zoomControls = createPortal(
    <div className="battlemap-view-controls" aria-label="Battlemap zoom controls">
      <button type="button" className="battlemap-control-btn" onClick={() => setZoom((value) => clamp(value - 10, MIN_ZOOM, MAX_ZOOM))} aria-label="Zoom out">−</button>
      <input className="battlemap-zoom-slider" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step="5" value={zoom} onChange={(event) => setZoom(clamp(event.target.value, MIN_ZOOM, MAX_ZOOM))} aria-label="Battlemap zoom" />
      <button type="button" className="battlemap-control-btn" onClick={() => setZoom((value) => clamp(value + 10, MIN_ZOOM, MAX_ZOOM))} aria-label="Zoom in">+</button>
      <button type="button" className="battlemap-zoom-value" onClick={() => setZoom(100)} title="Reset zoom to 100%">{Math.round(zoom)}%</button>
      <button type="button" className="battlemap-fit-btn" onClick={fit}>FIT</button>
    </div>,
    targets.container
  );

  const panControls = createPortal(
    <div className="battlemap-pan-controls" aria-label="Battlemap pan controls">
      <button type="button" className="is-up" onClick={() => nudge(0, -1)} aria-label="Pan up">↑</button>
      <button type="button" className="is-left" onClick={() => nudge(-1, 0)} aria-label="Pan left">←</button>
      <button type="button" className="is-center" onClick={() => targets.grid?.scrollTo({ left: 0, top: 0, behavior: "smooth" })} aria-label="Pan to map origin">⌂</button>
      <button type="button" className="is-right" onClick={() => nudge(1, 0)} aria-label="Pan right">→</button>
      <button type="button" className="is-down" onClick={() => nudge(0, 1)} aria-label="Pan down">↓</button>
    </div>,
    targets.container
  );

  const presetValue = `${cols}x${rows}`;
  const isPreset = BATTLEMAP_GRID_PRESETS.some(([x, y]) => `${x}x${y}` === presetValue);
  const live = Boolean(scene.active && scene.sceneId === session?.liveSceneId);
  const gridPreset = role === "gm" && targets.toolbar ? createPortal(
    <label className="battlemap-grid-presets">
      <span>GRID</span>
      <select className="pip-input" value={presetValue} disabled={live} onChange={(event) => {
        const [nextCols, nextRows] = String(event.target.value).split("x").map(Number);
        if (!nextCols || !nextRows) return;
        session.updateTacticalScene?.({ cols: nextCols, rows: nextRows, startZone: makeStartZone(nextCols, nextRows) });
      }}>
        {!isPreset ? <option value={presetValue} disabled>{cols}×{rows} · LEGACY</option> : null}
        {BATTLEMAP_GRID_PRESETS.map(([x, y]) => <option key={`${x}x${y}`} value={`${x}x${y}`}>{x}×{y}</option>)}
      </select>
    </label>,
    targets.toolbar
  ) : null;

  return <>{zoomControls}{panControls}{gridPreset}</>;
}
