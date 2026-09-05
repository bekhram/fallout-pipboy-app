export default [
  {
    id: "mister-handy", name: "Mister Handy", category: "robot", tags: ["robot", "notable-character"],
    level: "6", creatureType: "Robot • Notable Character", xp: "90", statKind: "character",
    special: { STR: "6", PER: "7", END: "5", CHA: "5", INT: "7", AGI: "6", LCK: "4" },
    skills: [{name:"Energy Weapons",rating:3,tagged:true},{name:"Repair",rating:2},{name:"Medicine",rating:1},{name:"Small Guns",rating:1},{name:"Melee Weapons",rating:3,tagged:true},{name:"Speech",rating:3,tagged:true}],
    hp: "15", initiative: "17", defense: "1", carryWeight: "150 lbs.", meleeBonus: "+0 CD", luckPoints: "2",
    drBlock: "Physical 1 (All) • Energy 1 (All) • Radiation Immune • Poison Immune",
    attacks: "• PINCER — STR + Melee (TN 9), 3 CD Physical, Range C\n• BUZZSAW — STR + Melee (TN 9), 3 CD Piercing Physical, Range C\n• FLAMER — PER + Energy Weapons (TN 10), 3 CD Persistent Energy, Fire Rate 1, Range C",
    abilities: "• ROBOT — ignores starvation, thirst and suffocation; immune to Poison/Radiation; cannot heal naturally or with Medicine and must be repaired.\n• IMMUNE TO DISEASE.\n• MISTER HANDY — 360° vision and enhanced smell/chemical/radiation sensors reduce relevant PER-test Difficulty by 1; jet propulsion ignores ground difficult terrain and obstacles.",
    source: "Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 360."
  },
  {
    id: "mister-gutsy", name: "Mister Gutsy", category: "robot", tags: ["robot", "military", "notable-character"],
    level: "7", creatureType: "Robot • Notable Character", xp: "104", statKind: "character",
    special: { STR: "6", PER: "7", END: "5", CHA: "4", INT: "7", AGI: "7", LCK: "4" },
    skills: [{name:"Energy Weapons",rating:4,tagged:true},{name:"Small Guns",rating:4,tagged:true},{name:"Melee Weapons",rating:3,tagged:true},{name:"Speech",rating:1},{name:"Repair",rating:1}],
    hp: "15", initiative: "18", defense: "1", carryWeight: "150 lbs.", meleeBonus: "+0 CD", luckPoints: "2",
    drBlock: "Physical 2 (All) • Energy 2 (All) • Radiation Immune • Poison Immune",
    attacks: "• PINCER — STR + Melee (TN 9), 4 CD Physical, Range C\n• 10MM AUTO PISTOL — AGI + Small Guns (TN 11), 5 CD Physical, Range C, FR 4, Close Quarters, Reliable, Burst\n• FLAMER — PER + Energy Weapons (TN 11), 3 CD Persistent Energy, FR 1, Range C",
    abilities: "• ROBOT / IMMUNE TO DISEASE — as other robots; damage must be repaired.\n• MISTER HANDY SENSOR/FLIGHT PACKAGE — 360° enhanced sensors; relevant PER Difficulty −1; hovers over ground obstacles.\n• MISTER GUTSY — attacks gain +1 CD and military plating is included; Speech tests to question/reason/order it are +2 Difficulty for characters not in military uniform.",
    source: "Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 361."
  },
  {
    id: "protectron", name: "Protectron", category: "robot", tags: ["robot", "normal-creature"], level: "3",
    creatureType: "Robot • Normal Creature", xp: "24", statKind: "creature", body: "5", mind: "5", melee: "2", guns: "2", other: "2",
    hp: "8", initiative: "10", defense: "1", drBlock: "Physical 4 (All) • Energy 3 (All) • Radiation Immune • Poison Immune",
    attacks: "• CLAWS — BODY + Melee (TN 7), 3 CD Physical\n• ARM LASERS — BODY + Guns (TN 7), 3 CD Burst, Piercing 1 Energy, Range C, FR 4\n• SELF DESTRUCT — BODY + Melee (TN 7), 6 CD Physical, Blast",
    abilities: "• ROBOT / IMMUNE TO DISEASE.\n• ARM LASERS — one injured arm reduces FR to 2; both injured arms disable the attack.\n• LET RIP — once per combat adds FR 4 to Arm Laser damage (7 CD total); with one injured arm it becomes 5 CD.\n• SELF-DESTRUCT — if both arms are injured or HP is at half or less, it moves toward the nearest enemy and detonates as a major action, destroying itself.",
    source: "Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 363."
  },
  {
    id: "sentry-bot", name: "Sentry Bot", category: "robot", tags: ["robot", "military", "normal-creature"], level: "15",
    creatureType: "Robot • Normal Creature", xp: "109", statKind: "creature", body: "10", mind: "6", melee: "4", guns: "5", other: "4",
    hp: "40", initiative: "16", defense: "1", drBlock: "Physical 6 (All) • Energy 5 (All) • Radiation Immune • Poison Immune",
    attacks: "• CHAIN GUN — BODY + Guns (TN 15), 5 CD Physical, Burst, Spread, FR 5, Gatling, Range M\n• UNARMED — BODY + Melee (TN 14), 8 CD Vicious Physical\n• MISSILE LAUNCHER — BODY + Guns (TN 15), 11 CD Physical, Blast, Range L",
    abilities: "• ROBOT / IMMUNE TO DISEASE.\n• KEEN SENSES — can detect normally imperceptible targets; other PER-test Difficulty −1.\n• AGGRESSIVE — generates 1 AP for its side when it enters a scene.\n• SELF-DESTRUCT — if both arms are injured or HP is at half or less, moves toward the nearest enemy and detonates, destroying itself.",
    source: "Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 364."
  },
  {
    id: "super-mutant", name: "Super Mutant", category: "enemy", tags: ["mutated-human", "super-mutant", "normal-character"],
    level: "5", creatureType: "Mutated Human • Normal Character", xp: "38", statKind: "character",
    special: { STR:"9", PER:"5", END:"7", CHA:"4", INT:"4", AGI:"5", LCK:"4" },
    skills: [{name:"Big Guns",rating:1},{name:"Survival",rating:3,tagged:true},{name:"Melee Weapons",rating:4,tagged:true},{name:"Unarmed",rating:2},{name:"Small Guns",rating:3}],
    hp:"12", initiative:"10", defense:"1", carryWeight:"240 lbs.", meleeBonus:"+2 CD", luckPoints:"—",
    drBlock:"Physical 2 (All) • Energy 2 (All) • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 11), 4 CD Physical\n• BOARD — STR + Melee Weapons (TN 13), 6 CD Physical, Two-Handed\n• PIPE BOLT-ACTION RIFLE — AGI + Small Guns (TN 8), 5 CD Piercing Physical, Range M, FR 0, Two-Handed",
    abilities:"• BARBARIAN — +2 Physical and Energy DR (already included).\n• IMMUNE TO RADIATION.\n• IMMUNE TO POISON.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 366."
  },
  {
    id:"super-mutant-behemoth", name:"Super Mutant Behemoth", category:"enemy", tags:["mutated-human","super-mutant","normal-creature"],
    level:"18", creatureType:"Mutated Human • Normal Creature", xp:"130", statKind:"creature", body:"12", mind:"5", melee:"5", guns:"—", other:"4",
    hp:"48", initiative:"17", defense:"1", drBlock:"Physical 8 (All) • Energy 5 (All) • Radiation Immune • Poison 8 (All)",
    attacks:"• FIRE HYDRANT BAT — BODY + Melee (TN 17), 11 CD Vicious, Breaking Physical\n• BOULDER THROW — BODY + Guns (TN 12), 8 CD Vicious, Stun Physical, Throwing, Range M",
    abilities:"• IMMUNE TO RADIATION / FEAR.\n• BIG — +1 HP per Level; Defense −1 (min 1); Critical Hit threshold is 7+ damage after DR.\n• AGGRESSIVE — generates 1 AP for its side on entering a scene.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 367."
  },
  {
    id:"super-mutant-brute", name:"Super Mutant Brute", category:"enemy", tags:["mutated-human","super-mutant","normal-character"], level:"7",
    creatureType:"Mutated Human • Normal Character", xp:"52", statKind:"character",
    special:{STR:"9",PER:"5",END:"7",CHA:"4",INT:"5",AGI:"5",LCK:"4"},
    skills:[{name:"Athletics",rating:1},{name:"Survival",rating:2},{name:"Big Guns",rating:2},{name:"Throwing",rating:1},{name:"Melee Weapons",rating:4,tagged:true},{name:"Unarmed",rating:2},{name:"Small Guns",rating:4}],
    hp:"14",initiative:"10",defense:"1",carryWeight:"240 lbs.",meleeBonus:"+2 CD",luckPoints:"—",
    drBlock:"Physical: 4 Head; 3 Legs; 2 Torso/Arms • Energy: 3 Legs; 2 Torso/Arms • Radiation Immune • Poison Immune",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 11), 4 CD Physical\n• BOARD — STR + Melee Weapons (TN 13), 6 CD Physical, Two-Handed\n• PIPE BOLT-ACTION RIFLE — AGI + Small Guns (TN 9), 5 CD Piercing Physical, Range M, FR 0, Two-Handed",
    abilities:"• BARBARIAN — +2 Physical/Energy DR included.\n• IMMUNE TO RADIATION / POISON.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 368."
  },
  {
    id:"super-mutant-master", name:"Super Mutant Master", category:"enemy", tags:["mutated-human","super-mutant","notable-character"], level:"10",
    creatureType:"Mutated Human • Notable Character", xp:"148", statKind:"character",
    special:{STR:"10",PER:"8",END:"8",CHA:"5",INT:"6",AGI:"5",LCK:"5"},
    skills:[{name:"Big Guns",rating:1},{name:"Survival",rating:3,tagged:true},{name:"Melee Weapons",rating:4,tagged:true},{name:"Unarmed",rating:2},{name:"Small Guns",rating:3}],
    hp:"23",initiative:"15",defense:"1",carryWeight:"250 lbs.",meleeBonus:"+2 CD",luckPoints:"—",
    drBlock:"Physical: 4 Head/Legs/Torso; 3 Arms • Energy: 2 Head; 4 Legs/Torso; 3 Arms • Radiation Immune • Poison Immune",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 12), 4 CD Physical\n• MINIGUN — END + Big Guns (TN 9), 3 CD Physical, Burst, Spread, FR 5, Range M, Gatling, Inaccurate, Two-Handed\nOR • MISSILE LAUNCHER — END + Big Guns (TN 9), 11 CD Physical, Range L, Blast, Two-Handed",
    abilities:"• BARBARIAN — +2 Physical/Energy DR included.\n• IMMUNE TO RADIATION / POISON.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 369."
  },
  {
    id:"super-mutant-suicider", name:"Super Mutant Suicider", category:"enemy", tags:["mutated-human","super-mutant","normal-character"], level:"6",
    creatureType:"Mutated Human • Normal Character", xp:"45", statKind:"character",
    special:{STR:"8",PER:"5",END:"6",CHA:"4",INT:"4",AGI:"7",LCK:"4"},
    skills:[{name:"Athletics",rating:4,tagged:true},{name:"Sneak",rating:1},{name:"Explosives",rating:4,tagged:true},{name:"Survival",rating:1},{name:"Small Guns",rating:2},{name:"Unarmed",rating:2}],
    hp:"12",initiative:"12",defense:"1",carryWeight:"130 lbs.",meleeBonus:"+1 CD",luckPoints:"—",
    drBlock:"Physical: 3 Torso; 2 Arms/Legs/Head • Energy: 4 Torso; 2 Arms/Legs/Head • Radiation Immune • Poison Immune",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 10), 4 CD Physical\n• MODIFIED MINI NUKE — 21 CD Physical, Breaking, Radioactive, Vicious, Blast, Range C\n• PIPE BOLT-ACTION RIFLE — AGI + Small Guns (TN 9), 5 CD Piercing 1 Physical, Range M, FR 0, Two-Handed",
    abilities:"• BARBARIAN — +2 Physical/Energy DR included.\n• IMMUNE TO RADIATION / POISON.\n• MODIFIED MINI NUKE — at Close range uses AGI + Explosives (TN 11) to detonate; everyone within Close range, including the suicider, suffers the effect.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 370."
  },
  {
    id:"synth", name:"Synth", category:"enemy", tags:["robotic-synth","normal-creature"], level:"4", creatureType:"Robotic Synth • Normal Creature", xp:"31",
    statKind:"creature",body:"6",mind:"5",melee:"2",guns:"2",other:"2",hp:"10",initiative:"11",defense:"1",
    drBlock:"Physical: 2 Head/Legs/Arms; 1 Torso • Energy: 3 Head/Legs/Arms; 2 Torso • Radiation Immune • Poison Immune",
    attacks:"• INSTITUTE LASER — BODY + Guns (TN 8), 4 CD Vicious Energy, Burst, FR 3, Range M\n• SHOCK BATON — BODY + Melee (TN 8), 5 CD Energy, Range C",
    abilities:"• ROBOT — immune to starvation, thirst and suffocation; must be repaired instead of healed.\n• IMMUNE TO POISON / RADIATION / FEAR / DISEASE.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 373."
  },
  {
    id:"synth-courser", name:"Synth Courser", category:"enemy", tags:["robotic-synth","third-generation","notable-character"], level:"11",
    creatureType:"Robotic Synth • Notable Character",xp:"162",statKind:"character",
    special:{STR:"7",PER:"8",END:"8",CHA:"6",INT:"8",AGI:"7",LCK:"4"},
    skills:[{name:"Energy Weapons",rating:4,tagged:true},{name:"Science",rating:4,tagged:true},{name:"Lockpick",rating:2},{name:"Sneak",rating:4,tagged:true},{name:"Melee Weapons",rating:3,tagged:true},{name:"Speech",rating:3},{name:"Repair",rating:3},{name:"Unarmed",rating:2}],
    hp:"23",initiative:"17",defense:"2",carryWeight:"220 lbs.",meleeBonus:"+1 CD",luckPoints:"2",
    drBlock:"Physical: 4 Arms/Legs/Torso; 2 Head • Energy: 5 Arms/Legs/Torso; 2 Head • Radiation Immune • Poison Immune",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 9), 2 CD Physical\n• INSTITUTE LASER — PER + Energy Weapons (TN 12), 6 CD Vicious Energy, Burst, FR 4, Two-Handed, Range M",
    abilities:"• ROBOT; IMMUNE TO POISON / RADIATION / FEAR / DISEASE.\n• INSTITUTE ACCESS — can use Institute teleportation technology to enter/leave as permitted.\n• THIRD-GENERATION SYNTH — appears human under inspection; identified conclusively by Synth Component after death. When impersonating a known person, gains +2d20 on relevant impersonation tests.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 374."
  },
  {
    id:"synth-strider",name:"Synth Strider",category:"enemy",tags:["robotic-synth","normal-creature"],level:"7",creatureType:"Robotic Synth • Normal Creature",xp:"52",
    statKind:"creature",body:"6",mind:"6",melee:"4",guns:"4",other:"3",hp:"13",initiative:"12",defense:"1",
    drBlock:"Physical 3 (All) • Energy 4 (All) • Radiation Immune • Poison Immune",
    attacks:"• INSTITUTE LASER — BODY + Guns (TN 10), 6 CD Vicious Energy, Burst, FR 3, Range M\n• SHOCK BATON — BODY + Melee (TN 10), 5 CD Energy, Range C",
    abilities:"• ROBOT; IMMUNE TO POISON / RADIATION / FEAR / DISEASE.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 375."
  },
  {
    id:"synth-trooper",name:"Synth Trooper",category:"enemy",tags:["robotic-synth","normal-creature"],level:"16",creatureType:"Robotic Synth • Normal Creature",xp:"52",
    statKind:"creature",body:"10",mind:"6",melee:"5",guns:"5",other:"5",hp:"26",initiative:"16",defense:"1",
    drBlock:"Physical 1 (All) • Energy 1 (All) • Radiation Immune • Poison Immune",
    attacks:"• INSTITUTE LASER — BODY + Guns (TN 15), 6 CD Vicious Energy, Burst, FR 3, Range M\n• SHOCK BATON — BODY + Melee (TN 15), 5 CD Energy, Range C",
    abilities:"• ROBOT; IMMUNE TO POISON / RADIATION / FEAR / DISEASE.\n• AGGRESSIVE — generates 1 AP for its side when it enters a scene.",
    source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 376."
  }
];
