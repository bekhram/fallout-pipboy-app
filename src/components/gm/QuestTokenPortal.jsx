import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function symbolFor(type) {
  const value = String(type || "").toLowerCase();
  if (["search", "investigation", "discover", "hunt"].includes(value)) return "?";
  if (value === "repair") return "⚙";
  if (["escape", "escort"].includes(value)) return "→";
  if (["defense", "holdout"].includes(value)) return "◆";
  if (value === "sabotage") return "×";
  if (value === "rescue") return "+";
  return "!";
}

export default function QuestTokenPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const tokens = useMemo(
    () => (Array.isArray(scene?.encounterContext?.questTokens) ? scene.encounterContext.questTokens : []),
    [scene?.encounterContext?.questTokens],
  );
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!scene || session?.mode !== "host" || !tokens.length) {
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
      if (tries < 40) window.setTimeout(findTarget, 50);
    };
    findTarget();
    return () => {
      cancelled = true;
      setTarget(null);
    };
  }, [scene?.sceneId, session?.mode, tokens.length]);

  if (!target || !tokens.length || session?.mode !== "host") return null;

  const cols = Math.max(1, Number(scene?.cols || 24));
  const rows = Math.max(1, Number(scene?.rows || 24));

  return createPortal(
    <div
      data-quest-token-layer="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 165,
        overflow: "hidden",
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
      }}
    >
      {tokens.map((token) => {
        const size = token.primary ? 36 : 31;
        return (
          <div
            key={token.id}
            data-quest-token={token.objectiveId}
            title={token.label || "Quest objective"}
            style={{
              position: "absolute",
              left: `${((Number(token.x || 0) + 0.5) / cols) * 100}%`,
              top: `${((Number(token.y || 0) + 0.5) / rows) * 100}%`,
              width: size,
              height: size,
              transform: "translate(-50%, -50%) rotate(45deg)",
              border: "3px solid #ff9d24",
              borderRadius: 6,
              background: "rgba(42, 22, 2, .94)",
              boxShadow: "0 0 0 2px rgba(0,0,0,.82), 0 0 16px #ff9d24, inset 0 0 8px rgba(255,157,36,.45)",
              color: "#ffb14a",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              zIndex: 1,
            }}
          >
            <span style={{ transform: "rotate(-45deg)", fontSize: token.primary ? 20 : 17, lineHeight: 1 }}>
              {symbolFor(token.objectiveType)}
            </span>
          </div>
        );
      })}
    </div>,
    target,
  );
}
