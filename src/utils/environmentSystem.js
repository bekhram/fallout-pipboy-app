import { rollFalloutD6 } from "./dice.js";
import { calculateFinalIncomingDamage, getDerivedStats } from "./characterMath.js";
import { getHazard } from "./mapMath.js";

export const ENVIRONMENT_HAZARD_TICK_HOURS = 4;
export const ENVIRONMENT_WEATHER_PERIOD_HOURS = 6;

const WEATHER_DETAILS = {
  clear: {
    id: "clear",
    visibility: "normal",
    wind: "light",
    precipitation: "none",
  },
  overcast: {
    id: "overcast",
    visibility: "normal",
    wind: "light",
    precipitation: "none",
  },
  rain: {
    id: "rain",
    visibility: "reduced",
    wind: "moderate",
    precipitation: "rain",
  },
  fog: {
    id: "fog",
    visibility: "poor",
    wind: "light",
    precipitation: "mist",
  },
  wind: {
    id: "wind",
    visibility: "normal",
    wind: "strong",
    precipitation: "none",
  },
  dust: {
    id: "dust",
    visibility: "poor",
    wind: "strong",
    precipitation: "dust",
  },
  heat_haze: {
    id: "heat_haze",
    visibility: "reduced_long_range",
    wind: "light",
    precipitation: "none",
  },
};

const WEATHER_TABLES = {
  commonwealth: ["clear", "clear", "overcast", "overcast", "rain", "rain", "fog", "wind"],
  capital_wasteland: ["clear", "clear", "overcast", "rain", "rain", "fog", "wind", "wind"],
  mojave: ["clear", "clear", "clear", "clear", "wind", "wind", "dust", "heat_haze"],
  california_fo1: ["clear", "clear", "clear", "overcast", "wind", "dust", "fog", "rain"],
  california_fo2: ["clear", "clear", "overcast", "wind", "wind", "fog", "rain", "rain"],
};

const WEATHER_LABELS = {
  en: { clear: "Clear", overcast: "Overcast", rain: "Rain", fog: "Fog", wind: "Strong wind", dust: "Dust storm", heat_haze: "Heat haze" },
  ru: { clear: "Ясно", overcast: "Пасмурно", rain: "Дождь", fog: "Туман", wind: "Сильный ветер", dust: "Пыльная буря", heat_haze: "Жаркое марево" },
  uk: { clear: "Ясно", overcast: "Хмарно", rain: "Дощ", fog: "Туман", wind: "Сильний вітер", dust: "Пилова буря", heat_haze: "Марево спеки" },
  pl: { clear: "Bezchmurnie", overcast: "Pochmurno", rain: "Deszcz", fog: "Mgła", wind: "Silny wiatr", dust: "Burza pyłowa", heat_haze: "Miraż cieplny" },
};

const TIME_LABELS = {
  en: { night: "Night", dawn: "Dawn", day: "Day", dusk: "Dusk" },
  ru: { night: "Ночь", dawn: "Рассвет", day: "День", dusk: "Сумерки" },
  uk: { night: "Ніч", dawn: "Світанок", day: "День", dusk: "Сутінки" },
  pl: { night: "Noc", dawn: "Świt", day: "Dzień", dusk: "Zmierzch" },
};

const HAZARD_LABELS = {
  en: { radiation: "Radiation exposure", toxic: "Toxic exposure", danger: "Environmental danger", anomaly: "Anomalous exposure" },
  ru: { radiation: "Радиационное воздействие", toxic: "Токсичное воздействие", danger: "Опасность среды", anomaly: "Аномальное воздействие" },
  uk: { radiation: "Радіаційний вплив", toxic: "Токсичний вплив", danger: "Небезпека середовища", anomaly: "Аномальний вплив" },
  pl: { radiation: "Narażenie na promieniowanie", toxic: "Narażenie toksyczne", danger: "Zagrożenie środowiskowe", anomaly: "Narażenie anomalne" },
};

