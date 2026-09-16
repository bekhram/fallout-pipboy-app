import { getCloudAuthSession } from "./googleAuth.js";

const APP_FOLDER_NAME = "Pip2D20";

function getAccessToken() {
  const session = getCloudAuthSession();
  const token = session?.google?.accessToken;
  if (!token) throw new Error("Google Drive access requires Google sign-in.");
  if (Number(session?.google?.expiresAt || 0) <= Date.now()) {
    throw new Error("Google Drive session expired. Sign in again to continue.");
  }
  return token;
}

async function driveFetch(url, options = {}) {
  const token = getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let message = `Google Drive request failed (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || message;
    } catch { /* no-op */ }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function escapeQuery(value) {
  return String(value || "").replace(/'/g, "\\'");
}

async function findFileByName(name, parentId = null, mimeType = null) {
  const clauses = [
    `name = '${escapeQuery(name)}'`,
    "trashed = false",
  ];
  if (parentId) clauses.push(`'${escapeQuery(parentId)}' in parents`);
  if (mimeType) clauses.push(`mimeType = '${escapeQuery(mimeType)}'`);
  const q = encodeURIComponent(clauses.join(" and "));
  const payload = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,parents)&pageSize=20`);
  return payload?.files?.[0] || null;
}

async function listFilesInFolder(parentId) {
  const q = encodeURIComponent(`'${escapeQuery(parentId)}' in parents and trashed = false`);
  const payload = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,modifiedTime,parents)&pageSize=100&orderBy=modifiedTime desc`);
  return Array.isArray(payload?.files) ? payload.files : [];
}

async function readDriveJsonById(fileId) {
  const token = getAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Could not read Google Drive file ${fileId}.`);
  return response.json();
}

export async function ensurePip2D20DriveFolder() {
  const mimeType = "application/vnd.google-apps.folder";
  const existing = await findFileByName(APP_FOLDER_NAME, null, mimeType);
  if (existing) return existing;

  return driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType }),
  });
}

async function createMetadataFile(name, parentId) {
  return driveFetch("https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,modifiedTime,parents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/json",
      parents: parentId ? [parentId] : undefined,
    }),
  });
}

async function uploadJsonContent(fileId, data) {
  const token = getAccessToken();
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name,mimeType,modifiedTime,parents`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(data, null, 2),
  });
  if (!response.ok) {
    let message = `Google Drive upload failed (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload?.error?.message || message;
    } catch { /* no-op */ }
    throw new Error(message);
  }
  return response.json();
}

export async function upsertDriveJson(name, data, { parentId = null } = {}) {
  const folder = parentId ? { id: parentId } : await ensurePip2D20DriveFolder();
  const existing = await findFileByName(name, folder.id, "application/json");
  const file = existing || await createMetadataFile(name, folder.id);
  return uploadJsonContent(file.id, data);
}

export async function readDriveJson(name, { parentId = null } = {}) {
  const folder = parentId ? { id: parentId } : await ensurePip2D20DriveFolder();
  const file = await findFileByName(name, folder.id, "application/json");
  if (!file) return null;
  return readDriveJsonById(file.id);
}

export async function listDriveCharacterBackups() {
  const folder = await ensurePip2D20DriveFolder();
  const files = (await listFilesInFolder(folder.id)).filter(
    (file) => file?.mimeType === "application/json" && /^character-.+\.json$/i.test(String(file?.name || ""))
  );

  const backups = await Promise.all(
    files.map(async (file) => {
      try {
        const payload = await readDriveJsonById(file.id);
        if (payload?.kind !== "pip2d20-character" || !payload?.character) return null;
        return { file, payload };
      } catch {
        return null;
      }
    })
  );

  return backups
    .filter(Boolean)
    .sort((a, b) => String(b?.payload?.savedAt || b?.file?.modifiedTime || "").localeCompare(String(a?.payload?.savedAt || a?.file?.modifiedTime || "")));
}

export async function backupCharacterToDrive(character, { characterId, localUpdatedAt } = {}) {
  const id = String(characterId || character?.id || character?.profileId || "active").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return upsertDriveJson(`character-${id}.json`, {
    schemaVersion: 2,
    kind: "pip2d20-character",
    profileId: id,
    localUpdatedAt: localUpdatedAt || null,
    savedAt: new Date().toISOString(),
    character,
  });
}

export async function backupCampaignToDrive(campaignId, campaignState) {
  const id = String(campaignId || "campaign").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return upsertDriveJson(`campaign-${id}.json`, {
    schemaVersion: 1,
    kind: "pip2d20-campaign-backup",
    campaignId,
    savedAt: new Date().toISOString(),
    state: campaignState,
  });
}
