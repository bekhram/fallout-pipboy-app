import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeSessionCode,
  SESSION_CODE_LENGTH,
} from "../../hooks/useSharedSession.js";
import { buildSessionShareUrl, getSessionCodeFromUrl } from "../../utils/sessionShare.js";
import GmWorkspace from "../gm/GmWorkspace.jsx";
import SessionChatDrawer from "./SessionChatDrawer.jsx";
import SessionActionsMenu from "./SessionActionsMenu.jsx";
import PlayerCampaignWorkspace from "./PlayerCampaignWorkspace.jsx";
import SessionLobby from "./SessionLobby.jsx";
import TelegramCampaignPanel from "./TelegramCampaignPanel.jsx";
import "./session.css";
import "./sessionGmWorkspace.css";
import "../gm/gmOrganicWorkspace.css";

const SAVE_KEY = "fallout_pipboy_v4_last_character";

const BASE = {
  en: {
    title: "GM / SESSION",
    subtitle: "Shared Fallout 2d20 session",
    back: "BACK",
    host: "GAME MASTER",
    hostDesc: "Create a new session or restore your latest cloud campaign before starting the GM workspace.",
    create: "CREATE GM SESSION",
    restoreCloud: "RESTORE FROM CLOUD",
    restoringCloud: "RESTORING FROM CLOUD...",
    noCloudCampaign: "No cloud campaign was found for this account.",
    signInForCloud: "Sign in with Google before restoring a cloud campaign.",
    cloudRestoreFailed: "Cloud campaign restore failed.",
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
    hostDesc: "Создайте новую сессию или восстановите последнюю облачную кампанию до запуска панели ГМ.",
    create: "СОЗДАТЬ СЕССИЮ ГМ",
    restoreCloud: "ВОССТАНОВИТЬ ИЗ ОБЛАКА",
    restoringCloud: "ВОССТАНОВЛЕНИЕ ИЗ ОБЛАКА...",
    noCloudCampaign: "Для этого аккаунта облачная кампания не найдена.",
    signInForCloud: "Войдите через Google перед восстановлением облачной кампании.",
    cloudRestoreFailed: "Не удалось восстановить облачную кампанию.",
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
    hostDesc: "Створіть нову сесію або відновіть останню хмарну кампанію до запуску панелі ГМ.",
    create: "СТВОРИТИ СЕСІЮ ГМ",
    restoreCloud: "ВІДНОВИТИ З ХМАРИ",
    restoringCloud: "ВІДНОВЛЕННЯ З ХМАРИ...",
    noCloudCampaign: "Для цього облікового запису хмарну кампанію не знайдено.",
    signInForCloud: "Увійдіть через Google перед відновленням хмарної кампанії.",
    cloudRestoreFailed: "Не вдалося відновити хмарну кампанію.",
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
    hostDesc: "Utwórz nową sesję albo przywróć ostatnią kampanię z chmury przed uruchomieniem panelu GM.",
    create: "UTWÓRZ SESJĘ GM",
    restoreCloud: "PRZYWRÓĆ Z CHMURY",
    restoringCloud: "PRZYWRACANIE Z CHMURY...",
    noCloudCampaign: "Nie znaleziono kampanii w chmurze dla tego konta.",
    signInForCloud: "Zaloguj się przez Google przed przywróceniem kampanii z chmury.",
    cloudRestoreFailed: "Nie udało się przywrócić kampanii z chmury.",
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
  const language = String(value || "en").toLowerCase().split("-")[0];
  return BASE[language] ? language : "en";
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
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
      {session.mode === "host" ? <span>{session.players?.length || 0}</span> : null}
    </button>
  );
}

