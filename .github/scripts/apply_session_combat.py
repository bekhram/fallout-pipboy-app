from pathlib import Path

hook = r'''import { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { getDerivedStats } from "../utils/characterMath.js";

export const SESSION_CODE_LENGTH = 6;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HOST_PREFIX = "pip2d20-session-";
const MAX_FEED = 120;
const DEFAULT_AP_MAX = 6;

const EMPTY_COMBAT = {
  active: false,
  round: 0,
  index: -1,
  activeActorId: null,
  order: [],
  npcs: [],
  ap: 0,
  apMax: DEFAULT_AP_MAX,
  startedAt: null,
};

export function normalizeSessionCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SESSION_CODE_LENGTH);
}

function makeSessionCode() {
  const values = new Uint32Array(SESSION_CODE_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) values[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

function getHostPeerId(code) {
  return `${HOST_PREFIX}${String(code || "").toLowerCase()}`;
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function createCharacterSnapshot(form) {
  if (!form) return null;
  const derived = getDerivedStats(form);
  const characterName = getCharacterName(form);
  const hasCharacter = Boolean(characterName || form?.origin || form?.level);
  if (!hasCharacter) return null;

  const statuses = Object.entries(form?.statuses || {})
    .filter(([, active]) => Boolean(active))
    .map(([key]) => key)
    .slice(0, 12);

  return {
    name: characterName || "Unnamed",
    origin: String(form?.origin || ""),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    initiative: Math.max(0, Number(derived?.initiative || 0)),
    statuses,
    updatedAt: new Date().toISOString(),
  };
}

function makePlayerPacket(name, form) {
  return {
    name: String(name || "Player").trim().slice(0, 40) || "Player",
    character: createCharacterSnapshot(form),
  };
}

function safeClose(connection) {
  try { connection?.close?.(); } catch { /* Ignore cleanup errors. */ }
}

function makeId(prefix = "evt") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value, maxLength = 600) {
  return String(value || "").trim().slice(0, maxLength);
}

function clampNumber(value, min, max) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : min;
  return Math.max(min, Math.min(max, safe));
}

function sanitizeRollPayload(roll) {
  if (!roll || typeof roll !== "object") return null;
  return {
    diceType: roll.diceType === "d6" ? "d6" : "d20",
    rollType: cleanText(roll.rollType, 30),
    label: cleanText(roll.label, 100),
    diceValues: Array.isArray(roll.diceValues) ? roll.diceValues.slice(0, 50) : [],
    successes: Number.isFinite(Number(roll.successes)) ? Number(roll.successes) : null,
    complications: Number.isFinite(Number(roll.complications)) ? Number(roll.complications) : 0,
    difficulty: Number.isFinite(Number(roll.difficulty)) ? Number(roll.difficulty) : null,
    targetNumber: Number.isFinite(Number(roll.targetNumber)) ? Number(roll.targetNumber) : null,
    outcome: roll.outcome === "success" || roll.outcome === "failure" ? roll.outcome : "",
    hitLocation: roll.hitLocation && typeof roll.hitLocation === "object"
      ? { label: cleanText(roll.hitLocation.label, 30), value: Number(roll.hitLocation.value || 0) }
      : null,
    totalDamage: Number.isFinite(Number(roll.totalDamage)) ? Number(roll.totalDamage) : null,
    totalEffects: Number.isFinite(Number(roll.totalEffects)) ? Number(roll.totalEffects) : null,
    effects: Array.isArray(roll.effects) ? roll.effects.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 12) : [],
    reroll: Boolean(roll.reroll),
    source: cleanText(roll.source, 30),
    timestamp: roll.timestamp || new Date().toISOString(),
  };
}

function makeFeedItem({ type, sender = "", text = "", event = "", roll = null }) {
  return {
    id: makeId(type || "evt"),
    type,
    sender: cleanText(sender, 40),
    text: cleanText(text, 600),
    event: cleanText(event, 30),
    roll: roll ? sanitizeRollPayload(roll) : null,
    timestamp: new Date().toISOString(),
  };
}

function sanitizeNpc(npc) {
  if (!npc || typeof npc !== "object") return null;
  const name = cleanText(npc.name, 60);
  if (!name) return null;
  return {
    id: cleanText(npc.id, 100) || makeId("npc"),
    name,
    initiative: clampNumber(npc.initiative, 0, 99),
  };
}

function sanitizeActor(actor) {
  if (!actor || typeof actor !== "object") return null;
  const id = cleanText(actor.id, 140);
  const name = cleanText(actor.name, 60);
  if (!id || !name) return null;
  return {
    id,
    kind: actor.kind === "npc" ? "npc" : "player",
    name,
    initiative: clampNumber(actor.initiative, 0, 99),
    peerId: actor.kind === "npc" ? null : cleanText(actor.peerId, 140),
  };
}

function sanitizeCombatState(value) {
  if (!value || typeof value !== "object") return { ...EMPTY_COMBAT };
  const apMax = clampNumber(value.apMax ?? DEFAULT_AP_MAX, 1, 12);
  return {
    active: Boolean(value.active),
    round: Math.max(0, Math.floor(Number(value.round || 0))),
    index: Number.isFinite(Number(value.index)) ? Math.floor(Number(value.index)) : -1,
    activeActorId: value.activeActorId ? cleanText(value.activeActorId, 140) : null,
    order: Array.isArray(value.order) ? value.order.map(sanitizeActor).filter(Boolean).slice(0, 60) : [],
    npcs: Array.isArray(value.npcs) ? value.npcs.map(sanitizeNpc).filter(Boolean).slice(0, 40) : [],
    ap: clampNumber(value.ap, 0, apMax),
    apMax,
    startedAt: value.startedAt || null,
  };
}

function sortActors(actors) {
  return [...actors].sort((a, b) =>
    Number(b.initiative || 0) - Number(a.initiative || 0)
    || (a.kind === b.kind ? 0 : a.kind === "player" ? -1 : 1)
    || String(a.name).localeCompare(String(b.name))
  );
}

export default function useSharedSession(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [sceneMessage, setSceneMessage] = useState("");
  const [feed, setFeed] = useState([]);
  const [combat, setCombat] = useState({ ...EMPTY_COMBAT });

  const peerRef = useRef(null);
  const hostConnectionRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const playersRef = useRef([]);
  const sceneRef = useRef("");
  const feedRef = useRef([]);
  const combatRef = useRef({ ...EMPTY_COMBAT });
  const codeRef = useRef("");
  const formRef = useRef(form);
  const playerNameRef = useRef("");
  const autoSyncTimerRef = useRef(null);

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { sceneRef.current = sceneMessage; }, [sceneMessage]);
  useEffect(() => { feedRef.current = feed; }, [feed]);
  useEffect(() => { combatRef.current = combat; }, [combat]);

  const destroyNetwork = () => {
    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
    connectionsRef.current.forEach((connection) => safeClose(connection));
    connectionsRef.current.clear();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    try { peerRef.current?.destroy?.(); } catch { /* Ignore cleanup errors. */ }
    peerRef.current = null;
  };

  useEffect(() => () => destroyNetwork(), []);

  const broadcastState = () => {
    const payload = {
      type: "session_state",
      sessionCode: codeRef.current,
      players: playersRef.current,
      sceneMessage: sceneRef.current,
      feed: feedRef.current,
      combat: combatRef.current,
      sentAt: new Date().toISOString(),
    };
    connectionsRef.current.forEach((connection) => {
      if (connection?.open) connection.send(payload);
    });
  };

  const setHostFeed = (nextFeed) => {
    const capped = nextFeed.slice(-MAX_FEED);
    feedRef.current = capped;
    setFeed(capped);
    window.setTimeout(broadcastState, 0);
  };

  const appendHostFeed = (item) => setHostFeed([...feedRef.current, item]);

  const setHostCombat = (nextCombat, feedItem = null) => {
    const safe = sanitizeCombatState(nextCombat);
    combatRef.current = safe;
    setCombat(safe);
    if (feedItem) appendHostFeed(feedItem);
    else window.setTimeout(broadcastState, 0);
    return safe;
  };

  const upsertPlayer = (peerId, packet) => {
    const nextPlayer = {
      peerId,
      name: cleanText(packet?.name || "Player", 40) || "Player",
      character: packet?.character || null,
      updatedAt: new Date().toISOString(),
    };
    const existed = playersRef.current.some((item) => item.peerId === peerId);
    const next = existed
      ? playersRef.current.map((item) => (item.peerId === peerId ? { ...item, ...nextPlayer } : item))
      : [...playersRef.current, nextPlayer];
    playersRef.current = next;
    setPlayers(next);
    if (!existed) appendHostFeed(makeFeedItem({ type: "system", sender: nextPlayer.name, event: "join" }));
    else window.setTimeout(broadcastState, 0);
  };

  const removePlayer = (peerId) => {
    const previous = playersRef.current.find((item) => item.peerId === peerId);
    const next = playersRef.current.filter((item) => item.peerId !== peerId);
    playersRef.current = next;
    setPlayers(next);
    if (previous) appendHostFeed(makeFeedItem({ type: "system", sender: previous.name, event: "leave" }));
    else window.setTimeout(broadcastState, 0);
  };

  const bindHostConnection = (connection) => {
    connectionsRef.current.set(connection.peer, connection);
    connection.on("open", () => {
      connection.send({
        type: "session_state",
        sessionCode: codeRef.current,
        players: playersRef.current,
        sceneMessage: sceneRef.current,
        feed: feedRef.current,
        combat: combatRef.current,
      });
    });
    connection.on("data", (data) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "join" || data.type === "player_update") {
        upsertPlayer(connection.peer, data.player);
        return;
      }
      const player = playersRef.current.find((item) => item.peerId === connection.peer);
      const sender = player?.name || cleanText(data?.sender, 40) || "Player";
      if (data.type === "chat_message") {
        const text = cleanText(data.text, 500);
        if (text) appendHostFeed(makeFeedItem({ type: "chat", sender, text }));
        return;
      }
      if (data.type === "roll_event") {
        const roll = sanitizeRollPayload(data.roll);
        if (roll) appendHostFeed(makeFeedItem({ type: "roll", sender, roll }));
      }
    });
    connection.on("close", () => {
      connectionsRef.current.delete(connection.peer);
      removePlayer(connection.peer);
    });
    connection.on("error", () => {
      connectionsRef.current.delete(connection.peer);
      removePlayer(connection.peer);
    });
  };

  const resetState = () => {
    const emptyCombat = { ...EMPTY_COMBAT };
    setPlayers([]);
    setSceneMessage("");
    setFeed([]);
    setCombat(emptyCombat);
    playersRef.current = [];
    sceneRef.current = "";
    feedRef.current = [];
    combatRef.current = emptyCombat;
  };

  const startHost = () => {
    destroyNetwork();
    resetState();
    setError(null);
    const code = makeSessionCode();
    codeRef.current = code;
    setSessionCode(code);
    setMode("host");
    setStatus("connecting");
    const peer = new Peer(getHostPeerId(code), { debug: 1 });
    peerRef.current = peer;
    peer.on("open", () => setStatus("online"));
    peer.on("connection", bindHostConnection);
    peer.on("disconnected", () => setStatus("disconnected"));
    peer.on("close", () => setStatus("disconnected"));
    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "unavailable-id") setError({ key: "roomUnavailable" });
      else setError({ key: "networkError", message: peerError?.message || "Network error" });
    });
  };

  const joinSession = ({ code, name }) => {
    const normalized = normalizeSessionCode(code);
    const cleanName = cleanText(name, 40);
    destroyNetwork();
    resetState();
    setError(null);
    playerNameRef.current = cleanName || "Player";
    codeRef.current = normalized;
    setSessionCode(normalized);
    setMode("player");
    setStatus("connecting");
    const peer = new Peer(undefined, { debug: 1 });
    peerRef.current = peer;
    peer.on("open", () => {
      const connection = peer.connect(getHostPeerId(normalized), { reliable: true });
      hostConnectionRef.current = connection;
      connection.on("open", () => {
        setStatus("online");
        connection.send({ type: "join", player: makePlayerPacket(playerNameRef.current, formRef.current) });
      });
      connection.on("data", (data) => {
        if (!data || typeof data !== "object") return;
        if (data.type === "session_state") {
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setSceneMessage(cleanText(data.sceneMessage, 600));
          setFeed(Array.isArray(data.feed) ? data.feed.slice(-MAX_FEED) : []);
          setCombat(sanitizeCombatState(data.combat));
        }
      });
      connection.on("close", () => setStatus("disconnected"));
      connection.on("error", () => {
        setStatus("error");
        setError({ key: "hostNotFound" });
      });
    });
    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "peer-unavailable") setError({ key: "hostNotFound" });
      else setError({ key: "networkError", message: peerError?.message || "Network error" });
    });
  };

  const exitSession = () => {
    destroyNetwork();
    setMode("lobby");
    setStatus("waiting");
    setError(null);
    setSessionCode("");
    codeRef.current = "";
    playerNameRef.current = "";
    resetState();
  };

  const broadcastScene = (value) => {
    if (mode !== "host") return false;
    const text = cleanText(value, 600);
    sceneRef.current = text;
    setSceneMessage(text);
    if (text) appendHostFeed(makeFeedItem({ type: "scene", sender: "GM", text }));
    else broadcastState();
    return true;
  };

  const sendChat = (value) => {
    const text = cleanText(value, 500);
    if (!text || status !== "online") return false;
    if (mode === "host") {
      appendHostFeed(makeFeedItem({ type: "chat", sender: "GM", text }));
      return true;
    }
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "chat_message", text, sender: playerNameRef.current });
    return true;
  };

  const syncCharacter = () => {
    if (mode !== "player" || status !== "online") return false;
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "player_update", player: makePlayerPacket(playerNameRef.current, formRef.current) });
    return true;
  };

  const sendDiceResult = (payload) => {
    if (!payload || status !== "online") return false;
    const roll = sanitizeRollPayload(payload);
    if (!roll) return false;
    if (mode === "host") {
      appendHostFeed(makeFeedItem({ type: "roll", sender: "GM", roll }));
      return true;
    }
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "roll_event", roll, sender: playerNameRef.current });
    return true;
  };

  const addCombatNpc = ({ name, initiative = 0 } = {}) => {
    if (mode !== "host" || combatRef.current.active) return false;
    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative });
    if (!npc) return false;
    return Boolean(setHostCombat({ ...combatRef.current, npcs: [...combatRef.current.npcs, npc] }));
  };

  const updateCombatNpc = (id, patch = {}) => {
    if (mode !== "host" || combatRef.current.active) return false;
    const npcs = combatRef.current.npcs.map((npc) => {
      if (npc.id !== id) return npc;
      return sanitizeNpc({ ...npc, ...patch }) || npc;
    });
    setHostCombat({ ...combatRef.current, npcs });
    return true;
  };

  const removeCombatNpc = (id) => {
    if (mode !== "host" || combatRef.current.active) return false;
    setHostCombat({ ...combatRef.current, npcs: combatRef.current.npcs.filter((npc) => npc.id !== id) });
    return true;
  };

  const startCombat = () => {
    if (mode !== "host" || combatRef.current.active) return false;
    const playerActors = playersRef.current
      .filter((player) => player?.character && Number(player.character.currentHp || 0) > 0)
      .map((player) => ({
        id: `player:${player.peerId}`,
        kind: "player",
        peerId: player.peerId,
        name: player.character?.name || player.name || "Player",
        initiative: clampNumber(player.character?.initiative, 0, 99),
      }));
    const npcActors = combatRef.current.npcs.map((npc) => ({
      id: `npc:${npc.id}`,
      kind: "npc",
      peerId: null,
      name: npc.name,
      initiative: clampNumber(npc.initiative, 0, 99),
    }));
    const order = sortActors([...playerActors, ...npcActors]);
    if (!order.length) return false;
    const next = {
      ...combatRef.current,
      active: true,
      round: 1,
      index: 0,
      activeActorId: order[0].id,
      order,
      ap: 0,
      startedAt: new Date().toISOString(),
    };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_start", text: order[0].name }));
    return true;
  };

  const actorAvailable = (actor) => {
    if (!actor) return false;
    if (actor.kind === "npc") return true;
    const player = playersRef.current.find((item) => item.peerId === actor.peerId);
    return Boolean(player?.character && Number(player.character.currentHp || 0) > 0);
  };

  const nextCombatTurn = () => {
    if (mode !== "host" || !combatRef.current.active || !combatRef.current.order.length) return false;
    const current = combatRef.current;
    const order = current.order;
    let index = current.index;
    let round = Math.max(1, Number(current.round || 1));
    let nextActor = null;
    for (let step = 1; step <= order.length; step += 1) {
      const candidateIndex = (current.index + step) % order.length;
      if (candidateIndex <= current.index) round = Math.max(round, Number(current.round || 1) + 1);
      const candidate = order[candidateIndex];
      if (actorAvailable(candidate)) {
        index = candidateIndex;
        nextActor = candidate;
        break;
      }
    }
    if (!nextActor) return false;
    const next = { ...current, round, index, activeActorId: nextActor.id };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_turn", text: nextActor.name }));
    return true;
  };

  const setCombatAp = (value) => {
    if (mode !== "host") return false;
    const current = combatRef.current;
    setHostCombat({ ...current, ap: clampNumber(value, 0, current.apMax || DEFAULT_AP_MAX) });
    return true;
  };

  const endCombat = () => {
    if (mode !== "host") return false;
    const next = {
      ...EMPTY_COMBAT,
      npcs: combatRef.current.npcs,
      apMax: combatRef.current.apMax || DEFAULT_AP_MAX,
    };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_end" }));
    return true;
  };

  const snapshotSignature = useMemo(() => JSON.stringify(createCharacterSnapshot(form)), [form]);
  useEffect(() => {
    if (mode !== "player" || status !== "online") return undefined;
    if (autoSyncTimerRef.current) window.clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = window.setTimeout(() => {
      syncCharacter();
      autoSyncTimerRef.current = null;
    }, 350);
    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [snapshotSignature, mode, status]);

  return {
    mode,
    status,
    error,
    sessionCode,
    players,
    sceneMessage,
    feed,
    combat,
    isActive: mode === "host" || mode === "player",
    startHost,
    joinSession,
    exitSession,
    broadcastScene,
    sendChat,
    syncCharacter,
    sendDiceResult,
    addCombatNpc,
    updateCombatNpc,
    removeCombatNpc,
    startCombat,
    nextCombatTurn,
    setCombatAp,
    endCombat,
  };
}
'''

