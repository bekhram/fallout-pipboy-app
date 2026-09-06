import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createWeaponRoll } from "../../utils/dice";
import {
  WEAPON_EFFECT_OPTIONS,
  WEAPON_QUALITY_OPTIONS,
  SKILL_LABEL_KEYS,
} from "../../constants.js";
import { getWeaponMetadata } from "../../utils/weaponDatabase.js";
import { applyWeaponMods, MOD_SLOT_LABELS } from "../../data/weaponMods.js";
import { localizeWeaponModName } from "../../utils/weaponModLocalization.js";
import { applyPassiveWeaponPerks } from "../../utils/weaponPerkEffects.js";

const qualityMap = Object.fromEntries(
  WEAPON_QUALITY_OPTIONS.map((item) => [item.key, item])
);

const effectMap = Object.fromEntries(
  WEAPON_EFFECT_OPTIONS.map((item) => [item.key, item])
);

const MOD_SLOTS = Object.entries(MOD_SLOT_LABELS).map(([key, label]) => ({
  key,
  label,
}));

export default function WeaponCard({
  weapon,
  index,
  onEdit,
  onCopy,
  onRemove,
  onRoll,
  form,
  globalWeapons,
}) {
  const { t, i18n } = useTranslation();
  const [useRate, setUseRate] = useState(false);
  const [activePropertyIndex, setActivePropertyIndex] = useState(null);
  const propertiesRef = useRef(null);

  const weaponImageSlug = String(weapon.name || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/^\.+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const weaponImageSrc = weaponImageSlug
    ? `/weapon-images/${weaponImageSlug}.webp`
    : "";
  const [imageAvailable, setImageAvailable] = useState(Boolean(weaponImageSlug));

  useEffect(() => {
    setImageAvailable(Boolean(weaponImageSlug));
  }, [weaponImageSlug]);

  const translateSafe = (key, fallback = "") => {
    if (!key) return fallback;
    const value = t(key);
    return value === key ? fallback : value;
  };

  const processTags = (presetArray, customString, dictMap) => {
    const rawList = [
      ...(Array.isArray(presetArray) ? presetArray : []),
      ...(customString ? customString.split(",") : []),
    ].map((s) => s.trim()).filter(Boolean);

    const uniqueTags = [];
    const seen = new Set();

    rawList.forEach((tag) => {
      const norm = tag.toLowerCase().replace(/[\s_-]/g, "");
      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueTags.push(tag);
      }
    });

    return uniqueTags.map((tag) => {
      const normTag = tag.toLowerCase().replace(/[\s_-]/g, "");
      const option = dictMap[tag]
        || Object.values(dictMap).find(
          (candidate) => candidate.key.toLowerCase().replace(/[\s_-]/g, "") === normTag
        );

      if (option) {
        return {
          key: option.key,
          label: translateSafe(option.nameKey, option.name),
          title: translateSafe(option.descriptionKey, option.description),
        };
      }

      return { key: tag, label: tag, title: "" };
    });
  };

  const baseMetadata = getWeaponMetadata(weapon, globalWeapons);
  const modifiedWeapon = applyWeaponMods({ ...weapon, ...baseMetadata });
  const perkResult = applyPassiveWeaponPerks(form, modifiedWeapon);
  const calculatedWeapon = perkResult.weapon;

  const processedQualities = processTags(
    calculatedWeapon.qualities,
    calculatedWeapon.qualitiesCustom,
    qualityMap
  );
  const processedEffects = processTags(
    calculatedWeapon.effects,
    calculatedWeapon.customEffect,
    effectMap
  );
  const allTags = [...processedQualities, ...processedEffects];
  const activeProperty = activePropertyIndex === null
    ? null
    : allTags[activePropertyIndex];

  useEffect(() => {
    setActivePropertyIndex(null);
  }, [weapon]);

  useEffect(() => {
    if (activePropertyIndex === null) return undefined;

    const handlePointerDown = (event) => {
      if (!propertiesRef.current?.contains(event.target)) {
        setActivePropertyIndex(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setActivePropertyIndex(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePropertyIndex]);

  const skillLabel = calculatedWeapon.skill
    ? translateSafe(SKILL_LABEL_KEYS?.[calculatedWeapon.skill], calculatedWeapon.skill)
    : "—";

  const damageTypeLabel = calculatedWeapon.type
    ? translateSafe(`weaponDamageTypes.${calculatedWeapon.type}`, calculatedWeapon.type)
    : "—";

  const rangeLabel = calculatedWeapon.range
    ? translateSafe(`weaponRanges.${calculatedWeapon.range}`, calculatedWeapon.range)
    : "—";

  const getRangeShort = (label) => {
    const match = label.match(/\((.*?)\)/);
    return match ? match[1] : label;
  };

  const handleRoll = (event) => {
    event.stopPropagation();
    onRoll?.(
      createWeaponRoll({
        weapon: calculatedWeapon,
        diceCount: 2,
        difficulty: 1,
        useRate: Number(calculatedWeapon.rate || 0) > 0 && useRate,
      })
    );
  };

  const hasMods = MOD_SLOTS.some(
    (slot) => weapon.mods?.[slot.key] && weapon.mods?.[slot.key].trim() !== ""
  );

  return (
    <article className="pip-panel pip-item-card pip-weapon-card">
      <div className="pip-weapon-header">
        <div className="pip-weapon-header-left">
          <h3>{weapon.name || t("weapons.unnamedWeapon")}</h3>
          <span>{skillLabel}</span>
        </div>

        <div className="pip-weapon-card-actions">
          <button type="button" className="pip-btn" onClick={(event) => { event.stopPropagation(); onEdit(index); }}>✎</button>
          <button type="button" className="pip-btn" onClick={(event) => { event.stopPropagation(); onCopy(index); }}>⎘</button>
          <button type="button" className="pip-btn is-danger" onClick={(event) => { event.stopPropagation(); onRemove(index); }}>✕</button>
        </div>
      </div>

      {weaponImageSrc && imageAvailable && (
        <div className="pip-weapon-visual">
          <img
            src={weaponImageSrc}
            alt={weapon.name || t("weapons.unnamedWeapon")}
            loading="lazy"
            onError={() => setImageAvailable(false)}
          />
        </div>
      )}

      <div className="pip-weapon-stats-grid">
        <div className="pip-stat-box is-clickable" onClick={handleRoll} title="Click to Roll Damage">
          <div className="stat-label">Damage Dice</div>
          <div className="stat-value"><span aria-hidden="true">⌖</span> {calculatedWeapon.damage || "0"}</div>
          <div className="stat-sub">{damageTypeLabel}</div>
          {perkResult.notes.length > 0 && (
            <div className="stat-sub">{perkResult.notes.join(" · ")}</div>
          )}
        </div>

        {Number(calculatedWeapon.rate || 0) > 0 && (
          <div
            className={`pip-stat-box is-clickable ${useRate ? "is-active" : ""}`}
            onClick={(event) => { event.stopPropagation(); setUseRate((prev) => !prev); }}
            title="Click to toggle Burst"
          >
            <div className="stat-label">Rate of Fire</div>
            <div className="stat-value">{calculatedWeapon.rate}</div>
            <div className="stat-sub">{useRate ? "ACTIVE" : "OFF"}</div>
          </div>
        )}

        <div className="pip-stat-box">
          <div className="stat-label">Range</div>
          <div className="stat-value">{getRangeShort(rangeLabel)}</div>
          <div className="stat-sub">{rangeLabel.replace(/\s*\(.*?\)/, "")}</div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="pip-weapon-properties" ref={propertiesRef}>
          <ul className="pip-weapon-property-list">
            {allTags.map((tag, tagIndex) => {
              const isActive = activePropertyIndex === tagIndex;
              const tooltipId = `weapon-${index}-property-${tagIndex}-tooltip`;

              return (
                <li key={`trait-${index}-${tagIndex}`}>
                  {tag.title ? (
                    <button
                      type="button"
                      className={`pip-weapon-property-button ${isActive ? "is-active" : ""}`}
                      aria-expanded={isActive}
                      aria-controls={tooltipId}
                      aria-describedby={isActive ? tooltipId : undefined}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActivePropertyIndex(isActive ? null : tagIndex);
                      }}
                    >
                      <span className="pip-weapon-property-indicator" aria-hidden="true">
                        {isActive ? "−" : "+"}
                      </span>
                      <span>{tag.label}</span>
                    </button>
                  ) : (
                    <span className="pip-weapon-property-button is-static">
                      <span className="pip-weapon-property-indicator" aria-hidden="true">•</span>
                      <span>{tag.label}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {activeProperty?.title && (
            <div
              id={`weapon-${index}-property-${activePropertyIndex}-tooltip`}
              className="pip-weapon-property-tooltip"
              role="tooltip"
            >
              <div className="pip-weapon-property-tooltip-head">
                <strong>{activeProperty.label}</strong>
                <button
                  type="button"
                  className="pip-weapon-property-tooltip-close"
                  aria-label={t("weapons.closePropertyDescription")}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActivePropertyIndex(null);
                  }}
                >
                  ×
                </button>
              </div>
              <p>{activeProperty.title}</p>
            </div>
          )}
        </div>
      )}

      {hasMods && (
        <div className="pip-weapon-mods-blueprint">
          <div style={{ opacity: 0.6, marginBottom: "10px", textTransform: "uppercase", fontSize: "0.8em", letterSpacing: "1px" }}>
            [ {t("weaponMods.title")} ]
          </div>
          <div className="pip-weapon-mods-grid">
            {MOD_SLOTS.map((slot) => {
              const modName = weapon.mods?.[slot.key];
              if (!modName || modName.trim() === "") return null;

              return (
                <div key={slot.key} style={{ display: "flex", gap: "5px" }}>
                  <span style={{ opacity: 0.5, textTransform: "uppercase" }}>{t(`weaponMods.slots.${slot.key}`, slot.label)}:</span>
                  <span style={{ fontWeight: "bold", color: "var(--pip-color-highlight, #fff)" }}>
                    {localizeWeaponModName(modName, i18n.resolvedLanguage)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <footer className="pip-weapon-footer pip-weapon-footer--ammo-only">
        <div className="pip-ammo-tab">
          {calculatedWeapon.ammo || "NO AMMO"}
        </div>
      </footer>
    </article>
  );
}
