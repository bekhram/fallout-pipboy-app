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

export default [
  C(
    "hh-lucy-maclean","Lucy MacLean","ally",3,72,"Human • Major Character",
    {STR:"6",PER:"6",END:"6",CHA:"8",INT:"9",AGI:"7",LCK:"9"},
    S(["Athletics",2,true],["Small Guns",3,true],["Medicine",1],["Speech",2],["Melee Weapons",1],["Survival",2],["Repair",4,true],["Unarmed",3,true],["Science",4,true]),
    27,16,1,"210 lbs.","—","9",
    "Physical 0 • Energy 1 • Radiation 2 • Poison 0",
    "TRANQUILIZER PISTOL — AGI + Small Guns (TN 10), 5 CD Tranquilize 3, Persistent Poison, FR 0, Range C, Close Quarters, Reliable\nUNARMED STRIKE — STR + Unarmed (TN 9), 2 CD Physical",
    "• VAULT KID — raised in Vault 33; Lucy has one additional Tag skill.\n• OKEY DOKEY — the first time in a scene Lucy would spend Luck to perform the Stacked Deck action, the cost is reduced to 0.\n• SURVIVAL BY THE BOOK — reduce the difficulty of all INT tests by 1, but increase the difficulty of all Survival tests by 2.",
    "Tranquilizer Pistol, 6+2 Tranquilizer Darts, Vault Jumpsuit, Vault-Tec Survival Pack, Pip-Boy, Purified Water, Wealth 0.",
    ["human","vault-33","major-character"],6
  ),
  C(
    "hh-chet","Chet","ally",1,10,"Human • Normal Character",
    {STR:"6",PER:"4",END:"5",CHA:"5",INT:"5",AGI:"5",LCK:"6"},
    S(["Athletics",2],["Repair",3,true],["Lockpick",3,true],["Science",3,true],["Medicine",1]),
    6,9,1,"210 lbs.","—","—",
    "Physical 0 • Energy 1 • Radiation 2 • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 6), 2 CD Physical",
    "• VAULT KID — raised in Vault 33; Chet has one additional Tag skill.\n• RUN AND HIDE — after attempting an AGI + Sneak test with his major action, Chet may use a minor action to Sprint.",
    "Vault Jumpsuit, Pip-Boy, Wealth 0.",
    ["human","vault-33","normal-character"],8
  ),
  C(
    "hh-norm-maclean","Norm MacLean","ally",1,10,"Human • Normal Character",
    {STR:"4",PER:"6",END:"5",CHA:"4",INT:"7",AGI:"5",LCK:"5"},
    S(["Medicine",3],["Sneak",3,true],["Repair",3,true],["Speech",1],["Science",4,true]),
    6,11,1,"190 lbs.","—","—",
    "Physical 0 • Energy 1 • Radiation 2 • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 4), 2 CD Physical",
    "• VAULT KID — raised in Vault 33; Norm has one additional Tag skill.\n• RUN AND HIDE — after attempting an AGI + Sneak test with his major action, Norm may use a minor action to Sprint.",
    "Vault Jumpsuit, Pip-Boy, Wealth 0.",
    ["human","vault-33","normal-character"],8
  ),
  C(
    "hh-woody-thomas","Woody Thomas","ally",1,10,"Human • Normal Character",
    {STR:"5",PER:"5",END:"5",CHA:"5",INT:"5",AGI:"5",LCK:"6"},
    S(["Barter",2],["Science",3,true],["Medicine",2,true],["Speech",3,true],["Repair",2]),
    6,10,1,"200 lbs.","—","—",
    "Physical 0 • Energy 1 • Radiation 2 • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 5), 2 CD Physical",
    "• VAULT KID — raised in Vault 33; Woody has one additional Tag skill.\n• RUN AND HIDE — after attempting an AGI + Sneak test with his major action, Woody may use a minor action to Sprint.\n• GET THAT JELLY MOLD OUT OF HERE! — as a major action, Woody may use Command an NPC to order a member of Vault 33 to move up to one zone, provided they end in a zone containing no enemies.",
    "Vault Jumpsuit, Pip-Boy, Wealth 0.",
    ["human","vault-33","normal-character"],10
  ),
  C(
    "hh-stephanie-harper","Stephanie Harper","ally",1,10,"Human • Normal Character",
    {STR:"5",PER:"4",END:"5",CHA:"5",INT:"5",AGI:"6",LCK:"6"},
    S(["Athletics",1],["Speech",2,true],["Medicine",2],["Survival",1],["Science",2,true],["Unarmed",1],["Small Guns",3,true]),
    6,10,1,"200 lbs.","—","—",
    "Physical 0 • Energy 1 • Radiation 2 • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 6), 2 CD Physical\nSTEN GUN — AGI + Small Guns (TN 9), 4 CD Burst Physical, FR 3, Range M, Two-Handed, Inaccurate",
    "• VAULT KID — raised in a Vault; Steph has one additional Tag skill.\n• LET RIP — once per combat, adds the Sten Gun's FR 3 to one attack (7 CD total).\n• STAND AND FIGHT — when making an attack, Steph gains one bonus d20.",
    "Vault Jumpsuit, Sten Gun, 10+5 9mm, Pip-Boy, Wealth 0.",
    ["human","vault-33","normal-character"],10
  ),
  C(
    "hh-overseer-hank-maclean","Overseer Hank MacLean","ally",2,34,"Human • Notable Character",
    {STR:"7",PER:"5",END:"6",CHA:"7",INT:"6",AGI:"6",LCK:"6"},
    S(["Athletics",1],["Speech",4,true],["Barter",3,true],["Survival",1],["Melee Weapons",3,true],["Unarmed",1],["Science",3,true]),
    14,13,1,"220 lbs.","+1 CD","3",
    "Physical 0 • Energy 1 • Radiation 2 • Poison 0",
    "SHOVEL — STR + Melee Weapons (TN 10), 4 CD Physical, Two-Handed",
    "• VAULT KID — raised in Vault 31; Hank has one additional Tag skill.\n• STAND AND FIGHT — when making an attack, Hank gains one bonus d20.\n• YOU'RE MY WORLD — if Lucy takes damage while Hank is within Close range, Hank may take the damage instead. If he does, he may take the Lucky Timing action even if he has already acted this round.",
    "Vault Jumpsuit, Shovel, Pip-Boy, Wealth 0.",
    ["human","vault-31","notable-character"],11
  ),
  C(
    "hh-maximus","Maximus","ally",3,48,"Human • Notable Character",
    {STR:"9",PER:"7",END:"10",CHA:"4",INT:"4",AGI:"6",LCK:"4"},
    S(["Athletics",2,true],["Small Guns",3,true],["Melee Weapons",2,true],["Speech",2],["Repair",2,true],["Unarmed",2]),
    17,15,1,"290 lbs.","+2 CD","2",
    "Physical 2 Torso/Arms/Legs • Energy 2 Torso/Arms/Legs • Radiation 2 Torso/Arms/Legs • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 11), 4 CD Physical\n10MM PISTOL — AGI + Small Guns (TN 9), 4 CD Physical, FR 2, Range C, Close Quarters, Reliable",
    "• HURT THE PEOPLE THAT HURT ME — if Maximus has taken damage in this scene, all of his attacks gain Vicious.\n• LET RIP — once per combat, adds the 10mm Pistol's FR 2 to one attack (6 CD total).\n• POWER ARMOR OPTION — in Knight Titus' T-60: STR 11; Melee Bonus +3 CD; armor locations Head 10, Torso 21, Arms 10, Legs 10; ranged attack complication range increases by 4 (to 16–20).",
    "Brotherhood of Steel Fatigues, 10mm Pistol, 8+4 10mm Ammo, Wealth 1. Optional: Power Armor Frame and full Knight Titus' T-60 Power Armor.",
    ["human","brotherhood-of-steel","notable-character"],14
  ),
  C(
    "hh-knight-titus","Knight Titus","ally",5,76,"Human • Notable Character",
    {STR:"9 (11 in Power Armor)",PER:"7",END:"8",CHA:"5",INT:"5",AGI:"7",LCK:"4"},
    S(["Athletics",3,true],["Survival",2],["Pilot",5,true],["Unarmed",3],["Small Guns",3,true]),
    "18 (10 Head, 21 Torso, 10 Arms, 10 Legs)",15,1,"240 lbs.","+2 CD (+3 CD in Power Armor)","2",
    "Physical: 7 Head; 9 Torso; 6 Arms/Legs • Energy: 6 Head; 8 Torso; 5 Arms/Legs • Radiation: 9 Torso; 7 Head/Arms/Legs • Poison 0",
    "UNARMED STRIKE — STR + Unarmed (TN 14), 5 CD Stun Physical\nLONG POWERFUL SCOPED ASSAULT RIFLE — AGI + Small Guns (TN 10), 7 CD Burst Physical, FR 2, Range L, Accurate, Two-Handed",
    "• TACTICAL RETREAT — when facing an enemy of Level 8 or higher, Titus must use the Sprint major action to attempt to run from the fight.\n• LET RIP — once per combat, adds the assault rifle's FR 2 to one attack (9 CD total).\n• INTEGRATED FLIGHT SYSTEM — his T-60 can fly/hover; see the armor system entry.",
    "Power Armor Frame, Full Suit of Knight Titus' T-60 Power Armor, Brotherhood of Steel Uniform, Long Powerful Scoped Assault Rifle, 30+4 5.56mm Ammo, Wealth 1.",
    ["human","brotherhood-of-steel","notable-character","power-armor"],16
  ),
  C(
    "hh-the-ghoul","The Ghoul","npc",10,222,"Mutated Human • Major Character",
    {STR:"7",PER:"9",END:"8",CHA:"9",INT:"6",AGI:"9",LCK:"6"},
    S(["Athletics",2],["Speech",3,true],["Barter",2],["Survival",3,true],["Melee Weapons",2],["Throwing",5,true],["Small Guns",5,true],["Unarmed",2]),
    30,22,1,"220 lbs.","+1 CD","6",
    "Physical 4 • Energy 3 • Radiation Immune • Poison Immune",
    "THE GHOUL'S PISTOL — AGI + Small Guns (TN 14), 8 CD Piercing 1 Physical, FR 1, Range M, Close Quarters, Debilitating\nTHE GHOUL'S RIFLE — AGI + Small Guns (TN 14), 7 CD Piercing 1 Physical, FR 3, Range M, Two-Handed\nCOMBAT KNIFE — STR + Melee Weapons (TN 9), 4 CD Piercing 1 Physical\nMAKESHIFT LASSO — AGI + Throwing (TN 14), 5 CD Stun Physical, FR 0, Range M, Throwing, Two-Handed, Wrangle\nUNARMED STRIKE — STR + Unarmed (TN 9), 3 CD Physical",
    "• BLOODY MESS — when The Ghoul inflicts a critical hit, roll 1 CD; on an Effect, inflict one additional Injury to a random location.\n• LET RIP — once per combat, add FR 1 to The Ghoul's Pistol or FR 3 to The Ghoul's Rifle (9 CD or 10 CD total).\n• US COWPOKES TAKE THINGS AS THEY COME — the first time he would take an Injury in a scene, roll 2 CD; if an Effect is rolled he takes the damage but does not suffer the Injury.\n• A VERY, VERY LARGE BUCKET OF DRUGS — immune to the effects of Chems.",
    "Casual Hat, 5 Cherry Tomatoes, Combat Knife, The Ghoul's Gunslinger Outfit, The Ghoul's Pistol, The Ghoul's Rifle, 6+3 .308 Ammunition, 6+2 Custom Shells, Wealth 5.",
    ["mutated-human","major-character","ghoul"],20
  ),
];
