const mod = (name, effect, weight = 0, cost = 0, perks = "", prefix = name) => ({
  name, prefix, effect, weight, cost, perks,
});

export const MOD_SLOT_LABELS = {
  receiver: "Receiver",
  capacitor: "Capacitor",
  dish: "Dish",
  fuel: "Fuel",
  barrel: "Barrel",
  grip: "Grip",
  stock: "Stock",
  magazine: "Magazine",
  tank: "Propellant tank",
  sights: "Sights",
  muzzle: "Muzzle",
  nozzle: "Nozzle",
  blade: "Blade",
  head: "Weapon mod",
};

const sights = [
  mod("Reflex Sight", "May re-roll hit location die", 0, 14, "", "Tactical"),
  mod("Short Scope", "Gain Accurate", 1, 11, "", "Scoped"),
  mod("Long Scope", "Gain Accurate; increase Range by 1 step", 1, 29, "Science! 2", "Scoped"),
  mod("Short Night Vision Scope", "Gain Accurate and Night Vision", 1, 38, "Science! 2", "Night Vision"),
  mod("Long Night Vision Scope", "Gain Accurate and Night Vision; increase Range by 1 step", 1, 50, "Science! 3", "Night Vision"),
  mod("Recon Scope", "Gain Accurate and Recon", 1, 59, "Science! 3", "Recon"),
];

const smallGuns = {
  receiver: [
    mod("Hardened", "+1 damage", 0, 20),
    mod("Powerful", "+2 damage", 1, 25, "Gun Nut 1"),
    mod("Advanced", "+3 damage; +1 Fire Rate", 2, 35, "Gun Nut 2"),
    mod("Calibrated", "Gain Vicious", 0, 25),
    mod("Automatic", "-1 damage; +2 Fire Rate; gain Burst and Inaccurate", 1, 30, "Gun Nut 1", "Auto"),
    mod("Hair Trigger", "+1 Fire Rate", 0, 20, "Gun Nut 2"),
    mod(".38 Receiver", "Damage becomes 4; ammo becomes .38", 3, 20, "Gun Nut 4", ".38"),
    mod(".308 Receiver", "Damage becomes 7; ammo becomes .308", 4, 40, "Gun Nut 4", ".308"),
    mod(".45 Receiver", "Damage becomes 4; +1 Fire Rate; ammo becomes .45", 2, 19, "Gun Nut 2", ".45"),
    mod(".50 Receiver", "Damage becomes 8; gain Vicious; ammo becomes .50", 4, 30, "Gun Nut 4", ".50"),
    mod("Automatic Piston", "+2 Fire Rate; reduce Range by 1 step", 2, 75, "Gun Nut 2", "Automatic"),
  ],
  barrel: [
    mod("Snubnose", "Gain Inaccurate", -1, 0, "", "Snub-nosed"),
    mod("Bull Barrel", "Gain Reliable", 0, 10, "Gun Nut 3"),
    mod("Long", "Increase Range by 1 step", 1, 20, "Gun Nut 1"),
    mod("Ported", "Increase Range by 1 step; +1 Fire Rate", 1, 35, "Gun Nut 4"),
    mod("Vented", "Increase Range by 1 step; +1 Fire Rate; gain Reliable", 1, 36, "Gun Nut 4"),
    mod("Sawed-Off", "Remove Two-Handed; gain Close Quarters", -2, 3, ""),
    mod("Shielded Barrel", "+1 damage", 0, 37, "Gun Nut 3, Repair", "Shielded"),
    mod("Finned", "+1 damage; increase Range by 1 step", 2, 15, "Gun Nut 2"),
  ],
  magazine: [
    mod("Large Magazine", "+1 Fire Rate; gain Unreliable", 1, -3, "Gun Nut 2", "High Capacity"),
    mod("Quick-Eject Mag", "Gain Reliable", 0, 8, "Gun Nut 1", "Quick"),
    mod("Large Quick-Eject Mag", "+1 Fire Rate", 1, 23, "Gun Nut 2", "Quick High Capacity"),
  ],
  grip: [
    mod("Comfort Grip", "Remove Inaccurate", 0, 6, "", "Comfort"),
    mod("Sharpshooter’s Grip", "Remove Inaccurate; add Piercing 1", 0, 10, "Gun Nut 1", "Sharpshooter’s"),
  ],
  stock: [
    mod("Full Stock", "Gain Two-Handed; remove Inaccurate", 1, 10, "", ""),
    mod("Marksman’s Stock", "Gain Two-Handed and Accurate; remove Inaccurate", 2, 20, "Gun Nut 2", "Marksman’s"),
    mod("Recoil Compensating Stock", "Gain Two-Handed; remove Inaccurate; +1 Fire Rate", 2, 3, "Gun Nut 3", "Recoil Compensated"),
  ],
  sights,
  muzzle: [
    mod("Bayonet", "Melee profile: 4 damage, Piercing 1", 2, 10, "", "Bayoneted"),
    mod("Compensator", "Remove Inaccurate", 1, 15, "Gun Nut 1", "Compensated"),
    mod("Muzzle Brake", "Remove Inaccurate; +1 Fire Rate", 1, 30, "Gun Nut 1", "Muzzled"),
    mod("Suppressor", "Gain Suppressed", 2, 45, "Gun Nut 2", "Suppressed"),
  ],
};

