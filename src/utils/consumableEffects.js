import i18n from "../i18n.js";
import { CHEM_ADDICTION_RULES } from "../constants.js";
import {
  translateInventoryItemEffect,
  translateInventoryItemName,
} from "../data/inventoryLocalization.js";
import { rollFalloutD6 } from "./dice.js";

const CONSUMABLE_CATEGORIES = new Set(["aid", "food", "beverages"]);
const UTILITY_CONSUMABLE_NAMES = new Set([
  "stealth boy",
  "robot repair kit",
  "power armor repair kit",
]);

export const PIPBOY_USE_ITEM_EVENT = "pipboy:use-inventory-item";
export const PIPBOY_END_CONSUMABLE_EFFECT_EVENT = "pipboy:end-consumable-effect";

const CHEM_STATUS_BY_NAME = {
  "berry mentats": "berryMentats",
  buffjet: "buffjet",
  buffout: "buffout",
  bufftats: "bufftats",
  calmex: "calmex",
  "daddy-o": "daddyO",
  "day tripper": "dayTripper",
  fury: "fury",
  "grape mentats": "grapeMentats",
  jet: "jet",
  "jet fuel": "jetFuel",
  "med-x": "medX",
  mentats: "mentats",
  "orange mentats": "orangeMentats",
  overdrive: "overdrive",
  psycho: "psycho",
  "psycho jet": "psychoJet",
  psychobuff: "psychobuff",
  psychotats: "psychotats",
  "rad-x": "radX",
  "rad-x (diluted)": "radXDiluted",
  "skeeto spit": "skeetoSpit",
  "ultra jet": "ultraJet",
  "x-cell": "xCell",
};

const ADDICTION_STATUS_BY_NAME = {
  "berry mentats": "mentatAddiction",
  buffjet: "buffoutAddiction",
  buffout: "buffoutAddiction",
  bufftats: "buffoutAddiction",
  calmex: "calmexAddiction",
  "daddy-o": "daddyOAddiction",
  "day tripper": "dayTripperAddiction",
  fury: "furyAddiction",
  "grape mentats": "mentatAddiction",
  jet: "jetAddiction",
  "jet fuel": "jetAddiction",
  "med-x": "medXAddiction",
  mentats: "mentatAddiction",
  "orange mentats": "mentatAddiction",
  overdrive: "overdriveAddiction",
  psycho: "psychoAddiction",
  "psycho jet": "psychoAddiction",
  psychobuff: "psychoAddiction",
  psychotats: "psychoAddiction",
  "ultra jet": "ultraJetAddiction",
  "x-cell": "xCellAddiction",
};

const ATTRIBUTE_KEYS = {
  str: "S",
  per: "P",
  end: "E",
  cha: "C",
  int: "I",
  agi: "A",
  lck: "L",
};

const ALL_TEST_KEYS = Object.values(ATTRIBUTE_KEYS);
const sessionDoseCounts = new Map();

