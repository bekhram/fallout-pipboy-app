import React, { useMemo, useState } from "react";
import { findLocalPath, generateLocalZone } from "../../utils/localMapGenerator.js";

const MAX_MOVE = 6;

function cellKey(cell) {
  return `${cell.x},${cell.y}`;
}

export default function LocalMap() {
  const [seed, setSeed] = useState(() => String(Date.now()));
  const [zone, setZone] = useState(() => generateLocalZone(seed));
  const [player, setPlayer] = useState(zone.start);
  const [selected, setSelected] = useState(null);

  const route = useMemo(
    () => (selected ? findLocalPath(zone, player, selected, MAX_MOVE) : null),
    [zone, player, selected]
  );
  const routeKeys = useMemo(
    () => new Set((route?.path || []).map(cellKey)),
    [route]
  );

  function regenerate() {
    const nextSeed = String(Date.now());
    const nextZone = generateLocalZone(nextSeed);
    setSeed(nextSeed);
    setZone(nextZone);
    setPlayer(nextZone.start);
    setSelected(null);
  }

  function movePlayer() {
    if (!selected || !route) return;
    setPlayer({ x: selected.x, y: selected.y });
    setSelected(null);
  }

  return (
    <div className="pip-local-map">
      <div className="pip-local-map__toolbar">
        <div>
          <strong>LOCAL ZONE 01</strong>
          <span>6 × 6 / SEED {seed.slice(-6)}</span>
        </div>
        <button type="button" className="pip-action-button" onClick={regenerate}>
          GENERATE
        </button>
      </div>

      <div className="pip-local-map__viewport">
        <div className="pip-local-map__board">
          {zone.cells.map((cell) => {
            const isPlayer = cell.x === player.x && cell.y === player.y;
            const isSelected = selected?.x === cell.x && selected?.y === cell.y;
            const isRoute = routeKeys.has(cellKey(cell));
            const left = (cell.x - cell.y) * 48 + 260;
            const top = (cell.x + cell.y) * 24 + 20;

            return (
              <button
                key={cellKey(cell)}
                type="button"
                className={`pip-local-cell pip-local-cell--${cell.terrain} ${
                  cell.walkable ? "is-walkable" : "is-blocked"
                } ${isSelected ? "is-selected" : ""} ${isRoute ? "is-route" : ""}`}
                style={{ left, top }}
                onClick={() => setSelected(cell)}
                title={`[${cell.x + 1},${cell.y + 1}] ${cell.terrain}`}
              >
                <span className="pip-local-cell__object">
                  {cell.object === "crate" && "▣"}
                  {cell.object === "barrel" && "◉"}
                  {cell.object === "rubble" && "▲"}
                  {cell.object === "door" && "▥"}
                  {cell.terrain === "wall" && "█"}
                </span>
                {isPlayer && <span className="pip-local-player">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pip-local-map__status">
        <div>
          <strong>MOVE:</strong> {route ? `${route.cost} / ${MAX_MOVE}` : `0 / ${MAX_MOVE}`}
        </div>
        <div>
          <strong>CELL:</strong>{" "}
          {selected ? `[${selected.x + 1},${selected.y + 1}] ${selected.terrain.toUpperCase()}` : "-"}
        </div>
        <div>
          <strong>OBJECT:</strong> {selected?.object?.toUpperCase() || "NONE"}
        </div>
        <button
          type="button"
          className="pip-action-button"
          disabled={!route || !selected || !selected.walkable}
          onClick={movePlayer}
        >
          MOVE
        </button>
      </div>
    </div>
  );
}
