import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import TrackedButton from "../shared/TrackedButton.jsx";
import QuickCharacterWizard, {
  getCreationCopy,
} from "../characterCreation/QuickCharacterWizard.jsx";

const STORAGE_KEY = "fallout_pipboy_v4_last_character";

export default function MenuScreen({
  hasCharacter,
  onNewCharacter,
  onContinue,
  onImportClick,
  saveMeta
}) {
  const { t, i18n } = useTranslation();
  const copy = getCreationCopy(i18n.resolvedLanguage || i18n.language);
  const [showCreationMode, setShowCreationMode] = useState(false);
  const [showQuickCreation, setShowQuickCreation] = useState(false);

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
    </>
  );
}
