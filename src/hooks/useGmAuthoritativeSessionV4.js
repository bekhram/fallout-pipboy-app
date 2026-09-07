import { useEffect, useMemo, useRef } from "react";
import useGmAuthoritativeSessionV3, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV3.js";
import { getResource } from "../utils/sessionLocalCache.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const OLD_ASSIGN_PREFIX = "[[PIP2D20_PLAYER_TOKEN_ASSIGN]]";
const CONTROL_PREFIX = "[[PIP2D20_ASSIGNED_TOKEN]]";
const ASSIGNED_NPC_PREFIX = "pip-player:";

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function assignedClientId(token) {
  if (!token) return "";
  const fromStats = String(token?.stats?.assignedClientId || "");
  if (fromStats) return fromStats;
  const npcId = String(token.npcId || "");
  return npcId.startsWith(ASSIGNED_NPC_PREFIX) ? npcId.slice(ASSIGNED_NPC_PREFIX.length) : "";
}

function isAssignedToken(token) {
  return Boolean(token?.stats?.assignedPlayer || assignedClientId(token));
}

function decorateToken(token) {
  if (!isAssignedToken(token)) return token;
  const ownerClientId = assignedClientId(token);
  return {
    ...token,
    kind: "player",
    ownerClientId,
    assignedByGm: true,
  };
}

function decorateScene(scene) {
  if (!scene) return scene;
  return {
    ...scene,
    tokens: (Array.isArray(scene.tokens) ? scene.tokens : []).map(decorateToken),
  };
}

function parseControl(message) {
  const text = String(message?.text || "");
  if (message?.authorRole !== "player" || !text.startsWith(CONTROL_PREFIX)) return null;
  try {
    const payload = JSON.parse(text.slice(CONTROL_PREFIX.length));
    return {
      id: String(message.id || ""),
      fromClientId: String(message.authorClientId || ""),
      type: String(payload?.type || ""),
      tokenId: String(payload?.tokenId || ""),
      x: Number(payload?.x),
      y: Number(payload?.y),
      assetId: String(payload?.assetId || ""),
      hash: String(payload?.hash || ""),
    };
  } catch {
    return null;
  }
}

function isControlText(value) {
  const text = String(value || "");
  return text.startsWith(CONTROL_PREFIX) || text.startsWith(OLD_ASSIGN_PREFIX);
}

function findAssignedRawToken(scenes, clientId, tokenId = "") {
  for (const scene of Array.isArray(scenes) ? scenes : []) {
    const token = (scene.tokens || []).find((item) => {
      if (!isAssignedToken(item)) return false;
      if (assignedClientId(item) !== String(clientId || "")) return false;
      return !tokenId || item.id === tokenId;
    });
    if (token) return { scene, token };
  }
  return null;
}

