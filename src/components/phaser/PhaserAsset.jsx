import React, { useEffect, useRef, useState } from "react";

// Keep the existing deterministic generators and their placement data. Only the
// renderer changes; previews outside a map continue to use an ordinary image.
export default function PhaserAsset(props) {
  const ref = useRef(null);
  const [rendered, setRendered] = useState(false);
  const signature = JSON.stringify(props);
  useEffect(() => {
    const grid = ref.current?.closest('[data-phaser-grid]');
    if (!grid) return;
    let dispose;
    const register = () => {
      dispose?.();
      if (grid.phaserMap) dispose = grid.phaserMap.asset(props, () => setRendered(true));
    };
    register(); grid.addEventListener('phaser-ready', register);
    return () => { grid.removeEventListener('phaser-ready', register); dispose?.(); };
  }, [signature]);
  return <img {...props} ref={ref} style={{ ...props.style, visibility: rendered ? 'hidden' : props.style?.visibility }} />;
}

export function PhaserToken({ token, selected }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current, grid = node?.closest('[data-phaser-grid]'), shell = node?.closest('.gm-session-token');
    if (!grid) return;
    let dispose;
    const register = () => {
      dispose?.();
      if (grid.phaserMap) {
        dispose = grid.phaserMap.token(token, selected);
        shell?.classList.add('is-phaser-token');
      }
    };
    register(); grid.addEventListener('phaser-ready', register);
    return () => { grid.removeEventListener('phaser-ready', register); dispose?.(); shell?.classList.remove('is-phaser-token'); };
  }, [token, selected]);
  return <span ref={ref} className="phaser-token-fallback">{token.avatar ? <img src={token.avatar} alt="" draggable={false} /> : <b>{String(token.name || 'T').slice(0, 1).toUpperCase()}</b>}</span>;
}
