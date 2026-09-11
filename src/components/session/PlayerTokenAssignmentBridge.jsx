import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./playerTokenAssignment.css";

const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PORTRAIT_STORAGE_KEY = "fallout_pipboy_v4_portrait_preview";

const COPY = {
  en: { waiting: "WAITING FOR TOKEN", uploadHint: "CLICK TO UPLOAD", saved: "AVATAR SENT", tooLarge: "Avatar must be 500 KB or smaller.", type: "Use JPEG, PNG or WebP.", failed: "Could not send avatar.", addToken: "ADD MY TOKEN", adding: "ADDING...", addFailed: "Could not place token.", noSpace: "No free cell in the start zone." },
  ru: { waiting: "ОЖИДАНИЕ ТОКЕНА", uploadHint: "CLICK TO UPLOAD", saved: "АВАТАР ОТПРАВЛЕН", tooLarge: "Размер аватара должен быть не больше 500 КБ.", type: "Используйте JPEG, PNG или WebP.", failed: "Не удалось отправить аватар.", addToken: "ДОБАВИТЬ МОЙ ТОКЕН", adding: "ДОБАВЛЕНИЕ...", addFailed: "Не удалось разместить токен.", noSpace: "В стартовой зоне нет свободной клетки." },
  uk: { waiting: "ОЧІКУВАННЯ ТОКЕНА", uploadHint: "CLICK TO UPLOAD", saved: "АВАТАР НАДІСЛАНО", tooLarge: "Розмір аватара має бути не більше 500 КБ.", type: "Використовуйте JPEG, PNG або WebP.", failed: "Не вдалося надіслати аватар.", addToken: "ДОДАТИ МІЙ ТОКЕН", adding: "ДОДАВАННЯ...", addFailed: "Не вдалося розмістити токен.", noSpace: "У стартовій зоні немає вільної клітинки." },
  pl: { waiting: "OCZEKIWANIE NA TOKEN", uploadHint: "CLICK TO UPLOAD", saved: "AWATAR WYSŁANY", tooLarge: "Awatar musi mieć maksymalnie 500 KB.", type: "Użyj JPEG, PNG lub WebP.", failed: "Nie udało się wysłać awatara.", addToken: "DODAJ MÓJ TOKEN", adding: "DODAWANIE...", addFailed: "Nie udało się umieścić tokena.", noSpace: "Brak wolnego pola w strefie startowej." },
};

function languageCode() {
  if (typeof document === "undefined") return "en";
  const code = String(document.documentElement.lang || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read"));
    reader.readAsDataURL(file);
  });
}

function readPortraitPreview() {
  try { return String(localStorage.getItem(PORTRAIT_STORAGE_KEY) || ""); } catch { return ""; }
}

export default function PlayerTokenAssignmentBridge({ session }) {
  const text = COPY[languageCode()];
  const scene = session?.tacticalScene || null;
  const inputRef = useRef(null);
  const syncedPortraitRef = useRef("");
  const [portalTarget, setPortalTarget] = useState(null);
  const [avatarState, setAvatarState] = useState("");
  const [preview, setPreview] = useState("");
  const [adding, setAdding] = useState(false);
  const [portraitPreview, setPortraitPreview] = useState(readPortraitPreview);

  const ownedTokens = useMemo(
    () => (scene?.tokens || []).filter((token) => token.kind === "player" && String(token.ownerClientId || "") === String(session?.clientId || "")),
    [scene?.tokens, session?.clientId]
  );

  const ownToken = useMemo(
    () => ownedTokens.find((token) => token.assignedByGm) || ownedTokens[0] || null,
    [ownedTokens]
  );

  const player = useMemo(
    () => (session?.players || []).find((item) => String(item.clientId || item.peerId || "") === String(session?.clientId || "")) || null,
    [session?.players, session?.clientId]
  );

  const displayName = ownToken?.name || session?.playerTokenProfile?.name || player?.character?.name || player?.name || "Player";
  const characterAvatar = player?.character?.avatar || player?.character?.portrait || "";
  const fallbackAvatar = portraitPreview || characterAvatar || session?.playerTokenProfile?.avatar || "";
  const avatar = preview || ownToken?.avatar || fallbackAvatar;

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => setPortalTarget(document.querySelector(".tactical-player-token-setup-v2"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPortraitPreview(readPortraitPreview());
  }, [scene?.sceneId, session?.clientId]);

  useEffect(() => {
    if (!ownToken || ownToken.avatar || !fallbackAvatar || syncedPortraitRef.current === ownToken.id) return;
    syncedPortraitRef.current = ownToken.id;
    session.updateAssignedPlayerAvatar?.(ownToken.id, fallbackAvatar).catch?.(() => {});
  }, [ownToken?.id, ownToken?.avatar, fallbackAvatar, session]);

  const createOwnToken = async () => {
    if (adding || ownToken || session?.status !== "online") return;
    setAdding(true);
    setAvatarState("");
    const response = await session.createPlayerToken?.({
      name: String(displayName || "Player").trim().slice(0, 80) || "Player",
      size: 1,
      avatar: fallbackAvatar,
    });
    if (response?.ok) {
      if (fallbackAvatar && response?.token?.id) {
        await session.updateAssignedPlayerAvatar?.(response.token.id, fallbackAvatar);
      }
    } else {
      setAvatarState(response?.error === "NO_FREE_CELL" ? text.noSpace : `${text.addFailed}${response?.error ? ` [${response.error}]` : ""}`);
    }
    setAdding(false);
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarState("");
    if (!ALLOWED_TYPES.has(String(file.type || "").toLowerCase())) {
      setAvatarState(text.type);
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarState(text.tooLarge);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setPreview(dataUrl);
      if (ownToken) {
        const response = await session.updateAssignedPlayerAvatar?.(ownToken.id, dataUrl);
        if (response?.ok) setAvatarState(text.saved);
        else setAvatarState(`${text.failed}${response?.error ? ` [${response.error}]` : ""}`);
      } else {
        const response = await session.updatePlayerTokenProfile?.({ avatar: dataUrl, name: displayName, size: 1 });
        if (response?.ok) setAvatarState(text.saved);
        else setAvatarState(`${text.failed}${response?.error ? ` [${response.error}]` : ""}`);
      }
    } catch (error) {
      setAvatarState(`${text.failed}${error?.message ? ` [${error.message}]` : ""}`);
    }
  };

  if (!session?.isActive || session?.mode !== "player") return null;

  const controls = portalTarget ? createPortal(
    <div className="player-assigned-token-controls">
      <button type="button" className="player-assigned-token-avatar" onClick={() => inputRef.current?.click()} aria-label={text.uploadHint}>
        {avatar ? <img src={avatar} alt="" /> : <span className="player-assigned-token-avatar__initial">{String(displayName || "P").slice(0, 1).toUpperCase()}</span>}
        <span className="player-assigned-token-avatar__hint">{text.uploadHint}</span>
      </button>
      <div className="player-assigned-token-controls__body">
        <strong>{ownToken ? displayName : text.waiting}</strong>
        {!ownToken ? <button type="button" className="pip-btn" disabled={adding || session?.status !== "online"} onClick={createOwnToken}>{adding ? text.adding : text.addToken}</button> : null}
        {avatarState ? <small className={avatarState === text.saved ? "is-ok" : "is-error"}>{avatarState}</small> : null}
      </div>
      <input ref={inputRef} className="player-assigned-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
    </div>,
    portalTarget
  ) : null;

  return controls;
}
