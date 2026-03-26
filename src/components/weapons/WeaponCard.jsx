import React from "react";
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
      label: option?.nameKey ? t(option.nameKey) : tag,
      title: option?.descriptionKey ? t(option.descriptionKey) : tag,
    };
  });

  const translatedEffectTags = effects.map((tag) => {
    const option = effectMap[tag];
    return {
      key: `effect-${tag}`,
      label: option?.nameKey ? t(option.nameKey) : tag,
      title: option?.descriptionKey ? t(option.descriptionKey) : tag,
    };
  });

  const allTags = [...translatedQualityTags, ...translatedEffectTags];

  const skillLabel = weapon.skill
    ? t(SKILL_LABEL_KEYS?.[weapon.skill] || weapon.skill)
    : "—";

  const damageTypeLabel = weapon.type
    ? t(`weaponDamageTypes.${weapon.type}`, weapon.type)
    : "—";

  const rangeLabel = weapon.range
    ? t(`weaponRanges.${weapon.range}`, weapon.range)
    : "—";

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
          <h3
            onClick={(e) => {
              e.stopPropagation();
              onRoll?.(
                createWeaponRoll({
                  weapon,
                  diceCount: 2,
                  difficulty: 1,
                })
              );
            }}
            style={{ cursor: "pointer" }}
          >
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

          {allTags.length > 0 && (
            <div className="pip-tagrow push-top">
              {allTags.map((tag, i) => (
                <span
                  key={`weapon-tag-${index}-${i}-${tag.key}`}
                  className="pip-tag"
                  title={tag.title}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}