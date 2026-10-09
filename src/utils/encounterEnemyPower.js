export const ENCOUNTER_ENEMY_POWER_TIERS = ["none", "light", "medium", "strong"];

// Optional GM tuning, applied after the encounter difficulty multipliers.
const PROFILES = {
  none: { damageBonus: 0, resistanceBonus: 0, effects: [] },
  light: { damageBonus: 1, resistanceBonus: 1, effects: ["Piercing 1"] },
  medium: { damageBonus: 2, resistanceBonus: 2, effects: ["Piercing 1", "Vicious"] },
  strong: { damageBonus: 3, resistanceBonus: 3, effects: ["Piercing 2", "Vicious", "Breaking"] },
};

export function normalizeEncounterEnemyPowerTier(value) {
  const tier = String(value || "none").toLowerCase();
  return ENCOUNTER_ENEMY_POWER_TIERS.includes(tier) ? tier : "none";
}

export function encounterEnemyPowerProfile(value) {
  return PROFILES[normalizeEncounterEnemyPowerTier(value)];
}

const COPY = {
  en: { title: "ENEMY STRENGTH", none: "No extra strength", light: "I — Enhanced", medium: "II — Dangerous", strong: "III — Brutal", damage: "Damage dice", resistance: "All resistances", effects: "Attack effects", note: "Optional GM modifier, added after difficulty scaling. Applies when placing new enemies. Remove and place existing enemies again to update them." },
  ru: { title: "УСИЛЕНИЕ ВРАГОВ", none: "Без усиления", light: "I — Усиленные", medium: "II — Опасные", strong: "III — Смертоносные", damage: "Кубы урона", resistance: "Все сопротивления", effects: "Эффекты атак", note: "Дополнительный модификатор ГМ, добавляется после множителей сложности. Применяется при размещении новых врагов. Уже размещённых нужно удалить и разместить заново." },
  uk: { title: "ПОСИЛЕННЯ ВОРОГІВ", none: "Без посилення", light: "I — Посилені", medium: "II — Небезпечні", strong: "III — Смертоносні", damage: "Куби шкоди", resistance: "Усі види спротиву", effects: "Ефекти атак", note: "Додатковий модифікатор ГМ, додається після множників складності. Застосовується під час розміщення нових ворогів. Уже розміщених потрібно видалити й розмістити знову." },
  pl: { title: "WZMOCNIENIE WROGÓW", none: "Bez wzmocnienia", light: "I — Wzmocnieni", medium: "II — Niebezpieczni", strong: "III — Śmiercionośni", damage: "Kości obrażeń", resistance: "Wszystkie odporności", effects: "Efekty ataków", note: "Dodatkowy modyfikator MG, dodawany po mnożnikach trudności. Dotyczy nowo rozmieszczanych wrogów. Istniejących usuń i rozmieść ponownie, aby ich zaktualizować." },
};

export function encounterEnemyPowerCopy(language) {
  return COPY[String(language || "en").toLowerCase().split("-")[0]] || COPY.en;
}

export function encounterEnemyPowerDescription(tier, language, translate = (key, fallback) => fallback) {
  const text = encounterEnemyPowerCopy(language);
  const profile = encounterEnemyPowerProfile(tier);
  if (!profile.damageBonus) return text.none;
  const effects = profile.effects.map(effect => translate(`weaponEffects.${effect.toLowerCase().replace(/\s+/g, "")}.name`, effect));
  return `${text.damage} +${profile.damageBonus} CD · ${text.resistance} +${profile.resistanceBonus} · ${text.effects}: ${effects.join(", ")}`;
}
