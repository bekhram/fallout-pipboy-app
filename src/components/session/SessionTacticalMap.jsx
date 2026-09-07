import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../gm/gmSessionMap.css";

const MAX_AVATAR_SOURCE_BYTES = 6 * 1024 * 1024;
const PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";

const COPY = {
  en: {
    button: "TACTICAL", title: "TACTICAL MAP", back: "BACK TO PLAYER", connecting: "Connecting to tactical scene...",
    move: "Drag your token to a free cell, or select it and click a destination cell.", live: "LIVE", own: "YOUR TOKEN",
    addToken: "ADD MY TOKEN", uploadAvatar: "UPLOAD AVATAR", replaceAvatar: "CHANGE AVATAR", tokenName: "TOKEN NAME",
    tokenHint: "Create your own token with a name and avatar. It will appear inside the GM start zone.", avatarError: "Could not prepare this avatar.", adding: "ADDING TOKEN...",
  },
  ru: {
    button: "ТАКТИКА", title: "ТАКТИЧЕСКАЯ КАРТА", back: "НАЗАД К ИГРОКУ", connecting: "Подключение к тактической сцене...",
    move: "Перетащите свой токен на свободную клетку или выберите его и нажмите клетку назначения.", live: "LIVE", own: "ВАШ ТОКЕН",
    addToken: "ДОБАВИТЬ МОЙ ТОКЕН", uploadAvatar: "ЗАГРУЗИТЬ АВАТАР", replaceAvatar: "СМЕНИТЬ АВАТАР", tokenName: "ИМЯ ТОКЕНА",
    tokenHint: "Создайте свой токен с именем и аватаром. Сервер разместит его внутри стартовой зоны ГМ.", avatarError: "Не удалось подготовить аватар.", adding: "ДОБАВЛЕНИЕ ТОКЕНА...",
  },
  uk: {
    button: "ТАКТИКА", title: "ТАКТИЧНА МАПА", back: "НАЗАД ДО ГРАВЦЯ", connecting: "Підключення до тактичної сцени...",
    move: "Перетягніть свій токен на вільну клітинку або оберіть його й натисніть клітинку призначення.", live: "LIVE", own: "ВАШ ТОКЕН",
    addToken: "ДОДАТИ МІЙ ТОКЕН", uploadAvatar: "ЗАВАНТАЖИТИ АВАТАР", replaceAvatar: "ЗМІНИТИ АВАТАР", tokenName: "ІМ'Я ТОКЕНА",
    tokenHint: "Створіть власний токен з ім'ям та аватаром. Сервер розмістить його у стартовій зоні ГМ.", avatarError: "Не вдалося підготувати аватар.", adding: "ДОДАВАННЯ ТОКЕНА...",
  },
  pl: {
    button: "TAKTYKA", title: "MAPA TAKTYCZNA", back: "WRÓĆ DO GRACZA", connecting: "Łączenie ze sceną taktyczną...",
    move: "Przeciągnij swój token na wolne pole albo wybierz go i kliknij pole docelowe.", live: "LIVE", own: "TWÓJ TOKEN",
    addToken: "DODAJ MÓJ TOKEN", uploadAvatar: "WGRAJ AWATAR", replaceAvatar: "ZMIEŃ AWATAR", tokenName: "NAZWA TOKENA",
    tokenHint: "Utwórz własny token z nazwą i awatarem. Serwer umieści go w strefie startowej GM.", avatarError: "Nie udało się przygotować awatara.", adding: "DODAWANIE TOKENA...",
  },
};

