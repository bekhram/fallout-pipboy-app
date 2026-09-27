import PhaserAsset from "../phaser/PhaserAsset.jsx";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { buildSettlementLayout } from "../../utils/proceduralSettlement.js";
import {
  WastelandAssetLayer,
  wastelandBackgroundForSpec,
} from "./WastelandAssetPortal.jsx";
import "./settlementAssetLayer.css";

function settlementBaseSpec(spec = {}) {
  const cols = Math.max(24, Number(spec?.cols || spec?.rows || 24));
  const rows = Math.max(24, Number(spec?.rows || spec?.cols || cols));
  return {
    ...spec,
    type: "wasteland",
    cols,
    rows,
  };
}

export function settlementBackgroundForSpec(spec = {}) {
  return wastelandBackgroundForSpec(settlementBaseSpec(spec));
}

function SettlementHouseAsset({ house, preview = false, cols, rows }) {
  const visualX = Math.max(0, Math.min(cols - 1, Number(house?.x || 0)));
  const visualY = Math.max(0, Math.min(rows - 1, Number(house?.y || 0)));
  const visualW = Math.max(1, Math.min(cols - visualX, Number(house?.w || 10)));
  const visualH = Math.max(1, Math.min(rows - visualY, Number(house?.h || 10)));

  return (
    <PhaserAsset
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
        left: `${(visualX / cols) * 100}%`,
        top: `${(visualY / rows) * 100}%`,
        width: `${(visualW / cols) * 100}%`,
        height: `${(visualH / rows) * 100}%`,
        objectFit: "fill",
        pointerEvents: "none",
        userSelect: "none",
        filter: preview ? "none" : "drop-shadow(0 3px 5px rgba(0,0,0,.45))",
      }}
    />
  );
}

export function SettlementAssetLayer({ spec, preview = false }) {
  const cols = Math.max(24, Number(spec?.cols || spec?.rows || 24));
  const rows = Math.max(24, Number(spec?.rows || spec?.cols || cols));
  const layout = useMemo(
    () => buildSettlementLayout(spec),
    [spec?.seed, spec?.terrain, spec?.settlementStyle, spec?.roadType, spec?.cols, spec?.rows],
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
            cols={cols}
            rows={rows}
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
  }, [scene?.sceneId, scene?.backgroundName, spec?.seed, spec?.type, spec?.terrain, spec?.cols, spec?.rows]);

  if (!target || !spec || String(spec.type || "") !== "settlement") {
    return null;
  }

  return createPortal(
    <SettlementAssetLayer spec={spec} />,
    target,
  );
}
