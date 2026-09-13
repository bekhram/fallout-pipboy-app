import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  generateRedRocketRoomMarkers,
  generateSettlementRoomMarkers,
} from "../../utils/proceduralSettlementRoomMarkers.js";

const GRID = 24;

export default function SettlementRoomMarkerPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const locationType = String(spec?.type || "");
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");
  const supportsRoomMarkers = locationType === "settlement" || locationType === "red_rocket";
  const [target, setTarget] = useState(null);

  const markers = useMemo(() => {
    if (!isGmHost || !spec || !supportsRoomMarkers) return [];
    return locationType === "red_rocket"
      ? generateRedRocketRoomMarkers(spec)
      : generateSettlementRoomMarkers(spec);
  }, [
    isGmHost,
    spec?.seed,
    spec?.terrain,
    spec?.density,
    spec?.lootRarity,
    spec?.wealth,
    spec?.avgPartyLevel,
    spec?.partySize,
    spec?.encounterDifficulty,
    spec?.enemyFaction,
    locationType,
    supportsRoomMarkers,
  ]);

  useEffect(() => {
    if (!isGmHost || !spec || !supportsRoomMarkers) {
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
  }, [isGmHost, scene?.sceneId, spec?.seed, spec?.terrain, spec?.type, supportsRoomMarkers]);

  if (!isGmHost || !target || !markers.length) return null;

  return createPortal(
    <div
      aria-hidden="true"
      data-gm-only-room-markers="true"
      data-numbered-room-markers={locationType}
      data-settlement-room-markers="true"
      data-red-rocket-room-markers={locationType === "red_rocket" ? "true" : undefined}
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 120,
        overflow: "hidden",
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
      }}
    >
      {markers.map((marker) => (
        <div
          key={marker.id}
          data-numbered-room-marker={marker.roomId}
          data-settlement-room-marker={marker.roomId}
          data-red-rocket-room-marker={locationType === "red_rocket" ? marker.roomId : undefined}
          data-settlement-room-number={marker.marker}
          title={`Room ${marker.marker}`}
          style={{
            position: "absolute",
            left: `${((Number(marker.x || 0) + 0.5) / GRID) * 100}%`,
            top: `${((Number(marker.y || 0) + 0.5) / GRID) * 100}%`,
            width: 30,
            height: 30,
            transform: "translate(-50%, -50%)",
            border: "2px solid currentColor",
            borderRadius: "50%",
            background: "rgba(0, 20, 7, .96)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.72), 0 0 13px currentColor",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
            zIndex: 1,
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
              background: "rgba(0,20,7,.98)",
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
