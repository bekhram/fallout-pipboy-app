import { useEffect, useMemo, useRef } from "react";
import useGmAuthoritativeSessionV4, {
  GAME_SERVER_URL,
  SESSION_CODE_LENGTH,
  normalizeSessionCode,
} from "./useGmAuthoritativeSessionV4.js";

export { GAME_SERVER_URL, SESSION_CODE_LENGTH, normalizeSessionCode };

const LAST_SESSION_CODE_KEY = "pip2d20_last_session_code_v1";
const CREATURE_CONTROL_PREFIX = "[[PIP2D20_CREATURE_CONTROL]]";

function assignedController(token) {
  return String(token?.stats?.controlledByClientId || "");
}

function decorateControlledToken(token) {
  const controlledBy = assignedController(token);
  if (!controlledBy || token?.kind === "player") return token;
  return {
    ...token,
    ownerClientId: controlledBy,
    controlledByPlayer: true,
  };
}

function isHiddenNpc(token) {
  return token?.kind !== "player"
    && token?.stats?.assignedPlayer !== true
    && token?.stats?.visibleToPlayers === false;
}

function decorateScene(scene, mode) {
  if (!scene) return scene;
  let tokens = (Array.isArray(scene.tokens) ? scene.tokens : []).map(decorateControlledToken);
  if (mode === "player") tokens = tokens.filter((token) => !isHiddenNpc(token));
  return { ...scene, tokens };
}

function parseCreatureControl(message) {
  const text = String(message?.text || "");
  if (message?.authorRole !== "player" || !text.startsWith(CREATURE_CONTROL_PREFIX)) return null;
  try {
    const data = JSON.parse(text.slice(CREATURE_CONTROL_PREFIX.length));
    return {
      id: String(message.id || ""),
      fromClientId: String(message.authorClientId || ""),
      type: String(data?.type || ""),
      tokenId: String(data?.tokenId || ""),
      x: Number(data?.x),
      y: Number(data?.y),
    };
  } catch {
    return null;
  }
}

function isCreatureControlText(value) {
  return String(value || "").startsWith(CREATURE_CONTROL_PREFIX);
}

