from pathlib import Path


def replace_once(path, old, new):
    path = Path(path)
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Pattern not found in {path}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


hook = r'''import { useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { getDerivedStats } from "../utils/characterMath.js";

export const SESSION_CODE_LENGTH = 6;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const HOST_PREFIX = "pip2d20-session-";
const MAX_FEED = 120;

export function normalizeSessionCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SESSION_CODE_LENGTH);
}

function makeSessionCode() {
  const values = new Uint32Array(SESSION_CODE_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < values.length; i += 1) {
      values[i] = Math.floor(Math.random() * 0xffffffff);
    }
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

  const statuses = Object.entries(form?.statuses || {})
    .filter(([, active]) => Boolean(active))
    .map(([key]) => key)
    .slice(0, 12);

  return {
    name: characterName || "Unnamed",
    origin: String(form?.origin || ""),
    level: Math.max(1, Number(form?.level || 1)),
    currentHp: Math.max(0, Number(form?.currentHp || 0)),
    maxHp: Math.max(0, Number(derived?.effectiveMaxHp || derived?.maxHp || 0)),
    defense: Math.max(0, Number(derived?.defense || 0)),
    statuses,
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
    // Ignore cleanup errors.
  }
}

function makeId(prefix = "evt") {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value, maxLength = 600) {
  return String(value || "").trim().slice(0, maxLength);
}

function sanitizeRollPayload(roll) {
  if (!roll || typeof roll !== "object") return null;
  return {
    diceType: roll.diceType === "d6" ? "d6" : "d20",
    rollType: cleanText(roll.rollType, 30),
    label: cleanText(roll.label, 100),
    diceValues: Array.isArray(roll.diceValues) ? roll.diceValues.slice(0, 50) : [],
    successes: Number.isFinite(Number(roll.successes)) ? Number(roll.successes) : null,
    complications: Number.isFinite(Number(roll.complications)) ? Number(roll.complications) : 0,
    difficulty: Number.isFinite(Number(roll.difficulty)) ? Number(roll.difficulty) : null,
    targetNumber: Number.isFinite(Number(roll.targetNumber)) ? Number(roll.targetNumber) : null,
    outcome: roll.outcome === "success" || roll.outcome === "failure" ? roll.outcome : "",
    hitLocation: roll.hitLocation && typeof roll.hitLocation === "object"
      ? {
          label: cleanText(roll.hitLocation.label, 30),
          value: Number(roll.hitLocation.value || 0),
        }
      : null,
    totalDamage: Number.isFinite(Number(roll.totalDamage)) ? Number(roll.totalDamage) : null,
    totalEffects: Number.isFinite(Number(roll.totalEffects)) ? Number(roll.totalEffects) : null,
    effects: Array.isArray(roll.effects) ? roll.effects.map((item) => cleanText(item, 40)).filter(Boolean).slice(0, 12) : [],
    reroll: Boolean(roll.reroll),
    source: cleanText(roll.source, 30),
    timestamp: roll.timestamp || new Date().toISOString(),
  };
}

function makeFeedItem({ type, sender = "", text = "", event = "", roll = null }) {
  return {
    id: makeId(type || "evt"),
    type,
    sender: cleanText(sender, 40),
    text: cleanText(text, 600),
    event: cleanText(event, 30),
    roll: roll ? sanitizeRollPayload(roll) : null,
    timestamp: new Date().toISOString(),
  };
}

export default function useSharedSession(form) {
  const [mode, setMode] = useState("lobby");
  const [status, setStatus] = useState("waiting");
  const [error, setError] = useState(null);
  const [sessionCode, setSessionCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [sceneMessage, setSceneMessage] = useState("");
  const [feed, setFeed] = useState([]);

  const peerRef = useRef(null);
  const hostConnectionRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const playersRef = useRef([]);
  const sceneRef = useRef("");
  const feedRef = useRef([]);
  const codeRef = useRef("");
  const formRef = useRef(form);
  const playerNameRef = useRef("");
  const autoSyncTimerRef = useRef(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    sceneRef.current = sceneMessage;
  }, [sceneMessage]);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  const destroyNetwork = () => {
    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }
    connectionsRef.current.forEach((connection) => safeClose(connection));
    connectionsRef.current.clear();
    safeClose(hostConnectionRef.current);
    hostConnectionRef.current = null;
    try {
      peerRef.current?.destroy?.();
    } catch {
      // Ignore cleanup errors.
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
      feed: feedRef.current,
      sentAt: new Date().toISOString(),
    };

    connectionsRef.current.forEach((connection) => {
      if (connection?.open) connection.send(payload);
    });
  };

  const setHostFeed = (nextFeed) => {
    const capped = nextFeed.slice(-MAX_FEED);
    feedRef.current = capped;
    setFeed(capped);
    window.setTimeout(broadcastState, 0);
  };

  const appendHostFeed = (item) => {
    setHostFeed([...feedRef.current, item]);
  };

  const upsertPlayer = (peerId, packet) => {
    const nextPlayer = {
      peerId,
      name: cleanText(packet?.name || "Player", 40) || "Player",
      character: packet?.character || null,
      updatedAt: new Date().toISOString(),
    };
    const existed = playersRef.current.some((item) => item.peerId === peerId);
    const next = existed
      ? playersRef.current.map((item) => (item.peerId === peerId ? { ...item, ...nextPlayer } : item))
      : [...playersRef.current, nextPlayer];
    playersRef.current = next;
    setPlayers(next);
    if (!existed) {
      appendHostFeed(makeFeedItem({ type: "system", sender: nextPlayer.name, event: "join" }));
    } else {
      window.setTimeout(broadcastState, 0);
    }
  };

  const removePlayer = (peerId) => {
    const previous = playersRef.current.find((item) => item.peerId === peerId);
    const next = playersRef.current.filter((item) => item.peerId !== peerId);
    playersRef.current = next;
    setPlayers(next);
    if (previous) {
      appendHostFeed(makeFeedItem({ type: "system", sender: previous.name, event: "leave" }));
    } else {
      window.setTimeout(broadcastState, 0);
    }
  };

  const bindHostConnection = (connection) => {
    connectionsRef.current.set(connection.peer, connection);

    connection.on("open", () => {
      connection.send({
        type: "session_state",
        sessionCode: codeRef.current,
        players: playersRef.current,
        sceneMessage: sceneRef.current,
        feed: feedRef.current,
      });
    });

    connection.on("data", (data) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "join" || data.type === "player_update") {
        upsertPlayer(connection.peer, data.player);
        return;
      }

      const player = playersRef.current.find((item) => item.peerId === connection.peer);
      const sender = player?.name || cleanText(data?.sender, 40) || "Player";

      if (data.type === "chat_message") {
        const text = cleanText(data.text, 500);
        if (text) appendHostFeed(makeFeedItem({ type: "chat", sender, text }));
        return;
      }

      if (data.type === "roll_event") {
        const roll = sanitizeRollPayload(data.roll);
        if (roll) appendHostFeed(makeFeedItem({ type: "roll", sender, roll }));
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

  const resetState = () => {
    setPlayers([]);
    setSceneMessage("");
    setFeed([]);
    playersRef.current = [];
    sceneRef.current = "";
    feedRef.current = [];
  };

  const startHost = () => {
    destroyNetwork();
    resetState();
    setError(null);

    const code = makeSessionCode();
    codeRef.current = code;
    setSessionCode(code);
    setMode("host");
    setStatus("connecting");

    const peer = new Peer(getHostPeerId(code), { debug: 1 });
    peerRef.current = peer;

    peer.on("open", () => setStatus("online"));
    peer.on("connection", bindHostConnection);
    peer.on("disconnected", () => setStatus("disconnected"));
    peer.on("close", () => setStatus("disconnected"));
    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "unavailable-id") setError({ key: "roomUnavailable" });
      else setError({ key: "networkError", message: peerError?.message || "Network error" });
    });
  };

  const joinSession = ({ code, name }) => {
    const normalized = normalizeSessionCode(code);
    const cleanName = cleanText(name, 40);
    destroyNetwork();
    resetState();
    setError(null);
    playerNameRef.current = cleanName || "Player";
    codeRef.current = normalized;
    setSessionCode(normalized);
    setMode("player");
    setStatus("connecting");

    const peer = new Peer(undefined, { debug: 1 });
    peerRef.current = peer;

    peer.on("open", () => {
      const connection = peer.connect(getHostPeerId(normalized), { reliable: true });
      hostConnectionRef.current = connection;

      connection.on("open", () => {
        setStatus("online");
        connection.send({ type: "join", player: makePlayerPacket(playerNameRef.current, formRef.current) });
      });

      connection.on("data", (data) => {
        if (!data || typeof data !== "object") return;
        if (data.type === "session_state") {
          setPlayers(Array.isArray(data.players) ? data.players : []);
          setSceneMessage(cleanText(data.sceneMessage, 600));
          setFeed(Array.isArray(data.feed) ? data.feed.slice(-MAX_FEED) : []);
        }
      });

      connection.on("close", () => setStatus("disconnected"));
      connection.on("error", () => {
        setStatus("error");
        setError({ key: "hostNotFound" });
      });
    });

    peer.on("error", (peerError) => {
      setStatus("error");
      if (peerError?.type === "peer-unavailable") setError({ key: "hostNotFound" });
      else setError({ key: "networkError", message: peerError?.message || "Network error" });
    });
  };

  const exitSession = () => {
    destroyNetwork();
    setMode("lobby");
    setStatus("waiting");
    setError(null);
    setSessionCode("");
    codeRef.current = "";
    playerNameRef.current = "";
    resetState();
  };

  const broadcastScene = (value) => {
    if (mode !== "host") return false;
    const text = cleanText(value, 600);
    sceneRef.current = text;
    setSceneMessage(text);
    if (text) appendHostFeed(makeFeedItem({ type: "scene", sender: "GM", text }));
    else broadcastState();
    return true;
  };

  const sendChat = (value) => {
    const text = cleanText(value, 500);
    if (!text || status !== "online") return false;

    if (mode === "host") {
      appendHostFeed(makeFeedItem({ type: "chat", sender: "GM", text }));
      return true;
    }

    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "chat_message", text, sender: playerNameRef.current });
    return true;
  };

  const syncCharacter = () => {
    if (mode !== "player" || status !== "online") return false;
    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({
      type: "player_update",
      player: makePlayerPacket(playerNameRef.current, formRef.current),
    });
    return true;
  };

  const sendDiceResult = (payload) => {
    if (!payload || status !== "online") return false;
    const roll = sanitizeRollPayload(payload);
    if (!roll) return false;

    if (mode === "host") {
      appendHostFeed(makeFeedItem({ type: "roll", sender: "GM", roll }));
      return true;
    }

    const connection = hostConnectionRef.current;
    if (!connection?.open) return false;
    connection.send({ type: "roll_event", roll, sender: playerNameRef.current });
    return true;
  };

  const snapshotSignature = useMemo(
    () => JSON.stringify(createCharacterSnapshot(form)),
    [form]
  );

  useEffect(() => {
    if (mode !== "player" || status !== "online") return undefined;
    if (autoSyncTimerRef.current) window.clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = window.setTimeout(() => {
      syncCharacter();
      autoSyncTimerRef.current = null;
    }, 350);
    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [snapshotSignature, mode, status]);

  return {
    mode,
    status,
    error,
    sessionCode,
    players,
    sceneMessage,
    feed,
    isActive: mode === "host" || mode === "player",
    startHost,
    joinSession,
    exitSession,
    broadcastScene,
    sendChat,
    syncCharacter,
    sendDiceResult,
  };
}
'''
Path("src/hooks/useSharedSession.js").write_text(hook, encoding="utf-8")

