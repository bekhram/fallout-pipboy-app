export const SPECIAL_KEYS = ["S", "P", "E", "C", "I", "A", "L"];
export const SKILL_ATTRIBUTE_OPTIONS = ["S", "P", "E", "C", "I", "A", "L"];

export const WEAPON_EFFECT_OPTIONS = [
  {
    key: "persistent",
    name: "Persistent",
    nameKey: "weaponEffects.persistent.name",
    description:
      "If effects are rolled, the target takes the weapon’s damage again at the end of future turns for several rounds. They can use an action to try to stop it early.",
    descriptionKey: "weaponEffects.persistent.description",
  },
  {
    key: "piercing 1",
    name: "Piercing 1",
    nameKey: "weaponEffects.piercing1.name",
    description:
      "Each effect ignores part of the target’s DR. The ignored amount depends on the weapon’s Piercing rating.",
    descriptionKey: "weaponEffects.piercing1.description",
  },
  {
    key: "piercing 2",
    name: "Piercing 2",
    nameKey: "weaponEffects.piercing2.name",
    description:
      "Each effect ignores part of the target’s DR. The ignored amount depends on the weapon’s Piercing rating.",
    descriptionKey: "weaponEffects.piercing2.description",
  },
  {
    key: "piercing 3",
    name: "Piercing 3",
    nameKey: "weaponEffects.piercing3.name",
    description:
      "Each effect ignores part of the target’s DR. The ignored amount depends on the weapon’s Piercing rating.",
    descriptionKey: "weaponEffects.piercing3.description",
  },
  {
    key: "piercing 4",
    name: "Piercing 4",
    nameKey: "weaponEffects.piercing4.name",
    description:
      "Each effect ignores part of the target’s DR. The ignored amount depends on the weapon’s Piercing rating.",
    descriptionKey: "weaponEffects.piercing4.description",
  },
  {
    key: "radioactive",
    name: "Radioactive",
    nameKey: "weaponEffects.radioactive.name",
    description:
      "Each effect also adds extra radiation damage, resolved separately after the main hit.",
    descriptionKey: "weaponEffects.radioactive.description",
  },
  {
    key: "spread",
    name: "Spread",
    nameKey: "weaponEffects.spread.name",
    description:
      "Each effect creates an extra hit on the same target. Extra hits deal half damage and strike random locations.",
    descriptionKey: "weaponEffects.spread.description",
  },
  {
    key: "stun",
    name: "Stun",
    nameKey: "weaponEffects.stun.name",
    description:
      "If at least one effect is rolled, the target loses their normal actions on their next turn.",
    descriptionKey: "weaponEffects.stun.description",
  },
  {
    key: "vicious",
    name: "Vicious",
    nameKey: "weaponEffects.vicious.name",
    description: "Each effect increases the total damage dealt.",
    descriptionKey: "weaponEffects.vicious.description",
  },
  {
    key: "burst",
    name: "Burst",
    nameKey: "weaponEffects.burst.name",
    description:
      "Each effect can hit another target near the main one, spending additional ammunition.",
    descriptionKey: "weaponEffects.burst.description",
  },
  {
    key: "breaking",
    name: "Breaking",
    nameKey: "weaponEffects.breaking.name",
    description:
      "Each effect weakens cover or, if there is no cover, reduces DR on the struck location for the weapon’s damage type.",
    descriptionKey: "weaponEffects.breaking.description",
  },
];

