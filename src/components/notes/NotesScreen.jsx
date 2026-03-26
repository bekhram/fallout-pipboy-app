import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function NotesScreen({ form, onTopLevelChange }) {
  const [editingBackstory, setEditingBackstory] = useState(false);
  const { t } = useTranslation();

  const backstoryText = form.backstory || "";
  const backstoryPreview =
    backstoryText.length > 450
      ? `${backstoryText.slice(0, 450).trim()}...`
      : backstoryText || t("notesPanel.noBackstory");

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("notesPanel.backstory")} ]</h2>

          {!editingBackstory ? (
            <button
              type="button"
              className="pip-btn"
              onClick={() => setEditingBackstory(true)}
            >
              {t("common.edit")}
            </button>
          ) : (
            <div className="pip-actions-inline">
              <button
                type="button"
                className="pip-btn is-primary"
                onClick={() => setEditingBackstory(false)}
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                className="pip-btn"
                onClick={() => setEditingBackstory(false)}
              >
                {t("notesPanel.close")}
              </button>
            </div>
          )}
        </div>

        {!editingBackstory ? (
          <div className="pip-logbox">
            <p className="pip-body-copy">{backstoryPreview}</p>
          </div>
        ) : (
          <textarea
            className="pip-textarea pip-textarea--large"
            value={form.backstory || ""}
            onChange={(e) => onTopLevelChange("backstory", e.target.value)}
            placeholder={t("notesPanel.backstoryPlaceholder")}
          />
        )}
      </section>

      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("notesPanel.questNotes")} ]</h2>
          <span>{t("notesPanel.activeObjectives")}</span>
        </div>

        <textarea
          className="pip-textarea pip-textarea--large"
          value={form.questNotes}
          onChange={(e) => onTopLevelChange("questNotes", e.target.value)}
        />
      </section>
    </div>
  );
}