import React, { useEffect, useMemo, useRef, useState } from "react";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";
import "./localGmChat.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_sessions_v2";
const LEGACY_CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_chat_v1";

function readCharacter() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.data || null;
  } catch {
    return null;
  }
}

function readSessionStore() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionStore(store) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage is optional; the chat still works for the current session.
  }
}

function compactCharacter(character) {
  if (!character) return null;

  return {
    name: character.characterName || character.name || "Unknown wanderer",
    level: character.level ?? null,
    origin: character.origin || null,
    special: character.special || character.SPECIAL || null,
    skills: character.skills || null,
    taggedSkills: character.tagged_skills || null,
    hp: {
      current: character.currentHp ?? character.hpCurrent ?? null,
      max: character.maxHp ?? character.hpMax ?? null,
    },
    defense: character.defenseOverride || character.defense || null,
    statuses: character.statuses || null,
    injuries: character.injuries || null,
    perks: (character.perksAndTraits || []).slice(0, 20).map((perk) => ({
      name: perk?.name,
      rank: perk?.rank,
    })),
    inventory: (character.inventoryItems || []).slice(0, 30).map((item) => ({
      name: item?.name,
      quantity: item?.quantity,
    })),
  };
}

function compactLocation(location) {
  if (!location) return null;
  return {
    id: location.id || null,
    name: location.name || null,
    nameKey: location.nameKey || null,
    type: location.type || null,
    worldX: location.worldX ?? null,
    worldY: location.worldY ?? null,
    major: location.major ?? null,
  };
}

function buildWorldContext(mapData, playerPosition, selectedCell, savedMapData) {
  const currentCell = mapData?.cells?.find(
    (cell) => cell.x === playerPosition?.x && cell.y === playerPosition?.y
  );

  const worldOffset = mapData?.worldOffset || savedMapData?.worldOffset || { x: 0, y: 0 };
  const cols = mapData?.cols || 8;
  const rows = mapData?.rows || 8;
  const worldX = worldOffset.x * cols + (playerPosition?.x || 0);
  const worldY = worldOffset.y * rows + (playerPosition?.y || 0);

  const staticLocation = FALLOUT_4_LOCATIONS.find(
    (location) => location.worldX === worldX && location.worldY === worldY
  );

  const trackedLocation = FALLOUT_4_LOCATIONS.find(
    (location) => location.id === savedMapData?.trackedLocationId
  );

  const selectedWorldX = selectedCell ? worldOffset.x * cols + selectedCell.x : null;
  const selectedWorldY = selectedCell ? worldOffset.y * rows + selectedCell.y : null;
  const selectedStaticLocation = selectedCell
    ? FALLOUT_4_LOCATIONS.find(
        (location) =>
          location.worldX === selectedWorldX && location.worldY === selectedWorldY
      )
    : null;

  return {
    sector: mapData?.title || mapData?.id || null,
    sectorOffset: worldOffset,
    localPosition: playerPosition || null,
    worldPosition: { x: worldX, y: worldY },
    currentTerrain: currentCell?.terrain || null,
    currentLocation: compactLocation(staticLocation) || currentCell?.poi || null,
    trackedObjective: compactLocation(trackedLocation),
    selectedDestination: selectedCell
      ? {
          localX: selectedCell.x,
          localY: selectedCell.y,
          worldX: selectedWorldX,
          worldY: selectedWorldY,
          terrain: selectedCell.terrain,
          location: compactLocation(selectedStaticLocation) || selectedCell.poi || null,
        }
      : null,
  };
}

function getSessionKey(world) {
  if (world?.currentLocation?.id) return `location:${world.currentLocation.id}`;
  if (world?.worldPosition) return `world:${world.worldPosition.x}:${world.worldPosition.y}`;
  return `sector:${world?.sector || "unknown"}`;
}

function readSessionMessages(sessionKey) {
  const store = readSessionStore();
  const saved = store?.[sessionKey]?.messages;
  if (Array.isArray(saved)) return saved;

  try {
    const legacy = localStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
    if (!legacy) return [];
    const parsed = JSON.parse(legacy);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    store[sessionKey] = {
      messages: parsed.slice(-80),
      updatedAt: Date.now(),
      migratedFromLegacy: true,
    };
    writeSessionStore(store);
    localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY);
    return parsed.slice(-80);
  } catch {
    return [];
  }
}

