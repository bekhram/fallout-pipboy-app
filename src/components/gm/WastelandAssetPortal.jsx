import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import wastelandAtlas from "../../assets/wasteland/generated/wastelandAtlasFinal48.js";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;
const ATLAS_COLS = 3;
const ATLAS_ROWS = 3;

const SPRITE_INDEX = {
  cliff: 0,
  rocks: 1,
  dead_tree: 2,
  wreck_car: 3,
  wreck_truck: 6,
};

function spriteIndex(item) {
  if (item.type === "ruin") {
    const ruinMap = [4, 5, 7, 8];
    return ruinMap[Math.abs(Number(item.sprite || 0)) % ruinMap.length];
  }
  return SPRITE_INDEX[item.type];
}

function spriteBackground(index) {
  if (!Number.isFinite(index)) return null;
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  return {
    backgroundImage: `url(${wastelandAtlas})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${ATLAS_COLS * 100}% ${ATLAS_ROWS * 100}%`,
    backgroundPosition: `${(col / (ATLAS_COLS - 1)) * 100}% ${(row / (ATLAS_ROWS - 1)) * 100}%`,
  };
}

function SpriteImage({ item, preview = false }) {
  const index = spriteIndex(item);
  const background = spriteBackground(index);
  if (!background) return null;

  const left = (item.x / GRID) * 100;
  const top = (item.y / GRID) * 100;
  const width = (item.w / GRID) * 100;
  const height = (item.h / GRID) * 100;
  const rotation = Number(item.rot || 0);

  return (
    <div
      data-wasteland-asset={item.type}
      data-wasteland-sprite={index}
      style={{
        position: "absolute",
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 1,
        filter: preview ? "none" : "drop-shadow(0 3px 4px rgba(0,0,0,.5))",
        ...background,
      }}
    />
  );
}

function normalizeVisualSize(item) {
  if (item.type === "wreck_car") {
    return { ...item, w: Math.max(2.8, Number(item.w || 0) * 1.45), h: Math.max(1.7, Number(item.h || 0) * 1.55) };
  }
  if (item.type === "wreck_truck") {
    return { ...item, w: Math.max(4.2, Number(item.w || 0) * 1.35), h: Math.max(2.6, Number(item.h || 0) * 1.3) };
  }
  if (item.type === "dead_tree") {
    return { ...item, w: Math.max(3, Number(item.w || 0) * 1.4), h: Math.max(3, Number(item.h || 0) * 1.4) };
  }
  if (item.type === "ruin") {
    return { ...item, w: Math.max(4, Number(item.w || 0)), h: Math.max(4, Number(item.h || 0)) };
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
