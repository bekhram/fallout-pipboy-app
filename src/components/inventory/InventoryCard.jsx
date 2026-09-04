import React from "react";
import { useTranslation } from "react-i18next";
import { getExtraCategoryLabel } from "../../data/inventoryDatabase.js";
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
  const categoryLabel = CATEGORY_LABEL_KEYS[item.category]
    ? t(CATEGORY_LABEL_KEYS[item.category])
    : getExtraCategoryLabel(item.category, i18n.resolvedLanguage);
  const canUse = isConsumableItem(item);
  const quantity = Math.max(0, Number(item.quantity || 0));

  const metadata = [
    isVisibleValue(item.damage) && `DMG ${item.damage}`,
    isVisibleValue(item.rate) && `FR ${item.rate}`,
    isVisibleValue(item.range) && `Range ${item.range}`,
    isVisibleValue(item.damageType) && `Type: ${item.damageType}`,
    isVisibleValue(item.weaponType) && item.weaponType,
    isVisibleValue(item.ammo) && `Ammo: ${item.ammo}`,
    isVisibleValue(item.armorPhysical) && `P DR ${item.armorPhysical}`,
    isVisibleValue(item.armorEnergy) && `E DR ${item.armorEnergy}`,
    isVisibleValue(item.armorRadiation) && `R DR ${item.armorRadiation}`,
    isVisibleValue(item.armorLocations) && `Locations: ${item.armorLocations}`,
    isVisibleValue(item.healing) && `HP +${item.healing}`,
    isVisibleValue(item.radiation) && `RAD ${item.radiation}`,
    isVisibleValue(item.duration) && `Duration: ${item.duration}`,
    isVisibleValue(item.addiction) && `Addictive: ${item.addiction}`,
    isVisibleValue(item.rarity) && `Rarity: ${item.rarity}`,
    isVisibleValue(item.series) && `Series: ${item.series}`,
  ].filter(Boolean);

  const handleUse = () => {
    if (!canUse || quantity <= 0) return;

    window.dispatchEvent(
      new CustomEvent(PIPBOY_USE_ITEM_EVENT, { detail: { index } })
    );

    if (quantity <= 1) {
      onRemove(index);
    }
  };

  return (
    <article className="pip-panel pip-item-card pip-floating-actions-card">
      <div className="pip-floating-card-actions">
        {canUse && (
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={handleUse}
            disabled={quantity <= 0}
          >
            {USE_LABELS[language] || USE_LABELS.en}
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

      <div className="pip-floating-card-body">
        <div className="pip-item-title-row">
          <h3>{item.name || t("inventory.unnamedItem")}</h3>
          <span className="pip-item-category-inline">{categoryLabel}</span>
        </div>

        {isVisibleValue(item.effect) && (
          <div style={{ margin: "8px 0 10px", opacity: 0.9, lineHeight: 1.35 }}>
            {item.effect}
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
