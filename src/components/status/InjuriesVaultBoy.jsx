import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { sheetCopy } from "../layout/sheetCopy.js";
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

const POWER_ARMOR_DAMAGE_OVERLAYS = {
  head: { top: "17%", left: "36%", width: "28%", height: "24%" },
  torso: { top: "31%", left: "32%", width: "36%", height: "34%" },
  leftArm: { top: "34%", left: "14%", width: "32%", height: "40%" },
  rightArm: { top: "34%", left: "54%", width: "32%", height: "40%" },
  leftLeg: { top: "55%", left: "27%", width: "27%", height: "42%" },
  rightLeg: { top: "55%", left: "46%", width: "27%", height: "42%" },
};

const POWER_ARMOR_CRACKS = {
  head: ["M52 5 46 26 55 40 43 58 50 78 35 96", "M47 28 29 35 18 50", "M54 41 72 34 84 45"],
  torso: ["M46 4 51 22 43 37 55 52 46 69 53 96", "M45 37 25 31 12 43", "M55 52 76 42 91 49", "M46 69 29 77 20 92"],
  leftArm: ["M61 4 52 24 61 39 48 56 55 74 43 96", "M53 24 32 18 20 31", "M48 56 26 62 14 78"],
  rightArm: ["M39 4 48 24 39 39 52 56 45 74 57 96", "M47 24 68 18 80 31", "M52 56 74 62 86 78"],
  leftLeg: ["M58 3 48 24 57 43 45 61 53 79 40 97", "M49 24 28 31 17 45", "M46 61 25 67 15 82"],
  rightLeg: ["M42 3 52 24 43 43 55 61 47 79 60 97", "M51 24 72 31 83 45", "M54 61 75 67 85 82"],
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
  if (!overlay || (state !== "damaged" && state !== "broken")) return null;

  const cracks = POWER_ARMOR_CRACKS[part] || [];

  return (
    <svg
      className={`pip-power-cracks is-${part} is-${state}`}
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        top: overlay.top,
        left: overlay.left,
        width: overlay.width,
        height: overlay.height,
      }}
    >
      <path className="pip-power-crack-main" d={cracks[0]} />
      {cracks.slice(1).map((path, index) => (
        <path
          className="pip-power-crack-branch"
          d={path}
          key={`${part}-crack-${index}`}
        />
      ))}
    </svg>
  );
}

