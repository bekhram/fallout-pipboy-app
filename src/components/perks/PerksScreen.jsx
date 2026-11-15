import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SPECIAL_KEYS } from "../../constants.js";
import { PERKS_LIST } from "../data/perks";
import { getPerkCatalogText, getPerkDisplayText, PERK_LANGUAGES } from "../data/perkLocalization.js";
import PERK_ASSETS from "../../perkAssets.js";

const normalizePerkAssetKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const PERK_IMAGES = Object.fromEntries(
  Object.entries(PERK_ASSETS).map(([name, image]) => [
    normalizePerkAssetKey(name),
    image,
  ])
);

const SPECIAL_NAMES = {
  en: { S: "Strength", P: "Perception", E: "Endurance", C: "Charisma", I: "Intelligence", A: "Agility", L: "Luck" },
  ru: { S: "Сила", P: "Восприятие", E: "Выносливость", C: "Харизма", I: "Интеллект", A: "Ловкость", L: "Удача" },
  uk: { S: "Сила", P: "Сприйняття", E: "Витривалість", C: "Харизма", I: "Інтелект", A: "Спритність", L: "Удача" },
  pl: { S: "Siła", P: "Percepcja", E: "Wytrzymałość", C: "Charyzma", I: "Inteligencja", A: "Zręczność", L: "Szczęście" },
};

function getRequirementsWarnings(reqString, form, perk, rank, t, specialNames) {
  if (!reqString || reqString === "None") return [];
  const warnings = [];
  const parts = reqString.split(",").map((value) => value.trim());
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
  const origin = String(form?.origin || "").toLowerCase();
  const isRobot = origin.includes("handy") || origin.includes("robot") || ["protectron", "robobrain", "securitron", "assaultron"].some((value) => origin.includes(value));
  const isGhoul = origin.includes("ghoul");
  const ignoreFirstRankLevel = Number(rank || 1) === 1
    && (perk?.ignoreFirstRankLevelForOrigins || []).some((value) =>
      origin.includes(String(value).toLowerCase())
    );

  const statKeys = { STR: "S", PER: "P", END: "E", CHA: "C", INT: "I", AGI: "A", LCK: "L" };
  parts.forEach((part) => {
    const lower = part.toLowerCase();
    const levelMatch = part.match(/Level\s*(\d+)\+/i);
    if (levelMatch) {
      const reqLevel = parseInt(levelMatch[1], 10);
      if (level < reqLevel && !ignoreFirstRankLevel) {
        warnings.push(t("perksPanel.requiredLevel", { required: reqLevel, current: level }));
      }
      return;
    }

    const statMatch = part.match(/(STR|PER|END|CHA|INT|AGI|LCK)\s*(\d+)/i);
    if (statMatch) {
      const statName = statMatch[1].toUpperCase();
      const reqVal = parseInt(statMatch[2], 10);
      if (stats[statName] < reqVal) {
        warnings.push(t("perksPanel.requiredStat", { attribute: specialNames[statKeys[statName]], required: reqVal, current: stats[statName] }));
      }
      return;
    }

    if (lower === "not a ghoul or robot" && (isGhoul || isRobot)) {
      warnings.push(t("perksPanel.notGhoulOrRobot"));
      return;
    }
    if (lower === "not a robot" && isRobot) {
      warnings.push(t("perksPanel.notRobot"));
      return;
    }
    if (lower === "not immune to radiation" && isGhoul) {
      warnings.push(t("perksPanel.notRadiationImmune"));
    }
  });

  return warnings;
}

function getPerkRequirementsForRank(perk, rank) {
  if (!perk) return "";
  const safeRank = Math.max(1, Math.min(Number(rank || 1), Number(perk.maxRanks || 1)));
  return perk.rankRequirements?.[safeRank] || perk.requirements || "";
}

