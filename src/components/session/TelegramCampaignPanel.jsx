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
    restoring: "Restoring campaign connection…",
    noCampaign: "Open or resume a GM session once to connect Telegram.",
    connectedElsewhere: "This group is already connected to the campaign. The connection is shared across browser and app.",
    pairTitle: "LINK ANOTHER DEVICE",
    pairGenerate: "CREATE LINK CODE",
    pairApply: "LINK THIS DEVICE",
    pairPlaceholder: "APP-XXXXXX",
    pairHelp: "Create a code on the device where Telegram already works, then enter it on the other device.",
    pairCreated: "Enter this code on the other device. It expires in 10 minutes.",
    pairSuccess: "Telegram connection transferred to this device.",
    pairFailed: "Could not link this device.",
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
    restoring: "Восстанавливаю кампанию…",
    noCampaign: "Откройте или возобновите GM-сессию один раз, чтобы подключить Telegram.",
    connectedElsewhere: "Эта группа уже подключена к кампании. Подключение общее для браузера и приложения.",
    pairTitle: "СВЯЗАТЬ ДРУГОЕ УСТРОЙСТВО",
    pairGenerate: "СОЗДАТЬ КОД ПЕРЕНОСА",
    pairApply: "ПОДКЛЮЧИТЬ ЭТО УСТРОЙСТВО",
    pairPlaceholder: "APP-XXXXXX",
    pairHelp: "Создайте код там, где Telegram уже работает, и введите его на другом устройстве.",
    pairCreated: "Введите этот код на другом устройстве. Он действует 10 минут.",
    pairSuccess: "Telegram-подключение перенесено на это устройство.",
    pairFailed: "Не удалось связать устройство.",
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
    restoring: "Відновлюю кампанію…",
    noCampaign: "Відкрийте або відновіть GM-сесію один раз, щоб підключити Telegram.",
    connectedElsewhere: "Ця група вже підключена до кампанії. Підключення спільне для браузера та застосунку.",
    pairTitle: "ПРИВ'ЯЗАТИ ІНШИЙ ПРИСТРІЙ",
    pairGenerate: "СТВОРИТИ КОД ПЕРЕНЕСЕННЯ",
    pairApply: "ПІДКЛЮЧИТИ ЦЕЙ ПРИСТРІЙ",
    pairPlaceholder: "APP-XXXXXX",
    pairHelp: "Створіть код там, де Telegram уже працює, і введіть його на іншому пристрої.",
    pairCreated: "Введіть цей код на іншому пристрої. Він діє 10 хвилин.",
    pairSuccess: "Telegram-підключення перенесено на цей пристрій.",
    pairFailed: "Не вдалося прив'язати пристрій.",
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
    restoring: "Przywracanie kampanii…",
    noCampaign: "Otwórz lub wznów sesję MG jeden raz, aby połączyć Telegram.",
    connectedElsewhere: "Ta grupa jest już połączona z kampanią. Połączenie jest wspólne dla przeglądarki i aplikacji.",
    pairTitle: "POŁĄCZ INNE URZĄDZENIE",
    pairGenerate: "UTWÓRZ KOD ŁĄCZENIA",
    pairApply: "POŁĄCZ TO URZĄDZENIE",
    pairPlaceholder: "APP-XXXXXX",
    pairHelp: "Utwórz kod na urządzeniu, na którym Telegram już działa, i wpisz go na drugim urządzeniu.",
    pairCreated: "Wpisz ten kod na drugim urządzeniu. Wygasa po 10 minutach.",
    pairSuccess: "Połączenie Telegram zostało przeniesione na to urządzenie.",
    pairFailed: "Nie udało się połączyć urządzenia.",
  },
};

function languageOf(i18n) {
  const value = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  return COPY[value] ? value : "en";
}

const PAIRED_CAMPAIGN_KEY = "pip2d20:telegram-paired-campaign";

function apiUrl(path) {
  try {
    const native = Boolean(
      window.Capacitor?.isNativePlatform?.()
      || window.location.protocol === "capacitor:"
      || window.location.protocol === "ionic:"
    );
    return native ? `https://www.pip-2d20.fun${path}` : path;
  } catch {
    return path;
  }
}

function tokenKey(campaignId) {
  return `pip2d20:telegram-manage:${campaignId}`;
}

