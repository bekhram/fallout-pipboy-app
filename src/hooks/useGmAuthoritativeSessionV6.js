import { useEffect, useMemo } from "react";
import useGmAuthoritativeSessionV5, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV5.js";
import { getDerivedStats } from "../utils/characterMath.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function combatSnapshotKey(form) {
  if (!form) return "";
  let derived = {};
  try { derived = getDerivedStats(form) || {}; } catch { derived = {}; }
  return JSON.stringify({
    name: String(form?.characterName || form?.name || form?.playerName || ""),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    initiative: Math.max(0, Number(derived?.initiative || 0)),
  });
}

export default function useGmAuthoritativeSessionV6(form) {
  const base = useGmAuthoritativeSessionV5(form);
  const syncKey = useMemo(() => combatSnapshotKey(form), [form]);

  useEffect(() => {
    if (base.mode !== "player" || base.status !== "online" || !syncKey) return undefined;
    const timer = window.setTimeout(() => {
      try { base.syncCharacter?.(); } catch { /* best effort */ }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [syncKey, base.mode, base.status]);

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v6-live-player-stats",
  };
}
