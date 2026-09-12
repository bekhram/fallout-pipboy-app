import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { buildSettlementLayout } from "../../utils/proceduralSettlement.js";
import {
  WastelandAssetLayer,
  wastelandBackgroundForSpec,
} from "./WastelandAssetPortal.jsx";

const GRID = 24;
const HOUSE_VISUAL_SCALE = 1;

function settlementBaseSpec(spec = {}) {
  return {
    ...spec,
    type: "wasteland",
    cols: GRID,
    rows: GRID,
  };
}

export function settlementBackgroundForSpec(spec = {}) {
  return wastelandBackgroundForSpec(settlementBaseSpec(spec));
}

function SettlementHouseAsset({ house, preview = false }) {
  const logicalW = Math.max(1, Number(house?.w || 6));
  const logicalH = Math.max(1, Number(house?.h || 6));
  const visualW = logicalW * HOUSE_VISUAL_SCALE;
  const visualH = logicalH * HOUSE_VISUAL_SCALE;

  let visualX = Number(house?.x || 0) - (visualW - logicalW) / 2;
  let visualY = Number(house?.y || 0) - (visualH - logicalH) / 2;

  visualX = Math.max(0, Math.min(GRID - visualW, visualX));
  visualY = Math.max(0, Math.min(GRID - visualH, visualY));

  return (
    <img
      src={house.assetSrc}
      alt=""
      draggable={false}
      data-settlement-house={house.houseType}
      data-settlement-house-id={house.id}
      data-settlement-house-disposition={house.disposition}
      data-settlement-house-groups={(house.allowedGroups || []).join(",")}
      style={{
        position: "absolute",
        left: `${(visualX / GRID) * 100}%`,
        top: `${(visualY / GRID) * 100}%`,
        width: `${(visualW / GRID) * 100}%`,
        height: `${(visualH / GRID) * 100}%`,
        objectFit: "contain",
        pointerEvents: "none",
        userSelect: "none",
        filter: preview ? "none" : "drop-shadow(0 3px 5px rgba(0,0,0,.45))",
      }}
    />
  );
}

export function SettlementAssetLayer({ spec, preview = false }) {
  const wastelandSpec = useMemo(
    () => settlementBaseSpec(spec),
    [spec?.seed, spec?.terrain, spec?.backgroundType, spec?.terrainType],
  );

  const houses = useMemo(
    () => buildSettlementLayout(spec).houses || [],
    [spec?.seed, spec?.terrain, spec?.settlementStyle, spec?.roadType],
  );

  return (
    <>
      <WastelandAssetLayer
        spec={wastelandSpec}
        preview={preview}
      />

      <div
        aria-hidden="true"
        data-settlement-houses="true"
        style={{
          position: "absolute",
          inset: 0,
          width: preview ? "100%" : "var(--battlemap-world-width, 100%)",
          height: preview ? "100%" : "var(--battlemap-world-height, 100%)",
          pointerEvents: "none",
          zIndex: preview ? 4 : 4,
          overflow: "hidden",
          gridColumn: "1 / -1",
          gridRow: "1 / -1",
        }}
      >
        {houses.map((house) => (
          <SettlementHouseAsset
            key={house.id}
            house={house}
            preview={preview}
          />
        ))}
      </div>
    </>
  );
}

export default function SettlementAssetPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const findTarget = () => {
      if (cancelled) return;

      const node = document.querySelector(
        ".gm-tactical-map-core .gm-session-map__grid",
      );

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
  }, [scene?.sceneId, scene?.backgroundName, spec?.seed, spec?.type, spec?.terrain]);

  if (!target || !spec || String(spec.type || "") !== "settlement") {
    return null;
  }

  return createPortal(
    <SettlementAssetLayer spec={spec} />,
    target,
  );
}
