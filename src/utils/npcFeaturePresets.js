export const SPECIAL_CREATURE_FEATURES = [
  { id: "alpha", name: "Alpha", summary: "Pack leader profile with stronger leadership-oriented combat stats." },
  { id: "glowing", name: "Glowing", summary: "Radiation-charged creature with radiation-focused passive effects." },
  { id: "rabid", name: "Rabid", summary: "Feral disease profile with poison-focused melee effects." },
  { id: "scorched", name: "Scorched", summary: "Aggressive hive-minded profile with altered behavior and attack traits." },
];

export const LEGENDARY_CREATURE_ABILITIES = [
  { id: "cruel", name: "Cruel", summary: "Critical hits fuel the creature; mutation strengthens its offensive effects." },
  { id: "explosive", name: "Explosive", summary: "Mutation makes the creature dangerously unstable and radiation-focused." },
  { id: "legendary_damage", name: "Legendary Damage", summary: "One chosen attack becomes significantly more dangerous." },
  { id: "legendary_proficiency", name: "Legendary Proficiency", summary: "NPC-only mastery option for one chosen specialty.", npcOnly: true },
  { id: "radioactive", name: "Radioactive", summary: "Radiation immunity and radiation-focused melee effects." },
  { id: "rage_heal", name: "Rage Heal", summary: "Regenerates during battle and gains a powerful recovery mutation." },
  { id: "scarred", name: "Scarred", summary: "Extremely resilient profile with improved physical and energy protection." },
  { id: "stalker", name: "Stalker", summary: "Stealth-focused profile with initiative and concealment advantages." },
  { id: "toxic", name: "Toxic", summary: "Poison-focused attacks and a dangerous toxic mutation." },
  { id: "tyrant", name: "Tyrant", summary: "Dominant leader profile that fights alongside supporting creatures." },
];

export function specialFeatureById(id) {
  return SPECIAL_CREATURE_FEATURES.find((item) => item.id === String(id || "")) || null;
}

export function legendaryAbilityById(id) {
  return LEGENDARY_CREATURE_ABILITIES.find((item) => item.id === String(id || "")) || null;
}

export function legendaryAbilitiesFor(kind = "creature") {
  return LEGENDARY_CREATURE_ABILITIES.filter((item) => !item.npcOnly || kind === "npc");
}
