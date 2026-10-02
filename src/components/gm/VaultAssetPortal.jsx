import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PhaserAsset from "../phaser/PhaserAsset.jsx";
import { generateVaultLayout } from "../../utils/proceduralVaultGenerator.js";

const CELL = 64;
const NORMALIZED_VAULT_ASSET_CACHE = new Map();

function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function averageCornerColor(data, width, height) {
  const samples = [];
  const patch = Math.max(4, Math.min(16, Math.floor(Math.min(width, height) * 0.035)));
  const corners = [
    [0, 0],
    [Math.max(0, width - patch), 0],
    [0, Math.max(0, height - patch)],
    [Math.max(0, width - patch), Math.max(0, height - patch)],
  ];
  corners.forEach(([sx, sy]) => {
    for (let y = sy; y < Math.min(height, sy + patch); y += 2) {
      for (let x = sx; x < Math.min(width, sx + patch); x += 2) {
        const i = (y * width + x) * 4;
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  });
  if (!samples.length) return [20, 20, 20];
  return [0, 1, 2].map((channel) =>
    Math.round(samples.reduce((sum, value) => sum + value[channel], 0) / samples.length)
  );
}

function detectContentBounds(ctx, width, height) {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const bg = averageCornerColor(data, width, height);
  const step = Math.max(1, Math.floor(Math.min(width, height) / 256));
  const threshold = 34;
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 24) continue;
      const pixel = [data[i], data[i + 1], data[i + 2]];
      if (colorDistance(pixel, bg) < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return { x: 0, y: 0, w: width, h: height };

  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.012));
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const side = Math.min(Math.max(contentW, contentH), Math.min(width, height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  let x = Math.round(centerX - side / 2);
  let y = Math.round(centerY - side / 2);
  x = Math.max(0, Math.min(width - side, x));
  y = Math.max(0, Math.min(height - side, y));
  return { x, y, w: side, h: side };
}

function normalizeVaultAsset(src) {
  if (!src || typeof window === "undefined") return Promise.resolve(src);
  if (NORMALIZED_VAULT_ASSET_CACHE.has(src)) return NORMALIZED_VAULT_ASSET_CACHE.get(src);

  const promise = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      try {
        const source = document.createElement("canvas");
        source.width = image.naturalWidth || image.width;
        source.height = image.naturalHeight || image.height;
        const sourceCtx = source.getContext("2d", { willReadFrequently: true });
        if (!sourceCtx) return resolve(src);
        sourceCtx.drawImage(image, 0, 0);
        const bounds = detectContentBounds(sourceCtx, source.width, source.height);

        const output = document.createElement("canvas");
        output.width = 512;
        output.height = 512;
        const outCtx = output.getContext("2d");
        if (!outCtx) return resolve(src);
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = "high";
        outCtx.drawImage(
          source,
          bounds.x, bounds.y, bounds.w, bounds.h,
          0, 0, output.width, output.height,
        );
        resolve(output.toDataURL("image/webp", 0.92));
      } catch {
        resolve(src);
      }
    };
    image.onerror = () => resolve(src);
    image.src = src;
  });

  NORMALIZED_VAULT_ASSET_CACHE.set(src, promise);
  return promise;
}

function VaultTileAsset({ tile, style, preview }) {
  const [src, setSrc] = useState(tile.assetPath);

  useEffect(() => {
    let cancelled = false;
    setSrc(tile.assetPath);
    normalizeVaultAsset(tile.assetPath).then((normalized) => {
      if (!cancelled) setSrc(normalized || tile.assetPath);
    });
    return () => { cancelled = true; };
  }, [tile.assetPath]);

  if (preview) {
    return <img src={src} alt="" draggable={false} style={style} />;
  }

  return (
    <PhaserAsset
      src={src}
      style={style}
      data-vault-tile={tile.tileId}
      data-vault-module={`${tile.moduleX}:${tile.moduleY}`}
    />
  );
}


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
        return <VaultTileAsset key={tile.id} tile={tile} style={style} preview={preview} />;
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
