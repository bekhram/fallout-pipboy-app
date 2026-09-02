import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { createWeaponRoll } from "../../utils/dice";
import {
  WEAPON_EFFECT_OPTIONS,
  WEAPON_QUALITY_OPTIONS,
  SKILL_LABEL_KEYS,
} from "../../constants.js";

const qualityMap = Object.fromEntries(
  WEAPON_QUALITY_OPTIONS.map((item) => [item.key, item])
);

const effectMap = Object.fromEntries(
  WEAPON_EFFECT_OPTIONS.map((item) => [item.key, item])
);

const MOD_SLOTS = [
  { key: "receiver", label: "Receiver" },
  { key: "barrel", label: "Barrel" },
  { key: "grip", label: "Grip / Stock" },
  { key: "magazine", label: "Magazine" },
  { key: "sights", label: "Sights" },
  { key: "muzzle", label: "Muzzle" },
];

export default function WeaponCard({
  weapon,
  index,
  onEdit,
  onCopy,
  onRemove,
  onRoll,
}) {
  const { t } = useTranslation();
  const [useRate, setUseRate] = useState(false);

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

  const processedQualities = processTags(weapon.qualities, weapon.qualitiesCustom, qualityMap);
  const processedEffects = processTags(weapon.effects, weapon.customEffect, effectMap);
  const allTags = [...processedQualities, ...processedEffects];

  const skillLabel = weapon.skill
    ? translateSafe(SKILL_LABEL_KEYS?.[weapon.skill], weapon.skill)
    : "—";

  const damageTypeLabel = weapon.type
    ? translateSafe(`weaponDamageTypes.${weapon.type}`, weapon.type)
    : "—";

  const rangeLabel = weapon.range
    ? translateSafe(`weaponRanges.${weapon.range}`, weapon.range)
    : "—";

  const getRangeShort = (rLabel) => {
    const match = rLabel.match(/\((.*?)\)/);
    return match ? match[1] : rLabel;
  };

  const handleRoll = (e) => {
    e.stopPropagation();
    onRoll?.(
      createWeaponRoll({
        weapon,
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
        
        <div className="pip-weapon-meta">
          <div className="pip-weapon-meta-item">
            <span className="meta-label">Cost</span>
            <span className="meta-value">{weapon.cost || "—"}</span>
          </div>
          <div className="pip-weapon-meta-item">
            <span className="meta-label">Weight</span>
            <span className="meta-value">{weapon.weight || "—"}</span>
          </div>
          <div className="pip-weapon-meta-item">
            <span className="meta-label">Rarity</span>
            <span className="meta-value">{weapon.rarity || "—"}</span>
          </div>
        </div>
      </div>

      {/* Центральна сітка статів */}
      <div className="pip-weapon-stats-grid">
        <div className="pip-stat-box is-clickable" onClick={handleRoll} title="Click to Roll Damage">
          <div className="stat-label">Damage Dice</div>
          <div className="stat-value"><span>🎲</span> {weapon.damage || "0"}</div>
          <div className="stat-sub">{damageTypeLabel}</div>
        </div>

        <div 
          className={`pip-stat-box is-clickable ${useRate ? 'is-active' : ''}`}
          onClick={(e) => { e.stopPropagation(); setUseRate((prev) => !prev); }}
          title="Click to toggle Burst"
        >
          <div className="stat-label">Rate of Fire</div>
          <div className="stat-value">{weapon.rate || "0"}</div>
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
        <div className="pip-weapon-properties">
          {allTags.map((tag, i) => (
            <div key={`trait-${index}-${i}`} className="pip-weapon-property-row">
              <strong style={{ textTransform: "uppercase", letterSpacing: "1px", color: "var(--pip-color-highlight, #fff)" }}>
                {tag.label}{tag.title ? ": " : ""}
              </strong> 
              {tag.title && <span style={{ opacity: 0.85 }}>{tag.title}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Креслення модифікацій */}
      {hasMods && (
        <div className="pip-weapon-mods-blueprint">
          <div style={{ opacity: 0.6, marginBottom: "10px", textTransform: "uppercase", fontSize: "0.8em", letterSpacing: "1px" }}>
            [ WORKBENCH SCHEMATICS ]
          </div>
          <div className="pip-weapon-mods-grid">
            {MOD_SLOTS.map((slot) => {
              const modName = weapon.mods?.[slot.key];
              const isModded = !!modName && modName.trim() !== "";
              if (!isModded) return null; 
              
              return (
                <div key={slot.key} style={{ display: "flex", gap: "5px" }}>
                  <span style={{ opacity: 0.5, textTransform: "uppercase" }}>{slot.label}:</span>
                  <span style={{ fontWeight: "bold", color: "var(--pip-color-highlight, #fff)" }}>{modName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Кнопки керування внизу зліва */}
      <div className="pip-weapon-card-actions">
        <button type="button" className="pip-btn" onClick={(e) => { e.stopPropagation(); onEdit(index); }}>✎</button>
        <button type="button" className="pip-btn" onClick={(e) => { e.stopPropagation(); onCopy(index); }}>⎘</button>
        <button type="button" className="pip-btn is-danger" onClick={(e) => { e.stopPropagation(); onRemove(index); }}>✕</button>
      </div>

      {/* Ярлик набоїв внизу справа */}
      <div className="pip-ammo-tab">
        {weapon.ammo || "NO AMMO"}
      </div>
    </article>
  );
}