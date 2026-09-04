import React from "react";
import { useTranslation } from "react-i18next";
import { PERKS_LIST } from "../data/perks";
import { getAddedPerkTranslation } from "../data/perkTranslations";

const perkImageModules = import.meta.glob("../../assets/perks/*.png", {
  eager: true,
  import: "default",
});

const PERK_IMAGES = Object.fromEntries(
  Object.entries(perkImageModules).map(([path, image]) => [
    path.split("/").pop().replace(/\.png$/, ""),
    image,
  ])
);

// Функция для проверки требований перка
function getRequirementsWarnings(reqString, form) {
  if (!reqString || reqString === "None") return [];
  const warnings = [];
  const parts = reqString.split(",").map((s) => s.trim());

  const stats = {
    STR: Number(form?.special?.S || 0),
    PER: Number(form?.special?.P || 0),
    END: Number(form?.special?.E || 0),
    CHA: Number(form?.special?.C || 0),
    INT: Number(form?.special?.I || 0),
    AGI: Number(form?.special?.A || 0),
    LCK: Number(form?.special?.L || 0),
  };
  const level = Number(form?.level || 1);
  const isRobot = form?.origin === "mister_handy";

  parts.forEach((part) => {
    // Проверка уровня (например, "Level 2+")
    const levelMatch = part.match(/Level\s*(\d+)\+/i);
    if (levelMatch) {
      const reqLevel = parseInt(levelMatch[1], 10);
      if (level < reqLevel) {
        warnings.push(`Requires Level ${reqLevel}+ (Current: ${level})`);
      }
      return;
    }

    // Проверка характеристик (например, "STR 6")
    const statMatch = part.match(/(STR|PER|END|CHA|INT|AGI|LCK)\s*(\d+)/i);
    if (statMatch) {
      const statName = statMatch[1].toUpperCase();
      const reqVal = parseInt(statMatch[2], 10);
      if (stats[statName] < reqVal) {
        warnings.push(`Requires ${statName} ${reqVal} (Current: ${stats[statName]})`);
      }
      return;
    }

    // Специфичные проверки
    if (part.toLowerCase() === "not a robot" && isRobot) {
      warnings.push(`Cannot be a robot`);
    }
  });

  return warnings;
}

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
  form, // <--- Получаем данные персонажа
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";
  const localizedPerk = (perk) => {
    const added = getAddedPerkTranslation(perk.id, language);
    return {
      name: added?.name || t(`perksInfo.${perk.id}.name`, { defaultValue: perk.name || perk.id }),
      description: added?.description || t(`perksInfo.${perk.id}.desc`, { defaultValue: perk.description || "" }),
    };
  };
  const safeList = Array.isArray(perks) ? perks : [];
  const isEditing = editingIndex !== null;

  const handleChange = (field, value) => {
    setPerkDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectPerk = (e) => {
    const perkId = e.target.value;
    if (!perkId) return;

    const perkData = PERKS_LIST.find((p) => p.id === perkId);
    if (perkData) {
      setPerkDraft((prev) => ({
        ...prev,
        id: perkData.id,
        name: localizedPerk(perkData).name,
        description: localizedPerk(perkData).description + `\n[Req: ${perkData.requirements} | Max Rank: ${perkData.maxRanks}]`,
      }));
    }
  };

  // Ищем выбранный перк в базе по имени, чтобы динамически проверять требования
  const matchedPerk = PERKS_LIST.find(
    (p) => p.id === perkDraft?.id || localizedPerk(p).name === perkDraft?.name
  );

  const getPerkId = (item) =>
    item?.id || PERKS_LIST.find((perk) => localizedPerk(perk).name === item?.name)?.id;
  
  // Получаем список предупреждений
  const warnings = matchedPerk ? getRequirementsWarnings(matchedPerk.requirements, form) : [];

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("perksPanel.title")} ]</h2>
        {!isEditing && (
          <button type="button" className="pip-action-btn" onClick={onAdd}>
            {t("common.add")}
          </button>
        )}
      </div>

      <div className="pip-perks-layout">
        <div className="pip-perks-list">
          {safeList.map((item, index) => {
            const currentlyEditing = editingIndex === index;
            const perkId = getPerkId(item);
            const perkImage = PERK_IMAGES[perkId];
            return (
              <div
                key={item.id || index}
                className={`pip-perk-card ${
                  currentlyEditing ? "is-editing" : ""
                } ${item.isOriginTrait ? "is-origin" : ""}`}
              >
                {perkImage && (
                  <div className="pip-perk-image-wrap" aria-hidden="true">
                    <img
                      className="pip-perk-image"
                      src={perkImage}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="pip-perk-content">
                  <div className="pip-perk-header" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '1.1em' }}>
                    {item.name || t("perksPanel.unnamedPerk")}
                  </strong>
                  {item.rank && (
                    <span className="pip-perk-rank" style={{ opacity: 0.7, fontSize: '0.9em' }}>
                      | {t("perksPanel.rank")} {item.rank}
                    </span>
                  )}
                </div>
                <div className="pip-perk-desc">
                  {item.description || t("perksPanel.noDescription")}
                </div>

                {!item.isOriginTrait && !isEditing && (
                  <div className="pip-perk-actions">
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
                )}
                </div>
              </div>
            );
          })}
          {safeList.length === 0 && (
            <div className="pip-empty-state">No perks or traits found.</div>
          )}
        </div>

        {isEditing && (
          <div className="pip-perk-editor">
            <div className="pip-head">
              <h3>[ {t("perksPanel.perkEditor")} ]</h3>
              <span className="pip-cursor">{t("perksPanel.entryMode")}</span>
            </div>

            <div className="pip-form-grid">
              {matchedPerk && PERK_IMAGES[matchedPerk.id] && (
                <div className="pip-perk-editor-preview" aria-hidden="true">
                  <img src={PERK_IMAGES[matchedPerk.id]} alt="" />
                </div>
              )}
              
              <div style={{ gridColumn: "1 / -1" }}>
                <label>Select from Database</label>
                <select className="pip-input" onChange={handleSelectPerk} defaultValue="">
                  <option value="" disabled>-- Choose a Perk --</option>
                  {PERKS_LIST.map(perk => (
                    <option key={perk.id} value={perk.id}>
                      {localizedPerk(perk).name}
                    </option>
                  ))}
                </select>
              </div>

              {/* БЛОК ПРЕДУПРЕЖДЕНИЙ */}
              {warnings.length > 0 && (
                <div style={{ 
                  gridColumn: "1 / -1", 
                  border: "1px solid var(--pip-color-alert, #ffcc00)", 
                  padding: "10px", 
                  color: "var(--pip-color-alert, #ffcc00)",
                  backgroundColor: "rgba(255, 204, 0, 0.05)"
                }}>
                  <strong style={{ display: "block", marginBottom: "5px" }}>[ WARNING: REQUIREMENTS NOT MET ]</strong>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9em" }}>
                    {warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <label>{t("perksPanel.perkName")}</label>
                <input
                  className="pip-input"
                  value={perkDraft.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div>
                <label>{t("perksPanel.rank")}</label>
                <input
                  className="pip-input"
                  value={perkDraft.rank || ""}
                  onChange={(e) => handleChange("rank", e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>{t("perksPanel.description")}</label>
                <textarea
                  className="pip-input"
                  rows={6}
                  value={perkDraft.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
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
                <button type="button" className="pip-btn" onClick={onCancelEdit}>
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
