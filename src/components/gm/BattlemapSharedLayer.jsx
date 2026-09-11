import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./gmBattlemapTools.css";

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
  const { cols, rows } = sceneSize(scene);
  const strokes = useMemo(() => Array.isArray(scene?.mapMarkup?.strokes) ? scene.mapMarkup.strokes : [], [scene?.mapMarkup?.strokes]);
  const ping = scene?.mapMarkup?.ping || null;

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
          return <polyline key={stroke.id} points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="0.12" strokeLinecap="round" strokeLinejoin="round" />;
        })}
      </svg>
      {ping && Number.isFinite(Number(ping.x)) && Number.isFinite(Number(ping.y)) ? (
        <span key={ping.id || ping.at} className="battlemap-shared-ping" style={{ left: `${(Number(ping.x) / cols) * 100}%`, top: `${(Number(ping.y) / rows) * 100}%` }}>
          <i /><i /><i />
        </span>
      ) : null}
    </div>,
    grid
  );
}
