from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]

# ---------------- Origins ----------------
origins_path = ROOT / "src/components/data/origins.js"
origins = origins_path.read_text(encoding="utf-8")
marker = "// SETTLERS_GUIDE_ORIGINS"
if marker not in origins:
    insert = r'''
  // SETTLERS_GUIDE_ORIGINS
  commonwealth_minuteman: {
    id: "commonwealth_minuteman",
    translationKey: "origins.commonwealth_minuteman",
    descriptionKey: "originDescriptions.commonwealth_minuteman",
    traits: ["origins.traits.united_we_stand"],
    equipmentPacks: ["minuteman_rifleman", "minuteman_tough"],
    tagSkillCount: 4,
    restrictedTagCount: 1,
    restrictedTagList: ["Energy Weapons", "Small Guns"],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: [],
  },
  new_california_republic: {
    id: "new_california_republic",
    translationKey: "origins.new_california_republic",
    descriptionKey: "originDescriptions.new_california_republic",
    traits: [],
    availableTraits: ["good_natured", "grunt", "home_on_the_range", "trigger_discipline", "brahmin_baron", "educated", "fast_shot", "gifted", "heavy_handed", "small_frame"],
    traitSelectCount: 2,
    equipmentPacks: ["ncr_trooper", "ncr_marksman", "ncr_crimson_caravaneer", "mercenary", "raider", "settler", "trader", "wanderer"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: [],
    flexibleTraitPerkChoice: true,
  },
  protectron: {
    id: "protectron",
    translationKey: "origins.protectron",
    descriptionKey: "originDescriptions.protectron",
    traits: ["origins.traits.protect_or_destroy"],
    equipmentPacks: ["protectron_standard", "protectron_fire_brigadier", "protectron_medic", "protectron_utility", "nukatron", "protectron_x"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: ["radiation", "poison", "disease"],
    fixedCarryWeight: 225,
    robot: true,
    maxRobotMods: 2,
  },
  robobrain: {
    id: "robobrain",
    translationKey: "origins.robobrain",
    descriptionKey: "originDescriptions.robobrain",
    traits: ["origins.traits.robobrain_robot"],
    equipmentPacks: ["robobrain_servomech", "robobrain_us_army", "robobrain_errant"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: ["radiation", "poison"],
    fixedCarryWeight: 150,
    robot: true,
  },
  securitron: {
    id: "securitron",
    translationKey: "origins.securitron",
    descriptionKey: "originDescriptions.securitron",
    traits: ["origins.traits.mark_i_securitron"],
    equipmentPacks: ["securitron_standard"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: ["radiation", "poison"],
    fixedCarryWeight: 150,
    robot: true,
  },
  generation_3_synth: {
    id: "generation_3_synth",
    translationKey: "origins.generation_3_synth",
    descriptionKey: "originDescriptions.generation_3_synth",
    traits: ["origins.traits.more_than_human"],
    equipmentPacks: ["synth_infiltrator", "synth_seeker"],
    tagSkillCount: 4,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: ["radiation", "poison", "disease"],
    noFoodDrinkSleepRequirement: true,
  },
'''
    needle = "\n};\n\nexport const ORIGINS_LIST"
    pos = origins.index(needle)
    before = origins[:pos].rstrip()
    if before.endswith("}") and not before.endswith("},"):
        before += ","
    origins = before + "\n" + insert + origins[pos:]

    traits_insert = r'''
  "origins.traits.united_we_stand": "united_we_stand",
  "origins.traits.protect_or_destroy": "protect_or_destroy",
  "origins.traits.robobrain_robot": "robobrain_robot",
  "origins.traits.mark_i_securitron": "mark_i_securitron",
  "origins.traits.more_than_human": "more_than_human",
  "good_natured": "good_natured",
  "grunt": "grunt",
  "home_on_the_range": "home_on_the_range",
  "trigger_discipline": "trigger_discipline",
  "brahmin_baron": "brahmin_baron",
'''
    needle2 = '  "chosen_one": "chosen_one"\n};'
    origins = origins.replace(needle2, '  "chosen_one": "chosen_one",\n' + traits_insert + '};')
    origins_path.write_text(origins, encoding="utf-8")