export const WEAPON_QUALITY_OPTIONS = [
  {
    key: "accurate",
    name: "Accurate",
    nameKey: "weaponQualities.accurate.name",
    description:
      "Works best when aimed carefully. You can spend AP after aiming to add extra damage dice.",
    descriptionKey: "weaponQualities.accurate.description",
  },
  {
    key: "blast",
    name: "Blast",
    nameKey: "weaponQualities.blast.name",
    description:
      "Targets a whole zone instead of one enemy. On failure, it still deals reduced area damage.",
    descriptionKey: "weaponQualities.blast.description",
  },
  {
    key: "closeQuarters",
    name: "Close Quarters",
    nameKey: "weaponQualities.closeQuarters.name",
    description:
      "Does not suffer extra difficulty when used within reach of an enemy.",
    descriptionKey: "weaponQualities.closeQuarters.description",
  },
  {
    key: "concealed",
    name: "Concealed",
    nameKey: "weaponQualities.concealed.name",
    description:
      "Easy to hide unless openly carried or found during a proper search.",
    descriptionKey: "weaponQualities.concealed.description",
  },
  {
    key: "debilitating",
    name: "Debilitating",
    nameKey: "weaponQualities.debilitating.name",
    description: "Injuries caused by this weapon are harder to treat.",
    descriptionKey: "weaponQualities.debilitating.description",
  },
  {
    key: "gatling",
    name: "Gatling",
    nameKey: "weaponQualities.gatling.name",
    description:
      "Consumes ammo in large bursts and gains stronger bonus damage when extra ammo is spent.",
    descriptionKey: "weaponQualities.gatling.description",
  },
  {
    key: "inaccurate",
    name: "Inaccurate",
    nameKey: "weaponQualities.inaccurate.name",
    description: "Gets no benefit from aiming.",
    descriptionKey: "weaponQualities.inaccurate.description",
  },
  {
    key: "mine",
    name: "Mine",
    nameKey: "weaponQualities.mine.name",
    description:
      "Can be placed and primed to damage creatures that move close to it.",
    descriptionKey: "weaponQualities.mine.description",
  },
  {
    key: "nightVision",
    name: "Night Vision",
    nameKey: "weaponQualities.nightVision.name",
    description: "Aiming ignores darkness penalties.",
    descriptionKey: "weaponQualities.nightVision.description",
  },
  {
    key: "parry",
    name: "Parry",
    nameKey: "weaponQualities.parry.name",
    description:
      "Can improve your Defense against incoming melee attacks by spending AP.",
    descriptionKey: "weaponQualities.parry.description",
  },
  {
    key: "recon",
    name: "Recon",
    nameKey: "weaponQualities.recon.name",
    description:
      "After aiming, the next ally attacking that target gains a re-roll benefit.",
    descriptionKey: "weaponQualities.recon.description",
  },
  {
    key: "reliable",
    name: "Reliable",
    nameKey: "weaponQualities.reliable.name",
    description:
      "Ignores the first complication rolled with that weapon in each combat encounter.",
    descriptionKey: "weaponQualities.reliable.description",
  },
  {
    key: "suppressed",
    name: "Suppressed",
    nameKey: "weaponQualities.suppressed.name",
    description: "Harder for enemies to notice when fired from stealth.",
    descriptionKey: "weaponQualities.suppressed.description",
  },
  {
    key: "thrown",
    name: "Thrown",
    nameKey: "weaponQualities.thrown.name",
    description:
      "Can be used as a ranged attack with a listed throwing range.",
    descriptionKey: "weaponQualities.thrown.description",
  },
  {
    key: "twoHanded",
    name: "Two-Handed",
    nameKey: "weaponQualities.twoHanded.name",
    description:
      "Needs both hands for normal use. One-handed attacks are much harder.",
    descriptionKey: "weaponQualities.twoHanded.description",
  },
  {
    key: "unreliable",
    name: "Unreliable",
    nameKey: "weaponQualities.unreliable.name",
    description: "Raises the chance of complications when used.",
    descriptionKey: "weaponQualities.unreliable.description",
  },
];

export const SKILL_KEYS = [
  "Athletics",
  "Barter",
  "Big Guns",
  "Energy Weapons",
  "Explosives",
  "Lockpick",
  "Medicine",
  "Melee Weapons",
  "Pilot",
  "Repair",
  "Science",
  "Small Guns",
  "Sneak",
  "Speech",
  "Survival",
  "Throwing",
  "Unarmed",
];

export const SKILL_LABEL_KEYS = {
  Athletics: "skillNames.athletics",
  Barter: "skillNames.barter",
  "Big Guns": "skillNames.bigGuns",
  "Energy Weapons": "skillNames.energyWeapons",
  Explosives: "skillNames.explosives",
  Lockpick: "skillNames.lockpick",
  Medicine: "skillNames.medicine",
  "Melee Weapons": "skillNames.meleeWeapons",
  Pilot: "skillNames.pilot",
  Repair: "skillNames.repair",
  Science: "skillNames.science",
  "Small Guns": "skillNames.smallGuns",
  Sneak: "skillNames.sneak",
  Speech: "skillNames.speech",
  Survival: "skillNames.survival",
  Throwing: "skillNames.throwing",
  Unarmed: "skillNames.unarmed",
};

