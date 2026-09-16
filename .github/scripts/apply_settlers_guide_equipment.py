from pathlib import Path
import csv

ROOT = Path(__file__).resolve().parents[2]
WEAPONS = ROOT / "public" / "weapons.csv"
AMMO = ROOT / "public" / "Ammo.csv"
MODS = ROOT / "src" / "data" / "weaponMods.js"

WEAPON_ROWS = [
 ["Small Guns","M79 Grenade Launcher","1","6","300","","6","","Physical","0","L","Blast, Inaccurate, Slow Load, Two-Handed","3","6","40mm Grenade Round"],
 ["Small Guns","Smoke Claws","1","","","","4","Persistent","Poison","0","M","Blast, Inaccurate","","4","Gas Grenade"],
 ["Energy Weapon","Acid Soaker","1","3","125","","3","Breaking, Persistent","Poison","2","C","Debilitating, Inaccurate","3","3","Acid Concentrate"],
 ["Energy Weapon","Alien Blaster","1","2","90","","5","Vicious","Energy/Radiation","2","C","Close Quarters, Inaccurate","5","5","Alien Blaster Round"],
 ["Energy Weapon","Assaultron Head Laser","1","8","115","","5","Piercing 1","Energy","0","C","","4","5","Fusion Cell"],
 ["Energy Weapon","Cryojet","1","8","261","","3","Burst, Freeze","Energy","3","C","Inaccurate","4","3","Cryo Cell"],
 ["Energy Weapon","Mesmetron","1","2","120","","3","Stun","Energy","1","M","","4","3","Gamma Round"],
 ["Energy Weapon","Tesla Rifle","1","8","180","","4","Arc","Energy","2","M","Two-Handed","4","4","Fusion Cell"],
 ["Big Guns","Broadsider","1","16","140","","10","Breaking","Physical","0","M","Blast, Two-Handed","5","10","Cannonball"],
 ["Big Guns","Cryolator","1","14","300","","4","Burst, Freeze, Spread","Energy","4","C","Inaccurate, Two-Handed","4","4","Cryo Cell"],
 ["Big Guns","Harpoon Gun","1","16","120","","12","Piercing 1","Physical","0","M","Debilitating, Inaccurate, Two-Handed","5","12","Harpoon"],
 ["Melee Weapon","Buzz Saw","1","3","25","","3","Piercing","Physical","0","C","","2","3",""],
 ["Unarmed","Claw","1","2","25","","3","","Physical","0","C","","1","3",""],
 ["Unarmed","Construction Claw","1","3","25","","4","Breaking","Physical","0","C","","0","4",""],
 ["Unarmed","Drill","1","20","50","","5","Vicious","Physical","0","C","Debilitating","1","5",""],
 ["Unarmed","Vice Grip","1","15","30","","4","Breaking","Physical","0","C","","2","4",""],
]

AMMO_ROWS = [
 ["40mm Grenade Round","2+1 CD","0","2","4"],
 ["Acid Concentrate","2+3 CD","0","2","3"],
 ["Alien Blaster Round","3+1 CD","0","1","6"],
 ["Cannonball","1+2 CD","4","8","5"],
 ["Cryo Cell","4+3 CD","0","10","5"],
 ["Gas Grenade","2+1 CD","0","2","4"],
 ["Harpoon","2+1 CD","0","3","4"],
]

def patch_csv(path, incoming, name_col):
    with path.open("r", newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    header = rows[0]
    width = len(header)
    # Remove the earlier generic Assaultron Head row now superseded by the book's exact weapon name.
    if path == WEAPONS:
        rows = [rows[0]] + [r for r in rows[1:] if len(r) <= name_col or r[name_col].strip().lower() != "assaultron head"]
    index = {r[name_col].strip().lower(): i for i, r in enumerate(rows[1:], 1) if len(r) > name_col}
    for row in incoming:
        row = row[:width] + [""] * max(0, width - len(row))
        key = row[name_col].strip().lower()
        if key in index:
            rows[index[key]] = row
        else:
            index[key] = len(rows)
            rows.append(row)
    with path.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f, lineterminator="\r\n").writerows(rows)

patch_csv(WEAPONS, WEAPON_ROWS, 1)
patch_csv(AMMO, AMMO_ROWS, 0)

