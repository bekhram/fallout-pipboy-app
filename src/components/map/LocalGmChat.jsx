import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";
import { getMapLanguageCode, mapUiText } from "./mapUiText.js";
import "./localGmChat.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_sessions_v3";
const LEGACY_CHAT_STORAGE_KEYS = [
  "fallout_pipboy_local_gm_sessions_v2",
  "fallout_pipboy_local_gm_chat_v1",
];

function readCharacter() {
  try {
    const raw = localStorage.getItem(CHARACTER_STORAGE_KEY);
    return raw ? JSON.parse(raw)?.data || null : null;
  } catch {
    return null;
  }
}

function readStore() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    }

    const previous = localStorage.getItem(LEGACY_CHAT_STORAGE_KEYS[0]);
    if (previous) {
      const parsed = JSON.parse(previous);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch {
    // Ignore corrupted or unavailable storage.
  }
  return {};
}

function writeStore(store) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage is optional for the active session.
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
        (location) => location.worldX === selectedWorldX && location.worldY === selectedWorldY
      )
    : null;

  return {
    sector: mapData?.title || mapData?.id || null,
    sectorOffset: worldOffset,
    localPosition: playerPosition || null,
    worldPosition: { x: worldX, y: worldY },
    currentTerrain: currentCell?.terrain || null,
    currentLocation: compactLocation(staticLocation) || currentCell?.poi || null,
    isStaticLocation: Boolean(staticLocation),
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
  if (world?.isStaticLocation && world?.currentLocation?.id) {
    return `location:${world.currentLocation.id}`;
  }
  if (world?.worldPosition) return `procedural:${world.worldPosition.x}:${world.worldPosition.y}`;
  return `procedural-sector:${world?.sector || "unknown"}`;
}

function normalizeEvents(events) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => event?.type && event?.title)
    .slice(0, 8)
    .map((event) => ({
      type: String(event.type),
      title: String(event.title),
      detail: String(event.detail || ""),
      status: String(event.status || "discovered"),
      at: Date.now(),
    }));
}

function mergeEvents(previous, incoming) {
  const next = [...(previous || [])];
  for (const event of normalizeEvents(incoming)) {
    const key = `${event.type}:${event.title}`.toLowerCase();
    const index = next.findIndex(
      (item) => `${item.type}:${item.title}`.toLowerCase() === key
    );
    if (index >= 0) next[index] = { ...next[index], ...event };
    else next.push(event);
  }
  return next.slice(-40);
}

function readSession(sessionKey, persistent) {
  if (!persistent) return { messages: [], events: [] };

  const store = readStore();
  const saved = store?.[sessionKey];
  if (saved) {
    return {
      messages: Array.isArray(saved.messages) ? saved.messages : [],
      events: Array.isArray(saved.events) ? saved.events : [],
    };
  }

  return { messages: [], events: [] };
}

