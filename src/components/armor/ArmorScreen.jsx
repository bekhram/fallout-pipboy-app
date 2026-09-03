import React, { useEffect, useMemo, useState } from "react";
import { ARMOR_PARTS } from "../../constants.js";
import { useTranslation } from "react-i18next";
import {
  PART_LOCATION,
  armorModMultiplier,
  calculateArmorPart,
  compatibleArmorItems,
  compatibleArmorMods,
  parseArmorDatabase,
} from "../../utils/armorDatabase.js";

const LABEL_KEYS = {
  Head: "injuries.head",
  "Left Arm": "injuries.leftArm",
  "Right Arm": "injuries.rightArm",
  Torso: "injuries.torso",
  "Left Leg": "injuries.leftLeg",
  "Right Leg": "injuries.rightLeg",
};

const CODES = {
  Head: "H",
  "Left Arm": "LA",
  "Right Arm": "RA",
  Torso: "T",
  "Left Leg": "LL",
  "Right Leg": "RL",
};

const FIELDS = [
  { key: "physical", icon: "⌖", labelKey: "armorPanel.physical" },
  { key: "energy", icon: "⚡", labelKey: "armorPanel.energy" },
  { key: "radiation", icon: "☢", labelKey: "armorPanel.radiation" },
  { key: "poison", icon: "☣", labelKey: "armorPanel.poison" },
  { key: "hp", icon: "", labelKey: "armorPanel.hp" },
];

const UI = {
  en: { catalog: "ARMOR CATALOG", equip: "EQUIP", item: "Armor", material: "Material", upgrade: "Upgrade", none: "None", loading: "Loading armor database…", error: "Armor database could not be loaded.", total: "TOTAL", weight: "Weight", cost: "Cost", remove: "Remove", shadowed: "SHADOWED", shadowed1: "Ignore the first complication on a Sneak test in dim light or darkness.", shadowed2: "Once per scene, re-roll 1d20 on a Sneak test in dim light or darkness.", shadowed3: "Re-roll 1d20 on every Sneak test in dim light or darkness." },
  ru: { catalog: "КАТАЛОГ БРОНИ", equip: "НАДЕТЬ", item: "Броня", material: "Материал", upgrade: "Улучшение", none: "Нет", loading: "Загрузка базы брони…", error: "Не удалось загрузить базу брони.", total: "ИТОГО", weight: "Вес", cost: "Стоимость", remove: "Снять", shadowed: "ТЕНЕВАЯ БРОНЯ", shadowed1: "Игнорирует первую сложность в проверке Скрытности при тусклом свете или в темноте.", shadowed2: "Один раз за сцену позволяет перебросить 1d20 в проверке Скрытности при тусклом свете или в темноте.", shadowed3: "Позволяет перебрасывать 1d20 во всех проверках Скрытности при тусклом свете или в темноте." },
  uk: { catalog: "КАТАЛОГ БРОНІ", equip: "ОДЯГТИ", item: "Броня", material: "Матеріал", upgrade: "Покращення", none: "Немає", loading: "Завантаження бази броні…", error: "Не вдалося завантажити базу броні.", total: "РАЗОМ", weight: "Вага", cost: "Вартість", remove: "Зняти", shadowed: "ТІНЬОВА БРОНЯ", shadowed1: "Ігнорує перше ускладнення в перевірці Скритності при тьмяному світлі або в темряві.", shadowed2: "Один раз за сцену дозволяє перекинути 1d20 у перевірці Скритності при тьмяному світлі або в темряві.", shadowed3: "Дозволяє перекидати 1d20 у всіх перевірках Скритності при тьмяному світлі або в темряві." },
  pl: { catalog: "KATALOG PANCERZY", equip: "ZAŁÓŻ", item: "Pancerz", material: "Materiał", upgrade: "Ulepszenie", none: "Brak", loading: "Wczytywanie bazy pancerzy…", error: "Nie udało się wczytać bazy pancerzy.", total: "SUMA", weight: "Waga", cost: "Koszt", remove: "Zdejmij", shadowed: "PANCERZ CIENIOWANY", shadowed1: "Ignoruje pierwszą komplikację w teście Skradania w półmroku lub ciemności.", shadowed2: "Raz na scenę pozwala przerzucić 1k20 w teście Skradania w półmroku lub ciemności.", shadowed3: "Pozwala przerzucać 1k20 we wszystkich testach Skradania w półmroku lub ciemności." },
};

function findById(list, id) {
  return list.find((entry) => entry.id === id);
}

function isBodyGarment(item) {
  return item?.category === "CLOTHING" || item?.category === "OUTFIT";
}

