import React from "react";
import { useTranslation } from "react-i18next";
import { getExtraCategoryLabel } from "../../data/inventoryDatabase.js";
import { getLocalizedInventoryItem } from "../../data/inventoryLocalizationAll.js";
import {
  isConsumableItem,
  PIPBOY_USE_ITEM_EVENT,
} from "../../utils/consumableEffects.js";

const CATEGORY_LABEL_KEYS = {
  weapons: "inventory.categories.weapons",
  armor: "armorPanel.title",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

const USE_LABELS = {
  en: "USE",
  ru: "ИСПОЛЬЗОВАТЬ",
  uk: "ВИКОРИСТАТИ",
  pl: "UŻYJ",
};

const EQUIPPED_LABELS = {
  en: "EQUIPPED",
  ru: "НАДЕТО",
  uk: "ОДЯГНЕНО",
  pl: "ZAŁOŻONO",
};

const META_LABELS = {
  en: { range: "Range", type: "Type", ammo: "Ammo", locations: "Locations", duration: "Duration", addictive: "Addictive", rarity: "Rarity", series: "Series" },
  ru: { range: "Дистанция", type: "Тип", ammo: "Боеприпасы", locations: "Зоны", duration: "Длительность", addictive: "Зависимость", rarity: "Редкость", series: "Серия" },
  uk: { range: "Дистанція", type: "Тип", ammo: "Боєприпаси", locations: "Зони", duration: "Тривалість", addictive: "Залежність", rarity: "Рідкість", series: "Серія" },
  pl: { range: "Zasięg", type: "Typ", ammo: "Amunicja", locations: "Strefy", duration: "Czas", addictive: "Uzależnia", rarity: "Rzadkość", series: "Seria" },
};

const isVisibleValue = (value) => {
  const text = String(value ?? "").trim();
  return text !== "" && text !== "-";
};

export default function InventoryCard({
  item,
  index,
  onEdit,
  onCopy,
  onRemove,
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";
  const labels = META_LABELS[language] || META_LABELS.en;
  const localized = getLocalizedInventoryItem(item, language);
  const categoryLabel = CATEGORY_LABEL_KEYS[item.category]
    ? t(CATEGORY_LABEL_KEYS[item.category])
    : getExtraCategoryLabel(item.category, i18n.resolvedLanguage);
  const canUse = isConsumableItem(item);
  const quantity = Math.max(0, Number(item.quantity || 0));
  const useLabel = USE_LABELS[language] || USE_LABELS.en;
  const isEquippedPowerArmor = item?.sourceType === "power_armor";
  const equippedLabel = EQUIPPED_LABELS[language] || EQUIPPED_LABELS.en;

  const displayDamageType = localized.displayDamageType || item.damageType;
  const displayWeaponType = localized.displayWeaponType || item.weaponType;
  const displayQualities = localized.displayQualities || item.qualities;
  const displayArmorLocations = localized.displayArmorLocations || item.armorLocations;
  const displaySeries = localized.displaySeries || item.series;

  const metadata = [
    isVisibleValue(item.damage) && `DMG ${item.damage}`,
    isVisibleValue(item.rate) && `FR ${item.rate}`,
    isVisibleValue(item.range) && `${labels.range}: ${item.range}`,
    isVisibleValue(displayDamageType) && `${labels.type}: ${displayDamageType}`,
    isVisibleValue(displayWeaponType) && displayWeaponType,
    isVisibleValue(item.ammo) && `${labels.ammo}: ${item.ammo}`,
    isVisibleValue(displayQualities) && displayQualities,
    isVisibleValue(item.armorPhysical) && `P DR ${item.armorPhysical}`,
    isVisibleValue(item.armorEnergy) && `E DR ${item.armorEnergy}`,
    isVisibleValue(item.armorRadiation) && `R DR ${item.armorRadiation}`,
    isVisibleValue(displayArmorLocations) && `${labels.locations}: ${displayArmorLocations}`,
    isVisibleValue(item.healing) && `HP +${item.healing}`,
    isVisibleValue(item.radiation) && `RAD ${item.radiation}`,
    isVisibleValue(item.duration) && `${labels.duration}: ${item.duration}`,
    isVisibleValue(item.addiction) && `${labels.addictive}: ${item.addiction}`,
    isVisibleValue(item.rarity) && `${labels.rarity}: ${item.rarity}`,
    isVisibleValue(displaySeries) && `${labels.series}: ${displaySeries}`,
  ].filter(Boolean);

  const handleUse = () => {
    if (!canUse || quantity <= 0) return;
    window.dispatchEvent(
      new CustomEvent(PIPBOY_USE_ITEM_EVENT, { detail: { index } })
    );
  };

  return (
    <article className="pip-panel pip-item-card pip-floating-actions-card">
      {!isEquippedPowerArmor && (
        <div className="pip-floating-card-actions">
          {canUse && (
            <button
              type="button"
              className="pip-btn is-primary"
              onClick={handleUse}
              disabled={quantity <= 0}
              title={useLabel}
              aria-label={useLabel}
              style={{ minWidth: 42, paddingInline: 10 }}
            >
              ▶
            </button>
          )}
          <button type="button" className="pip-btn" onClick={() => onEdit(index)}>
            {t("common.edit")}
          </button>
          <button type="button" className="pip-btn" onClick={() => onCopy(index)}>
            {t("common.copy")}
          </button>
          <button type="button" className="pip-btn is-danger" onClick={() => onRemove(index)}>
            {t("common.delete")}
          </button>
        </div>
      )}

      <div className="pip-floating-card-body">
        <div className="pip-item-title-row">
          <h3>{localized.displayName || t("inventory.unnamedItem")}</h3>
          <span className="pip-item-category-inline">
            {categoryLabel}{isEquippedPowerArmor ? ` • ${equippedLabel}` : ""}
          </span>
        </div>

        {isVisibleValue(localized.displayEffect) && (
          <div style={{ margin: "8px 0 10px", opacity: 0.9, lineHeight: 1.35 }}>
            {localized.displayEffect}
          </div>
        )}

        {metadata.length > 0 && (
          <div className="pip-item-stats-row" style={{ flexWrap: "wrap", marginBottom: "8px" }}>
            {metadata.map((value) => <span key={value}>{value}</span>)}
          </div>
        )}

        <div className="pip-item-stats-row">
          <span>{t("inventory.qtyShort")} {item.quantity || "0"}</span>
          <span>{t("inventory.wtShort")} {item.weight || "0"}</span>
          <span>{t("inventory.valShort")} {item.cost || "0"}</span>
        </div>
      </div>
    </article>
  );
}