# ---------------- Starting equipment ----------------
start_path = ROOT / "src/data/startingEquipment.js"
start = start_path.read_text(encoding="utf-8")
if "// SETTLERS_GUIDE_STARTING_PACKS" not in start:
    packs = r'''
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
'''
    needle = "\n};\n\nexport function getOriginEquipmentGrant"
    pos = start.index(needle)
    before = start[:pos].rstrip()
    if before.endswith("]") and not before.endswith("],"):
        before += ","
    start = before + "\n" + packs + start[pos:]
    start_path.write_text(start, encoding="utf-8")

# ---------------- Perks ----------------
perks_path = ROOT / "src/components/data/perks.js"
perks = perks_path.read_text(encoding="utf-8")
if "SETTLERS_GUIDE_PERKS" not in perks:
    entries = r'''
  // SETTLERS_GUIDE_PERKS
  "all_night_long": { id: "all_night_long", name: "All Night Long", special: "E", maxRanks: 1, requirements: "Level 16+, not a robot", description: "Nighttime hours do not advance hunger or thirst, and starvation causes Fatigue more slowly." },
  "bodyguards": { id: "bodyguards", name: "Bodyguards", special: "C", maxRanks: 1, requirements: "CHA 8, Level 5+", description: "Nearby player characters and companions increase your Physical and Energy DR." },
  "community_organizer": { id: "community_organizer", name: "Community Organizer", special: "C", maxRanks: 3, requirements: "CHA 5, END 5, Level 1+", rankRequirements: {1:"CHA 5, END 5, Level 1+",2:"CHA 5, END 5, Level 4+",3:"CHA 5, END 5, Level 7+"}, description: "Improves settlement Food and Defense and boosts Hunting, Gathering, and Scavenging actions." },
  "contractor": { id: "contractor", name: "Contractor", special: "I", maxRanks: 3, requirements: "CHA 5, INT 5, Level 2+", rankRequirements: {1:"CHA 5, INT 5, Level 2+",2:"CHA 5, INT 5, Level 6+",3:"CHA 5, INT 5, Level 10+"}, description: "Makes settlement construction cheaper and lets settlers assist even when they lack required skills or perks." },
  "covert_operator": { id: "covert_operator", name: "Covert Operator", special: "A", maxRanks: 1, requirements: "AGI 8", description: "Ranged sneak attacks with small guns or energy weapons deal extra damage outside Power Armor." },
  "enforcer": { id: "enforcer", name: "Enforcer", special: "A", maxRanks: 1, requirements: "AGI 9, Level 12+", description: "Called shots with shotguns gain Debilitating." },
  "green_thumb": { id: "green_thumb", name: "Green Thumb", special: "P", maxRanks: 1, requirements: "PER 4, Level 4+", description: "Foraging yields extra items and can be increased further by spending AP." },
  "gun_runner": { id: "gun_runner", name: "Gun Runner", special: "A", maxRanks: 1, requirements: "AGI 6, Level 4+", description: "While sprinting with a one-handed ranged weapon, spend AP to move an additional zone." },
  "happy_camper": { id: "happy_camper", name: "Happy Camper", special: "E", maxRanks: 2, requirements: "CHA 7, END 6, Level 3+", rankRequirements: {1:"CHA 7, END 6, Level 3+",2:"CHA 7, END 6, Level 7+"}, description: "A properly prepared camp can prevent hunger and later thirst from deteriorating." },
  "hired_help": { id: "hired_help", name: "Hired Help", special: "C", maxRanks: 1, requirements: "CHA 7", description: "Recruit a humanoid companion if you do not already have one." },
  "home_defense": { id: "home_defense", name: "Home Defense", special: "I", maxRanks: 2, requirements: "INT 6, Level 5+", rankRequirements: {1:"INT 6, Level 5+",2:"INT 6, Level 10+"}, description: "Craft and set traps; higher rank prevents failed trap-setting tests from misfiring on you." },
  "homebody": { id: "homebody", name: "Homebody", special: "E", maxRanks: 2, requirements: "END 6, Level 5+", rankRequirements: {1:"END 6, Level 5+",2:"END 6, Level 10+"}, description: "Recover HP while spending time in one of your settlements and improve injury recovery at higher rank." },
  "local_leader": { id: "local_leader", name: "Local Leader", special: "C", maxRanks: 2, requirements: "CHA 6, Level 2+", rankRequirements: {1:"CHA 6, Level 2+",2:"CHA 6, Level 7+"}, description: "Establish supply lines; rank 2 unlocks settlement stores and crafting stations, including Robot Workbenches." },
  "mechanical_menace": { id: "mechanical_menace", name: "Mechanical Menace", special: "C", maxRanks: 1, requirements: "CHA 6, INT 5", description: "Robots may hesitate to attack you, and you can reroll a d20 on CHA tests made to influence them." },
  "class_freak": { id: "class_freak", name: "Class Freak", special: "C", maxRanks: 1, requirements: "CHA 6, INT 5", description: "Mutated humans may hesitate to attack you, and you can reroll a d20 on CHA tests made to influence them." },
  "nocturnal_fortitude": { id: "nocturnal_fortitude", name: "Nocturnal Fortitude", special: "E", maxRanks: 1, requirements: "END 6, Level 12+, not a robot", description: "At night, temporarily increase maximum HP by your Endurance." },
  "pannapictagraphist": { id: "pannapictagraphist", name: "Pannapictagraphist", special: "L", maxRanks: 1, requirements: "LCK 5", description: "Reroll duplicate magazine results when rolling randomly for publications." },
  "pharmacist": { id: "pharmacist", name: "Pharmacist", special: "I", maxRanks: 3, requirements: "INT 8, Level 2+", rankRequirements: {1:"INT 8, Level 2+",2:"INT 8, Level 8+",3:"INT 8, Level 14+"}, description: "RadAway you administer heals additional Radiation damage, increasing with rank." },
  "photosynthetic": { id: "photosynthetic", name: "Photosynthetic", special: "E", maxRanks: 2, requirements: "END 7, Level 5+", rankRequirements: {1:"END 7, Level 5+",2:"END 7, Level 15+"}, description: "Regenerate HP each hour while in direct sunlight; rank 2 doubles the rate." },
  "quack_surgeon": { id: "quack_surgeon", name: "Quack Surgeon", special: "C", maxRanks: 1, requirements: "CHA 7, Level 12+", description: "Use an alcoholic beverage during First Aid to increase healing while also applying the drink's effects." },
  "rejuvenated": { id: "rejuvenated", name: "Rejuvenated", special: "E", maxRanks: 1, requirements: "END 7, Level 12+, not a robot", description: "Being fully fed and quenched grants stronger bonuses to HP, tests, and combat AP." },
  "retribution": { id: "retribution", name: "Retribution", special: "E", maxRanks: 3, requirements: "END 8, LCK 8, Level 2+", rankRequirements: {1:"END 8, LCK 8, Level 2+",2:"END 8, LCK 8, Level 7+",3:"END 8, LCK 8, Level 12+"}, description: "When DR prevents all damage from an attack, recover HP and add AP, with more triggers at higher ranks." },
  "robot_wrangler": { id: "robot_wrangler", name: "Robot Wrangler", special: "I", maxRanks: 1, requirements: "INT 5", description: "Gain a robot companion if you do not already have a companion." },
  "squad_maneuvers": { id: "squad_maneuvers", name: "Squad Maneuvers", special: "C", maxRanks: 2, requirements: "CHA 7", description: "Coordinate travel and combat movement with your allies." },
  "super_duper": { id: "super_duper", name: "Super Duper", special: "L", maxRanks: 3, requirements: "LCK 6, Level 3+", rankRequirements: {1:"LCK 6, Level 3+",2:"LCK 6, Level 7+",3:"LCK 6, Level 11+"}, description: "When crafting, roll combat dice for a chance to recover some of the components spent." },
  "taking_one_for_the_team": { id: "taking_one_for_the_team", name: "Taking One for the Team", special: "E", maxRanks: 3, requirements: "END 7, CHA 6, Level 1+", rankRequirements: {1:"END 7, CHA 6, Level 1+",2:"END 7, CHA 6, Level 5+",3:"END 7, CHA 6, Level 9+"}, description: "Intercept attacks against nearby allies, then generate AP and gain retaliation rerolls at higher ranks." },
  "tinkerer": { id: "tinkerer", name: "Tinkerer", special: "I", maxRanks: 1, requirements: "END 5, INT 5", description: "Repair robots more efficiently and temporarily increase a robot's maximum HP after maintenance." },
  "true_friends": { id: "true_friends", name: "True Friends", special: "C", maxRanks: 2, requirements: "PER 6, CHA 6", description: "Protect reputation from decreases and, at higher rank, improve gains in affinity or reputation." },
'''
    needle = "  ...Object.fromEntries(SUPPLEMENTAL_PERKS.map((perk) => [perk.id, perk]))"
    perks = perks.replace(needle, entries + "\n" + needle)
    perks_path.write_text(perks, encoding="utf-8")

