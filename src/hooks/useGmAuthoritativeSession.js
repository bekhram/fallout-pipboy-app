import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { getDerivedStats } from "../utils/characterMath.js";
import {
  getCampaign,
  getResource,
  getResourceHashes,
  putCampaign,
  putResource,
  removeMissingResources,
  sha256,
} from "../utils/sessionLocalCache.js";

export const SESSION_CODE_LENGTH = 6;
export const GAME_SERVER_URL = "https://fallout-pipboy-server-git-687180641791.europe-west1.run.app";

const CLIENT_ID_KEY = "pip2d20_socket_client_id_v1";
const GM_CAMPAIGN_ID_KEY = "pip2d20_gm_campaign_id_v1";
const PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";
const STATE_RESOURCE_ID = "state:snapshot";
const RESOURCE_CHUNK_SIZE = 300_000;

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

function makeId(prefix = "id") {
  const value = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${value}`;
}

function safeClone(value) {
  if (globalThis.structuredClone) {
    try { return globalThis.structuredClone(value); } catch { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(value ?? null));
}

function getClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const created = makeId("client");
    localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return makeId("client");
  }
}

function getOrCreateCampaignId() {
  try {
    const existing = localStorage.getItem(GM_CAMPAIGN_ID_KEY);
    if (existing) return existing;
    const created = makeId("campaign");
    localStorage.setItem(GM_CAMPAIGN_ID_KEY, created);
    return created;
  } catch {
    return makeId("campaign");
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

function makeStartZone(cols = 12, rows = 12) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function makeScene(cols = 12, rows = 12) {
  return {
    active: false,
    sceneId: makeId("scene"),
    cols,
    rows,
    startZone: makeStartZone(cols, rows),
    backgroundUrl: "",
    backgroundName: "",
    tokens: [],
    revision: 1,
  };
}

function makeCampaignState(campaignId) {
  return {
    schemaVersion: 2,
    campaignId,
    revision: 1,
    scene: makeScene(),
    characters: {},
    chat: [],
    log: [],
    updatedAt: Date.now(),
  };
}

function tokenSize(token) {
  return Number(token?.size) === 2 ? 2 : 1;
}

function tokenCells(token, x = token?.x, y = token?.y, size = tokenSize(token)) {
  const cells = [];
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) cells.push(`${Number(x) + dx}:${Number(y) + dy}`);
  }
  return cells;
}

function canPlaceToken(scene, tokenId, x, y, size) {
  const safeX = Number(x);
  const safeY = Number(y);
  if (!Number.isInteger(safeX) || !Number.isInteger(safeY)) return false;
  if (safeX < 0 || safeY < 0 || safeX + size > scene.cols || safeY + size > scene.rows) return false;
  const occupied = new Set();
  for (const token of scene.tokens || []) {
    if (token.id === tokenId) continue;
    tokenCells(token).forEach((cell) => occupied.add(cell));
  }
  return tokenCells({ x: safeX, y: safeY, size }).every((cell) => !occupied.has(cell));
}

function findFreePlacement(scene, size = 1, preferred = []) {
  for (const cell of preferred || []) {
    if (canPlaceToken(scene, null, Number(cell.x), Number(cell.y), size)) return { x: Number(cell.x), y: Number(cell.y) };
  }
  for (let y = 0; y <= scene.rows - size; y += 1) {
    for (let x = 0; x <= scene.cols - size; x += 1) {
      if (canPlaceToken(scene, null, x, y, size)) return { x, y };
    }
  }
  return null;
}

function normalizePosition(scene, token, x, y) {
  const size = tokenSize(token);
  return {
    x: Math.max(0, Math.min(scene.cols - size, Math.floor(Number(x) || 0))),
    y: Math.max(0, Math.min(scene.rows - size, Math.floor(Number(y) || 0))),
  };
}

function normalizeStartZone(value, cols, rows) {
  const cells = Array.isArray(value) ? value : [];
  const result = cells
    .map((cell) => ({ x: Math.floor(Number(cell?.x)), y: Math.floor(Number(cell?.y)) }))
    .filter((cell) => Number.isInteger(cell.x) && Number.isInteger(cell.y) && cell.x >= 0 && cell.y >= 0 && cell.x < cols && cell.y < rows);
  return result.length ? result : makeStartZone(cols, rows);
}

function normalizeCharacter(snapshot, fallbackName = "Player") {
  const value = snapshot && typeof snapshot === "object" ? snapshot : {};
  return {
    name: String(value.name || fallbackName).trim().slice(0, 80) || fallbackName,
    avatar: String(value.avatar || "").startsWith("data:image/") ? String(value.avatar).slice(0, 900000) : "",
    level: Math.max(1, Number(value.level || 1)),
    currentHp: Math.max(0, Number(value.currentHp || 0)),
    maxHp: Math.max(0, Number(value.maxHp || 0)),
    defense: Math.max(0, Number(value.defense || 0)),
    initiative: Math.max(0, Number(value.initiative || 0)),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function mapLogEntry(entry) {
  const timestamp = new Date(Number(entry?.at || Date.now())).toISOString();
  const payload = entry?.payload || {};
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

function mapPlayers(presence, state) {
  const characters = state?.characters || {};
  return (Array.isArray(presence?.players) ? presence.players : []).map((player) => {
    const character = characters[player.clientId] || { name: player.name || "Player", avatar: "" };
    return {
      peerId: player.clientId,
      clientId: player.clientId,
      name: player.name || character.name || "Player",
      online: player.online !== false,
      character,
      updatedAt: character.updatedAt || (player.joinedAt ? new Date(player.joinedAt).toISOString() : ""),
    };
  });
}

function dataMime(data, fallback = "application/octet-stream") {
  const match = String(data || "").match(/^data:([^;,]+)[;,]/i);
  return match?.[1] || fallback;
}

async function externalizeState(state, campaignId, hashCache) {
  const portable = safeClone(state);
  const resources = [];
  const dataById = new Map();

  const addResource = async (id, data, type = "asset", name = id, mime = dataMime(data)) => {
    if (!data) return null;
    const previous = hashCache.get(id);
    const hash = previous?.data === data ? previous.hash : await sha256(data);
    hashCache.set(id, { data, hash });
    const resource = { id, hash, type, name, mime, size: String(data).length, data };
    resources.push(resource);
    dataById.set(id, resource);
    await putResource(campaignId, resource);
    return id;
  };

  if (portable.scene?.backgroundUrl?.startsWith?.("data:image/")) {
    const id = "tactical-background";
    await addResource(id, portable.scene.backgroundUrl, "image", portable.scene.backgroundName || "Tactical background");
    portable.scene.backgroundAssetId = id;
    portable.scene.backgroundUrl = "";
  } else if (!portable.scene?.backgroundUrl) {
    delete portable.scene?.backgroundAssetId;
  }

  for (const token of portable.scene?.tokens || []) {
    if (!token?.avatar?.startsWith?.("data:image/")) continue;
    const id = `token-avatar:${token.id}`;
    await addResource(id, token.avatar, "image", `${token.name || "Token"} avatar`);
    token.avatarAssetId = id;
    token.avatar = "";
  }

  for (const [clientId, character] of Object.entries(portable.characters || {})) {
    if (!character?.avatar?.startsWith?.("data:image/")) continue;
    const id = `character-avatar:${clientId}`;
    await addResource(id, character.avatar, "image", `${character.name || "Player"} avatar`);
    character.avatarAssetId = id;
    character.avatar = "";
  }

  const stateData = JSON.stringify(portable);
  const stateHash = await sha256(stateData);
  const stateResource = {
    id: STATE_RESOURCE_ID,
    hash: stateHash,
    type: "json",
    name: "Campaign state",
    mime: "application/json",
    size: stateData.length,
    data: stateData,
  };
  resources.unshift(stateResource);
  dataById.set(STATE_RESOURCE_ID, stateResource);
  await putResource(campaignId, stateResource);

  return {
    manifest: {
      protocol: 2,
      campaignId,
      revision: Number(state.revision || 0),
      resources: resources.map(({ data, ...meta }) => meta),
      generatedAt: Date.now(),
    },
    dataById,
  };
}

async function hydrateStateFromCache(manifest) {
  if (!manifest?.campaignId) return null;
  const stateResource = await getResource(manifest.campaignId, STATE_RESOURCE_ID);
  if (!stateResource?.data) return null;
  const portable = JSON.parse(stateResource.data);

  if (portable.scene?.backgroundAssetId) {
    const resource = await getResource(manifest.campaignId, portable.scene.backgroundAssetId);
    portable.scene.backgroundUrl = resource?.data || "";
  }

  for (const token of portable.scene?.tokens || []) {
    if (!token.avatarAssetId) continue;
    const resource = await getResource(manifest.campaignId, token.avatarAssetId);
    token.avatar = resource?.data || "";
  }

  for (const character of Object.values(portable.characters || {})) {
    if (!character?.avatarAssetId) continue;
    const resource = await getResource(manifest.campaignId, character.avatarAssetId);
    character.avatar = resource?.data || "";
  }
  return portable;
}

export default function useGmAuthoritativeSession(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [presenceState, setPresenceState] = useState(null);
  const [mirroredState, setMirroredState] = useState(null);
  const [campaignId, setCampaignId] = useState("");
  const [syncState, setSyncState] = useState({ phase: "idle", cached: 0, requested: 0 });
  const [combat] = useState({ ...EMPTY_COMBAT });

  const socketRef = useRef(null);
  const formRef = useRef(form);
  const clientIdRef = useRef(getClientId());
  const modeRef = useRef("lobby");
  const codeRef = useRef("");
  const nameRef = useRef("");
  const gmSecretRef = useRef("");
  const campaignIdRef = useRef("");
  const leavingRef = useRef(false);
  const gmStateRef = useRef(null);
  const manifestRef = useRef(null);
  const bundleRef = useRef(null);
  const hashCacheRef = useRef(new Map());
  const pendingActionsRef = useRef(new Map());
  const chunksRef = useRef(new Map());
  const knownPresenceRef = useRef(new Set());
  const commitQueueRef = useRef(Promise.resolve());

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { codeRef.current = sessionCode; }, [sessionCode]);
  useEffect(() => { campaignIdRef.current = campaignId; }, [campaignId]);

  const emitAck = (event, payload = {}, timeoutMs = 10000) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, error: "SOCKET_OFFLINE" });
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, error: "ACK_TIMEOUT" });
    }, timeoutMs);
    socket.emit(event, payload, (response = {}) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(response || {});
    });
  });

  const relayToGm = (type, data) => emitAck("relay:to-gm", { type, data });
  const relayToPlayer = (targetClientId, type, data) => emitAck("relay:to-player", { targetClientId, type, data }, 15000);
  const relayBroadcast = (type, data) => emitAck("relay:broadcast", { type, data }, 15000);

  const prepareBundle = async () => {
    if (!gmStateRef.current || !campaignIdRef.current) return null;
    const bundle = await externalizeState(gmStateRef.current, campaignIdRef.current, hashCacheRef.current);
    bundleRef.current = bundle;
    return bundle;
  };

  const sendManifestToPlayer = async (clientId) => {
    const bundle = await prepareBundle();
    if (!bundle || !clientId) return false;
    const response = await relayToPlayer(clientId, "sync:manifest", bundle.manifest);
    return Boolean(response?.ok);
  };

  const publishManifest = async () => {
    const bundle = await prepareBundle();
    if (!bundle) return false;
    if (!socketRef.current?.connected || modeRef.current !== "host") return true;
    const response = await relayBroadcast("sync:manifest", bundle.manifest);
    return Boolean(response?.ok);
  };

  const persistGmState = async (nextState, broadcast = true) => {
    gmStateRef.current = nextState;
    setMirroredState(nextState);
    await putCampaign({
      campaignId: campaignIdRef.current,
      role: "gm",
      revision: nextState.revision,
      state: nextState,
    }).catch(() => null);
    if (broadcast) await publishManifest();
    return nextState;
  };

  const mutateGmState = (mutator, { broadcast = true } = {}) => {
    const run = async () => {
      const current = gmStateRef.current || makeCampaignState(campaignIdRef.current || getOrCreateCampaignId());
      const next = safeClone(current);
      const result = await mutator(next, current);
      if (result?.ok === false) return result;
      next.campaignId = campaignIdRef.current || current.campaignId;
      next.revision = Number(current.revision || 0) + 1;
      next.updatedAt = Date.now();
      await persistGmState(next, broadcast);
      return { ok: true, ...(result || {}) };
    };
    const queued = commitQueueRef.current.then(run, run);
    commitQueueRef.current = queued.catch(() => null);
    return queued;
  };

  const appendChat = (next, { role, clientId, name, text }) => {
    const value = String(text || "").trim().slice(0, 1200);
    if (!value) return { ok: false, error: "EMPTY_MESSAGE" };
    const message = {
      id: makeId("chat"),
      authorClientId: clientId,
      authorRole: role,
      authorName: name || (role === "gm" ? "GM" : "Player"),
      text: value,
      at: Date.now(),
    };
    next.chat = [...(next.chat || []), message].slice(-100);
    return { message };
  };

  const appendDice = (next, { role, clientId, name, roll }) => {
    const entry = {
      id: makeId("log"),
      type: "dice_result",
      at: Date.now(),
      payload: {
        clientId,
        role,
        name: name || (role === "gm" ? "GM" : "Player"),
        label: roll?.label || roll?.rollType || roll?.diceType || "Dice",
        result: roll,
      },
    };
    next.log = [...(next.log || []), entry].slice(-200);
    return { entry };
  };

  const applyPlayerAction = async (fromClientId, fromName, action, payload = {}) => mutateGmState((next) => {
    const scene = next.scene || (next.scene = makeScene());
    if (action === "character:update") {
      next.characters ||= {};
      next.characters[fromClientId] = normalizeCharacter(payload.character, fromName || "Player");
      return {};
    }
    if (action === "chat:message") return appendChat(next, { role: "player", clientId: fromClientId, name: fromName, text: payload.text });
    if (action === "dice:result") return appendDice(next, { role: "player", clientId: fromClientId, name: fromName, roll: payload.roll });
    if (action === "token:create-player") {
      if (!scene.active) return { ok: false, error: "SCENE_INACTIVE" };
      const existing = (scene.tokens || []).find((token) => token.kind === "player" && token.ownerClientId === fromClientId);
      if (existing) return { token: existing };
      const placement = findFreePlacement(scene, 1, scene.startZone || []);
      if (!placement) return { ok: false, error: "NO_FREE_CELL" };
      const token = {
        id: makeId("player"),
        kind: "player",
        ownerClientId: fromClientId,
        npcId: null,
        name: String(payload.name || fromName || "Player").trim().slice(0, 80) || "Player",
        avatar: String(payload.avatar || "").startsWith("data:image/") ? String(payload.avatar).slice(0, 900000) : "",
        size: 1,
        x: placement.x,
        y: placement.y,
        stats: null,
      };
      scene.tokens = [...(scene.tokens || []), token];
      scene.revision = Number(scene.revision || 0) + 1;
      return { token };
    }
    const token = (scene.tokens || []).find((item) => item.id === payload.tokenId);
    const ownsToken = token?.kind === "player" && token.ownerClientId === fromClientId;
    if (["token:update", "token:move", "token:delete"].includes(action) && !ownsToken) return { ok: false, error: "TOKEN_FORBIDDEN" };
    if (action === "token:update") {
      if (Object.prototype.hasOwnProperty.call(payload, "avatar")) {
        token.avatar = String(payload.avatar || "").startsWith("data:image/") ? String(payload.avatar).slice(0, 900000) : "";
      }
      scene.revision = Number(scene.revision || 0) + 1;
      return { token };
    }
    if (action === "token:move") {
      if (!scene.active) return { ok: false, error: "SCENE_INACTIVE" };
      const target = normalizePosition(scene, token, payload.x, payload.y);
      if (!canPlaceToken(scene, token.id, target.x, target.y, tokenSize(token))) return { ok: false, error: "CELL_BLOCKED" };
      token.x = target.x;
      token.y = target.y;
      scene.revision = Number(scene.revision || 0) + 1;
      return { token };
    }
    if (action === "token:delete") {
      scene.tokens = (scene.tokens || []).filter((item) => item.id !== token.id);
      scene.revision = Number(scene.revision || 0) + 1;
      return {};
    }
    return { ok: false, error: "UNKNOWN_ACTION" };
  });

  const handlePlayerActionPacket = async (packet) => {
    const requestId = packet?.data?.requestId;
    const action = packet?.data?.action;
    const payload = packet?.data?.payload || {};
    if (!requestId || !action) return;
    let result;
    try {
      result = await applyPlayerAction(packet.fromClientId, packet.fromName, action, payload);
    } catch (actionError) {
      result = { ok: false, error: actionError?.message || "ACTION_FAILED" };
    }
    await relayToPlayer(packet.fromClientId, "action:result", { requestId, ...result });
  };

  const sendResourceToPlayer = async (targetClientId, resource) => {
    if (!resource) return false;
    const data = String(resource.data ?? "");
    const total = Math.max(1, Math.ceil(data.length / RESOURCE_CHUNK_SIZE));
    const transferId = makeId("transfer");
    for (let index = 0; index < total; index += 1) {
      const chunk = data.slice(index * RESOURCE_CHUNK_SIZE, (index + 1) * RESOURCE_CHUNK_SIZE);
      const response = await relayToPlayer(targetClientId, "sync:resource-chunk", {
        transferId,
        id: resource.id,
        hash: resource.hash,
        type: resource.type,
        name: resource.name,
        mime: resource.mime,
        size: resource.size,
        index,
        total,
        chunk,
      });
      if (!response?.ok) return false;
    }
    return true;
  };

  const handleResourceRequest = async (packet) => {
    const ids = [...new Set(Array.isArray(packet?.data?.ids) ? packet.data.ids.map(String) : [])].slice(0, 200);
    if (!ids.length) return;
    const bundle = await prepareBundle();
    if (!bundle) return;
    for (const id of ids) {
      await sendResourceToPlayer(packet.fromClientId, bundle.dataById.get(id));
    }
  };

  const tryHydrateManifest = async (manifest) => {
    const hashes = await getResourceHashes(manifest.campaignId).catch(() => ({}));
    const complete = (manifest.resources || []).every((resource) => hashes[resource.id] === resource.hash);
    if (!complete) return false;
    const hydrated = await hydrateStateFromCache(manifest).catch(() => null);
    if (!hydrated) return false;
    setMirroredState(hydrated);
    await putCampaign({
      campaignId: manifest.campaignId,
      role: "player-cache",
      revision: hydrated.revision,
      state: hydrated,
      manifest,
    }).catch(() => null);
    setSyncState({ phase: "ready", cached: manifest.resources?.length || 0, requested: 0 });
    return true;
  };

  const handleManifest = async (manifest) => {
    if (!manifest?.campaignId || !Array.isArray(manifest.resources)) return;
    manifestRef.current = manifest;
    campaignIdRef.current = manifest.campaignId;
    setCampaignId(manifest.campaignId);

    const ids = manifest.resources.map((resource) => resource.id);
    await removeMissingResources(manifest.campaignId, ids).catch(() => null);
    const hashes = await getResourceHashes(manifest.campaignId).catch(() => ({}));
    const missing = manifest.resources.filter((resource) => hashes[resource.id] !== resource.hash);
    const cached = manifest.resources.length - missing.length;
    setSyncState({ phase: missing.length ? "downloading" : "cache-hit", cached, requested: missing.length });

    if (!missing.length) {
      await tryHydrateManifest(manifest);
      return;
    }
    await relayToGm("sync:request", { campaignId: manifest.campaignId, ids: missing.map((resource) => resource.id) });
  };

  const handleResourceChunk = async (data) => {
    const manifest = manifestRef.current;
    if (!manifest?.campaignId || !data?.id || !data?.transferId) return;
    const expected = manifest.resources.find((resource) => resource.id === data.id);
    if (!expected || expected.hash !== data.hash) return;

    let transfer = chunksRef.current.get(data.transferId);
    if (!transfer) {
      transfer = { ...data, chunks: new Array(Number(data.total || 1)).fill(null), received: 0 };
      chunksRef.current.set(data.transferId, transfer);
    }
    const index = Number(data.index || 0);
    if (transfer.chunks[index] == null) {
      transfer.chunks[index] = String(data.chunk || "");
      transfer.received += 1;
    }
    if (transfer.received < transfer.chunks.length) return;

    chunksRef.current.delete(data.transferId);
    const resourceData = transfer.chunks.join("");
    const actualHash = await sha256(resourceData);
    if (actualHash !== expected.hash) {
      await relayToGm("sync:request", { campaignId: manifest.campaignId, ids: [expected.id] });
      return;
    }
    await putResource(manifest.campaignId, {
      id: expected.id,
      hash: expected.hash,
      type: expected.type,
      mime: expected.mime,
      name: expected.name,
      size: expected.size,
      data: resourceData,
    });
    await tryHydrateManifest(manifest);
  };

  const applyPresence = (state) => {
    if (!state || typeof state !== "object") return;
    setPresenceState(state);
    setSessionCode(normalizeSessionCode(state.code || codeRef.current));
    if (modeRef.current === "host") {
      const nextIds = new Set((state.players || []).filter((player) => player.online !== false).map((player) => player.clientId));
      for (const id of nextIds) {
        if (!knownPresenceRef.current.has(id)) sendManifestToPlayer(id);
      }
      knownPresenceRef.current = nextIds;
    }
  };

  const sendPlayerAction = (action, payload = {}) => new Promise(async (resolve) => {
    if (!socketRef.current?.connected || modeRef.current !== "player") {
      resolve({ ok: false, error: "SOCKET_OFFLINE" });
      return;
    }
    const requestId = makeId("request");
    const timer = window.setTimeout(() => {
      pendingActionsRef.current.delete(requestId);
      resolve({ ok: false, error: "ACTION_TIMEOUT" });
    }, 12000);
    pendingActionsRef.current.set(requestId, (result) => {
      window.clearTimeout(timer);
      resolve(result);
    });
    const response = await relayToGm("action", { requestId, action, payload });
    if (!response?.ok) {
      const handler = pendingActionsRef.current.get(requestId);
      pendingActionsRef.current.delete(requestId);
      handler?.({ ok: false, error: response?.error || "RELAY_FAILED" });
    }
  });

  const resumeCurrentRole = async () => {
    if (!socketRef.current?.connected || leavingRef.current) return false;
    const currentMode = modeRef.current;
    const code = codeRef.current;
    if (!code || !["host", "player"].includes(currentMode)) return false;
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
      response = await emitAck("room:join", {
        roomCode: code,
        clientId: clientIdRef.current,
        playerName: nameRef.current || getCharacterName(formRef.current) || "Player",
        avatar: "",
      });
    }
    if (!response?.ok) {
      setStatus("disconnected");
      setError(socketError(response?.error));
      return false;
    }
    if (response.state) applyPresence(response.state);
    setStatus("online");
    setError(null);
    if (currentMode === "player") {
      await relayToGm("sync:hello", { roomCode: code });
      const character = createCharacterSnapshot(formRef.current);
      await sendPlayerAction("character:update", { character });
    } else {
      await publishManifest();
    }
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
      if (["host", "player"].includes(modeRef.current)) resumeCurrentRole();
    });
    socket.on("disconnect", () => {
      if (!leavingRef.current && ["host", "player"].includes(modeRef.current)) setStatus("disconnected");
    });
    socket.on("connect_error", (connectionError) => {
      if (["host", "player"].includes(modeRef.current)) {
        setStatus("disconnected");
        setError(socketError(connectionError?.message || "NETWORK_ERROR"));
      }
    });
    socket.on("room:state", applyPresence);
    socket.on("relay:gm", (packet) => {
      if (modeRef.current !== "host") return;
      if (packet?.type === "sync:hello") sendManifestToPlayer(packet.fromClientId);
      else if (packet?.type === "sync:request") handleResourceRequest(packet);
      else if (packet?.type === "action") handlePlayerActionPacket(packet);
    });
    socket.on("relay:player", (packet) => {
      if (modeRef.current !== "player") return;
      if (packet?.type === "sync:manifest") handleManifest(packet.data);
      else if (packet?.type === "sync:resource-chunk") handleResourceChunk(packet.data);
      else if (packet?.type === "action:result") {
        const requestId = packet.data?.requestId;
        const resolver = pendingActionsRef.current.get(requestId);
        if (resolver) {
          pendingActionsRef.current.delete(requestId);
          resolver(packet.data);
        }
      }
    });
    return socket;
  };

  const waitForConnection = () => new Promise((resolve) => {
    const socket = ensureSocket();
    if (socket.connected) return resolve(true);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      resolve(value);
    };
    const onConnect = () => finish(true);
    const onError = () => finish(false);
    socket.once("connect", onConnect);
    socket.once("connect_error", onError);
    socket.connect();
    window.setTimeout(() => finish(socket.connected), 14000);
  });

  useEffect(() => () => {
    try { socketRef.current?.disconnect?.(); } catch { /* noop */ }
    for (const resolver of pendingActionsRef.current.values()) resolver({ ok: false, error: "SESSION_CLOSED" });
    pendingActionsRef.current.clear();
    socketRef.current = null;
  }, []);

  const startHost = async () => {
    leavingRef.current = false;
    setMode("host");
    modeRef.current = "host";
    setStatus("connecting");
    setError(null);
    nameRef.current = "GM";
    const id = getOrCreateCampaignId();
    campaignIdRef.current = id;
    setCampaignId(id);
    const cached = await getCampaign(id).catch(() => null);
    const initial = cached?.state || makeCampaignState(id);
    gmStateRef.current = initial;
    setMirroredState(initial);
    await putCampaign({ campaignId: id, role: "gm", revision: initial.revision, state: initial }).catch(() => null);

    const connected = await waitForConnection();
    if (!connected) {
      setStatus("disconnected");
      setError(socketError("NETWORK_ERROR"));
      return false;
    }
    const response = await emitAck("room:create", {
      gmName: "GM",
      clientId: clientIdRef.current,
      protocol: 2,
      campaignId: id,
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
    if (response.state) applyPresence(response.state);
    setStatus("online");
    setSyncState({ phase: "gm-authority", cached: 0, requested: 0 });
    await publishManifest();
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
    setSyncState({ phase: "waiting-manifest", cached: 0, requested: 0 });

    const connected = await waitForConnection();
    if (!connected) {
      setStatus("disconnected");
      setError(socketError("NETWORK_ERROR"));
      return false;
    }
    const response = await emitAck("room:join", {
      roomCode: safeCode,
      clientId: clientIdRef.current,
      playerName: safeName,
      avatar: "",
    });
    if (!response?.ok) {
      setStatus("disconnected");
      setError(socketError(response?.error));
      return false;
    }
    if (response.state) applyPresence(response.state);
    setStatus("online");
    await relayToGm("sync:hello", { roomCode: safeCode });
    const character = createCharacterSnapshot(formRef.current);
    sendPlayerAction("character:update", { character });
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
    knownPresenceRef.current = new Set();
    setPresenceState(null);
    setMirroredState(null);
    setCampaignId("");
    setSyncState({ phase: "idle", cached: 0, requested: 0 });
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
    if (!value || status !== "online") return false;
    if (modeRef.current === "host") {
      mutateGmState((next) => appendChat(next, { role: "gm", clientId: clientIdRef.current, name: "GM", text: value }));
      return true;
    }
    sendPlayerAction("chat:message", { text: value });
    return true;
  };

  const broadcastScene = (text) => {
    if (modeRef.current !== "host") return false;
    return sendChat(text);
  };

  const syncCharacter = () => {
    if (modeRef.current !== "player" || !socketRef.current?.connected) return false;
    sendPlayerAction("character:update", { character: createCharacterSnapshot(formRef.current) });
    return true;
  };

  const sendDiceResult = (roll) => {
    if (!roll || status !== "online") return false;
    if (modeRef.current === "host") {
      mutateGmState((next) => appendDice(next, { role: "gm", clientId: clientIdRef.current, name: "GM", roll }));
      return true;
    }
    sendPlayerAction("dice:result", { roll });
    return true;
  };

  const enableTacticalScene = (payload = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const previous = next.scene || makeScene();
      const cols = Math.max(4, Math.min(40, Number(payload.cols || previous.cols || 12)));
      const rows = Math.max(4, Math.min(40, Number(payload.rows || previous.rows || 12)));
      const npcs = payload.keepNpcs === false ? [] : (previous.tokens || []).filter((token) => token.kind !== "player" && token.x < cols && token.y < rows);
      next.scene = {
        active: true,
        sceneId: makeId("scene"),
        cols,
        rows,
        startZone: normalizeStartZone(payload.startZone, cols, rows),
        backgroundUrl: Object.prototype.hasOwnProperty.call(payload, "backgroundUrl") ? (payload.backgroundUrl || "") : (previous.backgroundUrl || ""),
        backgroundName: String(payload.backgroundName || previous.backgroundName || "").slice(0, 160),
        tokens: npcs,
        revision: Number(previous.revision || 0) + 1,
      };
      next.log = [...(next.log || []), { id: makeId("log"), type: "scene_enabled", at: Date.now(), payload: { sceneId: next.scene.sceneId } }].slice(-200);
      return {};
    });
  };

  const disableTacticalScene = () => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      next.scene.active = false;
      next.scene.revision = Number(next.scene.revision || 0) + 1;
      next.log = [...(next.log || []), { id: makeId("log"), type: "scene_disabled", at: Date.now(), payload: { sceneId: next.scene.sceneId } }].slice(-200);
      return {};
    });
  };

  const updateTacticalScene = (payload = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      if (Object.prototype.hasOwnProperty.call(payload, "backgroundUrl")) {
        next.scene.backgroundUrl = payload.backgroundUrl || "";
        next.scene.backgroundName = String(payload.backgroundName || "").slice(0, 160);
      }
      if (Array.isArray(payload.startZone)) next.scene.startZone = normalizeStartZone(payload.startZone, next.scene.cols, next.scene.rows);
      next.scene.revision = Number(next.scene.revision || 0) + 1;
      return {};
    });
  };

  const createPlayerToken = (payload = {}) => {
    if (modeRef.current !== "player") return Promise.resolve({ ok: false, error: "PLAYER_ONLY" });
    return sendPlayerAction("token:create-player", payload);
  };

  const createNpcToken = (payload = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const size = Number(payload.size) === 2 ? 2 : 1;
      const requestedX = Math.floor(Number(payload.x));
      const requestedY = Math.floor(Number(payload.y));
      const requestedValid = Number.isInteger(requestedX) && Number.isInteger(requestedY) && canPlaceToken(next.scene, null, requestedX, requestedY, size);
      const placement = requestedValid ? { x: requestedX, y: requestedY } : findFreePlacement(next.scene, size, []);
      if (!placement) return { ok: false, error: "NO_FREE_CELL" };
      const token = {
        id: makeId("npc"),
        kind: "npc",
        ownerClientId: null,
        npcId: payload.npcId || null,
        name: String(payload.name || "NPC").trim().slice(0, 80) || "NPC",
        avatar: String(payload.avatar || "").startsWith("data:image/") ? String(payload.avatar).slice(0, 900000) : "",
        size,
        x: placement.x,
        y: placement.y,
        stats: payload.stats && typeof payload.stats === "object" ? payload.stats : null,
      };
      next.scene.tokens = [...(next.scene.tokens || []), token];
      next.scene.revision = Number(next.scene.revision || 0) + 1;
      return { token };
    });
  };

  const updateToken = (tokenId, patch = {}) => {
    if (modeRef.current === "player") return sendPlayerAction("token:update", { tokenId, ...patch });
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "NOT_IN_SESSION" });
    return mutateGmState((next) => {
      const token = (next.scene.tokens || []).find((item) => item.id === tokenId);
      if (!token) return { ok: false, error: "TOKEN_NOT_FOUND" };
      if (Object.prototype.hasOwnProperty.call(patch, "avatar")) token.avatar = patch.avatar || "";
      if (Object.prototype.hasOwnProperty.call(patch, "name")) token.name = String(patch.name || token.name).slice(0, 80);
      if (Object.prototype.hasOwnProperty.call(patch, "stats") && patch.stats && typeof patch.stats === "object") token.stats = patch.stats;
      if (Object.prototype.hasOwnProperty.call(patch, "size")) {
        const size = Number(patch.size) === 2 ? 2 : 1;
        if (canPlaceToken(next.scene, token.id, token.x, token.y, size)) token.size = size;
      }
      next.scene.revision = Number(next.scene.revision || 0) + 1;
      return { token };
    });
  };

  const moveToken = (tokenId, x, y) => {
    if (modeRef.current === "player") return sendPlayerAction("token:move", { tokenId, x, y });
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "NOT_IN_SESSION" });
    return mutateGmState((next) => {
      const token = (next.scene.tokens || []).find((item) => item.id === tokenId);
      if (!token) return { ok: false, error: "TOKEN_NOT_FOUND" };
      const target = normalizePosition(next.scene, token, x, y);
      if (!canPlaceToken(next.scene, token.id, target.x, target.y, tokenSize(token))) return { ok: false, error: "CELL_BLOCKED" };
      token.x = target.x;
      token.y = target.y;
      next.scene.revision = Number(next.scene.revision || 0) + 1;
      return { token };
    });
  };

  const deleteToken = (tokenId) => {
    if (modeRef.current === "player") return sendPlayerAction("token:delete", { tokenId });
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "NOT_IN_SESSION" });
    return mutateGmState((next) => {
      const exists = (next.scene.tokens || []).some((item) => item.id === tokenId);
      if (!exists) return { ok: false, error: "TOKEN_NOT_FOUND" };
      next.scene.tokens = next.scene.tokens.filter((item) => item.id !== tokenId);
      next.scene.revision = Number(next.scene.revision || 0) + 1;
      return {};
    });
  };

  const players = useMemo(() => mapPlayers(presenceState, mirroredState), [presenceState, mirroredState]);
  const feed = useMemo(() => buildFeed(mirroredState), [mirroredState]);
  const sceneMessage = useMemo(() => latestGmMessage(mirroredState), [mirroredState]);
  const tacticalScene = mirroredState?.scene || null;
  const roomState = useMemo(() => ({
    ...(presenceState || {}),
    protocol: 2,
    campaignId,
    scene: tacticalScene,
    chat: mirroredState?.chat || [],
    log: mirroredState?.log || [],
  }), [presenceState, campaignId, tacticalScene, mirroredState]);

  const clientId = clientIdRef.current;
  const connectionMeta = useMemo(() => ({
    transport: "socketio-gm-authority",
    serverUrl: GAME_SERVER_URL,
    clientId,
    campaignId,
    syncState,
  }), [clientId, campaignId, syncState]);

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
    realtimeTransport: "socketio-gm-authority",
    serverUrl: GAME_SERVER_URL,
    clientId,
    campaignId,
    syncState,
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
