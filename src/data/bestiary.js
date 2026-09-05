import coreRulebook01 from "./bestiary/coreRulebook01.js";
import coreRulebook02 from "./bestiary/coreRulebook02.js";
import coreRulebook03 from "./bestiary/coreRulebook03.js";
import coreRulebook04 from "./bestiary/coreRulebook04.js";
import coreRulebook05 from "./bestiary/coreRulebook05.js";
import coreRulebook06 from "./bestiary/coreRulebook06.js";
import coreRulebookRules from "./bestiary/coreRulebookRules.js";

export const BESTIARY_CATEGORIES = [
  "all",
  "creature",
  "enemy",
  "ally",
  "npc",
  "robot",
  "trap",
  "hazard",
  "obstacle",
];

export const BESTIARY_ENTRIES = [
  ...coreRulebook01,
  ...coreRulebook02,
  ...coreRulebook03,
  ...coreRulebook04,
  ...coreRulebook05,
  ...coreRulebook06,
  ...coreRulebookRules,
];

export function createEmptyBestiaryEntry(category = "creature") {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    custom: true,
    name: "",
    category,
    tags: [],
    statKind: category === "trap" || category === "hazard" || category === "obstacle" ? "rule" : "creature",
    level: "",
    xp: "",
    creatureType: "",
    body: "",
    mind: "",
    melee: "",
    guns: "",
    other: "",
    special: { STR: "", PER: "", END: "", CHA: "", INT: "", AGI: "", LCK: "" },
    skills: [],
    hp: "",
    initiative: "",
    defense: "",
    carryWeight: "",
    meleeBonus: "",
    luckPoints: "",
    drBlock: "",
    attacks: "",
    abilities: "",
    tactics: "",
    loot: "",
    summary: "",
    detectionDifficulty: "",
    disarmDifficulty: "",
    trigger: "",
    damage: "",
    effect: "",
    source: "",
    notes: "",
  };
}
