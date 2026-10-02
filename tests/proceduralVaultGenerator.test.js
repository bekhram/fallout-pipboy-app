import test from "node:test";
import assert from "node:assert/strict";

import {
  generateVaultLayout,
  validateVaultLayout,
  vaultLayoutStartZone,
  vaultLayoutToProceduralMap,
} from "../src/utils/proceduralVaultGenerator.js";

for (const size of [24, 36, 48]) {
  test(`vault generator produces valid connected ${size}x${size} layouts`, () => {
    for (const seed of ["vault-alpha", "vault-beta", "vault-gamma", "vault-delta"]) {
      const layout = generateVaultLayout({ cols: size, rows: size, seed, ruinedChance: 0.22 });
      const result = validateVaultLayout(layout);
      assert.equal(result.ok, true, result.errors.join(", "));
      assert.equal(layout.spec.moduleSize, 6);
      assert.equal(layout.spec.moduleCols, size / 6);
      assert.equal(layout.spec.moduleRows, size / 6);
      assert.equal(layout.rooms.length, layout.spec.targetRooms);
      assert.ok(layout.corridors.length >= 3);

      const atrium = layout.tiles.find((tile) => tile.id === layout.startTileId);
      assert.equal(atrium.tileId, "atrium_vault_entrance");
      assert.equal(atrium.activeDoors.n, false);
      assert.equal(atrium.sector, "entrance");

      const start = vaultLayoutStartZone(layout);
      assert.equal(start.length, 4);
      assert.ok(start.every((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < size && cell.y < size));

      const map = vaultLayoutToProceduralMap(layout);
      assert.equal(map.version, 2);
      assert.equal(map.rooms.length, layout.tiles.length);
      assert.ok(map.walls.length > 0);
    }
  });
}

test("large vaults create sector metadata and concentrate ruins in damaged areas", () => {
  const layout = generateVaultLayout({ cols: 48, rows: 48, seed: "sector-check", ruinedChance: 0.2 });
  const sectors = new Set(layout.rooms.map((room) => room.sector));
  assert.ok(sectors.has("entrance"));
  assert.ok(sectors.has("residential") || sectors.has("administration"));
  assert.ok(sectors.has("engineering") || sectors.has("damaged"));

  const damagedRooms = layout.rooms.filter((room) => room.sector === "damaged");
  if (damagedRooms.length) {
    const ruinedShare = damagedRooms.filter((room) => room.kind === "ruined_room").length / damagedRooms.length;
    assert.ok(ruinedShare >= 0.4);
  }
});

test("active vault connections leave only the centered two-cell wall opening", () => {
  const layout = generateVaultLayout({ cols: 24, rows: 24, seed: "door-opening-check" });
  const map = vaultLayoutToProceduralMap(layout);
  const tile = layout.tiles.find((item) => Object.values(item.activeDoors).some(Boolean));
  assert.ok(tile);

  const side = ["n", "e", "s", "w"].find((value) => tile.activeDoors[value]);
  const ownWalls = map.walls.filter((wall) => String(wall.id).startsWith(`${tile.id}-${side}`));
  assert.equal(ownWalls.length, 2);
});
