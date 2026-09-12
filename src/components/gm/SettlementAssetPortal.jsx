import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildSettlementLayout,
  settlementBackground,
} from "../../utils/proceduralSettlement.js";
import roadStraight from "../../assets/wasteland/roads/road-straight.png";
import roadCross from "../../assets/wasteland/roads/road-cross.png";

const GRID = 24;
const ROAD_SEGMENT_LENGTH = 6;
const ROAD_JUNCTION_EXTRA = 1;
const SETTLEMENT_TERRAINS = new Set(["wasteland", "forest", "swamp", "ruins"]);

function settlementRenderSpec(spec = {}) {
  const terrain = SETTLEMENT_TERRAINS.has(spec.terrain) ? spec.terrain : "wasteland";
  const seed = String(spec.seed || "1");
  return {
    ...spec,
    terrain,
    // generateProceduralMapSvg applies the same suffix before drawing houses.
    seed: seed.endsWith(`:terrain:${terrain}`) ? seed : `${seed}:terrain:${terrain}`,
  };
}

export function settlementBackgroundForSpec() {
  return settlementBackground;
}

function addStraightRoadSegments(out, { axis, start, end, fixed, roadWidth }) {
  let cursor = Math.max(0, start);
  const limit = Math.min(GRID, end);

  while (cursor < limit - 0.01) {
    const length = Math.min(ROAD_SEGMENT_LENGTH, limit - cursor);
    const along = cursor + length / 2;
    out.push({
      src: roadStraight,
      name: "straight",
      centerX: axis === "v" ? fixed : along,
      centerY: axis === "v" ? along : fixed,
      w: roadWidth,
      h: length,
      rotation: axis === "v" ? 0 : 90,
    });
    cursor += length;
  }
}

function planSettlementRoadAssets(layout) {
  const roads = layout?.roads;
  if (!roads) return [];

  const roadWidth = Math.max(1, Number(roads.width || 2));
  const junctionSize = roadWidth + ROAD_JUNCTION_EXTRA;
  const centerX = Number(roads.cx || 0) + roadWidth / 2;
  const centerY = Number(roads.cy || 0) + roadWidth / 2;
  const junctionHalf = junctionSize / 2;
  const out = [
    {
      src: roadCross,
      name: "cross",
      centerX,
      centerY,
      w: junctionSize,
      h: junctionSize,
      rotation: 0,
    },
  ];

  addStraightRoadSegments(out, {
    axis: "v",
    start: 0,
    end: centerY - junctionHalf,
    fixed: centerX,
    roadWidth,
  });
  addStraightRoadSegments(out, {
    axis: "v",
    start: centerY + junctionHalf,
    end: GRID,
    fixed: centerX,
    roadWidth,
  });
  addStraightRoadSegments(out, {
    axis: "h",
    start: 0,
    end: centerX - junctionHalf,
    fixed: centerY,
    roadWidth,
  });
  addStraightRoadSegments(out, {
    axis: "h",
    start: centerX + junctionHalf,
    end: GRID,
    fixed: centerY,
    roadWidth,
  });

  return out;
}

function SettlementRoadAsset({ road, preview = false }) {
  const left = road.centerX - road.w / 2;
  const top = road.centerY - road.h / 2;
  return (
    <img
      src={road.src}
      alt=""
      draggable={false}
      data-settlement-road={road.name}
      data-road-center-x={road.centerX}
      data-road-center-y={road.centerY}
      data-road-rotation={road.rotation || 0}
      style={{
        position: "absolute",
        left: `${left / GRID * 100}%`,
        top: `${top / GRID * 100}%`,
        width: `${road.w / GRID * 100}%`,
        height: `${road.h / GRID * 100}%`,
        objectFit: "fill",
        transform: `rotate(${road.rotation || 0}deg)`,
        transformOrigin: "50% 50%",
        pointerEvents: "none",
        userSelect: "none",
        filter: preview ? "none" : "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
      }}
    />
  );
}