export default function useGmAuthoritativeSessionV4(form) {
  const base = useGmAuthoritativeSessionV3(form);
  const processedControlIdsRef = useRef(new Set());
  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];
  const rawScenes = Array.isArray(base.tacticalScenes) ? base.tacticalScenes : [];

  const tacticalScenes = useMemo(() => rawScenes.map(decorateScene), [rawScenes]);
  const tacticalScene = useMemo(() => decorateScene(base.tacticalScene), [base.tacticalScene]);
  const liveTacticalScene = useMemo(
    () => tacticalScenes.find((scene) => scene.sceneId === base.liveSceneId) || null,
    [tacticalScenes, base.liveSceneId]
  );

  const visibleChat = useMemo(
    () => rawChat.filter((message) => !isControlText(message?.text)),
    [rawChat]
  );

  const visibleFeed = useMemo(
    () => (Array.isArray(base.feed) ? base.feed : []).filter((item) => !isControlText(item?.text)),
    [base.feed]
  );

  const visibleSceneMessage = useMemo(() => {
    for (let index = visibleChat.length - 1; index >= 0; index -= 1) {
      if (visibleChat[index]?.authorRole === "gm") return String(visibleChat[index]?.text || "");
    }
    return "";
  }, [visibleChat]);

  const withSelectedScene = async (sceneId, operation) => {
    if (base.mode !== "host" || !sceneId) return { ok: false, error: "GM_ONLY" };
    const previous = base.selectedSceneId;
    if (previous !== sceneId) {
      const switched = await base.switchTacticalScene?.(sceneId);
      if (!switched?.ok) return switched || { ok: false, error: "SCENE_NOT_FOUND" };
    }
    try {
      return await operation();
    } finally {
      if (previous && previous !== sceneId) await base.switchTacticalScene?.(previous);
    }
  };

  const createAssignedPlayerToken = async ({ targetClientId, name = "Player", size = 1 } = {}) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const clientId = String(targetClientId || "");
    const liveSceneId = String(base.liveSceneId || "");
    if (!clientId || !liveSceneId) return { ok: false, error: "SCENE_INACTIVE" };

    const existing = findAssignedRawToken(rawScenes, clientId);
    if (existing) {
      return withSelectedScene(existing.scene.sceneId, () => base.updateToken?.(existing.token.id, {
        name,
        size: Number(size) === 2 ? 2 : 1,
      }));
    }

    const live = rawScenes.find((scene) => scene.sceneId === liveSceneId) || base.tacticalScene;
    const preferred = live?.startZone?.[0] || null;
    const response = await withSelectedScene(liveSceneId, () => base.createNpcToken?.({
      name,
      size: Number(size) === 2 ? 2 : 1,
      x: preferred?.x,
      y: preferred?.y,
      npcId: `${ASSIGNED_NPC_PREFIX}${clientId}`,
      stats: {
        assignedPlayer: true,
        assignedClientId: clientId,
      },
    }));
    return response?.token ? { ...response, token: decorateToken(response.token) } : response;
  };

  const updateAssignedPlayerToken = async (clientId, patch = {}) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const found = findAssignedRawToken(rawScenes, clientId);
    if (!found) return { ok: false, error: "TOKEN_NOT_FOUND" };
    return withSelectedScene(found.scene.sceneId, () => base.updateToken?.(found.token.id, patch));
  };

  const removeAssignedPlayerToken = async (clientId) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const found = findAssignedRawToken(rawScenes, clientId);
    if (!found) return { ok: false, error: "TOKEN_NOT_FOUND" };
    return withSelectedScene(found.scene.sceneId, () => base.deleteToken?.(found.token.id));
  };

  const sendAssignedControl = (type, payload = {}) => {
    if (base.mode !== "player") return false;
    return base.sendChat?.(`${CONTROL_PREFIX}${JSON.stringify({ type, ...payload })}`) || false;
  };

  const moveToken = (tokenId, x, y) => {
    if (base.mode !== "player") return base.moveToken?.(tokenId, x, y);
    const token = (tacticalScene?.tokens || []).find((item) => item.id === tokenId);
    if (!token?.assignedByGm || token.ownerClientId !== base.clientId) return base.moveToken?.(tokenId, x, y);
    return Promise.resolve(sendAssignedControl("MOVE", { tokenId, x, y })
      ? { ok: true }
      : { ok: false, error: "CONTROL_SEND_FAILED" });
  };

  const updateAssignedPlayerAvatar = async (tokenId, avatar) => {
    if (base.mode !== "player") return { ok: false, error: "PLAYER_ONLY" };
    const token = (tacticalScene?.tokens || []).find((item) => item.id === tokenId);
    if (!token?.assignedByGm || token.ownerClientId !== base.clientId) return { ok: false, error: "TOKEN_FORBIDDEN" };
    const profileResult = await base.updatePlayerTokenProfile?.({ avatar });
    const profile = profileResult?.profile;
    if (!profile?.avatarAssetId || !profile?.avatarHash) return { ok: false, error: "AVATAR_NOT_SAVED" };
    const sent = sendAssignedControl("AVATAR", {
      tokenId,
      assetId: profile.avatarAssetId,
      hash: profile.avatarHash,
    });
    return sent ? { ok: true, profile } : { ok: false, error: "CONTROL_SEND_FAILED" };
  };

  useEffect(() => {
    if (base.mode !== "host") return;
    const controls = rawChat.map(parseControl).filter(Boolean);
    for (const control of controls) {
      if (!control.id || processedControlIdsRef.current.has(control.id)) continue;
      processedControlIdsRef.current.add(control.id);

      const found = findAssignedRawToken(rawScenes, control.fromClientId, control.tokenId);
      if (!found) continue;

      if (control.type === "MOVE" && Number.isFinite(control.x) && Number.isFinite(control.y)) {
        withSelectedScene(found.scene.sceneId, () => base.moveToken?.(found.token.id, control.x, control.y)).catch(() => null);
      }

      if (control.type === "AVATAR" && control.assetId && control.hash) {
        (async () => {
          let resource = null;
          for (let attempt = 0; attempt < 12; attempt += 1) {
            resource = await getResource(base.campaignId, control.assetId).catch(() => null);
            if (resource?.hash === control.hash && resource?.data) break;
            await delay(350);
          }
          if (!resource?.data || resource.hash !== control.hash) return;
          await withSelectedScene(found.scene.sceneId, () => base.updateToken?.(found.token.id, { avatar: resource.data }));
        })().catch(() => null);
      }
    }
  }, [rawChat, rawScenes, base.mode, base.campaignId]);

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v4-direct-gm-player-tokens",
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    sceneMessage: visibleSceneMessage,
    tacticalScene,
    tacticalScenes,
    liveTacticalScene,
    createAssignedPlayerToken,
    updateAssignedPlayerToken,
    removeAssignedPlayerToken,
    moveToken,
    updateAssignedPlayerAvatar,
  };
}
