import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PhaserAsset from "../phaser/PhaserAsset.jsx";
import { generateVaultLayout } from "../../utils/proceduralVaultGenerator.js";

const CELL = 64;

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function vaultFallbackDataUrl(tile) {
  const doors = tile?.activeDoors || {};
  const ruined = tile?.kind === "ruined_room";
  const corridor = tile?.kind === "corridor";
  const roomFill = ruined ? "#493c36" : corridor ? "#313c40" : "#3e4749";
  const floor = ruined ? "#5a4a42" : "#596568";
  const label = esc(String(tile?.label || tile?.tileId || "VAULT").replace(/^ruined_/i, ""));
  const sector = esc(String(tile?.sector || "").toUpperCase());
  const wall = "#9aa3a4";
  const hazard = "#d5a640";
  const opening = [];
  if (doors.n) opening.push('<rect x="36" y="0" width="28" height="12" fill="#151b1d"/>');
  if (doors.s) opening.push('<rect x="36" y="88" width="28" height="12" fill="#151b1d"/>');
  if (doors.w) opening.push('<rect x="0" y="36" width="12" height="28" fill="#151b1d"/>');
  if (doors.e) opening.push('<rect x="88" y="36" width="12" height="28" fill="#151b1d"/>');
  const rubble = ruined
    ? '<g fill="#2e2926" opacity=".9"><circle cx="24" cy="25" r="5"/><circle cx="74" cy="71" r="7"/><rect x="56" y="18" width="10" height="5" transform="rotate(22 61 20)"/></g>'
    : "";
  const corridorMark = corridor
    ? '<path d="M50 8V92M8 50H92" stroke="#a6b5b6" stroke-width="9" opacity=".28"/>'
    : "";
  const hatch = tile?.tileId === "atrium_vault_entrance"
    ? '<circle cx="50" cy="13" r="12" fill="#252b2c" stroke="#d5a640" stroke-width="3"/><circle cx="50" cy="13" r="5" fill="#596568"/>'
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#111719"/>
    <rect x="5" y="5" width="90" height="90" rx="4" fill="${roomFill}" stroke="${wall}" stroke-width="4"/>
    <rect x="14" y="14" width="72" height="72" rx="3" fill="${floor}" stroke="#262f31" stroke-width="2"/>
    ${corridorMark}
    <path d="M16 16H84M16 84H84" stroke="${hazard}" stroke-width="2" stroke-dasharray="5 4" opacity=".7"/>
    ${rubble}${hatch}
    ${opening.join("")}
    <text x="50" y="48" text-anchor="middle" fill="#e6eeee" font-family="monospace" font-size="5.6" font-weight="700">${label.slice(0, 22)}</text>
    <text x="50" y="57" text-anchor="middle" fill="#b8c5c5" font-family="monospace" font-size="4.5">${sector}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function tileStyle(tile, preview, cols, rows) {
  if (preview) {
    return {
      position: "absolute",
      left: `${(tile.cellX / cols) * 100}%`,
      top: `${(tile.cellY / rows) * 100}%`,
      width: `${(tile.w / cols) * 100}%`,
      height: `${(tile.h / rows) * 100}%`,
      transform: `rotate(${Number(tile.rotation || 0)}deg)`,
      transformOrigin: "50% 50%",
      objectFit: "fill",
      pointerEvents: "none",
    };
  }
  return {
    position: "absolute",
    left: tile.cellX * CELL,
    top: tile.cellY * CELL,
    width: tile.w * CELL,
    height: tile.h * CELL,
    transform: `rotate(${Number(tile.rotation || 0)}deg)`,
    transformOrigin: "50% 50%",
    objectFit: "fill",
    pointerEvents: "none",
  };
}

export function VaultAssetLayer({ spec, layout: suppliedLayout, preview = false }) {
  const layout = useMemo(
    () => suppliedLayout || generateVaultLayout(spec || {}),
    [suppliedLayout, spec?.seed, spec?.cols, spec?.rows, spec?.targetRooms, spec?.targetCorridors, spec?.ruinedChance],
  );
  const cols = Number(layout?.spec?.cols || spec?.cols || 24);
  const rows = Number(layout?.spec?.rows || spec?.rows || 24);

  return (
    <>
      {(layout?.tiles || []).map((tile) => {
        const style = tileStyle(tile, preview, cols, rows);
        if (preview) {
          return <img key={tile.id} src={vaultFallbackDataUrl(tile)} alt="" draggable={false} style={style} />;
        }
        return (
          <PhaserAsset
            key={tile.id}
            src={vaultFallbackDataUrl(tile)}
            style={style}
            data-vault-tile={tile.tileId}
            data-vault-module={`${tile.moduleX}:${tile.moduleY}`}
          />
        );
      })}
    </>
  );
}

export default function VaultAssetPortal({ session, targetSelector = ".gm-tactical-map-core .gm-session-map__grid" }) {
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (typeof document === "undefined" || String(spec?.type || "") !== "vault_tunnels") {
      setTarget(null);
      return undefined;
    }
    let cancelled = false;
    const find = () => {
      if (cancelled) return;
      setTarget(document.querySelector(targetSelector));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      observer.disconnect();
      setTarget(null);
    };
  }, [scene?.sceneId, scene?.active, spec?.type, spec?.seed, spec?.cols, spec?.rows, targetSelector]);

  if (!target || String(spec?.type || "") !== "vault_tunnels") return null;
  const layout = scene?.environment?.vaultLayout || null;
  return createPortal(<VaultAssetLayer spec={spec} layout={layout} />, target);
}
