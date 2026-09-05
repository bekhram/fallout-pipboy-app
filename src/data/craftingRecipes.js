const slug = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const group = (defaults, rows) => rows.map((row) => {
  const [name, complexity, perks = "", rarity = "Common", skillOverride = null, materials = null, outputCategory = null, outputName = null] = row;
  const skill = skillOverride || defaults.skill;
  return {
    id: slug(`${defaults.workbench}-${defaults.group}-${name}`),
    category: defaults.category,
    workbench: defaults.workbench,
    group: defaults.group,
    name,
    complexity,
    perks,
    skill,
    rarity,
    materials,
    outputCategory: outputCategory || defaults.outputCategory || "misc",
    outputName: outputName || name,
    sourcePage: defaults.page,
  };
});

export const COMPLEXITY_MATERIALS = {
  1: { "Common Materials": 2 },
  2: { "Common Materials": 3 },
  3: { "Common Materials": 4, "Uncommon Materials": 2 },
  4: { "Common Materials": 5, "Uncommon Materials": 3 },
  5: { "Common Materials": 6, "Uncommon Materials": 4, "Rare Materials": 2 },
  6: { "Common Materials": 7, "Uncommon Materials": 5, "Rare Materials": 3 },
  7: { "Common Materials": 8, "Uncommon Materials": 6, "Rare Materials": 4 },
};

export function getComplexityMaterials(complexity) {
  const key = Math.min(7, Math.max(1, Number(complexity) || 1));
  return { ...COMPLEXITY_MATERIALS[key] };
}

