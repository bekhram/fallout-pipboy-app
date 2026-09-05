import { getLocalizedInventoryItem as getConsumableLocalization } from "./inventoryLocalization.js";
import { getExtendedInventoryLocalization } from "./inventoryLocalizationExtended.js";
import { getLocalizedBobbleheadItem } from "./inventory/bobbleheads.js";
import { getLocalizedCraftingMaterial } from "./inventory/craftingMaterials.js";

export function getLocalizedInventoryItem(item, language = "en") {
  const base = getConsumableLocalization(item, language);
  const bobblehead = getLocalizedBobbleheadItem(item, language);
  const craftingMaterial = getLocalizedCraftingMaterial(item, language);

  if (bobblehead) {
    return {
      ...base,
      ...bobblehead,
      displayName: bobblehead.displayName || base.displayName || item?.name || "",
      displayEffect: bobblehead.displayEffect || base.displayEffect || item?.effect || "",
    };
  }

  if (craftingMaterial) {
    return {
      ...base,
      ...craftingMaterial,
      displayName: craftingMaterial.displayName || base.displayName || item?.name || "",
      displayEffect: craftingMaterial.displayEffect || base.displayEffect || item?.effect || "",
    };
  }

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
