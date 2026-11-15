import { PERKS_DICTIONARY } from "./perks.js";
import { TRAITS_DICTIONARY } from "./origins.js";
import { getAddedPerkTranslation } from "./perkTranslations.js";
import { getSupplementalPerkTranslation } from "./supplementalPerks.js";

export const PERK_LANGUAGES = ["en", "ru", "uk", "pl"];

export function getPerkCatalogText(perk, language, translate) {
  const catalogText = getSupplementalPerkTranslation(perk.id, language)
    || getAddedPerkTranslation(perk.id, language);
  return {
    name: catalogText?.name || translate(`perksInfo.${perk.id}.name`, { defaultValue: perk.name || perk.id }),
    description: catalogText?.description || translate(`perksInfo.${perk.id}.desc`, { defaultValue: perk.description || "" }),
  };
}

const TRAIT_IDS = Object.values(TRAITS_DICTIONARY);

export function getPerkDisplayText(item, id, i18n) {
  const language = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  if (item?.isOriginTrait) {
    const trait = item.id || TRAIT_IDS.find((traitId) => PERK_LANGUAGES.some((lang) => (
      i18n.getFixedT(lang)(`traitsInfo.${traitId}.name`) === item.name
    )));
    if (!trait) return item;
    const t = i18n.getFixedT(language);
    return {
      name: t(`traitsInfo.${trait}.name`, { defaultValue: item.name }),
      description: t(`traitsInfo.${trait}.desc`, { defaultValue: item.description }),
    };
  }
  const perk = PERKS_DICTIONARY[id];
  if (!perk) return item;
  const text = getPerkCatalogText(perk, language, i18n.getFixedT(language));
  const known = PERK_LANGUAGES.map((lang) => getPerkCatalogText(perk, lang, i18n.getFixedT(lang)));
  const legacyFooter = `\n[Req: ${perk.requirements} | Max Rank: ${perk.maxRanks}]`;
  const description = item.description?.endsWith(legacyFooter)
    ? item.description.slice(0, -legacyFooter.length)
    : item.description;
  return {
    name: item.name === perk.name || known.some((entry) => item.name === entry.name) ? text.name : item.name,
    description: description === perk.description || known.some((entry) => description === entry.description)
      ? text.description
      : item.description,
  };
}
