import { newLocalCharacter, updateLocalCharacter, reconcilePersonalHolds, totalHolds } from './characterReservationState.js';
import { checkedPlayerResources } from '../utils/personalResources.js';
import { newRecord, mergeSnapshot, fail } from './settlementOfflineProtocol.js';

const DB_NAME = 'pip2d20-campaign-offline-v1';
export const LOCAL_EVENT = 'pip2d20:campaign-local-changed';
let opening, channel;
function announce(uid, campaignId = '') {
  const detail = { uid, campaignId };
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail }));
  try {
    if (!channel && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(DB_NAME);
      channel.onmessage = event => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: event.data }));
      };
    }
    channel?.postMessage(detail);
  } catch { /* A visibility refresh also picks up changes from another tab. */ }
}
function database() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('LOCAL_STORAGE_UNAVAILABLE')); return; }
    const request = indexedDB.open(DB_NAME, 2);
    let settled = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('worlds')) db.createObjectStore('worlds', { keyPath: ['uid', 'campaignId'] });
      if (!db.objectStoreNames.contains('lists')) db.createObjectStore('lists', { keyPath: 'uid' });
      if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'id' });
    };
    request.onblocked = () => { settled = true; reject(new Error('LOCAL_STORAGE_BLOCKED')); };
    request.onerror = () => { settled = true; reject(new Error('LOCAL_STORAGE_UNAVAILABLE')); };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      db.onversionchange = () => { db.close(); opening = null; };
      resolve(db);
    };
  }).catch(error => { opening = null; throw error; });
  return opening;
}
function scope(uid, campaignId) {
  if (typeof uid !== 'string' || !uid || typeof campaignId !== 'string' || !/^campaign_[a-f0-9]{24}$/.test(campaignId)) fail('INVALID_LOCAL_SCOPE');
}
/** The updater is synchronous. IDB serializes read-modify-write transactions
 * across tabs, so append/acknowledge cannot overwrite one another. No network,
 * awaits or UI updates are permitted inside an updater. Resolve on COMPLETE,
 * never on put.onsuccess (the surrounding transaction can still abort). */
async function transaction(storeName, key, update) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let result, ownError;
    const mode = update ? 'readwrite' : 'readonly';
    let tx;
    try { tx = db.transaction(storeName, mode, { durability: 'strict' }); }
    catch { tx = db.transaction(storeName, mode); }
    const store = tx.objectStore(storeName);
    const read = store.get(key);
    read.onsuccess = () => {
      try {
        result = read.result || null;
        if (update) {
          result = update(result);
          if (result && typeof result.then === 'function') fail('ASYNC_LOCAL_TRANSACTION');
          if (result !== null) store.put(result);
        }
      } catch (error) { ownError = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(structuredClone(result));
    tx.onabort = () => reject(ownError || new Error(tx.error?.name === 'QuotaExceededError' ? 'LOCAL_STORAGE_FULL' : 'LOCAL_STORAGE_UNAVAILABLE'));
    tx.onerror = () => { /* onabort rejects; no success signal on a failed write. */ };
  });
}
/** World and linked source inventory always share one transaction. No awaits
 * between the IDB success callbacks; a abort rolls back BOTH stores. */