export function SettlementAssetLayer({ spec, preview = false }) {
  const renderSpec = useMemo(
    () => settlementRenderSpec(spec),
    [spec?.seed, spec?.terrain, spec?.settlementStyle, spec?.roadType],
  );
  const layout = useMemo(() => buildSettlementLayout(renderSpec), [renderSpec]);
  const items = layout.decor;
  const roads = useMemo(() => planSettlementRoadAssets(layout), [layout]);

  return (
    <div aria-hidden="true" data-settlement-assets="true" style={{ position: "absolute", inset: 0, zIndex: preview ? 2 : 3, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        {roads.map((road, index) => (
          <SettlementRoadAsset
            key={`${road.name}-${road.centerX}-${road.centerY}-${index}`}
            road={road}
            preview={preview}
          />
        ))}
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        {layout.houses.map((house) => (
          <img
            key={house.id}
            src={house.assetSrc}
            alt=""
            draggable={false}
            data-settlement-house={house.houseType}
            data-settlement-house-id={house.id}
            style={{
              position: "absolute",
              left: `${house.x / GRID * 100}%`,
              top: `${house.y / GRID * 100}%`,
              width: `${house.w / GRID * 100}%`,
              height: `${house.h / GRID * 100}%`,
              objectFit: "contain",
              pointerEvents: "none",
              userSelect: "none",
              filter: preview ? "none" : "drop-shadow(0 3px 5px rgba(0,0,0,.45))",
            }}
          />
        ))}
      </div>
      <div style={{ position: "absolute", inset: 0, zIndex: 3 }}>
        {items.map((item, index) => (
          <img
            key={`${item.type}-${item.x}-${item.y}-${index}`}
            src={item.src}
            alt=""
            draggable={false}
            data-settlement-asset={item.type}
            style={{
              position: "absolute",
              left: `${item.x / GRID * 100}%`,
              top: `${item.y / GRID * 100}%`,
              width: `${item.w / GRID * 100}%`,
              height: `${item.h / GRID * 100}%`,
              objectFit: "contain",
              transform: `rotate(${item.rot || 0}deg)`,
              transformOrigin: "50% 50%",
              filter: preview ? "none" : "drop-shadow(0 3px 4px rgba(0,0,0,.45))",
            }}
          />
        ))}
      </div>
    </div>
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
      const node = document.querySelector(".gm-tactical-map-core .gm-session-map__grid");
      if (node) { setTarget(node); return; }
      tries += 1;
      if (tries < 30) window.setTimeout(findTarget, 50);
    };
    findTarget();
    return () => { cancelled = true; setTarget(null); };
  }, [scene?.sceneId, spec?.seed, spec?.type]);

  useEffect(() => {
    if (!target || !spec || String(spec.type || "") !== "settlement") return undefined;

    const previous = {
      backgroundImage: target.style.backgroundImage,
      backgroundSize: target.style.backgroundSize,
      backgroundPosition: target.style.backgroundPosition,
      backgroundRepeat: target.style.backgroundRepeat,
      aspectRatio: target.style.aspectRatio,
      minHeight: target.style.minHeight,
    };
    const mapUrl = scene?.backgroundUrl || "";
    const cols = Math.max(1, Number(scene?.cols || spec?.cols || GRID));
    const rows = Math.max(1, Number(scene?.rows || spec?.rows || GRID));

    target.style.backgroundImage = mapUrl
      ? `url(${JSON.stringify(mapUrl)}), url(${JSON.stringify(settlementBackground)})`
      : `url(${JSON.stringify(settlementBackground)})`;
    target.style.backgroundSize = "100% 100%, 100% 100%";
    target.style.backgroundPosition = "0 0, 0 0";
    target.style.backgroundRepeat = "no-repeat, no-repeat";
    target.style.aspectRatio = `${cols} / ${rows}`;
    target.style.minHeight = "0";

    return () => {
      target.style.backgroundImage = previous.backgroundImage;
      target.style.backgroundSize = previous.backgroundSize;
      target.style.backgroundPosition = previous.backgroundPosition;
      target.style.backgroundRepeat = previous.backgroundRepeat;
      target.style.aspectRatio = previous.aspectRatio;
      target.style.minHeight = previous.minHeight;
    };
  }, [target, scene?.backgroundUrl, scene?.cols, scene?.rows, spec?.cols, spec?.rows, spec?.type]);

  if (!target || !spec || String(spec.type || "") !== "settlement") return null;
  return createPortal(<SettlementAssetLayer spec={spec} />, target);
}
