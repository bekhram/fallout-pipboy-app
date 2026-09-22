import { getEffectiveSpecialValue, getEffectiveSkillRank } from "../data/inventory/bobbleheads.js";
import { rollFalloutD20 } from "./dice.js";
import { calculateColdExposureDifficulty, coldExposureFailure } from "./winterOfAtomRules.js";

export const PIPBOY_WINTER_TRAVEL_EFFECT_EVENT = "pipboy:winter-travel-effect";
export const WINTER_RULES_STORAGE_KEY = "pip2d20_winter_rules_v1";

export function readWinterTravelSettings() {
  const fallback = { warmClothing:true, extremeCold:false, warmShelter:false, hotFood:false, physicalActivity:true };
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WINTER_RULES_STORAGE_KEY) || "{}");
    return { ...fallback, ...(parsed?.cold || {}) };
  } catch {
    return fallback;
  }
}

export function getWinterSurvivalTest(character = {}) {
  const skill = character?.skills?.Survival || {};
  const effectiveEndurance = getEffectiveSpecialValue(character, "E");
  const effectiveRank = getEffectiveSkillRank(character, "Survival");
  const tagBonus = skill?.tagged ? 2 : 0;
  const bonus = Number(skill?.bonus || 0);
  return {
    targetNumber: Math.max(0, effectiveEndurance + effectiveRank + tagBonus + bonus),
    criticalRange: skill?.tagged ? Math.max(1, Math.min(20, effectiveRank)) : 1,
    tagged: Boolean(skill?.tagged), endurance: effectiveEndurance, skillRank: effectiveRank, bonus,
  };
}

export function resolveAutomaticWinterExposure({ character = {}, hours = 0, settings = null, rollResult = null } = {}) {
  const coldSettings = settings || readWinterTravelSettings();
  const difficulty = calculateColdExposureDifficulty({ ...coldSettings, hours });
  const test = getWinterSurvivalTest(character);
  const result = rollResult || rollFalloutD20({ diceCount:2, targetNumber:test.targetNumber, criticalRange:test.criticalRange, label:"Winter Cold Exposure" });
  const success = Number(result?.totalSuccesses || 0) >= difficulty;
  const failure = success ? null : coldExposureFailure({ hours, currentHp:Number(character?.currentHp || 0), complication:Number(result?.complications || 0) > 0 });
  return {
    kind:"winterExposure", hours:Math.max(0,Number(hours)||0), difficulty, test,
    rolls:(result?.rolls || []).map((die)=>die.value), successes:Number(result?.totalSuccesses || 0),
    complications:Number(result?.complications || 0), success, fatigue:failure?.fatigue || 0,
    fatigueCap:failure?.fatigueCap || Math.ceil(Math.max(0,Number(character?.currentHp || 0))/2),
    recoveryHours:failure?.warmShelterRestHours || 0, lockedByComplication:Boolean(failure?.lockedByComplication),
  };
}

export function formatWinterTravelLog(resolution, language = "en") {
  if (!resolution) return "";
  const code = String(language || "en").split("-")[0];
  const copy = {
    en:{ok:"WINTER // COLD TEST PASSED",fail:"WINTER // COLD TEST FAILED",fatigue:"Fatigue"},
    ru:{ok:"ЗИМА // ПРОВЕРКА ХОЛОДА УСПЕШНА",fail:"ЗИМА // ПРОВЕРКА ХОЛОДА ПРОВАЛЕНА",fatigue:"Усталость"},
    uk:{ok:"ЗИМА // ПЕРЕВІРКУ ХОЛОДУ ПРОЙДЕНО",fail:"ЗИМА // ПЕРЕВІРКУ ХОЛОДУ ПРОВАЛЕНО",fatigue:"Втома"},
    pl:{ok:"ZIMA // TEST ZIMNA ZDANY",fail:"ZIMA // TEST ZIMNA NIEZDANY",fatigue:"Zmęczenie"},
  };
  const t = copy[code] || copy.en;
  const dice = resolution.rolls?.join(",") || "—";
  const base = (resolution.success ? t.ok : t.fail) + " // END+SURV TN " + (resolution.test?.targetNumber ?? 0) + " // D" + resolution.difficulty + " // [" + dice + "] // " + resolution.successes + "S";
  return resolution.success ? base : base + " // " + t.fatigue + " +" + resolution.fatigue;
}