function garmentCoversPart(item, part) {
  if (!item?.locations?.[PART_LOCATION[part]]) return false;
  return item.category !== "CLOTHING" || part !== "Head";
}

export default function ArmorScreen({ armor, onArmorChange }) {
  const { t, i18n } = useTranslation();
  const labels = UI[i18n.resolvedLanguage?.split("-")[0]] || UI.en;
  const [database, setDatabase] = useState({ items: [], mods: [] });
  const [catalogItemId, setCatalogItemId] = useState("");
  const [loadState, setLoadState] = useState("loading");

  useEffect(() => {
    let active = true;
    fetch("/Armor.csv")
      .then((response) => {
        if (!response.ok) throw new Error("Armor database unavailable");
        return response.text();
      })
      .then((text) => {
        if (!active) return;
        const parsed = parseArmorDatabase(text);
        setDatabase(parsed);
        setCatalogItemId(parsed.items.find((item) => item.family !== "robot")?.id || "");
        setLoadState("ready");
      })
      .catch(() => active && setLoadState("error"));
    return () => {
      active = false;
    };
  }, []);

  const slots = armor?._equipment?.slots || {};

  const setSlots = (nextSlots) => {
    onArmorChange("_equipment", "slots", nextSlots);
  };

  const equipCatalogItem = () => {
    const item = findById(database.items, catalogItemId);
    if (!item) return;
    const next = { ...slots };
    ARMOR_PARTS.forEach((part) => {
      const coversPart = isBodyGarment(item)
        ? garmentCoversPart(item, part)
        : item.locations[PART_LOCATION[part]];
      if (coversPart) {
        next[part] = { itemId: item.id, materialId: "", upgradeId: "" };
      }
    });
    setSlots(next);
  };

  const changeSlot = (part, patch) => {
    const next = { ...slots };
    const selectedItem = Object.prototype.hasOwnProperty.call(patch, "itemId")
      ? findById(database.items, patch.itemId)
      : findById(database.items, slots[part]?.itemId);

    if (selectedItem && isBodyGarment(selectedItem)) {
      ARMOR_PARTS.forEach((targetPart) => {
        if (!garmentCoversPart(selectedItem, targetPart)) return;
        next[targetPart] = {
          itemId: selectedItem.id,
          materialId: "",
          upgradeId: "",
          ...(slots[targetPart]?.itemId === selectedItem.id ? slots[targetPart] : {}),
          ...patch,
        };
      });
    } else {
      next[part] = {
        itemId: "",
        materialId: "",
        upgradeId: "",
        ...(slots[part] || {}),
        ...patch,
      };
    }

    setSlots(next);
  };

  const removeSlot = (part) => {
    const next = { ...slots };
    delete next[part];
    setSlots(next);
  };

  const calculated = useMemo(() => {
    const result = {};
    ARMOR_PARTS.forEach((part) => {
      const selected = slots[part] || {};
      const item = findById(database.items, selected.itemId);
      const availableMods = compatibleArmorMods(database.mods, item, part);
      const material = findById(availableMods.materials, selected.materialId);
      const upgrade = findById(availableMods.upgrades, selected.upgradeId);
      result[part] = calculateArmorPart(item, material, upgrade, armor?.[part], part);
    });
    return result;
  }, [armor, database, slots]);

  const shadowedPieces = ARMOR_PARTS.reduce((count, part) => {
    const material = findById(database.mods, slots[part]?.materialId);
    if (!material?.name.toLowerCase().includes("shadowed")) return count;
    return count + (part === "Torso" ? 2 : 1);
  }, 0);
  const shadowedTier = shadowedPieces >= 5 ? 3 : shadowedPieces >= 3 ? 2 : shadowedPieces >= 1 ? 1 : 0;

  const countedGarments = new Set();
  const totals = ARMOR_PARTS.reduce(
    (sum, part) => {
      const slot = slots[part];
      if (!slot?.itemId) return sum;
      const item = findById(database.items, slot.itemId);
      if (isBodyGarment(item)) {
        if (countedGarments.has(item.id)) return sum;
        countedGarments.add(item.id);
      }
      const availableMods = compatibleArmorMods(database.mods, item, part);
      const material = findById(availableMods.materials, slot.materialId);
      const upgrade = findById(availableMods.upgrades, slot.upgradeId);
      return {
        weight: sum.weight + Number(item?.weight || 0) + Number(material?.weight || 0) * armorModMultiplier(material, part) + Number(upgrade?.weight || 0) * armorModMultiplier(upgrade, part),
        cost: sum.cost + Number(item?.cost || 0) + Number(material?.cost || 0) * armorModMultiplier(material, part) + Number(upgrade?.cost || 0) * armorModMultiplier(upgrade, part),
      };
    },
    { weight: 0, cost: 0 }
  );

  return (
    <section className="pip-panel pip-block">
      <div className="pip-head">
        <h2>[ {t("armorPanel.title")} ]</h2>
        <span>{t("armorPanel.locationDr")}</span>
      </div>

      <div className="pip-armor-catalog">
        <div className="pip-armor-section-title">[ {labels.catalog} ]</div>
        {loadState === "loading" && <div className="pip-armor-message">{labels.loading}</div>}
        {loadState === "error" && <div className="pip-armor-message is-error">{labels.error}</div>}
        {loadState === "ready" && (
          <div className="pip-armor-equip-row">
            <select className="pip-input" value={catalogItemId} onChange={(event) => setCatalogItemId(event.target.value)}>
              {database.items.filter((item) => item.family !== "robot").map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button type="button" className="pip-btn" onClick={equipCatalogItem}>{labels.equip}</button>
          </div>
        )}
      </div>

      <div className="pip-armor-loadout">
        {ARMOR_PARTS.map((part) => {
          const selected = slots[part] || {};
          const item = findById(database.items, selected.itemId);
          const availableItems = compatibleArmorItems(database.items, part);
          const availableMods = compatibleArmorMods(database.mods, item, part);
          return (
            <article className="pip-armor-slot" key={part}>
              <div className="pip-armor-slot-head">
                <span className="pip-armor-row-code">{CODES[part]}</span>
                <strong>{t(LABEL_KEYS[part] || part)}</strong>
                {selected.itemId && (
                  <button type="button" className="pip-armor-remove" onClick={() => removeSlot(part)} title={labels.remove}>×</button>
                )}
              </div>
              <label>
                <span>{labels.item}</span>
                <select
                  className="pip-input"
                  value={selected.itemId || ""}
                  onChange={(event) => changeSlot(part, { itemId: event.target.value, materialId: "", upgradeId: "" })}
                >
                  <option value="">{labels.none}</option>
                  {availableItems.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label>
                <span>{labels.material}</span>
                <select className="pip-input" disabled={!item} value={selected.materialId || ""} onChange={(event) => changeSlot(part, { materialId: event.target.value })}>
                  <option value="">{labels.none}</option>
                  {availableMods.materials.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              <label>
                <span>{labels.upgrade}</span>
                <select className="pip-input" disabled={!item} value={selected.upgradeId || ""} onChange={(event) => changeSlot(part, { upgradeId: event.target.value })}>
                  <option value="">{labels.none}</option>
                  {availableMods.upgrades.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </label>
              {(findById(database.mods, selected.materialId)?.effects || findById(database.mods, selected.upgradeId)?.effects) && (
                <p className="pip-armor-effect">
                  {[findById(database.mods, selected.materialId)?.effects, findById(database.mods, selected.upgradeId)?.effects].filter(Boolean).join(" ")}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {shadowedTier > 0 && (
        <div className="pip-armor-catalog">
          <div className="pip-armor-section-title">[ {labels.shadowed}: {shadowedPieces} ]</div>
          <div className="pip-armor-effect">{labels[`shadowed${shadowedTier}`]}</div>
        </div>
      )}

      <div className="pip-armor-table">
        <div className="pip-armor-table-head">
          <div className="pip-armor-part-col" />
          {FIELDS.map((field) => (
            <div key={field.key} className="pip-armor-stat-col">
              <span className="pip-armor-stat-icon">{field.icon}</span>
              <span className="pip-armor-stat-text">{t(field.labelKey)}</span>
            </div>
          ))}
        </div>
        <div className="pip-armor-table-body">
          {ARMOR_PARTS.map((part) => (
            <div className="pip-armor-row" key={part}>
              <div className="pip-armor-row-label">
                <span className="pip-armor-row-code">{CODES[part]}</span>
                <span className="pip-armor-row-name">{t(LABEL_KEYS[part] || part)}</span>
              </div>
              {FIELDS.map((field) => (
                <label key={`${part}-${field.key}`} className="pip-armor-cell">
                  <span className="pip-armor-cell-mobile-icon">{field.icon}</span>
                  <input
                    className="pip-input pip-armor-mini-input"
                    value={calculated[part]?.[field.key] ?? 0}
                    readOnly
                    title={t(field.labelKey)}
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="pip-armor-totals">
        <strong>[ {labels.total} ]</strong>
        <span>{labels.weight}: {totals.weight}</span>
        <span>{labels.cost}: {totals.cost}</span>
      </div>
    </section>
  );
}
