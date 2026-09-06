import { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { getDerivedStats, getTotalResistanceForPart } from "../utils/characterMath.js";

export const SESSION_CODE_LENGTH = 6;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HOST_PREFIX = "pip2d20-session-";
const MAX_FEED = 120;
const DEFAULT_AP_MAX = 6;
const PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";
const PLAYER_PREFIX = "pip2d20-player-";
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 10000;
const PLAYER_GRACE_MS = 30000;
const HEARTBEAT_MS = 10000;
const HEARTBEAT_TIMEOUT_MS = 45000;
const MAX_QUEUED_EVENTS = 40;

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

function getPlayerPeerId(clientId) {
  return `${PLAYER_PREFIX}${String(clientId || "").toLowerCase().replace(/[^a-z0-9-]/g, "")}`;
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function readPortraitSnapshot() {
  try {
    const value = localStorage.getItem(PORTRAIT_STORAGE_KEY) || "";
    if (!value.startsWith("data:image/")) return "";
    return value.length <= 80000 ? value : "";
  } catch {
    return "";
  }
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

  const torsoArmor = Object.fromEntries(
    ["physical", "energy", "radiation", "poison"].map((damageType) => [
      damageType,
      Math.max(0, getTotalResistanceForPart({
        armor: form?.armor || {},
        part: "Torso",
        damageType,
        derived,
      })),
    ])
  );

  const weapons = (Array.isArray(form?.weapons) ? form.weapons : [])
    .filter((weapon) => String(weapon?.name || "").trim())
    .slice(0, 12)
    .map((weapon) => ({
      name: String(weapon?.name || "").slice(0, 80),
      skill: String(weapon?.skill || "").slice(0, 40),
      damage: weapon?.damage ?? "",
      damageType: String(weapon?.type || weapon?.damageType || "").slice(0, 40),
      rate: weapon?.rate ?? "",
      range: String(weapon?.range || "").slice(0, 40),
      effects: (Array.isArray(weapon?.effects) ? weapon.effects.join(", ") : String(weapon?.effects || weapon?.customEffect || "")).slice(0, 240),
      qualities: (Array.isArray(weapon?.qualities) ? weapon.qualities.join(", ") : String(weapon?.qualities || weapon?.qualitiesCustom || "")).slice(0, 240),
    }));

  const perks = (Array.isArray(form?.perksAndTraits) ? form.perksAndTraits : [])
    .filter((perk) => String(perk?.name || "").trim())
    .slice(0, 24)
    .map((perk) => ({
      name: String(perk?.name || "").slice(0, 80),
      rank: Math.max(1, Number(perk?.rank || 1)),
    }));

  return {
    name: characterName || "Unnamed",
    origin: String(form?.origin || ""),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    armor: torsoArmor,
    resistances: torsoArmor,
    initiative: Math.max(0, Number(derived?.initiative || 0)),
    luck: Math.max(0, Number(derived?.luckPoints || 0)),
    special: { ...(derived?.effectiveSpecial || {}) },
    weapons,
    perks,
    avatar: readPortraitSnapshot(),
    statuses,
    updatedAt: new Date().toISOString(),
  };
}

function createLiveCharacterSnapshot(form) {
  const full = createCharacterSnapshot(form);
  if (!full) return null;
  return {
    name: full.name,
    origin: full.origin,
    level: full.level,
    currentHp: full.currentHp,
    maxHp: full.maxHp,
    defense: full.defense,
    armor: full.armor,
    resistances: full.resistances,
    initiative: full.initiative,
    luck: full.luck,
    statuses: full.statuses,
    updatedAt: full.updatedAt,
  };
}

function makePlayerPacket(name, form, full = true) {
  return {
    name: String(name || "Player").trim().slice(0, 40) || "Player",
    character: full ? createCharacterSnapshot(form) : createLiveCharacterSnapshot(form),
  };
}

function toLightPlayer(player) {
  const character = player?.character;
  return {
    peerId: player?.peerId || "",
    name: player?.name || "Player",
    connected: player?.connected !== false,
    updatedAt: player?.updatedAt || null,
    character: character ? {
      name: character.name,
      origin: character.origin,
      level: character.level,
      currentHp: character.currentHp,
      maxHp: character.maxHp,
      defense: character.defense,
      armor: character.armor,
      resistances: character.resistances,
      initiative: character.initiative,
      luck: character.luck,
      statuses: character.statuses,
      updatedAt: character.updatedAt,
    } : null,
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
  const maxHp = clampNumber(npc.maxHp ?? npc.currentHp ?? 10, 0, 9999);
  return {
    id: cleanText(npc.id, 100) || makeId("npc"),
    name,
    initiative: clampNumber(npc.initiative, 0, 99),
    maxHp,
    currentHp: clampNumber(npc.currentHp ?? maxHp, 0, maxHp || 9999),
    armorPhysical: clampNumber(npc.armorPhysical, 0, 99),
    armorEnergy: clampNumber(npc.armorEnergy, 0, 99),
  };
}

function sanitizeActor(actor) {
  if (!actor || typeof actor !== "object") return null;
  const id = cleanText(actor.id, 140);
  const name = cleanText(actor.name, 60);
  if (!id || !name) return null;
  const maxHp = clampNumber(actor.maxHp, 0, 9999);
  return {
    id,
    kind: actor.kind === "npc" ? "npc" : "player",
    name,
    initiative: clampNumber(actor.initiative, 0, 99),
    peerId: actor.kind === "npc" ? null : cleanText(actor.peerId, 140),
    maxHp,
    currentHp: clampNumber(actor.currentHp, 0, maxHp || 9999),
    defense: clampNumber(actor.defense, 0, 99),
    armorPhysical: clampNumber(actor.armorPhysical, 0, 99),
    armorEnergy: clampNumber(actor.armorEnergy, 0, 99),
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
  const playerClientIdRef = useRef("");
  const desiredModeRef = useRef("lobby");
  const autoSyncTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const heartbeatTimerRef = useRef(null);
  const lastPongRef = useRef(Date.now());
  const pendingOutboundRef = useRef([]);
  const networkGenerationRef = useRef(0);
  const playerDisconnectTimersRef = useRef(new Map());

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { sceneRef.current = sceneMessage; }, [sceneMessage]);
  useEffect(() => { feedRef.current = feed; }, [feed]);
  useEffect(() => { combatRef.current = combat; }, [combat]);

  function clearReconnectTimer() {
    if (!reconnectTimerRef.current) return;
    window.clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
  }

  function stopHeartbeat() {
    if (!heartbeatTimerRef.current) return;
    window.clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = null;
  }

  function clearDisconnectTimer(peerId) {
    const timer = playerDisconnectTimersRef.current.get(peerId);
    if (timer) window.clearTimeout(timer);
    playerDisconnectTimersRef.current.delete(peerId);
  }

  function destroyCurrentPeer() {
    networkGenerationRef.current += 1;
    stopHeartbeat();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    const peer = peerRef.current;
    peerRef.current = null;
    try { peer?.destroy?.(); } catch { /* Ignore cleanup errors. */ }
  }

  function destroyNetwork() {
    desiredModeRef.current = "lobby";
    clearReconnectTimer();
    stopHeartbeat();
    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
    playerDisconnectTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    playerDisconnectTimersRef.current.clear();
    pendingOutboundRef.current = [];
    connectionsRef.current.forEach((connection) => safeClose(connection));
    connectionsRef.current.clear();
    destroyCurrentPeer();
  }

  useEffect(() => () => destroyNetwork(), []);

  function sendToPlayers(payload) {
    connectionsRef.current.forEach((connection) => {
      try {
        if (connection?.open) connection.send(payload);
      } catch {
        // A single broken data channel must not interrupt the rest of the group.
      }
    });
  }

  function broadcastPlayers() {
    sendToPlayers({
      type: "players_state",
      players: playersRef.current.map(toLightPlayer),
      sentAt: new Date().toISOString(),
    });
  }

  function broadcastCombat() {
    sendToPlayers({ type: "combat_state", combat: combatRef.current, sentAt: new Date().toISOString() });
  }

  function broadcastSceneState() {
    sendToPlayers({ type: "scene_state", sceneMessage: sceneRef.current, sentAt: new Date().toISOString() });
  }

  function sendSnapshot(connection) {
    if (!connection?.open) return;
    try {
      connection.send({
        type: "session_state",
        sessionCode: codeRef.current,
        players: playersRef.current.map(toLightPlayer),
        sceneMessage: sceneRef.current,
        feed: feedRef.current,
        combat: combatRef.current,
        sentAt: new Date().toISOString(),
      });
    } catch {
      // Reconnect logic will retry the connection if the channel closes.
    }
  }

  function setHostFeed(nextFeed) {
    const capped = nextFeed.slice(-MAX_FEED);
    feedRef.current = capped;
    setFeed(capped);
  }

  function appendHostFeed(item) {
    setHostFeed([...feedRef.current, item]);
    sendToPlayers({ type: "feed_item", item, sentAt: new Date().toISOString() });
  }

  function setHostCombat(nextCombat, feedItem = null) {
    const safe = sanitizeCombatState(nextCombat);
    combatRef.current = safe;
    setCombat(safe);
    broadcastCombat();
    if (feedItem) appendHostFeed(feedItem);
    return safe;
  }

  function upsertPlayer(peerId, packet) {
    clearDisconnectTimer(peerId);
    const existing = playersRef.current.find((item) => item.peerId === peerId);
    const incomingCharacter = packet?.character || null;
    const nextPlayer = {
      peerId,
      name: cleanText(packet?.name || existing?.name || "Player", 40) || "Player",
      connected: true,
      character: incomingCharacter
        ? { ...(existing?.character || {}), ...incomingCharacter }
        : existing?.character || null,
      updatedAt: new Date().toISOString(),
    };
    const existed = Boolean(existing);
    const next = existed
      ? playersRef.current.map((item) => (item.peerId === peerId ? { ...item, ...nextPlayer } : item))
      : [...playersRef.current, nextPlayer];
    playersRef.current = next;
    setPlayers(next);
    broadcastPlayers();
    if (!existed) appendHostFeed(makeFeedItem({ type: "system", sender: nextPlayer.name, event: "join" }));
  }

  function removePlayer(peerId) {
    clearDisconnectTimer(peerId);
    const previous = playersRef.current.find((item) => item.peerId === peerId);
    const next = playersRef.current.filter((item) => item.peerId !== peerId);
    playersRef.current = next;
    setPlayers(next);
    broadcastPlayers();
    if (previous) appendHostFeed(makeFeedItem({ type: "system", sender: previous.name, event: "leave" }));
  }

  function markPlayerDisconnected(peerId) {
    if (!peerId || desiredModeRef.current !== "host") return;
    if (!playersRef.current.some((item) => item.peerId === peerId)) return;
    const next = playersRef.current.map((item) =>
      item.peerId === peerId ? { ...item, connected: false, updatedAt: new Date().toISOString() } : item
    );
    playersRef.current = next;
    setPlayers(next);
    broadcastPlayers();
    clearDisconnectTimer(peerId);
    const timer = window.setTimeout(() => {
      playerDisconnectTimersRef.current.delete(peerId);
      const connection = connectionsRef.current.get(peerId);
      if (connection?.open) return;
      removePlayer(peerId);
    }, PLAYER_GRACE_MS);
    playerDisconnectTimersRef.current.set(peerId, timer);
  }

  function bindHostConnection(connection) {
    const previous = connectionsRef.current.get(connection.peer);
    if (previous && previous !== connection) safeClose(previous);
    connectionsRef.current.set(connection.peer, connection);
    clearDisconnectTimer(connection.peer);

    connection.on("open", () => {
      if (desiredModeRef.current !== "host") return;
      connectionsRef.current.set(connection.peer, connection);
      clearDisconnectTimer(connection.peer);
      sendSnapshot(connection);
    });

    connection.on("data", (data) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "ping") {
        try { if (connection.open) connection.send({ type: "pong", at: Date.now() }); } catch { /* ignore */ }
        return;
      }
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

    const handleClosed = () => {
      if (connectionsRef.current.get(connection.peer) === connection) {
        connectionsRef.current.delete(connection.peer);
        markPlayerDisconnected(connection.peer);
      }
    };
    connection.on("close", handleClosed);
    connection.on("error", handleClosed);
  }

  function resetState() {
    const emptyCombat = { ...EMPTY_COMBAT };
    setPlayers([]);
    setSceneMessage("");
    setFeed([]);
    setCombat(emptyCombat);
    playersRef.current = [];
    sceneRef.current = "";
    feedRef.current = [];
    combatRef.current = emptyCombat;
  }

  function scheduleReconnect() {
    if (desiredModeRef.current === "lobby" || reconnectTimerRef.current) return;
    reconnectAttemptRef.current += 1;
    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * Math.pow(1.65, Math.max(0, reconnectAttemptRef.current - 1))
    );
    setStatus("connecting");
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      if (desiredModeRef.current === "host") createHostPeer(true);
      if (desiredModeRef.current === "player") createPlayerPeer(true);
    }, delay);
  }

  function flushPendingOutbound() {
    const connection = hostConnectionRef.current;
    if (!connection?.open || !pendingOutboundRef.current.length) return;
    const pending = pendingOutboundRef.current.splice(0, MAX_QUEUED_EVENTS);
    pending.forEach((payload) => {
      try { connection.send(payload); } catch { pendingOutboundRef.current.unshift(payload); }
    });
  }

  function queuePlayerPayload(payload) {
    const connection = hostConnectionRef.current;
    if (connection?.open) {
      try {
        connection.send(payload);
        return true;
      } catch {
        // Fall through and queue it.
      }
    }
    pendingOutboundRef.current = [...pendingOutboundRef.current, payload].slice(-MAX_QUEUED_EVENTS);
    scheduleReconnect();
    return true;
  }

  function applyPlayerInbound(data) {
    if (!data || typeof data !== "object") return;
    if (data.type === "pong") {
      lastPongRef.current = Date.now();
      return;
    }
    if (data.type === "session_state") {
      setPlayers(Array.isArray(data.players) ? data.players : []);
      setSceneMessage(cleanText(data.sceneMessage, 600));
      setFeed(Array.isArray(data.feed) ? data.feed.slice(-MAX_FEED) : []);
      setCombat(sanitizeCombatState(data.combat));
      return;
    }
    if (data.type === "players_state") {
      setPlayers(Array.isArray(data.players) ? data.players : []);
      return;
    }
    if (data.type === "scene_state") {
      setSceneMessage(cleanText(data.sceneMessage, 600));
      return;
    }
    if (data.type === "combat_state") {
      setCombat(sanitizeCombatState(data.combat));
      return;
    }
    if (data.type === "feed_item" && data.item?.id) {
      setFeed((prev) => {
        if (prev.some((item) => item.id === data.item.id)) return prev;
        return [...prev, data.item].slice(-MAX_FEED);
      });
    }
  }

  function startPlayerHeartbeat() {
    stopHeartbeat();
    lastPongRef.current = Date.now();
    heartbeatTimerRef.current = window.setInterval(() => {
      if (desiredModeRef.current !== "player") return;
      const connection = hostConnectionRef.current;
      if (!connection?.open) {
        scheduleReconnect();
        return;
      }
      if (!document.hidden && Date.now() - lastPongRef.current > HEARTBEAT_TIMEOUT_MS) {
        safeClose(connection);
        scheduleReconnect();
        return;
      }
      try { connection.send({ type: "ping", at: Date.now() }); } catch { scheduleReconnect(); }
    }, HEARTBEAT_MS);
  }

  function createHostPeer(isRecovery = false) {
    if (desiredModeRef.current !== "host" || !codeRef.current) return;
    const generation = networkGenerationRef.current + 1;
    networkGenerationRef.current = generation;
    const oldPeer = peerRef.current;
    peerRef.current = null;
    try { oldPeer?.destroy?.(); } catch { /* ignore */ }

    setStatus("connecting");
    const peer = new Peer(getHostPeerId(codeRef.current), { debug: 1, pingInterval: 5000 });
    peerRef.current = peer;

    peer.on("open", () => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "host") return;
      clearReconnectTimer();
      reconnectAttemptRef.current = 0;
      setError(null);
      setStatus("online");
    });
    peer.on("connection", (connection) => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "host") {
        safeClose(connection);
        return;
      }
      bindHostConnection(connection);
    });
    peer.on("disconnected", () => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "host") return;
      setStatus("connecting");
      try { peer.reconnect(); } catch { /* recreate below */ }
      scheduleReconnect();
    });
    peer.on("close", () => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "host") return;
      scheduleReconnect();
    });
    peer.on("error", (peerError) => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "host") return;
      if (peerError?.type === "unavailable-id" && !isRecovery) {
        setStatus("error");
        setError({ key: "roomUnavailable" });
        return;
      }
      setError({ key: "networkError", message: peerError?.message || "Network error" });
      scheduleReconnect();
    });
  }

  function createPlayerPeer() {
    if (desiredModeRef.current !== "player" || !codeRef.current || !playerClientIdRef.current) return;
    const generation = networkGenerationRef.current + 1;
    networkGenerationRef.current = generation;

    stopHeartbeat();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    const oldPeer = peerRef.current;
    peerRef.current = null;
    try { oldPeer?.destroy?.(); } catch { /* ignore */ }

    setStatus("connecting");
    const peer = new Peer(getPlayerPeerId(playerClientIdRef.current), { debug: 1, pingInterval: 5000 });
    peerRef.current = peer;

    peer.on("open", () => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;
      const connection = peer.connect(getHostPeerId(codeRef.current), { reliable: true, serialization: "json" });
      hostConnectionRef.current = connection;

      connection.on("open", () => {
        if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;
        clearReconnectTimer();
        reconnectAttemptRef.current = 0;
        setError(null);
        setStatus("online");
        lastPongRef.current = Date.now();
        try {
          connection.send({ type: "join", player: makePlayerPacket(playerNameRef.current, formRef.current, true) });
        } catch {
          scheduleReconnect();
          return;
        }
        flushPendingOutbound();
        startPlayerHeartbeat();
      });

      connection.on("data", applyPlayerInbound);
      const handleClosed = () => {
        if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;
        stopHeartbeat();
        setStatus("connecting");
        scheduleReconnect();
      };
      connection.on("close", handleClosed);
      connection.on("error", handleClosed);
    });

    peer.on("disconnected", () => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;
      const connection = hostConnectionRef.current;
      try { peer.reconnect(); } catch { /* reconnect below if needed */ }
      if (!connection?.open) scheduleReconnect();
    });
    peer.on("close", () => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;
      scheduleReconnect();
    });
    peer.on("error", (peerError) => {
      if (generation !== networkGenerationRef.current || desiredModeRef.current !== "player") return;
      if (peerError?.type === "peer-unavailable") {
        setError({ key: "hostNotFound" });
      } else if (peerError?.type !== "unavailable-id") {
        setError({ key: "networkError", message: peerError?.message || "Network error" });
      }
      scheduleReconnect();
    });
  }

  const startHost = () => {
    destroyNetwork();
    resetState();
    setError(null);
    const code = makeSessionCode();
    codeRef.current = code;
    setSessionCode(code);
    desiredModeRef.current = "host";
    setMode("host");
    reconnectAttemptRef.current = 0;
    createHostPeer(false);
  };

  const joinSession = ({ code, name }) => {
    const normalized = normalizeSessionCode(code);
    const cleanName = cleanText(name, 40);
    destroyNetwork();
    resetState();
    setError(null);
    playerNameRef.current = cleanName || "Player";
    playerClientIdRef.current = makeId("client");
    codeRef.current = normalized;
    setSessionCode(normalized);
    desiredModeRef.current = "player";
    setMode("player");
    reconnectAttemptRef.current = 0;
    createPlayerPeer(false);
  };

  const exitSession = () => {
    destroyNetwork();
    setMode("lobby");
    setStatus("waiting");
    setError(null);
    setSessionCode("");
    codeRef.current = "";
    playerNameRef.current = "";
    playerClientIdRef.current = "";
    resetState();
  };

  const broadcastScene = (value) => {
    if (desiredModeRef.current !== "host") return false;
    const text = cleanText(value, 600);
    sceneRef.current = text;
    setSceneMessage(text);
    broadcastSceneState();
    if (text) appendHostFeed(makeFeedItem({ type: "scene", sender: "GM", text }));
    return true;
  };

  const sendChat = (value) => {
    const text = cleanText(value, 500);
    if (!text) return false;
    if (desiredModeRef.current === "host") {
      appendHostFeed(makeFeedItem({ type: "chat", sender: "GM", text }));
      return true;
    }
    if (desiredModeRef.current !== "player") return false;
    return queuePlayerPayload({ type: "chat_message", text, sender: playerNameRef.current });
  };

  const syncCharacter = (full = true) => {
    if (desiredModeRef.current !== "player") return false;
    const connection = hostConnectionRef.current;
    if (!connection?.open) {
      scheduleReconnect();
      return false;
    }
    try {
      connection.send({
        type: "player_update",
        player: makePlayerPacket(playerNameRef.current, formRef.current, full),
      });
      return true;
    } catch {
      scheduleReconnect();
      return false;
    }
  };

  const sendDiceResult = (payload) => {
    if (!payload) return false;
    const roll = sanitizeRollPayload(payload);
    if (!roll) return false;
    if (desiredModeRef.current === "host") {
      appendHostFeed(makeFeedItem({ type: "roll", sender: "GM", roll }));
      return true;
    }
    if (desiredModeRef.current !== "player") return false;
    return queuePlayerPayload({ type: "roll_event", roll, sender: playerNameRef.current });
  };

  const addCombatNpc = ({ name, initiative = 0, maxHp = 10, currentHp = maxHp, armorPhysical = 0, armorEnergy = 0 } = {}) => {
    if (desiredModeRef.current !== "host" || combatRef.current.active) return false;
    const npc = sanitizeNpc({ id: makeId("npc"), name, initiative, maxHp, currentHp, armorPhysical, armorEnergy });
    if (!npc) return false;
    return Boolean(setHostCombat({ ...combatRef.current, npcs: [...combatRef.current.npcs, npc] }));
  };

  const updateCombatNpc = (id, patch = {}) => {
    if (desiredModeRef.current !== "host" || combatRef.current.active) return false;
    const npcs = combatRef.current.npcs.map((npc) => {
      if (npc.id !== id) return npc;
      return sanitizeNpc({ ...npc, ...patch }) || npc;
    });
    setHostCombat({ ...combatRef.current, npcs });
    return true;
  };

  const removeCombatNpc = (id) => {
    if (desiredModeRef.current !== "host" || combatRef.current.active) return false;
    setHostCombat({ ...combatRef.current, npcs: combatRef.current.npcs.filter((npc) => npc.id !== id) });
    return true;
  };

  const startCombat = () => {
    if (desiredModeRef.current !== "host" || combatRef.current.active) return false;
    const playerActors = playersRef.current
      .filter((player) => player?.connected !== false && player?.character && Number(player.character.currentHp || 0) > 0)
      .map((player) => ({
        id: `player:${player.peerId}`,
        kind: "player",
        peerId: player.peerId,
        name: player.character?.name || player.name || "Player",
        initiative: clampNumber(player.character?.initiative, 0, 99),
        currentHp: clampNumber(player.character?.currentHp, 0, 9999),
        maxHp: clampNumber(player.character?.maxHp, 0, 9999),
        defense: clampNumber(player.character?.defense, 0, 99),
        armorPhysical: clampNumber(player.character?.armor?.physical, 0, 99),
        armorEnergy: clampNumber(player.character?.armor?.energy, 0, 99),
      }));
    const npcActors = combatRef.current.npcs.map((npc) => ({
      id: `npc:${npc.id}`,
      kind: "npc",
      peerId: null,
      name: npc.name,
      initiative: clampNumber(npc.initiative, 0, 99),
      currentHp: clampNumber(npc.currentHp, 0, npc.maxHp || 9999),
      maxHp: clampNumber(npc.maxHp, 0, 9999),
      armorPhysical: clampNumber(npc.armorPhysical, 0, 99),
      armorEnergy: clampNumber(npc.armorEnergy, 0, 99),
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
    if (actor.kind === "npc") return Number(actor.currentHp || 0) > 0;
    const player = playersRef.current.find((item) => item.peerId === actor.peerId);
    return Boolean(player?.connected !== false && player?.character && Number(player.character.currentHp || 0) > 0);
  };

  const nextCombatTurn = () => {
    if (desiredModeRef.current !== "host" || !combatRef.current.active || !combatRef.current.order.length) return false;
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

  const setCombatNpcHp = (actorId, value) => {
    if (desiredModeRef.current !== "host" || !combatRef.current.active) return false;
    const targetId = String(actorId || "").startsWith("npc:") ? String(actorId) : `npc:${actorId}`;
    const npcId = targetId.replace(/^npc:/, "");
    const current = combatRef.current;
    const actor = current.order.find((item) => item.id === targetId && item.kind === "npc");
    if (!actor) return false;
    const nextHp = clampNumber(value, 0, actor.maxHp || 9999);
    const order = current.order.map((item) => item.id === targetId ? { ...item, currentHp: nextHp } : item);
    const npcs = current.npcs.map((npc) => npc.id === npcId ? { ...npc, currentHp: nextHp } : npc);
    setHostCombat({ ...current, order, npcs });
    return true;
  };

  const setCombatAp = (value) => {
    if (desiredModeRef.current !== "host") return false;
    const current = combatRef.current;
    setHostCombat({ ...current, ap: clampNumber(value, 0, current.apMax || DEFAULT_AP_MAX) });
    return true;
  };

  const endCombat = () => {
    if (desiredModeRef.current !== "host") return false;
    const next = {
      ...EMPTY_COMBAT,
      npcs: combatRef.current.npcs,
      apMax: combatRef.current.apMax || DEFAULT_AP_MAX,
    };
    setHostCombat(next, makeFeedItem({ type: "combat", sender: "GM", event: "combat_end" }));
    return true;
  };

  const snapshotSignature = useMemo(() => JSON.stringify(createLiveCharacterSnapshot(form)), [form]);
  useEffect(() => {
    if (mode !== "player" || status !== "online") return undefined;
    if (autoSyncTimerRef.current) window.clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = window.setTimeout(() => {
      syncCharacter(false);
      autoSyncTimerRef.current = null;
    }, 900);
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
    setCombatNpcHp,
    setCombatAp,
    endCombat,
  };
}