Path('src/hooks/useSharedSession.js').write_text(hook, encoding='utf-8')

screen_path = Path('src/components/session/SessionScreen.jsx')
screen = screen_path.read_text(encoding='utf-8')

copy_replacements = {
    'sessionActive: "SESSION", live: "LIVE"': 'sessionActive: "SESSION", live: "LIVE", combat: "COMBAT", combatIdle: "Combat has not started.", round: "ROUND", currentTurn: "CURRENT TURN", groupAp: "GROUP AP", nextTurn: "NEXT TURN", startCombat: "START COMBAT", endCombat: "END COMBAT", initiative: "INIT", npc: "NPC", addNpc: "ADD NPC", npcName: "NPC name", remove: "REMOVE", player: "PLAYER", combatStarted: "combat started", combatEnded: "combat ended", turnChanged: "turn"',
    'sessionActive: "СЕССИЯ", live: "LIVE"': 'sessionActive: "СЕССИЯ", live: "LIVE", combat: "БОЙ", combatIdle: "Бой ещё не начат.", round: "РАУНД", currentTurn: "ТЕКУЩИЙ ХОД", groupAp: "ОБЩИЕ AP", nextTurn: "СЛЕДУЮЩИЙ ХОД", startCombat: "НАЧАТЬ БОЙ", endCombat: "ЗАВЕРШИТЬ БОЙ", initiative: "ИНИЦ", npc: "NPC", addNpc: "ДОБАВИТЬ NPC", npcName: "Имя NPC", remove: "УДАЛИТЬ", player: "ИГРОК", combatStarted: "бой начался", combatEnded: "бой завершён", turnChanged: "ход"',
    'sessionActive: "СЕСІЯ", live: "LIVE"': 'sessionActive: "СЕСІЯ", live: "LIVE", combat: "БІЙ", combatIdle: "Бій ще не розпочато.", round: "РАУНД", currentTurn: "ПОТОЧНИЙ ХІД", groupAp: "СПІЛЬНІ AP", nextTurn: "НАСТУПНИЙ ХІД", startCombat: "ПОЧАТИ БІЙ", endCombat: "ЗАВЕРШИТИ БІЙ", initiative: "ІНІЦ", npc: "NPC", addNpc: "ДОДАТИ NPC", npcName: "Імʼя NPC", remove: "ВИДАЛИТИ", player: "ГРАВЕЦЬ", combatStarted: "бій розпочато", combatEnded: "бій завершено", turnChanged: "хід"',
    'sessionActive: "SESJA", live: "LIVE"': 'sessionActive: "SESJA", live: "LIVE", combat: "WALKA", combatIdle: "Walka jeszcze się nie rozpoczęła.", round: "RUNDA", currentTurn: "AKTUALNA TURA", groupAp: "WSPÓLNE AP", nextTurn: "NASTĘPNA TURA", startCombat: "ROZPOCZNIJ WALKĘ", endCombat: "ZAKOŃCZ WALKĘ", initiative: "INIC", npc: "NPC", addNpc: "DODAJ NPC", npcName: "Nazwa NPC", remove: "USUŃ", player: "GRACZ", combatStarted: "walka rozpoczęta", combatEnded: "walka zakończona", turnChanged: "tura"',
}
for old, new in copy_replacements.items():
    if old not in screen:
        raise SystemExit(f'Missing copy anchor: {old}')
    screen = screen.replace(old, new, 1)