session_screen = r'''import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeSessionCode,
  SESSION_CODE_LENGTH,
} from "../../hooks/useSharedSession.js";
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
    sessionActive: "SESSION", live: "LIVE"
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
    sessionActive: "СЕССИЯ", live: "LIVE"
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
    sessionActive: "СЕСІЯ", live: "LIVE"
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
    sessionActive: "SESJA", live: "LIVE"
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

  const mode = session?.mode || "lobby";
  const status = session?.status || "waiting";
  const players = session?.players || [];
  const sceneMessage = session?.sceneMessage || "";
  const feed = session?.feed || [];
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

      <section className="pip-panel pip-block session-feed-panel">
        <div className="pip-head"><h2>[ {copy.activity} ]</h2><span>{feed.length}</span></div>
        <div className="session-feed">{feed.length ? feed.slice().reverse().map((item) => <FeedItem key={item.id} item={item} copy={copy} />) : <div className="pip-logbox">{copy.noActivity}</div>}</div>
        <form className="session-chat-form" onSubmit={handleChatSubmit}>
          <label className="session-field session-chat-field"><span>{copy.chat}</span><input className="pip-input" maxLength={500} value={chatDraft} placeholder={copy.chatPlaceholder} onChange={(event) => setChatDraft(event.target.value)} /></label>
          <button type="submit" className="pip-btn is-primary" disabled={status !== "online" || !String(chatDraft).trim()}>{copy.send}</button>
        </form>
      </section>

      <div className="stat-sub session-beta-note">{copy.beta}</div>
    </section>
  );
}
'''
Path("src/components/session/SessionScreen.jsx").write_text(session_screen, encoding="utf-8")

