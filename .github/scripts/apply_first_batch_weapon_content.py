from pathlib import Path
import csv

ROOT = Path(__file__).resolve().parents[2]
WEAPONS = ROOT / "public" / "weapons.csv"
MODS = ROOT / "src" / "data" / "weaponMods.js"
CRAFTING = ROOT / "src" / "data" / "craftingRecipes.js"

weapon_rows = [
    ["Small Guns", ".357 Magnum Revolver", "1", "2", "110", "", "5", "Vicious", "Physical", "1", "C", "Close Quarters, Reliable", "2", "5", ""],
    ["Small Guns", "12.7mm Pistol", "1", "4", "400", "", "6", "", "Physical", "1", "C", "Close Quarters, Recoil (7)", "4", "6", ""],
    ["Small Guns", "12.7mm SMG", "1", "5", "510", "", "5", "Burst", "Physical", "3", "C", "Inaccurate, Recoil (7), Two-Handed", "4", "5", ""],
    ["Small Guns", "25mm Grenade APW", "1", "8", "420", "", "4", "", "Physical", "1", "L", "Blast, Two-Handed", "4", "4", "25mm Grenade"],
    ["Small Guns", "9mm Pistol", "1", "2", "50", "", "3", "", "Physical", "2", "C", "Close Quarters, Concealed, Reliable", "2", "3", ""],
    ["Small Guns", "Anti-Materiel Rifle", "1", "20", "560", "", "8", "Vicious", "Physical", "0", "L", "Reliable, Two-Handed, Recoil (8)", "4", "8", ""],
    ["Small Guns", "Battle Rifle", "1", "10", "150", "", "7", "Piercing 1", "Physical", "1", "M", "Reliable, Two-Handed", "3", "7", ""],
    ["Small Guns", "Black Powder Blunderbuss", "1", "3", "90", "", "7", "Vicious", "Physical", "0", "C", "Close Quarters, Inaccurate, Recoil (7), Slow Load", "3", "7", ""],
    ["Small Guns", "Black Powder Pistol", "1", "3", "60", "", "7", "Vicious", "Physical", "0", "C", "Recoil (7), Slow Load", "3", "7", ""],
    ["Small Guns", "Black Powder Rifle", "1", "6", "60", "", "8", "Vicious", "Physical", "0", "M", "Recoil (7), Slow Load", "3", "8", ""],
    ["Small Guns", "Gauss Pistol", "1", "6", "334", "", "8", "Piercing 1", "Physical", "1", "M", "", "5", "8", ""],
    ["Small Guns", "Gauss Shotgun", "1", "14", "400", "", "7", "Piercing 1, Spread", "Physical", "0", "C", "Ammo-Hungry (10), Two-Handed", "5", "7", ""],
    ["Small Guns", "Lever-Action Rifle", "1", "9", "201", "", "7", "Piercing 1", "Physical", "0", "M", "", "3", "7", ""],
    ["Small Guns", "Light Machine Gun", "1", "15", "150", "", "5", "Burst", "Physical", "4", "M", "Inaccurate, Recoil (8), Two-Handed", "3", "5", ""],
    ["Small Guns", "Pump-Action Shotgun", "1", "11", "70", "", "5", "Spread", "Physical", "1", "C", "Inaccurate, Two-Handed", "1", "5", ""],
    ["Small Guns", "Radium Rifle", "1", "11", "110", "", "4", "Radioactive", "Physical", "3", "M", "Two-Handed", "3", "4", ""],
    ["Small Guns", "Sniper Rifle", "1", "10", "300", "", "7", "Piercing 1", "Physical", "0", "L", "Accurate, Two-Handed", "4", "7", ""],
    ["Energy Weapon", "Alien Atomizer", "1", "3", "1536", "", "6", "Vicious", "Energy", "3", "C", "Close Quarters, Reliable", "5", "6", ""],
    ["Energy Weapon", "Alien Disintegrator", "1", "7", "921", "", "8", "Vicious", "Energy", "2", "M", "Two-Handed, Reliable", "5", "8", ""],
    ["Energy Weapon", "Arc Welder", "1", "15", "370", "", "3", "Stun", "Energy", "4", "C", "Surge, Two-Handed", "4", "3", ""],
    ["Energy Weapon", "Assaultron Head", "1", "8", "500", "", "5", "Piercing 1", "Energy", "0", "C", "", "3", "5", "Fusion Cell"],
    ["Energy Weapon", "Microwave Emitter", "1", "8", "500", "", "6", "Persistent, Piercing 3", "Energy", "1", "M", "Two-Handed", "5", "6", ""],
    ["Energy Weapon", "Tesla Rifle", "1", "8", "180", "", "5", "Arc", "Energy", "2", "M", "Two-Handed", "4", "5", ""],
    ["Big Guns", ".50 Cal Machine Gun", "1", "31", "350", "", "7", "Burst", "Physical", "3", "M", "Two-Handed, Recoil (9)", "3", "7", ".50"],
    ["Big Guns", "Auto Grenade Launcher", "1", "30", "450", "", "6", "Breaking", "Physical", "2", "L", "Bombard, Inaccurate", "4", "6", "40mm Grenade"],
    ["Big Guns", "Drone Cannon", "1", "18", "600", "", "8", "Breaking", "Energy", "0", "M", "Ammo-Hungry (20), Blast, Inaccurate, Slow Load", "5", "8", "Alien Power Module"],
    ["Big Guns", "Gatling Gun", "1", "20", "350", "", "3", "Burst, Spread", "Physical", "3", "M", "Gatling, Inaccurate, Recoil (6), Two-Handed", "1", "3", "5mm"],
    ["Big Guns", "Gatling Plasma", "1", "24", "1000", "", "4", "Burst", "Physical/Energy", "4", "M", "Gatling, Inaccurate, Two-Handed", "4", "4", "Plasma Cartridge or Plasma Core"],
    ["Big Guns", "Gauss Minigun", "1", "38", "912", "", "6", "Burst, Piercing 1", "Physical", "3", "L", "Gatling, Two-Handed", "6", "6", "2mm EC"],
    ["Big Guns", "Plasma Caster", "1", "30", "700", "", "8", "Burst", "Physical/Energy", "3", "M", "Inaccurate, Recoil (8), Two-Handed", "5", "8", "Plasma Cartridge"],
    ["Big Guns", "Tesla Cannon", "1", "24", "870", "", "8", "Arc, Piercing 2", "Energy", "0", "L", "Accurate, Ammo-Hungry (5), Surge, Two-Handed", "5", "8", "Fusion Cell"],
    ["Bow", "Bow", "1", "3", "44", "", "3", "", "Physical", "2", "M", "Suppressed, Recoil (6), Two-Handed", "1", "3", "Arrow"],
    ["Bow", "Crossbow", "1", "3", "44", "", "5", "", "Physical", "0", "M", "Suppressed, Two-Handed, Slow Load", "2", "5", "Crossbow Bolt"],
]