function clean(value) {
  return String(value ?? "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function extractAttributes(value) {
  const lower = clean(value).toLowerCase();
  return Object.entries(ATTRIBUTE_KEYS)
    .filter(([token]) => new RegExp(`\\b${token}\\b`, "i").test(lower))
    .map(([, key]) => key);
}

function makeModifiers() {
  return {
    derived: {},
    tests: [],
    combat: {},
    flags: {},
  };
}

function addNumeric(target, key, value) {
  if (!Number.isFinite(Number(value)) || Number(value) === 0) return;
  target[key] = Number(target[key] || 0) + Number(value);
}

function addTestModifier(modifiers, keys, patch) {
  if (!keys.length) return;
  const signature = [...keys].sort().join("|");
  const existing = modifiers.tests.find(
    (entry) => [...entry.keys].sort().join("|") === signature
  );
  if (existing) {
    existing.difficultyDelta = Number(existing.difficultyDelta || 0) + Number(patch.difficultyDelta || 0);
    existing.reroll = Boolean(existing.reroll || patch.reroll);
    existing.rerollCount = Math.max(Number(existing.rerollCount || 0), Number(patch.rerollCount || 0));
    if (patch.complicationFrom) {
      existing.complicationFrom = existing.complicationFrom
        ? Math.min(existing.complicationFrom, Number(patch.complicationFrom))
        : Number(patch.complicationFrom);
    }
    return;
  }
  modifiers.tests.push({ keys, ...patch });
}

function parseDifficultyModifiers(text, modifiers) {
  const dirtyWastelander = clean(text).match(
    /reduce difficulty of all STR tests by\s*(\d+).*increase difficulty of all INT tests by\s*(\d+)/i
  );
  if (dirtyWastelander) {
    addTestModifier(modifiers, ["S"], { difficultyDelta: -Number(dirtyWastelander[1]) });
    addTestModifier(modifiers, ["I"], { difficultyDelta: Number(dirtyWastelander[2]) });
    return;
  }

  const clauses = clean(text).split(/[.;]/).map((part) => part.trim()).filter(Boolean);

  clauses.forEach((clause) => {
    const lower = clause.toLowerCase();
    const keys = extractAttributes(clause);
    if (!keys.length) return;

    const reduceMatch = lower.match(/(?:reduce|decrease)[^\d]*difficulty[^\d]*by\s*(\d+)/i);
    if (reduceMatch) {
      addTestModifier(modifiers, keys, { difficultyDelta: -Number(reduceMatch[1]) });
    }

    const increaseMatch = lower.match(/increase[^\d]*difficulty[^\d]*by\s*(\d+)/i);
    if (increaseMatch) {
      addTestModifier(modifiers, keys, { difficultyDelta: Number(increaseMatch[1]) });
    }

    const plusDifficultyMatch = lower.match(/\+(\d+)\s*difficulty/i);
    if (plusDifficultyMatch) {
      addTestModifier(modifiers, keys, { difficultyDelta: Number(plusDifficultyMatch[1]) });
    }
  });
}

function parseRerolls(text, modifiers) {
  const clauses = clean(text).split(/[.;]/).map((part) => part.trim()).filter(Boolean);
  clauses.forEach((clause) => {
    if (!/re-?roll/i.test(clause)) return;
    const keys = extractAttributes(clause);
    if (!keys.length) return;
    const countMatch = clause.match(/(?:up to\s*)?(\d+)\s*d20/i);
    addTestModifier(modifiers, keys, {
      reroll: true,
      rerollCount: countMatch ? Number(countMatch[1]) : 1,
    });
  });
}

export function buildConsumableModifiers(effectText) {
  const text = clean(effectText);
  const lower = text.toLowerCase();
  const modifiers = makeModifiers();

  const maxHp = text.match(/max hp\s*\+(\d+)/i)
    || text.match(/\+(\d+)\s*max hp/i);
  if (maxHp) addNumeric(modifiers.derived, "maxHpBonus", Number(maxHp[1]));

  const carryWeight = text.match(/carry weight[^+\d]*\+?(\d+)/i);
  if (carryWeight) addNumeric(modifiers.derived, "carryWeightBonus", Number(carryWeight[1]));

  const resistTypes = [
    ["physical", "physicalResistBonus"],
    ["energy", "energyResistBonus"],
    ["radiation", "radiationResistBonus"],
    ["poison", "poisonResistBonus"],
  ];
  resistTypes.forEach(([label, key]) => {
    const patterns = [
      new RegExp(`plus\\s*(\\d+)\\s*(?:to\\s*)?${label} damage resistance`, "i"),
      new RegExp(`\\+(\\d+)\\s*(?:to\\s*)?${label} damage resistance`, "i"),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        addNumeric(modifiers.derived, key, Number(match[1]));
        break;
      }
    }
  });

  const meleeCd = text.match(/plus\s*(\d+)\s*d6\s*to melee/i);
  if (meleeCd) addNumeric(modifiers.combat, "meleeBonusCd", Number(meleeCd[1]));

  const apImmediate = text.match(/immediately\s+(?:gain|add)\s*\+?(\d+)\s*ap/i);
  if (apImmediate) addNumeric(modifiers.combat, "apNowBonus", Number(apImmediate[1]));

  const apNextScene = text.match(/gain\s*\+?(\d+)\s*ap at start of next scene/i);
  if (apNextScene) addNumeric(modifiers.combat, "apNowBonus", Number(apNextScene[1]));

  const apPerTurn = text.match(/gain\s*(\d+)\s*free ap at the start of each turn/i);
  if (apPerTurn) addNumeric(modifiers.combat, "apPerTurnBonus", Number(apPerTurn[1]));

  const groupPool = text.match(/(?:plus\s*)?(\d+)\s*(?:maximum|max)?\s*ap\s*(?:in group pool|more than normal)/i)
    || text.match(/group ap pool can hold\s*(\d+)\s*ap more/i);
  if (groupPool) addNumeric(modifiers.combat, "groupApMaxBonus", Number(groupPool[1]));

  const hpRegen = text.match(/(?:heal|regain)\s*(\d+)\s*hp at (?:the )?start of each turn/i);
  if (hpRegen) addNumeric(modifiers.combat, "hpRegenPerTurn", Number(hpRegen[1]));

  if (/breathe underwater/i.test(lower)) modifiers.flags.waterBreathing = true;

  parseDifficultyModifiers(text, modifiers);
  parseRerolls(text, modifiers);

  return modifiers;
}

