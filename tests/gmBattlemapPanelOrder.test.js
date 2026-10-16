import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("GM battlemap events appear directly after room descriptions", () => {
  const source = readFileSync(new URL("../src/components/gm/GmSessionMapV2.jsx", import.meta.url), "utf8");
  const rooms = source.indexOf('<section className="gm-map-rooms pip-panel">');
  const events = source.indexOf('<section className="gm-map-lazy-panel pip-panel">');
  const modal = source.indexOf('<DiceRollModal', rooms);
  assert.ok(rooms >= 0, "room descriptions section exists");
  assert.ok(events > rooms, "events follow room descriptions");
  assert.ok(modal > events, "events remain inside battlemap screen");
  const between = source.slice(rooms, events);
  assert.match(between, /<LazyRoomDescriptions/);
  assert.doesNotMatch(between, /<section className="gm-map-creatures/);
  assert.match(source.slice(events, modal), /<LazyBattlemapExtrasPanel/);
});
