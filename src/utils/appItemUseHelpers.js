import { ARMOR_PARTS } from "../constants.js";
import { calculatePowerArmorLocations } from "../data/powerArmor.js";

export const ITEM_USE_COPY = {
  en: { noRepairTarget: "No damaged robot or power armor part found.", chooseRepairTarget: "Choose a repair target", invalid: "Invalid selection.", robot: "ROBOT", powerArmor: "POWER ARMOR" },
  ru: { noRepairTarget: "Нет поврежденного робота или части силовой брони.", chooseRepairTarget: "Выберите цель ремонта", invalid: "Неверный выбор.", robot: "РОБОТ", powerArmor: "СИЛОВАЯ БРОНЯ" },
  uk: { noRepairTarget: "Немає пошкодженого робота або частини силової броні.", chooseRepairTarget: "Оберіть ціль ремонту", invalid: "Невірний вибір.", robot: "РОБОТ", powerArmor: "СИЛОВА БРОНЯ" },
  pl: { noRepairTarget: "Brak uszkodzonego robota lub części pancerza wspomaganego.", chooseRepairTarget: "Wybierz cel naprawy", invalid: "Nieprawidłowy wybór.", robot: "ROBOT", powerArmor: "PANCERZ WSPOMAGANY" },
};

export const STIMPAK_HEALING = {
  "stimpak (diluted)": 2,
  "stimpak": 4,
  "super stimpak": 8,
};

export function normalizeUtilityName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function consumeInventoryItemAt(inventory = [], index) {
  return inventory
    .map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? 0));
      return { ...item, quantity: String(Math.max(0, quantity - 1)) };
    })
    .filter((item) => Number(item?.quantity ?? item?.qty ?? 0) > 0);
}

export function getStimpakInfo(item, index = -1) {
  if (!item) return null;
  const canonicalName = normalizeUtilityName(item.canonicalName || item.sourceName || item.name);
  const healingHp = STIMPAK_HEALING[canonicalName];
  const quantity = Math.max(0, Number(item.quantity ?? item.qty ?? 0));
  if (!healingHp || quantity <= 0) return null;
  return {
    index,
    name: String(item.displayName || item.name || item.canonicalName || canonicalName),
    canonicalName,
    healingHp,
    quantity,
  };
}

export function stripPowerArmorCurrentOverrides(loadout) {
  return {
    ...(loadout || {}),
    slots: Object.fromEntries(
      Object.entries(loadout?.slots || {}).map(([part, slot]) => {
        const clean = { ...(slot || {}) };
        delete clean.currentHp;
        delete clean.currentPhysical;
        delete clean.currentEnergy;
        delete clean.currentRadiation;
        delete clean.currentPoison;
        return [part, clean];
      })
    ),
  };
}

export function getDamagedPowerArmorParts(character) {
  const loadout = character?.armor?._power?.loadout;
  if (!loadout) return [];
  const current = calculatePowerArmorLocations(loadout);
  const maximum = calculatePowerArmorLocations(stripPowerArmorCurrentOverrides(loadout));
  if (!current || !maximum) return [];
  return ARMOR_PARTS.filter((part) => {
    const now = current?.[part];
    const max = maximum?.[part];
    if (!now || !max || Number(max.hp || 0) <= 0) return false;
    return Number(now.hp || 0) < Number(max.hp || 0);
  }).map((part) => ({ part, current: current[part], maximum: maximum[part] }));
}

export function isRobotCompanion(item) {
  const text = [item?.creatureType, item?.name, item?.specialAbilities]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(robot|robotic|machine|automatron|mister handy|mr\.? handy|protectron|assaultron|eyebot|sentry bot|robobrain)/i.test(text);
}
