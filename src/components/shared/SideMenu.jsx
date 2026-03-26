import React from "react";
import { useTranslation } from "react-i18next";

export default function SideMenu({
  open,
  onClose,
  onExport,
  onSaveToDevice,
  onImportClick,
  onReturnToMenu,
}) {
  const { t, i18n } = useTranslation();

  const setLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <>
      <div
        className={`pip-drawer-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      <aside className={`pip-panel pip-drawer ${open ? "is-open" : ""}`}>
        <div className="pip-head">
          <h2>[ {t("menu.title")} ]</h2>
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

        <div className="pip-stack">
          <button type="button" className="pip-btn" onClick={onExport}>
            {t("menu.export")}
          </button>

          <button type="button" className="pip-btn" onClick={onImportClick}>
            {t("menu.import")}
          </button>

          <button type="button" className="pip-btn" onClick={onReturnToMenu}>
            {t("menu.return")}
          </button>
        </div>
      </aside>
    </>
  );
}