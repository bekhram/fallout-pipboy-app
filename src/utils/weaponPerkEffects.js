import { getPerkRank } from "./perkEffects.js";

const RANGED_NON_HEAVY_SKILLS = new Set(["Small Guns", "Energy Weapons"]);
const UNARMED_WEAPON_NAMES = [
  "boxing glove",
  "deathclaw gauntlet",
  "knuckles",
  "power fist",
];
const FIRE_WEAPON_NAMES = [
  "flamer",
  "heavy incinerator",
  "shishkebab",
  "molotov cocktail",
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getDamageDiceCount(value) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Math.max(0, Number(match[0]) || 0) : 0;
}

function normalizeTrait(value) {
  return normalize(value).replace(/\s+/g, " ");
}

function hasTrait(items = [], trait) {
  const wanted = normalizeTrait(trait);
  return (Array.isArray(items) ? items : []).some(
    (item) => normalizeTrait(item) === wanted
  );
}

function isTwoHanded(weapon) {
  return hasTrait(weapon?.qualities, "two handed")
    || /(?:^|[,;])\s*two[- ]handed\s*(?:$|[,;])/i.test(String(weapon?.qualitiesCustom || ""));
}

function isBlastWeapon(weapon) {
  return hasTrait(weapon?.qualities, "blast")
    || /(?:^|[,;])\s*blast\s*(?:$|[,;])/i.test(String(weapon?.qualitiesCustom || ""));
}

function isShotgun(weapon) {
  return /shotgun/i.test(String(weapon?.name || ""));
}

function isUnarmedWeapon(weapon) {
  if (normalize(weapon?.skill) === "unarmed") return true;
  const name = normalize(weapon?.name);
  return UNARMED_WEAPON_NAMES.some((entry) => name.includes(entry));
}

function isFireBasedWeapon(weapon) {
  const name = normalize(weapon?.name);
  if (FIRE_WEAPON_NAMES.some((entry) => name.includes(entry))) return true;

  const modText = (weapon?.appliedMods || [])
    .map((mod) => `${mod?.name || ""} ${mod?.prefix || ""}`)
    .join(" ");
  return /(incendiary|flamer barrel|ignition module|napalm|vaporization nozzle|flaming)/i.test(modText);
}

function addUniqueEffect(effects, effect) {
  const wanted = normalizeTrait(effect);
  if (effects.some((item) => normalizeTrait(item) === wanted)) return effects;
  return [...effects, effect];
}

function increasePiercing(effects = [], customEffect = "", amount = 0) {
  const bonus = Math.max(0, Number(amount || 0));
  if (!bonus) return { effects: [...effects], customEffect };

  let current = 0;
  const nextEffects = [];

  for (const effect of effects) {
    const match = normalizeTrait(effect).match(/^piercing\s*(\d+)$/i);
    if (match) {
      current = Math.max(current, Number(match[1] || 0));
    } else {
      nextEffects.push(effect);
    }
  }

  const raw = String(customEffect || "");
  for (const match of raw.matchAll(/piercing[\s_-]*(\d+)/gi)) {
    current = Math.max(current, Number(match[1] || 0));
  }

  const nextRating = current + bonus;
  nextEffects.push(`piercing ${nextRating}`);

  let nextCustomEffect = raw;
  if (/piercing[\s_-]*\d+/i.test(nextCustomEffect)) {
    nextCustomEffect = nextCustomEffect.replace(
      /piercing[\s_-]*\d+/gi,
      `Piercing ${nextRating}`
    );
  }

  return {
    effects: nextEffects,
    customEffect: nextCustomEffect,
  };
}

function addDamageBonus(state, source, amount) {
  const value = Math.max(0, Number(amount || 0));
  if (!value) return;
  state.damageBonus += value;
  state.notes.push(`${source} +${value} CD`);
}

function addVicious(state, source) {
  state.viciousSources.push(source);
}

function addPiercing(state, source, amount = 1) {
  const value = Math.max(0, Number(amount || 0));
  if (!value) return;
  state.piercingBonus += value;
  state.notes.push(`${source} Piercing +${value}`);
}

