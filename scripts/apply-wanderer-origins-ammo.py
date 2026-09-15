from pathlib import Path
import json, re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: marker not found')
    return text.replace(old, new, 1)

# 1) Expand ammo choices + add 9mm to Ammo.csv.
p = 'src/constants.js'
s = read(p)
old = '''export const WEAPON_AMMO_OPTIONS = [
  ".38",
  "10mm",
  ".308",
  "Flare",
  "Shotgun Shell",
  ".45",
  "Flamer Fuel",
  "Fusion Cell",
  "Gamma Round",
  "Railway Spike",
  "Syringer Ammo",
  ".44 Magnum",
  ".50",
  "5.56mm",
  "5mm",
  "Fusion Core",
  "Missile",
  "Plasma Cartridge",
  "2mm EC",
  "Mini-Nuke"
];'''
new = '''export const WEAPON_AMMO_OPTIONS = [
  ".38", "9mm", "10mm", ".308", ".357 Magnum", ".44 Magnum", ".45", ".50", ".50 Ball",
  "5mm", "5.56mm", "12.7mm", "2mm EC", "Arrow", "Crossbow Bolt", "Flare",
  "Shotgun Shell", "Flamer Fuel", "Fusion Cell", "Fusion Core", "Gamma Round",
  "Railway Spike", "Syringer Ammo", "Plasma Cartridge", "Plasma Core", "Missile",
  "25mm Grenade", "40mm Grenade Round", "Mini-Nuke", "Alien Power Cells", "Alien Power Module"
];'''
if old in s:
    s = s.replace(old, new, 1)
write(p, s)

p = 'public/Ammo.csv'
s = read(p)
if '\n9mm,' not in s:
    lines = s.splitlines()
    lines.insert(2, '9mm,8+4,0,2,1')
    s = '\n'.join(lines) + '\n'
write(p, s)

# 2) Spend the correct amount of ammo: base shot + full Rate of Fire when Rate is enabled.
p = 'src/App.jsx'
s = read(p)
old = '''    // === АВТОМАТИЧНА ВИТРАТА НАБОЇВ (Виправлено type === "weapon") ===
    if (rollConfig.type === "weapon" && rollConfig.weapon && rollConfig.weapon.ammo) {
      const ammoType = rollConfig.weapon.ammo;
      
      setForm((prev) => {
        const nextItems = [...prev.inventoryItems];
        const ammoIndex = nextItems.findIndex(item => item.name === ammoType);
        
        if (ammoIndex !== -1) {
          let currentQty = parseInt(nextItems[ammoIndex].quantity, 10) || 0;
          if (currentQty > 0) {
            nextItems[ammoIndex] = {
              ...nextItems[ammoIndex],
              quantity: String(currentQty - 1)
            };
            console.log(`Fired! -1 ${ammoType}. Remaining: ${currentQty - 1}`);
          } else {
            console.warn(`Click! Out of ${ammoType} ammo!`);
          }
        }
        return { ...prev, inventoryItems: nextItems };
      });
    }
    // ==================================='''
new = '''    // === AUTOMATIC AMMO SPEND ===
    if (rollConfig.type === "weapon" && rollConfig.weapon && rollConfig.weapon.ammo) {
      const ammoType = String(rollConfig.weapon.ammo || "").trim();
      const normalizedAmmo = ammoType.toLowerCase().replace(/[^a-z0-9.]+/g, "").replace(/s$/, "");
      const rateSpent = rollConfig.useRate ? Math.max(0, Number(rollConfig.rate ?? rollConfig.weapon.rate ?? 0)) : 0;
      const ammoSpent = 1 + rateSpent;

      setForm((prev) => {
        const nextItems = [...(prev.inventoryItems || [])];
        const ammoIndex = nextItems.findIndex((item) => {
          if (item?.category !== "ammo") return false;
          const candidate = String(item?.canonicalName || item?.name || "")
            .trim().toLowerCase().replace(/[^a-z0-9.]+/g, "").replace(/s$/, "");
          return candidate === normalizedAmmo;
        });

        if (ammoIndex !== -1) {
          const currentQty = Math.max(0, parseInt(nextItems[ammoIndex].quantity, 10) || 0);
          const actuallySpent = Math.min(currentQty, ammoSpent);
          const remaining = Math.max(0, currentQty - actuallySpent);
          nextItems[ammoIndex] = { ...nextItems[ammoIndex], quantity: String(remaining) };
          console.log(`Fired! -${actuallySpent} ${ammoType}. Remaining: ${remaining}`);
        } else {
          console.warn(`No matching ammo in inventory: ${ammoType}`);
        }
        return { ...prev, inventoryItems: nextItems };
      });
    }
    // ============================'''
