import { INVENTORY_DATABASE } from "./inventoryDatabase.js";

const cd = (base, dice) => ({ type: "cd", base, dice });
const d20 = (dice) => ({ type: "d20", dice });

const item = (name, category, quantity = 1, extra = {}) => ({
  type: "item",
  name,
  category,
  quantity,
  ...extra,
});
const caps = (amount) => ({ type: "caps", amount });
const choice = (id, options, defaultOption = 0) => ({
  type: "choice",
  id,
  options,
  defaultOption,
});

export const TAG_SKILL_EQUIPMENT = {
  Athletics: [item("Casual Clothing", "armor"), item("Buffout", "aid")],
  Barter: [caps(d20(2))],
  "Big Guns": [item("Flamer Fuel", "ammo", cd(4, 2))],
  "Energy Weapons": [item("Fusion Cell", "ammo", cd(6, 3))],
  Explosives: [
    choice("explosive", [
      [item("Molotov Cocktail", "weapons", 2)],
      [item("Baseball Grenade", "weapons", 2)],
    ]),
  ],
  Lockpick: [item("Bobby Pin", "tools", cd(4, 2))],
  Medicine: [item("First Aid Kit", "tools"), item("Stimpak", "aid")],
  "Melee Weapons": [
    choice("melee", [
      [item("Machete", "weapons")],
      [item("Baseball Bat", "weapons")],
    ]),
  ],
  Pilot: [
    item("Broken Car Parts", "junk", 1, {
      effect: "Equivalent to 5 Common Materials.",
    }),
  ],
  Repair: [item("Multi-Tool", "tools")],
  Science: [item("Lab Coat", "armor"), item("Mentats", "aid")],
  "Small Guns": [{ type: "ownedAmmo", quantity: cd(6, 3), fallback: "10mm" }],
  Sneak: [item("Calmex", "aid")],
  Speech: [item("Formal Hat", "armor"), item("Formal Clothing", "armor")],
  Survival: [item("Purified Water", "beverages", 2), item("Iguana on a Stick", "food")],
  Throwing: [
    choice("throwing", [
      [item("Throwing Knives", "weapons", cd(4, 2))],
      [item("Tomahawk", "weapons", cd(2, 1))],
    ]),
  ],
  Unarmed: [item("Knuckles", "weapons")],
};

export const ATOMIC_WINTER_SURVIVAL_ITEMS = [
  item("Beer", "beverages"),
  item("Bourbon", "beverages"),
  item("Gas Mask", "armor"),
  item("Heavy Coat", "armor"),
  item("Hood or Cowl", "armor"),
  item("Molotov Cocktail", "weapons"),
  item("Pork 'N' Beans", "food"),
  item("RadAway", "aid"),
  item("Stimpak", "aid"),
];

