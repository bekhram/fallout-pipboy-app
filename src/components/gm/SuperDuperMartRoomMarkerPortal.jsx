import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildSuperDuperMartRoomLayout,
  isSuperDuperMartAssetType,
} from "../../utils/proceduralSuperDuperMartAssets.js";

export default function SuperDuperMartRoomMarkerPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");
  const cols = Math.max(24, Number(spec?.cols || scene?.cols || 24));
  const rows = Math.max(24, Number(spec?.rows || scene?.rows || cols));

  const rooms = useMemo(
    () => (spec && isSuperDuperMartAssetType(spec.type) ? buildSuperDuperMartRoomLayout(spec) : []),
    [spec?.type, spec?.seed, spec?.cols, spec?.rows],
  );

  useEffect(() => {
    if (!isGmHost || !spec || !isSuperDuperMartAssetType(spec.type)) {
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
  }, [isGmHost, scene?.sceneId, spec?.type, spec?.seed, spec?.cols, spec?.rows]);

  if (!isGmHost || !target || !rooms.length) return null;

  return createPortal(
    <div
      aria-hidden="true"
      data-super-duper-mart-room-markers="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 120,
        overflow: "hidden",
      }}
    >
      {rooms.map((room, index) => (
        <div
          key={room.id}
          data-super-duper-mart-room-marker={room.id}
          title={`${index + 1}. ${room.name}`}
          style={{
            position: "absolute",
            left: `${((Number(room.markerX || 0) + 0.5) / cols) * 100}%`,
            top: `${((Number(room.markerY || 0) + 0.5) / rows) * 100}%`,
            width: 30,
            height: 30,
            transform: "translate(-50%, -50%)",
            border: "2px solid #8cff9b",
            borderRadius: "50%",
            color: "#8cff9b",
            background: "rgba(0,20,7,.96)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.75), 0 0 12px #8cff9b",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {index + 1}
        </div>
      ))}
    </div>,
    target,
  );
}
