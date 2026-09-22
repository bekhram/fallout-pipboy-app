import test from "node:test";
import assert from "node:assert/strict";
import {
  countCraftingMaterials, canAffordMaterials, spendCraftingMaterials, addCraftingMaterials,
  applyCampsiteBuild, dismantleActiveCampsite, applyWinterCampRest, normalizeFeatureSelection,
} from "../src/utils/winterCampsiteInventory.js";

const inventory = [
  { name:"Common Materials", sourceType:"crafting_material", materialTier:"common", quantity:"6" },
  { name:"Uncommon Materials", sourceType:"crafting_material", materialTier:"uncommon", quantity:"4" },
  { name:"Rare Materials", sourceType:"crafting_material", materialTier:"rare", quantity:"2" },
];

test("campsite material accounting spends and refunds exact tiers", () => {
  assert.deepEqual(countCraftingMaterials(inventory), {common:6,uncommon:4,rare:2});
  assert.equal(canAffordMaterials(inventory,{common:5,uncommon:3,rare:1}), true);
  const spent=spendCraftingMaterials(inventory,{common:5,uncommon:3,rare:1});
  assert.deepEqual(countCraftingMaterials(spent), {common:1,uncommon:1,rare:1});
  const refunded=addCraftingMaterials(spent,{common:3,uncommon:2,rare:1});
  assert.deepEqual(countCraftingMaterials(refunded), {common:4,uncommon:3,rare:2});
});

test("campsite build saves features and dismantle returns half materials", () => {
  const built=applyCampsiteBuild({inventoryItems:inventory},{builtTier:4,attemptedTier:4,materials:{common:5,uncommon:3,rare:0},teardownRefund:{common:3,uncommon:2,rare:0},featureSlots:4,features:["campfire","shelter"]});
  assert.ok(built?.activeCampsite);
  assert.deepEqual(countCraftingMaterials(built.inventoryItems),{common:1,uncommon:1,rare:2});
  const dismantled=dismantleActiveCampsite(built);
  assert.equal(dismantled.activeCampsite,null);
  assert.deepEqual(countCraftingMaterials(dismantled.inventoryItems),{common:4,uncommon:3,rare:2});
});

test("warm shelter rest clears cold fatigue and bedding grants +2 max HP bonus", () => {
  const character={fatigue:"4",coldExposureRecoveryHours:"6",coldExposureLocked:false,vigor:"1",activeCampsite:{features:["campfire","shelter","bedding"]}};
  const rested=applyWinterCampRest(character,{hours:6});
  assert.equal(rested.fatigue,"0");
  assert.equal(rested.vigor,"5");
  assert.equal(rested.campsiteMaxHpBonus,"2");
  assert.equal(rested.coldExposureRecoveryHours,"0");
});

test("cold fatigue remains without both campfire and shelter", () => {
  const character={fatigue:"4",coldExposureRecoveryHours:"6",vigor:"1",activeCampsite:{features:["shelter"]}};
  const rested=applyWinterCampRest(character,{hours:6});
  assert.equal(rested.fatigue,"4");
  assert.equal(rested.campsiteMaxHpBonus,"0");
});

test("feature selection respects available slots",()=>{
  assert.deepEqual(normalizeFeatureSelection(["campfire","campfire","shelter","bedding"],2),["campfire","shelter"]);
});
