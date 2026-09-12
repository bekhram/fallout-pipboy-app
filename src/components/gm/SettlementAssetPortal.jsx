import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildSettlementDecor,
  buildSettlementSite,
  settlementBackground,
} from "../../utils/proceduralSettlement.js";
import { planRoadAssets, RoadAsset } from "./WastelandAssetPortal.jsx";

const GRID = 24;
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

export function SettlementAssetLayer({ spec, preview = false }) {
  const renderSpec = useMemo(
    () => settlementRenderSpec(spec),
    [spec?.seed, spec?.terrain, spec?.settlementStyle, spec?.roadType],
  );
  const items = useMemo(() => buildSettlementDecor(renderSpec), [renderSpec]);
  const roads = useMemo(() => {
    const site = buildSettlementSite(renderSpec);
    const { cx, cy, width } = site.roads;
    return planRoadAssets({
      roads: [
        { x: cx, y: 0, w: width, h: GRID },
        { x: 0, y: cy, w: GRID, h: width },
      ],
      profile: { type: "cross" },
      terrainType: "settlement",
    }, { ...renderSpec, forceFullCross: true });
  }, [renderSpec]);
  return (
    <div aria-hidden="true" data-settlement-assets="true" style={{ position: "absolute", inset: 0, zIndex: preview ? 2 : 3, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        {roads.map((road, index) => (
          <RoadAsset
            key={`${road.name}-${road.centerX}-${road.centerY}-${index}`}
            road={road}
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
    const mapUrl = scene?.backgroundUrl || "";
    target.style.backgroundImage = mapUrl
      ? `url(${JSON.stringify(mapUrl)}), url(${JSON.stringify(settlementBackground)})`
      : `url(${JSON.stringify(settlementBackground)})`;
    target.style.backgroundSize = "100% 100%, 100% 100%";
    target.style.backgroundPosition = "0 0, 0 0";
    target.style.backgroundRepeat = "no-repeat, no-repeat";
    return undefined;
  }, [target, scene?.backgroundUrl, spec?.type]);

  if (!target || !spec || String(spec.type || "") !== "settlement") return null;
  return createPortal(<SettlementAssetLayer spec={spec} />, target);
}
