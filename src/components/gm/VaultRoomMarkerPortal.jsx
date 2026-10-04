import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { vaultRoomMarkers } from "../../utils/proceduralVaultEncounter.js";
import { generateVaultLayout, vaultSpecFromScene } from "../../utils/proceduralVaultGenerator.js";

export default function VaultRoomMarkerPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = vaultSpecFromScene(scene);
  const persistedLayout = scene?.environment?.vaultLayout || null;
  const layout = useMemo(
    () => (Array.isArray(persistedLayout?.tiles) && persistedLayout.tiles.length
      ? persistedLayout
      : (spec ? generateVaultLayout(spec) : null)),
    [persistedLayout, spec?.type, spec?.seed, spec?.cols, spec?.rows],
  );
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");
  const [target, setTarget] = useState(null);
  const [focusedRoomId, setFocusedRoomId] = useState("");
  const cols = Math.max(1, Number(spec?.cols || scene?.cols || 24));
  const rows = Math.max(1, Number(spec?.rows || scene?.rows || cols));

  const markers = useMemo(
    () => (isGmHost && spec && layout ? vaultRoomMarkers(layout) : []),
    [isGmHost, spec?.type, spec?.seed, spec?.cols, spec?.rows, layout],
  );

  useEffect(() => {
    const focus = (event) => {
      const roomId = String(event?.detail?.roomId || "");
      if (!roomId) return;
      setFocusedRoomId(roomId);
      window.setTimeout(() => setFocusedRoomId((current) => current === roomId ? "" : current), 1600);
      window.requestAnimationFrame(() => {
        const node = document.querySelector(`[data-vault-room-marker="${roomId}"]`);
        node?.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "center" });
      });
    };
    window.addEventListener("pip2d20:vault-focus-room", focus);
    return () => window.removeEventListener("pip2d20:vault-focus-room", focus);
  }, []);

  useEffect(() => {
    if (!isGmHost || !spec) {
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
      {markers.map((marker) => {
        const focused = focusedRoomId === marker.roomId;
        return (
          <div
            key={marker.id}
            title={`${marker.marker}. ${marker.label}`}
            data-vault-room-marker={marker.roomId}
            className={focused ? "is-vault-room-focus" : ""}
            style={{
              position: "absolute",
              left: `${(marker.x / cols) * 100}%`,
              top: `${(marker.y / rows) * 100}%`,
              width: 32,
              height: 32,
              transform: focused ? "translate(-50%, -50%) scale(1.35)" : "translate(-50%, -50%)",
              border: "2px solid #8cff9b",
              borderRadius: "50%",
              color: "#8cff9b",
              background: "rgba(0,20,7,.94)",
              boxShadow: focused
                ? "0 0 0 4px rgba(140,255,155,.4), 0 0 24px #8cff9b"
                : "0 0 0 2px rgba(0,0,0,.76), 0 0 12px rgba(140,255,155,.8)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 900,
              lineHeight: 1,
              transition: "transform .18s ease, box-shadow .18s ease",
            }}
          >
            {marker.marker}
          </div>
        );
      })}
    </div>,
    target,
  );
}
