import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { generateProceduralBattlemapExtras } from "../../utils/proceduralBattlemapExtras.js";

const GRID = 24;

export default function ProceduralBattlemapExtraPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  const extras = useMemo(
    () => (spec ? generateProceduralBattlemapExtras(spec) : []),
    [
      spec?.type,
      spec?.seed,
      spec?.terrain,
      spec?.density,
      spec?.lootRarity,
      spec?.wealth,
      spec?.trapCount,
      spec?.trapLethality,
    ],
  );

  useEffect(() => {
    if (!spec) {
      setTarget(null);
      return undefined;
    }

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
  }, [scene?.sceneId, spec?.type, spec?.seed, spec?.terrain]);

  if (!target || !extras.length) return null;

  return createPortal(
    <div
      aria-hidden="true"
      data-procedural-battlemap-extras="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 46,
        overflow: "hidden",
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
      }}
    >
      {extras.map((extra) => (
        <div
          key={extra.id}
          data-procedural-extra={extra.kind}
          data-procedural-extra-id={extra.id}
          data-procedural-extra-marker={extra.marker}
          title={`${extra.kind} ${extra.marker}`}
          style={{
            position: "absolute",
            left: `${((Number(extra.x || 0) + 0.5) / GRID) * 100}%`,
            top: `${((Number(extra.y || 0) + 0.5) / GRID) * 100}%`,
            width: 30,
            height: 30,
            transform: "translate(-50%, -50%)",
            border: "2px solid currentColor",
            borderRadius: "50%",
            background: "rgba(0, 20, 7, .9)",
            boxShadow: "0 0 0 2px rgba(0,0,0,.45), 0 0 10px currentColor",
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          <span>{extra.marker}</span>
          <small
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: "rgba(0,20,7,.96)",
              border: "1px solid currentColor",
              display: "grid",
              placeItems: "center",
              fontSize: 9,
            }}
          >
            {extra.symbol}
          </small>
        </div>
      ))}
    </div>,
    target,
  );
}
