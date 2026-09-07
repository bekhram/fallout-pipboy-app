import useGmAuthoritativeSessionV2, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV2.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const RETRYABLE_CREATE_ERRORS = new Set([
  "ACTION_TIMEOUT",
  "ACK_TIMEOUT",
  "RELAY_FAILED",
  "PLAYER_ASSET_MISSING",
  "PLAYER_ASSET_TIMEOUT",
]);

export default function useGmAuthoritativeSessionV3(form) {
  const base = useGmAuthoritativeSessionV2(form);

  const restoreAvatarInBackground = (tokenId, avatar) => {
    if (!avatar) return;
    window.setTimeout(() => {
      Promise.resolve(base.updatePlayerTokenProfile?.({ avatar }))
        .then(() => {
          if (!tokenId) return null;
          return base.updateToken?.(tokenId, { avatar });
        })
        .catch(() => null);
    }, 1200);
  };

  const createWithoutAvatar = (payload) => base.createPlayerToken?.({
    ...payload,
    avatar: "",
  });

  const createPlayerToken = async (payload = {}) => {
    if (base.mode !== "player") return base.createPlayerToken?.(payload);

    const savedAvatar = String(
      hasOwn(payload, "avatar")
        ? (payload.avatar || "")
        : (base.playerTokenProfile?.avatar || "")
    );

    // Token creation must never depend on image preparation or transfer.
    // First create a plain owned token, then force a second GM manifest and
    // restore the cached avatar after the token is already part of the scene.
    let response = await createWithoutAvatar(payload);

    if (!response?.ok && RETRYABLE_CREATE_ERRORS.has(String(response?.error || ""))) {
      await delay(350);
      response = await createWithoutAvatar(payload);
    }

    if (response?.ok) {
      // character:update is another GM-authoritative mutation, so it forces a
      // fresh manifest containing the newly created token even if the first
      // manifest arrived while the player was still hydrating an older cache.
      window.setTimeout(() => {
        try { base.syncCharacter?.(); } catch { /* noop */ }
      }, 150);
      restoreAvatarInBackground(response?.token?.id, savedAvatar);
    }

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

    const response = await base.updateToken?.(tokenId, {
      ...patch,
      avatar: "",
    });

    if (response?.ok) restoreAvatarInBackground(tokenId, savedAvatar);
    return response;
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v3-token-sync-retry",
    createPlayerToken,
    updateToken,
  };
}
