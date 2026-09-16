import { useEffect, useMemo, useRef, useState } from "react";
import { getCloudAuthSession } from "../cloud/googleAuth.js";
import {
  loadCloudCampaign,
  saveCampaignPlayerSnapshot,
  saveCloudCampaign,
} from "../cloud/firestoreRestStore.js";
import { getCampaign, putCampaign } from "../utils/sessionLocalCache.js";

const GM_CAMPAIGN_ID_KEY = "pip2d20_gm_campaign_id_v1";
const AUTOSAVE_MS = 2500;
const PLAYER_SNAPSHOT_MS = 5000;
const MAX_INLINE_DATA_URL_LENGTH = 12000;

function cloneCompact(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(cloneCompact);
  if (typeof value !== "object") {
    if (typeof value === "string" && value.startsWith("data:") && value.length > MAX_INLINE_DATA_URL_LENGTH) return "";
    return value;
  }

  const out = {};
  Object.entries(value).forEach(([key, current]) => {
    if (typeof current === "function" || current === undefined) return;
    if ((key === "avatar" || key === "backgroundUrl" || key === "image")
      && typeof current === "string"
      && current.startsWith("data:")
      && current.length > MAX_INLINE_DATA_URL_LENGTH) {
      out[key] = "";
      return;
    }
    out[key] = cloneCompact(current);
  });
  return out;
}

export function getStoredGmCampaignId() {
  try {
    return String(localStorage.getItem(GM_CAMPAIGN_ID_KEY) || "").trim();
  } catch {
    return "";
  }
}

function resolvedCampaignId(session) {
  const direct = String(session?.campaignId || session?.roomState?.campaignId || "").trim();
  return direct || getStoredGmCampaignId();
}

export async function restoreCloudCampaignToLocalCache(campaignId = getStoredGmCampaignId()) {
  const id = String(campaignId || "").trim();
  if (!id) return { restored: false, reason: "NO_CAMPAIGN_ID" };

  const auth = getCloudAuthSession();
  if (!auth?.firebase?.idToken) return { restored: false, reason: "NOT_SIGNED_IN" };

  const cloud = await loadCloudCampaign(id);
  if (!cloud?.payload?.state) return { restored: false, reason: "NO_CLOUD_CAMPAIGN" };

  const local = await getCampaign(id).catch(() => null);
  const cloudRevision = Number(cloud.payload.state.revision || 0);
  const localRevision = Number(local?.state?.revision || 0);
  const cloudTime = Date.parse(cloud.updatedAt || cloud.payload.savedAt || 0) || 0;
  const localTime = Number(local?.updatedAt || 0);
  const shouldRestore = !local
    || cloudRevision > localRevision
    || (cloudRevision === localRevision && cloudTime > localTime);

  if (!shouldRestore) return { restored: false, reason: "LOCAL_IS_CURRENT", cloud };

  await putCampaign({
    campaignId: id,
    role: "gm",
    revision: cloudRevision,
    state: cloud.payload.state,
    manifest: local?.manifest || null,
  });
  return { restored: true, cloud };
}

function makeCampaignSnapshot(session) {
  const room = session?.roomState && typeof session.roomState === "object" ? session.roomState : null;
  const source = room || {};
  const state = cloneCompact({
    ...source,
    campaignId: resolvedCampaignId(session) || source.campaignId || "",
    revision: Number(source.revision || session?.revision || 0),
    scenes: Array.isArray(source.scenes)
      ? source.scenes
      : Array.isArray(session?.tacticalScenes)
        ? session.tacticalScenes
        : [],
    selectedSceneId: session?.selectedSceneId ?? source.selectedSceneId ?? null,
    liveSceneId: session?.liveSceneId ?? source.liveSceneId ?? null,
    sceneMessage: session?.sceneMessage ?? source.sceneMessage ?? "",
    combat: source.combat || session?.combat || null,
    characters: source.characters || {},
    chat: Array.isArray(source.chat) ? source.chat : [],
  });

  return {
    schemaVersion: 1,
    kind: "pip2d20-firestore-campaign",
    sessionCode: String(session?.sessionCode || ""),
    campaignId: state.campaignId,
    players: cloneCompact(Array.isArray(session?.players) ? session.players : []),
    merchants: cloneCompact(Array.isArray(session?.merchants) ? session.merchants : []),
    state,
    savedAt: new Date().toISOString(),
  };
}

