import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../gm/gmSessionMap.css";
import "../gm/sceneLibrary.css";

const MAX_AVATAR_SOURCE_BYTES = 6 * 1024 * 1024;

const COPY = {
  en: {
    button: "TACTICAL", title: "TACTICAL MAP", back: "BACK TO PLAYER", connecting: "Connecting...", live: "LIVE", own: "YOUR TOKEN",
    move: "Drag your token to a free cell, or select it and click a destination cell.", addToken: "ADD MY TOKEN", uploadAvatar: "UPLOAD AVATAR",
    replaceAvatar: "CHANGE AVATAR", tokenName: "TOKEN NAME", tokenSize: "TOKEN SIZE", one: "1×1", two: "2×2",
    tokenHint: "Your token profile is saved on this device. The GM compares the avatar ID/hash and downloads it only when it changes.",
    avatarError: "Could not prepare this avatar.", adding: "ADDING TOKEN...", saveError: "Could not update token.", noSpace: "No free space in the GM start zone.",
  },
  ru: {
    button: "ТАКТИКА", title: "ТАКТИЧЕСКАЯ КАРТА", back: "НАЗАД К ИГРОКУ", connecting: "Подключение...", live: "LIVE", own: "ВАШ ТОКЕН",
    move: "Перетащите свой токен на свободную клетку или выберите его и нажмите клетку назначения.", addToken: "ДОБАВИТЬ МОЙ ТОКЕН", uploadAvatar: "ЗАГРУЗИТЬ АВАТАР",
    replaceAvatar: "СМЕНИТЬ АВАТАР", tokenName: "ИМЯ ТОКЕНА", tokenSize: "РАЗМЕР ТОКЕНА", one: "1×1", two: "2×2",
    tokenHint: "Профиль токена хранится на этом устройстве. ГМ сверяет ID/hash аватара и скачивает его только при изменении.",
    avatarError: "Не удалось подготовить аватар.", adding: "ДОБАВЛЕНИЕ ТОКЕНА...", saveError: "Не удалось обновить токен.", noSpace: "В стартовой зоне ГМ нет свободного места.",
  },
  uk: {
    button: "ТАКТИКА", title: "ТАКТИЧНА МАПА", back: "НАЗАД ДО ГРАВЦЯ", connecting: "Підключення...", live: "LIVE", own: "ВАШ ТОКЕН",
    move: "Перетягніть свій токен на вільну клітинку або оберіть його й натисніть клітинку призначення.", addToken: "ДОДАТИ МІЙ ТОКЕН", uploadAvatar: "ЗАВАНТАЖИТИ АВАТАР",
    replaceAvatar: "ЗМІНИТИ АВАТАР", tokenName: "ІМ'Я ТОКЕНА", tokenSize: "РОЗМІР ТОКЕНА", one: "1×1", two: "2×2",
    tokenHint: "Профіль токена зберігається на цьому пристрої. ГМ звіряє ID/hash аватара та завантажує його лише після зміни.",
    avatarError: "Не вдалося підготувати аватар.", adding: "ДОДАВАННЯ ТОКЕНА...", saveError: "Не вдалося оновити токен.", noSpace: "У стартовій зоні ГМ немає вільного місця.",
  },
  pl: {
    button: "TAKTYKA", title: "MAPA TAKTYCZNA", back: "WRÓĆ DO GRACZA", connecting: "Łączenie...", live: "LIVE", own: "TWÓJ TOKEN",
    move: "Przeciągnij swój token na wolne pole albo wybierz go i kliknij pole docelowe.", addToken: "DODAJ MÓJ TOKEN", uploadAvatar: "WGRAJ AWATAR",
    replaceAvatar: "ZMIEŃ AWATAR", tokenName: "NAZWA TOKENA", tokenSize: "ROZMIAR TOKENA", one: "1×1", two: "2×2",
    tokenHint: "Profil tokena jest zapisany na tym urządzeniu. GM porównuje ID/hash awatara i pobiera go tylko po zmianie.",
    avatarError: "Nie udało się przygotować awatara.", adding: "DODAWANIE TOKENA...", saveError: "Nie udało się zaktualizować tokena.", noSpace: "Brak wolnego miejsca w strefie startowej GM.",
  },
};

