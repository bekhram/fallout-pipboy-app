import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import car1 from "../../assets/wasteland/objects/car-1.png";
import car2 from "../../assets/wasteland/objects/car-2.png";
import car3 from "../../assets/wasteland/objects/car-3.png";
import cliff1 from "../../assets/wasteland/objects/cliff-1.png";
import cliff2 from "../../assets/wasteland/objects/cliff-2.png";
import cliff3 from "../../assets/wasteland/objects/cliff-3.png";
import crater1 from "../../assets/wasteland/objects/crater-1.png";
import crater2 from "../../assets/wasteland/objects/crater-2.png";
import crater3 from "../../assets/wasteland/objects/crater-3.png";
import deadTree1 from "../../assets/wasteland/objects/dead-tree-1.png";
import deadTree2 from "../../assets/wasteland/objects/dead-tree-2.png";
import deadTree3 from "../../assets/wasteland/objects/dead-tree-3.png";
import rocks1 from "../../assets/wasteland/objects/rocks-1.png";
import rocks2 from "../../assets/wasteland/objects/rocks-2.png";
import rocks3 from "../../assets/wasteland/objects/rocks-3.png";
import truck1 from "../../assets/wasteland/objects/truck-1.png";
import truck2 from "../../assets/wasteland/objects/truck-2.png";
import truck3 from "../../assets/wasteland/objects/truck-3.png";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;
const ASSET_VARIANTS = {
  cliff: [cliff1, cliff2, cliff3],
  rocks: [rocks1, rocks2, rocks3],
  crater: [crater1, crater2, crater3],
  dead_tree: [deadTree1, deadTree2, deadTree3],
  wreck_car: [car1, car2, car3],
  wreck_truck: [truck1, truck2, truck3],
};

function assetForItem(item) {
  const variants = ASSET_VARIANTS[item.type];
  if (!variants?.length) return null;
  const index = Math.abs(Number(item.sprite || 0)) % variants.length;
  return { src: variants[index], index };
}

function SpriteImage({ item, preview = false }) {
  const asset = assetForItem(item);
  if (!asset) return null;

  const left = (item.x / GRID) * 100;
  const top = (item.y / GRID) * 100;
  const width = (item.w / GRID) * 100;
  const height = (item.h / GRID) * 100;
  const rotation = Number(item.rot || 0);

  return (
    <img
      src={asset.src}
      alt=""
      draggable={false}
      data-wasteland-asset={item.type}
      data-wasteland-sprite={asset.index}
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
        objectFit: "contain",
        filter: preview ? "none" : "drop-shadow(0 3px 4px rgba(0,0,0,.5))",
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
  if (item.type === "crater") {
    return { ...item, w: Math.max(3.4, Number(item.w || 0)), h: Math.max(3.4, Number(item.h || 0)) };
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
      .filter((item) => item.type === "cliff" || item.type === "rocks" || item.type === "crater")
      .map(normalizeVisualSize),
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
