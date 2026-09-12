import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import wastelandBg from "../../assets/wasteland/backgrounds/wasteland-bg-1.png";
import swampBg from "../../assets/wasteland/backgrounds/wasteland-swamp-bg-1.png";
import urbanRuinsBg from "../../assets/wasteland/backgrounds/wasteland-urban-ruins-bg-1.png";
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
import hills1 from "../../assets/wasteland/objects/hills-1.png";
import lake1 from "../../assets/wasteland/objects/lake-1.png";
import ravine1 from "../../assets/wasteland/objects/ravine-1.png";
import rocks1 from "../../assets/wasteland/objects/rocks-1.png";
import rocks2 from "../../assets/wasteland/objects/rocks-2.png";
import rocks3 from "../../assets/wasteland/objects/rocks-3.png";
import ruins1 from "../../assets/wasteland/objects/ruins-1.png";
import swamp1 from "../../assets/wasteland/objects/swamp-1.png";
import truck1 from "../../assets/wasteland/objects/truck-1.png";
import truck2 from "../../assets/wasteland/objects/truck-2.png";
import truck3 from "../../assets/wasteland/objects/truck-3.png";
import roadStraight from "../../assets/wasteland/roads/road-straight.png";
import roadCurveSoft from "../../assets/wasteland/roads/road-curve-soft.png";
import roadCurveSharp from "../../assets/wasteland/roads/road-curve-sharp.png";
import roadTJunction from "../../assets/wasteland/roads/road-t-junction.png";
import roadCross from "../../assets/wasteland/roads/road-cross.png";
import roadDeadEnd from "../../assets/wasteland/roads/road-dead-end.png";
import roadDamaged from "../../assets/wasteland/roads/road-damaged.png";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;
const OVERLAP_PAD = 0.08;
const ROAD_TILE = 8;
const ROAD_STEP = 5.6;
const ROAD_CLEARANCE = 0.8;
const ROAD_VISUAL_SCALE = {
  straight: 1,
  damaged: 1,
  "dead-end": 1,
  cross: 0.9,
  "t-junction": 0.82,
  "curve-soft": 0.82,
  "curve-sharp": 0.8,
};

const ASSET_VARIANTS = {
  cliff: [cliff1, cliff2, cliff3], rocks: [rocks1, rocks2, rocks3], crater: [crater1, crater2, crater3],
  dead_tree: [deadTree1, deadTree2], wreck_car: [car1, car2, car3], wreck_truck: [truck1, truck2, truck3],
  ruins: [ruins1], ravine: [ravine1], lake: [lake1], swamp: [swamp1], hills: [hills1],
};

export function wastelandBackgroundForSpec(spec) {
  const terrain = String(spec?.terrain || spec?.terrainType || spec?.backgroundType || "wasteland").toLowerCase();
  if (terrain === "swamp") return swampBg;
  if (terrain === "ruins") return urbanRuinsBg;
  return wastelandBg;
}

