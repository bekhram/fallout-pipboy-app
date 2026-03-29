import {
  CHEM_ADDICTION_RULES,
  isAddictionSuppressed,
} from "../constants.js";

const TEST_KEYS = ["S", "P", "E", "C", "I", "A", "L"];

function buildEmptyTestModifiers() {
  return TEST_KEYS.reduce((acc, key) => {
    acc[key] = {
      difficultyDelta: 0,
      reroll: false,
      complicationFrom: null,
    };
    return acc;
  }, {});
}

function applyDifficulty(mods, keys, delta) {
  if (!Array.isArray(keys)) return;

  if (keys.includes("ALL")) {
    TEST_KEYS.forEach((key) => {
      mods.tests[key].difficultyDelta += delta;
    });
    return;
  }

  keys.forEach((key) => {
    if (mods.tests[key]) {
      mods.tests[key].difficultyDelta += delta;
    }
  });
}

function applyReroll(mods, keys) {
  if (!Array.isArray(keys)) return;

  keys.forEach((key) => {
    if (mods.tests[key]) {
      mods.tests[key].reroll = true;
    }
  });
}

function applyIncomingDamageFlat(mods, type, delta) {
  if (mods.combat.incomingDamageFlat[type] == null) {
    mods.combat.incomingDamageFlat[type] = 0;
  }

  mods.combat.incomingDamageFlat[type] += delta;
}

function applyComplicationFloor(mods, keys, from) {
  if (!Array.isArray(keys)) return;

  keys.forEach((key) => {
    if (!mods.tests[key]) return;

    const current = mods.tests[key].complicationFrom;
    if (current == null || from < current) {
      mods.tests[key].complicationFrom = from;
    }
  });
}

function applySkillReroll(mods, skillKey) {
  if (!skillKey) return;

  if (!mods.skillTests[skillKey]) {
    mods.skillTests[skillKey] = {
      difficultyDelta: 0,
      reroll: false,
    };
  }

  mods.skillTests[skillKey].reroll = true;
}

function addNote(mods, text) {
  if (!text) return;
  if (!mods.notes.includes(text)) {
    mods.notes.push(text);
  }
}

function setFlag(mods, key, value = true) {
  mods.flags[key] = value;
}

function makeBaseModifiers() {
  return {
    derived: {
      maxHpBonus: 0,
      carryWeightBonus: 0,
      defenseBonus: 0,
      initiativeBonus: 0,
      meleeDamageBonus: 0,

      radiationResistBonus: 0,
      poisonResistBonus: 0,
      energyResistBonus: 0,
      physicalResistBonus: 0,
    },

    tests: buildEmptyTestModifiers(),

    skillTests: {},

    combat: {
      apNowBonus: 0,
      apPerTurnBonus: 0,
      apGeneratedBonus: 0,
      apGeneratedPenalty: 0,
      extraActionCostDelta: 0,

      bonusDamageCd: 0,
      meleeBonusCd: 0,
      sneakAttackBonusCd: 0,

      physicalDamageTakenCdBonus: 0,

      incomingDamageFlat: {
        physical: 0,
        energy: 0,
        radiation: 0,
        poison: 0,
      },

      aimExtraRerolls: 0,
      damageDiceRerollLimit: 0,
      firstBoughtD20Free: false,

      loseNormalActions: false,
      movementBlocked: false,
      canSprint: true,
    },

    flags: {
      prone: false,
      hidden: false,
      invisible: false,
      cover: false,
      blind: false,
      deaf: false,
      fear: false,
      grappled: false,
      stunned: false,
      paralyzed: false,
      unconscious: false,
      dying: false,
      fatigued: false,
      exhausted: false,
      starving: false,
      dehydrated: false,
      exposed: false,
    },

    activeStatuses: [],
    activeAddictions: [],
    notes: [],
  };
}

