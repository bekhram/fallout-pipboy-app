import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeSessionCode, SESSION_CODE_LENGTH } from "../../hooks/useSharedSession.js";
import GmWorkspace from "../gm/GmWorkspace.jsx";
import SessionCombatBoard from "./SessionCombatBoard.jsx";
import SessionChatDrawer from "./SessionChatDrawer.jsx";
import "./session.css";
import "./sessionGmWorkspace.css";

const SAVE_KEY = "fallout_pipboy_v4_last_character";

const BASE = {
  en: {
    title: "GM / SESSION", subtitle: "Shared Fallout 2d20 session", back: "BACK", host: "GAME MASTER",
    hostDesc: "Create a session. The GM workspace opens only after the room is online.", create: "CREATE GM SESSION",
    player: "PLAYER", playerDesc: "Enter the code from the Game Master.", code: "SESSION CODE", name: "PLAYER NAME",
    join: "JOIN SESSION", online: "Online", connecting: "Connecting", waiting: "Waiting", disconnected: "Disconnected",
    error: "Connection error", copy: "COPY CODE", copied: "COPIED", end: "END SESSION", leave: "LEAVE SESSION",
    openSheet: "OPEN CHARACTER", players: "CONNECTED PLAYERS", noPlayers: "Waiting for players...", workspace: "GM WORKSPACE",
    combat: "COMBAT", overview: "SESSION", gmBroadcast: "GM MESSAGE", broadcastPlaceholder: "Scene, objective, warning or location for the players...",
    broadcast: "SEND TO PLAYERS", currentMessage: "CURRENT GM MESSAGE", noMessage: "No GM message yet.", sync: "SYNC CHARACTER",
    synced: "SYNCED", status: "STATUS", level: "LVL", hp: "HP", defense: "DEF", noCharacter: "No character data",
    invalidCode: "Enter a 6-character session code.", invalidName: "Enter a player name.", hostNotFound: "GM session not found or offline.",
    roomUnavailable: "This session code is unavailable. Create another room.", networkError: "Network error",
    liveHint: "GM tools are available only while this host session is active.",
    initiativeTrack: "INITIATIVE", round: "ROUND", preview: "PREVIEW", currentTurn: "CURRENT TURN", groupAp: "GROUP AP",
    combatants: "COMBATANTS", noActors: "No combatants.", npc: "NPC", armor: "ARMOR", initiative: "INIT",
    addNpc: "ADD NPC", npcName: "NPC NAME", remove: "REMOVE", startCombat: "START COMBAT", nextTurn: "NEXT TURN", endCombat: "END COMBAT",
  },
  ru: {
    title: "ГМ / СЕССИЯ", subtitle: "Общая сессия Fallout 2d20", back: "НАЗАД", host: "GAME MASTER",
    hostDesc: "Создайте комнату. Панель ГМ откроется только после запуска отдельной сессии.", create: "СОЗДАТЬ СЕССИЮ ГМ",
    player: "ИГРОК", playerDesc: "Введите код, который дал ведущий.", code: "КОД СЕССИИ", name: "ИМЯ ИГРОКА",
    join: "ПОДКЛЮЧИТЬСЯ", online: "Онлайн", connecting: "Подключение", waiting: "Ожидание", disconnected: "Отключено",
    error: "Ошибка соединения", copy: "КОПИРОВАТЬ КОД", copied: "СКОПИРОВАНО", end: "ЗАВЕРШИТЬ СЕССИЮ", leave: "ВЫЙТИ ИЗ СЕССИИ",
    openSheet: "ОТКРЫТЬ ПЕРСОНАЖА", players: "ПОДКЛЮЧЕННЫЕ ИГРОКИ", noPlayers: "Ожидаю игроков...", workspace: "ПАНЕЛЬ ГМ",
    combat: "БОЙ", overview: "СЕССИЯ", gmBroadcast: "СООБЩЕНИЕ ГМ", broadcastPlaceholder: "Сцена, цель, предупреждение или локация для игроков...",
    broadcast: "ОТПРАВИТЬ ИГРОКАМ", currentMessage: "ТЕКУЩЕЕ СООБЩЕНИЕ ГМ", noMessage: "ГМ пока ничего не отправил.", sync: "СИНХРОНИЗИРОВАТЬ",
    synced: "СИНХРОНИЗИРОВАНО", status: "СТАТУС", level: "УР", hp: "HP", defense: "ЗАЩ", noCharacter: "Нет данных персонажа",
    invalidCode: "Введите 6-символьный код сессии.", invalidName: "Введите имя игрока.", hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.",
    roomUnavailable: "Код комнаты уже занят. Создайте новую сессию.", networkError: "Ошибка сети",
    liveHint: "Инструменты ГМ доступны только пока эта host-сессия активна.",
    initiativeTrack: "ИНИЦИАТИВА", round: "РАУНД", preview: "ПРЕДПРОСМОТР", currentTurn: "ТЕКУЩИЙ ХОД", groupAp: "AP ГРУППЫ",
    combatants: "УЧАСТНИКИ БОЯ", noActors: "Нет участников боя.", npc: "NPC", armor: "БРОНЯ", initiative: "ИНИЦ",
    addNpc: "ДОБАВИТЬ NPC", npcName: "ИМЯ NPC", remove: "УДАЛИТЬ", startCombat: "НАЧАТЬ БОЙ", nextTurn: "СЛЕДУЮЩИЙ ХОД", endCombat: "ЗАКОНЧИТЬ БОЙ",
  },
  uk: {
    title: "ГМ / СЕСІЯ", subtitle: "Спільна сесія Fallout 2d20", back: "НАЗАД", host: "GAME MASTER",
    hostDesc: "Створіть кімнату. Панель ГМ відкриється лише після запуску окремої сесії.", create: "СТВОРИТИ СЕСІЮ ГМ",
    player: "ГРАВЕЦЬ", playerDesc: "Введіть код, який дав ведучий.", code: "КОД СЕСІЇ", name: "ІМ'Я ГРАВЦЯ",
    join: "ПІДКЛЮЧИТИСЯ", online: "Онлайн", connecting: "Підключення", waiting: "Очікування", disconnected: "Відключено",
    error: "Помилка з'єднання", copy: "КОПІЮВАТИ КОД", copied: "СКОПІЙОВАНО", end: "ЗАВЕРШИТИ СЕСІЮ", leave: "ВИЙТИ ІЗ СЕСІЇ",
    openSheet: "ВІДКРИТИ ПЕРСОНАЖА", players: "ПІДКЛЮЧЕНІ ГРАВЦІ", noPlayers: "Очікую гравців...", workspace: "ПАНЕЛЬ ГМ",
    combat: "БІЙ", overview: "СЕСІЯ", gmBroadcast: "ПОВІДОМЛЕННЯ ГМ", broadcastPlaceholder: "Сцена, ціль, попередження або локація для гравців...",
    broadcast: "НАДІСЛАТИ ГРАВЦЯМ", currentMessage: "ПОТОЧНЕ ПОВІДОМЛЕННЯ ГМ", noMessage: "ГМ ще нічого не надіслав.", sync: "СИНХРОНІЗУВАТИ",
    synced: "СИНХРОНІЗОВАНО", status: "СТАТУС", level: "РІВ", hp: "HP", defense: "ЗАХ", noCharacter: "Немає даних персонажа",
    invalidCode: "Введіть 6-символьний код сесії.", invalidName: "Введіть ім'я гравця.", hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.",
    roomUnavailable: "Код кімнати зайнятий. Створіть нову сесію.", networkError: "Помилка мережі",
    liveHint: "Інструменти ГМ доступні лише поки ця host-сесія активна.",
    initiativeTrack: "ІНІЦІАТИВА", round: "РАУНД", preview: "ПЕРЕГЛЯД", currentTurn: "ПОТОЧНИЙ ХІД", groupAp: "AP ГРУПИ",
    combatants: "УЧАСНИКИ БОЮ", noActors: "Немає учасників бою.", npc: "NPC", armor: "БРОНЯ", initiative: "ІНІЦ",
    addNpc: "ДОДАТИ NPC", npcName: "ІМ'Я NPC", remove: "ВИДАЛИТИ", startCombat: "ПОЧАТИ БІЙ", nextTurn: "НАСТУПНИЙ ХІД", endCombat: "ЗАВЕРШИТИ БІЙ",
  },
  pl: {
    title: "GM / SESJA", subtitle: "Wspólna sesja Fallout 2d20", back: "WSTECZ", host: "GAME MASTER",
    hostDesc: "Utwórz pokój. Panel GM otworzy się dopiero po uruchomieniu osobnej sesji.", create: "UTWÓRZ SESJĘ GM",
    player: "GRACZ", playerDesc: "Wpisz kod otrzymany od prowadzącego.", code: "KOD SESJI", name: "NAZWA GRACZA",
    join: "DOŁĄCZ", online: "Online", connecting: "Łączenie", waiting: "Oczekiwanie", disconnected: "Rozłączono",
    error: "Błąd połączenia", copy: "KOPIUJ KOD", copied: "SKOPIOWANO", end: "ZAKOŃCZ SESJĘ", leave: "OPUŚĆ SESJĘ",
    openSheet: "OTWÓRZ POSTAĆ", players: "POŁĄCZENI GRACZE", noPlayers: "Oczekiwanie na graczy...", workspace: "PANEL GM",
    combat: "WALKA", overview: "SESJA", gmBroadcast: "WIADOMOŚĆ GM", broadcastPlaceholder: "Scena, cel, ostrzeżenie lub lokacja dla graczy...",
    broadcast: "WYŚLIJ GRACZOM", currentMessage: "AKTUALNA WIADOMOŚĆ GM", noMessage: "GM nie wysłał jeszcze wiadomości.", sync: "SYNCHRONIZUJ",
    synced: "ZSYNCHRONIZOWANO", status: "STATUS", level: "POZ", hp: "HP", defense: "OBR", noCharacter: "Brak danych postaci",
    invalidCode: "Wpisz 6-znakowy kod sesji.", invalidName: "Wpisz nazwę gracza.", hostNotFound: "Sesja GM nie istnieje lub GM jest offline.",
    roomUnavailable: "Kod pokoju jest zajęty. Utwórz nową sesję.", networkError: "Błąd sieci",
    liveHint: "Narzędzia GM są dostępne tylko podczas aktywnej sesji hosta.",
    initiativeTrack: "INICJATYWA", round: "RUNDA", preview: "PODGLĄD", currentTurn: "AKTUALNA TURA", groupAp: "AP GRUPY",
    combatants: "UCZESTNICY WALKI", noActors: "Brak uczestników walki.", npc: "NPC", armor: "PANCERZ", initiative: "INIC",
    addNpc: "DODAJ NPC", npcName: "NAZWA NPC", remove: "USUŃ", startCombat: "ROZPOCZNIJ WALKĘ", nextTurn: "NASTĘPNA TURA", endCombat: "ZAKOŃCZ WALKĘ",
  },
};

