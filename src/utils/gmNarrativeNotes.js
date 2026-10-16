// GM-only narrative notes are stored in the host browser. Never put this
// data in tacticalScene/environment: those objects are synced to players.
export const GM_NARRATIVE_STORAGE_PREFIX = "pip2d20:gm:narrative:v1";

export function gmNarrativeStorageKey({
  campaignId = "", sceneId = "", type = "", seed = "",
  kind = "", id = "", language = "en",
} = {}) {
  // JSON serialization avoids collisions between markers, locations and IDs.
  return GM_NARRATIVE_STORAGE_PREFIX + ":" + JSON.stringify([
    String(campaignId || "local"),
    String(sceneId || "scene"),
    String(type || "manual"),
    String(seed || "manual"),
    String(kind || ""),
    String(id || ""),
    String(language || "en"),
  ]);
}

export function readGmNarrative(key, initialGmText = "") {
  let stored = null;
  try {
    stored = typeof window !== "undefined"
      ? JSON.parse(window.localStorage.getItem(key) || "null")
      : null;
  } catch {
    // Private browsing or corrupt previous data should not break the map.
  }
  return {
    playerText: typeof stored?.playerText === "string" ? stored.playerText : "",
    gmText: typeof stored?.gmText === "string"
      ? stored.gmText
      : String(initialGmText || "").slice(0, 6000),
    guidance: typeof stored?.guidance === "string" ? stored.guidance : "",
  };
}

export function writeGmNarrative(key, draft) {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, JSON.stringify({
      playerText: String(draft?.playerText || "").slice(0, 6000),
      gmText: String(draft?.gmText || "").slice(0, 6000),
      guidance: String(draft?.guidance || "").slice(0, 2000),
    }));
    return true;
  } catch {
    return false;
  }
}

export function splitPlayerNarration(number, narration, maxLength = 1080) {
  // This receives ONLY the explicitly approved player-facing field.
  // GM notes and hidden source data are never included in chat.
  const value = String(narration || "").trim();
  if (!value) return [];
  const label = "[" + (Number.isFinite(Number(number)) && Number(number) > 0
    ? "#" + Math.trunc(Number(number))
    : "Scene") + "] ";
  const chunks = [];
  let remaining = value;
  while (remaining) {
    const prefix = chunks.length === 0 ? label : "";
    const available = Math.max(1, maxLength - prefix.length);
    if (remaining.length <= available) {
      chunks.push(prefix + remaining);
      break;
    }
    let cut = remaining.lastIndexOf("\n", available);
    if (cut < Math.floor(available * 0.55)) cut = remaining.lastIndexOf(" ", available);
    if (cut < Math.floor(available * 0.55)) cut = available;
    chunks.push(prefix + remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return chunks;
}

export function deliverPlayerNarration(session, number, playerText) {
  if (typeof session?.sendChat !== "function") return false;
  const chunks = splitPlayerNarration(number, playerText);
  if (!chunks.length) return false;
  for (const chunk of chunks) {
    if (session.sendChat(chunk) !== true) return false;
  }
  return true;
}

export function gmNarrativeGenerationMessage({ kind, number, name, guidance } = {}) {
  // This is a request to GM's existing structured Auto GM endpoint.
  // It returns separate narration (players) and gmNotes (GM only).
  return [
    "Describe ONLY the following numbered tactical map element, not the entire encounter.",
    "Target: " + String(kind || "location") + " #" + String(number || "?") + " — " + String(name || "Unknown"),
    "Produce a vivid but concise player-facing narration and a separate private GM explanation.",
    "Player narration may describe only what the party can currently perceive.",
    "Do NOT disclose unrevealed enemy species/count, trap identity, hidden item, stats, map coordinates, tactics or GM secrets.",
    "GM notes may identify threats, intended interactions, checks, tactics and clues from the supplied source.",
    "Do not decide player actions, damage, dice results, or unexplored locations.",
    guidance ? "GM instructions: " + String(guidance).slice(0, 2000) : "",
    "Return the structured narration and gmNotes in the selected language.",
  ].filter(Boolean).join("\n");
}
