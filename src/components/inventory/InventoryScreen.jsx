import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_CATEGORIES } from "../../constants.js";
import { extendInventoryCategories, getExtraCategoryLabel } from "../../data/inventoryDatabase.js";
import { getCompanionCarryWeight } from "../../utils/companionStorage.js";
import InventoryCard from "./InventoryCard.jsx";
import InventoryEditor from "./InventoryEditor.jsx";
import { LegendaryBadge } from "../shared/LegendaryPropertyEditor.jsx";
import useCampaignResourceReservations from "../../hooks/useCampaignResourceReservations.js";

const CATEGORY_LABEL_KEYS = {
  all: "inventory.categories.all",
  weapons: "inventory.categories.weapons",
  armor: "armorPanel.title",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

const CARRY_LABELS = {
  en: { player: "Player", companions: "Companions", total: "Total", legendary: "Legendary", normal: "Non-legendary", any: "All items", reserved: "Reserved for settlement construction" },
  ru: { player: "Игрок", companions: "Компаньоны", total: "Итого", legendary: "Легендарные", normal: "Обычные", any: "Все предметы", reserved: "Зарезервировано для строительства поселения" },
  uk: { player: "Гравець", companions: "Компаньйони", total: "Разом", legendary: "Легендарні", normal: "Звичайні", any: "Усі предмети", reserved: "Зарезервовано для будівництва поселення" },
  pl: { player: "Gracz", companions: "Towarzysze", total: "Razem", legendary: "Legendarne", normal: "Zwykłe", any: "Wszystkie", reserved: "Zarezerwowane na budowę osady" },
};

function isProtectedInventoryItem(item) {
  return item?.sourceType === "power_armor" && item?.equipped !== false;
}

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
  globalAmmo,
}) {
  const { t, i18n } = useTranslation();
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [sellBonusPercent, setSellBonusPercent] = useState("0");
  const [legendaryFilter, setLegendaryFilter] = useState("all");
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const carryLabels = CARRY_LABELS[language] || CARRY_LABELS.en;
  const reservations = useCampaignResourceReservations();
  const companionCarryWeight = getCompanionCarryWeight();
  const playerCarryWeight = Math.max(0, Number(carryWeight || 0));
  const totalCarryWeight = Number((playerCarryWeight + companionCarryWeight).toFixed(2));

  const inventoryCategories = useMemo(() => {
    let next = extendInventoryCategories(INVENTORY_CATEGORIES);

    if (!next.some((item) => item.value === "armor")) {
      next = [...next];
      const weaponsIndex = next.findIndex((item) => item.value === "weapons");
      next.splice(Math.max(0, weaponsIndex + 1), 0, {
        value: "armor",
        label: "Armor",
        labelKey: "armorPanel.title",
      });
    }

    return next;
  }, []);

  const labelForCategory = (item) =>
    CATEGORY_LABEL_KEYS[item.value]
      ? t(CATEGORY_LABEL_KEYS[item.value])
      : getExtraCategoryLabel(item.value, i18n.resolvedLanguage);

  const categoryFilteredItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const filteredItems = categoryFilteredItems.filter((item) => {
    if (legendaryFilter === "legendary") return Boolean(item?.legendary);
    if (legendaryFilter === "normal") return !item?.legendary;
    return true;
  });

  const filteredItemsWithIndex = filteredItems.map((item) => ({
    item,
    originalIndex: items.indexOf(item),
  }));

  const itemReservationTier = (item) =>
    item?.sourceType === "crafting_material" && ["common", "uncommon", "rare"].includes(item?.materialTier)
      ? item.materialTier
      : null;
  const isSettlementReservedItem = (item) => {
    const tier = itemReservationTier(item);
    return Boolean(tier && Number(reservations[tier] || 0) > 0);
  };

  const selectableFilteredItems = filteredItemsWithIndex.filter(
    ({ item }) => !isProtectedInventoryItem(item) && !isSettlementReservedItem(item)
  );

  const parsedBonusPercent = Math.max(0, Number(sellBonusPercent || 0));
  const totalSellPercent = 25 + parsedBonusPercent;

  const toggleSelected = (index) => {
    if (isProtectedInventoryItem(items[index])) return;

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
      selectableFilteredItems.map(({ originalIndex }) => originalIndex)
    );
  };

  const sellableSelectedIndices = useMemo(
    () => selectedIndices.filter((index) => !isProtectedInventoryItem(items[index]) && !isSettlementReservedItem(items[index])),
    [items, selectedIndices, reservations.common, reservations.uncommon, reservations.rare]
  );

  const selectedFullValue = useMemo(() => {
    return sellableSelectedIndices.reduce((sum, index) => {
      const item = items[index];
      if (!item) return sum;

      const qty = Number(item.qty || item.quantity || 1);
      const cost = Number(item.cost || item.price || 0);

      return sum + qty * cost;
    }, 0);
  }, [items, sellableSelectedIndices]);

  const selectedSellValue = useMemo(() => {
    return Math.floor(selectedFullValue * (totalSellPercent / 100));
  }, [selectedFullValue, totalSellPercent]);

  const handleSellSelected = () => {
    if (!sellableSelectedIndices.length) {
      clearSelected();
      return;
    }

    const sortedDesc = [...sellableSelectedIndices].sort((a, b) => b - a);

    onCapsChange(String(Number(caps || 0) + selectedSellValue));
    sortedDesc.forEach((index) => onRemove(index));

    clearSelected();
  };

  return (
    <div className="pip-screen-grid">
      <section className="pip-panel pip-block">
        <div className="pip-head pip-head-inventory">
          <h2>[ {t("inventory.title")} ]</h2>

          <label className="pip-top-field" style={{ gap: "2px", alignSelf: "end" }}>
            <span style={{ fontSize: "9px", lineHeight: 1 }}>Sell Bonus%</span>
            <input
              className="pip-inline-input pip-bonus-input"
              style={{
                width: "100%",
                height: "26px",
                minHeight: "26px",
                maxHeight: "26px",
                padding: "0 6px",
                fontSize: "12px",
                lineHeight: "26px",
                boxSizing: "border-box",
                textAlign: "center",
              }}
              value={sellBonusPercent}
              onChange={(e) =>
                setSellBonusPercent(e.target.value.replace(/[^\d]/g, ""))
              }
            />
          </label>

          <label className="pip-top-field" style={{ gap: "2px", alignSelf: "end" }}>
            <span style={{ fontSize: "9px", lineHeight: 1 }}>{t("inventory.caps")}</span>
            <input
              className="pip-inline-input"
              style={{
                width: "100%",
                height: "26px",
                minHeight: "26px",
                maxHeight: "26px",
                padding: "0 6px",
                fontSize: "12px",
                lineHeight: "26px",
                boxSizing: "border-box",
              }}
              value={caps}
              min={Math.max(0, Number(reservations.caps || 0))}
              onChange={(e) => {
                const next = Number(e.target.value || 0);
                if (next < Number(reservations.caps || 0)) return;
                onCapsChange(e.target.value);
              }}
            />
          </label>
        </div>

        <div className="pip-tagrow is-wrap push-bottom">
          {inventoryCategories.map((item) => (
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
              {labelForCategory(item)}
            </button>
          ))}
        </div>

        <div className="pip-tagrow is-wrap push-bottom" aria-label="Legendary filter">
          <button type="button" className={`pip-tag ${legendaryFilter === "all" ? "is-selected" : ""}`} onClick={() => { setLegendaryFilter("all"); clearSelected(); }}>
            {carryLabels.any}
          </button>
          <button type="button" className={`pip-tag ${legendaryFilter === "legendary" ? "is-selected" : ""}`} onClick={() => { setLegendaryFilter("legendary"); clearSelected(); }}>
            ★ {carryLabels.legendary}
          </button>
          <button type="button" className={`pip-tag ${legendaryFilter === "normal" ? "is-selected" : ""}`} onClick={() => { setLegendaryFilter("normal"); clearSelected(); }}>
            {carryLabels.normal}
          </button>
        </div>

        <div className="pip-inventory-actions push-bottom">
          <button
            type="button"
            className="pip-btn"
            onClick={selectAllFiltered}
            disabled={!selectableFilteredItems.length}
          >
            Select all
          </button>

          <button
            type="button"
            className="pip-btn"
            onClick={clearSelected}
            disabled={!selectedIndices.length}
          >
            Clear
          </button>

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
            disabled={!sellableSelectedIndices.length}
          >
            Sell ({sellableSelectedIndices.length})
          </button>
        </div>

        <div className="pip-inline-stats push-bottom">
          <span>
            {t("inventory.currentWeight")}: {currentCarryWeight}
          </span>
          <span>
            {t("inventory.maxCarry")}: {totalCarryWeight}
          </span>
          {companionCarryWeight > 0 ? (
            <span>
              {carryLabels.player}: {playerCarryWeight} + {carryLabels.companions}: {companionCarryWeight} = {carryLabels.total}: {totalCarryWeight}
            </span>
          ) : null}
        </div>

        <div className="pip-stack">
          {filteredItemsWithIndex.map(({ item, originalIndex }) => {
            const settlementReserved = isSettlementReservedItem(item);
            const isProtected = isProtectedInventoryItem(item) || settlementReserved;
            return (
              <div
                key={`${item.name}-${originalIndex}`}
                className="pip-inventory-select-row"
              >
                <label className="pip-checkbox">
                  <input
                    type="checkbox"
                    checked={!isProtected && selectedIndices.includes(originalIndex)}
                    disabled={isProtected}
                    onChange={() => toggleSelected(originalIndex)}
                  />
                  <span className="pip-checkbox-box" />
                </label>

                <div className="pip-inventory-card-wrap">
                  <LegendaryBadge
                    kind={item.category === "armor" ? "armor" : "weapon"}
                    item={item}
                    language={i18n.resolvedLanguage}
                  />
                  <InventoryCard
                    item={item}
                    index={originalIndex}
                    onEdit={onEdit}
                    onCopy={onCopy}
                    onRemove={onRemove}
                    locked={settlementReserved}
                    lockedLabel={settlementReserved ? carryLabels.reserved : ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {editingIndex !== null && (
        <div className="pip-editor-fullscreen" role="dialog" aria-modal="true" aria-label={t("inventory.itemEditor")}>
          <div className="pip-editor-fullscreen__body">
            <button
              type="button"
              className="pip-btn pip-editor-fullscreen__close"
              onClick={onCancelEdit}
              aria-label={t("common.cancel")}
              title={t("common.cancel")}
            >
              ×
            </button>
            <InventoryEditor
              draft={itemDraft}
              setDraft={setItemDraft}
              onSave={() => onSaveEdit(editingIndex)}
              onCancel={onCancelEdit}
              globalAmmo={globalAmmo}
            />
          </div>
        </div>
      )}
    </div>
  );
}
