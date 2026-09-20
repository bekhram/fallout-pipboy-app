import { newLocalCharacter, updateLocalCharacter } from './characterReservationState.js';

const DB_NAME = 'pip2d20-campaign-offline-v1';
export const LOCAL_EVENT = 'pip2d20:local-character-changed';
let opening;
let channel;

function fail(code) {
  throw new Error(code);
}

function announce(characterId = '') {
  const detail = { characterId };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail }));
  }
  try {
    if (!channel && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(DB_NAME);
      channel.onmessage = event => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: event.data }));
        }
      };
    }
    channel?.postMessage(detail);
  } catch {
    // Focus refresh remains the fallback when BroadcastChannel is unavailable.
  }
}

function database() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 2);
    let settled = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      // Keep existing stores untouched so older installs upgrade safely.
      if (!db.objectStoreNames.contains('characters')) {
        db.createObjectStore('characters', { keyPath: 'id' });
      }
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error('LOCAL_STORAGE_BLOCKED'));
    };
    request.onerror = () => {
      settled = true;
      reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
  }).catch(error => {
    opening = null;
    throw error;
  });
  return opening;
}

async function characterTransaction(id, update) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let tx;
    let result;
    let ownError;
    try {
      tx = db.transaction('characters', update ? 'readwrite' : 'readonly', { durability: 'strict' });
    } catch {
      tx = db.transaction('characters', update ? 'readwrite' : 'readonly');
    }
    const store = tx.objectStore('characters');
    const read = store.get(id);
    read.onsuccess = () => {
      try {
        result = read.result || null;
        if (update) {
          result = update(result);
          if (result && typeof result.then === 'function') fail('ASYNC_LOCAL_TRANSACTION');
          if (result !== null) store.put(result);
        }
      } catch (error) {
        ownError = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(structuredClone(result));
    tx.onabort = () => reject(
      ownError || new Error(tx.error?.name === 'QuotaExceededError'
        ? 'LOCAL_STORAGE_FULL'
        : 'LOCAL_STORAGE_UNAVAILABLE')
    );
    tx.onerror = () => {};
  });
}

export const localCharacterStore = {
  async load(form) {
    if (!form?._localCharacterId) fail('LOCAL_CHARACTER_REQUIRED');
    const id = form._localCharacterId;
    const record = await characterTransaction(id, saved => saved || newLocalCharacter(form));
    announce(id);
    return record;
  },

  async get(id) {
    return id ? characterTransaction(id) : null;
  },

  async update(id, update, { expectedRevision = null } = {}) {
    if (!id) fail('LOCAL_CHARACTER_REQUIRED');
    const record = await characterTransaction(id, saved => {
      if (!saved) fail('LOCAL_CHARACTER_REQUIRED');
      return updateLocalCharacter(saved, update, expectedRevision);
    });
    announce(id);
    return record;
  },
};

export function subscribeLocal(listener) {
  try {
    if (!channel && typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(DB_NAME);
      channel.onmessage = event => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: event.data }));
        }
      };
    }
  } catch {
    // Window focus refresh remains available.
  }
  window.addEventListener(LOCAL_EVENT, listener);
  return () => window.removeEventListener(LOCAL_EVENT, listener);
}
