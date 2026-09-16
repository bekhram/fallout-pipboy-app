import { useEffect, useMemo } from "react";
import useGmAuthoritativeSessionV15, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV15.js";
import useCloudCampaignSync, {
  getStoredGmCampaignId,
  restoreCloudCampaignToLocalCache,
} from "./useCloudCampaignSync.js";
import { setLiveSessionBridge } from "../utils/liveSessionBridge.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

export default function useSharedSession(form) {
  const session = useGmAuthoritativeSessionV15(form);
  const cloud = useCloudCampaignSync(session, form);

  const mergedSession = useMemo(() => ({
    ...session,
    ...cloud,
    startHost: async (...args) => {
      try {
        const campaignId = getStoredGmCampaignId();
        if (campaignId) await restoreCloudCampaignToLocalCache(campaignId);
      } catch (error) {
        console.warn("Cloud campaign restore before host start failed:", error);
      }
      return session.startHost?.(...args);
    },
  }), [session, cloud]);

  useEffect(() => {
    setLiveSessionBridge(mergedSession);
  }, [mergedSession]);

  useEffect(() => () => setLiveSessionBridge(null), []);

  return mergedSession;
}
