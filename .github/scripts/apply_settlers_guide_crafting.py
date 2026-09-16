from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CRAFTING = ROOT / "src" / "data" / "craftingRecipes.js"

text = CRAFTING.read_text(encoding="utf-8")
marker = "// === SETTLERS GUIDE ROBOT & EQUIPMENT RECIPES ==="
if marker in text:
    raise SystemExit(0)

block = r'''

// === SETTLERS GUIDE ROBOT & EQUIPMENT RECIPES ===
// Chapter 3/4 source data. Robot construction is represented as craftable body parts,
// matching the book's mix-and-match assembly rules rather than inventing fixed full-robot recipes.
ROBOT_RECIPES.push(
  ...group({ workbench: "robot", category: "items", group: "ROBOT CONSTRUCTION", skill: "Repair", page: 76, outputCategory: "robot_parts" }, [
    ["Robot Workbench", 4, "Robotics Expert 1", "Uncommon", null, { "Common Materials": 18, "Uncommon Materials": 36, "Rare Materials": 6 }, "robot_parts"],
  ]),
  ...group({ workbench: "robot", category: "items", group: "ROBOT TORSOS", skill: "Repair", page: 79, outputCategory: "robot_parts" }, [
    ["Mister Handy Torso", 4, "Robotics Expert 1", "Uncommon"],
    ["Protectron Torso", 4, "Robotics Expert 1", "Uncommon"],
    ["Assaultron Torso", 5, "Robotics Expert 2", "Uncommon"],
    ["Robobrain Torso", 6, "Robotics Expert 2, Science! 1", "Rare"],
    ["Sentry Bot Torso", 7, "Armorer 1, Robotics Expert 3, Science! 2", "Rare"],
  ]),
  ...group({ workbench: "robot", category: "items", group: "ROBOT HEADS", skill: "Repair", page: 81, outputCategory: "robot_parts" }, [
    ["Protectron Head", 4, "Robotics Expert 1", "Uncommon"],
    ["Mister Handy Eye Stalk", 4, "Robotics Expert 1, Science! 1", "Uncommon"],
    ["Assaultron Head", 6, "Robotics Expert 2, Science! 1", "Uncommon"],
    ["Assaultron Head Laser", 7, "Robotics Expert 2, Science! 2", "Rare"],
    ["Robobrain Head", 6, "Robotics Expert 2, Science! 3", "Rare"],
    ["Sentry Bot Head", 6, "Armorer 1, Robotics Expert 2, Science! 2", "Rare"],
  ]),
  ...group({ workbench: "robot", category: "items", group: "ROBOT ARMS", skill: "Repair", page: 82, outputCategory: "robot_parts" }, [
    ["Protectron Arm", 4, "Robotics Expert 1", "Uncommon"],
    ["Mister Handy Arm", 5, "Robotics Expert 1", "Uncommon"],
    ["Assaultron Arm", 5, "Robotics Expert 2", "Uncommon"],
    ["Robobrain Arm", 5, "Robotics Expert 2, Science! 1", "Rare"],
    ["Sentry Bot Arm", 6, "Armorer 1, Robotics Expert 3, Science! 1", "Rare"],
  ]),
  ...group({ workbench: "robot", category: "items", group: "ROBOT LEGS & PROPULSION", skill: "Repair", page: 80, outputCategory: "robot_parts" }, [
    ["Mister Handy Thruster", 4, "Robotics Expert 1", "Uncommon"],
    ["Protectron Legs", 3, "Robotics Expert 1", "Uncommon"],
    ["Assaultron Legs", 5, "Robotics Expert 2", "Uncommon"],
    ["Robobrain Treads", 5, "Robotics Expert 2, Science! 1", "Uncommon"],
    ["Sentry Bot Legs", 6, "Armorer 1, Robotics Expert 3", "Rare"],
  ]),
  ...group({ workbench: "robot", category: "items", group: "ROBOT ARM ATTACHMENTS", skill: "Repair", page: 83, outputCategory: "robot_parts" }, [
    ["Buzz Saw", 3, "Blacksmith 1", "Uncommon"],
    ["Construction Claw", 3, "Blacksmith 1", "Uncommon"],
    ["Cryojet", 4, "Robotics Expert 1, Science! 1", "Uncommon", "Science"],
    ["Drill", 3, "Blacksmith 2", "Uncommon"],
    ["Vice Grip", 4, "Blacksmith 3", "Uncommon"],
    ["Shock Mod", 4, "Robotics Expert 2, Science! 1", "Uncommon", "Science"],
    ["Stun Mod", 4, "Robotics Expert 2, Science! 1", "Uncommon", "Science"],
  ])
);

WEAPON_RECIPES.push(
  ...group({ workbench: "weapons", category: "weapons", group: "M79 GRENADE LAUNCHER MODS", skill: "Repair", page: 90 }, [
    ["Long Barrel (M79)", 3, "Gun Nut 1", "Uncommon"],
    ["Full Stock (M79)", 2, "", "Common"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ACID SOAKER MODS", skill: "Science", page: 91 }, [
    ["Caustic", 3, "", "Common"],
    ["Large Ampoule", 2, "", "Common"],
    ["Large Vial", 3, "", "Common"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ALIEN BLASTER MODS", skill: "Science", page: 92 }, [
    ["Fusion Mag (Alien Blaster)", 3, "Science! 1", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ASSAULTRON HEAD LASER MODS", skill: "Science", page: 93 }, [
    ["Capacitor Mk III (Head Laser)", 3, "Robotics Expert", "Uncommon"],
    ["Capacitor Mk IV (Head Laser)", 4, "Robotics Expert, Science! 1", "Uncommon"],
    ["Capacitor Mk V (Head Laser)", 5, "Robotics Expert, Science! 2", "Uncommon"],
    ["Capacitor Mk VI (Head Laser)", 6, "Robotics Expert, Science! 3", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "BROADSIDER MODS", skill: "Repair", page: 94 }, [
    ["Long Barrel (Broadsider)", 3, "Gun Nut 1", "Uncommon"],
    ["Light Barrel", 4, "Gun Nut 2", "Uncommon"],
    ["Multi Shot Canister", 5, "Gun Nut 3", "Uncommon"],
    ["M79 Launcher Conversion", 4, "Science! 1", "Uncommon", "Science"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "CRYOLATOR MODS", skill: "Science", page: 95 }, [
    ["Crystallizing Barrel", 5, "Science! 2", "Uncommon"],
    ["Fusion Mag (Cryolator)", 3, "Science! 1", "Uncommon"],
    ["Recoil Compensating Stock (Cryolator)", 3, "", "Common", "Repair"],
    ["Reflex Sight (Cryolator)", 2, "", "Common", "Repair"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "HARPOON GUN MODS", skill: "Repair", page: 96 }, [
    ["Barbed Harpoon", 2, "", "Common"],
    ["Flechette Darts", 4, "Gun Nut 2", "Uncommon"],
    ["Recoil Compensating Stock (Harpoon Gun)", 3, "", "Common"],
    ["Gunner Sight (Harpoon Gun)", 2, "", "Common"],
    ["Short Scope (Harpoon Gun)", 3, "Gun Nut 1", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "ROBOT CLAW MODS", skill: "Repair", page: 97 }, [
    ["Shock Mod (Claw)", 4, "Blacksmith 2, Robotics Expert 1", "Uncommon"],
    ["Stun Mod (Claw)", 4, "Blacksmith 2, Robotics Expert 1", "Uncommon"],
  ])
);
'''

anchor = "export const CRAFTING_RECIPES = ["
if anchor not in text:
    raise RuntimeError("crafting export anchor not found")
text = text.replace(anchor, block + "\n" + anchor, 1)
CRAFTING.write_text(text, encoding="utf-8")