function assetForItem(item) {
  const variants = ASSET_VARIANTS[item.type];
  if (!variants?.length) return null;
  const index = Math.abs(Number(item.sprite || 0)) % variants.length;
  return { src: variants[index], index };
}
function renderBoxForItem(item) { return { x: Number(item.x || 0), y: Number(item.y || 0), w: Number(item.w || 0), h: Number(item.h || 0) }; }
function resizeAroundCenter(item, nextW, nextH) {
  const currentW = Number(item.w || 0), currentH = Number(item.h || 0);
  return { ...item, x: Number(item.x || 0) - (nextW - currentW) / 2, y: Number(item.y || 0) - (nextH - currentH) / 2, w: nextW, h: nextH };
}
function normalizeVisualSize(item) {
  const currentW = Number(item.w || 0), currentH = Number(item.h || 0);
  if (item.type === "cliff") return resizeAroundCenter(item, currentW * 2, currentH * 2);
  if (item.type === "dead_tree") return resizeAroundCenter(item, Math.max(3, currentW * 1.4), Math.max(3, currentH * 1.4));
  if (item.type === "crater") return resizeAroundCenter(item, Math.max(3.4, currentW), Math.max(3.4, currentH));
  return item;
}
function visualBounds(item) {
  const box = renderBoxForItem(item);
  const scaleX = item.type === "wreck_car" ? 1.5 : item.type === "wreck_truck" ? 1.25 : 1;
  const scaleY = item.type === "wreck_car" ? 2 : item.type === "wreck_truck" ? 1.5 : 1;
  const finalW = box.w * scaleX, finalH = box.h * scaleY, cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  return { x: cx - finalW / 2, y: cy - finalH / 2, w: finalW, h: finalH };
}
function fitVisualItemToGrid(item) {
  const bounds = visualBounds(item);
  let dx = 0, dy = 0;
  if (bounds.x < 0) dx = -bounds.x;
  else if (bounds.x + bounds.w > GRID) dx = GRID - (bounds.x + bounds.w);
  if (bounds.y < 0) dy = -bounds.y;
  else if (bounds.y + bounds.h > GRID) dy = GRID - (bounds.y + bounds.h);
  return dx || dy ? { ...item, x: item.x + dx, y: item.y + dy } : item;
}
function boxesOverlap(a, b, pad = OVERLAP_PAD) { return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y); }
function removeVisualOverlaps(items) {
  const accepted = [], occupied = [];
  for (const item of items) {
    const bounds = visualBounds(item);
    const isGroundDecal = item.type === "crater";
    const collides = !isGroundDecal && occupied.some((box) => boxesOverlap(bounds, box));
    if (collides) continue;
    accepted.push(item);
    if (!isGroundDecal) occupied.push(bounds);
  }
  return accepted;
}
function hashValue(value) {
  const text = String(value ?? ""); let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function pickRotation(seed) { return [0, 90, 180, 270][seed % 4]; }
function centeredRoadAsset(src, name, centerX, centerY, rotation = 0) {
  return { src, name, x: centerX - ROAD_TILE / 2, y: centerY - ROAD_TILE / 2, w: ROAD_TILE, h: ROAD_TILE, rotation };
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lineTiles({ axis, from, to, fixed, seed, damagedEvery = 0, skipCenter = null }) {
  const start = Math.min(from, to), end = Math.max(from, to);
  const out = [];
  let i = 0;
  for (let along = start + ROAD_TILE / 2; along <= end - ROAD_TILE / 2 + 0.01; along += ROAD_STEP) {
    const cx = axis === "v" ? fixed : along;
    const cy = axis === "v" ? along : fixed;
    if (skipCenter && Math.hypot(cx - skipCenter.x, cy - skipCenter.y) < ROAD_TILE * 0.45) { i += 1; continue; }
    const pieceSeed = hashValue(`${seed}:${i}`);
    const damaged = damagedEvery > 0 && pieceSeed % damagedEvery === 0;
    out.push(centeredRoadAsset(damaged ? roadDamaged : roadStraight, damaged ? "damaged" : "straight", cx, cy, axis === "v" ? 0 : 90));
    i += 1;
  }
  const tailCenter = end - ROAD_TILE / 2;
  if (tailCenter >= start + ROAD_TILE / 2) {
    const last = out[out.length - 1];
    const lastAlong = last ? (axis === "v" ? last.y + ROAD_TILE / 2 : last.x + ROAD_TILE / 2) : -999;
    if (Math.abs(lastAlong - tailCenter) > 1.25) {
      const cx = axis === "v" ? fixed : tailCenter;
      const cy = axis === "v" ? tailCenter : fixed;
      if (!skipCenter || Math.hypot(cx - skipCenter.x, cy - skipCenter.y) >= ROAD_TILE * 0.45) {
        out.push(centeredRoadAsset(roadStraight, "straight", cx, cy, axis === "v" ? 0 : 90));
      }
    }
  }
  return out;
}
function intersectionInfo(roads) {
  const vertical = roads.find((road) => Number(road.h || 0) > Number(road.w || 0));
  const horizontal = roads.find((road) => Number(road.w || 0) >= Number(road.h || 0));
  if (!vertical || !horizontal) return null;
  return {
    vertical,
    horizontal,
    center: {
      x: Number(vertical.x || 0) + Number(vertical.w || 0) / 2,
      y: Number(horizontal.y || 0) + Number(horizontal.h || 0) / 2,
    },
  };
}
function makeCrossRoads(roads, seed) {
  const info = intersectionInfo(roads);
  if (!info) return [];
  const { center } = info;
  const useT = seed % 4 === 0;
  const rotation = useT ? pickRotation(seed) : 0;
  const parts = [centeredRoadAsset(useT ? roadTJunction : roadCross, useT ? "t-junction" : "cross", center.x, center.y, rotation)];

  const top = lineTiles({ axis: "v", from: 0, to: center.y + ROAD_TILE / 2, fixed: center.x, seed: `${seed}:top`, skipCenter: center });
  const bottom = lineTiles({ axis: "v", from: center.y - ROAD_TILE / 2, to: GRID, fixed: center.x, seed: `${seed}:bottom`, skipCenter: center });
  const left = lineTiles({ axis: "h", from: 0, to: center.x + ROAD_TILE / 2, fixed: center.y, seed: `${seed}:left`, skipCenter: center });
  const right = lineTiles({ axis: "h", from: center.x - ROAD_TILE / 2, to: GRID, fixed: center.y, seed: `${seed}:right`, skipCenter: center });

  if (!useT) return [...top, ...bottom, ...left, ...right, ...parts];
  const missingArm = rotation === 0 ? "top" : rotation === 90 ? "right" : rotation === 180 ? "bottom" : "left";
  return [
    ...(missingArm === "top" ? [] : top),
    ...(missingArm === "bottom" ? [] : bottom),
    ...(missingArm === "left" ? [] : left),
    ...(missingArm === "right" ? [] : right),
    ...parts,
  ];
}
function makeBentSingleRoad(road, seed) {
  const vertical = Number(road.h || 0) >= Number(road.w || 0);
  const variant = seed % 3;
  if (variant === 0) {
    const fixed = vertical ? Number(road.x || 0) + Number(road.w || 0) / 2 : Number(road.y || 0) + Number(road.h || 0) / 2;
    return lineTiles({ axis: vertical ? "v" : "h", from: 0, to: GRID, fixed, seed, damagedEvery: 7 });
  }

  const bendX = clamp(8 + (seed % 9), 8, 16);
  const bendY = clamp(8 + ((seed >>> 4) % 9), 8, 16);
  const turnRight = ((seed >>> 8) & 1) === 0;
  const fromTop = ((seed >>> 9) & 1) === 0;
  const curve = variant === 1 ? roadCurveSoft : roadCurveSharp;
  const curveName = variant === 1 ? "curve-soft" : "curve-sharp";

  let rotation = 0;
  if (fromTop && turnRight) rotation = 270;
  else if (fromTop && !turnRight) rotation = 180;
  else if (!fromTop && turnRight) rotation = 0;
  else rotation = 90;

  const center = { x: bendX, y: bendY };
  const verticalArm = fromTop
    ? lineTiles({ axis: "v", from: 0, to: bendY + ROAD_TILE / 2, fixed: bendX, seed: `${seed}:v`, skipCenter: center, damagedEvery: 8 })
    : lineTiles({ axis: "v", from: bendY - ROAD_TILE / 2, to: GRID, fixed: bendX, seed: `${seed}:v`, skipCenter: center, damagedEvery: 8 });
  const horizontalArm = turnRight
    ? lineTiles({ axis: "h", from: bendX - ROAD_TILE / 2, to: GRID, fixed: bendY, seed: `${seed}:h`, skipCenter: center, damagedEvery: 8 })
    : lineTiles({ axis: "h", from: 0, to: bendX + ROAD_TILE / 2, fixed: bendY, seed: `${seed}:h`, skipCenter: center, damagedEvery: 8 });

  return [...verticalArm, ...horizontalArm, centeredRoadAsset(curve, curveName, bendX, bendY, rotation)];
}
function makeFragments(roads, seed) {
  return roads.flatMap((road, index) => {
    const vertical = Number(road.h || 0) >= Number(road.w || 0);
    const fixed = vertical ? Number(road.x || 0) + Number(road.w || 0) / 2 : Number(road.y || 0) + Number(road.h || 0) / 2;
    const start = vertical ? Number(road.y || 0) : Number(road.x || 0);
    const end = start + (vertical ? Number(road.h || 0) : Number(road.w || 0));
    const pieces = lineTiles({ axis: vertical ? "v" : "h", from: start, to: end, fixed, seed: `${seed}:fragment:${index}`, damagedEvery: 2 });
    if (pieces.length) {
      const last = pieces[pieces.length - 1];
      pieces[pieces.length - 1] = { ...last, src: roadDeadEnd, name: "dead-end", rotation: (last.rotation || 0) + 180 };
    }
    return pieces;
  });
}
function planRoadAssets(site, spec) {
  const roads = site?.roads || [];
  if (!roads.length || site?.profile?.type === "none") return [];
  const seed = hashValue(`${spec?.seed || "1"}:${site.profile.type}:${site.terrainType}`);
  if (site.profile.type === "cross") return makeCrossRoads(roads, seed);
  if (site.profile.type === "fragments") return makeFragments(roads, seed);
  return makeBentSingleRoad(roads[0], seed);
}
function removeRoadOverlaps(items, roadAssets) {
  if (!roadAssets.length) return items;
  const roadBoxes = roadAssets.map((road) => ({ x: road.x, y: road.y, w: road.w, h: road.h }));
  return items.filter((item) => {
    const bounds = visualBounds(item);
    return !roadBoxes.some((roadBox) => boxesOverlap(bounds, roadBox, ROAD_CLEARANCE));
  });
}
function RoadAsset({ road }) {
  const visualScale = ROAD_VISUAL_SCALE[road.name] ?? 1;
  return <img src={road.src} alt="" draggable={false} data-wasteland-road={road.name} style={{
    position: "absolute",
    left: `${road.x / GRID * 100}%`, top: `${road.y / GRID * 100}%`,
    width: `${ROAD_TILE / GRID * 100}%`, height: `${ROAD_TILE / GRID * 100}%`,
    objectFit: "contain", transform: `rotate(${road.rotation || 0}deg) scale(${visualScale})`, transformOrigin: "50% 50%",
    pointerEvents: "none", userSelect: "none", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
  }}/>;
}
function SpriteImage({ item, preview = false }) {
  const asset = assetForItem(item); if (!asset) return null;
  const box = renderBoxForItem(item), isGroundTerrain = ["lake", "swamp", "ravine"].includes(item.type);
  const depth = isGroundTerrain ? 2 : 10 + Math.round((Number(item.y || 0) + Number(item.h || 0) / 2) * 10);
  const scaleX = item.type === "wreck_car" ? 1.5 : item.type === "wreck_truck" ? 1.25 : 1;
  const scaleY = item.type === "wreck_car" ? 2 : item.type === "wreck_truck" ? 1.5 : 1;
  return <img src={asset.src} alt="" draggable={false} data-wasteland-asset={item.type} data-wasteland-sprite={asset.index} style={{
    position: "absolute", left: `${box.x / GRID * 100}%`, top: `${box.y / GRID * 100}%`, width: `${box.w / GRID * 100}%`, height: `${box.h / GRID * 100}%`,
    transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: "50% 50%", pointerEvents: "none", userSelect: "none", zIndex: depth,
    objectFit: "contain", overflow: "visible", filter: preview ? "none" : "drop-shadow(0 3px 4px rgba(0,0,0,.5))",
  }}/>;
}

export function WastelandAssetLayer({ spec, preview = false, showBackground = true }) {
  const site = useMemo(() => buildOpenWastelandSite({ ...spec, cols: GRID, rows: GRID }), [spec?.seed, spec?.terrain, spec?.backgroundType, spec?.terrainType]);
  const background = useMemo(() => wastelandBackgroundForSpec(spec), [spec?.terrain, spec?.backgroundType, spec?.terrainType]);
  const roadAssets = useMemo(() => planRoadAssets(site, spec), [site, spec?.seed]);
  const items = useMemo(() => {
    const normalized = [
      ...(site.terrain || []).map(normalizeVisualSize),
      ...site.obstacles.map(normalizeVisualSize),
      ...site.vehicles,
      ...site.trees.map(normalizeVisualSize),
    ].map(fitVisualItemToGrid);
    return removeRoadOverlaps(removeVisualOverlaps(normalized), roadAssets);
  }, [site, roadAssets]);

  return <div className={preview ? "gm-wasteland-assets is-preview" : "gm-wasteland-assets"} aria-hidden="true" style={{
    position: "absolute", inset: 0, width: preview ? "100%" : "var(--battlemap-world-width, 100%)", height: preview ? "100%" : "var(--battlemap-world-height, 100%)",
    pointerEvents: "none", zIndex: preview ? 2 : 0, overflow: "hidden", gridColumn: "1 / -1", gridRow: "1 / -1",
  }}>
    {showBackground ? <img src={background} alt="" draggable={false} data-wasteland-background="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", userSelect: "none", zIndex: 0 }}/> : null}
    <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>{roadAssets.map((road, index) => <RoadAsset key={`${road.name}-${index}`} road={road}/>)}</div>
    <div style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}>{items.map((item, index) => <SpriteImage key={`${item.type}-${item.sprite ?? "x"}-${item.x}-${item.y}-${index}`} item={item} preview={preview}/>)}</div>
  </div>;
}

export default function WastelandAssetPortal({ session }) {
  const scene = session?.tacticalScene || null, spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);
  useEffect(() => {
    let cancelled = false, tries = 0;
    const findTarget = () => {
      if (cancelled) return;
      const node = document.querySelector(".gm-tactical-map-core .gm-session-map__grid");
      if (node) { setTarget(node); return; }
      tries += 1; if (tries < 30) window.setTimeout(findTarget, 50);
    };
    findTarget();
    return () => { cancelled = true; setTarget(null); };
  }, [scene?.sceneId, scene?.backgroundName, spec?.seed, spec?.type, spec?.terrain]);
  if (!target || !spec || String(spec.type || "") !== "wasteland") return null;
  return createPortal(<WastelandAssetLayer spec={spec}/>, target);
}
