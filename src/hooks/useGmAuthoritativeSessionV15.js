import { useMemo } from "react";
import useGmAuthoritativeSessionV12, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV12.js";
import {
  generateProceduralMapDataUrl,
  normalizeProceduralMapSpec,
} from "../utils/proceduralMapGenerator.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function proceduralSpecFromEnvironment(environment) {
  const source = environment && typeof environment === "object" ? environment : {};
  const raw = source.proceduralMapSpec || source.proceduralMap?.spec || null;
  if (!raw || typeof raw !== "object") return null;
  return normalizeProceduralMapSpec(raw);
}

function compactEnvironment(environment, clearProcedural = false) {
  const source = environment && typeof environment === "object" ? environment : {};
  const spec = clearProcedural ? null : proceduralSpecFromEnvironment(source);
  const { proceduralMap: _map, proceduralDoorStates: _doors, ...rest } = source;
  return { ...rest, proceduralMapSpec: spec };
}

function decorateScene(scene) {
  if (!scene) return scene;
  const spec = proceduralSpecFromEnvironment(scene.environment);
  if (!spec) return scene;
  return {
    ...scene,
    backgroundUrl: generateProceduralMapDataUrl(spec),
    environment: { ...(scene.environment || {}), proceduralMapSpec: spec },
  };
}

export default function useGmAuthoritativeSessionV15(form) {
  const base = useGmAuthoritativeSessionV12(form);

  const tacticalScenes = useMemo(
    () => (Array.isArray(base.tacticalScenes) ? base.tacticalScenes : []).map(decorateScene),
    [base.tacticalScenes]
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

  const updateTacticalScene = async (patch = {}) => {
    const source = patch && typeof patch === "object" ? patch : {};
    const next = { ...source };
    const currentEnvironment = tacticalScene?.environment || base.tacticalScene?.environment || {};
    const hasEnvironment = Object.prototype.hasOwnProperty.call(source, "environment");
    const incomingEnvironment = hasEnvironment ? (source.environment || {}) : null;
    const incomingSpec = proceduralSpecFromEnvironment(incomingEnvironment);
    const proceduralName = Object.prototype.hasOwnProperty.call(source, "backgroundName")
      && String(source.backgroundName || "").startsWith("PROC //");
    const customBackground = Object.prototype.hasOwnProperty.call(source, "backgroundUrl")
      && Boolean(source.backgroundUrl)
      && !proceduralName;

    if (hasEnvironment) next.environment = compactEnvironment(incomingEnvironment);

    if (proceduralName || incomingSpec) {
      const spec = incomingSpec || proceduralSpecFromEnvironment(currentEnvironment);
      next.backgroundUrl = "";
      if (spec) {
        next.environment = compactEnvironment({
          ...currentEnvironment,
          ...(incomingEnvironment || {}),
          proceduralMapSpec: spec,
        });
      }
    } else if (customBackground) {
      next.environment = compactEnvironment(currentEnvironment, true);
    }

    return base.updateTacticalScene?.(next);
  };

  const enableTacticalScene = async (payload = {}) => {
    const spec = proceduralSpecFromEnvironment(tacticalScene?.environment);
    if (!spec) return base.enableTacticalScene?.(payload);
    return base.enableTacticalScene?.({
      ...payload,
      backgroundUrl: "",
      backgroundName: String(
        payload?.backgroundName || tacticalScene?.backgroundName || `PROC // ${spec.type} // ${spec.seed}`
      ).slice(0, 160),
    });
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v15-visual-only-procedural-maps",
    tacticalScenes,
    tacticalScene,
    liveTacticalScene,
    roomState: base.roomState
      ? { ...base.roomState, scene: tacticalScene, scenes: tacticalScenes }
      : base.roomState,
    updateTacticalScene,
    enableTacticalScene,
  };
}
