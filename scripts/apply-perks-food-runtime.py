from pathlib import Path


def patch_perks_db():
    path = Path("src/components/data/perks.js")
    text = path.read_text()
    import_line = 'import { SUPPLEMENTAL_PERKS } from "./supplementalPerks.js";\n\n'
    if "SUPPLEMENTAL_PERKS" not in text:
        text = import_line + text
    marker = "\n};\n\nexport const PERKS_LIST = Object.values(PERKS_DICTIONARY);"
    if "Object.fromEntries(SUPPLEMENTAL_PERKS" not in text:
        if marker not in text:
            raise SystemExit("perks dictionary marker not found")
        text = text.replace(
            marker,
            ",\n  ...Object.fromEntries(SUPPLEMENTAL_PERKS.map((perk) => [perk.id, perk]))\n};\n\nexport const PERKS_LIST = Object.values(PERKS_DICTIONARY);",
            1,
        )
    path.write_text(text)


def patch_perks_screen():
    path = Path("src/components/perks/PerksScreen.jsx")
    text = path.read_text()

    if "getSupplementalPerkTranslation" not in text:
        text = text.replace(
            'import { getAddedPerkTranslation } from "../data/perkTranslations";\n',
            'import { getAddedPerkTranslation } from "../data/perkTranslations";\n'
            'import { getSupplementalPerkTranslation } from "../data/supplementalPerks.js";\n',
            1,
        )

    start = text.find("function getRequirementsWarnings(")
    marker = "\n\nfunction getPerkRequirementsForRank"
    end = text.find(marker, start)
    if start < 0 or end < 0:
        raise SystemExit("perk requirement validator not found")

    validator = r'''function getRequirementsWarnings(reqString, form, perk = null, rank = 1) {
  if (!reqString || reqString === "None") return [];
  const warnings = [];
  const parts = reqString.split(",").map((value) => value.trim());
  const stats = {
    STR: Number(form?.special?.S || 0),
    PER: Number(form?.special?.P || 0),
    END: Number(form?.special?.E || 0),
    CHA: Number(form?.special?.C || 0),
    INT: Number(form?.special?.I || 0),
    AGI: Number(form?.special?.A || 0),
    LCK: Number(form?.special?.L || 0),
  };
  const level = Number(form?.level || 1);
  const origin = String(form?.origin || "").toLowerCase();
  const isRobot = origin.includes("handy") || origin.includes("robot");
  const isGhoul = origin.includes("ghoul");
  const ignoreFirstRankLevel = Number(rank || 1) === 1
    && (perk?.ignoreFirstRankLevelForOrigins || []).some((value) =>
      origin.includes(String(value).toLowerCase())
    );

  parts.forEach((part) => {
    const lower = part.toLowerCase();
    const levelMatch = part.match(/Level\s*(\d+)\+/i);
    if (levelMatch) {
      const reqLevel = parseInt(levelMatch[1], 10);
      if (level < reqLevel && !ignoreFirstRankLevel) {
        warnings.push(`Requires Level ${reqLevel}+ (Current: ${level})`);
      }
      return;
    }

    const statMatch = part.match(/(STR|PER|END|CHA|INT|AGI|LCK)\s*(\d+)/i);
    if (statMatch) {
      const statName = statMatch[1].toUpperCase();
      const reqVal = parseInt(statMatch[2], 10);
      if (stats[statName] < reqVal) {
        warnings.push(`Requires ${statName} ${reqVal} (Current: ${stats[statName]})`);
      }
      return;
    }

    if (lower === "not a ghoul or robot" && (isGhoul || isRobot)) {
      warnings.push("Cannot be a ghoul or robot");
      return;
    }
    if (lower === "not a robot" && isRobot) {
      warnings.push("Cannot be a robot");
      return;
    }
    if (lower === "not immune to radiation" && isGhoul) {
      warnings.push("Requires a character that is not immune to radiation");
    }
  });

  return warnings;
}'''
    text = text[:start] + validator + text[end:]

    old = '''  const localizedPerk = (perk) => {
    const added = getAddedPerkTranslation(perk.id, language);
    return {
      name: added?.name || t(`perksInfo.${perk.id}.name`, { defaultValue: perk.name || perk.id }),
      description: added?.description || t(`perksInfo.${perk.id}.desc`, { defaultValue: perk.description || "" }),
    };
  };'''
    new = '''  const localizedPerk = (perk) => {
    const supplemental = getSupplementalPerkTranslation(perk.id, language);
    const added = getAddedPerkTranslation(perk.id, language);
    return {
      name: supplemental?.name || added?.name || t(`perksInfo.${perk.id}.name`, { defaultValue: perk.name || perk.id }),
      description: supplemental?.description || added?.description || t(`perksInfo.${perk.id}.desc`, { defaultValue: perk.description || "" }),
    };
  };'''
    if old in text:
        text = text.replace(old, new, 1)

    old = '  const warnings = matchedPerk ? getRequirementsWarnings(activeRequirements, form) : [];'
    new = '''  const warnings = matchedPerk
    ? getRequirementsWarnings(activeRequirements, form, matchedPerk, perkDraft?.rank)
    : [];
  const rankValue = Number(perkDraft?.rank || 1);
  const rankInvalid = Boolean(matchedPerk) && (
    !Number.isInteger(rankValue)
    || rankValue < 1
    || rankValue > Number(matchedPerk?.maxRanks || 1)
  );
  const allWarnings = [
    ...warnings,
    ...(rankInvalid ? [`Rank must be between 1 and ${matchedPerk?.maxRanks || 1}`] : []),
  ];'''
    if old not in text:
        raise SystemExit("perk warnings call not found")
    text = text.replace(old, new, 1)
    text = text.replace("{warnings.length > 0 && (", "{allWarnings.length > 0 && (", 1)
    text = text.replace(
        "{warnings.map((warning, index) => <li key={index}>{warning}</li>)}",
        "{allWarnings.map((warning, index) => <li key={index}>{warning}</li>)}",
        1,
    )
    old_save = '''                  className="pip-btn is-primary"
                  onClick={() => onSaveEdit(editingIndex)}
                >'''
    new_save = '''                  className="pip-btn is-primary"
                  onClick={() => onSaveEdit(editingIndex)}
                  disabled={allWarnings.length > 0}
                  title={allWarnings.length ? allWarnings.join(" · ") : undefined}
                >'''
    if old_save not in text:
        raise SystemExit("perk save button not found")
    text = text.replace(old_save, new_save, 1)
    path.write_text(text)


