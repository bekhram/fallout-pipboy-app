import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAdjustedArmorSnapshotForPart } from "../../utils/characterMath.js";
import {
  calculateNormalArmorLocations,
  parseArmorDatabase,
} from "../../utils/armorDatabase.js";

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

import paHeadDamaged from "../../assets/injuries/power-armor-v2/head_damaged.svg";
import paHeadBroken from "../../assets/injuries/power-armor-v2/head_broken.svg";
import paTorsoDamaged from "../../assets/injuries/power-armor-v2/torso_damaged.svg";
import paTorsoBroken from "../../assets/injuries/power-armor-v2/torso_broken.svg";
import paLeftArmDamaged from "../../assets/injuries/power-armor-v2/left_arm_damaged.svg";
import paLeftArmBroken from "../../assets/injuries/power-armor-v2/left_arm_broken.svg";
import paRightArmDamaged from "../../assets/injuries/power-armor-v2/right_arm_damaged.svg";
import paRightArmBroken from "../../assets/injuries/power-armor-v2/right_arm_broken.svg";
import paLeftLegDamaged from "../../assets/injuries/power-armor-v2/left_leg_damaged.svg";
import paLeftLegBroken from "../../assets/injuries/power-armor-v2/left_leg_broken.svg";
import paRightLegDamaged from "../../assets/injuries/power-armor-v2/right_leg_damaged.svg";
import paRightLegBroken from "../../assets/injuries/power-armor-v2/right_leg_broken.svg";

const injuryLayers = {
  head: { treated: headInjured, crippled: headCritical },
  leftArm: { treated: leftArmInjured, crippled: leftArmCritical },
  rightArm: { treated: rightArmInjured, crippled: rightArmCritical },
  torso: { treated: torsoInjured, crippled: torsoCritical },
  leftLeg: { treated: leftLegInjured, crippled: leftLegCritical },
  rightLeg: { treated: rightLegInjured, crippled: rightLegCritical },
};

