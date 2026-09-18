import test from 'node:test';
import assert from 'node:assert/strict';
import { acknowledge, canonical, commandPrecondition, enqueue, isLocalCommand, localCommand, mergeSnapshot, prepareBatch, projectRecord, retryAt, syncDue, validateBatch, MAX_BATCH, SYNC_INTERVAL } from '../src/cloud/settlementOfflineProtocol.js';
import { uid, record, action, apply, campaign } from './fixtures/offlineFixture.js';

test('canonical entity preconditions ignore key ordering', () => {
  assert.equal(canonical({ b: 2, a: 1 }), canonical({ a: 1, b: 2 }));
  assert.equal(canonical({ a: undefined }), canonical({ a: null }));
});
test('only nonfinancial phase-one commands are queueable', () => {
  for (const type of ['build', 'room', 'upgrade', 'deposit', 'boost', 'cancel', 'spender', 'attack', 'demolish']) {
    assert.equal(isLocalCommand({ ...action(), command: { type } }), false);
  }
  assert.equal(isLocalCommand(action()), true);
  assert.throws(() => localCommand({ type: 'found' }), /ONLINE_ACTION_REQUIRED/);
  assert.throws(() => localCommand({ ...action(), command: { type: 'move', buildingId: 'b', x: NaN, y: 0 } }), /PLACEMENT/);
});
test('append validates before success and projection leaves confirmed state unchanged', () => {
  const r = record(), before = structuredClone(r.snapshot);
  enqueue(r, action(), 'action_0001', 2000, apply);
  assert.deepEqual(r.snapshot, before);
  assert.equal(projectRecord(r, apply).campaign.settlements[0].settlers[0].settlementAction.type, 'guard');
  assert.equal(r.nextSequence, 2);
  assert.throws(() => enqueue(r, action('absent'), 'action_0002', 2000, apply), /NOT_FOUND/);
  assert.equal(r.entries.length, 1);
});
test('different workers have independent preconditions; conflicting worker does not', () => {
  const base = campaign(), first = apply(base, uid, action());
  assert.equal(commandPrecondition(base, action('worker_2')), commandPrecondition(first, action('worker_2')));
  assert.notEqual(commandPrecondition(base, action()), commandPrecondition(first, action()));
});
test('immutable in-flight batch survives serialization and excludes later appends', () => {
  const r = record(); enqueue(r, action(), 'action_0001', 1, apply); prepareBatch(r, 'batch_00001');
  const frozen = canonical(r.inflight);
  enqueue(r, action('worker_2'), 'action_0002', 2, apply); prepareBatch(r, 'batch_00002');
  assert.equal(canonical(r.inflight), frozen);
  assert.deepEqual(JSON.parse(JSON.stringify(r)).inflight, r.inflight);
});
test('ack removes only its confirmed prefix and retains actions appended during HTTP', () => {
  const r = record(); enqueue(r, action(), 'action_0001', 1, apply); prepareBatch(r, 'batch_00001');
  const accepted = apply(campaign(), uid, action()); accepted.revision++;
  enqueue(r, action('worker_2'), 'action_0002', 2, apply);
  acknowledge(r, { protocol: 1, requestId: 'batch_00001', deviceId: r.deviceId, through: 1,
    campaign: accepted, results: [{ requestId: 'action_0001', sequence: 1, state: 'accepted' }] }, 3000);
  assert.equal(r.entries.length, 1); assert.equal(r.entries[0].requestId, 'action_0002');
  assert.equal(projectRecord(r, apply).conflicts.length, 0);
  assert.equal(r.inflight, null);
});
test('invalid or partial acknowledgement preserves the whole queue', () => {
  const r = record(); enqueue(r, action(), 'action_0001', 1, apply); prepareBatch(r, 'batch_00001');
  const before = structuredClone(r);
  assert.throws(() => acknowledge(r, { requestId: 'batch_00001', results: [] }, 4), /INVALID_SYNC_ACK/);
  assert.deepEqual(r, before);
});
test('wire validator rejects gaps, duplicate IDs and injected commands', () => {
  const r = record(); enqueue(r, action(), 'action_0001', 1, apply); enqueue(r, action('worker_2'), 'action_0002', 2, apply); prepareBatch(r, 'batch_00001');
  for (const edit of [b => b.entries[1].sequence = 9, b => b.entries[1].requestId = b.entries[0].requestId, b => b.entries[0].command.actor = { isGM: true }, b => b.protocol = 2]) {
    const b = structuredClone(r.inflight); edit(b); assert.throws(() => validateBatch(b), /INVALID_SYNC_BATCH/);
  }
});
test('batch size is bounded without dropping queued entries', () => {
  const r = record();
  for (let i = 0; i < MAX_BATCH + 3; i++) enqueue(r, action('worker_1', i % 2 ? 'build' : 'guard'), `action_${String(i).padStart(5,'0')}`, i, apply);
  prepareBatch(r, 'batch_00001'); assert.equal(r.inflight.entries.length, MAX_BATCH); assert.equal(r.entries.length, MAX_BATCH + 3);
});
test('daily sync, durable retry-after and remaining chunks use different triggers', () => {
  const r = record(); r.lastSyncAt = 1000;
  assert.equal(syncDue(r, 2000), false); assert.equal(syncDue(r, 1000 + SYNC_INTERVAL), true);
  retryAt(r, 2000, 300); assert.equal(r.nextAttemptAt, 302000);
  assert.equal(syncDue(r, 301999), false); assert.equal(syncDue(r, 302000), true);
  r.failures = 0; r.needsDrain = true; assert.equal(syncDue(r, 302000), true);
});
test('older responses cannot roll the snapshot back or restore a revoked cached world', () => {
  const r = record(); r.snapshot.revision = 20;
  mergeSnapshot(r, campaign(), 5000); assert.equal(r.snapshot.revision, 20);
  r.blocked = true; r.blockedRevision = 20; r.snapshot = null;
  assert.throws(() => mergeSnapshot(r, campaign(), 5000), /STALE_SNAPSHOT/);
  assert.equal(r.snapshot, null);
});
test('wrong-account snapshots and unavailable offline data are rejected', () => {
  const r = record(), c = campaign(); delete c.members[uid];
  assert.throws(() => mergeSnapshot(r, c, 4), /INVALID_SNAPSHOT/);
  r.snapshot = null; assert.throws(() => enqueue(r, action(), 'action_0001', 2, apply), /NO_OFFLINE_SNAPSHOT/);
});
test('a changed cached entity is reported as a draft conflict, never silently rewritten', () => {
  const r = record(); enqueue(r, action(), 'action_0001', 2, apply);
  r.snapshot = apply(r.snapshot, uid, action('worker_1', 'scavenging'));
  const view = projectRecord(r, apply);
  assert.equal(view.conflicts.length, 1); assert.equal(view.campaign.settlements[0].settlers[0].settlementAction.type, 'scavenging');
});
