import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import "../gm/gmSessionMap.css";

const TACTICAL_HOST_PREFIX = "pip2d20-tactical-";
const SAVE_KEY = "fallout_pipboy_v4_last_character";

const COPY = {
  en: { button: "TACTICAL", title: "TACTICAL MAP", close: "CLOSE", waiting: "GM has not started a tactical scene yet.", connecting: "Connecting to tactical scene...", move: "Drag your token to a free cell, or select it and click a destination cell.", notLinked: "Your token is not linked yet. Wait for GM to start/reset the scene.", live: "LIVE", own: "YOUR TOKEN" },
  ru: { button: "ТАКТИКА", title: "ТАКТИЧЕСКАЯ КАРТА", close: "ЗАКРЫТЬ", waiting: "ГМ ещё не запустил тактическую сцену.", connecting: "Подключение к тактической сцене...", move: "Перетащите свой токен на свободную клетку или выберите его и нажмите клетку назначения.", notLinked: "Ваш токен ещё не привязан. Дождитесь запуска или сброса сцены ГМ.", live: "LIVE", own: "ВАШ ТОКЕН" },
  uk: { button: "ТАКТИКА", title: "ТАКТИЧНА МАПА", close: "ЗАКРИТИ", waiting: "ГМ ще не запустив тактичну сцену.", connecting: "Підключення до тактичної сцени...", move: "Перетягніть свій токен на вільну клітинку або оберіть його й натисніть клітинку призначення.", notLinked: "Ваш токен ще не прив'язаний. Дочекайтеся запуску або скидання сцени ГМ.", live: "LIVE", own: "ВАШ ТОКЕН" },
  pl: { button: "TAKTYKA", title: "MAPA TAKTYCZNA", close: "ZAMKNIJ", waiting: "GM nie uruchomił jeszcze sceny taktycznej.", connecting: "Łączenie ze sceną taktyczną...", move: "Przeciągnij swój token na wolne pole albo wybierz go i kliknij pole docelowe.", notLinked: "Twój token nie jest jeszcze połączony. Poczekaj na uruchomienie lub reset sceny przez GM.", live: "LIVE", own: "TWÓJ TOKEN" },
};

function getLanguage() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function readLocalCharacterName() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    const form = value?.data || value || {};
    return String(form?.characterName || form?.name || form?.playerName || "").trim();
  } catch {
    return "";
  }
}

function findSessionIdentity(session) {
  const characterName = readLocalCharacterName();
  const players = Array.isArray(session?.players) ? session.players : [];
  const exact = players.find((player) => String(player?.character?.name || "").trim().toLowerCase() === characterName.toLowerCase());
  const fallback = exact || players.find((player) => String(player?.name || "").trim().toLowerCase() === characterName.toLowerCase()) || null;
  return {
    mainPeerId: fallback?.peerId || "",
    characterName: characterName || fallback?.character?.name || fallback?.name || "Player",
    playerName: fallback?.name || characterName || "Player",
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

export default function SessionTacticalMap({ session }) {
  const text = COPY[getLanguage()];
  const [open, setOpen] = useState(false);
  const [connectionState, setConnectionState] = useState("offline");
  const [scene, setScene] = useState(null);
  const [youTokenId, setYouTokenId] = useState(null);
  const [selected, setSelected] = useState(false);
  const [dragState, setDragState] = useState(null);
  const peerRef = useRef(null);
  const connectionRef = useRef(null);
  const retryRef = useRef(null);
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const sceneRef = useRef(scene);
  const identity = useMemo(() => findSessionIdentity(session), [session?.players, session?.sessionCode]);

  useEffect(() => { sceneRef.current = scene; }, [scene]);

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
    if (!scene?.active || youTokenId || !connectionRef.current?.open) return;
    connectionRef.current.send({ type: "tactical_hello", ...identity });
  }, [scene?.active, scene?.revision, youTokenId, identity.mainPeerId, identity.characterName, identity.playerName]);

  useEffect(() => {
    if (!scene?.active) {
      setSelected(false);
      setDragState(null);
      dragRef.current = null;
    }
  }, [scene?.active, scene?.sceneId]);

  if (!session?.isActive || session?.mode !== "player") return null;

  const ownToken = scene?.tokens?.find((token) => token.id === youTokenId) || null;
  const canMove = Boolean(scene?.active && ownToken && connectionRef.current?.open);

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
      <button type="button" className="session-tactical-toggle" onClick={() => setOpen(true)}>
        <span className={`session-status-dot is-${connectionState === "online" ? "online" : "connecting"}`} />
        {text.button}
      </button>

      {open ? (
        <div className="session-tactical-overlay" role="dialog" aria-modal="true" aria-label={text.title}>
          <section className="pip-panel session-tactical-player tactical-map">
            <header className="session-tactical-player__head">
              <div>
                <div className="pip-bootline">PIP 2D20 // PLAYER TACTICAL LINK // {session.sessionCode}</div>
                <h2>[ {text.title} ]</h2>
              </div>
              <div className="session-tactical-player__actions">
                {scene?.active ? <span className="tactical-live">{text.live}</span> : null}
                <button type="button" className="pip-btn" onClick={() => setOpen(false)}>{text.close}</button>
              </div>
            </header>

            <div className="gm-session-map__hint">
              {connectionState !== "online" ? text.connecting : !scene?.active ? text.waiting : !ownToken ? text.notLinked : text.move}
              {ownToken ? <span> · {text.own}: {ownToken.name}</span> : null}
            </div>

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
                    <button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${inStart ? " is-start-zone" : ""}`} disabled={!scene.active} onClick={() => moveOwnToken(x, y)}>
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