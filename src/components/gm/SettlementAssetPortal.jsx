import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { buildSettlementLayout } from "../../utils/proceduralSettlement.js";
import {
  WastelandAssetLayer,
  wastelandBackgroundForSpec,
} from "./WastelandAssetPortal.jsx";
import "./settlementAssetLayer.css";

const GRID = 24;

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
  const visualX = Math.max(0, Math.min(GRID - 1, Math.round(Number(house?.x || 0))));
  const visualY = Math.max(0, Math.min(GRID - 1, Math.round(Number(house?.y || 0))));
  const visualW = Math.max(1, Math.min(GRID - visualX, Math.round(Number(house?.w || 10))));
  const visualH = Math.max(1, Math.min(GRID - visualY, Math.round(Number(house?.h || 10))));

  return (
    <img
      src={house.assetSrc}
      alt=""
      draggable={false}
      data-settlement-house={house.houseType}
      data-settlement-house-id={house.id}
      data-settlement-house-disposition={house.disposition}
      data-settlement-house-groups={(house.allowedGroups || []).join(",")}
      data-settlement-house-footprint={`${visualW}x${visualH}`}
      style={{
        position: "absolute",
        left: `${(visualX / GRID) * 100}%`,
        top: `${(visualY / GRID) * 100}%`,
        width: `${(visualW / GRID) * 100}%`,
        height: `${(visualH / GRID) * 100}%`,
        objectFit: "fill",
        pointerEvents: "none",
        userSelect: "none",
        filter: preview ? "none" : "drop-shadow(0 3px 5px rgba(0,0,0,.45))",
      }}
    />
  );
}

export function SettlementAssetLayer({ spec, preview = false }) {
  const layout = useMemo(
    () => buildSettlementLayout(spec),
    [spec?.seed, spec?.terrain, spec?.settlementStyle, spec?.roadType],
  );

  const houses = layout.houses || [];

  const wastelandSpec = useMemo(
    () => settlementBaseSpec({
      ...spec,
      reservedRects: layout.reservedRects || houses.map(({ x, y, w, h }) => ({ x, y, w, h })),
    }),
    [
      spec?.seed,
      spec?.terrain,
      spec?.backgroundType,
      spec?.terrainType,
      layout,
      houses,
    ],
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
        data-settlement-house-count={houses.length}
        style={{
          position: "absolute",
          inset: 0,
          width: preview ? "100%" : "var(--battlemap-world-width, 100%)",
          height: preview ? "100%" : "var(--battlemap-world-height, 100%)",
          pointerEvents: "none",
          zIndex: preview ? 4 : 1,
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
    if (!spec || String(spec.type || "") !== "settlement") {
      setTarget(null);
      return undefined;
    }

    let cancelled = false;
    let tries = 0;
    let settlementGrid = null;

    const findTarget = () => {
      if (cancelled) return;

      const node = document.querySelector(
        ".gm-tactical-map-core .gm-session-map__grid",
      );

      if (node) {
        settlementGrid = node;
        node.setAttribute("data-settlement-grid", "true");
        setTarget(node);
        return;
      }

      tries += 1;
      if (tries < 30) window.setTimeout(findTarget, 50);
    };

    findTarget();

    return () => {
      cancelled = true;
      settlementGrid?.removeAttribute("data-settlement-grid");
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
