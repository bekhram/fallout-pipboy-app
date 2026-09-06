import { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { getDerivedStats } from "../utils/characterMath.js";

export const SESSION_CODE_LENGTH = 6;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HOST_PREFIX = "pip2d20-session-";
const MAX_FEED = 120;

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
    for (let i = 0; i < values.length; i += 1) {
      values[i] = Math.floor(Math.random() * 0xffffffff);
    }
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
  try {
    connection?.close?.();
  } catch {
    // Ignore cleanup errors.
  }
}

function makeId(prefix = "evt") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value, maxLength = 600) {
  return String(value || "").trim().slice(0, maxLength);
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
      ? {
          label: cleanText(roll.hitLocation.label, 30),
          value: Number(roll.hitLocation.value || 0),
        }
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

export default function useSharedSession(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [sceneMessage, setSceneMessage] = useState("");
  const [feed, setFeed] = useState([]);

  const peerRef = useRef(null);
  const hostConnectionRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const playersRef = useRef([]);
  const sceneRef = useRef("");
  const feedRef = useRef([]);
  const codeRef = useRef("");
  const formRef = useRef(form);
  const playerNameRef = useRef("");
  const autoSyncTimerRef = useRef(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    sceneRef.current = sceneMessage;
  }, [sceneMessage]);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  const destroyNetwork = () => {
    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
    connectionsRef.current.forEach((connection) => safeClose(connection));
    connectionsRef.current.clear();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    try {
      peerRef.current?.destroy?.();
    } catch {
      // Ignore cleanup errors.
    }
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

  const appendHostFeed = (item) => {
    setHostFeed([...feedRef.current, item]);
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
    if (!existed) {
      appendHostFeed(makeFeedItem({ type: "system", sender: nextPlayer.name, event: "join" }));
    } else {
      window.setTimeout(broadcastState, 0);
    }
  };

  const removePlayer = (peerId) => {
    const previous = playersRef.current.find((item) => item.peerId === peerId);
    const next = playersRef.current.filter((item) => item.peerId !== peerId);
    playersRef.current = next;
    setPlayers(next);
    if (previous) {
      appendHostFeed(makeFeedItem({ type: "system", sender: previous.name, event: "leave" }));
    } else {
      window.setTimeout(broadcastState, 0);
    }
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
    setPlayers([]);
    setSceneMessage("");
    setFeed([]);
    playersRef.current = [];
    sceneRef.current = "";
    feedRef.current = [];
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
    connection.send({
      type: "player_update",
      player: makePlayerPacket(playerNameRef.current, formRef.current),
    });
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

  const snapshotSignature = useMemo(
    () => JSON.stringify(createCharacterSnapshot(form)),
    [form]
  );

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
    isActive: mode === "host" || mode === "player",
    startHost,
    joinSession,
    exitSession,
    broadcastScene,
    sendChat,
    syncCharacter,
    sendDiceResult,
  };
}