const LIGHT_PATTERNS = [
  "flashlight", "torch", "headlamp", "pip-boy light", "pip boy light",
  "фонар", "ліхтар", "latark",
];
const NIGHT_VISION_PATTERNS = [
  "night vision", "nightvision", "nv goggles", "night-vision",
  "ночн", "ночное видение", "нічн", "нічне бачення", "noktowiz",
];

function normalizeLanguage(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return ["en", "ru", "uk", "pl"].includes(code) ? code : "en";
}

function hashString(value) {
  let hash = 2166136261;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function includesAny(text, patterns) {
  const normalized = String(text || "").toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

function collectEquipmentText(character) {
  const parts = [];
  for (const item of character?.inventoryItems || []) {
    if (Number(item?.quantity ?? 1) <= 0) continue;
    parts.push(item?.name, item?.effect, item?.description, item?.qualities);
  }
  for (const weapon of character?.weapons || []) {
    parts.push(weapon?.name, weapon?.mods, weapon?.modifications, weapon?.qualities);
  }
  for (const perk of character?.perksAndTraits || []) {
    parts.push(perk?.name, perk?.description);
  }
  return parts.filter(Boolean).join(" | ");
}

export function detectEnvironmentEquipment(character) {
  const equipmentText = collectEquipmentText(character);
  return {
    hasLightSource: includesAny(equipmentText, LIGHT_PATTERNS),
    hasNightVision: includesAny(equipmentText, NIGHT_VISION_PATTERNS),
  };
}

export function getTimeOfDay(totalHours = 0) {
  const safeHours = Math.max(0, Number(totalHours) || 0);
  const hour = ((Math.floor(safeHours) % 24) + 24) % 24;
  let phase = "day";
  if (hour >= 21 || hour < 6) phase = "night";
  else if (hour < 8) phase = "dawn";
  else if (hour >= 18) phase = "dusk";

  return {
    hour,
    phase,
    isDark: phase === "night",
    lowLight: phase === "night" || phase === "dawn" || phase === "dusk",
  };
}

export function getWeatherSnapshot(regionId = "commonwealth", totalHours = 0) {
  const periodIndex = Math.floor(Math.max(0, Number(totalHours) || 0) / ENVIRONMENT_WEATHER_PERIOD_HOURS);
  const table = WEATHER_TABLES[regionId] || WEATHER_TABLES.commonwealth;
  const index = hashString(`${regionId}:${periodIndex}`) % table.length;
  const id = table[index];
  return {
    ...(WEATHER_DETAILS[id] || WEATHER_DETAILS.clear),
    periodIndex,
    periodStartHour: periodIndex * ENVIRONMENT_WEATHER_PERIOD_HOURS,
    changesAtHour: (periodIndex + 1) * ENVIRONMENT_WEATHER_PERIOD_HOURS,
  };
}

function buildCheckModifiers(time, weather, equipment) {
  const modifiers = [];

  if (time.isDark) {
    modifiers.push({
      id: "darkness_sneak",
      difficultyDelta: -1,
      appliesTo: ["Sneak"],
      condition: "Apply when darkness actually conceals the character and they are not using a conspicuous light source.",
      reason: "Darkness makes visual detection harder.",
    });

    if (!equipment.hasNightVision) {
      modifiers.push({
        id: "darkness_visual",
        difficultyDelta: 1,
        appliesTo: ["visual Perception", "visual observation"],
        condition: equipment.hasLightSource
          ? "Apply unless the character actively uses their available light source."
          : "Apply while the task depends on normal vision.",
        reason: "Normal vision is impaired at night.",
      });

      modifiers.push({
        id: "darkness_ranged",
        difficultyDelta: 1,
        appliesTo: ["ranged attack"],
        condition: equipment.hasLightSource
          ? "Apply unless the character actively illuminates the target with their available light source."
          : "Apply when the target is not otherwise well illuminated.",
        reason: "Aiming at an unlit target is harder at night.",
      });
    }
  }

  if (weather.id === "fog" || weather.id === "dust") {
    modifiers.push({ id: `${weather.id}_sneak`, difficultyDelta: -1, appliesTo: ["Sneak"], condition: "Apply when concealment from the weather matters.", reason: "Poor visibility provides concealment." });
    modifiers.push({ id: `${weather.id}_visual`, difficultyDelta: 1, appliesTo: ["visual Perception", "visual observation"], condition: "Apply to vision-dependent checks.", reason: "Visibility is poor." });
    modifiers.push({ id: `${weather.id}_ranged`, difficultyDelta: 1, appliesTo: ["ranged attack"], condition: "Apply at Medium range or farther.", reason: "Poor visibility obscures distant targets." });
  }

  if (weather.id === "rain") {
    modifiers.push({ id: "rain_visual", difficultyDelta: 1, appliesTo: ["visual Perception"], condition: "Apply when rain meaningfully obscures sight.", reason: "Rain reduces visibility." });
    modifiers.push({ id: "rain_ranged", difficultyDelta: 1, appliesTo: ["ranged attack"], condition: "Apply at Long range or farther.", reason: "Rain makes long-range aiming harder." });
    modifiers.push({ id: "rain_sneak", difficultyDelta: -1, appliesTo: ["Sneak"], condition: "Apply when rain noise and reduced visibility help conceal movement.", reason: "Rain masks sound and movement." });
  }

  if (weather.id === "wind" || weather.id === "dust") {
    modifiers.push({ id: "wind_ranged", difficultyDelta: 1, appliesTo: ["ranged attack"], condition: "Apply at Long range or farther.", reason: "Strong wind disrupts long-range shots." });
    modifiers.push({ id: "wind_thrown", difficultyDelta: 1, appliesTo: ["thrown attack"], condition: "Apply at Medium range or farther.", reason: "Strong wind disrupts thrown trajectories." });
  }

  if (weather.id === "heat_haze") {
    modifiers.push({ id: "heat_haze_visual", difficultyDelta: 1, appliesTo: ["visual Perception", "ranged attack"], condition: "Apply at Long range or farther.", reason: "Heat haze distorts distant shapes." });
  }

  return modifiers;
}

export function getEnvironmentSnapshot({
  totalHours = 0,
  regionId = "commonwealth",
  hazards = [],
  character = null,
} = {}) {
  const time = getTimeOfDay(totalHours);
  const weather = getWeatherSnapshot(regionId, totalHours);
  const equipment = detectEnvironmentEquipment(character);
  const hazardDetails = (hazards || []).map((hazardId) => {
    const hazard = getHazard(hazardId);
    return {
      id: hazardId,
      damageType: hazard?.damageType || null,
      periodicDamage: Boolean(hazard?.damageType),
      tickHours: hazard?.damageType ? ENVIRONMENT_HAZARD_TICK_HOURS : null,
    };
  });

  return {
    time,
    weather,
    equipment,
    hazards: hazardDetails,
    checkModifiers: buildCheckModifiers(time, weather, equipment),
    rules: {
      difficultyMinimum: 0,
      difficultyMaximum: 10,
      lightSourceNote: equipment.hasLightSource
        ? "A light source is available but is not assumed to be switched on. If actively used, it can cancel darkness vision/aiming penalties but may remove darkness-based concealment."
        : "No obvious light source was detected in the character inventory/equipment.",
      nightVisionNote: equipment.hasNightVision
        ? "Night-vision equipment was detected and cancels normal darkness vision/aiming penalties when usable."
        : "No night-vision equipment was detected.",
    },
  };
}

export function getEnvironmentDisplay(environment, language = "en") {
  const lang = normalizeLanguage(language);
  const weatherId = environment?.weather?.id || "clear";
  const phase = environment?.time?.phase || "day";
  return {
    weather: WEATHER_LABELS[lang]?.[weatherId] || WEATHER_LABELS.en[weatherId] || weatherId,
    timeOfDay: TIME_LABELS[lang]?.[phase] || TIME_LABELS.en[phase] || phase,
  };
}

export function resolveEnvironmentalHazard(hazardId, character, { diceCount = 2 } = {}) {
  const hazard = getHazard(hazardId);
  if (!hazard?.damageType) return null;

  const damageRoll = rollFalloutD6({ diceCount });
  const derived = getDerivedStats(character || {});
  const calculation = calculateFinalIncomingDamage({
    rawDamage: damageRoll.totalDamage,
    damageType: hazard.damageType,
    part: "torso",
    armor: character?.armor,
    derived,
  });

  return {
    kind: "damage",
    source: "environment_hazard",
    hazardId,
    damageType: hazard.damageType,
    diceCount,
    dice: damageRoll.rolls.map((die) => die.value),
    rawDamage: damageRoll.totalDamage,
    effectTriggers: damageRoll.totalEffects,
    hitLocation: "torso",
    hitLocationLabel: "Torso",
    hitLocationRoll: null,
    resistance: calculation.resistance >= 9999 ? "immune" : calculation.resistance,
    incomingModifier: calculation.incomingModifier,
    finalDamage: calculation.finalDamage,
    criticalInjury: calculation.finalDamage >= 5,
    hpEffect: hazard.damageType === "radiation"
      ? { radiationHpDelta: calculation.finalDamage }
      : { currentHpDelta: -calculation.finalDamage },
  };
}

export function processEnvironmentalExposure({
  previousRemainders = {},
  exposureHoursByHazard = {},
  character = null,
} = {}) {
  const remainders = { ...(previousRemainders || {}) };
  const effects = [];

  for (const [hazardId, addedHoursRaw] of Object.entries(exposureHoursByHazard || {})) {
    const hazard = getHazard(hazardId);
    if (!hazard?.damageType) continue;

    const addedHours = Math.max(0, Number(addedHoursRaw) || 0);
    const previous = Math.max(0, Number(remainders[hazardId] || 0));
    const total = previous + addedHours;
    const ticks = Math.floor(total / ENVIRONMENT_HAZARD_TICK_HOURS);
    remainders[hazardId] = Number((total - ticks * ENVIRONMENT_HAZARD_TICK_HOURS).toFixed(2));

    for (let tick = 0; tick < ticks; tick += 1) {
      const resolution = resolveEnvironmentalHazard(hazardId, character);
      if (resolution) effects.push({
        token: `environment-${hazardId}-${Date.now()}-${tick}-${Math.random().toString(36).slice(2, 8)}`,
        hazardId,
        resolution,
      });
    }
  }

  return { remainders, effects };
}

export function formatEnvironmentalHazardLog(effect, language = "en") {
  const lang = normalizeLanguage(language);
  const resolution = effect?.resolution;
  if (!resolution) return "";
  const label = HAZARD_LABELS[lang]?.[effect.hazardId] || HAZARD_LABELS.en[effect.hazardId] || effect.hazardId;
  const dice = Array.isArray(resolution.dice) ? resolution.dice.join(",") : "-";

  if (lang === "ru") return `${label}: ${resolution.diceCount} CD [${dice}] = ${resolution.rawDamage}; DR ${resolution.resistance}; итог ${resolution.finalDamage} ${resolution.damageType}.`;
  if (lang === "uk") return `${label}: ${resolution.diceCount} CD [${dice}] = ${resolution.rawDamage}; DR ${resolution.resistance}; підсумок ${resolution.finalDamage} ${resolution.damageType}.`;
  if (lang === "pl") return `${label}: ${resolution.diceCount} CD [${dice}] = ${resolution.rawDamage}; DR ${resolution.resistance}; wynik ${resolution.finalDamage} ${resolution.damageType}.`;
  return `${label}: ${resolution.diceCount} CD [${dice}] = ${resolution.rawDamage}; DR ${resolution.resistance}; final ${resolution.finalDamage} ${resolution.damageType}.`;
}
