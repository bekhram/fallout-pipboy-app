import React, { useMemo } from "react";
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
          return <img key={tile.id} src={tile.assetPath} alt="" draggable={false} style={style} />;
        }
        return (
          <PhaserAsset
            key={tile.id}
            src={tile.assetPath}
            style={style}
            data-vault-tile={tile.tileId}
            data-vault-module={`${tile.moduleX}:${tile.moduleY}`}
          />
        );
      })}
    </>
  );
}

export default function VaultAssetPortal({ session }) {
  const spec = session?.tacticalScene?.environment?.proceduralMapSpec;
  if (String(spec?.type || "") !== "vault_tunnels") return null;
  const layout = session?.tacticalScene?.environment?.vaultLayout || null;
  return <VaultAssetLayer spec={spec} layout={layout} />;
}
