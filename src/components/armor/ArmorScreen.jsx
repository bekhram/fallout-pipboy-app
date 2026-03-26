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

const PART_LABEL_KEYS = {
  Head: "injuries.head",
  Torso: "injuries.torso",
  "Left Arm": "injuries.leftArm",
  "Right Arm": "injuries.rightArm",
  "Left Leg": "injuries.leftLeg",
  "Right Leg": "injuries.rightLeg",
};

export default function ArmorScreen({ armor, onArmorChange }) {
  const { t } = useTranslation();

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("armorPanel.title")} ]</h2>
        <span>{t("armorPanel.locationDr")}</span>
      </div>

      <div className="pip-armor-grid">
        {ARMOR_PARTS.map((part) => (
          <div className="pip-panel pip-armor-card" key={part}>
            <h3>{t(ARMOR_PART_LABEL_KEYS[part] || part)}</h3>

            <div className="pip-form-grid">
              <input
                className="pip-input"
                placeholder={`⌖ ${t("armorPanel.physical")}`}
                value={armor[part]?.physical || ""}
                onChange={(e) =>
                  onArmorChange(part, "physical", e.target.value)
                }
              />

              <input
                className="pip-input"
                placeholder={`⚡︎ ${t("armorPanel.energy")}`}
                value={armor[part]?.energy || ""}
                onChange={(e) =>
                  onArmorChange(part, "energy", e.target.value)
                }
              />

              <input
                className="pip-input"
                placeholder={`☢ ${t("armorPanel.radiation")}`}
                value={armor[part]?.radiation || ""}
                onChange={(e) =>
                  onArmorChange(part, "radiation", e.target.value)
                }
              />

              <input
                className="pip-input"
                placeholder={t("armorPanel.hp")}
                value={armor[part]?.hp || ""}
                onChange={(e) => onArmorChange(part, "hp", e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}