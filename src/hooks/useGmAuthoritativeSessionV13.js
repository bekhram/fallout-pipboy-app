import { useMemo } from "react";
import useGmAuthoritativeSessionV12, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV12.js";
import {
  findProceduralPath,
  getDoorRuntimeState,
  getProceduralMap,
} from "../utils/proceduralMapCollision.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

function findSceneAndToken(scenes, tokenId) {
  for (const scene of Array.isArray(scenes) ? scenes : []) {
    const token = (Array.isArray(scene?.tokens) ? scene.tokens : []).find((item) => item?.id === tokenId);
    if (token) return { scene, token };
  }
  return { scene: null, token: null };
}

export default function useGmAuthoritativeSessionV13(form) {
  const base = useGmAuthoritativeSessionV12(form);

  const tacticalScenes = useMemo(
    () => (Array.isArray(base.tacticalScenes) ? base.tacticalScenes : []),
    [base.tacticalScenes]
  );

  const moveToken = async (tokenId, x, y) => {
    const found = findSceneAndToken(tacticalScenes, tokenId);
    if (found.scene && found.token && getProceduralMap(found.scene)) {
      const path = findProceduralPath(found.scene, found.token, x, y, found.scene.tokens || []);
      if (!path.ok) {
        return {
          ok: false,
          error: "PATH_BLOCKED",
          reason: path.reason || "NO_PATH",
          token: found.token,
        };
      }
    }
    return base.moveToken?.(tokenId, x, y);
  };

  const setProceduralDoorState = async (doorId, patch = {}) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const scene = base.tacticalScene;
    const model = getProceduralMap(scene);
    const door = (Array.isArray(model?.doors) ? model.doors : []).find((item) => item?.id === doorId);
    if (!scene || !door) return { ok: false, error: "DOOR_NOT_FOUND" };

    const current = getDoorRuntimeState(scene, door);
    const locked = Object.prototype.hasOwnProperty.call(patch, "locked")
      ? Boolean(patch.locked)
      : current.locked;
    const open = locked
      ? false
      : Object.prototype.hasOwnProperty.call(patch, "open")
      ? Boolean(patch.open)
      : current.open;
    const nextStates = {
      ...(scene.environment?.proceduralDoorStates || {}),
      [doorId]: { open, locked },
    };
    const result = await base.updateTacticalScene?.({
      environment: {
        ...(scene.environment || {}),
        proceduralDoorStates: nextStates,
      },
    });
    return result?.ok === false ? result : { ok: true, doorId, open, locked };
  };

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v13-procedural-collision",
    moveToken,
    setProceduralDoorState,
  };
}
