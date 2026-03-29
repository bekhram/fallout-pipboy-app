import React, { useMemo, useState } from "react";
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
  const [selectedTagKey, setSelectedTagKey] = useState(null);

  const translateSafe = (key, fallback = "") => {
    if (!key) return fallback;
    const value = t(key);
    return value === key ? fallback : value;
  };

  const qualities = [
    ...(Array.isArray(weapon.qualities) ? weapon.qualities : []),
    ...(weapon.qualitiesCustom
      ? weapon.qualitiesCustom
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : []),
  ];

  const effects = [
    ...(Array.isArray(weapon.effects) ? weapon.effects : []),
    ...(weapon.customEffect
      ? weapon.customEffect
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : []),
  ];

  const translatedQualityTags = qualities.map((tag) => {
    const option = qualityMap[tag];

    return {
      key: `quality-${tag}`,
      type: "quality",
      label: option?.nameKey ? translateSafe(option.nameKey, tag) : tag,
      title: option?.descriptionKey
        ? translateSafe(option.descriptionKey, tag)
        : tag,
    };
  });

  const translatedEffectTags = effects.map((tag) => {
    const option = effectMap[tag];

    return {
      key: `effect-${tag}`,
      type: "effect",
      label: option?.nameKey ? translateSafe(option.nameKey, tag) : tag,
      title: option?.descriptionKey
        ? translateSafe(option.descriptionKey, tag)
        : tag,
    };
  });

  const allTags = [...translatedQualityTags, ...translatedEffectTags];

  const selectedTag = useMemo(
    () => allTags.find((tag) => tag.key === selectedTagKey) || null,
    [allTags, selectedTagKey]
  );

  const skillLabel = weapon.skill
    ? translateSafe(SKILL_LABEL_KEYS?.[weapon.skill], weapon.skill)
    : "—";

  const damageTypeLabel = weapon.type
    ? translateSafe(`weaponDamageTypes.${weapon.type}`, weapon.type)
    : "—";

  const rangeLabel = weapon.range
    ? translateSafe(`weaponRanges.${weapon.range}`, weapon.range)
    : "—";

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

  const handleTagClick = (tagKey) => {
    setSelectedTagKey((prev) => (prev === tagKey ? null : tagKey));
  };

  return (
    <article className="pip-panel pip-item-card pip-weapon-card">
      <div className="pip-weapon-card-actions">
        <button
          type="button"
          className="pip-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(index);
          }}
        >
          {t("common.edit")}
        </button>

        <button
          type="button"
          className="pip-btn"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(index);
          }}
        >
          {t("common.copy")}
        </button>

        <button
          type="button"
          className="pip-btn is-danger"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
        >
          {t("common.delete")}
        </button>
      </div>

      <div className="pip-item-top">
        <div>
          <h3 onClick={handleRoll} style={{ cursor: "pointer" }}>
            {weapon.name || t("weapons.unnamedWeapon")}
          </h3>

          <p>
            {skillLabel} · {damageTypeLabel} · {rangeLabel}
          </p>

          <p>
            {t("weapons.damageShort")} {weapon.damage || "0"}{" "}
            {t("weapons.rateShort")} {weapon.rate || "0"}{" "}
            {t("weapons.ammoShort")} {weapon.ammo || "—"}
          </p>

          <div className="pip-weapon-rate-toggle push-top">
            <button
              type="button"
              className={`pip-btn ${useRate ? "is-primary" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setUseRate((prev) => !prev);
              }}
            >
              {useRate
                ? `${t("weapons.rateShort")} ON`
                : `${t("weapons.rateShort")} OFF`}
            </button>

            {useRate && (
              <span className="pip-weapon-rate-value">
                {t("weapons.rateShort")}: {weapon.rate || 0}
              </span>
            )}
          </div>

          {allTags.length > 0 && (
            <div className="pip-tagrow push-top">
              {allTags.map((tag, i) => (
                <button
                  key={`weapon-tag-${index}-${i}-${tag.key}`}
                  type="button"
                  className={`pip-tag pip-weapon-tag ${
                    selectedTagKey === tag.key ? "is-selected" : ""
                  } ${tag.type === "effect" ? "is-effect" : "is-quality"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTagClick(tag.key);
                  }}
                  title={tag.title}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}

          {selectedTag && (
            <div
              className={`pip-weapon-tag-description push-top ${
                selectedTag.type === "effect" ? "is-effect" : "is-quality"
              }`}
            >
              <strong>{selectedTag.label}</strong>
              <p>{selectedTag.title}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}