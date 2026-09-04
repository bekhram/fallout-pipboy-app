import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { INVENTORY_CATEGORIES } from "../../constants.js";
import {
  extendInventoryCategories,
  getExtraCategoryLabel,
  getInventoryArchiveItems,
} from "../../data/inventoryDatabase.js";
import { getLocalizedInventoryItem } from "../../data/inventoryLocalizationAll.js";
import { parseCSV } from "../../utils/csvParser.js";
import { parseArmorDatabase } from "../../utils/armorDatabase.js";

const CATEGORY_LABEL_KEYS = {
  weapons: "inventory.categories.weapons",
  armor: "armorPanel.title",
  ammo: "inventory.categories.ammo",
  aid: "inventory.categories.aid",
  food: "inventory.categories.food",
  misc: "inventory.categories.misc",
  junk: "inventory.categories.junk",
};

const ARCHIVE_LABELS = {
  en: {
    search: "Search archive by name, type, series or effect...",
    empty: "-- No matching items --",
    select: "Select item to autoload",
    records: "records",
  },
  ru: {
    search: "Поиск по названию, типу, серии или эффекту...",
    empty: "-- Ничего не найдено --",
    select: "Выберите предмет для загрузки",
    records: "записей",
  },
  uk: {
    search: "Пошук за назвою, типом, серією або ефектом...",
    empty: "-- Нічого не знайдено --",
    select: "Оберіть предмет для завантаження",
    records: "записів",
  },
  pl: {
    search: "Szukaj po nazwie, typie, serii lub efekcie...",
    empty: "-- Brak wyników --",
    select: "Wybierz przedmiot do wczytania",
    records: "rekordów",
  },
};