mods = MODS.read_text(encoding="utf-8")
marker = "// === SETTLERS GUIDE EQUIPMENT ==="
if marker not in mods:
    mods = mods.replace('  frame: "Frame",\n};', '  frame: "Frame",\n  concentrate: "Concentrate",\n  container: "Container",\n  canister: "Canister",\n};', 1)
    block = r'''
  // === SETTLERS GUIDE EQUIPMENT ===
  "m79-grenade-launcher": {
    barrel: [mod("Long Barrel", "Increase Range by 1 step", 2, 40, "Gun Nut 1", "Long")],
    stock: [mod("Full Stock", "Gain Two-Handed; remove Inaccurate", 1, 10, "", "")],
  },
  "acid-soaker": {
    concentrate: [mod("Caustic", "+1 damage", 2, 30, "", "Caustic")],
    container: [
      mod("Large Ampoule", "+1 Fire Rate", 2, 22, "", "High Capacity"),
      mod("Large Vial", "+3 Fire Rate", 4, 40, "", "Maximum Capacity"),
    ],
  },
  "alien-blaster": {
    magazine: [mod("Fusion Mag", "Damage becomes 3; -1 Fire Rate; ammo becomes Fusion Cell", 0, 21, "Science! 1", "Converted")],
  },
  "assaultron-head-laser": {
    capacitor: [
      mod("Capacitor Mk III", "+1 damage; consumes 3 shots per attack", 0, 4, "Robotics Expert", "Mk III"),
      mod("Capacitor Mk IV", "+2 damage; consumes 4 shots per attack", 1, 8, "Robotics Expert, Science! 1", "Mk IV"),
      mod("Capacitor Mk V", "+3 damage; consumes 5 shots per attack", 1, 12, "Robotics Expert, Science! 2", "Mk V"),
      mod("Capacitor Mk VI", "+4 damage; consumes 6 shots per attack", 2, 16, "Robotics Expert, Science! 3", "Mk VI"),
    ],
  },
  broadsider: {
    barrel: [
      mod("Long Barrel", "Increase Range by 1 step", 2, 40, "Gun Nut 1", "Long"),
      mod("Light Barrel", "+2 damage; remove Blast", 3, 30, "Gun Nut 2", "Fluted"),
    ],
    canister: [
      mod("Multi Shot Canister", "+1 Fire Rate; gain Inaccurate", 1, 45, "Gun Nut 3", "Repeating"),
      mod("M79 Launcher", "Increase Range by 1 step; ammo becomes 40mm Grenade Round", 0, 3, "Science! 1", "Converted"),
    ],
  },
  cryolator: {
    barrel: [mod("Crystallizing Barrel", "+2 damage; increase Range by 1 step; -1 Fire Rate; remove Stun and Unreliable", 5, 40, "Science! 2", "Crystallized")],
    magazine: [mod("Fusion Mag", "Damage becomes 2; -1 Fire Rate; ammo becomes Fusion Cell", 0, 21, "Science! 1", "Converted")],
    stock: [mod("Recoil Compensating Stock", "+1 Fire Rate", 2, 45, "", "Recoil Compensating")],
    sights: [mod("Reflex", "May re-roll hit location die", 0, 17, "", "Tactical")],
  },
  "harpoon-gun": {
    magazine: [
      mod("Barbed Harpoon", "Gain Vicious and Persistent", 0, 21, "", "Barbed"),
      mod("Flechette Darts", "Gain Spread; reduce Range by 1 step", 0, 15, "Gun Nut 2", "Tiny"),
    ],
    stock: [mod("Recoil Compensating Stock", "+1 Fire Rate", 15, 45, "", "Recoil Compensating")],
    sights: [
      mod("Gunner Sight", "May re-roll hit location die", 0, 17, "", "Tactical"),
      mod("Short Scope", "Gain Accurate", 1, 28, "Gun Nut 1", "Scoped"),
    ],
  },
  claw: {
    head: [
      mod("Shock Mod", "+2 damage; damage type becomes Energy", 0, 15, "Blacksmith 2, Robotics Expert 1", "Shock"),
      mod("Stun Mod", "+3 damage; gain Stun; damage type becomes Energy", 0, 30, "Blacksmith 2, Robotics Expert 1", "Stun"),
    ],
  },
'''
    anchor = "const supplementalUnique = {"
    if anchor not in mods:
        raise RuntimeError("supplementalUnique anchor not found")
    mods = mods.replace(anchor, anchor + "\n" + block, 1)
    MODS.write_text(mods, encoding="utf-8")