function nativeSetInputValue(input, value) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  } catch {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export default function useGmAuthoritativeSessionV5(form) {
  const base = useGmAuthoritativeSessionV4(form);
  const processedControlsRef = useRef(new Set());

  const rawScenes = Array.isArray(base.tacticalScenes) ? base.tacticalScenes : [];
  const tacticalScenes = useMemo(
    () => rawScenes.map((scene) => decorateScene(scene, base.mode)),
    [rawScenes, base.mode]
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

  const rawChat = Array.isArray(base.roomState?.chat) ? base.roomState.chat : [];
  const visibleChat = useMemo(
    () => rawChat.filter((message) => !isCreatureControlText(message?.text)),
    [rawChat]
  );
  const visibleFeed = useMemo(
    () => (Array.isArray(base.feed) ? base.feed : []).filter((item) => !isCreatureControlText(item?.text)),
    [base.feed]
  );

  useEffect(() => {
    if (!base.sessionCode) return;
    try { localStorage.setItem(LAST_SESSION_CODE_KEY, normalizeSessionCode(base.sessionCode)); } catch { /* best effort */ }
  }, [base.sessionCode]);

  // Keep the last room code available after a disconnect/reload. SessionScreen
  // owns the controlled input, so feed the remembered value through a native
  // input event only while the lobby field is empty.
  useEffect(() => {
    if (base.mode !== "lobby" || typeof document === "undefined") return undefined;
    let remembered = "";
    try { remembered = normalizeSessionCode(localStorage.getItem(LAST_SESSION_CODE_KEY) || ""); } catch { /* noop */ }
    if (!remembered) return undefined;
    const apply = () => {
      const input = document.querySelector(".session-code-input");
      if (input && !String(input.value || "").trim()) nativeSetInputValue(input, remembered);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [base.mode]);

  const withSelectedScene = async (sceneId, operation) => {
    if (base.mode !== "host" || !sceneId) return { ok: false, error: "GM_ONLY" };
    const previous = base.selectedSceneId;
    if (previous !== sceneId) {
      const switched = await base.switchTacticalScene?.(sceneId);
      if (!switched?.ok) return switched || { ok: false, error: "SCENE_NOT_FOUND" };
    }
    try {
      return await operation();
    } finally {
      if (previous && previous !== sceneId) await base.switchTacticalScene?.(previous);
    }
  };

  const findToken = (tokenId) => {
    for (const scene of rawScenes) {
      const token = (scene.tokens || []).find((item) => item.id === tokenId);
      if (token) return { scene, token };
    }
    return null;
  };

  const createNpcToken = (payload = {}) => {
    const stats = {
      ...(payload.stats && typeof payload.stats === "object" ? payload.stats : {}),
      visibleToPlayers: payload?.stats?.visibleToPlayers === true,
      controlledByClientId: String(payload?.stats?.controlledByClientId || ""),
    };
    return base.createNpcToken?.({ ...payload, stats });
  };

  const updateNpcVisibility = async (tokenId, visible) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const found = findToken(tokenId);
    if (!found) return { ok: false, error: "TOKEN_NOT_FOUND" };
    return withSelectedScene(found.scene.sceneId, () => base.updateToken?.(tokenId, {
      stats: { ...(found.token.stats || {}), visibleToPlayers: Boolean(visible) },
    }));
  };

  const updateNpcController = async (tokenId, clientId) => {
    if (base.mode !== "host") return { ok: false, error: "GM_ONLY" };
    const found = findToken(tokenId);
    if (!found) return { ok: false, error: "TOKEN_NOT_FOUND" };
    return withSelectedScene(found.scene.sceneId, () => base.updateToken?.(tokenId, {
      stats: { ...(found.token.stats || {}), controlledByClientId: String(clientId || "") },
    }));
  };

  const sendCreatureControl = (type, payload = {}) => {
    if (base.mode !== "player") return false;
    return base.sendChat?.(`${CREATURE_CONTROL_PREFIX}${JSON.stringify({ type, ...payload })}`) || false;
  };

  const moveToken = (tokenId, x, y) => {
    if (base.mode !== "player") return base.moveToken?.(tokenId, x, y);
    const token = (tacticalScene?.tokens || []).find((item) => item.id === tokenId);
    if (token?.controlledByPlayer && token.ownerClientId === base.clientId) {
      return Promise.resolve(sendCreatureControl("MOVE", { tokenId, x, y })
        ? { ok: true }
        : { ok: false, error: "CONTROL_SEND_FAILED" });
    }
    return base.moveToken?.(tokenId, x, y);
  };

  useEffect(() => {
    if (base.mode !== "host") return;
    const controls = rawChat.map(parseCreatureControl).filter(Boolean);
    for (const control of controls) {
      if (!control.id || processedControlsRef.current.has(control.id)) continue;
      processedControlsRef.current.add(control.id);
      if (control.type !== "MOVE" || !Number.isFinite(control.x) || !Number.isFinite(control.y)) continue;
      const found = findToken(control.tokenId);
      if (!found || assignedController(found.token) !== control.fromClientId) continue;
      withSelectedScene(found.scene.sceneId, () => base.moveToken?.(found.token.id, control.x, control.y)).catch(() => null);
    }
  }, [rawChat, rawScenes, base.mode]);

  let rememberedSessionCode = "";
  try { rememberedSessionCode = normalizeSessionCode(localStorage.getItem(LAST_SESSION_CODE_KEY) || ""); } catch { /* noop */ }

  return {
    ...base,
    realtimeTransport: "socketio-gm-authority-v5-tactical-session",
    sessionCode: base.sessionCode || rememberedSessionCode,
    roomState: base.roomState ? { ...base.roomState, chat: visibleChat } : base.roomState,
    feed: visibleFeed,
    tacticalScenes,
    tacticalScene,
    liveTacticalScene,
    createNpcToken,
    updateNpcVisibility,
    updateNpcController,
    moveToken,
  };
}