css_path = Path("src/components/session/session.css")
css = css_path.read_text(encoding="utf-8")
css += r'''

.session-top-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.session-status-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 7px;
}

.session-status-tags span {
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  font-size: 0.68rem;
  text-transform: uppercase;
}

.session-live-sync-note {
  margin: 8px 0 10px;
}

.session-feed-panel {
  min-width: 0;
}

.session-feed {
  display: grid;
  gap: 7px;
  max-height: 420px;
  overflow: auto;
  padding-right: 3px;
}

.session-feed-item {
  padding: 8px;
  border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
  background: color-mix(in srgb, currentColor 3%, transparent);
}

.session-feed-item.is-scene {
  border-width: 2px;
}

.session-feed-item.is-system {
  opacity: 0.72;
}

.session-feed-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.7rem;
  opacity: 0.76;
  text-transform: uppercase;
}

.session-feed-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.session-feed-scene {
  font-weight: 700;
}

.session-roll-card {
  display: grid;
  gap: 6px;
}

.session-roll-title {
  font-weight: 800;
  letter-spacing: 0.04em;
}

.session-roll-dice,
.session-roll-stats {
  display: flex;
  gap: 5px 8px;
  flex-wrap: wrap;
  align-items: center;
}

.session-roll-dice span {
  min-width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: 1px solid currentColor;
  font-weight: 800;
}

.session-roll-stats {
  font-size: 0.76rem;
}

.session-chat-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, currentColor 25%, transparent);
}

.session-chat-field {
  min-width: 0;
}

.floating-session-button {
  position: fixed;
  right: 12px;
  bottom: 76px;
  z-index: 999997;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 7px 10px;
  border: 1px solid currentColor;
  border-radius: 6px;
  background: rgba(8, 18, 10, 0.96);
  color: var(--pip-accent);
  font: inherit;
  cursor: pointer;
  box-shadow: 0 0 12px color-mix(in srgb, currentColor 16%, transparent);
}

.floating-session-button:hover {
  filter: brightness(1.12);
}

@media (max-width: 760px) {
  .session-chat-form {
    grid-template-columns: 1fr;
  }
  .floating-session-button {
    right: 8px;
    bottom: 66px;
  }
}
'''
css_path.write_text(css, encoding="utf-8")