old_player_stats = '''            <span>{copy.level}: {character.level}</span>\n            <span>{copy.hp}: {character.currentHp}/{character.maxHp}</span>\n            <span>{copy.defense}: {character.defense}</span>'''
new_player_stats = '''            <span>{copy.level}: {character.level}</span>\n            <span>{copy.hp}: {character.currentHp}/{character.maxHp}</span>\n            <span>{copy.defense}: {character.defense}</span>\n            <span>{copy.initiative}: {character.initiative ?? 0}</span>'''
if old_player_stats not in screen:
    raise SystemExit('Missing player stats anchor')
screen = screen.replace(old_player_stats, new_player_stats, 1)

old_system = '''      {item.type === "system" && <div>{item.event === "join" ? copy.joined : copy.left}</div>}\n      {item.type === "chat" && <div className="session-feed-text">{item.text}</div>}'''
new_system = '''      {item.type === "system" && <div>{item.event === "join" ? copy.joined : copy.left}</div>}\n      {item.type === "combat" && (\n        <div className="session-feed-text session-feed-combat">\n          {item.event === "combat_start" && `${copy.combatStarted}${item.text ? ` · ${copy.currentTurn}: ${item.text}` : ""}`}\n          {item.event === "combat_end" && copy.combatEnded}\n          {item.event === "combat_turn" && `${copy.turnChanged}: ${item.text}`}\n        </div>\n      )}\n      {item.type === "chat" && <div className="session-feed-text">{item.text}</div>}'''
if old_system not in screen:
    raise SystemExit('Missing feed anchor')
