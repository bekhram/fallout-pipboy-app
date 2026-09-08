import { useMemo } from "react";
import useGmAuthoritativeSessionV7, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV7.js";
import { normalizeTacticalEnvironment } from "../utils/tacticalEnvironment.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const ENV_STATE_PREFIX = "[[PIP2D20_ENV_STATE]]";

function parseEnvironmentState(message) {
  const value = String(message?.text || "");
  if (message?.authorRole !== "gm" || !value.startsWith(ENV_STATE_PREFIX)) return null;
  try {
    const data = JSON.parse(value.slice(ENV_STATE_PREFIX.length));
    const sceneId = String(data?.sceneId || "");
    if (!sceneId) return null;
    return {
      sceneId,
      environment: normalizeTacticalEnvironment(data?.environment || {}),
      at: Number(message?.at || Date.now()),
    };
  } catch {
    return null;
  }
}

function isEnvironmentStateText(value) {
  return String(value || "").startsWith(ENV_STATE_PREFIX);
}

function decorateScene(scene, environmentStates) {
  if (!scene) return scene;
  const saved = environmentStates.get(String(scene.sceneId || ""));
  return {
    ...scene,
    environment: normalizeTacticalEnvironment(saved?.environment || scene.environment || {}),
  };
}

export default function useGmAuthoritativeSessionV8(form) {
  const base = useGmAuthoritativeSessionV7(form);
  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];

  const environmentStates = useMemo(() => {
    const result = new Map();
    for (const message of rawChat) {
      const parsed = parseEnvironmentState(message);
      if (parsed?.sceneId) result.set(parsed.sceneId, parsed);
    }
    return result;
  }, [rawChat]);

  const tacticalScenes = useMemo(
    () => (Array.isArray(base.tacticalScenes) ? base.tacticalScenes : []).map((scene) => decorateScene(scene, environmentStates)),
    [base.tacticalScenes, environmentStates]
  );

  const tacticalScene = useMemo(() => {
    if (base.mode === "player") {
      return tacticalScenes.find((scene) => scene.sceneId === base.liveSceneId) || null;
    }
    return tacticalScenes.find((scene) => scene.sceneId === base.selectedSceneId)
      || tacticalScenes[0]
      || null;
  }, [tacticalScenes, base.mode, base.liveSceneId, base.selectedSceneId]);

  const liveTacticalScene = useMemo(
    () => tacticalScenes.find((scene) => scene.sceneId === base.liveSceneId) || null,
    [tacticalScenes, base.liveSceneId]
  );

  const visibleChat = useMemo(
    () => rawChat.filter((message) => !isEnvironmentStateText(message?.text)),
    [rawChat]
  );

  const visibleFeed = useMemo(
    () => (Array.isArray(base.feed) ? base.feed : []).filter((item) => !isEnvironmentStateText(item?.text)),
    [base.feed]
  );

  const updateTacticalScene = async (payload = {}) => {
    const source = payload && typeof payload === "object" ? payload : {};
    const hasEnvironment = Object.prototype.hasOwnProperty.call(source, "environment");
    const { environment, ...nativePatch } = source;

    let nativeResult = { ok: true };
    if (Object.keys(nativePatch).length) {
      nativeResult = await base.updateTacticalScene?.(nativePatch);
      if (nativeResult?.ok === false) return nativeResult;
    }

    if (!hasEnvironment) return nativeResult;
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };

    const sceneId = String(base.tacticalScene?.sceneId || base.selectedSceneId || "");
    if (!sceneId) return { ok: false, error: "SCENE_NOT_FOUND" };

    const nextEnvironment = normalizeTacticalEnvironment(environment || {});
    const sent = Boolean(base.sendChat?.(`${ENV_STATE_PREFIX}${JSON.stringify({
      sceneId,
      environment: nextEnvironment,
    })}`));

    return sent
      ? { ok: true, sceneId, environment: nextEnvironment }
      : { ok: false, error: "ENVIRONMENT_SYNC_FAILED" };
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v8-encounter-environment",
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    tacticalScenes,
    tacticalScene,
    liveTacticalScene,
    updateTacticalScene,
  };
}
