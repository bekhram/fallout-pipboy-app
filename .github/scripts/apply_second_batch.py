from pathlib import Path

# ---------- WEAPONS CSV ----------
weapons_path = Path('public/weapons.csv')
weapons = weapons_path.read_text(encoding='utf-8')
weapon_rows = [
    'Melee Weapon,Assaultron Blade,1,3,50,,4,Piercing 1,Physical,0,C,,3,4,',
    'Melee Weapon,Auto-Axe,1,20,100,,5,Vicious,Physical,0,C,Two-Handed,3,5,',
    'Unarmed,Ballistic Fist,1,6,150,,6,"Stun, Vicious",Physical,0,C,Slow Load,4,6,',
    'Melee Weapon,Bumper Sword,1,12,125,,6,Piercing 1,Physical,0,C,"Recoil (7), Two-Handed",2,6,',
    'Melee Weapon,Cattle Prod,1,3,90,,7,Stun,Energy,0,C,,4,7,',
    'Melee Weapon,Chainsaw,1,12,140,,6,Vicious,Physical,0,C,Two-Handed,3,6,',
    'Unarmed,Death Tambo,1,1,40,,4,Piercing 1,Physical,0,C,,2,4,',
    'Unarmed,Displacer Glove,1,6,175,,6,"Piercing 1, Stun",Physical,0,C,,4,6,',
    'Melee Weapon,Guitar Sword,1,3,45,,4,Piercing 1,Physical,0,C,Parry,3,4,',
    'Melee Weapon,Mr Handy Buzz Blade,1,10,50,,4,Vicious,Physical,0,C,Two-Handed,2,4,',
    'Melee Weapon,Multi-Purpose Axe,1,4,40,,5,,Physical,0,C,Two-Handed,2,5,',
    'Melee Weapon,Proton Axe,1,8,175,,5,Piercing 1,Energy,0,C,Surge,5,5,',
    'Melee Weapon,War Drum,1,20,115,,5,Stun,Physical,0,C,Two-Handed,3,5,',
    'Explosive,Cryogenic Grenade,1,1,50,,6,Freeze,Energy,0,M,"Blast, Thrown",3,6,',
    'Explosive,Cryo Mine,1,1,50,,6,Freeze,Energy,0,M,"Blast, Mine",3,6,',
    'Explosive,Detonator,1,1,75,,0,,Special,0,C,,3,0,',
    'Explosive,Dynamite,1,0.5,25,,5,,Physical,0,M,"Blast, Thrown",2,5,',
    'Explosive,Dynamite Bundle,1,2,150,,9,Breaking,Physical,0,X,"Blast, Delay, Placed",3,9,',
    'Explosive,Flash Bang,1,1,40,,0,Special,Special,0,M,"Blast, Thrown",2,0,',
    'Explosive,Frag Grenade MIRV,1,1,75,,5,Spread,Physical,0,M,"Blast, Thrown",4,5,',
    'Explosive,Plastic Explosives,1,2,200,,10,"Breaking, Piercing 1",Physical,0,X,"Blast, Delay, Placed",4,10,',
    'Explosive,Powder Charge,1,1,25,,4,,Physical,0,M,"Blast, Mine",1,4,',
    'Explosive,Smoke Grenade,1,1,40,,0,Special,Special,0,M,"Blast, Thrown",2,0,',
]
for row in weapon_rows:
    name = row.split(',')[1]
    if f',{name},' not in weapons:
        weapons = weapons.rstrip('\n\r') + '\r\n' + row + '\r\n'
weapons_path.write_text(weapons, encoding='utf-8', newline='')

