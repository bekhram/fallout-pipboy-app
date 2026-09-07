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

export function useLiveSessionBridge() {
  const [session, setSession] = useState(() => currentSession);

  useEffect(() => {
    listeners.add(setSession);
    setSession(currentSession);
    return () => listeners.delete(setSession);
  }, []);

  return session;
}
