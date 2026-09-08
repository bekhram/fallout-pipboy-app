import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./playerTokenAssignment.css";

const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const COPY = {
  en: { waiting: "WAITING FOR TOKEN", uploadHint: "CLICK TO UPLOAD", saved: "AVATAR SENT", tooLarge: "Avatar must be 500 KB or smaller.", type: "Use JPEG, PNG or WebP.", failed: "Could not send avatar." },
  ru: { waiting: "ОЖИДАНИЕ ТОКЕНА", uploadHint: "CLICK TO UPLOAD", saved: "АВАТАР ОТПРАВЛЕН", tooLarge: "Размер аватара должен быть не больше 500 КБ.", type: "Используйте JPEG, PNG или WebP.", failed: "Не удалось отправить аватар." },
  uk: { waiting: "ОЧІКУВАННЯ ТОКЕНА", uploadHint: "CLICK TO UPLOAD", saved: "АВАТАР НАДІСЛАНО", tooLarge: "Розмір аватара має бути не більше 500 КБ.", type: "Використовуйте JPEG, PNG або WebP.", failed: "Не вдалося надіслати аватар." },
  pl: { waiting: "OCZEKIWANIE NA TOKEN", uploadHint: "CLICK TO UPLOAD", saved: "AWATAR WYSŁANY", tooLarge: "Awatar musi mieć maksymalnie 500 KB.", type: "Użyj JPEG, PNG lub WebP.", failed: "Nie udało się wysłać awatara." },
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

export default function PlayerTokenAssignmentBridge({ session }) {
  const text = COPY[languageCode()];
  const scene = session?.tacticalScene || null;
  const inputRef = useRef(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [avatarState, setAvatarState] = useState("");
  const [preview, setPreview] = useState("");

  const ownedTokens = useMemo(
    () => (scene?.tokens || []).filter((token) => token.kind === "player" && token.ownerClientId === session?.clientId),
    [scene?.tokens, session?.clientId]
  );

  const ownToken = useMemo(
    () => ownedTokens.find((token) => token.assignedByGm) || ownedTokens[0] || null,
    [ownedTokens]
  );

  const player = useMemo(
    () => (session?.players || []).find((item) => item.clientId === session?.clientId || item.peerId === session?.clientId) || null,
    [session?.players, session?.clientId]
  );

  const displayName = ownToken?.name || session?.playerTokenProfile?.name || player?.character?.name || player?.name || "Player";
  const avatar = preview || ownToken?.avatar || session?.playerTokenProfile?.avatar || "";

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => setPortalTarget(document.querySelector(".tactical-player-token-setup-v2"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !ownToken) return;
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
      const response = await session.updateAssignedPlayerAvatar?.(ownToken.id, dataUrl);
      if (response?.ok) setAvatarState(text.saved);
      else setAvatarState(`${text.failed}${response?.error ? ` [${response.error}]` : ""}`);
    } catch (error) {
      setAvatarState(`${text.failed}${error?.message ? ` [${error.message}]` : ""}`);
    }
  };

  if (!session?.isActive || session?.mode !== "player") return null;

  const controls = portalTarget ? createPortal(
    <div className="player-assigned-token-controls">
      <button type="button" disabled={!ownToken} className="player-assigned-token-avatar" onClick={() => ownToken && inputRef.current?.click()} aria-label={text.uploadHint}>
        {avatar ? <img src={avatar} alt="" /> : <span className="player-assigned-token-avatar__initial">{String(displayName || "P").slice(0, 1).toUpperCase()}</span>}
        <span className="player-assigned-token-avatar__hint">{text.uploadHint}</span>
      </button>
      <div className="player-assigned-token-controls__body">
        <strong>{ownToken ? displayName : text.waiting}</strong>
        {avatarState ? <small className={avatarState === text.saved ? "is-ok" : "is-error"}>{avatarState}</small> : null}
      </div>
      <input ref={inputRef} className="player-assigned-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
    </div>,
    portalTarget
  ) : null;

  return controls;
}
