import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, anchoredZoom, clampScroll } from '../src/components/phaser/mapCamera.js';
import { gridDropCell } from '../src/utils/battlemapCoordinates.js';

test('zoom preserves the map coordinate below the pointer', () => {
  for (const zoom of [.25, .5, 1, 2, 4]) {
    const camera = { scrollX: 213, scrollY: 87, zoom };
    const next = anchoredZoom(camera, zoom * 1.25, 127, 231);
    assert.ok(Math.abs(camera.scrollX + 127 / zoom - next.scrollX - 127 / next.zoom) < 1e-9);
    assert.ok(Math.abs(camera.scrollY + 231 / zoom - next.scrollY - 231 / next.zoom) < 1e-9);
  }
});

test('camera centers a small world and bounds a larger one', () => {
  assert.equal(clampScroll(100, 512, 800, 1), -144);
  assert.equal(clampScroll(-200, 1536, 400, 1), 0);
  assert.equal(clampScroll(2000, 1536, 400, 1), 1136);
  assert.equal(clampScroll(2000, 1536, 400, .5), 736);
});

test('drop keeps the grabbed cell of large tokens under the pointer at every zoom', () => {
  for (const zoom of [.25, .5, 1, 2]) {
    for (const size of [1, 2, 3]) {
      const left = -105, top = 42, cols = 24, rows = 36;
      const unit = CELL * zoom, anchor = size - 1;
      const result = gridDropCell({ clientX: left + (7 + anchor + .5) * unit, clientY: top + (10 + anchor + .5) * unit,
        rect: { left, top, right: left + cols * unit, bottom: top + rows * unit },
        cellWidth: unit, cellHeight: unit, cols, rows, size, anchorX: anchor, anchorY: anchor });
      assert.deepEqual(result, { x: 7, y: 10 });
    }
  }
});

test('drop outside map rejects instead of jumping a token to the edge', () => {
  assert.equal(gridDropCell({ clientX: 50, clientY: 150, rect: { left:100, top:100, right:500, bottom:500 }, cellWidth:32, cellHeight:32, cols:12, rows:12 }), null);
});
