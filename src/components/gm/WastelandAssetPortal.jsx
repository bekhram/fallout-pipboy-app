import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import terrainAtlas from "../../assets/wasteland/generated/terrainAtlas.js";
import ruinsAtlas from "../../assets/wasteland/generated/ruinsAtlas.js";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const CELL = 100;
const GRID = 24;
const ATLAS_CELL = 150;
const ATLAS_W = ATLAS_CELL * 5;
const ATLAS_H = ATLAS_CELL;

const TERRAIN_SPRITES = {
  cliff: 0,
  rocks: 1,
  dead_tree: 2,
  wreck_car: 3,
  wreck_truck: 4,
};

function AtlasSprite({ atlas, index, item }) {
  const px = item.x * CELL;
  const py = item.y * CELL;
  const pw = item.w * CELL;
  const ph = item.h * CELL;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const sourceX = index * ATLAS_CELL;
  const rotation = Number(item.rot || 0);

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotation})`}>
      <svg
        x={-pw / 2}
        y={-ph / 2}
        width={pw}
        height={ph}
        viewBox={`${sourceX} 0 ${ATLAS_CELL} ${ATLAS_CELL}`}
        preserveAspectRatio="xMidYMid meet"
        overflow="hidden"
      >
        <image
          href={atlas}
          x="0"
          y="0"
          width={ATLAS_W}
          height={ATLAS_H}
          preserveAspectRatio="none"
        />
      </svg>
    </g>
  );
}

function WastelandAssetOverlay({ spec }) {
  const site = useMemo(() => buildOpenWastelandSite({ ...spec, cols: GRID, rows: GRID }), [spec?.seed]);

  return (
    <svg
      className="gm-wasteland-asset-overlay"
      viewBox={`0 0 ${GRID * CELL} ${GRID * CELL}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {site.obstacles
        .filter((item) => item.type === "cliff" || item.type === "rocks")
        .map((item, index) => (
          <AtlasSprite
            key={`obstacle-${index}`}
            atlas={terrainAtlas}
            index={TERRAIN_SPRITES[item.type]}
            item={item}
          />
        ))}

      {site.ruins.map((item, index) => (
        <AtlasSprite
          key={`ruin-${index}`}
          atlas={ruinsAtlas}
          index={Number(item.sprite || 0)}
          item={item}
        />
      ))}

      {site.vehicles.map((item, index) => (
        <AtlasSprite
          key={`vehicle-${index}`}
          atlas={terrainAtlas}
          index={TERRAIN_SPRITES[item.type]}
          item={item}
        />
      ))}

      {site.trees.map((item, index) => (
        <AtlasSprite
          key={`tree-${index}`}
          atlas={terrainAtlas}
          index={TERRAIN_SPRITES.dead_tree}
          item={item}
        />
      ))}
    </svg>
  );
}

export default function WastelandAssetPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const node = document.querySelector(".gm-tactical-map-core .gm-session-map__grid");
    setTarget(node || null);
  }, [scene?.sceneId, scene?.backgroundName, spec?.seed, spec?.type]);

  if (!target || !spec || String(spec.type || "") !== "wasteland") return null;
  return createPortal(<WastelandAssetOverlay spec={spec} />, target);
}
