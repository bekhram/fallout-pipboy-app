import React from "react";
import { useTranslation } from "react-i18next";

export default function DataScreen({
  saveStatus,
  loadStatus,
  onExport,
  onImportClick,
  onCsvImportClick, // <-- Добавили новый пропс
  database          // <-- Добавили пропс базы данных
}) {
  const { t } = useTranslation();

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("dataPanel.title")} ]</h2>
        <span>{t("dataPanel.archiveAccess")}</span>
      </div>

      <div className="pip-actions-inline">
        <button
          type="button"
          className="pip-btn is-primary"
          onClick={onExport}
        >
          {t("dataPanel.exportJson")}
        </button>

        <button
          type="button"
          className="pip-btn"
          onClick={onImportClick}
        >
          {t("dataPanel.importJson")}
        </button>
        
        {/* Новая кнопка для загрузки базы */}
        <button
          type="button"
          className="pip-btn"
          onClick={onCsvImportClick}
        >
          Upload Equipment (CSV)
        </button>
      </div>

      <div className="pip-logbox push-top">
        <div>{saveStatus || t("dataPanel.noRecentExport")}</div>
        <div>{loadStatus || t("dataPanel.noRecentImport")}</div>
      </div>

      {/* Новый блок со статусом базы данных */}
      <div className="pip-logbox push-top">
        <strong>[ TERMINAL DATABASE STATUS ]</strong>
        <br />
        <span style={{ opacity: 0.8 }}>
          Weapons Loaded: {database?.weapons?.length || 0}
        </span>
      </div>
    </section>
  );
}