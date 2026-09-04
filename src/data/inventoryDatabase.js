import aidRows from "./inventory/aid.js";
import foodRows from "./inventory/food.js";
import beverageRows from "./inventory/beverages.js";
import magazineRows1 from "./inventory/magazines-1.js";
import magazineRows2 from "./inventory/magazines-2.js";
import magazineRows3 from "./inventory/magazines-3.js";

export const EXTRA_INVENTORY_CATEGORIES = [
  { value: "beverages", label: "Beverages" },
  { value: "magazines", label: "Magazines" },
];

const EXTRA_CATEGORY_LABELS = {
  beverages: { en: "Beverages", ru: "Напитки", uk: "Напої", pl: "Napoje" },
  magazines: { en: "Magazines", ru: "Журналы", uk: "Журнали", pl: "Czasopisma" },
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

    const foodIndex = next.findIndex((item) => item.value === "food");
    const beverageIndex = next.findIndex((item) => item.value === "beverages");
    const insertAt = extra.value === "beverages"
      ? (foodIndex >= 0 ? foodIndex + 1 : next.length)
      : (beverageIndex >= 0
        ? beverageIndex + 1
        : (foodIndex >= 0 ? foodIndex + 1 : next.length));

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

export const INVENTORY_DATABASE = [
  ...aidItems,
  ...foodItems,
  ...beverageItems,
  ...magazineItems,
];

export function getInventoryArchiveItems(category) {
  return INVENTORY_DATABASE.filter((item) => item.category === category);
}