if old in s:
    s = s.replace(old, new, 1)
write(p, s)

# 3) Add Wanderer origins.
p = 'src/components/data/origins.js'
s = read(p)
if 'assaultron:' not in s:
    insert = '''
  assaultron: {
    id: "assaultron",
    translationKey: "origins.assaultron",
    descriptionKey: "originDescriptions.assaultron",
    traits: ["origins.traits.designed_for_frontline"],
    equipmentPacks: ["assaultron_military", "assaultron_devil", "assaultron_caravan"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: ["radiation", "poison", "disease"],
    fixedCarryWeight: 150,
    robot: true,
  },
  brotherhood_outcast: {
    id: "brotherhood_outcast",
    translationKey: "origins.brotherhood_outcast",
    descriptionKey: "originDescriptions.brotherhood_outcast",
    traits: ["origins.traits.chain_that_breaks"],
    equipmentPacks: ["outcast_ex_knight", "outcast_ex_scribe"],
    tagSkillCount: 4,
    restrictedTagCount: 1,
    restrictedTagList: ["Energy Weapons", "Science", "Repair"],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: [],
  },
  child_of_atom: {
    id: "child_of_atom",
    translationKey: "origins.child_of_atom",
    descriptionKey: "originDescriptions.child_of_atom",
    traits: ["origins.traits.rad_sponge"],
    equipmentPacks: ["atom_missionary", "atom_zealot"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: [],
    bonusPerkCount: 1,
    baseRadiationResistance: 1,
  },
  nightkin: {
    id: "nightkin",
    translationKey: "origins.nightkin",
    descriptionKey: "originDescriptions.nightkin",
    traits: ["origins.traits.stealth_boy_addict"],
    equipmentPacks: ["nightkin_pack"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 4,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10, S: 12, E: 12, I: 8, C: 8 },
    specialBonuses: { S: 2, E: 2 },
    immunities: ["radiation", "poison"],
  },
  tribal: {
    id: "tribal",
    translationKey: "origins.tribal",
    descriptionKey: "originDescriptions.tribal",
    traits: [],
    availableTraits: ["mother_wasteland", "nomad", "rite_of_passage", "tools_of_old_world", "chosen_one"],
    traitSelectCount: 2,
    equipmentPacks: ["tribal_modernist", "tribal_ritualist", "tribal_naturalist"],
    tagSkillCount: 3,
    restrictedTagCount: 0,
    restrictedTagList: [],
    skillRankLimit: 6,
    maxHpModifier: 0,
    specialLimits: { min: 1, max: 10 },
    immunities: [],
  },
'''
    marker = '\n};\n\nexport const ORIGINS_LIST'
    pos = s.find(marker)
    if pos < 0: raise SystemExit('origins marker not found')
    s = s[:pos] + ',' + insert.rstrip(',\n') + s[pos:]

traits_marker = '  "small_frame": "small_frame"\n};'
if 'designed_for_frontline' not in s:
    traits_new = '''  "small_frame": "small_frame",
  "origins.traits.designed_for_frontline": "designed_for_frontline",
  "origins.traits.chain_that_breaks": "chain_that_breaks",
  "origins.traits.rad_sponge": "rad_sponge",
  "origins.traits.stealth_boy_addict": "stealth_boy_addict",
  "mother_wasteland": "mother_wasteland",
  "nomad": "nomad",
  "rite_of_passage": "rite_of_passage",
  "tools_of_old_world": "tools_of_old_world",
  "chosen_one": "chosen_one"
};'''
    s = replace_once(s, traits_marker, traits_new, 'traits dictionary')
write(p, s)

# 4) Starting equipment packs and extra random grant types.
p = 'src/data/startingEquipment.js'
s = read(p)
if 'assaultron_military:' not in s:
    packs = '''
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
'''
    marker = '\n};\n\nfunction rollCombatDice'
    pos = s.find(marker)
    if pos < 0: raise SystemExit('equipment pack marker not found')
    s = s[:pos] + ',' + packs.rstrip(',\n') + s[pos:]

if 'OUTCAST_RANDOM_ITEMS' not in s:
    helper = '''
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
'''
    s = s.replace('\nfunction flattenGrant(entries = [], form = {}, choices = {}) {', helper + '\nfunction flattenGrant(entries = [], form = {}, choices = {}) {', 1)

