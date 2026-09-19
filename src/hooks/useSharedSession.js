import { campaignRequest } from '../cloud/persistentCampaigns.js';
import { getCloudAuthSession } from '../cloud/googleAuth.js';
import { useEffect, useMemo } from "react";
import useGmAuthoritativeSessionV15, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV15.js";
import useCloudCampaignSync, {
  getStoredGmCampaignId,
  setStoredGmCampaignId,
  restoreCloudCampaignToLocalCache,
  restoreLatestCloudCampaignToLocalCache,
} from "./useCloudCampaignSync.js";
import { setLiveSessionBridge } from "../utils/liveSessionBridge.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const LIVE_WORLD_PREFIX = "[[PIP2D20_LIVE_WORLD]]";
function isLiveWorldText(value) { return String(value || "").startsWith(LIVE_WORLD_PREFIX); }
function parseLiveWorld(chat = []) {
  let latest = null;
  for (const message of chat) {
    const value = String(message?.text || "");
    if (!isLiveWorldText(value)) continue;
    try {
      const parsed = JSON.parse(value.slice(LIVE_WORLD_PREFIX.length));
      if (!parsed || typeof parsed !== "object") continue;
      const at = Number(message?.at || parsed.at || 0);
      if (!latest || at >= latest.at) latest = {
        at,
        regionId: String(parsed.regionId || "commonwealth"),
        markers: Array.isArray(parsed.markers) ? parsed.markers.slice(0, 200) : [],
      };
    } catch {}
  }
  return latest || { at: 0, regionId: "commonwealth", markers: [] };
}

export default function useSharedSession(form) {
  const session = useGmAuthoritativeSessionV15(form);
  const cloud = useCloudCampaignSync(session, form);

  const rawChat = Array.isArray(session?.roomState?.chat) ? session.roomState.chat : [];
  const liveWorld = useMemo(() => parseLiveWorld(rawChat), [rawChat]);
  const visibleChat = useMemo(() => rawChat.filter(message => !isLiveWorldText(message?.text)), [rawChat]);
  const visibleFeed = useMemo(() => (Array.isArray(session?.feed) ? session.feed : []).filter(item => !isLiveWorldText(item?.text)), [session?.feed]);
  const updateLiveWorld = (next = {}) => {
    if (session?.mode !== "host" || session?.status !== "online") return false;
    const state = {
      regionId: String(next.regionId || liveWorld.regionId || "commonwealth"),
      markers: Array.isArray(next.markers) ? next.markers.slice(0, 200) : liveWorld.markers,
      at: Date.now(),
    };
    return Boolean(session.sendChat?.(`${LIVE_WORLD_PREFIX}${JSON.stringify(state)}`));
  };

  const waitingForGm = Boolean(
    session?.mode === "player"
    && session?.status !== "online"
    && normalizeSessionCode(session?.sessionCode).length === SESSION_CODE_LENGTH
  );

  const mergedSession = useMemo(() => ({
    ...session,
    ...cloud,
    roomState: session.roomState ? { ...session.roomState, chat: visibleChat } : session.roomState,
    feed: visibleFeed,
    liveWorld,
    updateLiveWorld,
    status: waitingForGm ? "waiting" : session.status,
    error: waitingForGm ? null : session.error,
    waitingForGm,
    startCampaignHost: async (id) => {
      const { campaign } = await campaignRequest({ type: 'tick', campaignId: id });
      const auth = getCloudAuthSession();
      if (campaign.ownerUid !== (auth?.firebase?.localId || auth?.user?.id)) throw new Error('FORBIDDEN');
      if (session.mode !== 'lobby') {
        if (session.mode === 'host' && session.campaignId === id) {
          return session.status === 'online' || await session.reconnectNow();
        }
        throw new Error('SESSION_ALREADY_OPEN');
      }
      await restoreCloudCampaignToLocalCache(id, { force: true });
      setStoredGmCampaignId(id);
      const started = await session.startHost();
      if (!started) session.exitSession();
      return started;
    },
    joinCampaignSession: async (id, name) => {
      const { campaign } = await campaignRequest({ type: 'tick', campaignId: id });
      if (session.mode !== 'lobby') {
        if (session.mode === 'player' && session.campaignId === id) return true;
        throw new Error('SESSION_ALREADY_OPEN');
      }
      if (!campaign.liveSession?.code || Date.now() - campaign.liveSession.updatedAt > 90000) throw new Error('GM_OFFLINE');
      const joined = await session.joinSession({ code: campaign.liveSession.code, name });
      if (!joined) session.exitSession();
      return joined;
    },
    startHost: async (...args) => {
      try {
        const campaignId = getStoredGmCampaignId();
        if (/^campaign_[a-f0-9]{24}$/.test(campaignId)) setStoredGmCampaignId("");
        else if (campaignId) await restoreCloudCampaignToLocalCache(campaignId);
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
  }), [session, cloud, waitingForGm, visibleChat, visibleFeed, liveWorld]);

  useEffect(() => {
    if (session.mode !== 'host' || session.status !== 'online' || !/^campaign_[a-f0-9]{24}$/.test(session.campaignId || '') || !session.sessionCode) return;
    let pending = false;
    const publish = async () => {
      if (pending) return;
      pending = true;
      try { await campaignRequest({ type: 'sessionPresence', campaignId: session.campaignId, code: session.sessionCode }); }
      catch (error) { console.warn('Campaign session registration failed:', error.message); }
      finally { pending = false; }
    };
    void publish();
    const timer = setInterval(publish, 30000);
    return () => clearInterval(timer);
  }, [session.mode, session.status, session.campaignId, session.sessionCode]);

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