def update_weapons_csv():
    with WEAPONS.open("r", newline="", encoding="utf-8-sig") as fh:
        reader = csv.reader(fh)
        rows = list(reader)
    header = rows[0]
    if "Ammo" not in header:
        header.append("Ammo")
        rows = [header] + [r + [""] for r in rows[1:]]
    width = len(header)
    name_index = header.index("name")
    by_name = {r[name_index].strip().lower(): i for i, r in enumerate(rows[1:], start=1) if len(r) > name_index}
    for incoming in weapon_rows:
        normalized = incoming[:width] + [""] * max(0, width - len(incoming))
        key = normalized[name_index].strip().lower()
        if key in by_name:
            rows[by_name[key]] = normalized
        else:
            by_name[key] = len(rows)
            rows.append(normalized)
    with WEAPONS.open("w", newline="", encoding="utf-8") as fh:
        csv.writer(fh, lineterminator="\r\n").writerows(rows)


MOD_MARKER = "// === SUPPLEMENTAL WEAPON BATCH 1 ==="
MOD_SNIPPET = r'''
  // === SUPPLEMENTAL WEAPON BATCH 1 ===
  "assaultron-head": {
    capacitor: [
      mod("Capacitor Mk III", "+1 damage; consumes 3 shots per attack", 0, 4, "Robotics Expert", "Mk III"),
      mod("Capacitor Mk IV", "+2 damage; consumes 4 shots per attack", 1, 8, "Robotics Expert, Science! 1", "Mk IV"),
      mod("Capacitor Mk V", "+3 damage; consumes 5 shots per attack", 1, 12, "Robotics Expert, Science! 2", "Mk V"),
      mod("Capacitor Mk VI", "+4 damage; consumes 6 shots per attack", 2, 16, "Robotics Expert, Science! 3", "Mk VI"),
    ],
  },
  "50-cal-machine-gun": {
    barrel: [mod("Heavy Barrel", "+1 damage; gain Vicious", 3, 35, "Gun Nut 4", "")],
  },
  "auto-grenade-launcher": {
    barrel: [
      mod("Heavy Barrel", "+1 damage; gain Vicious", 3, 135, "Gun Nut 4", ""),
      mod("Long Barrel", "Increase Range by 1 step", 2, 45, "Gun Nut 4", ""),
    ],
    receiver: [mod("25mm Grenade Receiver", "Damage becomes 4; +2 Fire Rate; ammo becomes 25mm Grenade", -3, 135, "Gun Nut 4", "")],
  },
  "gatling-gun": {
    receiver: [mod("Speedy Receiver", "+2 Fire Rate", 1, 35, "Gun Nut 3", "")],
    barrel: [mod("Long Barrel", "Increase Range by 1 step", 2, 158, "Gun Nut 4", "Long")],
    grip: [mod("Comfort Grip", "Remove Recoil (6)", 3, 90, "Gun Nut 4", "Comfort Grip")],
    magazine: [mod("Extra-Large Magazine", "+1 Fire Rate; gain Unreliable", 2, 28, "Gun Nut 4", "")],
    sights: [mod("Front Sight Ring", "Remove Inaccurate", 2, 158, "Gun Nut 4", "Sighted")],
    muzzle: [mod("Large Bayonet", "Melee profile: 5 damage, Piercing 1 Physical", 5, 18, "Gun Nut 4", "Bayoneted")],
  },
  "gatling-plasma": {
    barrel: [mod("Ported Barrel", "Remove Inaccurate", 6, 81, "Science! 4", "Ported")],
    grip: [mod("Comfort Grip", "Remove Recoil (6)", 3, 90, "Science! 4", "Comfort Grip")],
    sights: [mod("Reflex Sight", "May re-roll hit location die", 2, 50, "Gun Nut 2", "Sighted")],
    nozzle: [
      mod("Beam Splitter", "Gain Spread", 3, 20, "Science! 4", "Scattered"),
      mod("Beam Focuser", "Increase Range by 1 step", 4, 41, "Science! 4", "Focused"),
    ],
  },
  "gauss-minigun": {
    barrel: [
      mod("Tri-Barrel", "+1 Fire Rate", 4, 91, "Science! 1", "Triple Barrel"),
      mod("Penta-Barrel", "-1 damage; reduce Range by 1 step; +2 Fire Rate", 12, 182, "Science! 1", "Penta Barrel"),
    ],
    capacitor: [
      mod("Tesla Coil Capacitor", "Damage type becomes Energy", 8, 91, "Science! 1", "Tesla Capacitor"),
      mod("Tesla Coil Dynamo", "Damage type becomes Energy; +1 Fire Rate", 12, 136, "Science! 2", "Tesla Dynamo"),
    ],
    sights: [mod("Gunner Sight", "May re-roll hit location die", 1, 5, "", "Tactical")],
  },
  "plasma-caster": {
    capacitor: [
      mod("Calibrated Capacitor", "Gain Vicious", 3, 140, "Science! 4", ""),
      mod("Pulse Capacitor", "Gain Surge", 3, 70, "Science! 3", "Pulse"),
      mod("High Speed Electrode", "+1 Fire Rate", 3, 105, "Science! 3", "Rapid"),
    ],
    barrel: [mod("Long Barrel", "Increase Range by 1 step", 5, 128, "Science! 4", "")],
  },
'''