replace_once(
    "src/App.jsx",
    'import SessionScreen from "./components/session/SessionScreen.jsx";\n',
    'import SessionScreen, { SessionFloatingButton } from "./components/session/SessionScreen.jsx";\nimport useSharedSession from "./hooks/useSharedSession.js";\n',
)

replace_once(
    "src/App.jsx",
    '  } = useCharacterStorage(buildDefaultForm());\n',
    '  } = useCharacterStorage(buildDefaultForm());\n\n  const sharedSession = useSharedSession(form);\n',
)

replace_once(
    "src/App.jsx",
    '''      <SessionScreen\n        form={form}\n        onBack={() => setScreen("menu")}\n      />''',
    '''      <SessionScreen\n        form={form}\n        session={sharedSession}\n        onBack={() => setScreen("menu")}\n        onOpenSheet={() => {\n          setScreen("sheet");\n          setActiveTab("status");\n        }}\n      />''',
)

replace_once(
    "src/App.jsx",
    '''      {screen === "sheet" && !isDiceOpen && (\n        <FloatingDiceButton onOpen={openFreeDiceRoll} />\n      )}\n\n      <DiceRollModal''',
    '''      {screen === "sheet" && !isDiceOpen && (\n        <FloatingDiceButton onOpen={openFreeDiceRoll} />\n      )}\n\n      {screen === "sheet" && !isDiceOpen && sharedSession.isActive && (\n        <SessionFloatingButton\n          session={sharedSession}\n          onOpen={() => setScreen("session")}\n        />\n      )}\n\n      <DiceRollModal''',
)

replace_once(
    "src/App.jsx",
    '''        onMarkCombatUse={markCombatUse}\n      />''',
    '''        onMarkCombatUse={markCombatUse}\n        onDiceResult={sharedSession.sendDiceResult}\n      />''',
)

