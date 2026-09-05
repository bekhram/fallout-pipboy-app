export default [
  {
    id:"children-of-atom",name:"Children of Atom",category:"npc",tags:["human","children-of-atom","normal-character"],level:"6",creatureType:"Human • Normal Character",xp:"45",statKind:"character",
    special:{STR:"5",PER:"5",END:"6",CHA:"8",INT:"5",AGI:"5",LCK:"5"},skills:[{name:"Barter",rating:1},{name:"Sneak",rating:2},{name:"Energy Weapons",rating:3},{name:"Speech",rating:3},{name:"Melee Weapons",rating:1},{name:"Survival",rating:4,tagged:true},{name:"Repair",rating:1}],
    hp:"14",initiative:"10",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 1 Arms/Legs/Torso • Energy 1 Arms/Legs/Torso • Radiation 2 (All) • Poison 0",
    attacks:"• UNARMED — STR + Unarmed (TN 5), 2 CD Physical\n• GAMMA GUN — PER + Energy Weapons (TN 8), 3 CD Piercing, Stun Radiation, FR 1, Range M, Blast, Inaccurate",
    abilities:"• ATOM'S GLOW — +2 Radiation DR (included in the stat block).",loot:"Tough Clothing, Gamma Gun, 2d20 Gamma Rounds, Wealth 1.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 391."
  },
  {
    id:"gunner",name:"Gunner",category:"enemy",tags:["human","gunner","normal-character"],level:"6",creatureType:"Human • Normal Character",xp:"45",statKind:"character",
    special:{STR:"5",PER:"6",END:"6",CHA:"5",INT:"5",AGI:"7",LCK:"4"},skills:[{name:"Athletics",rating:1},{name:"Science",rating:2},{name:"Big Guns",rating:2},{name:"Small Guns",rating:3,tagged:true},{name:"Energy Weapons",rating:3,tagged:true},{name:"Survival",rating:1},{name:"Melee Weapons",rating:3}],
    hp:"12",initiative:"13",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical: 1 Arms; 2 Legs/Torso • Energy 2 Arms/Legs/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED — STR + Unarmed (TN 5), 4 CD Physical\n• LASER GUN — AGI + Energy Weapons (TN 9), 4 CD Piercing Energy, FR 2, Range C\nOR • COMBAT RIFLE — AGI + Small Guns (TN 10), 5 CD Physical, FR 2, Range M, Two-Handed",
    abilities:"• LET RIP — once per combat adds the weapon's FR 2 to one Combat Rifle or Laser Gun attack (7 CD total as printed).",loot:"Combat Armor Chest Piece, Leather Legs ×2, Leather Arms ×2, Combat Rifle or Laser Gun, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 392."
  },
  {
    id:"mercenary",name:"Mercenary",category:"npc",tags:["human","mercenary","normal-character"],level:"6",creatureType:"Human • Normal Character",xp:"45",statKind:"character",
    special:{STR:"6",PER:"6",END:"6",CHA:"5",INT:"5",AGI:"6",LCK:"4"},skills:[{name:"Athletics",rating:1},{name:"Small Guns",rating:3,tagged:true},{name:"Big Guns",rating:1},{name:"Sneak",rating:2,tagged:true},{name:"Energy Weapons",rating:1},{name:"Speech",rating:1},{name:"Medicine",rating:1},{name:"Survival",rating:1},{name:"Melee Weapons",rating:2,tagged:true},{name:"Unarmed",rating:1}],
    hp:"12",initiative:"12",defense:"1",carryWeight:"210 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 2 Arms/Legs/Torso • Energy 2 Arms/Legs/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 7), 2 CD Physical\n• COMBAT RIFLE — AGI + Small Guns (TN 9), 2 CD Physical, FR 2, Range M, Two-Handed\n• DOUBLE-BARRELLED SHOTGUN — AGI + Small Guns (TN 9), 6 CD Spread, Vicious Physical, Range C, Inaccurate, Two-Handed\n• MOLOTOV COCKTAIL — PER + Explosives (TN 6), 4 CD Persistent Energy, Blast, Throwing, Range M",
    abilities:"• LET RIP — once per combat adds the Combat Rifle's FR 2 to one attack (7 CD total as printed).",loot:"Combat Armor Chest Piece, Combat Armor Legs ×2, Combat Armor Arms ×2, Combat Rifle, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 392–393."
  },
  {
    id:"minuteman",name:"Minuteman",category:"ally",tags:["human","minutemen","normal-character"],level:"7",creatureType:"Human • Normal Character",xp:"39",statKind:"character",
    special:{STR:"6",PER:"7",END:"5",CHA:"7",INT:"5",AGI:"5",LCK:"4"},skills:[{name:"Athletics",rating:1},{name:"Small Guns",rating:3,tagged:true},{name:"Energy Weapons",rating:3},{name:"Sneak",rating:1},{name:"Medicine",rating:1},{name:"Speech",rating:2},{name:"Melee Weapons",rating:2},{name:"Survival",rating:1,tagged:true},{name:"Repair",rating:2}],
    hp:"12",initiative:"12",defense:"1",carryWeight:"210 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 1 Arms/Legs/Torso • Energy 1 Arms/Legs/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 6), 3 CD Physical\n• LASER MUSKET — PER + Energy Weapons (TN 10), 5 CD Piercing Energy, Range M, Two-Handed",
    abilities:"None.",loot:"Tough Clothing, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 393–394."
  },
  {
    id:"railroad-agent",name:"Railroad Agent",category:"ally",tags:["human","railroad","normal-character"],level:"7",creatureType:"Human • Normal Character",xp:"39",statKind:"character",
    special:{STR:"5",PER:"7",END:"6",CHA:"6",INT:"6",AGI:"5",LCK:"4"},skills:[{name:"Barter",rating:1},{name:"Science",rating:2},{name:"Energy Weapons",rating:1},{name:"Small Guns",rating:2,tagged:true},{name:"Lockpick",rating:2},{name:"Sneak",rating:3,tagged:true},{name:"Medicine",rating:1},{name:"Speech",rating:1},{name:"Melee Weapons",rating:1},{name:"Survival",rating:2},{name:"Repair",rating:1}],
    hp:"13",initiative:"12",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 1 Arms/Legs/Torso • Energy 1 Arms/Legs/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 5), 2 CD Physical\n• HUNTING RIFLE — AGI + Small Guns (TN 7), 6 CD Piercing Energy, Range M, Two-Handed",
    abilities:"• RAILROAD AGENT — while undercover, +1d20 on Speech tests involving deception.",loot:"Tough Clothing, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 394."
  },
  {
    id:"institute-scientist",name:"Institute Scientist",category:"npc",tags:["human","institute","normal-character"],level:"7",creatureType:"Human • Normal Character",xp:"39",statKind:"character",
    special:{STR:"4",PER:"8",END:"5",CHA:"5",INT:"8",AGI:"5",LCK:"4"},skills:[{name:"Energy Weapons",rating:2},{name:"Science",rating:5,tagged:true},{name:"Medicine",rating:4,tagged:true},{name:"Speech",rating:3},{name:"Repair",rating:4}],
    hp:"12",initiative:"12",defense:"1",carryWeight:"190 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 0 • Energy 0 • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 4), 2 CD Physical\n• INSTITUTE LASER — PER + Energy Weapons (TN 10), 4 CD Vicious Energy, Burst, FR 3, Close Quarters, Inaccurate",
    abilities:"• LAB COAT — once per scene, may reroll one d20 on an INT-based skill test.",loot:"Lab Coat, Institute Laser, 2d20 Fusion Cells.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 394–395."
  },
  {
    id:"trader-caravan-merchant",name:"Trader / Caravan Merchant",category:"ally",tags:["human","merchant","notable-character"],level:"4",creatureType:"Human • Notable Character",xp:"62",statKind:"character",
    special:{STR:"5",PER:"6",END:"6",CHA:"9",INT:"8",AGI:"5",LCK:"5"},skills:[{name:"Barter",rating:4,tagged:true},{name:"Small Guns",rating:3},{name:"Lockpick",rating:1},{name:"Speech",rating:3,tagged:true},{name:"Melee Weapons",rating:2},{name:"Survival",rating:2,tagged:true},{name:"Repair",rating:1},{name:"Unarmed",rating:2}],
    hp:"15",initiative:"13",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"3",drBlock:"Physical 1 Arms/Legs/Torso • Energy 2 Arms/Legs/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 7), 2 CD Physical\n• 10MM AUTO PISTOL — AGI + Small Guns (TN 8), 3 CD Burst Physical, Range C, FR 4, Close Quarters, Inaccurate\n• DOUBLE-BARRELLED SHOTGUN — AGI + Small Guns (TN 8), 6 CD Spread, Vicious Physical, Range C, Inaccurate, Two-Handed\n• MOLOTOV COCKTAIL — PER + Explosives (TN 6), 4 CD Persistent Energy, Blast, Throwing, Range M",
    abilities:"• LET RIP — once per combat adds FR 4 to a 10mm Auto Pistol attack (7 CD total) and allows Burst without ammo cost.\n• MASTER TRADER — in an opposed Barter test, adds 1 automatic success to rolled successes.\n• SHOPKEEP — accompanied by a pack brahmin or runs a shop; carries 6d20 caps for trade; GM determines available goods.",loot:"Drifter Outfit, 10mm Auto Pistol, Wealth 6.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 395–396."
  },
  {
    id:"vault-dweller-npc",name:"Vault Dweller",category:"ally",tags:["human","vault-dweller","normal-character"],level:"7",creatureType:"Human • Normal Character",xp:"52",statKind:"character",
    special:{STR:"5",PER:"6",END:"7",CHA:"6",INT:"6",AGI:"6",LCK:"5"},skills:[{name:"Barter",rating:2,tagged:true},{name:"Science",rating:3},{name:"Energy Weapons",rating:1},{name:"Small Guns",rating:3,tagged:true},{name:"Medicine",rating:1},{name:"Survival",rating:2,tagged:true},{name:"Melee Weapons",rating:2},{name:"Unarmed",rating:1},{name:"Repair",rating:2,tagged:true}],
    hp:"14",initiative:"10",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 1 Arms/Legs/Torso • Energy 1 Arms/Legs/Torso • Radiation 2 Arms/Legs/Torso • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 6), 3 CD Physical\n• 10MM PISTOL — AGI + Small Guns (TN 9), 4 CD Physical, FR 2, Range C, Close Quarters, Reliable",
    abilities:"• VAULT KID — reduces Difficulty of END tests to resist disease; once per quest the GM may introduce a vault/isolated-life complication to restore 1 Luck.\n• EDUCATED — one additional Tag Skill.\n• GIFTED — choose two S.P.E.C.I.A.L. attributes and increase each by +1.",loot:"Vault Jumpsuit, 10mm Pistol, 2d20 10mm rounds, Wealth 2.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), pp. 396–397."
  },
  {
    id:"wastelander-npc",name:"Wastelander",category:"npc",tags:["human","wastelander","normal-character"],level:"2",creatureType:"Human • Normal Character",xp:"17",statKind:"character",
    special:{STR:"7",PER:"6",END:"7",CHA:"4",INT:"5",AGI:"6",LCK:"4"},skills:[{name:"Athletics",rating:1},{name:"Small Guns",rating:2,tagged:true},{name:"Barter",rating:1},{name:"Speech",rating:1},{name:"Melee Weapons",rating:2},{name:"Survival",rating:2,tagged:true},{name:"Repair",rating:1},{name:"Unarmed",rating:1}],
    hp:"8",initiative:"11",defense:"1",carryWeight:"200 lbs.",meleeBonus:"—",luckPoints:"—",drBlock:"Physical 1 Arms/Legs/Torso • Energy 1 Arms/Legs/Torso • Radiation 0 • Poison 0",
    attacks:"• UNARMED STRIKE — STR + Unarmed (TN 8), 2 CD Physical\n• MACHETE — STR + Melee Weapons (TN 9), 3 CD Piercing 1 Physical\n• DOUBLE-BARRELLED SHOTGUN — AGI + Small Guns (TN 8), 5 CD Spread, Vicious Physical, Range C, Inaccurate, Two-Handed",abilities:"None.",loot:"Road Leathers, Double-Barrelled Shotgun, Wealth.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 397."
  },
  {
    id:"zetan",name:"Zetan (Aliens)",category:"enemy",tags:["alien","normal-creature"],level:"8",creatureType:"Alien • Normal Creature",xp:"38",statKind:"creature",body:"7",mind:"5",melee:"0",guns:"4",other:"2",
    hp:"14",initiative:"12",defense:"1",drBlock:"Physical 1 (All) • Energy 3 (All) • Radiation 0 • Poison 0",
    attacks:"• ALIEN BLASTER — BODY + Guns (TN 11), 5 CD Energy, Blast, Range C, FR 2, Reliable",abilities:"• ALIEN — cannot be reasoned with or influenced by Speech tests.",loot:"Alien Blaster, 5d20 Alien Blaster rounds.",source:"Fallout: The Roleplaying Game Core Rulebook, 2nd Printing (April 2022 Errata), p. 398."
  }
];
