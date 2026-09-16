import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./gmBattlemapTools.css";

const ZONE_CELLS = 6;
const STROKE_TTL_MS = 10000;
const RULER_TTL_MS = 10000;

function selectorFor(role) {
  return role === "player"
    ? ".session-tactical-player .gm-session-map__grid.tactical-grid"
    : ".gm-tactical-map-core .gm-session-map__grid.tactical-grid";
}

function sceneSize(scene) {
  const spec = scene?.environment?.proceduralMapSpec;
  const cols = Math.max(1, Number(spec?.cols || scene?.cols || 12));
  const rows = Math.max(1, Number(spec?.rows || scene?.rows || 12));
  return { cols, rows };
}

export default function BattlemapSharedLayer({ scene, role = "gm" }) {
  const [grid, setGrid] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const { cols, rows } = sceneSize(scene);
  const allStrokes = useMemo(() => Array.isArray(scene?.mapMarkup?.strokes) ? scene.mapMarkup.strokes : [], [scene?.mapMarkup?.strokes]);
  const strokes = useMemo(
    () => allStrokes.filter((stroke) => {
      const createdAt = Number(stroke?.at || 0);
      return createdAt > 0 && now - createdAt < STROKE_TTL_MS;
    }),
    [allStrokes, now]
  );
  const allRulers = useMemo(() => Array.isArray(scene?.mapMarkup?.rulers) ? scene.mapMarkup.rulers : [], [scene?.mapMarkup?.rulers]);
  const rulers = useMemo(
    () => allRulers.filter((ruler) => {
      const createdAt = Number(ruler?.at || 0);
      return createdAt <= 0 || now - createdAt < RULER_TTL_MS;
    }),
    [allRulers, now]
  );
  const ping = scene?.mapMarkup?.ping || null;

  useEffect(() => {
    if (!allStrokes.length && !allRulers.length) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [allStrokes.length, allRulers.length]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const selector = selectorFor(role);
    const sync = () => setGrid((current) => {
      const next = document.querySelector(selector);
      return current === next ? current : next;
    });
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [role, scene?.sceneId]);

  if (!grid) return null;

  return createPortal(
    <div className="battlemap-shared-layer" aria-hidden="true">
      <svg className="battlemap-drawing-layer" viewBox={`0 0 ${cols} ${rows}`} preserveAspectRatio="none">
        {strokes.map((stroke) => {
          const points = Array.isArray(stroke?.points) ? stroke.points : [];
          if (points.length < 2) return null;
          const age = Math.max(0, now - Number(stroke?.at || now));
          const opacity = Math.max(0, Math.min(1, (STROKE_TTL_MS - age) / 1400));
          return <polyline key={stroke.id} points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="0.12" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
        })}
        {rulers.map((ruler) => {
          const start = ruler?.start;
          const end = ruler?.end;
          if (![start?.x, start?.y, end?.x, end?.y].every((value) => Number.isFinite(Number(value)))) return null;
          return (
            <g key={ruler.id || ruler.ownerClientId} className="battlemap-shared-ruler">
              <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="currentColor" strokeWidth="0.09" strokeDasharray="0.24 0.16" />
              <circle cx={start.x} cy={start.y} r="0.16" fill="currentColor" />
              <circle cx={end.x} cy={end.y} r="0.16" fill="currentColor" />
            </g>
          );
        })}
      </svg>
      {rulers.map((ruler) => {
        const start = ruler?.start;
        const end = ruler?.end;
        if (![start?.x, start?.y, end?.x, end?.y].every((value) => Number.isFinite(Number(value)))) return null;
        const zones = Math.ceil(Math.max(Math.abs(Number(end.x) - Number(start.x)), Math.abs(Number(end.y) - Number(start.y))) / ZONE_CELLS);
        return (
          <span key={`${ruler.id || ruler.ownerClientId}-label`} className="battlemap-ruler-label is-shared" style={{ left:`${(Number(end.x) / cols) * 100}%`, top:`${(Number(end.y) / rows) * 100}%` }}>
            {zones} ZONES · {ruler.ownerName || "PLAYER"}
          </span>
        );
      })}
      {ping && Number.isFinite(Number(ping.x)) && Number.isFinite(Number(ping.y)) ? (
        <span key={ping.id || ping.at} className="battlemap-shared-ping" style={{ left: `${(Number(ping.x) / cols) * 100}%`, top: `${(Number(ping.y) / rows) * 100}%` }}>
          <i /><i /><i />
        </span>
      ) : null}
    </div>,
    grid
  );
}
