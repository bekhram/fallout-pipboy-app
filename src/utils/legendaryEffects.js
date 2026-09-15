function asNumber(value) {
  const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function replaceLeadingNumber(value, next) {
  const text = String(value ?? "0");
  return /\d+/.test(text) ? text.replace(/\d+/, String(next)) : String(next);
}

function uniqueTokens(values = []) {
  const result = [];
  const seen = new Set();
  values.filter(Boolean).forEach((value) => {
    const key = String(value).trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(String(value).trim());
    }
  });
  return result;
}

function splitCustom(value) {
  return String(value || "").split(/[,;]/).map((item) => item.trim()).filter(Boolean);
}

function addEffect(effects, effect) {
  return uniqueTokens([...(effects || []), effect]);
}

function addQuality(qualities, quality) {
  return uniqueTokens([...(qualities || []), quality]);
}

function increasePiercing(effects, amount) {
  let found = false;
  const next = (effects || []).map((effect) => {
    const match = String(effect).match(/^Piercing\s*\(?\s*(\d+)\s*\)?$/i);
    if (!match) return effect;
    found = true;
    return `Piercing ${Number(match[1]) + amount}`;
  });
  return found ? next : [...next, `Piercing ${amount}`];
}

export function applyLegendaryWeaponEffects(weapon = {}, context = {}) {
  if (!weapon?.legendary || !weapon?.legendaryProperty) return { ...weapon, legendaryEffectNotes: [] };

  const id = String(weapon.legendaryProperty);
  let damage = asNumber(weapon.damage);
  let rate = asNumber(weapon.rate);
  let type = weapon.type;
  let effects = uniqueTokens([
    ...(Array.isArray(weapon.effects) ? weapon.effects : []),
    ...splitCustom(weapon.customEffect),
  ]);
  let qualities = uniqueTokens([
    ...(Array.isArray(weapon.qualities) ? weapon.qualities : []),
    ...splitCustom(weapon.qualitiesCustom),
  ]);
  const notes = [];

  const addDamage = (amount, note) => {
    damage += amount;
    if (note) notes.push(note);
  };

  switch (id) {
    case "mighty":
    case "powerful":
      addDamage(2, "Legendary: +2 CD");
      break;
    case "rapid":
      rate += 3;
      notes.push("Legendary: +3 Fire Rate");
      break;
    case "two-shot":
      addDamage(2, "Legendary: +2 CD");
      effects = addEffect(effects, "Vicious");
      qualities = addQuality(qualities, "Ammo-Hungry (2)");
      break;
    case "penetrating":
      effects = increasePiercing(effects, 2);
      break;
    case "plasma-infused":
      addDamage(2, "Legendary: +2 CD");
      type = "Physical/Energy damage";
      break;
    case "poisoners":
      effects = addEffect(effects, "Persistent (Poison)");
      break;
    case "staggering":
      effects = addEffect(effects, "Stun");
      break;
    case "wounding":
      effects = addEffect(effects, "Persistent (Physical)");
      break;
    case "irradiated":
      effects = addEffect(effects, "Radioactive");
      break;
    case "incendiary":
      effects = addEffect(effects, "Persistent (Energy)");
      break;
    case "freezing":
      if (context.spendLegendaryLuck) effects = addEffect(effects, "Freeze");
      else notes.push("Legendary: spend 1 Luck to add Freeze");
      break;
    case "hitmans":
      if (context.aimed) addDamage(1, "Legendary Hitman: Aim +1 CD");
      break;
    case "instigating":
      if (context.targetAtMaxHp) addDamage(3, "Legendary Instigating: target at max HP +3 CD");
      else notes.push("Legendary: +3 CD against a target at maximum HP");
      break;
    case "nocturnal":
      if (context.isNight) effects = addEffect(effects, "Vicious");
      break;
    case "assassins":
      if (context.targetType === "human") effects = addEffect(effects, "Vicious");
      break;
    case "ghoul-slayers":
      if (context.targetType === "ghoul") effects = addEffect(effects, "Vicious");
      break;
    case "mutant-slayers":
      if (context.targetType === "superMutant") effects = addEffect(effects, "Vicious");
      break;
    case "troubleshooters":
      if (context.targetType === "robot") effects = addEffect(effects, "Vicious");
      break;
    case "exterminators":
      if (context.targetType === "insect") effects = addEffect(effects, "Vicious");
      break;
    case "hunters":
      if (context.targetType === "mammalLizard" || context.targetType === "mutatedAnimal") effects = addEffect(effects, "Vicious");
      break;
    case "violent":
      addDamage(2, "Legendary: +2 CD; high-damage hits can cause injury");
      qualities = addQuality(qualities, "Recoil (7)");
      break;
    case "kneecapper":
      notes.push("Legendary: leg hit becomes critical at 3+ damage after DR");
      break;
    case "crippling":
      notes.push("Legendary: arm/leg hit causes injury at 4+ damage after DR");
      break;
    case "explosive":
      notes.push("Legendary: each Effect can hit a nearby secondary target");
      break;
    case "bloodied":
      if (Number.isFinite(Number(context.hp)) && Number.isFinite(Number(context.maxHp)) && Number(context.maxHp) > 0) {
        const ratio = Number(context.hp) / Number(context.maxHp);
        const bonus = ratio < 0.25 ? 4 : ratio < 0.5 ? 3 : ratio < 0.75 ? 2 : ratio < 1 ? 1 : 0;
        if (bonus) addDamage(bonus, `Legendary Bloodied: +${bonus} CD`);
      }
      break;
    case "junkies": {
      const addictions = Math.max(0, Number(context.addictions || 0));
      if (addictions) addDamage(addictions, `Legendary Junkie's: +${addictions} CD`);
      break;
    }
    default:
      break;
  }

  return {
    ...weapon,
    damage: replaceLeadingNumber(weapon.damage, damage),
    rate,
    type,
    effects,
    customEffect: "",
    qualities,
    qualitiesCustom: "",
    legendaryEffectNotes: notes,
  };
}

