import { useEffect } from "react";
import useGmAuthoritativeSessionV15, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV15.js";
import { setLiveSessionBridge } from "../utils/liveSessionBridge.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

export default function useSharedSession(form) {
  const session = useGmAuthoritativeSessionV15(form);

  useEffect(() => {
    setLiveSessionBridge(session);
  }, [session]);

  useEffect(() => () => setLiveSessionBridge(null), []);

  return session;
}
