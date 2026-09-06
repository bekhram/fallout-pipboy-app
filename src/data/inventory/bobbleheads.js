export const BOBBLEHEAD_SPECIALS = [
  ["S", "Strength"],
  ["P", "Perception"],
  ["E", "Endurance"],
  ["C", "Charisma"],
  ["I", "Intelligence"],
  ["A", "Agility"],
  ["L", "Luck"],
];

export const BOBBLEHEAD_SKILLS = [
  "Athletics",
  "Barter",
  "Big Guns",
  "Energy Weapons",
  "Explosives",
  "Lockpick",
  "Medicine",
  "Melee Weapons",
  "Pilot",
  "Repair",
  "Science",
  "Small Guns",
  "Sneak",
  "Speech",
  "Survival",
  "Throwing",
  "Unarmed",
];

const SPECIAL_TRANSLATIONS = {
  en: { S: "Strength", P: "Perception", E: "Endurance", C: "Charisma", I: "Intelligence", A: "Agility", L: "Luck" },
  ru: { S: "Сила", P: "Восприятие", E: "Выносливость", C: "Харизма", I: "Интеллект", A: "Ловкость", L: "Удача" },
  uk: { S: "Сила", P: "Сприйняття", E: "Витривалість", C: "Харизма", I: "Інтелект", A: "Спритність", L: "Удача" },
  pl: { S: "Siła", P: "Percepcja", E: "Wytrzymałość", C: "Charyzma", I: "Inteligencja", A: "Zręczność", L: "Szczęście" },
};

const SKILL_TRANSLATIONS = {
  ru: {
    Athletics: "Атлетика", Barter: "Бартер", "Big Guns": "Тяжёлое оружие", "Energy Weapons": "Энергетическое оружие",
    Explosives: "Взрывчатка", Lockpick: "Взлом", Medicine: "Медицина", "Melee Weapons": "Холодное оружие", Pilot: "Пилотирование",
    Repair: "Ремонт", Science: "Наука", "Small Guns": "Стрелковое оружие", Sneak: "Скрытность", Speech: "Красноречие",
    Survival: "Выживание", Throwing: "Метание", Unarmed: "Без оружия",
  },
  uk: {
    Athletics: "Атлетика", Barter: "Бартер", "Big Guns": "Важка зброя", "Energy Weapons": "Енергетична зброя",
    Explosives: "Вибухівка", Lockpick: "Злам", Medicine: "Медицина", "Melee Weapons": "Холодна зброя", Pilot: "Пілотування",
    Repair: "Ремонт", Science: "Наука", "Small Guns": "Стрілецька зброя", Sneak: "Скритність", Speech: "Красномовство",
    Survival: "Виживання", Throwing: "Метання", Unarmed: "Без зброї",
  },
  pl: {
    Athletics: "Atletyka", Barter: "Handel", "Big Guns": "Broń ciężka", "Energy Weapons": "Broń energetyczna",
    Explosives: "Materiały wybuchowe", Lockpick: "Otwieranie zamków", Medicine: "Medycyna", "Melee Weapons": "Broń biała", Pilot: "Pilotaż",
    Repair: "Naprawa", Science: "Nauka", "Small Guns": "Broń strzelecka", Sneak: "Skradanie", Speech: "Retoryka",
    Survival: "Przetrwanie", Throwing: "Rzucanie", Unarmed: "Walka wręcz",
  },
};

const HEAD_LABEL = {
  en: "Bobblehead",
  ru: "Пупс",
  uk: "Пупс",
  pl: "Figurka Vault-Tec",
};

const EFFECT_LABEL = {
  en: { special: "+1 to {{name}} S.P.E.C.I.A.L.", skill: "+1 to {{name}} skill." },
  ru: { special: "+1 к S.P.E.C.I.A.L. «{{name}}».", skill: "+1 к навыку «{{name}}»." },
  uk: { special: "+1 до S.P.E.C.I.A.L. «{{name}}».", skill: "+1 до навички «{{name}}»." },
  pl: { special: "+1 do S.P.E.C.I.A.L. „{{name}}”.", skill: "+1 do umiejętności „{{name}}”." },
};

function fill(template, name) {
  return String(template || "").replace("{{name}}", name);
}

function normalizePerkId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getIntenseTrainingBonuses(form = {}) {
  const bonuses = {};

  for (const perk of form.perksAndTraits || []) {
    if (perk?.isOriginTrait || normalizePerkId(perk?.id) !== "intense_training") continue;
    const rank = Math.max(1, Number(perk?.rank || 1));
    const choices = Array.isArray(perk?.specialChoices)
      ? perk.specialChoices
      : [perk?.selectedSpecial].filter(Boolean);

    for (let index = 0; index < rank; index += 1) {
      const key = String(choices[index] || "").trim().toUpperCase();
      if (!BOBBLEHEAD_SPECIALS.some(([candidate]) => candidate === key)) continue;
      bonuses[key] = Number(bonuses[key] || 0) + 1;
    }
  }

  return bonuses;
}

