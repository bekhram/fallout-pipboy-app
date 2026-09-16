import { useEffect, useMemo } from "react";
import useGmAuthoritativeSessionV15, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV15.js";
import useCloudCampaignSync, {
  getStoredGmCampaignId,
  restoreCloudCampaignToLocalCache,
  restoreLatestCloudCampaignToLocalCache,
} from "./useCloudCampaignSync.js";
import { setLiveSessionBridge } from "../utils/liveSessionBridge.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

export default function useSharedSession(form) {
  const session = useGmAuthoritativeSessionV15(form);
  const cloud = useCloudCampaignSync(session, form);

  const waitingForGm = Boolean(
    session?.mode === "player"
    && session?.status !== "online"
    && normalizeSessionCode(session?.sessionCode).length === SESSION_CODE_LENGTH
  );

  const mergedSession = useMemo(() => ({
    ...session,
    ...cloud,
    status: waitingForGm ? "waiting" : session.status,
    error: waitingForGm ? null : session.error,
    waitingForGm,
    startHost: async (...args) => {
      try {
        const campaignId = getStoredGmCampaignId();
        if (campaignId) await restoreCloudCampaignToLocalCache(campaignId);
      } catch (error) {
        console.warn("Cloud campaign restore before host start failed:", error);
      }
      return session.startHost?.(...args);
    },
    restoreLatestCloudCampaignAndStart: async (...args) => {
      const restored = await restoreLatestCloudCampaignToLocalCache();
      if (!restored?.restored) return { ok: false, reason: restored?.reason || "NOT_RESTORED" };
      const started = await session.startHost?.(...args);
      return { ok: true, restored, started };
    },
  }), [session, cloud, waitingForGm]);

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
        // The player stays in waiting mode until the GM comes online.
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
