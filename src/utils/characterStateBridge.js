let currentCharacter = null;
let currentSetter = null;

export function setCharacterStateBridge(character, setter) {
  currentCharacter = character && typeof character === "object" ? character : null;
  currentSetter = typeof setter === "function" ? setter : null;
}

export function clearCharacterStateBridge(setter = null) {
  if (setter && currentSetter && setter !== currentSetter) return;
  currentCharacter = null;
  currentSetter = null;
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
