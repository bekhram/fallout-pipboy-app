import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildFortifiedCampLayout,
  buildFortifiedCampMarkers,
  isFortifiedCampType,
} from "../../utils/proceduralFortifiedCamp.js";
import { WastelandAssetLayer } from "./WastelandAssetPortal.jsx";

const GRID = 24;

function wastelandSpec(spec = {}, reservedRects = []) {
  return {
    ...spec,
    type: "wasteland",
    cols: GRID,
    rows: GRID,
    reservedRects,
    roadPlacement: "bottom-edge",
    assetProfile: "fortified_camp",
    allowRoadVehicles: true,
  };
}

function CampAsset({ building, preview = false }) {
  return <img
    src={building.assetSrc}
    alt=""
    draggable={false}
    data-fortified-camp="true"
    style={{
      position: "absolute",
      left: `${(building.x / GRID) * 100}%`,
      top: `${(building.y / GRID) * 100}%`,
      width: `${(building.w / GRID) * 100}%`,
      height: `${(building.h / GRID) * 100}%`,
      objectFit: "contain",
      pointerEvents: "none",
      userSelect: "none",
      filter: preview ? "none" : "drop-shadow(0 3px 6px rgba(0,0,0,.55))",
    }}
  />;
}

export function FortifiedCampAssetLayer({ spec, preview = false }) {
  const layout = useMemo(() => buildFortifiedCampLayout(spec), [spec?.seed, spec?.terrain]);
  return <>
    <WastelandAssetLayer spec={wastelandSpec(spec, layout.environmentReservedRects)} preview={preview} />
    <div aria-hidden="true" data-fortified-camp-layer="true" style={{
      position: "absolute", inset: 0,
      width: preview ? "100%" : "var(--battlemap-world-width, 100%)",
      height: preview ? "100%" : "var(--battlemap-world-height, 100%)",
      pointerEvents: "none", zIndex: preview ? 4 : 0, overflow: "hidden",
      gridColumn: "1 / -1", gridRow: "1 / -1",
    }}>
      {layout.buildings.map((building) => <CampAsset key={building.id} building={building} preview={preview} />)}
    </div>
  </>;
}

function CampMarkers({ spec }) {
  const markers = useMemo(() => buildFortifiedCampMarkers(spec), [spec?.seed]);
  return <div aria-hidden="true" data-gm-only-room-markers="true" data-fortified-camp-markers="true" style={{
    position: "absolute", inset: 0,
    width: "var(--battlemap-world-width, 100%)", height: "var(--battlemap-world-height, 100%)",
    pointerEvents: "none", zIndex: 300, overflow: "hidden",
    gridColumn: "1 / -1", gridRow: "1 / -1",
  }}>
    {markers.map((marker) => <div key={marker.id} data-fortified-camp-marker={marker.id} title={`${marker.id}. ${marker.name}`} style={{
      position: "absolute",
      left: `${((marker.markerX + 0.5) / GRID) * 100}%`,
      top: `${((marker.markerY + 0.5) / GRID) * 100}%`,
      width: 34, height: 34, transform: "translate(-50%, -50%)",
      border: "2px solid #8cff9b", borderRadius: "50%", color: "#8cff9b",
      background: "rgba(0,20,7,.96)", boxShadow: "0 0 0 2px rgba(0,0,0,.8), 0 0 14px #8cff9b",
      display: "grid", placeItems: "center", fontSize: 13, fontWeight: 900, lineHeight: 1,
    }}>{marker.marker}</div>)}
  </div>;
}

export default function FortifiedCampAssetPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");

  useEffect(() => {
    if (!spec || !isFortifiedCampType(spec.type)) { setTarget(null); return undefined; }
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
  }, [scene?.sceneId, spec?.type, spec?.seed, spec?.terrain]);

  if (!target || !spec || !isFortifiedCampType(spec.type)) return null;
  return createPortal(<>
    <FortifiedCampAssetLayer spec={spec} />
    {isGmHost ? <CampMarkers spec={spec} /> : null}
  </>, target);
}
