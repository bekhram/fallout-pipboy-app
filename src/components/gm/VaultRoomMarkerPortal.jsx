import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { vaultRoomMarkers } from "../../utils/proceduralVaultEncounter.js";

export default function VaultRoomMarkerPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const layout = scene?.environment?.vaultLayout || null;
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");
  const [target, setTarget] = useState(null);
  const cols = Math.max(1, Number(spec?.cols || scene?.cols || 24));
  const rows = Math.max(1, Number(spec?.rows || scene?.rows || cols));

  const markers = useMemo(
    () => (isGmHost && String(spec?.type || "") === "vault_tunnels" && layout ? vaultRoomMarkers(layout) : []),
    [isGmHost, spec?.type, spec?.seed, spec?.cols, spec?.rows, layout],
  );

  useEffect(() => {
    if (!isGmHost || String(spec?.type || "") !== "vault_tunnels") {
      setTarget(null);
      return undefined;
    }
    const find = () => setTarget(document.querySelector(".gm-tactical-map-core .gm-session-map__grid"));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      setTarget(null);
    };
  }, [isGmHost, scene?.sceneId, spec?.type, spec?.seed]);

  if (!target || !markers.length) return null;

  return createPortal(
    <div
      aria-hidden="true"
      data-vault-room-markers="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 125,
        overflow: "hidden",
      }}
    >
      {markers.map((marker) => (
        <div
          key={marker.id}
          title={`${marker.marker}. ${marker.label}`}
          data-vault-room-marker={marker.roomId}
          style={{
            position: "absolute",
            left: `${(marker.x / cols) * 100}%`,
            top: `${(marker.y / rows) * 100}%`,
            width: 32,
            height: 32,
            transform: "translate(-50%, -50%)",
            border: "2px solid #8cff9b",
            borderRadius: "50%",
            color: "#8cff9b",
            background: "rgba(0,20,7,.94)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.76), 0 0 12px rgba(140,255,155,.8)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {marker.marker}
        </div>
      ))}
    </div>,
    target,
  );
}