const energyWeapons = {
  capacitor: [
    mod("Beta Wave Tuner", "Gain Persistent", 0, 30, "", "Incendiary"),
    mod("Boosted Capacitor", "+1 damage; -1 Fire Rate", 0, 35, "", "Boosted"),
    mod("Photon Exciter", "Gain Vicious", 0, 30, "Science! 1", "Excited"),
    mod("Photon Agitator", "+1 damage; gain Vicious", 1, 35, "Science! 2", "Agitated"),
  ],
  barrel: [
    mod("Bracketed Short Barrel", "Allows a Muzzle mod", 0, 6, "", ""),
    mod("Long Barrel", "Remove Close Quarters; increase Range by 1 step", 2, 20, "", "Long"),
    mod("Splitter", "-1 damage; gain Spread and Inaccurate", 1, 31, "", "Scattergun"),
    mod("Automatic Barrel", "-1 damage; remove Close Quarters; increase Range by 1 step; +1 Fire Rate", 1, 24, "Science! 1", "Automatic"),
    mod("Bracketed Long Barrel", "Remove Close Quarters; increase Range by 1 step; allows a Muzzle mod", 2, 25, "Science! 1", ""),
    mod("Improved Barrel", "+1 damage", 1, 26, "Science! 1", "Improved"),
    mod("Sniper Barrel", "+2 damage; remove Close Quarters; increase Range by 1 step; -1 Fire Rate", 2, 30, "Science! 1", "Sniper"),
    mod("Flamer Barrel", "-2 damage; +2 Fire Rate; gain Burst, Spread and Inaccurate; reduce Range by 1 step", 1, 35, "Science! 2", "Thrower"),
  ],
  grip: [mod("Sharpshooter’s Grip", "Remove Inaccurate; add Piercing 1", 0, 10, "Gun Nut 1", "Sharpshooter’s")],
  stock: [
    mod("Standard Stock", "Gain Two-Handed; remove Inaccurate and Close Quarters", 1, 10, "", ""),
    mod("Full Stock", "Gain Piercing 1; remove Close Quarters", 1, 15),
    mod("Marksman’s Stock", "Gain Two-Handed and Accurate; remove Inaccurate and Close Quarters", 2, 20, "Gun Nut 2", "Marksman’s"),
    mod("Recoil Compensating Stock", "Gain Two-Handed; remove Inaccurate and Close Quarters; +1 Fire Rate", 2, 3, "Gun Nut 3", "Recoil Compensated"),
  ],
  sights,
  muzzle: [
    mod("Beam Splitter", "-1 damage and Fire Rate; gain Spread and Inaccurate; reduce Range by 1 step", 1, 15, "Science! 1", "Scattered"),
    mod("Beam Focuser", "Increase Range by 1 step", 1, 20, "Science! 1", "Focused"),
    mod("Gyro Compensating Lens", "+1 Fire Rate; remove Inaccurate", 1, 25, "Science! 1", "Targeting"),
  ],
};

