import { useMemo } from "react";
import useGmAuthoritativeSessionV11, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV11.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function clampFootprint(value) {
  const size = Number(value);
  if (size === 3) return 3;
  if (size === 2) return 2;
  return 1;
}

function tokenFootprint(token) {
  if (!token) return 1;
  const stats = token.stats && typeof token.stats === "object" ? token.stats : {};
  const explicit = Number(stats.footprint ?? stats.size);
  if (explicit === 3 || explicit === 2 || explicit === 1) return explicit;

  if (stats.hordeEnabled) {
    const baseSize = clampFootprint(stats.baseSize ?? token.size);
    return baseSize >= 2 ? 3 : 2;
  }

  const baseSize = Number(stats.baseSize);
  if (baseSize === 3 || baseSize === 2 || baseSize === 1) return baseSize;
  return clampFootprint(token.size);
}

function decorateToken(token) {
  if (!token || token.kind === "player") return token;
  const footprint = tokenFootprint(token);
  return {
    ...token,
    size: footprint,
    stats: {
      ...(token.stats && typeof token.stats === "object" ? token.stats : {}),
      footprint,
      size: footprint,
    },
  };
}

function decorateScene(scene) {
  if (!scene) return scene;
  return {
    ...scene,
    tokens: (Array.isArray(scene.tokens) ? scene.tokens : []).map(decorateToken),
  };
}

function findToken(session, tokenId) {
  for (const scene of Array.isArray(session?.tacticalScenes) ? session.tacticalScenes : []) {
    const token = (scene?.tokens || []).find((item) => item?.id === tokenId);
    if (token) return token;
  }
  return null;
}

export default function useGmAuthoritativeSessionV12(form) {
  const base = useGmAuthoritativeSessionV11(form);

  const tacticalScenes = useMemo(
    () => (Array.isArray(base.tacticalScenes) ? base.tacticalScenes : []).map(decorateScene),
    [base.tacticalScenes]
  );

  const tacticalScene = useMemo(() => {
    if (base.mode === "player") {
      return tacticalScenes.find((scene) => scene.sceneId === base.liveSceneId) || null;
    }
    return tacticalScenes.find((scene) => scene.sceneId === base.selectedSceneId)
      || tacticalScenes[0]
      || null;
  }, [tacticalScenes, base.mode, base.liveSceneId, base.selectedSceneId]);

  const liveTacticalScene = useMemo(
    () => tacticalScenes.find((scene) => scene.sceneId === base.liveSceneId) || null,
    [tacticalScenes, base.liveSceneId]
  );

  const createNpcToken = async (payload = {}) => {
    const requested = clampFootprint(
      payload?.stats?.footprint
      ?? payload?.stats?.size
      ?? (payload?.stats?.hordeEnabled
        ? (clampFootprint(payload?.stats?.baseSize ?? payload?.size) >= 2 ? 3 : 2)
        : payload?.size)
    );
    const stats = {
      ...(payload?.stats && typeof payload.stats === "object" ? payload.stats : {}),
      footprint: requested,
      size: requested,
    };
    return base.createNpcToken?.({ ...payload, size: requested, stats });
  };

  const updateToken = async (tokenId, patch = {}) => {
    const current = findToken(base, tokenId);
    if (!current || current.kind === "player") return base.updateToken?.(tokenId, patch);

    const explicitSize = Object.prototype.hasOwnProperty.call(patch, "size")
      ? clampFootprint(patch.size)
      : null;
    const desired = explicitSize || tokenFootprint(current);
    const stats = {
      ...(current.stats && typeof current.stats === "object" ? current.stats : {}),
      ...(patch?.stats && typeof patch.stats === "object" ? patch.stats : {}),
      footprint: desired,
      size: desired,
    };

    return base.updateToken?.(tokenId, {
      ...patch,
      size: desired,
      stats,
    });
  };

  const moveToken = async (tokenId, x, y) => {
    const current = findToken(base, tokenId);
    const desired = current && current.kind !== "player" ? tokenFootprint(current) : null;
    const result = await base.moveToken?.(tokenId, x, y);
    if (!result?.ok || !desired || desired === 1 || base.mode !== "host") return result;

    // Some older native token paths only preserve 1x1/2x2 during a move.
    // Re-assert the canonical footprint after the authoritative position write.
    const stats = {
      ...(current?.stats && typeof current.stats === "object" ? current.stats : {}),
      footprint: desired,
      size: desired,
    };
    const repaired = await base.updateToken?.(tokenId, {
      size: desired,
      stats,
    });
    return repaired?.ok ? { ...result, token: repaired.token || result.token } : result;
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v12-stable-npc-footprints",
    tacticalScenes,
    tacticalScene,
    liveTacticalScene,
    roomState: base.roomState
      ? { ...base.roomState, scene: tacticalScene, scenes: tacticalScenes }
      : base.roomState,
    createNpcToken,
    updateToken,
    moveToken,
  };
}