export const SKILL_DEFAULT_ATTRIBUTES = {
  Athletics: "S",
  Barter: "C",
  "Big Guns": "E",
  "Energy Weapons": "P",
  Explosives: "P",
  Lockpick: "P",
  Medicine: "I",
  "Melee Weapons": "S",
  Pilot: "P",
  Repair: "I",
  Science: "I",
  "Small Guns": "A",
  Sneak: "A",
  Speech: "C",
  Survival: "E",
  Throwing: "A",
  Unarmed: "S",
};

export const CHEM_ADDICTION_RULES = {
  buffoutAddiction: {
    suppressedBy: ["buffout", "buffjet", "bufftats"],
    affectedTests: ["S", "E"],
    effectText: "Increase difficulty of STR and END tests by +1 when not under a Buffout-type effect.",
  },
  mentatAddiction: {
    suppressedBy: ["mentats", "berryMentats", "grapeMentats", "orangeMentats"],
    affectedTests: ["C"],
    effectText: "Increase difficulty of CHA tests by +1 when not under a Mentats-type effect.",
  },
  calmexAddiction: {
    suppressedBy: ["calmex"],
    affectedTests: ["A"],
    effectText: "AGI tests suffer complications on 18+ when not under Calmex.",
  },
  daddyOAddiction: {
    suppressedBy: ["daddyO"],
    affectedTests: ["P", "I"],
    effectText: "Increase difficulty of PER and INT tests by +1 when not under Daddy-O.",
  },
  dayTripperAddiction: {
    suppressedBy: ["dayTripper"],
    affectedTests: ["C", "L"],
    effectText: "Increase difficulty of CHA and LCK tests by +1 when not under Day Tripper.",
  },
  furyAddiction: {
    suppressedBy: ["fury"],
    affectedTests: ["S", "P"],
    effectText: "Increase difficulty of STR and PER tests by +1 when not under Fury.",
  },
  jetAddiction: {
    suppressedBy: ["jet", "jetFuel"],
    affectedTests: ["A"],
    effectText: "Increase difficulty of AGI tests by +1 when not under a Jet-type effect.",
  },
  medXAddiction: {
    suppressedBy: ["medX"],
    affectedTests: ["A"],
    extraEffects: ["plus1PhysicalDamageTaken"],
    effectText: "Increase difficulty of AGI tests by +1 and take +1 CD physical damage when not under Med-X.",
  },
  overdriveAddiction: {
    suppressedBy: ["overdrive"],
    affectedTests: ["S", "A"],
    effectText: "Increase difficulty of STR and AGI tests by +1 when not under Overdrive.",
  },
  psychoAddiction: {
    suppressedBy: ["psycho", "psychoJet", "psychobuff", "psychotats"],
    affectedTests: ["S"],
    extraEffects: ["plus1PhysicalDamageTaken"],
    effectText: "Increase difficulty of STR tests by +1 and take +1 CD physical damage when not under a Psycho-type effect.",
  },
  ultraJetAddiction: {
    suppressedBy: ["ultraJet"],
    affectedTests: ["A"],
    extraEffects: ["minus1GeneratedAP"],
    permanent: true,
    effectText: "Increase difficulty of AGI tests by +1 and generate 1 fewer AP on successful tests when not under Ultra Jet.",
  },
  xCellAddiction: {
    suppressedBy: ["xCell"],
    affectedTests: ["ALL"],
    effectText: "Increase difficulty of all tests by +1 when not under X-Cell.",
  },
};

export const ARMOR_PARTS = [
  "Head",
  "Left Arm",
  "Right Arm",
  "Torso",
  "Left Leg",
  "Right Leg",
];

export const ARMOR_PART_LABEL_KEYS = {
  Head: "injuries.head",
  "Left Arm": "injuries.leftArm",
  "Right Arm": "injuries.rightArm",
  Torso: "injuries.torso",
  "Left Leg": "injuries.leftLeg",
  "Right Leg": "injuries.rightLeg",
};

