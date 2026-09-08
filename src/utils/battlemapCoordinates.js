export function gridDropCell({
  clientX,
  clientY,
  rect,
  scrollLeft = 0,
  scrollTop = 0,
  cellWidth,
  cellHeight,
  cols,
  rows,
  size = 1,
  anchorX = 0,
  anchorY = 0,
}) {
  if (
    !rect ||
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom ||
    !cellWidth ||
    !cellHeight
  )
    return null;

  const column = Math.floor((clientX - rect.left + scrollLeft) / cellWidth);
  const row = Math.floor((clientY - rect.top + scrollTop) / cellHeight);
  return {
    x: Math.max(0, Math.min(cols - size, column - anchorX)),
    y: Math.max(0, Math.min(rows - size, row - anchorY)),
  };
}

export function responsiveBattlemapBaseCell({
  viewportWidth,
  mobile = false,
  minCellSize = 30,
  maxCellSize = 44,
  visibleColumns = 10,
}) {
  if (!mobile) return maxCellSize;

  const width = Number(viewportWidth);
  const availableWidth = Number.isFinite(width) ? Math.max(240, width - 8) : 360;
  const adaptiveSize = Math.floor(availableWidth / visibleColumns);
  return Math.max(minCellSize, Math.min(maxCellSize, adaptiveSize));
}
