import { buildDefaultForm, SPECIAL_KEYS, SKILL_KEYS, SKILL_LABEL_KEYS, ARMOR_PART_LABEL_KEYS, WEAPON_EFFECT_OPTIONS, WEAPON_QUALITY_OPTIONS, STATUS_LIST } from '../constants.js';
import { getDerivedStats, getEffectiveCharacterSkillRank, getAdjustedArmorSnapshotForPart } from './characterMath.js';
import { ORIGINS } from '../components/data/origins.js';
import { calculatePowerArmorLocations, getPowerArmorPartCondition } from '../data/powerArmor.js';
import { hasActivePowerArmorFrame } from '../data/inventory/bobbleheads.js';
import { getWeaponMetadata } from './weaponDatabase.js';
import { applyWeaponMods } from '../data/weaponMods.js';
import { applyPassiveWeaponPerks } from './weaponPerkEffects.js';
import { applyLegendaryWeaponEffects } from './legendaryEffects.js';
import { buildCharacterPrintDocument, getPrintLanguage, PRINT_COPY } from './characterPrintDocument.js';

const PARTS = [
  ['Head', 'head', '1–2'], ['Torso', 'torso', '3–8'],
  ['Left Arm', 'leftArm', '9–11'], ['Right Arm', 'rightArm', '12–14'],
  ['Left Leg', 'leftLeg', '15–17'], ['Right Leg', 'rightLeg', '18–20'],
];
const STATES = {
  en: { intact:'Intact', normal:'Normal', damaged:'Damaged', broken:'Broken', crippled:'Injured', treated:'Treated' },
  ru: { intact:'Исправна', normal:'Норма', damaged:'Повреждена', broken:'Сломана', crippled:'Травма', treated:'Обработана' },
  uk: { intact:'Справна', normal:'Норма', damaged:'Пошкоджена', broken:'Зламана', crippled:'Травма', treated:'Оброблена' },
  pl: { intact:'Sprawny', normal:'Norma', damaged:'Uszkodzony', broken:'Zniszczony', crippled:'Uraz', treated:'Opatrzony' },
};
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const array = value => Array.isArray(value) ? value : [];

