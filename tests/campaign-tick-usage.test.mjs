import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignHandler } from '../api/campaigns.js';
import { newCampaign } from '../server/campaignState.js';
import { createSettlement } from '../src/utils/settlementState.js';
import { createCampaignUsage } from '../server/campaignUsage.js';

test('empty ticks preserve revision; due settlement days still commit once', async () => {
  let campaign = newCampaign('campaign_test123', 'gm', 'Test', Date.now()-120000);
  let writes=0;
  const db={collection:()=>({doc:()=>({})}),runTransaction:async work=>work({
    get:async()=>({data:()=>structuredClone(campaign)}),
    set:(_ref,value)=>{writes++;campaign=structuredClone(value);},
  })};
  const handler=createCampaignHandler(()=>({db,auth:{verifyIdToken:async()=>({uid:'gm'})}}));
  const tick=async()=>{let result;await handler({method:'POST',headers:{authorization:'Bearer token'},body:{type:'tick',campaignId:campaign.id}},{setHeader(){},json:x=>result=x,status(){return this;}});return result;};
  const before=structuredClone(campaign);
  await tick(); await tick(); assert.equal(writes,0); assert.deepEqual(campaign,before);
  const s=createSettlement({name:'Town',regionId:'capital',worldX:1,worldY:1});
  s.nextDayAt=Date.now()-1000;
  campaign.settlements=[s];
  await tick(); assert.equal(writes,1); assert.ok(campaign.settlements[0].settlementDay>s.settlementDay);
  const revision=campaign.revision;
  await tick(); assert.equal(writes,1); assert.equal(campaign.revision,revision);
  // Simulate the next polling window without advancing the settlement day.
  campaign.updatedAt=Date.now()-120000;
  await tick(); assert.equal(writes,1);
});
test('usage counts retried reads but only committed writes; failures commit zero', async()=>{
  const u=createCampaignUsage();
  const tx={get:async()=>({}),set(){},delete(){}};
  await u.transaction({runTransaction:async fn=>{await fn(tx);return fn(tx);}},async t=>{await t.get({});t.set({},{});});
  assert.equal(u.counts.documentReadAttempts,2);assert.equal(u.counts.transactionAttempts,2);assert.equal(u.counts.committedWrites,1);
  await assert.rejects(u.transaction({runTransaction:async fn=>{await fn(tx);throw Error('failed');}},async t=>{t.set({},{});}));
  assert.equal(u.counts.committedWrites,1);
});