export const ORIGIN_EQUIPMENT_PACKS = {
  bos_initiate: [
    item("Brotherhood of Steel Fatigues", "armor"),
    item("Brotherhood of Steel Hood", "armor"),
    item("Combat Knife", "weapons"),
    choice("sidearm", [
      [item("Laser Gun", "weapons"), item("Fusion Cell", "ammo", cd(10, 5))],
      [item("10mm Pistol", "weapons"), item("10mm", "ammo", cd(10, 5))],
    ]),
    item("Holotags", "tools"),
  ],
  bos_scribe: [
    item("Brotherhood Scribe's Armour", "armor"),
    item("Brotherhood Scribe's Hat", "armor"),
    item("Combat Knife", "weapons"),
    choice("sidearm", [
      [item("Laser Gun", "weapons"), item("Fusion Cell", "ammo", cd(6, 3))],
      [item("10mm Pistol", "weapons"), item("10mm", "ammo", cd(6, 3))],
    ]),
    item("Holotags", "tools"),
  ],
  miss_nanny: [
    item("10mm Auto Pistol Arm", "weapons"),
    item("Buzz-Saw Arm", "weapons"),
    item("Laser Emitter Arm", "weapons"),
    item("Mister Gutsy Plating", "armor"),
    item("Recon Sensors Mod", "misc"),
    caps(10),
  ],
  mister_farmhand: [
    item("Pincer Arm", "weapons"),
    item("Buzz-Saw Arm", "weapons"),
    item("Laser Emitter Arm", "weapons"),
    item("Standard Plating", "armor"),
    item("Bag of Fertilizer", "junk"),
    item("Mutfruit", "food", 2),
    caps(25),
  ],
  mister_gutsy: [
    item("Pincer Arm", "weapons"),
    item("Flamer Arm", "weapons"),
    choice("thirdArm", [
      [item("Buzz-Saw Arm", "weapons")],
      [item("Laser Emitter Arm", "weapons")],
      [item("10mm Auto Pistol Arm", "weapons")],
    ]),
    item("Standard Plating", "armor"),
    item("Behavioral Analysis Mod", "misc"),
    item("Hazard Detection Mod", "misc"),
    caps(10),
  ],
  mister_handy_pack: [
    item("Pincer Arm", "weapons"),
    item("Flamer Arm", "weapons"),
    item("Buzz-Saw Arm", "weapons"),
    item("Standard Plating", "armor"),
    item("Robot Repair Kit", "tools"),
    item("Integral Boiler Mod", "misc"),
    caps(10),
  ],
  nurse_handy: [
    choice("firstArm", [
      [item("Pincer Arm", "weapons")],
      [item("Buzz-Saw Arm", "weapons")],
    ]),
    item("Buzz-Saw Arm", "weapons"),
    choice("thirdArm", [
      [item("Laser Emitter Arm", "weapons")],
      [item("10mm Auto Pistol Arm", "weapons")],
      [item("Flamer Arm", "weapons")],
    ]),
    item("Standard Plating", "armor"),
    item("Stimpak", "aid"),
    item("Diagnosis Mod", "misc"),
    caps(10),
  ],
  brute: [
    item("Raider Chest Piece", "armor"),
    choice("raiderLimb", [[item("Raider Arm", "armor")], [item("Raider Leg", "armor")]]),
    item("Pipe Bolt-Action", "weapons"),
    item(".38", "ammo", cd(6, 3)),
    choice("melee", [[item("Baseball Bat", "weapons")], [item("Machete", "weapons")]]),
    item("Personal Trinket", "misc"),
    caps(5),
  ],
  skirmisher: [
    item("Raider Chest Piece", "armor"),
    choice("raiderLimb", [[item("Raider Arm", "armor")], [item("Raider Leg", "armor")]]),
    item("Pipe Bolt-Action", "weapons"),
    item(".308", "ammo", cd(8, 4)),
    item("Board", "weapons"),
    item("Personal Trinket", "misc"),
    caps(5),
  ],
  vault_tec_resident: [
    item("Vault Jumpsuit", "armor"),
    item("Vault-Tec Canteen", "misc"),
    item("Purified Water", "beverages"),
    item("Pip-Boy", "tools"),
    item("Switchblade", "weapons"),
    item("10mm Pistol", "weapons"),
    item("10mm", "ammo", cd(6, 3)),
    item("Stimpak", "aid", 2),
    caps(10),
  ],
  vault_tec_security: [
    item("Vault Jumpsuit", "armor"),
    item("Vault-Tec Security Armour", "armor"),
    item("Vault-Tec Security Helmet", "armor"),
    item("Vault-Tec Canteen", "misc"),
    item("Purified Water", "beverages"),
    item("Pip-Boy", "tools"),
    item("Baton", "weapons"),
    item("10mm Pistol", "weapons"),
    item("10mm", "ammo", cd(8, 4)),
    item("Stimpak", "aid"),
  ],
  mercenary: [
    item("Tough Clothing", "armor"),
    item("Leather Chest Piece", "armor"),
    item("Leather Arm", "armor"),
    item("Leather Leg", "armor"),
    choice("melee", [
      [item("Machete", "weapons")],
      [item("Baseball Bat", "weapons")],
      [item("Tire Iron", "weapons")],
    ]),
    choice("ranged", [
      [item("10mm Pistol", "weapons"), item("10mm", "ammo", cd(10, 5))],
      [item(".44 Pistol", "weapons"), item(".44 Magnum", "ammo", cd(10, 5))],
      [item("Hunting Rifle", "weapons"), item(".308", "ammo", cd(10, 5))],
      [item("Pipe Bolt-Action", "weapons"), item(".38", "ammo", cd(10, 5))],
    ]),
    item("Job Note", "misc", 1, { cost: "50" }),
    caps(15),
  ],
  raider: [
    item("Harness", "armor"),
    item("Raider Chest Piece", "armor"),
    item("Raider Arm", "armor"),
    choice("melee", [
      [item("Lead Pipe", "weapons")],
      [item("Pool Cue", "weapons")],
      [item("Tire Iron", "weapons")],
    ]),
    item("Pipe Gun", "weapons"),
    item(".38", "ammo", cd(10, 5)),
    choice("chem", [[item("Jet", "aid")], [item("RadAway", "aid")]]),
    choice("utility", [[item("Molotov Cocktail", "weapons")], [item("Stimpak", "aid")]]),
    caps(15),
  ],
  settler: [
    item("Tough Clothing", "armor"),
    choice("melee", [
      [item("Switchblade", "weapons")],
      [item("Pipe Wrench", "weapons")],
      [item("Rolling Pin", "weapons")],
      [item("Knuckles", "weapons")],
    ]),
    item("Pipe Gun", "weapons"),
    item(".38", "ammo", cd(6, 3)),
    { type: "randomFood", count: 2 },
    item("Personal Trinket", "misc"),
    caps(45),
  ],
  trader: [
    item("Tough Clothing", "armor"),
    item("Leather Chest Piece", "armor"),
    item("Leather Arm", "armor"),
    item("Leather Leg", "armor"),
    item("Pipe Gun", "weapons"),
    item(".38", "ammo", cd(8, 4)),
    item("Personal Trinket", "misc"),
    item("Pack Brahmin", "tools"),
    item("Random Wares", "misc", 1, { effect: "Roll on Ammo, Chem, and Oddities tables." }),
    caps(50),
  ],
  wanderer: [
    item("Drifter Outfit", "armor"),
    choice("melee", [
      [item("Switchblade", "weapons")],
      [item("Pipe Wrench", "weapons")],
      [item("Rolling Pin", "weapons")],
      [item("Knuckles", "weapons")],
    ]),
    item("Pipe Gun", "weapons"),
    item(".38", "ammo", cd(8, 4)),
    choice("chem", [[item("Jet", "aid")], [item("RadAway", "aid")]]),
    item("Personal Trinket", "misc"),
    caps(30),
  ],
  assaultron_military: [
    item("Laser Gun Attachment", "weapons"),
    choice("actuatedFrame", [[item("Actuated Frame Body", "armor")], [item("Actuated Frame Arm", "armor"), item("Actuated Frame Leg", "armor")]]),
    item("Standard Plating", "armor"),
    item("Fusion Cell", "ammo", cd(8, 7)),
    item("Recon Sensors Mod", "misc"),
    caps(15),
  ],
  assaultron_devil: [
    item("Skull Mask", "armor"),
    choice("serratedPlate", [[item("Serrated Plate Body", "armor")], [item("Serrated Plate Arm", "armor"), item("Serrated Plate Leg", "armor")]]),
    item("Construction Claw", "weapons", 2),
    item("Hazard Detection Mod", "misc"),
    item("Fusion Cell", "ammo", cd(6, 6)),
    item("Robot Repair Kit", "tools"),
  ],
  assaultron_caravan: [
    item("Laser Gun Attachment", "weapons"),
    item("Factory Storage Armor", "armor"),
    item("Factory Armor Legs", "armor"),
    item("Fusion Cell", "ammo", cd(14, 7)),
    { type: "randomWares", count: 3 },
    item("Behavioral Analysis Module", "misc"),
    caps(cd(10, 5)),
  ],
  outcast_ex_knight: [
    item("Laser Rifle", "weapons"),
    item("Fusion Cell", "ammo", cd(8, 6)),
    item("Tattered Brotherhood Fatigues", "armor"),
    item("Military Canteen", "beverages", 1, { effect: "Filled with water." }),
    { type: "randomOutcast", count: 2 },
    caps(10),
  ],
  outcast_ex_scribe: [
    item("Laser Pistol", "weapons"),
    item("Fusion Cell", "ammo", cd(8, 4)),
    item("Tattered Brotherhood Scribe's Armor", "armor"),
    item("Multi-Tool", "tools"),
    { type: "randomOutcast", count: 3 },
    caps(15),
  ],
  atom_missionary: [
    item("Tough Clothing", "armor"), item("Walking Cane", "weapons"),
    item("Gamma Gun", "weapons"), item("Gamma Round", "ammo", cd(4, 2)),
    item("Stimpak", "aid"), caps(10), { type: "randomFood", count: 1 },
  ],
  atom_zealot: [
    choice("clothing", [[item("Tough Clothing", "armor")], [item("Drifter Outfit", "armor")]]),
    item("Machete", "weapons"), item("Gamma Gun", "weapons"), item("Gamma Round", "ammo", cd(4, 2)),
    item("Gas Mask", "armor"), { type: "randomFood", count: 2 },
  ],
  nightkin_pack: [
    item("Laser Rifle", "weapons"), item("Fusion Cell", "ammo", cd(8, 6)),
    item("Bumper Sword", "weapons"), item("Raider Chest Piece", "armor"),
    item("Raider Arm", "armor"), item("Raider Leg", "armor"), item("Stealth Boy", "misc"),
    { type: "randomFood", count: 2 }, { type: "randomBeverage", count: 1 },
  ],
  tribal_modernist: [
    choice("modernWeapon", [
      [item("9mm Pistol", "weapons"), item("9mm", "ammo", cd(8, 6)), item("Combat Knife", "weapons")],
      [item("Pump-Action Shotgun", "weapons"), item("Shotgun Shell", "ammo", cd(12, 6))],
    ]),
    item("Underarmor Suit", "armor"),
    choice("combatArmor", [[item("Combat Chest Piece", "armor")], [item("Combat Arm", "armor"), item("Combat Leg", "armor")]]),
    item("Multi-Tool", "tools"), { type: "randomFood", count: 1 }, { type: "randomBeverage", count: 1 },
    item("Junk", "junk", 3),
  ],
  tribal_ritualist: [
    choice("ritualWeapon", [
      [item("Hunting Rifle", "weapons"), item(".308", "ammo", cd(6, 4))],
      [item("Black Powder Blunderbuss", "weapons"), item(".50 Ball", "ammo", cd(6, 4))],
      [item("Pipe Gun", "weapons"), item(".38", "ammo", cd(4, 6)), item("Pipe Revolver", "weapons"), item(".45", "ammo", cd(4, 6))],
    ]),
    item("Sturdy Clothing", "armor"), item("Leather Chest Piece", "armor"), item("Personal Trinket", "misc"),
    { type: "randomOddity", count: 2 },
  ],
  tribal_naturalist: [
    item("Bow", "weapons"), item("Arrow", "ammo", cd(10, 6)), item("Machete", "weapons"), item("Combat Knife", "weapons"),
    item("Hunter's Pelt Outfit", "armor"), item("Hunter's Hood", "armor"), item("Wood Armor Chest Piece", "armor"),
    choice("woodLimb", [[item("Wooden Arm", "armor")], [item("Wooden Leg", "armor")]]),
    { type: "randomFood", count: 3 }, { type: "randomBeverage", count: 3 },
  ],

  // SETTLERS_GUIDE_STARTING_PACKS
  minuteman_rifleman: [
    item("Casual Clothing", "armor"), item("Casual Hat", "armor"),
    choice("minutemanArmor", [[item("Leather Chest Piece", "armor")], [item("Leather Arm", "armor")]]),
    choice("minutemanRifle", [[item("Laser Musket", "weapons"), item("Fusion Cell", "ammo", cd(14, 7))], [item("Hunting Rifle", "weapons"), item(".308", "ammo", cd(6, 3))]]),
    { type: "randomFood", count: 2 }, item("Personal Trinket", "misc"), caps(5),
  ],
  minuteman_tough: [
    item("Casual Clothing", "armor"), item("Army Helmet", "armor"), item("Metal Chest Piece", "armor"),
    choice("minutemanClose", [[item("Double-Barrel Shotgun", "weapons"), item("Shotgun Shell", "ammo", cd(6, 3))], [item("Submachine Gun", "weapons"), item(".45", "ammo", cd(8, 4))]]),
    { type: "randomChems", count: 1 }, item("Personal Trinket", "misc"), caps(5),
  ],
  ncr_trooper: [
    item("Military Fatigues", "armor"), item("Army Helmet", "armor"),
    choice("ncrLongarm", [[item("Combat Rifle", "weapons"), item(".45", "ammo", cd(8, 4))], [item("Combat Shotgun", "weapons"), item("Shotgun Shell", "ammo", cd(6, 3))]]),
    choice("ncrSidearm", [[item("10mm Pistol", "weapons"), item("10mm", "ammo", cd(8, 4))], [item("Combat Knife", "weapons")]]),
    { type: "randomFood", count: 1 }, item("Purified Water", "beverages"), item("NCR Dollars", "misc", cd(5, 5)),
  ],
  ncr_marksman: [
    item("Military Fatigues", "armor"), item("Army Helmet", "armor"), item("Hardened Hunting Rifle", "weapons", 1, { effect: "Long scope." }), item(".308", "ammo", cd(6, 3)),
    item("Calmex", "aid"), item("Random U.S. Covert Operations Manual", "misc"), { type: "randomFood", count: 1 },
  ],
  ncr_crimson_caravaneer: [
    item("Tough Clothing", "armor"),
    choice("ncrLeather", [[item("Leather Chest Piece", "armor")], [item("Leather Arm", "armor"), item("Leather Leg", "armor")]]),
    choice("ncrCaravanGun", [[item("Double-Barrel Shotgun", "weapons"), item("Shotgun Shell", "ammo", cd(6, 3))], [item(".44 Pistol", "weapons"), item(".44 Magnum", "ammo", cd(4, 2))]]),
    choice("ncrCaravanMelee", [[item("Combat Knife", "weapons")], [item("Knuckles", "weapons")]]),
    item("Pack Brahmin", "tools"), item("Personal Trinket", "misc"), item("Foraging Supplies", "food", 15), { type: "randomBeverages", count: 2 }, item("Deck of Cards", "misc"), item("NCR Dollars", "misc", { type: "d20", dice: 2 }),
  ],
  protectron_standard: [
    item("Standard Plating", "armor"), item("Claw", "weapons", 2), item("Laser Gun", "weapons", 2), item("Fusion Cell", "ammo", cd(14, 7)),
    item("Recon Sensors Mod", "misc"), item("Hazard Detection Mod", "misc"), item("Robot Repair Kit", "tools"), caps(20),
  ],
  protectron_fire_brigadier: [
    item("Standard Plating", "armor"), item("Cryojet", "weapons"), item("Cryo Cell", "ammo", cd(14, 7)), item("Axe", "weapons"),
    choice("fireSensors", [[item("Hazard Detection Mod", "misc")], [item("Sensor Array", "misc")]]), item("Stimpak", "aid"), caps(10),
  ],
  protectron_medic: [
    item("Standard Plating", "armor"), item("Shock Hands", "weapons"), item("Diagnosis Mod", "misc"), item("Stimpak", "aid", 2), item("RadAway", "aid"),
  ],
  protectron_utility: [
    item("Factory Armor Body", "armor"), item("Factory Armor Arms", "armor"), item("Claw", "weapons"),
    choice("utilityWeapon", [[item("Sledgehammer", "weapons")], [item("Baton", "weapons")], [item("Railway Rifle", "weapons"), item("Railway Spike", "ammo", cd(6, 3))]]),
    choice("utilitySensor", [[item("Hazard Detection Mod", "misc")], [item("Sensor Array", "misc")]]), item("Robot Repair Kit", "tools"),
  ],
  nukatron: [
    item("Standard Plating", "armor"), item("Claw", "weapons"), choice("nukatronMod", [[item("Behavioral Analysis Mod", "misc")], [item("Integral Boiler Mod", "misc")]]),
    item("Perfectly Preserved Pie", "food"), choice("nukaDrinks", [[item("Nuka-Cola", "beverages", 4)], [item("Nuka-Cherry", "beverages", 2)]]),
  ],
  protectron_x: [
    item("Standard Plating", "armor"), item("Claw", "weapons", 2),
    choice("pxPrimary", [[item("Factory Armor Body", "armor"), item("Factory Armor Arms", "armor")], [item("Behavioral Analysis Mod", "misc")], [item("Diagnosis Mod", "misc")], [item("Hacking Module", "misc")], [item("Hazard Detection Mod", "misc")]]),
    choice("pxSensor", [[item("Radiation Coils", "misc")], [item("Recon Sensors Mod", "misc")], [item("Sensor Array", "misc")]]),
    choice("pxWeapon", [[item("Machete", "weapons")], [item("Aluminum Baseball Bat", "weapons")], [item("Syringer", "weapons"), item("Bleed-Out Syringe", "ammo", 10)]]),
    choice("pxLoot", [[item("Random Oddity or Valuable", "misc")], [item("Robot Repair Kit", "tools")]]),
  ],
  robobrain_servomech: [
    item("Mesmetron", "weapons"), item("Tesla Rifle", "weapons"), item("Smoke Claw", "weapons"), item("Fusion Cell", "ammo", cd(14, 7)), item("Robot Repair Kit", "tools", 2),
    choice("roboHat", [[item("Casual Hat", "armor")], [item("Formal Hat", "armor")]]), item("Personal Trinket", "misc"),
  ],
  robobrain_us_army: [
    item("Mesmetron", "weapons"), item("Smoke Claw", "weapons", 2), item("Fusion Cell", "ammo", cd(14, 7)), item("Combat Rifle", "weapons"), item(".45", "ammo", cd(8, 4)),
    item("Factory Armor Torso", "armor"), item("Factory Armor Left Arm", "armor"), item("Factory Armor Right Arm", "armor"),
  ],
  robobrain_errant: [
    item("Mesmetron", "weapons"),
    choice("roboArm1", [[item("Smoke Claw", "weapons")], [item("Tesla Rifle", "weapons")], [item("Flamer", "weapons")], [item("Laser Gun", "weapons")], [item("Sledgehammer", "weapons")]]),
    choice("roboArm2", [[item("Smoke Claw", "weapons")], [item("Tesla Rifle", "weapons")], [item("Flamer", "weapons")], [item("Laser Gun", "weapons")], [item("Sledgehammer", "weapons")]]),
    choice("roboAmmo", [[item("Fusion Cell", "ammo", cd(14, 7))], [item("Flamer Fuel", "ammo", cd(12, 6))]]), item("Personal Trinket", "misc", 2), item("Random Oddity or Valuable", "misc"), caps(10),
  ],
  securitron_standard: [
    item("Automatic Laser Gun", "weapons"), item("Fusion Cell", "ammo", cd(14, 7)), item("Submachine Gun", "weapons"), item(".45", "ammo", cd(8, 4)),
    item("Missile Launcher (Inoperable)", "weapons"), item("Grenade Launcher (Inoperable)", "weapons"), item("Factory Armor Torso", "armor"), item("Factory Armor Head", "armor"), item("Factory Armor Arms", "armor"), item("Integrated Printer", "misc"),
  ],
  synth_infiltrator: [
    item("Tough Clothing", "armor"), choice("synthMelee", [[item("Baseball Bat", "weapons")], [item("Switchblade", "weapons")]]),
    choice("synthGun", [[item("Pipe Gun", "weapons"), item(".38", "ammo", cd(10, 5))], [item("10mm Pistol", "weapons"), item("10mm", "ammo", cd(8, 4))]]),
    item("Personal Trinket", "misc"), { type: "randomChems", count: 2 },
  ],
  synth_seeker: [
    item("Tough Clothing", "armor"), choice("synthLeather", [[item("Leather Chest Piece", "armor")], [item("Leather Arm", "armor"), item("Leather Leg", "armor")]]),
    choice("synthMelee2", [[item("Knuckles", "weapons")], [item("Lead Pipe", "weapons")]]),
    choice("synthRanged", [[item("10mm Pistol", "weapons"), item("10mm", "ammo", cd(3, 3))], [item("Flare Gun", "weapons"), item("Flare", "ammo", cd(3, 3))], [item("Hunting Rifle", "weapons"), item(".308", "ammo", cd(3, 3))]]),
    { type: "randomWares", count: 2 },
  ],

};

