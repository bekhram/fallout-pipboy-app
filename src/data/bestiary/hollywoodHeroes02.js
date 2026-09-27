const SOURCE = "Fallout NPC Pack — Hollywood Heroes";

const S = (...items) => items.map(([name, rating, tagged = false]) => ({ name, rating, tagged }));
const C = (id, name, category, level, xp, type, special, skills, hp, initiative, defense, carryWeight, meleeBonus, luckPoints, drBlock, attacks, abilities, loot, tags = [], sourcePage = "") => ({
  id, name, category, tags: ["hollywood-heroes", ...tags],
  level: String(level), xp: String(xp), creatureType: type,
  statKind: "character", cardKind: "npc",
  special, skills, hp: String(hp), initiative: String(initiative), defense: String(defense),
  carryWeight, meleeBonus, luckPoints, drBlock, attacks, abilities, loot,
  source: sourcePage ? `${SOURCE}, p. ${sourcePage}.` : SOURCE,
});
const R = (id, name, level, xp, body, mind, melee, guns, other, hp, initiative, defense, drBlock, attacks, abilities, loot, tags = [], sourcePage = "") => ({
  id, name, category: "creature", tags: ["hollywood-heroes", ...tags],
  level: String(level), xp: String(xp), creatureType: "Mammal • Mighty Creature",
  statKind: "creature", cardKind: "creature",
  body: String(body), mind: String(mind), melee: String(melee), guns: String(guns), other: String(other),
  hp: String(hp), initiative: String(initiative), defense: String(defense),
  drBlock, attacks, abilities, loot,
  source: sourcePage ? `${SOURCE}, p. ${sourcePage}.` : SOURCE,
});

