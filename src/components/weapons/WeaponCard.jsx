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

  // Розумна функція для об'єднання масивів і видалення дублікатів
  const processTags = (presetArray, customString, dictMap) => {
    const rawList = [
      ...(Array.isArray(presetArray) ? presetArray : []),
      ...(customString ? customString.split(",") : [])
    ].map(s => s.trim()).filter(Boolean);

    const uniqueTags = [];
    const seen = new Set();

    rawList.forEach(tag => {
      // Нормалізуємо для порівняння: прибираємо пробіли, тире, підкреслення і робимо lowercase
      const norm = tag.toLowerCase().replace(/[\s_-]/g, '');
      if (!seen.has(norm)) {
        seen.add(norm);
        uniqueTags.push(tag);
      }
    });

    return uniqueTags.map(tag => {
      const normTag = tag.toLowerCase().replace(/[\s_-]/g, '');
      // Шукаємо або за точним ключем, або за нормалізованим
      const option = dictMap[tag] || Object.values(dictMap).find(o => o.key.toLowerCase().replace(/[\s_-]/g, '') === normTag);

      if (option) {
        return {
          key: option.key,
          label: translateSafe(option.nameKey, option.name),
          title: translateSafe(option.descriptionKey, option.description),
        };
      }
      // Якщо це кастомний тег, якого немає в базі
      return { key: tag, label: tag, title: "" };
    });
  };

  const baseMetadata = getWeaponMetadata(weapon, globalWeapons);
  const modifiedWeapon = applyWeaponMods({ ...weapon, ...baseMetadata });
  const processedQualities = processTags(
    modifiedWeapon.qualities,
    modifiedWeapon.qualitiesCustom,
    qualityMap
  );
  const processedEffects = processTags(
    modifiedWeapon.effects,
    modifiedWeapon.customEffect,
    effectMap
  );
  const allTags = [...processedQualities, ...processedEffects];
  const weaponMetadata = {
    cost: modifiedWeapon.cost,
    weight: modifiedWeapon.weight,
    rarity: baseMetadata.rarity,
  };
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
      if (event.key === "Escape") {
        setActivePropertyIndex(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePropertyIndex]);

  const skillLabel = weapon.skill
    ? translateSafe(SKILL_LABEL_KEYS?.[weapon.skill], weapon.skill)
    : "—";

  const damageTypeLabel = modifiedWeapon.type
    ? translateSafe(`weaponDamageTypes.${modifiedWeapon.type}`, modifiedWeapon.type)
    : "—";

  const rangeLabel = modifiedWeapon.range
    ? translateSafe(`weaponRanges.${modifiedWeapon.range}`, modifiedWeapon.range)
    : "—";

  const getRangeShort = (rLabel) => {
    const match = rLabel.match(/\((.*?)\)/);
    return match ? match[1] : rLabel;
  };

  const handleRoll = (e) => {
    e.stopPropagation();
    onRoll?.(
      createWeaponRoll({
        weapon: modifiedWeapon,
        diceCount: 2,
        difficulty: 1,
        useRate,
      })
    );
  };

  const hasMods = MOD_SLOTS.some(slot => weapon.mods?.[slot.key] && weapon.mods?.[slot.key].trim() !== "");

  return (
    <article className="pip-panel pip-item-card pip-weapon-card">
      
      {/* Шапка: Назва та Мета дані */}
      <div className="pip-weapon-header">
        <div className="pip-weapon-header-left">
          <h3>{weapon.name || t("weapons.unnamedWeapon")}</h3>
          <span>{skillLabel}</span>
        </div>

        <div className="pip-weapon-card-actions">
          <button type="button" className="pip-btn" onClick={(e) => { e.stopPropagation(); onEdit(index); }}>✎</button>
          <button type="button" className="pip-btn" onClick={(e) => { e.stopPropagation(); onCopy(index); }}>⎘</button>
          <button type="button" className="pip-btn is-danger" onClick={(e) => { e.stopPropagation(); onRemove(index); }}>✕</button>
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

      {/* Центральна сітка статів */}
      <div className="pip-weapon-stats-grid">
        <div className="pip-stat-box is-clickable" onClick={handleRoll} title="Click to Roll Damage">
          <div className="stat-label">Damage Dice</div>
          <div className="stat-value"><span>🎲</span> {modifiedWeapon.damage || "0"}</div>
          <div className="stat-sub">{damageTypeLabel}</div>
        </div>

        <div 
          className={`pip-stat-box is-clickable ${useRate ? 'is-active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setUseRate((prev) => !prev); }}
          title="Click to toggle Burst"
        >
          <div className="stat-label">Rate of Fire</div>
          <div className="stat-value">{modifiedWeapon.rate || "0"}</div>
          <div className="stat-sub">{useRate ? "ACTIVE" : "OFF"}</div>
        </div>

        <div className="pip-stat-box">
          <div className="stat-label">Range</div>
          <div className="stat-value">{getRangeShort(rangeLabel)}</div>
          <div className="stat-sub">{rangeLabel.replace(/\s*\(.*?\)/, '')}</div>
        </div>
      </div>

      {/* Властивості (без дублікатів!) */}
      {allTags.length > 0 && (
        <div className="pip-weapon-properties" ref={propertiesRef}>
          <ul className="pip-weapon-property-list">
            {allTags.map((tag, i) => {
              const isActive = activePropertyIndex === i;
              const tooltipId = `weapon-${index}-property-${i}-tooltip`;

              return (
                <li key={`trait-${index}-${i}`}>
                  {tag.title ? (
                    <button
                      type="button"
                      className={`pip-weapon-property-button ${isActive ? "is-active" : ""}`}
                      aria-expanded={isActive}
                      aria-controls={tooltipId}
                      aria-describedby={isActive ? tooltipId : undefined}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActivePropertyIndex(isActive ? null : i);
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

      {/* Креслення модифікацій */}
      {hasMods && (
        <div className="pip-weapon-mods-blueprint">
          <div style={{ opacity: 0.6, marginBottom: "10px", textTransform: "uppercase", fontSize: "0.8em", letterSpacing: "1px" }}>
            [ {t("weaponMods.title")} ]
          </div>
          <div className="pip-weapon-mods-grid">
            {MOD_SLOTS.map((slot) => {
              const modName = weapon.mods?.[slot.key];
              const isModded = !!modName && modName.trim() !== "";
              if (!isModded) return null; 
              
              return (
                <div key={slot.key} style={{ display: "flex", gap: "5px" }}>
                  <span style={{ opacity: 0.5, textTransform: "uppercase" }}>{t(`weaponMods.slots.${slot.key}`, slot.label)}:</span>
                  <span style={{ fontWeight: "bold", color: "var(--pip-color-highlight, #fff)" }}>{localizeWeaponModName(modName, i18n.resolvedLanguage)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <footer className="pip-weapon-footer">
        <div className="pip-weapon-meta">
          <div className="pip-weapon-meta-item">
            <span className="meta-label">{t("weapons.cost")}</span>
            <span className="meta-value">{weaponMetadata.cost === "" ? "—" : weaponMetadata.cost}</span>
          </div>
          <div className="pip-weapon-meta-item">
            <span className="meta-label">{t("weapons.weight")}</span>
            <span className="meta-value">{weaponMetadata.weight === "" ? "—" : weaponMetadata.weight}</span>
          </div>
          <div className="pip-weapon-meta-item">
            <span className="meta-label">{t("weapons.rarity")}</span>
            <span className="meta-value">{weaponMetadata.rarity === "" ? "—" : weaponMetadata.rarity}</span>
          </div>
        </div>

        <div className="pip-ammo-tab">
          {modifiedWeapon.ammo || "NO AMMO"}
        </div>
      </footer>
    </article>
  );
}