export const INVENTORY_CATEGORIES = [
  { value: "all", label: "All", labelKey: "inventory.categories.all" },
  { value: "weapons", label: "Weapons", labelKey: "inventory.categories.weapons" },
  { value: "ammo", label: "Ammo", labelKey: "inventory.categories.ammo" },
  { value: "aid", label: "Aid", labelKey: "inventory.categories.aid" },
  { value: "food", label: "Food", labelKey: "inventory.categories.food" },
  { value: "misc", label: "Misc", labelKey: "inventory.categories.misc" },
  { value: "junk", label: "Junk", labelKey: "inventory.categories.junk" },
];

export const STATUS_LIST = [
{
  key: "berryMentats",
  nameKey: "statuses.berryMentats.name",
  descriptionKey: "statuses.berryMentats.description",
  durationKey: "statuses.duration.lasting",
  group: "chem",
},
{
  key: "buffjet",
  nameKey: "statuses.buffjet.name",
  descriptionKey: "statuses.buffjet.description",
  durationKey: "statuses.duration.brief",
  group: "chem",
},
{
  key: "buffout",
  nameKey: "statuses.buffout.name",
  descriptionKey: "statuses.buffout.description",
  durationKey: "statuses.duration.lasting",
  group: "chem",
},
{
  key: "bufftats",
  nameKey: "statuses.bufftats.name",
  descriptionKey: "statuses.bufftats.description",
  durationKey: "statuses.duration.lasting",
  group: "chem",
},
{
  key: "calmex",
  nameKey: "statuses.calmex.name",
  descriptionKey: "statuses.calmex.description",
  durationKey: "statuses.duration.lasting",
  group: "chem",
},
{
  key: "daddyO",
  nameKey: "statuses.daddyO.name",
  descriptionKey: "statuses.daddyO.description",
  durationKey: "statuses.duration.lasting",
  group: "chem",
},
  {
    key: "dayTripper",
    nameKey: "statuses.dayTripper.name",
    descriptionKey: "statuses.dayTripper.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "fury",
    nameKey: "statuses.fury.name",
    descriptionKey: "statuses.fury.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "grapeMentats",
    nameKey: "statuses.grapeMentats.name",
    descriptionKey: "statuses.grapeMentats.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "jet",
    nameKey: "statuses.jet.name",
    descriptionKey: "statuses.jet.description",
    durationKey: "statuses.duration.brief",
    group: "chem",
  },
  {
    key: "jetFuel",
    nameKey: "statuses.jetFuel.name",
    descriptionKey: "statuses.jetFuel.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "medX",
    nameKey: "statuses.medX.name",
    descriptionKey: "statuses.medX.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "mentats",
    nameKey: "statuses.mentats.name",
    descriptionKey: "statuses.mentats.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "orangeMentats",
    nameKey: "statuses.orangeMentats.name",
    descriptionKey: "statuses.orangeMentats.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "overdrive",
    nameKey: "statuses.overdrive.name",
    descriptionKey: "statuses.overdrive.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "psycho",
    nameKey: "statuses.psycho.name",
    descriptionKey: "statuses.psycho.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "psychoJet",
    nameKey: "statuses.psychoJet.name",
    descriptionKey: "statuses.psychoJet.description",
    durationKey: "statuses.duration.brief",
    group: "chem",
  },
  {
    key: "psychobuff",
    nameKey: "statuses.psychobuff.name",
    descriptionKey: "statuses.psychobuff.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "psychotats",
    nameKey: "statuses.psychotats.name",
    descriptionKey: "statuses.psychotats.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "radX",
    nameKey: "statuses.radX.name",
    descriptionKey: "statuses.radX.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "radXDiluted",
    nameKey: "statuses.radXDiluted.name",
    descriptionKey: "statuses.radXDiluted.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "skeetoSpit",
    nameKey: "statuses.skeetoSpit.name",
    descriptionKey: "statuses.skeetoSpit.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "ultraJet",
    nameKey: "statuses.ultraJet.name",
    descriptionKey: "statuses.ultraJet.description",
    durationKey: "statuses.duration.brief",
    group: "chem",
  },
  {
    key: "xCell",
    nameKey: "statuses.xCell.name",
    descriptionKey: "statuses.xCell.description",
    durationKey: "statuses.duration.lasting",
    group: "chem",
  },
  {
    key: "prone",
    nameKey: "statuses.prone.name",
    descriptionKey: "statuses.prone.description",
    durationKey: "statuses.duration.untilRemoved",
    group: "negative",
  },
  {
    key: "hidden",
    nameKey: "statuses.hidden.name",
    descriptionKey: "statuses.hidden.description",
    durationKey: "statuses.duration.untilBroken",
    group: "positive",
  },
  {
    key: "persistentDamage",
    nameKey: "statuses.persistentDamage.name",
    descriptionKey: "statuses.persistentDamage.description",
    durationKey: "statuses.duration.untilRemoved",
    group: "negative",
  },
  {
    key: "wellRested",
    nameKey: "statuses.wellRested.name",
    descriptionKey: "statuses.wellRested.description",
    durationKey: "statuses.duration.untilNextSleep",
    group: "positive",
  },
  {
    key: "fatigue",
    nameKey: "statuses.fatigue.name",
    descriptionKey: "statuses.fatigue.description",
    durationKey: "statuses.duration.ongoing",
    group: "negative",
  },
  {
    key: "wellFed",
    nameKey: "statuses.wellFed.name",
    descriptionKey: "statuses.wellFed.description",
    durationKey: "statuses.duration.timeBased",
    group: "positive",
  },
  {
    key: "exposure",
    nameKey: "statuses.exposure.name",
    descriptionKey: "statuses.exposure.description",
    durationKey: "statuses.duration.untilSheltered",
    group: "negative",
  },
  {
    key: "unconscious",
    nameKey: "statuses.unconscious.name",
    descriptionKey: "statuses.unconscious.description",
    durationKey: "statuses.duration.untilRecovered",
    group: "negative",
  },
  {
    key: "dying",
    nameKey: "statuses.dying.name",
    descriptionKey: "statuses.dying.description",
    durationKey: "statuses.duration.critical",
    group: "negative",
  },
  {
    key: "invisible",
    nameKey: "statuses.invisible.name",
    descriptionKey: "statuses.invisible.description",
    durationKey: "statuses.duration.timeBased",
    group: "positive",
  },
  {
    key: "cover",
    nameKey: "statuses.cover.name",
    descriptionKey: "statuses.cover.description",
    durationKey: "statuses.duration.whileActive",
    group: "positive",
  },
  {
    key: "blind",
    nameKey: "statuses.blind.name",
    descriptionKey: "statuses.blind.description",
    durationKey: "statuses.duration.untilRemoved",
    group: "negative",
  },
  {
    key: "deaf",
    nameKey: "statuses.deaf.name",
    descriptionKey: "statuses.deaf.description",
    durationKey: "statuses.duration.untilRemoved",
    group: "negative",
  },
  {
    key: "fear",
    nameKey: "statuses.fear.name",
    descriptionKey: "statuses.fear.description",
    durationKey: "statuses.duration.timeBased",
    group: "negative",
  },
  {
    key: "grappled",
    nameKey: "statuses.grappled.name",
    descriptionKey: "statuses.grappled.description",
    durationKey: "statuses.duration.untilFreed",
    group: "negative",
  },
  {
    key: "stunned",
    nameKey: "statuses.stunned.name",
    descriptionKey: "statuses.stunned.description",
    durationKey: "statuses.duration.short",
    group: "negative",
  },
  {
    key: "paralyzed",
    nameKey: "statuses.paralyzed.name",
    descriptionKey: "statuses.paralyzed.description",
    durationKey: "statuses.duration.untilRemoved",
    group: "negative",
  },
  {
    key: "rage",
    nameKey: "statuses.rage.name",
    descriptionKey: "statuses.rage.description",
    durationKey: "statuses.duration.timeBased",
    group: "negative",
  },
  {
  key: "buffoutAddiction",
  nameKey: "statuses.buffoutAddiction.name",
  descriptionKey: "statuses.buffoutAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "mentatAddiction",
  nameKey: "statuses.mentatAddiction.name",
  descriptionKey: "statuses.mentatAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "calmexAddiction",
  nameKey: "statuses.calmexAddiction.name",
  descriptionKey: "statuses.calmexAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "daddyOAddiction",
  nameKey: "statuses.daddyOAddiction.name",
  descriptionKey: "statuses.daddyOAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "dayTripperAddiction",
  nameKey: "statuses.dayTripperAddiction.name",
  descriptionKey: "statuses.dayTripperAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "furyAddiction",
  nameKey: "statuses.furyAddiction.name",
  descriptionKey: "statuses.furyAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "jetAddiction",
  nameKey: "statuses.jetAddiction.name",
  descriptionKey: "statuses.jetAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "medXAddiction",
  nameKey: "statuses.medXAddiction.name",
  descriptionKey: "statuses.medXAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "overdriveAddiction",
  nameKey: "statuses.overdriveAddiction.name",
  descriptionKey: "statuses.overdriveAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "psychoAddiction",
  nameKey: "statuses.psychoAddiction.name",
  descriptionKey: "statuses.psychoAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "ultraJetAddiction",
  nameKey: "statuses.ultraJetAddiction.name",
  descriptionKey: "statuses.ultraJetAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
{
  key: "xCellAddiction",
  nameKey: "statuses.xCellAddiction.name",
  descriptionKey: "statuses.xCellAddiction.description",
  durationKey: "statuses.duration.ongoing",
  group: "addiction",
},
  {
    key: "resistance",
    nameKey: "statuses.resistance.name",
    descriptionKey: "statuses.resistance.description",
    durationKey: "statuses.duration.timeBased",
    group: "positive",
  },
  {
    key: "bloodWorms",
    nameKey: "statuses.bloodWorms.name",
    descriptionKey: "statuses.bloodWorms.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "boneWorms",
    nameKey: "statuses.boneWorms.name",
    descriptionKey: "statuses.boneWorms.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "buzzBrain",
    nameKey: "statuses.buzzBrain.name",
    descriptionKey: "statuses.buzzBrain.description",
    durationKey: "statuses.duration.days4",
    group: "disease",
  },
  {
    key: "dysentery",
    nameKey: "statuses.dysentery.name",
    descriptionKey: "statuses.dysentery.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "feverClaw",
    nameKey: "statuses.feverClaw.name",
    descriptionKey: "statuses.feverClaw.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "flapLimb",
    nameKey: "statuses.flapLimb.name",
    descriptionKey: "statuses.flapLimb.description",
    durationKey: "statuses.duration.days4",
    group: "disease",
  },
  {
    key: "glowingPustules",
    nameKey: "statuses.glowingPustules.name",
    descriptionKey: "statuses.glowingPustules.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "heatFlashes",
    nameKey: "statuses.heatFlashes.name",
    descriptionKey: "statuses.heatFlashes.description",
    durationKey: "statuses.duration.days3",
    group: "disease",
  },
  {
    key: "jellyFingers",
    nameKey: "statuses.jellyFingers.name",
    descriptionKey: "statuses.jellyFingers.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "lockJoint",
    nameKey: "statuses.lockJoint.name",
    descriptionKey: "statuses.lockJoint.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "needleSpine",
    nameKey: "statuses.needleSpine.name",
    descriptionKey: "statuses.needleSpine.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "parasites",
    nameKey: "statuses.parasites.name",
    descriptionKey: "statuses.parasites.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "radWorms",
    nameKey: "statuses.radWorms.name",
    descriptionKey: "statuses.radWorms.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "shellShock",
    nameKey: "statuses.shellShock.name",
    descriptionKey: "statuses.shellShock.description",
    durationKey: "statuses.duration.days3",
    group: "disease",
  },
  {
    key: "sludgeLung",
    nameKey: "statuses.sludgeLung.name",
    descriptionKey: "statuses.sludgeLung.description",
    durationKey: "statuses.duration.days4",
    group: "disease",
  },
  {
    key: "snotEar",
    nameKey: "statuses.snotEar.name",
    descriptionKey: "statuses.snotEar.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "swampGas",
    nameKey: "statuses.swampGas.name",
    descriptionKey: "statuses.swampGas.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "swampItch",
    nameKey: "statuses.swampItch.name",
    descriptionKey: "statuses.swampItch.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "theWhoopsies",
    nameKey: "statuses.theWhoopsies.name",
    descriptionKey: "statuses.theWhoopsies.description",
    durationKey: "statuses.duration.days1",
    group: "disease",
  },
  {
    key: "weepingSores",
    nameKey: "statuses.weepingSores.name",
    descriptionKey: "statuses.weepingSores.description",
    durationKey: "statuses.duration.days3",
    group: "disease",
  },
];

export const WEAPON_SKILLS = [
  "Big Guns",
  "Energy Weapons",
  "Explosives",
  "Melee Weapons",
  "Small Guns",
  "Throwing",
  "Unarmed",
];

export const WEAPON_DAMAGE_TYPES = ["physical", "energy", "radiation", "poison"];

export const WEAPON_RANGE_OPTIONS = [
  "Melee",
  "Close (C)",
  "Medium (M)",
  "Long (L)",
  "Extreme (X)",
];

export function createEmptyWeapon() {
  return {
    name: "",
    skill: "",
    specialKey: "A",
    damage: "",
    effects: [],
    customEffect: "",
    type: "physical",
    rate: "",
    useRateForDamage: false,
    range: "Close (C)",
    qualities: [],
    qualitiesCustom: "",
    ammo: "",
  };
}

export function isAddictionSuppressed(addictionKey, statuses = {}) {
  const rule = CHEM_ADDICTION_RULES[addictionKey];
  if (!rule) return false;

  return rule.suppressedBy.some((statusKey) => Boolean(statuses[statusKey]));
}

export function getActiveWithdrawalEffects(statuses = {}) {
  return Object.entries(CHEM_ADDICTION_RULES)
    .filter(([addictionKey, rule]) => statuses[addictionKey] && !isAddictionSuppressed(addictionKey, statuses))
    .map(([addictionKey, rule]) => ({
      addictionKey,
      ...rule,
    }));
}

export function createEmptyItem(category = "misc") {
  return {
    name: "",
    quantity: "",
    cost: "",
    weight: "",
    category,
  };
}

export function createEmptyPerk() {
  return {
    name: "",
    rank: "",
    description: "",
  };
}

export function buildDefaultMapState() {
  return {
    worldOffset: { x: 0, y: 0 },
    playerPosition: null,
    worldTotalHours: 8,
    trackedLocationId: "diamond_city",
    discoveredKeys: [],
    travelLog: ["Entered the Wasteland"],
    sectorCache: {},
  };
}

export function buildDefaultForm() {
  const special = {};
  SPECIAL_KEYS.forEach((key) => {
    special[key] = "5";
  });

  const skills = {};
  SKILL_KEYS.forEach((key) => {
    skills[key] = {
      rank: "0",
      attribute: SKILL_DEFAULT_ATTRIBUTES[key] || "A",
      tagged: false,
      bonus: "0",
    };
  });

const armor = {};
ARMOR_PARTS.forEach((part) => {
  armor[part] = {
    physical: "",
    energy: "",
    radiation: "",
    poison: "",
    hp: "",
  };
});

  const statuses = {};
  STATUS_LIST.forEach((status) => {
    statuses[status.key] = false;
  });

  return {
    characterName: "",
    origin: "",
    level: "1",
    xp: "0",
    satiety: "3",
    thirst: "3",
    vigor: "3",
    currentHp: "10",
    radiationHp: "0",
    carryWeightOverride: "",
    defenseOverride: "",
    initiativeOverride: "",
    mdOverride: "",
    luckPointsOverride: "",
    maxHpOverride: "",
    injuries: {
      head: "normal",
      leftArm: "normal",
      rightArm: "normal",
      torso: "normal",
      leftLeg: "normal",
      rightLeg: "normal",
    },
    special,
    skills,
    armor,
    weapons: [],
    caps: "0",
    inventoryItems: [],
    perksAndTraits: [],
    backstory: "",
    questNotes: "",
    statuses,
    mapData: buildDefaultMapState(),
  };
}