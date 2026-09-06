from pathlib import Path

root = Path('.')

session_dir = root / 'src/components/session'
session_dir.mkdir(parents=True, exist_ok=True)

session_screen = r'''import React, { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { useTranslation } from "react-i18next";
import { getDerivedStats } from "../../utils/characterMath.js";
import "./session.css";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;
const HOST_PREFIX = "pip2d20-session-";

const COPY = {
  en: {
    title: "GM / SESSION",
    subtitle: "Shared tabletop session",
    back: "BACK",
    hostTitle: "GAME MASTER",
    hostDesc: "Create a room and keep this screen open while players are connected.",
    create: "CREATE SESSION",
    joinTitle: "PLAYER",
    joinDesc: "Enter the session code from the GM.",
    code: "SESSION CODE",
    name: "PLAYER NAME",
    join: "JOIN SESSION",
    status: "STATUS",
    waiting: "Waiting",
    connecting: "Connecting",
    online: "Online",
    disconnected: "Disconnected",
    error: "Connection error",
    copy: "COPY CODE",
    copied: "COPIED",
    end: "END SESSION",
    leave: "LEAVE SESSION",
    roster: "CONNECTED PLAYERS",
    emptyRoster: "Waiting for players...",
    scene: "GM BROADCAST",
    scenePlaceholder: "Scene status, objective, warning, location...",
    broadcast: "BROADCAST",
    sharedScene: "CURRENT GM MESSAGE",
    noScene: "No GM message yet.",
    sync: "SYNC CHARACTER",
    synced: "Character synced",
    hp: "HP",
    level: "LVL",
    defense: "DEF",
    origin: "Origin",
    noCharacter: "No character data",
    beta: "P2P beta · session exists while the GM remains online",
    invalidCode: "Enter a 6-character session code.",
    invalidName: "Enter a player name.",
    roomUnavailable: "This session code is already in use. Create another session.",
    hostNotFound: "GM session not found or is offline.",
  },
  ru: {
    title: "ГМ / СЕССИЯ",
    subtitle: "Общая игровая сессия",
    back: "НАЗАД",
    hostTitle: "GAME MASTER",
    hostDesc: "Создайте комнату и держите этот экран открытым, пока игроки подключены.",
    create: "СОЗДАТЬ СЕССИЮ",
    joinTitle: "ИГРОК",
    joinDesc: "Введите код сессии, который дал ГМ.",
    code: "КОД СЕССИИ",
    name: "ИМЯ ИГРОКА",
    join: "ПОДКЛЮЧИТЬСЯ",
    status: "СТАТУС",
    waiting: "Ожидание",
    connecting: "Подключение",
    online: "Онлайн",
    disconnected: "Отключено",
    error: "Ошибка соединения",
    copy: "КОПИРОВАТЬ КОД",
    copied: "СКОПИРОВАНО",
    end: "ЗАВЕРШИТЬ СЕССИЮ",
    leave: "ВЫЙТИ ИЗ СЕССИИ",
    roster: "ПОДКЛЮЧЕННЫЕ ИГРОКИ",
    emptyRoster: "Ожидаю игроков...",
    scene: "СООБЩЕНИЕ ГМ",
    scenePlaceholder: "Состояние сцены, цель, предупреждение, локация...",
    broadcast: "ОТПРАВИТЬ ВСЕМ",
    sharedScene: "ТЕКУЩЕЕ СООБЩЕНИЕ ГМ",
    noScene: "ГМ пока ничего не отправил.",
    sync: "СИНХРОНИЗИРОВАТЬ ПЕРСОНАЖА",
    synced: "Персонаж синхронизирован",
    hp: "HP",
    level: "УР",
    defense: "ЗАЩ",
    origin: "Происхождение",
    noCharacter: "Нет данных персонажа",
    beta: "P2P beta · сессия существует, пока ГМ остаётся онлайн",
    invalidCode: "Введите 6-символьный код сессии.",
    invalidName: "Введите имя игрока.",
    roomUnavailable: "Этот код уже занят. Создайте другую сессию.",
    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.",
  },
  uk: {
    title: "ГМ / СЕСІЯ",
    subtitle: "Спільна ігрова сесія",
    back: "НАЗАД",
    hostTitle: "GAME MASTER",
    hostDesc: "Створіть кімнату й тримайте цей екран відкритим, поки гравці підключені.",
    create: "СТВОРИТИ СЕСІЮ",
    joinTitle: "ГРАВЕЦЬ",
    joinDesc: "Введіть код сесії, який дав ГМ.",
    code: "КОД СЕСІЇ",
    name: "ІМ'Я ГРАВЦЯ",
    join: "ПІДКЛЮЧИТИСЯ",
    status: "СТАТУС",
    waiting: "Очікування",
    connecting: "Підключення",
    online: "Онлайн",
    disconnected: "Відключено",
    error: "Помилка з'єднання",
    copy: "КОПІЮВАТИ КОД",
    copied: "СКОПІЙОВАНО",
    end: "ЗАВЕРШИТИ СЕСІЮ",
    leave: "ВИЙТИ ІЗ СЕСІЇ",
    roster: "ПІДКЛЮЧЕНІ ГРАВЦІ",
    emptyRoster: "Очікую гравців...",
    scene: "ПОВІДОМЛЕННЯ ГМ",
    scenePlaceholder: "Стан сцени, мета, попередження, локація...",
    broadcast: "НАДІСЛАТИ ВСІМ",
    sharedScene: "ПОТОЧНЕ ПОВІДОМЛЕННЯ ГМ",
    noScene: "ГМ ще нічого не надіслав.",
    sync: "СИНХРОНІЗУВАТИ ПЕРСОНАЖА",
    synced: "Персонажа синхронізовано",
    hp: "HP",
    level: "РІВ",
    defense: "ЗАХ",
    origin: "Походження",
    noCharacter: "Немає даних персонажа",
    beta: "P2P beta · сесія існує, поки ГМ залишається онлайн",
    invalidCode: "Введіть 6-символьний код сесії.",
    invalidName: "Введіть ім'я гравця.",
    roomUnavailable: "Цей код уже використовується. Створіть іншу сесію.",
    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.",
  },
  pl: {
    title: "GM / SESJA",
    subtitle: "Wspólna sesja gry",
    back: "WSTECZ",
    hostTitle: "GAME MASTER",
    hostDesc: "Utwórz pokój i pozostaw ten ekran otwarty, gdy gracze są połączeni.",
    create: "UTWÓRZ SESJĘ",
    joinTitle: "GRACZ",
    joinDesc: "Wpisz kod sesji otrzymany od GM.",
    code: "KOD SESJI",
    name: "NAZWA GRACZA",
    join: "DOŁĄCZ",
    status: "STATUS",
    waiting: "Oczekiwanie",
    connecting: "Łączenie",
    online: "Online",
    disconnected: "Rozłączono",
    error: "Błąd połączenia",
    copy: "KOPIUJ KOD",
    copied: "SKOPIOWANO",
    end: "ZAKOŃCZ SESJĘ",
    leave: "OPUŚĆ SESJĘ",
    roster: "POŁĄCZENI GRACZE",
    emptyRoster: "Oczekiwanie na graczy...",
    scene: "KOMUNIKAT GM",
    scenePlaceholder: "Stan sceny, cel, ostrzeżenie, lokacja...",
    broadcast: "WYŚLIJ WSZYSTKIM",
    sharedScene: "AKTUALNY KOMUNIKAT GM",
    noScene: "GM nie wysłał jeszcze komunikatu.",
    sync: "SYNCHRONIZUJ POSTAĆ",
    synced: "Postać zsynchronizowana",
    hp: "HP",
    level: "POZ",
    defense: "OBR",
    origin: "Pochodzenie",
    noCharacter: "Brak danych postaci",
    beta: "P2P beta · sesja istnieje, dopóki GM pozostaje online",
    invalidCode: "Wpisz 6-znakowy kod sesji.",
    invalidName: "Wpisz nazwę gracza.",
    roomUnavailable: "Ten kod jest już używany. Utwórz inną sesję.",
    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.",
  },
};

function getLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

function makeSessionCode() {
  const values = new Uint32Array(CODE_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) values[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

function getHostPeerId(code) {
  return `${HOST_PREFIX}${String(code || "").toLowerCase()}`;
}

function getCharacterName(form) {
  return String(form?.characterName || form?.name || form?.playerName || "").trim();
}

function createCharacterSnapshot(form) {
  if (!form) return null;
  const derived = getDerivedStats(form);
  const characterName = getCharacterName(form);
  const hasCharacter = Boolean(characterName || form?.origin || form?.level);
  if (!hasCharacter) return null;

  return {
    name: characterName || "Unnamed",
    origin: String(form?.origin || ""),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    updatedAt: new Date().toISOString(),
  };
}

function makePlayerPacket(name, form) {
  return {
    name: String(name || "Player").trim().slice(0, 40) || "Player",
    character: createCharacterSnapshot(form),
  };
}

function safeClose(connection) {
  try {
    connection?.close?.();
  } catch {
    // ignore cleanup errors
  }
}

function PlayerCard({ player, copy }) {
  const character = player?.character;
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
          </div>
          {character.origin && <div className="stat-sub">{copy.origin}: {character.origin}</div>}
        </>
      ) : (
        <div className="stat-sub">{copy.noCharacter}</div>
      )}
    </div>
  );
}

export default function SessionScreen({ form, onBack }) {
  const { i18n } = useTranslation();
  const copy = COPY[getLanguage(i18n.resolvedLanguage || i18n.language)];
  const defaultPlayerName = useMemo(() => getCharacterName(form) || "Player", [form]);

  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [players, setPlayers] = useState([]);
  const [sceneMessage, setSceneMessage] = useState("");
  const [sceneDraft, setSceneDraft] = useState("");
  const [copyState, setCopyState] = useState(false);
  const [syncState, setSyncState] = useState(false);

  const peerRef = useRef(null);
  const hostConnectionRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const playersRef = useRef([]);
  const sceneRef = useRef("");
  const codeRef = useRef("");

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    sceneRef.current = sceneMessage;
  }, [sceneMessage]);

  const destroyNetwork = () => {
    connectionsRef.current.forEach((connection) => safeClose(connection));
    connectionsRef.current.clear();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    try {
      peerRef.current?.destroy?.();
    } catch {
      // ignore cleanup errors
    }
    peerRef.current = null;
  };

  useEffect(() => () => destroyNetwork(), []);

  const broadcastState = () => {
    const payload = {
      type: "session_state",
      sessionCode: codeRef.current,
      players: playersRef.current,
      sceneMessage: sceneRef.current,
      sentAt: new Date().toISOString(),
    };

    connectionsRef.current.forEach((connection) => {
      if (connection?.open) connection.send(payload);
    });
  };

  const upsertPlayer = (peerId, packet) => {
    setPlayers((previous) => {
      const nextPlayer = {
        peerId,
        name: packet?.name || "Player",
        character: packet?.character || null,
        updatedAt: new Date().toISOString(),
      };
      const exists = previous.some((item) => item.peerId === peerId);
      const next = exists
        ? previous.map((item) => (item.peerId === peerId ? { ...item, ...nextPlayer } : item))
        : [...previous, nextPlayer];
      playersRef.current = next;
      window.setTimeout(broadcastState, 0);
      return next;
    });
  };

  const removePlayer = (peerId) => {
    setPlayers((previous) => {
      const next = previous.filter((item) => item.peerId !== peerId);
      playersRef.current = next;
      window.setTimeout(broadcastState, 0);
      return next;
    });
  };

  const bindHostConnection = (connection) => {
    connectionsRef.current.set(connection.peer, connection);

    connection.on("open", () => {
      connection.send({
        type: "session_state",
        sessionCode: codeRef.current,
        players: playersRef.current,
        sceneMessage: sceneRef.current,
      });
    });

    connection.on("data", (data) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "join" || data.type === "player_update") {
        upsertPlayer(connection.peer, data.player);
      }
    });

    connection.on("close", () => {
      connectionsRef.current.delete(connection.peer);
      removePlayer(connection.peer);
    });

    connection.on("error", () => {
      connectionsRef.current.delete(connection.peer);
      removePlayer(connection.peer);
    });
  };

  const startHost = () => {
    destroyNetwork();
    setError("");
    setPlayers([]);
    setSceneMessage("");
    setSceneDraft("");
    playersRef.current = [];
    sceneRef.current = "";

    const code = makeSessionCode();
    codeRef.current = code;
    setSessionCode(code);
    setMode("host");
    setStatus("connecting");

    const peer = new Peer(getHostPeerId(code), { debug: 1 });
    peerRef.current = peer;

    peer.on("open", () => {
      setStatus("online");
    });

    peer.on("connection", bindHostConnection);

    peer.on("disconnected", () => setStatus("disconnected"));
    peer.on("close", () => setStatus("disconnected"));
    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "unavailable-id") setError(copy.roomUnavailable);
      else setError(peerError?.message || copy.error);
    });
  };

  const joinSession = () => {
    const normalized = normalizeCode(joinCode);
    const cleanName = String(playerName || "").trim();
    if (normalized.length !== CODE_LENGTH) {
      setError(copy.invalidCode);
      return;
    }
    if (!cleanName) {
      setError(copy.invalidName);
      return;
    }

    destroyNetwork();
    setError("");
    setPlayers([]);
    setSceneMessage("");
    setSessionCode(normalized);
    codeRef.current = normalized;
    setMode("player");
    setStatus("connecting");

    const peer = new Peer(undefined, { debug: 1 });
    peerRef.current = peer;

    peer.on("open", () => {
      const connection = peer.connect(getHostPeerId(normalized), { reliable: true });
      hostConnectionRef.current = connection;

      connection.on("open", () => {
        setStatus("online");
        connection.send({ type: "join", player: makePlayerPacket(cleanName, form) });
      });

      connection.on("data", (data) => {
        if (!data || typeof data !== "object") return;
        if (data.type === "session_state") {
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setSceneMessage(String(data.sceneMessage || ""));
        }
      });

      connection.on("close", () => setStatus("disconnected"));
      connection.on("error", () => {
        setStatus("error");
        setError(copy.hostNotFound);
      });
    });

    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "peer-unavailable") setError(copy.hostNotFound);
      else setError(peerError?.message || copy.error);
    });
  };

  const exitSession = () => {
    destroyNetwork();
    setMode("lobby");
    setStatus("waiting");
    setError("");
    setSessionCode("");
    setPlayers([]);
    setSceneMessage("");
    setSceneDraft("");
    codeRef.current = "";
    playersRef.current = [];
    sceneRef.current = "";
  };

  const handleBack = () => {
    destroyNetwork();
    onBack?.();
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

  const broadcastScene = () => {
    const nextMessage = String(sceneDraft || "").trim().slice(0, 600);
    sceneRef.current = nextMessage;
    setSceneMessage(nextMessage);
    broadcastState();
  };

  const syncCharacter = () => {
    const connection = hostConnectionRef.current;
    if (!connection?.open) return;
    connection.send({ type: "player_update", player: makePlayerPacket(playerName, form) });
    setSyncState(true);
    window.setTimeout(() => setSyncState(false), 1200);
  };

  const statusLabel = copy[status] || status;

  if (mode === "lobby") {
    return (
      <section className="session-screen pip-screen-grid">
        <section className="pip-panel pip-block session-hero">
          <div className="session-topline">
            <div>
              <div className="pip-bootline">PIP 2D20 NETWORK</div>
              <h1 className="pip-title">{copy.title}</h1>
              <p className="pip-subtitle">{copy.subtitle}</p>
            </div>
            <button type="button" className="pip-btn" onClick={handleBack}>{copy.back}</button>
          </div>
        </section>

        <div className="session-role-grid">
          <section className="pip-panel pip-block session-role-card">
            <div className="session-role-icon" aria-hidden="true">GM</div>
            <h2>[ {copy.hostTitle} ]</h2>
            <p className="stat-sub">{copy.hostDesc}</p>
            <button type="button" className="pip-btn is-primary session-main-button" onClick={startHost}>
              {copy.create}
            </button>
          </section>

          <section className="pip-panel pip-block session-role-card">
            <div className="session-role-icon" aria-hidden="true">P</div>
            <h2>[ {copy.joinTitle} ]</h2>
            <p className="stat-sub">{copy.joinDesc}</p>
            <label className="session-field">
              <span>{copy.code}</span>
              <input
                className="pip-input session-code-input"
                value={joinCode}
                maxLength={CODE_LENGTH}
                autoCapitalize="characters"
                autoComplete="off"
                onChange={(event) => setJoinCode(normalizeCode(event.target.value))}
                placeholder="ABC234"
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
            <button type="button" className="pip-btn is-primary session-main-button" onClick={joinSession}>
              {copy.join}
            </button>
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
          <div>
            <div className="pip-bootline">{mode === "host" ? "GAME MASTER ONLINE" : "PLAYER LINK"}</div>
            <h1 className="pip-title">{mode === "host" ? copy.hostTitle : copy.joinTitle}</h1>
          </div>
          <button type="button" className="pip-btn" onClick={exitSession}>
            {mode === "host" ? copy.end : copy.leave}
          </button>
        </div>

        <div className="session-status-strip">
          <div>
            <span className={`session-status-dot is-${status}`} />
            <span>{copy.status}: <strong>{statusLabel}</strong></span>
          </div>
          <div className="session-code-display">{sessionCode}</div>
          {mode === "host" && (
            <button type="button" className="pip-btn" onClick={copyCode}>
              {copyState ? copy.copied : copy.copy}
            </button>
          )}
        </div>
        {error && <div className="session-error">{error}</div>}
      </section>

      {mode === "host" ? (
        <div className="session-dashboard-grid">
          <section className="pip-panel pip-block">
            <div className="pip-head"><h2>[ {copy.roster} ]</h2><span>{players.length}</span></div>
            <div className="session-roster">
              {players.length ? players.map((player) => (
                <PlayerCard key={player.peerId} player={player} copy={copy} />
              )) : <div className="pip-logbox">{copy.emptyRoster}</div>}
            </div>
          </section>

          <section className="pip-panel pip-block">
            <div className="pip-head"><h2>[ {copy.scene} ]</h2></div>
            <textarea
              className="pip-input session-scene-input"
              rows={7}
              maxLength={600}
              value={sceneDraft}
              placeholder={copy.scenePlaceholder}
              onChange={(event) => setSceneDraft(event.target.value)}
            />
            <button type="button" className="pip-btn is-primary session-main-button" onClick={broadcastScene}>
              {copy.broadcast}
            </button>
            <div className="pip-logbox session-current-message">
              {sceneMessage || copy.noScene}
            </div>
          </section>
        </div>
      ) : (
        <div className="session-dashboard-grid">
          <section className="pip-panel pip-block">
            <div className="pip-head"><h2>[ {copy.sharedScene} ]</h2></div>
            <div className="pip-logbox session-current-message session-current-message-large">
              {sceneMessage || copy.noScene}
            </div>
            <button
              type="button"
              className="pip-btn"
              disabled={status !== "online"}
              onClick={syncCharacter}
            >
              {syncState ? copy.synced : copy.sync}
            </button>
          </section>

          <section className="pip-panel pip-block">
            <div className="pip-head"><h2>[ {copy.roster} ]</h2><span>{players.length}</span></div>
            <div className="session-roster">
              {players.length ? players.map((player) => (
                <PlayerCard key={player.peerId} player={player} copy={copy} />
              )) : <div className="pip-logbox">{copy.emptyRoster}</div>}
            </div>
          </section>
        </div>
      )}

      <div className="stat-sub session-beta-note">{copy.beta}</div>
    </section>
  );
}
'''

