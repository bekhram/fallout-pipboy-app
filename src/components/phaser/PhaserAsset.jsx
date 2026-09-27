import React, { memo, useEffect, useMemo, useRef, useState } from "react";

function stableAssetSignature(props = {}) {
  const style = props.style || {};
  return [
    props.src || "",
    style.left || "",
    style.top || "",
    style.width || "",
    style.height || "",
    style.transform || "",
    style.transformOrigin || "",
    style.objectFit || "",
    props["data-wasteland-background"] || "",
    props["data-wasteland-road"] || "",
    props["data-wasteland-rail"] || "",
    props["data-wasteland-asset"] || "",
    props["data-settlement-house-id"] || "",
  ].join("|");
}

function PhaserAssetBase(props) {
  const ref = useRef(null);
  const [rendered, setRendered] = useState(false);
  const signature = useMemo(
    () => stableAssetSignature(props),
    [
      props.src,
      props.style?.left,
      props.style?.top,
      props.style?.width,
      props.style?.height,
      props.style?.transform,
      props.style?.transformOrigin,
      props.style?.objectFit,
      props["data-wasteland-background"],
      props["data-wasteland-road"],
      props["data-wasteland-rail"],
      props["data-wasteland-asset"],
      props["data-settlement-house-id"],
    ]
  );

  useEffect(() => {
    const grid = ref.current?.closest?.("[data-phaser-grid]");
    if (!grid || !props.src) return undefined;

    let disposed = false;
    let dispose = null;

    const register = () => {
      if (disposed) return;
      dispose?.();
      dispose = null;
      const map = grid.phaserMap;
      if (!map?.asset) return;
      dispose = map.asset(props, () => {
        if (!disposed) setRendered(true);
      });
    };

    register();
    grid.addEventListener("phaser-ready", register);

    return () => {
      disposed = true;
      grid.removeEventListener("phaser-ready", register);
      dispose?.();
    };
  }, [signature]);

  if (rendered) {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        data-phaser-asset-anchor="true"
        style={{ display: "none" }}
      />
    );
  }

  return (
    <img
      {...props}
      ref={ref}
      loading="lazy"
      decoding="async"
    />
  );
}

export default memo(
  PhaserAssetBase,
  (prev, next) => stableAssetSignature(prev) === stableAssetSignature(next)
);

export const PhaserToken = memo(function PhaserToken({ token, selected }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    const grid = node?.closest?.("[data-phaser-grid]");
    const shell = node?.closest?.(".gm-session-token");
    if (!grid) return undefined;

    let dispose = null;

    const register = () => {
      dispose?.();
      dispose = null;
      if (grid.phaserMap?.token) {
        dispose = grid.phaserMap.token(token, selected);
        shell?.classList.add("is-phaser-token");
      }
    };

    register();
    grid.addEventListener("phaser-ready", register);

    return () => {
      grid.removeEventListener("phaser-ready", register);
      dispose?.();
      shell?.classList.remove("is-phaser-token");
    };
  }, [
    token?.id,
    token?.x,
    token?.y,
    token?.avatar,
    token?.name,
    token?.kind,
    token?.npcId,
    token?.size,
    token?.stats?.footprint,
    token?.stats?.hp,
    token?.stats?.currentHp,
    token?.stats?.tokenColorIndex,
    token?.stats?.hordeGroupId,
    selected,
  ]);

  return (
    <span ref={ref} className="phaser-token-fallback">
      {token.avatar
        ? <img src={token.avatar} alt="" draggable={false} loading="lazy" decoding="async" />
        : <b>{String(token.name || "T").slice(0, 1).toUpperCase()}</b>}
    </span>
  );
});