function applyStatusEffect(mods, statusKey) {
  switch (statusKey) {
    case "berryMentats":
      applyDifficulty(mods, ["I"], -2);
      addNote(mods, "Berry Mentats: INT tests -2 difficulty.");
      break;

    case "buffjet":
      applyDifficulty(mods, ["S", "E"], -1);
      mods.derived.maxHpBonus += 4;
      mods.combat.apNowBonus += 3;
      mods.combat.extraActionCostDelta -= 1;
      addNote(
        mods,
        "Buffjet: STR/END tests -1 difficulty, +4 Max HP, +3 AP immediately, extra actions cost 1 less AP."
      );
      break;

    case "buffout":
      applyReroll(mods, ["S", "E"]);
      mods.derived.maxHpBonus += 3;
      addNote(mods, "Buffout: reroll STR/END tests, +3 Max HP.");
      break;

    case "bufftats":
      applyDifficulty(mods, ["S", "P", "E"], -1);
      mods.derived.maxHpBonus += 4;
      addNote(mods, "Bufftats: STR/PER/END tests -1 difficulty, +4 Max HP.");
      break;

    case "calmex":
      applyReroll(mods, ["P", "A"]);
      mods.combat.sneakAttackBonusCd += 2;
      addNote(mods, "Calmex: reroll PER/AGI tests, +2 CD to sneak attack damage.");
      break;

    case "daddyO":
      applyDifficulty(mods, ["P", "I"], -1);
      applyDifficulty(mods, ["C"], +1);
      addNote(mods, "Daddy-O: PER/INT tests -1 difficulty, CHA tests +1 difficulty.");
      break;

    case "dayTripper":
      applyDifficulty(mods, ["C", "L"], -1);
      applyDifficulty(mods, ["S"], +1);
      addNote(mods, "Day Tripper: CHA/LCK tests -1 difficulty, STR tests +1 difficulty.");
      break;

    case "fury":
      mods.derived.physicalResistBonus += 3;
      mods.combat.meleeBonusCd += 3;
      applyDifficulty(mods, ["P"], -2);
      addNote(mods, "Fury: +3 physical resist, +3 CD melee damage, PER tests -2 difficulty.");
      break;

    case "grapeMentats":
      applyDifficulty(mods, ["C"], -2);
      applySkillReroll(mods, "Barter");
      addNote(mods, "Grape Mentats: CHA tests -2 difficulty, reroll Barter tests.");
      break;

    case "jet":
      mods.combat.extraActionCostDelta -= 1;
      addNote(mods, "Jet: extra actions cost 1 less AP.");
      break;

    case "jetFuel":
      mods.combat.apPerTurnBonus += 1;
      addNote(mods, "Jet Fuel: +1 free AP at the start of each turn.");
      break;

    case "medX":
      mods.derived.physicalResistBonus += 3;
      addNote(mods, "Med-X: +3 physical damage resistance.");
      break;

    case "mentats":
      applyReroll(mods, ["P", "I"]);
      addNote(mods, "Mentats: reroll PER/INT tests.");
      break;

    case "orangeMentats":
      applyDifficulty(mods, ["P"], -2);
      mods.combat.aimExtraRerolls += 1;
      addNote(mods, "Orange Mentats: PER tests -2 difficulty, aiming grants +1 extra reroll d20.");
      break;

    case "overdrive":
      mods.combat.bonusDamageCd += 3;
      mods.combat.damageDiceRerollLimit = Math.max(
        mods.combat.damageDiceRerollLimit,
        3
      );
      addNote(mods, "Overdrive: +3 CD to all attacks, may reroll up to 3 CD per damage roll.");
      break;

    case "psycho":
      mods.combat.bonusDamageCd += 2;
      mods.derived.physicalResistBonus += 3;
      addNote(mods, "Psycho: +2 CD to all attacks, +3 physical damage resistance.");
      break;

    case "psychoJet":
      mods.combat.bonusDamageCd += 2;
      mods.derived.physicalResistBonus += 4;
      mods.combat.apNowBonus += 4;
      addNote(mods, "Psycho Jet: +2 CD to all attacks, +4 physical resist, +4 AP immediately.");
      break;

    case "psychobuff":
      mods.combat.bonusDamageCd += 2;
      mods.derived.maxHpBonus += 4;
      applyDifficulty(mods, ["S", "E"], -1);
      addNote(mods, "Psychobuff: +2 CD all attacks, +4 Max HP, STR/END tests -1 difficulty.");
      break;

    case "psychotats":
      mods.combat.bonusDamageCd += 2;
      mods.derived.physicalResistBonus += 2;
      applyDifficulty(mods, ["P"], -1);
      addNote(mods, "Psychotats: +2 CD all attacks, +2 physical resist, PER tests -1 difficulty.");
      break;

    case "radX":
      mods.derived.radiationResistBonus += 6;
      addNote(mods, "Rad-X: +6 radiation damage resistance.");
      break;

    case "radXDiluted":
      mods.derived.radiationResistBonus += 3;
      addNote(mods, "Diluted Rad-X: +3 radiation damage resistance.");
      break;

    case "skeetoSpit":
      mods.derived.maxHpBonus += 2;
      addNote(mods, "Skeeto Spit: +2 Max HP.");
      break;

    case "ultraJet":
      mods.combat.apNowBonus += 6;
      mods.combat.extraActionCostDelta -= 1;
      addNote(mods, "Ultra Jet: +6 AP immediately, extra actions cost 1 less AP.");
      break;

    case "xCell":
      mods.combat.firstBoughtD20Free = true;
      addNote(mods, "X-Cell: first bought d20 on all tests is free.");
      break;

    case "prone":
      setFlag(mods, "prone");
      mods.combat.canSprint = false;
      addNote(mods, "Prone: movement restricted.");
      break;

    case "hidden":
      setFlag(mods, "hidden");
      addNote(mods, "Hidden: harder to detect.");
      break;

    case "persistentDamage":
      addNote(mods, "Persistent Damage: take repeated damage over time.");
      break;

    case "wellRested":
      mods.derived.initiativeBonus += 1;
      addNote(mods, "Well Rested: +1 initiative.");
      break;

    case "fatigue":
      setFlag(mods, "fatigued");
      mods.derived.initiativeBonus -= 1;
      addNote(mods, "Fatigue: -1 initiative.");
      break;

    case "wellFed":
      mods.derived.maxHpBonus += 1;
      mods.derived.carryWeightBonus += 10;
      addNote(mods, "Well Fed: +1 Max HP, +10 carry weight.");
      break;

    case "exposure":
      setFlag(mods, "exposed");
      mods.derived.initiativeBonus -= 1;
      addNote(mods, "Exposure: -1 initiative.");
      break;

    case "unconscious":
      setFlag(mods, "unconscious");
      mods.combat.loseNormalActions = true;
      mods.combat.movementBlocked = true;
      addNote(mods, "Unconscious: cannot act.");
      break;

    case "dying":
      setFlag(mods, "dying");
      addNote(mods, "Dying: needs immediate stabilization.");
      break;

    case "invisible":
      setFlag(mods, "invisible");
      addNote(mods, "Invisible: harder to detect.");
      break;

    case "cover":
      setFlag(mods, "cover");
      mods.derived.defenseBonus += 1;
      addNote(mods, "Cover: defense bonus.");
      break;

    case "blind":
      setFlag(mods, "blind");
      addNote(mods, "Blind: severe perception/attack penalty.");
      break;

    case "deaf":
      setFlag(mods, "deaf");
      addNote(mods, "Deaf: hearing-based awareness penalty.");
      break;

    case "fear":
      setFlag(mods, "fear");
      addNote(mods, "Fear: may lose control or retreat.");
      break;

    case "grappled":
      setFlag(mods, "grappled");
      mods.combat.movementBlocked = true;
      addNote(mods, "Grappled: movement restricted.");
      break;

    case "stunned":
      setFlag(mods, "stunned");
      mods.combat.loseNormalActions = true;
      addNote(mods, "Stunned: loses normal actions.");
      break;

    case "paralyzed":
      setFlag(mods, "paralyzed");
      mods.combat.loseNormalActions = true;
      mods.combat.movementBlocked = true;
      addNote(mods, "Paralyzed: cannot move or act.");
      break;

    case "rage":
      setFlag(mods, "rage");
      addNote(mods, "Rage: aggressive uncontrolled state.");
      break;

    case "resistance":
      addNote(mods, "Resistance: reduce one selected damage type.");
      break;

    default:
      break;
  }
}

