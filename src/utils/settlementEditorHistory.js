export function editorMoveEntry(building, to) {
  if (!building || !Number.isInteger(building.x) || !Number.isInteger(building.y) || !to) return null;
  return {
    kind: 'move',
    buildingId: building.id,
    from: { x: building.x, y: building.y },
    to: { x: to.x, y: to.y },
  };
}

export function editorStoreEntry(building) {
  if (!building || !Number.isInteger(building.x) || !Number.isInteger(building.y)) return null;
  return {
    kind: 'store',
    buildingId: building.id,
    from: { x: building.x, y: building.y },
  };
}

export function editorHistoryCommand(entry, direction = 'forward') {
  if (!entry?.buildingId) return null;
  const undo = direction === 'undo';
  if (entry.kind === 'move') {
    const point = undo ? entry.from : entry.to;
    return point ? { type: 'move', buildingId: entry.buildingId, x: point.x, y: point.y } : null;
  }
  if (entry.kind === 'store') {
    return undo
      ? { type: 'placeStored', buildingId: entry.buildingId, x: entry.from.x, y: entry.from.y }
      : { type: 'store', buildingId: entry.buildingId };
  }
  return null;
}