# ---------------- Quick Start / perk eligibility ----------------
quick_path = ROOT / "src/components/characterCreation/QuickCharacterWizard.jsx"
quick = quick_path.read_text(encoding="utf-8")
quick = quick.replace(
    'const isRobot = ["mister_handy", "assaultron"].includes(form?.origin);',
    'const isRobot = ["mister_handy", "assaultron", "protectron", "robobrain", "securitron"].includes(form?.origin);'
)
quick = quick.replace(
    'const radiationImmune = ["ghoul", "super_mutant", "nightkin", "mister_handy", "assaultron"].includes(form?.origin);',
    'const radiationImmune = ["ghoul", "super_mutant", "nightkin", "mister_handy", "assaultron", "protectron", "robobrain", "securitron", "generation_3_synth"].includes(form?.origin);'
)
quick_path.write_text(quick, encoding="utf-8")

perk_screen_path = ROOT / "src/components/perks/PerksScreen.jsx"
perk_screen = perk_screen_path.read_text(encoding="utf-8")
perk_screen = perk_screen.replace(
    'const isRobot = origin.includes("handy") || origin.includes("robot");',
    'const isRobot = origin.includes("handy") || origin.includes("robot") || ["protectron", "robobrain", "securitron", "assaultron"].some((value) => origin.includes(value));'
)
perk_screen_path.write_text(perk_screen, encoding="utf-8")

