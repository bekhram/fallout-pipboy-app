import React from "react";
import { useTranslation } from "react-i18next";
import { getAdjustedArmorSnapshotForPart } from "../../utils/characterMath.js";

import healthy from "../../assets/injuries/vaultboy_healthy.png";
import powerArmor from "../../assets/injuries/vaultboy_power_armor.png";
import {
  calculatePowerArmorLocations,
  getPowerArmorPartCondition,
} from "../../data/powerArmor.js";

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
  head: { treated: headInjured, crippled: headCritical },
  leftArm: { treated: leftArmInjured, crippled: leftArmCritical },
  rightArm: { treated: rightArmInjured, crippled: rightArmCritical },
  torso: { treated: torsoInjured, crippled: torsoCritical },
  leftLeg: { treated: leftLegInjured, crippled: leftLegCritical },
  rightLeg: { treated: rightLegInjured, crippled: rightLegCritical },
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
  head: { top: "4%", left: "36%", code: "H" },
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

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatSigned(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatArmorValue(value) {
  return value >= 9999 ? "∞" : value;
}

function formatResistModifier(value, isImmune) {
  if (isImmune) return "∞";
  return formatSigned(value);
}

export default function InjuriesVaultBoy({
  injuries = {},
  armor = {},
  derived = {},
  onPartClick,
  onArmorPartClick,
}) {
  const { t, i18n } = useTranslation();
  const armorStateLabels = {
    en: { intact: "Intact", damaged: "Damaged", broken: "Broken", empty: "No piece" },
    ru: { intact: "Целая", damaged: "Повреждена", broken: "Сломана", empty: "Нет детали" },
    uk: { intact: "Ціла", damaged: "Пошкоджена", broken: "Зламана", empty: "Немає деталі" },
    pl: { intact: "Sprawna", damaged: "Uszkodzona", broken: "Zniszczona", empty: "Brak części" },
  }[i18n.resolvedLanguage?.split("-")[0]] || {
    intact: "Intact", damaged: "Damaged", broken: "Broken", empty: "No piece",
  };

  const powerConditions = Object.fromEntries(
    PART_ORDER.map((part) => [
      part,
      getPowerArmorPartCondition(armor?._power?.loadout, ARMOR_KEY_MAP[part]),
    ])
  );
  const isPowerArmorVisible = Object.values(powerConditions).some(Boolean);
  const powerArmorStats = isPowerArmorVisible
    ? calculatePowerArmorLocations(armor?._power?.loadout)
    : null;

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

  const combatModifiers = derived?.combatModifiers || {};
  const incomingDamageFlat = combatModifiers?.incomingDamageFlat || {};
  const immunities = derived?.immunities || [];

  const resistValues = {
    radiation: toNumber(derived?.radiationResistBonus),
    poison: toNumber(derived?.poisonResistBonus),
  };

  const incomingValues = {
    radiation: toNumber(incomingDamageFlat?.radiation),
    poison: toNumber(incomingDamageFlat?.poison),
  };

  const showResistBadge =
    resistValues.radiation !== 0 ||
    resistValues.poison !== 0 ||
    immunities.length > 0; 

  const showIncomingBadge =
    incomingValues.radiation !== 0 ||
    incomingValues.poison !== 0;

  return (
    <div className="pip-injuries-vaultboy-wrap">
      <div className="pip-injuries-vaultboy">
        <img
          src={isPowerArmorVisible ? powerArmor : healthy}
          alt={t("injuries.vaultBoyAlt")}
          className={`pip-injuries-vaultboy-base${isPowerArmorVisible ? " is-power-armor" : ""}`}
          draggable="false"
        />

        {!isPowerArmorVisible && layers.map((layer, index) => (
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
          const armorCondition = powerConditions[part];
          const state = isPowerArmorVisible
            ? armorCondition?.state || "empty"
            : injuries[part] || "normal";
          const partLabel = t(PART_LABEL_KEYS[part]);
          const stateLabel = isPowerArmorVisible
            ? armorStateLabels[state]
            : t(`injuries.state.${state}`);

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
              onClick={() => isPowerArmorVisible ? onArmorPartClick?.(part) : onPartClick?.(part)}
              aria-label={`${partLabel} ${stateLabel}`}
              title={`${partLabel}: ${stateLabel}`}
            />
          );
        })}

        {PART_ORDER.map((part) => {
          const badge = ARMOR_BADGES[part];
          const partLabel = t(PART_LABEL_KEYS[part]);
          const adjusted = powerArmorStats?.[ARMOR_KEY_MAP[part]] ||
            getAdjustedArmorSnapshotForPart({ armor, part, derived });
          const armorCondition = powerConditions[part];

          const physical = formatArmorValue(adjusted.physical);
          const energy = formatArmorValue(adjusted.energy);
          const radiation = formatArmorValue(adjusted.radiation);

          return (
            <div
              key={`${part}-armor`}
              className={`pip-armor-badge is-${part}`}
              style={{
                top: badge.top,
                left: badge.left,
              }}
              title={`${partLabel}: Physical ${physical} / Energy ${energy} / Radiation ${radiation}`}
            >
              <div className="pip-armor-badge-code">{badge.code}</div>
              {isPowerArmorVisible && (
                <div className={`pip-armor-badge-condition is-${armorCondition?.state || "empty"}`}>
                  {armorStateLabels[armorCondition?.state || "empty"]}
                </div>
              )}
              <div className="pip-armor-badge-values">
                <span>{physical}</span>
                <span>{energy}</span>
                <span>{radiation}</span>
              </div>
            </div>
          );
        })}

        {showResistBadge && (
          <div
            className="pip-armor-badge is-modifiers is-resist"
            style={{ top: "1%", left: "70%" }}
            title={`Environmental Resistances & Immunities`}
          >
            <div className="pip-armor-badge-code">|☢|☠|</div>
            <div className="pip-armor-badge-values">
              <span>{formatResistModifier(resistValues.radiation, immunities.includes("radiation"))}</span>
              <span>{formatResistModifier(resistValues.poison, immunities.includes("poison"))}</span>
            </div>
          </div>
        )}

        {showIncomingBadge && (
          <div
            className="pip-armor-badge is-modifiers is-damage"
            style={{ top: "1%", left: "0%" }}
            title={`Environmental Incoming Modifiers`}
          >
            <div className="pip-armor-badge-code">|☢|☠|</div>
            <div className="pip-armor-badge-values">
              <span>{formatSigned(incomingValues.radiation)}</span>
              <span>{formatSigned(incomingValues.poison)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
