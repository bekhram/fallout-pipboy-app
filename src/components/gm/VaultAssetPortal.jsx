import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PhaserAsset from "../phaser/PhaserAsset.jsx";
import { generateVaultLayout } from "../../utils/proceduralVaultGenerator.js";

const CELL = 64;

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
      objectFit: "contain",
      pointerEvents: "none",
      userSelect: "none",
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
    objectFit: "contain",
    pointerEvents: "none",
    userSelect: "none",
  };
}

function VaultTileAsset({ tile, style, preview }) {
  if (preview) {
    return <img src={tile.assetPath} alt="" draggable={false} style={style} />;
  }

  return (
    <PhaserAsset
      src={tile.assetPath}
      style={style}
      data-vault-tile={tile.tileId}
      data-vault-sector={tile.sector || ""}
      data-vault-module={`${tile.moduleX}:${tile.moduleY}`}
    />
  );
}

export function VaultAssetLayer({ spec, layout: suppliedLayout, preview = false }) {
  const layout = useMemo(
    () => suppliedLayout || generateVaultLayout(spec || {}),
    [
      suppliedLayout,
      spec?.seed,
      spec?.cols,
      spec?.rows,
      spec?.targetRooms,
      spec?.targetCorridors,
      spec?.ruinedChance,
    ],
  );

  const cols = Number(layout?.spec?.cols || spec?.cols || 24);
  const rows = Number(layout?.spec?.rows || spec?.rows || 24);

  return (
    <>
      {(layout?.tiles || []).map((tile) => (
        <VaultTileAsset
          key={tile.id}
          tile={tile}
          style={tileStyle(tile, preview, cols, rows)}
          preview={preview}
        />
      ))}
    </>
  );
}

export default function VaultAssetPortal({
  session,
  targetSelector = ".gm-tactical-map-core .gm-session-map__grid",
}) {
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
      if (!cancelled) setTarget(document.querySelector(targetSelector));
    };

    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      observer.disconnect();
      setTarget(null);
    };
  }, [
    scene?.sceneId,
    scene?.active,
    spec?.type,
    spec?.seed,
    spec?.cols,
    spec?.rows,
    targetSelector,
  ]);

  if (!target || String(spec?.type || "") !== "vault_tunnels") return null;
  const layout = scene?.environment?.vaultLayout || null;
  return createPortal(<VaultAssetLayer spec={spec} layout={layout} />, target);
}
