import { CLOUD_CONFIG, isFirebaseCloudConfigured } from "./cloudConfig.js";
import { refreshFirebaseSession } from "./googleAuth.js";

function assertConfigured() {
  if (!isFirebaseCloudConfigured()) {
    throw new Error("Firebase Cloud is not configured. Add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID.");
  }
}

function encodePath(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function authHeaders() {
  const session = await refreshFirebaseSession();
  const token = session?.firebase?.idToken;
  if (!token) throw new Error("Cloud database access requires Google sign-in.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function databaseBaseUrl() {
  assertConfigured();
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(CLOUD_CONFIG.firebaseProjectId)}/databases/(default)`;
}

function baseUrl() {
  return `${databaseBaseUrl()}/documents`;
}

function stringField(value) {
  return { stringValue: String(value ?? "") };
}

function timestampField(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return { timestampValue: date.toISOString() };
}

function parseDocument(document) {
  if (!document?.fields) return null;
  const fields = document.fields;
  let payload = null;
  try { payload = JSON.parse(fields.payload?.stringValue || "null"); } catch { payload = null; }
  return {
    id: document.name?.split("/").pop() || "",
    ownerUid: fields.ownerUid?.stringValue || "",
    kind: fields.kind?.stringValue || "",
    title: fields.title?.stringValue || "",
    updatedAt: fields.updatedAt?.timestampValue || document.updateTime || "",
    createdAt: fields.createdAt?.timestampValue || document.createTime || "",
    payload,
    raw: document,
  };
}

async function request(path, options = {}) {
  const headers = await authHeaders();
  const response = await fetch(`${baseUrl()}/${encodePath(path)}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Firestore request failed (${response.status}).`);
  }
  return payload;
}

async function runQuery(structuredQuery) {
  const headers = await authHeaders();
  const response = await fetch(`${databaseBaseUrl()}/documents:runQuery`, {
    method: "POST",
    headers,
    body: JSON.stringify({ structuredQuery }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Firestore query failed (${response.status}).`);
  }
  return Array.isArray(payload)
    ? payload.map((row) => parseDocument(row?.document)).filter(Boolean)
    : [];
}

export async function setCloudDocument(path, {
  ownerUid,
  kind,
  title = "",
  payload,
  createdAt = null,
} = {}) {
  const fields = {
    ownerUid: stringField(ownerUid),
    kind: stringField(kind),
    title: stringField(title),
    payload: stringField(JSON.stringify(payload ?? null)),
    updatedAt: timestampField(),
  };
  if (createdAt) fields.createdAt = timestampField(createdAt);
  else fields.createdAt = timestampField();

  const response = await request(path, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
  return parseDocument(response);
}

export async function getCloudDocument(path) {
  return parseDocument(await request(path));
}

export async function deleteCloudDocument(path) {
  const headers = await authHeaders();
  const response = await fetch(`${baseUrl()}/${encodePath(path)}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error?.message || `Firestore delete failed (${response.status}).`);
  }
  return true;
}

export async function saveCloudCharacter(userId, characterId, character) {
  const safeUserId = String(userId || "").trim();
  const safeCharacterId = String(characterId || character?.id || character?.profileId || "active").trim();
  if (!safeUserId || !safeCharacterId) throw new Error("Missing user or character id.");
  return setCloudDocument(`users/${safeUserId}/characters/${safeCharacterId}`, {
    ownerUid: safeUserId,
    kind: "character",
    title: character?.name || "Unnamed character",
    payload: character,
  });
}

export async function loadCloudCharacter(userId, characterId) {
  return getCloudDocument(`users/${userId}/characters/${characterId}`);
}

export async function saveCloudCampaign(campaignId, ownerUid, campaignState, title = "") {
  const safeCampaignId = String(campaignId || "").trim();
  if (!safeCampaignId || !ownerUid) throw new Error("Missing campaign id or owner uid.");
  return setCloudDocument(`campaigns/${safeCampaignId}`, {
    ownerUid,
    kind: "campaign",
    title: title || campaignState?.name || `Campaign ${safeCampaignId}`,
    payload: campaignState,
  });
}

export async function loadCloudCampaign(campaignId) {
  return getCloudDocument(`campaigns/${campaignId}`);
}

export async function listCloudCampaignsByOwner(ownerUid) {
  const uid = String(ownerUid || "").trim();
  if (!uid) throw new Error("Missing campaign owner uid.");
  const documents = await runQuery({
    from: [{ collectionId: "campaigns" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "ownerUid" },
        op: "EQUAL",
        value: { stringValue: uid },
      },
    },
  });
  return documents.sort((a, b) => {
    const aTime = Date.parse(a?.updatedAt || a?.createdAt || 0) || 0;
    const bTime = Date.parse(b?.updatedAt || b?.createdAt || 0) || 0;
    return bTime - aTime;
  });
}

export async function saveCampaignPlayerSnapshot(campaignId, userId, character) {
  if (!campaignId || !userId) throw new Error("Missing campaign or user id.");
  return setCloudDocument(`campaigns/${campaignId}/players/${userId}`, {
    ownerUid: userId,
    kind: "campaign-player-snapshot",
    title: character?.name || userId,
    payload: {
      character,
      syncedAt: new Date().toISOString(),
    },
  });
}
