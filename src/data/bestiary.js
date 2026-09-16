import coreRulebook01 from "./bestiary/coreRulebook01.js";
import coreRulebook02 from "./bestiary/coreRulebook02.js";
import coreRulebook03 from "./bestiary/coreRulebook03.js";
import coreRulebook04 from "./bestiary/coreRulebook04.js";
import coreRulebook05 from "./bestiary/coreRulebook05.js";
import coreRulebook06 from "./bestiary/coreRulebook06.js";
import coreRulebookRules from "./bestiary/coreRulebookRules.js";
import coreRulebookVariants from "./bestiary/coreRulebookVariants.js";
import settlersGuideBestiary from "./bestiary/settlersGuideBestiary.js";
import settlersWastelandNpcs01 from "./bestiary/settlersWastelandNpcs01.js";
import settlersWastelandNpcs02 from "./bestiary/settlersWastelandNpcs02.js";
import settlersWastelandNpcs03 from "./bestiary/settlersWastelandNpcs03.js";
import settlersWastelandRobotsTraps from "./bestiary/settlersWastelandRobotsTraps.js";

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

function normalizeBestiaryEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const statKind = String(entry.statKind || "").toLowerCase();
  const category = String(entry.category || "").toLowerCase();
  const cardKind = entry.cardKind || (statKind === "character" || category === "npc" || category === "ally" ? "npc" : "creature");
  return { ...entry, cardKind };
}

export const BESTIARY_ENTRIES = [
  ...coreRulebook01,
  ...coreRulebook02,
  ...coreRulebook03,
  ...coreRulebook04,
  ...coreRulebook05,
  ...coreRulebook06,
  ...coreRulebookRules,
  ...coreRulebookVariants,
  ...settlersGuideBestiary,
  ...settlersWastelandNpcs01,
  ...settlersWastelandNpcs02,
  ...settlersWastelandNpcs03,
  ...settlersWastelandRobotsTraps,
].map(normalizeBestiaryEntry);

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