function hasStructuredModifiers(modifiers) {
  return (
    Object.keys(modifiers.derived).length > 0 ||
    modifiers.tests.length > 0 ||
    Object.keys(modifiers.combat).length > 0 ||
    Object.keys(modifiers.flags).length > 0
  );
}

function getCanonicalName(item) {
  return clean(item?.canonicalName || item?.name);
}

function getCanonicalEffect(item) {
  return clean(item?.canonicalEffect || item?.effect);
}

function inferDuration(item, canonicalEffect = getCanonicalEffect(item)) {
  const explicit = clean(item?.duration);
  if (explicit && explicit.toLowerCase() !== "instant") return explicit;

  const effect = clean(canonicalEffect).toLowerCase();
  if (/end of (?:the )?current scene/.test(effect)) return "Until end of current scene";
  if (/end of (?:the )?(?:next|following) scene/.test(effect)) return "Until end of next scene";
  if (/start of next scene/.test(effect)) return "Next scene";
  if (/start of each turn/.test(effect)) return "Until manually ended";
  return "Until manually ended";
}

function makeEffectId(item) {
  return `consumable:${normalizeName(getCanonicalName(item)).replace(/[^a-z0-9]+/g, "-")}`;
}

function getRadiationDiceCount(item, effectText) {
  const radiationText = clean(item?.radiation).toLowerCase();
  const match = radiationText.match(/(\d+)\s*d6/);
  if (!match) return 0;

  let diceCount = Math.max(0, Number(match[1] || 0));
  const override = clean(effectText).match(/roll\s*(\d+)\s*d6\s*rather than\s*\d+/i);
  if (override) diceCount = Math.max(diceCount, Number(override[1] || 0));
  return diceCount;
}

function rollRadiationRisk(item, effectText) {
  const diceCount = getRadiationDiceCount(item, effectText);
  if (diceCount <= 0) {
    return { diceCount: 0, damage: 0, roll: null };
  }

  const roll = rollFalloutD6({ diceCount, effects: [] });
  return {
    diceCount,
    damage: Math.max(0, Number(roll?.totalEffects || 0)),
    roll,
  };
}

function getAddictionThreshold(item) {
  const match = clean(item?.addiction).match(/^yes\s*(\d+)/i);
  return match ? Math.max(1, Number(match[1] || 1)) : 0;
}

function buildAddictionModifiers(addictionKey) {
  const rule = CHEM_ADDICTION_RULES[addictionKey];
  const modifiers = makeModifiers();
  if (!rule) return modifiers;

  const affected = (rule.affectedTests || []).includes("ALL")
    ? ALL_TEST_KEYS
    : (rule.affectedTests || []);

  addTestModifier(modifiers, affected, {
    difficultyDelta: 1,
    ...(addictionKey === "calmexAddiction" ? { complicationFrom: 18 } : {}),
  });

  if (rule.extraEffects?.includes("plus1PhysicalDamageTaken")) {
    addNumeric(modifiers.combat, "physicalDamageTakenCdBonus", 1);
  }
  if (rule.extraEffects?.includes("minus1GeneratedAP")) {
    addNumeric(modifiers.combat, "apGeneratedPenalty", 1);
  }

  return modifiers;
}