# ---------------- Localizations ----------------
origin_names = {
    "en": {"commonwealth_minuteman":"Commonwealth Minuteman","new_california_republic":"New California Republic","protectron":"Protectron","robobrain":"Robobrain","securitron":"Securitron","generation_3_synth":"Generation 3 Synth"},
    "ru": {"commonwealth_minuteman":"Минитмен Содружества","new_california_republic":"Новая Калифорнийская Республика","protectron":"Протектрон","robobrain":"Робомозг","securitron":"Секьюритрон","generation_3_synth":"Синт 3-го поколения"},
    "uk": {"commonwealth_minuteman":"Мінітмен Співдружності","new_california_republic":"Нова Каліфорнійська Республіка","protectron":"Протектрон","robobrain":"Робомозок","securitron":"Сек'юритрон","generation_3_synth":"Синт 3-го покоління"},
    "pl": {"commonwealth_minuteman":"Minuteman Wspólnoty","new_california_republic":"Republika Nowej Kalifornii","protectron":"Protectron","robobrain":"Robobrain","securitron":"Securitron","generation_3_synth":"Syntezator 3. generacji"},
}
origin_desc = {
    "en": {"commonwealth_minuteman":"A militia defender dedicated to protecting settlements.","new_california_republic":"A citizen shaped by the institutions and frontier of the NCR.","protectron":"A purpose-built RobCo work robot adapted to life in the wasteland.","robobrain":"A cybernetic robot whose processor is a preserved human brain.","securitron":"A RobCo security robot built for policing and combat around New Vegas.","generation_3_synth":"A bio-synthetic humanoid created by the Institute and nearly indistinguishable from a human."},
    "ru": {"commonwealth_minuteman":"Ополченец, посвятивший себя защите поселений.","new_california_republic":"Гражданин, сформированный обществом и фронтиром НКР.","protectron":"Рабочий робот RobCo, приспособившийся к жизни в Пустоши.","robobrain":"Кибернетический робот с сохранённым человеческим мозгом в роли процессора.","securitron":"Охранный робот RobCo для патрулирования и боя в районе Нью-Вегаса.","generation_3_synth":"Биосинтетический гуманоид Института, почти неотличимый от человека."},
    "uk": {"commonwealth_minuteman":"Ополченець, присвячений захисту поселень.","new_california_republic":"Громадянин, сформований суспільством і фронтиром НКР.","protectron":"Робочий робот RobCo, пристосований до життя в Пустці.","robobrain":"Кібернетичний робот зі збереженим людським мозком як процесором.","securitron":"Охоронний робот RobCo для патрулювання та бою біля Нью-Вегаса.","generation_3_synth":"Біосинтетичний гуманоїд Інституту, майже невідрізнимий від людини."},
    "pl": {"commonwealth_minuteman":"Członek milicji poświęcony ochronie osad.","new_california_republic":"Obywatel ukształtowany przez społeczeństwo i pogranicze NCR.","protectron":"Robot roboczy RobCo przystosowany do życia na pustkowiu.","robobrain":"Cybernetyczny robot wykorzystujący zachowany ludzki mózg jako procesor.","securitron":"Robot ochronny RobCo przeznaczony do patrolowania i walki w rejonie New Vegas.","generation_3_synth":"Bio-syntetyczny humanoid Instytutu, niemal nieodróżnialny od człowieka."},
}

