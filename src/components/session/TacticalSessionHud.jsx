import React, { useMemo, useState } from "react";
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
  const players = Array.isArray(session?.players) ? session.players : [];
  const scene = session?.tacticalScene || null;
  const rawTokens = Array.isArray(scene?.tokens) ? scene.tokens : [];

  const tokens = useMemo(
    () => session?.mode === "player" ? rawTokens.filter((token) => !isHiddenNpc(token)) : rawTokens,
    [rawTokens, session?.mode]
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

  if (!session?.isActive) return null;

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try { localStorage.setItem(INIT_COLLAPSED_KEY, next ? "1" : "0"); } catch { /* best effort */ }
      return next;
    });
  };

  return (
    <>
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
        <div className="tactical-initiative-rail__title">INIT</div>
        <div className="tactical-initiative-rail__list">
          {order.map(({ token, initiative, hp }) => {
            const hidden = isHiddenNpc(token);
            return <div key={token.id} className={`tactical-initiative-entry${hidden && session.mode === "host" ? " is-hidden" : ""}${hp.maxHp > 0 && hp.hp <= 0 ? " is-down" : ""}`} title={`${token.name} · INIT ${initiative}`}>
              <div className="tactical-initiative-entry__avatar">{token.avatar ? <img src={token.avatar} alt="" /> : <span>{initials(token.name)}</span>}</div>
              <div className="tactical-initiative-entry__meta"><strong>{initiative}</strong><small>{token.name}</small></div>
              {hidden && session.mode === "host" ? <i>H</i> : null}
            </div>;
          })}
        </div>
      </aside> : null}

      <div className="session-player-dock session-player-dock--all" aria-label="Players in session">
        <div className="session-player-dock__rail">
          {players.map((player) => {
            const character = player?.character || {};
            const name = character.name || player?.name || "Player";
            const avatar = character.avatar || tokenAvatarForPlayer(player, tokens) || "";
            return <div className="session-player-dock__item" key={player.clientId || player.peerId || name} title={name}>
              <div className="session-player-dock__avatar">
                {avatar ? <img src={avatar} alt="" /> : <span>{initials(name)}</span>}
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
