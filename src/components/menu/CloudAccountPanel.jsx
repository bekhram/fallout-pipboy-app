import React, { useEffect, useState } from "react";
import { getCloudConfigurationState } from "../../cloud/cloudConfig.js";
import {
  getCloudAuthSession,
  signInWithGoogle,
  signOutCloud,
} from "../../cloud/googleAuth.js";

const COPY = {
  en: {
    title: "CLOUD ACCOUNT",
    signedOut: "Sign in with Google to prepare cloud characters and persistent campaigns.",
    signIn: "SIGN IN WITH GOOGLE",
    signOut: "SIGN OUT",
    googleReady: "Google OAuth",
    firebaseReady: "Cloud database",
    ready: "READY",
    missing: "NOT CONFIGURED",
    signedIn: "SIGNED IN",
    drive: "Google Drive access granted for Pip-2D20 files only.",
    setup: "Cloud migration scaffold is installed. Add the Google/Firebase environment variables to enable it.",
  },
  ru: {
    title: "ОБЛАЧНЫЙ АККАУНТ",
    signedOut: "Войдите через Google, чтобы подготовить облачных персонажей и постоянные кампании.",
    signIn: "ВОЙТИ ЧЕРЕЗ GOOGLE",
    signOut: "ВЫЙТИ",
    googleReady: "Google OAuth",
    firebaseReady: "Облачная база",
    ready: "ГОТОВО",
    missing: "НЕ НАСТРОЕНО",
    signedIn: "ВЫПОЛНЕН ВХОД",
    drive: "Доступ к Google Drive ограничен файлами, созданными Pip-2D20.",
    setup: "Основа облачного переноса установлена. Добавьте переменные Google/Firebase, чтобы включить систему.",
  },
  uk: {
    title: "ХМАРНИЙ АКАУНТ",
    signedOut: "Увійдіть через Google, щоб підготувати хмарних персонажів і постійні кампанії.",
    signIn: "УВІЙТИ ЧЕРЕЗ GOOGLE",
    signOut: "ВИЙТИ",
    googleReady: "Google OAuth",
    firebaseReady: "Хмарна база",
    ready: "ГОТОВО",
    missing: "НЕ НАЛАШТОВАНО",
    signedIn: "ВХІД ВИКОНАНО",
    drive: "Доступ до Google Drive обмежено файлами, створеними Pip-2D20.",
    setup: "Основа хмарного перенесення встановлена. Додайте змінні Google/Firebase, щоб увімкнути систему.",
  },
  pl: {
    title: "KONTO W CHMURZE",
    signedOut: "Zaloguj się przez Google, aby przygotować postacie w chmurze i stałe kampanie.",
    signIn: "ZALOGUJ PRZEZ GOOGLE",
    signOut: "WYLOGUJ",
    googleReady: "Google OAuth",
    firebaseReady: "Baza w chmurze",
    ready: "GOTOWE",
    missing: "NIESKONFIGUROWANE",
    signedIn: "ZALOGOWANO",
    drive: "Dostęp do Google Drive jest ograniczony do plików utworzonych przez Pip-2D20.",
    setup: "Warstwa migracji do chmury jest gotowa. Dodaj zmienne Google/Firebase, aby ją włączyć.",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

export default function CloudAccountPanel({ language = "en" }) {
  const copy = COPY[languageCode(language)];
  const [session, setSession] = useState(() => getCloudAuthSession());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const config = getCloudConfigurationState();

  useEffect(() => {
    const update = (event) => setSession(event?.detail || getCloudAuthSession());
    window.addEventListener("pip2d20:cloud-auth-changed", update);
    return () => window.removeEventListener("pip2d20:cloud-auth-changed", update);
  }, []);

  const handleSignIn = async () => {
    setBusy(true);
    setError("");
    try {
      setSession(await signInWithGoogle());
    } catch (nextError) {
      setError(nextError?.message || String(nextError));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    signOutCloud();
    setSession(null);
    setError("");
  };

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {copy.title} ]</h2>
        <span>{session ? copy.signedIn : "CLOUD"}</span>
      </div>

      <div className="pip-logbox">
        <div>{copy.googleReady}: {config.google ? copy.ready : copy.missing}</div>
        <div>{copy.firebaseReady}: {config.firebase ? copy.ready : copy.missing}</div>
        {session?.user ? (
          <>
            <div>{session.user.name || session.user.email}</div>
            <div>{session.user.email}</div>
            <div>{copy.drive}</div>
          </>
        ) : (
          <div>{config.google ? copy.signedOut : copy.setup}</div>
        )}
        {error ? <div className="pip-error">{error}</div> : null}
      </div>

      <div className="pip-actions-inline push-top">
        {session ? (
          <button type="button" className="pip-btn" onClick={handleSignOut}>{copy.signOut}</button>
        ) : (
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={handleSignIn}
            disabled={busy || !config.google}
          >
            {busy ? "..." : copy.signIn}
          </button>
        )}
      </div>
    </section>
  );
}
