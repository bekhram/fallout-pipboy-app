import React from "react";
import { useTranslation } from "react-i18next";

export default function PerksScreen({
  perks,
  editingIndex,
  perkDraft,
  setPerkDraft,
  onAdd,
  onEdit,
  onCopy,
  onRemove,
  onSaveEdit,
  onCancelEdit,
}) {
  const { t } = useTranslation();

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("perksPanel.title")} ]</h2>
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={onAdd}
          >
          {t("common.add")}
          </button>
        </div>

        <div className="pip-stack">
          {perks.map((perk, index) => (
            <article
              key={`${perk.name || "perk"}-${index}`}
              className="pip-panel pip-item-card pip-floating-actions-card"
            >
              <div className="pip-floating-card-actions">
                <button
                  type="button"
                  className="pip-btn"
                  onClick={() => onEdit(index)}
                >
                  {t("common.edit")}
                </button>

                <button
                  type="button"
                  className="pip-btn"
                  onClick={() => onCopy(index)}
                >
                  {t("common.copy")}
                </button>

                <button
                  type="button"
                  className="pip-btn is-danger"
                  onClick={() => onRemove(index)}
                >
                  {t("common.delete")}
                </button>
              </div>

              <div className="pip-floating-card-body">
                <h3>{perk.name || t("perksPanel.unnamedPerk")}</h3>
                <p>
                  {t("perksPanel.rank")} {perk.rank || "1"}
                </p>
                <p>{perk.description || t("perksPanel.noDescription")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {editingIndex !== null && (
        <section className="pip-panel pip-block">
          <div className="pip-head">
            <h2>[ {t("perksPanel.perkEditor")} ]</h2>
            <span>{t("perksPanel.entryMode")}</span>
          </div>

          <div className="pip-form-grid">
            <input
              className="pip-input"
              placeholder={t("perksPanel.perkName")}
              value={perkDraft.name}
              onChange={(e) =>
                setPerkDraft({ ...perkDraft, name: e.target.value })
              }
            />

            <input
              className="pip-input"
              placeholder={t("perksPanel.rank")}
              value={perkDraft.rank}
              onChange={(e) =>
                setPerkDraft({ ...perkDraft, rank: e.target.value })
              }
            />

            <textarea
              className="pip-textarea"
              placeholder={t("perksPanel.description")}
              value={perkDraft.description}
              onChange={(e) =>
                setPerkDraft({ ...perkDraft, description: e.target.value })
              }
            />
          </div>

          <div className="pip-actions-inline push-top">
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={() => onSaveEdit(editingIndex)}
            >
              {t("common.save")}
            </button>

            <button
              type="button"
              className="pip-btn"
              onClick={onCancelEdit}
            >
              {t("common.cancel")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}