const POWER_ARMOR_DAMAGE_IMAGES = {
  head: { damaged: paHeadDamaged, broken: paHeadBroken },
  torso: { damaged: paTorsoDamaged, broken: paTorsoBroken },
  leftArm: { damaged: paLeftArmDamaged, broken: paLeftArmBroken },
  rightArm: { damaged: paRightArmDamaged, broken: paRightArmBroken },
  leftLeg: { damaged: paLeftLegDamaged, broken: paLeftLegBroken },
  rightLeg: { damaged: paRightLegDamaged, broken: paRightLegBroken },
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

const POWER_ARMOR_DAMAGE_OVERLAYS = {
  head: { top: "17%", left: "36%", width: "28%", height: "24%" },
  torso: { top: "31%", left: "32%", width: "36%", height: "34%" },
  leftArm: { top: "34%", left: "14%", width: "32%", height: "40%" },
  rightArm: { top: "34%", left: "54%", width: "32%", height: "40%" },
  leftLeg: { top: "55%", left: "27%", width: "27%", height: "42%" },
  rightLeg: { top: "55%", left: "46%", width: "27%", height: "42%" },
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

function applyDerivedResistance(base = {}, derived = {}) {
  const immunities = derived?.immunities || [];
  return {
    physical: immunities.includes("physical")
      ? 9999
      : Math.max(0, toNumber(base.physical) + toNumber(derived?.physicalResistBonus)),
    energy: immunities.includes("energy")
      ? 9999
      : Math.max(0, toNumber(base.energy) + toNumber(derived?.energyResistBonus)),
    radiation: immunities.includes("radiation")
      ? 9999
      : Math.max(0, toNumber(base.radiation) + toNumber(derived?.radiationResistBonus)),
    poison: immunities.includes("poison")
      ? 9999
      : Math.max(0, toNumber(base.poison) + toNumber(derived?.poisonResistBonus)),
  };
}

function PowerArmorDamagePart({ part, state }) {
  const overlay = POWER_ARMOR_DAMAGE_OVERLAYS[part];
  const src = POWER_ARMOR_DAMAGE_IMAGES[part]?.[state];
  if (!overlay || !src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{
        position: "absolute",
        inset: "auto",
        top: overlay.top,
        left: overlay.left,
        right: "auto",
        bottom: "auto",
        width: overlay.width,
        height: overlay.height,
        maxWidth: "none",
        margin: 0,
        padding: 0,
        objectFit: "fill",
        objectPosition: "center",
        zIndex: 4,
        pointerEvents: "none",
        opacity: state === "broken" ? 1 : 0.96,
        filter:
          state === "broken"
            ? "drop-shadow(0 0 6px rgba(255, 70, 70, 0.7))"
            : "drop-shadow(0 0 5px rgba(255, 180, 60, 0.6))",
      }}
    />
  );
}

export default function InjuriesVaultBoy({
  injuries = {},
  armor = {},
  derived = {},
  viewMode = "injuries",
  onPartClick,
  onArmorPartClick,
}) {
  const { t, i18n } = useTranslation();
  const [armorDatabase, setArmorDatabase] = useState(null);

  useEffect(() => {
    let active = true;

    fetch("/Armor.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Armor database unavailable");
        return response.text();
      })
      .then((text) => {
        if (active) setArmorDatabase(parseArmorDatabase(text));
      })
      .catch(() => {
        if (active) setArmorDatabase(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const armorStateLabels = {
    en: { intact: "Intact", damaged: "Damaged", broken: "Broken", empty: "No piece" },
    ru: { intact: "Целая", damaged: "Повреждена", broken: "Сломана", empty: "Нет детали" },
    uk: { intact: "Ціла", damaged: "Пошкоджена", broken: "Зламана", empty: "Немає деталі" },
    pl: { intact: "Sprawna", damaged: "Uszkodzona", broken: "Zniszczona", empty: "Brak części" },
  }[i18n.resolvedLanguage?.split("-")[0]] || {
    intact: "Intact",
    damaged: "Damaged",
    broken: "Broken",
    empty: "No piece",
  };

  const powerConditions = Object.fromEntries(
    PART_ORDER.map((part) => [
      part,
      getPowerArmorPartCondition(armor?._power?.loadout, ARMOR_KEY_MAP[part]),
    ])
  );

  const hasPowerArmor = Object.values(powerConditions).some(Boolean);
  const isPowerArmorVisible = viewMode === "powerArmor" && hasPowerArmor;
  const powerArmorStats = isPowerArmorVisible
    ? calculatePowerArmorLocations(armor?._power?.loadout)
    : null;

  const normalArmorStats = useMemo(() => {
    if (!armorDatabase) return null;
    return calculateNormalArmorLocations(armor, armorDatabase);
  }, [armor, armorDatabase]);

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
    incomingValues.radiation !== 0 || incomingValues.poison !== 0;

  return (
    <div className="pip-injuries-vaultboy-wrap">
      <div className="pip-injuries-vaultboy">
        <img
          src={isPowerArmorVisible ? powerArmor : healthy}
          alt={t("injuries.vaultBoyAlt")}
          className={`pip-injuries-vaultboy-base${isPowerArmorVisible ? " is-power-armor" : ""}`}
          draggable="false"
        />

        {!isPowerArmorVisible &&
          layers.map((layer, index) => (
            <img
              key={`${layer.part}-${layer.state}-${index}`}
              src={layer.src}
              alt=""
              aria-hidden="true"
              className={`pip-injuries-vaultboy-overlay is-${layer.part} is-${layer.state}`}
              draggable="false"
            />
          ))}

        {isPowerArmorVisible && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 3,
              transform: "scale(0.78)",
              transformOrigin: "center center",
              pointerEvents: "none",
            }}
          >
            {PART_ORDER.map((part) => (
              <PowerArmorDamagePart
                key={`pa-damage-${part}-${powerConditions[part]?.state || "empty"}`}
                part={part}
                state={powerConditions[part]?.state}
              />
            ))}
          </div>
        )}

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
              onClick={() =>
                isPowerArmorVisible ? onArmorPartClick?.(part) : onPartClick?.(part)
              }
              aria-label={`${partLabel} ${stateLabel}`}
              title={`${partLabel}: ${stateLabel}`}
            />
          );
        })}

        {PART_ORDER.map((part) => {
          const badge = ARMOR_BADGES[part];
          const partLabel = t(PART_LABEL_KEYS[part]);
          const normalBase = normalArmorStats?.[ARMOR_KEY_MAP[part]];
          const adjusted = isPowerArmorVisible
            ? powerArmorStats?.[ARMOR_KEY_MAP[part]] || {
                physical: 0,
                energy: 0,
                radiation: 0,
              }
            : normalBase
            ? applyDerivedResistance(normalBase, derived)
            : getAdjustedArmorSnapshotForPart({ armor, part, derived });

          const physical = formatArmorValue(adjusted.physical);
          const energy = formatArmorValue(adjusted.energy);
          const radiation = formatArmorValue(adjusted.radiation);

          return (
            <div
              key={`${part}-armor`}
              className={`pip-armor-badge is-${part}`}
              style={{ top: badge.top, left: badge.left }}
              title={`${partLabel}: Physical ${physical} / Energy ${energy} / Radiation ${radiation}`}
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

        {showResistBadge && (
          <div
            className="pip-armor-badge is-modifiers is-resist"
            style={{ top: "1%", left: "70%" }}
            title="Environmental Resistances & Immunities"
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
            title="Environmental Incoming Modifiers"
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