session_css = r'''.session-screen {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.session-hero {
  position: relative;
  overflow: hidden;
}

.session-hero::after {
  content: "";
  position: absolute;
  inset: auto -15% -70px 40%;
  height: 150px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.08;
  pointer-events: none;
}

.session-topline,
.session-status-strip,
.session-player-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.session-role-grid,
.session-dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.session-role-card {
  display: grid;
  gap: 10px;
  align-content: start;
}

.session-role-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  box-shadow: 0 0 14px color-mix(in srgb, currentColor 24%, transparent);
}

.session-field {
  display: grid;
  gap: 5px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.session-code-input,
.session-code-display {
  font-family: inherit;
  font-size: clamp(1.2rem, 4vw, 1.75rem);
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.session-code-input {
  text-align: center;
}

.session-code-display {
  padding: 5px 10px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 7%, transparent);
}

.session-main-button {
  width: 100%;
  min-height: 42px;
}

.session-status-strip {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, currentColor 35%, transparent);
}

.session-status-strip > div:first-child {
  display: flex;
  align-items: center;
  gap: 7px;
}

.session-status-dot,
.session-online-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
  background: currentColor;
  box-shadow: 0 0 9px currentColor;
}

.session-status-dot.is-connecting,
.session-status-dot.is-waiting {
  opacity: 0.45;
  animation: sessionPulse 1.25s ease-in-out infinite;
}

.session-status-dot.is-disconnected,
.session-status-dot.is-error {
  opacity: 0.28;
  box-shadow: none;
}

@keyframes sessionPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.session-roster {
  display: grid;
  gap: 8px;
}

.session-player-card {
  padding: 9px;
  border: 1px solid color-mix(in srgb, currentColor 38%, transparent);
  background: color-mix(in srgb, currentColor 4%, transparent);
}

.session-character-name {
  margin-top: 5px;
  font-size: 1.05rem;
  font-weight: 800;
}

.session-player-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin: 5px 0;
  font-size: 0.8rem;
  font-weight: 700;
}

.session-scene-input {
  width: 100%;
  min-height: 120px;
  resize: vertical;
}

.session-current-message {
  margin-top: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.session-current-message-large {
  min-height: 120px;
  margin-bottom: 10px;
}

.session-error {
  margin-top: 8px;
  padding: 8px;
  border: 1px solid currentColor;
  font-size: 0.82rem;
  font-weight: 700;
}

.session-beta-note {
  text-align: center;
  opacity: 0.68;
  padding: 4px 8px 14px;
}

@media (max-width: 760px) {
  .session-role-grid,
  .session-dashboard-grid {
    grid-template-columns: 1fr;
  }

  .session-status-strip {
    align-items: stretch;
  }

  .session-code-display {
    width: 100%;
    text-align: center;
    order: 3;
  }
}
'''