async function worldTransaction(uid, campaignId, update, sourceOverride = null) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let tx, result, ownError;
    try { tx = db.transaction(['worlds', 'characters'], 'readwrite', { durability: 'strict' }); }
    catch { tx = db.transaction(['worlds', 'characters'], 'readwrite'); }
    const worlds = tx.objectStore('worlds'), chars = tx.objectStore('characters');
    const read = worlds.get([uid, campaignId]);
    read.onsuccess = () => {
      const original = read.result || newRecord(uid, campaignId, crypto.randomUUID());
      if (original.schema !== 1) { ownError = new Error('LOCAL_SCHEMA_UNSUPPORTED'); tx.abort(); return; }
      const sourceId = original.sourceCharacterId || sourceOverride;
      const finish = character => {
        try {
          const before = structuredClone(original);
          result = update(original, character);
          if (result?.then) fail('ASYNC_LOCAL_TRANSACTION');
          if (result.sourceCharacterId) {
            if (!character) fail('LOCAL_CHARACTER_REQUIRED');
            character = reconcilePersonalHolds(before, result, character);
            result.sourceAvailable = checkedPlayerResources(character.form);
            result.sourceReserved = totalHolds(character);
            result.sourceRevision = character.revision;
            chars.put(character);
          }
          worlds.put(result);
        } catch (error) { ownError = error; tx.abort(); }
      };
      if (sourceId) { const r = chars.get(sourceId); r.onsuccess = () => finish(r.result); }
      else finish(null);
    };
    tx.oncomplete = () => resolve(structuredClone(result));
    tx.onabort = () => reject(ownError || new Error(tx.error?.name === 'QuotaExceededError' ? 'LOCAL_STORAGE_FULL' : 'LOCAL_STORAGE_UNAVAILABLE'));
    tx.onerror = () => {};
  });
}
export const localCharacterStore = {
  async load(form) {
    if (!form?._localCharacterId) fail('LOCAL_CHARACTER_REQUIRED');
    return transaction('characters', form._localCharacterId, saved => saved || newLocalCharacter(form));
  },
  async get(id) { return id ? transaction('characters', id) : null; },
  async update(id, update, { expectedRevision = null } = {}) {
    // Serialize against reservations and acknowledgements on the same stores.
    const db = await database();
    const result = await new Promise((resolve, reject) => {
      let tx, result, ownError;
      try { tx = db.transaction(['worlds','characters'], 'readwrite', { durability: 'strict' }); }
      catch { tx = db.transaction(['worlds','characters'], 'readwrite'); }
      const chars = tx.objectStore('characters'), request = chars.get(id);
      request.onsuccess = () => {
        try {
          if (!request.result) fail('LOCAL_CHARACTER_REQUIRED');
          result = updateLocalCharacter(request.result, update, expectedRevision);
          chars.put(result);
          if (result.boundUid && result.boundCampaignId) {
            const worlds = tx.objectStore('worlds'), getWorld = worlds.get([result.boundUid,result.boundCampaignId]);
            getWorld.onsuccess = () => {
              try {
                if (getWorld.result) worlds.put({ ...getWorld.result, sourceAvailable: checkedPlayerResources(result.form), sourceReserved: totalHolds(result), sourceRevision: result.revision });
              } catch (error) { ownError=error; tx.abort(); }
            };
          }
        } catch (error) { ownError = error; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(ownError || new Error(tx.error?.name === 'QuotaExceededError' ? 'LOCAL_STORAGE_FULL' : 'LOCAL_STORAGE_UNAVAILABLE'));
      tx.onerror = () => {};
    });
    announce(result.boundUid || '', result.boundCampaignId || '');
    return result;
  },
};
export const campaignLocalStore = {
  async linkSource(uid, campaignId, sourceId) {
    scope(uid, campaignId);
    const result = await worldTransaction(uid, campaignId, (r, c) => {
      if (!c || c.id !== sourceId) fail('LOCAL_CHARACTER_REQUIRED');
      if (r.sourceCharacterId && r.sourceCharacterId !== sourceId) fail('PERSONAL_SOURCE_MISMATCH');
      if (c.boundUid && (c.boundUid !== uid || c.boundCampaignId !== campaignId)) fail('PERSONAL_SOURCE_ALREADY_LINKED');
      checkedPlayerResources(c.form);
      c.boundUid = uid; c.boundCampaignId = campaignId; r.sourceCharacterId = sourceId;
      return r;
    }, sourceId);
    announce(uid,campaignId); return result;
  },
  async get(uid, campaignId) {
    scope(uid, campaignId);
    return transaction('worlds', [uid, campaignId]);
  },
  async change(uid, campaignId, update) {
    scope(uid, campaignId);
    const result = await worldTransaction(uid, campaignId, update);
    announce(uid, campaignId); return result;
  },
  async remember(uid, campaign, now = Date.now()) {
    const record = await this.change(uid, campaign.id, r => { mergeSnapshot(r, campaign, now); if (!r.entries.length && !r.inflight && !r.immediate) r.lastSyncAt = now; return r; });
    await this.rememberSummary(uid, campaign, now);
    return record;
  },
  async list(uid) {
    if (!uid) return null;
    return transaction('lists', uid);
  },
  async rememberList(uid, campaigns, now = Date.now()) {
    if (!uid || !Array.isArray(campaigns)) fail('INVALID_LOCAL_SCOPE');
    const result = await transaction('lists', uid, () => ({ uid, receivedAt: now,
      campaigns: campaigns.filter(c => /^campaign_[a-f0-9]{24}$/.test(c.id || '')).map(c => ({ id: c.id, name: c.name, ownerUid: c.ownerUid })) }));
    announce(uid); return result;
  },
  async rememberSummary(uid, campaign, now = Date.now()) {
    const result = await transaction('lists', uid, old => ({ uid, receivedAt: old?.receivedAt || 0,
      campaigns: [...(old?.campaigns || []).filter(c => c.id !== campaign.id),
        { id: campaign.id, name: campaign.name, ownerUid: campaign.ownerUid }] }));
    announce(uid); return result;
  },
  async block(uid, campaignId) {
    const result = await this.change(uid, campaignId, r => { r.blockedRevision = Math.max(r.blockedRevision || 0, r.snapshot?.revision || 0); r.blocked = true; r.snapshot = null; r.lease = null; return r; });
    await transaction('lists', uid, old => old ? { ...old, campaigns: old.campaigns.filter(c => c.id !== campaignId) } : null);
    announce(uid); return result;
  },
  async claim(uid, campaignId, owner, now = Date.now()) {
    let acquired = false;
    const record = await this.change(uid, campaignId, r => {
      if (r.lease && r.lease.owner !== owner && r.lease.until > now && r.lease.until <= now + 120000) return r;
      acquired = true; r.lease = { owner, until: now + 60000 }; return r;
    });
    return { acquired, record };
  },
  async release(uid, campaignId, owner) {
    return this.change(uid, campaignId, r => { if (r.lease?.owner === owner) r.lease = null; return r; });
  },
  async export(uid, campaignId) {
    const record = await this.get(uid, campaignId);
    if (!record || record.blocked) fail('NO_OFFLINE_SNAPSHOT');
    const { lease, ...data } = record;
    // No auth session, tokens, invitation secrets or other users' cached worlds.
    const character = record.sourceCharacterId ? await localCharacterStore.get(record.sourceCharacterId) : null;
    return JSON.stringify({ format: 'pip2d20-campaign-offline', version: 2, exportedAt: new Date().toISOString(), data, character }, null, 2);
  },
};
export function subscribeLocal(listener) {
  // Establish the channel even in a read-only tab.
  try {
    if (!channel && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(DB_NAME);
      channel.onmessage = e => window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: e.data }));
    }
  } catch { /* visibility refresh remains available */ }
  window.addEventListener(LOCAL_EVENT, listener);
  return () => window.removeEventListener(LOCAL_EVENT, listener);
}
