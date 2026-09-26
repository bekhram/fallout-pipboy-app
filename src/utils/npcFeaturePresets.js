export const SPECIAL_CREATURE_FEATURES = [
  {
    id: "alpha",
    name: "Alpha",
    summary: "Pack-leader creature template.",
    effect: "The creature is one level higher than normal. Increase either Body or Mind by +1, increase one skill by +1, adjust Initiative if needed, and gain either +1 HP (+2 if Body increased), +1 DR of one type on all locations, or +1 CD to one attack. It also gains Aggressive and Leader of the Pack.",
    requirements: { creatureOnly: true },
  },
  {
    id: "glowing",
    name: "Glowing",
    summary: "Radiation-saturated creature template.",
    effect: "Gains Glowing and Immune to Radiation. At the start of each turn it inflicts 2 CD Radiation damage to everyone within Reach. Melee attacks gain Radioactive; if already Radioactive they instead inflict +2 Radiation damage per Effect rolled.",
    requirements: { creatureOnly: true, nonRobot: true },
  },
  {
    id: "rabid",
    name: "Rabid",
    summary: "Diseased feral creature template.",
    effect: "Gains Feral and Rabid. Melee attacks gain Persistent (Poison). Poison damage from its attacks counts as two exposures to disease.",
    requirements: { creatureOnly: true, nonRobot: true },
  },
  {
    id: "scorched",
    name: "Scorched",
    summary: "Scorched Plague creature/character template.",
    effect: "Gains the Scorched ability, becoming driven by instinct and aggression against the uninfected and functioning as part of a hive mind. Scorched attacks count as exposure to disease.",
    requirements: { nonRobot: true, nonMutatedHumanCharacter: true },
  },
];

export const LEGENDARY_CREATURE_ABILITIES = [
  {
    id: "cruel",
    name: "Cruel",
    summary: "Thrives on critical hits and becomes more vicious after mutation.",
    effect: "Gain 1 Luck point each time this creature inflicts a critical hit.",
    mutation: "All attacks gain Vicious. If an attack already has Vicious, that attack instead gains +2 CD.",
  },
  {
    id: "explosive",
    name: "Explosive",
    summary: "Becomes dangerously unstable after mutation.",
    effect: "No effect under normal circumstances.",
    mutation: "All melee attacks gain Radioactive. At 0 HP the creature explodes, inflicting 12 CD Radiation damage to everyone within Close range; salvage/butchery tests increase in difficulty by +2.",
  },
  {
    id: "legendary_damage",
    name: "Legendary Damage",
    summary: "One chosen attack is exceptionally deadly.",
    effect: "Choose one attack. It gains +3 CD. If it is a ranged weapon with Fire Rate 1+, it may use Let Rip once more per scene.",
    mutation: "The chosen attack can be used for an extra major action for only 1 AP, without the normal difficulty increase if the second major action is also an attack. Let Rip refreshes on mutation.",
  },
  {
    id: "legendary_proficiency",
    name: "Legendary Proficiency",
    summary: "Characters-only mastery of one Tag skill.",
    effect: "Choose one Tag skill. Tests using it gain 1 automatic success.",
    mutation: "Tests using the chosen Tag skill gain 2 automatic successes instead of 1.",
    characterOnly: true,
  },
  {
    id: "radioactive",
    name: "Radioactive",
    summary: "Highly irradiated legendary creature.",
    effect: "Immune to Radiation damage. All melee attacks gain Radioactive.",
    mutation: "At the start of a creature's turn, if it is within Close range of this creature, it suffers 5 CD Piercing 1 Radiation damage.",
  },
  {
    id: "rage_heal",
    name: "Rage Heal",
    summary: "Rapidly regenerates in battle.",
    effect: "Regain 3 HP at the start of each turn.",
    mutation: "Immediately heal back to maximum HP.",
  },
  {
    id: "scarred",
    name: "Scarred",
    summary: "Exceptionally resilient legendary creature.",
    effect: "Physical DR and Energy DR are both increased by +2.",
    mutation: "Roll 1 CD for each Injury suffered; on an Effect that Injury is removed. Physical DR and Energy DR then increase by another +2 for the rest of the scene.",
  },
  {
    id: "stalker",
    name: "Stalker",
    summary: "Stealth-focused legendary creature.",
    effect: "Gain 1 automatic success on Sneak tests, +2 Initiative, and +1 Defense while in shadow, darkness, or similar concealment.",
    mutation: "Become invisible as if using a Stealth Boy for the remainder of the scene.",
  },
  {
    id: "toxic",
    name: "Toxic",
    summary: "Venomous legendary creature.",
    effect: "Melee attacks gain Persistent (Poison), plus one chosen damage effect: Radioactive, Stun, or Vicious.",
    mutation: "Anyone within Reach at the start of their turn suffers 5 CD Poison damage, also using the chosen damage effect.",
  },
  {
    id: "tyrant",
    name: "Tyrant",
    summary: "Dominates others of its kind and brings reinforcements.",
    effect: "Accompanied by Normal creatures of the same type: +1 if same level, +2 if 1–2 levels lower, +3 if 3+ levels lower.",
    mutation: "Additional reinforcements of the same type arrive in the same number as the extra creatures above.",
  },
];

