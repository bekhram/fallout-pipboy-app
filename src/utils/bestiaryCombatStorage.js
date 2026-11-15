export const BESTIARY_COMBAT_STORAGE_KEY = "fallout_pipboy_bestiary_combat_v1";
export const BESTIARY_COMBAT_CHANGED_EVENT = "pipboy:bestiary-combat-changed";

function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function readStore() {
  if (typeof window === "undefined") return { bySession: {}, latestSessionKey: null };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BESTIARY_COMBAT_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object"
      ? { bySession: parsed.bySession || {}, latestSessionKey: parsed.latestSessionKey || null }
      : { bySession: {}, latestSessionKey: null };
  } catch {
    return { bySession: {}, latestSessionKey: null };
  }
}

export function writeStore(store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BESTIARY_COMBAT_STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent(BESTIARY_COMBAT_CHANGED_EVENT));
  } catch {
    // Optional local combat persistence.
  }
}

export function saveCombatForSession(sessionKey, combat) {
  if (!sessionKey || !combat) return;
  const store = readStore();
  const existing = store.bySession?.[sessionKey];
  store.bySession[sessionKey] = {
    ...clone(combat),
    log: Array.isArray(combat.log) ? combat.log : (existing?.log || []),
    lastAction: combat.lastAction || existing?.lastAction || null,
    updatedAt: Date.now(),
  };
  store.latestSessionKey = sessionKey;
  writeStore(store);
}

export function readCombatForSession(sessionKey) {
  if (!sessionKey) return null;
  const store = readStore();
  return store.bySession?.[sessionKey] || null;
}

export function readLatestCombat() {
  const store = readStore();
  const key = store.latestSessionKey;
  if (!key) return null;
  const combat = store.bySession?.[key] || null;
  return combat ? { sessionKey: key, ...combat } : null;
}
