import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeSessionCode,
  SESSION_CODE_LENGTH,
} from "../../hooks/useSharedSession.js";
import SessionCombatBoard from "./SessionCombatBoard.jsx";
import SessionGmCombatPanel from "./SessionGmCombatPanel.jsx";
import "./session.css";

const COPY = {
  en: {
    title: "GM / SESSION", subtitle: "Shared tabletop session", back: "BACK", hostTitle: "GAME MASTER",
    hostDesc: "Create a room and keep the GM online while the group is connected.", create: "CREATE SESSION",
    joinTitle: "PLAYER", joinDesc: "Enter the session code from the GM.", code: "SESSION CODE", name: "PLAYER NAME",
    join: "JOIN SESSION", status: "STATUS", waiting: "Waiting", connecting: "Connecting", online: "Online",
    disconnected: "Disconnected", error: "Connection error", copy: "COPY CODE", copied: "COPIED", end: "END SESSION",
    leave: "LEAVE SESSION", roster: "CONNECTED PLAYERS", emptyRoster: "Waiting for players...", scene: "GM BROADCAST",
    scenePlaceholder: "Scene status, objective, warning, location...", broadcast: "BROADCAST", sharedScene: "CURRENT GM MESSAGE",
    noScene: "No GM message yet.", sync: "SYNC NOW", synced: "Synced", hp: "HP", level: "LVL", defense: "DEF",
    origin: "Origin", statuses: "STATUS", noCharacter: "No character data", beta: "P2P beta · the session lives while the GM is online",
    invalidCode: "Enter a 6-character session code.", invalidName: "Enter a player name.", roomUnavailable: "This code is already in use. Create another session.",
    hostNotFound: "GM session not found or is offline.", networkError: "Network error", openSheet: "OPEN CHARACTER",
    liveSync: "Character HP, Defense and statuses sync automatically while you use the sheet.", activity: "SESSION LOG",
    noActivity: "No session activity yet.", chat: "GROUP CHAT", chatPlaceholder: "Message the group...", send: "SEND",
    joined: "joined the session", left: "left the session", success: "SUCCESS", failure: "FAILURE", successes: "Suc",
    complications: "Comp", damage: "Damage", effects: "Effects", difficulty: "Diff", target: "TN", hit: "Hit",
    sessionActive: "SESSION", live: "LIVE", combat: "COMBAT", combatIdle: "Combat has not started.", round: "ROUND", currentTurn: "CURRENT TURN", groupAp: "GROUP AP", nextTurn: "NEXT TURN", startCombat: "START COMBAT", endCombat: "END COMBAT", initiative: "INIT", npc: "NPC", addNpc: "ADD NPC", npcName: "NPC name", remove: "REMOVE", player: "PLAYER", combatStarted: "combat started", combatEnded: "combat ended", turnChanged: "turn", overview: "OVERVIEW", gmPanel: "GM PANEL", combatBoard: "COMBAT BOARD", logScreen: "CHAT / LOG", initiativeTrack: "INITIATIVE", preview: "PREVIEW", combatants: "COMBATANTS", noActors: "No combatants yet.", armor: "ARMOR"
  },
  ru: {
    title: "ГМ / СЕССИЯ", subtitle: "Общая игровая сессия", back: "НАЗАД", hostTitle: "GAME MASTER",
    hostDesc: "Создайте комнату и оставайтесь онлайн, пока группа подключена.", create: "СОЗДАТЬ СЕССИЮ",
    joinTitle: "ИГРОК", joinDesc: "Введите код сессии, который дал ГМ.", code: "КОД СЕССИИ", name: "ИМЯ ИГРОКА",
    join: "ПОДКЛЮЧИТЬСЯ", status: "СТАТУС", waiting: "Ожидание", connecting: "Подключение", online: "Онлайн",
    disconnected: "Отключено", error: "Ошибка соединения", copy: "КОПИРОВАТЬ КОД", copied: "СКОПИРОВАНО", end: "ЗАВЕРШИТЬ СЕССИЮ",
    leave: "ВЫЙТИ ИЗ СЕССИИ", roster: "ПОДКЛЮЧЕННЫЕ ИГРОКИ", emptyRoster: "Ожидаю игроков...", scene: "СООБЩЕНИЕ ГМ",
    scenePlaceholder: "Состояние сцены, цель, предупреждение, локация...", broadcast: "ОТПРАВИТЬ ВСЕМ", sharedScene: "ТЕКУЩЕЕ СООБЩЕНИЕ ГМ",
    noScene: "ГМ пока ничего не отправил.", sync: "СИНХРОНИЗИРОВАТЬ", synced: "Синхронизировано", hp: "HP", level: "УР", defense: "ЗАЩ",
    origin: "Происхождение", statuses: "СТАТУС", noCharacter: "Нет данных персонажа", beta: "P2P beta · сессия существует, пока ГМ онлайн",
    invalidCode: "Введите 6-символьный код сессии.", invalidName: "Введите имя игрока.", roomUnavailable: "Этот код уже занят. Создайте другую сессию.",
    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.", networkError: "Ошибка сети", openSheet: "ОТКРЫТЬ ПЕРСОНАЖА",
    liveSync: "HP, Защита и статусы персонажа синхронизируются автоматически, пока вы пользуетесь листом.", activity: "ЖУРНАЛ СЕССИИ",
    noActivity: "В сессии пока нет событий.", chat: "ОБЩИЙ ЧАТ", chatPlaceholder: "Сообщение группе...", send: "ОТПРАВИТЬ",
    joined: "подключился к сессии", left: "вышел из сессии", success: "УСПЕХ", failure: "ПРОВАЛ", successes: "Усп",
    complications: "Осл", damage: "Урон", effects: "Эффекты", difficulty: "Сложн", target: "ЦЧ", hit: "Попадание",
    sessionActive: "СЕССИЯ", live: "LIVE", combat: "БОЙ", combatIdle: "Бой ещё не начат.", round: "РАУНД", currentTurn: "ТЕКУЩИЙ ХОД", groupAp: "ОБЩИЕ AP", nextTurn: "СЛЕДУЮЩИЙ ХОД", startCombat: "НАЧАТЬ БОЙ", endCombat: "ЗАВЕРШИТЬ БОЙ", initiative: "ИНИЦ", npc: "NPC", addNpc: "ДОБАВИТЬ NPC", npcName: "Имя NPC", remove: "УДАЛИТЬ", player: "ИГРОК", combatStarted: "бой начался", combatEnded: "бой завершён", turnChanged: "ход", overview: "ОБЗОР", gmPanel: "ПАНЕЛЬ ГМ", combatBoard: "БОЕВОЙ ЭКРАН", logScreen: "ЧАТ / ЖУРНАЛ", initiativeTrack: "ИНИЦИАТИВА", preview: "ПРЕДПРОСМОТР", combatants: "УЧАСТНИКИ", noActors: "Пока нет участников.", armor: "БРОНЯ"
  },
  uk: {
    title: "ГМ / СЕСІЯ", subtitle: "Спільна ігрова сесія", back: "НАЗАД", hostTitle: "GAME MASTER",
    hostDesc: "Створіть кімнату й залишайтеся онлайн, поки група підключена.", create: "СТВОРИТИ СЕСІЮ",
    joinTitle: "ГРАВЕЦЬ", joinDesc: "Введіть код сесії, який дав ГМ.", code: "КОД СЕСІЇ", name: "ІМ'Я ГРАВЦЯ",
    join: "ПІДКЛЮЧИТИСЯ", status: "СТАТУС", waiting: "Очікування", connecting: "Підключення", online: "Онлайн",
    disconnected: "Відключено", error: "Помилка з'єднання", copy: "КОПІЮВАТИ КОД", copied: "СКОПІЙОВАНО", end: "ЗАВЕРШИТИ СЕСІЮ",
    leave: "ВИЙТИ ІЗ СЕСІЇ", roster: "ПІДКЛЮЧЕНІ ГРАВЦІ", emptyRoster: "Очікую гравців...", scene: "ПОВІДОМЛЕННЯ ГМ",
    scenePlaceholder: "Стан сцени, мета, попередження, локація...", broadcast: "НАДІСЛАТИ ВСІМ", sharedScene: "ПОТОЧНЕ ПОВІДОМЛЕННЯ ГМ",
    noScene: "ГМ ще нічого не надіслав.", sync: "СИНХРОНІЗУВАТИ", synced: "Синхронізовано", hp: "HP", level: "РІВ", defense: "ЗАХ",
    origin: "Походження", statuses: "СТАТУС", noCharacter: "Немає даних персонажа", beta: "P2P beta · сесія існує, поки ГМ онлайн",
    invalidCode: "Введіть 6-символьний код сесії.", invalidName: "Введіть ім'я гравця.", roomUnavailable: "Цей код уже зайнятий. Створіть іншу сесію.",
    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.", networkError: "Помилка мережі", openSheet: "ВІДКРИТИ ПЕРСОНАЖА",
    liveSync: "HP, Захист і статуси персонажа синхронізуються автоматично, поки ви користуєтесь листом.", activity: "ЖУРНАЛ СЕСІЇ",
    noActivity: "У сесії ще немає подій.", chat: "СПІЛЬНИЙ ЧАТ", chatPlaceholder: "Повідомлення групі...", send: "НАДІСЛАТИ",
    joined: "приєднався до сесії", left: "вийшов із сесії", success: "УСПІХ", failure: "НЕВДАЧА", successes: "Усп",
    complications: "Ускл", damage: "Шкода", effects: "Ефекти", difficulty: "Складн", target: "ЦЧ", hit: "Влучання",
    sessionActive: "СЕСІЯ", live: "LIVE", combat: "БІЙ", combatIdle: "Бій ще не розпочато.", round: "РАУНД", currentTurn: "ПОТОЧНИЙ ХІД", groupAp: "СПІЛЬНІ AP", nextTurn: "НАСТУПНИЙ ХІД", startCombat: "ПОЧАТИ БІЙ", endCombat: "ЗАВЕРШИТИ БІЙ", initiative: "ІНІЦ", npc: "NPC", addNpc: "ДОДАТИ NPC", npcName: "Імʼя NPC", remove: "ВИДАЛИТИ", player: "ГРАВЕЦЬ", combatStarted: "бій розпочато", combatEnded: "бій завершено", turnChanged: "хід", overview: "ОГЛЯД", gmPanel: "ПАНЕЛЬ ГМ", combatBoard: "БОЙОВИЙ ЕКРАН", logScreen: "ЧАТ / ЖУРНАЛ", initiativeTrack: "ІНІЦІАТИВА", preview: "ПЕРЕГЛЯД", combatants: "УЧАСНИКИ", noActors: "Поки немає учасників.", armor: "БРОНЯ"
  },
  pl: {
    title: "GM / SESJA", subtitle: "Wspólna sesja gry", back: "WSTECZ", hostTitle: "GAME MASTER",
    hostDesc: "Utwórz pokój i pozostań online, gdy grupa jest połączona.", create: "UTWÓRZ SESJĘ",
    joinTitle: "GRACZ", joinDesc: "Wpisz kod sesji otrzymany od GM.", code: "KOD SESJI", name: "NAZWA GRACZA",
    join: "DOŁĄCZ", status: "STATUS", waiting: "Oczekiwanie", connecting: "Łączenie", online: "Online",
    disconnected: "Rozłączono", error: "Błąd połączenia", copy: "KOPIUJ KOD", copied: "SKOPIOWANO", end: "ZAKOŃCZ SESJĘ",
    leave: "OPUŚĆ SESJĘ", roster: "POŁĄCZENI GRACZE", emptyRoster: "Oczekiwanie na graczy...", scene: "KOMUNIKAT GM",
    scenePlaceholder: "Stan sceny, cel, ostrzeżenie, lokacja...", broadcast: "WYŚLIJ WSZYSTKIM", sharedScene: "AKTUALNY KOMUNIKAT GM",
    noScene: "GM nie wysłał jeszcze komunikatu.", sync: "SYNCHRONIZUJ", synced: "Zsynchronizowano", hp: "HP", level: "POZ", defense: "OBR",
    origin: "Pochodzenie", statuses: "STATUS", noCharacter: "Brak danych postaci", beta: "P2P beta · sesja istnieje, dopóki GM jest online",
    invalidCode: "Wpisz 6-znakowy kod sesji.", invalidName: "Wpisz nazwę gracza.", roomUnavailable: "Ten kod jest już używany. Utwórz inną sesję.",
    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.", networkError: "Błąd sieci", openSheet: "OTWÓRZ POSTAĆ",
    liveSync: "HP, Obrona i statusy postaci synchronizują się automatycznie podczas używania karty.", activity: "DZIENNIK SESJI",
    noActivity: "Brak aktywności w sesji.", chat: "CZAT GRUPOWY", chatPlaceholder: "Wiadomość do grupy...", send: "WYŚLIJ",
    joined: "dołączył do sesji", left: "opuścił sesję", success: "SUKCES", failure: "PORAŻKA", successes: "Suk",
    complications: "Kompl", damage: "Obrażenia", effects: "Efekty", difficulty: "Trudn", target: "TN", hit: "Trafienie",
    sessionActive: "SESJA", live: "LIVE", combat: "WALKA", combatIdle: "Walka jeszcze się nie rozpoczęła.", round: "RUNDA", currentTurn: "AKTUALNA TURA", groupAp: "WSPÓLNE AP", nextTurn: "NASTĘPNA TURA", startCombat: "ROZPOCZNIJ WALKĘ", endCombat: "ZAKOŃCZ WALKĘ", initiative: "INIC", npc: "NPC", addNpc: "DODAJ NPC", npcName: "Nazwa NPC", remove: "USUŃ", player: "GRACZ", combatStarted: "walka rozpoczęta", combatEnded: "walka zakończona", turnChanged: "tura", overview: "PRZEGLĄD", gmPanel: "PANEL GM", combatBoard: "EKRAN WALKI", logScreen: "CZAT / DZIENNIK", initiativeTrack: "INICJATYWA", preview: "PODGLĄD", combatants: "UCZESTNICY", noActors: "Brak uczestników.", armor: "PANCERZ"
  },
};

function getLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function PlayerCard({ player, copy }) {
  const character = player?.character;
  const statuses = Array.isArray(character?.statuses) ? character.statuses : [];
  return (
    <div className="session-player-card">
      <div className="session-player-head">
        <strong>{player?.name || "Player"}</strong>
        <span className="session-online-dot" title={copy.online} />
      </div>
      {character ? (
        <>
          <div className="session-character-name">{character.name}</div>
          <div className="session-player-stats">
            <span>{copy.level}: {character.level}</span>
            <span>{copy.hp}: {character.currentHp}/{character.maxHp}</span>
            <span>{copy.defense}: {character.defense}</span>
            <span>{copy.initiative}: {character.initiative ?? 0}</span>
          </div>
          {character.origin && <div className="stat-sub">{copy.origin}: {character.origin}</div>}
          {statuses.length > 0 && (
            <div className="session-status-tags">
              {statuses.slice(0, 5).map((status) => <span key={status}>{status}</span>)}
              {statuses.length > 5 && <span>+{statuses.length - 5}</span>}
            </div>
          )}
        </>
      ) : <div className="stat-sub">{copy.noCharacter}</div>}
    </div>
  );
}

function RollEntry({ item, copy }) {
  const roll = item?.roll || {};
  const values = Array.isArray(roll.diceValues) ? roll.diceValues : [];
  if (roll.diceType === "d6") {
    return (
      <div className="session-roll-card">
        <div className="session-roll-title">{roll.reroll ? "↻ " : ""}{roll.label || "D6"}</div>
        <div className="session-roll-dice">{values.map((value, index) => <span key={`${index}-${value}`}>{String(value)}</span>)}</div>
        <div className="session-roll-stats">
          <strong>{copy.damage}: {roll.totalDamage ?? 0}</strong>
          <span>{copy.effects}: {roll.totalEffects ?? 0}</span>
          {roll.effects?.length > 0 && <span>{roll.effects.join(" · ")}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="session-roll-card">
      <div className="session-roll-title">{roll.reroll ? "↻ " : ""}{roll.label || "D20"}</div>
      <div className="session-roll-dice">{values.map((value, index) => <span key={`${index}-${value}`}>{value}</span>)}</div>
      <div className="session-roll-stats">
        {roll.outcome && <strong>{roll.outcome === "success" ? copy.success : copy.failure}</strong>}
        {roll.successes !== null && <span>{copy.successes}: {roll.successes}</span>}
        <span>{copy.complications}: {roll.complications || 0}</span>
        {roll.targetNumber !== null && <span>{copy.target}: {roll.targetNumber}</span>}
        {roll.difficulty !== null && <span>{copy.difficulty}: {roll.difficulty}</span>}
        {roll.hitLocation?.label && <span>{copy.hit}: {roll.hitLocation.label} ({roll.hitLocation.value})</span>}
      </div>
    </div>
  );
}

function FeedItem({ item, copy }) {
  return (
    <div className={`session-feed-item is-${item.type}`}>
      <div className="session-feed-meta">
        <span>{formatTime(item.timestamp)}</span>
        {item.sender && <strong>{item.sender}</strong>}
      </div>
      {item.type === "system" && <div>{item.event === "join" ? copy.joined : copy.left}</div>}
      {item.type === "combat" && (
        <div className="session-feed-text session-feed-combat">
          {item.event === "combat_start" && `${copy.combatStarted}${item.text ? ` · ${copy.currentTurn}: ${item.text}` : ""}`}
          {item.event === "combat_end" && copy.combatEnded}
          {item.event === "combat_turn" && `${copy.turnChanged}: ${item.text}`}
        </div>
      )}
      {item.type === "chat" && <div className="session-feed-text">{item.text}</div>}
      {item.type === "scene" && <div className="session-feed-text session-feed-scene">{item.text}</div>}
      {item.type === "roll" && <RollEntry item={item} copy={copy} />}
    </div>
  );
}

export function SessionFloatingButton({ session, onOpen }) {
  const { i18n } = useTranslation();
  const copy = COPY[getLanguage(i18n.resolvedLanguage || i18n.language)];
  if (!session?.isActive) return null;
  return (
    <button type="button" className="floating-session-button" onClick={onOpen}>
      <span className={`session-status-dot is-${session.status}`} />
      <strong>{copy.sessionActive}</strong>
      <span>{session.sessionCode}</span>
      {session.mode === "host" && <span>{session.players.length}</span>}
    </button>
  );
}

export default function SessionScreen({ form, session, onBack, onOpenSheet }) {
  const { i18n } = useTranslation();
  const copy = COPY[getLanguage(i18n.resolvedLanguage || i18n.language)];
  const defaultPlayerName = useMemo(() => getCharacterName(form) || "Player", [form]);
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [sceneDraft, setSceneDraft] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [copyState, setCopyState] = useState(false);
  const [syncState, setSyncState] = useState(false);
  const [localError, setLocalError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [npcName, setNpcName] = useState("");
  const [npcInitiative, setNpcInitiative] = useState("10");

  const mode = session?.mode || "lobby";
  React.useEffect(() => {
    if (mode !== "host" && activeView === "gm") setActiveView("overview");
  }, [mode, activeView]);
  const status = session?.status || "waiting";
  const players = session?.players || [];
  const sceneMessage = session?.sceneMessage || "";
  const feed = session?.feed || [];
  const combat = session?.combat || { active: false, round: 0, index: -1, order: [], npcs: [], ap: 0, apMax: 6 };
  const activeActor = combat.order?.find((actor) => actor.id === combat.activeActorId) || null;
  const sessionCode = session?.sessionCode || "";
  const statusLabel = copy[status] || status;
  const sessionError = session?.error?.key
    ? (copy[session.error.key] || session.error.message || copy.networkError)
    : (session?.error?.message || "");
  const error = localError || sessionError;

  const handleJoin = () => {
    const normalized = normalizeSessionCode(joinCode);
    const cleanName = String(playerName || "").trim();
    if (normalized.length !== SESSION_CODE_LENGTH) {
      setLocalError(copy.invalidCode);
      return;
    }
    if (!cleanName) {
      setLocalError(copy.invalidName);
      return;
    }
    setLocalError("");
    session.joinSession({ code: normalized, name: cleanName });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionCode);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1200);
    } catch {
      setCopyState(false);
    }
  };

  const handleBroadcast = () => {
    if (session.broadcastScene(sceneDraft)) setSceneDraft("");
  };

  const handleChatSubmit = (event) => {
    event.preventDefault();
    if (session.sendChat(chatDraft)) setChatDraft("");
  };

  const handleSync = () => {
    if (!session.syncCharacter()) return;
    setSyncState(true);
    window.setTimeout(() => setSyncState(false), 1000);
  };

  const handleAddNpc = (event) => {
    event.preventDefault();
    if (!String(npcName).trim()) return;
    if (session.addCombatNpc({ name: npcName, initiative: Number(npcInitiative || 0) })) {
      setNpcName("");
      setNpcInitiative("10");
    }
  };

  if (mode === "lobby") {
    return (
      <section className="session-screen pip-screen-grid">
        <section className="pip-panel pip-block session-hero">
          <div className="session-topline">
            <div><div className="pip-bootline">PIP 2D20 NETWORK</div><h1 className="pip-title">{copy.title}</h1><p className="pip-subtitle">{copy.subtitle}</p></div>
            <button type="button" className="pip-btn" onClick={onBack}>{copy.back}</button>
          </div>
        </section>
        <div className="session-role-grid">
          <section className="pip-panel pip-block session-role-card">
            <div className="session-role-icon">GM</div><h2>[ {copy.hostTitle} ]</h2><p className="stat-sub">{copy.hostDesc}</p>
            <button type="button" className="pip-btn is-primary session-main-button" onClick={() => session.startHost()}>{copy.create}</button>
          </section>
          <section className="pip-panel pip-block session-role-card">
            <div className="session-role-icon">P</div><h2>[ {copy.joinTitle} ]</h2><p className="stat-sub">{copy.joinDesc}</p>
            <label className="session-field"><span>{copy.code}</span><input className="pip-input session-code-input" value={joinCode} maxLength={SESSION_CODE_LENGTH} autoCapitalize="characters" autoComplete="off" onChange={(event) => setJoinCode(normalizeSessionCode(event.target.value))} placeholder="ABC234" /></label>
            <label className="session-field"><span>{copy.name}</span><input className="pip-input" value={playerName} maxLength={40} onChange={(event) => setPlayerName(event.target.value)} /></label>
            <button type="button" className="pip-btn is-primary session-main-button" onClick={handleJoin}>{copy.join}</button>
            {error && <div className="session-error">{error}</div>}
          </section>
        </div>
        <div className="stat-sub session-beta-note">{copy.beta}</div>
      </section>
    );
  }

  return (
    <section className="session-screen pip-screen-grid">
      <section className="pip-panel pip-block session-hero">
        <div className="session-topline">
          <div><div className="pip-bootline">{mode === "host" ? "GAME MASTER ONLINE" : "PLAYER LINK"}</div><h1 className="pip-title">{mode === "host" ? copy.hostTitle : copy.joinTitle}</h1></div>
          <div className="session-top-actions">
            <button type="button" className="pip-btn" onClick={onOpenSheet}>{copy.openSheet}</button>
            <button type="button" className="pip-btn" onClick={() => session.exitSession()}>{mode === "host" ? copy.end : copy.leave}</button>
          </div>
        </div>
        <div className="session-status-strip">
          <div><span className={`session-status-dot is-${status}`} /><span>{copy.status}: <strong>{statusLabel}</strong></span></div>
          <div className="session-code-display">{sessionCode}</div>
          {mode === "host" && <button type="button" className="pip-btn" onClick={copyCode}>{copyState ? copy.copied : copy.copy}</button>}
        </div>
        {error && <div className="session-error">{error}</div>}
      </section>

      <nav className="session-view-nav" aria-label="Session screens">
        <button type="button" className={`pip-btn${activeView === "overview" ? " is-primary" : ""}`} onClick={() => setActiveView("overview")}>{copy.overview}</button>
        {mode === "host" && <button type="button" className={`pip-btn${activeView === "gm" ? " is-primary" : ""}`} onClick={() => setActiveView("gm")}>{copy.gmPanel}</button>}
        <button type="button" className={`pip-btn${activeView === "combat" ? " is-primary" : ""}`} onClick={() => setActiveView("combat")}>{copy.combatBoard}</button>
        <button type="button" className={`pip-btn${activeView === "log" ? " is-primary" : ""}`} onClick={() => setActiveView("log")}>{copy.logScreen}</button>
      </nav>

      {activeView === "overview" && (
      <div className="session-dashboard-grid">
        <section className="pip-panel pip-block">
          <div className="pip-head"><h2>[ {copy.roster} ]</h2><span>{players.length}</span></div>
          <div className="session-roster">{players.length ? players.map((player) => <PlayerCard key={player.peerId} player={player} copy={copy} />) : <div className="pip-logbox">{copy.emptyRoster}</div>}</div>
        </section>

        {mode === "host" ? (
          <section className="pip-panel pip-block">
            <div className="pip-head"><h2>[ {copy.scene} ]</h2></div>
            <textarea className="pip-input session-scene-input" rows={6} maxLength={600} value={sceneDraft} placeholder={copy.scenePlaceholder} onChange={(event) => setSceneDraft(event.target.value)} />
            <button type="button" className="pip-btn is-primary session-main-button" onClick={handleBroadcast}>{copy.broadcast}</button>
            <div className="pip-logbox session-current-message">{sceneMessage || copy.noScene}</div>
          </section>
        ) : (
          <section className="pip-panel pip-block">
            <div className="pip-head"><h2>[ {copy.sharedScene} ]</h2></div>
            <div className="pip-logbox session-current-message session-current-message-large">{sceneMessage || copy.noScene}</div>
            <div className="stat-sub session-live-sync-note">{copy.liveSync}</div>
            <button type="button" className="pip-btn" disabled={status !== "online"} onClick={handleSync}>{syncState ? copy.synced : copy.sync}</button>
          </section>
        )}
      </div>


      )}

      {activeView === "gm" && mode === "host" && (
        <SessionGmCombatPanel session={session} players={players} />
      )}

      {activeView === "combat" && (
        <SessionCombatBoard session={session} players={players} mode={mode} copy={copy} />
      )}

      {activeView === "log" && (
      <section className="pip-panel pip-block session-feed-panel">
        <div className="pip-head"><h2>[ {copy.activity} ]</h2><span>{feed.length}</span></div>
        <div className="session-feed">{feed.length ? feed.slice().reverse().map((item) => <FeedItem key={item.id} item={item} copy={copy} />) : <div className="pip-logbox">{copy.noActivity}</div>}</div>
        <form className="session-chat-form" onSubmit={handleChatSubmit}>
          <label className="session-field session-chat-field"><span>{copy.chat}</span><input className="pip-input" maxLength={500} value={chatDraft} placeholder={copy.chatPlaceholder} onChange={(event) => setChatDraft(event.target.value)} /></label>
          <button type="submit" className="pip-btn is-primary" disabled={status !== "online" || !String(chatDraft).trim()}>{copy.send}</button>
        </form>
      </section>
      )}

      <div className="stat-sub session-beta-note">{copy.beta}</div>
    </section>
  );
}
