import { getPerkRank } from "./perkEffects.js";

const RANGED_NON_HEAVY_SKILLS = new Set(["Small Guns", "Energy Weapons"]);
const RANGED_SKILLS = new Set(["Small Guns", "Energy Weapons", "Big Guns", "Explosives", "Throwing"]);
const UNARMED_WEAPON_NAMES = [
  "boxing glove",
  "deathclaw gauntlet",
  "knuckles",
  "power fist",
];
const BLADED_WEAPON_NAMES = [
  "sword",
  "knife",
  "machete",
  "ripper",
  "shishkebab",
  "switchblade",
  "blade",
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

function hasTraitInCustom(value, trait) {
  const wanted = normalizeTrait(trait);
  return String(value || "")
    .split(/[,;]/)
    .some((item) => normalizeTrait(item) === wanted);
}

function isTwoHanded(weapon) {
  return hasTrait(weapon?.qualities, "two handed")
    || hasTraitInCustom(weapon?.qualitiesCustom, "two handed");
}

function isAccurate(weapon) {
  return hasTrait(weapon?.qualities, "accurate")
    || hasTraitInCustom(weapon?.qualitiesCustom, "accurate");
}

function isSuppressed(weapon) {
  return hasTrait(weapon?.qualities, "suppressed")
    || hasTrait(weapon?.qualities, "supressed")
    || /(?:^|[,;])\s*sup+p?ressed\s*(?:$|[,;])/i.test(String(weapon?.qualitiesCustom || ""));
}

function isBlastWeapon(weapon) {
  return hasTrait(weapon?.qualities, "blast")
    || hasTraitInCustom(weapon?.qualitiesCustom, "blast");
}

function isShotgun(weapon) {
  return /shotgun/i.test(String(weapon?.name || ""));
}

function isUnarmedWeapon(weapon) {
  if (normalize(weapon?.skill) === "unarmed") return true;
  const name = normalize(weapon?.name);
  return UNARMED_WEAPON_NAMES.some((entry) => name.includes(entry));
}

function isBladedMeleeWeapon(weapon) {
  if (normalize(weapon?.skill) !== "melee weapons") return false;
  const name = normalize(weapon?.name);
  return BLADED_WEAPON_NAMES.some((entry) => name.includes(entry));
}

function isMeleeLikeWeapon(weapon) {
  const skill = normalize(weapon?.skill);
  return skill === "melee weapons" || isUnarmedWeapon(weapon);
}

function isRangedWeapon(weapon) {
  return RANGED_SKILLS.has(String(weapon?.skill || "").trim());
}

function isFireBasedWeapon(weapon) {
  const name = normalize(weapon?.name);
  if (FIRE_WEAPON_NAMES.some((entry) => name.includes(entry))) return true;

  const modText = (weapon?.appliedMods || [])
    .map((mod) => `${mod?.name || ""} ${mod?.prefix || ""}`)
    .join(" ");
  return /(incendiary|flamer barrel|ignition module|napalm|vaporization nozzle|flaming)/i.test(modText);
}

function hasPowerArmorEquipped(form) {
  const loadout = form?.armor?._power?.loadout;
  if (!loadout) return false;
  if (loadout.setId) return true;
  return Object.values(loadout.slots || {}).some((slot) => Boolean(slot?.setId));
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

  if (getPerkRank(form, "piercing_strike") > 0 && (isUnarmedWeapon(weapon) || isBladedMeleeWeapon(weapon))) {
    addPiercing(state, "Piercing Strike", 1);
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

export function getConditionalWeaponPerkAvailability(form, weapon = {}) {
  const ranged = isRangedWeapon(weapon);
  const meleeLike = isMeleeLikeWeapon(weapon);
  const unarmed = isUnarmedWeapon(weapon);

  const availability = {
    aim: ranged && ["awareness", "sniper", "steady_aim"].some((id) => getPerkRank(form, id) > 0),
    sneakAttack: ["ninja", "mister_sandman"].some((id) => getPerkRank(form, id) > 0),
    targetLocation: (
      (ranged && ["center_mass", "sniper"].some((id) => getPerkRank(form, id) > 0))
      || (unarmed && getPerkRank(form, "paralyzing_palm") > 0)
    ),
    targetType: ["hunter", "entomologist"].some((id) => getPerkRank(form, id) > 0),
    movedIntoReach: meleeLike && getPerkRank(form, "blitz") > 0,
    ammoBoosted: ranged && getPerkRank(form, "concentrated_fire") > 0,
    steadyAim: ranged && getPerkRank(form, "steady_aim") > 0,
  };

  availability.hasAny = Object.entries(availability)
    .some(([key, value]) => key !== "hasAny" && Boolean(value));
  return availability;
}

export function applyConditionalWeaponPerks(form, weapon = {}, context = {}) {
  const state = {
    damageBonus: 0,
    piercingBonus: 0,
    viciousSources: [],
    extraEffects: [],
    difficultyDelta: 0,
    rerollD20: 0,
    damageRerollAllowed: false,
    notes: [],
  };

  const aimed = Boolean(context.aimed);
  const sneakAttack = Boolean(context.sneakAttack);
  const targetLocation = String(context.targetLocation || "");
  const targetType = String(context.targetType || "");
  const movedIntoReach = Boolean(context.movedIntoReach);
  const ammoBoosted = Boolean(context.ammoBoosted);
  const powerArmorEquipped = hasPowerArmorEquipped(form);
  const ranged = isRangedWeapon(weapon);
  const meleeLike = isMeleeLikeWeapon(weapon);
  const unarmed = isUnarmedWeapon(weapon);

  if (aimed && getPerkRank(form, "awareness") > 0 && ranged) {
    addPiercing(state, "Awareness", 1);
  }

  if (targetType === "mutated_animal" && getPerkRank(form, "hunter") > 0) {
    addVicious(state, "Hunter");
  }

  if (targetType === "insect" && getPerkRank(form, "entomologist") > 0) {
    addPiercing(state, "Entomologist", 1);
  }

  if (sneakAttack && !powerArmorEquipped && meleeLike && getPerkRank(form, "ninja") > 0) {
    addDamageBonus(state, "Ninja", 2);
  }

  if (
    sneakAttack
    && !powerArmorEquipped
    && ranged
    && isSuppressed(weapon)
    && getPerkRank(form, "mister_sandman") > 0
  ) {
    addDamageBonus(state, "Mister Sandman", 2);
  }

  if (movedIntoReach && meleeLike && getPerkRank(form, "blitz") > 0) {
    state.rerollD20 += 1;
    state.notes.push("Blitz: re-roll 1d20");
  }

  if (aimed && ranged && getPerkRank(form, "steady_aim") > 0) {
    const firstAttack = context.steadyAimMode !== "all";
    state.rerollD20 += firstAttack ? 2 : 1;
    state.notes.push(firstAttack
      ? "Steady Aim: re-roll up to 2d20 on first attack"
      : "Steady Aim: re-roll 1d20 on attacks this turn");
  }

  if (ammoBoosted && ranged && getPerkRank(form, "concentrated_fire") > 0) {
    state.damageRerollAllowed = true;
    state.notes.push("Concentrated Fire: damage dice re-roll available");
  }

  let targetedPenaltyWaived = false;
  if (targetLocation && ranged) {
    if (targetLocation === "torso" && getPerkRank(form, "center_mass") > 0) {
      targetedPenaltyWaived = true;
      state.rerollD20 += 1;
      state.notes.push("Center Mass: no targeted-shot difficulty + re-roll 1d20");
    }

    if (
      aimed
      && isAccurate(weapon)
      && isTwoHanded(weapon)
      && getPerkRank(form, "sniper") > 0
    ) {
      targetedPenaltyWaived = true;
      state.notes.push("Sniper: targeted-shot difficulty ignored");
    }

    if (!targetedPenaltyWaived) state.difficultyDelta += 1;
  }

  if (targetLocation && unarmed && getPerkRank(form, "paralyzing_palm") > 0) {
    state.extraEffects.push("stun");
    state.notes.push("Paralyzing Palm: Stun");
  }

  const next = {
    ...weapon,
    damage: String(getDamageDiceCount(weapon?.damage) + state.damageBonus),
    effects: Array.isArray(weapon?.effects) ? [...weapon.effects] : [],
    customEffect: weapon?.customEffect || "",
    conditionalPerkDamageBonus: state.damageBonus,
    conditionalPerkNotes: [...state.notes],
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
    next.conditionalPerkNotes.push(`${source} Vicious`);
  }

  for (const effect of state.extraEffects) {
    next.effects = addUniqueEffect(next.effects, effect);
  }

  return {
    weapon: next,
    damageBonus: state.damageBonus,
    piercingBonus: state.piercingBonus,
    difficultyDelta: state.difficultyDelta,
    rerollD20: state.rerollD20,
    damageRerollAllowed: state.damageRerollAllowed,
    notes: [...next.conditionalPerkNotes],
  };
}
