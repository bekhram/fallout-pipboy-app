import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { generateProceduralWastelandPoiData } from "../../utils/proceduralWastelandPoi.js";

function markerSymbol(poi) {
  if ((poi?.markers || []).includes("ENEMY")) return "!";
  if ((poi?.markers || []).includes("TERMINAL")) return "T";
  if ((poi?.markers || []).includes("MEDS")) return "+";
  return "?";
}

export default function WastelandPoiPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);
  const pois = useMemo(() => {
    if (!spec || String(spec?.type || "") !== "wasteland") return [];
    return generateProceduralWastelandPoiData(spec);
  }, [spec?.seed, spec?.terrain, spec?.density, spec?.avgPartyLevel, spec?.partySize, spec?.encounterDifficulty, spec?.enemyFaction]);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const findTarget = () => {
      if (cancelled) return;
      const node = document.querySelector(".gm-tactical-map-core .gm-session-map__grid");
      if (node) { setTarget(node); return; }
      tries += 1;
      if (tries < 30) window.setTimeout(findTarget, 50);
    };
    findTarget();
    return () => { cancelled = true; setTarget(null); };
  }, [scene?.sceneId, spec?.seed, spec?.terrain]);

  if (!target || !pois.length) return null;
  return createPortal(
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 35 }}>
      {pois.map((poi, index) => (
        <div
          key={poi.id}
          data-wasteland-poi={poi.id}
          title={poi.poiType}
          style={{
            position: "absolute",
            left: `${((Number(poi.x || 0) + 0.5) / 24) * 100}%`,
            top: `${((Number(poi.y || 0) + 0.5) / 24) * 100}%`,
            width: 30,
            height: 30,
            transform: "translate(-50%, -50%)",
            border: "2px solid currentColor",
            borderRadius: "50%",
            background: "rgba(0, 20, 7, .88)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.45), 0 0 10px currentColor",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          <span>{index + 1}</span>
          <small style={{ position: "absolute", right: -6, bottom: -6, width: 15, height: 15, borderRadius: "50%", background: "rgba(0,20,7,.95)", border: "1px solid currentColor", display: "grid", placeItems: "center", fontSize: 9 }}>{markerSymbol(poi)}</small>
        </div>
      ))}
    </div>,
    target
  );
}
