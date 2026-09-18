import test from 'node:test';
import assert from 'node:assert/strict';
import { workerGrid, workerCellFree, workerPath, workerWorkPoints } from '../src/utils/settlementWorkerPath.js';

const definitions = { house: { footprint: { width: 2, height: 2 } }, wall: { footprint: { width: 1, height: 1 } } };

test('worker goes around a footprint without entering buildings or cutting corners', () => {
  const house = { type: 'house', x: 2, y: 1 };
  const grid = workerGrid([house], definitions, 6);
  const start = { x: 1, y: 1 }, destination = { x: 4, y: 1 };
  const route = workerPath(grid, start, [destination]);
  assert.deepEqual(route.at(-1), destination);
  let previous = start;
  for (const p of route) {
    assert.ok(workerCellFree(grid, p));
    assert.equal(Math.abs(p.x - previous.x) + Math.abs(p.y - previous.y), 1);
    previous = p;
  }
  assert.ok(route.length > 3);
});

test('an enclosed work point cannot be reached', () => {
  const walls = Array.from({ length: 5 }, (_, y) => ({ type: 'wall', x: 2, y }));
  assert.equal(workerPath(workerGrid(walls, definitions, 5), { x: 0, y: 2 }, [{ x: 4, y: 2 }]), null);
});

test('work points stay on the map and outside adjacent buildings', () => {
  const house = { type: 'house', x: 0, y: 0 };
  const grid = workerGrid([house, { type: 'wall', x: 1, y: 2 }], definitions, 4);
  const points = workerWorkPoints(house, definitions.house, grid);
  assert.deepEqual(points, [{ x: 0, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 1 }]);
  assert.deepEqual(workerPath(grid, points[0], points), []);
});

test('empty targets, a blocked start, and a completely full map return no path', () => {
  const grid = workerGrid([{ type: 'house', x: 0, y: 0 }], definitions, 2);
  assert.equal(workerPath(grid, { x: 0, y: 0 }, [{ x: 1, y: 1 }]), null);
  assert.deepEqual(workerWorkPoints({ type: 'house', x: 0, y: 0 }, definitions.house, grid), []);
  assert.equal(workerPath(workerGrid([], definitions, 3), { x: 1, y: 1 }, []), null);
});
