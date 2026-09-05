import i18n from "../i18n.js";
import aidRows from "./inventory/aid.js";
import foodRows from "./inventory/food.js";
import beverageRows from "./inventory/beverages.js";
import magazineRows1 from "./inventory/magazines-1.js";
import magazineRows2 from "./inventory/magazines-2.js";
import magazineRows3 from "./inventory/magazines-3.js";
import toolRows from "./inventory/tools.js";
import { BOBBLEHEAD_ITEMS } from "./inventory/bobbleheads.js";
import { CRAFTING_MATERIAL_ITEMS } from "./inventory/craftingMaterials.js";
import { STEALTH_BOY_ITEM } from "./inventory/stealthBoy.js";
import {
  translateInventoryItemEffect,
  translateInventoryItemName,
} from "./inventoryLocalization.js";

export const EXTRA_INVENTORY_CATEGORIES = [
  { value: "armor", label: "Armor" },
  { value: "beverages", label: "Beverages" },
  { value: "magazines", label: "Magazines" },
  { value: "tools", label: "Tools" },
];

const EXTRA_CATEGORY_LABELS = {
  armor: { en: "Armor", ru: "Броня", uk: "Броня", pl: "Pancerz" },
  beverages: { en: "Beverages", ru: "Напитки", uk: "Напої", pl: "Napoje" },
  magazines: { en: "Magazines", ru: "Журналы", uk: "Журнали", pl: "Czasopisma" },
  tools: { en: "Tools", ru: "Инструменты", uk: "Інструменти", pl: "Narzędzia" },
};

export function getExtraCategoryLabel(category, language = "en") {
  const lang = String(language || "en").toLowerCase().split("-")[0];
  return EXTRA_CATEGORY_LABELS[category]?.[lang]
    || EXTRA_CATEGORY_LABELS[category]?.en
    || category;
}

export function extendInventoryCategories(categories = []) {
  const next = [...categories];

  for (const extra of EXTRA_INVENTORY_CATEGORIES) {
    if (next.some((item) => item.value === extra.value)) continue;

    const weaponsIndex = next.findIndex((item) => item.value === "weapons");
    const foodIndex = next.findIndex((item) => item.value === "food");
    const beverageIndex = next.findIndex((item) => item.value === "beverages");
    const magazineIndex = next.findIndex((item) => item.value === "magazines");

    let insertAt = next.length;
    if (extra.value === "armor") {
      insertAt = weaponsIndex >= 0 ? weaponsIndex + 1 : next.length;
    } else if (extra.value === "beverages") {
      insertAt = foodIndex >= 0 ? foodIndex + 1 : next.length;
    } else if (extra.value === "magazines") {
      insertAt = beverageIndex >= 0
        ? beverageIndex + 1
        : (foodIndex >= 0 ? foodIndex + 1 : next.length);
    } else if (extra.value === "tools") {
      insertAt = magazineIndex >= 0
        ? magazineIndex + 1
        : (beverageIndex >= 0
          ? beverageIndex + 1
          : (foodIndex >= 0 ? foodIndex + 1 : next.length));
    }

    next.splice(insertAt, 0, extra);
  }

  return next;
}

const aidItems = aidRows.map(
  ([name, effect, duration, addiction, weight, cost, rarity]) => ({
    name,
    category: "aid",
    effect,
    duration,
    addiction,
    weight,
    cost,
    rarity,
  })
);

const toConsumable = (category) =>
  ([name, healing, effect, radiation, weight, cost, rarity]) => ({
    name,
    category,
    healing,
    effect,
    radiation,
    weight,
    cost,
    rarity,
  });

const foodItems = foodRows.map(toConsumable("food"));
const beverageItems = beverageRows.map(toConsumable("beverages"));
const magazineItems = [magazineRows1, magazineRows2, magazineRows3]
  .flat()
  .map(([name, series, effect, weight]) => ({
    name,
    category: "magazines",
    series,
    effect,
    weight,
  }));
const toolItems = toolRows.map(([name, effect, weight, cost, rarity]) => ({
  name,
  category: "tools",
  effect,
  weight,
  cost,
  rarity,
}));

export const INVENTORY_DATABASE = [
  ...aidItems,
  ...foodItems,
  ...beverageItems,
  ...magazineItems,
  ...toolItems,
  ...BOBBLEHEAD_ITEMS,
  ...CRAFTING_MATERIAL_ITEMS,
  STEALTH_BOY_ITEM,
];

export function getInventoryArchiveItems(category) {
  const language = String(i18n.resolvedLanguage || i18n.language || "en").toLowerCase().split("-")[0];
  return INVENTORY_DATABASE
    .filter((item) => item.category === category)
    .map((item) => ({
      ...item,
      canonicalName: item.name,
      canonicalEffect: item.effect,
      name: item.localizedName?.[language]
        || item.localizedName?.en
        || translateInventoryItemName(item.name, language),
      effect: item.localizedEffect?.[language]
        || item.localizedEffect?.en
        || translateInventoryItemEffect(item.effect, language),
    }));
}
