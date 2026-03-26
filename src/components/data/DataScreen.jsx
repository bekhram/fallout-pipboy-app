import React from "react";
import { useTranslation } from "react-i18next";

export default function DataScreen({
  saveStatus,
  loadStatus,
  onExport,
  onImportClick,
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
      </div>

      <div className="pip-logbox push-top">
        <div>{saveStatus || t("dataPanel.noRecentExport")}</div>
        <div>{loadStatus || t("dataPanel.noRecentImport")}</div>
      </div>
    </section>
  );
}