import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const COPY = {
  en: {
    title: "GROUP CHAT",
    online: "ONLINE",
    connecting: "CONNECTING",
    offline: "OFFLINE",
    placeholder: "Message the group...",
    send: "SEND",
    noMessages: "No group messages yet.",
    gm: "GM",
    joined: "joined",
    left: "left",
    scene: "GM MESSAGE",
    close: "CLOSE",
    reconnect: "RECONNECT",
    hostNotFound: "GM session not found or is offline.",
    networkError: "Network connection error.",
  },
  ru: {
    title: "ЧАТ ГРУППЫ",
    online: "ОНЛАЙН",
    connecting: "ПОДКЛЮЧЕНИЕ",
    offline: "ОФЛАЙН",
    placeholder: "Сообщение группе...",
    send: "ОТПРАВИТЬ",
    noMessages: "В чате пока нет сообщений.",
    gm: "ГМ",
    joined: "подключился",
    left: "вышел",
    scene: "СООБЩЕНИЕ ГМ",
    close: "ЗАКРЫТЬ",
    reconnect: "ПЕРЕПОДКЛЮЧИТЬСЯ",
    hostNotFound: "Сессия ГМ не найдена или ГМ не в сети.",
    networkError: "Ошибка сетевого соединения.",
  },
  uk: {
    title: "ЧАТ ГРУПИ",
    online: "ОНЛАЙН",
    connecting: "ПІДКЛЮЧЕННЯ",
    offline: "ОФЛАЙН",
    placeholder: "Повідомлення групі...",
    send: "НАДІСЛАТИ",
    noMessages: "У чаті ще немає повідомлень.",
    gm: "ГМ",
    joined: "підключився",
    left: "вийшов",
    scene: "ПОВІДОМЛЕННЯ ГМ",
    close: "ЗАКРИТИ",
    reconnect: "ПЕРЕПІДКЛЮЧИТИСЯ",
    hostNotFound: "Сесію ГМ не знайдено або ГМ не в мережі.",
    networkError: "Помилка мережевого з’єднання.",
  },
  pl: {
    title: "CZAT GRUPY",
    online: "ONLINE",
    connecting: "ŁĄCZENIE",
    offline: "OFFLINE",
    placeholder: "Wiadomość do grupy...",
    send: "WYŚLIJ",
    noMessages: "Brak wiadomości grupowych.",
    gm: "GM",
    joined: "dołączył",
    left: "wyszedł",
    scene: "WIADOMOŚĆ GM",
    close: "ZAMKNIJ",
    reconnect: "POŁĄCZ PONOWNIE",
    hostNotFound: "Sesja GM nie istnieje lub GM jest offline.",
    networkError: "Błąd połączenia sieciowego.",
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

function ChatItem({ item, copy }) {
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
      <div>{item.text}</div>
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
    () => (session?.feed || [])
      .filter((item) => item && ["chat", "scene", "system"].includes(item.type))
      .slice(-50),
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
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={copy.title}
      >
        <span className={`session-status-dot is-${session.status}`} />
        <span className="session-chat-toggle-label">CHAT</span>
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
            ? items.map((item) => <ChatItem key={item.id} item={item} copy={copy} />)
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
