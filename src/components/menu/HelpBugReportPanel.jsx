import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SheetIcon from "../layout/SheetIcon.jsx";

const COPY = {
  en: {
    help: "HELP",
    intro: "Need help or found a bug?",
    open: "REPORT A BUG",
    close: "CLOSE",
    title: "Bug title",
    description: "What happened?",
    contact: "Your email (optional)",
    screenshot: "Attach screenshot",
    remove: "Remove screenshot",
    send: "SEND REPORT",
    sending: "SENDING…",
    sent: "Bug report sent. Thank you.",
    failed: "Could not send the report.",
    tooLarge: "Screenshot is too large. Maximum 2.5 MB.",
    badType: "Use PNG, JPG, or WebP.",
    required: "Add a title and description.",
  },
  ru: {
    help: "ПОМОЩЬ",
    intro: "Нужна помощь или нашли баг?",
    open: "ОТПРАВИТЬ БАГ-РЕПОРТ",
    close: "ЗАКРЫТЬ",
    title: "Название бага",
    description: "Что произошло?",
    contact: "Ваш email (необязательно)",
    screenshot: "Прикрепить скриншот",
    remove: "Удалить скриншот",
    send: "ОТПРАВИТЬ РЕПОРТ",
    sending: "ОТПРАВКА…",
    sent: "Баг-репорт отправлен. Спасибо.",
    failed: "Не удалось отправить репорт.",
    tooLarge: "Скриншот слишком большой. Максимум 2,5 МБ.",
    badType: "Используйте PNG, JPG или WebP.",
    required: "Добавьте название и описание.",
  },
  uk: {
    help: "ДОПОМОГА",
    intro: "Потрібна допомога або знайшли баг?",
    open: "НАДІСЛАТИ БАГ-РЕПОРТ",
    close: "ЗАКРИТИ",
    title: "Назва бага",
    description: "Що сталося?",
    contact: "Ваш email (необов’язково)",
    screenshot: "Додати скриншот",
    remove: "Видалити скриншот",
    send: "НАДІСЛАТИ РЕПОРТ",
    sending: "НАДСИЛАННЯ…",
    sent: "Баг-репорт надіслано. Дякуємо.",
    failed: "Не вдалося надіслати репорт.",
    tooLarge: "Скриншот завеликий. Максимум 2,5 МБ.",
    badType: "Використовуйте PNG, JPG або WebP.",
    required: "Додайте назву й опис.",
  },
  pl: {
    help: "POMOC",
    intro: "Potrzebujesz pomocy lub znalazłeś błąd?",
    open: "ZGŁOŚ BŁĄD",
    close: "ZAMKNIJ",
    title: "Tytuł błędu",
    description: "Co się stało?",
    contact: "Twój email (opcjonalnie)",
    screenshot: "Dołącz zrzut ekranu",
    remove: "Usuń zrzut",
    send: "WYŚLIJ ZGŁOSZENIE",
    sending: "WYSYŁANIE…",
    sent: "Zgłoszenie wysłane. Dziękujemy.",
    failed: "Nie udało się wysłać zgłoszenia.",
    tooLarge: "Zrzut jest za duży. Maksymalnie 2,5 MB.",
    badType: "Użyj PNG, JPG lub WebP.",
    required: "Dodaj tytuł i opis.",
  },
};

const MAX_BYTES = 2_500_000;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function languageOf(i18n) {
  const value = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  return COPY[value] ? value : "en";
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export default function HelpBugReportPanel() {
  const { i18n } = useTranslation();
  const copy = COPY[languageOf(i18n)];
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const pickScreenshot = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!TYPES.has(file.type)) {
      setMessage(copy.badType);
      return;
    }
    if (file.size > MAX_BYTES) {
      setMessage(copy.tooLarge);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setScreenshot({ name: file.name, type: file.type, dataUrl });
      setPreview(dataUrl);
      setMessage("");
    } catch {
      setMessage(copy.failed);
    }
  };

  const clearScreenshot = () => {
    setScreenshot(null);
    setPreview("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 8) {
      setMessage(copy.required);
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          contact: contact.trim(),
          language: i18n.resolvedLanguage || i18n.language || "en",
          screenshotName: screenshot?.name || "",
          screenshotType: screenshot?.type || "",
          screenshotData: screenshot?.dataUrl || "",
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight} @ ${window.devicePixelRatio || 1}x`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) throw new Error(data?.error || "SEND_FAILED");
      setTitle("");
      setDescription("");
      setContact("");
      clearScreenshot();
      setMessage(copy.sent);
    } catch (error) {
      const code = String(error?.message || "");
      setMessage(
        code === "SCREENSHOT_TOO_LARGE" ? copy.tooLarge
          : code === "INVALID_SCREENSHOT_TYPE" ? copy.badType
            : copy.failed
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="home-help-report">
      <div className="home-help-report__head">
        <div>
          <h3><SheetIcon name="help" />{copy.help}</h3>
          <p>{copy.intro}</p>
        </div>
        <button type="button" className="pip-btn" onClick={() => setOpen((value) => !value)}>
          {open ? copy.close : copy.open}
        </button>
      </div>

      {open ? (
        <form className="home-bug-form" onSubmit={submit}>
          <label>
            <span>{copy.title}</span>
            <input value={title} maxLength={140} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span>{copy.description}</span>
            <textarea rows="6" maxLength={6000} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            <span>{copy.contact}</span>
            <input type="email" inputMode="email" autoComplete="email" maxLength={240} value={contact} onChange={(event) => setContact(event.target.value)} />
          </label>

          <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={pickScreenshot} />
          <div className="home-bug-screenshot">
            <button type="button" className="pip-btn" onClick={() => inputRef.current?.click()}>
              <SheetIcon name="image" />{copy.screenshot}
            </button>
            {screenshot ? (
              <button type="button" className="pip-btn" onClick={clearScreenshot}>{copy.remove}</button>
            ) : null}
          </div>
          {preview ? <img className="home-bug-preview" src={preview} alt="" /> : null}

          {message ? <div className="home-bug-message" role="status">{message}</div> : null}

          <button type="submit" className="pip-btn is-primary home-bug-submit" disabled={busy}>
            {busy ? copy.sending : copy.send}
          </button>
        </form>
      ) : null}
    </section>
  );
}