traits_en = {
 "united_we_stand":("United We Stand","Gain Energy Weapons or Small Guns as a bonus Tag Skill. Gain +1 DR while in cover and +1 CD damage while you and your companions are outnumbered; your settlements also begin with stronger defense and attract caravans sooner."),
 "protect_or_destroy":("Protect or Destroy","Once per scene reroll a test against an environmental hazard. You are a robot immune to disease, radiation and poison, require repairs instead of normal healing, can install up to two robot mods, and gain a free first AP-bought d20 on tests directly related to your programmed purpose."),
 "robobrain_robot":("Robobrain Robot","You are a robot with infrared-capable sensors, radiation and poison immunity, tracked movement, manipulators, an integrated mesmetron, and a fixed 150 lb carry weight."),
 "mark_i_securitron":("Mark I Securitron","You are a radiation- and poison-immune security robot on a single wheel with integrated arm weapons. Your missile and grenade launchers remain unavailable until upgraded to Mk II."),
 "more_than_human":("More Than Human","Gain one additional Tag Skill. You do not suffer starvation, dehydration, sleep deprivation, disease, poison or radiation damage, though known synths may face increased social difficulty and you possess a recall code."),
 "good_natured":("Good Natured","Tag two of Speech, Medicine, Repair, Science, and Barter; the maximum rating of the other listed skills is reduced."),
 "grunt":("Grunt","Deal extra damage with common military small arms and combat knives, but attacks with big guns or energy weapons have a wider complication range."),
 "home_on_the_range":("Home on the Range","Resting by a campfire improves injury recovery, but you cannot gain the Well Rested bonus."),
 "trigger_discipline":("Trigger Discipline","Reroll one d20 on ranged attacks with small guns or energy weapons, but those weapons lose 1 Fire Rate while you wield them."),
 "brahmin_baron":("Brahmin Baron","Brahmin feed troughs support more animals and Tend Crops can produce extra milk, but high-food settlements face increased attack risk."),
}

