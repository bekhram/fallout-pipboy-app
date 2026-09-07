import {
  getCampaign,
  getResource,
  putCampaign,
  putResource,
  sha256,
} from "./sessionLocalCache.js";

export const STATE_RESOURCE_ID = "state:snapshot";
export const PLAYER_PROFILE_PREFIX = "player-profile:";

export function makeId(prefix = "id") {
  const value = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${value}`;
}

export function safeClone(value) {
  if (globalThis.structuredClone) {
    try { return globalThis.structuredClone(value); } catch { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(value ?? null));
}

export function makeStartZone(cols = 12, rows = 12) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

export function normalizeStartZone(value, cols, rows) {
  const result = (Array.isArray(value) ? value : [])
    .map((cell) => ({ x: Math.floor(Number(cell?.x)), y: Math.floor(Number(cell?.y)) }))
    .filter((cell) => Number.isInteger(cell.x) && Number.isInteger(cell.y)
      && cell.x >= 0 && cell.y >= 0 && cell.x < cols && cell.y < rows);
  return result.length ? result : makeStartZone(cols, rows);
}

export function makeScene({ name = "Scene", cols = 12, rows = 12, sceneId = makeId("scene") } = {}) {
  const safeCols = Math.max(4, Math.min(40, Number(cols) || 12));
  const safeRows = Math.max(4, Math.min(40, Number(rows) || 12));
  return {
    sceneId,
    name: String(name || "Scene").trim().slice(0, 80) || "Scene",
    active: false,
    cols: safeCols,
    rows: safeRows,
    startZone: makeStartZone(safeCols, safeRows),
    backgroundUrl: "",
    backgroundName: "",
    backgroundAssetId: "",
    tokens: [],
    revision: 1,
  };
}

function normalizeScene(scene, index = 0) {
  const source = scene && typeof scene === "object" ? safeClone(scene) : {};
  const cols = Math.max(4, Math.min(40, Number(source.cols) || 12));
  const rows = Math.max(4, Math.min(40, Number(source.rows) || 12));
  return {
    ...source,
    sceneId: String(source.sceneId || makeId("scene")),
    name: String(source.name || `Scene ${index + 1}`).trim().slice(0, 80) || `Scene ${index + 1}`,
    active: Boolean(source.active),
    cols,
    rows,
    startZone: normalizeStartZone(source.startZone, cols, rows),
    backgroundUrl: String(source.backgroundUrl || ""),
    backgroundName: String(source.backgroundName || "").slice(0, 160),
    backgroundAssetId: String(source.backgroundAssetId || ""),
    tokens: Array.isArray(source.tokens) ? source.tokens.map((token) => ({ ...token, size: Number(token?.size) === 2 ? 2 : 1 })) : [],
    revision: Math.max(1, Number(source.revision || 1)),
  };
}

export function normalizeCampaignState(raw, campaignId) {
  const source = raw && typeof raw === "object" ? safeClone(raw) : {};
  let scenes = Array.isArray(source.scenes) && source.scenes.length
    ? source.scenes.map(normalizeScene)
    : [normalizeScene(source.scene || makeScene({ name: "Scene 1" }), 0)];

  const seen = new Set();
  scenes = scenes.map((scene, index) => {
    let sceneId = scene.sceneId;
    if (seen.has(sceneId)) sceneId = makeId("scene");
    seen.add(sceneId);
    return { ...scene, sceneId, name: scene.name || `Scene ${index + 1}` };
  });

  const selectedSceneId = scenes.some((scene) => scene.sceneId === source.selectedSceneId)
    ? source.selectedSceneId
    : (scenes.some((scene) => scene.sceneId === source.scene?.sceneId) ? source.scene.sceneId : scenes[0].sceneId);

  let liveSceneId = scenes.some((scene) => scene.sceneId === source.liveSceneId)
    ? source.liveSceneId
    : (scenes.find((scene) => scene.active)?.sceneId || null);

  scenes = scenes.map((scene) => ({ ...scene, active: scene.sceneId === liveSceneId }));
  if (liveSceneId && !scenes.some((scene) => scene.sceneId === liveSceneId)) liveSceneId = null;
  const selected = scenes.find((scene) => scene.sceneId === selectedSceneId) || scenes[0];

  return {
    schemaVersion: 3,
    campaignId: String(campaignId || source.campaignId || makeId("campaign")),
    revision: Math.max(1, Number(source.revision || 1)),
    selectedSceneId: selected.sceneId,
    liveSceneId,
    scenes,
    scene: safeClone(selected),
    characters: source.characters && typeof source.characters === "object" ? source.characters : {},
    chat: Array.isArray(source.chat) ? source.chat.slice(-100) : [],
    log: Array.isArray(source.log) ? source.log.slice(-200) : [],
    updatedAt: Number(source.updatedAt || Date.now()),
  };
}

export function commitSelectedScene(state) {
  const normalized = normalizeCampaignState(state, state?.campaignId);
  const selectedFromList = normalized.scenes.find((item) => item.sceneId === normalized.selectedSceneId) || null;
  const selectedSnapshot = normalized.scene?.sceneId === normalized.selectedSceneId
    ? normalizeScene(normalized.scene)
    : null;

  const listRevision = Number(selectedFromList?.revision || 0);
  const snapshotRevision = Number(selectedSnapshot?.revision || 0);
  const scene = normalizeScene(
    selectedFromList && listRevision > snapshotRevision
      ? selectedFromList
      : (selectedSnapshot || selectedFromList)
  );

  scene.sceneId = normalized.selectedSceneId || scene.sceneId;
  const index = normalized.scenes.findIndex((item) => item.sceneId === scene.sceneId);
  if (index >= 0) normalized.scenes[index] = scene;
  else normalized.scenes.push(scene);
  normalized.selectedSceneId = scene.sceneId;
  normalized.scenes = normalized.scenes.map((item) => ({ ...item, active: item.sceneId === normalized.liveSceneId }));
  normalized.scene = safeClone(normalized.scenes.find((item) => item.sceneId === normalized.selectedSceneId) || normalized.scenes[0]);
  return normalized;
}

export function selectedScene(state) {
  const normalized = normalizeCampaignState(state, state?.campaignId);
  return normalized.scenes.find((scene) => scene.sceneId === normalized.selectedSceneId) || normalized.scenes[0];
}

export function liveScene(state) {
  const normalized = normalizeCampaignState(state, state?.campaignId);
  if (!normalized.liveSceneId) return null;
  return normalized.scenes.find((scene) => scene.sceneId === normalized.liveSceneId) || null;
}

export function tokenSize(token) {
  return Number(token?.size) === 2 ? 2 : 1;
}

export function tokenCells(token, x = token?.x, y = token?.y, size = tokenSize(token)) {
  const cells = [];
  for (let dy = 0; dy < size; dy += 1) {
    for (let dx = 0; dx < size; dx += 1) cells.push(`${Number(x) + dx}:${Number(y) + dy}`);
  }
  return cells;
}

export function canPlaceToken(scene, tokenId, x, y, size = 1) {
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

export function findFreePlacement(scene, size = 1, preferred = []) {
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

export function normalizePosition(scene, token, x, y) {
  const size = tokenSize(token);
  return {
    x: Math.max(0, Math.min(scene.cols - size, Math.floor(Number(x) || 0))),
    y: Math.max(0, Math.min(scene.rows - size, Math.floor(Number(y) || 0))),
  };
}

function dataMime(data, fallback = "application/octet-stream") {
  const match = String(data || "").match(/^data:([^;,]+)[;,]/i);
  return match?.[1] || fallback;
}

export async function externalizeCampaign(state, campaignId, hashCache = new Map()) {
  const portable = normalizeCampaignState(state, campaignId);
  const resourceMap = new Map();
  const dataById = new Map();

  const addResource = async (id, data, type = "asset", name = id, mime = dataMime(data)) => {
    if (!id || !data) return null;
    const previous = hashCache.get(id);
    const hash = previous?.data === data ? previous.hash : await sha256(data);
    hashCache.set(id, { data, hash });
    const resource = { id, hash, type, name, mime, size: String(data).length, data };
    resourceMap.set(id, resource);
    dataById.set(id, resource);
    await putResource(campaignId, resource);
    return { id, hash };
  };

  for (const scene of portable.scenes) {
    if (scene.backgroundUrl?.startsWith?.("data:image/")) {
      const id = scene.backgroundAssetId || `scene-background:${scene.sceneId}`;
      await addResource(id, scene.backgroundUrl, "image", scene.backgroundName || scene.name || "Scene background");
      scene.backgroundAssetId = id;
      scene.backgroundUrl = "";
    }
    for (const token of scene.tokens || []) {
      if (!token?.avatar?.startsWith?.("data:image/")) continue;
      const id = token.avatarAssetId
        || (token.kind === "player" && token.ownerClientId ? `player-token-avatar:${token.ownerClientId}` : `token-avatar:${token.id}`);
      const meta = await addResource(id, token.avatar, "image", `${token.name || "Token"} avatar`);
      token.avatarAssetId = id;
      token.avatarHash = meta?.hash || token.avatarHash || "";
      token.avatar = "";
    }
  }

  for (const [clientId, character] of Object.entries(portable.characters || {})) {
    if (!character?.avatar?.startsWith?.("data:image/")) continue;
    const id = character.avatarAssetId || `character-avatar:${clientId}`;
    const meta = await addResource(id, character.avatar, "image", `${character.name || "Player"} avatar`);
    character.avatarAssetId = id;
    character.avatarHash = meta?.hash || character.avatarHash || "";
    character.avatar = "";
  }

  portable.scene = safeClone(portable.scenes.find((scene) => scene.sceneId === portable.selectedSceneId) || portable.scenes[0]);
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
  resourceMap.set(STATE_RESOURCE_ID, stateResource);
  dataById.set(STATE_RESOURCE_ID, stateResource);
  await putResource(campaignId, stateResource);

  const resources = [stateResource, ...[...resourceMap.values()].filter((resource) => resource.id !== STATE_RESOURCE_ID)];
  return {
    manifest: {
      protocol: 3,
      campaignId,
      revision: Number(portable.revision || 0),
      resources: resources.map(({ data, ...meta }) => meta),
      generatedAt: Date.now(),
    },
    dataById,
  };
}

export async function hydrateCampaignFromCache(manifest) {
  if (!manifest?.campaignId) return null;
  const stateResource = await getResource(manifest.campaignId, STATE_RESOURCE_ID);
  if (!stateResource?.data) return null;
  const portable = normalizeCampaignState(JSON.parse(stateResource.data), manifest.campaignId);

  for (const scene of portable.scenes) {
    if (scene.backgroundAssetId) {
      const resource = await getResource(manifest.campaignId, scene.backgroundAssetId);
      scene.backgroundUrl = resource?.data || "";
    }
    for (const token of scene.tokens || []) {
      if (!token.avatarAssetId) continue;
      const resource = await getResource(manifest.campaignId, token.avatarAssetId);
      token.avatar = resource?.data || "";
    }
  }
  for (const character of Object.values(portable.characters || {})) {
    if (!character?.avatarAssetId) continue;
    const resource = await getResource(manifest.campaignId, character.avatarAssetId);
    character.avatar = resource?.data || "";
  }
  portable.scene = safeClone(portable.scenes.find((scene) => scene.sceneId === portable.selectedSceneId) || portable.scenes[0]);
  return portable;
}

export function playerProfileId(clientId) {
  return `${PLAYER_PROFILE_PREFIX}${String(clientId || "unknown")}`;
}

export function playerAvatarAssetId(clientId) {
  return `player-token-avatar:${String(clientId || "unknown")}`;
}

export async function loadPlayerTokenProfile(clientId, fallbackName = "Player") {
  const profileId = playerProfileId(clientId);
  const cached = await getCampaign(profileId).catch(() => null);
  const stored = cached?.tokenProfile || {};
  const assetId = stored.avatarAssetId || playerAvatarAssetId(clientId);
  const resource = stored.avatarHash ? await getResource(profileId, assetId).catch(() => null) : null;
  return {
    name: String(stored.name || fallbackName).trim().slice(0, 80) || fallbackName,
    size: Number(stored.size) === 2 ? 2 : 1,
    avatar: resource && resource.hash === stored.avatarHash ? (resource.data || "") : "",
    avatarAssetId: stored.avatarHash ? assetId : "",
    avatarHash: stored.avatarHash || "",
  };
}

export async function savePlayerTokenProfile(clientId, patch = {}, fallbackName = "Player") {
  const profileId = playerProfileId(clientId);
  const current = await loadPlayerTokenProfile(clientId, fallbackName);
  const next = {
    name: Object.prototype.hasOwnProperty.call(patch, "name")
      ? (String(patch.name || fallbackName).trim().slice(0, 80) || fallbackName)
      : current.name,
    size: Object.prototype.hasOwnProperty.call(patch, "size") ? (Number(patch.size) === 2 ? 2 : 1) : current.size,
    avatar: current.avatar,
    avatarAssetId: current.avatarAssetId,
    avatarHash: current.avatarHash,
  };

  if (Object.prototype.hasOwnProperty.call(patch, "avatar")) {
    const avatar = String(patch.avatar || "");
    if (avatar.startsWith("data:image/")) {
      const id = playerAvatarAssetId(clientId);
      const hash = await sha256(avatar);
      await putResource(profileId, {
        id,
        hash,
        type: "image",
        mime: dataMime(avatar, "image/webp"),
        name: `${next.name || "Player"} token avatar`,
        size: avatar.length,
        data: avatar,
      });
      next.avatar = avatar;
      next.avatarAssetId = id;
      next.avatarHash = hash;
    } else {
      next.avatar = "";
      next.avatarAssetId = "";
      next.avatarHash = "";
    }
  }

  await putCampaign({
    campaignId: profileId,
    role: "player-profile",
    revision: Number(Date.now()),
    tokenProfile: {
      name: next.name,
      size: next.size,
      avatarAssetId: next.avatarAssetId,
      avatarHash: next.avatarHash,
    },
  });
  return next;
}
