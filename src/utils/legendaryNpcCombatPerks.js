import { normalizeStructuredAttack, normalizeWeaponAttack, parseAttackText } from "./npcCombat.js";

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function norm(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function attackSkill(attack = {}) {
  return norm(attack.skill || attack.weaponType);
}

function attackName(attack = {}) {
  return norm(attack.name);
}

function attackQualities(attack = {}) {
  return norm([attack.qualities, attack.effects, attack.effect].filter(Boolean).join(" "));
}

function isRanged(attack = {}) {
  const skill = attackSkill(attack);
  return ["small guns", "energy weapons", "big guns", "explosives", "throwing"].includes(skill);
}

function isNonHeavyRanged(attack = {}) {
  return ["small guns", "energy weapons"].includes(attackSkill(attack));
}

function isMelee(attack = {}) {
  const skill = attackSkill(attack);
  return skill === "melee weapons" || skill === "unarmed" || skill === "melee";
}

function isUnarmed(attack = {}) {
  const skill = attackSkill(attack);
  const name = attackName(attack);
  return skill === "unarmed" || /(boxing glove|deathclaw gauntlet|knuckles|power fist)/.test(name);
}

function isTwoHanded(attack = {}) {
  return /two handed|two-handed/.test(attackQualities(attack));
}

function isShotgun(attack = {}) {
  return /shotgun/.test(attackName(attack));
}

function isBlast(attack = {}) {
  return /blast/.test(attackQualities(attack)) || attackSkill(attack) === "explosives";
}

function isFire(attack = {}) {
  return /(flamer|incinerator|shishkebab|molotov|flaming|incendiary|fire)/.test([attackName(attack), attackQualities(attack)].join(" "));
}

function isBladedMelee(attack = {}) {
  return isMelee(attack) && /(sword|knife|machete|ripper|shishkebab|switchblade|blade)/.test(attackName(attack));
}

function effectList(value) {
  return String(value || "").split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
}

function addEffect(attack, effect) {
  const effects = effectList(attack.effects);
  if (!effects.some((item) => norm(item) === norm(effect))) effects.push(effect);
  return { ...attack, effects: effects.join(", ") };
}

function addPiercing(attack, amount = 1) {
  const effects = effectList(attack.effects);
  let current = 0;
  const rest = [];
  effects.forEach((effect) => {
    const match = norm(effect).match(/^piercing\s*(\d+)$/);
    if (match) current = Math.max(current, Number(match[1] || 0));
    else rest.push(effect);
  });
  rest.push(`Piercing ${current + amount}`);
  return { ...attack, effects: rest.join(", ") };
}

function addDamage(attack, amount = 1) {
  return { ...attack, damageDice: Math.max(0, num(attack.damageDice ?? attack.damage, 0) + amount) };
}

export const LEGENDARY_NPC_COMBAT_PERKS = [
  {
    id: "commando", name: "Commando", category: "attack",
    description: "High-fire-rate Small Guns or Energy Weapons gain +1 CD.",
    applies: (attack) => isNonHeavyRanged(attack) && num(attack.rate, 0) >= 3,
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "gunslinger", name: "Gunslinger", category: "attack",
    description: "One-handed low-fire-rate Small Guns or Energy Weapons gain +1 CD.",
    applies: (attack) => isNonHeavyRanged(attack) && !isTwoHanded(attack) && num(attack.rate, 0) <= 2,
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "rifleman", name: "Rifleman", category: "attack",
    description: "Two-handed low-fire-rate Small Guns or Energy Weapons gain +1 CD.",
    applies: (attack) => isNonHeavyRanged(attack) && isTwoHanded(attack) && num(attack.rate, 0) <= 2,
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "laser_commander", name: "Laser Commander", category: "attack",
    description: "Energy Weapons gain +1 CD.",
    applies: (attack) => attackSkill(attack) === "energy weapons",
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "size_matters", name: "Size Matters", category: "attack",
    description: "Big Guns gain +1 CD.",
    applies: (attack) => attackSkill(attack) === "big guns",
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "iron_fist", name: "Iron Fist", category: "attack",
    description: "Unarmed attacks gain +1 CD.",
    applies: isUnarmed,
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "big_leagues", name: "Big Leagues", category: "attack",
    description: "Two-handed melee attacks gain Vicious.",
    applies: (attack) => isMelee(attack) && isTwoHanded(attack),
    applyAttack: (attack) => addEffect(attack, "Vicious"),
  },
  {
    id: "shotgun_surgeon", name: "Shotgun Surgeon", category: "attack",
    description: "Shotguns gain Piercing +1.",
    applies: isShotgun,
    applyAttack: (attack) => addPiercing(attack, 1),
  },
  {
    id: "piercing_strike", name: "Piercing Strike", category: "attack",
    description: "Unarmed or bladed melee attacks gain Piercing +1.",
    applies: (attack) => isUnarmed(attack) || isBladedMelee(attack),
    applyAttack: (attack) => addPiercing(attack, 1),
  },
  {
    id: "demolition_expert", name: "Demolition Expert", category: "attack",
    description: "Blast attacks gain Vicious.",
    applies: isBlast,
    applyAttack: (attack) => addEffect(attack, "Vicious"),
  },
  {
    id: "pyromaniac", name: "Pyromaniac", category: "attack",
    description: "Fire-based attacks gain +1 CD.",
    applies: isFire,
    applyAttack: (attack) => addDamage(attack, 1),
  },
  {
    id: "toughness", name: "Toughness", category: "resistance",
    description: "Physical DR +1.",
    statBonus: { physical: 1 },
  },
  {
    id: "refractor", name: "Refractor", category: "resistance",
    description: "Energy DR +1.",
    statBonus: { energy: 1 },
  },
  {
    id: "rad_resistance", name: "Rad Resistance", category: "resistance",
    description: "Radiation DR +1.",
    statBonus: { radiation: 1 },
  },
  {
    id: "snakeater", name: "Snakeater", category: "resistance",
    description: "Poison DR +2.",
    statBonus: { poison: 2 },
  },
];

function normalizedAttacks(stats = {}) {
  return [
    ...parseAttackText(stats.attacks || ""),
    ...(Array.isArray(stats.customAttacks) ? stats.customAttacks.map(normalizeStructuredAttack) : []),
    ...(Array.isArray(stats.weapons) ? stats.weapons.map(normalizeWeaponAttack) : []),
  ];
}

export function eligibleLegendaryNpcCombatPerks(stats = {}) {
  const attacks = normalizedAttacks(stats);
  return LEGENDARY_NPC_COMBAT_PERKS.filter((perk) => {
    if (perk.category === "resistance") return true;
    return attacks.some((attack) => perk.applies?.(attack));
  });
}

export function chooseLegendaryNpcCombatPerks(stats = {}, seed = "", salt = "", count = 2) {
  const pool = eligibleLegendaryNpcCombatPerks(stats);
  const picked = [];
  const available = [...pool];
  for (let index = 0; index < count && available.length; index += 1) {
    const position = hashSeed(`${seed}:${salt}:legendary-npc-perk:${index}`) % available.length;
    picked.push(available.splice(position, 1)[0]);
  }
  return picked;
}

function attackKey(attack = {}) {
  return norm(attack.name) || [num(attack.targetNumber, 0), num(attack.damageDice, 0), norm(attack.damageType)].join("|");
}

function applyPerksToAttack(attack, perks) {
  return perks.reduce((current, perk) => {
    if (perk.category !== "attack" || !perk.applies?.(current)) return current;
    return perk.applyAttack ? perk.applyAttack(current) : current;
  }, normalizeStructuredAttack(attack));
}

function attackLine(attack = {}) {
  const parts = [
    `${attack.attribute || "BODY"} + ${attack.skill || "Combat"} (TN ${num(attack.targetNumber, 0)})`,
    `${num(attack.damageDice, 0)} CD ${attack.effects ? `${attack.effects} ` : ""}${attack.damageType || "Physical"} damage`,
  ];
  if (attack.range) parts.push(`Range ${attack.range}`);
  if (num(attack.rate, 0) > 0) parts.push(`FR ${num(attack.rate, 0)}`);
  if (attack.qualities) parts.push(attack.qualities);
  return `• ${String(attack.name || "Attack").toUpperCase()} — ${parts.join(", ")}`;
}

export function applyLegendaryNpcCombatPerks(stats = {}, perks = []) {
  if (!perks.length) return { ...stats, legendaryPerks: [] };

  const parsed = parseAttackText(stats.attacks || "");
  const custom = Array.isArray(stats.customAttacks) ? stats.customAttacks.map(normalizeStructuredAttack) : [];
  const weapons = Array.isArray(stats.weapons) ? stats.weapons.map(normalizeWeaponAttack) : [];

  const transformed = new Map();
  [...parsed, ...custom, ...weapons].forEach((attack) => {
    const key = attackKey(attack);
    if (!transformed.has(key)) transformed.set(key, applyPerksToAttack(attack, perks));
  });

  const nextParsed = parsed.map((attack) => transformed.get(attackKey(attack)) || attack);
  const nextCustom = custom.map((attack) => transformed.get(attackKey(attack)) || attack);
  const nextWeapons = weapons.map((attack) => ({ ...attack, ...(transformed.get(attackKey(attack)) || attack) }));

  const resistance = { ...(stats.legendaryPerkResistance || {}) };
  perks.forEach((perk) => {
    Object.entries(perk.statBonus || {}).forEach(([key, value]) => {
      resistance[key] = num(resistance[key], 0) + num(value, 0);
    });
  });

  const descriptions = perks.map((perk) => ({
    id: perk.id,
    name: perk.name,
    category: perk.category,
    description: perk.description,
  }));

  return {
    ...stats,
    attacks: nextParsed.map(attackLine).join("\n"),
    customAttacks: nextCustom,
    weapons: nextWeapons,
    legendaryPerks: descriptions,
    legendaryPerkResistance: resistance,
    physicalDrBonus: num(stats.physicalDrBonus, 0) + num(resistance.physical, 0),
    energyDrBonus: num(stats.energyDrBonus, 0) + num(resistance.energy, 0),
    radiationDrBonus: num(stats.radiationDrBonus, 0) + num(resistance.radiation, 0),
    poisonDrBonus: num(stats.poisonDrBonus, 0) + num(resistance.poison, 0),
  };
}

export function legendaryNpcUsesPerks(seed = "", salt = "") {
  return (hashSeed(`${seed}:${salt}:legendary-npc-mode`) & 1) === 1;
}