function getLanguage() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
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
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const side = Math.max(1, Math.min(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("avatar");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, Math.max(0, (width - side) / 2), Math.max(0, (height - side) / 2), side, side, 0, 0, 256, 256);
    return canvas.toDataURL("image/webp", .76);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function avatarKey(code) {
  return `pip2d20-tactical-player-avatar-${String(code || "offline").toLowerCase()}`;
}

function dismissedKey(code) {
  return `pip2d20-tactical-dismissed-scene-${String(code || "offline").toLowerCase()}`;
}

function readDefaultAvatar() {
  try { return localStorage.getItem(PORTRAIT_STORAGE_KEY) || ""; } catch { return ""; }
}

export default function SessionTacticalMap({ session }) {
  const text = COPY[getLanguage()];
  const scene = session?.tacticalScene || null;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [avatar, setAvatar] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [addingToken, setAddingToken] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const avatarInputRef = useRef(null);
  const lastSceneIdRef = useRef("");

  const player = useMemo(() => (session?.players || []).find((item) => item.clientId === session?.clientId || item.peerId === session?.clientId) || null, [session?.players, session?.clientId]);
  const playerName = player?.character?.name || player?.name || "Player";
  const ownToken = useMemo(() => (scene?.tokens || []).find((token) => token.kind === "player" && token.ownerClientId === session?.clientId) || null, [scene?.tokens, session?.clientId]);

  useEffect(() => {
    let stored = "";
    try { stored = localStorage.getItem(avatarKey(session?.sessionCode)) || ""; } catch { /* noop */ }
    setAvatar(stored || player?.character?.avatar || readDefaultAvatar() || "");
  }, [session?.sessionCode, player?.character?.avatar]);

  useEffect(() => {
    setTokenName(playerName);
  }, [session?.sessionCode, playerName]);

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
    const id = String(scene.sceneId || "scene");
    if (lastSceneIdRef.current === id) return;
    lastSceneIdRef.current = id;
    let dismissed = "";
    try { dismissed = sessionStorage.getItem(dismissedKey(session?.sessionCode)) || ""; } catch { /* noop */ }
    if (dismissed !== id) setOpen(true);
  }, [scene?.active, scene?.sceneId, session?.sessionCode]);

  useEffect(() => { if (ownToken) setAddingToken(false); }, [ownToken?.id]);

  if (!session?.isActive || session?.mode !== "player" || !scene?.active) return null;

  const cols = Number(scene.cols || 12);
  const rows = Number(scene.rows || 12);
  const tokens = Array.isArray(scene.tokens) ? scene.tokens : [];
  const canMove = Boolean(ownToken && session.status === "online");

  const closeTactical = () => {
    setOpen(false);
    try { sessionStorage.setItem(dismissedKey(session?.sessionCode), String(scene.sceneId || "scene")); } catch { /* noop */ }
  };

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    try {
      const next = await compressAvatar(file);
      setAvatar(next);
      try { localStorage.setItem(avatarKey(session?.sessionCode), next); } catch { /* noop */ }
      if (ownToken) await session.updateToken?.(ownToken.id, { avatar: next });
    } catch {
      setAvatarError(text.avatarError);
    }
  };

  const createOwnToken = async () => {
    if (addingToken || ownToken || session.status !== "online") return;
    setAddingToken(true);
    const customName = String(tokenName || playerName || "Player").trim().slice(0, 80) || playerName;
    const response = await session.createPlayerToken?.({ name: customName, avatar });
    if (!response?.ok) setAddingToken(false);
  };

  const moveTo = async (x, y) => {
    if (!canMove || !selected || !ownToken) return;
    await session.moveToken?.(ownToken.id, x, y);
  };

  const beginDrag = (event, token) => {
    if (!canMove || token.id !== ownToken?.id || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = tokenSize(token);
    const anchorX = Math.max(0, Math.min(size - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * size)));
    const anchorY = Math.max(0, Math.min(size - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * size)));
    dragRef.current = { tokenId: token.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, anchorX, anchorY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ tokenId: token.id, x: event.clientX, y: event.clientY, avatar: token.avatar || "", name: token.name || "", moved: false });
    event.stopPropagation();
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5;
    if (drag.moved) event.preventDefault();
    setDragState((value) => value ? { ...value, x: event.clientX, y: event.clientY, moved: drag.moved } : value);
  };

  const finishDrag = async (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();
    if (!drag.moved) { setSelected((value) => !value); return; }
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || !ownToken) return;
    const x = Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * cols) - drag.anchorX;
    const y = Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * rows) - drag.anchorY;
    await session.moveToken?.(ownToken.id, x, y);
  };

  const cells = [];
  const startSet = new Set((scene.startZone || []).map((cell) => `${cell.x}:${cell.y}`));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const anchored = tokens.filter((token) => Number(token.x) === x && Number(token.y) === y);
      cells.push(
        <button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${startSet.has(`${x}:${y}`) ? " is-start-zone" : ""}`} onClick={() => moveTo(x, y)}>
          {anchored.length ? <span className="gm-session-map__tokens">
            {anchored.map((token) => {
              const isOwn = token.id === ownToken?.id;
              const size = tokenSize(token);
              return <span
                key={token.id}
                className={`gm-session-token ${token.kind === "player" ? "is-player" : "is-npc is-enemy"} is-size-${size}${isOwn ? " is-own" : ""}${isOwn && selected ? " is-selected" : ""}${dragState?.tokenId === token.id ? " is-dragging" : ""}`}
                onPointerDown={isOwn ? (event) => beginDrag(event, token) : undefined}
                onPointerMove={isOwn ? moveDrag : undefined}
                onPointerUp={isOwn ? finishDrag : undefined}
                onPointerCancel={isOwn ? finishDrag : undefined}
              >
                {token.avatar ? <img src={token.avatar} alt="" /> : <b>{isOwn ? text.own : String(token.name || "T").slice(0, 1).toUpperCase()}</b>}
                <small>{token.name}</small>
              </span>;
            })}
          </span> : null}
        </button>
      );
    }
  }

  const overlay = open ? (
    <div className="session-tactical-overlay">
      <section className="pip-panel session-tactical-player">
        <header className="session-tactical-player__head">
          <div><div className="pip-bootline">PIP 2D20 // SERVER TACTICAL</div><h2>[ {text.title} ]</h2></div>
          <div className="session-tactical-player__actions"><span className="tactical-live">{session.status === "online" ? text.live : text.connecting}</span><button type="button" className="pip-btn" onClick={closeTactical}>{text.back}</button></div>
        </header>

        <div className={`tactical-player-token-setup${ownToken ? " has-token" : ""}`}>
          <button type="button" className="tactical-player-token-avatar" onClick={() => avatarInputRef.current?.click()}>
            {(ownToken?.avatar || avatar) ? <img src={ownToken?.avatar || avatar} alt="" /> : <span>{String(tokenName || playerName || "P").slice(0, 1).toUpperCase()}</span>}
          </button>
          <div className="tactical-player-token-copy">
            {ownToken
              ? <strong>{ownToken.name || playerName}</strong>
              : <input className="pip-input tactical-player-token-name" value={tokenName} maxLength={80} placeholder={text.tokenName} onChange={(event) => setTokenName(event.target.value)} />}
            <span>{ownToken ? text.move : text.tokenHint}</span>
          </div>
          <input ref={avatarInputRef} className="tactical-background-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFile} />
          <button type="button" className="pip-btn" onClick={() => avatarInputRef.current?.click()}>{ownToken?.avatar || avatar ? text.replaceAvatar : text.uploadAvatar}</button>
          {!ownToken ? <button type="button" className="pip-btn is-primary" disabled={addingToken || session.status !== "online" || !String(tokenName || playerName).trim()} onClick={createOwnToken}>{addingToken ? text.adding : text.addToken}</button> : null}
        </div>
        {avatarError ? <div className="session-error">{avatarError}</div> : null}
        <div className="gm-session-map__hint">{ownToken ? text.move : text.tokenHint}</div>

        <div ref={gridRef} className={`gm-session-map__grid tactical-grid${scene.backgroundUrl ? " has-background" : ""}${dragState?.moved ? " is-drag-active" : ""}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`, backgroundImage: scene.backgroundUrl ? `url(${JSON.stringify(scene.backgroundUrl)})` : undefined }}>{cells}</div>
      </section>
      {dragState?.moved ? <div className="tactical-drag-ghost" style={{ left: dragState.x, top: dragState.y }}>{dragState.avatar ? <img src={dragState.avatar} alt="" /> : <b>{String(dragState.name || "P").slice(0, 1)}</b>}</div> : null}
    </div>
  ) : null;

  return (
    <>
      <button type="button" className="session-tactical-toggle is-live" onClick={() => setOpen(true)}><span className="session-status-dot is-online" /><strong>{text.button}</strong></button>
      {overlay && typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay}
    </>
  );
}
