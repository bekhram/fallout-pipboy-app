import React from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_CATEGORIES } from "../../constants.js";

const CATEGORY_LABEL_KEYS = {
  weapons: "inventory.categories.weapons",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

export default function InventoryEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}) {
  const { t } = useTranslation();

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("inventory.itemEditor")} ]</h2>
        <span>{t("inventory.logEntry")}</span>
      </div>

      <div className="pip-form-grid">
        <input
          className="pip-input"
          placeholder={t("inventory.itemName")}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />

        <input
          className="pip-input"
          placeholder={t("inventory.quantity")}
          value={draft.quantity}
          onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
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

        <select
          className="pip-input"
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        >
          {INVENTORY_CATEGORIES.filter((item) => item.value !== "all").map(
            (item) => (
              <option key={item.value} value={item.value}>
                {t(CATEGORY_LABEL_KEYS[item.value] || item.label)}
              </option>
            )
          )}
        </select>
      </div>

      <div className="pip-actions-inline push-top">
        <button
          type="button"
          className="pip-btn is-primary"
          onClick={onSave}
        >
          {t("common.save")}
        </button>

        <button
          type="button"
          className="pip-btn"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
      </div>
    </section>
  );
}