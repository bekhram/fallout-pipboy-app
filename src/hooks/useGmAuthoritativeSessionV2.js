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
import {
  STATE_RESOURCE_ID,
  canPlaceToken,
  commitSelectedScene,
  externalizeCampaign,
  findFreePlacement,
  hydrateCampaignFromCache,
  liveScene,
  loadPlayerTokenProfile,
  makeId,
  makeScene,
  normalizeCampaignState,
  normalizePosition,
  normalizeStartZone,
  playerProfileId,
  safeClone,
  savePlayerTokenProfile,
  selectedScene,
  tokenSize,
} from "../utils/gmSessionModel.js";

export const SESSION_CODE_LENGTH = 6;
export const GAME_SERVER_URL = "https://fallout-pipboy-server-git-687180641791.europe-west1.run.app";

const CLIENT_ID_KEY = "pip2d20_socket_client_id_v1";
const GM_CAMPAIGN_ID_KEY = "pip2d20_gm_campaign_id_v1";
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
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, SESSION_CODE_LENGTH);
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

function createCharacterSnapshot(form) {
  if (!form) return null;
  let derived = {};
  try { derived = getDerivedStats(form) || {}; } catch { derived = {}; }
  return {
    name: getCharacterName(form) || "Player",
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    initiative: Math.max(0, Number(derived?.initiative || 0)),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCharacter(snapshot, fallbackName = "Player") {
  const value = snapshot && typeof snapshot === "object" ? snapshot : {};
  return {
    name: String(value.name || fallbackName).trim().slice(0, 80) || fallbackName,
    level: Math.max(1, Number(value.level || 1)),
    currentHp: Math.max(0, Number(value.currentHp || 0)),
    maxHp: Math.max(0, Number(value.maxHp || 0)),
    defense: Math.max(0, Number(value.defense || 0)),
    initiative: Math.max(0, Number(value.initiative || 0)),
    updatedAt: value.updatedAt || new Date().toISOString(),
  };
}

function socketError(error, fallback = "networkError") {
  const code = String(error || "").toUpperCase();
  if (code === "ROOM_NOT_FOUND") return { key: "hostNotFound", message: "Room not found" };
  if (code === "ROOM_EXISTS") return { key: "roomUnavailable", message: "Room unavailable" };
  if (code === "GM_OFFLINE") return { key: "hostNotFound", message: "GM is offline" };
  return { key: fallback, message: String(error || "Network error") };
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
  if (entry?.type === "scene_enabled" || entry?.type === "scene_disabled" || entry?.type === "scene_switched") {
    return {
      id: entry.id,
      type: "combat",
      sender: "GM",
      event: entry.type,
      text: entry.type === "scene_disabled" ? "TACTICAL SCENE DISABLED" : `TACTICAL SCENE: ${payload.name || "SCENE"}`,
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

function playerTokenAvatarFromState(state, clientId) {
  for (const scene of state?.scenes || []) {
    const token = (scene.tokens || []).find((item) => item.kind === "player" && item.ownerClientId === clientId && item.avatar);
    if (token?.avatar) return token.avatar;
  }
  return "";
}

function mapPlayers(presence, state) {
  const characters = state?.characters || {};
  return (Array.isArray(presence?.players) ? presence.players : []).map((player) => {
    const character = characters[player.clientId] || { name: player.name || "Player" };
    const avatar = character.avatar || playerTokenAvatarFromState(state, player.clientId) || "";
    return {
      peerId: player.clientId,
      clientId: player.clientId,
      name: player.name || character.name || "Player",
      online: player.online !== false,
      character: { ...character, avatar },
      updatedAt: character.updatedAt || (player.joinedAt ? new Date(player.joinedAt).toISOString() : ""),
    };
  });
}

function appendChat(next, { role, clientId, name, text }) {
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
}

function appendDice(next, { role, clientId, name, roll }) {
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
}

function sceneById(state, id) {
  return (state?.scenes || []).find((scene) => scene.sceneId === id) || null;
}

export default function useGmAuthoritativeSessionV2(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [presenceState, setPresenceState] = useState(null);
  const [mirroredState, setMirroredState] = useState(null);
  const [campaignId, setCampaignId] = useState("");
  const [syncState, setSyncState] = useState({ phase: "idle", cached: 0, requested: 0 });
  const [playerTokenProfile, setPlayerTokenProfile] = useState({ name: "Player", size: 1, avatar: "", avatarAssetId: "", avatarHash: "" });
  const [combat] = useState({ ...EMPTY_COMBAT });

  const socketRef = useRef(null);
  const formRef = useRef(form);
  const clientIdRef = useRef(getClientId());
  const modeRef = useRef("lobby");
  const codeRef = useRef("");
  const nameRef = useRef("");
  const gmSecretRef = useRef("");
  const campaignIdRef = useRef("");
  const gmStateRef = useRef(null);
  const playerProfileRef = useRef(playerTokenProfile);
  const leavingRef = useRef(false);
  const knownPresenceRef = useRef(new Set());
  const hashCacheRef = useRef(new Map());
  const bundleRef = useRef(null);
  const manifestRef = useRef(null);
  const playerReceiveChunksRef = useRef(new Map());
  const gmReceivePlayerChunksRef = useRef(new Map());
  const pendingActionsRef = useRef(new Map());
  const pendingAssetReadyRef = useRef(new Map());
  const commitQueueRef = useRef(Promise.resolve());

  useEffect(() => { formRef.current = form; }, [form]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { codeRef.current = sessionCode; }, [sessionCode]);
  useEffect(() => { campaignIdRef.current = campaignId; }, [campaignId]);
  useEffect(() => { playerProfileRef.current = playerTokenProfile; }, [playerTokenProfile]);

  useEffect(() => {
    const fallbackName = getCharacterName(formRef.current) || "Player";
    loadPlayerTokenProfile(clientIdRef.current, fallbackName)
      .then((profile) => {
        playerProfileRef.current = profile;
        setPlayerTokenProfile(profile);
      })
      .catch(() => null);
  }, []);

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

  const relayToGm = (type, data) => emitAck("relay:to-gm", { type, data }, 15000);
  const relayToPlayer = (targetClientId, type, data) => emitAck("relay:to-player", { targetClientId, type, data }, 15000);
  const relayBroadcast = (type, data) => emitAck("relay:broadcast", { type, data }, 15000);

  const prepareBundle = async () => {
    if (!gmStateRef.current || !campaignIdRef.current) return null;
    const normalized = normalizeCampaignState(gmStateRef.current, campaignIdRef.current);
    const bundle = await externalizeCampaign(normalized, campaignIdRef.current, hashCacheRef.current);
    bundleRef.current = bundle;
    return bundle;
  };

  const sendManifestToPlayer = async (clientId) => {
    const bundle = await prepareBundle();
    if (!bundle || !clientId) return false;
    return Boolean((await relayToPlayer(clientId, "sync:manifest", bundle.manifest))?.ok);
  };

  const publishManifest = async () => {
    const bundle = await prepareBundle();
    if (!bundle) return false;
    if (!socketRef.current?.connected || modeRef.current !== "host") return true;
    return Boolean((await relayBroadcast("sync:manifest", bundle.manifest))?.ok);
  };

  const persistGmState = async (state, broadcast = true) => {
    const nextState = commitSelectedScene(normalizeCampaignState(state, campaignIdRef.current));
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
      const current = normalizeCampaignState(gmStateRef.current, campaignIdRef.current || getOrCreateCampaignId());
      const next = safeClone(current);
      const result = await mutator(next, current);
      if (result?.ok === false) return result;
      const committed = commitSelectedScene(next);
      committed.revision = Number(current.revision || 0) + 1;
      committed.updatedAt = Date.now();
      await persistGmState(committed, broadcast);
      return { ok: true, ...(result || {}) };
    };
    const queued = commitQueueRef.current.then(run, run);
    commitQueueRef.current = queued.catch(() => null);
    return queued;
  };

  const sendResourceToPlayer = async (targetClientId, resource) => {
    if (!resource) return false;
    const data = String(resource.data ?? "");
    const total = Math.max(1, Math.ceil(data.length / RESOURCE_CHUNK_SIZE));
    const transferId = makeId("transfer");
    for (let index = 0; index < total; index += 1) {
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
        chunk: data.slice(index * RESOURCE_CHUNK_SIZE, (index + 1) * RESOURCE_CHUNK_SIZE),
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
    for (const id of ids) await sendResourceToPlayer(packet.fromClientId, bundle.dataById.get(id));
  };

  const seedCampaignCacheFromPlayerProfile = async (manifest) => {
    const profile = playerProfileRef.current;
    if (!manifest?.campaignId || !profile?.avatarAssetId || !profile?.avatarHash) return;
    const expected = manifest.resources?.find((resource) => resource.id === profile.avatarAssetId && resource.hash === profile.avatarHash);
    if (!expected) return;
    const local = await getResource(playerProfileId(clientIdRef.current), profile.avatarAssetId).catch(() => null);
    if (local?.hash !== expected.hash) return;
    await putResource(manifest.campaignId, { ...local, id: expected.id, hash: expected.hash }).catch(() => null);
  };

  const tryHydrateManifest = async (manifest) => {
    const hashes = await getResourceHashes(manifest.campaignId).catch(() => ({}));
    const complete = (manifest.resources || []).every((resource) => hashes[resource.id] === resource.hash);
    if (!complete) return false;
    const hydrated = await hydrateCampaignFromCache(manifest).catch(() => null);
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
    await seedCampaignCacheFromPlayerProfile(manifest);
    const ids = manifest.resources.map((resource) => resource.id);
    await removeMissingResources(manifest.campaignId, ids).catch(() => null);
    const hashes = await getResourceHashes(manifest.campaignId).catch(() => ({}));
    const missing = manifest.resources.filter((resource) => hashes[resource.id] !== resource.hash);
    setSyncState({ phase: missing.length ? "downloading" : "cache-hit", cached: manifest.resources.length - missing.length, requested: missing.length });
    if (!missing.length) return tryHydrateManifest(manifest);
    await relayToGm("sync:request", { campaignId: manifest.campaignId, ids: missing.map((resource) => resource.id) });
  };

  const handleResourceChunk = async (data) => {
    const manifest = manifestRef.current;
    if (!manifest?.campaignId || !data?.id || !data?.transferId) return;
    const expected = manifest.resources.find((resource) => resource.id === data.id);
    if (!expected || expected.hash !== data.hash) return;
    let transfer = playerReceiveChunksRef.current.get(data.transferId);
    if (!transfer) {
      transfer = { ...data, chunks: new Array(Number(data.total || 1)).fill(null), received: 0 };
      playerReceiveChunksRef.current.set(data.transferId, transfer);
    }
    const index = Number(data.index || 0);
    if (transfer.chunks[index] == null) {
      transfer.chunks[index] = String(data.chunk || "");
      transfer.received += 1;
    }
    if (transfer.received < transfer.chunks.length) return;
    playerReceiveChunksRef.current.delete(data.transferId);
    const resourceData = transfer.chunks.join("");
    if (await sha256(resourceData) !== expected.hash) {
      await relayToGm("sync:request", { campaignId: manifest.campaignId, ids: [expected.id] });
      return;
    }
    await putResource(manifest.campaignId, { ...expected, data: resourceData });
    await tryHydrateManifest(manifest);
  };

  const sendPlayerAssetResourceToGm = async (resource) => {
    if (!resource) return false;
    const data = String(resource.data || "");
    const total = Math.max(1, Math.ceil(data.length / RESOURCE_CHUNK_SIZE));
    const transferId = makeId("player-asset");
    for (let index = 0; index < total; index += 1) {
      const response = await relayToGm("player:asset-chunk", {
        transferId,
        id: resource.id,
        hash: resource.hash,
        type: resource.type || "image",
        mime: resource.mime || "image/webp",
        name: resource.name || resource.id,
        size: resource.size || data.length,
        index,
        total,
        chunk: data.slice(index * RESOURCE_CHUNK_SIZE, (index + 1) * RESOURCE_CHUNK_SIZE),
      });
      if (!response?.ok) return false;
    }
    return true;
  };

  const announcePlayerAssets = async (profile = playerProfileRef.current) => {
    if (modeRef.current !== "player" || !socketRef.current?.connected) return false;
    const resources = profile?.avatarAssetId && profile?.avatarHash
      ? [{ id: profile.avatarAssetId, hash: profile.avatarHash, type: "image", mime: "image/webp", name: `${profile.name || "Player"} token avatar`, size: String(profile.avatar || "").length }]
      : [];
    return Boolean((await relayToGm("player:asset-manifest", { resources }))?.ok);
  };

  const handlePlayerAssetManifest = async (packet) => {
    const resources = Array.isArray(packet?.data?.resources) ? packet.data.resources.slice(0, 20) : [];
    if (!resources.length) {
      await relayToPlayer(packet.fromClientId, "player:asset-ready", { ids: [] });
      return;
    }
    const hashes = await getResourceHashes(campaignIdRef.current).catch(() => ({}));
    const missing = resources.filter((resource) => hashes[resource.id] !== resource.hash);
    if (!missing.length) {
      await relayToPlayer(packet.fromClientId, "player:asset-ready", { resources });
      return;
    }
    await relayToPlayer(packet.fromClientId, "player:asset-request", { resources: missing });
  };

  const handlePlayerAssetRequest = async (data) => {
    const resources = Array.isArray(data?.resources) ? data.resources : [];
    const profileId = playerProfileId(clientIdRef.current);
    for (const meta of resources) {
      const resource = await getResource(profileId, meta.id).catch(() => null);
      if (resource?.hash === meta.hash) await sendPlayerAssetResourceToGm(resource);
    }
  };

  const handlePlayerAssetChunkAtGm = async (packet) => {
    const data = packet?.data || {};
    if (!data.id || !data.transferId || !data.hash) return;
    const key = `${packet.fromClientId}:${data.transferId}`;
    let transfer = gmReceivePlayerChunksRef.current.get(key);
    if (!transfer) {
      transfer = { ...data, fromClientId: packet.fromClientId, chunks: new Array(Number(data.total || 1)).fill(null), received: 0 };
      gmReceivePlayerChunksRef.current.set(key, transfer);
    }
    const index = Number(data.index || 0);
    if (transfer.chunks[index] == null) {
      transfer.chunks[index] = String(data.chunk || "");
      transfer.received += 1;
    }
    if (transfer.received < transfer.chunks.length) return;
    gmReceivePlayerChunksRef.current.delete(key);
    const resourceData = transfer.chunks.join("");
    if (await sha256(resourceData) !== data.hash) {
      await relayToPlayer(packet.fromClientId, "player:asset-request", { resources: [{ id: data.id, hash: data.hash }] });
      return;
    }
    await putResource(campaignIdRef.current, {
      id: data.id,
      hash: data.hash,
      type: data.type || "image",
      mime: data.mime || "image/webp",
      name: data.name || data.id,
      size: data.size || resourceData.length,
      data: resourceData,
    });
    await relayToPlayer(packet.fromClientId, "player:asset-ready", { resources: [{ id: data.id, hash: data.hash }] });
  };

  const waitForPlayerAssetReady = (profile) => new Promise(async (resolve) => {
    if (!profile?.avatarAssetId || !profile?.avatarHash) return resolve(true);
    const key = `${profile.avatarAssetId}:${profile.avatarHash}`;
    const existing = pendingAssetReadyRef.current.get(key);
    if (existing) return existing.push(resolve);
    pendingAssetReadyRef.current.set(key, [resolve]);
    const timer = window.setTimeout(() => {
      const resolvers = pendingAssetReadyRef.current.get(key) || [];
      pendingAssetReadyRef.current.delete(key);
      resolvers.forEach((fn) => fn(false));
    }, 15000);
    pendingAssetReadyRef.current.set(`${key}:timer`, timer);
    const announced = await announcePlayerAssets(profile);
    if (!announced) {
      window.clearTimeout(timer);
      const resolvers = pendingAssetReadyRef.current.get(key) || [];
      pendingAssetReadyRef.current.delete(key);
      pendingAssetReadyRef.current.delete(`${key}:timer`);
      resolvers.forEach((fn) => fn(false));
    }
  });

  const resolvePlayerAssetReady = (data) => {
    for (const meta of Array.isArray(data?.resources) ? data.resources : []) {
      const key = `${meta.id}:${meta.hash}`;
      const resolvers = pendingAssetReadyRef.current.get(key) || [];
      const timer = pendingAssetReadyRef.current.get(`${key}:timer`);
      if (timer) window.clearTimeout(timer);
      pendingAssetReadyRef.current.delete(key);
      pendingAssetReadyRef.current.delete(`${key}:timer`);
      resolvers.forEach((fn) => fn(true));
    }
  };

  const applyPlayerAction = async (fromClientId, fromName, action, payload = {}) => {
    let avatarResource = null;
    if (["token:create-player", "token:update"].includes(action) && payload.avatarAssetId && payload.avatarHash) {
      const cached = await getResource(campaignIdRef.current, payload.avatarAssetId).catch(() => null);
      if (cached?.hash !== payload.avatarHash) {
        await relayToPlayer(fromClientId, "player:asset-request", { resources: [{ id: payload.avatarAssetId, hash: payload.avatarHash }] });
        return { ok: false, error: "PLAYER_ASSET_MISSING", assetId: payload.avatarAssetId };
      }
      avatarResource = cached;
    }

    return mutateGmState((next) => {
      const active = liveScene(next);
      if (action === "character:update") {
        next.characters ||= {};
        const character = normalizeCharacter(payload.character, fromName || "Player");
        if (avatarResource?.data) character.avatar = avatarResource.data;
        next.characters[fromClientId] = character;
        return {};
      }
      if (action === "chat:message") return appendChat(next, { role: "player", clientId: fromClientId, name: fromName, text: payload.text });
      if (action === "dice:result") return appendDice(next, { role: "player", clientId: fromClientId, name: fromName, roll: payload.roll });
      if (!active) return { ok: false, error: "SCENE_INACTIVE" };
      const activeIndex = next.scenes.findIndex((scene) => scene.sceneId === active.sceneId);
      const scene = next.scenes[activeIndex];

      if (action === "token:create-player") {
        const existing = (scene.tokens || []).find((token) => token.kind === "player" && token.ownerClientId === fromClientId);
        if (existing) return { token: existing };
        const size = Number(payload.size) === 2 ? 2 : 1;
        const placement = findFreePlacement(scene, size, scene.startZone || []);
        if (!placement) return { ok: false, error: "NO_FREE_CELL" };
        const token = {
          id: makeId("player"),
          kind: "player",
          ownerClientId: fromClientId,
          npcId: null,
          name: String(payload.name || fromName || "Player").trim().slice(0, 80) || "Player",
          avatar: avatarResource?.data || "",
          avatarAssetId: payload.avatarAssetId || "",
          avatarHash: payload.avatarHash || "",
          size,
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
      if (!ownsToken) return { ok: false, error: "TOKEN_FORBIDDEN" };
      if (action === "token:update") {
        if (Object.prototype.hasOwnProperty.call(payload, "name")) token.name = String(payload.name || token.name).trim().slice(0, 80) || token.name;
        if (Object.prototype.hasOwnProperty.call(payload, "size")) {
          const size = Number(payload.size) === 2 ? 2 : 1;
          if (!canPlaceToken(scene, token.id, token.x, token.y, size)) return { ok: false, error: "CELL_BLOCKED" };
          token.size = size;
        }
        if (payload.avatarAssetId) {
          token.avatarAssetId = payload.avatarAssetId;
          token.avatarHash = payload.avatarHash || "";
          token.avatar = avatarResource?.data || token.avatar || "";
        }
        scene.revision = Number(scene.revision || 0) + 1;
        return { token };
      }
      if (action === "token:move") {
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
  };

  const handlePlayerActionPacket = async (packet) => {
    const requestId = packet?.data?.requestId;
    const action = packet?.data?.action;
    const payload = packet?.data?.payload || {};
    if (!requestId || !action) return;
    let result;
    try { result = await applyPlayerAction(packet.fromClientId, packet.fromName, action, payload); }
    catch (actionError) { result = { ok: false, error: actionError?.message || "ACTION_FAILED" }; }
    await relayToPlayer(packet.fromClientId, "action:result", { requestId, ...result });
  };

  const sendPlayerAction = (action, payload = {}) => new Promise(async (resolve) => {
    if (!socketRef.current?.connected || modeRef.current !== "player") return resolve({ ok: false, error: "SOCKET_OFFLINE" });
    const requestId = makeId("request");
    const timer = window.setTimeout(() => {
      pendingActionsRef.current.delete(requestId);
      resolve({ ok: false, error: "ACTION_TIMEOUT" });
    }, 15000);
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

  const applyPresence = (state) => {
    if (!state || typeof state !== "object") return;
    setPresenceState(state);
    setSessionCode(normalizeSessionCode(state.code || codeRef.current));
    if (modeRef.current === "host") {
      const onlineIds = new Set((state.players || []).filter((player) => player.online !== false).map((player) => player.clientId));
      for (const id of onlineIds) if (!knownPresenceRef.current.has(id)) sendManifestToPlayer(id);
      knownPresenceRef.current = onlineIds;
    }
  };

  const resumeCurrentRole = async () => {
    if (!socketRef.current?.connected || leavingRef.current) return false;
    const currentMode = modeRef.current;
    const code = codeRef.current;
    if (!code || !["host", "player"].includes(currentMode)) return false;
    setStatus("connecting");
    const response = currentMode === "host"
      ? await emitAck("room:resume-gm", { roomCode: code, clientId: clientIdRef.current, gmName: nameRef.current || "GM", gmSecret: gmSecretRef.current })
      : await emitAck("room:join", { roomCode: code, clientId: clientIdRef.current, playerName: nameRef.current || getCharacterName(formRef.current) || "Player", avatar: "" });
    if (!response?.ok) {
      setStatus("disconnected");
      setError(socketError(response?.error));
      return false;
    }
    if (response.state) applyPresence(response.state);
    setStatus("online");
    setError(null);
    if (currentMode === "player") {
      const fallbackName = nameRef.current || getCharacterName(formRef.current) || "Player";
      const profile = await loadPlayerTokenProfile(clientIdRef.current, fallbackName).catch(() => playerProfileRef.current);
      playerProfileRef.current = profile;
      setPlayerTokenProfile(profile);
      await relayToGm("sync:hello", { roomCode: code });
      await announcePlayerAssets(profile);
      sendPlayerAction("character:update", { character: createCharacterSnapshot(formRef.current) });
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
    socket.on("connect", () => { if (["host", "player"].includes(modeRef.current)) resumeCurrentRole(); });
    socket.on("disconnect", () => { if (!leavingRef.current && ["host", "player"].includes(modeRef.current)) setStatus("disconnected"); });
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
      else if (packet?.type === "player:asset-manifest") handlePlayerAssetManifest(packet);
      else if (packet?.type === "player:asset-chunk") handlePlayerAssetChunkAtGm(packet);
    });
    socket.on("relay:player", (packet) => {
      if (modeRef.current !== "player") return;
      if (packet?.type === "sync:manifest") handleManifest(packet.data);
      else if (packet?.type === "sync:resource-chunk") handleResourceChunk(packet.data);
      else if (packet?.type === "player:asset-request") handlePlayerAssetRequest(packet.data);
      else if (packet?.type === "player:asset-ready") resolvePlayerAssetReady(packet.data);
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
    const initial = normalizeCampaignState(cached?.state, id);
    gmStateRef.current = initial;
    setMirroredState(initial);
    await putCampaign({ campaignId: id, role: "gm", revision: initial.revision, state: initial }).catch(() => null);
    if (!await waitForConnection()) {
      setStatus("disconnected");
      setError(socketError("NETWORK_ERROR"));
      return false;
    }
    const response = await emitAck("room:create", { gmName: "GM", clientId: clientIdRef.current, protocol: 3, campaignId: id });
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
    if (!await waitForConnection()) {
      setStatus("disconnected");
      setError(socketError("NETWORK_ERROR"));
      return false;
    }
    const response = await emitAck("room:join", { roomCode: safeCode, clientId: clientIdRef.current, playerName: safeName, avatar: "" });
    if (!response?.ok) {
      setStatus("disconnected");
      setError(socketError(response?.error));
      return false;
    }
    if (response.state) applyPresence(response.state);
    setStatus("online");
    const profile = await loadPlayerTokenProfile(clientIdRef.current, safeName).catch(() => playerProfileRef.current);
    playerProfileRef.current = profile;
    setPlayerTokenProfile(profile);
    await relayToGm("sync:hello", { roomCode: safeCode });
    await announcePlayerAssets(profile);
    sendPlayerAction("character:update", { character: createCharacterSnapshot(formRef.current) });
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
    if (!await waitForConnection()) {
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

  const broadcastScene = (text) => modeRef.current === "host" ? sendChat(text) : false;

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

  const createTacticalScene = ({ name, cols = 12, rows = 12 } = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const scene = makeScene({ name: name || `Scene ${(next.scenes?.length || 0) + 1}`, cols, rows });
      next.scenes = [...(next.scenes || []), scene];
      next.selectedSceneId = scene.sceneId;
      next.scene = safeClone(scene);
      return { scene };
    });
  };

  const renameTacticalScene = (sceneId, name) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const scene = sceneById(next, sceneId);
      if (!scene) return { ok: false, error: "SCENE_NOT_FOUND" };
      scene.name = String(name || scene.name).trim().slice(0, 80) || scene.name;
      if (next.selectedSceneId === scene.sceneId) next.scene = safeClone(scene);
      return { scene };
    });
  };

  const switchTacticalScene = (sceneId) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const scene = sceneById(next, sceneId);
      if (!scene) return { ok: false, error: "SCENE_NOT_FOUND" };
      next.selectedSceneId = scene.sceneId;
      next.scene = safeClone(scene);
      return { scene };
    });
  };

  const deleteTacticalScene = (sceneId) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      if ((next.scenes || []).length <= 1) return { ok: false, error: "LAST_SCENE" };
      if (!sceneById(next, sceneId)) return { ok: false, error: "SCENE_NOT_FOUND" };
      next.scenes = next.scenes.filter((scene) => scene.sceneId !== sceneId);
      if (next.liveSceneId === sceneId) next.liveSceneId = null;
      if (next.selectedSceneId === sceneId) next.selectedSceneId = next.scenes[0].sceneId;
      next.scene = safeClone(sceneById(next, next.selectedSceneId) || next.scenes[0]);
      return {};
    });
  };

  const enableTacticalScene = (payload = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      let scene = sceneById(next, next.selectedSceneId);
      if (!scene) return { ok: false, error: "SCENE_NOT_FOUND" };
      const cols = Math.max(4, Math.min(60, Number(payload.cols || scene.cols || 12)));
      const rows = Math.max(4, Math.min(60, Number(payload.rows || scene.rows || 12)));
      scene.cols = cols;
      scene.rows = rows;
      scene.startZone = normalizeStartZone(payload.startZone || scene.startZone, cols, rows);
      if (Object.prototype.hasOwnProperty.call(payload, "backgroundUrl")) scene.backgroundUrl = payload.backgroundUrl || "";
      if (Object.prototype.hasOwnProperty.call(payload, "backgroundName")) scene.backgroundName = String(payload.backgroundName || "").slice(0, 160);
      scene.tokens = (scene.tokens || []).filter((token) => token.x >= 0 && token.y >= 0 && token.x + tokenSize(token) <= cols && token.y + tokenSize(token) <= rows);
      next.liveSceneId = scene.sceneId;
      next.scenes = next.scenes.map((item) => ({ ...item, active: item.sceneId === scene.sceneId }));
      scene = sceneById(next, scene.sceneId);
      scene.revision = Number(scene.revision || 0) + 1;
      next.scene = safeClone(scene);
      next.log = [...(next.log || []), { id: makeId("log"), type: "scene_enabled", at: Date.now(), payload: { sceneId: scene.sceneId, name: scene.name } }].slice(-200);
      return { scene };
    });
  };

  const disableTacticalScene = () => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const live = sceneById(next, next.liveSceneId);
      if (live) live.revision = Number(live.revision || 0) + 1;
      next.liveSceneId = null;
      next.scenes = next.scenes.map((scene) => ({ ...scene, active: false }));
      next.scene = safeClone(sceneById(next, next.selectedSceneId) || next.scenes[0]);
      next.log = [...(next.log || []), { id: makeId("log"), type: "scene_disabled", at: Date.now(), payload: { sceneId: live?.sceneId, name: live?.name } }].slice(-200);
      return {};
    });
  };

  const updateTacticalScene = (payload = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const scene = sceneById(next, next.selectedSceneId);
      if (!scene) return { ok: false, error: "SCENE_NOT_FOUND" };
      if (Object.prototype.hasOwnProperty.call(payload, "name")) scene.name = String(payload.name || scene.name).trim().slice(0, 80) || scene.name;
      if (Object.prototype.hasOwnProperty.call(payload, "backgroundUrl")) {
        scene.backgroundUrl = payload.backgroundUrl || "";
        scene.backgroundName = String(payload.backgroundName || "").slice(0, 160);
        if (!scene.backgroundUrl) scene.backgroundAssetId = "";
      }
      let cols = scene.cols;
      let rows = scene.rows;
      if (Object.prototype.hasOwnProperty.call(payload, "cols")) cols = Math.max(4, Math.min(60, Number(payload.cols) || scene.cols));
      if (Object.prototype.hasOwnProperty.call(payload, "rows")) rows = Math.max(4, Math.min(60, Number(payload.rows) || scene.rows));
      if (cols !== scene.cols || rows !== scene.rows) {
        scene.cols = cols;
        scene.rows = rows;
        scene.tokens = (scene.tokens || []).filter((token) => token.x >= 0 && token.y >= 0 && token.x + tokenSize(token) <= cols && token.y + tokenSize(token) <= rows);
      }
      if (Array.isArray(payload.startZone) || cols !== scene.cols || rows !== scene.rows) scene.startZone = normalizeStartZone(payload.startZone || scene.startZone, cols, rows);
      scene.revision = Number(scene.revision || 0) + 1;
      next.scene = safeClone(scene);
      return { scene };
    });
  };

  const updatePlayerTokenProfile = async (patch = {}) => {
    const fallbackName = nameRef.current || getCharacterName(formRef.current) || "Player";
    const profile = await savePlayerTokenProfile(clientIdRef.current, patch, fallbackName);
    playerProfileRef.current = profile;
    setPlayerTokenProfile(profile);
    if (modeRef.current === "player" && socketRef.current?.connected) await announcePlayerAssets(profile);
    return { ok: true, profile };
  };

  const createPlayerToken = async (payload = {}) => {
    if (modeRef.current !== "player") return { ok: false, error: "PLAYER_ONLY" };
    const profileResponse = await updatePlayerTokenProfile(payload);
    const profile = profileResponse.profile;
    if (profile.avatarAssetId && profile.avatarHash && !await waitForPlayerAssetReady(profile)) return { ok: false, error: "PLAYER_ASSET_TIMEOUT" };
    return sendPlayerAction("token:create-player", {
      name: profile.name,
      size: profile.size,
      avatarAssetId: profile.avatarAssetId,
      avatarHash: profile.avatarHash,
    });
  };

  const createNpcToken = (payload = {}) => {
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "GM_ONLY" });
    return mutateGmState((next) => {
      const scene = sceneById(next, next.selectedSceneId);
      if (!scene) return { ok: false, error: "SCENE_NOT_FOUND" };
      const size = Number(payload.size) === 2 ? 2 : 1;
      const requestedX = Math.floor(Number(payload.x));
      const requestedY = Math.floor(Number(payload.y));
      const requestedValid = Number.isInteger(requestedX) && Number.isInteger(requestedY) && canPlaceToken(scene, null, requestedX, requestedY, size);
      const placement = requestedValid ? { x: requestedX, y: requestedY } : findFreePlacement(scene, size, []);
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
      scene.tokens = [...(scene.tokens || []), token];
      scene.revision = Number(scene.revision || 0) + 1;
      next.scene = safeClone(scene);
      return { token };
    });
  };

  const updateToken = async (tokenId, patch = {}) => {
    if (modeRef.current === "player") {
      const profilePatch = {};
      if (Object.prototype.hasOwnProperty.call(patch, "name")) profilePatch.name = patch.name;
      if (Object.prototype.hasOwnProperty.call(patch, "size")) profilePatch.size = patch.size;
      if (Object.prototype.hasOwnProperty.call(patch, "avatar")) profilePatch.avatar = patch.avatar;
      let profile = playerProfileRef.current;
      if (Object.keys(profilePatch).length) profile = (await updatePlayerTokenProfile(profilePatch)).profile;
      if (profile.avatarAssetId && profile.avatarHash && !await waitForPlayerAssetReady(profile)) return { ok: false, error: "PLAYER_ASSET_TIMEOUT" };
      return sendPlayerAction("token:update", {
        tokenId,
        name: profile.name,
        size: profile.size,
        avatarAssetId: profile.avatarAssetId,
        avatarHash: profile.avatarHash,
      });
    }
    if (modeRef.current !== "host") return { ok: false, error: "NOT_IN_SESSION" };
    return mutateGmState((next) => {
      const scene = sceneById(next, next.selectedSceneId);
      const token = (scene?.tokens || []).find((item) => item.id === tokenId);
      if (!token) return { ok: false, error: "TOKEN_NOT_FOUND" };
      if (Object.prototype.hasOwnProperty.call(patch, "avatar")) token.avatar = patch.avatar || "";
      if (Object.prototype.hasOwnProperty.call(patch, "name")) token.name = String(patch.name || token.name).slice(0, 80);
      if (Object.prototype.hasOwnProperty.call(patch, "stats") && patch.stats && typeof patch.stats === "object") token.stats = patch.stats;
      if (Object.prototype.hasOwnProperty.call(patch, "size")) {
        const size = Number(patch.size) === 2 ? 2 : 1;
        if (!canPlaceToken(scene, token.id, token.x, token.y, size)) return { ok: false, error: "CELL_BLOCKED" };
        token.size = size;
      }
      scene.revision = Number(scene.revision || 0) + 1;
      next.scene = safeClone(scene);
      return { token };
    });
  };

  const moveToken = (tokenId, x, y) => {
    if (modeRef.current === "player") return sendPlayerAction("token:move", { tokenId, x, y });
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "NOT_IN_SESSION" });
    return mutateGmState((next) => {
      const scene = sceneById(next, next.selectedSceneId);
      const token = (scene?.tokens || []).find((item) => item.id === tokenId);
      if (!token) return { ok: false, error: "TOKEN_NOT_FOUND" };
      const target = normalizePosition(scene, token, x, y);
      if (!canPlaceToken(scene, token.id, target.x, target.y, tokenSize(token))) return { ok: false, error: "CELL_BLOCKED" };
      token.x = target.x;
      token.y = target.y;
      scene.revision = Number(scene.revision || 0) + 1;
      next.scene = safeClone(scene);
      return { token };
    });
  };

  const deleteToken = (tokenId) => {
    if (modeRef.current === "player") return sendPlayerAction("token:delete", { tokenId });
    if (modeRef.current !== "host") return Promise.resolve({ ok: false, error: "NOT_IN_SESSION" });
    return mutateGmState((next) => {
      const scene = sceneById(next, next.selectedSceneId);
      if (!scene || !(scene.tokens || []).some((item) => item.id === tokenId)) return { ok: false, error: "TOKEN_NOT_FOUND" };
      scene.tokens = scene.tokens.filter((item) => item.id !== tokenId);
      scene.revision = Number(scene.revision || 0) + 1;
      next.scene = safeClone(scene);
      return {};
    });
  };

  const normalizedMirrored = useMemo(() => normalizeCampaignState(mirroredState, campaignId || mirroredState?.campaignId), [mirroredState, campaignId]);
  const tacticalScenes = normalizedMirrored?.scenes || [];
  const selectedSceneId = normalizedMirrored?.selectedSceneId || tacticalScenes[0]?.sceneId || "";
  const liveSceneId = normalizedMirrored?.liveSceneId || "";
  const tacticalScene = mode === "player"
    ? (liveSceneId ? tacticalScenes.find((scene) => scene.sceneId === liveSceneId) || null : null)
    : (tacticalScenes.find((scene) => scene.sceneId === selectedSceneId) || tacticalScenes[0] || null);
  const players = useMemo(() => mapPlayers(presenceState, normalizedMirrored), [presenceState, normalizedMirrored]);
  const feed = useMemo(() => buildFeed(normalizedMirrored), [normalizedMirrored]);
  const sceneMessage = useMemo(() => latestGmMessage(normalizedMirrored), [normalizedMirrored]);
  const roomState = useMemo(() => ({
    ...(presenceState || {}),
    protocol: 3,
    campaignId,
    scene: tacticalScene,
    scenes: tacticalScenes,
    selectedSceneId,
    liveSceneId,
    chat: normalizedMirrored?.chat || [],
    log: normalizedMirrored?.log || [],
  }), [presenceState, campaignId, tacticalScene, tacticalScenes, selectedSceneId, liveSceneId, normalizedMirrored]);

  const clientId = clientIdRef.current;
  const connectionMeta = useMemo(() => ({
    transport: "socketio-gm-authority-v3",
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
    realtimeTransport: "socketio-gm-authority-v3",
    serverUrl: GAME_SERVER_URL,
    clientId,
    campaignId,
    syncState,
    roomState,
    tacticalScene,
    tacticalScenes,
    selectedSceneId,
    liveSceneId,
    playerTokenProfile,
    connectionMeta,
    startHost,
    joinSession,
    exitSession,
    reconnectNow,
    broadcastScene,
    sendChat,
    syncCharacter,
    sendDiceResult,
    createTacticalScene,
    renameTacticalScene,
    switchTacticalScene,
    deleteTacticalScene,
    enableTacticalScene,
    disableTacticalScene,
    updateTacticalScene,
    updatePlayerTokenProfile,
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
