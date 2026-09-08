import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { gmMenuText } from "./gmMenuI18n.js";
import "./battlemapViewport.css";

const BASE_CELL_SIZE = 44;
const MIN_ZOOM = 15;
const MAX_ZOOM = 200;
const MOBILE_COMFORT_ZOOM = 85;

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

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(max-width: 780px)")?.matches
  );
}

function comfortZoom() {
  return isMobileViewport() ? MOBILE_COMFORT_ZOOM : 100;
}

function makeStartZone(cols, rows) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function zoomKey(role) {
  return `pip2d20_battlemap_zoom_${role === "player" ? "player" : "gm"}_v2`;
}

function readZoom(role) {
  try {
    const saved = Number(localStorage.getItem(zoomKey(role)));
    return Number.isFinite(saved)
      ? clamp(saved, MIN_ZOOM, MAX_ZOOM)
      : comfortZoom();
  } catch {
    return comfortZoom();
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

function tokenFootprint(token) {
  const value = Number(token?.stats?.footprint || token?.size || 1);
  return Math.max(1, Math.min(3, Number.isFinite(value) ? value : 1));
}

export default function BattlemapViewportControls({
  session,
  role = "gm",
  activeTab = "",
}) {
  const { i18n } = useTranslation();
  const text = gmMenuText(i18n.resolvedLanguage || i18n.language);
  const scene = session?.tacticalScene || null;
  const [zoom, setZoom] = useState(() => readZoom(role));
  const [targets, setTargets] = useState({
    container: null,
    grid: null,
    toolbar: null,
  });
  const query = useMemo(() => selectors(role), [role]);
  const cols = Math.max(1, Number(scene?.cols || 12));
  const rows = Math.max(1, Number(scene?.rows || 12));
  const cellSize = Math.max(6, Math.round((BASE_CELL_SIZE * zoom) / 100));

  const focusToken = useMemo(() => {
    const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
    const activeId = String(session?.turnState?.activeTokenId || "");
    const active = activeId
      ? tokens.find((token) => String(token?.id || "") === activeId)
      : null;
    if (active) return active;

    if (role === "player") {
      const clientId = String(session?.clientId || session?.peerId || "");
      const owned = tokens.find(
        (token) =>
          token?.kind === "player" &&
          (String(token?.ownerClientId || "") === clientId ||
            String(token?.stats?.assignedClientId || "") === clientId)
      );
      if (owned) return owned;
    }

    return (
      tokens.find((token) => token?.kind === "player") || tokens[0] || null
    );
  }, [
    scene?.tokens,
    session?.turnState?.activeTokenId,
    session?.clientId,
    session?.peerId,
    role,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem(zoomKey(role), String(Math.round(zoom)));
    } catch {
      /* noop */
    }
  }, [role, zoom]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => {
      const next = {
        container: document.querySelector(query.container),
        grid: document.querySelector(query.grid),
        toolbar: query.toolbar ? document.querySelector(query.toolbar) : null,
      };
      setTargets((current) =>
        current.container === next.container &&
        current.grid === next.grid &&
        current.toolbar === next.toolbar
          ? current
          : next
      );
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
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
      container.style.setProperty(
        "--battlemap-grid-top",
        `${Math.max(0, grid.offsetTop)}px`
      );
    };

    apply();
    const resize = new ResizeObserver(apply);
    resize.observe(container);
    resize.observe(grid);
    window.addEventListener("resize", apply);
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((value) =>
        clamp(value + (event.deltaY > 0 ? -10 : 10), MIN_ZOOM, MAX_ZOOM)
      );
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

  const focusMap = (behavior = "smooth") => {
    const grid = targets.grid;
    if (!grid) return;

    let x = 0;
    let y = 0;
    let size = 1;
    if (focusToken) {
      x = Math.max(0, Number(focusToken.x || 0));
      y = Math.max(0, Number(focusToken.y || 0));
      size = tokenFootprint(focusToken);
    } else if (Array.isArray(scene?.startZone) && scene.startZone.length) {
      const first = scene.startZone[0];
      x = Math.max(0, Number(first?.x || 0));
      y = Math.max(0, Number(first?.y || 0));
    }

    const centerX = (x + size / 2) * cellSize;
    const centerY = (y + size / 2) * cellSize;
    const left = clamp(
      centerX - grid.clientWidth / 2,
      0,
      Math.max(0, grid.scrollWidth - grid.clientWidth)
    );
    const top = clamp(
      centerY - grid.clientHeight / 2,
      0,
      Math.max(0, grid.scrollHeight - grid.clientHeight)
    );
    grid.scrollTo({ left, top, behavior });
  };

  useEffect(() => {
    const grid = targets.grid;
    if (!grid || !scene?.sceneId) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => focusMap("auto"))
    );
    return () => cancelAnimationFrame(frame);
  }, [scene?.sceneId, targets.grid]);

  if (!scene || !targets.container || !targets.grid) return null;

  const nudge = (x, y) => {
    const grid = targets.grid;
    if (!grid) return;
    const dx = Math.max(120, Math.round(grid.clientWidth * 0.72));
    const dy = Math.max(120, Math.round(grid.clientHeight * 0.72));
    grid.scrollBy({ left: x * dx, top: y * dy, behavior: "smooth" });
  };

  const fit = () => {
    const grid = targets.grid;
    if (!grid) return;
    const width = Math.max(120, grid.clientWidth - 20);
    const height = Math.max(120, grid.clientHeight - 20);
    const cell = Math.min(width / cols, height / rows);
    setZoom(
      clamp(Math.floor((cell / BASE_CELL_SIZE) * 100), MIN_ZOOM, MAX_ZOOM)
    );
    requestAnimationFrame(() =>
      grid.scrollTo({ left: 0, top: 0, behavior: "smooth" })
    );
  };

  const resetComfortZoom = () => {
    setZoom(comfortZoom());
    requestAnimationFrame(() =>
      requestAnimationFrame(() => focusMap("smooth"))
    );
  };

  const zoomControls = createPortal(
    <div className="battlemap-view-controls" aria-label={text.zoomControls}>
      <button
        type="button"
        className="battlemap-control-btn"
        onClick={() =>
          setZoom((value) => clamp(value - 10, MIN_ZOOM, MAX_ZOOM))
        }
        aria-label={text.zoomOut}
      >
        −
      </button>
      <input
        className="battlemap-zoom-slider"
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step="5"
        value={zoom}
        onChange={(event) =>
          setZoom(clamp(event.target.value, MIN_ZOOM, MAX_ZOOM))
        }
        aria-label={text.zoom}
      />
      <button
        type="button"
        className="battlemap-control-btn"
        onClick={() =>
          setZoom((value) => clamp(value + 10, MIN_ZOOM, MAX_ZOOM))
        }
        aria-label={text.zoomIn}
      >
        +
      </button>
      <button
        type="button"
        className="battlemap-zoom-value"
        onClick={resetComfortZoom}
        title={text.comfortZoom}
      >
        {Math.round(zoom)}%
      </button>
      <button type="button" className="battlemap-fit-btn" onClick={fit}>
        {text.fit}
      </button>
    </div>,
    targets.container
  );

  const panControls = createPortal(
    <div className="battlemap-pan-controls" aria-label={text.panControls}>
      <button
        type="button"
        className="is-up"
        onClick={() => nudge(0, -1)}
        aria-label={text.panUp}
      >
        ↑
      </button>
      <button
        type="button"
        className="is-left"
        onClick={() => nudge(-1, 0)}
        aria-label={text.panLeft}
      >
        ←
      </button>
      <button
        type="button"
        className="is-center"
        onClick={() => focusMap("smooth")}
        aria-label={text.focusToken}
      >
        ◎
      </button>
      <button
        type="button"
        className="is-right"
        onClick={() => nudge(1, 0)}
        aria-label={text.panRight}
      >
        →
      </button>
      <button
        type="button"
        className="is-down"
        onClick={() => nudge(0, 1)}
        aria-label={text.panDown}
      >
        ↓
      </button>
    </div>,
    targets.container
  );

  const presetValue = `${cols}x${rows}`;
  const isPreset = BATTLEMAP_GRID_PRESETS.some(
    ([x, y]) => `${x}x${y}` === presetValue
  );
  const live = Boolean(scene.active && scene.sceneId === session?.liveSceneId);
  const gridPreset =
    role === "gm" && targets.toolbar
      ? createPortal(
          <label className="battlemap-grid-presets">
            <span>{text.grid}</span>
            <select
              className="pip-input"
              value={presetValue}
              disabled={live}
              onChange={(event) => {
                const [nextCols, nextRows] = String(event.target.value)
                  .split("x")
                  .map(Number);
                if (!nextCols || !nextRows) return;
                session.updateTacticalScene?.({
                  cols: nextCols,
                  rows: nextRows,
                  startZone: makeStartZone(nextCols, nextRows),
                });
              }}
            >
              {!isPreset ? (
                <option value={presetValue} disabled>
                  {cols}×{rows} · {text.legacy}
                </option>
              ) : null}
              {BATTLEMAP_GRID_PRESETS.map(([x, y]) => (
                <option key={`${x}x${y}`} value={`${x}x${y}`}>
                  {x}×{y}
                </option>
              ))}
            </select>
          </label>,
          targets.toolbar
        )
      : null;

  return (
    <>
      {zoomControls}
      {panControls}
      {gridPreset}
    </>
  );
}