function rollCombatDice(count = 0) {
  let total = 0;
  for (let i = 0; i < Number(count || 0); i += 1) {
    const face = Math.floor(Math.random() * 6) + 1;
    if (face === 1) total += 1;
    else if (face === 2) total += 2;
    else if (face >= 5) total += 1;
  }
  return total;
}

function resolveNumber(value) {
  if (typeof value === "number") return value;
  if (!value || typeof value !== "object") return Number(value || 0);
  if (value.type === "cd") return Number(value.base || 0) + rollCombatDice(value.dice);
  if (value.type === "d20") {
    let total = 0;
    for (let i = 0; i < Number(value.dice || 0); i += 1) {
      total += Math.floor(Math.random() * 20) + 1;
    }
    return total;
  }
  return Number(value.base || 0);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function toWeaponItem(row = {}) {
  const effects = String(row.Effects || "").trim();
  const qualities = String(row.Qualities || "").trim();
  return {
    name: row.name || "",
    category: "weapons",
    cost: String(row.Cost ?? ""),
    weight: String(row.Weight ?? "").replace(",", "."),
    rarity: String(row.Rarity ?? ""),
    effect: [effects, qualities ? `Qualities: ${qualities}` : ""].filter(Boolean).join(" • "),
    damage: String(row["Damage Rating"] ?? ""),
    rate: String(row["Rate of Fire"] ?? ""),
    range: String(row.Range ?? ""),
    damageType: String(row["Damage type"] ?? ""),
    weaponType: String(row["Weapon type"] ?? ""),
    qualities,
    ammo: String(row.Ammo ?? ""),
  };
}

function toArmorItem(entry = {}) {
  return {
    name: entry.name || "",
    category: "armor",
    cost: String(entry.cost ?? ""),
    weight: String(entry.weight ?? "").replace(",", "."),
    rarity: String(entry.rarity ?? ""),
    effect: String(entry.effects ?? ""),
    armorPhysical: String(entry.physical ?? ""),
    armorEnergy: String(entry.energy ?? ""),
    armorRadiation: String(entry.radiation ?? ""),
    armorLocations: [
      entry.locations?.head && "Head",
      entry.locations?.arms && "Arms",
      entry.locations?.legs && "Legs",
      entry.locations?.torso && "Torso",
    ].filter(Boolean).join(", "),
    armorGroup: String(entry.group || entry.category || ""),
  };
}

function enrichItem(spec, databases = {}) {
  const key = normalize(spec.name);
  const staticItem = INVENTORY_DATABASE.find((entry) => normalize(entry.name) === key);
  if (staticItem) return { ...staticItem, ...spec, category: spec.category || staticItem.category };

  const weapon = (databases.weapons || []).find((entry) => normalize(entry.name) === key);
  if (weapon) return { ...toWeaponItem(weapon), ...spec, category: spec.category || "weapons" };

  const armor = (databases.armor || []).find((entry) => normalize(entry.name) === key);
  if (armor) return { ...toArmorItem(armor), ...spec, category: spec.category || "armor" };

  const ammo = (databases.ammo || []).find((entry) => normalize(entry["Ammo Type"]) === key);
  if (ammo) {
    return {
      name: ammo["Ammo Type"],
      category: "ammo",
      cost: String(ammo.Cost ?? ""),
      weight: String(ammo.Weight ?? "").replace(",", "."),
      rarity: String(ammo.Rarity ?? ""),
      ...spec,
    };
  }

  return { ...spec };
}

const OUTCAST_RANDOM_ITEMS = [
  item("Deluxe Toolkit", "tools"), item("Flashlight", "tools"), item("Fixin' Things", "magazines"),
  item("Antibiotics", "aid"), item("Bottlecap Mine", "weapons"), item("Radio", "misc"),
  item("Combat Chest Piece", "armor"), item("Old World Cache Map", "misc"), item("Stimpak", "aid"),
  item("Combat Arm", "armor"), item("Combat Leg", "armor"), item("Sensor Array", "misc"),
  item("Backpack, Small", "misc"), item("Sword", "weapons"), item("Laser Musket", "weapons"),
  item("RadAway", "aid"), item("Combat Shotgun", "weapons"), item("Power Fist", "weapons"),
  item("Sturdy Combat Helmet", "armor"), item("Pip-Boy", "tools"),
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function flattenGrant(entries = [], form = {}, choices = {}) {
  const result = [];
  let capTotal = 0;

  entries.forEach((entry) => {
    if (!entry) return;
    if (entry.type === "caps") {
      capTotal += resolveNumber(entry.amount);
      return;
    }
    if (entry.type === "choice") {
      const selectedIndex = Number(choices?.[entry.id] ?? entry.defaultOption ?? 0);
      const selected = entry.options?.[selectedIndex] || entry.options?.[0] || [];
      const nested = flattenGrant(selected, form, choices);
      result.push(...nested.items);
      capTotal += nested.caps;
      return;
    }
    if (entry.type === "ownedAmmo") {
      const ownedAmmo = (form.inventoryItems || []).find((candidate) => candidate?.category === "ammo" && Number(candidate?.quantity || 0) > 0);
      result.push(item(ownedAmmo?.name || entry.fallback || "10mm", "ammo", entry.quantity));
      return;
    }
    if (entry.type === "randomFood") {
      const foods = INVENTORY_DATABASE.filter((candidate) => candidate.category === "food");
      for (let i = 0; i < Number(entry.count || 1); i += 1) {
        if (!foods.length) break;
        const picked = randomFrom(foods);
        result.push(item(picked.name, "food"));
      }
      return;
    }
    if (entry.type === "randomBeverage") {
      const drinks = INVENTORY_DATABASE.filter((candidate) => candidate.category === "beverages");
      for (let i = 0; i < Number(entry.count || 1); i += 1) {
        if (!drinks.length) break;
        const picked = randomFrom(drinks);
        result.push(item(picked.name, "beverages"));
      }
      return;
    }
    if (entry.type === "randomOddity") {
      const oddities = INVENTORY_DATABASE.filter((candidate) => ["misc", "tools", "magazines"].includes(candidate.category));
      for (let i = 0; i < Number(entry.count || 1); i += 1) {
        if (!oddities.length) break;
        const picked = randomFrom(oddities);
        result.push(item(picked.name, picked.category || "misc"));
      }
      return;
    }
    if (entry.type === "randomOutcast") {
      for (let i = 0; i < Number(entry.count || 1); i += 1) result.push({ ...randomFrom(OUTCAST_RANDOM_ITEMS) });
      return;
    }
    if (entry.type === "randomWares") {
      const ammoWares = [".38", "9mm", "10mm", ".308", "Shotgun Shell", "Fusion Cell", "Gamma Round", "Arrow", ".45"]
        .map((name) => item(name, "ammo"));
      const pools = [
        ammoWares,
        INVENTORY_DATABASE.filter((candidate) => candidate.category === "aid"),
        INVENTORY_DATABASE.filter((candidate) => candidate.category === "junk"),
      ];
      pools.forEach((pool) => {
        for (let i = 0; i < Number(entry.count || 1); i += 1) {
          if (!pool.length) break;
          const picked = randomFrom(pool);
          result.push(item(picked.name, picked.category || "misc"));
        }
      });
      return;
    }
    if (entry.type === "item") result.push({ ...entry });
  });

  return { items: result, caps: capTotal };
}

export function removeStartingEquipmentGrant(form, sourceKey) {
  const grants = { ...(form.startingEquipmentGrants || {}) };
  const previous = grants[sourceKey];
  if (!previous) return form;

  const inventoryItems = (form.inventoryItems || []).flatMap((inventoryItem) => {
    const sources = { ...(inventoryItem.starterSources || {}) };
    const contribution = Number(sources[sourceKey] || 0);
    if (contribution <= 0) return [inventoryItem];

    delete sources[sourceKey];
    const nextQuantity = Math.max(0, Number(inventoryItem.quantity || 0) - contribution);
    if (nextQuantity <= 0) return [];

    return [{
      ...inventoryItem,
      quantity: String(nextQuantity),
      starterSources: sources,
    }];
  });

  delete grants[sourceKey];
  return {
    ...form,
    inventoryItems,
    caps: String(Math.max(0, Number(form.caps || 0) - Number(previous.caps || 0))),
    startingEquipmentGrants: grants,
  };
}

export function applyStartingEquipmentGrant(form, sourceKey, entries, databases = {}, choices = {}) {
  let next = removeStartingEquipmentGrant(form, sourceKey);
  const resolved = flattenGrant(entries, next, choices);
  let inventoryItems = [...(next.inventoryItems || [])];
  const grantedItems = [];

  resolved.items.forEach((raw) => {
    const quantity = Math.max(1, resolveNumber(raw.quantity || 1));
    const enriched = enrichItem(raw, databases);
    const itemKey = normalize(enriched.name);
    const category = enriched.category || raw.category || "misc";
    const existingIndex = inventoryItems.findIndex((candidate) =>
      normalize(candidate?.name) === itemKey &&
      String(candidate?.category || "misc") === String(category) &&
      candidate?.sourceType !== "weapon" &&
      candidate?.sourceType !== "armor"
    );

    if (existingIndex >= 0) {
      const current = inventoryItems[existingIndex];
      const starterSources = { ...(current.starterSources || {}) };
      starterSources[sourceKey] = Number(starterSources[sourceKey] || 0) + quantity;
      inventoryItems[existingIndex] = {
        ...enriched,
        ...current,
        category,
        quantity: String(Number(current.quantity || 0) + quantity),
        starterSources,
      };
    } else {
      inventoryItems.push({
        ...enriched,
        category,
        quantity: String(quantity),
        sourceType: "starter-equipment",
        sourceId: sourceKey,
        starterSources: { [sourceKey]: quantity },
      });
    }
    grantedItems.push({ name: enriched.name, category, quantity });
  });

  return {
    ...next,
    inventoryItems,
    caps: String(Math.max(0, Number(next.caps || 0) + resolved.caps)),
    startingEquipmentGrants: {
      ...(next.startingEquipmentGrants || {}),
      [sourceKey]: {
        caps: resolved.caps,
        items: grantedItems,
        grantedAt: Date.now(),
      },
    },
  };
}

export function getOriginEquipmentGrant(packId) {
  return ORIGIN_EQUIPMENT_PACKS[packId] || [];
}

export function getAtomicWinterSurvivalGrant(selectedNames = []) {
  const selected = new Set(
    (Array.isArray(selectedNames) ? selectedNames : [])
      .map((name) => String(name || "").trim())
      .filter(Boolean)
      .slice(0, 2)
  );

  return ATOMIC_WINTER_SURVIVAL_ITEMS.filter((entry) => selected.has(entry.name));
}

export function getTagSkillEquipmentGrant(skillName) {
  return TAG_SKILL_EQUIPMENT[skillName] || [];
}
