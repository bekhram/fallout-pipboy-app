import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./tacticalSessionHud.css";

const INIT_COLLAPSED_KEY = "pip2d20_initiative_collapsed_v1";

function initials(value) {
  return String(value || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "?";
}

function playerForToken(token, players) {
  const owner = String(token?.ownerClientId || "");
  return (players || []).find((player) => String(player?.clientId || player?.peerId || "") === owner) || null;
}

function initiativeFor(token, players) {
  if (token?.kind === "player") {
    const player = playerForToken(token, players);
    return Math.max(0, Number(player?.character?.initiative ?? token?.stats?.initiative ?? 0));
  }
  return Math.max(0, Number(token?.stats?.initiative ?? 0));
}

function hpFor(token, players) {
  if (token?.kind === "player") {
    const player = playerForToken(token, players);
    return {
      hp: Math.max(0, Number(player?.character?.currentHp ?? token?.stats?.hp ?? 0)),
      maxHp: Math.max(0, Number(player?.character?.maxHp ?? token?.stats?.maxHp ?? 0)),
    };
  }
  return {
    hp: Math.max(0, Number(token?.stats?.hp ?? 0)),
    maxHp: Math.max(0, Number(token?.stats?.maxHp ?? 0)),
  };
}

function isHiddenNpc(token) {
  return token?.kind !== "player" && token?.stats?.visibleToPlayers === false;
}

function readCollapsed() {
  try { return localStorage.getItem(INIT_COLLAPSED_KEY) === "1"; } catch { return false; }
}

function tokenAvatarForPlayer(player, tokens) {
  const clientId = String(player?.clientId || player?.peerId || "");
  if (!clientId) return "";
  const token = (tokens || []).find((item) => item?.kind === "player" && String(item?.ownerClientId || "") === clientId && item?.avatar);
  return String(token?.avatar || "");
}

export default function TacticalSessionHud({ session }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [roundTarget, setRoundTarget] = useState(null);
  const players = Array.isArray(session?.players) ? session.players : [];
  const scene = session?.tacticalScene || null;
  const rawTokens = Array.isArray(scene?.tokens) ? scene.tokens : [];

  // Only active participants belong to initiative. Hidden/inactive NPCs stay
  // completely outside the turn order until the GM activates them.
  const tokens = useMemo(
    () => rawTokens.filter((token) => !isHiddenNpc(token)),
    [rawTokens]
  );

  const order = useMemo(() => tokens.map((token, index) => ({
    token,
    index,
    initiative: initiativeFor(token, players),
    hp: hpFor(token, players),
  })).sort((a, b) => {
    if (b.initiative !== a.initiative) return b.initiative - a.initiative;
    if (a.token.kind !== b.token.kind) return a.token.kind === "player" ? -1 : 1;
    const nameSort = String(a.token.name || "").localeCompare(String(b.token.name || ""));
    return nameSort || a.index - b.index;
  }), [tokens, players]);

  const orderIds = useMemo(() => order.map(({ token }) => String(token.id)), [order]);
  const storedActiveId = String(session?.turnState?.activeTokenId || "");
  const activeTokenId = orderIds.includes(storedActiveId) ? storedActiveId : (orderIds[0] || "");
  const activeIndex = Math.max(0, orderIds.indexOf(activeTokenId));
  const round = Math.max(1, Number(session?.turnState?.round || 1));

  useEffect(() => {
    if (typeof document === "undefined" || !scene) return undefined;
    const selector = session?.mode === "host" ? ".gm-session-map__meta" : ".session-tactical-player__actions";
    const sync = () => {
      const next = document.querySelector(selector);
      setRoundTarget((current) => current === next ? current : next);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [scene?.sceneId, session?.mode]);

  if (!session?.isActive) return null;

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try { localStorage.setItem(INIT_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* best effort */ }
      return next;
    });
  };

  const changeTurn = (direction) => {
    if (session?.mode !== "host" || !orderIds.length) return;
    session.advanceTurn?.(orderIds, direction);
  };

  const roundBadge = roundTarget && scene
    ? createPortal(<span className="tactical-round-badge">ROUND {round}</span>, roundTarget)
    : null;

  return (
    <>
      {roundBadge}
      {scene ? <aside className={`tactical-initiative-rail${collapsed ? " is-collapsed" : ""}`} aria-label="Initiative order">
        <button
          type="button"
          className="tactical-initiative-rail__toggle"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          title={collapsed ? "Show initiative" : "Hide initiative"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
        <div className="tactical-initiative-rail__title">
          <span>INIT</span>
          {orderIds.length ? <div className="tactical-turn-counter">
            {session.mode === "host" ? <button type="button" onClick={() => changeTurn(-1)} title="Previous turn">‹</button> : null}
            <b>TURN {activeIndex + 1}/{orderIds.length}</b>
            {session.mode === "host" ? <button type="button" onClick={() => changeTurn(1)} title="Next turn">›</button> : null}
          </div> : <small>NO ACTORS</small>}
        </div>
        <div className="tactical-initiative-rail__list">
          {order.map(({ token, initiative, hp }) => {
            const current = token.id === activeTokenId;
            return <div key={token.id} className={`tactical-initiative-entry${current ? " is-current" : ""}${hp.maxHp > 0 && hp.hp <= 0 ? " is-down" : ""}`} title={`${token.name} · INIT ${initiative}`} aria-current={current ? "true" : undefined}>
              <div className="tactical-initiative-entry__avatar">{token.avatar ? <img src={token.avatar} alt="" draggable={false} /> : <span>{initials(token.name)}</span>}</div>
              <div className="tactical-initiative-entry__meta"><strong>{initiative}</strong><small>{token.name}</small></div>
            </div>;
          })}
        </div>
      </aside> : null}

      <div className="session-player-dock session-player-dock--all" aria-label="Players in session">
        <div className="session-player-dock__rail">
          {players.map((player) => {
            const character = player?.character || {};
            const name = character.name || player?.name || "Player";
            const avatar = character.avatar || tokenAvatarForPlayer(player, rawTokens) || "";
            return <div className="session-player-dock__item" key={player.clientId || player.peerId || name} title={name}>
              <div className="session-player-dock__avatar">
                {avatar ? <img src={avatar} alt="" draggable={false} /> : <span>{initials(name)}</span>}
                <i className={`session-player-dock__online${player.online === false ? " is-offline" : ""}`} />
              </div>
              <small>{name}</small>
            </div>;
          })}
        </div>
      </div>
    </>
  );
}
