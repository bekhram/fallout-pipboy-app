const LEGACY_KEY = "fallout_pipboy_v4_last_character";
const PROFILES_KEY = "fallout_pipboy_v5_character_profiles";
const ACTIVE_ID_KEY = "fallout_pipboy_v5_active_character_id";

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `char-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function characterName(data) {
  return String(data?.characterName || data?.name || data?.playerName || "Unnamed Character").trim() || "Unnamed Character";
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;
  const data = record.data && typeof record.data === "object" ? record.data : {};
  return {
    id: String(record.id || makeId()),
    createdAt: String(record.createdAt || record.updatedAt || nowIso()),
    updatedAt: String(record.updatedAt || nowIso()),
    name: characterName(data),
    origin: String(data.origin || ""),
    level: String(data.level || "1"),
    data,
  };
}

function writeProfiles(records) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(records.map(normalizeRecord).filter(Boolean)));
}

function migrateLegacyIfNeeded() {
  const existing = safeParse(localStorage.getItem(PROFILES_KEY), null);
  if (Array.isArray(existing)) return existing.map(normalizeRecord).filter(Boolean);

  const legacy = safeParse(localStorage.getItem(LEGACY_KEY), null);
  if (legacy?.data && typeof legacy.data === "object") {
    const record = normalizeRecord({
      id: makeId(),
      createdAt: legacy.updatedAt || nowIso(),
      updatedAt: legacy.updatedAt || nowIso(),
      data: legacy.data,
    });
    writeProfiles([record]);
    localStorage.setItem(ACTIVE_ID_KEY, record.id);
    return [record];
  }

  writeProfiles([]);
  return [];
}

export function listCharacterProfiles() {
  return migrateLegacyIfNeeded()
    .map(normalizeRecord)
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export function getActiveCharacterId() {
  const profiles = listCharacterProfiles();
  let id = String(localStorage.getItem(ACTIVE_ID_KEY) || "");
  if (!profiles.some((item) => item.id === id)) {
    id = profiles[0]?.id || "";
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id);
    else localStorage.removeItem(ACTIVE_ID_KEY);
  }
  return id;
}

export function getActiveCharacterRecord() {
  const id = getActiveCharacterId();
  return listCharacterProfiles().find((item) => item.id === id) || null;
}

export function setActiveCharacter(id) {
  const profile = listCharacterProfiles().find((item) => item.id === String(id));
  if (!profile) return false;
  localStorage.setItem(ACTIVE_ID_KEY, profile.id);
  localStorage.setItem(LEGACY_KEY, JSON.stringify({ updatedAt: profile.updatedAt, data: profile.data }));
  window.dispatchEvent(new CustomEvent("pipboy:character-profiles-changed"));
  return true;
}

export function createCharacterProfile(data = {}, { activate = true } = {}) {
  const profiles = listCharacterProfiles();
  const timestamp = nowIso();
  const record = normalizeRecord({ id: makeId(), createdAt: timestamp, updatedAt: timestamp, data });
  writeProfiles([...profiles, record]);
  if (activate) {
    localStorage.setItem(ACTIVE_ID_KEY, record.id);
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ updatedAt: record.updatedAt, data: record.data }));
  }
  window.dispatchEvent(new CustomEvent("pipboy:character-profiles-changed"));
  return record;
}

export function saveActiveCharacterProfile(data = {}) {
  const profiles = listCharacterProfiles();
  let activeId = getActiveCharacterId();
  if (!activeId) return createCharacterProfile(data, { activate: true });
  const timestamp = nowIso();
  let found = false;
  const next = profiles.map((record) => {
    if (record.id !== activeId) return record;
    found = true;
    return normalizeRecord({ ...record, updatedAt: timestamp, data });
  });
  if (!found) return createCharacterProfile(data, { activate: true });
  writeProfiles(next);
  localStorage.setItem(LEGACY_KEY, JSON.stringify({ updatedAt: timestamp, data }));
  window.dispatchEvent(new CustomEvent("pipboy:character-profiles-changed"));
  return next.find((item) => item.id === activeId) || null;
}

export function deleteCharacterProfile(id) {
  const profiles = listCharacterProfiles();
  const next = profiles.filter((item) => item.id !== String(id));
  if (next.length === profiles.length) return false;
  writeProfiles(next);

  if (getActiveCharacterId() === String(id)) {
    const replacement = next[0] || null;
    if (replacement) {
      localStorage.setItem(ACTIVE_ID_KEY, replacement.id);
      localStorage.setItem(LEGACY_KEY, JSON.stringify({ updatedAt: replacement.updatedAt, data: replacement.data }));
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
      localStorage.removeItem(LEGACY_KEY);
    }
  }
  window.dispatchEvent(new CustomEvent("pipboy:character-profiles-changed"));
  return true;
}

export function cloneCharacterProfile(id) {
  const source = listCharacterProfiles().find((item) => item.id === String(id));
  if (!source) return null;
  const cloned = JSON.parse(JSON.stringify(source.data || {}));
  cloned.characterName = `${characterName(cloned)} Copy`;
  return createCharacterProfile(cloned, { activate: false });
}

export function getCharacterProfilesStorageAudit(data = {}) {
  const keys = Object.keys(data || {}).sort();
  return {
    fieldCount: keys.length,
    fields: keys,
    storesWholeForm: true,
  };
}

export { LEGACY_KEY, PROFILES_KEY, ACTIVE_ID_KEY };