function readPairedCampaignId() {
  try { return localStorage.getItem(PAIRED_CAMPAIGN_KEY) || ""; } catch { return ""; }
}

async function request(payload) {
  const response = await fetch(apiUrl("/api/telegram-connect"), {
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
  const [pairedCampaignId, setPairedCampaignId] = useState(() => readPairedCampaignId());
  const campaignId = String(
    session?.campaignId
    || session?.roomState?.campaignId
    || hostCampaignId
    || pairedCampaignId
    || ""
  );
  const [state, setState] = useState({ connected: false, chatTitle: "" });
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [pairInput, setPairInput] = useState("");

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
        try {
          localStorage.setItem(PAIRED_CAMPAIGN_KEY, campaignId);
        } catch { /* best effort */ }
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
        try {
          localStorage.setItem(tokenKey(campaignId), result.manageToken);
          localStorage.setItem(PAIRED_CAMPAIGN_KEY, campaignId);
        } catch { /* best effort */ }
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

  const canManage = session?.mode === "host" || session?.lastSession?.role === "host" || Boolean(manageToken);

  const createPairCode = async () => {
    if (!campaignId || !manageToken) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await request({ type: "pair-create", campaignId, manageToken });
      setPairCode(result.code || "");
      setMessage(copy.pairCreated);
    } catch (error) {
      setMessage(error?.message || copy.pairFailed);
    } finally {
      setBusy(false);
    }
  };

  const consumePairCode = async () => {
    const codeValue = String(pairInput || "").trim().toUpperCase();
    if (!codeValue) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await request({ type: "pair-consume", code: codeValue });
      const nextCampaignId = String(result.campaignId || "");
      if (!nextCampaignId || !result.manageToken) throw new Error("PAIR_FAILED");
      try {
        localStorage.setItem(PAIRED_CAMPAIGN_KEY, nextCampaignId);
        localStorage.setItem(tokenKey(nextCampaignId), result.manageToken);
      } catch { /* best effort */ }
      setPairedCampaignId(nextCampaignId);
      setPairInput("");
      setPairCode("");
      setState({
        connected: Boolean(result.connected),
        chatTitle: result.chatTitle || "",
        chatType: result.chatType || "",
      });
      setMessage(copy.pairSuccess);
    } catch (error) {
      setMessage(error?.message || copy.pairFailed);
    } finally {
      setBusy(false);
    }
  };

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

      <div className="telegram-campaign-panel__connect">
        <strong>{copy.pairTitle}</strong>
        <p>{copy.pairHelp}</p>
        {pairCode ? (
          <button
            type="button"
            className="telegram-campaign-panel__code"
            onClick={() => navigator.clipboard?.writeText(pairCode)}
          >
            {pairCode}
          </button>
        ) : null}
        {state.connected && manageToken ? (
          <button type="button" className="pip-btn" disabled={busy} onClick={createPairCode}>
            {copy.pairGenerate}
          </button>
        ) : null}
        <div className="telegram-campaign-panel__actions">
          <input
            className="pip-inline-input"
            value={pairInput}
            placeholder={copy.pairPlaceholder}
            onChange={(event) => setPairInput(event.target.value.toUpperCase())}
          />
          <button type="button" className="pip-btn is-primary" disabled={busy || !pairInput.trim()} onClick={consumePairCode}>
            {copy.pairApply}
          </button>
        </div>
      </div>

      {state.connected && !manageToken ? (
        <div className="telegram-campaign-panel__message">{copy.connectedElsewhere}</div>
      ) : null}

      <div className="telegram-campaign-panel__actions">
        {!state.connected && canManage ? (
          <button type="button" className="pip-btn is-primary" disabled={busy} onClick={connect}>
            {copy.connect}
          </button>
        ) : null}
        {state.connected && manageToken && canManage ? (
          <>
            <button type="button" className="pip-btn is-primary" disabled={busy} onClick={connect}>{copy.reconnect}</button>
            <button type="button" className="pip-btn" disabled={busy} onClick={test}>{copy.test}</button>
            <button type="button" className="pip-btn" disabled={busy} onClick={disconnect}>{copy.disconnect}</button>
          </>
        ) : null}
      </div>
    </section>
  );
}