export function isSkillTaggedByPerk(form = {}, skillName) {
  const wanted = String(skillName || "").trim();
  if (!wanted) return false;

  return (form.perksAndTraits || []).some((perk) => {
    if (perk?.isOriginTrait || normalizePerkId(perk?.id) !== "tag") return false;
    const selected = String(perk?.tagSkill || perk?.selectedSkill || "").trim();
    return selected === wanted;
  });
}

export const BOBBLEHEAD_ITEMS = [
  ...BOBBLEHEAD_SPECIALS.map(([key, name]) => ({
    name: `Bobblehead: ${name}`,
    category: "misc",
    quantity: "1",
    weight: "0",
    cost: "",
    rarity: "",
    sourceType: "bobblehead",
    bobbleheadBonusType: "special",
    bobbleheadKey: key,
    effect: `+1 to ${name} S.P.E.C.I.A.L.`,
  })),
  ...BOBBLEHEAD_SKILLS.map((skillName) => ({
    name: `Bobblehead: ${skillName}`,
    category: "misc",
    quantity: "1",
    weight: "0",
    cost: "",
    rarity: "",
    sourceType: "bobblehead",
    bobbleheadBonusType: "skill",
    bobbleheadKey: skillName,
    effect: `+1 to ${skillName} skill.`,
  })),
];

export function getLocalizedBobbleheadItem(item, language = "en") {
  if (item?.sourceType !== "bobblehead") return null;
  const lang = ["en", "ru", "uk", "pl"].includes(String(language || "en").split("-")[0])
    ? String(language || "en").split("-")[0]
    : "en";
  const isSpecial = item.bobbleheadBonusType === "special";
  const key = item.bobbleheadKey;
  const translatedName = isSpecial
    ? (SPECIAL_TRANSLATIONS[lang]?.[key] || SPECIAL_TRANSLATIONS.en[key] || key)
    : (SKILL_TRANSLATIONS[lang]?.[key] || key);
  return {
    displayName: `${HEAD_LABEL[lang]}: ${translatedName}`,
    displayEffect: fill(EFFECT_LABEL[lang]?.[isSpecial ? "special" : "skill"] || EFFECT_LABEL.en[isSpecial ? "special" : "skill"], translatedName),
  };
}

export function getBobbleheadBonuses(form = {}) {
  const special = {};
  const skills = {};
  const seen = new Set();

  for (const item of form.inventoryItems || []) {
    if (item?.sourceType !== "bobblehead" || Number(item?.quantity || 0) <= 0) continue;
    const type = item?.bobbleheadBonusType;
    const key = String(item?.bobbleheadKey || "").trim();
    if (!key) continue;
    const token = `${type}:${key}`;
    if (seen.has(token)) continue;
    seen.add(token);
    if (type === "special") special[key] = 1;
    if (type === "skill") skills[key] = 1;
  }

  return { special, skills, count: seen.size };
}

export function getBobbleheadSpecialBonus(form, key) {
  return Number(getBobbleheadBonuses(form).special?.[key] || 0);
}

export function getBobbleheadSkillBonus(form, skillName) {
  return Number(getBobbleheadBonuses(form).skills?.[skillName] || 0);
}

export function hasActivePowerArmorFrame(form = {}) {
  const loadout = form?.armor?._power?.loadout;
  if (!loadout || typeof loadout !== "object") return false;

  const setId = String(loadout.setId || "").trim();
  if (setId && setId !== "none") return true;

  return Object.values(loadout.slots || {}).some((slot) => {
    const slotSetId = String(slot?.setId || "").trim();
    return Boolean(slotSetId && slotSetId !== "none");
  });
}

export function getEffectiveSpecialValue(form, key) {
  const base = Number(form?.special?.[key] || 0);
  const trained = Number(getIntenseTrainingBonuses(form)[key] || 0);
  const trainedBase = base >= 10 ? base : Math.min(10, base + trained);
  const value = trainedBase + getBobbleheadSpecialBonus(form, key);
  if (key === "S" && hasActivePowerArmorFrame(form)) {
    return Math.max(11, value);
  }
  return value;
}

export function getEffectiveSkillRank(form, skillName) {
  return Number(form?.skills?.[skillName]?.rank || 0) + getBobbleheadSkillBonus(form, skillName);
}
