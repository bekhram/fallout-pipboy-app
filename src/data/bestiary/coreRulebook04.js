const commonTurretAbilities = "• ROBOT — immune to starvation, thirst and suffocation; immune to Poison/Radiation; does not heal naturally and must be repaired.\n• IMMUNE TO DISEASE.";
const littleTurretAbility = "\n• LITTLE — HP uses BODY + half Level (rounded up), Defense +1, and any hit that inflicts an Injury destroys it.";

export default [
  {
    id:"machine-gun-turret-mk-i",name:"Machine Gun Turret Mk I",category:"robot",tags:["robot","turret","normal-creature"],level:"5",creatureType:"Robot • Normal Creature",xp:"38",statKind:"creature",
    body:"6",mind:"5",melee:"—",guns:"3",other:"—",hp:"11",initiative:"11",defense:"1",drBlock:"Physical 1 (All) • Energy 1 (All) • Radiation Immune • Poison Immune",
    attacks:"• MACHINE GUN — BODY + Guns (TN 9), 5 CD Stun Physical, Range M, Burst, FR 3",abilities:commonTurretAbilities,
    loot:"Salvage: INT + Science D1. Yields 3d20 5.56mm rounds and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 377."
  },
  {
    id:"machine-gun-turret-mk-iii",name:"Machine Gun Turret Mk III",category:"robot",tags:["robot","turret","normal-creature"],level:"10",creatureType:"Robot • Normal Creature",xp:"74",statKind:"creature",
    body:"8",mind:"5",melee:"—",guns:"4",other:"—",hp:"18",initiative:"13",defense:"1",drBlock:"Physical 2 (All) • Energy 1 (All) • Radiation Immune • Poison Immune",
    attacks:"• MACHINE GUN — BODY + Guns (TN 12), 7 CD Stun Physical, Range M, Burst, FR 3",abilities:commonTurretAbilities,
    loot:"Salvage: INT + Science D1. Yields 3d20 5.56mm rounds and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 378."
  },
  {
    id:"machine-gun-turret-mk-v",name:"Machine Gun Turret Mk V",category:"robot",tags:["robot","turret","normal-creature"],level:"14",creatureType:"Robot • Normal Creature",xp:"102",statKind:"creature",
    body:"9",mind:"5",melee:"—",guns:"5",other:"—",hp:"23",initiative:"15",defense:"1",drBlock:"Physical 4 (All) • Energy 2 (All) • Radiation Immune • Poison Immune",
    attacks:"• MACHINE GUN — BODY + Guns (TN 14), 9 CD Stun Physical, Range M, Burst, FR 3",abilities:commonTurretAbilities,
    loot:"Salvage: INT + Science D1. Yields 3d20 5.56mm rounds and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 378."
  },
  {
    id:"machine-gun-turret-wall",name:"Machine Gun Turret (Wall Mount)",category:"robot",tags:["robot","turret","wall-mount","normal-creature"],level:"5",creatureType:"Robot • Normal Creature",xp:"38",statKind:"creature",
    body:"6",mind:"5",melee:"—",guns:"3",other:"—",hp:"9",initiative:"11",defense:"2",drBlock:"Physical 1 (All) • Energy 1 (All) • Radiation Immune • Poison Immune",
    attacks:"• MACHINE GUN — BODY + Guns (TN 9), 5 CD Physical, Range M, Burst, FR 3",abilities:commonTurretAbilities+littleTurretAbility,
    loot:"Salvage: INT + Science D1. Yields 3d20 10mm rounds and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 379."
  },
  {
    id:"machine-gun-turret-3-shot-wall",name:"Machine Gun Turret 3 Shot (Wall Mount)",category:"robot",tags:["robot","turret","wall-mount","normal-creature"],level:"10",creatureType:"Robot • Normal Creature",xp:"74",statKind:"creature",
    body:"8",mind:"5",melee:"—",guns:"5",other:"—",hp:"13",initiative:"13",defense:"2",drBlock:"Physical 2 (All) • Energy 1 (All) • Radiation Immune • Poison Immune",
    attacks:"• MACHINE GUN — BODY + Guns (TN 13), 5 CD Physical, Range M, Burst, FR 3",abilities:commonTurretAbilities+littleTurretAbility,
    loot:"Salvage: INT + Science D1. Yields 3d20 10mm rounds and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 380."
  },
  {
    id:"laser-turret-wall",name:"Laser Turret (Wall Mount)",category:"robot",tags:["robot","turret","wall-mount","normal-creature"],level:"5",creatureType:"Robot • Normal Creature",xp:"38",statKind:"creature",
    body:"6",mind:"5",melee:"—",guns:"3",other:"—",hp:"9",initiative:"11",defense:"2",drBlock:"Physical 1 (All) • Energy 2 (All) • Radiation Immune • Poison Immune",
    attacks:"• LASER GUN — BODY + Guns (TN 9), 4 CD Piercing Energy, Range M, Burst, FR 3",abilities:commonTurretAbilities+littleTurretAbility,
    loot:"Salvage: INT + Science D1. Yields 3d20 fusion cells and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 380."
  },
  {
    id:"laser-turret-3-shot-wall",name:"Laser Turret 3-Shot (Wall Mount)",category:"robot",tags:["robot","turret","wall-mount","normal-creature"],level:"10",creatureType:"Robot • Normal Creature",xp:"74",statKind:"creature",
    body:"8",mind:"5",melee:"—",guns:"5",other:"—",hp:"13",initiative:"13",defense:"2",drBlock:"Physical 2 (All) • Energy 2 (All) • Radiation Immune • Poison Immune",
    attacks:"• LASER GUN — BODY + Guns (TN 13), 7 CD Piercing Energy, Range M, Burst, FR 3",abilities:commonTurretAbilities+littleTurretAbility,
    loot:"Salvage: INT + Science D1. Yields 3d20 fusion cells and 2 CD uncommon materials.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 381."
  }
];
