import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FALLOUT_4_LOCATIONS } from "../../data/map/bostonMap.js";
import { getMapLanguageCode, mapUiText } from "./mapUiText.js";
import LocalSkillCheck from "./LocalSkillCheck.jsx";
import "./localGmChat.css";

const CHARACTER_STORAGE_KEY = "fallout_pipboy_v4_last_character";
const CHAT_STORAGE_KEY = "fallout_pipboy_local_gm_sessions_v3";
const LEGACY_CHAT_STORAGE_KEYS = [
  "fallout_pipboy_local_gm_sessions_v2",
  "fallout_pipboy_local_gm_chat_v1",
];

const QUICK_ACTIONS = {
  en: [
    { id: "look", label: "LOOK AROUND", prompt: "I carefully look around and assess the immediate area." },
    { id: "search", label: "SEARCH", prompt: "I search the immediate area for useful items, hidden details, tracks, or hazards." },
    { id: "talk", label: "TALK", prompt: "I try to talk to the nearest relevant NPC or creature that can communicate." },
    { id: "interact", label: "INTERACT", prompt: "I interact with the most relevant nearby door, terminal, container, mechanism, or point of interest." },
    { id: "move", label: "MOVE ON", prompt: "I move deeper into the location, following the most natural unexplored route." },
    { id: "leave", label: "LEAVE", prompt: "I try to safely leave this local location and return to travelling in the world." },
  ],
  ru: [
    { id: "look", label: "ОСМОТРЕТЬСЯ", prompt: "Я внимательно осматриваюсь и оцениваю ближайшую обстановку." },
    { id: "search", label: "ОБЫСКАТЬ", prompt: "Я обыскиваю ближайшую область в поисках полезных предметов, скрытых деталей, следов или опасностей." },
    { id: "talk", label: "ПОГОВОРИТЬ", prompt: "Я пытаюсь поговорить с ближайшим подходящим NPC или существом, которое умеет общаться." },
    { id: "interact", label: "ВЗАИМОДЕЙСТВОВАТЬ", prompt: "Я взаимодействую с ближайшей важной дверью, терминалом, контейнером, механизмом или точкой интереса." },
    { id: "move", label: "ИДТИ ДАЛЬШЕ", prompt: "Я продвигаюсь глубже в локацию по наиболее естественному неисследованному пути." },
    { id: "leave", label: "УЙТИ", prompt: "Я пытаюсь безопасно покинуть локальную локацию и вернуться к путешествию по миру." },
  ],
  uk: [
    { id: "look", label: "ОЗИРНУТИСЯ", prompt: "Я уважно оглядаюся та оцінюю найближчу обстановку." },
    { id: "search", label: "ОБШУКАТИ", prompt: "Я обшукую найближчу область у пошуках корисних предметів, прихованих деталей, слідів або небезпек." },
    { id: "talk", label: "ПОГОВОРИТИ", prompt: "Я намагаюся поговорити з найближчим доречним NPC або істотою, яка може спілкуватися." },
    { id: "interact", label: "ВЗАЄМОДІЯТИ", prompt: "Я взаємодію з найближчими важливими дверима, терміналом, контейнером, механізмом або точкою інтересу." },
    { id: "move", label: "ЙТИ ДАЛІ", prompt: "Я просуваюся глибше в локацію найбільш природним недослідженим шляхом." },
    { id: "leave", label: "ПІТИ", prompt: "Я намагаюся безпечно залишити локальну локацію та повернутися до подорожі світом." },
  ],
  pl: [
    { id: "look", label: "ROZEJRZYJ SIĘ", prompt: "Uważnie rozglądam się i oceniam najbliższe otoczenie." },
    { id: "search", label: "PRZESZUKAJ", prompt: "Przeszukuję najbliższy obszar w poszukiwaniu przydatnych przedmiotów, ukrytych szczegółów, śladów lub zagrożeń." },
    { id: "talk", label: "POROZMAWIAJ", prompt: "Próbuję porozmawiać z najbliższym odpowiednim NPC lub istotą, która potrafi się komunikować." },
    { id: "interact", label: "WEJDŹ W INTERAKCJĘ", prompt: "Wchodzę w interakcję z najważniejszymi pobliskimi drzwiami, terminalem, pojemnikiem, mechanizmem lub punktem zainteresowania." },
    { id: "move", label: "IDŹ DALEJ", prompt: "Idę głębiej w lokację najbardziej naturalną, niezbadana trasą." },
    { id: "leave", label: "ODEJDŹ", prompt: "Próbuję bezpiecznie opuścić lokalną lokację i wrócić do podróżowania po świecie." },
  ],
};

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

  const weapons = (character.weapons || []).slice(0, 20).map((weapon) => ({
    name: weapon?.name || null,
    skill: weapon?.skill || weapon?.skillName || null,
    damage: weapon?.damage ?? null,
    damageType: weapon?.damageType || weapon?.type || null,
    rate: weapon?.rate ?? null,
    range: weapon?.range || null,
    ammo: weapon?.ammo || null,
    effects: weapon?.effects || weapon?.damageEffects || null,
    qualities: weapon?.qualities || null,
    mods: weapon?.mods || weapon?.modifications || null,
  }));

  const armor = Object.fromEntries(
    Object.entries(character.armor || {}).map(([part, values]) => [
      part,
      {
        name: values?.name || values?.armorName || null,
        physical: values?.physical ?? values?.physicalResistance ?? null,
        energy: values?.energy ?? values?.energyResistance ?? null,
        radiation: values?.radiation ?? values?.radiationResistance ?? null,
        status: values?.status || null,
        mods: values?.mods || values?.modifications || null,
      },
    ])
  );

  return {
    name: character.characterName || character.name || "Unknown wanderer",
    level: character.level ?? null,
    origin: character.origin || null,
    special: character.special || character.SPECIAL || null,
    skills: character.skills || null,
    hp: {
      current: character.currentHp ?? character.hpCurrent ?? null,
      max: character.maxHp ?? character.hpMax ?? character.maxHpOverride ?? null,
      radiation: character.radiationHp ?? null,
    },
    defense: character.defenseOverride || character.defense || null,
    resistances: {
      physical: character.physicalResistance ?? character.physicalDR ?? null,
      energy: character.energyResistance ?? character.energyDR ?? null,
      radiation: character.radiationResistance ?? character.radiationDR ?? null,
    },
    armor,
    weapons,
    statuses: character.statuses || null,
    injuries: character.injuries || null,
    perks: (character.perksAndTraits || []).slice(0, 30).map((perk) => ({
      name: perk?.name,
      rank: perk?.rank,
      description: perk?.description || null,
    })),
    inventory: (character.inventoryItems || []).slice(0, 50).map((item) => ({
      name: item?.name,
      category: item?.category || null,
      quantity: item?.quantity,
      effect: item?.effect || item?.description || null,
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

function buildLocationState(events, persistent) {
  const facts = (Array.isArray(events) ? events : []).slice(-40).map((event) => ({
    type: String(event.type || ""),
    title: String(event.title || ""),
    detail: String(event.detail || ""),
    status: String(event.status || "discovered"),
  }));
  return { persistent: persistent === true, facts };
}

function readSession(sessionKey, persistent) {
  if (!persistent) return { messages: [], events: [], check: null };

  const store = readStore();
  const saved = store?.[sessionKey];
  if (saved) {
    return {
      messages: Array.isArray(saved.messages) ? saved.messages : [],
      events: Array.isArray(saved.events) ? saved.events : [],
      check: saved.check && typeof saved.check === "object" ? saved.check : null,
    };
  }

  return { messages: [], events: [], check: null };
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
  const quickActions = QUICK_ACTIONS[language] || QUICK_ACTIONS.en;
  const rawCharacter = useMemo(() => readCharacter(), []);
  const character = useMemo(() => compactCharacter(rawCharacter), [rawCharacter]);
  const world = useMemo(
    () => buildWorldContext(mapData, playerPosition, selectedCell, rawCharacter?.mapData),
    [mapData, playerPosition, selectedCell, rawCharacter]
  );
  const isPersistentLocation = world.isStaticLocation === true;
  const currentSessionKey = useMemo(() => getSessionKey(world), [world]);
  const initialSession = useMemo(
    () => readSession(currentSessionKey, isPersistentLocation),
    [currentSessionKey, isPersistentLocation]
  );

  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [viewedSessionKey, setViewedSessionKey] = useState(null);
  const [messages, setMessages] = useState(() => initialSession.messages);
  const [events, setEvents] = useState(() => initialSession.events);
  const [pendingCheck, setPendingCheck] = useState(() => initialSession.check);
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
    setPendingCheck(session.check);
    setDraft("");
    setError("");
  }, [currentSessionKey, isPersistentLocation]);

  useEffect(() => {
    if (!isArchiveView) return;
    const session = readSession(activeSessionKey, true);
    setMessages(session.messages);
    setEvents(session.events);
    setPendingCheck(null);
    setDraft("");
    setError("");
  }, [activeSessionKey, isArchiveView]);

  function persist(nextMessages, incomingEvents = [], nextCheck = pendingCheck) {
    const trimmedMessages = nextMessages.slice(-80);
    const nextEvents = mergeEvents(events, incomingEvents);
    setMessages(trimmedMessages);
    setEvents(nextEvents);

    if (isPersistentLocation) {
      const store = readStore();
      store[currentSessionKey] = {
        messages: trimmedMessages,
        events: nextEvents,
        check: nextCheck || null,
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
        locationState: buildLocationState(events, isPersistentLocation),
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
      check: data?.check && typeof data.check === "object" ? data.check : null,
    };
  }

  async function startScene(history = []) {
    if (isSending || isArchiveView) return;
    setError("");
    setIsSending(true);
    try {
      const persistenceInstruction = isPersistentLocation
        ? "This is a static named world location. Continue its saved discoveries and consequences exactly as established."
        : "This is a procedural location. Treat this visit as temporary and do not assume discoveries persist after the character leaves.";
      const result = await requestGm(
        `Begin or continue the local exploration scene now. ${persistenceInstruction} Use the supplied character sheet, global-map context, and structured location state. Do not reintroduce already resolved threats or collected loot unless the saved state explicitly supports it. Briefly establish the immediate situation without deciding the character's actions. End by asking what they do, or request one skill check if the next outcome genuinely depends on it.`,
        history
      );
      setPendingCheck(result.check);
      persist(
        [...history, { role: "gm", text: result.text, at: Date.now() }],
        result.events,
        result.check
      );
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

  async function sendText(text, options = {}) {
    const cleanText = String(text || "").trim();
    if (!cleanText || isSending || isArchiveView) return;

    const clearCheck = options.clearCheck === true;
    const checkForMessage = clearCheck ? null : pendingCheck;
    const userMessage = { role: "user", text: cleanText, at: Date.now() };
    const previousMessages = messages;
    const nextMessages = [...previousMessages, userMessage];

    if (clearCheck) setPendingCheck(null);
    persist(nextMessages, [], checkForMessage);
    setDraft("");
    setError("");
    setIsSending(true);

    try {
      const result = await requestGm(cleanText, previousMessages);
      setPendingCheck(result.check);
      persist(
        [...nextMessages, { role: "gm", text: result.text, at: Date.now() }],
        result.events,
        result.check
      );
    } catch (requestError) {
      setError(requestError?.message || tx("gmError"));
    } finally {
      setIsSending(false);
    }
  }

  async function sendMessage(event) {
    event?.preventDefault?.();
    await sendText(draft);
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
    setPendingCheck(null);
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
  const displayedPlace = isArchiveView
    ? sessionLabel(activeArchiveSession, tx("unknownLocation"))
    : currentPlace;

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

      {!isArchiveView && pendingCheck ? (
        <LocalSkillCheck
          key={pendingCheck.id || `${pendingCheck.attribute}-${pendingCheck.skill}`}
          check={pendingCheck}
          character={rawCharacter}
          language={language}
          disabled={isSending}
          onSubmit={(text) => sendText(text, { clearCheck: true })}
        />
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
        <>
          <div className="pip-local-gm__quick-actions" aria-label="Quick actions">
            {quickActions.map((action) => (
              <button
                type="button"
                key={action.id}
                className="pip-local-gm__quick-action"
                disabled={isSending || Boolean(pendingCheck)}
                onClick={() => sendText(action.prompt)}
              >
                {action.label}
              </button>
            ))}
          </div>
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
        </>
      )}
    </section>
  );
}