needle = '''    if (entry.type === "randomFood") {
      const foods = INVENTORY_DATABASE.filter((candidate) => candidate.category === "food");
      for (let i = 0; i < Number(entry.count || 1); i += 1) {
        if (!foods.length) break;
        const picked = foods[Math.floor(Math.random() * foods.length)];
        result.push(item(picked.name, "food"));
      }
      return;
    }
    if (entry.type === "item") result.push({ ...entry });'''
replacement = '''    if (entry.type === "randomFood") {
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
      const pools = [
        (form.inventoryItems || []).filter((candidate) => candidate.category === "ammo"),
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
    if (entry.type === "item") result.push({ ...entry });'''
if needle in s:
    s = s.replace(needle, replacement, 1)
write(p, s)

# 5) Quick creation: INT+9 skill points, origin S.P.E.C.I.A.L. bonuses, skill caps, bonus perk count, new localized perk source.
p = 'src/components/characterCreation/QuickCharacterWizard.jsx'
s = read(p)
if 'getSupplementalPerkTranslation' not in s:
    s = s.replace('import { getAddedPerkTranslation } from "../data/perkTranslations.js";\n', 'import { getAddedPerkTranslation } from "../data/perkTranslations.js";\nimport { getSupplementalPerkTranslation } from "../data/supplementalPerks.js";\n', 1)
s = s.replace('  const [perkId, setPerkId] = useState("");', '  const [perkIds, setPerkIds] = useState([]);')
s = s.replace('  const specialRemaining = 40 - specialTotal;', '  const specialBudget = 40 + Object.values(origin?.specialBonuses || {}).reduce((sum, value) => sum + Number(value || 0), 0);\n  const specialRemaining = specialBudget - specialTotal;')
s = s.replace('  const usedSkillPoints = SKILL_KEYS.reduce(', '  const skillPointBudget = 9 + Number(special?.I || 0);\n  const usedSkillPoints = SKILL_KEYS.reduce(', 1)
s = s.replace('    const added = getAddedPerkTranslation(perk.id, language);', '    const supplemental = getSupplementalPerkTranslation(perk.id, language);\n    const added = getAddedPerkTranslation(perk.id, language);', 1)
s = s.replace('        added?.name ||', '        supplemental?.name ||\n        added?.name ||', 1)
s = s.replace('        added?.description ||', '        supplemental?.description ||\n        added?.description ||', 1)
s = s.replace('  const specialReady = specialTotal === 40;', '  const specialReady = specialTotal === specialBudget;')
s = s.replace('    usedSkillPoints === 9 &&', '    usedSkillPoints === skillPointBudget &&')
s = s.replace('  const perkReady = Boolean(perkId);', '  const requiredPerkCount = 1 + Number(origin?.bonusPerkCount || 0);\n  const perkReady = perkIds.length === requiredPerkCount;')
s = s.replace('    setSpecial({ ...buildDefaultForm().special });', '    const baseSpecial = { ...buildDefaultForm().special };\n    Object.entries(ORIGINS[id]?.specialBonuses || {}).forEach(([key, value]) => {\n      baseSpecial[key] = String(Number(baseSpecial[key] || 0) + Number(value || 0));\n    });\n    setSpecial(baseSpecial);', 1)
s = s.replace('    setPerkId("");', '    setPerkIds([]);')
s = s.replace('    setPerkId("");', '    setPerkIds([]);')
s = s.replace('    if (delta > 0 && usedSkillPoints >= 9) return;', '    if (delta > 0 && usedSkillPoints >= skillPointBudget) return;\n    const rankLimit = Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - (skills?.[skillName]?.tagged ? 2 : 0)));\n    if (delta > 0 && current >= rankLimit) return;')
s = s.replace('    const nextRank = Math.max(0, Math.min(3, current + delta));', '    const rankLimit = Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - (skills?.[skillName]?.tagged ? 2 : 0)));\n    const nextRank = Math.max(0, Math.min(rankLimit, current + delta));', 1)
# Remove duplicate rankLimit created by the previous replacement if present.
s = s.replace('    const rankLimit = Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - (skills?.[skillName]?.tagged ? 2 : 0)));\n    if (delta > 0 && usedSkillPoints >= skillPointBudget) return;\n    const rankLimit = Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - (skills?.[skillName]?.tagged ? 2 : 0)));', '    if (delta > 0 && usedSkillPoints >= skillPointBudget) return;\n    const rankLimit = Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - (skills?.[skillName]?.tagged ? 2 : 0)));')
# When a Nightkin-tagged skill would exceed the effective cap, clamp its base rank.
old_toggle = '''    setSkills((prev) => ({
      ...prev,
      [skillName]: {
        ...prev[skillName],
        tagged: !isTagged,
      },
    }));'''
