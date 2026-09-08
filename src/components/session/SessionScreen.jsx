import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeSessionCode,
  SESSION_CODE_LENGTH,
} from "../../hooks/useSharedSession.js";
import GmWorkspace from "../gm/GmWorkspace.jsx";
import SessionChatDrawer from "./SessionChatDrawer.jsx";
import "./session.css";
import "./sessionGmWorkspace.css";

const SAVE_KEY = "fallout_pipboy_v4_last_character";

const BASE = {
  en: {
    title: "GM / SESSION",
    subtitle: "Shared Fallout 2d20 session",
    back: "BACK",
    host: "GAME MASTER",
    hostDesc:
      "Create a session. The GM workspace opens only after the room is online.",
    create: "CREATE GM SESSION",
    player: "PLAYER",
    playerDesc: "Enter the code from the Game Master.",
    code: "SESSION CODE",
    name: "PLAYER NAME",
    join: "JOIN SESSION",
    online: "Online",
    connecting: "Connecting",
    waiting: "Waiting",
    disconnected: "Disconnected",
    error: "Connection error",
    copy: "COPY CODE",
    copied: "COPIED",
    end: "END SESSION",
    leave: "LEAVE SESSION",
    openSheet: "OPEN CHARACTER",
    players: "CONNECTED PLAYERS",
    workspace: "GM WORKSPACE",
    currentMessage: "CURRENT GM MESSAGE",
    noMessage: "No GM message yet.",
    sync: "SYNC CHARACTER",
    synced: "SYNCED",
    status: "STATUS",
    invalidCode: "Enter a 6-character session code.",
    invalidName: "Enter a player name.",
    hostNotFound: "GM session not found or offline.",
    roomUnavailable: "This session code is unavailable. Create another room.",
    networkError: "Network error",
    liveHint: "GM tools are available only while this host session is active.",
    liveSession: "GAME MASTER // LIVE SESSION",
  },
  ru: {
    title: "ГМ / СЕССИЯ",
    subtitle: "Общая сессия Fallout 2d20",
    back: "НАЗАД",
    host: "GAME MASTER",
    hostDesc:
      "Создайте комнату. Панель ГМ откроется только после запуска отдельной сессии.",
    create: "СОЗДАТЬ СЕССИЮ ГМ",
    player: "ИГРОК",
    playerDesc: "Введите код, который дал ведущий.",
    code: "КОД СЕССИИ",
    name: "ИМЯ ИГРОКА",
    join: "ПОДКЛЮЧИТЬСЯ",
    online: "Онлайн",
    connecting: "Подключение",
    waiting: "Ожидание",
    disconnected: "Отключено",
    error: "Ошибка соединения",
    copy: "КОПИРОВАТЬ КОД",
    copied: "СКОПИРОВАНО",
    end: "ЗАВЕРШИТЬ СЕССИЮ",
    leave: "ВЫЙТИ ИЗ СЕССИИ",
    openSheet: "ОТКРЫТЬ ПЕРСОНАЖА",
    players: "ПОДКЛЮЧЕННЫЕ ИГРОКИ",
    workspace: "ПАНЕЛЬ ГМ",
    currentMessage: "ТЕКУЩЕЕ СООБЩЕНИЕ ГМ",
    noMessage: "ГМ пока ничего не отправил.",
    sync: "СИНХРОНИЗИРОВАТЬ",
    synced: "СИНХРОНИЗОВАНО",
    status: "СТАТУС",
    invalidCode: "Введите 6-символьный код сессии.",
    invalidName: "Введите имя игрока.",
    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.",
    roomUnavailable: "Код комнаты уже занят. Создайте новую сессию.",
    networkError: "Ошибка сети",
    liveHint: "Инструменты ГМ доступны только пока эта host-сессия активна.",
    liveSession: "ГЕЙМ-МАСТЕР // АКТИВНАЯ СЕССИЯ",
  },
  uk: {
    title: "ГМ / СЕСІЯ",
    subtitle: "Спільна сесія Fallout 2d20",
    back: "НАЗАД",
    host: "GAME MASTER",
    hostDesc:
      "Створіть кімнату. Панель ГМ відкриється лише після запуску окремої сесії.",
    create: "СТВОРИТИ СЕСІЮ ГМ",
    player: "ГРАВЕЦЬ",
    playerDesc: "Введіть код, який дав ведучий.",
    code: "КОД СЕСІЇ",
    name: "ІМ'Я ГРАВЦЯ",
    join: "ПІДКЛЮЧИТИСЯ",
    online: "Онлайн",
    connecting: "Підключення",
    waiting: "Очікування",
    disconnected: "Відключено",
    error: "Помилка з'єднання",
    copy: "КОПІЮВАТИ КОД",
    copied: "СКОПІЙОВАНО",
    end: "ЗАВЕРШИТИ СЕСІЮ",
    leave: "ВИЙТИ ІЗ СЕСІЇ",
    openSheet: "ВІДКРИТИ ПЕРСОНАЖА",
    players: "ПІДКЛЮЧЕНІ ГРАВЦІ",
    workspace: "ПАНЕЛЬ ГМ",
    currentMessage: "ПОТОЧНЕ ПОВІДОМЛЕННЯ ГМ",
    noMessage: "ГМ ще нічого не надіслав.",
    sync: "СИНХРОНІЗУВАТИ",
    synced: "СИНХРОНІЗОВАНО",
    status: "СТАТУС",
    invalidCode: "Введіть 6-символьний код сесії.",
    invalidName: "Введіть ім'я гравця.",
    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.",
    roomUnavailable: "Код кімнати зайнятий. Створіть нову сесію.",
    networkError: "Помилка мережі",
    liveHint: "Інструменти ГМ доступні лише поки ця host-сесія активна.",
    liveSession: "ГЕЙМ-МАЙСТЕР // АКТИВНА СЕСІЯ",
  },
  pl: {
    title: "GM / SESJA",
    subtitle: "Wspólna sesja Fallout 2d20",
    back: "WSTECZ",
    host: "GAME MASTER",
    hostDesc:
      "Utwórz pokój. Panel GM otworzy się dopiero po uruchomieniu osobnej sesji.",
    create: "UTWÓRZ SESJĘ GM",
    player: "GRACZ",
    playerDesc: "Wpisz kod otrzymany od prowadzącego.",
    code: "KOD SESJI",
    name: "NAZWA GRACZA",
    join: "DOŁĄCZ",
    online: "Online",
    connecting: "Łączenie",
    waiting: "Oczekiwanie",
    disconnected: "Rozłączono",
    error: "Błąd połączenia",
    copy: "KOPIUJ KOD",
    copied: "SKOPIOWANO",
    end: "ZAKOŃCZ SESJĘ",
    leave: "OPUŚĆ SESJĘ",
    openSheet: "OTWÓRZ POSTAĆ",
    players: "POŁĄCZENI GRACZE",
    workspace: "PANEL GM",
    currentMessage: "AKTUALNA WIADOMOŚĆ GM",
    noMessage: "GM nie wysłał jeszcze wiadomości.",
    sync: "SYNCHRONIZUJ",
    synced: "ZSYNCHRONIZOWANO",
    status: "STATUS",
    invalidCode: "Wpisz 6-znakowy kod sesji.",
    invalidName: "Wpisz nazwę gracza.",
    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.",
    roomUnavailable: "Kod pokoju jest zajęty. Utwórz nową sesję.",
    networkError: "Błąd sieci",
    liveHint: "Narzędzia GM są dostępne tylko podczas aktywnej sesji hosta.",
    liveSession: "MISTRZ GRY // AKTYWNA SESJA",
  },
};

