import test from 'node:test';
import assert from 'node:assert/strict';
import { createSettlement } from '../src/utils/settlementState.js';
import { applyOfflineCommand } from '../src/utils/settlementOfflineApply.js';
import { newCampaign, publicCampaign } from '../server/campaignState.js';
import { createConstructionBuilding } from '../src/utils/settlementDayEngine.js';
import { settlementConstructionView } from '../src/utils/settlementConstructionView.js';
import { createSettlementSyncHandler } from '../api/settlement-sync.js';
import { newRecord, mergeSnapshot, enqueue, prepareBatch } from '../src/cloud/settlementOfflineProtocol.js';

const uid='offline_test_gm', id='campaign_abcdef0123456789abcdef01';
function fixture() {
  const now=Date.now(), c=newCampaign(id,uid,'Test',now);
  const s=createSettlement({name:'Test settlement',regionId:'commonwealth',worldX:1,worldY:1,ownerCharacterId:uid});
  s.id='settlement_test_1';s.campaignId=id;
  c.settlements=[s];
  return {c,s,now};
}
const input=(s,command)=>({type:'settlement',settlementId:s.id,command});
test('real engine local assignment preserves resources, clocks, source snapshot and character',()=>{
  const {c,s}=fixture(), before=publicCampaign(c,uid), original=structuredClone(before);
  const next=applyOfflineCommand(before,uid,input(s,{type:'action',workerId:s.settlers[0].id,action:'build'}));
  assert.deepEqual(before,original);
  assert.deepEqual(next.settlements[0].resources,before.settlements[0].resources);
  assert.deepEqual(next.character,before.character);
  assert.equal(next.settlements[0].constructionUpdatedAt,before.settlements[0].constructionUpdatedAt ?? before.settlements[0].lastDayAt);
  assert.equal(next.settlements[0].settlers[0].settlementAction.type,'build');
});
test('real engine refuses locked HQ moves and missing tasks',()=>{
  const {c,s}=fixture(), snapshot=publicCampaign(c,uid), hq=s.buildings.find(b=>b.type==='settlement_hq');
  assert.throws(()=>applyOfflineCommand(snapshot,uid,input(s,{type:'move',buildingId:hq.id,x:1,y:1})),/LOCKED/);
  assert.throws(()=>applyOfflineCommand(snapshot,uid,input(s,{type:'worker',workerId:s.settlers[0].id,key:'building:absent'})),/TASK_FINISHED/);
});
test('real engine still enforces the saved spender permissions',()=>{
  const {c,s}=fixture();c.members.reader={name:'Reader'};c.memberIds.push('reader');
  assert.throws(()=>applyOfflineCommand(publicCampaign(c,'reader'),'reader',input(s,{type:'action',workerId:s.settlers[0].id,action:'build'})),/FORBIDDEN/);
});
test('draft orders cannot create projected historical construction progress',()=>{
  const {s,now}=fixture();s.constructionUpdatedAt=now;
  const b=createConstructionBuilding({id:'offline_test_building',type:'small_house',x:0,y:0,now});s.buildings.push(b);
  s.settlers[0].settlementAction={type:'build',targetBuildingId:b.id};
  const normal=settlementConstructionView(s,now+60000), draft=settlementConstructionView({...s,offlineDraft:true},now+60000);
  assert.ok(normal.byKey[`building:${b.id}`].done>0);
  assert.equal(draft.byKey[`building:${b.id}`].done,0);
});
test('real API authenticates, atomically persists a nonfinancial batch and replays it',async()=>{
  const {c,s}=fixture(), docs=new Map([[`persistentCampaigns/${id}`,structuredClone(c)]]);
  let writes=0, reads=0;
  const db={collection:name=>({doc:id=>`${name}/${id}`}),async runTransaction(work){
    const pending=[];let writing=false;
    const result=await work({async get(ref){assert.equal(writing,false);reads++;return{data:()=>structuredClone(docs.get(ref))};},set(ref,value){writing=true;pending.push([ref,structuredClone(value)]);},delete(){throw new Error('unexpected delete');}});
    pending.forEach(([ref,value])=>{docs.set(ref,value);writes++;});return result;
  }};
  const handler=createSettlementSyncHandler(()=>({db,auth:{verifyIdToken:async()=>({uid})}}));
  const r=mergeSnapshot(newRecord(uid,id,'device_real_test'),publicCampaign(c,uid),Date.now());
  enqueue(r,input(s,{type:'action',workerId:s.settlers[0].id,action:'build'}),'request_real_action',Date.now(),applyOfflineCommand);prepareBatch(r,'request_real_batch');
  async function invoke(body,authorization='Bearer test-token'){
    let status=200,value;
    const res={setHeader(){},status(n){status=n;return res;},json(data){value=data;return res;}};
    await handler({method:'POST',headers:{authorization},body},res);return{status,value};
  }
  const first=await invoke(r.inflight);assert.equal(first.status,200);assert.equal(first.value.results[0].state,'accepted');
  assert.equal(writes,2);assert.equal(reads,2);
  const second=await invoke(r.inflight);assert.equal(second.value.duplicate,true);assert.equal(writes,2);
  const unauth=await invoke(r.inflight,'');assert.equal(unauth.status,401);
  assert.equal(reads,4); // unauthenticated invocation never accessed a document
});