function featureHash(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function sourceText(entry = {}) {
  return [
    entry?.name,
    entry?.creatureType,
    entry?.category,
    entry?.cardKind,
    entry?.statKind,
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
  ].filter(Boolean).join(" ").toLowerCase();
}

function isRobot(entry = {}) {
  return /robot|robotic|turret|sentry|protectron|assaultron|eyebot|mister handy|mister gutsy|synth/.test(sourceText(entry));
}

function isCharacter(entry = {}) {
  return String(entry?.statKind || "").toLowerCase() === "character"
    || String(entry?.cardKind || "").toLowerCase() === "npc";
}

function isMutatedHumanCharacter(entry = {}) {
  if (!isCharacter(entry)) return false;
  return /super mutant|mutated human|ghoul|nightkin|mutant human/.test(sourceText(entry));
}

export function specialFeatureById(id) {
  return SPECIAL_CREATURE_FEATURES.find((item) => item.id === String(id || "")) || null;
}

export function legendaryAbilityById(id) {
  return LEGENDARY_CREATURE_ABILITIES.find((item) => item.id === String(id || "")) || null;
}

export function specialFeaturesFor(entry = {}) {
  return SPECIAL_CREATURE_FEATURES.filter((item) => {
    const req = item.requirements || {};
    if (req.creatureOnly && isCharacter(entry)) return false;
    if (req.nonRobot && isRobot(entry)) return false;
    if (req.nonMutatedHumanCharacter && isMutatedHumanCharacter(entry)) return false;
    return true;
  });
}

export function legendaryAbilitiesFor(kind = "creature") {
  return LEGENDARY_CREATURE_ABILITIES.filter((item) => !item.characterOnly || kind === "npc");
}

export function randomSpecialFeatureFor({ entry = {}, seed = "", salt = "" } = {}) {
  const pool = specialFeaturesFor(entry);
  if (!pool.length) return null;
  return pool[featureHash(`${seed}:${salt}:special-creature-template`) % pool.length] || null;
}

export function randomLegendaryAbilityFor({ kind = "creature", seed = "", salt = "" } = {}) {
  const pool = legendaryAbilitiesFor(kind);
  if (!pool.length) return null;
  return pool[featureHash(`${seed}:${salt}:${kind}:legendary-creature-property`) % pool.length] || null;
}

export function formatSpecialFeature(feature) {
  if (!feature) return "";
  return [feature.name, feature.effect].filter(Boolean).join(" — ");
}

export function formatLegendaryAbility(ability) {
  if (!ability) return "";
  const parts = [ability.name];
  if (ability.effect) parts.push(`Effect: ${ability.effect}`);
  if (ability.mutation) parts.push(`Mutation: ${ability.mutation}`);
  return parts.join(" — ");
}