function getLanguage(value) {
  const language = String(value || "en")
    .toLowerCase()
    .split("-")[0];
  return BASE[language] ? language : "en";
}

function getCharacterName(form) {
  return String(
    form?.characterName || form?.name || form?.playerName || ""
  ).trim();
}

export function SessionFloatingButton({ session, onOpen }) {
  const { i18n } = useTranslation();
  const copy = BASE[getLanguage(i18n.resolvedLanguage || i18n.language)];
  if (!session?.isActive) return null;
  return (
    <button type="button" className="floating-session-button" onClick={onOpen}>
      <span className={`session-status-dot is-${session.status}`} />
      <strong>{copy.title}</strong>
      <span>{session.sessionCode}</span>
      {session.mode === "host" ? (
        <span>{session.players?.length || 0}</span>
      ) : null}
    </button>
  );
}

export default function SessionScreen({ form, session, onBack, onOpenSheet }) {
  const { i18n } = useTranslation();
  const copy = BASE[getLanguage(i18n.resolvedLanguage || i18n.language)];
  const defaultPlayerName = useMemo(
    () => getCharacterName(form) || "Player",
    [form]
  );
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [localError, setLocalError] = useState("");
  const [copyState, setCopyState] = useState(false);
  const [syncState, setSyncState] = useState(false);
  const [, forceCharacterRefresh] = useState(0);

  const mode = session?.mode || "lobby";
  const status = session?.status || "waiting";
  const players = session?.players || [];
  const sceneMessage = session?.sceneMessage || "";
  const sessionCode = session?.sessionCode || "";
  const sessionError = session?.error?.key
    ? copy[session.error.key] || session.error.message || copy.networkError
    : session?.error?.message || "";
  const error = localError || sessionError;

  const setCharacter = (updater) => {
    if (!form || typeof form !== "object") return;
    const next = typeof updater === "function" ? updater(form) : updater;
    if (!next || typeof next !== "object") return;
    Object.assign(form, next);
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          data: { ...form },
        })
      );
    } catch {
      // Local persistence is best effort only.
    }
    forceCharacterRefresh((value) => value + 1);
  };

  const handleJoin = () => {
    const code = normalizeSessionCode(joinCode);
    const name = String(playerName || "").trim();
    if (code.length !== SESSION_CODE_LENGTH) {
      setLocalError(copy.invalidCode);
      return;
    }
    if (!name) {
      setLocalError(copy.invalidName);
      return;
    }
    setLocalError("");
    session?.joinSession?.({ code, name });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1200);
    } catch {
      setCopyState(false);
    }
  };

  const handleSync = () => {
    if (!session?.syncCharacter?.()) return;
    setSyncState(true);
    window.setTimeout(() => setSyncState(false), 1000);
  };

  if (mode === "lobby") {
    return (
      <section className="session-screen pip-screen-grid session-gm-entry">
        <section className="pip-panel pip-block session-hero">
          <div className="session-topline">
            <div>
              <div className="pip-bootline">PIP 2D20 NETWORK</div>
              <h1 className="pip-title">{copy.title}</h1>
              <p className="pip-subtitle">{copy.subtitle}</p>
            </div>
            <button type="button" className="pip-btn" onClick={onBack}>
              {copy.back}
            </button>
          </div>
        </section>

        <div className="session-role-grid">
          <section className="pip-panel pip-block session-role-card session-role-card--gm">
            <div className="session-role-icon">GM</div>
            <h2>[ {copy.host} ]</h2>
            <p className="stat-sub">{copy.hostDesc}</p>
            <button
              type="button"
              className="pip-btn is-primary session-main-button"
              onClick={() => session?.startHost?.()}
            >
              {copy.create}
            </button>
          </section>

          <section className="pip-panel pip-block session-role-card">
            <div className="session-role-icon">P</div>
            <h2>[ {copy.player} ]</h2>
            <p className="stat-sub">{copy.playerDesc}</p>
            <label className="session-field">
              <span>{copy.code}</span>
              <input
                className="pip-input session-code-input"
                value={joinCode}
                maxLength={SESSION_CODE_LENGTH}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="ABC234"
                onChange={(event) =>
                  setJoinCode(normalizeSessionCode(event.target.value))
                }
              />
            </label>
            <label className="session-field">
              <span>{copy.name}</span>
              <input
                className="pip-input"
                value={playerName}
                maxLength={40}
                onChange={(event) => setPlayerName(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="pip-btn is-primary session-main-button"
              onClick={handleJoin}
            >
              {copy.join}
            </button>
            {error ? <div className="session-error">{error}</div> : null}
          </section>
        </div>
      </section>
    );
  }

  if (mode === "host") {
    return (
      <section className="session-gm-host session-gm-host--single-workspace">
        <header className="pip-panel session-gm-hostbar">
          <div className="session-gm-hostbar__brand">
            <div className="pip-bootline">{copy.liveSession}</div>
            <strong>{copy.workspace}</strong>
          </div>
          <div className="session-gm-hostbar__session">
            <span className={`session-status-dot is-${status}`} />
            <span>
              {copy.status}: <strong>{copy[status] || status}</strong>
            </span>
            <button
              type="button"
              className="session-gm-code"
              onClick={handleCopy}
              title={copyState ? copy.copied : copy.copy}
            >
              {sessionCode}
            </button>
            <span>
              {copy.players}: <strong>{players.length}</strong>
            </span>
          </div>
          <div className="session-gm-hostbar__actions">
            <button type="button" className="pip-btn" onClick={onOpenSheet}>
              {copy.openSheet}
            </button>
            <button
              type="button"
              className="pip-btn"
              onClick={() => session?.exitSession?.()}
            >
              {copy.end}
            </button>
          </div>
        </header>

        {error ? (
          <div className="session-error session-gm-host-error">{error}</div>
        ) : null}

        <div className="session-gm-workspace-wrap session-gm-workspace-wrap--single">
          <GmWorkspace
            character={form}
            setCharacter={setCharacter}
            onOpenMap={onOpenSheet}
          />
          <div className="stat-sub session-gm-live-hint">{copy.liveHint}</div>
        </div>

        <SessionChatDrawer session={session} form={form} />
      </section>
    );
  }

  return (
    <section className="session-screen pip-screen-grid session-player-live session-player-live--simple">
      <section className="pip-panel pip-block session-hero">
        <div className="session-topline">
          <div>
            <div className="pip-bootline">PLAYER LINK // {sessionCode}</div>
            <h1 className="pip-title">{copy.player}</h1>
          </div>
          <div className="session-top-actions">
            <button type="button" className="pip-btn" onClick={onOpenSheet}>
              {copy.openSheet}
            </button>
            <button
              type="button"
              className="pip-btn"
              onClick={() => session?.exitSession?.()}
            >
              {copy.leave}
            </button>
          </div>
        </div>
        <div className="session-status-strip">
          <div>
            <span className={`session-status-dot is-${status}`} />
            <span>
              {copy.status}: <strong>{copy[status] || status}</strong>
            </span>
          </div>
          <div className="session-code-display">{sessionCode}</div>
        </div>
        {error ? <div className="session-error">{error}</div> : null}
      </section>

      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {copy.currentMessage} ]</h2>
        </div>
        <div className="pip-logbox session-current-message session-current-message-large">
          {sceneMessage || copy.noMessage}
        </div>
        <button
          type="button"
          className="pip-btn"
          disabled={status !== "online"}
          onClick={handleSync}
        >
          {syncState ? copy.synced : copy.sync}
        </button>
      </section>

      <SessionChatDrawer session={session} form={form} />
    </section>
  );
}
