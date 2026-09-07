import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./playerTokenAssignment.css";

const MAX_AVATAR_BYTES = 500 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ASSIGNMENT_MAX_AGE = 2 * 60 * 1000;

const COPY = {
  en: { waiting: "WAITING FOR GM TOKEN ASSIGNMENT", assigning: "GM ASSIGNED A TOKEN — CREATING...", assigned: "TOKEN CONTROL ACTIVE", upload: "UPLOAD AVATAR ≤500 KB", replace: "CHANGE AVATAR ≤500 KB", saved: "AVATAR SAVED", tooLarge: "Avatar must be 500 KB or smaller.", type: "Use JPEG, PNG or WebP.", failed: "Could not save avatar.", assignFailed: "Could not create the GM-assigned token. The app will retry automatically." },
  ru: { waiting: "ОЖИДАНИЕ НАЗНАЧЕНИЯ ТОКЕНА ГМ", assigning: "ГМ НАЗНАЧИЛ ТОКЕН — СОЗДАНИЕ...", assigned: "УПРАВЛЕНИЕ ТОКЕНОМ АКТИВНО", upload: "ЗАГРУЗИТЬ АВАТАР ≤500 КБ", replace: "СМЕНИТЬ АВАТАР ≤500 КБ", saved: "АВАТАР СОХРАНЁН", tooLarge: "Размер аватара должен быть не больше 500 КБ.", type: "Используйте JPEG, PNG или WebP.", failed: "Не удалось сохранить аватар.", assignFailed: "Не удалось создать назначенный ГМ токен. Приложение попробует ещё раз автоматически." },
  uk: { waiting: "ОЧІКУВАННЯ ПРИЗНАЧЕННЯ ТОКЕНА ГМ", assigning: "ГМ ПРИЗНАЧИВ ТОКЕН — СТВОРЕННЯ...", assigned: "КЕРУВАННЯ ТОКЕНОМ АКТИВНЕ", upload: "ЗАВАНТАЖИТИ АВАТАР ≤500 КБ", replace: "ЗМІНИТИ АВАТАР ≤500 КБ", saved: "АВАТАР ЗБЕРЕЖЕНО", tooLarge: "Розмір аватара має бути не більше 500 КБ.", type: "Використовуйте JPEG, PNG або WebP.", failed: "Не вдалося зберегти аватар.", assignFailed: "Не вдалося створити призначений ГМ токен. Застосунок спробує ще раз автоматично." },
  pl: { waiting: "OCZEKIWANIE NA PRZYDZIELENIE TOKENA PRZEZ GM", assigning: "GM PRZYDZIELIŁ TOKEN — TWORZENIE...", assigned: "STEROWANIE TOKENEM AKTYWNE", upload: "WGRAJ AWATAR ≤500 KB", replace: "ZMIEŃ AWATAR ≤500 KB", saved: "AWATAR ZAPISANY", tooLarge: "Awatar musi mieć maksymalnie 500 KB.", type: "Użyj JPEG, PNG lub WebP.", failed: "Nie udało się zapisać awatara.", assignFailed: "Nie udało się utworzyć tokena. Aplikacja spróbuje ponownie automatycznie." },
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

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function processedKey(campaignId, messageId) {
  return `pip2d20-assignment-${String(campaignId || "campaign")}-${String(messageId || "message")}`;
}

export default function PlayerTokenAssignmentBridge({ session }) {
  const text = COPY[languageCode()];
  const scene = session?.tacticalScene || null;
  const commands = Array.isArray(session?.controlMessages) ? session.controlMessages : [];
  const inputRef = useRef(null);
  const processingRef = useRef("");
  const [portalTarget, setPortalTarget] = useState(null);
  const [assignmentState, setAssignmentState] = useState("");
  const [avatarState, setAvatarState] = useState("");
  const [preview, setPreview] = useState("");

  const ownToken = useMemo(
    () => (scene?.tokens || []).find((token) => token.kind === "player" && token.ownerClientId === session?.clientId) || null,
    [scene?.tokens, session?.clientId]
  );

  const player = useMemo(
    () => (session?.players || []).find((item) => item.clientId === session?.clientId || item.peerId === session?.clientId) || null,
    [session?.players, session?.clientId]
  );

  const displayName = session?.playerTokenProfile?.name || player?.character?.name || player?.name || "Player";
  const avatar = preview || ownToken?.avatar || session?.playerTokenProfile?.avatar || "";

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const sync = () => setPortalTarget(document.querySelector(".tactical-player-token-setup-v2"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!session?.isActive || session?.mode !== "player" || !scene?.sceneId || !session?.clientId || ownToken) return;

    const now = Date.now();
    const command = [...commands].reverse().find((item) =>
      item.targetClientId === session.clientId
      && now - Number(item.requestedAt || 0) <= ASSIGNMENT_MAX_AGE
    );

    if (!command?.messageId) return;
    const key = processedKey(session.campaignId, command.messageId);
    try { if (sessionStorage.getItem(key) === "1") return; } catch { /* noop */ }
    if (processingRef.current === command.messageId) return;

    let cancelled = false;
    const apply = async () => {
      processingRef.current = command.messageId;
      setAssignmentState(text.assigning);

      let response = null;
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        response = await session.createPlayerToken?.({ name: displayName, size: command.size, avatar: "" });
        if (response?.ok) break;
        await delay(500 + attempt * 500);
      }

      processingRef.current = "";
      if (cancelled) return;
      if (response?.ok) {
        try { sessionStorage.setItem(key, "1"); } catch { /* noop */ }
        setAssignmentState(text.assigned);
      } else {
        setAssignmentState(text.assignFailed);
      }
    };

    apply();
    return () => { cancelled = true; };
  }, [commands, scene?.sceneId, ownToken?.id, session?.clientId, session?.campaignId, session?.isActive, session?.mode, displayName]);

  useEffect(() => {
    if (ownToken) setAssignmentState(text.assigned);
    else if (!assignmentState || assignmentState === text.assigned) setAssignmentState(text.waiting);
  }, [ownToken?.id]);

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
      const response = ownToken
        ? await session.updateToken?.(ownToken.id, { avatar: dataUrl })
        : await session.updatePlayerTokenProfile?.({ avatar: dataUrl });
      setAvatarState(response?.ok ? text.saved : text.failed);
    } catch {
      setAvatarState(text.failed);
    }
  };

  if (!session?.isActive || session?.mode !== "player") return null;

  const controls = portalTarget ? createPortal(
    <div className="player-assigned-token-controls">
      <button type="button" className="player-assigned-token-avatar" onClick={() => inputRef.current?.click()} aria-label={avatar ? text.replace : text.upload}>
        {avatar ? <img src={avatar} alt="" /> : <span>{String(displayName || "P").slice(0, 1).toUpperCase()}</span>}
      </button>
      <div className="player-assigned-token-controls__body">
        <strong>{assignmentState || (ownToken ? text.assigned : text.waiting)}</strong>
        <button type="button" className="pip-btn" onClick={() => inputRef.current?.click()}>{avatar ? text.replace : text.upload}</button>
        {avatarState ? <small className={avatarState === text.saved ? "is-ok" : "is-error"}>{avatarState}</small> : null}
      </div>
      <input ref={inputRef} className="player-assigned-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} />
    </div>,
    portalTarget
  ) : null;

  return controls;
}