function getSafeRank(perk, rank) {
  return Math.max(1, Math.min(Number(rank || 1), Number(perk?.maxRanks || 1)));
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
  form,
}) {
  const { t, i18n } = useTranslation(undefined, { bindI18n: "languageChanged loaded" });
  useEffect(() => {
    void i18n.loadLanguages(PERK_LANGUAGES);
  }, [i18n]);
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";
  const specialNames = SPECIAL_NAMES[language] || SPECIAL_NAMES.en;
  const localizedPerk = (perk) => getPerkCatalogText(perk, language, t);
  const safeList = Array.isArray(perks) ? perks : [];
  const isEditing = editingIndex !== null;
  const hasOriginTraits = safeList.some((item) => item.isOriginTrait);
  const firstRegularPerkIndex = safeList.findIndex((item) => !item.isOriginTrait);

  const handleChange = (field, value) => {
    setPerkDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleRankChange = (value) => {
    setPerkDraft((prev) => {
      const next = { ...prev, rank: value };
      if (prev?.id === "intense_training") {
        const perkData = PERKS_LIST.find((perk) => perk.id === "intense_training");
        const rank = getSafeRank(perkData, value);
        next.specialChoices = Array.from(
          { length: rank },
          (_, index) => prev.specialChoices?.[index] || ""
        );
      }
      return next;
    });
  };

  const handleSpecialChoice = (index, value) => {
    setPerkDraft((prev) => {
      const choices = Array.isArray(prev.specialChoices) ? [...prev.specialChoices] : [];
      choices[index] = value;
      return { ...prev, specialChoices: choices };
    });
  };

  const handleSelectPerk = (e) => {
    const perkId = e.target.value;
    if (!perkId) return;

    const perkData = PERKS_LIST.find((p) => p.id === perkId);
    if (perkData) {
      setPerkDraft((prev) => {
        const next = {
          ...prev,
          id: perkData.id,
          name: localizedPerk(perkData).name,
          description: localizedPerk(perkData).description,
        };
        if (perkData.id === "intense_training") {
          const rank = getSafeRank(perkData, prev.rank);
          next.specialChoices = Array.from(
            { length: rank },
            (_, index) => prev.specialChoices?.[index] || ""
          );
        } else {
          delete next.specialChoices;
        }
        return next;
      });
    }
  };

  const matchedPerk = PERKS_LIST.find(
    (p) => p.id === perkDraft?.id || localizedPerk(p).name === perkDraft?.name
  );

  const draftDisplay = getPerkDisplayText(perkDraft, matchedPerk?.id, i18n) || {};

  const getPerkId = (item) =>
    item?.id || PERKS_LIST.find((perk) => localizedPerk(perk).name === item?.name)?.id;

  const activeRequirements = getPerkRequirementsForRank(matchedPerk, perkDraft?.rank);
  const warnings = matchedPerk
    ? getRequirementsWarnings(activeRequirements, form, matchedPerk, perkDraft?.rank, t, specialNames)
    : [];
  const rankValue = Number(perkDraft?.rank || 1);
  const rankInvalid = Boolean(matchedPerk) && (
    !Number.isInteger(rankValue)
    || rankValue < 1
    || rankValue > Number(matchedPerk?.maxRanks || 1)
  );
  const allWarnings = [
    ...warnings,
    ...(rankInvalid ? [t("perksPanel.rankRange", { max: matchedPerk?.maxRanks || 1 })] : []),
  ];
  const intenseTrainingRank = matchedPerk?.id === "intense_training"
    ? getSafeRank(matchedPerk, perkDraft?.rank)
    : 0;

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
          {hasOriginTraits && (
            <h3 className="pip-perk-section-title">
              [ {t("perksPanel.originTraits")} ]
            </h3>
          )}
          {safeList.map((item, index) => {
            const currentlyEditing = editingIndex === index;
            const perkId = getPerkId(item);
            const perkImage = PERK_IMAGES[perkId];
            const display = getPerkDisplayText(item, perkId, i18n);
            const trainingChoices = perkId === "intense_training" && Array.isArray(item.specialChoices)
              ? item.specialChoices.filter(Boolean)
              : [];
            return (
              <React.Fragment key={item.id || index}>
              {index === firstRegularPerkIndex && (
                <h3 className="pip-perk-section-title is-perks">
                  [ {t("perksPanel.perks")} ]
                </h3>
              )}
              <div
                className={`pip-perk-card ${
                  currentlyEditing ? "is-editing" : ""
                } ${item.isOriginTrait ? "is-origin" : ""} ${
                  perkImage ? "has-image" : "no-image"
                }`}
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
                  <div className="pip-perk-header" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "1.1em" }}>
                      {display.name || t("perksPanel.unnamedPerk")}
                    </strong>
                    {item.rank && (
                      <span className="pip-perk-rank" style={{ opacity: 0.7, fontSize: "0.9em" }}>
                        | {t("perksPanel.rank")} {item.rank}
                      </span>
                    )}
                  </div>
                  <div className="pip-perk-desc">
                    {display.description || t("perksPanel.noDescription")}
                  </div>
                  {trainingChoices.length ? (
                    <div style={{ marginTop: "6px", fontSize: "0.78em", opacity: 0.82 }}>
                      [ S.P.E.C.I.A.L.: {trainingChoices.map((key) => `${key} ${specialNames[key] || key}`).join(" · ")} ]
                    </div>
                  ) : null}

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
              </React.Fragment>
            );
          })}
          {safeList.length === 0 && (
            <div className="pip-empty-state">{t("perksPanel.empty")}</div>
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
                <label htmlFor="perk-archive">{t("perksPanel.selectArchive")}</label>
                <select id="perk-archive" className="pip-input" onChange={handleSelectPerk} value={matchedPerk?.id || ""}>
                  <option value="" disabled>{t("perksPanel.choosePerk")}</option>
                  {PERKS_LIST.map((perk) => (
                    <option key={perk.id} value={perk.id}>
                      {localizedPerk(perk).name}
                    </option>
                  ))}
                </select>
              </div>

              {allWarnings.length > 0 && (
                <div style={{
                  gridColumn: "1 / -1",
                  border: "1px solid var(--pip-color-alert, #ffcc00)",
                  padding: "10px",
                  color: "var(--pip-color-alert, #ffcc00)",
                  backgroundColor: "rgba(255, 204, 0, 0.05)",
                }}>
                  <strong style={{ display: "block", marginBottom: "5px" }}>[ {t("perksPanel.requirementsWarning")} ]</strong>
                  <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.9em" }}>
                    {allWarnings.map((warning, index) => <li key={index}>{warning}</li>)}
                  </ul>
                </div>
              )}

              <div>
                <label>{t("perksPanel.perkName")}</label>
                <input
                  className="pip-input"
                  value={draftDisplay.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div>
                <label>{t("perksPanel.rank")}</label>
                <input
                  className="pip-input"
                  value={perkDraft.rank || ""}
                  onChange={(e) => handleRankChange(e.target.value)}
                  inputMode="numeric"
                />
              </div>

              {matchedPerk?.id === "intense_training" ? (
                <div style={{ gridColumn: "1 / -1", display: "grid", gap: "7px" }}>
                  <label>[ {t("perksPanel.training")} ]</label>
                  {Array.from({ length: intenseTrainingRank }, (_, index) => (
                    <label
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(90px, 0.45fr) minmax(170px, 1fr)",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <span>{t("perksPanel.rank")} {index + 1}</span>
                      <select
                        className="pip-input"
                        value={perkDraft.specialChoices?.[index] || ""}
                        onChange={(e) => handleSpecialChoice(index, e.target.value)}
                      >
                        <option value="">-- S.P.E.C.I.A.L. --</option>
                        {SPECIAL_KEYS.map((key) => (
                          <option key={key} value={key}>
                            {key} — {specialNames[key] || key}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              ) : null}

              <div style={{ gridColumn: "1 / -1" }}>
                <label>{t("perksPanel.description")}</label>
                <textarea
                  className="pip-input"
                  rows={6}
                  value={draftDisplay.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="pip-actions-inline push-top">
                <button
                  type="button"
                  className="pip-btn is-primary"
                  onClick={() => onSaveEdit(editingIndex)}
                  disabled={allWarnings.length > 0}
                  title={allWarnings.length ? allWarnings.join(" · ") : undefined}
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