# ---------- WEAPON MODS ----------
mods_path = Path('src/data/weaponMods.js')
mods = mods_path.read_text(encoding='utf-8')
marker = '// === SUPPLEMENTAL WEAPON BATCH 2 ==='
if marker not in mods:
    block = r'''

// === SUPPLEMENTAL WEAPON BATCH 2 ===
const supplementalUnique = {
  bow: {
    frame: [mod("Compound Frame", "+1 damage; -1 Fire Rate; remove Recoil (6)", 1, 30, "Gun Nut 1", "Compound")],
    sights: [
      mod("Iron Sights", "Increase Range by 1 step", 1, 10, "Gun Nut 1", ""),
      mod("Glow Sights", "Increase Range by 1 step; gain Accurate", 1, 15, "Gun Nut 2", "Glow-Sighted"),
    ],
  },
  crossbow: {
    sights: [
      mod("Iron Sights", "Increase Range by 1 step", 1, 10, "Gun Nut 1", ""),
      mod("Glow Sights", "Increase Range by 1 step; gain Accurate", 1, 15, "Gun Nut 2", "Glow-Sighted"),
    ],
    frame: [
      mod("Heavy Frame", "+1 damage", 1, 30, "Gun Nut 1", "Heavy"),
      mod("Repeating Frame", "+1 Fire Rate; remove Slow Load", 2, 75, "Gun Nut 3", "Repeating"),
      mod("Multiple Launch Frame", "-1 damage; gain Ammo-Hungry (3) and Spread", 4, 60, "Gun Nut 2", "Peppered"),
    ],
  },
  "assaultron-blade": {
    blade: [mod("Electrified Blade", "+1 damage; damage type becomes Energy", 0, 50, "Blacksmith 2, Science! 1", "Electrified")],
  },
  "auto-axe": {
    head: [
      mod("Electrified", "+1 damage; damage type becomes Energy", 0, 50, "Blacksmith 2, Science! 1", "Electrified"),
      mod("Burning", "Damage type becomes Energy; gain Persistent", 0, 50, "Blacksmith 2, Science! 1", "Burning"),
      mod("Poisoned", "Gain Persistent (Poison)", 0, 50, "Blacksmith 2, Science! 1", "Toxic"),
      mod("Turbo", "Each AP spent for extra damage adds +2 damage instead of +1", 2, 50, "Blacksmith 2, Science! 1", "Turbo"),
    ],
  },
  chainsaw: {
    blade: [
      mod("Dual Bar", "+2 damage", 1, 30, "Blacksmith 2", "Dual"),
      mod("Bow Bar", "Gain Piercing 1", 2, 45, "Blacksmith 3", "Bow bar"),
      mod("Long Bow Bar", "Gain Persistent", 3, 60, "Blacksmith 3", "Long bow bar"),
    ],
    nozzle: [mod("Flamer", "+1 damage; damage type becomes Energy", 2, 90, "Blacksmith 3, Gun Nut 1", "Flaming")],
  },
  "gatling-laser": {
    capacitor: [
      mod("Gamma Wave Emitter", "+1 damage; gain Persistent", 3, 169, "Science! 3", "Fiery"),
      mod("Maximized Capacitor", "+2 damage", 3, 207, "Science! 4", "Maximized"),
      mod("Boosted Photon Agitator", "+2 damage; gain Vicious", 5, 244, "Science! 4", "Boosted, Agitated"),
      mod("Boosted Gamma Wave Emitter", "+2 damage; gain Persistent", 5, 282, "Science! 4", "Boosted Fiery"),
      mod("Overcharged Capacitor", "+3 damage", 5, 319, "Science! 4", "Overcharged"),
    ],
  },
};

const supplementalSmallGunMods = {
  "10mm-pistol": { receiver: [
    mod("Armor Piercing Receiver", "Add Piercing 1", 0, 3, "Gun Nut 1", "Armor Piercing"),
    mod("Armor Piercing Automatic Receiver", "-1 damage; +2 Fire Rate; add Piercing 1; gain Inaccurate", 1, 40, "Gun Nut 3", "AP Auto"),
    mod("Hardened Automatic Receiver", "+2 Fire Rate; gain Inaccurate", 2, 58, "Gun Nut 3", "Hardened Auto"),
    mod("Rapid Automatic Receiver", "-1 damage; +3 Fire Rate; gain Inaccurate", 2, 63, "Gun Nut 4", "Rapid"),
    mod("Calibrated Powerful Receiver", "+2 damage; gain Vicious", 3, 68, "Gun Nut 4", "Calibrated Powerful"),
    mod("Powerful Automatic Receiver", "+1 damage; +2 Fire Rate; gain Inaccurate", 4, 88, "Gun Nut 4", "Powerful Auto"),
    mod("Hardened Piercing Auto Receiver", "+2 Fire Rate; gain Piercing 1; gain Inaccurate", 3, 78, "Gun Nut 4", "Hardened AP Auto"),
  ]},
  "assault-rifle": { receiver: [] },
  "combat-rifle": { receiver: [] },
  "hunting-rifle": { receiver: [] },
  "submachine-gun": { receiver: [] },
  "pipe-gun": { receiver: [] },
  "combat-shotgun": { receiver: [] },
  "pipe-bolt-action": { receiver: [] },
  "pipe-revolver": { receiver: [] },
};
const sg = supplementalSmallGunMods;
const sg10 = sg["10mm-pistol"].receiver;
const pickMods = (...names) => sg10.filter((item) => names.includes(item.name));
sg["assault-rifle"].receiver.push(...sg10);
sg["combat-rifle"].receiver.push(...sg10);
sg["hunting-rifle"].receiver.push(...pickMods("Armor Piercing Receiver", "Calibrated Powerful Receiver"));
sg["submachine-gun"].receiver.push(...pickMods("Armor Piercing Receiver"), mod("9mm Receiver", "Damage becomes 3; ammo becomes 9mm; +1 Fire Rate", -1, 10, "Gun Nut 2", "9mm"));
sg["pipe-gun"].receiver.push(...sg10, mod("9mm Receiver", "Damage becomes 3; ammo becomes 9mm; +1 Fire Rate", -1, 10, "Gun Nut 2", "9mm"));
sg["combat-shotgun"].receiver.push(...pickMods("Hardened Automatic Receiver", "Rapid Automatic Receiver", "Calibrated Powerful Receiver", "Powerful Automatic Receiver"));
sg["pipe-bolt-action"].receiver.push(...pickMods("Calibrated Powerful Receiver"));
sg["pipe-revolver"].receiver.push(...pickMods("Calibrated Powerful Receiver"), mod(".357 Receiver", "Damage becomes 5; ammo becomes .357; gain Vicious", 1, 35, "Gun Nut 3", ".357"));

const supplementalEnergyMods = {
  "institute-laser": {
    capacitor: [
      mod("Gamma Wave Emitter", "+1 damage; gain Persistent", 1, 14, "Science! 1", "Fiery"),
      mod("Maximized Capacitor", "+2 damage", 1, 17, "Science! 2", "Maximized"),
      mod("Boosted Photon Agitator", "+2 damage; gain Vicious", 1, 20, "Science! 2", "Boosted, Agitated"),
      mod("Boosted Gamma Wave Emitter", "+2 damage; gain Persistent", 1, 23, "Science! 2", "Boosted, Fiery"),
      mod("Overcharged Capacitor", "+3 damage", 1, 42, "Science! 2", "Overcharged"),
    ],
    barrel: [
      mod("Improved Long Barrel", "+1 damage; remove Close Quarters; increase Range by 1 step", 1, 15, "Science! 2", "Improved Long"),
      mod("Improved Automatic Barrel", "Gain Burst; gain Inaccurate; remove Close Quarters; increase Range by 1 step; +1 Fire Rate", 1, 18, "Science! 2", "Improved Automatic"),
    ],
    muzzle: [
      mod("Amplified Beam Splitter", "Gain Spread; -1 Fire Rate; reduce Range by 1 step", 1, 15, "Science! 2", "Improved Scattered"),
      mod("Fine-Tuned Beam Focuser", "Increase Range by 1 step; gain Accurate", 1, 18, "Science! 2", "Improved Focused"),
      mod("Quantum Gyro-Compensating Lens", "+2 Fire Rate; remove Inaccurate", 1, 21, "Science! 3", "Improved Targeting"),
    ],
  },
  "laser-gun": {},
  "plasma-gun": {},
};
supplementalEnergyMods["laser-gun"] = {
  capacitor: [...supplementalEnergyMods["institute-laser"].capacitor],
  barrel: [
    ...supplementalEnergyMods["institute-laser"].barrel,
    mod("Improved Sniper Barrel", "+3 damage; remove Close Quarters; increase Range by 1 step; -1 Fire Rate", 1, 21, "Science! 2", "Improved Charging"),
  ],
  muzzle: [...supplementalEnergyMods["institute-laser"].muzzle],
};
supplementalEnergyMods["plasma-gun"] = {
  capacitor: [...supplementalEnergyMods["institute-laser"].capacitor],
  barrel: [
    ...supplementalEnergyMods["institute-laser"].barrel,
    mod("Improved Sniper Barrel", "+3 damage; remove Close Quarters; increase Range by 1 step; -1 Fire Rate", 1, 21, "Science! 2", "Improved Charging"),
    mod("Improved Splitter", "Gain Spread; gain Inaccurate", 1, 25, "Science! 2", "Improved Scattergun"),
  ],
};
'''
    mods = mods.replace('const melee = {', block + '\n\nconst melee = {', 1)
    old = '''  if (melee[slug]) return melee[slug];
  if (skill === "small_guns") return mergeGroups(smallGuns, unique[slug]);
  if (skill === "energy_weapons") return mergeGroups(energyWeapons, unique[slug]);
  return unique[slug] || {};'''
    new = '''  if (melee[slug]) return mergeGroups(melee[slug], supplementalUnique[slug]);
  if (skill === "small_guns") return mergeGroups(smallGuns, supplementalSmallGunMods[slug], unique[slug], supplementalUnique[slug]);
  if (skill === "energy_weapons") return mergeGroups(energyWeapons, supplementalEnergyMods[slug], unique[slug], supplementalUnique[slug]);
  return mergeGroups(unique[slug], supplementalUnique[slug]);'''
    if old not in mods:
        raise SystemExit('getWeaponModGroups patch target not found')
    mods = mods.replace(old, new, 1)
    mods = mods.replace('  head: "Weapon mod",\n};', '  head: "Weapon mod",\n  frame: "Frame",\n};', 1)
    mods_path.write_text(mods, encoding='utf-8')

