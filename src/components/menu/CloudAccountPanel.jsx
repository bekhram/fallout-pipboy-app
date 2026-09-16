import React, { useEffect, useState } from "react";
import { getCloudConfigurationState } from "../../cloud/cloudConfig.js";
import {
  getCloudAuthSession,
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
  },
};

function languageCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
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
  const config = getCloudConfigurationState();

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
