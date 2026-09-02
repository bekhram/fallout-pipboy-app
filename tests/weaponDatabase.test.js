import test from "node:test";
import assert from "node:assert/strict";
import {
  findWeaponInDatabase,
  getWeaponMetadata,
  hydrateWeaponMetadata,
  needsWeaponMetadataHydration,
} from "../src/utils/weaponDatabase.js";

const database = [
  { name: ".44 Pistol", Cost: "99", Weight: "13", Rarity: "2" },
  { name: "10mm Pistol", Cost: "50", Weight: "13", Rarity: "1" },
];

test("finds a database weapon without case or whitespace sensitivity", () => {
  assert.equal(findWeaponInDatabase("  10MM pistol ", database), database[1]);
});

test("fills missing metadata from the CSV record", () => {
  assert.deepEqual(getWeaponMetadata({ name: ".44 Pistol" }, database), {
    cost: "99",
    weight: "13",
    rarity: "2",
  });
});

test("keeps values manually saved on the weapon", () => {
  assert.deepEqual(
    getWeaponMetadata({ name: ".44 Pistol", cost: "120", weight: "9", rarity: "4" }, database),
    { cost: "120", weight: "9", rarity: "4" }
  );
});

test("hydrates old weapon objects and detects when migration is required", () => {
  const oldWeapon = { name: "10mm Pistol", damage: "4" };
  assert.equal(needsWeaponMetadataHydration(oldWeapon, database), true);

  const hydrated = hydrateWeaponMetadata(oldWeapon, database);
  assert.equal(needsWeaponMetadataHydration(hydrated, database), false);
  assert.deepEqual(hydrated, {
    name: "10mm Pistol",
    damage: "4",
    cost: "50",
    weight: "13",
    rarity: "1",
  });
});
