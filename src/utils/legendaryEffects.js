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
  return String(value || "")
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean);
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

// Only unconditional, explicit mechanical changes belong here.
// Anything that depends on target type, time of day, HP thresholds,
// movement, Luck spend, hit location, or other scene context is left to the GM.
export function applyLegendaryWeaponEffects(weapon = {}) {
  if (!weapon?.legendary || !weapon?.legendaryProperty) {
    return { ...weapon, legendaryEffectNotes: [] };
  }

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
    case "violent":
      addDamage(2, "Legendary: +2 CD");
      qualities = addQuality(qualities, "Recoil (7)");
      break;
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

  if (propertyId === "poisoners") {
    next.poison = Number(stats.poison || 0) + 4;
  }

  return next;
}
