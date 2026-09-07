import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import "../gm/gmSessionMap.css";

const TACTICAL_HOST_PREFIX = "pip2d20-tactical-";
const SAVE_KEY = "fallout_pipboy_v4_last_character";

const COPY = {
  en: { button: "TACTICAL", title: "TACTICAL MAP", close: "CLOSE", waiting: "GM has not started a tactical scene yet.", connecting: "Connecting to tactical scene...", move: "Select your token, then click a cell to move it.", notLinked: "Your token is not linked yet. Wait for GM to start/reset the scene.", live: "LIVE", own: "YOUR TOKEN" },
  ru: { button: "ТАКТИКА", title: "ТАКТИЧЕСКАЯ КАРТА", close: "ЗАКРЫТЬ", waiting: "ГМ ещё не запустил тактическую сцену.", connecting: "Подключение к тактической сцене...", move: "Выберите свой токен и нажмите на клетку, чтобы переместить его.", notLinked: "Ваш токен ещё не привязан. Дождитесь запуска или сброса сцены ГМ.", live: "LIVE", own: "ВАШ ТОКЕН" },
  uk: { button: "ТАКТИКА", title: "ТАКТИЧНА МАПА", close: "ЗАКРИТИ", waiting: "ГМ ще не запустив тактичну сцену.", connecting: "Підключення до тактичної сцени...", move: "Оберіть свій токен і натисніть клітинку, щоб перемістити його.", notLinked: "Ваш токен ще не прив'язаний. Дочекайтеся запуску або скидання сцени ГМ.", live: "LIVE", own: "ВАШ ТОКЕН" },
  pl: { button: "TAKTYKA", title: "MAPA TAKTYCZNA", close: "ZAMKNIJ", waiting: "GM nie uruchomił jeszcze sceny taktycznej.", connecting: "Łączenie ze sceną taktyczną...", move: "Wybierz swój token, a następnie kliknij pole, aby go przenieść.", notLinked: "Twój token nie jest jeszcze połączony. Poczekaj na uruchomienie lub reset sceny przez GM.", live: "LIVE", own: "TWÓJ TOKEN" },
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

export default function SessionTacticalMap({ session }) {
  const text = COPY[getLanguage()];
  const [open, setOpen] = useState(false);
  const [connectionState, setConnectionState] = useState("offline");
  const [scene, setScene] = useState(null);
  const [youTokenId, setYouTokenId] = useState(null);
  const [selected, setSelected] = useState(false);
  const peerRef = useRef(null);
  const connectionRef = useRef(null);
  const retryRef = useRef(null);
  const identity = useMemo(() => findSessionIdentity(session), [session?.players, session?.sessionCode]);

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
      retryRef.current = window.setTimeout(() => {
        retryRef.current = null;
        connect();
      }, 1400);
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
          setScene(packet.state || null);
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
    return () => {
      disposed = true;
      cleanup();
    };
  }, [session?.isActive, session?.mode, session?.sessionCode, identity.mainPeerId, identity.characterName, identity.playerName]);

  useEffect(() => {
    if (connectionRef.current?.open) connectionRef.current.send({ type: "tactical_hello", ...identity });
  }, [identity.mainPeerId, identity.characterName, identity.playerName]);

  useEffect(() => {
    if (!scene?.active || youTokenId || !connectionRef.current?.open) return;
    connectionRef.current.send({ type: "tactical_hello", ...identity });
  }, [scene?.active, scene?.revision, youTokenId, identity.mainPeerId, identity.characterName, identity.playerName]);

  useEffect(() => {
    if (!scene?.active) setSelected(false);
  }, [scene?.active, scene?.sceneId]);

  if (!session?.isActive || session?.mode !== "player") return null;

  const ownToken = scene?.tokens?.find((token) => token.id === youTokenId) || null;
  const canMove = Boolean(scene?.active && ownToken && connectionRef.current?.open);

  const moveOwnToken = (x, y) => {
    if (!canMove || !selected) return;
    connectionRef.current.send({ type: "tactical_move", tokenId: ownToken.id, x, y });
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
                className="gm-session-map__grid tactical-grid is-player-view"
                style={{ gridTemplateColumns: `repeat(${scene.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${scene.rows}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: scene.rows * scene.cols }, (_, index) => {
                  const x = index % scene.cols;
                  const y = Math.floor(index / scene.cols);
                  const inStart = (scene.startZone || []).some((cell) => cell.x === x && cell.y === y);
                  const tokens = (scene.tokens || []).filter((token) => token.x === x && token.y === y);
                  return (
                    <button
                      type="button"
                      key={`${x}:${y}`}
                      className={`gm-session-map__cell tactical-cell${inStart ? " is-start-zone" : ""}`}
                      disabled={!scene.active}
                      onClick={() => moveOwnToken(x, y)}
                    >
                      <span className="gm-session-map__coords">{x},{y}</span>
                      <span className="gm-session-map__tokens">
                        {tokens.map((token) => {
                          const isOwn = token.id === youTokenId;
                          return (
                            <span
                              key={token.id}
                              className={`gm-session-token is-player${isOwn ? " is-own" : ""}${isOwn && selected ? " is-selected" : ""}`}
                              title={token.name}
                              onClick={(event) => {
                                event.stopPropagation();
                                if (isOwn && scene.active) setSelected((value) => !value);
                              }}
                            >
                              <b>{isOwn ? "YOU" : "P"}</b><small>{token.name}</small>
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : <div className="pip-logbox">{text.connecting}</div>}
          </section>
        </div>
      ) : null}
    </>
  );
}
