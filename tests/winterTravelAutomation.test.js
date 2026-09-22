import test from "node:test";
import assert from "node:assert/strict";
import { getWinterSurvivalTest, resolveAutomaticWinterExposure, formatWinterTravelLog } from "../src/utils/winterTravelAutomation.js";
import { buildFalloutD20Result } from "../src/utils/dice.js";

test("Winter automatic survival test matches app TN conventions", () => {
  const character = { special:{E:"7"}, skills:{Survival:{rank:"3",tagged:true,bonus:"1"}}, perksAndTraits:[], inventoryItems:[] };
  const info = getWinterSurvivalTest(character);
  assert.equal(info.targetNumber, 13);
  assert.equal(info.criticalRange, 3);
});

test("Winter exposure failure produces capped fatigue", () => {
  const character = { special:{E:"5"}, skills:{Survival:{rank:"0",tagged:false,bonus:"0"}}, currentHp:"9", perksAndTraits:[], inventoryItems:[] };
  const rollResult = buildFalloutD20Result([18,19], { targetNumber:5, criticalRange:1 });
  const result = resolveAutomaticWinterExposure({ character, hours:8, settings:{warmClothing:false,extremeCold:true,warmShelter:false,hotFood:false,physicalActivity:false}, rollResult });
  assert.equal(result.success, false);
  assert.equal(result.fatigue, 5);
  assert.equal(result.fatigueCap, 5);
});

test("Winter exposure success does not add fatigue", () => {
  const character = { special:{E:"8"}, skills:{Survival:{rank:"4",tagged:true,bonus:"0"}}, currentHp:"12", perksAndTraits:[], inventoryItems:[] };
  const rollResult = buildFalloutD20Result([2,7], { targetNumber:14, criticalRange:4 });
  const result = resolveAutomaticWinterExposure({ character, hours:4, settings:{warmClothing:true,extremeCold:false,warmShelter:false,hotFood:false,physicalActivity:true}, rollResult });
  assert.equal(result.success, true);
  assert.equal(result.fatigue, 0);
  assert.match(formatWinterTravelLog(result, "en"), /PASSED/);
});