/** Build a read-only snapshot, using the same calculations as the live sheet. */
export function createCharacterPrintModel(input, { t = key => key, language = 'en', globalWeapons = [] } = {}) {
  const lang = getPrintLanguage(language), c = PRINT_COPY[lang];
  const localized = value => {
    if (value == null) return '';
    if (typeof value === 'object') return String(value[lang] ?? value.en ?? '');
    return String(value);
  };
  const translate = (key, fallback = '') => {
    if (!key) return localized(fallback);
    const value = t(key);
    return typeof value === 'string' && value !== key ? value : localized(fallback || key);
  };
  const base = buildDefaultForm();
  const form = { ...base, ...input, special: { ...base.special, ...input?.special }, skills: { ...base.skills, ...input?.skills }, armor: { ...base.armor, ...input?.armor } };
  const d = getDerivedStats(form), origin = ORIGINS[form.origin];
  const power = hasActivePowerArmorFrame(form);
  const loadout = form.armor?._power?.loadout;
  const powerLocations = power ? calculatePowerArmorLocations(loadout) : null;
  const armor = { ...form.armor };
  PARTS.forEach(([part]) => {
    const condition = form.armor?._condition?.parts?.[part];
    armor[part] = powerLocations?.[part] ? { ...powerLocations[part] } : { ...form.armor[part] };
    if (!power && condition?.current) armor[part] = { ...armor[part], ...condition.current };
    if (!power && condition?.status === 'broken') {
      ['physical', 'energy', 'radiation', 'poison'].forEach(type => { armor[part][type] = 0; });
    }
  });
  const state = key => STATES[lang][key] || localized(key);
  const tags = (values, custom, options) => {
    const entries = [...array(values), ...String(custom || '').split(',')].map(s => String(s).trim()).filter(Boolean);
    return [...new Set(entries)].map(tag => {
      const norm = s => s.toLowerCase().replace(/[\s_-]/g, '');
      const option = options.find(o => norm(o.key) === norm(tag));
      return option ? translate(option.nameKey, option.name) : tag;
    }).join(', ');
  };
  const inventory = array(form.inventoryItems);
  const perks = array(form.perksAndTraits).map(p => [localized(p.name), p.rank, localized(p.description || p.effect)]);
  // Origin traits remain represented even when they are not duplicated in the perk list.
  const traitKeys = [...array(origin?.traits), ...array(form.originTraits).map(id => String(id).startsWith('origins.') ? id : `origins.traits.${id}`)];
  for (const key of new Set(traitKeys)) {
    const name = translate(key, key.split('.').at(-1));
    if (!perks.some(p => p[0] === name)) perks.push([name, '', '']);
  }
  const conditions = Object.entries(form.statuses || {}).filter(([, active]) => active).map(([key]) => {
    const status = STATUS_LIST.find(s => s.key === key);
    return translate(status?.nameKey || `statuses.${key}.name`, key);
  });
  for (const effect of array(d.activeConsumableEffects)) {
    const label = localized(effect.name || effect.label || effect.id);
    const description = localized(effect.description || effect.effect);
    if (label || description) conditions.push([label, description].filter(Boolean).join(': '));
  }
  for (const note of array(d.activeEffectNotes)) {
    const text = typeof note === 'string' ? translate(note, note) : localized(note?.text || note?.description || note?.label);
    if (text && !conditions.includes(text)) conditions.push(text);
  }
  const maxLuck = Math.max(0, number(d.luckPoints));
  const currentLuck = form.currentLuckPoints === '' || form.currentLuckPoints == null ? maxLuck : Math.max(0, Math.min(maxLuck, number(form.currentLuckPoints)));
  return {
    name: localized(form.characterName), origin: translate(origin?.translationKey, form.origin), level: form.level, xp: form.xp,
    special: SPECIAL_KEYS.map(key => [key, d.effectiveSpecial?.[key] ?? form.special[key]]),
    skills: SKILL_KEYS.map(key => [translate(SKILL_LABEL_KEYS[key], key), form.skills[key]?.tagged ? '✓' : '', getEffectiveCharacterSkillRank(form, key)]),
    defense:d.defense, initiative:d.initiative, melee:`${number(d.md) >= 0 ? '+' : ''}${number(d.md)} CD`, luck:`${currentLuck} / ${maxLuck}`,
    health:`${d.currentHp} / ${d.effectiveMaxHp} / ${d.maxHp}`, radiation:d.radiationHp, caps:form.caps,
    carry:`${d.currentCarryWeight} / ${d.carryWeight}`, armorMode:power ? c.powerArmor : c.normalArmor,
    armor: PARTS.map(([part, injury, range], index) => {
      const resistance = getAdjustedArmorSnapshotForPart({ armor, part, derived:d });
      const condition = power ? getPowerArmorPartCondition(loadout, part)?.state : form.armor?._condition?.parts?.[part]?.status;
      const name = form.origin === 'mister_handy' ? c.robot[index] : translate(ARMOR_PART_LABEL_KEYS[part], part);
      return [`${name} (${range})`, ...['physical','energy','radiation','poison'].map(type => d.immunities?.includes(type) ? c.immune : resistance[type]), armor[part]?.hp, [condition && state(condition), form.injuries?.[injury] && state(form.injuries[injury])].filter(Boolean).join(' / ')];
    }),
    weapons: array(form.weapons).map(original => {
      // Work on an isolated copy: mod/perk helpers must never mutate the character.
      const isolated = JSON.parse(JSON.stringify(original));
      const modified = applyWeaponMods({ ...isolated, ...getWeaponMetadata(isolated, globalWeapons) });
      const passive = applyPassiveWeaponPerks(form, modified).weapon;
      const weapon = applyLegendaryWeaponEffects(passive, { hp:d.currentHp, maxHp:d.maxHp, addictions:array(d.activeAddictions).length });
      return [localized(weapon.name), translate(SKILL_LABEL_KEYS[weapon.skill], weapon.skill), `${number(weapon.damage)} CD`, translate(`damageTypes.${weapon.type}`, weapon.type), weapon.rate, weapon.range, weapon.ammo, weapon.weight,
        [tags(weapon.effects,weapon.customEffect,WEAPON_EFFECT_OPTIONS), tags(weapon.qualities,weapon.qualitiesCustom,WEAPON_QUALITY_OPTIONS)].filter(Boolean).join('\n')];
    }),
    ammo: inventory.filter(item => item.category === 'ammo').map(item => [localized(item.name), item.quantity, item.weight]),
    gear: inventory.filter(item => item.category !== 'ammo').map(item => [localized(item.name), item.quantity, item.weight, localized(item.effect || item.description)]),
    perks, conditions, survival:[form.satiety,form.thirst,form.vigor,form.fatigue].join(' / '), backstory:localized(form.backstory), quests:localized(form.questNotes),
  };
}

/** The popup is opened synchronously by the click handler, before lazy loading. */
export async function populateCharacterPrintWindow(target, form, options = {}) {
  if (!target || target.closed) return false;
  const html = buildCharacterPrintDocument(createCharacterPrintModel(form, options), options.language);
  target.document.open(); target.document.write(html); target.document.close();
  target.document.getElementById('print-sheet').addEventListener('click', () => target.print());
  target.document.getElementById('close-sheet').addEventListener('click', () => target.close());
  await target.document.fonts?.ready;
  if (target.closed) return false;
  // Keep the preview available after canceling or completing the print dialog.
  target.focus(); target.print();
  return true;
}