new_toggle = '''    setSkills((prev) => {
      const becomingTagged = !isTagged;
      const maxBase = becomingTagged
        ? Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - 2))
        : 3;
      return {
        ...prev,
        [skillName]: {
          ...prev[skillName],
          rank: String(Math.min(Number(prev[skillName]?.rank || 0), maxBase)),
          tagged: becomingTagged,
        },
      };
    });'''
if old_toggle in s:
    s = s.replace(old_toggle, new_toggle, 1)
# Finish multiple perks.
s = s.replace('    const perk = PERKS_LIST.find((entry) => entry.id === perkId);\n    if (!perk) return;\n    const perkText = localizedPerk(perk);', '    const selectedPerks = perkIds.map((id) => PERKS_LIST.find((entry) => entry.id === id)).filter(Boolean);\n    if (selectedPerks.length !== requiredPerkCount) return;')
s = s.replace('        {\n          id: perk.id,\n          name: perkText.name,\n          rank: "1",\n          description: `${perkText.description}\\n[Req: ${perk.requirements} | Max Rank: ${perk.maxRanks}]`,\n        },', '        ...selectedPerks.map((perk) => {\n          const perkText = localizedPerk(perk);\n          return {\n            id: perk.id,\n            name: perkText.name,\n            rank: "1",\n            description: `${perkText.description}\\n[Req: ${perk.requirements} | Max Rank: ${perk.maxRanks}]`,\n          };\n        }),')
# UI values.
s = s.replace('<strong>{specialTotal}/40</strong>', '<strong>{specialTotal}/{specialBudget}</strong>')
s = s.replace('<strong>{usedSkillPoints}/9</strong>', '<strong>{usedSkillPoints}/{skillPointBudget}</strong>')
s = s.replace('disabled={Number(skill.rank || 0) >= 3 || usedSkillPoints >= 9}', 'disabled={Number(skill.rank || 0) >= Math.max(0, Math.min(3, Number(origin?.skillRankLimit || 6) - (isTagged ? 2 : 0))) || usedSkillPoints >= skillPointBudget}')
s = s.replace('                  const selected = perkId === perk.id;', '                  const selected = perkIds.includes(perk.id);')
s = s.replace('                      onClick={() => setPerkId(perk.id)}', '                      onClick={() => setPerkIds((prev) => selected ? prev.filter((id) => id !== perk.id) : (prev.length < requiredPerkCount ? [...prev, perk.id] : prev))}')
s = s.replace('{copy.perkTitle}</h3>', '{copy.perkTitle} ({perkIds.length}/{requiredPerkCount})</h3>')
# Fixed trait + origin description in origin step.
origin_anchor = '''              {origin && (
                <div className="quick-create-section">'''
origin_insert = '''              {origin && (
                <div className="quick-create-section">
                  {origin.descriptionKey && (
                    <div className="pip-logbox" style={{ marginBottom: 10 }}>
                      {t(origin.descriptionKey, { defaultValue: "" })}
                    </div>
                  )}
                  {(origin.traits || []).length > 0 && (
                    <div className="quick-create-subsection">
                      <strong>{copy.traits}</strong>
                      {(origin.traits || []).map((traitKey) => {
                        const traitId = TRAITS_DICTIONARY[traitKey];
                        return traitId ? (
                          <div className="quick-choice-card is-selected" key={traitKey}>
                            <span><strong>{t(`traitsInfo.${traitId}.name`, { defaultValue: traitId })}</strong><small>{t(`traitsInfo.${traitId}.desc`, { defaultValue: "" })}</small></span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}'''
if origin_anchor in s:
    s = s.replace(origin_anchor, origin_insert, 1)
write(p, s)

# 6) Assaultron fixed carry weight + Child of Atom base radiation resistance.
p = 'src/utils/characterMath.js'
s = read(p)
s = s.replace('  if (form.origin === "mister_handy") {\n    calculatedCarryWeight = 150;', '  if (originData?.fixedCarryWeight != null) {\n    calculatedCarryWeight = Number(originData.fixedCarryWeight);\n  } else if (form.origin === "mister_handy") {\n    calculatedCarryWeight = 150;', 1)
s = s.replace('    radiationResistBonus:\n      toNumber(effectMods.derived.radiationResistBonus) +\n      toNumber(perkState.derived.radiationResistBonus),', '    radiationResistBonus:\n      toNumber(originData?.baseRadiationResistance) +\n      toNumber(effectMods.derived.radiationResistBonus) +\n      toNumber(perkState.derived.radiationResistBonus),', 1)
write(p, s)

