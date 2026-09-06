import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import TrackedButton from "../shared/TrackedButton.jsx";
import QuickCharacterWizard, {
  getCreationCopy,
} from "../characterCreation/QuickCharacterWizard.jsx";
import AppDownloadPanel from "./AppDownloadPanel.jsx";
import GmWorkspace from "../gm/GmWorkspace.jsx";

const STORAGE_KEY = "fallout_pipboy_v4_last_character";

const GM_MENU_COPY = {
  en: { open: "GM PANEL", back: "BACK TO MENU", workspace: "GAME MASTER WORKSPACE" },
  ru: { open: "ПАНЕЛЬ ГМ", back: "НАЗАД В МЕНЮ", workspace: "РАБОЧЕЕ МЕСТО ГМ" },
  uk: { open: "ПАНЕЛЬ ГМ", back: "НАЗАД У МЕНЮ", workspace: "РОБОЧЕ МІСЦЕ ГМ" },
  pl: { open: "PANEL MG", back: "WRÓĆ DO MENU", workspace: "STANOWISKO MG" },
};

function getMenuLanguage(value) {
  const language = String(value || "en").split("-")[0];
  return GM_MENU_COPY[language] ? language : "en";
}

function readSavedCharacter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw)?.data || null : null;
  } catch {
    return null;
  }
}