function buildVisitedSessions() {
  const store = readSessionStore();
  return Object.entries(store)
    .filter(([, session]) => Array.isArray(session?.messages) && session.messages.length > 0)
    .map(([key, session]) => ({
      key,
      messages: session.messages,
      updatedAt: Number(session.updatedAt || 0),
      location: session.location || {},
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function sessionLabel(session) {
  if (session?.location?.name) return session.location.name;
  if (session?.location?.id) return session.location.id.replaceAll("_", " ");
  const position = session?.location?.worldPosition;
  if (position) return `World ${position.x},${position.y}`;
  return session?.key || "Unknown location";
}

function formatSessionTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function LocalGmChat({ mapData, playerPosition, selectedCell }) {
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveVersion, setArchiveVersion] = useState(0);
  const [viewedSessionKey, setViewedSessionKey] = useState(null);
  const introStartedRef = useRef(new Set());

  const rawCharacter = useMemo(() => readCharacter(), []);
  const character = useMemo(() => compactCharacter(rawCharacter), [rawCharacter]);
  const world = useMemo(
    () => buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData),
    [mapData, playerPosition, selectedCell, rawCharacter]
  );
  const currentSessionKey = useMemo(() => getSessionKey(world), [world]);
  const activeSessionKey = viewedSessionKey || currentSessionKey;
  const isArchiveView = activeSessionKey !== currentSessionKey;
  const [messages, setMessages] = useState(() => readSessionMessages(currentSessionKey));

  const visitedSessions = useMemo(() => buildVisitedSessions(), [archiveVersion, messages]);
  const activeArchiveSession = useMemo(
    () => visitedSessions.find((session) => session.key === activeSessionKey) || null,
    [visitedSessions, activeSessionKey]
  );

  useEffect(() => {
    setViewedSessionKey(null);
    setMessages(readSessionMessages(currentSessionKey));
    setDraft("");
    setError("");
  }, [currentSessionKey]);

  useEffect(() => {
    setMessages(readSessionMessages(activeSessionKey));
    setDraft("");
    setError("");
  }, [activeSessionKey]);

  function persist(nextMessages) {
    const trimmed = nextMessages.slice(-80);
    setMessages(trimmed);

    const store = readSessionStore();
    store[currentSessionKey] = {
      messages: trimmed,
      updatedAt: Date.now(),
      location: {
        id: world.currentLocation?.id || null,
        name: world.currentLocation?.name || null,
        terrain: world.currentTerrain || null,
        worldPosition: world.worldPosition || null,
      },
    };
    writeSessionStore(store);
    setArchiveVersion((value) => value + 1);
  }

  async function requestGm(message, history = []) {
    const response = await fetch("/api/auto-gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character,
        world,
        sessionKey: currentSessionKey,
        history: history.slice(-16),
        message,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `GM request failed (${response.status})`);
    return data?.text || "The GM did not return a response.";
  }

  async function startScene(history = []) {
    if (isSending || isArchiveView) return;
    setError("");
    setIsSending(true);

    try {
      const text = await requestGm(
        "Begin the local exploration scene now. Use the supplied character sheet and global-map context. Briefly establish where the character is, what they immediately notice, and one clear situation or point of interest they can react to. Do not decide the character's actions for them. End by asking what they do.",
        history
      );
      persist([...history, { role: "gm", text, at: Date.now() }]);
    } catch (requestError) {
      setError(requestError?.message || "Could not contact Auto GM.");
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    if (isArchiveView || messages.length > 0 || introStartedRef.current.has(currentSessionKey)) return;
    introStartedRef.current.add(currentSessionKey);
    startScene([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionKey, messages.length, isArchiveView]);

  async function sendMessage(event) {
    event?.preventDefault?.();
    const text = draft.trim();
    if (!text || isSending || isArchiveView) return;

    const userMessage = { role: "user", text, at: Date.now() };
    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];
    persist(nextMessages);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const gmText = await requestGm(text, previousMessages);
      persist([...nextMessages, { role: "gm", text: gmText, at: Date.now() }]);
    } catch (requestError) {
      setError(requestError?.message || "Could not contact Auto GM.");
    } finally {
      setIsSending(false);
    }
  }

  function resetChat() {
    if (isArchiveView) return;
    const store = readSessionStore();
    delete store[currentSessionKey];
    writeSessionStore(store);
    setMessages([]);
    setDraft("");
    setError("");
    setArchiveVersion((value) => value + 1);
    introStartedRef.current.delete(currentSessionKey);
  }

  function openArchivedSession(key) {
    if (isSending) return;
    setViewedSessionKey(key === currentSessionKey ? null : key);
    setArchiveOpen(false);
  }

  function returnToCurrent() {
    if (isSending) return;
    setViewedSessionKey(null);
    setArchiveOpen(false);
  }

  const currentPlace =
    world.currentLocation?.name || world.currentLocation?.id || world.currentTerrain || "Wasteland";
  const objective =
    world.selectedDestination?.location?.name ||
    world.selectedDestination?.location?.id ||
    world.trackedObjective?.name ||
    world.trackedObjective?.id ||
    "Explore area";
  const displayedPlace = isArchiveView ? sessionLabel(activeArchiveSession) : currentPlace;

  return (
    <section className="pip-local-gm">
      <header className="pip-local-gm__header">
        <div>
          <div className="pip-local-gm__eyebrow">LOCAL // AUTO GM</div>
          <h3>{isArchiveView ? "Session Archive" : "Fallout 2D20 Session"}</h3>
          <div className="pip-local-gm__context">
            {displayedPlace}
            {!isArchiveView && world.worldPosition
              ? ` · WORLD ${world.worldPosition.x},${world.worldPosition.y}`
              : ""}
          </div>
        </div>
        <div className="pip-local-gm__header-actions">
          <button
            type="button"
            className="pip-btn"
            onClick={() => setArchiveOpen((value) => !value)}
            disabled={isSending}
          >
            VISITED ({visitedSessions.length})
          </button>
          {isArchiveView ? (
            <button type="button" className="pip-btn" onClick={returnToCurrent} disabled={isSending}>
              CURRENT
            </button>
          ) : (
            <button
              type="button"
              className="pip-btn pip-local-gm__reset"
              onClick={resetChat}
              disabled={isSending}
            >
              NEW SESSION
            </button>
          )}
        </div>
      </header>

      {archiveOpen ? (
        <aside className="pip-local-gm__archive">
          <div className="pip-local-gm__archive-title">VISITED LOCATIONS</div>
          {visitedSessions.length === 0 ? (
            <div className="pip-local-gm__archive-empty">No saved local sessions yet.</div>
          ) : (
            <div className="pip-local-gm__archive-list">
              {visitedSessions.map((session) => (
                <button
                  type="button"
                  key={session.key}
                  className={`pip-local-gm__archive-item${session.key === activeSessionKey ? " is-active" : ""}`}
                  onClick={() => openArchivedSession(session.key)}
                >
                  <span className="pip-local-gm__archive-name">{sessionLabel(session)}</span>
                  <span className="pip-local-gm__archive-meta">
                    {session.messages.length} messages
                    {formatSessionTime(session.updatedAt) ? ` · ${formatSessionTime(session.updatedAt)}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      ) : null}

      <div className="pip-local-gm__brief">
        <span>CHARACTER: {character?.name || "Not loaded"}</span>
        <span>LEVEL: {character?.level ?? "-"}</span>
        <span>LOCATION: {displayedPlace}</span>
        <span>{isArchiveView ? "MODE: ARCHIVE / READ ONLY" : `OBJECTIVE: ${objective}`}</span>
      </div>

      <div className="pip-local-gm__messages" aria-live="polite">
        {messages.length === 0 && !isSending ? (
          <div className="pip-local-gm__empty">
            <strong>AUTO GM READY.</strong>
            <p>The GM will start this location's scene using your character and WORLD-map context.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.at || index}-${index}`}
              className={`pip-local-gm__message pip-local-gm__message--${message.role}`}
            >
              <div className="pip-local-gm__speaker">{message.role === "gm" ? "AUTO GM" : "YOU"}</div>
              <div>{message.text}</div>
            </article>
          ))
        )}
        {isSending ? <div className="pip-local-gm__thinking">AUTO GM IS PROCESSING...</div> : null}
      </div>

      {error ? <div className="pip-local-gm__error">{error}</div> : null}

      {isArchiveView ? (
        <div className="pip-local-gm__archive-note">
          ARCHIVE VIEW — this journal is read-only. Return to CURRENT to continue playing at your character's actual WORLD position.
        </div>
      ) : (
        <form className="pip-local-gm__composer" onSubmit={sendMessage}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="What do you do?"
            rows={3}
            disabled={isSending}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage(event);
              }
            }}
          />
          <button type="submit" className="pip-action-button" disabled={!draft.trim() || isSending}>
            SEND
          </button>
        </form>
      )}
    </section>
  );
}