perk_names = {
 "all_night_long":"All Night Long","bodyguards":"Bodyguards","community_organizer":"Community Organizer","contractor":"Contractor","covert_operator":"Covert Operator","enforcer":"Enforcer","green_thumb":"Green Thumb","gun_runner":"Gun Runner","happy_camper":"Happy Camper","hired_help":"Hired Help","home_defense":"Home Defense","homebody":"Homebody","local_leader":"Local Leader","mechanical_menace":"Mechanical Menace","class_freak":"Class Freak","nocturnal_fortitude":"Nocturnal Fortitude","pannapictagraphist":"Pannapictagraphist","pharmacist":"Pharmacist","photosynthetic":"Photosynthetic","quack_surgeon":"Quack Surgeon","rejuvenated":"Rejuvenated","retribution":"Retribution","robot_wrangler":"Robot Wrangler","squad_maneuvers":"Squad Maneuvers","super_duper":"Super Duper","taking_one_for_the_team":"Taking One for the Team","tinkerer":"Tinkerer","true_friends":"True Friends"
}
perk_desc_en = {
 "all_night_long":"Nighttime does not advance hunger or thirst and starvation causes Fatigue more slowly.","bodyguards":"Nearby allies increase your Physical and Energy DR.","community_organizer":"Improve settlement Food, Defense, and resource-gathering actions.","contractor":"Make settlement construction cheaper and let settlers assist despite missing skills or perks.","covert_operator":"Ranged sneak attacks with small guns or energy weapons deal extra damage outside Power Armor.","enforcer":"Called shots with shotguns gain Debilitating.","green_thumb":"Foraging yields extra items.","gun_runner":"Spend AP while sprinting with a one-handed ranged weapon to move farther.","happy_camper":"A prepared camp can stop hunger and later thirst from worsening.","hired_help":"Recruit a humanoid companion.","home_defense":"Craft and set traps more safely.","homebody":"Recover HP and injuries more efficiently in your settlement.","local_leader":"Create supply lines and unlock settlement stores and workbenches.","mechanical_menace":"Robots may refuse to attack you and are easier to influence.","class_freak":"Mutated humans may refuse to attack you and are easier to influence.","nocturnal_fortitude":"Gain temporary maximum HP at night.","pannapictagraphist":"Reroll duplicate random magazine results.","pharmacist":"RadAway you administer removes additional Radiation damage.","photosynthetic":"Regenerate HP while in direct sunlight.","quack_surgeon":"Use alcohol during First Aid to improve healing.","rejuvenated":"Being fully fed and quenched grants stronger bonuses.","retribution":"Fully blocked attacks can restore HP and add AP.","robot_wrangler":"Gain a robot companion.","squad_maneuvers":"Coordinate allies during travel and combat movement.","super_duper":"Crafting can refund some spent components.","taking_one_for_the_team":"Intercept attacks against nearby allies and gain stronger counterplay at higher ranks.","tinkerer":"Repair and tune robots more efficiently.","true_friends":"Protect reputation and improve affinity gains."
}