screen = screen.replace(old_system, new_system, 1)

old_states = '''  const [syncState, setSyncState] = useState(false);\n  const [localError, setLocalError] = useState("");'''
new_states = '''  const [syncState, setSyncState] = useState(false);\n  const [localError, setLocalError] = useState("");\n  const [npcName, setNpcName] = useState("");\n  const [npcInitiative, setNpcInitiative] = useState("10");'''
if old_states not in screen:
    raise SystemExit('Missing state anchor')
screen = screen.replace(old_states, new_states, 1)

old_session_vars = '''  const feed = session?.feed || [];\n  const sessionCode = session?.sessionCode || "";'''
new_session_vars = '''  const feed = session?.feed || [];\n  const combat = session?.combat || { active: false, round: 0, index: -1, order: [], npcs: [], ap: 0, apMax: 6 };\n  const activeActor = combat.order?.find((actor) => actor.id === combat.activeActorId) || null;\n  const sessionCode = session?.sessionCode || "";'''
if old_session_vars not in screen:
    raise SystemExit('Missing session vars anchor')
screen = screen.replace(old_session_vars, new_session_vars, 1)

old_sync = '''  const handleSync = () => {\n    if (!session.syncCharacter()) return;\n    setSyncState(true);\n    window.setTimeout(() => setSyncState(false), 1000);\n  };'''
new_sync = '''  const handleSync = () => {\n    if (!session.syncCharacter()) return;\n    setSyncState(true);\n    window.setTimeout(() => setSyncState(false), 1000);\n  };\n\n  const handleAddNpc = (event) => {\n    event.preventDefault();\n    if (!String(npcName).trim()) return;\n    if (session.addCombatNpc({ name: npcName, initiative: Number(npcInitiative || 0) })) {\n      setNpcName("");\n      setNpcInitiative("10");\n    }\n  };'''
if old_sync not in screen:
    raise SystemExit('Missing sync anchor')
