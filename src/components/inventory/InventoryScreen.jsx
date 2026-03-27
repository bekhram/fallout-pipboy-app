import React, { useMemo, useState } from "react";
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
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [sellBonusPercent, setSellBonusPercent] = useState("0");

  const filteredItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const filteredItemsWithIndex = filteredItems.map((item) => ({
    item,
    originalIndex: items.indexOf(item),
  }));

  const parsedBonusPercent = Math.max(0, Number(sellBonusPercent || 0));
  const totalSellPercent = 25 + parsedBonusPercent;

  const toggleSelected = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index)
        ? prev.filter((value) => value !== index)
        : [...prev, index]
    );
  };

  const clearSelected = () => {
    setSelectedIndices([]);
  };

  const selectAllFiltered = () => {
    setSelectedIndices(
      filteredItemsWithIndex.map(({ originalIndex }) => originalIndex)
    );
  };

  const selectedFullValue = useMemo(() => {
    return selectedIndices.reduce((sum, index) => {
      const item = items[index];
      if (!item) return sum;

      const qty = Number(item.qty || item.quantity || 1);
      const cost = Number(item.cost || item.price || 0);

      return sum + qty * cost;
    }, 0);
  }, [items, selectedIndices]);

  const selectedSellValue = useMemo(() => {
    return Math.floor(selectedFullValue * (totalSellPercent / 100));
  }, [selectedFullValue, totalSellPercent]);

  const handleSellSelected = () => {
    if (!selectedIndices.length) return;

    const sortedDesc = [...selectedIndices].sort((a, b) => b - a);

    onCapsChange(String(Number(caps || 0) + selectedSellValue));
    sortedDesc.forEach((index) => onRemove(index));

    clearSelected();
  };

 return (
  <div className="pip-screen-grid">
    <section className="pip-panel pip-block">
      <div className="pip-head pip-head-inventory">
        <h2>[ {t("inventory.title")} ]</h2>

        <label className="pip-top-field">
          <span>Sell Bonus%</span>
          <input
            className="pip-inline-input pip-bonus-input"
            value={sellBonusPercent}
            onChange={(e) =>
              setSellBonusPercent(e.target.value.replace(/[^\d]/g, ""))
            }
          />
        </label>

        <label className="pip-top-field">
          <span>{t("inventory.caps")}</span>
          <input
            className="pip-inline-input"
            value={caps}
            onChange={(e) => onCapsChange(e.target.value)}
          />
        </label>
      </div>

      <div className="pip-tagrow is-wrap push-bottom">
        {INVENTORY_CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`pip-tag ${
              activeCategory === item.value ? "is-selected" : ""
            }`}
            onClick={() => {
              setActiveCategory(item.value);
              clearSelected();
            }}
          >
            {t(CATEGORY_LABEL_KEYS[item.value] || item.label)}
          </button>
        ))}
      </div>

      <div className="pip-inventory-actions push-bottom">

        <button
          type="button"
          className="pip-btn is-primary"
          onClick={() => onAdd(activeCategory === "all" ? "misc" : activeCategory)}
        >
          {t("inventory.addItem")}
        </button>

        <button
          type="button"
          className="pip-btn is-primary"
          onClick={handleSellSelected}
          disabled={!selectedIndices.length}
        >
          Sell ({selectedIndices.length})
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
        {filteredItemsWithIndex.map(({ item, originalIndex }) => (
          <div
            key={`${item.name}-${originalIndex}`}
            className="pip-inventory-select-row"
          >
            <label className="pip-checkbox">
              <input
                type="checkbox"
                checked={selectedIndices.includes(originalIndex)}
                onChange={() => toggleSelected(originalIndex)}
              />
              <span className="pip-checkbox-box" />
            </label>

            <div className="pip-inventory-card-wrap">
              <InventoryCard
                item={item}
                index={originalIndex}
                onEdit={onEdit}
                onCopy={onCopy}
                onRemove={onRemove}
              />
            </div>
          </div>
        ))}
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