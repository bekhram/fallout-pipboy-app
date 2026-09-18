import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSettlementBatch } from '../server/settlementSync.js';
import { campaignCommand, publicCampaign, requireMember } from '../server/campaignState.js';
import { enqueue, prepareBatch } from '../src/cloud/settlementOfflineProtocol.js';
import { applyOfflineCommand } from '../src/utils/settlementOfflineApply.js';
import { balance, playerResources } from '../src/utils/settlementDevelopment.js';
import { personalFixture, personalBuild, personalUid as uid, deviceId } from './fixtures/personalFixture.js';
function server(f) {
  const docs=new Map([[`persistentCampaigns/${f.c.id}`,structuredClone(f.c)]]),counts={reads:0,writes:0};
  const db={collection:name=>({doc:id=>`${name}/${id}`})};
  return {docs,counts,run:body=>syncSettlementBatch({db,uid,body,now:f.now,authorize:requireMember,
    visible:publicCampaign,advance:c=>c,
    apply:(c,u,input,requestId,now)=>campaignCommand(c,u,{...input,requestId,deviceId:body.deviceId},now),
    transaction:async work=>{const writes=[];const result=await work({get:async ref=>{counts.reads++;return{data:()=>structuredClone(docs.get(ref))};},set:(ref,v)=>writes.push([ref,structuredClone(v)])});writes.forEach(([ref,v])=>{counts.writes++;docs.set(ref,v)});return result;},
  })};
}
function batch(f,id='request_personal_batch_op') { enqueue(f.record,personalBuild(f.s),id,f.now,applyOfflineCommand);prepareBatch(f.record,'batch_personal_real_001');return f.record.inflight; }
test('real personal command in sequential batch writes payment once after a lost response',async()=>{
  const f=personalFixture(),remote=server(f),body=batch(f);const first=await remote.run(body);
  assert.equal(first.results[0].state,'accepted');assert.equal(playerResources(first.campaign.character).common,60);
  assert.equal(remote.counts.writes,2);assert.equal(remote.counts.reads,2);
  const retry=await remote.run(structuredClone(body));assert.equal(retry.duplicate,true);
  assert.equal(playerResources(retry.campaign.character).common,60);assert.equal(remote.counts.writes,2);
  await assert.rejects(remote.run({...body,requestId:'new_batch_old_sequence'}),/SYNC_SEQUENCE_CONFLICT/);
});
test('real batch stores a conflicting paid building rather than rejecting or charging twice',async()=>{
  const f=personalFixture(),body=batch(f),remote=server(f),key=`persistentCampaigns/${f.c.id}`;
  const occupied=campaignCommand(f.c,uid,{...personalBuild(f.s),requestId:'earlier_confirmed_building',deviceId},f.now);
  remote.docs.set(key,occupied);
  const result=await remote.run(body);assert.equal(result.results[0].state,'accepted');
  assert.equal(result.campaign.settlements[0].storedBuildings.length,1);
  assert.equal(playerResources(result.campaign.character).common,20);
  assert.deepEqual(balance(result.campaign.settlements[0]),balance(f.s));
});
test('server balance and spending device are still enforced at batch synchronization',async()=>{
  for(const reason of ['money','device']) {
    const f=personalFixture(),body=batch(f),remote=server(f),c=remote.docs.get(`persistentCampaigns/${f.c.id}`);
    if(reason==='money')c.accounts[uid].inventoryItems=[];else c.accounts[uid].constructionSource.deviceId='different_device';
    const result=await remote.run(body);assert.equal(result.results[0].state,'rejected');assert.equal(result.campaign.settlements[0].buildings.length,1);
    assert.match(result.results[0].error,/PERSONAL_RESOURCES_INSUFFICIENT|PERSONAL_DEVICE_REQUIRED/);
    const retry=await remote.run(body);assert.equal(retry.duplicate,true);assert.deepEqual(retry.results,result.results);
  }
});
