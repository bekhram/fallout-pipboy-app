import React from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_CATEGORIES } from "../../constants.js";
import InventoryCard from "./InventoryCard.jsx";
import InventoryEditor from "./InventoryEditor.jsx";

const CATEGORY_LABEL_KEYS = {
  all: "inventory.categories.all",
  weapons: "inventory.categories.weapons",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

export default function InventoryScreen({
  items,
  editingIndex,
  itemDraft,
  setItemDraft,
  activeCategory,
  setActiveCategory,
  carryWeight,
  currentCarryWeight,
  caps,
  onCapsChange,
  onAdd,
  onEdit,
  onCopy,
  onRemove,
  onSaveEdit,
  onCancelEdit,
}) {
  const { t } = useTranslation();

  const filteredItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory);

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head">
          <h2>[ {t("inventory.title")} ]</h2>
          <span>
            {t("inventory.caps")}{" "}
            <input
              className="pip-inline-input"
              value={caps}
              onChange={(e) => onCapsChange(e.target.value)}
            />
          </span>
        </div>

        <div className="pip-tagrow is-wrap push-bottom">
          {INVENTORY_CATEGORIES.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`pip-tag ${
                activeCategory === item.value ? "is-selected" : ""
              }`}
              onClick={() => setActiveCategory(item.value)}
            >
              {t(CATEGORY_LABEL_KEYS[item.value] || item.label)}
            </button>
          ))}

          <button
            type="button"
            className="pip-btn is-primary"
            onClick={() => onAdd(activeCategory === "all" ? "misc" : activeCategory)}
          >
            {t("inventory.addItem")}
          </button>
        </div>

        <div className="pip-inline-stats push-bottom">
          <span>
            {t("inventory.currentWeight")}: {currentCarryWeight}
          </span>
          <span>
            {t("inventory.maxCarry")}: {carryWeight}
          </span>
        </div>

        <div className="pip-stack">
          {filteredItems.map((item) => {
            const originalIndex = items.indexOf(item);

            return (
              <InventoryCard
                key={`${item.name}-${originalIndex}`}
                item={item}
                index={originalIndex}
                onEdit={onEdit}
                onCopy={onCopy}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      </section>

      {editingIndex !== null && (
        <InventoryEditor
          draft={itemDraft}
          setDraft={setItemDraft}
          onSave={() => onSaveEdit(editingIndex)}
          onCancel={onCancelEdit}
        />
      )}
    </div>
  );
}