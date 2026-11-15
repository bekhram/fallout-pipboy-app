import { SKILL_LABEL_KEYS } from "../constants.js";
import { PERKS_DICTIONARY } from "../components/data/perks.js";
import { getPerkCatalogText } from "../components/data/perkLocalization.js";
import { localizeArmorName } from "../utils/armorLocalization.js";
import { localizeWeaponModName } from "../utils/weaponModLocalization.js";
import { localizeSupplementalModName } from "./equipmentLocalizationSupplemental.js";
import { getLocalizedInventoryItem } from "./inventoryLocalizationAll.js";
import { CRAFTING_MATERIAL_ITEMS } from "./inventory/craftingMaterials.js";
import { localizeRecipeGroup, localizeRecipeTerm, localizeRecipeQualifier } from "./recipeCatalogStrings.js";
import { localizePowerArmorName, localizePowerArmorUpgradeModel } from "./powerArmorLocalization.js";

const MATERIALS_BY_NAME = new Map(CRAFTING_MATERIAL_ITEMS.map((item) => [item.name, item]));

export function localizeCraftingMaterial(name, language) {
  return getLocalizedInventoryItem(MATERIALS_BY_NAME.get(name) || { name }, language).displayName;
}

export function localizeCraftingSkill(skill, t) {
  const key = SKILL_LABEL_KEYS[skill];
  return key ? t(key) : skill;
}

export function localizeCraftingPerk(perk, language, t) {
  const entry = PERKS_DICTIONARY[perk.id];
  return entry ? getPerkCatalogText(entry, language, t).name : perk.label;
}

function localizeRecipeName(recipe, language) {
  const name = recipe.name;
  if (language === "en") return name;
  if (recipe.powerArmor) {
    const mod = recipe.powerArmor.mods[0];
    return mod.model ? localizePowerArmorUpgradeModel(mod.model, language) : localizePowerArmorName(mod, language);
  }

  const qualifier = name.match(/^(.*) \(([^()]+)\)$/);
  if (qualifier) {
    const baseName = localizeRecipeName({ ...recipe, name: qualifier[1] }, language);
    const suffix = localizeRecipeQualifier(qualifier[2], language);
    const translatedSuffix = suffix !== qualifier[2]
      ? suffix
      : getLocalizedInventoryItem({ name: suffix, category: "weapons" }, language).displayName;
    return `${baseName} (${translatedSuffix})`;
  }

  const category = recipe.outputCategory;
  const catalogName = getLocalizedInventoryItem({ name, category }, language).displayName;
  if (catalogName !== name) return catalogName;
  const term = localizeRecipeTerm(name, language);
  if (term !== name) return term;
  if (recipe.workbench === "weapons") {
    const supplemental = localizeSupplementalModName(name, language);
    return supplemental !== name ? supplemental : localizeWeaponModName(name, language);
  }
  if (recipe.workbench === "armor" || recipe.workbench === "robot") return localizeArmorName(name, language);
  return name;
}

export function localizeCraftingRecipe(recipe, language) {
  return {
    title: localizeRecipeName(recipe, language),
    group: localizeRecipeGroup(recipe.group, language),
  };
}