export default function MenuScreen({
  hasCharacter,
  onNewCharacter,
  onContinue,
  onImportClick,
  onOpenSession,
  saveMeta
}) {
  const { t, i18n } = useTranslation();
  const copy = getCreationCopy(i18n.resolvedLanguage || i18n.language);
  const gmCopy = GM_MENU_COPY[getMenuLanguage(i18n.resolvedLanguage || i18n.language)];
  const [showCreationMode, setShowCreationMode] = useState(false);
  const [showQuickCreation, setShowQuickCreation] = useState(false);
  const [showGmWorkspace, setShowGmWorkspace] = useState(false);
  const [gmCharacter, setGmCharacter] = useState(null);

  const handleNewCharacterClick = () => {
    setShowCreationMode(true);
  };

  const handleBlankCharacter = () => {
    setShowCreationMode(false);
    onNewCharacter?.();
  };

  const handleQuickCharacter = () => {
    setShowCreationMode(false);
    setShowQuickCreation(true);
  };

  const handleQuickCancel = () => {
    setShowQuickCreation(false);
    setShowCreationMode(true);
  };

  const handleQuickComplete = (character) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          data: character,
        })
      );
      setShowQuickCreation(false);
      setShowCreationMode(false);
      onContinue?.();
    } catch (error) {
      console.error("Could not create quick character:", error);
    }
  };

  const handleOpenGmWorkspace = () => {
    setGmCharacter(readSavedCharacter());
    setShowGmWorkspace(true);
  };

  const updateGmCharacter = (updater) => {
    setGmCharacter((previous) => {
      const next = typeof updater === "function" ? updater(previous) : updater;
      if (!next || typeof next !== "object") return previous;

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...(saved && typeof saved === "object" ? saved : {}),
            updatedAt: new Date().toISOString(),
            data: next,
          })
        );
      } catch {
        // GM workspace can still work without persistent local storage.
      }

      return next;
    });
  };

  return (
    <>
      <section className="pip-screen-grid">
        <section className="pip-panel pip-block pip-hero">
          <div className="pip-bootline">{t("menuScreen.bootline")}</div>
          <h1 className="pip-title">PIP 2D20 MK IV</h1>
          <p className="pip-subtitle">{t("menuScreen.subtitle")}</p>

          <div className="pip-actions-inline push-top">
            <TrackedButton
              type="button"
              className="pip-btn is-primary"
              onClick={handleNewCharacterClick}
              id="btn_new_character"
            >
              {t("menuScreen.newCharacter")}
            </TrackedButton>

            <TrackedButton
              type="button"
              className="pip-btn"
              onClick={onImportClick}
              id="btn_import_json"
            >
              {t("menuScreen.importJson")}
            </TrackedButton>

            <TrackedButton
              type="button"
              className="pip-btn is-primary"
              onClick={onOpenSession}
              id="btn_gm_session"
            >
              GM / SESSION
            </TrackedButton>

            <TrackedButton
              type="button"
              className="pip-btn is-primary"
              onClick={handleOpenGmWorkspace}
              id="btn_gm_panel"
            >
              {gmCopy.open}
            </TrackedButton>
          </div>
        </section>

        <section className="pip-panel pip-block">
          <div className="pip-head">
            <h2>[ {t("menuScreen.lastRecord")} ]</h2>
            <span>{t("menuScreen.localMemory")}</span>
          </div>

          {hasCharacter ? (
            <>
              <div className="pip-logbox">
                <div>
                  {t("menuScreen.name")}:{" "}
                  {saveMeta?.characterName || t("menuScreen.unnamed")}
                </div>
                <div>
                  {t("menuScreen.origin")}:{" "}
                  {saveMeta?.origin || t("menuScreen.unknown")}
                </div>
                <div>
                  {t("menuScreen.level")}: {saveMeta?.level || "1"}
                </div>
                <div>
                  {t("menuScreen.updated")}:{" "}
                  {saveMeta?.updatedAt
                    ? new Date(saveMeta.updatedAt).toLocaleString()
                    : t("menuScreen.unknown")}
                </div>
              </div>

              <div className="pip-actions-inline push-top">
                <TrackedButton
                  type="button"
                  className="pip-btn is-primary"
                  onClick={onContinue}
                  id="btn_continue_game"
                >
                  {t("menuScreen.continue")}
                </TrackedButton>
              </div>
            </>
          ) : (
            <div className="pip-logbox">
              {t("menuScreen.noSavedCharacter")}
            </div>
          )}
        </section>

        <AppDownloadPanel />
      </section>

      {showCreationMode && (
        <div className="pip-modal-backdrop quick-create-backdrop">
          <div className="pip-modal pip-panel" style={{ width: "min(680px, 100%)" }}>
            <div className="pip-head">
              <div>
                <h2>[ {copy.chooseMode} ]</h2>
                <span>{copy.chooseModeDesc}</span>
              </div>
              <button
                type="button"
                className="pip-btn"
                onClick={() => setShowCreationMode(false)}
              >
                ✕
              </button>
            </div>

            <div className="quick-create-mode-grid">
              <button
                type="button"
                className="pip-btn quick-create-mode-card"
                onClick={handleBlankCharacter}
              >
                <strong>{copy.blank}</strong>
                <span>{copy.blankDesc}</span>
              </button>

              <button
                type="button"
                className="pip-btn is-primary quick-create-mode-card"
                onClick={handleQuickCharacter}
              >
                <strong>{copy.quick}</strong>
                <span>{copy.quickDesc}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickCharacterWizard
        open={showQuickCreation}
        onCancel={handleQuickCancel}
        onComplete={handleQuickComplete}
      />

      {showGmWorkspace && (
        <div
          className="gm-menu-workspace"
          role="dialog"
          aria-modal="true"
          aria-label={gmCopy.workspace}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 12000,
            overflow: "auto",
            background: "var(--pip-bg, #071008)",
            padding: "12px",
          }}
        >
          <style>{`.gm-menu-workspace .gm-panel__map-button { display: none !important; }`}</style>
          <div
            className="pip-panel"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
              padding: "10px 12px",
            }}
          >
            <strong>[ {gmCopy.workspace} ]</strong>
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={() => setShowGmWorkspace(false)}
            >
              ← {gmCopy.back}
            </button>
          </div>

          <GmWorkspace
            character={gmCharacter}
            setCharacter={updateGmCharacter}
          />
        </div>
      )}
    </>
  );
}