const EMPTY_DETAIL_FIELDS = {
  effect: "",
  duration: "",
  addiction: "",
  healing: "",
  radiation: "",
  rarity: "",
  series: "",
  damage: "",
  rate: "",
  range: "",
  damageType: "",
  weaponType: "",
  qualities: "",
  ammo: "",
  armorPhysical: "",
  armorEnergy: "",
  armorRadiation: "",
  armorLocations: "",
  armorGroup: "",
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

const normalizeSearchText = (value) =>
  String(value ?? "").trim().toLocaleLowerCase();

const normalizeWeight = (value) => String(value ?? "").replace(",", ".");

const armorLocationsText = (locations = {}) =>
  [
    locations.head && "Head",
    locations.arms && "Arms",
    locations.legs && "Legs",
    locations.torso && "Torso",
  ]
    .filter(Boolean)
    .join(", ");

const weaponRowToInventoryItem = (weapon) => {
  const effects = String(weapon?.Effects || "").trim();
  const qualities = String(weapon?.Qualities || "").trim();
  const effect = [
    effects,
    qualities ? `Qualities: ${qualities}` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return {
    name: weapon?.name || "",
    category: "weapons",
    quantity: "1",
    cost: String(weapon?.Cost ?? ""),
    weight: normalizeWeight(weapon?.Weight),
    rarity: String(weapon?.Rarity ?? ""),
    effect,
    damage: String(weapon?.["Damage Rating"] ?? ""),
    rate: String(weapon?.["Rate of Fire"] ?? ""),
    range: String(weapon?.Range ?? ""),
    damageType: String(weapon?.["Damage type"] ?? ""),
    weaponType: String(weapon?.["Weapon type"] ?? ""),
    qualities,
    ammo: String(weapon?.Ammo ?? ""),
  };
};

const armorEntryToInventoryItem = (armor) => ({
  name: armor?.name || "",
  category: "armor",
  quantity: "1",
  cost: String(armor?.cost ?? ""),
  weight: normalizeWeight(armor?.weight),
  rarity: String(armor?.rarity ?? ""),
  effect: String(armor?.effects ?? ""),
  armorPhysical: String(armor?.physical ?? ""),
  armorEnergy: String(armor?.energy ?? ""),
  armorRadiation: String(armor?.radiation ?? ""),
  armorLocations: armorLocationsText(armor?.locations),
  armorGroup: String(armor?.group || armor?.category || ""),
  armorSourceId: armor?.id || "",
});

export default function InventoryEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  globalAmmo,
}) {
  const { t, i18n } = useTranslation();
  const [archiveSearch, setArchiveSearch] = useState("");
  const [weaponArchive, setWeaponArchive] = useState([]);
  const [armorArchive, setArmorArchive] = useState([]);
  const language = i18n.resolvedLanguage?.split("-")[0] || "en";
  const archiveLabels = ARCHIVE_LABELS[language] || ARCHIVE_LABELS.en;

  useEffect(() => {
    let active = true;

    fetch("/weapons.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Weapon database unavailable");
        return response.text();
      })
      .then((text) => {
        if (active) setWeaponArchive(parseCSV(text));
      })
      .catch(() => {
        if (active) setWeaponArchive([]);
      });

    fetch("/Armor.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Armor database unavailable");
        return response.text();
      })
      .then((text) => {
        if (active) setArmorArchive(parseArmorDatabase(text).items || []);
      })
      .catch(() => {
        if (active) setArmorArchive([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => extendInventoryCategories(INVENTORY_CATEGORIES).filter((item) => item.value !== "all"),
    []
  );

  const archiveItems = useMemo(() => {
    if (draft.category === "weapons") {
      return weaponArchive.map(weaponRowToInventoryItem);
    }

    if (draft.category === "armor") {
      return armorArchive.map(armorEntryToInventoryItem);
    }

    if (draft.category === "ammo") {
      return (globalAmmo || []).map((ammo) => ({
        name: ammo["Ammo Type"] || "",
        category: "ammo",
        quantity: "1",
        cost: String(ammo.Cost ?? ""),
        weight: normalizeWeight(ammo.Weight),
      }));
    }

    return getInventoryArchiveItems(draft.category);
  }, [draft.category, globalAmmo, weaponArchive, armorArchive]);

  const archiveEntries = useMemo(
    () => archiveItems.map((item) => ({
      item,
      localized: getLocalizedInventoryItem(item, language),
    })),
    [archiveItems, language]
  );

  const filteredArchiveEntries = useMemo(() => {
    const query = normalizeSearchText(archiveSearch);
    if (!query) return archiveEntries;

    return archiveEntries.filter(({ item, localized }) =>
      [
        item.name,
        item.series,
        item.effect,
        item.rarity,
        item.duration,
        item.addiction,
        item.weaponType,
        item.damageType,
        item.range,
        item.qualities,
        item.ammo,
        item.armorGroup,
        item.armorLocations,
        localized.displayName,
        localized.displaySeries,
        localized.displayEffect,
        localized.displayWeaponType,
        localized.displayDamageType,
        localized.displayQualities,
        localized.displayArmorGroup,
        localized.displayArmorLocations,
      ]
        .filter(Boolean)
        .some((value) => normalizeSearchText(value).includes(query))
    );
  }, [archiveEntries, archiveSearch]);

  const handleLoadArchiveItem = (indexStr) => {
    const entry = filteredArchiveEntries[Number(indexStr)];
    const item = entry?.item;
    if (!item) return;

    setDraft((prev) => ({
      ...prev,
      ...EMPTY_ARCHIVE_FIELDS,
      ...item,
      quantity: prev.quantity || item.quantity || "1",
    }));
  };

  const handleCategoryChange = (category) => {
    setArchiveSearch("");
    setDraft((prev) => ({
      ...prev,
      ...EMPTY_DETAIL_FIELDS,
      category,
    }));
  };

  const hasArchive = archiveItems.length > 0;
  const showEffect = ["weapons", "armor", "aid", "food", "beverages", "magazines", "tools"].includes(draft.category);
  const showAidFields = draft.category === "aid";
  const showConsumableFields = ["food", "beverages"].includes(draft.category);
  const showMagazineFields = draft.category === "magazines";
  const showWeaponFields = draft.category === "weapons";
  const showArmorFields = draft.category === "armor";
  const showRarity = ["weapons", "armor", "aid", "food", "beverages", "tools"].includes(draft.category);

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

          <input
            className="pip-input"
            type="search"
            placeholder={archiveLabels.search}
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
            style={{ marginBottom: "8px" }}
          />

          <select
            className="pip-input"
            onChange={(e) => handleLoadArchiveItem(e.target.value)}
            value=""
            disabled={filteredArchiveEntries.length === 0}
          >
            <option value="" disabled>
              {filteredArchiveEntries.length === 0
                ? archiveLabels.empty
                : `-- ${archiveLabels.select} (${filteredArchiveEntries.length}) --`}
            </option>
            {filteredArchiveEntries.map(({ item, localized }, idx) => (
              <option key={`${item.name}-${item.series || item.armorSourceId || ""}-${idx}`} value={idx}>
                {localized.displayName || item.name}
                {(localized.displaySeries || item.series) ? ` — ${localized.displaySeries || item.series}` : ""}
                {(localized.displayWeaponType || item.weaponType) ? ` — ${localized.displayWeaponType || item.weaponType}` : ""}
                {(localized.displayArmorGroup || item.armorGroup) ? ` — ${localized.displayArmorGroup || item.armorGroup}` : ""}
              </option>
            ))}
          </select>

          <div style={{ marginTop: "6px", opacity: 0.65, fontSize: "11px" }}>
            {archiveSearch
              ? `${filteredArchiveEntries.length} / ${archiveItems.length} ${archiveLabels.records}`
              : `${archiveItems.length} ${archiveLabels.records}`}
          </div>
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

        {showWeaponFields && (
          <>
            <input
              className="pip-input"
              placeholder="Damage"
              value={draft.damage || ""}
              onChange={(e) => setDraft({ ...draft, damage: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Rate of Fire"
              value={draft.rate || ""}
              onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Range"
              value={draft.range || ""}
              onChange={(e) => setDraft({ ...draft, range: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Damage type"
              value={draft.damageType || ""}
              onChange={(e) => setDraft({ ...draft, damageType: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Weapon type"
              value={draft.weaponType || ""}
              onChange={(e) => setDraft({ ...draft, weaponType: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Ammo"
              value={draft.ammo || ""}
              onChange={(e) => setDraft({ ...draft, ammo: e.target.value })}
            />
          </>
        )}

        {showArmorFields && (
          <>
            <input
              className="pip-input"
              placeholder="Physical DR"
              value={draft.armorPhysical || ""}
              onChange={(e) => setDraft({ ...draft, armorPhysical: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Energy DR"
              value={draft.armorEnergy || ""}
              onChange={(e) => setDraft({ ...draft, armorEnergy: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Radiation DR"
              value={draft.armorRadiation || ""}
              onChange={(e) => setDraft({ ...draft, armorRadiation: e.target.value })}
            />
            <input
              className="pip-input"
              placeholder="Locations"
              value={draft.armorLocations || ""}
              onChange={(e) => setDraft({ ...draft, armorLocations: e.target.value })}
            />
          </>
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
          placeholder="Effect / qualities"
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
