import React from "react";
import { useTranslation } from "react-i18next";

const CATEGORY_LABEL_KEYS = {
  weapons: "inventory.categories.weapons",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

export default function InventoryCard({
  item,
  index,
  onEdit,
  onCopy,
  onRemove,
}) {
  const { t } = useTranslation();

  return (
    <article className="pip-panel pip-item-card pip-floating-actions-card">
      <div className="pip-floating-card-actions">
        <button
          type="button"
          className="pip-btn"
          onClick={() => onEdit(index)}
        >
          {t("common.edit")}
        </button>

        <button
          type="button"
          className="pip-btn"
          onClick={() => onCopy(index)}
        >
          {t("common.copy")}
        </button>

        <button
          type="button"
          className="pip-btn is-danger"
          onClick={() => onRemove(index)}
        >
          {t("common.delete")}
        </button>
      </div>

      <div className="pip-floating-card-body">
        <div className="pip-item-title-row">
          <h3>{item.name || t("inventory.unnamedItem")}</h3>
          <span className="pip-item-category-inline">
            {t(CATEGORY_LABEL_KEYS[item.category] || "inventory.categories.misc")}
          </span>
        </div>

        <div className="pip-item-stats-row">
          <span>{t("inventory.qtyShort")} {item.quantity || "0"}</span>
          <span>{t("inventory.wtShort")} {item.weight || "0"}</span>
          <span>{t("inventory.valShort")} {item.cost || "0"}</span>
        </div>
      </div>
    </article>
  );
}