(session_dir / 'SessionScreen.jsx').write_text(session_screen, encoding='utf-8')
(session_dir / 'session.css').write_text(session_css, encoding='utf-8')

menu_path = root / 'src/components/menu/MenuScreen.jsx'
menu = menu_path.read_text(encoding='utf-8')
old = '''  onContinue,\n  onImportClick,\n  saveMeta\n}) {'''
new = '''  onContinue,\n  onImportClick,\n  onOpenSession,\n  saveMeta\n}) {'''
assert old in menu, 'MenuScreen props block not found'
menu = menu.replace(old, new, 1)

needle = '''            <TrackedButton\n              type="button"\n              className="pip-btn"\n              onClick={onImportClick}\n              id="btn_import_json"\n            >\n              {t("menuScreen.importJson")}\n            </TrackedButton>'''
insert = needle + '''\n\n            <TrackedButton\n              type="button"\n              className="pip-btn is-primary"\n              onClick={onOpenSession}\n              id="btn_gm_session"\n            >\n              GM / SESSION\n            </TrackedButton>'''
assert needle in menu, 'Import button block not found'
menu = menu.replace(needle, insert, 1)
menu_path.write_text(menu, encoding='utf-8')

app_path = root / 'src/App.jsx'
app = app_path.read_text(encoding='utf-8')

