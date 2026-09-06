from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "src" / "App.jsx"
EFFECTS = ROOT / "src" / "utils" / "consumableEffects.js"


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"Missing start marker: {start_marker}")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"Missing end marker: {end_marker}")
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


app = APP.read_text(encoding="utf-8")
old_call = "const plan = getConsumableUsePlan(item);"
new_call = "const plan = getConsumableUsePlan(item, form, { showResult: true });"
if old_call in app:
    app = app.replace(old_call, new_call, 1)
elif new_call not in app:
    raise SystemExit("Could not locate consumable plan call in App.jsx")
APP.write_text(app, encoding="utf-8")


effects = EFFECTS.read_text(encoding="utf-8")

old_dice_import = 'import { rollFalloutD6 } from "./dice.js";'
new_dice_import = 'import { rerollOneFalloutD6, rollFalloutD6 } from "./dice.js";\nimport { showConsumableResultPopup } from "./consumableResultUi.js";'
if old_dice_import in effects:
    effects = effects.replace(old_dice_import, new_dice_import, 1)
elif 'showConsumableResultPopup' not in effects:
    raise SystemExit("Could not patch consumableEffects imports")

perk_helpers = r'''
function normalizePerkId(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getCharacterPerkRank(character, perkId) {
  const wanted = normalizePerkId(perkId);
  let best = 0;
  for (const perk of character?.perksAndTraits || []) {
    if (perk?.isOriginTrait) continue;
    const id = normalizePerkId(perk?.id);
    const name = normalizePerkId(perk?.name);
    if (id !== wanted && name !== wanted) continue;
    best = Math.max(best, Math.max(1, Number(perk?.rank || 1)));
  }
  return best;
}
'''

if "function normalizePerkId(value)" not in effects:
    marker = "const sessionDoseCounts = new Map();\n"
    if marker not in effects:
        raise SystemExit("Could not locate session dose map")
    effects = effects.replace(marker, marker + "\n" + perk_helpers.strip() + "\n", 1)

radiation_fn = r'''
function rollRadiationRisk(item, effectText, character) {
  const diceCount = getRadiationDiceCount(item, effectText);
  const canUseLeadBelly = item?.category === "food" || item?.category === "beverages";
  const leadBellyRank = canUseLeadBelly
    ? getCharacterPerkRank(character, "lead_belly")
    : 0;

  if (diceCount <= 0) {
    return {
      baseDiceCount: 0,
      diceCount: 0,
      baseDamage: 0,
      damage: 0,
      preventedDamage: 0,
      leadBellyRank,
      rerolled: false,
      roll: null,
    };
  }

  if (leadBellyRank >= 2) {
    return {
      baseDiceCount: diceCount,
      diceCount,
      baseDamage: 0,
      damage: 0,
      preventedDamage: 0,
      leadBellyRank,
      immune: true,
      rerolled: false,
      roll: null,
    };
  }

  let roll = rollFalloutD6({ diceCount, effects: [] });
  const baseDamage = Math.max(0, Number(roll?.totalEffects || 0));
  let rerolled = false;

  if (leadBellyRank >= 1 && baseDamage > 0) {
    const effectIndex = (roll?.rolls || []).findIndex((die) => Number(die?.effect || 0) > 0);
    if (effectIndex >= 0) {
      roll = rerollOneFalloutD6(roll, effectIndex, { effects: [] });
      rerolled = true;
    }
  }

  const damage = Math.max(0, Number(roll?.totalEffects || 0));
  return {
    baseDiceCount: diceCount,
    diceCount,
    baseDamage,
    damage,
    preventedDamage: Math.max(0, baseDamage - damage),
    leadBellyRank,
    rerolled,
    roll,
  };
}
'''
effects = replace_between(
    effects,
    "function rollRadiationRisk(",
    "function getAddictionThreshold",
    radiation_fn,
)

