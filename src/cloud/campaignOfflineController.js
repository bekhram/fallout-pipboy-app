import { acknowledge, enqueue, fail, isLocalCommand, mergeSnapshot, prepareBatch, projectRecord, retryAt, syncDue } from './settlementOfflineProtocol.js';

const uncertain = e => !e.status || e.status >= 500 || e.status === 429;
const authError = e => ['SIGN_IN_REQUIRED', 'AUTH_CHANGED', 'USER_DISABLED', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED'].includes(e.message) || e.status === 401;
/** Injectable controller: no timers, browser globals, React state or network inside
 * IDB transactions. All HTTP retries reuse the persisted immutable request. */
export function createCampaignOfflineController({ uid, campaignId, store, request, apply,
  now = Date.now, uuid = () => crypto.randomUUID(), online = () => navigator.onLine !== false,
  current = () => true }) {
  const ensureCurrent = () => { if (!current()) fail('AUTH_CHANGED'); };
  const get = () => store.get(uid, campaignId);
  const change = update => store.change(uid, campaignId, update);
  async function renew(owner) {
    ensureCurrent();
    return change(r => {
      if (r.lease?.owner !== owner) fail('LOCAL_BUSY');
      r.lease.until = now() + 60000; return r;
    });
  }
  async function acceptRead(data) {
    ensureCurrent();
    await change(r => {
      mergeSnapshot(r, data.campaign, now());
      r.lastSyncAt = now(); r.nextAttemptAt = 0; r.failures = 0; r.authRequired = false; r.halted = ''; r.lastError = '';
      return r;
    });
    await store.rememberSummary?.(uid, data.campaign);
  }
  async function noteError(error, { immediate = false, read = false } = {}) {
    if (!current()) return;
    if (error.message === 'FORBIDDEN') {
      if (immediate) await change(r => {
        if (r.immediate) r.history = [{ requestId: r.immediate.command.requestId, state: 'rejected', error: 'FORBIDDEN', acknowledgedAt: now() }, ...r.history].slice(0, 100);
        r.immediate = null; return r;
      });
      await store.block(uid, campaignId); return;
    }
    await change(r => {
      r.lastError = error.message;
      if (['INVALID_SYNC_ACK', 'SYNC_SEQUENCE_CONFLICT', 'REQUEST_ID_REUSED', 'INVALID_SYNC_BATCH'].includes(error.message)) { r.halted = error.message; return r; }
      if (authError(error)) { r.authRequired = true; return r; }
      if (immediate && !uncertain(error) && r.immediate) {
        r.history = [{ requestId: r.immediate.command.requestId, state: 'rejected', error: error.message, acknowledgedAt: now() }, ...r.history].slice(0, 100);
        r.immediate = null;
      }
      if (uncertain(error) && !error.message.startsWith('LOCAL_')) retryAt(r, now(), error.retryAfter);
      else if (!immediate && !read) r.halted = error.message;
      return r;
    });
  }
  async function sendImmediate(owner) {
    const r = await renew(owner), pending = r.immediate;
    if (!pending) return false;
    try {
      const data = await request(pending.command, { expectedUid: uid });
      ensureCurrent();
      await change(latest => {
        mergeSnapshot(latest, data.campaign, now());
        if (latest.immediate?.command.requestId === pending.command.requestId) {
          latest.immediate = null;
          latest.history = [{ requestId: pending.command.requestId, state: 'accepted', acknowledgedAt: now() }, ...latest.history].slice(0, 100);
        }
        latest.lastSyncAt = now(); latest.failures = 0; latest.nextAttemptAt = 0; latest.authRequired = false; latest.lastError = '';
        return latest;
      });
      await store.rememberSummary?.(uid, data.campaign);
      return true;
    } catch (error) { await noteError(error, { immediate: true }); throw error; }
  }
  async function sync({ manual = false } = {}) {
    ensureCurrent();
    if (!online()) fail('OFFLINE');
    let r = await get();
    if (!manual && r && (!syncDue(r, now()) || r.authRequired || r.halted)) return false;
    const owner = uuid(), lease = await store.claim(uid, campaignId, owner, now());
    if (!lease.acquired) return false;
    let sent = false;
    try {
      r = lease.record;
      if (!r.snapshot || r.blocked) {
        try { await acceptRead(await request({ type: 'tick', campaignId }, { expectedUid: uid })); sent = true; }
        catch (error) { await noteError(error, { read: true }); throw error; }
      }
      r = await get();
      if (r.immediate) sent = await sendImmediate(owner);
      // Bounded work per invocation. Remaining chunks are due again in 30s.
      for (let n = 0; n < 8; n++) {
        r = await renew(owner);
        if (!r.entries.length && !r.inflight) break;
        r = await change(latest => prepareBatch(latest, uuid()));
        try {
          const data = await request(r.inflight, { expectedUid: uid });
          ensureCurrent();
          await change(latest => {
            acknowledge(latest, data, now());
            latest.needsDrain = latest.entries.length > 0; latest.authRequired = false; latest.halted = ''; latest.lastError = '';
            return latest;
          });
          await store.rememberSummary?.(uid, data.campaign);
          sent = true;
        } catch (error) { await noteError(error); throw error; }
      }
      if (!sent) {
        await renew(owner);
        try { await acceptRead(await request({ type: 'tick', campaignId }, { expectedUid: uid })); }
        catch (error) { await noteError(error, { read: true }); throw error; }
      }
      r = await change(latest => {
        latest.needsDrain = latest.entries.length > 0;
        if (latest.needsDrain) latest.nextAttemptAt = now() + 30000;
        return latest;
      });
      return !r.entries.length && !r.inflight && !r.immediate;
    } finally { await store.release(uid, campaignId, owner); }
  }
  return {
    get, sync,
    async linkSource(sourceId) {
      ensureCurrent();
      if(!online())fail('ONLINE_ACTION_REQUIRED');
      let r=await get();
      if(r?.entries.length || r?.immediate || r?.inflight) { await sync({manual:true}); r=await get(); }
      if(!r?.snapshot || r.blocked || r.entries.length || r.immediate || r.inflight)fail('SYNC_REQUIRED');
      if(!store.linkSource)fail('LOCAL_CHARACTER_REQUIRED');
      await store.linkSource(uid,campaignId,sourceId);
      return this.run({type:'linkPersonalSource',sourceId,deviceId:r.deviceId});
    },
    async initialize(legacy = null) {
      ensureCurrent();
      return change(r => {
        if (legacy) {
          if (legacy.campaignId !== campaignId || !/^[a-zA-Z0-9_-]{8,100}$/.test(legacy.requestId || '')) fail('INVALID_LEGACY_PENDING');
          if (r.immediate && r.immediate.command.requestId !== legacy.requestId) fail('PENDING_CONFIRMATION');
          // The legacy ID may already have a server receipt: never re-batch it.
          r.immediate ||= { command: structuredClone(legacy), createdAt: now(), legacy: true };
        }
        return r;
      });
    },
    async run(input) {
      ensureCurrent();
      if (isLocalCommand(input)) {
        const r = await change(record => {
          if (record.authRequired) fail('SIGN_IN_REQUIRED');
          if (record.halted) fail('SYNC_REQUIRED');
          return enqueue(record, input, uuid(), now(), apply);
        });
        return projectRecord(r, apply).campaign;
      }
      // Administrative actions and refunds still require the existing online API.
      // Linked deposits share the local inventory hold transaction before HTTP.
      if (!online()) fail('ONLINE_ACTION_REQUIRED');
      let r = await get();
      if (!r?.snapshot || r.blocked) fail('NO_OFFLINE_SNAPSHOT');
      if (r.entries.length || r.inflight || r.immediate) {
        await sync({ manual: true });
        r = await get();
        if (r.entries.length || r.inflight || r.immediate) fail('SYNC_REQUIRED');
      }
      const owner = uuid(), lease = await store.claim(uid, campaignId, owner, now());
      if (!lease.acquired) fail('LOCAL_BUSY');
      try {
        ensureCurrent();
        await change(record => {
          if (record.blocked || record.authRequired) fail('SIGN_IN_REQUIRED');
          if (record.entries.length || record.inflight || record.immediate) fail('PENDING_CONFIRMATION');
          record.immediate = { command: { ...structuredClone(input), campaignId, ...(record.sourceCharacterId ? {deviceId:record.deviceId} : {}), requestId: uuid() }, createdAt: now() };
          return record;
        });
        await sendImmediate(owner);
        return (await get()).snapshot;
      } finally { await store.release(uid, campaignId, owner); }
    },
  };
}
