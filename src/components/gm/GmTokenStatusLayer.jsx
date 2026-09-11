import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./gmTokenStatusLayer.css";

const TOKEN_PALETTE = [
  "#78ff98",
  "#ffd166",
  "#62d9ff",
  "#ff7ad9",
  "#ff9b54",
  "#8da2ff",
  "#d6ff63",
  "#c58cff",
];

function playerFor(token, players) {
  const owner = String(token?.ownerClientId || token?.stats?.assignedClientId || "");
  return (players || []).find((player) =>
    String(player?.clientId || player?.peerId || "") === owner
  ) || null;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hpFor(token, players) {
  if (token?.kind === "player") {
    const player = playerFor(token, players);
    const character = player?.character || {};
    const nested = character?.data || {};
    const hp = finite(
      character.currentHp
      ?? character.currentHP
      ?? nested.currentHp
      ?? nested.currentHP
      ?? token?.stats?.currentHp
      ?? token?.stats?.hp
    );
    const maxHp = finite(
      character.maxHp
      ?? character.maxHP
      ?? nested.maxHp
      ?? nested.maxHP
      ?? token?.stats?.maxHp
    );
    return {
      hp: Math.max(0, hp ?? 0),
      maxHp: Math.max(0, maxHp ?? 0),
    };
  }

  return {
    hp: Math.max(0, finite(token?.stats?.hp ?? token?.stats?.currentHp) ?? 0),
    maxHp: Math.max(0, finite(token?.stats?.maxHp) ?? 0),
  };
}

function hashIndex(value) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % TOKEN_PALETTE.length;
}

function colorIndex(token) {
  const explicit = Number(token?.stats?.tokenColorIndex);
  if (Number.isFinite(explicit)) return Math.abs(Math.floor(explicit)) % TOKEN_PALETTE.length;
  return hashIndex(token?.stats?.hordeGroupId || token?.id || token?.name);
}

function Status({ token, session }) {
  const state = hpFor(token, session?.players || []);
  const showPlayerHp = token?.kind === "player" && state.maxHp > 0;
  const down = state.maxHp > 0 && state.hp <= 0;
  const percent = state.maxHp > 0
    ? Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100))
    : 0;

  return <>
    {showPlayerHp ? (
      <span className="gm-token-status-hp" title={`HP ${state.hp}/${state.maxHp}`} aria-label={`Current HP ${state.hp}`}>
        <span style={{ width: `${percent}%` }} />
        <b>HP {Math.round(state.hp)}</b>
      </span>
    ) : null}
    {down ? <span className="gm-token-zero-marker" aria-label="0 HP" /> : null}
  </>;
}

function effectiveCols(scene) {
  const sceneCols = Number(scene?.cols);
  if (Number.isFinite(sceneCols) && sceneCols > 0) return Math.floor(sceneCols);
  const procedural = Number(scene?.environment?.proceduralMapSpec?.cols);
  return Number.isFinite(procedural) && procedural > 0 ? Math.floor(procedural) : 12;
}

function bindTargetsToTokens(scene, targets) {
  const tokens = Array.isArray(scene?.tokens) ? scene.tokens : [];
  if (!tokens.length || !targets.length || typeof document === "undefined") return [];

  const cells = [...document.querySelectorAll(
    ".gm-session-map.tactical-map .gm-session-map__grid.tactical-grid .gm-session-map__cell"
  )];
  const cols = effectiveCols(scene);
  const used = new Set();

  return targets.map((target) => {
    const cell = target.closest?.(".gm-session-map__cell");
    const cellIndex = cell ? cells.indexOf(cell) : -1;
    if (cellIndex < 0) return null;
    const x = cellIndex % cols;
    const y = Math.floor(cellIndex / cols);

    const match = tokens.find((token) =>
      !used.has(token.id)
      && Number(token.x) === x
      && Number(token.y) === y
    ) || null;

    if (match) used.add(match.id);
    return match;
  });
}

export default function GmTokenStatusLayer({ session }) {
  const scene = session?.tacticalScene || null;
  const [targets, setTargets] = useState([]);
  const activeTokenId = String(session?.turnState?.activeTokenId || "");

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => {
      const next = [...document.querySelectorAll(
        ".gm-session-map.tactical-map .gm-session-map__grid.tactical-grid .gm-session-token"
      )];
      setTargets((current) =>
        current.length === next.length && current.every((node, index) => node === next[index])
          ? current
          : next
      );
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId]);

  const boundTokens = useMemo(
    () => bindTargetsToTokens(scene, targets),
    [scene, targets]
  );

  useEffect(() => {
    const decorated = [];
    targets.forEach((node, index) => {
      const token = boundTokens[index];
      if (!node || !token) return;
      const accent = TOKEN_PALETTE[colorIndex(token)];
      node.style.setProperty("--token-accent", accent);
      node.classList.add("has-token-accent");
      node.classList.toggle("is-horde-member", Boolean(token?.stats?.hordeGroupId || token?.stats?.hordeVisualGroup));
      node.classList.toggle("is-turn-active", Boolean(activeTokenId && String(token.id) === activeTokenId));
      if (token?.stats?.hordeGroupId) node.dataset.hordeGroup = String(token.stats.hordeGroupId);
      else delete node.dataset.hordeGroup;
      decorated.push(node);
    });

    return () => decorated.forEach((node) => {
      node.classList.remove("has-token-accent", "is-horde-member", "is-turn-active");
      node.style.removeProperty("--token-accent");
      delete node.dataset.hordeGroup;
    });
  }, [targets, boundTokens, activeTokenId]);

  if (!session?.isActive || session?.mode !== "host") return null;

  return targets.map((target, index) => {
    const token = boundTokens[index];
    if (!target || !token) return null;
    return createPortal(
      <Status token={token} session={session} />,
      target,
      `status-${token.id}`
    );
  });
}
