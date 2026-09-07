import useGmAuthoritativeSessionV2, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV2.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

export default function useGmAuthoritativeSessionV3(form) {
  const base = useGmAuthoritativeSessionV2(form);

  const restoreAvatarInBackground = (tokenId, avatar) => {
    if (!avatar) return;
    Promise.resolve(base.updatePlayerTokenProfile?.({ avatar }))
      .then(() => {
        if (!tokenId) return null;
        return base.updateToken?.(tokenId, { avatar });
      })
      .catch(() => null);
  };

  const createPlayerToken = async (payload = {}) => {
    if (base.mode !== "player") return base.createPlayerToken?.(payload);

    const savedAvatar = String(
      hasOwn(payload, "avatar")
        ? (payload.avatar || "")
        : (base.playerTokenProfile?.avatar || "")
    );

    // Never let avatar transfer block token creation. Create the tactical token
    // first, then restore/sync its avatar asynchronously by ID/hash.
    const response = await base.createPlayerToken?.({
      ...payload,
      avatar: "",
    });

    restoreAvatarInBackground(response?.token?.id, savedAvatar);
    return response;
  };

  const updateToken = async (tokenId, patch = {}) => {
    if (base.mode !== "player") return base.updateToken?.(tokenId, patch);

    const savedAvatar = String(
      hasOwn(patch, "avatar")
        ? (patch.avatar || "")
        : (base.playerTokenProfile?.avatar || "")
    );

    if (!savedAvatar) return base.updateToken?.(tokenId, patch);

    // V2 waits for avatar readiness before every player token update. Temporarily
    // omit the avatar so name/size changes are immediate and movement is never
    // coupled to image transfer. The avatar is restored asynchronously afterwards.
    const response = await base.updateToken?.(tokenId, {
      ...patch,
      avatar: "",
    });

    restoreAvatarInBackground(tokenId, savedAvatar);
    return response;
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v3-nonblocking-assets",
    createPlayerToken,
    updateToken,
  };
}