import_needle = 'import MenuScreen from "./components/menu/MenuScreen.jsx";\n'
assert import_needle in app, 'App MenuScreen import not found'
app = app.replace(import_needle, import_needle + 'import SessionScreen from "./components/session/SessionScreen.jsx";\n', 1)

menu_branch = '''  if (screen === "menu") {\n    content = (\n      <MenuScreen\n        hasCharacter={!!lastRecordMeta}\n        saveMeta={lastRecordMeta}\n        onNewCharacter={handleNewCharacter}\n        onContinue={handleContinue}\n        onImportClick={handleImportClick}\n      />\n    );\n  } else {\n    switch (activeTab) {'''
menu_branch_new = '''  if (screen === "menu") {\n    content = (\n      <MenuScreen\n        hasCharacter={!!lastRecordMeta}\n        saveMeta={lastRecordMeta}\n        onNewCharacter={handleNewCharacter}\n        onContinue={handleContinue}\n        onImportClick={handleImportClick}\n        onOpenSession={() => setScreen("session")}\n      />\n    );\n  } else if (screen === "session") {\n    content = (\n      <SessionScreen\n        form={form}\n        onBack={() => setScreen("menu")}\n      />\n    );\n  } else {\n    switch (activeTab) {'''
assert menu_branch in app, 'App content menu branch not found'
app = app.replace(menu_branch, menu_branch_new, 1)

render_needle = '      {screen === "menu" ? (\n'
assert render_needle in app, 'App main render condition not found'
app = app.replace(render_needle, '      {(screen === "menu" || screen === "session") ? (\n', 1)

pwa_needle = '''              {content}\n              <div className="pip-actions-inline push-top">\n                <PwaInstallButton />\n              </div>'''
pwa_new = '''              {content}\n              {screen === "menu" && (\n                <div className="pip-actions-inline push-top">\n                  <PwaInstallButton />\n                </div>\n              )}'''
assert pwa_needle in app, 'App PWA block not found'
app = app.replace(pwa_needle, pwa_new, 1)

float_needle = '      {screen !== "menu" && !isDiceOpen && (\n'
assert float_needle in app, 'Floating dice condition not found'
app = app.replace(float_needle, '      {screen === "sheet" && !isDiceOpen && (\n', 1)

app_path.write_text(app, encoding='utf-8')

print('GM session foundation source patch applied')