const unique = {
  "laser-musket": {
    capacitor: [
      mod("Three-crank capacitor", "+1 damage; consumes 3 shots per attack", 0, 4, "", "Three-crank"),
      mod("Four-crank capacitor", "+2 damage; consumes 4 shots per attack", 1, 8, "Science! 1", "Four-crank"),
      mod("Five-crank capacitor", "+3 damage; consumes 5 shots per attack", 1, 12, "Science! 2", "Five-crank"),
      mod("Six-crank capacitor", "+4 damage; consumes 6 shots per attack", 2, 16, "Science! 3", "Six-crank"),
    ],
  },
  "gamma-gun": {
    dish: [mod("Deep Dish", "+1 damage; increase Range by 1 step", 2, 72, "Science! 4", "Long")],
    muzzle: [
      mod("Electric Signal Carrier Antennae", "Damage becomes 7 Energy; gain Radioactive", 0, 30, "Science! 4", "Electrified"),
      mod("Signal Repeater", "+2 Fire Rate; gain Burst; remove Blast", 0, 60, "Science! 4", "Automatic"),
    ],
  },
  flamer: {
    fuel: [mod("Napalm", "+1 damage", 7, 59, "Gun Nut 1", "Napalmer")],
    barrel: [mod("Long Barrel", "Remove Inaccurate", 2, 28, "Gun Nut 1", "Long")],
    tank: [
      mod("Large Tank", "+1 Fire Rate", 3, 28, "Gun Nut 1", "High Capacity"),
      mod("Huge Tank", "+2 Fire Rate", 6, 34, "Gun Nut 2", "Max. Capacity"),
    ],
    nozzle: [
      mod("Compression Nozzle", "+1 damage", 0, 22, "Gun Nut 1", "Compressed"),
      mod("Vaporization Nozzle", "+1 damage; gain Vicious", 0, 47, "Gun Nut 2", "Vaporizing"),
    ],
  },
  "gatling-laser": {
    capacitor: [
      mod("Photon Exciter", "Gain Vicious", 1, 19, "Science! 3", "Excited"),
      mod("Beta Wave Tuner", "Gain Persistent", 1, 57, "", "Incendiary"),
      mod("Boosted Capacitor", "+1 damage", 1, 94, "", "Boosted"),
      mod("Photon Agitator", "+1 damage; gain Vicious", 3, 132, "Science! 3", "Agitated"),
    ],
    barrel: [mod("Charging Barrels", "+4 damage; -3 Fire Rate; increase Range by 1 step", 10, 357, "Science! 4", "Charging")],
    sights: [mod("Reflex Sight", "Remove Inaccurate", 1, 169, "Science! 4", "Tactical")],
    nozzle: [mod("Beam Focuser", "Gain Piercing 1; increase Range by 1 step", 0, 22, "", "Focused")],
  },
  "junk-jet": {
    barrel: [mod("Long Barrel", "Increase Range by 1 step", 2, 20, "Gun Nut 1", "Long")],
    stock: [mod("Recoil Compensating Stock", "+1 Fire Rate", 2, 40, "", "Recoil Compensated")],
    sights: [mod("Gunner Sight", "May re-roll hit location die", 1, 5, "", "Tactical")],
    muzzle: [
      mod("Electrification Module", "Gain Vicious; damage type becomes Energy", 1, 70, "Gun Nut 2, Science! 1", "Electrified"),
      mod("Ignition Module", "Gain Persistent (Energy)", 1, 130, "Gun Nut 3, Science! 1", "Flaming"),
    ],
  },
  minigun: {
    barrel: [
      mod("Accelerated Barrel", "+1 damage and Fire Rate; reduce Range by 1 step", 5, 45, "Gun Nut 3", "High-Speed"),
      mod("Tri-Barrel", "+2 damage; -2 Fire Rate", 3, 75, "Gun Nut 4", "High-Powered"),
    ],
    sights: [mod("Gunner Sight", "Remove Inaccurate", 1, 68, "", "Tactical")],
    muzzle: [mod("Shredder", "Adds a melee profile based on Fire Rate", 5, 5, "Gun Nut 2", "Bayoneted Shredding")],
  },
  "missile-launcher": {
    barrel: [
      mod("Triple Barrel", "+1 Fire Rate", 16, 143, "Gun Nut 2"),
      mod("Quad Barrel", "+2 Fire Rate", 20, 218, "Gun Nut 3"),
    ],
    sights: [
      mod("Scope", "Gain Accurate", 6, 143, "Gun Nut 2", "Scoped"),
      mod("Night Vision Scope", "Gain Accurate and Night Vision", 6, 248, "Gun Nut 4, Science! 1", "Night-vision"),
      mod("Targeting Computer", "Aiming ignores cover and applies to the next attack during the scene", 7, 293, "Gun Nut 2, Science! 2", "Targeting"),
    ],
    muzzle: [
      mod("Bayonet", "Melee profile: 4 damage, Piercing 1", 1, 30, "", "Bayoneted Shredding"),
      mod("Stabilizer", "Gain Piercing 1", 2, 60, "Gun Nut 2", "Muzzled"),
    ],
  },
};