replace_once(
    "src/components/dice/DiceRollModal.jsx",
    '''  onSpendCombatLuck,\n  onMarkCombatUse,\n}) {''',
    '''  onSpendCombatLuck,\n  onMarkCombatUse,\n  onDiceResult,\n}) {''',
)

replace_once(
    "src/components/dice/DiceRollModal.jsx",
    '''                onAutoRollDamage={(diceCount) => {\n                  setPendingAutoD6({\n                    diceCount,\n                    id: Date.now(),\n                  });\n                }}\n              />''',
    '''                onAutoRollDamage={(diceCount) => {\n                  setPendingAutoD6({\n                    diceCount,\n                    id: Date.now(),\n                  });\n                }}\n                onResult={onDiceResult}\n              />''',
)

replace_once(
    "src/components/dice/DiceRollModal.jsx",
    '''                onMarkCombatUse={onMarkCombatUse}\n                weaponEffects={[''',
    '''                onMarkCombatUse={onMarkCombatUse}\n                onResult={onDiceResult}\n                weaponEffects={[''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''  form = null,\n  onAutoRollDamage,\n}) {''',
    '''  form = null,\n  onAutoRollDamage,\n  onResult,\n}) {''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''  const resultStats = buildRollSummary(lastRoll);\n  const difficulty = Number(rollConfig?.difficulty || 1);\n\n  useEffect(() => {''',
    '''  const resultStats = buildRollSummary(lastRoll);\n  const difficulty = Number(rollConfig?.difficulty || 1);\n\n  const reportResult = (result, meta = {}) => {\n    if (!result) return;\n    onResult?.({\n      diceType: "d20",\n      rollType: meta.rollType || (isWeaponRoll ? "weapon" : isSkillRoll ? "skill" : "free"),\n      label: meta.label || rollLabel,\n      diceValues: Array.isArray(result.rolls) ? result.rolls.map((die) => die.value) : [],\n      successes: result.totalSuccesses ?? null,\n      complications: result.complications ?? 0,\n      difficulty: isContextRoll ? difficulty : null,\n      targetNumber: isContextRoll ? targetNumber : null,\n      outcome: isContextRoll ? ((result.totalSuccesses || 0) >= difficulty ? "success" : "failure") : "",\n      hitLocation: result.hitLocation || meta.hitLocation || null,\n      reroll: Boolean(meta.reroll),\n      source: meta.source || "roll",\n      timestamp: new Date().toISOString(),\n    });\n  };\n\n  useEffect(() => {''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''      setHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY));\n      setIsHitRolling(false);''',
    '''      setHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY));\n      onResult?.({\n        diceType: "d20",\n        rollType: "hit-location",\n        label: "Hit Location",\n        diceValues: [result.value],\n        successes: null,\n        complications: 0,\n        difficulty: null,\n        targetNumber: null,\n        outcome: "",\n        hitLocation: result,\n        reroll: false,\n        source: "hit-location",\n        timestamp: new Date().toISOString(),\n      });\n      setIsHitRolling(false);''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''          setHistory((prev) => {\n            const next = [...prev];\n            next[0] = nextResult;\n            return next.slice(0, MAX_HISTORY);\n          });\n\n          setIsHitRolling(false);''',
    '''          setHistory((prev) => {\n            const next = [...prev];\n            next[0] = nextResult;\n            return next.slice(0, MAX_HISTORY);\n          });\n          reportResult(nextResult);\n\n          setIsHitRolling(false);''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''      setLastRoll(result);\n      setHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));\n      autoRollWeaponDamage(result);\n      setIsRolling(false);''',
    '''      setLastRoll(result);\n      setHistory((prev) => [result, ...prev].slice(0, MAX_HISTORY));\n      reportResult(result);\n      autoRollWeaponDamage(result);\n      setIsRolling(false);''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''        autoRollWeaponDamage(resultWithLocation);\n\n        if (previousHitLocation) return;''',
    '''        autoRollWeaponDamage(resultWithLocation);\n\n        if (previousHitLocation) {\n          reportResult(resultWithLocation, { reroll: true, source: "single-reroll" });\n          return;\n        }''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''          setHistory((prev) => {\n            if (prev.length === 0) return [nextUpdatedResult];\n            const next = [...prev];\n            next[0] = nextUpdatedResult;\n            return next.slice(0, MAX_HISTORY);\n          });\n\n          setIsHitRolling(false);''',
    '''          setHistory((prev) => {\n            if (prev.length === 0) return [nextUpdatedResult];\n            const next = [...prev];\n            next[0] = nextUpdatedResult;\n            return next.slice(0, MAX_HISTORY);\n          });\n          reportResult(nextUpdatedResult, { reroll: true, source: "single-reroll" });\n\n          setIsHitRolling(false);''',
)

