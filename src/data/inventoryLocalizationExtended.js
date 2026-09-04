import { WEAPON_NAMES, WEAPON_TERMS } from "./inventoryLocalization/weapons.js";
import { TOOL_TRANSLATIONS } from "./inventoryLocalization/tools.js";
import MAGAZINES_1 from "./inventoryLocalization/magazines-1.js";
import MAGAZINES_2 from "./inventoryLocalization/magazines-2.js";
import MAGAZINES_3 from "./inventoryLocalization/magazines-3.js";
import {
  ARMOR_EXACT_NAMES,
  ARMOR_NAME_TERMS,
  ARMOR_EFFECTS,
} from "./inventoryLocalization/armor.js";

const MAGAZINE_TRANSLATIONS = {
  ...MAGAZINES_1,
  ...MAGAZINES_2,
  ...MAGAZINES_3,
};

const LANGUAGE_INDEX = { ru: 0, uk: 1, pl: 2 };
const SIX_INDEX = {
  ru: { name: 0, effect: 1 },
  uk: { name: 2, effect: 3 },
  pl: { name: 4, effect: 5 },
};

const MAGAZINE_SERIES = {
  "¡La Fantoma!": ["¡La Fantoma!", "¡La Fantoma!", "¡La Fantoma!"],
  "Astoundingly Awesome Tales": ["Потрясающе удивительные истории", "Приголомшливо дивовижні історії", "Niesamowicie niesamowite opowieści"],
  "Backwoodsman": ["Лесник", "Лісовик", "Puszczański poradnik"],
  "Boxing Times": ["Боксёрские времена", "Боксерські часи", "Boxing Times"],
  "Duck and Cover!": ["Пригнись и укройся!", "Пригнись і сховайся!", "Padnij i kryj się!"],
  "Fixin' Things": ["Ремонтируем всё", "Лагодимо все", "Naprawiamy wszystko"],
  "Future Weapons Today": ["Оружие будущего сегодня", "Зброя майбутнього сьогодні", "Broń przyszłości dziś"],
  "Grognak The Barbarian": ["Грогнак-Варвар", "Грогнак-Варвар", "Grognak Barbarzyńca"],
  "Guns and Bullets": ["Оружие и пули", "Зброя та кулі", "Broń i pociski"],
  "Live & Love": ["Живи и люби", "Живи та кохай", "Żyj i kochaj"],
  "Massachusetts Surgical Journal": ["Массачусетский хирургический журнал", "Массачусетський хірургічний журнал", "Massachusetts Surgical Journal"],
  "Meeting People": ["Знакомства", "Знайомства", "Poznawanie ludzi"],
  "Programmer's Digest": ["Дайджест программиста", "Дайджест програміста", "Przegląd programisty"],
  "Tales of a Junktown Jerky Vendor": ["Истории торговца вяленым мясом из Джанктауна", "Історії торговця в’яленим м’ясом з Джанктауна", "Opowieści sprzedawcy suszonego mięsa z Junktown"],
  "Tesla Science Magazine": ["Научный журнал Tesla", "Науковий журнал Tesla", "Magazyn naukowy Tesla"],
  "True Police Stories": ["Правдивые полицейские истории", "Правдиві поліцейські історії", "Prawdziwe historie policyjne"],
  "Tumblers Today": ["Замки сегодня", "Замки сьогодні", "Zamki dzisiaj"],
  "Unstoppables": ["Неостановимые", "Нестримні", "Niezatrzymani"],
  "U.S. Covert Operations Manual": ["Руководство по тайным операциям США", "Посібник з таємних операцій США", "Podręcznik tajnych operacji USA"],
  "Wasteland Survival Guide": ["Руководство по выживанию в Пустоши", "Посібник з виживання в Пустці", "Poradnik przetrwania na Pustkowiach"],
};

const ARMOR_GROUPS = {
  CLOTHING: ["Одежда", "Одяг", "Ubrania"],
  OUTFIT: ["Костюмы", "Костюми", "Stroje"],
  HEADGEAR: ["Головные уборы", "Головні убори", "Nakrycia głowy"],
  "RAIDER ARMOUR": ["Рейдерская броня", "Рейдерська броня", "Pancerz najeźdźców"],
  "LEATHER ARMOUR": ["Кожаная броня", "Шкіряна броня", "Pancerz skórzany"],
  "METAL ARMOUR": ["Металлическая броня", "Металева броня", "Pancerz metalowy"],
  "COMBAT ARMOUR": ["Боевая броня", "Бойова броня", "Pancerz bojowy"],
  "SYNTH ARMOUR": ["Броня синтов", "Броня синтів", "Pancerz syntów"],
  "VAULT-TEC SECURITY ARMOUR": ["Броня охраны Vault-Tec", "Броня охорони Vault-Tec", "Pancerz ochrony Vault-Tec"],
  "ROBOT ARMOUR": ["Броня роботов", "Броня роботів", "Pancerz robotów"],
  "MATERIAL MODS": ["Модификации материала", "Модифікації матеріалу", "Modyfikacje materiału"],
  "ARMOUR UPGRADE MODS": ["Улучшения брони", "Поліпшення броні", "Ulepszenia pancerza"],
  "CLOTHING AND OUTFIT MODS": ["Модификации одежды", "Модифікації одягу", "Modyfikacje ubrań"],
  "ROBOT MODS": ["Модификации роботов", "Модифікації роботів", "Modyfikacje robotów"],
};