# 7) Origin modal: show descriptions and enforce trait count before confirm.
p = 'src/components/shared/OriginSelectionModal.jsx'
s = read(p)
anchor = '''            <div
              className="origin-details push-top"
              style={{ padding: "10px", border: "1px solid var(--pip-color, #14ff00)" }}
            >'''
if 'selectedOriginData.descriptionKey' not in s and anchor in s:
    s = s.replace(anchor, anchor + '''
              {selectedOriginData.descriptionKey && (
                <p style={{ marginTop: 0, opacity: 0.85 }}>
                  {t(selectedOriginData.descriptionKey, { defaultValue: "" })}
                </p>
              )}''', 1)
s = s.replace('              !selectedId ||\n              (selectedOriginData?.equipmentPacks && !selectedPack)', '              !selectedId ||\n              (selectedOriginData?.equipmentPacks && !selectedPack) ||\n              (Number(selectedOriginData?.traitSelectCount || 0) > 0 && selectedTraits.length !== Number(selectedOriginData?.traitSelectCount || 0))')
write(p, s)

# 8) Localization for the five new origins, traits and equipment packs.
translations = {
'en': {
  'origins': {'assaultron':'Assaultron','brotherhood_outcast':'Brotherhood Outcast','child_of_atom':'Child of Atom','nightkin':'Nightkin','tribal':'Tribal'},
  'originDescriptions': {
    'assaultron':'A frontline combat robot built to survive the Wasteland. It is immune to radiation, poison and disease, carries a fixed 150 lb load, and relies on repairs instead of normal biological recovery.',
    'brotherhood_outcast':'A former Brotherhood member who rejected the order’s direction and now applies military training and pre-War technical knowledge on their own terms.',
    'child_of_atom':'A devotee of Atom who treats radiation as a sacred gift. The origin grants an extra level-1 perk and special interaction with radiation.',
    'nightkin':'A blue-skinned super mutant shaped by long-term Stealth Boy use. Nightkin are powerful and resistant, but have tighter Intelligence, Charisma and Skill limits.',
    'tribal':'A member of a strong wasteland community whose identity is defined by traditions, survival knowledge and one of several cultural traits.'},
  'traitsInfo': {
    'designed_for_frontline':{'name':'Designed for the Frontline','desc':'Robot physiology: immune to radiation, poison and disease; fixed 150 lb carry weight; cannot rely on food, drink, rest or chems; gains extra unarmed combat capability.'},
    'chain_that_breaks':{'name':'The Chain that Breaks','desc':'Gain one extra Tag Skill, which must be Energy Weapons, Science or Repair, plus improved scavenging opportunities.'},
    'rad_sponge':{'name':'Rad Sponge','desc':'Gain one extra perk at level 1, base Radiation DR 1, and a pool of Radiation Points that can power radioactive melee strikes.'},
    'stealth_boy_addict':{'name':'Stealth Boy Addict','desc':'STR and END receive +2; maximum STR/END 12, INT/CHA 8, Skill rank 4. Immune to radiation and poison. Repeated Stealth Boy use risks addiction.'},
    'mother_wasteland':{'name':'Mother Wasteland','desc':'Spend Luck for cryptic insight about the current quest or situation; pre-War artifacts are harder to understand.'},
    'nomad':{'name':'Nomad','desc':'Re-roll Survival tests for travel, camp and foraging; social tests in static settlements become more difficult and Science cannot be a Tag Skill.'},
    'rite_of_passage':{'name':'Rite of Passage','desc':'The first Luck spent in a scene can trigger an Effect roll; assisting another PC requires spending AP first.'},
    'tools_of_old_world':{'name':'Tools of the Old World','desc':'Use Survival instead of Repair or Science with pre-War technology; complications involving such technology are more likely.'},
    'chosen_one':{'name':'The Chosen One','desc':'The first d20 bought for tests tied to your tribe’s quest is free, and success at a cost is always available; the GM gains AP when the quest appears.'}},
},
'ru': {
  'origins': {'assaultron':'Штурмотрон','brotherhood_outcast':'Изгнанник Братства','child_of_atom':'Дитя Атома','nightkin':'Найткин','tribal':'Племенной'},
  'originDescriptions': {
    'assaultron':'Боевой робот передовой линии, созданный для выживания в Пустоши. Иммунитет к радиации, яду и болезням, фиксированная грузоподъёмность 150 фунтов и восстановление через ремонт.',
    'brotherhood_outcast':'Бывший член Братства, отвергший курс руководства и использующий военную подготовку и знания довоенных технологий по собственным правилам.',
    'child_of_atom':'Последователь Атома, считающий радиацию священным даром. Происхождение даёт дополнительный перк на 1 уровне и особые возможности с радиацией.',
    'nightkin':'Синевокожий супермутант, изменённый долгим использованием Стелс-Боев. Очень силён и устойчив, но имеет ограничения Интеллекта, Харизмы и навыков.',
    'tribal':'Представитель сплочённого племени Пустоши, чью жизнь определяют традиции, навыки выживания и выбранные культурные трейты.'},
  'traitsInfo': {
    'designed_for_frontline':{'name':'Создан для передовой','desc':'Робот: иммунитет к радиации, яду и болезням; грузоподъёмность 150 фунтов; не получает обычной пользы от еды, питья, отдыха и химии; усилен в безоружном бою.'},
    'chain_that_breaks':{'name':'Разорванная цепь','desc':'Получите дополнительный Tag Skill: Energy Weapons, Science или Repair, а также расширенные возможности при поиске добычи.'},
    'rad_sponge':{'name':'Радиационная губка','desc':'Получите дополнительный перк на 1 уровне, базовое сопротивление радиации 1 и запас Радиационных Очков для усиления атак.'},
    'stealth_boy_addict':{'name':'Зависимость от Стелс-Боя','desc':'STR и END +2; максимум STR/END 12, INT/CHA 8, ранг навыка 4. Иммунитет к радиации и яду. Частое использование Стелс-Боя может вызвать зависимость.'},
    'mother_wasteland':{'name':'Мать-Пустошь','desc':'Трать Удачу, чтобы получать туманные подсказки о квесте или ситуации; довоенные артефакты сложнее понимать.'},
    'nomad':{'name':'Кочевник','desc':'Переброс Survival при путешествиях, лагере и поиске пищи; социальные проверки в постоянных поселениях сложнее, Science нельзя выбрать Tag Skill.'},
    'rite_of_passage':{'name':'Обряд посвящения','desc':'Первая трата Удачи в сцене может дать бросок эффекта; помощь другому персонажу сначала требует AP.'},
    'tools_of_old_world':{'name':'Инструменты Старого Мира','desc':'Можно использовать Survival вместо Repair или Science при работе с довоенной техникой, но осложнения случаются чаще.'},
    'chosen_one':{'name':'Избранный','desc':'Первый покупаемый d20 в проверках, связанных с целью племени, бесплатный; всегда доступен успех ценой последствий.'}},
},
'uk': {
  'origins': {'assaultron':'Штурмотрон','brotherhood_outcast':'Вигнанець Братства','child_of_atom':'Дитя Атома','nightkin':'Найткін','tribal':'Племінний'},
  'originDescriptions': {
    'assaultron':'Бойовий робот передової, створений для виживання у Пустці. Має імунітет до радіації, отрути й хвороб, фіксовану вантажопідйомність 150 фунтів і відновлюється ремонтом.',
    'brotherhood_outcast':'Колишній член Братства, який відкинув курс керівництва й застосовує військовий досвід та знання довоєнних технологій на власний розсуд.',
    'child_of_atom':'Послідовник Атома, що вважає радіацію священним даром. Походження дає додатковий перк на 1 рівні та особливі взаємодії з радіацією.',
    'nightkin':'Синьошкірий супермутант, змінений тривалим використанням Стелс-Боїв. Дуже сильний і витривалий, але має суворіші межі Інтелекту, Харизми та навичок.',
    'tribal':'Член згуртованого племені Пустки, чиє життя визначають традиції, виживання та обрані культурні трейти.'},
  'traitsInfo': {
    'designed_for_frontline':{'name':'Створений для передової','desc':'Робот: імунітет до радіації, отрути та хвороб; вантажопідйомність 150 фунтів; не отримує звичайної користі від їжі, пиття, відпочинку й хімії; посилений у беззбройному бою.'},
    'chain_that_breaks':{'name':'Ланцюг, що розривається','desc':'Отримайте додатковий Tag Skill: Energy Weapons, Science або Repair, а також кращі можливості пошуку здобичі.'},
    'rad_sponge':{'name':'Радіаційна губка','desc':'Отримайте додатковий перк на 1 рівні, базовий Radiation DR 1 і запас Радіаційних Очок для посилення атак.'},
    'stealth_boy_addict':{'name':'Залежність від Стелс-Боя','desc':'STR і END +2; максимум STR/END 12, INT/CHA 8, ранг навички 4. Імунітет до радіації та отрути. Часте використання Стелс-Боя може викликати залежність.'},
    'mother_wasteland':{'name':'Мати-Пустка','desc':'Витрачайте Удачу, щоб отримувати туманні підказки про квест або ситуацію; довоєнні артефакти складніше розуміти.'},
    'nomad':{'name':'Кочівник','desc':'Перекид Survival під час подорожей, табору й пошуку їжі; соціальні перевірки в постійних поселеннях складніші, Science не може бути Tag Skill.'},
    'rite_of_passage':{'name':'Обряд переходу','desc':'Перша витрата Удачі в сцені може дати кидок ефекту; допомога іншому персонажу спочатку потребує AP.'},
    'tools_of_old_world':{'name':'Інструменти Старого Світу','desc':'Можна використовувати Survival замість Repair або Science з довоєнною технікою, але ускладнення трапляються частіше.'},
    'chosen_one':{'name':'Обраний','desc':'Перший придбаний d20 у перевірках, пов’язаних із метою племені, безкоштовний; завжди доступний успіх із ціною.'}},
},
'pl': {
  'origins': {'assaultron':'Assaultron','brotherhood_outcast':'Wyrzutek Bractwa','child_of_atom':'Dziecko Atomu','nightkin':'Nightkin','tribal':'Plemienny'},
  'originDescriptions': {
    'assaultron':'Robot bojowy pierwszej linii stworzony do przetrwania na Pustkowiu. Jest odporny na promieniowanie, trucizny i choroby, ma stały udźwig 150 funtów i odzyskuje sprawność dzięki naprawom.',
    'brotherhood_outcast':'Były członek Bractwa, który odrzucił kierunek dowództwa i wykorzystuje wojskowe szkolenie oraz wiedzę o technologii sprzed wojny na własnych zasadach.',
    'child_of_atom':'Wyznawca Atomu traktujący promieniowanie jako święty dar. Pochodzenie daje dodatkowy perk na 1. poziomie i specjalne zasady promieniowania.',
    'nightkin':'Niebieskoskóry supermutant zmieniony przez długotrwałe używanie Stealth Boyów. Jest bardzo silny i odporny, lecz ma niższe limity Inteligencji, Charyzmy i Umiejętności.',
    'tribal':'Członek zwartej społeczności plemiennej Pustkowia, którego życie kształtują tradycje, przetrwanie i wybrane cechy kulturowe.'},
  'traitsInfo': {
    'designed_for_frontline':{'name':'Zaprojektowany na linię frontu','desc':'Robot: odporność na promieniowanie, trucizny i choroby; stały udźwig 150 funtów; brak normalnych korzyści z jedzenia, picia, odpoczynku i chemów; wzmocniona walka wręcz bez broni.'},
    'chain_that_breaks':{'name':'Łańcuch, który pęka','desc':'Otrzymujesz dodatkową Tag Skill: Energy Weapons, Science albo Repair oraz lepsze możliwości szabrowania.'},
    'rad_sponge':{'name':'Gąbka radiacyjna','desc':'Otrzymujesz dodatkowy perk na 1. poziomie, bazowe Radiation DR 1 i pulę Punktów Promieniowania do wzmacniania ataków.'},
    'stealth_boy_addict':{'name':'Uzależniony od Stealth Boya','desc':'STR i END +2; maks. STR/END 12, INT/CHA 8, ranga Umiejętności 4. Odporność na promieniowanie i trucizny. Częste używanie Stealth Boya grozi uzależnieniem.'},
    'mother_wasteland':{'name':'Matka Pustkowie','desc':'Wydawaj Szczęście, aby uzyskać zagadkową wskazówkę o zadaniu lub scenie; artefakty sprzed wojny są trudniejsze do zrozumienia.'},
    'nomad':{'name':'Nomada','desc':'Przerzut Survival podczas podróży, obozowania i zdobywania żywności; testy społeczne w stałych osadach są trudniejsze, a Science nie może być Tag Skill.'},
    'rite_of_passage':{'name':'Rytuał przejścia','desc':'Pierwszy wydany punkt Szczęścia w scenie może uruchomić rzut efektu; pomoc innemu bohaterowi wymaga najpierw AP.'},
    'tools_of_old_world':{'name':'Narzędzia Starego Świata','desc':'Możesz używać Survival zamiast Repair lub Science przy technologii sprzed wojny, ale komplikacje są częstsze.'},
    'chosen_one':{'name':'Wybraniec','desc':'Pierwsze kupione k20 w testach związanych z celem plemienia jest darmowe; sukces za cenę jest zawsze dostępny.'}},
}}

