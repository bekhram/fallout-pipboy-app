import React from "react";
import { useTranslation } from "react-i18next";
import {
  SPECIAL_KEYS,
  SKILL_KEYS,
  SKILL_ATTRIBUTE_OPTIONS,
  SKILL_LABEL_KEYS,
} from "../../constants.js";
import { ORIGINS } from "../data/origins.js";
import { getTagSkillEquipmentGrant } from "../../data/startingEquipment.js";
import { getLocalizedInventoryItem } from "../../data/inventoryLocalizationAll.js";

const TAG_EQUIPMENT_CHOICE_EVENT = "pipboy:set-tag-equipment-choice";

export default function SpecialScreen({
  form,
  currentLuckPoints,
  onSpecialChange,
  onSkillChange,
  onDerivedChange,
  onCurrentLuckChange,
  onOpenSkillsEditor,
  onRoll,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";

  const currentOrigin = form.origin && ORIGINS[form.origin] ? ORIGINS[form.origin] : null;
  const limits = currentOrigin?.specialLimits || { min: 1, max: 10 };

  const handleSkillRoll = (skillName, skill, testValue) => {
    if (!onRoll) return;

    onRoll({
      id: `${skillName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "skill",
      diceType: "d20",
      title: t(SKILL_LABEL_KEYS?.[skillName] || skillName),
      skillName,
      skill,
      testValue,
    });
  };

  const describeChoiceOption = (option = []) =>
    option
      .filter((entry) => entry?.type === "item")
      .map((entry) => {
        const localized = getLocalizedInventoryItem(entry, language);
        return localized.displayName || entry.name;
      })
      .filter(Boolean)
      .join(" + ");

  const updateTagEquipmentChoice = (skillName, choiceId, optionIndex) => {
    window.dispatchEvent(
      new CustomEvent(TAG_EQUIPMENT_CHOICE_EVENT, {
        detail: {
          skillName,
          choiceId,
          optionIndex: Number(optionIndex),
        },
      })
    );
  };

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("specialPanel.title")} ]</h2>
          <span>{t("specialPanel.primaryStats")}</span>
        </div>

        <div className="pip-special-grid">
          {SPECIAL_KEYS.map((key) => {
            const minAllowed = limits.min !== undefined ? limits.min : 1;
            const maxAllowed =
              limits[key] !== undefined
                ? limits[key]
                : limits.max !== undefined
                  ? limits.max
                  : 10;

            return (
              <div className="pip-special-card" key={key}>
                <div className="pip-special-letter">{key}</div>
                <input
                  className="pip-special-input"
                  value={form.special[key]}
                  onChange={(e) => onSpecialChange(key, e.target.value)}
                />
                <div
                  style={{
                    fontSize: "0.65em",
                    opacity: 0.7,
                    marginTop: "4px",
                    textAlign: "center",
                    letterSpacing: "1px",
                  }}
                >
                  [{minAllowed}-{maxAllowed}]
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("skills.title")} ]</h2>
          <button
            type="button"
            className="pip-action-btn"
            onClick={onOpenSkillsEditor}
          >
            {t("skills.edit")}
          </button>
        </div>

        <div className="pip-skills-grid">
          {SKILL_KEYS.map((skillName) => {
            const skill = form.skills?.[skillName] || {
              rank: "0",
              attribute: "A",
              tagged: false,
              bonus: "0",
            };

            const rank = Number(skill.rank || 0);
            const attrValue = Number(form.special?.[skill.attribute || "A"] || 0);
            const tagBonus = skill.tagged ? 2 : 0;
            const bonus = Number(skill.bonus || 0);
            const testValue = rank + attrValue + tagBonus + bonus;
            const sourceKey = `tag:${skillName}`;
            const equipmentChoices = getTagSkillEquipmentGrant(skillName).filter(
              (entry) => entry?.type === "choice"
            );
            const storedChoices = form.startingEquipmentChoices?.[sourceKey] || {};

            return (
              <div key={skillName} className="pip-skill-row-simple">
                <button
                  type="button"
                  className="pip-skill-name-simple pip-skill-name-roll-button"
                  onClick={() => handleSkillRoll(skillName, skill, testValue)}
                >
                  {t(SKILL_LABEL_KEYS?.[skillName] || skillName)}
                </button>

                <div className="pip-skill-attr-simple">
                  <label>{t("skills.attr")}</label>
                  <select
                    className="pip-inline-input"
                    value={skill.attribute || "A"}
                    onChange={(e) =>
                      onSkillChange(skillName, "attribute", e.target.value)
                    }
                  >
                    {SKILL_ATTRIBUTE_OPTIONS.map((attr) => (
                      <option key={attr} value={attr}>
                        {attr}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pip-skill-test-simple">
                  <label>{t("skills.test")}</label>
                  <div className="pip-skill-test-value">{testValue}</div>
                </div>

                {skill.tagged && equipmentChoices.length > 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      width: "100%",
                      marginTop: "6px",
                      paddingTop: "6px",
                      borderTop: "1px dashed rgba(20, 255, 0, 0.35)",
                    }}
                  >
                    {equipmentChoices.map((entry) => (
                      <label
                        key={entry.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(120px, 0.7fr) minmax(170px, 1.3fr)",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "0.72em", opacity: 0.75 }}>
                          [ {t("equipmentPacks.choice", { defaultValue: "STARTING ITEM" })} ]
                        </span>
                        <select
                          className="pip-inline-input"
                          value={Number(
                            storedChoices[entry.id] ?? entry.defaultOption ?? 0
                          )}
                          onChange={(e) =>
                            updateTagEquipmentChoice(
                              skillName,
                              entry.id,
                              e.target.value
                            )
                          }
                        >
                          {(entry.options || []).map((option, optionIndex) => (
                            <option key={optionIndex} value={optionIndex}>
                              {describeChoiceOption(option) || `Option ${optionIndex + 1}`}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
