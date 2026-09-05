export default [
  {
    id:"brotherhood-elder",name:"Elder",category:"ally",tags:["human","brotherhood-of-steel","major-character"],level:"10",creatureType:"Human • Major Character",xp:"222",statKind:"character",
    special:{STR:"7",PER:"8",END:"8",CHA:"9",INT:"8",AGI:"7",LCK:"7"},
    skills:[{name:"Athletics",rating:1},{name:"Repair",rating:1},{name:"Barter",rating:1},{name:"Science",rating:4,tagged:true},{name:"Energy Weapons",rating:4,tagged:true},{name:"Sneak",rating:1},{name:"Medicine",rating:1},{name:"Speech",rating:5,tagged:true},{name:"Melee Weapons",rating:2},{name:"Survival",rating:3},{name:"Pilot",rating:2},{name:"Unarmed",rating:2}],
    hp:"32",initiative:"19",defense:"1",carryWeight:"220 lbs.",meleeBonus:"—",luckPoints:"—",
    drBlock:"Physical 3 Arms/Legs/Torso • Energy 2 Arms/Legs/Torso • Radiation 1 Arms/Legs/Torso • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 9), 2 CD Physical\n• LONG LASER RIFLE — PER + Energy Weapons (TN 12), 5 CD Piercing 1 Energy, Range M, FR 2, Two-Handed",
    abilities:"• THE CHAIN THAT BINDS — as a major action, orders a lower-Level Brotherhood character to immediately take a major action; the Elder assists with CHA + Speech.",
    loot:"Brotherhood of Steel Uniform (Armored Battlecoat), Long Laser Rifle, Brotherhood of Steel Holotags.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 382."
  },
  {
    id:"brotherhood-knight",name:"Knight",category:"ally",tags:["human","brotherhood-of-steel","normal-character"],level:"7",creatureType:"Human • Normal Character",xp:"52",statKind:"character",
    special:{STR:"6",PER:"6",END:"7",CHA:"5",INT:"5",AGI:"6",LCK:"4"},
    skills:[{name:"Athletics",rating:1},{name:"Science",rating:3,tagged:true},{name:"Big Guns",rating:1},{name:"Small Guns",rating:1},{name:"Energy Weapons",rating:4,tagged:true},{name:"Speech",rating:2},{name:"Pilot",rating:1},{name:"Unarmed",rating:2},{name:"Repair",rating:1}],
    hp:"14",initiative:"12",defense:"1",carryWeight:"110 lbs.",meleeBonus:"—",luckPoints:"—",
    drBlock:"Physical 2 (All) • Energy 2 (All) • Radiation 1 (All) • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 8), 2 CD Physical\n• LONG LASER RIFLE — PER + Energy Weapons (TN 10), 5 CD Piercing 1 Energy, Range M, FR 2, Two-Handed",
    abilities:"• THE CHAIN THAT BINDS — can order a lower-Level Brotherhood character to take a major action and assist it with CHA + Speech.\n• WELL-EQUIPPED — twice per combat may add the Long Laser Rifle's FR 2 to one attack's damage (7 CD total).",
    loot:"Brotherhood of Steel Uniform, Full Combat Armor, Long Laser Rifle, Brotherhood of Steel Holotags.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 383."
  },
  {
    id:"brotherhood-paladin",name:"Paladin",category:"ally",tags:["human","brotherhood-of-steel","notable-character","power-armor"],level:"8",creatureType:"Human • Notable Character",xp:"120",statKind:"character",
    special:{STR:"7 (11 in Power Armor)",PER:"9",END:"8",CHA:"6",INT:"6",AGI:"6",LCK:"4"},
    skills:[{name:"Athletics",rating:2},{name:"Science",rating:3,tagged:true},{name:"Energy Weapons",rating:4,tagged:true},{name:"Small Guns",rating:2},{name:"Pilot",rating:1},{name:"Speech",rating:3},{name:"Repair",rating:2},{name:"Unarmed",rating:3,tagged:true}],
    hp:"20 (10 Head, 10 Legs, 21 Torso)",initiative:"17",defense:"1",carryWeight:"360 lbs.",meleeBonus:"+3 CD",luckPoints:"2",
    drBlock:"Physical: 7 Head; 9 Torso; 6 Arms/Legs • Energy: 6 Head; 8 Torso; 5 Arms/Legs • Radiation: 7 Head/Arms/Legs; 9 Torso • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 14), 5 CD Physical\n• IMPROVED LONG LASER RIFLE — PER + Energy Weapons (TN 14), 6 CD Piercing 1 Energy, Range M, FR 2, Two-Handed",
    abilities:"• POWER ARMOR — uses armor STR 11; immune to falling damage; landing can inflict 3 CD Physical to creatures in Reach; can breathe underwater/toxic environments.\n• THE CHAIN THAT BINDS — orders a lower-Level Brotherhood character to act and assists with CHA + Speech.\n• WELL-EQUIPPED — once per combat adds FR 2 to one Improved Long Laser Rifle attack (8 CD total).",
    loot:"Power Armor Frame, full T-60 Power Armor, Improved Long Laser Rifle, Brotherhood of Steel Holotags.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 383–384."
  },
  {
    id:"brotherhood-scribe",name:"Scribe",category:"ally",tags:["human","brotherhood-of-steel","normal-character"],level:"4",creatureType:"Human • Normal Character",xp:"31",statKind:"character",
    special:{STR:"5",PER:"6",END:"5",CHA:"5",INT:"7",AGI:"5",LCK:"4"},
    skills:[{name:"Energy Weapons",rating:2},{name:"Science",rating:4,tagged:true},{name:"Lockpick",rating:2},{name:"Sneak",rating:2},{name:"Medicine",rating:1},{name:"Speech",rating:2,tagged:true},{name:"Repair",rating:2},{name:"Survival",rating:1}],
    hp:"9",initiative:"11",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",
    drBlock:"Physical 1 Arms/Legs/Torso • Energy 2 Arms/Legs/Torso • Radiation 2 Arms/Legs/Torso • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 5), 5 CD Physical\n• LASER PISTOL — PER + Energy Weapons (TN 8), 4 CD Piercing 1 Energy, Range C, FR 2, Close Quarters",
    abilities:"• THE CHAIN THAT BINDS — can order a lower-Level Brotherhood character to take a major action and assist with CHA + Speech.\n• PRE-WAR EXPERTISE — gains +1d20 on tests to examine, identify or use pre-War technology.",
    loot:"Brotherhood Scribe's Armor, Laser Pistol, Brotherhood of Steel Holotags, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 384–385."
  },
  {
    id:"brotherhood-lancer",name:"Lancer",category:"ally",tags:["human","brotherhood-of-steel","normal-character","pilot"],level:"5",creatureType:"Human • Normal Character",xp:"38",statKind:"character",
    special:{STR:"5",PER:"6",END:"6",CHA:"5",INT:"6",AGI:"6",LCK:"4"},
    skills:[{name:"Athletics",rating:1},{name:"Pilot",rating:4,tagged:true},{name:"Big Guns",rating:1},{name:"Repair",rating:3},{name:"Energy Weapons",rating:3,tagged:true},{name:"Science",rating:1},{name:"Explosives",rating:1},{name:"Small Guns",rating:1}],
    hp:"11",initiative:"12",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",
    drBlock:"Physical 2 Arms/Legs/Torso • Energy 2 Arms/Legs/Torso • Radiation 1 Arms/Legs/Torso • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 5), 5 CD Physical\n• LONG LASER RIFLE — PER + Energy Weapons (TN 9), 5 CD Piercing 1 Energy, Range M, FR 2, Two-Handed",
    abilities:"• THE CHAIN THAT BINDS — can order a lower-Level Brotherhood character to take a major action and assist with CHA + Speech.\n• VERTIBIRD TRAINING — +1d20 on tests to pilot a Vertibird.",
    loot:"Brotherhood of Steel Uniform (Bomber Jacket), Laser Rifle, Brotherhood of Steel Holotags, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 385."
  },
  {
    id:"raider",name:"Raider",category:"enemy",tags:["human","raider","normal-character"],level:"2",creatureType:"Human Raider • Normal Character",xp:"17",statKind:"character",
    special:{STR:"6",PER:"5",END:"6",CHA:"4",INT:"5",AGI:"6",LCK:"4"},
    skills:[{name:"Medicine",rating:1},{name:"Sneak",rating:1},{name:"Melee Weapons",rating:2,tagged:true},{name:"Survival",rating:1},{name:"Repair",rating:1},{name:"Throwing",rating:1},{name:"Small Guns",rating:2,tagged:true},{name:"Unarmed",rating:2}],
    hp:"8",initiative:"11",defense:"1",carryWeight:"110 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 1 Arms/Torso • Energy 1 Arms/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 8), 2 CD Physical\n• TIRE IRON — STR + Melee Weapons (TN 8), 4 CD Physical\n• PIPE GUN — AGI + Small Guns (TN 8), 3 CD Physical, Range C, FR 2, Close Quarters, Unreliable",
    abilities:"• LET RIP — once per combat adds the Pipe Gun's FR 2 to one attack (5 CD total).",loot:"Road Leathers, Pipe Gun, Tire Iron, Wealth 1.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 386."
  },
  {
    id:"raider-boss",name:"Raider Boss",category:"enemy",tags:["human","raider","major-character"],level:"10",creatureType:"Human Raider • Major Character",xp:"222",statKind:"character",
    special:{STR:"8",PER:"9",END:"8",CHA:"8",INT:"7",AGI:"8",LCK:"6"},
    skills:[{name:"Athletics",rating:2},{name:"Sneak",rating:1},{name:"Big Guns",rating:4,tagged:true},{name:"Speech",rating:2},{name:"Explosives",rating:2,tagged:true},{name:"Survival",rating:3},{name:"Melee Weapons",rating:1,tagged:true},{name:"Throwing",rating:1},{name:"Repair",rating:2},{name:"Unarmed",rating:2},{name:"Small Guns",rating:2,tagged:true}],
    hp:"30",initiative:"17",defense:"1",carryWeight:"130 lbs.",meleeBonus:"+1 CD",luckPoints:"6",drBlock:"Physical/Energy: 0 Head; 3 Torso; 3 Arms; 2 Legs • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 10), 3 CD Physical\n• FRAG GRENADE — PER + Explosives (TN 11), 6 CD Physical, Blast, Throwing, Range M\n• HUNTING RIFLE — AGI + Small Guns (TN 10), 6 CD Piercing Physical, Range M, Two-Handed",
    abilities:"• AGGRESSIVE — generates 1 AP for its side on entering a scene.\n• ACTION PACKED — starts each scene with a personal pool of 4 AP.",loot:"Heavy Raider Chest Piece, Sturdy Raider Legs ×2, Heavy Raider Arms ×2, 3 Frag Grenades, Hunting Rifle, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 387."
  },
  {
    id:"raider-psycho",name:"Raider Psycho",category:"enemy",tags:["human","raider","normal-character"],level:"7",creatureType:"Human Raider • Normal Character",xp:"52",statKind:"character",
    special:{STR:"7",PER:"6",END:"7",CHA:"4",INT:"5",AGI:"6",LCK:"4"},
    skills:[{name:"Athletics",rating:1},{name:"Small Guns",rating:2,tagged:true},{name:"Energy Weapons",rating:1},{name:"Sneak",rating:1},{name:"Medicine",rating:2},{name:"Survival",rating:2},{name:"Melee Weapons",rating:3,tagged:true},{name:"Throwing",rating:1},{name:"Repair",rating:1},{name:"Unarmed",rating:1},{name:"Science",rating:1}],
    hp:"14",initiative:"12",defense:"1",carryWeight:"130 lbs.",meleeBonus:"+1 CD",luckPoints:"—",drBlock:"Physical 1 Arms/Legs/Torso • Energy 2 Torso/Arms/Legs • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 8), 3 CD Physical\n• MACHETE — STR + Melee Weapons (TN 10), 4 CD Piercing 1 Physical\n• DOUBLE-BARRELLED SHOTGUN — AGI + Small Guns (TN 8), 6 CD Spread, Vicious Physical, Range C, Inaccurate, Two-Handed\n• MOLOTOV COCKTAIL — PER + Explosives (TN 6), 4 CD Persistent Energy, Blast, Throwing, Range M",
    abilities:"• CHEMS OR KABOOM — in a combat carries/uses either one Molotov or one dose of Psycho; using one removes the other option.\n• PSYCHO — minor action; for the rest of combat +2 CD to all damage and +2 Physical/Energy DR.",loot:"Road Leathers, Leather Chest Piece, Double-Barrelled Shotgun, Machete, Wealth 1.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 388."
  },
  {
    id:"raider-scavver",name:"Raider Scavver",category:"enemy",tags:["human","raider","normal-character"],level:"7",creatureType:"Human Raider • Normal Character",xp:"60",statKind:"character",
    special:{STR:"6",PER:"7",END:"6",CHA:"5",INT:"5",AGI:"6",LCK:"4"},
    skills:[{name:"Athletics",rating:2},{name:"Small Guns",rating:3,tagged:true},{name:"Big Guns",rating:1},{name:"Survival",rating:2},{name:"Energy Weapons",rating:2},{name:"Throwing",rating:1},{name:"Melee Weapons",rating:3,tagged:true},{name:"Unarmed",rating:1},{name:"Repair",rating:1}],
    hp:"13",initiative:"13",defense:"1",carryWeight:"210 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical: 3 Arms/Torso; 2 Legs • Energy: 3 Arms/Torso; 2 Legs • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 7), 2 CD Physical\n• MACHETE — STR + Melee Weapons (TN 9), 4 CD Piercing Physical\n• COMBAT SHOTGUN — AGI + Small Guns (TN 9), 5 CD Spread Physical, Range C, Inaccurate, Two-Handed",
    abilities:"• AGGRESSIVE — generates 1 AP for its side on entering a scene.",loot:"Heavy Raider Chest Piece, Sturdy Raider Legs ×2, Heavy Raider Arms ×2, Combat Shotgun, Machete, Wealth 1.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 389."
  },
  {
    id:"raider-veteran",name:"Raider Veteran",category:"enemy",tags:["human","raider","notable-character"],level:"8",creatureType:"Human Raider • Notable Character",xp:"120",statKind:"character",
    special:{STR:"7",PER:"8",END:"7",CHA:"6",INT:"5",AGI:"7",LCK:"6"},
    skills:[{name:"Athletics",rating:2},{name:"Sneak",rating:1},{name:"Explosives",rating:1},{name:"Speech",rating:2},{name:"Medicine",rating:1},{name:"Survival",rating:2},{name:"Melee Weapons",rating:4,tagged:true},{name:"Unarmed",rating:2},{name:"Small Guns",rating:4,tagged:true}],
    hp:"21",initiative:"17",defense:"1",carryWeight:"210 lbs.",meleeBonus:"+1 CD",luckPoints:"3",drBlock:"Physical 2 (All) • Energy 2 (All) • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 9), 3 CD Physical\n• MACHETE — STR + Melee Weapons (TN 11), 3 CD Piercing 1 Physical\n• COMBAT RIFLE — AGI + Small Guns (TN 11), 3 CD Physical, Range M, FR 2, Two-Handed\n• MOLOTOV COCKTAIL — PER + Explosives (TN 9), 4 CD Persistent Energy, Blast, Throwing, Range M",
    abilities:"• IN CHARGE — minor action can order a lower-Level raider in Close range to immediately take a minor action; major action can order a major action.\n• LET RIP — once per combat adds Combat Rifle FR 2 to one attack (7 CD total as printed).",loot:"Spike Armor, Combat Rifle, Machete, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 390."
  }
];
