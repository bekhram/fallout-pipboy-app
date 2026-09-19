import test from "node:test";
import assert from "node:assert/strict";
import {
  characterToSettlementNpc,
  addNpcToLocalSettlement,
  removeGuestNpcFromLocalSettlement,
} from "../src/utils/localSettlements.js";
import { createSettlement } from "../src/utils/settlementState.js";

test("JSON character becomes an independent local settlement NPC",()=>{
  const npc=characterToSettlementNpc({
    name:"Ranger",
    level:4,
    skills:{Repair:{rank:2},Survival:{rank:3},"Small Guns":{rank:1}},
    perksAndTraits:[{name:"Medic"}],
  });
  assert.equal(npc.name,"Ranger");
  assert.equal(npc.guestNpc,true);
  assert.equal(npc.level,4);
  assert.equal(npc.skills.Survival.rank,3);
  assert.ok(npc.perks.includes("medic"));
  assert.equal(npc.settlementAction,null);
});

test("guest NPC can be added and removed without deleting native settlers",()=>{
  const base=createSettlement({name:"Local",regionId:"commonwealth",worldX:0,worldY:0});
  const nativeIds=base.settlers.map(item=>item.id);
  const withGuest=addNpcToLocalSettlement(base,{name:"Guest",skills:{Repair:{rank:2}}});
  assert.equal(withGuest.settlers.length,base.settlers.length+1);
  const guest=withGuest.settlers.find(item=>item.guestNpc);
  assert.ok(guest);
  const removed=removeGuestNpcFromLocalSettlement(withGuest,guest.id);
  assert.equal(removed.settlers.length,base.settlers.length);
  assert.deepEqual(removed.settlers.map(item=>item.id),nativeIds);
});
