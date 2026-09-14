import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function symbolFor(type, fallback) {
  if (fallback) return fallback;
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
  const tokens = useMemo(() => {
    if (Array.isArray(scene?.questTokens) && scene.questTokens.length) return scene.questTokens;
    if (Array.isArray(scene?.encounterContext?.questTokens)) return scene.encounterContext.questTokens;
    return [];
  }, [scene?.questTokens, scene?.encounterContext?.questTokens]);
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!scene || session?.mode !== "host") {
      setTarget(null);
      return undefined;
    }

    let cancelled = false;
    let timer = null;
    const findTarget = () => {
      if (cancelled) return;
      const nodes = document.querySelectorAll(".gm-tactical-map-core .gm-session-map__grid");
      const node = nodes.length ? nodes[nodes.length - 1] : null;
      if (node) {
        setTarget(node);
        return;
      }
      timer = window.setTimeout(findTarget, 100);
    };
    findTarget();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      setTarget(null);
    };
  }, [scene?.sceneId, session?.mode]);

  if (!target || !tokens.length || session?.mode !== "host") return null;

  const cols = Math.max(1, Number(scene?.cols || 24));
  const rows = Math.max(1, Number(scene?.rows || 24));

  return createPortal(
    <div
      className="quest-token-layer"
      data-quest-token-layer="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 500,
        overflow: "visible",
      }}
    >
      {tokens.map((token) => {
        const x = Math.max(0, Math.min(cols - 1, Number(token?.x) || 0));
        const y = Math.max(0, Math.min(rows - 1, Number(token?.y) || 0));
        const size = token?.primary ? 38 : 32;
        return (
          <div
            key={token.id}
            data-quest-token={token.objectiveId || token.id}
            title={token.label || token.title || "Quest objective"}
            style={{
              position: "absolute",
              left: `${((x + 0.5) / cols) * 100}%`,
              top: `${((y + 0.5) / rows) * 100}%`,
              width: size,
              height: size,
              transform: "translate(-50%, -50%) rotate(45deg)",
              border: "3px solid #ff9800",
              borderRadius: 5,
              background: "rgba(39, 20, 0, .96)",
              boxShadow: "0 0 0 2px rgba(0,0,0,.9), 0 0 18px #ff9800, inset 0 0 9px rgba(255,152,0,.5)",
              color: "#ffb13b",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            <span style={{ transform: "rotate(-45deg)", fontSize: token?.primary ? 21 : 18, lineHeight: 1 }}>
              {symbolFor(token.objectiveType, token.symbol)}
            </span>
          </div>
        );
      })}
    </div>,
    target,
  );
}
