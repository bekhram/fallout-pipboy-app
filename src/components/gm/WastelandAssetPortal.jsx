import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import assetA from "../../assets/wasteland/generated/assetBundleA.js";
import assetB from "../../assets/wasteland/generated/assetBundleB.js";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;

const ASSET_BY_TYPE = {
  cliff: assetA.cliff_large,
  rocks: assetA.rocks_cluster,
  dead_tree: assetA.dead_tree,
  wreck_car: assetB.wreck_car,
  wreck_truck: assetB.wreck_truck,
  ruin: assetB.ruin_l_1,
};

function AssetImage({ item, src, testId }) {
  if (!src) return null;
  const left = (item.x / GRID) * 100;
  const top = (item.y / GRID) * 100;
  const width = (item.w / GRID) * 100;
  const height = (item.h / GRID) * 100;

  return (
    <img
      data-wasteland-asset={testId || item.type}
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        objectFit: "contain",
        transform: `rotate(${Number(item.rot || 0)}deg)`,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 22,
        filter: "drop-shadow(0 4px 4px rgba(0,0,0,.45))",
      }}
    />
  );
}

function WastelandAssetOverlay({ spec }) {
  const site = useMemo(
    () => buildOpenWastelandSite({ ...spec, cols: GRID, rows: GRID }),
    [spec?.seed]
  );

  const procedural = [
    ...site.obstacles.filter((item) => item.type === "cliff" || item.type === "rocks"),
    ...site.ruins.map((item) => ({ ...item, type: "ruin" })),
    ...site.vehicles,
    ...site.trees,
  ];

  // Temporary fixed diagnostics. These make asset rendering obvious even when
  // a particular seed produces very few procedural objects.
  const diagnostics = [
    { type: "cliff", x: 1, y: 1, w: 6, h: 6, rot: 0 },
    { type: "wreck_car", x: 10, y: 2, w: 3, h: 2, rot: 25 },
    { type: "ruin", x: 16, y: 1, w: 6, h: 6, rot: 0 },
  ];

  return (
    <div
      className="gm-wasteland-asset-overlay"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 20,
        overflow: "hidden",
      }}
    >
      <div
        data-wasteland-overlay-test="visible"
        style={{
          position: "absolute",
          left: 8,
          top: 8,
          zIndex: 30,
          padding: "5px 8px",
          background: "rgba(0,0,0,.75)",
          border: "1px solid currentColor",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: ".08em",
          pointerEvents: "none",
        }}
      >
        WASTELAND ASSET LAYER
      </div>

      {procedural.map((item, index) => (
        <AssetImage
          key={`proc-${item.type}-${index}`}
          item={item}
          src={ASSET_BY_TYPE[item.type]}
        />
      ))}

      {diagnostics.map((item, index) => (
        <AssetImage
          key={`diag-${index}`}
          testId={`diagnostic-${item.type}`}
          item={item}
          src={ASSET_BY_TYPE[item.type]}
        />
      ))}
    </div>
  );
}

export default function WastelandAssetPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  useEffect(() => {
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
      if (tries < 20) window.setTimeout(findTarget, 50);
    };

    findTarget();
    return () => {
      cancelled = true;
      setTarget(null);
    };
  }, [scene?.sceneId, scene?.backgroundName, spec?.seed, spec?.type]);

  if (!target || !spec || String(spec.type || "") !== "wasteland") return null;
  return createPortal(<WastelandAssetOverlay spec={spec} />, target);
}
