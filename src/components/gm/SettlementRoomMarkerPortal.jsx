import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { generateSettlementRoomMarkers } from "../../utils/proceduralSettlementRoomMarkers.js";

export default function SettlementRoomMarkerPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  const markers = useMemo(() => {
    if (!spec || String(spec?.type || "") !== "settlement") return [];
    return generateSettlementRoomMarkers(spec);
  }, [
    spec?.seed,
    spec?.terrain,
    spec?.density,
    spec?.lootRarity,
    spec?.wealth,
    spec?.avgPartyLevel,
    spec?.partySize,
    spec?.encounterDifficulty,
    spec?.enemyFaction,
  ]);

  useEffect(() => {
    if (!spec || String(spec?.type || "") !== "settlement") {
      setTarget(null);
      return undefined;
    }

    let cancelled = false;
    let tries = 0;

    const findTarget = () => {
      if (cancelled) return;
      const node = document.querySelector(".gm-tactical-map-core .gm-session-map__grid");
      if (node) {
        setTarget(node);
        return;
      }
      tries += 1;
      if (tries < 30) window.setTimeout(findTarget, 50);
    };

    findTarget();
    return () => {
      cancelled = true;
      setTarget(null);
    };
  }, [scene?.sceneId, spec?.seed, spec?.terrain, spec?.type]);

  if (!target || !markers.length) return null;

  return createPortal(
    <div
      aria-hidden="true"
      data-settlement-room-markers="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 45 }}
    >
      {markers.map((marker) => (
        <div
          key={marker.id}
          data-settlement-room-marker={marker.roomId}
          data-settlement-room-number={marker.marker}
          title={`Room ${marker.marker}`}
          style={{
            position: "absolute",
            left: `${((Number(marker.x || 0) + 0.5) / 24) * 100}%`,
            top: `${((Number(marker.y || 0) + 0.5) / 24) * 100}%`,
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
          <span>{marker.marker}</span>
          <small
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: "rgba(0,20,7,.95)",
              border: "1px solid currentColor",
              display: "grid",
              placeItems: "center",
              fontSize: 9,
            }}
          >
            {marker.symbol}
          </small>
        </div>
      ))}
    </div>,
    target,
  );
}
