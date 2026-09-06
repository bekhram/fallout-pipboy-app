import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const COPY = {
  en: {
    title: "GROUP LOG",
    online: "ONLINE",
    connecting: "CONNECTING",
    offline: "OFFLINE",
    placeholder: "Message the group...",
    send: "SEND",
    noMessages: "No session activity yet.",
    gm: "GM",
    joined: "joined",
    left: "left",
    scene: "GM MESSAGE",
    close: "CLOSE",
    reconnect: "RECONNECT",
    hostNotFound: "GM session not found or is offline.",
    networkError: "Network connection error.",
    success: "SUCCESS",
    failure: "FAILURE",
    successes: "Suc",
    complications: "Comp",
    damage: "Damage",
    effects: "Effects",
    difficulty: "Diff",
    target: "TN",
    hit: "Hit",
    combatStart: "COMBAT START",
    combatEnd: "COMBAT END",
    turn: "TURN",
  },
  ru: {
    title: "ОБЩИЙ ЖУРНАЛ",
    online: "ОНЛАЙН",
    connecting: "ПОДКЛЮЧЕНИЕ",
    offline: "ОФЛАЙН",
    placeholder: "Сообщение группе...",
    send: "ОТПРАВИТЬ",
    noMessages: "В журнале пока нет событий.",
    gm: "ГМ",
    joined: "подключился",
    left: "вышел",
    scene: "СООБЩЕНИЕ ГМ",
    close: "ЗАКРЫТЬ",
    reconnect: "ПЕРЕПОДКЛЮЧИТЬСЯ",
    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.",
    networkError: "Ошибка сетевого соединения.",
    success: "УСПЕХ",
    failure: "ПРОВАЛ",
    successes: "Усп",
    complications: "Осл",
    damage: "Урон",
    effects: "Эффекты",
    difficulty: "Сложн",
    target: "ЦЧ",
    hit: "Попадание",
    combatStart: "НАЧАЛО БОЯ",
    combatEnd: "КОНЕЦ БОЯ",
    turn: "ХОД",
  },
  uk: {
    title: "СПІЛЬНИЙ ЖУРНАЛ",
    online: "ОНЛАЙН",
    connecting: "ПІДКЛЮЧЕННЯ",
    offline: "ОФЛАЙН",
    placeholder: "Повідомлення групі...",
    send: "НАДІСЛАТИ",
    noMessages: "У журналі ще немає подій.",
    gm: "ГМ",
    joined: "підключився",
    left: "вийшов",
    scene: "ПОВІДОМЛЕННЯ ГМ",
    close: "ЗАКРИТИ",
    reconnect: "ПЕРЕПІДКЛЮЧИТИСЯ",
    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.",
    networkError: "Помилка мережевого з’єднання.",
    success: "УСПІХ",
    failure: "НЕВДАЧА",
    successes: "Усп",
    complications: "Ускл",
    damage: "Шкода",
    effects: "Ефекти",
    difficulty: "Складн",
    target: "ЦЧ",
    hit: "Влучання",
    combatStart: "ПОЧАТОК БОЮ",
    combatEnd: "КІНЕЦЬ БОЮ",
    turn: "ХІД",
  },
  pl: {
    title: "DZIENNIK GRUPY",
    online: "ONLINE",
    connecting: "ŁĄCZENIE",
    offline: "OFFLINE",
    placeholder: "Wiadomość do grupy...",
    send: "WYŚLIJ",
    noMessages: "Brak aktywności sesji.",
    gm: "GM",
    joined: "dołączył",
    left: "wyszedł",
    scene: "WIADOMOŚĆ GM",
    close: "ZAMKNIJ",
    reconnect: "POŁĄCZ PONOWNIE",
    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.",
    networkError: "Błąd połączenia sieciowego.",
    success: "SUKCES",
    failure: "PORAŻKA",
    successes: "Suk",
    complications: "Kompl",
    damage: "Obrażenia",
    effects: "Efekty",
    difficulty: "Trudn",
    target: "TN",
    hit: "Trafienie",
    combatStart: "START WALKI",
    combatEnd: "KONIEC WALKI",
    turn: "TURA",
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
  const outcomeLabel = roll.outcome === "success"
    ? copy.success
    : roll.outcome === "failure"
      ? copy.failure
      : "";

  return (
    <div className="session-drawer-message session-drawer-roll">
      <div className="session-drawer-message-meta">
        <strong>{item.sender || copy.gm} · {String(roll.diceType || "D20").toUpperCase()}</strong>
        <span>{formatTime(item.timestamp)}</span>
      </div>

      <div className="session-roll-card">
        <div className="session-roll-title">
          {roll.label || roll.rollType || String(roll.diceType || "D20").toUpperCase()}
          {outcomeLabel ? ` · ${outcomeLabel}` : ""}
        </div>

        {values.length > 0 && (
          <div className="session-roll-dice">
            {values.map((value, index) => <span key={`${item.id}-die-${index}`}>{String(value)}</span>)}
          </div>
        )}

        <div className="session-roll-stats">
          {!isD6 && Number.isFinite(Number(roll.successes)) && <span>{copy.successes}: {roll.successes}</span>}
          {!isD6 && Number(roll.complications || 0) > 0 && <span>{copy.complications}: {roll.complications}</span>}
          {!isD6 && Number.isFinite(Number(roll.targetNumber)) && <span>{copy.target}: {roll.targetNumber}</span>}
          {!isD6 && Number.isFinite(Number(roll.difficulty)) && <span>{copy.difficulty}: {roll.difficulty}</span>}
          {!isD6 && roll.hitLocation?.label && <span>{copy.hit}: {roll.hitLocation.label}</span>}
          {isD6 && Number.isFinite(Number(roll.totalDamage)) && <span>{copy.damage}: {roll.totalDamage}</span>}
          {isD6 && Number.isFinite(Number(roll.totalEffects)) && <span>{copy.effects}: {roll.totalEffects}</span>}
        </div>

        {isD6 && Array.isArray(roll.effects) && roll.effects.length > 0 && (
          <div className="session-feed-text">{roll.effects.join(" · ")}</div>
        )}
      </div>
    </div>
  );
}

function CombatItem({ item, copy }) {
  const label = item.event === "combat_start"
    ? copy.combatStart
    : item.event === "combat_end"
      ? copy.combatEnd
      : copy.turn;

  return (
    <div className="session-drawer-system">
      <span>{formatTime(item.timestamp)}</span>
      <strong>{label}</strong>
      {item.text && <span>{item.text}</span>}
    </div>
  );
}

function LogItem({ item, copy }) {
  if (item.type === "roll") return <RollItem item={item} copy={copy} />;
  if (item.type === "combat") return <CombatItem item={item} copy={copy} />;

  if (item.type === "system") {
    return (
      <div className="session-drawer-system">
        <span>{formatTime(item.timestamp)}</span>
        <strong>{item.sender || "Player"}</strong>
        <span>{item.event === "join" ? copy.joined : copy.left}</span>
      </div>
    );
  }

  const isScene = item.type === "scene";
  return (
    <div className={`session-drawer-message${isScene ? " is-scene" : ""}`}>
      <div className="session-drawer-message-meta">
        <strong>{isScene ? copy.scene : (item.sender || copy.gm)}</strong>
        <span>{formatTime(item.timestamp)}</span>
      </div>
      <div>{item.text || ""}</div>
    </div>
  );
}

export default function SessionChatDrawer({ session }) {
  const { i18n } = useTranslation();
  const copy = getCopy(i18n.resolvedLanguage || i18n.language);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  const items = useMemo(
    () => (session?.feed || []).filter(Boolean).slice(-120),
    [session?.feed]
  );

  const connectionState = getConnectionState(session?.status);
  const connectionLabel = copy[connectionState];
  const errorText = session?.error?.key
    ? (copy[session.error.key] || session.error.message || "")
    : (session?.error?.message || "");

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, items.length]);

  if (!session?.isActive || session?.mode !== "player") return null;

  const submit = (event) => {
    event.preventDefault();
    const text = String(draft || "").trim();
    if (!text) return;
    if (session.sendChat(text)) setDraft("");
  };

  return (
    <div className={`session-chat-drawer-shell${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="session-chat-drawer-toggle"
        style={{ top: "24%" }}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={copy.title}
      >
        <span className={`session-status-dot is-${session.status}`} />
        <span className="session-chat-toggle-label">LOG</span>
        <span className="session-chat-toggle-code">{session.sessionCode}</span>
      </button>

      <aside className="session-chat-drawer" aria-hidden={!open}>
        <header className="session-chat-drawer-head">
          <div>
            <div className="pip-bootline">PIP 2D20 NETWORK</div>
            <h2>[ {copy.title} ]</h2>
          </div>
          <button type="button" className="pip-btn" onClick={() => setOpen(false)}>{copy.close}</button>
        </header>

        <div className="session-chat-connection-strip">
          <div>
            <span className={`session-status-dot is-${session.status}`} />
            <strong>{connectionLabel}</strong>
          </div>
          <span>{session.sessionCode}</span>
        </div>

        {connectionState !== "online" && (
          <>
            {errorText && <div className="session-error">{errorText}</div>}
            {session.reconnectNow && (
              <button
                type="button"
                className="pip-btn is-primary"
                onClick={() => session.reconnectNow()}
              >
                ↻ {copy.reconnect}
              </button>
            )}
          </>
        )}

        {session.sceneMessage && (
          <div className="session-chat-scene-banner">
            <strong>{copy.scene}</strong>
            <span>{session.sceneMessage}</span>
          </div>
        )}

        <div ref={listRef} className="session-chat-drawer-list">
          {items.length
            ? items.map((item) => <LogItem key={item.id} item={item} copy={copy} />)
            : <div className="pip-logbox">{copy.noMessages}</div>}
        </div>

        <form className="session-chat-drawer-form" onSubmit={submit}>
          <input
            className="pip-input"
            value={draft}
            maxLength={500}
            placeholder={copy.placeholder}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="pip-btn is-primary" disabled={!String(draft).trim()}>{copy.send}</button>
        </form>
      </aside>
    </div>
  );
}
