import PhaserAsset from "../phaser/PhaserAsset.jsx";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { buildRedRocketLayout, isRedRocketType } from "../../utils/proceduralRedRocket.js";
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
    assetProfile: "red_rocket",
    allowRoadVehicles: true,
  };
}

export function redRocketBackgroundForSpec(spec = {}) {
  return wastelandBackgroundForSpec(wastelandSpec(spec));
}

function RedRocketAsset({ building, preview }) {
  return (
    <PhaserAsset
      src={building.assetSrc}
      alt=""
      draggable={false}
      data-red-rocket="true"
      data-red-rocket-variant={building.assetIndex + 1}
      data-red-rocket-footprint={`${building.w}x${building.h}`}
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

export function RedRocketAssetLayer({ spec, preview = false }) {
  const layout = useMemo(
    () => buildRedRocketLayout(spec),
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
        data-red-rocket-layer="true"
        data-red-rocket-count={buildings.length}
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
          <RedRocketAsset key={building.id} building={building} preview={preview} />
        ))}
      </div>
    </>
  );
}

export default function RedRocketAssetPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!spec || !isRedRocketType(spec.type)) {
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

  if (!target || !spec || !isRedRocketType(spec.type)) return null;
  return createPortal(<RedRocketAssetLayer spec={spec} />, target);
}
