import React from "react";
import { useTranslation } from "react-i18next";

export default function UnsavedChangesModal({
  open,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="pip-modal-backdrop">
      <div className="pip-modal pip-panel">
        <div className="pip-head">
          <h2>[ {t("unsavedChanges.title")} ]</h2>
          <span>{t("unsavedChanges.warning")}</span>
        </div>

        <div className="pip-logbox">
          {t("unsavedChanges.message")}
        </div>

        <div className="pip-actions-inline push-top">
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={onSaveAndLeave}
          >
            {t("unsavedChanges.saveAndLeave")}
          </button>

          <button
            type="button"
            className="pip-btn is-danger"
            onClick={onLeaveWithoutSaving}
          >
            {t("unsavedChanges.leaveWithoutSaving")}
          </button>

          <button
            type="button"
            className="pip-btn"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}