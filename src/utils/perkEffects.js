const DEFAULT_GROUP_AP_MAX = 6;
const DEFAULT_CRITICAL_HIT_THRESHOLD = 5;

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function clampRank(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function getPerkRank(form, perkId) {
  const wanted = normalize(perkId);
  let best = 0;

  for (const perk of form?.perksAndTraits || []) {
    if (perk?.isOriginTrait) continue;
    const id = normalize(perk?.id);
    if (!id || id !== wanted) continue;
    best = Math.max(best, Math.max(1, clampRank(perk?.rank || 1)));
  }

  return best;
}

export function hasPerk(form, perkId) {
  return getPerkRank(form, perkId) > 0;
}

function hasPowerArmorEquipped(form) {
  const loadout = form?.armor?._power?.loadout;
  if (!loadout) return false;
  if (loadout.setId) return true;
  return Object.values(loadout.slots || {}).some((slot) => Boolean(slot?.setId));
}

function barbarianPhysicalResistance(strength) {
  if (strength >= 11) return 3;
  if (strength >= 9) return 2;
  if (strength >= 7) return 1;
  return 0;
}

function fortuneFinderDice(rank) {
  if (rank >= 3) return 10;
  if (rank === 2) return 6;
  if (rank === 1) return 3;
  return 0;
}

function makeContextual() {
  return {
    ignoreSecondMajorActionDifficulty: false,
    criticalHitThreshold: DEFAULT_CRITICAL_HIT_THRESHOLD,
    groupApMax: DEFAULT_GROUP_AP_MAX,
    strengthForStrengthTests: null,
    defendDifficultyDelta: 0,
    defenseIncreaseApCost: null,
    sprintDefenseBonus: 0,
    hackingDifficultyDelta: 0,
    barterBuySellDifficultyDelta: 0,
    robotRepairDifficultyDelta: 0,
    pickpocketDifficultyDelta: 0,
    pickpocketRerollD20: 0,
    pickpocketIgnoredComplications: 0,
    lockpickRerollD20: 0,
    medicRerollD20: 0,
    opposedBarterSpeechRerollD20: 0,
    threateningSpeechRerollD20: 0,
    lieSpeechIgnoredComplications: 0,
    cautiousNatureRerollD20: 0,
    daringNatureRerollD20: 0,
    selfInjuryFirstBoughtD20Free: false,
    darkSneakFirstBoughtD20Free: false,
    darknessDifficultyReduction: 0,
    lightStepTrapRerollD20: 0,
    lightStepIgnoreComplicationPerAp: 0,
    underwaterDetectionDifficultyBonus: 0,
    waterRadiationImmune: false,
    breathDurationMultiplier: 1,
    successfulTravelTimeMultiplier: 1,
    sunlightRadiationHealingPerHour: 0,
    fortuneFinderBonusD6: 0,
  };
}

export function getPerkCalculationState(form, context = {}) {
  const special = context.effectiveSpecial || form?.special || {};
  const strength = Number(special.S || 0);
  const endurance = Number(special.E || 0);
  const currentHp = Math.max(0, Number(context.currentHp ?? form?.currentHp ?? 0));
  const baseMaxHp = Math.max(1, Number(context.baseMaxHp ?? context.maxHp ?? 1));

  const lifeGiverRank = getPerkRank(form, "life_giver");
  const lifeGiverBonus = Math.max(0, endurance) * lifeGiverRank;
  const maxHpWithPermanentPerks = Math.max(1, baseMaxHp + lifeGiverBonus);
  const lowHealth = currentHp < maxHpWithPermanentPerks / 4;
  const damaged = currentHp < maxHpWithPermanentPerks;
  const powerArmorEquipped = hasPowerArmorEquipped(form);
  const isRobot = form?.origin === "mister_handy";

  const toughnessRank = getPerkRank(form, "toughness");
  const refractorRank = getPerkRank(form, "refractor");
  const radResistanceRank = getPerkRank(form, "rad_resistance");
  const nerdRageRank = lowHealth ? getPerkRank(form, "nerd_rage") : 0;
  const barbarianRank = getPerkRank(form, "barbarian");
  const barbarianBonus = barbarianRank > 0 && !powerArmorEquipped && !isRobot
    ? barbarianPhysicalResistance(strength)
    : 0;

  const derived = {
    maxHpBonus: lifeGiverBonus,
    carryWeightBonus: getPerkRank(form, "strong_back") * 25,
    physicalResistBonus: toughnessRank + barbarianBonus + nerdRageRank,
    energyResistBonus: refractorRank + nerdRageRank,
    radiationResistBonus: radResistanceRank,
    poisonResistBonus: getPerkRank(form, "snakeater") > 0 ? 2 : 0,
  };

  const healing = {
    nonRestHpBonus: isRobot ? 0 : getPerkRank(form, "fast_metabolism"),
    firstAidHpBonus: getPerkRank(form, "healer"),
  };

  const contextual = makeContextual();

  if (getPerkRank(form, "action_boy_girl") > 0) {
    contextual.ignoreSecondMajorActionDifficulty = true;
  }

  contextual.criticalHitThreshold = DEFAULT_CRITICAL_HIT_THRESHOLD + getPerkRank(form, "adamantium_skeleton");
  contextual.groupApMax = DEFAULT_GROUP_AP_MAX + Math.min(1, getPerkRank(form, "inspirational"));

  if (damaged && getPerkRank(form, "adrenalin_rush") > 0) {
    contextual.strengthForStrengthTests = Math.max(10, strength);
  }

  const dodgerRank = getPerkRank(form, "dodger");
  if (dodgerRank >= 1) contextual.defendDifficultyDelta = -1;
  if (dodgerRank >= 2) contextual.defenseIncreaseApCost = 1;

  if (getPerkRank(form, "moving_target") > 0) {
    contextual.sprintDefenseBonus = 1;
  }

  if (getPerkRank(form, "hacker") > 0) {
    contextual.hackingDifficultyDelta = -1;
  }

  if (getPerkRank(form, "junktown_jerky_vendor") > 0) {
    contextual.barterBuySellDifficultyDelta = -1;
  }

  if (getPerkRank(form, "robotics_expert") >= 2) {
    contextual.robotRepairDifficultyDelta = -1;
  }

  const pickpocketRank = getPerkRank(form, "pickpocket");
  if (pickpocketRank >= 1) contextual.pickpocketIgnoredComplications = 1;
  if (pickpocketRank >= 2) contextual.pickpocketRerollD20 = 1;
  if (pickpocketRank >= 3) contextual.pickpocketDifficultyDelta = -1;

  if (getPerkRank(form, "infiltrator") > 0) contextual.lockpickRerollD20 = 1;
  if (getPerkRank(form, "medic") > 0) contextual.medicRerollD20 = 1;
  if (getPerkRank(form, "smooth_talker") > 0) contextual.opposedBarterSpeechRerollD20 = 1;
  if (getPerkRank(form, "terrifying_presence") > 0) contextual.threateningSpeechRerollD20 = 1;
  if (getPerkRank(form, "scoundrel") > 0) contextual.lieSpeechIgnoredComplications = 1;
  if (getPerkRank(form, "cautious_nature") > 0) contextual.cautiousNatureRerollD20 = 1;
  if (getPerkRank(form, "daring_nature") > 0) contextual.daringNatureRerollD20 = 1;
  if (!isRobot && getPerkRank(form, "faster_healing") > 0) contextual.selfInjuryFirstBoughtD20Free = true;
  if (getPerkRank(form, "ghost") > 0) contextual.darkSneakFirstBoughtD20Free = true;
  if (getPerkRank(form, "night_person") > 0) contextual.darknessDifficultyReduction = 1;

  if (getPerkRank(form, "light_step") > 0) {
    contextual.lightStepTrapRerollD20 = 1;
    contextual.lightStepIgnoreComplicationPerAp = 1;
  }

  const aquaboyRank = getPerkRank(form, "aquaboy_aquagirl");
  if (aquaboyRank >= 1) {
    contextual.waterRadiationImmune = true;
    contextual.breathDurationMultiplier = 2;
  }
  if (aquaboyRank >= 2) {
    contextual.underwaterDetectionDifficultyBonus = 2;
  }

  if (getPerkRank(form, "pathfinder") > 0) {
    contextual.successfulTravelTimeMultiplier = 0.5;
  }

  if (getPerkRank(form, "solar_powered") > 0) {
    contextual.sunlightRadiationHealingPerHour = 1;
  }

  contextual.fortuneFinderBonusD6 = fortuneFinderDice(getPerkRank(form, "fortune_finder"));

  const notes = [];
  if (lifeGiverBonus) notes.push(`Life Giver: +${lifeGiverBonus} Max HP.`);
  if (derived.carryWeightBonus) notes.push(`Strong Back: +${derived.carryWeightBonus} carry weight.`);
  if (toughnessRank) notes.push(`Toughness: +${toughnessRank} physical resistance.`);
  if (refractorRank) notes.push(`Refractor: +${refractorRank} energy resistance.`);
  if (radResistanceRank) notes.push(`Rad Resistance: +${radResistanceRank} radiation resistance.`);
  if (derived.poisonResistBonus) notes.push(`Snakeater: +${derived.poisonResistBonus} poison resistance.`);
  if (barbarianBonus) notes.push(`Barbarian: +${barbarianBonus} physical resistance.`);
  if (nerdRageRank) notes.push(`Nerd Rage: +${nerdRageRank} physical and energy resistance while below 1/4 Max HP.`);

  return {
    derived,
    healing,
    contextual,
    notes,
    state: {
      lowHealth,
      damaged,
      powerArmorEquipped,
      maxHpWithPermanentPerks,
    },
  };
}

const SKILL_CONTEXT_DEFS = {
  Athletics: ["general", "avoid_trap"],
  Barter: ["general", "buy_sell", "opposed"],
  Lockpick: ["lockpick"],
  Medicine: ["general", "first_aid", "treat_injury", "self_treat_injury"],
  Repair: ["general", "robot_repair"],
  Science: ["general", "hacking"],
  Sneak: ["general", "pickpocket", "darkness"],
  Speech: ["general", "opposed", "lie", "threaten"],
  Survival: ["general", "wilderness_travel"],
};

const SKILL_CONTEXT_LABELS = {
  en: {
    general: "General test",
    avoid_trap: "Avoid a trap",
    buy_sell: "Buy / sell goods",
    opposed: "Opposed test",
    lockpick: "Pick a lock",
    first_aid: "First Aid",
    treat_injury: "Treat an injury",
    self_treat_injury: "Treat own injury",
    robot_repair: "Repair a robot",
    hacking: "Hack a computer",
    pickpocket: "Pickpocket",
    darkness: "Darkness / shadows",
    lie: "Lie / deceive",
    threaten: "Threaten / intimidate",
    wilderness_travel: "Wilderness travel",
  },
  ru: {
    general: "Обычная проверка",
    avoid_trap: "Избежать ловушки",
    buy_sell: "Покупка / продажа",
    opposed: "Встречная проверка",
    lockpick: "Взлом замка",
    first_aid: "Первая помощь",
    treat_injury: "Лечение травмы",
    self_treat_injury: "Лечение своей травмы",
    robot_repair: "Ремонт робота",
    hacking: "Взлом компьютера",
    pickpocket: "Карманная кража",
    darkness: "Темнота / тени",
    lie: "Ложь / обман",
    threaten: "Угроза / запугивание",
    wilderness_travel: "Путешествие по пустоши",
  },
  uk: {
    general: "Звичайна перевірка",
    avoid_trap: "Уникнути пастки",
    buy_sell: "Купівля / продаж",
    opposed: "Зустрічна перевірка",
    lockpick: "Злам замка",
    first_aid: "Перша допомога",
    treat_injury: "Лікування травми",
    self_treat_injury: "Лікування власної травми",
    robot_repair: "Ремонт робота",
    hacking: "Злам комп'ютера",
    pickpocket: "Кишенькова крадіжка",
    darkness: "Темрява / тіні",
    lie: "Брехня / обман",
    threaten: "Погроза / залякування",
    wilderness_travel: "Подорож пусткою",
  },
  pl: {
    general: "Zwykły test",
    avoid_trap: "Unikanie pułapki",
    buy_sell: "Kupno / sprzedaż",
    opposed: "Test przeciwstawny",
    lockpick: "Otwieranie zamka",
    first_aid: "Pierwsza pomoc",
    treat_injury: "Leczenie urazu",
    self_treat_injury: "Leczenie własnego urazu",
    robot_repair: "Naprawa robota",
    hacking: "Hakowanie komputera",
    pickpocket: "Kradzież kieszonkowa",
    darkness: "Ciemność / cienie",
    lie: "Kłamstwo / oszustwo",
    threaten: "Groźba / zastraszanie",
    wilderness_travel: "Podróż przez pustkowia",
  },
};

export function getSkillPerkContextOptions(skillName, language = "en") {
  const ids = SKILL_CONTEXT_DEFS[skillName] || ["general"];
  const labels = SKILL_CONTEXT_LABELS[language] || SKILL_CONTEXT_LABELS.en;
  return ids.map((id) => ({ id, label: labels[id] || SKILL_CONTEXT_LABELS.en[id] || id }));
}

export function getSkillPerkRollModifiers(form, {
  skillName = "",
  contextId = "general",
  baseDifficulty = 1,
} = {}) {
  const perkState = getPerkCalculationState(form, {
    effectiveSpecial: form?.special || {},
    currentHp: form?.currentHp,
    baseMaxHp: Math.max(1, Number(form?.maxHpOverride || 1)),
  });
  const c = perkState.contextual;
  let difficultyDelta = 0;
  let rerollD20 = 0;
  let ignoredComplications = 0;
  let firstBoughtD20Free = false;
  let healingBonus = 0;
  let travelTimeMultiplier = 1;
  const notes = [];

  if (skillName === "Lockpick") {
    rerollD20 = Math.max(rerollD20, c.lockpickRerollD20);
    if (c.lockpickRerollD20) notes.push("Infiltrator: 1d20 reroll available.");
  }

  if (contextId === "hacking") {
    difficultyDelta += c.hackingDifficultyDelta;
    if (c.hackingDifficultyDelta) notes.push("Hacker: difficulty -1.");
  }

  if (contextId === "buy_sell") {
    difficultyDelta += c.barterBuySellDifficultyDelta;
    if (c.barterBuySellDifficultyDelta) notes.push("Junktown Jerky Vendor: difficulty -1.");
  }

  if (contextId === "opposed" && (skillName === "Barter" || skillName === "Speech")) {
    rerollD20 = Math.max(rerollD20, c.opposedBarterSpeechRerollD20);
    if (c.opposedBarterSpeechRerollD20) notes.push("Smooth Talker: 1d20 reroll available.");
  }

  if (contextId === "first_aid") {
    healingBonus += perkState.healing.firstAidHpBonus;
    if (healingBonus) notes.push(`Healer: +${healingBonus} HP when First Aid heals HP.`);
  }

  if (contextId === "treat_injury" || contextId === "self_treat_injury") {
    rerollD20 = Math.max(rerollD20, c.medicRerollD20);
    if (c.medicRerollD20) notes.push("Medic: 1d20 reroll available.");
  }

  if (contextId === "self_treat_injury" && c.selfInjuryFirstBoughtD20Free) {
    firstBoughtD20Free = true;
    notes.push("Faster Healing: first additional d20 is free.");
  }

  if (contextId === "robot_repair") {
    difficultyDelta += c.robotRepairDifficultyDelta;
    if (c.robotRepairDifficultyDelta) notes.push("Robotics Expert: difficulty -1.");
  }

  if (contextId === "pickpocket") {
    difficultyDelta += c.pickpocketDifficultyDelta;
    rerollD20 = Math.max(rerollD20, c.pickpocketRerollD20);
    ignoredComplications += c.pickpocketIgnoredComplications;
    if (c.pickpocketIgnoredComplications) notes.push("Pickpocket: ignore the first complication.");
    if (c.pickpocketRerollD20) notes.push("Pickpocket: 1d20 reroll available.");
    if (c.pickpocketDifficultyDelta) notes.push("Pickpocket: difficulty -1.");
  }

  if (contextId === "darkness" && skillName === "Sneak") {
    if (c.darkSneakFirstBoughtD20Free) {
      firstBoughtD20Free = true;
      notes.push("Ghost: first additional d20 is free in darkness or shadows.");
    }
    if (c.darknessDifficultyReduction) {
      notes.push("Night Person: ignore up to +1 difficulty caused by darkness.");
    }
  }

  if (contextId === "lie" && skillName === "Speech") {
    ignoredComplications += c.lieSpeechIgnoredComplications;
    if (c.lieSpeechIgnoredComplications) notes.push("Scoundrel: ignore the first complication.");
  }

  if (contextId === "threaten" && skillName === "Speech") {
    rerollD20 = Math.max(rerollD20, c.threateningSpeechRerollD20);
    if (c.threateningSpeechRerollD20) notes.push("Terrifying Presence: 1d20 reroll available.");
  }

  if (contextId === "avoid_trap" && skillName === "Athletics") {
    rerollD20 = Math.max(rerollD20, c.lightStepTrapRerollD20);
    if (c.lightStepTrapRerollD20) notes.push("Light Step: 1d20 reroll available.");
    if (c.lightStepIgnoreComplicationPerAp) notes.push("Light Step: complications may be ignored by spending AP.");
  }

  if (contextId === "wilderness_travel" && skillName === "Survival") {
    travelTimeMultiplier = c.successfulTravelTimeMultiplier;
    if (travelTimeMultiplier < 1) notes.push("Pathfinder: successful travel time is halved.");
  }

  if (c.cautiousNatureRerollD20) {
    notes.push("Cautious Nature: a reroll may apply when extra dice were bought with AP.");
  }
  if (c.daringNatureRerollD20) {
    notes.push("Daring Nature: a reroll may apply when extra dice were bought by giving the GM AP.");
  }

  const difficulty = Math.max(0, Number(baseDifficulty || 0) + difficultyDelta);

  return {
    contextId,
    baseDifficulty: Math.max(0, Number(baseDifficulty || 0)),
    difficultyDelta,
    difficulty,
    rerollD20,
    ignoredComplications,
    firstBoughtD20Free,
    healingBonus,
    travelTimeMultiplier,
    notes,
  };
}
