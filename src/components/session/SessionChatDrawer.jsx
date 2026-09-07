import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SessionTacticalMap from "./SessionTacticalMap.jsx";
import "./sessionUtilityDrawer.css";

const COPY = {
  en: {
    title: "SESSION PANEL", online: "ONLINE", connecting: "CONNECTING", offline: "OFFLINE",
    placeholder: "Message the group...", send: "SEND", noMessages: "No session activity yet.", gm: "GM",
    joined: "joined", left: "left", scene: "GM MESSAGE", close: "CLOSE", reconnect: "RECONNECT",
    hostNotFound: "GM session not found or is offline.", networkError: "Network connection error.",
    success: "SUCCESS", failure: "FAILURE", successes: "Suc", complications: "Comp", damage: "Damage",
    effects: "Effects", difficulty: "Diff", target: "TN", hit: "Hit", combatStart: "COMBAT START",
    combatEnd: "COMBAT END", turn: "TURN", chatTab: "CHAT", logTab: "LOG", diceTab: "DICE",
    noChat: "No chat messages yet.", d20: "2d20 CHECK", combatDice: "COMBAT DICE", diceCount: "DICE",
    roll: "ROLL", lastRoll: "LAST ROLL", drawer: "CHAT / LOG / DICE",
  },
  ru: {
    title: "ПАНЕЛЬ СЕССИИ", online: "ОНЛАЙН", connecting: "ПОДКЛЮЧЕНИЕ", offline: "ОФЛАЙН",
    placeholder: "Сообщение группе...", send: "ОТПРАВИТЬ", noMessages: "В журнале пока нет событий.", gm: "ГМ",
    joined: "подключился", left: "вышел", scene: "СООБЩЕНИЕ ГМ", close: "ЗАКРЫТЬ", reconnect: "ПЕРЕПОДКЛЮЧИТЬСЯ",
    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.", networkError: "Ошибка сетевого соединения.",
    success: "УСПЕХ", failure: "ПРОВАЛ", successes: "Усп", complications: "Осл", damage: "Урон",
    effects: "Эффекты", difficulty: "Сложн", target: "ЦЧ", hit: "Попадание", combatStart: "НАЧАЛО БОЯ",
    combatEnd: "КОНЕЦ БОЯ", turn: "ХОД", chatTab: "ЧАТ", logTab: "ЛОГ", diceTab: "КУБИКИ",
    noChat: "В чате пока нет сообщений.", d20: "ПРОВЕРКА 2d20", combatDice: "БОЕВЫЕ КУБИКИ", diceCount: "КУБИКИ",
    roll: "БРОСИТЬ", lastRoll: "ПОСЛЕДНИЙ БРОСОК", drawer: "ЧАТ / ЛОГ / КУБИКИ",
  },
  uk: {
    title: "ПАНЕЛЬ СЕСІЇ", online: "ОНЛАЙН", connecting: "ПІДКЛЮЧЕННЯ", offline: "ОФЛАЙН",
    placeholder: "Повідомлення групі...", send: "НАДІСЛАТИ", noMessages: "У журналі ще немає подій.", gm: "ГМ",
    joined: "підключився", left: "вийшов", scene: "ПОВІДОМЛЕННЯ ГМ", close: "ЗАКРИТИ", reconnect: "ПЕРЕПІДКЛЮЧИТИСЯ",
    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.", networkError: "Помилка мережевого з’єднання.",
    success: "УСПІХ", failure: "НЕВДАЧА", successes: "Усп", complications: "Ускл", damage: "Шкода",
    effects: "Ефекти", difficulty: "Складн", target: "ЦЧ", hit: "Влучання", combatStart: "ПОЧАТОК БОЮ",
    combatEnd: "КІНЕЦЬ БОЮ", turn: "ХІД", chatTab: "ЧАТ", logTab: "ЛОГ", diceTab: "КУБИКИ",
    noChat: "У чаті ще немає повідомлень.", d20: "ПЕРЕВІРКА 2d20", combatDice: "БОЙОВІ КУБИКИ", diceCount: "КУБИКИ",
    roll: "КИНУТИ", lastRoll: "ОСТАННІЙ КИДОК", drawer: "ЧАТ / ЛОГ / КУБИКИ",
  },
  pl: {
    title: "PANEL SESJI", online: "ONLINE", connecting: "ŁĄCZENIE", offline: "OFFLINE",
    placeholder: "Wiadomość do grupy...", send: "WYŚLIJ", noMessages: "Brak aktywności sesji.", gm: "GM",
    joined: "dołączył", left: "wyszedł", scene: "WIADOMOŚĆ GM", close: "ZAMKNIJ", reconnect: "POŁĄCZ PONOWNIE",
    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.", networkError: "Błąd połączenia sieciowego.",
    success: "SUKCES", failure: "PORAŻKA", successes: "Suk", complications: "Kompl", damage: "Obrażenia",
    effects: "Efekty", difficulty: "Trudn", target: "TN", hit: "Trafienie", combatStart: "START WALKI",
    combatEnd: "KONIEC WALKI", turn: "TURA", chatTab: "CZAT", logTab: "LOG", diceTab: "KOŚCI",
    noChat: "Brak wiadomości na czacie.", d20: "TEST 2d20", combatDice: "KOŚCI WALKI", diceCount: "KOŚCI",
    roll: "RZUĆ", lastRoll: "OSTATNI RZUT", drawer: "CZAT / LOG / KOŚCI",
  },
};

