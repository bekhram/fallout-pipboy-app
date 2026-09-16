import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function gridForPlayer() {
  if (typeof document === "undefined") return null;
  return document.querySelector(".session-tactical-player .gm-session-map__grid.tactical-grid");
}

function gridSize(scene) {
  const spec = scene?.environment?.proceduralMapSpec;
  return {
    cols: Math.max(1, Number(spec?.cols || scene?.cols || 12)),
    rows: Math.max(1, Number(spec?.rows || scene?.rows || 12)),
  };
}

export default function PlayerClickMoveLayer({ session }) {
  const scene = session?.tacticalScene || null;
  const [grid, setGrid] = useState(null);
  const [armedTokenId, setArmedTokenId] = useState("");
  const [cursor, setCursor] = useState(null);
  const { cols } = gridSize(scene);

  const ownedTokens = useMemo(() => {
    const clientId = String(session?.clientId || "");
    return (Array.isArray(scene?.tokens) ? scene.tokens : [])
      .filter((token) => token?.kind === "player" && String(token?.ownerClientId || "") === clientId);
  }, [scene?.tokens, session?.clientId]);

  const armedToken = ownedTokens.find((token) => token.id === armedTokenId) || null;

  useEffect(() => {
    if (armedTokenId && !ownedTokens.some((token) => token.id === armedTokenId)) setArmedTokenId("");
  }, [armedTokenId, ownedTokens]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => setGrid((current) => {
      const next = gridForPlayer();
      return current === next ? current : next;
    });
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId]);

  useEffect(() => {
    if (!grid || !scene || session?.mode !== "player") return undefined;

    const cellCoordinates = (cell) => {
      const cells = Array.from(grid.querySelectorAll(":scope > .gm-session-map__cell"));
      const index = cells.indexOf(cell);
      if (index < 0) return null;
      return { x: index % cols, y: Math.floor(index / cols) };
    };

    const tokenAtCell = (coords) => ownedTokens.find((token) => Number(token.x) === coords.x && Number(token.y) === coords.y) || null;

    const click = async (event) => {
      const cell = event.target?.closest?.(".gm-session-map__cell");
      if (!cell || !grid.contains(cell)) return;
      const coords = cellCoordinates(cell);
      if (!coords) return;

      const clickedTokenElement = event.target?.closest?.(".gm-session-token");
      if (clickedTokenElement) {
        const owned = tokenAtCell(coords);
        if (!owned) return;
        event.preventDefault();
        event.stopPropagation();
        setArmedTokenId((current) => current === owned.id ? "" : owned.id);
        return;
      }

      if (!armedTokenId || session?.status !== "online") return;
      event.preventDefault();
      event.stopPropagation();
      const response = await session?.moveToken?.(armedTokenId, coords.x, coords.y);
      if (response?.ok === false) return;
    };

    const move = (event) => {
      if (!armedTokenId) return;
      setCursor({ x: event.clientX, y: event.clientY });
    };

    const leave = () => setCursor(null);
    grid.addEventListener("click", click, true);
    grid.addEventListener("pointermove", move, true);
    grid.addEventListener("pointerleave", leave, true);
    return () => {
      grid.removeEventListener("click", click, true);
      grid.removeEventListener("pointermove", move, true);
      grid.removeEventListener("pointerleave", leave, true);
    };
  }, [grid, scene, session, cols, ownedTokens, armedTokenId]);

  useEffect(() => {
    if (!grid) return undefined;
    grid.classList.toggle("is-player-token-armed", Boolean(armedTokenId));
    return () => grid.classList.remove("is-player-token-armed");
  }, [grid, armedTokenId]);

  if (!armedToken || !cursor || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: cursor.x + 14,
        top: cursor.y + 14,
        width: 42,
        height: 42,
        zIndex: 9999,
        pointerEvents: "none",
        border: "2px solid currentColor",
        borderRadius: "50%",
        background: "var(--pip-bg, #071008)",
        boxShadow: "0 0 14px currentColor",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        opacity: 0.9,
      }}
    >
      {armedToken.avatar
        ? <img src={armedToken.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <strong>{String(armedToken.name || "P").slice(0, 1).toUpperCase()}</strong>}
    </div>,
    document.body
  );
}
