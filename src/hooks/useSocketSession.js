import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getDerivedStats } from "../utils/characterMath.js";

export const SESSION_CODE_LENGTH = 6;
export const GAME_SERVER_URL = "https://fallout-pipboy-server-git-687180641791.europe-west1.run.app";

const CLIENT_ID_KEY = "pip2d20_socket_client_id_v1";
const PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";
const EMPTY_COMBAT = {
  active: false,
  round: 0,
  index: -1,
  activeActorId: null,
  order: [],
  npcs: [],
  ap: 0,
  apMax: 6,
  startedAt: null,
};

export function normalizeSessionCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SESSION_CODE_LENGTH);
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const created = `client-${makeId()}`;
    localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return `client-${makeId()}`;
  }
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function readPortraitSnapshot() {
  try {
    const value = localStorage.getItem(PORTRAIT_STORAGE_KEY) || "";
    if (!value.startsWith("data:image/")) return "";
    return value.length <= 900000 ? value : "";
  } catch {
    return "";
  }
}

function createCharacterSnapshot(form) {
  if (!form) return null;
  let derived = {};
  try { derived = getDerivedStats(form) || {}; } catch { derived = {}; }
  const name = getCharacterName(form) || "Player";
  return {
    name,
    avatar: readPortraitSnapshot(),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    initiative: Math.max(0, Number(derived?.initiative || 0)),
    updatedAt: new Date().toISOString(),
  };
}

function socketError(error, fallback = "networkError") {
  const code = String(error || "").toUpperCase();
  if (code === "ROOM_NOT_FOUND") return { key: "hostNotFound", message: "Room not found" };
  if (code === "ROOM_EXISTS") return { key: "roomUnavailable", message: "Room unavailable" };
  return { key: fallback, message: String(error || "Network error") };
}

function mapPlayers(state) {
  return (Array.isArray(state?.players) ? state.players : []).map((player) => ({
    peerId: player.clientId,
    clientId: player.clientId,
    name: player.name || "Player",
    online: player.online !== false,
    character: {
      name: player.name || "Player",
      avatar: player.avatar || "",
      updatedAt: player.joinedAt ? new Date(player.joinedAt).toISOString() : "",
    },
    updatedAt: player.joinedAt ? new Date(player.joinedAt).toISOString() : "",
  }));
}

function mapLogEntry(entry) {
  const at = Number(entry?.at || Date.now());
  const payload = entry?.payload || {};
  const timestamp = new Date(at).toISOString();

  if (entry?.type === "player_online") {
    return { id: entry.id, type: "system", sender: payload.name || "Player", event: "join", text: "", timestamp };
  }
  if (entry?.type === "player_offline" || entry?.type === "player_left") {
    return { id: entry.id, type: "system", sender: payload.name || "Player", event: "leave", text: "", timestamp };
  }
  if (entry?.type === "dice_result") {
    return {
      id: entry.id,
      type: "roll",
      sender: payload.name || (payload.role === "gm" ? "GM" : "Player"),
      event: "dice",
      text: "",
      roll: payload.result && typeof payload.result === "object" ? payload.result : null,
      timestamp,
    };
  }
  if (entry?.type === "scene_enabled" || entry?.type === "scene_disabled") {
    return {
      id: entry.id,
      type: "combat",
      sender: "GM",
      event: entry.type,
      text: entry.type === "scene_enabled" ? "TACTICAL SCENE ENABLED" : "TACTICAL SCENE DISABLED",
      roll: null,
      timestamp,
    };
  }
  return null;
}

function buildFeed(state) {
  const chat = (Array.isArray(state?.chat) ? state.chat : []).map((message) => ({
    id: message.id,
    type: "chat",
    sender: message.authorName || (message.authorRole === "gm" ? "GM" : "Player"),
    text: message.text || "",
    event: "",
    roll: null,
    timestamp: new Date(Number(message.at || Date.now())).toISOString(),
    sortAt: Number(message.at || 0),
  }));
  const logs = (Array.isArray(state?.log) ? state.log : [])
    .map(mapLogEntry)
    .filter(Boolean)
    .map((item) => ({ ...item, sortAt: new Date(item.timestamp).getTime() }));
  return [...chat, ...logs]
    .sort((a, b) => a.sortAt - b.sortAt)
    .slice(-120)
    .map(({ sortAt, ...item }) => item);
}

function latestGmMessage(state) {
  const messages = Array.isArray(state?.chat) ? state.chat : [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.authorRole === "gm") return String(messages[index]?.text || "");
  }
  return "";
}

