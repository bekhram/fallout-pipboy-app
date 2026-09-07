import React from "react";
import "./playerTokenHp.css";

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default function PlayerTokenHp({ token, session }) {
  if (token?.kind !== "player") return null;

  const ownerClientId = String(token?.ownerClientId || token?.stats?.assignedClientId || "");
  const player = (Array.isArray(session?.players) ? session.players : []).find((item) =>
    String(item?.clientId || item?.peerId || "") === ownerClientId
  );
  const character = player?.character || {};

  const maxHp = finiteNumber(character.maxHp ?? token?.stats?.maxHp);
  const currentHp = finiteNumber(character.currentHp ?? token?.stats?.currentHp ?? token?.stats?.hp);
  if (maxHp == null || maxHp <= 0 || currentHp == null) return null;

  const safeHp = Math.max(0, Math.min(maxHp, currentHp));
  const percent = Math.max(0, Math.min(100, (safeHp / maxHp) * 100));
  const label = `HP ${Math.round(safeHp)}/${Math.round(maxHp)}`;

  return (
    <span className="gm-session-token__hp" title={label} aria-label={label}>
      <span className="gm-session-token__hp-fill" style={{ width: `${percent}%` }} />
      <span className="gm-session-token__hp-value">{Math.round(safeHp)}/{Math.round(maxHp)}</span>
    </span>
  );
}
