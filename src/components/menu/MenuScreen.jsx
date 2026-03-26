import React from "react";
import { useTranslation } from "react-i18next";

export default function MenuScreen({
  hasCharacter,
  onNewCharacter,
  onContinue,
  onImportClick,
  saveMeta
}) {
  const { t } = useTranslation();

  return (
    <section className="pip-screen-grid">
      <section className="pip-panel pip-block pip-hero">
        <div className="pip-bootline">{t("menuScreen.bootline")}</div>
        <h1 className="pip-title">PIP 2D20 MK IV TEST-999</h1>
        <p className="pip-subtitle">{t("menuScreen.subtitle")}</p>

        <div className="pip-actions-inline push-top">
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={onNewCharacter}
          >
            {t("menuScreen.newCharacter")}
          </button>

          <button
            type="button"
            className="pip-btn"
            onClick={onImportClick}
          >
            {t("menuScreen.importJson")}
          </button>
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
              <button
                type="button"
                className="pip-btn is-primary"
                onClick={onContinue}
              >
                {t("menuScreen.continue")}
              </button>
            </div>
          </>
        ) : (
          <div className="pip-logbox">
            {t("menuScreen.noSavedCharacter")}
          </div>
        )}
      </section>
    </section>
  );
}