export default [
  C(
    "hh-dr-wilzig","Dr Wilzig","npc",4,62,"Human • Notable Character",
    {STR:"5",PER:"8",END:"7",CHA:"5",INT:"10",AGI:"3",LCK:"4"},
    S(["Medicine",4,true],["Sneak",2],["Repair",2],["Speech",3],["Science",5,true],["Survival",4,true]),
    15,15,1,"200 lbs.","—","2",
    "Physical 0 • Energy 0 • Radiation 0 • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 5), 2 CD Physical",
    "• YOU'RE GOING TO HAVE TO ADAPT — Dr Wilzig always uses INT when assisting with a task.\n• JIM'S LIMBS — AGI is reduced by 2 (already included). He cannot use Two-Handed equipment or take the Sprint action; AP cost to cross difficult terrain or obstacles is increased by 1.",
    "Lab Coat, Casual Clothing, Vault-Tec Plan D, Jim's Limb (Foot), Wealth 1.",
    ["human","enclave","notable-character"],22
  ),
  R(
    "hh-cx404","CX404",5,76,7,6,4,"—",4,24,13,1,
    "Physical 0 • Energy 0 • Radiation 0 • Poison 0",
    "BITE — Body + Melee (TN 11), 4 CD Physical",
    "• GOOD GIRL — CX404 is fiercely loyal to her master; gains +1 die to Body if her master is in the scene and moves as fast as possible to defend them if dying.\n• FETCH — may be commanded with Command an NPC as a minor action.\n• KEEN SENSES — exceptionally keen senses; may detect things others normally cannot and reduce the difficulty of other PER tests by 1 (minimum 0).",
    "BUTCHERY — END + Survival difficulty 0 yields 1 portion of dog meat.",
    ["dog","mighty-creature"],23
  ),
  C(
    "hh-ma-june","Ma June","npc",2,17,"Human • Normal Character",
    {STR:"5",PER:"6",END:"5",CHA:"4",INT:"5",AGI:"6",LCK:"5"},
    S(["Barter",4,true],["Small Guns",2],["Repair",2],["Speech",3,true]),
    7,12,1,"200 lbs.","—","—",
    "Physical 1 • Energy 1 • Radiation 0 • Poison 0",
    "LONG HIGH CAPACITY HUNTING RIFLE — AGI + Small Guns (TN 8), 6 CD Piercing 1 Physical, FR 0, Range L, Two-Handed, Unreliable",
    "• 1000 CAPS TO WHOEVER KILLS THAT GUY! — twice per scene, at the start of her turn, Ma June may spend 3 AP to add a Mercenary NPC to the scene.",
    "Tough Clothing, Long High Capacity Hunting Rifle, 6+3 .308 Ammunition, Wealth 3.",
    ["human","filly","normal-character"],23
  ),
  C(
    "hh-barv","Barv","npc",2,17,"Human • Normal Character",
    {STR:"5",PER:"4",END:"5",CHA:"4",INT:"6",AGI:"5",LCK:"7"},
    S(["Barter",2,true],["Repair",3,true],["Medicine",2],["Science",2],["Pilot",1],["Survival",2]),
    7,9,1,"200 lbs.","—","—",
    "Physical 0 • Energy 0 • Radiation 0 • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 5), 2 CD Physical",
    "• IT WASN'T WHERE YOU SAID IT WAS — once per scene Barv may spend 2 AP to reroll one Random Oddities and Valuables table result.",
    "Casual Clothing, Pork 'n' Beans, Wealth 2.",
    ["human","filly","normal-character"],23
  ),
  C(
    "hh-honcho","Honcho","npc",3,24,"Human • Normal Character",
    {STR:"6",PER:"6",END:"5",CHA:"6",INT:"5",AGI:"5",LCK:"4"},
    S(["Athletics",2],["Speech",1],["Barter",1],["Survival",2],["Melee Weapons",2,true],["Unarmed",1],["Small Guns",3,true]),
    8,11,1,"210 lbs.","—","—",
    "Physical 2 • Energy 2 • Radiation 0 • Poison 0",
    "LEVER-ACTION RIFLE — AGI + Small Guns (TN 8), 7 CD Piercing 1 Physical, FR 0, Range M, Two-Handed",
    "• ONE LAST JOB — the difficulty of any CHA + Speech test made to convince Honcho can be reduced by 1, to a minimum of 0, by offering an appropriate amount of Caps. A ridiculous amount negates the test entirely.",
    "Hunter's Pelt Outfit, Lever-Action Rifle, 6+3 .308 Ammunition, Wealth 1.",
    ["human","bounty-hunter","normal-character"],24
  ),
  C(
    "hh-biggie","Biggie","npc",2,17,"Human • Normal Character",
    {STR:"6",PER:"5",END:"6",CHA:"5",INT:"4",AGI:"5",LCK:"5"},
    S(["Athletics",2,true],["Small Guns",1],["Big Guns",3,true],["Unarmed",2],["Repair",3,true]),
    8,10,1,"210 lbs.","—","—",
    "Physical 1 Torso/Arms/Legs • Energy 2 Torso/Arms/Legs • Radiation 0 • Poison 0",
    "RECOIL COMPENSATED JUNK JET — END + Big Guns (TN 9), 6 CD Physical, FR 2, Range M, Two-Handed",
    "• ONE LAST JOB — the difficulty of any CHA + Speech test made to convince Biggie can be reduced by 1, to a minimum of 0, by offering an appropriate amount of Caps. A ridiculous amount negates the test entirely.",
    "Tough Clothing, Leather Armor (Torso, Arms, Legs), Junk Jet, 1d20 Junk, Wealth 1.",
    ["human","bounty-hunter","normal-character"],25
  ),
  C(
    "hh-slim","Slim","npc",2,17,"Human • Normal Character",
    {STR:"6",PER:"5",END:"5",CHA:"5",INT:"5",AGI:"6",LCK:"4"},
    S(["Athletics",2],["Small Guns",3,true],["Melee Weapons",2,true],["Survival",1],["Repair",1],["Unarmed",1]),
    8,10,1,"210 lbs.","—","—",
    "Physical 1 Torso/Arms/Legs • Energy 1 Torso/Arms/Legs • Radiation 1 Torso/Arms/Legs • Poison 0",
    "DOUBLE-BARREL SHOTGUN — AGI + Small Guns (TN 9), 5 CD Spread, Vicious Physical, FR 0, Range C, Inaccurate, Two-Handed",
    "• ONE LAST JOB — the difficulty of any CHA + Speech test made to convince Slim can be reduced by 1, to a minimum of 0, by offering an appropriate amount of Caps. A ridiculous amount negates the test entirely.",
    "Heavy Coat, Double-Barrel Shotgun, 6+3 Shotgun Shells, Wealth 1.",
    ["human","bounty-hunter","normal-character"],25
  ),
];
