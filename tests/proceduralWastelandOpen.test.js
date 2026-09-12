import test from "node:test";
import assert from "node:assert/strict";
import { buildOpenWastelandSite } from "../src/utils/proceduralWastelandOpen.js";

function visualSize(item) {
  if (item.type === "cliff") return [item.w * 2, item.h * 2];
  if (item.type === "crater") return [Math.max(4, item.w * 1.15), Math.max(4, item.h * 1.15)];
  if (item.type === "dead_tree") return [3.4, 3.4];
  if (item.type === "wreck_car") return [3, 2];
  if (item.type === "wreck_truck") return [5, 3];
  if (item.type === "retro_car") return [3, 3];
  if (item.type === "retro_pickup") return [4, 3];
  if (item.type === "retro_motorcycle") return [2.5, 2.5];
  return [item.w, item.h];
}

function visualRect(item) {
  const [width, height] = visualSize(item);
  const w = width;
  const h = height;
  const initialCenterX = item.x + item.w / 2;
  const initialCenterY = item.y + item.h / 2;
  const centerX = Math.max(w / 2, Math.min(24 - w / 2, initialCenterX));
  const centerY = Math.max(h / 2, Math.min(24 - h / 2, initialCenterY));
  return { x: centerX - w / 2, y: centerY - h / 2, w, h };
}

function overlaps(a, b, gap = 1) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

test("wasteland assets keep a one-cell gap from roads and each other", () => {
  for (let seed = 0; seed < 250; seed += 1) {
    const site = buildOpenWastelandSite({ seed: `overlap-${seed}` });
    const items = [...site.obstacles, ...site.vehicles, ...site.trees];
    const rects = items.map(visualRect);

    assert.equal(
      site.obstacles.some((item) => item.type === "ravine"),
      false,
      `seed ${seed}: ravines must not be generated`
    );

    assert.ok(site.roads.length <= 1, `seed ${seed}: only one road route may be generated per grid`);
    assert.notEqual(site.profile.type, "cross", `seed ${seed}: crossing roads must not be generated`);
    if (site.roads.length === 0) {
      assert.equal(site.vehicles.length, 0, `seed ${seed}: vehicles must not be generated without a road`);
    }

    for (const item of items) {
      if (site.vehicles.includes(item)) {
        assert.ok([0, 180].includes(item.rot), `seed ${seed}: ${item.type} has an invalid direction`);
      } else {
        assert.equal(item.rot, 0, `seed ${seed}: ${item.type} must not rotate`);
      }
    }

    for (let index = 0; index < rects.length; index += 1) {
      for (const road of site.roads) {
        assert.equal(
          overlaps(rects[index], road),
          false,
          `seed ${seed}: ${items[index].type} is less than one cell from a road`
        );
      }
    }

    for (let left = 0; left < rects.length; left += 1) {
      for (let right = left + 1; right < rects.length; right += 1) {
        assert.equal(
          overlaps(rects[left], rects[right]),
          false,
          `seed ${seed}: ${items[left].type} is less than one cell from ${items[right].type}`
        );
      }
    }
  }
});