const melee = {
  sword: { blade: [mod("Serrated Blade", "Gain Persistent", 0, 25, "Blacksmith 2", "Serrated"), mod("Electrified Blade", "+1 damage; damage becomes Energy", 0, 50, "Blacksmith 2, Science! 1", "Electrified"), mod("Electrified Serrated Blade", "+1 damage; damage becomes Energy; gain Persistent", 0, 75, "Blacksmith 3, Science! 1", "Electrified Serrated"), mod("Stun Pack", "+2 damage; damage becomes Energy; gain Stun", 0, 100, "Blacksmith 3, Science! 1", "Stunning")] },
  "combat-knife": { blade: [mod("Serrated Blade", "+1 damage; gain Persistent", 0, 12, "Blacksmith 1", "Serrated"), mod("Stealth Blade", "+1 damage and Persistent; +2 damage on Sneak attacks", 0, 18, "Blacksmith 2", "Stealth")] },
  machete: { blade: [mod("Serrated Blade", "+2 damage; gain Persistent", 0, 12, "Blacksmith 2", "Serrated")] },
  ripper: { blade: [mod("Curved Blade", "+1 damage; may spend 2 AP to disarm", 1, 15, "", "Curved"), mod("Extended Blade", "+1 damage; gain Persistent", 3, 25, "Blacksmith 3", "Extended")] },
  shishkebab: { blade: [mod("Extra Flame Jets", "+1 damage; gain Persistent", 1, 100, "Blacksmith 3", "Searing")] },
  switchblade: { blade: [mod("Serrated Blade", "+1 damage; gain Persistent", 0, 10, "Blacksmith 1", "Serrated")] },
  "baseball-bat": { head: [mod("Barbed", "Gain Piercing 1", 0, 5), mod("Spiked", "+1 damage; gain Piercing 1", 1, 7), mod("Sharp", "+1 damage; gain Persistent", 1, 7), mod("Chain-Wrapped", "+2 damage", 1, 10, "Blacksmith 1"), mod("Bladed", "+2 damage; gain Persistent", 2, 12, "Blacksmith 2")] },
  board: { head: [mod("Spiked", "+1 damage; gain Piercing 1", 1, 6), mod("Puncturing", "+2 damage", 1, 9, "Blacksmith 1"), mod("Bladed", "+2 damage; gain Persistent", 2, 10, "Blacksmith 1")] },
  "lead-pipe": { head: [mod("Spiked", "+1 damage; gain Piercing 1", 1, 4), mod("Heavy", "+2 damage", 2, 11, "Blacksmith 2")] },
  "pipe-wrench": { head: [mod("Hooked", "+1 damage; may spend 2 AP to disarm", 0, 9), mod("Heavy", "+2 damage", 7, 12, "Blacksmith 1", "Weighted"), mod("Puncturing", "+2 damage; gain Piercing 1", 1, 13, "Blacksmith 1"), mod("Extra Heavy", "+3 damage", 2, 22, "Blacksmith 2", "Heavy")] },
  "pool-cue": { head: [mod("Barbed", "+1 damage; gain Piercing 1", 0, 2), mod("Sharp", "+1 damage; gain Persistent", 0, 3)] },
  "rolling-pin": { head: [mod("Spiked", "+1 damage; gain Piercing 1", 0, 3, "", "Barbed"), mod("Sharp", "+1 damage; gain Persistent", 0, 3)] },
  baton: { head: [mod("Electrified", "+2 damage; damage becomes Energy", 0, 15, "Blacksmith 2, Science! 1", "Shock"), mod("Stun Pack", "+3 damage; gain Stun; damage becomes Energy", 0, 30, "Blacksmith 2, Science! 1", "Stun")] },
  sledgehammer: { head: [mod("Puncturing", "+1 damage; gain Piercing 1", 5, 18, "Blacksmith 2"), mod("Heavy", "+2 damage", 9, 30, "Blacksmith 2")] },
  "super-sledge": { head: [mod("Heating Coil", "+1 damage; damage becomes Energy", 0, 180, "Blacksmith 2", "Heated"), mod("Stun Pack", "+2 damage; gain Stun; damage becomes Energy", 0, 360, "Blacksmith 3, Science! 1", "Stunning")] },
  "tire-iron": { head: [mod("Bladed", "+1 damage; gain Persistent", 1, 12, "Blacksmith 2")] },
  "walking-cane": { head: [mod("Barbed", "+1 damage; gain Piercing 1", 0, 3), mod("Spiked", "+1 damage; gain Piercing 1", 0, 3)] },
  "boxing-glove": { head: [mod("Spiked", "Gain Piercing 1", 0, 3), mod("Puncturing", "+1 damage; gain Piercing 1", 0, 4, "Blacksmith 1"), mod("Lead Lining", "+2 damage", 1, 7, "Blacksmith 1", "Lead-lined")] },
  "deathclaw-gauntlet": { head: [mod("Extra Claw", "+1 damage; may spend 2 AP to disarm", 2, 22, "", "Large")] },
  knuckles: { head: [mod("Sharp", "Gain Persistent", 0, 3), mod("Spiked", "Gain Piercing 1", 0, 3), mod("Puncturing", "+1 damage; gain Piercing 1", 0, 4, "Blacksmith 1"), mod("Bladed", "+1 damage; gain Persistent", 0, 5, "Blacksmith 1")] },
  "power-fist": { head: [mod("Puncturing", "+2 damage; gain Piercing 1", 1, 45, "Blacksmith 2"), mod("Heating Coil", "+2 damage; damage becomes Energy", 0, 100, "Blacksmith 3", "Heated")] },
};

