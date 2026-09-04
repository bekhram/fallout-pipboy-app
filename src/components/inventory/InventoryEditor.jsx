import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_CATEGORIES } from "../../constants.js";
import {
  extendInventoryCategories,
  getExtraCategoryLabel,
  getInventoryArchiveItems,
} from "../../data/inventoryDatabase.js";

const CATEGORY_LABEL_KEYS = {
  weapons: "inventory.categories.weapons",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

const EMPTY_DETAIL_FIELDS = {
  effect: "",
  duration: "",
  addiction: "",
  healing: "",
  radiation: "",
  rarity: "",
  series: "",
};

const EMPTY_ARCHIVE_FIELDS = {
  ...EMPTY_DETAIL_FIELDS,
  cost: "",
  weight: "",
};

const categoryLabel = (category, t, language) =>
  CATEGORY_LABEL_KEYS[category]
    ? t(CATEGORY_LABEL_KEYS[category])
    : getExtraCategoryLabel(category, language);

export default function InventoryEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  globalAmmo,
}) {
  const { t, i18n } = useTranslation();
  const categories = useMemo(
    () => extendInventoryCategories(INVENTORY_CATEGORIES).filter((item) => item.value !== "all"),
    []
  );

  const archiveItems = useMemo(() => {
    if (draft.category === "ammo") {
      return (globalAmmo || []).map((ammo) => ({
        name: ammo["Ammo Type"] || "",
        category: "ammo",
        cost: String(ammo.Cost ?? ""),
        weight: String(ammo.Weight ?? "").replace(",", "."),
      }));
    }

    return getInventoryArchiveItems(draft.category);
  }, [draft.category, globalAmmo]);

  const handleLoadArchiveItem = (indexStr) => {
    const item = archiveItems[Number(indexStr)];
    if (!item) return;

    setDraft((prev) => ({
      ...prev,
      ...EMPTY_ARCHIVE_FIELDS,
      ...item,
      quantity: prev.quantity,
    }));
  };

  const handleCategoryChange = (category) => {
    setDraft((prev) => ({
      ...prev,
      ...EMPTY_DETAIL_FIELDS,
      category,
    }));
  };

  const hasArchive = archiveItems.length > 0;
  const showEffect = ["aid", "food", "beverages", "magazines"].includes(draft.category);
  const showAidFields = draft.category === "aid";
  const showConsumableFields = ["food", "beverages"].includes(draft.category);
  const showMagazineFields = draft.category === "magazines";
  const showRarity = ["aid", "food", "beverages"].includes(draft.category);

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("inventory.itemEditor")} ]</h2>
        <span>{t("inventory.logEntry")}</span>
      </div>

      <div className="pip-form-grid">
        <select
          className="pip-input"
          value={draft.category}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {categoryLabel(item.value, t, i18n.resolvedLanguage)}
            </option>
          ))}
        </select>

        <input
          className="pip-input"
          placeholder={t("inventory.quantity")}
          value={draft.quantity}
          onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
        />
      </div>

      {hasArchive && (
        <div style={{ margin: "15px 0", padding: "0 10px" }}>
          <label style={{ opacity: 0.8, display: "block", marginBottom: "5px" }}>
            [ TERMINAL ARCHIVE: {categoryLabel(draft.category, t, i18n.resolvedLanguage).toUpperCase()} ]
          </label>
          <select
            className="pip-input"
            onChange={(e) => handleLoadArchiveItem(e.target.value)}
            value=""
          >
            <option value="" disabled>-- Select item to autoload --</option>
            {archiveItems.map((item, idx) => (
              <option key={`${item.name}-${idx}`} value={idx}>
                {item.name}
                {item.series ? ` — ${item.series}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="pip-form-grid">
        <input
          className="pip-input"
          placeholder={t("inventory.itemName")}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />

        <input
          className="pip-input"
          placeholder={t("inventory.cost")}
          value={draft.cost}
          onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
        />

        <input
          className="pip-input"
          placeholder={t("inventory.weight")}
          value={draft.weight}
          onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
        />

        {showRarity && (
          <input
            className="pip-input"
            placeholder="Rarity"
            value={draft.rarity || ""}
            onChange={(e) => setDraft({ ...draft, rarity: e.target.value })}
          />
        )}

        {showConsumableFields && (
          <>
            <input
              className="pip-input"
              placeholder="HP healed"
              value={draft.healing || ""}
              onChange={(e) => setDraft({ ...draft, healing: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Radiation"
              value={draft.radiation || ""}
              onChange={(e) => setDraft({ ...draft, radiation: e.target.value })}
            />
          </>
        )}

        {showAidFields && (
          <>
            <input
              className="pip-input"
              placeholder="Duration"
              value={draft.duration || ""}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Addictive?"
              value={draft.addiction || ""}
              onChange={(e) => setDraft({ ...draft, addiction: e.target.value })}
            />
          </>
        )}

        {showMagazineFields && (
          <input
            className="pip-input"
            placeholder="Magazine series"
            value={draft.series || ""}
            onChange={(e) => setDraft({ ...draft, series: e.target.value })}
          />
        )}
      </div>

      {showEffect && (
        <textarea
          className="pip-input"
          style={{ width: "100%", minHeight: "96px", marginTop: "12px", resize: "vertical" }}
          placeholder="Effect"
          value={draft.effect || ""}
          onChange={(e) => setDraft({ ...draft, effect: e.target.value })}
        />
      )}

      <div className="pip-actions-inline push-top">
        <button type="button" className="pip-btn is-primary" onClick={onSave}>
          {t("common.save")}
        </button>
        <button type="button" className="pip-btn" onClick={onCancel}>
          {t("common.cancel")}
        </button>
      </div>
    </section>
  );
}
