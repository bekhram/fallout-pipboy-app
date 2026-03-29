import React from "react";
import { ARMOR_PARTS } from "../../constants.js";
import { useTranslation } from "react-i18next";

const ARMOR_PART_LABEL_KEYS = {
  Head: "injuries.head",
  "Left Arm": "injuries.leftArm",
  "Right Arm": "injuries.rightArm",
  Torso: "injuries.torso",
  "Left Leg": "injuries.leftLeg",
  "Right Leg": "injuries.rightLeg",
};

const ARMOR_PART_CODES = {
  Head: "H",
  "Left Arm": "LA",
  "Right Arm": "RA",
  Torso: "T",
  "Left Leg": "LL",
  "Right Leg": "RL",
};

const ARMOR_FIELDS = [
  { key: "physical", icon: "⌖", labelKey: "armorPanel.physical" },
  { key: "energy", icon: "⚡", labelKey: "armorPanel.energy" },
  { key: "radiation", icon: "☢", labelKey: "armorPanel.radiation" },
  { key: "poison", icon: "☣", labelKey: "armorPanel.poison" },
  { key: "hp", icon: "", labelKey: "armorPanel.hp" },
];

export default function ArmorScreen({ armor, onArmorChange }) {
  const { t } = useTranslation();

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("armorPanel.title")} ]</h2>
        <span>{t("armorPanel.locationDr")}</span>
      </div>

      <div className="pip-armor-table">
        <div className="pip-armor-table-head">
          <div className="pip-armor-part-col" />
          {ARMOR_FIELDS.map((field) => (
            <div key={field.key} className="pip-armor-stat-col">
              <span className="pip-armor-stat-icon">{field.icon}</span>
              <span className="pip-armor-stat-text">{t(field.labelKey)}</span>
            </div>
          ))}
        </div>

        <div className="pip-armor-table-body">
          {ARMOR_PARTS.map((part) => (
            <div className="pip-armor-row" key={part}>
              <div className="pip-armor-row-label">
                <span className="pip-armor-row-code">
                  {ARMOR_PART_CODES[part]}
                </span>
                <span className="pip-armor-row-name">
                  {t(ARMOR_PART_LABEL_KEYS[part] || part)}
                </span>
              </div>

              {ARMOR_FIELDS.map((field) => (
                <label
                  key={`${part}-${field.key}`}
                  className="pip-armor-cell"
                  title={`${t(ARMOR_PART_LABEL_KEYS[part] || part)} · ${t(field.labelKey)}`}
                >
                  <span className="pip-armor-cell-mobile-icon">
                    {field.icon}
                  </span>
                  <input
                    className="pip-input pip-armor-mini-input"
                    value={armor?.[part]?.[field.key] || ""}
                    placeholder={field.icon}
                    inputMode="numeric"
                    onChange={(e) =>
                      onArmorChange(part, field.key, e.target.value)
                    }
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}