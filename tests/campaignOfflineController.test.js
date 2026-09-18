import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampaignOfflineController } from '../src/cloud/campaignOfflineController.js';
import { syncSettlementBatch } from '../server/settlementSync.js';
import { projectRecord, SYNC_INTERVAL } from '../src/cloud/settlementOfflineProtocol.js';
import { uid, campaignId, campaign, action, apply, record, memoryStore, fakeDatabase } from './fixtures/offlineFixture.js';
function setup(options = {}) {
  const store = options.store || memoryStore(), f = options.f || fakeDatabase();
  let clock = 3000, online = true, current = true, serial = 0;
  const calls = [], payments = new Map();
  const remote = async body => {
    calls.push(structuredClone(body));
    if (body.type === 'syncSettlement') return syncSettlementBatch({ ...f, uid, body, now: clock,
      authorize(c,u) { if (!c.members[u] || c.members[u].revoked) throw Object.assign(new Error('FORBIDDEN'),{status:403}); },
      advance: c=>c, visible:c=>c, apply(c,u,input){ const n=apply(c,u,input); n.revision++; return n; },
    });
    if (body.type === 'tick' || body.type === 'worldRead') return { campaign: structuredClone(f.docs.get(`persistentCampaigns/${campaignId}`)) };
    if (!payments.has(body.requestId)) {
      const c = f.docs.get(`persistentCampaigns/${campaignId}`); c.character.caps = String(Number(c.character.caps)-10); c.revision++;
      payments.set(body.requestId, structuredClone(c));
    }
    return { campaign: structuredClone(payments.get(body.requestId)) };
  };
  const ctl = createCampaignOfflineController({ uid,campaignId,store,apply,
    now:()=>clock,uuid:()=>`request_${String(++serial).padStart(8,'0')}`, online:()=>online,current:()=>current,
    request: options.request ? (body, opts) => options.request(body,opts,remote) : remote,
  });
  return { ctl,store,f,calls,payments,clock:n=>clock=n,online:b=>online=b,current:b=>current=b,remote };
}
test('offline queueing performs zero HTTP requests and survives a new controller', async()=>{
  const s=setup(); s.online(false);
  const next=await s.ctl.run(action()); assert.equal(next.settlements[0].settlers[0].settlementAction.type,'guard'); assert.equal(s.calls.length,0);
  const second=setup({store:s.store,f:s.f});
  assert.equal(projectRecord(await second.ctl.get(),apply).campaign.settlements[0].settlers[0].settlementAction.type,'guard');
  await second.ctl.sync({manual:true}); assert.equal((await second.ctl.get()).entries.length,0);
});
test('storage failure rejects before success or HTTP', async()=>{
  const s=setup({store:{get:async()=>record(),change:async()=>{throw new Error('LOCAL_STORAGE_FULL');}}});
  await assert.rejects(s.ctl.run(action()),/LOCAL_STORAGE_FULL/); assert.equal(s.calls.length,0);
});
test('paid actions cannot pretend to reserve personal materials while offline', async()=>{
  const s=setup(); s.online(false);
  await assert.rejects(s.ctl.run({type:'settlement',settlementId:'settlement_1',command:{type:'build'}}),/ONLINE_ACTION_REQUIRED/);
  assert.equal((await s.ctl.get()).entries.length,0); assert.equal((await s.ctl.get()).immediate,null); assert.equal(s.calls.length,0);
});
test('lost paid response is retried with exactly the same ID and one debit', async()=>{
  let lose=true;
  const s=setup({request:async(body,opts,remote)=>{assert.equal(opts.expectedUid,uid);const data=await remote(body);if(lose){lose=false;throw new Error('SERVER_UNAVAILABLE');}return data;}});
  await assert.rejects(s.ctl.run({type:'settlement',settlementId:'settlement_1',command:{type:'build'}}),/SERVER_UNAVAILABLE/);
  const persisted=await s.ctl.get(), id=persisted.immediate.command.requestId;
  assert.equal(s.payments.size,1); assert.equal(persisted.snapshot.character.caps,'100');
  await s.ctl.sync({manual:true});
  assert.equal(s.calls[1].requestId,id); assert.equal(s.payments.size,1); assert.equal((await s.ctl.get()).snapshot.character.caps,'90'); assert.equal((await s.ctl.get()).immediate,null);
});
test('uncertain financial operation blocks other drafts until confirmed', async()=>{
  const s=setup({request:async()=>{throw new Error('SERVER_UNAVAILABLE');}});
  await assert.rejects(s.ctl.run({type:'found'}));
  await assert.rejects(s.ctl.run(action()),/PENDING_CONFIRMATION/);
});
test('known financial rejection is recorded, not left as an endlessly retried purchase',async()=>{
  const s=setup({request:async()=>{throw Object.assign(new Error('insufficient'),{status:400});}});
  await assert.rejects(s.ctl.run({type:'found'}),/insufficient/);
  const r=await s.ctl.get(); assert.equal(r.immediate,null); assert.equal(r.history[0].state,'rejected');
});
test('lost batch response replays immutable batch once after reload',async()=>{
  let lost=true;
  const s=setup({request:async(body,opts,remote)=>{const data=await remote(body);if(lost){lost=false;throw new Error('SERVER_UNAVAILABLE');}return data;}});
  await s.ctl.run(action()); await assert.rejects(s.ctl.sync({manual:true}));
  const b=(await s.ctl.get()).inflight; assert.ok(b); assert.equal(s.f.stats.writes,2);
  await s.ctl.sync({manual:true}); assert.deepEqual(s.calls[1],b); assert.equal(s.f.stats.writes,2); assert.equal((await s.ctl.get()).entries.length,0);
});
test('quota Retry-After is persisted and automatic checks make no requests before it',async()=>{
  let quota=true;
  const s=setup({request:async(body,opts,remote)=>{if(quota)throw Object.assign(new Error('DATABASE_QUOTA_EXCEEDED'),{status:503,retryAfter:300});return remote(body);}});
  await s.ctl.run(action()); await assert.rejects(s.ctl.sync({manual:true}),/QUOTA/);
  assert.equal((await s.ctl.get()).nextAttemptAt,303000);
  s.clock(5000); assert.equal(await s.ctl.sync(),false); assert.equal(s.calls.length,0);
  quota=false;s.clock(303001);assert.equal(await s.ctl.sync(),true);assert.equal(s.calls.length,1);
});
test('fresh cached campaign and unsent local drafts do not start a constant poller',async()=>{
  const s=setup(); await s.store.change(uid,campaignId,r=>{r.lastSyncAt=2000;return r;});
  await s.ctl.run(action()); assert.equal(await s.ctl.sync(),false); assert.equal(s.calls.length,0);
  s.clock(2000+SYNC_INTERVAL); assert.equal(await s.ctl.sync(),true); assert.equal(s.calls.length,1);
});
test('old sessionStorage pending identity is preserved for the original receipt API',async()=>{
  const s=setup(), old={type:'found',campaignId,requestId:'legacy_request_001'};
  await s.ctl.initialize(old); await s.ctl.sync({manual:true}); assert.equal(s.calls[0].requestId,'legacy_request_001'); assert.equal(s.calls[0].type,'found');
});
test('cross-campaign legacy commands do not overwrite a pending journal',async()=>{
  const s=setup(); await assert.rejects(s.ctl.initialize({type:'found',campaignId:'campaign_other',requestId:'legacy_request_001'}),/INVALID_LEGACY_PENDING/);
  assert.equal((await s.ctl.get()).immediate,null);
});
test('401 retains uncertain work, requires reauthentication, and suppresses automatic retries',async()=>{
  const s=setup({request:async()=>{throw Object.assign(new Error('SIGN_IN_REQUIRED'),{status:401});}});
  await s.ctl.run(action()); await assert.rejects(s.ctl.sync({manual:true}),/SIGN_IN_REQUIRED/);
  assert.equal((await s.ctl.get()).entries.length,1);assert.equal((await s.ctl.get()).authRequired,true);
  assert.equal(await s.ctl.sync(),false);
});
test('account changes during a request cannot acknowledge into the new account',async()=>{
  let s; s=setup({request:async(body,opts,remote)=>{const data=await remote(body);s.current(false);return data;}});
  await s.ctl.run(action()); await assert.rejects(s.ctl.sync({manual:true}),/AUTH_CHANGED/);
  assert.equal((await s.ctl.get()).entries.length,1); assert.ok((await s.ctl.get()).inflight);
});
test('another tab owning a live lease prevents a duplicate network dispatch',async()=>{
  const s=setup(); await s.ctl.run(action()); await s.store.claim(uid,campaignId,'other_tab',3000);
  assert.equal(await s.ctl.sync({manual:true}),false);assert.equal(s.calls.length,0);
});
test('chunks are drained in sequence and independent local commands are retained during an acknowledgement',async()=>{
  const s=setup(); for(let i=0;i<35;i++)await s.ctl.run(action('worker_1',i%2?'build':'guard'));
  await s.ctl.sync({manual:true});assert.equal(s.calls.length,2);assert.equal((await s.ctl.get()).entries.length,0);assert.equal(s.f.stats.writes,4);
});