replace_once(
    "src/components/dice/FalloutD20Roller.jsx",
    '''      autoRollWeaponDamage(updatedResult);\n      setRerollingDieIndex(null);''',
    '''      reportResult(updatedResult, { reroll: true, source: "single-reroll" });\n      autoRollWeaponDamage(updatedResult);\n      setRerollingDieIndex(null);''',
)

replace_once(
    "src/components/dice/FalloutD6Roller.jsx",
    '''  onSpendCombatLuck,\n  onMarkCombatUse,\n}) {''',
    '''  onSpendCombatLuck,\n  onMarkCombatUse,\n  onResult,\n}) {''',
)

replace_once(
    "src/components/dice/FalloutD6Roller.jsx",
    '''  const performRoll = (count) => {\n    const finalResult = rollFalloutD6({\n      diceCount: count,\n      effects: weaponEffects,\n    });\n\n    setLastRoll(finalResult);\n    setHistory((prev) => [finalResult, ...prev].slice(0, MAX_HISTORY));\n  };''',
    '''  const reportResult = (result, meta = {}) => {\n    if (!result) return;\n    onResult?.({\n      diceType: "d6",\n      rollType: weapon ? "weapon-damage" : "damage",\n      label: weapon?.name || "D6 Damage",\n      diceValues: Array.isArray(result.rolls) ? result.rolls.map((die) => die.label ?? die.value) : [],\n      totalDamage: result.totalDamage ?? 0,\n      totalEffects: result.totalEffects ?? 0,\n      effects: Array.isArray(result.rawEffects) ? result.rawEffects : [],\n      reroll: Boolean(meta.reroll),\n      source: meta.source || "roll",\n      timestamp: new Date().toISOString(),\n    });\n  };\n\n  const performRoll = (count, meta = {}) => {\n    const finalResult = rollFalloutD6({\n      diceCount: count,\n      effects: weaponEffects,\n    });\n\n    setLastRoll(finalResult);\n    setHistory((prev) => [finalResult, ...prev].slice(0, MAX_HISTORY));\n    reportResult(finalResult, meta);\n  };''',
)

replace_once(
    "src/components/dice/FalloutD6Roller.jsx",
    '''      performRoll(count);\n      setIsRolling(false);\n    });\n  };\n\n  const handleFinesseReroll''',
    '''      performRoll(count);\n      setIsRolling(false);\n    });\n  };\n\n  const handleFinesseReroll''',
)

replace_once(
    "src/components/dice/FalloutD6Roller.jsx",
    '''    animateDice(600, () => {\n      performRoll(count);\n      setIsRolling(false);\n    });\n  };\n\n  const handleForceCritical''',
    '''    animateDice(600, () => {\n      performRoll(count, { reroll: true, source: "finesse-reroll" });\n      setIsRolling(false);\n    });\n  };\n\n  const handleForceCritical''',
)

replace_once(
    "src/components/dice/FalloutD6Roller.jsx",
    '''      setHistory((prev) => {\n        if (prev.length === 0) return [finalUpdatedResult];\n        const next = [...prev];\n        next[0] = finalUpdatedResult;\n        return next.slice(0, MAX_HISTORY);\n      });\n\n      setRerollingDieIndex(null);''',
    '''      setHistory((prev) => {\n        if (prev.length === 0) return [finalUpdatedResult];\n        const next = [...prev];\n        next[0] = finalUpdatedResult;\n        return next.slice(0, MAX_HISTORY);\n      });\n      reportResult(finalUpdatedResult, { reroll: true, source: "single-reroll" });\n\n      setRerollingDieIndex(null);''',
)

replace_once(
    "src/components/dice/FalloutD6Roller.jsx",
    '''  animateDice(600, () => {\n    performRoll(totalCount);\n    setIsRolling(false);''',
    '''  animateDice(600, () => {\n    performRoll(totalCount, { source: "auto-damage" });\n    setIsRolling(false);''',
)

print("Live session chat, dice feed and persistent connection patch applied")