const ARMOR_RECIPES = [
  ...group({ workbench: "armor", category: "armor", group: "BALLISTIC WEAVE", skill: "Repair", page: 211 }, [
    ["Ballistic Weave", 3, "", "Rare"],
    ["Ballistic Weave Mk II", 3, "Armorer 1", "Rare"],
    ["Ballistic Weave Mk III", 3, "Armorer 2", "Rare"],
    ["Ballistic Weave Mk IV", 3, "Armorer 3", "Rare"],
    ["Ballistic Weave Mk V", 3, "Armorer 4", "Rare"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "VAULT SUIT LINING", skill: "Repair", page: 211 }, [
    ["Insulated Lining", 2],
    ["Treated Lining", 3, "Armorer 2", "Uncommon"],
    ["Resistant Lining", 4, "Armorer 3", "Uncommon"],
    ["Protective Lining", 5, "Armorer 4, Science! 2", "Uncommon"],
    ["Shielded Lining", 6, "Armorer 4, Science! 4", "Uncommon"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "RAIDER ARMOR MATERIAL", skill: "Repair", page: 212 }, [
    ["Welded", 2], ["Tempered", 3], ["Hardened", 4, "Armorer 1", "Uncommon"], ["Buttressed", 5, "Armorer 1", "Uncommon"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "LEATHER ARMOR MATERIAL", skill: "Repair", page: 212 }, [
    ["Boiled Leather", 2], ["Girded Leather", 3], ["Treated Leather", 4, "Armorer 1", "Uncommon"], ["Shadowed Leather", 5, "Armorer 1", "Uncommon"], ["Boiled Leather (Advanced)", 6, "Armorer 1", "Uncommon"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "METAL ARMOR MATERIAL", skill: "Repair", page: 212 }, [
    ["Painted Metal", 2], ["Enameled Metal", 3, "Armorer 1"], ["Shadowed Metal", 4, "Armorer 1", "Uncommon"], ["Alloyed Metal", 5, "Armorer 1", "Uncommon"], ["Polished Metal", 6, "Armorer 2", "Uncommon"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "COMBAT ARMOR MATERIAL", skill: "Repair", page: 212 }, [
    ["Reinforced", 3], ["Shadowed", 4, "Armorer 1", "Uncommon"], ["Fiberglass", 5, "Armorer 1", "Uncommon"], ["Polymer", 6, "Armorer 1", "Uncommon"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "SYNTH ARMOR MATERIAL", skill: "Repair", page: 212 }, [
    ["Laminated", 4], ["Resin", 5, "Armorer 1", "Uncommon"], ["Microcarbon", 6, "Armorer 1", "Uncommon"], ["Nanofilament", 7, "Armorer 1", "Uncommon"],
  ]),
  ...group({ workbench: "armor", category: "armor", group: "ARMOR MODS", skill: "Repair", page: 212 }, [
    ["Lighter Build", 2], ["Pocketed", 2, "", "Uncommon"], ["Deep Pocketed", 4, "Armorer 2", "Uncommon"], ["Lead Lined", 5, "Armorer 2, Science! 1", "Uncommon"], ["Ultra-Light Build", 5, "Armorer 3", "Uncommon"],
    ["Padded (Torso Only)", 3], ["Asbestos Lining (Torso Only)", 4, "Armorer 1", "Uncommon"], ["Dense (Torso Only)", 6, "Armorer 3", "Uncommon"], ["BioCommMesh (Torso Only)", 7, "Armorer 4, Science! 2", "Uncommon"], ["Pneumatic (Torso Only)", 6, "Armorer 4", "Uncommon"],
    ["Brawling (Arms Only)", 3, "Armorer 1", "Uncommon"], ["Braced (Arms Only)", 3, "Armorer 1", "Uncommon"], ["Stabilized (Arms Only)", 4, "Armorer 2", "Uncommon"], ["Aerodynamic (Arms Only)", 5, "Armorer 3", "Uncommon"], ["Weighted (Arms Only)", 6, "Armorer 4", "Uncommon"],
    ["Cushioned (Legs Only)", 3, "Armorer 1", "Uncommon"], ["Muffled (Legs Only)", 4, "Armorer 2", "Uncommon"],
  ]),
  ...group({ workbench: "power_armor", category: "armor", group: "POWER ARMOR UPGRADES", skill: "Repair", page: 219 }, [
    ["Raider II", 3, "Armorer 1", "Uncommon"], ["T-45b", 3, "Armorer 1", "Uncommon"], ["T-45c", 4, "Armorer 2", "Uncommon"], ["T-45d", 5, "Armorer 2, Science! 1", "Uncommon"], ["T-45e", 6, "Armorer 3, Science! 1", "Uncommon"], ["T-45f", 7, "Armorer 3, Science! 2", "Uncommon"],
    ["T-51b", 3, "Armorer 1", "Uncommon"], ["T-51c", 4, "Armorer 2", "Uncommon"], ["T-51d", 5, "Armorer 2, Science! 1", "Uncommon"], ["T-51e", 6, "Armorer 3, Science! 1", "Uncommon"], ["T-51f", 7, "Armorer 3, Science! 2", "Uncommon"],
    ["T-60b", 3], ["T-60c", 4, "Armorer 1, Science! 1", "Uncommon"], ["T-60d", 5, "Armorer 2, Science! 2", "Uncommon"], ["T-60e", 6, "Armorer 3, Science! 1", "Uncommon"], ["T-60f", 7, "Armorer 3, Science! 2", "Uncommon"],
    ["X-01 Mk II", 3], ["X-01 Mk III", 4, "Armorer 1, Science! 1", "Uncommon"], ["X-01 Mk IV", 5, "Armorer 2, Science! 2", "Uncommon"], ["X-01 Mk V", 6, "Armorer 3, Science! 1", "Uncommon"], ["X-01 Mk VI", 7, "Armorer 3, Science! 2", "Uncommon"],
  ]),
  ...group({ workbench: "power_armor", category: "armor", group: "POWER ARMOR SYSTEMS", skill: "Science", page: 220 }, [
    ["Rad Scrubber", 4, "Science! 2", "Uncommon"], ["Sensor Array", 5, "Science! 3", "Uncommon"], ["Targeting HUD", 5, "Science! 3", "Uncommon"], ["Internal Database", 4, "Science! 2", "Uncommon"],
    ["Welded Rebar (Raider only)", 2, "Armorer 1", "Uncommon", "Repair"], ["Core Assembly", 5, "Science! 3", "Uncommon"], ["Blood Cleanser", 4, "Science! 1", "Uncommon"], ["Emergency Protocols", 6, "Science! 4", "Uncommon"], ["Motion-Assist Servos", 5, "Science! 3", "Uncommon"], ["Kinetic Dynamo", 6, "Science! 4", "Uncommon"], ["Medic Pump", 6, "Science! 4", "Uncommon"], ["Reactive Plates", 5, "Armorer 4", "Uncommon", "Repair"], ["Tesla Coils", 5, "Science! 3", "Uncommon"], ["Stealth Boy", 6, "Science! 4", "Uncommon"], ["Jetpack", 7, "Armorer 4, Science! 4", "Uncommon", "Repair"], ["Rusty Knuckles", 2, "Blacksmith 1", "Uncommon", "Repair"], ["Hydraulic Bracers", 4, "Blacksmith 3", "Uncommon", "Repair"], ["Optimized Bracers", 2, "Blacksmith 1", "Uncommon", "Repair"], ["Tesla Bracers", 6, "Blacksmith 3, Science! 1", "Uncommon", "Repair"], ["Calibrated Shocks", 4, "Science! 2", "Uncommon"], ["Explosive Vent", 5, "Science! 3", "Uncommon"], ["Overdrive Servos", 5, "Science! 3", "Uncommon"],
  ]),
  ...group({ workbench: "power_armor", category: "armor", group: "POWER ARMOR PLATING", skill: "Repair", page: 220 }, [
    ["Titanium Plating", 4, "Armorer 3", "Uncommon"], ["Lead Plating", 3, "Armorer 1", "Uncommon"], ["Photovoltaic Plating", 5, "Science! 3", "Uncommon", "Science"], ["Winterized Coating (not on X-01)", 3, "Armorer 1", "Uncommon"], ["Prism Shielding", 4, "Science! 2", "Uncommon", "Science"], ["Explosive Shielding", 3, "Science! 1", "Uncommon", "Science"], ["EMP Shielding (X-01 only)", 3, "Armorer 1", "Uncommon"],
  ]),
];

const ROBOT_RECIPES = [
  ...group({ workbench: "robot", category: "items", group: "ROBOT ARMOR", skill: "Repair", page: 221 }, [
    ["Factory Armor", 2], ["Factory Storage Armor", 3, "Armorer 1", "Uncommon"], ["Primal Plate", 2], ["Serrated Plate", 3, "Armorer 1", "Uncommon"], ["Noxious Plate", 3, "Armorer 1", "Uncommon"], ["Toxic Plate", 5, "Armorer 3", "Uncommon"], ["Actuated Frame", 2], ["Voltaic Frame", 4, "Armorer 2", "Uncommon"], ["Hydraulic Frame", 5, "Armorer 3", "Uncommon"],
  ]),
  ...group({ workbench: "robot", category: "items", group: "ROBOT MODS", skill: "Science", page: 221 }, [
    ["Hacking Module", 5], ["Lockpick Module", 5], ["Radiation Coils", 5, "Robotics Expert 1", "Uncommon"], ["Recon Sensors", 5, "Robotics Expert 1", "Uncommon"], ["Regeneration Field", 4, "Robotics Expert 2, Science! 2", "Rare"], ["Resistance Field", 4, "Robotics Expert 1, Science! 1", "Uncommon"], ["Sensor Array", 4, "Robotics Expert 1", "Uncommon"], ["Stealth Field", 5, "Robotics Expert 1", "Rare"], ["Tesla Coils", 5, "Robotics Expert 2, Science! 1", "Rare"],
  ]),
];

const WEAPON_RECIPES = [
  ...group({ workbench: "weapons", category: "weapons", group: "SMALL GUNS RECEIVER MODS", skill: "Repair", page: 222 }, [
    ["Hardened", 2], ["Powerful", 3, "Gun Nut 1", "Uncommon"], ["Advanced", 5, "Gun Nut 2", "Uncommon"], ["Calibrated", 2], ["Automatic", 3, "Gun Nut 1", "Uncommon"], ["Hair Trigger", 4, "Gun Nut 2", "Uncommon"], [".38 Receiver", 6, "Gun Nut 4", "Uncommon"], [".308 Receiver", 6, "Gun Nut 4", "Uncommon"], [".45 Receiver", 4, "Gun Nut 2", "Uncommon"], [".50 Receiver", 6, "Gun Nut 4", "Uncommon"], ["Automatic Piston", 4, "Gun Nut 2", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "SMALL GUNS BARREL MODS", skill: "Repair", page: 222 }, [
    ["Snubnose", 2], ["Bull Barrel", 5, "Gun Nut 3", "Uncommon"], ["Long", 3, "Gun Nut 1", "Uncommon"], ["Ported", 6, "Gun Nut 4", "Uncommon"], ["Vented", 6, "Gun Nut 4", "Uncommon"], ["Sawed-Off", 2], ["Finned", 4, "Gun Nut 2", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "SMALL GUNS GRIP MODS", skill: "Repair", page: 222 }, [["Comfort Grip", 2], ["Sharpshooter’s Grip", 3, "Gun Nut 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SMALL GUNS STOCK MODS", skill: "Repair", page: 222 }, [["Full Stock", 2], ["Marksman’s Stock", 4, "Gun Nut 2", "Uncommon"], ["Recoil Compensating Stock", 5, "Gun Nut 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SMALL GUNS SIGHTS", skill: "Repair", page: 223 }, [["Reflex Sight", 2], ["Short Scope", 2], ["Long Scope", 4, "Science! 2", "Uncommon"], ["Short Night Vision Scope", 4, "Science! 2", "Uncommon"], ["Long Night Vision Scope", 5, "Science! 3", "Uncommon"], ["Recon Scope", 5, "Science! 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SMALL GUNS MUZZLE", skill: "Repair", page: 223 }, [["Bayonet", 2], ["Compensator", 3, "Gun Nut 1", "Uncommon"], ["Muzzle Break", 3, "Gun Nut 1", "Uncommon"], ["Suppressor", 4, "Gun Nut 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ENERGY WEAPON CAPACITOR MODS", skill: "Science", page: 223 }, [["Beta Wave Tuner", 2], ["Boosted Capacitor", 2], ["Photon Exciter", 3, "Science! 1", "Uncommon"], ["Photon Agitator", 4, "Science! 2", "Uncommon"], ["Three-crank capacitor", 2], ["Four-crank capacitor", 3, "Science! 1", "Uncommon"], ["Five-crank capacitor", 4, "Science! 2", "Uncommon"], ["Six-crank capacitor", 5, "Science! 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ENERGY WEAPON BARREL MODS", skill: "Science", page: 223 }, [["Bracketed Short Barrel", 3], ["Long Barrel", 3], ["Splitter", 3], ["Automatic Barrel", 4, "Science! 1", "Uncommon"], ["Bracketed Long Barrel", 4, "Science! 1", "Uncommon"], ["Improved Barrel", 4, "Science! 1", "Uncommon"], ["Sniper Barrel", 4, "Science! 1", "Uncommon"], ["Flamer Barrel", 5, "Science! 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ENERGY WEAPON GRIP MODS", skill: "Repair", page: 223 }, [["Sharpshooter’s Grip", 3, "Gun Nut 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ENERGY WEAPON STOCK MODS", skill: "Repair", page: 224 }, [["Standard Stock", 2], ["Full Stock", 2], ["Marksman’s Stock", 4, "Gun Nut 2", "Uncommon"], ["Recoil Compensating Stock", 5, "Gun Nut 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ENERGY WEAPONS SIGHTS", skill: "Repair", page: 224 }, [["Reflex Sight", 2], ["Short Scope", 2], ["Long Scope", 4, "Science! 2", "Uncommon"], ["Short Night Vision Scope", 4, "Science! 2", "Uncommon"], ["Long Night Vision Scope", 5, "Science! 3", "Uncommon"], ["Recon Scope", 5, "Science! 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ENERGY WEAPON MUZZLE", skill: "Science", page: 224 }, [["Beam Splitter", 4, "Science! 1", "Uncommon"], ["Beam Focuser", 4, "Science! 1", "Uncommon"], ["Gyro Compensating Lens", 4, "Science! 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "FLAMER MOD", skill: "Repair", page: 224 }, [["Napalm Fuel", 3], ["Long Barrel", 3], ["Large Tank", 3], ["Huge Tank", 4], ["Compression Nozzle", 3], ["Vaporization Nozzle", 4]]),
  ...group({ workbench: "weapons", category: "weapons", group: "GAMMA GUN MODS", skill: "Science", page: 224 }, [["Deep Dish", 6, "Science! 4", "Uncommon"], ["Electric Signal Carrier antennae", 5, "Science! 3", "Uncommon"], ["Signal Repeater", 6, "Science! 4", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "GATLING LASER MODS", skill: "Science", page: 224 }, [["Photon Exciter", 6, "Science! 3", "Uncommon"], ["Beta Wave Tuner", 4], ["Boosted Capacitor", 4], ["Photon Agitator", 6, "Science! 3", "Uncommon"], ["Charging Barrels", 7, "Science! 4", "Uncommon"], ["Reflex Sight", 7, "Science! 4", "Uncommon"], ["Beam Focuser", 4]]),
  ...group({ workbench: "weapons", category: "weapons", group: "JUNK JET MODS", skill: "Repair", page: 225 }, [["Long Barrel", 3, "Gun Nut 1", "Uncommon"], ["Recoil Compensating Stock", 2], ["Gunner Sight", 2], ["Electrification Module", 6, "Gun Nut 2, Science! 1", "Uncommon"], ["Ignition Module", 7, "Gun Nut 3, Science! 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "MINIGUN MODS", skill: "Repair", page: 225 }, [["Accelerated Barrel", 5, "Gun Nut 3", "Uncommon"], ["Tri-Barrel", 6, "Gun Nut 4", "Uncommon"], ["Gunner Sight", 2], ["Shredder", 4, "Gun Nut 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "MISSILE LAUNCHER MOD", skill: "Repair", page: 225 }, [["Triple Barrel", 4, "Gun Nut 2", "Uncommon"], ["Quad Barrel", 5, "Gun Nut 3", "Uncommon"], ["Scope", 4, "Gun Nut 2", "Uncommon"], ["Night Vision Scope", 6, "Gun Nut 4, Science! 1", "Uncommon"], ["Targeting Computer", 6, "Gun Nut 2, Science! 2", "Uncommon"], ["Bayonet", 2], ["Stabilizer", 4, "Gun Nut 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SWORD MODS", skill: "Repair", page: 225 }, [["Serrated Blade", 3, "Blacksmith 2", "Uncommon"], ["Electrified Blade", 4, "Blacksmith 2, Science! 1", "Uncommon"], ["Electrified Serrated Blade", 5, "Blacksmith 3, Science! 1", "Uncommon"], ["Stun Pack", 5, "Blacksmith 3, Science! 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "COMBAT KNIFE MODS", skill: "Repair", page: 225 }, [["Serrated Blade", 3, "Blacksmith 1", "Uncommon"], ["Stealth Blade", 4, "Blacksmith 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "MACHETE MOD", skill: "Repair", page: 225 }, [["Serrated Blade", 3, "Blacksmith 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "RIPPER MODS", skill: "Repair", page: 225 }, [["Curved Blade", 2], ["Extended Blade", 5, "Blacksmith 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SHISHKEBAB MOD", skill: "Repair", page: 225 }, [["Extra Flame Jets", 5, "Blacksmith 3", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SWITCHBLADE MOD", skill: "Repair", page: 225 }, [["Serrated Blade", 3, "Blacksmith 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "BASEBALL BAT MODS", skill: "Repair", page: 226 }, [["Barbed", 1], ["Spiked", 2], ["Sharp", 2], ["Chain-Wrapped", 3, "Blacksmith 1", "Uncommon"], ["Bladed", 4, "Blacksmith 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "BOARD MODS", skill: "Repair", page: 226 }, [["Spiked", 1], ["Puncturing", 2, "Blacksmith 1", "Uncommon"], ["Bladed", 2, "Blacksmith 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "LEAD PIPE MODS", skill: "Repair", page: 226 }, [["Spiked", 1], ["Heavy", 3, "Blacksmith 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "PIPE WRENCH MODS", skill: "Repair", page: 226 }, [["Hooked", 1], ["Heavy", 2, "Blacksmith 1", "Uncommon"], ["Puncturing", 2, "Blacksmith 1", "Uncommon"], ["Extra Heavy", 3, "Blacksmith 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "POOL CUE MODS", skill: "Repair", page: 226 }, [["Barbed", 1], ["Sharp", 1]]),
  ...group({ workbench: "weapons", category: "weapons", group: "ROLLING PIN MODS", skill: "Repair", page: 226 }, [["Spiked", 1], ["Sharp", 1]]),
  ...group({ workbench: "weapons", category: "weapons", group: "BATON MODS", skill: "Repair", page: 226 }, [["Electrified", 4, "Blacksmith 2, Science! 1", "Uncommon"], ["Stun Pack", 4, "Blacksmith 2, Science! 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SLEDGEHAMMER MODS", skill: "Repair", page: 226 }, [["Puncturing", 3, "Blacksmith 2", "Uncommon"], ["Heavy", 3, "Blacksmith 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "SUPER SLEDGE MODS", skill: "Repair", page: 226 }, [["Heating Coil", 3, "Blacksmith 2", "Uncommon"], ["Stun Pack", 5, "Blacksmith 3, Science! 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "TIRE IRON MOD", skill: "Repair", page: 226 }, [["Bladed", 3, "Blacksmith 2", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "WALKING CANE MODS", skill: "Repair", page: 226 }, [["Barbed", 1], ["Spiked", 1]]),
  ...group({ workbench: "weapons", category: "weapons", group: "BOXING GLOVE MODS", skill: "Repair", page: 227 }, [["Spiked", 1], ["Puncturing", 2, "Blacksmith 1", "Uncommon"], ["Lead lining", 2, "Blacksmith 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "DEATHCLAW GAUNTLET MOD", skill: "Repair", page: 227 }, [["Extra Claw", 1]]),
  ...group({ workbench: "weapons", category: "weapons", group: "KNUCKLES MODS", skill: "Repair", page: 227 }, [["Sharp", 1], ["Spiked", 1], ["Puncturing", 2, "Blacksmith 1", "Uncommon"], ["Bladed", 2, "Blacksmith 1", "Uncommon"]]),
  ...group({ workbench: "weapons", category: "weapons", group: "POWER FIST MODS", skill: "Repair", page: 227 }, [["Puncturing", 3, "Blacksmith 2", "Uncommon"], ["Heating Coil", 4, "Blacksmith 3", "Uncommon"]]),
];

const CHEMISTRY_RECIPES = [
  ...group({ workbench: "chemistry", category: "items", group: "CHEMS", skill: "Science", page: 213, outputCategory: "aid" }, [
    ["Antibiotics", 4, "Chemist", "Uncommon", null, { "Rare Materials": 2, "Glowing Fungus": 3, "Purified Water": 2, "Stimpak": 3 }],
    ["Berry Mentats", 3, "", "Common", null, { "Rare Materials": 1, "Mentats": 1, "Tarberry": 2 }],
    ["Buffjet", 2, "", "Common", null, { "Buffout": 1, "Jet": 1 }],
    ["Bufftats", 2, "", "Common", null, { "Buffout": 1, "Mentats": 1 }],
    ["Diluted RadAway", 2, "", "Common", null, { "RadAway": 1, "Purified Water": 1 }, null, "RadAway (Diluted)"],
    ["Diluted Rad-X", 2, "", "Common", null, { "Rad-X": 1, "Purified Water": 1 }, null, "Rad-X (Diluted)"],
    ["Diluted Stimpak", 2, "", "Common", null, { "Stimpak": 1, "Purified Water": 1 }, null, "Stimpak (Diluted)"],
    ["Fury", 2, "Chemist", "Uncommon", null, { "Berserk Syringe": 1, "Buffout": 1 }],
    ["Glowing Blood Pack", 3, "", "Common", null, { "Rare Materials": 1, "Blood Pack": 1, "Irradiated Blood": 1 }],
    ["Grape Mentats", 3, "", "Common", null, { "Hubflower": 2, "Mentats": 1, "Whiskey": 1 }],
    ["Jet", 2, "", "Common", null, { "Uncommon Materials": 2, "Common Materials": 1 }],
    ["Jet Fuel", 2, "Chemist", "Uncommon", null, { "Flamer Fuel": 5, "Jet": 1 }],
    ["Mentats", 3, "", "Common", null, { "Abraxo Cleaner": 1, "Brain Fungus": 2, "Uncommon Materials": 1 }],
    ["Orange Mentats", 3, "", "Common", null, { "Uncommon Materials": 1, "Carrot": 3, "Mentats": 1 }],
    ["Overdrive", 3, "Chemist", "Uncommon", null, { "Rare Materials": 2, "Nuka-Cola": 1, "Psycho": 1 }],
    ["Psycho", 4, "", "Common", null, { "Rare Materials": 2, "Hubflower": 2, "Stimpak": 1 }],
    ["Psycho Jet", 2, "", "Common", null, { "Jet": 1, "Psycho": 1 }],
    ["Psychobuff", 2, "", "Common", null, { "Buffout": 1, "Psycho": 1 }],
    ["RadAway", 4, "", "Common", null, { "Rare Materials": 2, "Glowing Fungus": 3, "Common Materials": 1, "Purified Water": 1 }],
    ["Refreshing Beverage", 5, "", "Common", null, { "Rare Materials": 3, "Blood Pack": 1, "Purified Water": 2, "RadAway": 2, "Stimpak": 1 }],
    ["Robot Repair Kit", 4, "", "Common", null, { "Rare Materials": 2, "Fusion Cell": 4, "Uncommon Materials": 2, "Common Materials": 1 }],
    ["Skeeto Spit", 4, "", "Common", null, { "Blood Sac": 1, "Bloodleaf": 1, "Uncommon Materials": 1, "Common Materials": 1 }],
    ["Stimpak", 3, "", "Common", null, { "Antiseptic": 2, "Blood Pack": 1, "Common Materials": 1 }],
    ["Ultra Jet", 4, "Chemist", "Uncommon", null, { "Bloodleaf": 1, "Uncommon Materials": 1, "Jet": 1, "Common Materials": 2 }],
  ]),
  ...group({ workbench: "chemistry", category: "items", group: "EXPLOSIVES", skill: "Explosives", page: 214, outputCategory: "misc" }, [
    ["Baseball Grenade", 5, "Demolition Expert", "Uncommon", null, { "Common Materials": 3, "Uncommon Materials": 2 }], ["Frag Grenade", 5, "Demolition Expert", "Uncommon", null, { "Common Materials": 2, "Uncommon Materials": 3 }], ["Molotov Cocktail", 4, "", "Common", null, { "Common Materials": 3, "Uncommon Materials": 2 }], ["Plasma Grenade", 5, "Demolition Expert, Science! 3", "Uncommon", null, { "Uncommon Materials": 3, "Rare Materials": 2 }], ["Pulse Grenade", 5, "Demolition Expert, Science! 2", "Uncommon", null, { "Uncommon Materials": 3, "Rare Materials": 2 }], ["Bottlecap Mine", 5, "Demolition Expert", "Uncommon", null, { "Common Materials": 4, "Uncommon Materials": 1 }], ["Frag Mine", 5, "Demolition Expert", "Uncommon", null, { "Common Materials": 2, "Uncommon Materials": 3 }], ["Plasma Mine", 5, "Demolition Expert, Science! 3", "Uncommon", null, { "Uncommon Materials": 3, "Rare Materials": 2 }], ["Pulse Mine", 5, "Demolition Expert, Science! 2", "Uncommon", null, { "Uncommon Materials": 3, "Rare Materials": 2 }],
  ]),
  ...group({ workbench: "chemistry", category: "items", group: "SYRINGER AMMUNITION", skill: "Science", page: 215, outputCategory: "ammo" }, [
    ["Berserk", 4, "", "Common", null, { "Uncommon Materials": 1, "Bourbon": 1, "Dirty Water": 1, "Common Materials": 1 }], ["Bleed-Out", 3, "", "Common", null, { "Uncommon Materials": 2, "Common Materials": 1 }], ["Bloatfly Larva", 3, "", "Common", null, { "Bloatfly Gland": 1, "Uncommon Materials": 1, "Psycho": 1 }], ["Endangerol", 4, "", "Common", null, { "Uncommon Materials": 3, "Med-X": 1 }], ["Lock Joint", 5, "", "Common", null, { "Dirty Water": 1, "Uncommon Materials": 2, "Common Materials": 1, "Stingwing Barb": 1, "Tarberry": 2 }], ["Mind Cloud", 4, "", "Common", null, { "Abraxo Cleaner": 1, "Asbestos": 2, "Uncommon Materials": 1, "Purified Water": 1 }], ["Pax", 3, "", "Common", null, { "Mutfruit": 2, "Nuka-Cola": 1, "Common Materials": 1 }], ["Radscorpion Venom", 3, "", "Common", null, { "Uncommon Materials": 1, "Radscorpion Stinger": 1, "Common Materials": 1 }], ["Yellow Belly", 4, "", "Common", null, { "Uncommon Materials": 5 }],
  ]),
];

const COOKING_RECIPES = [
  ...group({ workbench: "cooking", category: "items", group: "WORKBENCH", skill: "Survival", page: 216, outputCategory: "misc" }, [["Cooking Station", 2, "", "Common"]]),
  ...group({ workbench: "cooking", category: "items", group: "BEVERAGE", skill: "Survival", page: 216, outputCategory: "beverages" }, [
    ["Dirty Wastelander", 3, "", "Rare", null, { "Mutfruit": 1, "Nuka-Cola": 1, "Whiskey": 2 }], ["Purified Water", 1, "", "Common", null, { "Dirty Water": 3 }], ["Melon Juice", 2, "", "Common", null, { "Purified Water": 1, "Melon": 1 }], ["Mutfruit Juice", 2, "", "Common", null, { "Purified Water": 1, "Mutfruit": 1 }], ["Tarberry Juice", 2, "", "Common", null, { "Purified Water": 1, "Tarberry": 1 }], ["Tato Juice", 2, "", "Common", null, { "Purified Water": 1, "Tato": 1 }],
  ]),
  ...group({ workbench: "cooking", category: "items", group: "FOOD", skill: "Survival", page: 216, outputCategory: "food" }, [
    ["Baked Bloatfly", 1, "", "Common", null, { "Bloatfly Meat": 2 }], ["Bloodbug Steak", 1, "", "Common", null, { "Bloodbug Meat": 1 }], ["Cooked Softshell Meat", 1, "", "Common", null, { "Softshell Mirelurk Meat": 2 }], ["Crispy Squirrel Bits", 1, "", "Common", null, { "Squirrel Bits": 1 }], ["Deathclaw Omelette", 2, "", "Common", null, { "Blood Pack": 1, "Deathclaw Egg": 1 }], ["Deathclaw Steak", 1, "", "Common", null, { "Deathclaw Meat": 1 }], ["Grilled Radroach", 1, "", "Common", null, { "Radroach Meat": 3 }], ["Grilled Radstag", 1, "", "Common", null, { "Radstag Meat": 1 }], ["Iguana on a Stick", 2, "", "Common", null, { "Iguana Bits": 1, "Common Materials": 1 }], ["Iguana Soup", 3, "", "Common", null, { "Carrot": 1, "Dirty Water": 1, "Iguana Bits": 3 }], ["Mirelurk Cake", 4, "", "Rare", null, { "Mirelurk Egg": 1, "Mirelurk Meat": 1, "Uncommon Materials": 1, "Razorgrain": 1 }], ["Mirelurk Egg Omelette", 2, "", "Common", null, { "Dirty Water": 1, "Mirelurk Egg": 1 }], ["Mirelurk Queen Steak", 1, "", "Common", null, { "Queen Mirelurk Meat": 1 }], ["Mole Rat Chunks", 1, "", "Common", null, { "Mole Rat Meat": 2 }], ["Mutant Hound Chops", 1, "", "Common", null, { "Mutant Hound Meat": 1 }], ["Mutt Chops", 1, "", "Common", null, { "Mongrel Dog Meat": 1 }], ["Noodle Cup", 2, "", "Rare", null, { "Dirty Water": 1, "Razorgrain": 1 }], ["Radscorpion Egg Omelette", 2, "", "Common", null, { "Purified Water": 1, "Radscorpion Egg": 1 }], ["Radscorpion Steak", 1, "", "Common", null, { "Radscorpion Meat": 1 }], ["Radstag Stew", 4, "", "Rare", null, { "Gourd": 1, "Radstag Meat": 1, "Silt Bean": 1, "Vodka": 1 }], ["Ribeye Steak", 1, "", "Common", null, { "Brahmin Meat": 1 }], ["Roasted Mirelurk Meat", 1, "", "Common", null, { "Mirelurk Meat": 2 }], ["Squirrel on a Stick", 2, "", "Common", null, { "Squirrel Bits": 1, "Common Materials": 1 }], ["Stingwing Filet", 1, "", "Common", null, { "Stingwing Meat": 1 }], ["Vegetable Soup", 3, "", "Common", null, { "Carrot": 1, "Dirty Water": 1, "Tato": 1 }], ["Yao Guai Ribs", 1, "", "Common", null, { "Yao Guai Meat": 1 }], ["Yao Guai Roast", 3, "", "Rare", null, { "Carrot": 1, "Tato": 1, "Yao Guai Meat": 1 }],
  ]),
];

const AMMO_CRAFTING_ROWS = [
  [".38", 0, 1, 0],
  ["10mm", 0, 2, 0],
  [".308", 1, 3, 0],
  ["Flare", 1, 1, 0],
  ["Shotgun Shell", 1, 3, 0],
  [".45", 2, 3, 0],
  ["Flamer Fuel", 2, 1, 0],
  ["Fusion Cell", 2, 3, 0],
  ["Gamma Round", 2, 10, 0],
  ["Railway Spike", 2, 1, 0],
  ["Syringer Ammo", 2, 1, 0],
  [".44 Magnum", 3, 3, 0],
  [".50", 3, 4, 0],
  ["5.56mm", 3, 2, 0],
  ["5mm", 3, 1, 0],
  ["Fusion Core", 3, 200, 4],
  ["Missile", 3, 25, 7],
  ["Plasma Cartridge", 4, 5, 0],
  ["2mm EC", 5, 10, 0],
  ["Mini-Nuke", 6, 100, 12],
];

const ammosmithRankForRarity = (rarity) => {
  const value = Number(rarity || 0);
  if (value <= 1) return 1;
  if (value <= 3) return 2;
  return 3;
};

const AMMO_RECIPES = AMMO_CRAFTING_ROWS
  .filter(([, rarity]) => Number(rarity) <= 5)
  .map(([name, rarity, cost, weight]) => ({
  id: slug(`weapons-ammunition-${name}`),
  category: "ammo",
  workbench: "weapons",
  group: "AMMUNITION",
  name,
  complexity: rarity,
  perks: `Ammosmith ${ammosmithRankForRarity(rarity)}`,
  skill: "Repair",
  rarity,
  materials: null,
  outputCategory: "ammo",
  outputName: name,
  sourcePage: 211,
  ammoCrafting: true,
  ammoRarity: rarity,
  ammoCost: cost,
  ammoWeight: weight,
}));

export const CRAFTING_RECIPES = [
  ...AMMO_RECIPES,
  ...WEAPON_RECIPES,
  ...ARMOR_RECIPES,
  ...ROBOT_RECIPES,
  ...CHEMISTRY_RECIPES,
  ...COOKING_RECIPES,
];

export const CRAFTING_WORKBENCHES = ["weapons", "armor", "power_armor", "robot", "chemistry", "cooking"];