# Compact translated names; descriptions fall back to concise localized summaries where supplied, otherwise English.
perk_name_trans = {
 "ru": {"all_night_long":"Всю ночь напролёт","bodyguards":"Телохранители","community_organizer":"Организатор сообщества","contractor":"Подрядчик","covert_operator":"Тайный агент","enforcer":"Усилитель","green_thumb":"Зелёный палец","gun_runner":"Оружейный курьер","happy_camper":"Счастливый турист","hired_help":"Наёмная помощь","home_defense":"Оборона дома","homebody":"Домосед","local_leader":"Местный лидер","mechanical_menace":"Механическая угроза","class_freak":"Классовый уродец","nocturnal_fortitude":"Ночная стойкость","pannapictagraphist":"Паннапиктаграфист","pharmacist":"Фармацевт","photosynthetic":"Фотосинтез","quack_surgeon":"Шарлатан-хирург","rejuvenated":"Омоложение","retribution":"Возмездие","robot_wrangler":"Укротитель роботов","squad_maneuvers":"Манёвры отряда","super_duper":"Супер-пупер","taking_one_for_the_team":"Принять удар за команду","tinkerer":"Мастеровой","true_friends":"Настоящие друзья"},
 "uk": {"all_night_long":"Усю ніч","bodyguards":"Охоронці","community_organizer":"Організатор громади","contractor":"Підрядник","covert_operator":"Таємний оператор","enforcer":"Примус","green_thumb":"Зелений палець","gun_runner":"Збройний кур'єр","happy_camper":"Щасливий турист","hired_help":"Наймана допомога","home_defense":"Оборона дому","homebody":"Домосід","local_leader":"Місцевий лідер","mechanical_menace":"Механічна загроза","class_freak":"Класовий дивак","nocturnal_fortitude":"Нічна стійкість","pannapictagraphist":"Паннапіктаграфіст","pharmacist":"Фармацевт","photosynthetic":"Фотосинтез","quack_surgeon":"Шарлатан-хірург","rejuvenated":"Омолодження","retribution":"Відплата","robot_wrangler":"Приборкувач роботів","squad_maneuvers":"Маневри загону","super_duper":"Супер-дупер","taking_one_for_the_team":"Прийняти удар за команду","tinkerer":"Майстер","true_friends":"Справжні друзі"},
 "pl": {"all_night_long":"Całą noc","bodyguards":"Ochroniarze","community_organizer":"Organizator społeczności","contractor":"Wykonawca","covert_operator":"Tajny operator","enforcer":"Egzekutor","green_thumb":"Zielony kciuk","gun_runner":"Kurier broni","happy_camper":"Szczęśliwy obozowicz","hired_help":"Najemna pomoc","home_defense":"Obrona domu","homebody":"Domator","local_leader":"Lokalny lider","mechanical_menace":"Mechaniczne zagrożenie","class_freak":"Dziwak klasowy","nocturnal_fortitude":"Nocna wytrzymałość","pannapictagraphist":"Pannapiktografista","pharmacist":"Farmaceuta","photosynthetic":"Fotosynteza","quack_surgeon":"Konował","rejuvenated":"Odmłodzenie","retribution":"Odpłata","robot_wrangler":"Poganiacz robotów","squad_maneuvers":"Manewry oddziału","super_duper":"Super Duper","taking_one_for_the_team":"Wziąć cios za drużynę","tinkerer":"Majsterkowicz","true_friends":"Prawdziwi przyjaciele"}
}

for lang in ("en", "ru", "uk", "pl"):
    p = ROOT / f"src/locales/{lang}/common.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    data.setdefault("origins", {}).update(origin_names[lang])
    data.setdefault("originDescriptions", {}).update(origin_desc[lang])
    ti = data.setdefault("traitsInfo", {})
    for tid, (name, desc) in traits_en.items():
        # Keep exact game mechanics concise; English fallback is preferable to inventing localized rules.
        ti[tid] = {"name": name, "desc": desc}
    pi = data.setdefault("perksInfo", {})
    for pid, en_name in perk_names.items():
        name = en_name if lang == "en" else perk_name_trans.get(lang, {}).get(pid, en_name)
        pi[pid] = {"name": name, "desc": perk_desc_en[pid]}
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("Settlers Guide origins, starting packs, traits, and perks applied.")