function buildVisitedSessions() {
  return Object.entries(readStore())
    .filter(([key, session]) => {
      if (!Array.isArray(session?.messages) || session.messages.length === 0) return false;
      if (session?.persistent === true) return true;
      return key.startsWith("location:");
    })
    .map(([key, session]) => ({ key, ...session }))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

function sessionLabel(session, unknownLabel) {
  if (session?.location?.name) return session.location.name;
  if (session?.location?.id) return session.location.id.replaceAll("_", " ");
  return session?.key || unknownLabel;
}

function formatSessionTime(value, language) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(language || undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function LocalGmChat({ mapData, playerPosition, selectedCell, onWorldEvents }) {
  const { i18n } = useTranslation();
  const language = getMapLanguageCode(i18n.resolvedLanguage || i18n.language || "en");
  const tx = (key, vars) => mapUiText(language, key, vars);
  const rawCharacter = useMemo(() => readCharacter(), []);
  const character = useMemo(() => compactCharacter(rawCharacter), [rawCharacter]);
  const world = useMemo(
    () => buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData),
    [mapData, playerPosition, selectedCell, rawCharacter]
  );
  const isPersistentLocation = world.isStaticLocation === true;
  const currentSessionKey = useMemo(() => getSessionKey(world), [world]);

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [viewedSessionKey, setViewedSessionKey] = useState(null);
  const [messages, setMessages] = useState(
    () => readSession(currentSessionKey, isPersistentLocation).messages
  );
  const [events, setEvents] = useState(
    () => readSession(currentSessionKey, isPersistentLocation).events
  );
  const introStartedRef = useRef(new Set());

  const activeSessionKey = viewedSessionKey || currentSessionKey;
  const isArchiveView = activeSessionKey !== currentSessionKey;
  const visitedSessions = useMemo(() => buildVisitedSessions(), [version, messages, events]);
  const activeArchiveSession = useMemo(
    () => visitedSessions.find((session) => session.key === activeSessionKey) || null,
    [visitedSessions, activeSessionKey]
  );

  useEffect(() => {
    setViewedSessionKey(null);
    const session = readSession(currentSessionKey, isPersistentLocation);
    setMessages(session.messages);
    setEvents(session.events);
    setDraft("");
    setError("");
  }, [currentSessionKey, isPersistentLocation]);

  useEffect(() => {
    if (!isArchiveView) return;
    const session = readSession(activeSessionKey, true);
    setMessages(session.messages);
    setEvents(session.events);
    setDraft("");
    setError("");
  }, [activeSessionKey, isArchiveView]);

  function persist(nextMessages, incomingEvents = []) {
    const trimmedMessages = nextMessages.slice(-80);
    const nextEvents = mergeEvents(events, incomingEvents);
    setMessages(trimmedMessages);
    setEvents(nextEvents);

    if (isPersistentLocation) {
      const store = readStore();
      store[currentSessionKey] = {
        messages: trimmedMessages,
        events: nextEvents,
        persistent: true,
        updatedAt: Date.now(),
        location: {
          id: world.currentLocation?.id || null,
          name: world.currentLocation?.name || null,
          terrain: world.currentTerrain || null,
          worldPosition: world.worldPosition || null,
        },
      };
      writeStore(store);
      setVersion((value) => value + 1);
    }

    if (
      isPersistentLocation &&
      incomingEvents.length &&
      typeof onWorldEvents === "function"
    ) {
      onWorldEvents(normalizeEvents(incomingEvents), {
        sessionKey: currentSessionKey,
        world,
      });
    }
  }

  async function requestGm(message, history = []) {
    const response = await fetch("/api/auto-gm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        character,
        world,
        language,
        sessionKey: currentSessionKey,
        history: history.slice(-16),
        message,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `${tx("gmError")} (${response.status})`);
    return {
      text: data?.text || tx("gmEmpty"),
      events: Array.isArray(data?.events) ? data.events : [],
    };
  }

  async function startScene(history = []) {
    if (isSending || isArchiveView) return;
    setError("");
    setIsSending(true);
    try {
      const persistenceInstruction = isPersistentLocation
        ? "This is a static named world location. Treat prior discoveries and consequences as persistent."
        : "This is a procedural location. Treat this visit as temporary and do not assume discoveries persist after the character leaves.";
      const result = await requestGm(
        `Begin the local exploration scene now. ${persistenceInstruction} Use the supplied character sheet and global-map context. Briefly establish where the character is, what they immediately notice, and one clear situation or point of interest they can react to. Do not decide the character's actions for them. End by asking what they do.`,
        history
      );
      persist([...history, { role: "gm", text: result.text, at: Date.now() }], result.events);
    } catch (requestError) {
      setError(requestError?.message || tx("gmError"));
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
      const result = await requestGm(text, previousMessages);
      persist([...nextMessages, { role: "gm", text: result.text, at: Date.now() }], result.events);
    } catch (requestError) {
      setError(requestError?.message || tx("gmError"));
    } finally {
      setIsSending(false);
    }
  }

  function resetChat() {
    if (isArchiveView) return;
    if (isPersistentLocation) {
      const store = readStore();
      delete store[currentSessionKey];
      writeStore(store);
      setVersion((value) => value + 1);
    }
    setMessages([]);
    setEvents([]);
    setDraft("");
    setError("");
    introStartedRef.current.delete(currentSessionKey);
  }

  function openArchivedSession(key) {
    if (isSending) return;
    setViewedSessionKey(key === currentSessionKey ? null : key);
    setArchiveOpen(false);
  }

  const currentPlace =
    world.currentLocation?.name || world.currentLocation?.id || world.currentTerrain || tx("wasteland");
  const objective =
    world.selectedDestination?.location?.name ||
    world.selectedDestination?.location?.id ||
    world.trackedObjective?.name ||
    world.trackedObjective?.id ||
    tx("exploreArea");
  const displayedPlace = isArchiveView ? sessionLabel(activeArchiveSession, tx("unknownLocation")) : currentPlace;

  return (
    <section className="pip-local-gm">
      <header className="pip-local-gm__header">
        <div>
          <div className="pip-local-gm__eyebrow">{tx("local")} // {tx("autoGm")}</div>
          <h3>{isArchiveView ? tx("sessionArchive") : tx("falloutSession")}</h3>
          <div className="pip-local-gm__context">
            {displayedPlace}
            {!isArchiveView && world.worldPosition
              ? ` · ${tx("world")} ${world.worldPosition.x},${world.worldPosition.y}`
              : ""}
            {!isArchiveView
              ? ` · ${isPersistentLocation ? `${tx("static")} / ${tx("saved")}` : `${tx("procedural")} / ${tx("temp")}`}`
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
            {tx("visited")} ({visitedSessions.length})
          </button>
          {isArchiveView ? (
            <button type="button" className="pip-btn" onClick={() => setViewedSessionKey(null)} disabled={isSending}>
              {tx("current")}
            </button>
          ) : (
            <button type="button" className="pip-btn pip-local-gm__reset" onClick={resetChat} disabled={isSending}>
              {tx("newSession")}
            </button>
          )}
        </div>
      </header>

      {archiveOpen ? (
        <aside className="pip-local-gm__archive">
          <div className="pip-local-gm__archive-title">{tx("visitedStatic")}</div>
          {visitedSessions.length === 0 ? (
            <div className="pip-local-gm__archive-empty">{tx("noSavedLocations")}</div>
          ) : (
            <div className="pip-local-gm__archive-list">
              {visitedSessions.map((session) => (
                <button
                  type="button"
                  key={session.key}
                  className={`pip-local-gm__archive-item${session.key === activeSessionKey ? " is-active" : ""}`}
                  onClick={() => openArchivedSession(session.key)}
                >
                  <span className="pip-local-gm__archive-name">{sessionLabel(session, tx("unknownLocation"))}</span>
                  <span className="pip-local-gm__archive-meta">
                    {(session.messages || []).length} {tx("messages")} · {(session.events || []).length} {tx("discoveries")}
                    {formatSessionTime(session.updatedAt, language) ? ` · ${formatSessionTime(session.updatedAt, language)}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      ) : null}

      <div className="pip-local-gm__brief">
        <span>{tx("character")}: {character?.name || tx("notLoaded")}</span>
        <span>{tx("level")}: {character?.level ?? "-"}</span>
        <span>{tx("location")}: {displayedPlace}</span>
        <span>{isArchiveView ? tx("modeArchive") : `${tx("objective")}: ${objective}`}</span>
      </div>

      {events.length > 0 ? (
        <div className="pip-local-gm__discoveries">
          <div className="pip-local-gm__archive-title">{tx("discoveriesTitle")} ({events.length})</div>
          <div className="pip-local-gm__discovery-list">
            {events.slice(-8).reverse().map((event, index) => (
              <div
                className="pip-local-gm__discovery"
                key={`${event.type}-${event.title}-${index}`}
                title={event.detail || event.title}
              >
                <span>{event.type.toUpperCase()}</span>
                <strong>{event.title}</strong>
                <em>{event.status}</em>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pip-local-gm__messages" aria-live="polite">
        {messages.length === 0 && !isSending ? (
          <div className="pip-local-gm__empty">
            <strong>{tx("autoGmReady")}</strong>
            <p>{isPersistentLocation ? tx("staticHistory") : tx("proceduralTemp")}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <article
              key={`${message.at || index}-${index}`}
              className={`pip-local-gm__message pip-local-gm__message--${message.role}`}
            >
              <div className="pip-local-gm__speaker">{message.role === "gm" ? tx("autoGm") : tx("you")}</div>
              <div>{message.text}</div>
            </article>
          ))
        )}
        {isSending ? <div className="pip-local-gm__thinking">{tx("processing")}</div> : null}
      </div>

      {error ? <div className="pip-local-gm__error">{error}</div> : null}

      {isArchiveView ? (
        <div className="pip-local-gm__archive-note">{tx("archiveNote")}</div>
      ) : (
        <form className="pip-local-gm__composer" onSubmit={sendMessage}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={tx("whatDo")}
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
            {tx("send")}
          </button>
        </form>
      )}
    </section>
  );
}
