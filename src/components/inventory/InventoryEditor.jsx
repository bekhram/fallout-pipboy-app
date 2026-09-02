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
  globalAmmo, // <--- ОТРИМУЄМО БАЗУ НАБОЇВ
}) {
  const { t } = useTranslation();

  // Функція автозаповнення патронів з бази
  const handleLoadAmmo = (indexStr) => {
    const idx = parseInt(indexStr, 10);
    const ammoItem = globalAmmo[idx];
    if (!ammoItem) return;

    setDraft((prev) => ({
      ...prev,
      name: ammoItem['Ammo Type'] || "",
      category: "ammo", // Автоматично ставимо категорію "Набої"
      cost: ammoItem['Cost'] || "0",
      weight: ammoItem['Weight'] || "0",
      // Quantity не чіпаємо, нехай гравець вписує сам, скільки знайшов
    }));
  };

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("inventory.itemEditor")} ]</h2>
        <span>{t("inventory.logEntry")}</span>
      </div>

      {/* === ВИПАДАЮЧИЙ СПИСОК БАЗИ НАБОЇВ === */}
      {globalAmmo && globalAmmo.length > 0 && (
        <div style={{ marginBottom: "15px", padding: "0 10px" }}>
          <label style={{ opacity: 0.8, display: "block", marginBottom: "5px" }}>
             [ TERMINAL ARCHIVE: AMMO ]
          </label>
          <select
            className="pip-input"
            onChange={(e) => handleLoadAmmo(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>-- Select ammo to autoload --</option>
            {globalAmmo.map((ammo, idx) => (
              <option key={idx} value={idx}>
                {ammo['Ammo Type']} (Cost: {ammo['Cost']}¢, Wt: {ammo['Weight']})
              </option>
            ))}
          </select>
        </div>
      )}
      {/* ======================================= */}

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