function getLanguage() {
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function tokenSize(token) { return Number(token?.size) === 2 ? 2 : 1; }

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

function dismissedKey(campaignId, sceneId) {
  return `pip2d20-tactical-dismissed-${String(campaignId || "campaign")}-${String(sceneId || "scene")}`;
}

export default function SessionTacticalMapV2({ session }) {
  const text = COPY[getLanguage()];
  const scene = session?.tacticalScene || null;
  const profile = session?.playerTokenProfile || {};
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [tokenName, setTokenName] = useState(profile.name || "Player");
  const [size, setSize] = useState(Number(profile.size) === 2 ? 2 : 1);
  const [avatar, setAvatar] = useState(profile.avatar || "");
  const [avatarError, setAvatarError] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [addingToken, setAddingToken] = useState(false);
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const avatarInputRef = useRef(null);
  const lastSceneIdRef = useRef("");

  const player = useMemo(() => (session?.players || []).find((item) => item.clientId === session?.clientId || item.peerId === session?.clientId) || null, [session?.players, session?.clientId]);
  const fallbackName = player?.character?.name || player?.name || "Player";
  const ownToken = useMemo(() => (scene?.tokens || []).find((token) => token.kind === "player" && token.ownerClientId === session?.clientId) || null, [scene?.tokens, session?.clientId]);

  useEffect(() => {
    setTokenName(profile.name || fallbackName);
    setSize(Number(profile.size) === 2 ? 2 : 1);
    setAvatar(profile.avatar || "");
  }, [profile.name, profile.size, profile.avatar, fallbackName]);

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
    try { dismissed = sessionStorage.getItem(dismissedKey(session?.campaignId, id)) || ""; } catch { /* noop */ }
    if (dismissed !== "1") setOpen(true);
  }, [scene?.active, scene?.sceneId, session?.campaignId]);

  useEffect(() => { if (ownToken) setAddingToken(false); }, [ownToken?.id]);

  if (!session?.isActive || session?.mode !== "player" || !scene?.active) return null;

  const cols = Number(scene.cols || 12);
  const rows = Number(scene.rows || 12);
  const tokens = Array.isArray(scene.tokens) ? scene.tokens : [];
  const canMove = Boolean(ownToken && session.status === "online");

  const showError = (response) => {
    if (response?.error === "NO_FREE_CELL") setTokenError(text.noSpace);
    else if (!response?.ok) setTokenError(text.saveError);
  };

  const persistProfile = async (patch) => {
    const response = await session.updatePlayerTokenProfile?.(patch);
    if (!response?.ok) showError(response);
    return response;
  };

  const commitName = async () => {
    const name = String(tokenName || fallbackName).trim().slice(0, 80) || fallbackName;
    setTokenName(name);
    setTokenError("");
    if (ownToken) showError(await session.updateToken?.(ownToken.id, { name }));
    else await persistProfile({ name });
  };

  const changeSize = async (nextSize) => {
    const normalized = Number(nextSize) === 2 ? 2 : 1;
    setSize(normalized);
    setTokenError("");
    if (ownToken) showError(await session.updateToken?.(ownToken.id, { size: normalized }));
    else await persistProfile({ size: normalized });
  };

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarError("");
    setTokenError("");
    try {
      const next = await compressAvatar(file);
      setAvatar(next);
      if (ownToken) showError(await session.updateToken?.(ownToken.id, { avatar: next }));
      else await persistProfile({ avatar: next });
    } catch {
      setAvatarError(text.avatarError);
    }
  };

  const createOwnToken = async () => {
    if (addingToken || ownToken || session.status !== "online") return;
    setAddingToken(true);
    setTokenError("");
    const response = await session.createPlayerToken?.({
      name: String(tokenName || fallbackName).trim().slice(0, 80) || fallbackName,
      size,
      avatar,
    });
    if (!response?.ok) {
      showError(response);
      setAddingToken(false);
    }
  };

  const closeTactical = () => {
    setOpen(false);
    try { sessionStorage.setItem(dismissedKey(session?.campaignId, scene.sceneId), "1"); } catch { /* noop */ }
  };

  const moveTo = async (x, y) => {
    if (!canMove || !selected || !ownToken) return;
    showError(await session.moveToken?.(ownToken.id, x, y));
  };

  const beginDrag = (event, token) => {
    if (!canMove || token.id !== ownToken?.id || (event.pointerType === "mouse" && event.button !== 0)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const currentSize = tokenSize(token);
    const anchorX = Math.max(0, Math.min(currentSize - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * currentSize)));
    const anchorY = Math.max(0, Math.min(currentSize - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * currentSize)));
    dragRef.current = { tokenId: token.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, anchorX, anchorY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({ tokenId: token.id, x: event.clientX, y: event.clientY, avatar: token.avatar || "", name: token.name || "", size: currentSize, moved: false });
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
    showError(await session.moveToken?.(ownToken.id, x, y));
  };

  const startSet = new Set((scene.startZone || []).map((cell) => `${cell.x}:${cell.y}`));
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const anchored = tokens.filter((token) => Number(token.x) === x && Number(token.y) === y);
      cells.push(
        <button type="button" key={`${x}:${y}`} className={`gm-session-map__cell tactical-cell${startSet.has(`${x}:${y}`) ? " is-start-zone" : ""}`} onClick={() => moveTo(x, y)}>
          {anchored.length ? <span className="gm-session-map__tokens">
            {anchored.map((token) => {
              const isOwn = token.id === ownToken?.id;
              const currentSize = tokenSize(token);
              return <span
                key={token.id}
                className={`gm-session-token ${token.kind === "player" ? "is-player" : "is-npc is-enemy"} is-size-${currentSize}${isOwn ? " is-own" : ""}${isOwn && selected ? " is-selected" : ""}${dragState?.tokenId === token.id ? " is-dragging" : ""}`}
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
          <div><div className="pip-bootline">PIP 2D20 // {scene.name || "TACTICAL"}</div><h2>[ {text.title} ]</h2></div>
          <div className="session-tactical-player__actions"><span className="tactical-live">{session.status === "online" ? text.live : text.connecting}</span><button type="button" className="pip-btn" onClick={closeTactical}>{text.back}</button></div>
        </header>

        <div className={`tactical-player-token-setup tactical-player-token-setup-v2${ownToken ? " has-token" : ""}`}>
          <button type="button" className="tactical-player-token-avatar" onClick={() => avatarInputRef.current?.click()}>
            {(ownToken?.avatar || avatar) ? <img src={ownToken?.avatar || avatar} alt="" /> : <span>{String(tokenName || fallbackName || "P").slice(0, 1).toUpperCase()}</span>}
          </button>
          <div className="tactical-player-token-editor">
            <input className="pip-input tactical-player-token-name" value={tokenName} maxLength={80} placeholder={text.tokenName} onChange={(event) => setTokenName(event.target.value)} onBlur={commitName} />
            <label className="tactical-player-size-field"><span>{text.tokenSize}</span><select className="pip-input" value={ownToken ? tokenSize(ownToken) : size} onChange={(event) => changeSize(event.target.value)}><option value="1">{text.one}</option><option value="2">{text.two}</option></select></label>
          </div>
          <input ref={avatarInputRef} className="tactical-background-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFile} />
          <button type="button" className="pip-btn" onClick={() => avatarInputRef.current?.click()}>{ownToken?.avatar || avatar ? text.replaceAvatar : text.uploadAvatar}</button>
          {!ownToken ? <button type="button" className="pip-btn is-primary" disabled={addingToken || session.status !== "online"} onClick={createOwnToken}>{addingToken ? text.adding : text.addToken}</button> : null}
        </div>
        <div className="gm-session-map__hint">{ownToken ? text.move : text.tokenHint}</div>
        {avatarError ? <div className="session-error">{avatarError}</div> : null}
        {tokenError ? <div className="session-error">{tokenError}</div> : null}

        <div ref={gridRef} className={`gm-session-map__grid tactical-grid${scene.backgroundUrl ? " has-background" : ""}${dragState?.moved ? " is-drag-active" : ""}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`, backgroundImage: scene.backgroundUrl ? `url(${JSON.stringify(scene.backgroundUrl)})` : undefined }}>{cells}</div>
      </section>
      {dragState?.moved ? <div className={`tactical-drag-ghost${dragState.size === 2 ? " is-size-2" : ""}`} style={{ left: dragState.x, top: dragState.y }}>{dragState.avatar ? <img src={dragState.avatar} alt="" /> : <b>{String(dragState.name || "P").slice(0, 1)}</b>}</div> : null}
    </div>
  ) : null;

  return (
    <>
      <button type="button" className="session-tactical-toggle is-live" onClick={() => setOpen(true)}><span className="session-status-dot is-online" /><strong>{text.button}</strong></button>
      {overlay && typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay}
    </>
  );
}
