import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const ORANGE = "#ff9800";

function sceneQuestTokens(scene) {
  const tokens = scene?.encounterContext?.questTokens;
  return Array.isArray(tokens) ? tokens.filter((token) => token?.type === "quest") : [];
}

export default function QuestMinimapTokenPortal({ session }) {
  const scene = session?.tacticalScene || null;
  const isGmHost = Boolean(session?.isActive && session?.mode === "host");
  const [target, setTarget] = useState(null);
  const tokens = useMemo(
    () => sceneQuestTokens(scene),
    [scene?.sceneId, scene?.encounterContext?.autoNarrateNonce, scene?.encounterContext?.quest?.id, scene?.encounterContext?.questTokens],
  );

  useEffect(() => {
    if (!isGmHost || !tokens.length) {
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
  }, [isGmHost, scene?.sceneId, tokens.length]);

  if (!isGmHost || !target || !tokens.length) return null;

  const cols = Math.max(1, Number(scene?.cols || 24));
  const rows = Math.max(1, Number(scene?.rows || 24));

  return createPortal(
    <div
      aria-hidden="true"
      data-quest-minimap-layer="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "var(--battlemap-world-width, 100%)",
        height: "var(--battlemap-world-height, 100%)",
        pointerEvents: "none",
        zIndex: 155,
        overflow: "hidden",
        gridColumn: "1 / -1",
        gridRow: "1 / -1",
      }}
    >
      {tokens.map((token) => {
        const left = ((Number(token.x || 0) + 0.5) / cols) * 100;
        const top = ((Number(token.y || 0) + 0.5) / rows) * 100;
        const completed = token.status === "completed";
        return (
          <div
            key={token.id}
            data-quest-token={token.id}
            data-quest-id={token.questId}
            data-objective-id={token.objectiveId}
            data-objective-type={token.objectiveType}
            title={token.label || token.title || "Quest objective"}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: token.primary ? 34 : 30,
              height: token.primary ? 34 : 30,
              transform: "translate(-50%, -50%) rotate(45deg)",
              border: `2px solid ${ORANGE}`,
              borderRadius: 6,
              background: completed ? "rgba(60, 42, 13, .9)" : "rgba(35, 22, 4, .96)",
              boxShadow: completed
                ? `0 0 0 2px rgba(0,0,0,.76), 0 0 8px ${ORANGE}`
                : `0 0 0 2px rgba(0,0,0,.8), 0 0 16px ${ORANGE}, inset 0 0 9px rgba(255,152,0,.24)`,
              color: ORANGE,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              opacity: completed ? 0.62 : 1,
            }}
          >
            <span
              style={{
                transform: "rotate(-45deg)",
                fontSize: token.primary ? 17 : 14,
                lineHeight: 1,
                textShadow: `0 0 8px ${ORANGE}`,
              }}
            >
              {token.symbol || "!"}
            </span>
          </div>
        );
      })}
    </div>,
    target,
  );
}
