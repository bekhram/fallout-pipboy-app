import React, { useMemo, useCallback } from "react";
import { getCellKey, getTerrain } from "../../utils/mapMath.js";

function MapCell({
  cell,
  isPlayerHere,
  isSelected,
  isDiscovered,
  isReachable,
  onSelect,
}) {
  const terrain = useMemo(() => {
    return getTerrain(cell.terrain);
  }, [cell.terrain]);

  const handleClick = useCallback(() => {
    onSelect(cell);
  }, [onSelect, cell]);

  const className = useMemo(() => {
    return [
      "pip-map-cell",
      "pip-map-cell--wasteland",
      terrain.className,
      isPlayerHere && "is-player",
      isSelected && "is-selected",
      isDiscovered ? "is-discovered" : "is-undiscovered",
      isReachable && "is-reachable",
    ]
      .filter(Boolean)
      .join(" ");
  }, [terrain.className, isPlayerHere, isSelected, isDiscovered, isReachable]);

  const title = useMemo(() => {
    return isDiscovered
      ? `${getCellKey(cell.x, cell.y)} ${terrain.label}`
      : "Unknown";
  }, [isDiscovered, cell.x, cell.y, terrain.label]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      title={title}
    >

      {isPlayerHere && (
        <span className="pip-map-cell__player-marker">▲</span>
      )}
    </button>
  );
}

export default React.memo(MapCell);