export default function useSocketSession(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [roomState, setRoomState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [sceneMessage, setSceneMessage] = useState("");
  const [feed, setFeed] = useState([]);
  const [combat] = useState({ ...EMPTY_COMBAT });

  const socketRef = useRef(null);
  const formRef = useRef(form);
  const clientIdRef = useRef(getClientId());
  const modeRef = useRef("lobby");
  const codeRef = useRef("");
  const nameRef = useRef("");
  const gmSecretRef = useRef("");
  const leavingRef = useRef(false);

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { codeRef.current = sessionCode; }, [sessionCode]);

  const applyState = (state) => {
    if (!state || typeof state !== "object") return;
    setRoomState(state);
    setSessionCode(normalizeSessionCode(state.code || codeRef.current));
    setPlayers(mapPlayers(state));
    setFeed(buildFeed(state));
    setSceneMessage(latestGmMessage(state));
  };

  const emitAck = (event, payload = {}) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, error: "SOCKET_OFFLINE" });
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: "ACK_TIMEOUT" });
    }, 10000);
    socket.emit(event, payload, (response = {}) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(response || {});
    });
  });

  const resumeCurrentRole = async () => {
    const socket = socketRef.current;
    if (!socket?.connected || leavingRef.current) return false;
    const currentMode = modeRef.current;
    const code = codeRef.current;
    if (!code || (currentMode !== "host" && currentMode !== "player")) return false;

    setStatus("connecting");
    let response;
    if (currentMode === "host") {
      response = await emitAck("room:resume-gm", {
        roomCode: code,
        clientId: clientIdRef.current,
        gmName: nameRef.current || "GM",
        gmSecret: gmSecretRef.current,
      });
    } else {
      const snapshot = createCharacterSnapshot(formRef.current);
      response = await emitAck("room:join", {
        roomCode: code,
        clientId: clientIdRef.current,
        playerName: nameRef.current || snapshot?.name || "Player",
        avatar: snapshot?.avatar || "",
      });
    }

    if (!response?.ok) {
      setStatus("disconnected");
      setError(socketError(response?.error));
      return false;
    }
    if (response.state) applyState(response.state);
    setError(null);
    setStatus("online");
    return true;
  };

  const ensureSocket = () => {
    if (socketRef.current) return socketRef.current;
    const socket = io(GAME_SERVER_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 5000,
      timeout: 12000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      if (modeRef.current === "host" || modeRef.current === "player") resumeCurrentRole();
    });
    socket.on("disconnect", () => {
      if (leavingRef.current) return;
      if (modeRef.current === "host" || modeRef.current === "player") setStatus("disconnected");
    });
    socket.on("connect_error", (connectionError) => {
      if (modeRef.current === "host" || modeRef.current === "player") {
        setStatus("disconnected");
        setError(socketError(connectionError?.message || "NETWORK_ERROR"));
      }
    });
    socket.on("room:state", applyState);
    socket.on("chat:message", (message) => {
      setRoomState((current) => {
        if (!current) return current;
        const exists = (current.chat || []).some((item) => item.id === message?.id);
        if (exists) return current;
        const next = { ...current, chat: [...(current.chat || []), message].slice(-100) };
        setFeed(buildFeed(next));
        setSceneMessage(latestGmMessage(next));
        return next;
      });
    });
    return socket;
  };

  const waitForConnection = () => new Promise((resolve) => {
    const socket = ensureSocket();
    if (socket.connected) {
      resolve(true);
      return;
    }
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleError);
      resolve(value);
    };
    const handleConnect = () => finish(true);
    const handleError = () => finish(false);
    socket.once("connect", handleConnect);
    socket.once("connect_error", handleError);
    socket.connect();
    window.setTimeout(() => finish(socket.connected), 14000);
  });

  useEffect(() => () => {
    try { socketRef.current?.disconnect?.(); } catch { /* noop */ }
    socketRef.current = null;
  }, []);

  const startHost = async () => {
    leavingRef.current = false;
    setMode("host");
    modeRef.current = "host";
    setStatus("connecting");
    setError(null);
    nameRef.current = "GM";
    const connected = await waitForConnection();
    if (!connected) {
      setStatus("disconnected");
      setError(socketError("NETWORK_ERROR"));
      return false;
    }
    const response = await emitAck("room:create", {
      gmName: "GM",
      clientId: clientIdRef.current,
    });
    if (!response?.ok) {
      setMode("lobby");
      modeRef.current = "lobby";
      setStatus("waiting");
      setError(socketError(response?.error, "roomUnavailable"));
      return false;
    }
    gmSecretRef.current = String(response.gmSecret || "");
    const code = normalizeSessionCode(response.roomCode || response.state?.code || "");
    codeRef.current = code;
    setSessionCode(code);
    if (response.state) applyState(response.state);
    setStatus("online");
    return true;
  };

  const joinSession = async ({ code, name } = {}) => {
    leavingRef.current = false;
    const safeCode = normalizeSessionCode(code);
    const safeName = String(name || "Player").trim().slice(0, 40) || "Player";
    codeRef.current = safeCode;
    nameRef.current = safeName;
    setSessionCode(safeCode);
    setMode("player");
    modeRef.current = "player";
    setStatus("connecting");
    setError(null);

    const connected = await waitForConnection();
    if (!connected) {
      setStatus("disconnected");
      setError(socketError("NETWORK_ERROR"));
      return false;
    }
    const snapshot = createCharacterSnapshot(formRef.current);
    const response = await emitAck("room:join", {
      roomCode: safeCode,
      clientId: clientIdRef.current,
      playerName: safeName,
      avatar: snapshot?.avatar || "",
    });
    if (!response?.ok) {
      setStatus("disconnected");
      setError(socketError(response?.error));
      return false;
    }
    if (response.state) applyState(response.state);
    setStatus("online");
    return true;
  };

  const exitSession = () => {
    leavingRef.current = true;
    if (socketRef.current?.connected) socketRef.current.emit("room:leave", {});
    setMode("lobby");
    modeRef.current = "lobby";
    setStatus("waiting");
    setError(null);
    setSessionCode("");
    codeRef.current = "";
    gmSecretRef.current = "";
    setRoomState(null);
    setPlayers([]);
    setSceneMessage("");
    setFeed([]);
    window.setTimeout(() => { leavingRef.current = false; }, 0);
    return true;
  };

  const reconnectNow = async () => {
    setError(null);
    setStatus("connecting");
    const connected = await waitForConnection();
    if (!connected) {
      setStatus("disconnected");
      return false;
    }
    return resumeCurrentRole();
  };

  const sendChat = (text) => {
    const value = String(text || "").trim();
    if (!value || status !== "online" || !socketRef.current?.connected) return false;
    socketRef.current.emit("chat:message", { text: value });
    return true;
  };

  const broadcastScene = (text) => {
    if (modeRef.current !== "host") return false;
    const value = String(text || "").trim();
    if (!value) return false;
    setSceneMessage(value);
    return sendChat(value);
  };

  const syncCharacter = () => {
    if (modeRef.current !== "player" || status !== "online") return false;
    const snapshot = createCharacterSnapshot(formRef.current);
    socketRef.current?.emit("room:join", {
      roomCode: codeRef.current,
      clientId: clientIdRef.current,
      playerName: nameRef.current || snapshot?.name || "Player",
      avatar: snapshot?.avatar || "",
    }, (response = {}) => {
      if (response?.state) applyState(response.state);
    });
    return true;
  };

  const sendDiceResult = (roll) => {
    if (!roll || status !== "online" || !socketRef.current?.connected) return false;
    socketRef.current.emit("dice:result", {
      label: roll.label || roll.rollType || roll.diceType || "Dice",
      result: roll,
    });
    return true;
  };

  const tacticalEmit = async (event, payload = {}) => {
    if (status !== "online") return { ok: false, error: "SOCKET_OFFLINE" };
    const response = await emitAck(event, payload);
    if (response?.state) applyState(response.state);
    return response;
  };

  const enableTacticalScene = (payload = {}) => tacticalEmit("scene:enable", payload);
  const disableTacticalScene = () => tacticalEmit("scene:disable", {});
  const updateTacticalScene = (payload = {}) => tacticalEmit("scene:update", payload);
  const createPlayerToken = (payload = {}) => tacticalEmit("token:create-player", payload);
  const createNpcToken = (payload = {}) => tacticalEmit("token:create-npc", payload);
  const updateToken = (tokenId, patch = {}) => tacticalEmit("token:update", { tokenId, ...patch });
  const moveToken = (tokenId, x, y) => tacticalEmit("token:move", { tokenId, x, y });
  const deleteToken = (tokenId) => tacticalEmit("token:delete", { tokenId });

  const tacticalScene = roomState?.scene || null;
  const clientId = clientIdRef.current;
  const connectionMeta = useMemo(() => ({
    transport: "socketio",
    serverUrl: GAME_SERVER_URL,
    clientId,
  }), [clientId]);

  const unsupportedCombatAction = () => false;

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
    realtimeTransport: "socketio",
    serverUrl: GAME_SERVER_URL,
    clientId,
    roomState,
    tacticalScene,
    connectionMeta,
    startHost,
    joinSession,
    exitSession,
    reconnectNow,
    broadcastScene,
    sendChat,
    syncCharacter,
    sendDiceResult,
    enableTacticalScene,
    disableTacticalScene,
    updateTacticalScene,
    createPlayerToken,
    createNpcToken,
    updateToken,
    moveToken,
    deleteToken,
    addCombatNpc: unsupportedCombatAction,
    updateCombatNpc: unsupportedCombatAction,
    removeCombatNpc: unsupportedCombatAction,
    startCombat: unsupportedCombatAction,
    nextCombatTurn: unsupportedCombatAction,
    setCombatNpcHp: unsupportedCombatAction,
    setCombatNpcMaxHp: unsupportedCombatAction,
    updateCombatNpcStats: unsupportedCombatAction,
    setCombatAp: unsupportedCombatAction,
    endCombat: unsupportedCombatAction,
  };
}
