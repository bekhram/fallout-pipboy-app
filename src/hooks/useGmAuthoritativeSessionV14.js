import { useMemo } from "react";
import useGmAuthoritativeSessionV13, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV13.js";
import {
  generateProceduralMapDataUrl,
  normalizeProceduralMapSpec,
} from "../utils/proceduralMapGenerator.js";
import { generateProceduralMapStructure } from "../utils/proceduralMapStructure.js";
import {
  findProceduralPath,
  getDoorRuntimeState,
  getProceduralMap,
  proceduralCoverForToken,
} from "../utils/proceduralMapCollision.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function proceduralSpecFromEnvironment(environment) {
  const source = environment && typeof environment === "object" ? environment : {};
  const raw = source.proceduralMapSpec || source.proceduralMap?.spec || null;
  if (!raw || typeof raw !== "object") return null;
  return normalizeProceduralMapSpec(raw);
}

function compactEnvironment(environment) {
  const source = environment && typeof environment === "object" ? environment : {};
  const spec = proceduralSpecFromEnvironment(source);
  const { proceduralMap: _map, ...rest } = source;
  return spec
    ? {
        ...rest,
        proceduralMapSpec: spec,
        proceduralDoorStates: source.proceduralDoorStates && typeof source.proceduralDoorStates === "object"
          ? source.proceduralDoorStates
          : {},
      }
    : {
        ...rest,
        proceduralMapSpec: null,
        proceduralDoorStates: {},
      };
}

function decorateScene(scene) {
  if (!scene) return scene;
  const spec = proceduralSpecFromEnvironment(scene.environment);
  if (!spec) return scene;
  const proceduralMap = generateProceduralMapStructure(spec);
  const backgroundUrl = generateProceduralMapDataUrl(spec);
  const baseDecorated = {
    ...scene,
    backgroundUrl,
    environment: {
      ...(scene.environment || {}),
      proceduralMapSpec: spec,
      proceduralMap,
    },
  };
  const tokens = (Array.isArray(scene.tokens) ? scene.tokens : []).map((token) => {
    const tacticalCover = proceduralCoverForToken(baseDecorated, token);
    return {
      ...token,
      stats: {
        ...(token?.stats && typeof token.stats === "object" ? token.stats : {}),
        tacticalCover,
      },
    };
  });
  return { ...baseDecorated, tokens };
}

function sceneForToken(scenes, tokenId) {
  for (const scene of Array.isArray(scenes) ? scenes : []) {
    const token = (Array.isArray(scene?.tokens) ? scene.tokens : []).find((item) => item?.id === tokenId);
    if (token) return { scene, token };
  }
  return { scene: null, token: null };
}

export default function useGmAuthoritativeSessionV14(form) {
  const base = useGmAuthoritativeSessionV13(form);

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
    const incomingEnvironment = Object.prototype.hasOwnProperty.call(source, "environment")
      ? source.environment
      : null;
    const procName = Object.prototype.hasOwnProperty.call(source, "backgroundName")
      && String(source.backgroundName || "").startsWith("PROC //");
    const incomingSpec = proceduralSpecFromEnvironment(incomingEnvironment);

    if (incomingEnvironment) {
      next.environment = compactEnvironment(incomingEnvironment);
    }

    if (procName || incomingSpec) {
      const spec = incomingSpec || proceduralSpecFromEnvironment(currentEnvironment);
      next.backgroundUrl = "";
      if (spec) {
        next.environment = compactEnvironment({
          ...currentEnvironment,
          ...(incomingEnvironment || {}),
          proceduralMapSpec: spec,
        });
      }
    }

    return base.updateTacticalScene?.(next);
  };

  const enableTacticalScene = async (payload = {}) => {
    const spec = proceduralSpecFromEnvironment(tacticalScene?.environment);
    if (!spec) return base.enableTacticalScene?.(payload);
    return base.enableTacticalScene?.({
      ...payload,
      backgroundUrl: "",
      backgroundName: String(payload?.backgroundName || tacticalScene?.backgroundName || `PROC // ${spec.type} // ${spec.seed}`).slice(0, 160),
    });
  };

  const moveToken = async (tokenId, x, y) => {
    const found = sceneForToken(tacticalScenes, tokenId);
    if (found.scene && found.token && getProceduralMap(found.scene)) {
      const path = findProceduralPath(found.scene, found.token, x, y, found.scene.tokens || []);
      if (!path.ok) {
        return { ok: false, error: "PATH_BLOCKED", reason: path.reason || "NO_PATH", token: found.token };
      }
    }
    return base.moveToken?.(tokenId, x, y);
  };

  const setProceduralDoorState = async (doorId, patch = {}) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const scene = tacticalScene;
    const model = getProceduralMap(scene);
    const door = (Array.isArray(model?.doors) ? model.doors : []).find((item) => item?.id === doorId);
    if (!scene || !door) return { ok: false, error: "DOOR_NOT_FOUND" };

    const current = getDoorRuntimeState(scene, door);
    const locked = Object.prototype.hasOwnProperty.call(patch, "locked") ? Boolean(patch.locked) : current.locked;
    const open = locked ? false : Object.prototype.hasOwnProperty.call(patch, "open") ? Boolean(patch.open) : current.open;
    const environment = compactEnvironment({
      ...(scene.environment || {}),
      proceduralDoorStates: {
        ...(scene.environment?.proceduralDoorStates || {}),
        [doorId]: { open, locked },
      },
    });
    const result = await base.updateTacticalScene?.({ environment });
    return result?.ok === false ? result : { ok: true, doorId, open, locked };
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v14-compact-procedural-maps",
    tacticalScenes,
    tacticalScene,
    liveTacticalScene,
    roomState: base.roomState
      ? { ...base.roomState, scene: tacticalScene, scenes: tacticalScenes }
      : base.roomState,
    updateTacticalScene,
    enableTacticalScene,
    moveToken,
    setProceduralDoorState,
  };
}
