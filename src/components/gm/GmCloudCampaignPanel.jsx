import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./gmCloudCampaignPanel.css";

const COPY = {
  en: {
    title: "CLOUD CAMPAIGN",
    status: "STATUS",
    lastSaved: "LAST SAVED",
    never: "Not saved yet",
    saveNow: "SAVE NOW",
    restore: "RESTORE FROM CLOUD",
    restoringConfirm: "Replace the local campaign with the cloud version and reload the app?",
    saveOk: "Campaign saved to cloud.",
    restoreOk: "Cloud campaign restored. Reloading…",
    failed: "Cloud operation failed.",
    idle: "IDLE",
    ready: "READY",
    saving: "SAVING",
    saved: "SAVED",
    restoring: "RESTORING",
    restored: "RESTORED",
    error: "ERROR",
  },
  ru: {
    title: "ОБЛАЧНАЯ КАМПАНИЯ",
    status: "СТАТУС",
    lastSaved: "ПОСЛЕДНЕЕ СОХРАНЕНИЕ",
    never: "Ещё не сохранено",
    saveNow: "СОХРАНИТЬ СЕЙЧАС",
    restore: "ВОССТАНОВИТЬ ИЗ ОБЛАКА",
    restoringConfirm: "Заменить локальную кампанию облачной версией и перезагрузить приложение?",
    saveOk: "Кампания сохранена в облако.",
    restoreOk: "Облачная кампания восстановлена. Перезагрузка…",
    failed: "Ошибка облачной операции.",
    idle: "ОЖИДАНИЕ",
    ready: "ГОТОВО",
    saving: "СОХРАНЕНИЕ",
    saved: "СОХРАНЕНО",
    restoring: "ВОССТАНОВЛЕНИЕ",
    restored: "ВОССТАНОВЛЕНО",
    error: "ОШИБКА",
  },
  uk: {
    title: "ХМАРНА КАМПАНІЯ",
    status: "СТАТУС",
    lastSaved: "ОСТАННЄ ЗБЕРЕЖЕННЯ",
    never: "Ще не збережено",
    saveNow: "ЗБЕРЕГТИ ЗАРАЗ",
    restore: "ВІДНОВИТИ З ХМАРИ",
    restoringConfirm: "Замінити локальну кампанію хмарною версією та перезавантажити застосунок?",
    saveOk: "Кампанію збережено в хмарі.",
    restoreOk: "Хмарну кампанію відновлено. Перезавантаження…",
    failed: "Помилка хмарної операції.",
    idle: "ОЧІКУВАННЯ",
    ready: "ГОТОВО",
    saving: "ЗБЕРЕЖЕННЯ",
    saved: "ЗБЕРЕЖЕНО",
    restoring: "ВІДНОВЛЕННЯ",
    restored: "ВІДНОВЛЕНО",
    error: "ПОМИЛКА",
  },
  pl: {
    title: "KAMPANIA W CHMURZE",
    status: "STATUS",
    lastSaved: "OSTATNI ZAPIS",
    never: "Jeszcze nie zapisano",
    saveNow: "ZAPISZ TERAZ",
    restore: "PRZYWRÓĆ Z CHMURY",
    restoringConfirm: "Zastąpić lokalną kampanię wersją z chmury i przeładować aplikację?",
    saveOk: "Kampania zapisana w chmurze.",
    restoreOk: "Kampania z chmury przywrócona. Przeładowywanie…",
    failed: "Operacja w chmurze nie powiodła się.",
    idle: "OCZEKIWANIE",
    ready: "GOTOWE",
    saving: "ZAPISYWANIE",
    saved: "ZAPISANO",
    restoring: "PRZYWRACANIE",
    restored: "PRZYWRÓCONO",
    error: "BŁĄD",
  },
};

function langOf(i18n) {
  const lang = String(i18n?.resolvedLanguage || i18n?.language || "en").split("-")[0];
  return COPY[lang] ? lang : "en";
}

export default function GmCloudCampaignPanel({ session }) {
  const { i18n } = useTranslation();
  const copy = COPY[langOf(i18n)];
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const statusKey = String(session?.cloudCampaignStatus || "idle");
  const statusLabel = copy[statusKey] || statusKey.toUpperCase();

  const savedLabel = useMemo(() => {
    const value = session?.cloudCampaignLastSavedAt;
    if (!value) return copy.never;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return copy.never;
    return date.toLocaleString(i18n.resolvedLanguage || i18n.language || undefined);
  }, [session?.cloudCampaignLastSavedAt, i18n.resolvedLanguage, i18n.language, copy.never]);

  if (session?.mode !== "host") return null;

  const handleSave = async () => {
    setBusy(true);
    setMessage("");
    const result = await session?.saveCloudCampaignNow?.();
    setBusy(false);
    setMessage(result?.ok ? copy.saveOk : (result?.reason || copy.failed));
  };

  const handleRestore = async () => {
    if (!window.confirm(copy.restoringConfirm)) return;
    setBusy(true);
    setMessage("");
    const result = await session?.restoreCloudCampaignNow?.();
    if (!result?.ok) {
      setBusy(false);
      setMessage(result?.reason || copy.failed);
      return;
    }
    setMessage(copy.restoreOk);
    window.setTimeout(() => window.location.reload(), 500);
  };

  return (
    <section className="gm-cloud-campaign pip-panel">
      <div className="gm-cloud-campaign__header">
        <strong>[ {copy.title} ]</strong>
        <span className={`gm-cloud-campaign__status is-${statusKey}`}>{statusLabel}</span>
      </div>
      <div className="gm-cloud-campaign__meta">
        <span>{copy.status}: {statusLabel}</span>
        <span>{copy.lastSaved}: {savedLabel}</span>
      </div>
      {session?.cloudCampaignError ? (
        <div className="gm-cloud-campaign__error">{session.cloudCampaignError}</div>
      ) : null}
      {message ? <div className="gm-cloud-campaign__message">{message}</div> : null}
      <div className="gm-cloud-campaign__actions">
        <button type="button" className="pip-btn is-primary" disabled={busy} onClick={handleSave}>
          {copy.saveNow}
        </button>
        <button type="button" className="pip-btn" disabled={busy} onClick={handleRestore}>
          {copy.restore}
        </button>
      </div>
    </section>
  );
}