export default function SessionScreen({ form, session, onBack, onOpenSheet, onNavigateMenu, showLobby = false, onShowLobby, onEnterSession }) {
  const { i18n } = useTranslation();
  const copy = BASE[getLanguage(i18n.resolvedLanguage || i18n.language)];
  const lobbyLabel = ({en:"Session menu",ru:"Меню сессии",uk:"Меню сесії",pl:"Menu sesji"})[getLanguage(i18n.resolvedLanguage || i18n.language)];
  const defaultPlayerName = useMemo(() => getCharacterName(form) || "Player", [form]);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [localError, setLocalError] = useState("");
  const [errorTarget, setErrorTarget] = useState("player");
  const [copyState, setCopyState] = useState(false);
  const [chatDockTarget, setChatDockTarget] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [syncState, setSyncState] = useState(false);
  const [, forceCharacterRefresh] = useState(0);

  const mode = session?.mode || "lobby";
  const status = session?.status || "waiting";
  const players = session?.players || [];
  const sceneMessage = session?.sceneMessage || "";
  const sessionCode = session?.sessionCode || "";
  const lastHostCode = session?.lastSession?.role === "host"
    ? normalizeSessionCode(session.lastSession.code)
    : "";
  const shareCode = normalizeSessionCode(sessionCode || lastHostCode);
  const sessionError = session?.error?.key
    ? copy[session.error.key] || session.error.message || copy.networkError
    : session?.error?.message || "";
  const error = localError || sessionError;

  useEffect(() => {
    const sharedCode = getSessionCodeFromUrl();
    if (sharedCode.length === SESSION_CODE_LENGTH) setJoinCode(sharedCode);
  }, []);

  const setCharacter = (updater) => {
    if (!form || typeof form !== "object") return;
    const next = typeof updater === "function" ? updater(form) : updater;
    if (!next || typeof next !== "object") return;
    Object.assign(form, next);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        updatedAt: new Date().toISOString(),
        data: { ...form },
      }));
    } catch {
      // Local persistence is best effort only.
    }
    forceCharacterRefresh((value) => value + 1);
  };

  const handleJoin = () => {
    setErrorTarget("player");
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
    onEnterSession?.();
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

  const handleCopyLink = async () => {
    const url = buildSessionShareUrl(shareCode);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      setLinkCopied(false);
    }
  };

  const handleShareLink = async () => {
    const url = buildSessionShareUrl(shareCode);
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pip-2D20", text: `Join my Pip-2D20 session ${shareCode}`, url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    handleCopyLink();
  };

  const handleSync = () => {
    if (!session?.syncCharacter?.()) return;
    setSyncState(true);
    window.setTimeout(() => setSyncState(false), 1000);
  };

  if (showLobby || mode === "lobby") {
    return <SessionLobby session={session} form={form} onEnterSession={onEnterSession} language={i18n.resolvedLanguage || i18n.language} copy={copy}
      onBack={onBack} onNavigate={onNavigateMenu || onBack}
      onHost={()=>{setErrorTarget("host");setLocalError("");onEnterSession?.();session?.startHost?.();}}
      onJoin={handleJoin}
      joinCode={joinCode} onCode={value=>{setJoinCode(normalizeSessionCode(value));setLocalError("");}}
      playerName={playerName} onName={value=>{setPlayerName(value);setLocalError("");}}
      busy={false} error={error} errorTarget={errorTarget}
      shareCode={shareCode.length === SESSION_CODE_LENGTH ? shareCode : ""}
      onShare={handleShareLink} onCopy={handleCopyLink} linkCopied={linkCopied}/>;
  }

  if (mode === "host") {
    return (
      <section className="session-gm-host session-gm-host--single-workspace session-gm-host--organic">
        <header className="pip-panel session-gm-hostbar">
          <div className="session-gm-hostbar__brand">
            <div className="pip-bootline">PIP 2D20</div>
            <strong>{copy.workspace}</strong>
          </div>
          <div className="session-gm-hostbar__session">
            <span className={`session-status-dot is-${status}`} role="img" aria-label={copy[status] || status} title={copy[status] || status} />
            <span className="gm-organic-connection"><strong>{copy[status] || status}</strong></span>
            <button
              type="button"
              className="session-gm-code"
              onClick={handleCopy}
              disabled={!sessionCode}
              aria-label={copyState ? copy.copied : copy.copy}
              title={copyState ? copy.copied : copy.copy}
            >
              {copyState ? "✓" : (sessionCode || "—")}
            </button>
            <span className="gm-organic-player-count" title={copy.players}>♙ <strong>{players.length}</strong></span>
          </div>
          <SessionActionsMenu mode={mode} session={session} onBack={onShowLobby || onBack} onOpenSheet={onOpenSheet} labels={{...copy, back: lobbyLabel}} />
        </header>

        {error ? <div className="session-error session-gm-host-error">{error}</div> : null}

        <TelegramCampaignPanel session={session} />

        <div className="session-gm-workspace-wrap session-gm-workspace-wrap--single">
          <GmWorkspace
            session={session}
            onChatDockReady={setChatDockTarget}
            onOpenCampaigns={onShowLobby || onBack}
            character={form}
            setCharacter={setCharacter}
            onOpenMap={onOpenSheet}
          />
          <div className="stat-sub session-gm-live-hint">{copy.liveHint}</div>
        </div>

        <SessionChatDrawer session={session} form={form} workspace dockTarget={chatDockTarget} />
      </section>
    );
  }

  return <PlayerCampaignWorkspace session={session} form={form} copy={copy} error={error}
    onBack={onShowLobby || onBack} onOpenSheet={onOpenSheet} />;
}
