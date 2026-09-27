import { useEffect, useState } from "react";

let currentSession = null;
const listeners = new Set();

export function setLiveSessionBridge(session) {
  currentSession = session || null;
  listeners.forEach((listener) => {
    try { listener(currentSession); } catch { /* noop */ }
  });
}

export function getLiveSessionBridge() {
  return currentSession;
}

export function useLiveSessionBridge(enabled = true) {
  const [session, setSession] = useState(() => currentSession);

  useEffect(() => {
    if (!enabled) return undefined;
    listeners.add(setSession);
    setSession(currentSession);
    return () => listeners.delete(setSession);
  }, [enabled]);

  return enabled ? session : currentSession;
}
