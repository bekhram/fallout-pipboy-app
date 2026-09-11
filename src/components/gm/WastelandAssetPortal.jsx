import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import wastelandBg from "../../assets/wasteland/backgrounds/wasteland-bg-1.png";
import swampBg from "../../assets/wasteland/backgrounds/wasteland-swamp-bg-1.png";
import urbanRuinsBg from "../../assets/wasteland/backgrounds/wasteland-urban-ruins-bg-1.png";
import { buildOpenWastelandSite } from "../../utils/proceduralWastelandOpen.js";

const GRID = 24;
const BACKGROUNDS = [wastelandBg, swampBg, urbanRuinsBg];

function hashSeed(value) {
  const s = String(value ?? "1");
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function backgroundForSpec(spec) {
  const explicit = String(spec?.backgroundType || spec?.terrainType || "").toLowerCase();
  if (explicit.includes("swamp")) return swampBg;
  if (explicit.includes("urban") || explicit.includes("ruin") || explicit.includes("city")) return urbanRuinsBg;
  if (explicit.includes("wasteland") || explicit.includes("desert")) return wastelandBg;
  return BACKGROUNDS[hashSeed(spec?.seed) % BACKGROUNDS.length];
}

function roadStyle(road, surface) {
  const horizontal = road.w >= road.h;
  const common = {
    position: "absolute",
    left: `${(road.x / GRID) * 100}%`,
    top: `${(road.y / GRID) * 100}%`,
    width: `${(road.w / GRID) * 100}%`,
    height: `${(road.h / GRID) * 100}%`,
    boxSizing: "border-box",
    pointerEvents: "none",
    opacity: 0.94,
  };

  if (surface === "dirt") {
    return {
      ...common,
      background: "rgba(118, 91, 58, .9)",
      border: "1px solid rgba(62, 45, 31, .75)",
      boxShadow: "inset 0 0 18px rgba(43, 31, 21, .35)",
    };
  }

  if (surface === "cobblestone") {
    return {
      ...common,
      backgroundColor: "rgba(89, 86, 79, .94)",
      backgroundImage:
        "linear-gradient(rgba(120,115,104,.38) 1px, transparent 1px), linear-gradient(90deg, rgba(55,52,48,.35) 1px, transparent 1px)",
      backgroundSize: "18px 14px",
      border: "1px solid rgba(54, 52, 47, .8)",
    };
  }

  return {
    ...common,
    background: "rgba(62, 63, 60, .94)",
    border: "1px solid rgba(35, 36, 34, .9)",
    boxShadow: "inset 0 0 14px rgba(0,0,0,.28)",
    backgroundImage: horizontal
      ? "linear-gradient(to bottom, transparent 47%, rgba(174,160,111,.85) 47%, rgba(174,160,111,.85) 53%, transparent 53%)"
      : "linear-gradient(to right, transparent 47%, rgba(174,160,111,.85) 47%, rgba(174,160,111,.85) 53%, transparent 53%)",
  };
}

export function WastelandAssetLayer({ spec, preview = false }) {
  const site = useMemo(
    () => buildOpenWastelandSite({ ...spec, cols: GRID, rows: GRID }),
    [spec?.seed, spec?.backgroundType, spec?.terrainType]
  );
  const background = useMemo(() => backgroundForSpec(spec), [spec?.seed, spec?.backgroundType, spec?.terrainType]);

  return (
    <div
      className={preview ? "gm-wasteland-assets is-preview" : "gm-wasteland-assets"}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: preview ? "100%" : "var(--battlemap-world-width, 100%)",
        height: preview ? "100%" : "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: preview ? 2 : 0,
        overflow: "hidden",
      }}
    >
      <img
        src={background}
        alt=""
        draggable={false}
        data-wasteland-background="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
        {site.roads.map((road, index) => (
          <div
            key={`${road.x}-${road.y}-${road.w}-${road.h}-${index}`}
            data-wasteland-road={site.profile.surface}
            style={roadStyle(road, site.profile.surface)}
          />
        ))}
      </div>
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