export default function InjuriesVaultBoy({
  showLabels = false,
  injuries = {},
  armor = {},
  derived = {},
  viewMode = "injuries",
  onPartClick,
  onArmorPartClick,
  onArmorChange,
}) {
  const { t, i18n } = useTranslation();
  const c = sheetCopy(i18n.resolvedLanguage);
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
    intact: t("armorPanel.intact"),
    damaged: t("armorPanel.damaged"),
    broken: t("armorPanel.broken"),
    empty: t("armorPanel.emptyPiece"),
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

  const armorValues = Object.fromEntries(PART_ORDER.map(part => {
    const base = normalArmorStats?.[ARMOR_KEY_MAP[part]];
    return [part, isPowerArmorVisible
      ? powerArmorStats?.[ARMOR_KEY_MAP[part]] || {physical:0, energy:0, radiation:0}
      : base ? applyDerivedResistance(base, derived)
      : getAdjustedArmorSnapshotForPart({armor, part, derived})];
  }));

  const normalMaximums = armorDatabase
    ? calculateNormalArmorLocations({...armor, _condition: {parts: {}}}, armorDatabase)
    : armor;
  const normalCondition = part => {
    const key = ARMOR_KEY_MAP[part];
    const maximum = normalMaximums?.[key] || {};
    const current = normalArmorStats?.[key] || maximum;
    const fields = ["physical", "energy", "radiation", "poison"];
    if (!fields.some(field => Number(maximum[field]) > 0)) return "empty";
    const marked = armor?._condition?.parts?.[key]?.status;
    if (["intact", "damaged", "broken"].includes(marked)) return marked;
    if (fields.every(field => !Number(current[field]))) return "broken";
    return fields.some(field => Number(current[field] || 0) < Number(maximum[field] || 0)) ? "damaged" : "intact";
  };
  const changeHp = (part, value) => {
    const key = ARMOR_KEY_MAP[part];
    const condition = powerConditions[part];
    if (!condition || !Number.isFinite(Number(value))) return;
    const loadout = armor._power.loadout;
    onArmorChange?.("_power", "loadout", {...loadout, slots: {...loadout.slots,
      [key]: {...loadout.slots?.[key], currentHp: Math.max(0, Math.min(condition.maximum, Math.round(Number(value))))}
    }});
  };
  const cycleCondition = part => {
    if (isPowerArmorVisible) {
      const condition = powerConditions[part];
      if (!condition) return;
      changeHp(part, condition.state === "intact" ? Math.max(0, condition.maximum - 1) : condition.state === "damaged" ? 0 : condition.maximum);
      return;
    }
    const key = ARMOR_KEY_MAP[part];
    const state = normalCondition(part);
    if (state === "empty") return;
    const next = {intact: "damaged", damaged: "broken", broken: "intact"}[state];
    const parts = armor?._condition?.parts || {};
    const previous = parts[key] || {};
    const maximum = normalMaximums[key];
    const current = next === "broken"
      ? {...maximum, physical: 0, energy: 0, radiation: 0, poison: 0}
      : next === "intact" ? {...maximum} : {...maximum, ...previous.current};
    onArmorChange?.("_condition", "parts", {...parts, [key]: {...previous, status: next, current}});
  };
  const statusIcon = state => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {state === "broken" ? <><path d="M11 3 3 6v6c0 4 3 7 7 9l-2-6 3-4-3-3Z" fill="currentColor"/><path d="m14 3 7 3v6c0 4-3 7-7 9l2-6-3-4 3-3Z" fill="currentColor"/></> : <><path d="m12 2 9 4v6c0 5-5 8-9 10C8 20 3 17 3 12V6Z" fill="none" stroke="currentColor" strokeWidth="2"/>{state === "damaged" && <path d="m13 4-3 7 5 1-4 8" fill="none" stroke="currentColor" strokeWidth="2"/>}</>}
  </svg>;

  return (
    <div className={showLabels ? "sheet-body-display" : undefined}>
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

        {(viewMode !== "armor" ? PART_ORDER : []).map((part) => {
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

        {showLabels && viewMode === "injuries" && PART_ORDER.map(part => <button key={`label-${part}`} type="button" className={`sheet-part-label is-${part}`} onClick={()=>onPartClick?.(part)} aria-label={`${t(PART_LABEL_KEYS[part])} ${t(`injuries.state.${injuries[part] || 'normal'}`)}`}>{t(PART_LABEL_KEYS[part])}</button>)}

        {!showLabels && PART_ORDER.map((part) => {
          const badge = ARMOR_BADGES[part];
          const partLabel = t(PART_LABEL_KEYS[part]);
          const adjusted = armorValues[part];

          const physical = formatArmorValue(adjusted.physical);
          const energy = formatArmorValue(adjusted.energy);
          const radiation = formatArmorValue(adjusted.radiation);

          return (
            <div
              key={`${part}-armor`}
              className={`pip-armor-badge is-${part}`}
              style={{ top: badge.top, left: badge.left }}
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

        {!showLabels && showResistBadge && (
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

        {!showLabels && showIncomingBadge && (
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
    {showLabels && viewMode !== "injuries" && <table className="sheet-armor-table">
      <caption>{isPowerArmorVisible ? t("injuries.powerArmor") : c.normalArmor}</caption>
      <thead><tr><th scope="col">{c.bodyTab}</th>{["physical","energy","radiation"].map((type, index)=><th scope="col" key={type} title={t(`armorPanel.${type}`)}>{c.resistShort[index]}</th>)}{isPowerArmorVisible && <th scope="col">HP</th>}<th scope="col">{c.armorStatus}</th></tr></thead>
      <tbody>{PART_ORDER.map(part=>{
        const condition = powerConditions[part];
        const state = isPowerArmorVisible ? condition?.state || "empty" : normalCondition(part);
        const label = t(PART_LABEL_KEYS[part]);
        return <tr key={part} data-part={part}>
          <th scope="row">{label}</th>
          {["physical","energy","radiation"].map(type=><td key={type}>{formatArmorValue(armorValues[part][type])}</td>)}
          {isPowerArmorVisible && <td className="sheet-armor-hp">{condition ? <label>
            <input type="number" min="0" max={condition.maximum} step="1" inputMode="numeric" aria-label={`${label} HP`} value={condition.current} onChange={event=>changeHp(part,event.target.value)}/><span>/{condition.maximum}</span>
          </label> : "—"}</td>}
          <td><button type="button" className={`sheet-armor-status is-${state}`} disabled={state === "empty" || !onArmorChange} onClick={()=>cycleCondition(part)} aria-label={`${label}: ${state === "empty" ? t("armorPanel.emptyPiece") : c.armorStates[state]}`} title={`${state === "empty" ? t("armorPanel.emptyPiece") : c.armorStates[state]} · ${c.changeStatus}`}>
            {state === "empty" ? "—" : statusIcon(state)}
          </button></td>
        </tr>;
      })}</tbody>
    </table>}
    </div>
  );
}
