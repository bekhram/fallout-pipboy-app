import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import "../gm/gmSessionMap.css";

const TACTICAL_HOST_PREFIX = "pip2d20-tactical-";
const SAVE_KEY = "fallout_pipboy_v4_last_character";
const MAX_AVATAR_SOURCE_BYTES = 6 * 1024 * 1024;

const COPY = {
  en: {
    button: "TACTICAL", title: "TACTICAL MAP", back: "BACK TO PLAYER", connecting: "Connecting to tactical scene...",
    move: "Drag your token to a free cell, or select it and click a destination cell.", live: "LIVE", own: "YOUR TOKEN",
    addToken: "ADD MY TOKEN", uploadAvatar: "UPLOAD AVATAR", replaceAvatar: "CHANGE AVATAR",
    tokenHint: "Add your token to enter the scene. The GM will place it inside the start zone.", avatarError: "Could not prepare this avatar.", adding: "ADDING TOKEN...",
  },
  ru: {
    button: "ТАКТИКА", title: "ТАКТИЧЕСКАЯ КАРТА", back: "НАЗАД К ИГРОКУ", connecting: "Подключение к тактической сцене...",
    move: "Перетащите свой токен на свободную клетку или выберите его и нажмите клетку назначения.", live: "LIVE", own: "ВАШ ТОКЕН",
    addToken: "ДОБАВИТЬ МОЙ ТОКЕН", uploadAvatar: "ЗАГРУЗИТЬ АВАТАР", replaceAvatar: "СМЕНИТЬ АВАТАР",
    tokenHint: "Добавьте свой токен, чтобы войти в сцену. ГМ разместит его внутри стартовой зоны.", avatarError: "Не удалось подготовить аватар.", adding: "ДОБАВЛЕНИЕ ТОКЕНА...",
  },
  uk: {
    button: "ТАКТИКА", title: "ТАКТИЧНА МАПА", back: "НАЗАД ДО ГРАВЦЯ", connecting: "Підключення до тактичної сцени...",
    move: "Перетягніть свій токен на вільну клітинку або оберіть його й натисніть клітинку призначення.", live: "LIVE", own: "ВАШ ТОКЕН",
    addToken: "ДОДАТИ МІЙ ТОКЕН", uploadAvatar: "ЗАВАНТАЖИТИ АВАТАР", replaceAvatar: "ЗМІНИТИ АВАТАР",
    tokenHint: "Додайте свій токен, щоб увійти в сцену. ГМ розмістить його всередині стартової зони.", avatarError: "Не вдалося підготувати аватар.", adding: "ДОДАВАННЯ ТОКЕНА...",
  },
  pl: {
    button: "TAKTYKA", title: "MAPA TAKTYCZNA", back: "WRÓĆ DO GRACZA", connecting: "Łączenie ze sceną taktyczną...",
    move: "Przeciągnij swój token na wolne pole albo wybierz go i kliknij pole docelowe.", live: "LIVE", own: "TWÓJ TOKEN",
    addToken: "DODAJ MÓJ TOKEN", uploadAvatar: "WGRAJ AWATAR", replaceAvatar: "ZMIEŃ AWATAR",
    tokenHint: "Dodaj swój token, aby wejść na scenę. GM umieści go w strefie startowej.", avatarError: "Nie udało się przygotować awatara.", adding: "DODAWANIE TOKENA...",
  },
};

function getLanguage() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function readLocalCharacter() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return value?.data || value || {};
  } catch {
    return {};
  }
}

function findSessionIdentity(session) {
  const local = readLocalCharacter();
  const characterName = String(local?.characterName || local?.name || local?.playerName || "").trim();
  const players = Array.isArray(session?.players) ? session.players : [];
  const exact = players.find((player) => String(player?.character?.name || "").trim().toLowerCase() === characterName.toLowerCase());
  const fallback = exact || players.find((player) => String(player?.name || "").trim().toLowerCase() === characterName.toLowerCase()) || null;
  return {
    mainPeerId: fallback?.peerId || "",
    characterName: characterName || fallback?.character?.name || fallback?.name || "Player",
    playerName: fallback?.name || characterName || "Player",
    defaultAvatar: String(local?.avatar || fallback?.character?.avatar || ""),
  };
}