function getLanguage(value) {
  const language = String(value || "en").toLowerCase().split("-")[0];
  return BASE[language] ? language : "en";
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function PlayerCard({ player, copy }) {
  const character = player?.character;
  return (
    <div className="session-gm-player-card">
      <div className="session-gm-player-card__head">
        <strong>{character?.name || player?.name || "Player"}</strong>
        <span>{character ? `${copy.level} ${character.level || 1}` : "LINK"}</span>
      </div>
      {character ? (
        <div className="session-gm-player-card__stats">
          <span>{copy.hp}: {character.currentHp ?? "-"}/{character.maxHp ?? "-"}</span>
          <span>{copy.defense}: {character.defense ?? "-"}</span>
          {character.origin ? <span>{character.origin}</span> : null}
        </div>
      ) : <div className="stat-sub">{copy.noCharacter}</div>}
    </div>
  );
}

export function SessionFloatingButton({ session, onOpen }) {
  const { i18n } = useTranslation();
  const copy = BASE[getLanguage(i18n.resolvedLanguage || i18n.language)];
  if (!session?.isActive) return null;
  return (
    <button type="button" className="floating-session-button" onClick={onOpen}>
      <span className={`session-status-dot is-${session.status}`} />
      <strong>{copy.overview}</strong>
      <span>{session.sessionCode}</span>
      {session.mode === "host" ? <span>{session.players?.length || 0}</span> : null}
    </button>
  );
}

export default function SessionScreen({ form, session, onBack, onOpenSheet }) {
  const { i18n } = useTranslation();
  const copy = BASE[getLanguage(i18n.resolvedLanguage || i18n.language)];
  const defaultPlayerName = useMemo(() => getCharacterName(form) || "Player", [form]);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [sceneDraft, setSceneDraft] = useState("");
  const [localError, setLocalError] = useState("");
  const [copyState, setCopyState] = useState(false);
  const [syncState, setSyncState] = useState(false);
  const [activeView, setActiveView] = useState("workspace");
  const [, forceCharacterRefresh] = useState(0);

  const mode = session?.mode || "lobby";
  const status = session?.status || "waiting";
  const players = session?.players || [];
  const sceneMessage = session?.sceneMessage || "";
  const sessionCode = session?.sessionCode || "";
  const sessionError = session?.error?.key ? (copy[session.error.key] || session.error.message || copy.networkError) : (session?.error?.message || "");
  const error = localError || sessionError;

  React.useEffect(() => {
    if (mode === "host") setActiveView("workspace");
    if (mode === "player") setActiveView("overview");
  }, [mode]);

  const setCharacter = (updater) => {
    if (!form || typeof form !== "object") return;
    const next = typeof updater === "function" ? updater(form) : updater;
    if (!next || typeof next !== "object") return;
    Object.assign(form, next);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ updatedAt: new Date().toISOString(), data: { ...form } })); } catch { /* best effort */ }
    forceCharacterRefresh((value) => value + 1);
  };

  const handleJoin = () => {
    const code = normalizeSessionCode(joinCode);
    const name = String(playerName || "").trim();
    if (code.length !== SESSION_CODE_LENGTH) { setLocalError(copy.invalidCode); return; }
    if (!name) { setLocalError(copy.invalidName); return; }
    setLocalError("");
    session?.joinSession?.({ code, name });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1200);
    } catch { setCopyState(false); }
  };

  const handleBroadcast = () => {
    if (session?.broadcastScene?.(sceneDraft)) setSceneDraft("");
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
            <div><div className="pip-bootline">PIP 2D20 NETWORK</div><h1 className="pip-title">{copy.title}</h1><p className="pip-subtitle">{copy.subtitle}</p></div>
            <button type="button" className="pip-btn" onClick={onBack}>{copy.back}</button>
          </div>
        </section>
        <div className="session-role-grid">
          <section className="pip-panel pip-block session-role-card session-role-card--gm">
            <div className="session-role-icon">GM</div><h2>[ {copy.host} ]</h2><p className="stat-sub">{copy.hostDesc}</p>
            <button type="button" className="pip-btn is-primary session-main-button" onClick={() => session?.startHost?.()}>{copy.create}</button>
          </section>
          <section className="pip-panel pip-block session-role-card">
            <div className="session-role-icon">P</div><h2>[ {copy.player} ]</h2><p className="stat-sub">{copy.playerDesc}</p>
            <label className="session-field"><span>{copy.code}</span><input className="pip-input session-code-input" value={joinCode} maxLength={SESSION_CODE_LENGTH} autoCapitalize="characters" autoComplete="off" placeholder="ABC234" onChange={(event) => setJoinCode(normalizeSessionCode(event.target.value))} /></label>
            <label className="session-field"><span>{copy.name}</span><input className="pip-input" value={playerName} maxLength={40} onChange={(event) => setPlayerName(event.target.value)} /></label>
            <button type="button" className="pip-btn is-primary session-main-button" onClick={handleJoin}>{copy.join}</button>
            {error ? <div className="session-error">{error}</div> : null}
          </section>
        </div>
      </section>
    );
  }

  if (mode === "host") {
    return (
      <section className="session-gm-host">
        <header className="pip-panel session-gm-hostbar">
          <div className="session-gm-hostbar__brand"><div className="pip-bootline">GAME MASTER // LIVE SESSION</div><strong>{copy.workspace}</strong></div>
          <div className="session-gm-hostbar__session"><span className={`session-status-dot is-${status}`} /><span>{copy.status}: <strong>{copy[status] || status}</strong></span><button type="button" className="session-gm-code" onClick={handleCopy} title={copyState ? copy.copied : copy.copy}>{sessionCode}</button><span>{copy.players}: <strong>{players.length}</strong></span></div>
          <div className="session-gm-hostbar__actions"><button type="button" className="pip-btn" onClick={onOpenSheet}>{copy.openSheet}</button><button type="button" className="pip-btn" onClick={() => session?.exitSession?.()}>{copy.end}</button></div>
        </header>

        {error ? <div className="session-error session-gm-host-error">{error}</div> : null}

        <nav className="session-gm-nav" aria-label="GM session views">
          <button type="button" className={`pip-btn${activeView === "workspace" ? " is-primary" : ""}`} onClick={() => setActiveView("workspace")}>{copy.workspace}</button>
          <button type="button" className={`pip-btn${activeView === "overview" ? " is-primary" : ""}`} onClick={() => setActiveView("overview")}>{copy.overview}</button>
          <button type="button" className={`pip-btn${activeView === "combat" ? " is-primary" : ""}`} onClick={() => setActiveView("combat")}>{copy.combat}</button>
        </nav>

        {activeView === "workspace" ? (
          <div className="session-gm-workspace-wrap">
            <div className="session-gm-roster-strip pip-panel">
              <div className="session-gm-roster-strip__head"><strong>[ {copy.players} ]</strong><span>{players.length}</span></div>
              <div className="session-gm-roster-strip__list">{players.length ? players.map((player) => <PlayerCard key={player.peerId} player={player} copy={copy} />) : <div className="stat-sub">{copy.noPlayers}</div>}</div>
            </div>
            <GmWorkspace character={form} setCharacter={setCharacter} onOpenMap={onOpenSheet} />
            <div className="stat-sub session-gm-live-hint">{copy.liveHint}</div>
          </div>
        ) : null}

        {activeView === "overview" ? (
          <div className="session-gm-network-grid">
            <section className="pip-panel pip-block"><div className="pip-head"><h2>[ {copy.players} ]</h2><span>{players.length}</span></div><div className="session-gm-player-grid">{players.length ? players.map((player) => <PlayerCard key={player.peerId} player={player} copy={copy} />) : <div className="pip-logbox">{copy.noPlayers}</div>}</div></section>
            <section className="pip-panel pip-block"><div className="pip-head"><h2>[ {copy.gmBroadcast} ]</h2></div><textarea className="pip-input session-scene-input" rows={6} maxLength={600} value={sceneDraft} placeholder={copy.broadcastPlaceholder} onChange={(event) => setSceneDraft(event.target.value)} /><button type="button" className="pip-btn is-primary session-main-button" onClick={handleBroadcast}>{copy.broadcast}</button><div className="pip-logbox session-current-message">{sceneMessage || copy.noMessage}</div></section>
          </div>
        ) : null}

        {activeView === "combat" ? <SessionCombatBoard session={session} players={players} mode="host" copy={copy} /> : null}
        <SessionChatDrawer session={session} />
      </section>
    );
  }

  return (
    <section className="session-screen pip-screen-grid session-player-live">
      <section className="pip-panel pip-block session-hero">
        <div className="session-topline"><div><div className="pip-bootline">PLAYER LINK // {sessionCode}</div><h1 className="pip-title">{copy.player}</h1></div><div className="session-top-actions"><button type="button" className="pip-btn" onClick={onOpenSheet}>{copy.openSheet}</button><button type="button" className="pip-btn" onClick={() => session?.exitSession?.()}>{copy.leave}</button></div></div>
        <div className="session-status-strip"><div><span className={`session-status-dot is-${status}`} /><span>{copy.status}: <strong>{copy[status] || status}</strong></span></div><div className="session-code-display">{sessionCode}</div></div>
        {error ? <div className="session-error">{error}</div> : null}
      </section>

      <nav className="session-view-nav" aria-label="Player session views">
        <button type="button" className={`pip-btn${activeView === "overview" ? " is-primary" : ""}`} onClick={() => setActiveView("overview")}>{copy.overview}</button>
        <button type="button" className={`pip-btn${activeView === "combat" ? " is-primary" : ""}`} onClick={() => setActiveView("combat")}>{copy.combat}</button>
      </nav>

      {activeView === "overview" ? (
        <div className="session-gm-network-grid">
          <section className="pip-panel pip-block"><div className="pip-head"><h2>[ {copy.currentMessage} ]</h2></div><div className="pip-logbox session-current-message session-current-message-large">{sceneMessage || copy.noMessage}</div><button type="button" className="pip-btn" disabled={status !== "online"} onClick={handleSync}>{syncState ? copy.synced : copy.sync}</button></section>
          <section className="pip-panel pip-block"><div className="pip-head"><h2>[ {copy.players} ]</h2><span>{players.length}</span></div><div className="session-gm-player-grid">{players.length ? players.map((player) => <PlayerCard key={player.peerId} player={player} copy={copy} />) : <div className="pip-logbox">{copy.noPlayers}</div>}</div></section>
        </div>
      ) : null}

      {activeView === "combat" ? <SessionCombatBoard session={session} players={players} mode="player" copy={copy} /> : null}
      <SessionChatDrawer session={session} />
    </section>
  );
}
