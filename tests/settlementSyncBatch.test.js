import test from 'node:test';
import assert from 'node:assert/strict';
import { syncSettlementBatch } from '../server/settlementSync.js';
import { enqueue, prepareBatch } from '../src/cloud/settlementOfflineProtocol.js';
import { uid, campaignId, record, action, apply, fakeDatabase } from './fixtures/offlineFixture.js';
function request(f, body, user = uid, override = {}) {
  return syncSettlementBatch({ ...f, uid: user, body, now: 3000,
    authorize(c,u) { if (!c?.members?.[u] || c.members[u].revoked) throw new Error('FORBIDDEN'); },
    advance: c => c, visible: c => c,
    apply(c,u,input) { const next = apply(c,u,input); next.revision++; return next; }, ...override,
  });
}
function batch(worker = 'worker_1', job = 'guard', device = 'device_12345') {
  const r = record(); r.deviceId = device; enqueue(r, action(worker, job), `action_${device}`, 1000, apply); prepareBatch(r, `batch_${device}`); return r.inflight;
}
test('several commands write campaign once and stream once, and retries do not write', async () => {
  const f = fakeDatabase(), r = record(); enqueue(r, action(), 'action_0001', 1, apply); enqueue(r, action('worker_2'), 'action_0002', 2, apply); prepareBatch(r, 'batch_00001');
  const one = await request(f, r.inflight); assert.equal(one.results.length, 2);
  assert.equal(f.stats.reads, 2); assert.equal(f.stats.writes, 2);
  const two = await request(f, r.inflight); assert.equal(two.duplicate, true); assert.deepEqual(two.results, one.results); assert.equal(f.stats.writes, 2);
});
test('same batch ID with changed content aborts without a write', async () => {
  const f = fakeDatabase(), b = batch(); await request(f,b); const writes = f.stats.writes;
  const changed = structuredClone(b); changed.entries[0].createdAt++;
  await assert.rejects(request(f,changed), /REQUEST_ID_REUSED/); assert.equal(f.stats.writes,writes);
});
test('same old sequence cannot execute under a new batch ID', async () => {
  const f = fakeDatabase(), b = batch(); await request(f,b);
  await assert.rejects(request(f,{ ...b, requestId: 'different_batch_0001' }), /SYNC_SEQUENCE_CONFLICT/);
  assert.equal(f.stats.writes,2);
});
test('two players changing different workers merge', async () => {
  const f = fakeDatabase();
  const responses = await Promise.all([request(f,batch()), request(f,batch('worker_2','build','device_second'),'player_2')]);
  assert.deepEqual(responses.map(r=>r.results[0].state), ['accepted','accepted']);
  const c = f.docs.get(`persistentCampaigns/${campaignId}`);
  assert.equal(c.settlements[0].settlers[0].settlementAction.type,'guard'); assert.equal(c.settlements[0].settlers[1].settlementAction.type,'build');
});
test('two players changing one worker cannot silently steal the first assignment', async () => {
  const f = fakeDatabase(); await request(f,batch());
  const second = await request(f,batch('worker_1','build','device_second'),'player_2');
  assert.equal(second.results[0].state,'rejected'); assert.equal(second.results[0].error,'COMMAND_CONFLICT');
  const replay = await request(f,batch('worker_1','build','device_second'),'player_2');
  assert.equal(replay.duplicate,true); assert.equal(replay.results[0].state,'rejected');
});
test('membership is verified again even when returning a duplicate receipt', async () => {
  const f = fakeDatabase(), b = batch(); await request(f,b);
  f.docs.get(`persistentCampaigns/${campaignId}`).members[uid].revoked = true;
  await assert.rejects(request(f,b), /FORBIDDEN/);
});
test('unknown application errors abort the entire transaction including receipts', async () => {
  const f = fakeDatabase();
  await assert.rejects(request(f,batch(),uid,{apply(){throw new TypeError('bug');}}), /bug/);
  assert.equal(f.stats.writes,0); assert.equal(f.docs.size,1);
});
test('paid command cannot use the phase-one batch API', async () => {
  const f = fakeDatabase(), b = batch(); b.entries[0].command.command = { type:'build',buildingType:'small_house',x:0,y:0 };
  await assert.rejects(request(f,b), /ONLINE_ACTION_REQUIRED/); assert.equal(f.stats.reads,0); assert.equal(f.stats.writes,0);
});

for (const code of ['WORKPLACE_FULL', 'WORKPLACE_UNAVAILABLE']) {
  test(`known ${code} conflict is acknowledged once without trapping later orders`, async () => {
    const f = fakeDatabase(), r = record();
    enqueue(r, action('worker_1'), 'action_conflict_001', 1, apply);
    enqueue(r, action('worker_2'), 'action_valid_002', 2, apply);
    prepareBatch(r, `batch_${code}`);
    const custom = { apply(c, u, input) {
      if (input.command.workerId === 'worker_1') throw new Error(code);
      const next = apply(c, u, input); next.revision++; return next;
    } };
    const first = await request(f, r.inflight, uid, custom);
    assert.equal(first.results[0].state, 'rejected');
    assert.equal(first.results[0].error, 'COMMAND_CONFLICT');
    assert.equal(first.results[0].reason, code);
    assert.equal(first.results[1].state, 'accepted');
    assert.equal(first.through, 2);
    assert.equal(f.stats.writes, 2);
    const replay = await request(f, r.inflight, uid, custom);
    assert.equal(replay.duplicate, true);
    assert.deepEqual(replay.results, first.results);
    assert.equal(f.stats.writes, 2);
  });
}