function applyAddictionEffect(mods, addictionKey, rule) {
  applyDifficulty(mods, rule.affectedTests, +1);

  if (rule.extraEffects?.includes("plus1PhysicalDamageTaken")) {
    applyIncomingDamageFlat(mods, "physical", 1);
  }

  if (rule.extraEffects?.includes("minus1GeneratedAP")) {
    mods.combat.apGeneratedPenalty += 1;
  }

  if (addictionKey === "calmexAddiction") {
    applyComplicationFloor(mods, ["A"], 18);
  }

  mods.activeAddictions.push(addictionKey);
  addNote(mods, rule.effectText);

  if (rule.permanent) {
    addNote(mods, `${addictionKey}: permanent addiction effect.`);
  }
}

export function getCharacterEffectModifiers(form) {
  const mods = makeBaseModifiers();
  const statuses = form?.statuses || {};

  Object.entries(statuses).forEach(([statusKey, active]) => {
    if (!active) return;

    mods.activeStatuses.push(statusKey);
    applyStatusEffect(mods, statusKey);
  });

  Object.entries(CHEM_ADDICTION_RULES).forEach(([addictionKey, rule]) => {
    if (!statuses[addictionKey]) return;
    if (isAddictionSuppressed(addictionKey, statuses)) return;

    applyAddictionEffect(mods, addictionKey, rule);
  });

  if (Number(form?.satiety || 0) === 0) {
    setFlag(mods, "starving");
    mods.derived.carryWeightBonus -= 10;
    addNote(mods, "Starving: -10 carry weight.");
  }

  if (Number(form?.thirst || 0) === 0) {
    setFlag(mods, "dehydrated");
    mods.derived.initiativeBonus -= 1;
    addNote(mods, "Dehydrated: -1 initiative.");
  }

  if (Number(form?.vigor || 0) === 0) {
    setFlag(mods, "exhausted");
    mods.derived.initiativeBonus -= 2;
    mods.combat.canSprint = false;
    addNote(mods, "Exhausted: -2 initiative, cannot sprint.");
  }

  return mods;
}

export function applyEffectModifiersToDerived(baseDerived, effectMods) {
  return {
    ...baseDerived,
    maxHp: (baseDerived.maxHp || 0) + (effectMods.derived.maxHpBonus || 0),
    defense: (baseDerived.defense || 0) + (effectMods.derived.defenseBonus || 0),
    initiative:
      (baseDerived.initiative || 0) + (effectMods.derived.initiativeBonus || 0),
    md:
      (baseDerived.md || 0) + (effectMods.derived.meleeDamageBonus || 0),
    carryWeight:
      (baseDerived.carryWeight || 0) + (effectMods.derived.carryWeightBonus || 0),
  };
}