import { getLocalizedInventoryItem as getConsumableLocalization } from "./inventoryLocalization.js";
import { getExtendedInventoryLocalization } from "./inventoryLocalizationExtended.js";
import { getLocalizedBobbleheadItem } from "./inventory/bobbleheads.js";
import { getLocalizedCraftingMaterial } from "./inventory/craftingMaterials.js";
import { getWandererEquipmentLocalization } from "./wandererEquipmentLocalization.js";
import { getSupplementalFoodLocalization } from "./inventoryLocalizationSupplementalFood.js";
import { localizeCatalogEffect, localizeCatalogName } from "./itemCatalogStrings.js";
import { localizeRecipeGroup, localizeRecipeTerm } from "./recipeCatalogStrings.js";
import { localizePowerArmorInventoryItem } from "./powerArmorLocalization.js";
import { localizeArmorName } from "../utils/armorLocalization.js";
import { localizeWeaponModName } from "../utils/weaponModLocalization.js";
import { localizeSupplementalModName } from "./equipmentLocalizationSupplemental.js";

const EXTENDED_CATEGORIES = new Set(["weapons", "armor", "tools", "magazines"]);

export function getLocalizedInventoryItem(item, language = "en", t = null) {
  const lang = String(language).toLowerCase().split("-")[0];
  const name = item?.canonicalName || item?.sourceName || item?.originalName || item?.name || "";
  const effect = item?.canonicalEffect || item?.effectText || item?.effect || "";
  const base = getConsumableLocalization(item, lang);
  const translated = getLocalizedCraftingMaterial(item, lang)
    || getLocalizedBobbleheadItem(item, lang)
    || getSupplementalFoodLocalization(item, lang);
  const extended = EXTENDED_CATEGORIES.has(item?.category)
    ? getExtendedInventoryLocalization({ ...item, originalName: name, originalEffect: effect }, lang)
    : {};
  const wanderer = getWandererEquipmentLocalization(item, lang);
  const powerArmor = localizePowerArmorInventoryItem(item, name, effect, lang);
  const rareEffect = item?.rarePerk && t
    ? t("inventory.rarePerkUnlock", { perk: localizeCatalogName(item.rarePerk, lang) })
    : null;
  const names = [localizeCatalogName(name, lang), wanderer?.displayName, extended.displayName, base.displayName];
  const nameAsCraftingMod = item?.crafted && item?.craftingWorkbench && name.includes(" — ")
    ? localizeCraftedModificationName(name, item.craftingWorkbench, lang)
    : null;

  return {
    ...base,
    ...extended,
    displayName: item?.customDisplayName ?? (
      powerArmor?.displayName || item?.localizedName?.[lang] || translated?.displayName
      || nameAsCraftingMod || names.find((value) => value && value !== name) || name
    ),
    displayEffect: item?.customDisplayEffect ?? (
      powerArmor?.displayEffect || item?.localizedEffect?.[lang] || rareEffect || translated?.displayEffect
      || [localizeCatalogEffect(name, effect, lang), extended.displayEffect, base.displayEffect]
        .find((value) => value && value !== effect) || effect
    ),
    displaySeries: localizeCatalogName(extended.displaySeries || item?.series || "", lang),
    displayArmorLocations: powerArmor?.displayArmorLocations || extended.displayArmorLocations,
  };
}

function localizeCraftedModificationName(name, workbench, language) {
  const [mod, group] = name.split(" — ", 2);
  const candidates = [
    localizeRecipeTerm(mod, language),
    localizeCatalogName(mod, language),
    workbench === "weapons" ? localizeSupplementalModName(mod, language) : localizeArmorName(mod, language),
    localizeWeaponModName(mod, language),
  ];
  return `${candidates.find((value) => value && value !== mod) || mod} — ${localizeRecipeGroup(group, language)}`;
}
