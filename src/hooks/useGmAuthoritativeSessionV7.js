import { useMemo } from "react";
import useGmAuthoritativeSessionV6, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV6.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const TURN_STATE_PREFIX = "[[PIP2D20_TURN_STATE]]";

function parseTurnState(message) {
  const value = String(message?.text || "");
  if (message?.authorRole !== "gm" || !value.startsWith(TURN_STATE_PREFIX)) return null;
  try {
    const data = JSON.parse(value.slice(TURN_STATE_PREFIX.length));
    return {
      sceneId: String(data?.sceneId || ""),
      activeTokenId: String(data?.activeTokenId || ""),
      round: Math.max(1, Number(data?.round || 1)),
      at: Number(message?.at || Date.now()),
    };
  } catch {
    return null;
  }
}

function isTurnStateText(value) {
  return String(value || "").startsWith(TURN_STATE_PREFIX);
}

export default function useGmAuthoritativeSessionV7(form) {
  const base = useGmAuthoritativeSessionV6(form);
  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];
  const sceneId = String(base.tacticalScene?.sceneId || "");

  const turnStates = useMemo(() => {
    const result = new Map();
    for (const message of rawChat) {
      const parsed = parseTurnState(message);
      if (parsed?.sceneId) result.set(parsed.sceneId, parsed);
    }
    return result;
  }, [rawChat]);

  const turnState = turnStates.get(sceneId) || {
    sceneId,
    activeTokenId: "",
    round: 1,
    at: 0,
  };

  const visibleChat = useMemo(
    () => rawChat.filter((message) => !isTurnStateText(message?.text)),
    [rawChat]
  );

  const visibleFeed = useMemo(
    () => (Array.isArray(base.feed) ? base.feed : []).filter((item) => !isTurnStateText(item?.text)),
    [base.feed]
  );

  const sceneMessage = useMemo(() => {
    for (let index = visibleChat.length - 1; index >= 0; index -= 1) {
      if (visibleChat[index]?.authorRole === "gm") return String(visibleChat[index]?.text || "");
    }
    return "";
  }, [visibleChat]);

  const setTurnState = ({ activeTokenId = "", round = 1, targetSceneId = sceneId } = {}) => {
    if (base.mode !== "host" || !targetSceneId) return false;
    return Boolean(base.sendChat?.(`${TURN_STATE_PREFIX}${JSON.stringify({
      sceneId: String(targetSceneId),
      activeTokenId: String(activeTokenId || ""),
      round: Math.max(1, Number(round || 1)),
    })}`));
  };

  const advanceTurn = (orderedTokenIds = [], direction = 1) => {
    if (base.mode !== "host") return false;
    const ids = [...new Set((Array.isArray(orderedTokenIds) ? orderedTokenIds : []).map(String).filter(Boolean))];
    if (!ids.length || !sceneId) return false;

    const step = Number(direction) < 0 ? -1 : 1;
    let round = Math.max(1, Number(turnState.round || 1));
    const currentIndex = ids.indexOf(String(turnState.activeTokenId || ""));
    let nextIndex;

    if (currentIndex < 0) {
      nextIndex = step > 0 ? 0 : ids.length - 1;
    } else if (step > 0) {
      nextIndex = currentIndex + 1;
      if (nextIndex >= ids.length) {
        nextIndex = 0;
        round += 1;
      }
    } else {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) {
        nextIndex = ids.length - 1;
        round = Math.max(1, round - 1);
      }
    }

    return setTurnState({ activeTokenId: ids[nextIndex], round, targetSceneId: sceneId });
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v7-turn-round-sync",
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    sceneMessage,
    turnState,
    setTurnState,
    advanceTurn,
  };
}
