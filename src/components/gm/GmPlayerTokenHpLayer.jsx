import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PlayerTokenHp from "./PlayerTokenHp.jsx";

function tokenOrder(a, b) {
  const ay = Number(a.token?.y || 0);
  const by = Number(b.token?.y || 0);
  if (ay !== by) return ay - by;
  const ax = Number(a.token?.x || 0);
  const bx = Number(b.token?.x || 0);
  if (ax !== bx) return ax - bx;
  return a.index - b.index;
}

export default function GmPlayerTokenHpLayer({ session }) {
  const scene = session?.tacticalScene || null;
  const [targets, setTargets] = useState([]);

  const playerTokens = useMemo(
    () => (Array.isArray(scene?.tokens) ? scene.tokens : [])
      .map((token, index) => ({ token, index }))
      .filter(({ token }) => token?.kind === "player")
      .sort(tokenOrder)
      .map(({ token }) => token),
    [scene?.tokens]
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const syncTargets = () => {
      const next = [...document.querySelectorAll(
        ".gm-session-map.tactical-map .gm-session-map__grid.tactical-grid .gm-session-token.is-player"
      )];
      setTargets((current) => (
        current.length === next.length && current.every((node, index) => node === next[index])
          ? current
          : next
      ));
    };

    syncTargets();
    const observer = new MutationObserver(syncTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId]);

  if (!session?.isActive || session?.mode !== "host" || !playerTokens.length) return null;

  return playerTokens.map((token, index) => {
    const target = targets[index];
    if (!target) return null;
    return createPortal(
      <PlayerTokenHp token={token} session={session} />,
      target,
      `hp-${token.id}`
    );
  });
}
