import { useMemo } from "react";
import useGmAuthoritativeSessionV3, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV3.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

export const PLAYER_TOKEN_ASSIGN_PREFIX = "[[PIP2D20_PLAYER_TOKEN_ASSIGN]]";

function parseAssignment(message) {
  const text = String(message?.text || "");
  if (message?.authorRole !== "gm" || !text.startsWith(PLAYER_TOKEN_ASSIGN_PREFIX)) return null;
  try {
    const payload = JSON.parse(text.slice(PLAYER_TOKEN_ASSIGN_PREFIX.length));
    const targetClientId = String(payload?.targetClientId || "");
    const sceneId = String(payload?.sceneId || "");
    if (!targetClientId || !sceneId) return null;
    return {
      messageId: String(message.id || ""),
      targetClientId,
      sceneId,
      size: Number(payload?.size) === 2 ? 2 : 1,
      requestedAt: Number(payload?.requestedAt || message?.at || Date.now()),
    };
  } catch {
    return null;
  }
}

function isControlText(value) {
  return String(value || "").startsWith(PLAYER_TOKEN_ASSIGN_PREFIX);
}

export default function useGmAuthoritativeSessionV4(form) {
  const base = useGmAuthoritativeSessionV3(form);
  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];

  const controlMessages = useMemo(
    () => rawChat.map(parseAssignment).filter(Boolean).slice(-40),
    [rawChat]
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

  const requestPlayerTokenAssignment = ({ targetClientId, sceneId, size = 1 } = {}) => {
    if (base.mode !== "host" || !targetClientId || !sceneId) return false;
    return base.sendChat?.(`${PLAYER_TOKEN_ASSIGN_PREFIX}${JSON.stringify({
      targetClientId: String(targetClientId),
      sceneId: String(sceneId),
      size: Number(size) === 2 ? 2 : 1,
      requestedAt: Date.now(),
    })}`) || false;
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v4-gm-assigned-tokens",
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    sceneMessage: visibleSceneMessage,
    controlMessages,
    requestPlayerTokenAssignment,
  };
}
