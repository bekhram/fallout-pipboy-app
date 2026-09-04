import { getLocalizedInventoryItem as getConsumableLocalization } from "./inventoryLocalization.js";
import { getExtendedInventoryLocalization } from "./inventoryLocalizationExtended.js";

export function getLocalizedInventoryItem(item, language = "en") {
  const base = getConsumableLocalization(item, language);
  const extended = getExtendedInventoryLocalization(item, language);

  const isExtendedCategory = ["weapons", "armor", "tools", "magazines"].includes(item?.category);
  if (!isExtendedCategory) return base;

  return {
    ...base,
    ...extended,
    displayName: extended.displayName || base.displayName || item?.name || "",
    displayEffect: extended.displayEffect || base.displayEffect || item?.effect || "",
  };
}