function rollAddictionRisk(item, canonicalName, language) {
  const threshold = getAddictionThreshold(item);
  const addictionKey = ADDICTION_STATUS_BY_NAME[normalizeName(canonicalName)] || null;
  if (!threshold || !addictionKey || !CHEM_ADDICTION_RULES[addictionKey]) {
    return null;
  }

  const doseCount = Math.max(1, Number(sessionDoseCounts.get(addictionKey) || 0) + 1);
  sessionDoseCounts.set(addictionKey, doseCount);

  const roll = rollFalloutD6({ diceCount: doseCount, effects: [] });
  const effectCount = Math.max(0, Number(roll?.totalEffects || 0));
  const addicted = effectCount >= threshold;
  if (!addicted) {
    return {
      addictionKey,
      threshold,
      doseCount,
      effectCount,
      addicted: false,
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
    effectCount,
    addicted: true,
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

function buildAddictionCureMarker() {
  const now = new Date().toISOString();
  return {
    id: "consumable:addiction-cure-marker",
    kind: "addiction-cure-marker",
    sourceName: "Addiction treatment",
    effectText: "Previous consumable addictions cured.",
    canonicalSourceName: "Addiction treatment",
    canonicalEffect: "Previous consumable addictions cured.",
    duration: "Instant",
    category: "system",
    createdAt: now,
    modifiers: makeModifiers(),
  };
}

export function isConsumableItem(item) {
  return CONSUMABLE_CATEGORIES.has(item?.category)
    || UTILITY_CONSUMABLE_NAMES.has(normalizeName(getCanonicalName(item)));
}

export function getConsumableUsePlan(item) {
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
  const radiationRisk = rollRadiationRisk(item, effectText);
  const healingRadiation = baseRadiationHealing - radiationRisk.damage;
  const cureAddictions = /(?:removes?|cures?) all addictions/i.test(effectText);
  const cureDiseases = /cure all illnesses/i.test(effectText);
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const addictionRisk = rollAddictionRisk(item, canonicalName, language);

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
        effectText: translateInventoryItemEffect(effectText, language) || effectText,
        canonicalSourceName: canonicalName,
        canonicalEffect: effectText,
        duration: inferDuration(item, effectText),
        category: item?.category || "consumable",
        modifiers,
      };
    }
  }

  return {
    statusKey,
    healingHp,
    healingRadiation,
    radiationRisk,
    addictionRisk,
    cureAddictions,
    cureDiseases,
    activeEffect,
    hasImmediateEffect:
      healingHp > 0
      || healingRadiation !== 0
      || radiationRisk.damage > 0
      || Boolean(addictionRisk)
      || cureAddictions
      || cureDiseases
      || /immediately/i.test(lower),
  };
}

function effectTimestamp(effect) {
  const parsed = Date.parse(effect?.createdAt || effect?.timestamp || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function applyActiveConsumableEffects(mods, activeEffects = []) {
  const effects = Array.isArray(activeEffects) ? activeEffects : [];
  const latestCureAt = effects
    .filter((effect) => effect?.kind === "addiction-cure-marker")
    .reduce((latest, effect) => Math.max(latest, effectTimestamp(effect)), 0);

  effects.forEach((effect) => {
    if (effect?.kind === "addiction-cure-marker") return;

    if (effect?.kind === "addiction") {
      if (effectTimestamp(effect) <= latestCureAt) return;
      const suppressed = (effect.suppressedBy || []).some((statusKey) =>
        mods.activeStatuses?.includes(statusKey)
      );
      if (suppressed) return;
      if (effect.addictionKey && !mods.activeAddictions.includes(effect.addictionKey)) {
        mods.activeAddictions.push(effect.addictionKey);
      }
    }

    const modifiers = effect?.modifiers || {};

    Object.entries(modifiers.derived || {}).forEach(([key, value]) => {
      mods.derived[key] = Number(mods.derived[key] || 0) + Number(value || 0);
    });

    (modifiers.tests || []).forEach((testMod) => {
      (testMod.keys || []).forEach((key) => {
        if (!mods.tests[key]) return;
        mods.tests[key].difficultyDelta += Number(testMod.difficultyDelta || 0);
        if (testMod.reroll) mods.tests[key].reroll = true;
        if (testMod.rerollCount) {
          mods.tests[key].rerollCount = Math.max(
            Number(mods.tests[key].rerollCount || 0),
            Number(testMod.rerollCount || 0)
          );
        }
        if (testMod.complicationFrom) {
          const current = mods.tests[key].complicationFrom;
          const incoming = Number(testMod.complicationFrom);
          mods.tests[key].complicationFrom = current == null
            ? incoming
            : Math.min(Number(current), incoming);
        }
      });
    });

    Object.entries(modifiers.combat || {}).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        mods.combat[key] = value;
      } else {
        mods.combat[key] = Number(mods.combat[key] || 0) + Number(value || 0);
      }
    });

    Object.entries(modifiers.flags || {}).forEach(([key, value]) => {
      mods.flags[key] = value;
    });

    const note = [effect?.sourceName, effect?.effectText].filter(Boolean).join(": ");
    if (note && !mods.notes.includes(note)) mods.notes.push(note);
  });

  return mods;
}