addiction_fn = r'''
function rollAddictionRisk(item, canonicalName, language, character) {
  const threshold = getAddictionThreshold(item);
  const addictionKey = ADDICTION_STATUS_BY_NAME[normalizeName(canonicalName)] || null;
  if (!threshold || !addictionKey || !CHEM_ADDICTION_RULES[addictionKey]) {
    return null;
  }

  const chemResistantRank = getCharacterPerkRank(character, "chem_resistant");
  const doseCount = Math.max(1, Number(sessionDoseCounts.get(addictionKey) || 0) + 1);
  sessionDoseCounts.set(addictionKey, doseCount);
  const baseDiceCount = doseCount;

  if (chemResistantRank >= 2) {
    return {
      addictionKey,
      threshold,
      doseCount,
      baseDiceCount,
      diceCount: 0,
      effectCount: 0,
      addicted: false,
      immune: true,
      chemResistantRank,
      roll: null,
      activeEffect: null,
    };
  }

  const diceCount = Math.max(0, baseDiceCount - (chemResistantRank >= 1 ? 1 : 0));
  if (diceCount <= 0) {
    return {
      addictionKey,
      threshold,
      doseCount,
      baseDiceCount,
      diceCount: 0,
      effectCount: 0,
      addicted: false,
      immune: false,
      chemResistantRank,
      roll: null,
      activeEffect: null,
    };
  }

  const roll = rollFalloutD6({ diceCount, effects: [] });
  const effectCount = Math.max(0, Number(roll?.totalEffects || 0));
  const addicted = effectCount >= threshold;
  if (!addicted) {
    return {
      addictionKey,
      threshold,
      doseCount,
      baseDiceCount,
      diceCount,
      effectCount,
      addicted: false,
      immune: false,
      chemResistantRank,
      roll,
      activeEffect: null,
    };
  }

  const rule = CHEM_ADDICTION_RULES[addictionKey];
  const sourceName = translateInventoryItemName(canonicalName, language) || canonicalName || "Consumable";
  const now = new Date().toISOString();

  return {
    addictionKey,
    threshold,
    doseCount,
    baseDiceCount,
    diceCount,
    effectCount,
    addicted: true,
    immune: false,
    chemResistantRank,
    roll,
    activeEffect: {
      id: `addiction:${addictionKey}`,
      kind: "addiction",
      addictionKey,
      sourceName: `${sourceName} — Addiction`,
      effectText: rule.effectText,
      canonicalSourceName: canonicalName,
      canonicalEffect: rule.effectText,
      duration: rule.permanent ? "Permanent" : "Ongoing",
      category: "addiction",
      createdAt: now,
      suppressedBy: [...(rule.suppressedBy || [])],
      modifiers: buildAddictionModifiers(addictionKey),
    },
  };
}
'''
effects = replace_between(
    effects,
    "function rollAddictionRisk(",
    "function buildAddictionCureMarker",
    addiction_fn,
)

plan_fn = r'''
export function getConsumableUsePlan(item, character = null, options = {}) {
  const canonicalName = getCanonicalName(item);
  const effectText = getCanonicalEffect(item);
  const lower = effectText.toLowerCase();
  const statusKey = CHEM_STATUS_BY_NAME[normalizeName(canonicalName)] || null;
  const healingField = Number(String(item?.healing ?? "").replace(",", "."));
  const healingFromText = effectText.match(/heals?\s*(\d+)\s*hp/i);
  const healingHp = Number.isFinite(healingField) && healingField > 0
    ? healingField
    : (healingFromText ? Number(healingFromText[1]) : 0);
  const radiationHealMatch = effectText.match(/heals?\s*(\d+)\s*radiation damage/i);
  const baseRadiationHealing = radiationHealMatch ? Number(radiationHealMatch[1]) : 0;
  const radiationRisk = rollRadiationRisk(item, effectText, character);
  const healingRadiation = baseRadiationHealing - radiationRisk.damage;
  const cureAddictions = /(?:removes?|cures?) all addictions/i.test(effectText);
  const cureDiseases = /cure all illnesses/i.test(effectText);
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const addictionRisk = rollAddictionRisk(item, canonicalName, language, character);
  const displayEffect = translateInventoryItemEffect(effectText, language) || effectText;

  let activeEffect = null;
  if (cureAddictions) {
    activeEffect = buildAddictionCureMarker();
  } else if (addictionRisk?.activeEffect) {
    activeEffect = addictionRisk.activeEffect;
  } else if (!statusKey) {
    const modifiers = buildConsumableModifiers(effectText);
    if (hasStructuredModifiers(modifiers)) {
      activeEffect = {
        id: makeEffectId(item),
        sourceName: translateInventoryItemName(canonicalName, language) || "Consumable",
        effectText: displayEffect,
        canonicalSourceName: canonicalName,
        canonicalEffect: effectText,
        duration: inferDuration(item, effectText),
        category: item?.category || "consumable",
        modifiers,
      };
    }
  }

  const plan = {
    statusKey,
    healingHp,
    healingRadiation,
    radiationHealing: baseRadiationHealing,
    radiationRisk,
    addictionRisk,
    cureAddictions,
    cureDiseases,
    activeEffect,
    displayEffect,
    hasImmediateEffect:
      healingHp > 0
      || healingRadiation !== 0
      || radiationRisk.damage > 0
      || Boolean(addictionRisk)
      || cureAddictions
      || cureDiseases
      || /immediately/i.test(lower),
  };

  if (options?.showResult) {
    showConsumableResultPopup({
      item: {
        ...item,
        name: translateInventoryItemName(canonicalName, language) || item?.name || canonicalName,
      },
      plan,
      language,
    });
  }

  return plan;
}
'''
effects = replace_between(
    effects,
    "export function getConsumableUsePlan(",
    "function effectTimestamp",
    plan_fn,
)

EFFECTS.write_text(effects, encoding="utf-8")
print("Applied consumable perk and result popup patch")
