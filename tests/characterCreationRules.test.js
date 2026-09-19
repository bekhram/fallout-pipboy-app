import test from "node:test";
import assert from "node:assert/strict";
import {
  skillBaseRankCap,
  skillEffectiveRank,
  skillFinalRankCap,
  skillWithinLevelCap,
} from "../src/utils/characterCreationRules.js";

test("level 1 final skill rank is capped at 3",()=>{
  assert.equal(skillFinalRankCap(1,6),3);
  assert.equal(skillBaseRankCap({level:1,originSkillRankLimit:6,tagged:false}),3);
  assert.equal(skillBaseRankCap({level:1,originSkillRankLimit:6,tagged:true}),1);
});

test("Tag +2 is included in the level-one skill cap",()=>{
  assert.equal(skillEffectiveRank({rank:"1",tagged:true}),3);
  assert.equal(skillWithinLevelCap({rank:"1",tagged:true},{level:1,originSkillRankLimit:6}),true);
  assert.equal(skillWithinLevelCap({rank:"2",tagged:true},{level:1,originSkillRankLimit:6}),false);
});

test("higher levels increase final cap while respecting origin cap",()=>{
  assert.equal(skillFinalRankCap(4,6),6);
  assert.equal(skillFinalRankCap(4,4),4);
  assert.equal(skillBaseRankCap({level:4,originSkillRankLimit:4,tagged:true}),2);
});
