import useGmAuthoritativeSessionV10, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV10.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function npcSize(value) {
  const size = Number(value);
  if (size === 3) return 3;
  if (size === 2) return 2;
  return 1;
}

function findToken(session, tokenId) {
  for (const scene of Array.isArray(session?.tacticalScenes) ? session.tacticalScenes : []) {
    const token = (scene?.tokens || []).find((item) => item?.id === tokenId);
    if (token) return token;
  }
  return null;
}

export default function useGmAuthoritativeSessionV11(form) {
  const base = useGmAuthoritativeSessionV10(form);

  const createNpcToken = async (payload = {}) => {
    const requestedSize = npcSize(payload?.stats?.footprint ?? payload?.stats?.size ?? payload?.size);
    const stats = {
      ...(payload?.stats && typeof payload.stats === "object" ? payload.stats : {}),
      footprint: requestedSize,
      size: requestedSize,
    };

    // V10 ultimately delegates to an older native creator which understands
    // only 1x1/2x2. For 3x3 we create at the already validated 3x3 anchor as
    // 2x2, while footprint=3 is persisted in stats. Campaign normalization
    // then canonicalizes token.size back to 3 without changing the anchor.
    const response = await base.createNpcToken?.({
      ...payload,
      size: requestedSize === 3 ? 2 : requestedSize,
      stats,
    });

    if (!response?.ok || requestedSize !== 3 || !response?.token?.id) return response;

    // Force an authoritative follow-up normalization immediately so consumers
    // do not observe a transient 2x2/1x1 token before the next scene mutation.
    const normalized = await base.updateToken?.(response.token.id, { stats });
    return normalized?.ok
      ? { ...response, token: { ...(normalized.token || response.token), size: 3, stats } }
      : { ...response, token: { ...response.token, size: 3, stats } };
  };

  const updateToken = async (tokenId, patch = {}) => {
    if (!Object.prototype.hasOwnProperty.call(patch, "size")) {
      return base.updateToken?.(tokenId, patch);
    }

    const size = npcSize(patch.size);
    const current = findToken(base, tokenId);
    const stats = {
      ...(current?.stats && typeof current.stats === "object" ? current.stats : {}),
      ...(patch?.stats && typeof patch.stats === "object" ? patch.stats : {}),
      footprint: size,
      size,
    };

    if (size === 3) {
      const { size: _ignoredSize, ...rest } = patch;
      return base.updateToken?.(tokenId, { ...rest, stats });
    }

    return base.updateToken?.(tokenId, { ...patch, size, stats });
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v11-three-cell-npc-footprints",
    createNpcToken,
    updateToken,
  };
}