export function applyPassiveWeaponPerks(form, weapon = {}) {
  const state = {
    damageBonus: 0,
    piercingBonus: 0,
    viciousSources: [],
    hitLocationRerolls: 0,
    notes: [],
  };

  const skill = String(weapon?.skill || "").trim();
  const rate = Math.max(0, Number(weapon?.rate || 0));
  const twoHanded = isTwoHanded(weapon);
  const rangedNonHeavy = RANGED_NON_HEAVY_SKILLS.has(skill);

  const commandoRank = getPerkRank(form, "commando");
  if (commandoRank > 0 && rangedNonHeavy && rate >= 3) {
    addDamageBonus(state, "Commando", commandoRank);
  }

  const gunslingerRank = getPerkRank(form, "gunslinger");
  if (gunslingerRank > 0 && rangedNonHeavy && !twoHanded && rate <= 2) {
    addDamageBonus(state, "Gunslinger", gunslingerRank);
    state.hitLocationRerolls = Math.max(state.hitLocationRerolls, 1);
  }

  const riflemanRank = getPerkRank(form, "rifleman");
  if (riflemanRank > 0 && rangedNonHeavy && twoHanded && rate <= 2) {
    addDamageBonus(state, "Rifleman", riflemanRank);
    if (riflemanRank >= 2) addPiercing(state, "Rifleman", 1);
  }

  const laserCommanderRank = getPerkRank(form, "laser_commander");
  if (laserCommanderRank > 0 && skill === "Energy Weapons") {
    addDamageBonus(state, "Laser Commander", laserCommanderRank);
  }

  const sizeMattersRank = getPerkRank(form, "size_matters");
  if (sizeMattersRank > 0 && skill === "Big Guns") {
    addDamageBonus(state, "Size Matters", sizeMattersRank);
  }

  const ironFistRank = getPerkRank(form, "iron_fist");
  if (ironFistRank > 0 && isUnarmedWeapon(weapon)) {
    addDamageBonus(state, "Iron Fist", 1);
    if (ironFistRank >= 2) addVicious(state, "Iron Fist");
  }

  if (getPerkRank(form, "big_leagues") > 0 && skill === "Melee Weapons" && twoHanded) {
    addVicious(state, "Big Leagues");
  }

  if (getPerkRank(form, "shotgun_surgeon") > 0 && isShotgun(weapon)) {
    addPiercing(state, "Shotgun Surgeon", 1);
  }

  if (getPerkRank(form, "demolition_expert") > 0 && isBlastWeapon(weapon)) {
    addVicious(state, "Demolition Expert");
  }

  const pyromaniacRank = getPerkRank(form, "pyromaniac");
  if (pyromaniacRank > 0 && isFireBasedWeapon(weapon)) {
    addDamageBonus(state, "Pyromaniac", pyromaniacRank);
  }

  const next = {
    ...weapon,
    damage: String(getDamageDiceCount(weapon?.damage) + state.damageBonus),
    effects: Array.isArray(weapon?.effects) ? [...weapon.effects] : [],
    customEffect: weapon?.customEffect || "",
    perkDamageBonus: state.damageBonus,
    perkHitLocationRerolls: state.hitLocationRerolls,
    perkEffectNotes: [...state.notes],
  };

  if (state.piercingBonus > 0) {
    const piercing = increasePiercing(
      next.effects,
      next.customEffect,
      state.piercingBonus
    );
    next.effects = piercing.effects;
    next.customEffect = piercing.customEffect;
  }

  for (const source of state.viciousSources) {
    next.effects = addUniqueEffect(next.effects, "vicious");
    next.perkEffectNotes.push(`${source} Vicious`);
  }

  return {
    weapon: next,
    damageBonus: state.damageBonus,
    piercingBonus: state.piercingBonus,
    viciousSources: [...state.viciousSources],
    hitLocationRerolls: state.hitLocationRerolls,
    notes: [...next.perkEffectNotes],
  };
}
