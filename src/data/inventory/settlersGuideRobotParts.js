const part = (name, kind, complexity, perks, rarity, stats = {}, effect = "") => ({
  name,
  category: "robot_parts",
  kind,
  complexity: String(complexity),
  perks,
  skill: "Repair",
  rarity,
  effect,
  ...stats,
  source: "Fallout: The Roleplaying Game — Settler's Guide Book",
});

export const SETTLERS_GUIDE_ROBOT_PARTS = [
  part("Mister Handy Torso", "torso", 4, "Robotics Expert 1", "Uncommon", { body: "5", carryWeight: "150 lbs." }, "Supports up to three Mister Handy arms and Mister Handy eye stalks."),
  part("Protectron Torso", "torso", 4, "Robotics Expert 1", "Uncommon", { body: "5", carryWeight: "225 lbs." }),
  part("Assaultron Torso", "torso", 5, "Robotics Expert 2", "Uncommon", { body: "9", carryWeight: "150 lbs." }),
  part("Robobrain Torso", "torso", 6, "Robotics Expert 2, Science! 1", "Rare", { body: "6", carryWeight: "150 lbs." }),
  part("Sentry Bot Torso", "torso", 7, "Armorer 1, Robotics Expert 3, Science! 2", "Rare", { body: "10", carryWeight: "225 lbs." }),

  part("Mister Handy Thruster", "legs", 4, "Robotics Expert 1", "Uncommon", {}, "Grants Jet Propulsion; ignores ground difficult terrain and obstacles."),
  part("Protectron Legs", "legs", 3, "Robotics Expert 1", "Uncommon"),
  part("Assaultron Legs", "legs", 5, "Robotics Expert 2", "Uncommon"),
  part("Robobrain Treads", "legs", 5, "Robotics Expert 2, Science! 1", "Uncommon"),
  part("Sentry Bot Legs", "legs", 6, "Armorer 1, Robotics Expert 3", "Rare"),

  part("Protectron Head", "head", 4, "Robotics Expert 1", "Uncommon", { mind: "5", other: "2" }),
  part("Mister Handy Eye Stalk", "head", 4, "Robotics Expert 1, Science! 1", "Uncommon", { mind: "7", other: "3" }, "Three eye stalks grant 360° Vision."),
  part("Assaultron Head", "head", 6, "Robotics Expert 2, Science! 1", "Uncommon", { mind: "6", other: "4" }),
  part("Assaultron Head Laser", "head", 7, "Robotics Expert 2, Science! 2", "Rare", { mind: "6", other: "4" }, "Includes the integrated Assaultron Head Laser weapon."),
  part("Robobrain Head", "head", 6, "Robotics Expert 2, Science! 3", "Rare", { mind: "7", other: "3" }, "Includes an integrated Mesmetron."),
  part("Sentry Bot Head", "head", 6, "Armorer 1, Robotics Expert 2, Science! 2", "Rare", { mind: "6", other: "4" }),

  part("Protectron Arm", "arm", 4, "Robotics Expert 1", "Uncommon", { melee: "2", guns: "2" }),
  part("Mister Handy Arm", "arm", 5, "Robotics Expert 1", "Uncommon", { melee: "3", guns: "1" }),
  part("Assaultron Arm", "arm", 5, "Robotics Expert 2", "Uncommon", { melee: "5", guns: "5" }),
  part("Robobrain Arm", "arm", 5, "Robotics Expert 2, Science! 1", "Rare", { melee: "2", guns: "4" }),
  part("Sentry Bot Arm", "arm", 6, "Armorer 1, Robotics Expert 3, Science! 1", "Rare", { melee: "4", guns: "5" }),

  part("Buzz Saw", "arm_attachment", 3, "Blacksmith 1", "Uncommon"),
  part("Construction Claw", "arm_attachment", 3, "Blacksmith 1", "Uncommon"),
  part("Cryojet", "arm_attachment", 4, "Robotics Expert 1, Science! 1", "Uncommon", { skill: "Science" }),
  part("Drill", "arm_attachment", 3, "Blacksmith 2", "Uncommon"),
  part("Vice Grip", "arm_attachment", 4, "Blacksmith 3", "Uncommon"),
  part("Shock Mod", "arm_attachment_mod", 4, "Robotics Expert 2, Science! 1", "Uncommon", { skill: "Science" }),
  part("Stun Mod", "arm_attachment_mod", 4, "Robotics Expert 2, Science! 1", "Uncommon", { skill: "Science" }),
];

export const SETTLERS_GUIDE_TOOL_ITEMS = [
  {
    name: "Robot Workbench",
    category: "tools",
    effect: "Craft, repair, and modify robots, robot components, robot weapons, armor plating, and modules.",
    weight: "",
    cost: "",
    rarity: "Uncommon",
    complexity: "",
    perks: "Robotics Expert 1",
    skill: "Repair",
    source: "Fallout: The Roleplaying Game — Settler's Guide Book",
  },
];
