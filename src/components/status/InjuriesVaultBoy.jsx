import React from "react";
import { useTranslation } from "react-i18next";

import healthy from "../../assets/injuries/vaultboy_healthy.png";

import headInjured from "../../assets/injuries/head_injured.png";
import headCritical from "../../assets/injuries/head_critical.png";

import rightArmInjured from "../../assets/injuries/right_arm_injured.png";
import rightArmCritical from "../../assets/injuries/right_arm_critical.png";

import leftArmInjured from "../../assets/injuries/left_arm_injured.png";
import leftArmCritical from "../../assets/injuries/left_arm_critical.png";

import torsoInjured from "../../assets/injuries/torso_injured.png";
import torsoCritical from "../../assets/injuries/torso_critical.png";

import rightLegInjured from "../../assets/injuries/right_leg_injured.png";
import rightLegCritical from "../../assets/injuries/right_leg_critical.png";

import leftLegInjured from "../../assets/injuries/left_leg_injured.png";
import leftLegCritical from "../../assets/injuries/left_leg_critical.png";

const injuryLayers = {
  head: {
    treated: headInjured,
    crippled: headCritical,
  },
  leftArm: {
    treated: leftArmInjured,
    crippled: leftArmCritical,
  },
  rightArm: {
    treated: rightArmInjured,
    crippled: rightArmCritical,
  },
  torso: {
    treated: torsoInjured,
    crippled: torsoCritical,
  },
  leftLeg: {
    treated: leftLegInjured,
    crippled: leftLegCritical,
  },
  rightLeg: {
    treated: rightLegInjured,
    crippled: rightLegCritical,
  },
};

const PART_ORDER = ["head", "torso", "leftArm", "rightArm", "leftLeg", "rightLeg"];

const HITBOXES = {
  head: { top: "20%", left: "41%", width: "15%", height: "15%" },
  torso: { top: "39%", left: "41%", width: "18%", height: "18%" },
  leftArm: { top: "42%", left: "22%", width: "18%", height: "18%" },
  rightArm: { top: "42%", left: "60%", width: "18%", height: "18%" },
  leftLeg: { top: "61%", left: "35%", width: "13%", height: "28%" },
  rightLeg: { top: "61%", left: "51%", width: "13%", height: "28%" },
};

const ARMOR_BADGES = {
  head: { top: "4%", left: "36%", code: "|⊛|⚡|☣|" },
  torso: { top: "20%", left: "60%", code: "T" },
  leftArm: { top: "42%", left: "-3%", code: "LA" },
  rightArm: { top: "42%", left: "80%", code: "RA" },
  leftLeg: { top: "63%", left: "10%", code: "LL" },
  rightLeg: { top: "63%", left: "66%", code: "RL" },
};

const ARMOR_KEY_MAP = {
  head: "Head",
  leftArm: "Left Arm",
  rightArm: "Right Arm",
  torso: "Torso",
  leftLeg: "Left Leg",
  rightLeg: "Right Leg",
};

const PART_LABEL_KEYS = {
  head: "injuries.head",
  torso: "injuries.torso",
  leftArm: "injuries.leftArm",
  rightArm: "injuries.rightArm",
  leftLeg: "injuries.leftLeg",
  rightLeg: "injuries.rightLeg",
};

export default function InjuriesVaultBoy({
  injuries = {},
  armor = {},
  onPartClick,
}) {
  const { t } = useTranslation();

  const layers = PART_ORDER
    .map((part) => {
      const state = injuries[part];
      if (state !== "treated" && state !== "crippled") return null;

      return {
        part,
        src: injuryLayers[part]?.[state] || null,
        state,
      };
    })
    .filter((item) => item?.src);

  return (
    <div className="pip-injuries-vaultboy-wrap">
      <div className="pip-injuries-vaultboy">
        <img
          src={healthy}
          alt={t("injuries.vaultBoyAlt")}
          className="pip-injuries-vaultboy-base"
          draggable="false"
        />

        {layers.map((layer, index) => (
          <img
            key={`${layer.part}-${layer.state}-${index}`}
            src={layer.src}
            alt=""
            aria-hidden="true"
            className={`pip-injuries-vaultboy-overlay is-${layer.part} is-${layer.state}`}
            draggable="false"
          />
        ))}

        {PART_ORDER.map((part) => {
          const box = HITBOXES[part];
          const state = injuries[part] || "normal";
          const partLabel = t(PART_LABEL_KEYS[part]);
          const stateLabel = t(`injuries.state.${state}`);

          return (
            <button
              key={part}
              type="button"
              className={`pip-injury-hitbox is-${part} is-${state}`}
              style={{
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
              }}
              onClick={() => onPartClick?.(part)}
              aria-label={`${partLabel} ${stateLabel}`}
              title={`${partLabel}: ${stateLabel}`}
            />
          );
        })}

        {PART_ORDER.map((part) => {
          const badge = ARMOR_BADGES[part];
          const armorKey = ARMOR_KEY_MAP[part];
          const stats = armor?.[armorKey] || {};
          const partLabel = t(PART_LABEL_KEYS[part]);

          const physical = stats.physical || 0;
          const energy = stats.energy || 0;
          const radiation = stats.radiation || 0;

          return (
            <div
              key={`${part}-armor`}
              className={`pip-armor-badge is-${part}`}
              style={{
                top: badge.top,
                left: badge.left,
              }}
              title={`${partLabel}: ${t("armorPanel.physical")} ${physical} / ${t("armorPanel.energy")} ${energy} / ${t("armorPanel.radiation")} ${radiation}`}
            >
              <div className="pip-armor-badge-code">{badge.code}</div>
              <div className="pip-armor-badge-values">
                <span>{physical}</span>
                <span>{energy}</span>
                <span>{radiation}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}