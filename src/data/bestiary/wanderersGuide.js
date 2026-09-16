const source = "Fallout: The Roleplaying Game — Wanderer's Guide Book";

export default [
  {
    id: "albino-radscorpion", name: "Albino Radscorpion", category: "creature",
    tags: ["mutated", "insect", "insects", "radscorpion", "mighty", "creature"],
    level: "14", creatureType: "Mutated Arachnid • Mighty Creature", xp: "204", statKind: "creature",
    body: "11", mind: "6", melee: "5", guns: "—", other: "4", hp: "78", initiative: "17", defense: "1",
    drBlock: "Physical 6 (All); Energy 5 (All); Radiation Immune; Poison Immune",
    attacks: "• CLAW: BODY + Melee (TN 16), 6 CD Vicious Physical damage\n• STING: BODY + Melee (TN 16), 7 CD Persistent Poison damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• BIG — +1 HP per Level; Defense cannot fall below 1; Injury threshold becomes 7+ damage after DR.\n• BURROW — Can disappear underground and move beneath open ground before emerging.\n• SOLAR REGENERATION — In direct sunlight, recovers 3 HP at the start of the round.\n• WEAK SPOT — Deliberately targeting the head ignores DR.",
    loot: "Butchery: END + Survival D1. Yield: 2 radscorpion meat; Effects can yield a stinger or egg.", source
  },
  {
    id: "angler", name: "Angler", category: "creature", tags: ["mutated", "amphibian", "amphibians", "normal", "creature"],
    level: "9", creatureType: "Mutated Amphibian • Normal Creature", xp: "109", statKind: "creature",
    body: "9", mind: "7", melee: "4", guns: "5", other: "4", hp: "24", initiative: "16", defense: "2",
    drBlock: "Physical 4 (All); Energy 6 (All); Radiation Immune; Poison Immune",
    attacks: "• SPIT: BODY + Guns (TN 14), 7 CD Persistent Energy damage, Range M\n• BITE: BODY + Melee (TN 13), 6 CD Piercing 1 Physical damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• AMPHIBIOUS — Functions normally in water and on land.\n• PATIENT PREDATOR — Can hide while submerged and ambush nearby prey if it remains undetected.",
    loot: "Butchery: END + Survival D1. Yield: 2 angler meat; each Effect adds 1 Common material.", source
  },
  {
    id: "cave-cricket", name: "Cave Cricket", category: "creature", tags: ["mutated", "insect", "insects", "normal", "creature"],
    level: "2", creatureType: "Mutated Insect • Normal Creature", xp: "17", statKind: "creature",
    body: "6", mind: "3", melee: "2", guns: "—", other: "2", hp: "8", initiative: "9", defense: "2",
    drBlock: "Physical 3 (All); Energy 0; Radiation Immune; Poison 2 (All)",
    attacks: "• IMPALING HORN: BODY + Melee (TN 8), 4 CD Piercing 1 Physical damage\n• BITE: BODY + Melee (TN 8), 3 CD Physical damage",
    abilities: "• IMMUNE TO RADIATION.\n• LEAP — Its first movement can carry it one zone and empower an Impaling Horn attack by +1 CD.\n• KEEN SENSES — Detects subtle threats and reduces relevant PER-test difficulty by 1.",
    loot: "Butchery: END + Survival D1. Yield: 1 cave cricket meat; an Effect yields 1 acid concentrate.", source
  },
  {
    id: "cave-cricket-piercer", name: "Cave Cricket Piercer", category: "creature", tags: ["mutated", "insect", "insects", "normal", "creature"],
    level: "5", creatureType: "Mutated Insect • Normal Creature", xp: "38", statKind: "creature",
    body: "7", mind: "4", melee: "3", guns: "—", other: "2", hp: "12", initiative: "11", defense: "2",
    drBlock: "Physical 4 (All); Energy 1 (All); Radiation Immune; Poison 2 (All)",
    attacks: "• IMPALING HORN: BODY + Melee (TN 12), 5 CD Piercing 1 Physical damage\n• BITE: BODY + Melee (TN 12), 4 CD Physical damage",
    abilities: "• IMMUNE TO RADIATION.\n• LEAP — Its first movement can carry it one zone and empower an Impaling Horn attack by +1 CD.\n• KEEN SENSES — Reduces relevant PER-test difficulty by 1.",
    loot: "Butchery: END + Survival D1. Yield: 1 cave cricket meat; an Effect yields 1 acid concentrate.", source
  },
  {
    id: "cazador", name: "Cazador", category: "creature", tags: ["mutated", "insect", "insects", "normal", "creature"],
    level: "10", creatureType: "Mutated Insect • Normal Creature", xp: "74", statKind: "creature",
    body: "8", mind: "5", melee: "4", guns: "—", other: "3", hp: "13", initiative: "13", defense: "2",
    drBlock: "Physical 0; Energy 0; Radiation Immune; Poison Immune",
    attacks: "• STINGER: BODY + Melee (TN 12), 8 CD Persistent Poison damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• FLYING — Moves freely through the air but must keep moving each turn.\n• EVADE — Sprinting increases Defense by 1, to a maximum of 3, until its next turn.\n• POTENT STING — A successful sting counts as having rolled at least one Effect.\n• LITTLE — Reduced HP, +1 Defense, and any Injury kills it.",
    loot: "Butchery: END + Survival D1. Yield: 1 cazador egg; an Effect yields 1 stinger.", source
  },
  {
    id: "deathclaw-matriarch", name: "Deathclaw Matriarch", category: "creature", tags: ["mutated", "reptile", "deathclaw", "deathclaws", "legendary", "creature"],
    level: "20", creatureType: "Mutated Lizard • Legendary Creature", xp: "432", statKind: "creature",
    body: "12", mind: "10", melee: "5", guns: "5", other: "5", hp: "156", initiative: "22", defense: "1",
    drBlock: "Physical 8 (All); Energy 10 (All); Radiation Immune; Poison 10 (All)",
    attacks: "• CLAWS: BODY + Melee (TN 17), 12 CD Vicious, Piercing 2 Physical damage\n• SLAM: BODY + Melee (TN 17), 8 CD Stun Physical damage\n• HEAVY OBJECT: BODY + Guns (TN 15), 8 CD Stun Physical damage, Throwing, Range M",
    abilities: "• IMMUNE TO RADIATION / FEAR.\n• BIG; KEEN SENSES; MASSIVE STRENGTH.\n• REND — May raise Claw difficulty by 1 to gain +2 CD on a successful attack.\n• MATRIARCHAL FURY — Once per combat, her attacks gain Breaking for the next round.\n• AGGRESSIVE — Generates 1 AP for her side when entering a scene.\n• PACK MOTHER — Can spend AP to command a nearby deathclaw to take an immediate major action.\n• ALPHA'S PRESENCE — Nearby deathclaws become more resistant to fear and more efficient once she is badly wounded.",
    loot: "Butchery: END + Survival D1. Yield: 3 deathclaw meat; Effects can yield a claw or egg.", source
  },
  {
    id: "floater", name: "Floater", category: "creature", tags: ["mutated", "invertebrate", "floater", "floaters", "super-mutant-ally", "normal", "creature"],
    level: "6", creatureType: "Mutated Invertebrate • Normal Creature", xp: "45", statKind: "creature",
    body: "7", mind: "4", melee: "—", guns: "3", other: "2", hp: "20", initiative: "12", defense: "1",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation 1 (All); Poison 1 (All)",
    attacks: "• FLAMER: BODY + Guns (TN 10), 3 CD Burst, Persistent, Spread Energy damage; Debilitating, Inaccurate\n• COMBUST: BODY + Guns (TN 10), 5 CD Persistent Energy damage, Blast, Delay (2)",
    abilities: "• AMBUSH — Can hide underground and lure targets before surfacing.\n• SHOCK TACTICS — Bursting from an ambush can hinder nearby enemies.\n• FLOATING — Hovers above the ground.\n• COMBUST — At 0 HP it can use a final self-destructive Combust attack.\n• MUTANT FRIEND — Normally friendly to super mutants and easier for them to direct.\n• ABNORMAL ANATOMY — Non-head hit locations count as torso.",
    loot: "Butchery: END + Survival D0. Yield: 1 Common material; each Effect yields flamer fuel.", source
  },
  {
    id: "gatorclaw", name: "Gatorclaw", category: "creature", tags: ["mutated", "reptile", "reptiles", "mighty", "creature"],
    level: "11", creatureType: "Mutated Reptile • Mighty Creature", xp: "162", statKind: "creature",
    body: "11", mind: "5", melee: "5", guns: "—", other: "3", hp: "66", initiative: "16", defense: "1",
    drBlock: "Physical 6 (All); Energy 6 (All); Radiation Immune; Poison 9 (All)",
    attacks: "• CLAWS: BODY + Melee (TN 16), 6 CD Piercing Physical damage\n• SLAM: BODY + Melee (TN 16), 4 CD Stun Physical damage",
    abilities: "• IMMUNE TO RADIATION.\n• BIG — Increased HP and higher Injury threshold.\n• KEEN SENSES.\n• MASSIVE STRENGTH.\n• DIVER — Swims and fights underwater without the normal difficulty increase and can stay submerged for several rounds.",
    loot: "Butchery uses the normal mutated-reptile procedure.", source
  },
  {
    id: "gecko", name: "Gecko", category: "creature", tags: ["mutated", "reptile", "reptiles", "normal", "creature"],
    level: "2", creatureType: "Mutated Reptile • Normal Creature", xp: "17", statKind: "creature",
    body: "5", mind: "4", melee: "2", guns: "—", other: "3", hp: "9", initiative: "9", defense: "1",
    drBlock: "Physical 0; Energy 0; Radiation 0; Poison 0",
    attacks: "• BITE: BODY + Melee (TN 7), 3 CD Physical damage",
    abilities: "• DIVER — Swims and attacks underwater without the normal difficulty increase.",
    loot: "Butchery: END + Survival D0. Yield: 1 gecko meat.", source
  },
  {
    id: "giant-ant", name: "Giant Ant", category: "creature", tags: ["mutated", "insect", "insects", "normal", "creature"],
    level: "3", creatureType: "Mutated Insect • Normal Creature", xp: "24", statKind: "creature",
    body: "6", mind: "4", melee: "3", guns: "—", other: "3", hp: "9", initiative: "10", defense: "1",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation Immune; Poison Immune",
    attacks: "• BITE: BODY + Melee (TN 9), 4 CD Physical damage",
    abilities: "• IMMUNE TO RADIATION.\n• FRENZY — A head Injury causes indiscriminate aggression for the rest of the encounter.",
    loot: "Butchery: END + Survival D1. Yield: 1 giant ant meat.", source
  },
  {
    id: "giant-mantis", name: "Giant Mantis", category: "creature", tags: ["mutated", "insect", "insects", "normal", "creature"],
    level: "7", creatureType: "Mutated Insect • Normal Creature", xp: "52", statKind: "creature",
    body: "8", mind: "4", melee: "4", guns: "—", other: "2", hp: "15", initiative: "12", defense: "1",
    drBlock: "Physical 3 (All); Energy 1 (All); Radiation 1 (All); Poison Immune",
    attacks: "• CLAW: BODY + Melee (TN 12), 4 CD Piercing, Vicious Physical damage",
    abilities: "• IMMUNE TO POISON.\n• FRENZY — A head Injury causes indiscriminate aggression.\n• POUNCE — Can leap within Medium range; its next Claw gains +2 CD.\n• SNEAKY — Strong ambusher and gains an extra d20 on sneak attacks.",
    loot: "Butchery: END + Survival D1. Yield: 2 giant mantis forelegs.", source
  },
  {
    id: "gulper", name: "Gulper", category: "creature", tags: ["mutated", "amphibian", "amphibians", "normal", "creature"],
    level: "10", creatureType: "Mutated Amphibian • Normal Creature", xp: "74", statKind: "creature",
    body: "8", mind: "5", melee: "5", guns: "—", other: "4", hp: "18", initiative: "13", defense: "1",
    drBlock: "Physical 4 (All); Energy 6 (All); Radiation Immune; Poison 8 (All)",
    attacks: "• BITE: BODY + Melee (TN 15), 8 CD Breaking Physical damage\n• SLAM: BODY + Melee (TN 15), 5 CD Physical damage\n• HEAVY OBJECT: BODY + Guns (TN 10), 4 CD Stun Physical damage, Throwing, Range M",
    abilities: "• IMMUNE TO RADIATION.\n• AMPHIBIOUS.\n• PATIENT PREDATOR — Can hang concealed and ambush nearby targets.\n• MASSIVE STRENGTH — Can manipulate car-sized objects.\n• AGGRESSIVE — Generates 1 AP on scene entry.\n• WEAK SPOT — A deliberately targeted torso ignores DR.",
    loot: "Butchery: END + Survival D1. Yield: 2 gulper innards; Effects can yield irradiated blood / Uncommon material.", source
  },
  {
    id: "hermit-crab", name: "Hermit Crab", category: "creature", tags: ["mutated", "crustacean", "crustaceans", "mighty", "creature"],
    level: "12", creatureType: "Mutated Crustacean • Mighty Creature", xp: "176", statKind: "creature",
    body: "12", mind: "4", melee: "3", guns: "—", other: "—", hp: "72", initiative: "16", defense: "2",
    drBlock: "Physical 7 (All); Energy 6 (All); Radiation 7 (All)",
    attacks: "• CLAW: BODY + Melee (TN 15), 5 CD Physical damage",
    abilities: "• BIG.\n• METALLIC SHELL — Can retreat into its shell to gain +3 DR to all damage types; it cannot voluntarily move until it exits.\n• HATCHING SPAWN — While shelled, the GM may spend AP to release hatchlings.\n• CAMOUFLAGE — While motionless in its shell it resembles a wrecked vehicle.\n• SLOW — Cannot Sprint; movement requires a major action.",
    loot: "Butchery: END + Survival D1. Yield: 2 hermit crab meat. The shell may also contain junk, caps, weapons and matching ammunition.", source
  },
  {
    id: "honey-beast", name: "Honey Beast", category: "creature", tags: ["mutated", "insect", "insects", "honey-beast", "bee-swarm", "normal", "creature"],
    level: "7", creatureType: "Mutated Insect • Normal Creature", xp: "52", statKind: "creature",
    body: "6", mind: "6", melee: "3", guns: "—", other: "—", hp: "20", initiative: "12", defense: "1",
    drBlock: "Physical 2 (All); Energy 2 (All); Radiation 9 (All); Poison 5 (All)",
    attacks: "• BITE: BODY + Melee (TN 9), 4 CD Piercing, Radioactive Physical damage\n• STING: BODY + Melee (TN 9), 3 CD Persistent Poison damage",
    abilities: "• PROTECTIVE SWARM — Creatures ending their turn within Reach suffer 1 CD Poison damage.\n• SWARM SPAWN — May spend AP to create Bee Swarms nearby.\n• KICK THE NEST — A Critical Hit can generate extra AP for the GM.",
    loot: "Butchery: END + Survival D1. Yield: 1 honey and 1 honeycomb; each Effect adds 1 Uncommon material.", source
  },
  {
    id: "bee-swarm", name: "Bee Swarm", category: "creature", tags: ["mutated", "insect", "insects", "swarm", "honey-beast", "normal", "creature"],
    level: "1", creatureType: "Mutated Insect • Normal Creature", xp: "10", statKind: "creature",
    body: "4", mind: "4", melee: "—", guns: "—", other: "—", hp: "5", initiative: "8", defense: "1",
    drBlock: "Physical 0; Energy 0; Radiation Immune; Poison Immune", attacks: "No conventional attack.",
    abilities: "• SWARM — Occupies an entire zone; targets in that zone are within Reach. It is especially vulnerable to area attacks with Blast, Fire, Acid, Burst or Spread.\n• CLOUD OF STINGERS — At the end of its turn, creatures in its zone suffer 1 CD Poison damage.\n• AIRBORNE — Ignores most ground obstacles and difficult terrain.",
    loot: "No meaningful inventory.", source
  },
  {
    id: "radrat", name: "Radrat", category: "creature", tags: ["mutated", "mammal", "mammals", "normal", "creature"],
    level: "3", creatureType: "Mutated Mammal • Normal Creature", xp: "24", statKind: "creature",
    body: "7", mind: "3", melee: "3", guns: "—", other: "2", hp: "10", initiative: "10", defense: "1",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation Immune; Poison 1 (All)",
    attacks: "• BITE: BODY + Melee (TN 10), 4 CD Piercing Physical damage", abilities: "• IMMUNE TO RADIATION.",
    loot: "Butchery: END + Survival D1. Yield: 1 radrat meat.", source
  },
  {
    id: "glowing-plagued-radrat", name: "Glowing Plagued Radrat", category: "creature", tags: ["mutated", "mammal", "mammals", "glowing", "normal", "creature"],
    level: "8", creatureType: "Mutated Mammal • Normal Creature", xp: "60", statKind: "creature",
    body: "8", mind: "4", melee: "4", guns: "—", other: "2", hp: "16", initiative: "12", defense: "1",
    drBlock: "Physical 2 (All); Energy 3 (All); Radiation Immune; Poison Immune",
    attacks: "• BITE: BODY + Melee (TN 12), 6 CD Piercing, Radioactive Physical damage",
    abilities: "• IMMUNE TO RADIATION.\n• GLOWING — At the start of its turn, creatures within Reach suffer 2 CD Radiation damage; its melee attacks are Radioactive.",
    loot: "Butchery: END + Survival D1. Yield: 2 radrat meat; an Effect yields irradiated blood.", source
  },
  {
    id: "scorchbeast", name: "Scorchbeast", category: "creature", tags: ["mutated", "mammal", "mammals", "scorched", "mighty", "creature"],
    level: "14", creatureType: "Mutated Mammal • Mighty Creature", xp: "204", statKind: "creature",
    body: "11", mind: "6", melee: "4", guns: "5", other: "4", hp: "74", initiative: "17", defense: "1",
    drBlock: "Physical 6 (All); Energy 6 (All); Radiation Immune; Poison Immune",
    attacks: "• SCREECH: BODY + Guns (TN 16), 8 CD Burst, Stun Physical damage, Fire Rate 2, Range M\n• WING STRIKE: BODY + Melee (TN 15), 9 CD Breaking, Vicious Physical damage\n• SHOCKWAVE: BODY + Guns (TN 16), 10 CD Burst, Radioactive Physical damage, Range C",
    abilities: "• HIVE MIND — Can use GM AP to call Scorched into the encounter.\n• IRRADIATE — Can contaminate a nearby zone with radiation before landing again.\n• FLYING; BIG; AGGRESSIVE.\n• WEAK SPOT — Deliberately targeting the head ignores DR.\n• BLIGHTED — Its attacks may inflict a debilitating blight condition.",
    loot: "Butchery: END + Survival D1. Yield: 3 scorchbeast meat; each Effect adds 1 Uncommon material.", source
  },
  {
    id: "grafton-monster", name: "Grafton Monster", category: "creature", tags: ["cryptid", "cryptids", "normal", "creature"],
    level: "13", creatureType: "Cryptid • Normal Creature", xp: "95", statKind: "creature",
    body: "9", mind: "6", melee: "4", guns: "—", other: "1", hp: "35", initiative: "15", defense: "1",
    drBlock: "Physical 7 (All); Energy 6 (All); Radiation Immune; Poison 6 (All)",
    attacks: "• FISTS: BODY + Melee (TN 14), 8 CD Breaking Physical damage\n• STICKY TAR: BODY + Guns (TN 9), 4 CD Persistent Physical damage, Blast, Throwing, Range M\n• HEAVY OBJECT: BODY + Guns (TN 9), 4 CD Stun Physical damage, Throwing, Range M",
    abilities: "• BIG; MASSIVE STRENGTH; AGGRESSIVE.\n• DESTRUCTIVE — Deals +3 CD when attacking structures and inanimate objects.\n• BLOW HOLES — The head location represents its blowholes.\n• WEAK SPOT — Deliberately targeting the blowholes ignores DR.",
    loot: "Butchery: END + Survival D1. Yield: 2 Common materials; each Effect adds 1 Uncommon material.", source
  },
  {
    id: "mega-sloth", name: "Mega Sloth", category: "creature", tags: ["mutated", "mammal", "mammals", "normal", "creature"],
    level: "12", creatureType: "Mutated Mammal • Normal Creature", xp: "88", statKind: "creature",
    body: "10", mind: "4", melee: "5", guns: "3", other: "3", hp: "34", initiative: "14", defense: "1",
    drBlock: "Physical 8 (All); Energy 7 (All); Radiation 9 (All); Poison Immune",
    attacks: "• CLAW: BODY + Melee (TN 15), 6 CD Piercing Physical damage\n• DIRT THROW: BODY + Guns (TN 13), 3 CD Spread Physical damage, Throwing, Range M",
    abilities: "• IMMUNE TO POISON.\n• BIG.\n• SPORE CLOUD — Major action: creatures within Close suffer 4 CD Poison damage; the cloud hampers PER tests until the next turn.",
    loot: "Butchery: END + Survival D1. Yield: 2 mega sloth meat; an Effect yields a mega sloth mushroom.", source
  },
  {
    id: "mothman", name: "Mothman", category: "creature", tags: ["cryptid", "cryptids", "mothman", "mighty", "creature"],
    level: "16", creatureType: "Cryptid • Mighty Creature", xp: "348", statKind: "creature",
    body: "8", mind: "12", melee: "4", guns: "5", other: "4", hp: "60", initiative: "24", defense: "1",
    drBlock: "Physical 7 (All); Energy 7 (All); Radiation 5 (All); Poison Immune",
    attacks: "• SONIC PULSE: MIND + Guns (TN 17), 10 CD Stun Energy damage, Range M\n• CONCUSSIVE BLAST: MIND + Guns (TN 17), 8 CD Blast, Stun Energy damage, Range C",
    abilities: "• ON SILENT WINGS — May spend 1 AP to vanish and reappear adjacent, making attacks against it harder until its next turn.\n• IT'S ALL IN THE EYES — May reroll one d20 on MIND tests.\n• STALKER — Exceptional Sneak and initiative; shadows improve Defense, and at half HP it can become effectively invisible.",
    loot: "Mothman dust.", source
  },
  {
    id: "wise-mothman", name: "Wise Mothman", category: "creature", tags: ["cryptid", "cryptids", "mothman", "major-character", "creature"],
    level: "16", creatureType: "Cryptid • Major Character", xp: "348", statKind: "creature",
    special: { STR: "6", PER: "10", END: "6", CHA: "9", INT: "10", AGI: "8", LCK: "8" },
    skills: ["Athletics 4", "Energy Weapons 5", "Medicine 5 (Tag)", "Science 5", "Sneak 5 (Tag)", "Survival 5 (Tag)", "Unarmed 5"],
    hp: "38", initiative: "22", defense: "1", carryWeight: "210", meleeBonus: "0", luckPoints: "8",
    drBlock: "Physical 7 (All); Energy 7 (All); Radiation 5 (All); Poison Immune",
    attacks: "• SONIC PULSE: PER + Energy Weapons (TN 15), 10 CD Stun Energy damage, Range M\n• CONCUSSIVE BLAST: PER + Energy Weapons (TN 15), 8 CD Blast, Stun Energy damage, Range C",
    abilities: "• ON SILENT WINGS.\n• IT'S ALL IN THE EYES.\n• BLESSING OF WISDOM — A nearby ally may commune with it and gain a one-d20 reroll until the start of the next turn.\n• STALKER.",
    loot: "Mothman dust.", source
  },
  {
    id: "vengeful-mothman", name: "Vengeful Mothman", category: "creature", tags: ["cryptid", "cryptids", "mothman", "major-character", "aggressive", "creature"],
    level: "16", creatureType: "Cryptid • Major Character", xp: "348", statKind: "creature",
    body: "8", mind: "12", melee: "4", guns: "5", other: "4", hp: "60", initiative: "24", defense: "1",
    drBlock: "Physical 7 (All); Energy 7 (All); Radiation 5 (All); Poison Immune",
    attacks: "• SONIC PULSE: MIND + Guns (TN 17), 10 CD Stun Energy damage, Range M\n• CONCUSSIVE BLAST: MIND + Guns (TN 17), 8 CD Blast, Stun Energy damage, Range C",
    abilities: "• ON SILENT WINGS.\n• IT'S ALL IN THE EYES.\n• STALKER.\n• AGGRESSIVE — Generates 1 AP for its side when entering a scene.",
    loot: "Mothman dust.", source
  },
  {
    id: "sheepsquatch", name: "Sheepsquatch", category: "creature", tags: ["cryptid", "cryptids", "legendary", "creature"],
    level: "18", creatureType: "Cryptid • Legendary Creature", xp: "300", statKind: "creature",
    body: "12", mind: "9", melee: "5", guns: "4", other: "3", hp: "144", initiative: "21", defense: "1",
    drBlock: "Physical 7 (All); Energy 7 (All); Radiation 7 (All); Poison Immune",
    attacks: "• HORNS: BODY + Melee (TN 17), 5 CD Debilitating Physical damage\n• HOOF: BODY + Melee (TN 17), 10 CD Breaking Physical damage\n• SLAM: BODY + Melee (TN 17), 6 CD Stun Physical damage, Blast\n• QUILLS: BODY + Guns (TN 16), 6 CD Persistent Poison damage, Range M",
    abilities: "• AGGRESSIVE; BIG; IMMUNE TO POISON.\n• PATIENT PREDATOR — Can conceal itself and ambush nearby prey.\n• SNEAKY.\n• HOWL — Can alert the area and may draw a raider patrol.\n• RAM — Charges a target within Medium range before attacking with Horns.\n• QUILL SPREAD — Strong Quill hits can shower nearby creatures with poison.\n• SLASH — Up to three times per combat, Hoof can gain Arc.",
    loot: "Butchery: END + Survival D1. Yield: 2 sheepsquatch meat; an Effect yields 1 Rare material.", source
  },
  {
    id: "snallygaster", name: "Snallygaster", category: "creature", tags: ["cryptid", "cryptids", "normal", "creature"],
    level: "11", creatureType: "Cryptid • Normal Creature", xp: "81", statKind: "creature",
    body: "8", mind: "6", melee: "4", guns: "4", other: "3", hp: "19", initiative: "14", defense: "1",
    drBlock: "Physical 7 (All); Energy 7 (All); Radiation Immune; Poison Immune",
    attacks: "• POISON SPIT: BODY + Guns (TN 12), 5 CD Persistent Poison damage, Range M\n• TONGUE WHIP: BODY + Melee (TN 12), 6 CD Breaking Physical damage",
    abilities: "• AGGRESSIVE.\n• IMMUNE TO RADIATION / POISON.\n• WEAK SPOT — Deliberately targeting the head ignores DR.\n• KEEN SENSES — Reduces relevant PER-test difficulty by 1.",
    loot: "Butchery: END + Survival D1. Yield: 2 snallygaster innards; an Effect yields acid concentrate.", source
  },
  {
    id: "wendigo", name: "Wendigo", category: "creature", tags: ["cryptid", "cryptids", "ghoul-synergy", "mighty", "creature"],
    level: "9", creatureType: "Cryptid • Mighty Creature", xp: "134", statKind: "creature",
    body: "11", mind: "4", melee: "5", guns: "4", other: "—", hp: "40", initiative: "15", defense: "1",
    drBlock: "Physical 5 (All); Energy 6 (All); Radiation Immune; Poison Immune",
    attacks: "• SCREAM: BODY + Guns (TN 15), 6 CD Burst, Stun Energy damage, Range M\n• CLAWS: BODY + Melee (TN 16), 5 CD Arc Physical damage",
    abilities: "• AGGRESSIVE.\n• GHOUL — Radiation heals it at a rate of 1 HP per 3 Radiation damage.\n• IMMUNE TO RADIATION / POISON.\n• PIERCING SCREAM — Creatures struck by Scream suffer +3 difficulty on PER tests for the scene, to a maximum of 5.\n• RALLYING CRY — Its first Scream lets nearby ghouls take an additional minor action on their next turn.\n• CANNIBAL — May attempt to feed on helpless prey when not under immediate pressure.",
    loot: "2 Uncommon materials.", source
  },
  {
    id: "feral-ghoul-roamer", name: "Feral Ghoul Roamer", category: "creature", tags: ["mutated", "human", "ghoul", "ghouls", "feral", "normal", "creature"],
    level: "5", creatureType: "Mutated Human • Normal Creature", xp: "38", statKind: "creature",
    body: "6", mind: "5", melee: "3", guns: "—", other: "2", hp: "11", initiative: "11", defense: "1",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation Immune; Poison Immune",
    attacks: "• UNARMED: BODY + Melee (TN 9), 4 CD Radioactive Physical damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• FERAL — Cannot be reasoned with normally and attacks based on instinct.\n• GHOUL — Radiation heals it at a rate of 1 HP per 3 Radiation damage.\n• PLAY DEAD — While prone and still, requires PER + Survival D2 to distinguish from a corpse.",
    loot: "Scavenging may reveal 2 CD junk items.", source
  },
  {
    id: "feral-ghoul-stalker", name: "Feral Ghoul Stalker", category: "creature", tags: ["mutated", "human", "ghoul", "ghouls", "feral", "normal", "creature"],
    level: "8", creatureType: "Mutated Human • Normal Creature", xp: "60", statKind: "creature",
    body: "6", mind: "6", melee: "3", guns: "—", other: "2", hp: "14", initiative: "12", defense: "1",
    drBlock: "Physical 2 (All); Energy 3 (All); Radiation Immune; Poison Immune",
    attacks: "• UNARMED: BODY + Melee (TN 9), 5 CD Radioactive Physical damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• FERAL.\n• GHOUL — Radiation heals it.\n• PLAY DEAD — PER + Survival D2 to identify while motionless.",
    loot: "Scavenging may reveal 2 CD junk items.", source
  },
  {
    id: "scorched-wanderer", name: "Scorched Wanderer", category: "creature", tags: ["mutated", "human", "scorched", "normal", "creature"],
    level: "4", creatureType: "Mutated Human • Normal Creature", xp: "31", statKind: "creature",
    body: "7", mind: "3", melee: "3", guns: "2", other: "2", hp: "11", initiative: "10", defense: "1",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation Immune; Poison Immune",
    attacks: "• UNARMED: BODY + Melee (TN 10), 3 CD Radioactive Physical damage\n• PUMP-ACTION SHOTGUN: BODY + Guns (TN 9), 5 CD Spread Physical damage, Fire Rate 1, Range C, Inaccurate, Two-Handed",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• SCORCHED — Hive-driven, hostile to the uninfected and largely immune to normal persuasion.\n• PETRIFIED — While still, PER + Survival D2 is required to distinguish it from a petrified body.",
    loot: "Pump-Action Shotgun, shotgun shells and scavenged junk; the body is mildly radioactive.", source
  },
  {
    id: "scorched-berserker", name: "Scorched Berserker", category: "creature", tags: ["mutated", "human", "scorched", "normal", "creature"],
    level: "7", creatureType: "Mutated Human • Normal Creature", xp: "52", statKind: "creature",
    body: "8", mind: "4", melee: "4", guns: "—", other: "2", hp: "15", initiative: "12", defense: "1",
    drBlock: "Physical 3 (All); Energy 2 (All); Radiation Immune; Poison Immune",
    attacks: "• MULTI-PURPOSE AXE: BODY + Melee (TN 12), 5 CD Physical damage, Two-Handed",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• SCORCHED.\n• PETRIFIED — PER + Survival D2 to distinguish while motionless.",
    loot: "Multi-Purpose Axe and scavenged junk; the body is mildly radioactive.", source
  },
  {
    id: "trog-fledgling", name: "Trog Fledgling", category: "creature", tags: ["mutated", "human", "trog", "trogs", "feral", "normal", "creature"],
    level: "2", creatureType: "Mutated Human • Normal Creature", xp: "17", statKind: "creature",
    body: "5", mind: "4", melee: "3", guns: "—", other: "2", hp: "8", initiative: "9", defense: "1",
    drBlock: "Physical 0; Energy 0; Radiation Immune; Poison Immune",
    attacks: "• BITE: BODY + Melee (TN 8), 3 CD Physical damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• FERAL — Driven by instinct and not susceptible to normal persuasion.",
    loot: "Scavenging may reveal 1 CD junk item.", source
  },
  {
    id: "trog-devourer", name: "Trog Devourer", category: "creature", tags: ["mutated", "human", "trog", "trogs", "feral", "normal", "creature"],
    level: "7", creatureType: "Mutated Human • Normal Creature", xp: "52", statKind: "creature",
    body: "9", mind: "3", melee: "4", guns: "—", other: "3", hp: "16", initiative: "12", defense: "1",
    drBlock: "Physical 3 (All); Energy 2 (All); Radiation Immune; Poison Immune",
    attacks: "• BITE: BODY + Melee (TN 13), 6 CD Vicious Physical damage",
    abilities: "• IMMUNE TO RADIATION / POISON.\n• FERAL.\n• DISORIENTING HOWL — Once per round, may spend 1 AP and a major action to alert trogs within Long range; non-trogs within Close suffer +1 difficulty on PER tests for the rest of the scene.",
    loot: "Scavenging may reveal 3 CD junk items.", source
  },
  {
    id: "colonel-gutsy", name: "Colonel Gutsy", category: "robot", tags: ["robot", "robots", "mister-gutsy", "notable-character"],
    level: "13", creatureType: "Robot • Notable Character", xp: "190", statKind: "creature",
    special: { STR: "8", PER: "10", END: "7", CHA: "5", INT: "7", AGI: "8", LCK: "4" },
    skills: ["Big Guns 4", "Energy Weapons 5", "Explosives 4", "Melee Weapons 4", "Repair 2", "Small Guns 4", "Speech 2", "Unarmed 2"],
    hp: "24", initiative: "20", defense: "1", carryWeight: "230", meleeBonus: "2", luckPoints: "2",
    drBlock: "Physical 2 (All); Energy 2 (All); Radiation Immune; Poison Immune",
    attacks: "• BUZZSAW: STR + Melee Weapons (TN 12), 7 CD Piercing Physical damage\n• AGITATED TARGETING LASER GUN: PER + Energy Weapons (TN 15), 6 CD Vicious, Piercing Energy damage, Fire Rate 3, Range C, Close Quarters\n• COMPRESSED FLAMER: END + Big Guns (TN 11), 4 CD Persistent Energy damage, Fire Rate 1, Range C",
    abilities: "• IMMUNE TO RADIATION / POISON / DISEASE.\n• ROBOT — Does not need food, water or air and is repaired rather than healed.\n• MISTER HANDY — 360-degree sensors, improved perception and hovering movement.\n• MISTER GUTSY — Military combat programming and reinforced plating; attacks gain +1 CD.\n• LET RIP — Once per combat, can fire an intensified Laser or Flamer volley.",
    loot: "Salvage: INT + Science D1. Fusion cells plus additional salvage for AP spent; Effects can yield Uncommon material.", source
  },
  {
    id: "cyberdog", name: "Cyberdog", category: "creature", tags: ["robotic", "mammal", "cyber-animal", "cyber-animals", "normal", "creature"],
    level: "5", creatureType: "Robotic Mammal • Normal Creature", xp: "38", statKind: "creature",
    body: "6", mind: "5", melee: "3", guns: "3", other: "3", hp: "11", initiative: "11", defense: "1",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation 1 (All); Poison Immune",
    attacks: "• BITE: BODY + Melee (TN 9), 5 CD Physical damage\n• SONIC BARK: BODY + Guns (TN 9), 3 CD Burst Energy damage, Range M",
    abilities: "• KEEN SENSES.\n• IMMUNE TO POISON / DISEASE.\n• AUTO-REPAIR SYSTEM — Once per combat, may use a major action to recover 2 CD HP.",
    loot: "Salvage: INT + Science D1. Fusion cells plus extra salvage for AP spent; Effects can yield Uncommon material.", source
  },
  {
    id: "liberator", name: "Liberator", category: "robot", tags: ["robot", "robots", "liberator", "normal"],
    level: "1", creatureType: "Robot • Normal Creature", xp: "10", statKind: "creature",
    body: "5", mind: "4", melee: "2", guns: "2", other: "1", hp: "6", initiative: "9", defense: "2",
    drBlock: "Physical 1 (All); Energy 1 (All); Radiation Immune; Poison Immune",
    attacks: "• LASER: BODY + Guns (TN 7), 4 CD Energy damage, Range C\n• BLADES: BODY + Melee (TN 7), 4 CD Physical damage",
    abilities: "• IMMUNE TO RADIATION / POISON / DISEASE.\n• ROBOT.\n• RECORDED MESSAGE — Broadcasts propaganda audible at Long range.\n• LITTLE — Reduced HP, +1 Defense, and any Injury destroys it.",
    loot: "Salvage: INT + Science D1. Yield: 2 CD Common materials; each Effect adds 1 Uncommon material.", source
  }
];
