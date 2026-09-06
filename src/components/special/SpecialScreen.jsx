import React, { useState } from "react";
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
import { getDerivedStats } from "../../utils/characterMath.js";
import {
  getSkillPerkContextOptions,
  getSkillPerkRollModifiers,
} from "../../utils/perkEffects.js";
import {
  getBobbleheadSpecialBonus,
  getBobbleheadSkillBonus,
  getEffectiveSpecialValue,
  getEffectiveSkillRank,
  hasActivePowerArmorFrame,
} from "../../data/inventory/bobbleheads.js";

const TAG_EQUIPMENT_CHOICE_EVENT = "pipboy:set-tag-equipment-choice";
const POWER_ARMOR_LABEL = {
  en: "POWER ARMOR",
  ru: "СИЛОВАЯ БРОНЯ",
  uk: "СИЛОВА БРОНЯ",
  pl: "PANCERZ WSPOMAGANY",
};

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
  const [skillContexts, setSkillContexts] = useState({});

  const currentOrigin = form.origin && ORIGINS[form.origin] ? ORIGINS[form.origin] : null;
  const limits = currentOrigin?.specialLimits || { min: 1, max: 10 };
  const powerArmorActive = hasActivePowerArmorFrame(form);
  const derived = getDerivedStats(form);
  const perkContext = derived?.perkContextualModifiers || {};

  const handleSkillRoll = (
    skillName,
    skill,
    testValue,
    effectiveRank,
    contextId,
    perkRollModifiers
  ) => {
    if (!onRoll) return;

    onRoll({
      id: `${skillName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "skill",
      diceType: "d20",
      title: t(SKILL_LABEL_KEYS?.[skillName] || skillName),
      skillName,
      skill: { ...skill, rank: String(effectiveRank) },
      testValue,
      difficulty: perkRollModifiers?.difficulty ?? 1,
      perkContextId: contextId,
      perkRollModifiers,
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
            const bobbleheadBonus = getBobbleheadSpecialBonus(form, key);
            const effectiveValue = getEffectiveSpecialValue(form, key);
            const baseWithBobblehead = Number(form.special?.[key] || 0) + bobbleheadBonus;
            const powerArmorStrength = key === "S" && powerArmorActive && effectiveValue !== baseWithBobblehead;
            const effectiveNotes = [
              powerArmorStrength ? (POWER_ARMOR_LABEL[language] || POWER_ARMOR_LABEL.en) : null,
              bobbleheadBonus ? `+${bobbleheadBonus} BOBBLEHEAD` : null,
            ].filter(Boolean);

            return (
              <div className="pip-special-card" key={key}>
                <div className="pip-special-letter">{key}</div>
                <input
                  className="pip-special-input"
                  value={form.special[key]}
                  onChange={(e) => onSpecialChange(key, e.target.value)}
                />
                {effectiveNotes.length ? (
                  <div style={{ fontSize: "0.68em", marginTop: "3px", textAlign: "center" }}>
                    {effectiveValue} <span style={{ opacity: 0.72 }}>({effectiveNotes.join(" · ")})</span>
                  </div>
                ) : null}
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

            const effectiveRank = getEffectiveSkillRank(form, skillName);
            const skillBobbleheadBonus = getBobbleheadSkillBonus(form, skillName);
            const baseAttrValue = getEffectiveSpecialValue(form, skill.attribute || "A");
            const perkStrength = skill.attribute === "S"
              ? Number(perkContext.strengthForStrengthTests)
              : NaN;
            const attrValue = Number.isFinite(perkStrength)
              ? Math.max(baseAttrValue, perkStrength)
              : baseAttrValue;
            const perkAttrBonus = Math.max(0, attrValue - baseAttrValue);
            const tagBonus = skill.tagged ? 2 : 0;
            const bonus = Number(skill.bonus || 0);
            const testValue = effectiveRank + attrValue + tagBonus + bonus;
            const sourceKey = `tag:${skillName}`;
            const equipmentChoices = getTagSkillEquipmentGrant(skillName).filter(
              (entry) => entry?.type === "choice"
            );
            const storedChoices = form.startingEquipmentChoices?.[sourceKey] || {};
            const contextOptions = getSkillPerkContextOptions(skillName, language);
            const contextId = skillContexts[skillName]
              || contextOptions[0]?.id
              || "general";
            const perkRollModifiers = getSkillPerkRollModifiers(form, {
              skillName,
              contextId,
              baseDifficulty: 1,
            });
            const perkChips = [
              `D${perkRollModifiers.difficulty}`,
              perkRollModifiers.rerollD20 > 0 ? `↻${perkRollModifiers.rerollD20}d20` : null,
              perkRollModifiers.ignoredComplications > 0 ? `COMP -${perkRollModifiers.ignoredComplications}` : null,
              perkRollModifiers.firstBoughtD20Free ? "+d20 FREE" : null,
              perkRollModifiers.healingBonus > 0 ? `HEAL +${perkRollModifiers.healingBonus}` : null,
              perkRollModifiers.travelTimeMultiplier < 1 ? `TIME ×${perkRollModifiers.travelTimeMultiplier}` : null,
            ].filter(Boolean);

            return (
              <div key={skillName} className="pip-skill-row-simple">
                <button
                  type="button"
                  className="pip-skill-name-simple pip-skill-name-roll-button"
                  onClick={() => handleSkillRoll(
                    skillName,
                    skill,
                    testValue,
                    effectiveRank,
                    contextId,
                    perkRollModifiers
                  )}
                >
                  {t(SKILL_LABEL_KEYS?.[skillName] || skillName)}
                  {skillBobbleheadBonus ? <small style={{ marginLeft: "5px", opacity: 0.72 }}>+1 BOBBLEHEAD</small> : null}
                  {perkAttrBonus ? <small style={{ marginLeft: "5px", opacity: 0.72 }}>+{perkAttrBonus} PERK</small> : null}
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

                {contextOptions.length > 1 ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "grid",
                      gridTemplateColumns: "minmax(150px, 1fr) auto",
                      gap: "6px",
                      alignItems: "center",
                      marginTop: "4px",
                    }}
                  >
                    <select
                      className="pip-inline-input"
                      value={contextId}
                      onChange={(e) => setSkillContexts((prev) => ({
                        ...prev,
                        [skillName]: e.target.value,
                      }))}
                    >
                      {contextOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "flex-end" }}>
                      {perkChips.map((chip) => (
                        <span key={chip} className="pip-tag">{chip}</span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {perkRollModifiers.notes.length ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      fontSize: "0.68em",
                      opacity: 0.82,
                      marginTop: "3px",
                    }}
                  >
                    {perkRollModifiers.notes.join(" · ")}
                  </div>
                ) : null}

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