def update_mods():
    text = MODS.read_text(encoding="utf-8")
    if MOD_MARKER in text:
        return
    anchor = "};\n\nconst melee = {"
    if anchor not in text:
        raise RuntimeError("weaponMods.js insertion anchor not found")
    text = text.replace(anchor, MOD_SNIPPET + "};\n\nconst melee = {", 1)
    MODS.write_text(text, encoding="utf-8")


CRAFT_MARKER = "// === SUPPLEMENTAL WEAPON BATCH 1 RECIPES ==="
CRAFT_SNIPPET = r'''
  // === SUPPLEMENTAL WEAPON BATCH 1 RECIPES ===
  ...group({ workbench: "weapons", category: "weapons", group: "ASSAULTRON HEAD MODS", skill: "Science", page: 62 }, [
    ["Capacitor Mk III", 2, "Robotics Expert", "Uncommon"],
    ["Capacitor Mk IV", 3, "Robotics Expert, Science! 1", "Uncommon"],
    ["Capacitor Mk V", 4, "Robotics Expert, Science! 2", "Uncommon"],
    ["Capacitor Mk VI", 5, "Robotics Expert, Science! 3", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: ".50 CAL MACHINE GUN MODS", skill: "Repair", page: 67 }, [
    ["Heavy Barrel", 4, "Gun Nut 4", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "AUTO GRENADE LAUNCHER MODS", skill: "Repair", page: 67 }, [
    ["Heavy Barrel", 4, "Gun Nut 4", "Uncommon"],
    ["Long Barrel", 4, "Gun Nut 4", "Uncommon"],
    ["25mm Grenade Receiver", 5, "Gun Nut 4", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "GATLING GUN MODS", skill: "Repair", page: 68 }, [
    ["Speedy Receiver", 3, "Gun Nut 3", "Uncommon"],
    ["Long Barrel", 4, "Gun Nut 4", "Uncommon"],
    ["Comfort Grip", 3, "Gun Nut 4", "Uncommon"],
    ["Extra-Large Magazine", 3, "Gun Nut 4", "Uncommon"],
    ["Front Sight Ring", 2, "Gun Nut 4", "Uncommon"],
    ["Large Bayonet", 2, "Gun Nut 4", "Uncommon"],
  ]),
  // The screenshots for Gatling Plasma and Gauss Minigun repeat unrelated recipe rows.
  // Keep their mod stats from the source tables, but use the app's abstract junk economy here.
  ...group({ workbench: "weapons", category: "weapons", group: "GATLING PLASMA MODS", skill: "Science", page: 70 }, [
    ["Ported Barrel", 4, "Science! 4", "Uncommon"],
    ["Comfort Grip", 4, "Science! 4", "Uncommon"],
    ["Reflex Sight", 2, "Gun Nut 2", "Uncommon", "Repair"],
    ["Beam Splitter", 4, "Science! 4", "Uncommon"],
    ["Beam Focuser", 4, "Science! 4", "Uncommon"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "GAUSS MINIGUN MODS", skill: "Science", page: 71 }, [
    ["Tri-Barrel", 2, "Science! 1", "Uncommon"],
    ["Penta-Barrel", 3, "Science! 1", "Uncommon"],
    ["Tesla Coil Capacitor", 2, "Science! 1", "Uncommon"],
    ["Tesla Coil Dynamo", 3, "Science! 2", "Uncommon"],
    ["Gunner Sight", 2, "", "Common", "Repair"],
  ]),
  ...group({ workbench: "weapons", category: "weapons", group: "PLASMA CASTER MODS", skill: "Science", page: 72 }, [
    ["Calibrated Capacitor", 3, "Science! 4", "Uncommon"],
    ["Pulse Capacitor", 4, "Science! 3", "Uncommon"],
    ["High Speed Electrode", 5, "Science! 3", "Uncommon"],
    ["Long Barrel", 3, "Science! 4", "Uncommon"],
  ]),
'''


def update_crafting():
    text = CRAFTING.read_text(encoding="utf-8")
    if CRAFT_MARKER in text:
        return
    anchor = "  ...group({ workbench: \"weapons\", category: \"weapons\", group: \"SWORD MODS\""
    pos = text.find(anchor)
    if pos < 0:
        raise RuntimeError("craftingRecipes.js insertion anchor not found")
    text = text[:pos] + CRAFT_SNIPPET + text[pos:]
    CRAFTING.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    update_weapons_csv()
    update_mods()
    update_crafting()
    print(f"Applied {len(weapon_rows)} weapons and supplemental mod/crafting data")