function getCopy(language) {
  const code = String(language || "en").toLowerCase().split("-")[0];
  return COPY[code] || COPY.en;
}

function formatTime(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getConnectionState(status) {
  if (status === "online") return "online";
  if (status === "connecting" || status === "waiting") return "connecting";
  return "offline";
}

function RollItem({ item, copy }) {
  const roll = item?.roll || {};
  const values = Array.isArray(roll.diceValues) ? roll.diceValues : [];
  const isD6 = roll.diceType === "d6";
  const outcomeLabel = roll.outcome === "success" ? copy.success : roll.outcome === "failure" ? copy.failure : "";
  return (
    <div className="session-drawer-message session-drawer-roll">
      <div className="session-drawer-message-meta"><strong>{item.sender || copy.gm} · {String(roll.diceType || "D20").toUpperCase()}</strong><span>{formatTime(item.timestamp)}</span></div>
      <div className="session-roll-card">
        <div className="session-roll-title">{roll.label || roll.rollType || String(roll.diceType || "D20").toUpperCase()}{outcomeLabel ? ` · ${outcomeLabel}` : ""}</div>
        {values.length > 0 && <div className="session-roll-dice">{values.map((value, index) => <span key={`${item.id}-die-${index}`}>{String(value)}</span>)}</div>}
        <div className="session-roll-stats">
          {!isD6 && Number.isFinite(Number(roll.successes)) && <span>{copy.successes}: {roll.successes}</span>}
          {!isD6 && Number(roll.complications || 0) > 0 && <span>{copy.complications}: {roll.complications}</span>}
          {!isD6 && Number.isFinite(Number(roll.targetNumber)) && <span>{copy.target}: {roll.targetNumber}</span>}
          {!isD6 && Number.isFinite(Number(roll.difficulty)) && <span>{copy.difficulty}: {roll.difficulty}</span>}
          {!isD6 && roll.hitLocation?.label && <span>{copy.hit}: {roll.hitLocation.label}</span>}
          {isD6 && Number.isFinite(Number(roll.totalDamage)) && <span>{copy.damage}: {roll.totalDamage}</span>}
          {isD6 && Number.isFinite(Number(roll.totalEffects)) && <span>{copy.effects}: {roll.totalEffects}</span>}
        </div>
      </div>
    </div>
  );
}

function CombatItem({ item, copy }) {
  const label = item.event === "combat_start" ? copy.combatStart : item.event === "combat_end" ? copy.combatEnd : copy.turn;
  return <div className="session-drawer-system"><span>{formatTime(item.timestamp)}</span><strong>{label}</strong>{item.text && <span>{item.text}</span>}</div>;
}

function LogItem({ item, copy }) {
  if (item.type === "roll") return <RollItem item={item} copy={copy} />;
  if (item.type === "combat") return <CombatItem item={item} copy={copy} />;
  if (item.type === "system") {
    return <div className="session-drawer-system"><span>{formatTime(item.timestamp)}</span><strong>{item.sender || "Player"}</strong><span>{item.event === "join" ? copy.joined : copy.left}</span></div>;
  }
  const isScene = item.type === "scene";
  return (
    <div className={`session-drawer-message${isScene ? " is-scene" : ""}`}>
      <div className="session-drawer-message-meta"><strong>{isScene ? copy.scene : (item.sender || copy.gm)}</strong><span>{formatTime(item.timestamp)}</span></div>
      <div>{item.text || ""}</div>
    </div>
  );
}

function rollCombatDice(count) {
  const dice = Array.from({ length: Math.max(1, Math.min(20, Number(count) || 1)) }, () => 1 + Math.floor(Math.random() * 6));
  let damage = 0;
  let effects = 0;
  dice.forEach((die) => {
    if (die === 1) damage += 1;
    if (die === 2) damage += 2;
    if (die >= 5) { damage += 1; effects += 1; }
  });
  return { dice, damage, effects };
}

export default function SessionChatDrawer({ session }) {
  const { i18n } = useTranslation();
  const copy = getCopy(i18n.resolvedLanguage || i18n.language);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat");
  const [draft, setDraft] = useState("");
  const [d20Count, setD20Count] = useState(2);
  const [targetNumber, setTargetNumber] = useState(10);
  const [difficulty, setDifficulty] = useState(1);
  const [combatDiceCount, setCombatDiceCount] = useState(3);
  const [lastRoll, setLastRoll] = useState(null);
  const listRef = useRef(null);

  const items = useMemo(() => (session?.feed || []).filter(Boolean).slice(-120), [session?.feed]);
  const chatItems = useMemo(() => items.filter((item) => item.type === "chat" || item.type === "scene"), [items]);
  const visibleItems = tab === "chat" ? chatItems : items;
  const connectionState = getConnectionState(session?.status);
  const connectionLabel = copy[connectionState];
  const errorText = session?.error?.key ? (copy[session.error.key] || session.error.message || "") : (session?.error?.message || "");

  useEffect(() => {
    if (!open || tab === "dice" || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, tab, visibleItems.length]);

  if (!session?.isActive) return null;

  const submit = (event) => {
    event.preventDefault();
    const text = String(draft || "").trim();
    if (!text) return;
    if (session.sendChat(text)) setDraft("");
  };

  const rollD20 = () => {
    const count = Math.max(1, Math.min(5, Number(d20Count) || 2));
    const target = Math.max(1, Math.min(20, Number(targetNumber) || 10));
    const diff = Math.max(0, Math.min(5, Number(difficulty) || 0));
    const diceValues = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 20));
    const successes = diceValues.reduce((sum, die) => sum + (die <= target ? 1 : 0), 0);
    const complications = diceValues.filter((die) => die === 20).length;
    const payload = {
      diceType: "d20", rollType: "skill", label: copy.d20, diceValues, successes, complications,
      difficulty: diff, targetNumber: target, outcome: successes >= diff ? "success" : "failure", source: "session_drawer",
    };
    session?.sendDiceResult?.(payload);
    setLastRoll(payload);
  };

  const rollDamage = () => {
    const count = Math.max(1, Math.min(20, Number(combatDiceCount) || 1));
    const result = rollCombatDice(count);
    const payload = {
      diceType: "d6", rollType: "combat_damage", label: copy.combatDice, diceValues: result.dice,
      totalDamage: result.damage, totalEffects: result.effects, effects: [], source: "session_drawer",
    };
    session?.sendDiceResult?.(payload);
    setLastRoll(payload);
  };

  return (
    <div className={`session-chat-drawer-shell session-utility-drawer-shell${open ? " is-open" : ""}`}>
      <button type="button" className="session-chat-drawer-toggle session-utility-drawer-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={copy.drawer}>
        <span className={`session-status-dot is-${session.status}`} />
        <span className="session-chat-toggle-label">☰</span>
        <span className="session-chat-toggle-code">{session.sessionCode}</span>
      </button>

      <aside className="session-chat-drawer session-utility-drawer" aria-hidden={!open}>
        <header className="session-chat-drawer-head">
          <div><div className="pip-bootline">PIP 2D20 NETWORK</div><h2>[ {copy.title} ]</h2></div>
          <button type="button" className="pip-btn" onClick={() => setOpen(false)}>{copy.close}</button>
        </header>

        <div className="session-chat-connection-strip">
          <div><span className={`session-status-dot is-${session.status}`} /><strong>{connectionLabel}</strong></div>
          <span>{session.sessionCode}</span>
        </div>

        <nav className="session-utility-tabs">
          <button type="button" className={`pip-btn${tab === "chat" ? " is-primary" : ""}`} onClick={() => setTab("chat")}>{copy.chatTab}</button>
          <button type="button" className={`pip-btn${tab === "log" ? " is-primary" : ""}`} onClick={() => setTab("log")}>{copy.logTab}</button>
          <button type="button" className={`pip-btn${tab === "dice" ? " is-primary" : ""}`} onClick={() => setTab("dice")}>{copy.diceTab}</button>
        </nav>

        {connectionState !== "online" && <>{errorText && <div className="session-error">{errorText}</div>}{session.reconnectNow && <button type="button" className="pip-btn is-primary" onClick={() => session.reconnectNow()}>↻ {copy.reconnect}</button>}</>}

        {tab !== "dice" ? (
          <>
            {tab === "chat" && session.sceneMessage && <div className="session-chat-scene-banner"><strong>{copy.scene}</strong><span>{session.sceneMessage}</span></div>}
            <div ref={listRef} className="session-chat-drawer-list session-utility-list">
              {visibleItems.length ? visibleItems.map((item) => <LogItem key={item.id} item={item} copy={copy} />) : <div className="pip-logbox">{tab === "chat" ? copy.noChat : copy.noMessages}</div>}
            </div>
            <form className="session-chat-drawer-form" onSubmit={submit}>
              <input className="pip-input" value={draft} maxLength={500} placeholder={copy.placeholder} onChange={(event) => setDraft(event.target.value)} />
              <button type="submit" className="pip-btn is-primary" disabled={connectionState !== "online" || !String(draft).trim()}>{copy.send}</button>
            </form>
          </>
        ) : (
          <div className="session-utility-dice">
            <section className="session-utility-dice-card">
              <div className="pip-head"><h3>[ {copy.d20} ]</h3></div>
              <div className="session-utility-dice-fields">
                <label><span>{copy.diceCount}</span><input className="pip-input" type="number" min="1" max="5" value={d20Count} onChange={(event) => setD20Count(event.target.value)} /></label>
                <label><span>{copy.target}</span><input className="pip-input" type="number" min="1" max="20" value={targetNumber} onChange={(event) => setTargetNumber(event.target.value)} /></label>
                <label><span>{copy.difficulty}</span><input className="pip-input" type="number" min="0" max="5" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} /></label>
              </div>
              <button type="button" className="pip-btn is-primary session-utility-roll-button" disabled={connectionState !== "online"} onClick={rollD20}>{copy.roll}</button>
            </section>

            <section className="session-utility-dice-card">
              <div className="pip-head"><h3>[ {copy.combatDice} ]</h3></div>
              <label className="session-utility-single-field"><span>{copy.diceCount}</span><input className="pip-input" type="number" min="1" max="20" value={combatDiceCount} onChange={(event) => setCombatDiceCount(event.target.value)} /></label>
              <button type="button" className="pip-btn is-primary session-utility-roll-button" disabled={connectionState !== "online"} onClick={rollDamage}>{copy.roll}</button>
            </section>

            {lastRoll ? <div className="session-utility-last-roll"><strong>{copy.lastRoll}</strong><div className="session-roll-dice">{(lastRoll.diceValues || []).map((value, index) => <span key={`last-${index}`}>{value}</span>)}</div><div className="session-roll-stats">{lastRoll.diceType === "d6" ? <><span>{copy.damage}: {lastRoll.totalDamage}</span><span>{copy.effects}: {lastRoll.totalEffects}</span></> : <><span>{copy.successes}: {lastRoll.successes}</span><span>{copy.complications}: {lastRoll.complications}</span></>}</div></div> : null}
          </div>
        )}
      </aside>
      {session.mode === "player" ? <SessionTacticalMap session={session} /> : null}
    </div>
  );
}
