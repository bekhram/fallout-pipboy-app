const DB_NAME = "pip2d20-session-cache-v1";
const DB_VERSION = 1;
const CAMPAIGN_STORE = "campaigns";
const RESOURCE_STORE = "resources";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("INDEXEDDB_UNAVAILABLE"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAMPAIGN_STORE)) {
        db.createObjectStore(CAMPAIGN_STORE, { keyPath: "campaignId" });
      }
      if (!db.objectStoreNames.contains(RESOURCE_STORE)) {
        const store = db.createObjectStore(RESOURCE_STORE, { keyPath: "key" });
        store.createIndex("campaignId", "campaignId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("INDEXEDDB_OPEN_FAILED"));
  });
}

function transact(storeName, mode, callback) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    try {
      result = callback(store, tx);
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error("INDEXEDDB_TX_FAILED"));
    tx.onabort = () => reject(tx.error || new Error("INDEXEDDB_TX_ABORTED"));
  }));
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("INDEXEDDB_REQUEST_FAILED"));
  });
}

export async function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Fallback is only for older webviews; it is not cryptographic, but remains stable.
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export async function getCampaign(campaignId) {
  if (!campaignId) return null;
  const db = await openDb();
  return requestResult(db.transaction(CAMPAIGN_STORE, "readonly").objectStore(CAMPAIGN_STORE).get(campaignId));
}

export async function putCampaign(campaign) {
  if (!campaign?.campaignId) throw new Error("CAMPAIGN_ID_REQUIRED");
  const record = { ...campaign, updatedAt: Date.now() };
  const db = await openDb();
  await requestResult(db.transaction(CAMPAIGN_STORE, "readwrite").objectStore(CAMPAIGN_STORE).put(record));
  return record;
}

export async function putResource(campaignId, resource) {
  if (!campaignId || !resource?.id) throw new Error("RESOURCE_ID_REQUIRED");
  const record = {
    key: `${campaignId}:${resource.id}`,
    campaignId,
    id: resource.id,
    hash: String(resource.hash || ""),
    type: resource.type || "text",
    mime: resource.mime || "text/plain",
    name: resource.name || resource.id,
    data: resource.data ?? "",
    size: Number(resource.size ?? String(resource.data ?? "").length),
    updatedAt: Date.now(),
  };
  const db = await openDb();
  await requestResult(db.transaction(RESOURCE_STORE, "readwrite").objectStore(RESOURCE_STORE).put(record));
  return record;
}

export async function getResource(campaignId, id) {
  if (!campaignId || !id) return null;
  const db = await openDb();
  return requestResult(db.transaction(RESOURCE_STORE, "readonly").objectStore(RESOURCE_STORE).get(`${campaignId}:${id}`));
}

export async function getResourceHashes(campaignId) {
  if (!campaignId) return {};
  const db = await openDb();
  const tx = db.transaction(RESOURCE_STORE, "readonly");
  const index = tx.objectStore(RESOURCE_STORE).index("campaignId");
  const records = await requestResult(index.getAll(campaignId));
  return Object.fromEntries((records || []).map((record) => [record.id, record.hash]));
}

export async function listResources(campaignId) {
  if (!campaignId) return [];
  const db = await openDb();
  const tx = db.transaction(RESOURCE_STORE, "readonly");
  return requestResult(tx.objectStore(RESOURCE_STORE).index("campaignId").getAll(campaignId));
}

export async function removeMissingResources(campaignId, validIds = []) {
  const valid = new Set(validIds);
  const records = await listResources(campaignId);
  const stale = records.filter((record) => !valid.has(record.id));
  if (!stale.length) return 0;
  const db = await openDb();
  const tx = db.transaction(RESOURCE_STORE, "readwrite");
  const store = tx.objectStore(RESOURCE_STORE);
  stale.forEach((record) => store.delete(record.key));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("INDEXEDDB_DELETE_FAILED"));
    tx.onabort = () => reject(tx.error || new Error("INDEXEDDB_DELETE_ABORTED"));
  });
  return stale.length;
}

export async function buildCacheSummary(campaignId) {
  const hashes = await getResourceHashes(campaignId);
  return {
    campaignId,
    resources: Object.entries(hashes).map(([id, hash]) => ({ id, hash })),
  };
}