pack_names = {
  'assaultron_military':'U.S. Military Model','assaultron_devil':'Assaultron Devil','assaultron_caravan':'Robotic Caravan Guard',
  'outcast_ex_knight':'Ex-Knight','outcast_ex_scribe':'Ex-Scribe','atom_missionary':'Missionary','atom_zealot':'Zealot',
  'nightkin_pack':'Nightkin','tribal_modernist':'Modernist','tribal_ritualist':'Ritualist','tribal_naturalist':'Naturalist'
}
pack_items = {
  'assaultron_military':'Laser gun attachment; actuated frame choice; standard plating; Fusion Cells; Recon Sensors; 15 caps.',
  'assaultron_devil':'Skull mask; serrated plate choice; two construction claws; Hazard Detection; Fusion Cells; Robot Repair Kit.',
  'assaultron_caravan':'Laser attachment; factory storage armor and legs; Fusion Cells; caravan wares; Behavioral Analysis Module; caps.',
  'outcast_ex_knight':'Laser Rifle, Fusion Cells, tattered Brotherhood fatigues, water canteen, two Outcast-table rolls, 10 caps.',
  'outcast_ex_scribe':'Laser Pistol, Fusion Cells, tattered Scribe armor, Multi-Tool, three Outcast-table rolls, 15 caps.',
  'atom_missionary':'Tough Clothing, walking cane, Gamma Gun and rounds, Stimpak, 10 caps, one random food.',
  'atom_zealot':'Tough Clothing or Drifter Outfit, Machete, Gamma Gun and rounds, gas mask, two random foods.',
  'nightkin_pack':'Laser Rifle and cells, Bumper Sword, Raider armor pieces, Stealth Boy, random food and beverage.',
  'tribal_modernist':'Modern firearm package, Underarmor Suit, combat armor choice, Multi-Tool, food, beverage and junk.',
  'tribal_ritualist':'Traditional firearm choice and ammo, Sturdy Clothing, Leather Chest, trinket, two oddities.',
  'tribal_naturalist':'Bow and arrows, Machete, Combat Knife, hunter clothing, wood armor, food and beverages.'
}
pack_names_lang = {
'ru': {'U.S. Military Model':'Военная модель США','Assaultron Devil':'Штурмотрон Дьяволов','Robotic Caravan Guard':'Робот-охранник каравана','Ex-Knight':'Экс-рыцарь','Ex-Scribe':'Экс-писец','Missionary':'Миссионер','Zealot':'Фанатик','Nightkin':'Найткин','Modernist':'Модернист','Ritualist':'Ритуалист','Naturalist':'Натуралист'},
'uk': {'U.S. Military Model':'Військова модель США','Assaultron Devil':'Штурмотрон Дияволів','Robotic Caravan Guard':'Робот-охоронець каравану','Ex-Knight':'Екс-лицар','Ex-Scribe':'Екс-писар','Missionary':'Місіонер','Zealot':'Фанатик','Nightkin':'Найткін','Modernist':'Модерніст','Ritualist':'Ритуаліст','Naturalist':'Натураліст'},
'pl': {'U.S. Military Model':'Model wojskowy USA','Assaultron Devil':'Assaultron Diabłów','Robotic Caravan Guard':'Robotyczny strażnik karawany','Ex-Knight':'Były Rycerz','Ex-Scribe':'Były Skryba','Missionary':'Misjonarz','Zealot':'Zelota','Nightkin':'Nightkin','Modernist':'Modernista','Ritualist':'Rytualista','Naturalist':'Naturalista'}}

for lang in ['en','ru','uk','pl']:
    path = ROOT / f'src/locales/{lang}/common.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    tr = translations[lang]
    data.setdefault('origins', {}).update(tr['origins'])
    data.setdefault('originDescriptions', {}).update(tr['originDescriptions'])
    data.setdefault('traitsInfo', {}).update(tr['traitsInfo'])
    packs = data.setdefault('equipmentPacks', {})
    for key, en_name in pack_names.items():
        name = pack_names_lang.get(lang, {}).get(en_name, en_name)
        items_text = pack_items[key]
        if lang == 'ru': items_text = 'Стартовый набор: ' + items_text
        elif lang == 'uk': items_text = 'Стартовий набір: ' + items_text
        elif lang == 'pl': items_text = 'Zestaw startowy: ' + items_text
        packs[key] = {'name': name, 'items': items_text}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('Wanderer origins/ammo patch applied')