export function applyLegendaryArmorEffects(stats = {}, propertyId = "") {
  if (!propertyId) return { ...stats };
  const next = {
    ...stats,
    physical: Number(stats.physical || 0) + 1,
    energy: Number(stats.energy || 0) + 1,
  };
  if (propertyId === "poisoners") next.poison = Number(stats.poison || 0) + 4;
  return next;
}

export function getLegendaryArmorConditionalBonus(propertyId = "", context = {}) {
  const bonus = { physical: 0, energy: 0, radiation: 0, poison: 0, notes: [] };
  switch (propertyId) {
    case "assassins":
      if (context.attackerType === "human") { bonus.physical += 2; bonus.energy += 2; }
      break;
    case "exterminators":
      if (context.attackerType === "insect") { bonus.physical += 2; bonus.energy += 2; }
      break;
    case "ghoul-slayers":
      if (context.attackerType === "ghoul") { bonus.physical += 2; bonus.energy += 2; bonus.radiation += 2; }
      break;
    case "hunters":
      if (context.attackerType === "mammalLizard" || context.attackerType === "mutatedAnimal") { bonus.physical += 2; bonus.energy += 2; }
      break;
    case "mutant-slayers":
      if (context.attackerType === "superMutant") { bonus.physical += 2; bonus.energy += 2; }
      break;
    case "troubleshooters":
      if (context.attackerType === "robot") { bonus.physical += 2; bonus.energy += 2; }
      break;
    case "sentinels":
      if (context.didNotMoveLastTurn) { bonus.physical += 3; bonus.energy += 3; }
      break;
    case "bolstering": {
      const hp = Number(context.hp); const maxHp = Number(context.maxHp);
      if (maxHp > 0 && hp < maxHp / 4) { bonus.physical += 3; bonus.energy += 3; }
      else if (maxHp > 0 && hp < maxHp / 2) { bonus.physical += 2; bonus.energy += 2; }
      break;
    }
    default:
      break;
  }
  return bonus;
}
