import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import terrainAtlas from "../../assets/wasteland/generated/terrainAtlas.js";
import ruinsAtlas from "../../assets/wasteland/generated/ruinsAtlas.js";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;

const TERRAIN_SPRITES = {
  cliff: 0,
  rocks: 1,
  dead_tree: 2,
  wreck_car: 3,
  wreck_truck: 4,
};

function spriteSource(item) {
  if (item.type === "ruin") {
    return { atlas: ruinsAtlas, index: Math.max(0, Math.min(4, Number(item.sprite || 0))) };
  }
  const index = TERRAIN_SPRITES[item.type];
  return Number.isFinite(index) ? { atlas: terrainAtlas, index } : null;
}

function SpriteImage({ item, preview = false }) {
  const source = spriteSource(item);
  if (!source) return null;

  const left = (item.x / GRID) * 100;
  const top = (item.y / GRID) * 100;
  const width = (item.w / GRID) * 100;
  const height = (item.h / GRID) * 100;
  const rotation = Number(item.rot || 0);

  return (
    <div
      data-wasteland-asset={item.type}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        overflow: "hidden",
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
        filter: preview ? "none" : "drop-shadow(0 3px 4px rgba(0,0,0,.5))",
      }}
    >
      <img
        src={source.atlas}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: `${-source.index * 100}%`,
          top: 0,
          width: "500%",
          height: "100%",
          maxWidth: "none",
          objectFit: "fill",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function normalizeVisualSize(item) {
  if (item.type === "wreck_car") {
    return { ...item, w: Math.max(2.4, item.w * 1.35), h: Math.max(1.4, item.h * 1.35) };
  }
  if (item.type === "wreck_truck") {
    return { ...item, w: Math.max(3.6, item.w * 1.25), h: Math.max(2.2, item.h * 1.2) };
  }
  if (item.type === "dead_tree") {
    return { ...item, w: Math.max(2.5, item.w * 1.25), h: Math.max(2.5, item.h * 1.25) };
  }
  return item;
}

export function WastelandAssetLayer({ spec, preview = false }) {
  const site = useMemo(
    () => buildOpenWastelandSite({ ...spec, cols: GRID, rows: GRID }),
    [spec?.seed]
  );

  const items = [
    ...site.obstacles
      .filter((item) => item.type === "cliff" || item.type === "rocks")
      .map(normalizeVisualSize),
    ...site.ruins.map((item) => normalizeVisualSize({ ...item, type: "ruin" })),
    ...site.vehicles.map(normalizeVisualSize),
    ...site.trees.map(normalizeVisualSize),
  ];

  return (
    <div
      className={preview ? "gm-wasteland-assets is-preview" : "gm-wasteland-assets"}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: preview ? 2 : 20,
        overflow: "hidden",
      }}
    >
      {items.map((item, index) => (
        <SpriteImage
          key={`${item.type}-${item.sprite ?? "x"}-${item.x}-${item.y}-${index}`}
          item={item}
          preview={preview}
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
      if (tries < 30) window.setTimeout(findTarget, 50);
    };

    findTarget();
    return () => {
      cancelled = true;
      setTarget(null);
    };
  }, [scene?.sceneId, scene?.backgroundName, spec?.seed, spec?.type]);

  if (!target || !spec || String(spec.type || "") !== "wasteland") return null;
  return createPortal(<WastelandAssetLayer spec={spec} />, target);
}
