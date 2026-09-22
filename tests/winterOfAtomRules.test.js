import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateJourneyDifficulty,
  calculateColdExposureDifficulty,
  coldExposureFailure,
  calculateCampsite,
  prepareReputationTest,
  resolveReputationTest,
  lookupD20,
  JOURNEY_COMPLICATIONS,
  WINTER_RANDOM_ENCOUNTERS,
} from "../src/utils/winterOfAtomRules.js";

test("Winter travel difficulty follows route answers and speed",()=>{
  const result=calculateJourneyDifficulty({
    establishedRoute:false,familiarArea:false,friendlyFaction:true,
    goodDirections:false,obstaclesAvoidable:true,durationHours:24,speed:"normal"
  });
  assert.equal(result.baseDifficulty,3);
  assert.equal(result.difficulty,2);
  assert.equal(result.durationHours,24);
  assert.equal(result.complicationRange,2);
  const cautious=calculateJourneyDifficulty({establishedRoute:false,familiarArea:false,friendlyFaction:false,goodDirections:false,obstaclesAvoidable:false,durationHours:24,speed:"cautious"});
  assert.equal(cautious.baseDifficulty,5);
  assert.equal(cautious.difficulty,3);
  assert.equal(cautious.durationHours,48);
  assert.equal(cautious.complicationRange,0);
});

test("Cold exposure modifiers and failure cap follow Winter of Atom",()=>{
  assert.equal(calculateColdExposureDifficulty({hours:12,warmClothing:false,extremeCold:true}),4);
  assert.equal(calculateColdExposureDifficulty({hours:0,warmShelter:true,hotFood:true,physicalActivity:true}),1);
  assert.deepEqual(coldExposureFailure({hours:8,currentHp:9,complication:false}),{fatigue:5,fatigueCap:5,warmShelterRestHours:6,lockedByComplication:false});
  assert.equal(coldExposureFailure({hours:2,currentHp:10,complication:true}).warmShelterRestHours,24);
});

test("Campsite tiers, failure fallback, feature slots and refunds are correct",()=>{
  const success=calculateCampsite({tier:5,apSpentAfterTest:6,buildSucceeded:true});
  assert.equal(success.difficulty,5);
  assert.deepEqual(success.materials,{common:6,uncommon:4,rare:2});
  assert.equal(success.featureSlots,7);
  const failed=calculateCampsite({tier:5,buildSucceeded:false});
  assert.equal(failed.builtTier,3);
  assert.deepEqual(failed.teardownRefund,{common:2,uncommon:1,rare:0});
});

test("Settlement reputation test uses CHA + rank and influences",()=>{
  assert.deepEqual(prepareReputationTest({charisma:7,rank:3,positive:2,negative:1}),{targetNumber:10,difficulty:2,diceCount:4,rank:3});
  const success=resolveReputationTest({charisma:7,rank:3,positive:1,negative:0,rolls:[3,10,20]});
  assert.equal(success.successes,3);
  assert.equal(success.success,true);
  assert.equal(success.nextRank,4);
  assert.equal(success.gmAp,2);
  const fail=resolveReputationTest({charisma:4,rank:2,positive:0,negative:2,rolls:[19,18]});
  assert.equal(fail.success,false);
  assert.equal(fail.nextRank,1);
});

test("Winter d20 tables resolve boundary rolls",()=>{
  assert.match(lookupD20(JOURNEY_COMPLICATIONS,20).text,/Cold Exposure/);
  assert.match(lookupD20(WINTER_RANDOM_ENCOUNTERS,1).text,/merchant/i);
  assert.match(lookupD20(WINTER_RANDOM_ENCOUNTERS,20).text,/Last Son of Atom/);
});