screen = screen.replace(old_sync, new_sync, 1)

combat_panel = r'''
      <section className="pip-panel pip-block session-combat-panel">
        <div className="pip-head">
          <h2>[ {copy.combat} ]</h2>
          <span>{combat.active ? `${copy.round}: ${combat.round}` : copy.combatIdle}</span>
        </div>

        {combat.active ? (
          <>
            <div className="session-combat-summary">
              <div><span>{copy.currentTurn}</span><strong>{activeActor?.name || "—"}</strong></div>
              <div><span>{copy.round}</span><strong>{combat.round}</strong></div>
              <div className="session-ap-box">
                <span>{copy.groupAp}</span>
                {mode === "host" ? (
                  <div className="session-ap-controls">
                    <button type="button" className="pip-btn" onClick={() => session.setCombatAp(combat.ap - 1)} disabled={combat.ap <= 0}>−</button>
                    <strong>{combat.ap}/{combat.apMax}</strong>
                    <button type="button" className="pip-btn" onClick={() => session.setCombatAp(combat.ap + 1)} disabled={combat.ap >= combat.apMax}>+</button>
                  </div>
                ) : <strong>{combat.ap}/{combat.apMax}</strong>}
              </div>
            </div>

            <div className="session-turn-order">
              {combat.order.map((actor, index) => (
                <div key={actor.id} className={`session-turn-row${actor.id === combat.activeActorId ? " is-active" : ""}`}>
                  <span className="session-turn-number">{index + 1}</span>
                  <span className="session-turn-kind">{actor.kind === "npc" ? copy.npc : copy.player}</span>
                  <strong>{actor.name}</strong>
                  <span>{copy.initiative}: {actor.initiative}</span>
                </div>
              ))}
            </div>

            {mode === "host" && (
              <div className="session-combat-actions">
                <button type="button" className="pip-btn is-primary" onClick={() => session.nextCombatTurn()}>{copy.nextTurn}</button>
                <button type="button" className="pip-btn" onClick={() => session.endCombat()}>{copy.endCombat}</button>
              </div>
            )}
          </>
        ) : mode === "host" ? (
          <>
            <div className="session-precombat-grid">
              <div>
                <div className="stat-sub session-precombat-label">{copy.roster}</div>
                <div className="session-turn-order">
                  {players.filter((player) => player.character).map((player) => (
                    <div key={player.peerId} className="session-turn-row">
                      <span className="session-turn-kind">{copy.player}</span>
                      <strong>{player.character?.name || player.name}</strong>
                      <span>{copy.initiative}: {player.character?.initiative ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="stat-sub session-precombat-label">NPC</div>
                <div className="session-turn-order">
                  {combat.npcs.map((npc) => (
                    <div key={npc.id} className="session-turn-row session-npc-row">
                      <span className="session-turn-kind">{copy.npc}</span>
                      <input className="pip-input" value={npc.name} maxLength={60} onChange={(event) => session.updateCombatNpc(npc.id, { name: event.target.value })} />
                      <input className="pip-input session-init-input" type="number" min="0" max="99" value={npc.initiative} onChange={(event) => session.updateCombatNpc(npc.id, { initiative: event.target.value })} />
                      <button type="button" className="pip-btn" onClick={() => session.removeCombatNpc(npc.id)}>{copy.remove}</button>
                    </div>
                  ))}
                </div>
                <form className="session-npc-form" onSubmit={handleAddNpc}>
                  <input className="pip-input" maxLength={60} value={npcName} placeholder={copy.npcName} onChange={(event) => setNpcName(event.target.value)} />
                  <input className="pip-input session-init-input" type="number" min="0" max="99" value={npcInitiative} onChange={(event) => setNpcInitiative(event.target.value)} />
                  <button type="submit" className="pip-btn">{copy.addNpc}</button>
                </form>
              </div>
            </div>
            <button type="button" className="pip-btn is-primary session-main-button" onClick={() => session.startCombat()} disabled={!players.some((player) => player.character) && !combat.npcs.length}>{copy.startCombat}</button>
          </>
        ) : (
          <div className="pip-logbox">{copy.combatIdle}</div>
        )}
      </section>
'''

