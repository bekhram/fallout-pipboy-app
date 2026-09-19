import { useEffect, useMemo } from "react";
import useGmAuthoritativeSessionV15, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV15.js";
import { setLiveSessionBridge } from "../utils/liveSessionBridge.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const LIVE_WORLD_PREFIX = "[[PIP2D20_LIVE_WORLD]]";

function isLiveWorldText(value) {
  return String(value || "").startsWith(LIVE_WORLD_PREFIX);
}

function parseLiveWorld(chat = []) {
  let latest = null;
  for (const message of chat) {
    const value = String(message?.text || "");
    if (!isLiveWorldText(value)) continue;
    try {
      const parsed = JSON.parse(value.slice(LIVE_WORLD_PREFIX.length));
      if (!parsed || typeof parsed !== "object") continue;
      const at = Number(message?.at || parsed.at || 0);
      if (!latest || at >= latest.at) {
        latest = {
          at,
          regionId: String(parsed.regionId || "commonwealth"),
          markers: Array.isArray(parsed.markers) ? parsed.markers.slice(0, 200) : [],
        };
      }
    } catch {
      // Ignore malformed hidden room state.
    }
  }
  return latest || { at: 0, regionId: "commonwealth", markers: [] };
}

export default function useSharedSession(form) {
  const session = useGmAuthoritativeSessionV15(form);

  const waitingForGm = Boolean(
    session?.mode === "player"
    && session?.status !== "online"
    && normalizeSessionCode(session?.sessionCode).length === SESSION_CODE_LENGTH
  );

  const rawChat = Array.isArray(session?.roomState?.chat) ? session.roomState.chat : [];
  const liveWorld = useMemo(() => parseLiveWorld(rawChat), [rawChat]);
  const visibleChat = useMemo(
    () => rawChat.filter((message) => !isLiveWorldText(message?.text)),
    [rawChat]
  );
  const visibleFeed = useMemo(
    () => (Array.isArray(session?.feed) ? session.feed : []).filter((item) => !isLiveWorldText(item?.text)),
    [session?.feed]
  );

  const mergedSession = useMemo(() => {
    const updateLiveWorld = (next = {}) => {
      if (session?.mode !== "host" || session?.status !== "online") return false;
      const state = {
        regionId: String(next.regionId || liveWorld.regionId || "commonwealth"),
        markers: Array.isArray(next.markers) ? next.markers.slice(0, 200) : liveWorld.markers,
        at: Date.now(),
      };
      return Boolean(session.sendChat?.(`${LIVE_WORLD_PREFIX}${JSON.stringify(state)}`));
    };

    return {
      ...session,
      roomState: session.roomState ? { ...session.roomState, chat: visibleChat } : session.roomState,
      feed: visibleFeed,
      liveWorld,
      updateLiveWorld,
      status: waitingForGm ? "waiting" : session.status,
      error: waitingForGm ? null : session.error,
      waitingForGm,
    };
  }, [session, visibleChat, visibleFeed, liveWorld, waitingForGm]);

  useEffect(() => {
    if (!waitingForGm) return undefined;
    let cancelled = false;
    let inFlight = false;
    const retry = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        await session.reconnectNow?.();
      } catch {
        // Stay in waiting mode until the GM room is available.
      } finally {
        inFlight = false;
      }
    };
    const firstRetry = window.setTimeout(retry, 1200);
    const interval = window.setInterval(retry, 5000);
    return () => {
      cancelled = true;
      window.clearTimeout(firstRetry);
      window.clearInterval(interval);
    };
  }, [waitingForGm, session.reconnectNow]);

  useEffect(() => {
    setLiveSessionBridge(mergedSession);
  }, [mergedSession]);

  useEffect(() => () => setLiveSessionBridge(null), []);

  return mergedSession;
}