const LOCATIONS = {
  Head: ["Голова", "Голова", "Głowa"],
  Arms: ["Руки", "Руки", "Ramiona"],
  Legs: ["Ноги", "Ноги", "Nogi"],
  Torso: ["Торс", "Торс", "Tułów"],
};

function normalizeLanguage(language) {
  const lang = String(language || "en").toLowerCase().split("-")[0];
  return ["ru", "uk", "pl"].includes(lang) ? lang : "en";
}

function pick3(value, lang) {
  if (!value || lang === "en") return null;
  return value[LANGUAGE_INDEX[lang]] || null;
}

function pick6(value, lang) {
  if (!value || lang === "en") return null;
  const index = SIX_INDEX[lang];
  return {
    name: value[index.name] || null,
    effect: value[index.effect] || null,
  };
}

function translateWeaponTokens(text, lang) {
  if (!text || lang === "en") return text || "";
  let result = String(text);

  Object.entries(WEAPON_TERMS)
    .sort(([a], [b]) => b.length - a.length)
    .forEach(([english, values]) => {
      const localized = pick3(values, lang);
      if (!localized) return;
      const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "gi"), localized);
    });

  result = result.replace(/Пробивание\s+(\d+)/gi, "Пробивание $1");
  result = result.replace(/Пробивання\s+(\d+)/gi, "Пробивання $1");
  result = result.replace(/Przebicie\s+(\d+)/gi, "Przebicie $1");
  result = result.replace(/Qualities:\s*/gi, lang === "ru" ? "Качества: " : lang === "uk" ? "Якості: " : "Cechy: ");
  return result;
}

function translateArmorName(name, lang) {
  if (!name || lang === "en") return name || "";
  const exact = pick3(ARMOR_EXACT_NAMES[name], lang);
  if (exact) return exact;

  let result = String(name);
  Object.entries(ARMOR_NAME_TERMS)
    .sort(([a], [b]) => b.length - a.length)
    .forEach(([english, values]) => {
      const localized = pick3(values, lang);
      if (!localized) return;
      const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), localized);
    });
  return result;
}

function translateArmorLocations(text, lang) {
  if (!text || lang === "en") return text || "";
  return String(text)
    .split(",")
    .map((part) => {
      const key = part.trim();
      return pick3(LOCATIONS[key], lang) || key;
    })
    .join(", ");
}

export function getExtendedInventoryLocalization(item, language = "en") {
  const lang = normalizeLanguage(language);
  const originalName = String(item?.originalName || item?.name || "");
  const originalEffect = String(item?.originalEffect || item?.effect || "");

  const base = {
    displayName: originalName,
    displayEffect: originalEffect,
    displaySeries: item?.series || "",
    displayWeaponType: item?.weaponType || "",
    displayDamageType: item?.damageType || "",
    displayQualities: item?.qualities || "",
    displayArmorGroup: item?.armorGroup || "",
    displayArmorLocations: item?.armorLocations || "",
  };

  if (lang === "en") return base;

  if (item?.category === "weapons") {
    return {
      ...base,
      displayName: pick3(WEAPON_NAMES[originalName], lang) || originalName,
      displayEffect: translateWeaponTokens(originalEffect, lang),
      displayWeaponType: translateWeaponTokens(item?.weaponType, lang),
      displayDamageType: translateWeaponTokens(item?.damageType, lang),
      displayQualities: translateWeaponTokens(item?.qualities, lang),
    };
  }

  if (item?.category === "armor") {
    return {
      ...base,
      displayName: translateArmorName(originalName, lang),
      displayEffect: pick3(ARMOR_EFFECTS[originalName], lang) || originalEffect,
      displayArmorGroup: pick3(ARMOR_GROUPS[item?.armorGroup], lang) || item?.armorGroup || "",
      displayArmorLocations: translateArmorLocations(item?.armorLocations, lang),
    };
  }

  if (item?.category === "tools") {
    const translated = pick6(TOOL_TRANSLATIONS[originalName], lang);
    return translated
      ? { ...base, displayName: translated.name, displayEffect: translated.effect }
      : base;
  }

  if (item?.category === "magazines") {
    const translated = pick6(MAGAZINE_TRANSLATIONS[originalName], lang);
    return {
      ...base,
      displayName: translated?.name || originalName,
      displayEffect: translated?.effect || originalEffect,
      displaySeries: pick3(MAGAZINE_SERIES[item?.series], lang) || item?.series || "",
    };
  }

  return base;
}
