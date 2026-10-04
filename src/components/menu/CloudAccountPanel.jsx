import React, { useEffect, useState } from "react";
import { getCloudConfigurationState } from "../../cloud/cloudConfig.js";
import {
  getCloudAuthSession,
  importCloudAuthSession,
  isNativeAppRuntime,
  signInWithGoogle,
  signOutCloud,
} from "../../cloud/googleAuth.js";
import {
  backupCharacterToDrive,
  readDriveJson,
  upsertDriveJson,
} from "../../cloud/googleDriveStore.js";
import { getActiveCharacterRecord } from "../../utils/characterProfiles.js";

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
    testDrive: "TEST GOOGLE DRIVE",
    testingDrive: "TESTING DRIVE...",
    driveTestOk: "Google Drive test passed. Pip2D20/test.json was written and read successfully.",
    driveTestFailed: "Google Drive test failed",
    saveCharacter: "BACK UP CHARACTER",
    savingCharacter: "BACKING UP...",
    noCharacter: "No active character found.",
    characterSaved: "Character backup saved to Google Drive",
    characterSaveFailed: "Character backup failed",
    linkDevice: "LINK ANDROID APP",
    createLinkCode: "CREATE GOOGLE LINK CODE",
    enterLinkCode: "LINK THIS DEVICE",
    linkPlaceholder: "GOOG-XXXXXX",
    linkHelp: "Create a code in the browser where Google is already connected, then enter it in the Android app.",
    linkCreated: "Enter this code in the Android app. It expires in 10 minutes.",
    linkSuccess: "Google account connected on this device.",
    linkFailed: "Could not link Google account.",
    nativeHint: "Google sign-in inside the Android WebView is not supported reliably. Link the app from your signed-in browser instead.",
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
    testDrive: "ПРОВЕРИТЬ GOOGLE DRIVE",
    testingDrive: "ПРОВЕРКА DRIVE...",
    driveTestOk: "Проверка Google Drive успешна. Pip2D20/test.json записан и прочитан.",
    driveTestFailed: "Ошибка проверки Google Drive",
    saveCharacter: "СОХРАНИТЬ ПЕРСОНАЖА В DRIVE",
    savingCharacter: "СОХРАНЕНИЕ...",
    noCharacter: "Активный персонаж не найден.",
    characterSaved: "Резервная копия персонажа сохранена в Google Drive",
    characterSaveFailed: "Не удалось сохранить персонажа",
    linkDevice: "ПОДКЛЮЧИТЬ ANDROID-ПРИЛОЖЕНИЕ",
    createLinkCode: "СОЗДАТЬ КОД GOOGLE",
    enterLinkCode: "ПОДКЛЮЧИТЬ ЭТО УСТРОЙСТВО",
    linkPlaceholder: "GOOG-XXXXXX",
    linkHelp: "Создайте код в браузере, где Google уже подключён, затем введите его в Android-приложении.",
    linkCreated: "Введите этот код в Android-приложении. Он действует 10 минут.",
    linkSuccess: "Google-аккаунт подключён на этом устройстве.",
    linkFailed: "Не удалось подключить Google-аккаунт.",
    nativeHint: "Вход Google внутри Android WebView работает нестабильно. Подключите приложение через код из браузера.",
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
    testDrive: "ПЕРЕВІРИТИ GOOGLE DRIVE",
    testingDrive: "ПЕРЕВІРКА DRIVE...",
    driveTestOk: "Перевірка Google Drive успішна. Pip2D20/test.json записано та прочитано.",
    driveTestFailed: "Помилка перевірки Google Drive",
    saveCharacter: "ЗБЕРЕГТИ ПЕРСОНАЖА В DRIVE",
    savingCharacter: "ЗБЕРЕЖЕННЯ...",
    noCharacter: "Активного персонажа не знайдено.",
    characterSaved: "Резервну копію персонажа збережено в Google Drive",
    characterSaveFailed: "Не вдалося зберегти персонажа",
    linkDevice: "ПІДКЛЮЧИТИ ANDROID-ЗАСТОСУНОК",
    createLinkCode: "СТВОРИТИ КОД GOOGLE",
    enterLinkCode: "ПІДКЛЮЧИТИ ЦЕЙ ПРИСТРІЙ",
    linkPlaceholder: "GOOG-XXXXXX",
    linkHelp: "Створіть код у браузері, де Google уже підключено, потім введіть його в Android-застосунку.",
    linkCreated: "Введіть цей код в Android-застосунку. Він діє 10 хвилин.",
    linkSuccess: "Google-акаунт підключено на цьому пристрої.",
    linkFailed: "Не вдалося підключити Google-акаунт.",
    nativeHint: "Вхід Google всередині Android WebView працює нестабільно. Підключіть застосунок через код із браузера.",
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
    testDrive: "TESTUJ GOOGLE DRIVE",
    testingDrive: "TESTOWANIE DRIVE...",
    driveTestOk: "Test Google Drive zakończony powodzeniem. Pip2D20/test.json został zapisany i odczytany.",
    driveTestFailed: "Test Google Drive nie powiódł się",
    saveCharacter: "ZAPISZ POSTAĆ W DRIVE",
    savingCharacter: "ZAPISYWANIE...",
    noCharacter: "Nie znaleziono aktywnej postaci.",
    characterSaved: "Kopia zapasowa postaci została zapisana w Google Drive",
    characterSaveFailed: "Nie udało się zapisać postaci",
    linkDevice: "POŁĄCZ APLIKACJĘ ANDROID",
    createLinkCode: "UTWÓRZ KOD GOOGLE",
    enterLinkCode: "POŁĄCZ TO URZĄDZENIE",
    linkPlaceholder: "GOOG-XXXXXX",
    linkHelp: "Utwórz kod w przeglądarce, w której Google jest już połączony, a następnie wpisz go w aplikacji Android.",
    linkCreated: "Wpisz ten kod w aplikacji Android. Wygasa po 10 minutach.",
    linkSuccess: "Konto Google połączono na tym urządzeniu.",
    linkFailed: "Nie udało się połączyć konta Google.",
    nativeHint: "Logowanie Google wewnątrz Android WebView nie działa niezawodnie. Połącz aplikację kodem z przeglądarki.",
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function cloudApiUrl(path) {
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

function safeCharacterFileId(value) {
  return String(value || "active").replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export default function CloudAccountPanel({ language = "en" }) {
  const copy = COPY[languageCode(language)];
  const [session, setSession] = useState(() => getCloudAuthSession());
  const [busy, setBusy] = useState(false);
  const [driveBusy, setDriveBusy] = useState(false);
  const [characterBusy, setCharacterBusy] = useState(false);
  const [error, setError] = useState("");
  const [driveStatus, setDriveStatus] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const config = getCloudConfigurationState();
  const nativeApp = isNativeAppRuntime();

  useEffect(() => {
    const update = (event) => setSession(event?.detail || getCloudAuthSession());
    window.addEventListener("pip2d20:cloud-auth-changed", update);
    return () => window.removeEventListener("pip2d20:cloud-auth-changed", update);
  }, []);

  const handleSignIn = async () => {
    setBusy(true);
    setError("");
    setDriveStatus("");
    try {
      setSession(await signInWithGoogle());
    } catch (nextError) {
      setError(nextError?.message || String(nextError));
    } finally {
      setBusy(false);
    }
  };

  const cloudLinkRequest = async (payload) => {
    const response = await fetch(cloudApiUrl("/api/cloud-device-link"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || copy.linkFailed);
    }
    return data;
  };

  const createLinkCode = async () => {
    if (!session) return;
    setLinkBusy(true);
    setError("");
    setDriveStatus("");
    try {
      const result = await cloudLinkRequest({ type: "create", session });
      setLinkCode(result.code || "");
      setDriveStatus(copy.linkCreated);
    } catch (nextError) {
      setError(`${copy.linkFailed}: ${nextError?.message || String(nextError)}`);
    } finally {
      setLinkBusy(false);
    }
  };

  const consumeLinkCode = async () => {
    const code = String(linkInput || "").trim().toUpperCase();
    if (!code) return;
    setLinkBusy(true);
    setError("");
    setDriveStatus("");
    try {
      const result = await cloudLinkRequest({ type: "consume", code });
      const nextSession = importCloudAuthSession(result.session);
      setSession(nextSession);
      setLinkInput("");
      setLinkCode("");
      setDriveStatus(copy.linkSuccess);
    } catch (nextError) {
      setError(`${copy.linkFailed}: ${nextError?.message || String(nextError)}`);
    } finally {
      setLinkBusy(false);
    }
  };

  const handleSignOut = () => {
    signOutCloud();
    setSession(null);
    setError("");
    setDriveStatus("");
  };

  const handleDriveTest = async () => {
    setDriveBusy(true);
    setError("");
    setDriveStatus("");
    try {
      const marker = `pip2d20-drive-test-${Date.now()}`;
      await upsertDriveJson("test.json", {
        source: "Pip-2D20",
        type: "drive-test",
        marker,
        user: session?.user?.email || "",
        createdAt: new Date().toISOString(),
      });
      const saved = await readDriveJson("test.json");
      if (!saved || saved.marker !== marker) {
        throw new Error("Drive read-back verification failed.");
      }
      setDriveStatus(copy.driveTestOk);
    } catch (nextError) {
      setError(`${copy.driveTestFailed}: ${nextError?.message || String(nextError)}`);
    } finally {
      setDriveBusy(false);
    }
  };

  const handleCharacterBackup = async () => {
    setCharacterBusy(true);
    setError("");
    setDriveStatus("");
    try {
      const record = getActiveCharacterRecord();
      if (!record?.data) throw new Error(copy.noCharacter);

      await backupCharacterToDrive(record.data, { characterId: record.id });

      const fileName = `character-${safeCharacterFileId(record.id)}.json`;
      const saved = await readDriveJson(fileName);
      if (!saved?.character) {
        throw new Error("Drive read-back verification failed.");
      }

      setDriveStatus(`${copy.characterSaved}: Pip2D20/${fileName}`);
    } catch (nextError) {
      setError(`${copy.characterSaveFailed}: ${nextError?.message || String(nextError)}`);
    } finally {
      setCharacterBusy(false);
    }
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
        {driveStatus ? <div>{driveStatus}</div> : null}
        {error ? <div className="pip-error">{error}</div> : null}
      </div>

      <div className="pip-actions-inline push-top">
        {session ? (
          <>
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={handleCharacterBackup}
              disabled={characterBusy || driveBusy}
            >
              {characterBusy ? copy.savingCharacter : copy.saveCharacter}
            </button>
            <button
              type="button"
              className="pip-btn"
              onClick={handleDriveTest}
              disabled={driveBusy || characterBusy}
            >
              {driveBusy ? copy.testingDrive : copy.testDrive}
            </button>
            <button type="button" className="pip-btn" onClick={handleSignOut}>{copy.signOut}</button>
          </>
        ) : nativeApp ? (
          <div style={{ display: "grid", gap: "8px", width: "100%" }}>
            <div className="pip-logbox">{copy.nativeHint}</div>
            <input
              className="pip-inline-input"
              value={linkInput}
              placeholder={copy.linkPlaceholder}
              onChange={(event) => setLinkInput(event.target.value.toUpperCase())}
            />
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={consumeLinkCode}
              disabled={linkBusy || !linkInput.trim()}
            >
              {linkBusy ? "..." : copy.enterLinkCode}
            </button>
          </div>
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

      {!nativeApp && session ? (
        <div className="pip-logbox push-top" style={{ display: "grid", gap: "8px" }}>
          <strong>{copy.linkDevice}</strong>
          <span>{copy.linkHelp}</span>
          {linkCode ? (
            <button
              type="button"
              className="pip-btn"
              onClick={() => navigator.clipboard?.writeText(linkCode)}
            >
              {linkCode}
            </button>
          ) : null}
          <button
            type="button"
            className="pip-btn"
            disabled={linkBusy}
            onClick={createLinkCode}
          >
            {linkBusy ? "..." : copy.createLinkCode}
          </button>
        </div>
      ) : null}
    </section>
  );
}