# ---------- CRAFTING ----------
craft_path = Path('src/data/craftingRecipes.js')
craft = craft_path.read_text(encoding='utf-8')
craft_marker = '// === SUPPLEMENTAL WEAPON BATCH 2 CRAFTING ==='
if craft_marker not in craft:
    craft_block = r'''

// === SUPPLEMENTAL WEAPON BATCH 2 CRAFTING ===
WEAPON_RECIPES.push(
  ...group({ workbench: "weapons", category: "weapons", group: "BOWS", skill: "Survival", page: 74 }, [
    ["Bow", 3, "", "Common"],
    ["Compound Frame", 3, "Gun Nut 1", "Uncommon"],
    ["Iron Sights (Bow)", 2, "Gun Nut 1", "Uncommon", null, null, null, "Iron Sights"],
    ["Glow Sights (Bow)", 3, "Gun Nut 2", "Uncommon", null, null, null, "Glow Sights"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "CROSSBOW", skill: "Repair", page: 75 }, [
    ["Crossbow", 3, "Gun Nut 1", "Uncommon"],
    ["Iron Sights (Crossbow)", 2, "Gun Nut 1", "Uncommon", null, null, null, "Iron Sights"],
    ["Glow Sights (Crossbow)", 3, "Gun Nut 2", "Uncommon", null, null, null, "Glow Sights"],
    ["Heavy Frame", 2, "Gun Nut 1", "Uncommon"],
    ["Repeating Frame", 3, "Gun Nut 3", "Uncommon"],
    ["Multiple Launch Frame", 3, "Gun Nut 2", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ASSAULTRON BLADE MODS", skill: "Repair", page: 76 }, [["Electrified Blade", 4, "Blacksmith 2, Science! 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "AUTO-AXE MODS", skill: "Repair", page: 76 }, [
    ["Electrified", 4, "Blacksmith 2, Science! 1", "Uncommon"], ["Burning", 3, "Blacksmith 2, Science! 1", "Uncommon"], ["Poisoned", 3, "Blacksmith 2, Science! 1", "Uncommon"], ["Turbo", 4, "Blacksmith 2, Science! 1", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "CHAINSAW MODS", skill: "Repair", page: 78 }, [
    ["Dual Bar", 3, "Blacksmith 2", "Uncommon"], ["Bow Bar", 3, "Blacksmith 3", "Uncommon"], ["Long Bow Bar", 4, "Blacksmith 3", "Uncommon"], ["Flamer (Chainsaw)", 4, "Blacksmith 2, Gun Nut 1", "Uncommon", null, null, null, "Flamer"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ADDITIONAL SMALL GUN RECEIVERS", skill: "Repair", page: 82 }, [
    ["Armor Piercing Receiver", 3, "Gun Nut 1", "Uncommon"], ["Armor Piercing Automatic Receiver", 4, "Gun Nut 3", "Uncommon"], ["Hardened Automatic Receiver", 4, "Gun Nut 3", "Uncommon"], ["Rapid Automatic Receiver", 4, "Gun Nut 4", "Uncommon"], ["Calibrated Powerful Receiver", 4, "Gun Nut 4", "Uncommon"], ["Powerful Automatic Receiver", 4, "Gun Nut 4", "Uncommon"], ["Hardened Piercing Auto Receiver", 5, "Gun Nut 4", "Uncommon"], ["9mm Receiver", 3, "Gun Nut 2", "Uncommon"], [".357 Receiver", 3, "Gun Nut 3", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ADDITIONAL ENERGY WEAPON MODS", skill: "Science", page: 83 }, [
    ["Gamma Wave Emitter", 3, "Science! 1", "Uncommon"], ["Maximized Capacitor", 3, "Science! 2", "Uncommon"], ["Boosted Photon Agitator", 4, "Science! 2", "Uncommon"], ["Boosted Gamma Wave Emitter", 5, "Science! 2", "Uncommon"], ["Overcharged Capacitor", 4, "Science! 3", "Uncommon"], ["Improved Long Barrel", 4, "Science! 2", "Uncommon"], ["Improved Automatic Barrel", 5, "Science! 3", "Uncommon"], ["Improved Sniper Barrel", 5, "Science! 3", "Uncommon"], ["Improved Splitter", 4, "Science! 3", "Uncommon"], ["Amplified Beam Splitter", 5, "Science! 2", "Uncommon"], ["Fine-Tuned Beam Focuser", 5, "Science! 2", "Uncommon"], ["Quantum Gyro-Compensating Lens", 5, "Science! 3", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "GATLING LASER ADDITIONAL MODS", skill: "Science", page: 84 }, [
    ["Gamma Wave Emitter (Gatling Laser)", 3, "Science! 3", "Uncommon", null, null, null, "Gamma Wave Emitter"], ["Maximized Capacitor (Gatling Laser)", 3, "Science! 4", "Uncommon", null, null, null, "Maximized Capacitor"], ["Boosted Photon Agitator (Gatling Laser)", 4, "Science! 4", "Uncommon", null, null, null, "Boosted Photon Agitator"], ["Boosted Gamma Wave Emitter (Gatling Laser)", 5, "Science! 4", "Uncommon", null, null, null, "Boosted Gamma Wave Emitter"], ["Overcharged Capacitor (Gatling Laser)", 4, "Science! 4", "Uncommon", null, null, null, "Overcharged Capacitor"],
  ]),
);
'''
    craft = craft.replace('const CHEMISTRY_RECIPES = [', craft_block + '\n\nconst CHEMISTRY_RECIPES = [', 1)
    craft_path.write_text(craft, encoding='utf-8')
