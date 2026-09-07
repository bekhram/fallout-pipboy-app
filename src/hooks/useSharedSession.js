import { useEffect } from "react";
import useSocketSession, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useSocketSession.js";
import { setLiveSessionBridge } from "../utils/liveSessionBridge.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

export default function useSharedSession(form) {
  const session = useSocketSession(form);

  useEffect(() => {
    setLiveSessionBridge(session);
    return () => setLiveSessionBridge(null);
  }, [session]);

  return session;
}
