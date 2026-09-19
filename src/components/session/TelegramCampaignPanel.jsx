import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./telegramCampaignPanel.css";

const COPY = {
  en: {
    title: "TELEGRAM",
    connected: "Connected",
    notConnected: "Not connected",
    connect: "CONNECT GROUP",
    reconnect: "CONNECT ANOTHER GROUP",
    test: "TEST MESSAGE",
    disconnect: "DISCONNECT",
    instruction: "Add the Pip2D20 bot to your Telegram group, then send this command in that group:",
    expires: "Code expires in 10 minutes.",
    waiting: "Waiting for the group…",
    failed: "Telegram operation failed.",
    testSent: "Test message sent.",
    disconnected: "Telegram group disconnected.",
  },
  ru: {
    title: "TELEGRAM",
    connected: "Подключено",
    notConnected: "Не подключено",
    connect: "ПОДКЛЮЧИТЬ ГРУППУ",
    reconnect: "ПОДКЛЮЧИТЬ ДРУГУЮ ГРУППУ",
    test: "ТЕСТОВОЕ СООБЩЕНИЕ",
    disconnect: "ОТКЛЮЧИТЬ",
    instruction: "Добавьте бота Pip2D20 в Telegram-группу, затем отправьте в этой группе команду:",
    expires: "Код действует 10 минут.",
    waiting: "Ожидаю подключение группы…",
    failed: "Ошибка Telegram.",
    testSent: "Тестовое сообщение отправлено.",
    disconnected: "Telegram-группа отключена.",
  },
  uk: {
    title: "TELEGRAM",
    connected: "Підключено",
    notConnected: "Не підключено",
    connect: "ПІДКЛЮЧИТИ ГРУПУ",
    reconnect: "ПІДКЛЮЧИТИ ІНШУ ГРУПУ",
    test: "ТЕСТОВЕ ПОВІДОМЛЕННЯ",
    disconnect: "ВІДКЛЮЧИТИ",
    instruction: "Додайте бота Pip2D20 до Telegram-групи, потім надішліть у цій групі команду:",
    expires: "Код діє 10 хвилин.",
    waiting: "Очікую підключення групи…",
    failed: "Помилка Telegram.",
    testSent: "Тестове повідомлення надіслано.",
    disconnected: "Telegram-групу відключено.",
  },
  pl: {
    title: "TELEGRAM",
    connected: "Połączono",
    notConnected: "Nie połączono",
    connect: "POŁĄCZ GRUPĘ",
    reconnect: "POŁĄCZ INNĄ GRUPĘ",
    test: "WIADOMOŚĆ TESTOWA",
    disconnect: "ROZŁĄCZ",
    instruction: "Dodaj bota Pip2D20 do grupy Telegram, a następnie wyślij w tej grupie polecenie:",
    expires: "Kod wygasa po 10 minutach.",
    waiting: "Oczekiwanie na grupę…",
    failed: "Błąd Telegram.",
    testSent: "Wiadomość testowa wysłana.",
    disconnected: "Grupa Telegram rozłączona.",
  },
};

function languageOf(i18n) {
  const value = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  return COPY[value] ? value : "en";
}

function tokenKey(campaignId) {
  return `pip2d20:telegram-manage:${campaignId}`;
}

async function request(payload) {
  const response = await fetch("/api/telegram-connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.error || "TELEGRAM_FAILED");
  return data;
}

export default function TelegramCampaignPanel({ session }) {
  const { i18n } = useTranslation();
  const copy = COPY[languageOf(i18n)];
  const hostCampaignId = session?.lastSession?.role === "host"
    ? session?.lastSession?.campaignId
    : "";
  const campaignId = String(session?.campaignId || hostCampaignId || "");
  const [state, setState] = useState({ connected: false, chatTitle: "" });
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [botUsername, setBotUsername] = useState("");

  const manageToken = useMemo(() => {
    if (!campaignId) return "";
    try { return localStorage.getItem(tokenKey(campaignId)) || ""; } catch { return ""; }
  }, [campaignId, code, state.connected]);

  const refresh = async () => {
    if (!campaignId) return;
    try {
      const result = await request({ type: "status", campaignId });
      setState(result);
      if (result.connected) {
        setCode("");
        setExpiresAt(0);
      }
    } catch {
      // Keep panel usable if status is temporarily unavailable.
    }
  };

  useEffect(() => {
    void refresh();
  }, [campaignId]);

  useEffect(() => {
    if (!code || !campaignId) return undefined;
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, [code, campaignId]);

  const connect = async () => {
    if (!campaignId) return;
    setBusy(true);
    setMessage("");
    try {
      let currentToken = "";
      try { currentToken = localStorage.getItem(tokenKey(campaignId)) || ""; } catch { /* best effort */ }
      const result = await request({ type: "create", campaignId, manageToken: currentToken });
      setCode(result.code || "");
      setExpiresAt(Number(result.expiresAt || 0));
      setBotUsername(result.botUsername || "");
      if (result.manageToken) {
        try { localStorage.setItem(tokenKey(campaignId), result.manageToken); } catch { /* best effort */ }
      }
      setState((prev) => ({ ...prev, connected: Boolean(result.connected), chatTitle: result.chatTitle || prev.chatTitle }));
    } catch (error) {
      setMessage(error?.message || copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!campaignId || !manageToken) return;
    setBusy(true);
    setMessage("");
    try {
      await request({ type: "test", campaignId, manageToken });
      setMessage(copy.testSent);
    } catch (error) {
      setMessage(error?.message || copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!campaignId || !manageToken) return;
    setBusy(true);
    setMessage("");
    try {
      await request({ type: "disconnect", campaignId, manageToken });
      try { localStorage.removeItem(tokenKey(campaignId)); } catch { /* best effort */ }
      setState({ connected: false, chatTitle: "" });
      setCode("");
      setMessage(copy.disconnected);
    } catch (error) {
      setMessage(error?.message || copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const canManage = session?.mode === "host" || session?.lastSession?.role === "host";
  if (!canManage || !campaignId) return null;

  return (
    <section className="pip-panel telegram-campaign-panel">
      <div className="telegram-campaign-panel__head">
        <strong>[ {copy.title} ]</strong>
        <span className={state.connected ? "is-connected" : ""}>
          {state.connected ? `● ${copy.connected}` : `○ ${copy.notConnected}`}
        </span>
      </div>

      {state.connected && state.chatTitle ? (
        <div className="telegram-campaign-panel__group">{state.chatTitle}</div>
      ) : null}

      {code ? (
        <div className="telegram-campaign-panel__connect">
          <p>{copy.instruction}{botUsername ? ` ${botUsername}` : ""}</p>
          <button type="button" className="telegram-campaign-panel__code" onClick={() => navigator.clipboard?.writeText(`/connect ${code}`)}>
            /connect {code}
          </button>
          <small>{Date.now() < expiresAt ? copy.waiting : copy.expires}</small>
          <small>{copy.expires}</small>
        </div>
      ) : null}

      {message ? <div className="telegram-campaign-panel__message">{message}</div> : null}

      <div className="telegram-campaign-panel__actions">
        <button type="button" className="pip-btn is-primary" disabled={busy} onClick={connect}>
          {state.connected ? copy.reconnect : copy.connect}
        </button>
        {state.connected ? (
          <>
            <button type="button" className="pip-btn" disabled={busy || !manageToken} onClick={test}>{copy.test}</button>
            <button type="button" className="pip-btn" disabled={busy || !manageToken} onClick={disconnect}>{copy.disconnect}</button>
          </>
        ) : null}
      </div>
    </section>
  );
}