feed_anchor = '      <section className="pip-panel pip-block session-feed-panel">'
if feed_anchor not in screen:
    raise SystemExit('Missing feed panel anchor')
screen = screen.replace(feed_anchor, combat_panel + '\n' + feed_anchor, 1)
screen_path.write_text(screen, encoding='utf-8')

css_path = Path('src/components/session/session.css')
css = css_path.read_text(encoding='utf-8')
css += r'''

/* ===== SHARED COMBAT ===== */
.session-combat-panel {
  display: grid;
  gap: 10px;
}

.session-combat-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.session-combat-summary > div {
  min-height: 64px;
  display: grid;
  gap: 5px;
  align-content: center;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, currentColor 32%, transparent);
  background: color-mix(in srgb, currentColor 4%, transparent);
}

.session-combat-summary span,
.session-precombat-label {
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  opacity: 0.72;
}

.session-combat-summary strong {
  font-size: 1rem;
}

.session-ap-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-ap-controls .pip-btn {
  min-width: 36px;
  padding-inline: 8px;
}

.session-turn-order {
  display: grid;
  gap: 6px;
}

.session-turn-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 38px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  background: color-mix(in srgb, currentColor 3%, transparent);
}

.session-turn-row.is-active {
  border-width: 2px;
  background: color-mix(in srgb, currentColor 11%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, currentColor 16%, transparent);
}

.session-turn-number,
.session-turn-kind {
  font-size: 0.7rem;
  font-weight: 800;
  opacity: 0.7;
  letter-spacing: 0.07em;
}

.session-combat-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.session-precombat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.session-precombat-label {
  margin-bottom: 6px;
  font-weight: 800;
}

.session-npc-row {
  grid-template-columns: auto minmax(120px, 1fr) 76px auto;
}

.session-init-input {
  max-width: 76px;
  text-align: center;
}

.session-npc-form {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 76px auto;
  gap: 7px;
  margin-top: 8px;
}

.session-feed-item.is-combat {
  border-color: color-mix(in srgb, currentColor 52%, transparent);
}

.session-feed-combat {
  font-weight: 800;
  letter-spacing: 0.04em;
}

@media (max-width: 760px) {
  .session-combat-summary,
  .session-precombat-grid {
    grid-template-columns: 1fr;
  }

  .session-turn-row {
    grid-template-columns: auto auto minmax(0, 1fr);
  }

  .session-turn-row > span:last-child {
    grid-column: 2 / -1;
  }

  .session-npc-row {
    grid-template-columns: auto minmax(0, 1fr) 68px;
  }

  .session-npc-row .pip-btn {
    grid-column: 2 / -1;
  }

  .session-npc-form {
    grid-template-columns: minmax(0, 1fr) 68px;
  }

  .session-npc-form .pip-btn {
    grid-column: 1 / -1;
  }

  .session-combat-actions {
    grid-template-columns: 1fr;
  }
}
'''
css_path.write_text(css, encoding='utf-8')
