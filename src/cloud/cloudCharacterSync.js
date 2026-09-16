import { getCloudAuthSession } from "./googleAuth.js";
import {
  backupCharacterToDrive,
  listDriveCharacterBackups,
} from "./googleDriveStore.js";

const LEGACY_KEY = "fallout_pipboy_v4_last_character";
const PROFILES_KEY = "fallout_pipboy_v5_character_profiles";
const ACTIVE_ID_KEY = "fallout_pipboy_v5_active_character_id";
const SYNC_INTERVAL_MS = 2500;
const RESTORE_MARKER_KEY = "pip2d20.cloud.character.restore.v1";

let timer = null;
let syncBusy = false;
let lastUploadedSignature = "";
let lastSeenActiveId = "";
let reconciledActiveId = "";

function safeParse(raw, fallback = null) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readLocalEnvelope() {
  return safeParse(localStorage.getItem(LEGACY_KEY), null);
}

function readProfiles() {
  const value = safeParse(localStorage.getItem(PROFILES_KEY), []);
  return Array.isArray(value) ? value : [];
}

function readActiveId() {
  return String(localStorage.getItem(ACTIVE_ID_KEY) || "").trim();
}

function characterName(data) {
  return String(data?.characterName || data?.name || data?.playerName || "Unnamed Character").trim() || "Unnamed Character";
}

function updateLocalProfile(activeId, data, updatedAt) {
  if (!activeId || !data || typeof data !== "object") return;
  const profiles = readProfiles();
  const index = profiles.findIndex((item) => String(item?.id || "") === activeId);
  const previous = index >= 0 ? profiles[index] : null;
  const nextRecord = {
    id: activeId,
    createdAt: previous?.createdAt || updatedAt,
    updatedAt,
    name: characterName(data),
    origin: String(data?.origin || ""),
    level: String(data?.level || "1"),
    data,
  };

  const next = index >= 0
    ? profiles.map((item, itemIndex) => (itemIndex === index ? nextRecord : item))
    : [...profiles, nextRecord];

  localStorage.setItem(PROFILES_KEY, JSON.stringify(next));
}

function profileIdFromBackup(backup) {
  const payloadId = String(backup?.payload?.profileId || "").trim();
  if (payloadId) return payloadId;
  const match = String(backup?.file?.name || "").match(/^character-(.+)\.json$/i);
  return match?.[1] || "active";
}

function backupTimestamp(backup) {
  return String(
    backup?.payload?.localUpdatedAt
      || backup?.payload?.savedAt
      || backup?.file?.modifiedTime
      || ""
  );
}

function localTimestamp(envelope, activeId) {
  const profile = readProfiles().find((item) => String(item?.id || "") === activeId);
  return String(profile?.updatedAt || envelope?.updatedAt || "");
}

function restoreCloudBackup(backup) {
  const data = backup?.payload?.character;
  if (!data || typeof data !== "object") return false;

  const activeId = profileIdFromBackup(backup);
  const updatedAt = backupTimestamp(backup) || new Date().toISOString();
  const marker = `${activeId}:${updatedAt}`;

  if (sessionStorage.getItem(RESTORE_MARKER_KEY) === marker) return false;

  localStorage.setItem(ACTIVE_ID_KEY, activeId);
  localStorage.setItem(LEGACY_KEY, JSON.stringify({ updatedAt, data }));
  updateLocalProfile(activeId, data, updatedAt);
  sessionStorage.setItem(RESTORE_MARKER_KEY, marker);
  window.dispatchEvent(new CustomEvent("pipboy:character-profiles-changed"));
  window.dispatchEvent(new CustomEvent("pip2d20:cloud-character-restored", {
    detail: { activeId, updatedAt },
  }));
  window.location.reload();
  return true;
}

async function reconcileFromCloud() {
  const session = getCloudAuthSession();
  if (!session?.google?.accessToken) return;

  const activeId = readActiveId();
  const backups = await listDriveCharacterBackups();
  if (!backups.length) {
    reconciledActiveId = activeId || "__none__";
    return;
  }

  if (!activeId) {
    restoreCloudBackup(backups[0]);
    return;
  }

  const matching = backups.find((backup) => profileIdFromBackup(backup) === activeId);
  if (!matching) {
    reconciledActiveId = activeId;
    return;
  }

  const envelope = readLocalEnvelope();
  const cloudUpdatedAt = backupTimestamp(matching);
  const localUpdatedAt = localTimestamp(envelope, activeId);

  if (cloudUpdatedAt && (!localUpdatedAt || cloudUpdatedAt > localUpdatedAt)) {
    restoreCloudBackup(matching);
    return;
  }

  reconciledActiveId = activeId;
}

async function uploadLocalIfChanged() {
  const session = getCloudAuthSession();
  if (!session?.google?.accessToken) return;

  const activeId = readActiveId();
  if (!activeId) return;
  if (reconciledActiveId !== activeId) return;

  const envelope = readLocalEnvelope();
  const data = envelope?.data;
  if (!data || typeof data !== "object") return;

  const updatedAt = String(envelope?.updatedAt || new Date().toISOString());
  const signature = `${activeId}:${updatedAt}:${JSON.stringify(data).length}`;
  if (signature === lastUploadedSignature) return;

  updateLocalProfile(activeId, data, updatedAt);
  await backupCharacterToDrive(data, { characterId: activeId, localUpdatedAt: updatedAt });
  lastUploadedSignature = signature;
  window.dispatchEvent(new CustomEvent("pip2d20:cloud-character-synced", {
    detail: { activeId, updatedAt },
  }));
}

async function tick() {
  if (syncBusy) return;
  syncBusy = true;
  try {
    const session = getCloudAuthSession();
    if (!session?.google?.accessToken) {
      reconciledActiveId = "";
      lastSeenActiveId = "";
      return;
    }

    const activeId = readActiveId();
    if (activeId !== lastSeenActiveId) {
      lastSeenActiveId = activeId;
      reconciledActiveId = "";
      lastUploadedSignature = "";
    }

    if (reconciledActiveId !== (activeId || "__none__")) {
      await reconcileFromCloud();
    }

    await uploadLocalIfChanged();
  } catch (error) {
    console.warn("Pip-2D20 cloud character sync:", error);
    window.dispatchEvent(new CustomEvent("pip2d20:cloud-character-sync-error", {
      detail: { message: error?.message || String(error) },
    }));
  } finally {
    syncBusy = false;
  }
}

export function initCloudCharacterSync() {
  if (timer || typeof window === "undefined") return () => {};

  const handleAuthChanged = () => {
    reconciledActiveId = "";
    lastUploadedSignature = "";
    void tick();
  };

  window.addEventListener("pip2d20:cloud-auth-changed", handleAuthChanged);
  timer = window.setInterval(() => void tick(), SYNC_INTERVAL_MS);
  void tick();

  return () => {
    window.removeEventListener("pip2d20:cloud-auth-changed", handleAuthChanged);
    if (timer) window.clearInterval(timer);
    timer = null;
  };
}
