import React from "react";
import { useTranslation } from "react-i18next";
import {
  SPECIAL_KEYS,
  SKILL_KEYS,
  SKILL_ATTRIBUTE_OPTIONS,
  SKILL_LABEL_KEYS,
} from "../../constants.js";

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
  const { t } = useTranslation();

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

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("specialPanel.title")} ]</h2>
          <span>{t("specialPanel.primaryStats")}</span>
        </div>

        <div className="pip-special-grid">
          {SPECIAL_KEYS.map((key) => (
            <div className="pip-special-card" key={key}>
              <div className="pip-special-letter">{key}</div>
              <input
                className="pip-special-input"
                value={form.special[key]}
                onChange={(e) => onSpecialChange(key, e.target.value)}
              />
            </div>
          ))}
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

            return (
              <div
                key={skillName}
                className="pip-skill-row-simple"
              >
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}