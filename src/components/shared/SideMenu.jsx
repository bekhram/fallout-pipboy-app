import React from "react";
import { useTranslation } from "react-i18next";
import "./sideMenuLayer.css";

export default function SideMenu({
  open,
  onClose,
  onExport,
  onSaveToDevice,
  onImportClick,
  onReturnToMenu,
  languageOnly = false,
}) {
  const { t, i18n } = useTranslation();

  const setLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <>
      <div
        className={`pip-drawer-backdrop pip-drawer-backdrop--global ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`pip-panel pip-drawer pip-drawer--global ${open ? "is-open" : ""}`}>
        <div className="pip-head">
          <h2>[ {t("menu.title")} ]</h2>
          <button type="button" className="pip-btn pip-drawer-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="pip-field push-bottom">
          <label>{t("menu.language")}</label>
          <div className="pip-actions-inline">
            <button type="button" className="pip-btn" onClick={() => setLanguage("en")}>
              EN
            </button>
            <button type="button" className="pip-btn" onClick={() => setLanguage("ru")}>
              RU
            </button>
            <button type="button" className="pip-btn" onClick={() => setLanguage("uk")}>
              UA
            </button>
            <button type="button" className="pip-btn" onClick={() => setLanguage("pl")}>
              PL
            </button>
          </div>
        </div>

        {!languageOnly ? (
          <div className="pip-stack">
            {onExport ? (
              <button type="button" className="pip-btn" onClick={onExport}>
                {t("menu.export")}
              </button>
            ) : null}

            {onImportClick ? (
              <button type="button" className="pip-btn" onClick={onImportClick}>
                {t("menu.import")}
              </button>
            ) : null}

            {onReturnToMenu ? (
              <button type="button" className="pip-btn" onClick={onReturnToMenu}>
                {t("menu.return")}
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </>
  );
}
