import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  buildSuperDuperMartAssetLayout,
  buildSuperDuperMartRoomLayout,
  isSuperDuperMartAssetType,
} from "../../utils/proceduralSuperDuperMartAssets.js";
import { WastelandAssetLayer, wastelandBackgroundForSpec } from "./WastelandAssetPortal.jsx";

const GRID = 24;

function wastelandSpec(spec = {}, reservedRects = []) {
  return {
    ...spec,
    type: "wasteland",
    cols: GRID,
    rows: GRID,
    reservedRects,
    roadPlacement: "bottom-edge",
    assetProfile: "super_duper_mart",
    allowRoadVehicles: true,
  };
}

export function superDuperMartBackgroundForSpec(spec = {}) {
  return wastelandBackgroundForSpec(wastelandSpec(spec));
}

function SuperDuperMartAsset({ building, preview }) {
  return (
    <img
      src={building.assetSrc}
      alt=""
      draggable={false}
      data-super-duper-mart="true"
      data-super-duper-mart-variant={building.assetVariant}
      data-super-duper-mart-footprint={`${building.w}x${building.h}`}
      style={{
        position: "absolute",
        left: `${(building.x / GRID) * 100}%`,
        top: `${(building.y / GRID) * 100}%`,
        width: `${(building.w / GRID) * 100}%`,
        height: `${(building.h / GRID) * 100}%`,
        objectFit: "contain",
        pointerEvents: "none",
        userSelect: "none",
        filter: preview ? "none" : "drop-shadow(0 3px 6px rgba(0,0,0,.5))",
      }}
    />
  );
}

export function SuperDuperMartAssetLayer({ spec, preview = false }) {
  const layout = useMemo(
    () => buildSuperDuperMartAssetLayout(spec),
    [spec?.seed, spec?.terrain, spec?.backgroundType, spec?.terrainType],
  );
  const buildings = layout.buildings || [];

  return (
    <>
      <WastelandAssetLayer
        spec={wastelandSpec(spec, layout.environmentReservedRects)}
        preview={preview}
      />
      <div
        aria-hidden="true"
        data-super-duper-mart-layer="true"
        data-super-duper-mart-count={buildings.length}
        style={{
          position: "absolute",
          inset: 0,
          width: preview ? "100%" : "var(--battlemap-world-width, 100%)",
          height: preview ? "100%" : "var(--battlemap-world-height, 100%)",
          pointerEvents: "none",
          zIndex: preview ? 4 : 0,
          overflow: "hidden",
          gridColumn: "1 / -1",
          gridRow: "1 / -1",
        }}
      >
        {buildings.map((building) => (
          <SuperDuperMartAsset key={building.id} building={building} preview={preview} />
        ))}
      </div>
    </>
  );
}

function SuperDuperMartRoomMarkers({ spec }) {
  const rooms = useMemo(() => buildSuperDuperMartRoomLayout(spec), [spec?.seed]);
  return (
    <div
      aria-hidden="true"
      data-gm-only-room-markers="true"
      data-super-duper-mart-room-markers="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 300,
        overflow: "hidden",
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
      }}
    >
      {rooms.map((room, index) => (
        <div
          key={room.id}
          data-super-duper-mart-room-marker={room.id}
          title={`${index + 1}. ${room.name}`}
          style={{
            position: "absolute",
            left: `${((Number(room.markerX) + 0.5) / GRID) * 100}%`,
            top: `${((Number(room.markerY) + 0.5) / GRID) * 100}%`,
            width: 34,
            height: 34,
            transform: "translate(-50%, -50%)",
            border: "2px solid #8cff9b",
            borderRadius: "50%",
            color: "#8cff9b",
            background: "rgba(0,20,7,.96)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.8), 0 0 14px #8cff9b",
            display: "grid",
            placeItems: "center",
            fontSize: 14,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}

export default function SuperDuperMartAssetPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");

  useEffect(() => {
    if (!spec || !isSuperDuperMartAssetType(spec.type)) {
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
  }, [scene?.sceneId, spec?.type, spec?.seed, spec?.terrain]);

  if (!target || !spec || !isSuperDuperMartAssetType(spec.type)) return null;
  return createPortal(
    <>
      <SuperDuperMartAssetLayer spec={spec} />
      {isGmHost ? <SuperDuperMartRoomMarkers spec={spec} /> : null}
    </>,
    target,
  );
}
