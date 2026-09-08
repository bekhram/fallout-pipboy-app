const CHARACTER_SAVE_KEY = "fallout_pipboy_v4_last_character";

let currentCharacter = null;
let currentSetter = null;
let currentSignature = "";
let lastRequestedSignature = "";
let storageBridgeInstalled = false;
let bridgeSyncing = false;

function signature(value) {
  try { return JSON.stringify(value || {}); } catch { return ""; }
}

function formFromStoredValue(value) {
  try {
    const parsed = JSON.parse(String(value || "null"));
    const form = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
    return form && typeof form === "object" ? form : null;
  } catch {
    return null;
  }
}

function installStorageBridge() {
  if (storageBridgeInstalled || typeof window === "undefined" || typeof Storage === "undefined") return;
  const originalSetItem = Storage.prototype.setItem;
  if (typeof originalSetItem !== "function") return;

  Storage.prototype.setItem = function pip2d20CharacterAwareSetItem(key, value) {
    originalSetItem.call(this, key, value);
    if (key !== CHARACTER_SAVE_KEY || bridgeSyncing || typeof currentSetter !== "function") return;

    const nextForm = formFromStoredValue(value);
    if (!nextForm) return;
    const nextSignature = signature(nextForm);
    if (!nextSignature || nextSignature === currentSignature || nextSignature === lastRequestedSignature) return;

    lastRequestedSignature = nextSignature;
    bridgeSyncing = true;
    try {
      currentSetter(() => nextForm);
    } finally {
      Promise.resolve().then(() => { bridgeSyncing = false; });
    }
  };
  storageBridgeInstalled = true;
}

export function setCharacterStateBridge(character, setter) {
  installStorageBridge();
  currentCharacter = character && typeof character === "object" ? character : null;
  currentSetter = typeof setter === "function" ? setter : null;
  currentSignature = signature(currentCharacter);
  lastRequestedSignature = currentSignature;
}

export function clearCharacterStateBridge(setter = null) {
  if (setter && currentSetter && setter !== currentSetter) return;
  currentCharacter = null;
  currentSetter = null;
  currentSignature = "";
  lastRequestedSignature = "";
}

export function readCharacterStateBridge() {
  return currentCharacter;
}

export function updateCharacterStateBridge(updater) {
  if (typeof currentSetter !== "function") return false;
  currentSetter((previous) => {
    const next = typeof updater === "function" ? updater(previous || currentCharacter || {}) : updater;
    return next && typeof next === "object" ? next : previous;
  });
  return true;
}