function snapshotFingerprint(snapshot) {
  try { return JSON.stringify(snapshot); } catch { return String(Date.now()); }
}

export default function useCloudCampaignSync(session, form) {
  const [cloudStatus, setCloudStatus] = useState("idle");
  const [cloudError, setCloudError] = useState("");
  const [lastCloudSavedAt, setLastCloudSavedAt] = useState("");
  const lastHostFingerprintRef = useRef("");
  const lastPlayerFingerprintRef = useRef("");
  const restoreAttemptedRef = useRef(new Set());
  const campaignId = useMemo(() => resolvedCampaignId(session), [session?.campaignId, session?.roomState?.campaignId]);

  useEffect(() => {
    if (session?.mode !== "host" || !campaignId || restoreAttemptedRef.current.has(campaignId)) return;
    restoreAttemptedRef.current.add(campaignId);
    let cancelled = false;
    (async () => {
      try {
        setCloudStatus("restoring");
        await restoreCloudCampaignToLocalCache(campaignId);
        if (!cancelled) setCloudStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setCloudError(error?.message || String(error));
          setCloudStatus("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [campaignId, session?.mode]);

  useEffect(() => {
    if (session?.mode !== "host" || session?.status !== "online" || !campaignId) return;
    const auth = getCloudAuthSession();
    const ownerUid = String(auth?.firebase?.localId || auth?.user?.id || "").trim();
    if (!ownerUid) return;

    let cancelled = false;
    const flush = async () => {
      if (cancelled) return;
      const snapshot = makeCampaignSnapshot(session);
      const fingerprint = snapshotFingerprint({ ...snapshot, savedAt: "" });
      if (fingerprint === lastHostFingerprintRef.current) return;
      try {
        setCloudStatus("saving");
        setCloudError("");
        await saveCloudCampaign(campaignId, ownerUid, snapshot, snapshot.state?.name || `Campaign ${String(session?.sessionCode || campaignId)}`);
        lastHostFingerprintRef.current = fingerprint;
        setLastCloudSavedAt(new Date().toISOString());
        setCloudStatus("saved");
      } catch (error) {
        setCloudError(error?.message || String(error));
        setCloudStatus("error");
      }
    };

    const timer = window.setInterval(flush, AUTOSAVE_MS);
    flush();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [campaignId, session?.mode, session?.status, session?.sessionCode, session?.roomState, session?.players, session?.tacticalScenes, session?.merchants, session?.sceneMessage, session?.selectedSceneId, session?.liveSceneId]);

  useEffect(() => {
    if (session?.mode !== "player" || session?.status !== "online" || !campaignId || !form) return;
    const auth = getCloudAuthSession();
    const userId = String(auth?.firebase?.localId || auth?.user?.id || "").trim();
    if (!userId) return;

    let cancelled = false;
    const flush = async () => {
      if (cancelled) return;
      let fingerprint = "";
      try { fingerprint = JSON.stringify(form); } catch { fingerprint = String(Date.now()); }
      if (fingerprint === lastPlayerFingerprintRef.current) return;
      try {
        await saveCampaignPlayerSnapshot(campaignId, userId, cloneCompact(form));
        lastPlayerFingerprintRef.current = fingerprint;
      } catch (error) {
        setCloudError(error?.message || String(error));
      }
    };

    const timer = window.setInterval(flush, PLAYER_SNAPSHOT_MS);
    flush();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [campaignId, session?.mode, session?.status, form]);

  return {
    cloudCampaignId: campaignId,
    cloudCampaignStatus: cloudStatus,
    cloudCampaignError: cloudError,
    cloudCampaignLastSavedAt: lastCloudSavedAt,
  };
}