function mergeScene(previous, incoming) {
  if (!incoming || typeof incoming !== "object") return previous;
  const hasBackground = Object.prototype.hasOwnProperty.call(incoming, "backgroundImage") && incoming.backgroundImage !== undefined;
  return {
    ...(previous || {}),
    ...incoming,
    backgroundImage: hasBackground ? (incoming.backgroundImage || "") : (previous?.backgroundImage || ""),
  };
}

function tokenSize(token) {
  return Number(token?.size) === 2 ? 2 : 1;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function compressAvatar(file) {
  if (!file?.type?.startsWith("image/") || file.size > MAX_AVATAR_SOURCE_BYTES) throw new Error("avatar");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const side = Math.max(1, Math.min(sourceWidth, sourceHeight));
    const sx = Math.max(0, Math.floor((sourceWidth - side) / 2));
    const sy = Math.max(0, Math.floor((sourceHeight - side) / 2));
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("avatar");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, sx, sy, side, side, 0, 0, 320, 320);
    return canvas.toDataURL("image/webp", 0.8);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function avatarStorageKey(sessionCode) {
  return `pip2d20-tactical-player-avatar-${String(sessionCode || "offline").toLowerCase()}`;
}

function dismissedSceneKey(sessionCode) {
  return `pip2d20-tactical-dismissed-scene-${String(sessionCode || "offline").toLowerCase()}`;
}

export default function SessionTacticalMap({ session }) {
  const text = COPY[getLanguage()];
  const [open, setOpen] = useState(false);
  const [connectionState, setConnectionState] = useState("offline");
  const [scene, setScene] = useState(null);
  const [youTokenId, setYouTokenId] = useState(null);
  const [selected, setSelected] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [avatar, setAvatar] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [addingToken, setAddingToken] = useState(false);
  const peerRef = useRef(null);
  const connectionRef = useRef(null);
  const retryRef = useRef(null);
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const avatarInputRef = useRef(null);
  const sceneRef = useRef(scene);
  const lastSceneIdRef = useRef("");
  const identity = useMemo(() => findSessionIdentity(session), [session?.players, session?.sessionCode]);

  useEffect(() => { sceneRef.current = scene; }, [scene]);

  useEffect(() => {
    const key = avatarStorageKey(session?.sessionCode);
    let stored = "";
    try { stored = localStorage.getItem(key) || ""; } catch { /* noop */ }
    setAvatar(stored || identity.defaultAvatar || "");
  }, [session?.sessionCode, identity.defaultAvatar]);

  useEffect(() => {
    if (!session?.isActive || session?.mode !== "player" || !session?.sessionCode) return undefined;
    let disposed = false;

    const cleanup = () => {
      if (retryRef.current) window.clearTimeout(retryRef.current);
      retryRef.current = null;
      try { connectionRef.current?.close?.(); } catch { /* noop */ }
      connectionRef.current = null;
      try { peerRef.current?.destroy?.(); } catch { /* noop */ }
      peerRef.current = null;
    };

    const retry = () => {
      if (disposed || retryRef.current) return;
      setConnectionState("connecting");
      retryRef.current = window.setTimeout(() => { retryRef.current = null; connect(); }, 1400);
    };

    const connect = () => {
      if (disposed) return;
      cleanup();
      setConnectionState("connecting");
      const peer = new Peer(undefined, { debug: 0 });
      peerRef.current = peer;
      peer.on("open", () => {
        if (disposed) return;
        const connection = peer.connect(`${TACTICAL_HOST_PREFIX}${String(session.sessionCode).toLowerCase()}`, { reliable: true });
        connectionRef.current = connection;
        connection.on("open", () => {
          setConnectionState("online");
          connection.send({ type: "tactical_hello", ...identity });
        });
        connection.on("data", (packet) => {
          if (packet?.type !== "tactical_state") return;
          setScene((previous) => mergeScene(previous, packet.state));
          setYouTokenId(packet.youTokenId || null);
        });
        connection.on("close", retry);
        connection.on("error", retry);
      });
      peer.on("error", retry);
      peer.on("disconnected", retry);
      peer.on("close", retry);
    };

    connect();
    return () => { disposed = true; cleanup(); };
  }, [session?.isActive, session?.mode, session?.sessionCode, identity.mainPeerId, identity.characterName, identity.playerName]);

  useEffect(() => {
    if (connectionRef.current?.open) connectionRef.current.send({ type: "tactical_hello", ...identity });
  }, [identity.mainPeerId, identity.characterName, identity.playerName]);

  useEffect(() => {
    if (!scene?.active) {
      setOpen(false);
      setSelected(false);
      setDragState(null);
      setAddingToken(false);
      dragRef.current = null;
      lastSceneIdRef.current = "";
      return;
    }

    const sceneId = String(scene.sceneId || "scene");
    if (lastSceneIdRef.current !== sceneId) {
      lastSceneIdRef.current = sceneId;
      let dismissed = "";
      try { dismissed = sessionStorage.getItem(dismissedSceneKey(session?.sessionCode)) || ""; } catch { /* noop */ }
      if (dismissed !== sceneId) setOpen(true);
    }
  }, [scene?.active, scene?.sceneId, session?.sessionCode]);

  useEffect(() => {
    if (youTokenId) setAddingToken(false);
  }, [youTokenId]);

  if (!session?.isActive || session?.mode !== "player") return null;

  const ownToken = scene?.tokens?.find((token) => token.id === youTokenId) || null;
  const canMove = Boolean(scene?.active && ownToken && connectionRef.current?.open);
  const sceneAvailable = Boolean(scene?.active);

  const closeTactical = () => {
    setOpen(false);
    if (!scene?.sceneId) return;
    try { sessionStorage.setItem(dismissedSceneKey(session?.sessionCode), String(scene.sceneId)); } catch { /* noop */ }
  };

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      const nextAvatar = await compressAvatar(file);
      setAvatar(nextAvatar);
      try { localStorage.setItem(avatarStorageKey(session?.sessionCode), nextAvatar); } catch { /* noop */ }
      if (ownToken && connectionRef.current?.open) {
        connectionRef.current.send({ type: "tactical_update_token", avatar: nextAvatar });
      }
    } catch {
      setAvatarError(text.avatarError);
    }
  };

  const createOwnToken = () => {
    if (!scene?.active || !connectionRef.current?.open || addingToken) return;
    setAddingToken(true);
    connectionRef.current.send({
      type: "tactical_create_token",
      ...identity,
      avatar,
    });
  };

  const sendMove = (x, y) => {
    if (!canMove || !ownToken) return;
    connectionRef.current.send({ type: "tactical_move", tokenId: ownToken.id, x, y });
  };

  const moveOwnToken = (x, y) => {
    if (!canMove || !selected) return;
    sendMove(x, y);
  };

  const beginOwnDrag = (event, token) => {
    if (!canMove || token.id !== youTokenId || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = tokenSize(token);
    const anchorX = Math.max(0, Math.min(size - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * size)));
    const anchorY = Math.max(0, Math.min(size - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * size)));
    dragRef.current = {
      tokenId: token.id,
      startX: event.clientX,
      startY: event.clientY,
      anchorX,
      anchorY,
      moved: false,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ tokenId: token.id, x: event.clientX, y: event.clientY, moved: false, avatar: token.avatar || "", name: token.name || "" });
    event.stopPropagation();
  };

  const moveOwnDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6;
    drag.moved = moved;
    if (moved) event.preventDefault();
    setDragState((current) => current ? { ...current, x: event.clientX, y: event.clientY, moved } : current);
  };

  const finishOwnDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();

    if (!drag.moved) {
      setSelected((value) => !value);
      return;
    }

    event.preventDefault();
    const grid = gridRef.current;
    const currentScene = sceneRef.current;
    if (!grid || !currentScene?.active) return;
    const rect = grid.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    const cellX = Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * currentScene.cols);
    const cellY = Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * currentScene.rows);
    sendMove(cellX - drag.anchorX, cellY - drag.anchorY);
    setSelected(true);
  };

  const cancelOwnDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
  };

  return (
    <>
      <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="tactical-background-input" onChange={handleAvatarFile} />

      {sceneAvailable ? (
        <button type="button" className="session-tactical-toggle is-live" onClick={() => setOpen(true)}>
          <span className={`session-status-dot is-${connectionState === "online" ? "online" : "connecting"}`} />
          {text.button}
        </button>
      ) : null}

      {open && sceneAvailable ? (
        <div className="session-tactical-overlay" role="dialog" aria-modal="true" aria-label={text.title}>
          <section className="pip-panel session-tactical-player tactical-map">
            <header className="session-tactical-player__head">
              <div>
                <div className="pip-bootline">PIP 2D20 // PLAYER TACTICAL LINK // {session.sessionCode}</div>
                <h2>[ {text.title} ]</h2>
              </div>
              <div className="session-tactical-player__actions">
                <span className="tactical-live">{text.live}</span>
                <button type="button" className="pip-btn" onClick={closeTactical}>{text.back}</button>
              </div>
            </header>

            <div className="gm-session-map__hint">
              {connectionState !== "online" ? text.connecting : ownToken ? text.move : text.tokenHint}
              {ownToken ? <span> · {text.own}: {ownToken.name}</span> : null}
            </div>

            <div className={`tactical-player-token-setup${ownToken ? " has-token" : ""}`}>
              <button type="button" className="tactical-player-token-avatar" onClick={() => avatarInputRef.current?.click()} title={avatar ? text.replaceAvatar : text.uploadAvatar}>
                {(ownToken?.avatar || avatar) ? <img src={ownToken?.avatar || avatar} alt="" /> : <span>{String(identity.characterName || "P").slice(0, 1).toUpperCase()}</span>}
              </button>
              <div className="tactical-player-token-copy">
                <strong>{ownToken ? `${text.own}: ${ownToken.name}` : identity.characterName}</strong>
                <span>{ownToken ? text.move : text.tokenHint}</span>
              </div>
              <button type="button" className="pip-btn" onClick={() => avatarInputRef.current?.click()}>{avatar ? text.replaceAvatar : text.uploadAvatar}</button>
              {!ownToken ? (
                <button type="button" className="pip-btn is-primary" disabled={connectionState !== "online" || addingToken} onClick={createOwnToken}>
                  {addingToken ? text.adding : text.addToken}
                </button>
              ) : null}
            </div>
            {avatarError ? <div className="session-error">{avatarError}</div> : null}

            {scene ? (
              <div
                ref={gridRef}
                className={`gm-session-map__grid tactical-grid is-player-view${scene.backgroundImage ? " has-background" : ""}${dragState?.moved ? " is-drag-active" : ""}`}
                style={{
                  gridTemplateColumns: `repeat(${scene.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${scene.rows}, minmax(0, 1fr))`,
                  backgroundImage: scene.backgroundImage ? `url(${scene.backgroundImage})` : undefined,
                }}
              >
                {Array.from({ length: scene.rows * scene.cols }, (_, index) => {
                  const x = index % scene.cols;
                  const y = Math.floor(index / scene.cols);
                  const inStart = (scene.startZone || []).some((cell) => cell.x === x && cell.y === y);
                  const tokens = (scene.tokens || []).filter((token) => token.x === x && token.y === y);
                  return (
                    <button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${inStart ? " is-start-zone" : ""}`} onClick={() => moveOwnToken(x, y)}>
                      <span className="gm-session-map__tokens">
                        {tokens.map((token) => {
                          const isOwn = token.id === youTokenId;
                          const enemy = token.kind === "enemy";
                          const dragging = isOwn && dragState?.tokenId === token.id && dragState?.moved;
                          return (
                            <span
                              key={token.id}
                              className={`gm-session-token ${enemy ? "is-enemy" : "is-player"} is-size-${tokenSize(token)}${isOwn ? " is-own" : ""}${isOwn && selected ? " is-selected" : ""}${dragging ? " is-dragging" : ""}`}
                              title={token.name}
                              onPointerDown={isOwn ? (event) => beginOwnDrag(event, token) : undefined}
                              onPointerMove={isOwn ? moveOwnDrag : undefined}
                              onPointerUp={isOwn ? finishOwnDrag : undefined}
                              onPointerCancel={isOwn ? cancelOwnDrag : undefined}
                              onClick={(event) => event.stopPropagation()}
                            >
                              {token.avatar ? <img src={token.avatar} alt="" /> : <b>{isOwn ? "YOU" : enemy ? String(token.name || "E").slice(0, 1).toUpperCase() : "P"}</b>}
                              <small>{token.name}</small>
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : <div className="pip-logbox">{text.connecting}</div>}

            {dragState?.moved ? (
              <div className="tactical-drag-ghost is-size-1" style={{ left: dragState.x, top: dragState.y }} aria-hidden="true">
                {dragState.avatar ? <img src={dragState.avatar} alt="" /> : <b>YOU</b>}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