const slugify = (value) => String(value || "").trim().toLowerCase().normalize("NFKD")
  .replace(/^\.+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const mergeGroups = (...groups) => {
  const result = {};
  groups.filter(Boolean).forEach((group) => Object.entries(group).forEach(([slot, items]) => {
    result[slot] = [...(result[slot] || []), ...items];
  }));
  return result;
};

export function getWeaponModGroups(weapon) {
  const slug = slugify(weapon?.name);
  const skill = String(weapon?.skill || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (melee[slug]) return melee[slug];
  if (skill === "small_guns") return mergeGroups(smallGuns, unique[slug]);
  if (skill === "energy_weapons") return mergeGroups(energyWeapons, unique[slug]);
  return unique[slug] || {};
}

const EFFECT_KEYS = new Map([
  ["persistent", "persistent"],
  ["vicious", "vicious"],
  ["burst", "burst"],
  ["breaking", "breaking"],
  ["radioactive", "radioactive"],
  ["spread", "spread"],
  ["stun", "stun"],
]);

const QUALITY_KEYS = new Map([
  ["accurate", "accurate"],
  ["blast", "blast"],
  ["close quarters", "closeQuarters"],
  ["concealed", "concealed"],
  ["debilitating", "debilitating"],
  ["gatling", "gatling"],
  ["inaccurate", "inaccurate"],
  ["night vision", "nightVision"],
  ["parry", "parry"],
  ["recon", "recon"],
  ["reliable", "reliable"],
  ["suppressed", "suppressed"],
  ["two-handed", "twoHanded"],
  ["unreliable", "unreliable"],
]);

const RANGE_STEPS = ["Melee", "Close (C)", "Medium (M)", "Long (L)", "Extreme (X)"];

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueList = (items) => [...new Set(items.filter(Boolean))];

const normalizeTrait = (value) => String(value || "")
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, " ")
  .replace(/\s+/g, " ");

const removeTrait = (items, trait) => {
  const normalized = normalizeTrait(trait);
  return items.filter((item) => normalizeTrait(item) !== normalized);
};

const addTrait = (state, trait) => {
  const normalized = normalizeTrait(trait);
  const piercing = normalized.match(/^piercing\s+(\d+)$/);

  if (piercing) {
    state.effects = removeTrait(state.effects, `piercing ${piercing[1]}`);
    state.effects.push(`piercing ${piercing[1]}`);
    return;
  }

  const effectKey = EFFECT_KEYS.get(normalized);
  if (effectKey) {
    state.effects.push(effectKey);
    return;
  }

  const qualityKey = QUALITY_KEYS.get(normalized);
  if (qualityKey) state.qualities.push(qualityKey);
};

const increasePiercing = (state, amount) => {
  let current = 0;
  state.effects = state.effects.filter((item) => {
    const match = normalizeTrait(item).match(/^piercing\s+(\d+)$/);
    if (!match) return true;
    current = Math.max(current, Number(match[1]));
    return false;
  });
  state.effects.push(`piercing ${current + amount}`);
};

const deleteTrait = (state, trait) => {
  const normalized = normalizeTrait(trait);
  const effectKey = EFFECT_KEYS.get(normalized) || normalized;
  const qualityKey = QUALITY_KEYS.get(normalized) || normalized;
  state.effects = removeTrait(state.effects, effectKey);
  state.qualities = removeTrait(state.qualities, qualityKey);
};

const changeRange = (range, delta) => {
  const normalized = String(range || "").trim().toUpperCase();
  const aliases = {
    MELEE: 0,
    C: 1,
    "CLOSE (C)": 1,
    M: 2,
    "MEDIUM (M)": 2,
    L: 3,
    "LONG (L)": 3,
    X: 4,
    "EXTREME (X)": 4,
  };
  const current = aliases[normalized];
  if (current === undefined) return range;
  return RANGE_STEPS[Math.max(0, Math.min(RANGE_STEPS.length - 1, current + delta))];
};

const extractTraitList = (text) => text
  .replace(/^(gain|remove)\s+/i, "")
  .split(/,|\band\b/i)
  .map((item) => item.trim())
  .filter(Boolean);

const applyEffectText = (state, text) => {
  const source = String(text || "");

  const fixedDamage = source.match(/damage\s+(?:becomes|to)\s+(\d+)/i);
  if (fixedDamage) {
    state.damage = Number(fixedDamage[1]);
  } else {
    for (const match of source.matchAll(/([+-]\d+)\s+damage/gi)) {
      state.damage += Number(match[1]);
    }
  }

  for (const match of source.matchAll(/([+-]\d+)\s+Fire Rate/gi)) {
    state.rate += Number(match[1]);
  }

  const sharedDamageAndRate = source.match(/([+-]\d+)\s+damage\s+and\s+Fire Rate/i);
  if (sharedDamageAndRate) state.rate += Number(sharedDamageAndRate[1]);

  const rangeUp = source.match(/increase Range by (\d+) step/i);
  const rangeDown = source.match(/reduce Range by (\d+) step/i);
  if (rangeUp) state.range = changeRange(state.range, Number(rangeUp[1]));
  if (rangeDown) state.range = changeRange(state.range, -Number(rangeDown[1]));

  const damageType = source.match(/damage (?:type )?(?:becomes|to)\s+(Physical|Energy|Radiation|Poison)/i);
  if (damageType) state.type = damageType[1].toLowerCase();

  const ammo = source.match(/ammo becomes\s+([^;]+)/i);
  if (ammo) state.ammo = ammo[1].trim();

  for (const part of source.split(";")) {
    const trimmed = part.trim();
    if (/^gain\s+/i.test(trimmed)) {
      extractTraitList(trimmed).forEach((trait) => addTrait(state, trait));
    }
    if (/^remove\s+/i.test(trimmed)) {
      extractTraitList(trimmed).forEach((trait) => deleteTrait(state, trait));
    }
    if (/^add\s+/i.test(trimmed)) {
      const piercing = trimmed.match(/Piercing\s+(\d+)/i);
      if (piercing) increasePiercing(state, Number(piercing[1]));
    }
  }
};

export function findWeaponMod(weapon, slot, name) {
  return (getWeaponModGroups(weapon)[slot] || []).find((item) => item.name === name);
}

export function getSelectedWeaponMods(weapon) {
  return Object.entries(weapon?.mods || {})
    .map(([slot, name]) => findWeaponMod(weapon, slot, name))
    .filter(Boolean);
}

export function applyWeaponMods(weapon) {
  const selectedMods = getSelectedWeaponMods(weapon);
  const state = {
    ...weapon,
    damage: toNumber(weapon?.damage),
    rate: toNumber(weapon?.rate),
    weight: toNumber(weapon?.weight),
    cost: toNumber(weapon?.cost),
    range: weapon?.range || "",
    type: weapon?.type || "physical",
    ammo: weapon?.ammo || "",
    effects: Array.isArray(weapon?.effects) ? [...weapon.effects] : [],
    qualities: Array.isArray(weapon?.qualities) ? [...weapon.qualities] : [],
    appliedMods: selectedMods,
  };

  selectedMods.forEach((selectedMod) => {
    state.weight += toNumber(selectedMod.weight);
    state.cost += toNumber(selectedMod.cost);
    applyEffectText(state, selectedMod.effect);
  });

  state.damage = Math.max(0, state.damage);
  state.rate = Math.max(0, state.rate);
  state.weight = Math.max(0, state.weight);
  state.cost = Math.max(0, state.cost);
  state.effects = uniqueList(state.effects);
  state.qualities = uniqueList(state.qualities);

  return state;
}