def patch_consumables():
    path = Path("src/utils/consumableEffects.js")
    text = path.read_text()
    if "inventoryLocalizationSupplementalFood" not in text:
        needle = '} from "../data/inventoryLocalization.js";\n'
        replacement = '''} from "../data/inventoryLocalization.js";
import {
  translateSupplementalFoodEffect,
  translateSupplementalFoodName,
} from "../data/inventoryLocalizationSupplementalFood.js";
'''
        if needle not in text:
            raise SystemExit("inventory localization import not found")
        text = text.replace(needle, replacement, 1)

    text = text.replace(
        'translateInventoryItemName(canonicalName, language) || canonicalName || "Consumable"',
        'translateSupplementalFoodName(canonicalName, language) || translateInventoryItemName(canonicalName, language) || canonicalName || "Consumable"',
    )
    text = text.replace(
        'translateInventoryItemName(canonicalName, language) || "Consumable"',
        'translateSupplementalFoodName(canonicalName, language) || translateInventoryItemName(canonicalName, language) || "Consumable"',
    )
    text = text.replace(
        'const displayEffect = translateInventoryItemEffect(effectText, language) || effectText;',
        'const displayEffect = translateSupplementalFoodEffect(canonicalName, effectText, language) || translateInventoryItemEffect(effectText, language) || effectText;',
        1,
    )
    text = text.replace(
        'name: translateInventoryItemName(canonicalName, language) || item?.name || canonicalName,',
        'name: translateSupplementalFoodName(canonicalName, language) || translateInventoryItemName(canonicalName, language) || item?.name || canonicalName,',
        1,
    )

    marker = "\nexport function getConsumableUsePlan(item, character = null, options = {}) {"
    if "function getFoodHungerRestore" not in text:
        helper = r'''
function getFoodHungerRestore(item, character) {
  if (item?.category !== "food") return 0;
  const name = normalizeName(getCanonicalName(item));
  const cookedOrPrepared = /(baked|cooked|crispy|grilled|roasted|poached|steak|stew|soup|omelet|omelette|kebab|cake|chops|ribs|pie|slurry|chunks|filet|roast|on a stick|noodle|salisbury|cram|paste|canned)/i.test(name);
  const base = cookedOrPrepared ? 2 : 1;
  return base + (getCharacterPerkRank(character, "slow_metabolizer") > 0 ? 1 : 0);
}
'''
        if marker not in text:
            raise SystemExit("consumable use plan marker not found")
        text = text.replace(marker, helper + marker, 1)

    healing_marker = '''  const healingHp = Number.isFinite(healingField) && healingField > 0
    ? healingField
    : (healingFromText ? Number(healingFromText[1]) : 0);'''
    if "const hungerRestore = getFoodHungerRestore" not in text:
        if healing_marker not in text:
            raise SystemExit("healing marker not found")
        text = text.replace(
            healing_marker,
            healing_marker + "\n  const hungerRestore = getFoodHungerRestore(item, character);",
            1,
        )

    text = text.replace(
        "    if (hasStructuredModifiers(modifiers)) {",
        '    if (hasStructuredModifiers(modifiers) || (item?.category === "food" && effectText && effectText !== "-")) {',
        1,
    )
    if "    hungerRestore," not in text:
        text = text.replace("  const plan = {\n    statusKey,", "  const plan = {\n    statusKey,\n    hungerRestore,", 1)
    if "|| hungerRestore > 0" not in text:
        text = text.replace("      healingHp > 0\n", "      healingHp > 0\n      || hungerRestore > 0\n", 1)
    path.write_text(text)


def patch_app():
    path = Path("src/App.jsx")
    text = path.read_text()
    old = '''        const preview = {
          ...prev,
          statuses,
          activeConsumableEffects,
          radiationHp: String(nextRadiation),
        };'''
    new = '''        const preview = {
          ...prev,
          statuses,
          activeConsumableEffects,
          radiationHp: String(nextRadiation),
          satiety: String(Math.min(5, Math.max(0, Number(prev.satiety || 0) + Number(plan.hungerRestore || 0)))),
        };'''
    if old not in text:
        if "Number(plan.hungerRestore" not in text:
            raise SystemExit("consumable preview marker not found")
    else:
        text = text.replace(old, new, 1)
    path.write_text(text)


patch_perks_db()
patch_perks_screen()
patch_consumables()
patch_app()
