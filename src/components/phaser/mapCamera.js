export const CELL = 64;
export function clampScroll(scroll, world, viewport, zoom) {
  const visible = viewport / zoom;
  return visible >= world ? (world - visible) / 2 : Math.max(0, Math.min(world - visible, scroll));
}
export function anchoredZoom(camera, nextZoom, x, y) {
  const worldX = camera.scrollX + x / camera.zoom;
  const worldY = camera.scrollY + y / camera.zoom;
  return { zoom: nextZoom, scrollX: worldX - x / nextZoom, scrollY: worldY - y / nextZoom };
}

export function frameCamera(worldWidth, worldHeight, viewportWidth, viewportHeight, mode = 'fit') {
  const ratios = [viewportWidth / worldWidth, viewportHeight / worldHeight];
  const zoom = mode === 'fill' ? Math.max(...ratios) : Math.min(...ratios) * .96;
  return { zoom, scrollX: (worldWidth - viewportWidth / zoom) / 2, scrollY: (worldHeight - viewportHeight / zoom) / 2 };
}
