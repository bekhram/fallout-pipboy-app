const slug = (value) => String(value || "")
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const LEGENDARY_WEAPON_CATEGORIES = [
  "Small Guns",
  "Energy Weapons",
  "Big Guns",
  "Melee Weapons",
  "Unarmed",
];

const W = {
  small: "Small Guns",
  energy: "Energy Weapons",
  big: "Big Guns",
  melee: "Melee Weapons",
  unarmed: "Unarmed",
};

const weapon = (name, categories, description, table = null) => ({
  id: slug(name),
  name,
  categories,
  description,
  table,
});

export const LEGENDARY_WEAPON_PROPERTIES = [
  weapon("Assassin's", Object.values(W), "Against human targets the weapon gains Vicious; if it already has Vicious, Effects deal +2 damage instead of +1.", 1),
  weapon("Berserker's", [W.melee, W.unarmed], "Melee damage increases as the wielder's torso Physical DR falls below 6.", 1),
  weapon("Blazing", [W.melee], "After Defend, a missed enemy melee attack causes Persistent Energy damage to the attacker.", 1),
  weapon("Bloodied", [W.melee, W.unarmed], "Damage increases as the wielder loses HP, scaling at the 3/4, 1/2 and 1/4 HP thresholds.", 1),
  weapon("Cavalier's", [W.melee, W.unarmed], "Defend or Sprint grants temporary Physical DR until the wielder's next turn.", 1),
  weapon("Charged", [W.melee], "After Defend, a missed enemy melee attack causes Stun Energy damage to the attacker.", 1),
  weapon("Crippling", Object.values(W), "Arm or leg attacks cause an injury when enough damage gets through resistance.", 1),
  weapon("Deadeye", [W.small, W.energy, W.big], "After taking Aim, additional actions cost 1 AP less for the rest of the turn; this reduction does not stack.", 1),
  weapon("Defiant", [W.small, W.energy, W.big], "Once per scene, spending maximum Fire Rate ammo can make the weapon Empty to gain bonus damage; it must then be reloaded.", 1),
  weapon("Duelist's", [W.melee, W.unarmed], "After Defend, a missed melee attacker can be disarmed on an Effect.", 1),
  weapon("Enraging", Object.values(W), "After damaging a target, 1 Luck may be spent to make it attack the nearest enemy it can see for the rest of the scene.", 1),
  weapon("Explosive", [W.small], "Damage Effects also strike a nearby secondary target for reduced damage; it does not stack with Arc or Burst.", 1),
  weapon("Exterminator's", Object.values(W), "Against insects, arachnids and mirelurks the weapon gains improved Vicious damage.", 1),
  weapon("Freezing", Object.values(W), "A Luck point may be spent when attacking to add the Freeze damage effect.", 1),
  weapon("Frigid", [W.melee], "After Defend, a missed enemy melee attack causes Freeze Energy damage to the attacker.", 1),
  weapon("Furious", [W.melee, W.unarmed], "Damage increases cumulatively against a target already hit by this weapon during the scene.", 1),
  weapon("Ghoul Slayer's", Object.values(W), "Against ghouls the weapon gains improved Vicious damage.", 1),
  weapon("Hitman's", [W.small, W.energy, W.big], "Taking Aim grants bonus damage and stacks with Accurate.", 1),
  weapon("Hunter's", Object.values(W), "Against mammals and lizards the weapon gains improved Vicious damage.", 1),
  weapon("Incendiary", [W.small], "The weapon gains Persistent (Energy).", 1),
  weapon("Instigating", Object.values(W), "Attacks against a target at maximum HP gain +3 damage dice.", 1),
  weapon("Irradiated", Object.values(W), "The weapon gains the Radioactive damage effect.", 1),
  weapon("Junkie's", Object.values(W), "The weapon gains +1 damage die for each addiction affecting the wielder.", 1),
  weapon("Kneecapper", Object.values(W), "Leg attacks become critical hits when enough damage gets through resistance.", 1),
  weapon("Lucky", Object.values(W), "After spending Luck to re-roll attack or damage dice, an Effect on a bonus damage die can refund one spent Luck.", 1),
  weapon("Mighty", [W.melee, W.unarmed], "Attacks inflict +2 damage dice.", 2),
  weapon("Mutant Slayer's", Object.values(W), "Against super mutants the weapon gains improved Vicious damage.", 2),
  weapon("Nimble", [W.small, W.energy, W.big], "Taking Aim also allows a free Move minor action.", 2),
  weapon("Nocturnal", Object.values(W), "Between sunset and sunrise the weapon gains improved Vicious damage.", 2),
  weapon("Penetrating", Object.values(W), "The weapon gains Piercing 2, or increases an existing Piercing rating by 2.", 2),
  weapon("Plasma Infused", [W.small], "Adds +2 damage dice and deals both Physical and Energy damage, using the lower target resistance.", 2),
  weapon("Poisoner's", Object.values(W), "The weapon gains Persistent (Poison).", 2),
  weapon("Powerful", [W.small, W.energy, W.big], "Attacks inflict +2 damage dice.", 2),
  weapon("Quickdraw", Object.values(W), "Drawing this weapon does not consume the turn's minor-action allowance and costs no AP.", 2),
  weapon("Rapid", [W.small, W.energy, W.big], "The weapon gains +3 Fire Rate, even beyond the normal cap.", 2),
  weapon("Relentless", Object.values(W), "On a critical hit, 1 Luck may be spent to recover AP spent on that attack.", 2),
  weapon("Sentinel's", [W.melee, W.unarmed], "If the wielder did not move on the previous turn, the weapon grants Physical and Energy DR; Parry improves the bonus.", 2),
  weapon("Staggering", Object.values(W), "The weapon gains the Stun damage effect.", 2),
  weapon("Stalker's", [W.small, W.energy, W.big], "On a carefully prepared sneak attack, one d20 may be treated as already having rolled a 1.", 2),
  weapon("Steadfast", [W.small, W.energy, W.big], "Taking Aim grants temporary Physical DR until the next turn.", 2),
  weapon("Troubleshooter's", Object.values(W), "Against robots the weapon gains improved Vicious damage.", 2),
  weapon("Two-Shot", [W.small, W.energy, W.big], "The weapon gains Vicious, +2 damage dice and Ammo-Hungry (2).", 2),
  weapon("Violent", [W.small], "The weapon gains +2 damage dice and can cause injuries on high-damage hits, but gains or worsens Recoil.", 2),
  weapon("Wounding", Object.values(W), "The weapon gains Persistent (Physical).", 2),
];

const armor = (name, locations, description = "") => ({
  id: slug(name),
  name,
  locations,
  description,
});

export const LEGENDARY_ARMOR_PROPERTIES = [
  armor("Acrobat's", ["Leg"], "Halves falling damage after resistance; two Acrobat's pieces prevent falling damage."),
  armor("Assassin's", ["Head", "Arm", "Torso", "Leg"], "Grants +2 Physical and Energy DR against human enemies."),
  armor("Auto Stim", ["Torso"], "Once per scene, dropping below one quarter HP automatically uses a carried Stimpak-type item."),
  armor("Bolstering", ["Torso"], "At low HP grants extra Physical and Energy DR to all hit locations, increasing further below one quarter HP."),
  armor("Cavalier's", ["Arm"], "Defend or Sprint grants +2 Physical DR to all locations until the start of the wearer's next turn."),
  armor("Chameleon", ["Torso"], "While hidden and stationary, enemies attempting to find the wearer increase the difficulty by 1."),
  armor("Champion", ["Arm"], "Once per scene, one die on a STR or END test may be set to count as a 1 before rolling."),
  armor("Cloaking", ["Head", "Arm", "Torso", "Leg"], "Once per scene, being hit by a melee attack can turn the wearer invisible as a Stealth Boy would."),
  armor("Cryogenic", ["Head", "Arm", "Torso", "Leg"], "Enemy melee attacks widen their complication range by 1; a complication causes Freeze Energy damage equal to the attack's damage dice."),
  armor("Cunning", ["Head", "Leg"], "Once per scene, one die on an AGI or PER test may be set to count as a 1 before rolling."),
  armor("Duelist's", ["Arm"], "Enemy melee attacks widen their complication range by 1; a complication knocks the attacker's weapon away within Close range."),
  armor("Exterminator's", ["Head", "Arm", "Torso", "Leg"], "Grants +2 Physical and Energy DR against insects, arachnids and mirelurks."),
  armor("Ghoul Slayer's", ["Head", "Arm", "Torso", "Leg"], "Grants +2 Physical, Energy and Radiation DR against ghouls."),
  armor("Hunter's", ["Head", "Arm", "Torso", "Leg"], "Grants +2 Physical and Energy DR against mammals and lizards."),
  armor("Incendiary", ["Head", "Arm", "Torso", "Leg"], "Enemy melee attacks widen their complication range by 1; a complication causes Persistent Energy damage equal to the attack's damage dice."),
  armor("Lucky", ["Head", "Arm", "Torso", "Leg"], "Once per day, a Luck re-roll may instead turn a d20 into a 1 or a damage die into an Effect."),
  armor("Martyr's", ["Head", "Arm", "Torso", "Leg"], "Below one quarter HP, additional combat actions cost 1 AP less; this does not stack."),
  armor("Mutant Slayer's", ["Head", "Arm", "Torso", "Leg"], "Grants +2 Physical and Energy DR against super mutants."),
  armor("Poisoner's", ["Head", "Arm", "Torso", "Leg"], "Grants +4 Poison damage resistance."),
  armor("Powered", ["Head", "Arm", "Leg"], "At the start of each of the wearer's turns in combat, add 1 AP to the group pool."),
  armor("Punishing", ["Torso", "Leg"], "When a melee attack hits the wearer, each Effect on that attack's damage roll inflicts 1 damage of the same type back to the attacker, before damage resistance."),
  armor("Rad Powered", ["Head", "Arm", "Torso", "Leg"], "Once per scene while carrying Radiation damage, one die on a STR test may be set to count as a 1 before rolling; gain one additional use per scene for every 5 Radiation damage suffered."),
  armor("Safecracker's", ["Arm"], "Once per scene, one die on a Lockpick test may be set to count as a 1 before rolling."),
  armor("Sentinel's", ["Arm"], "Grants +3 Physical and Energy DR while the wearer did not move on their previous turn."),
  armor("Sharp", ["Head", "Arm", "Torso", "Leg"], "Once per scene, one die on an INT or CHA test may be set to count as a 1 before rolling."),
  armor("Sprinter's", ["Head", "Leg"], "When spending AP to cross difficult terrain or obstacles, reduce the AP cost by 1, to a minimum of 0."),
  armor("Troubleshooter's", ["Head", "Arm", "Torso", "Leg"], "Grants +2 Physical and Energy DR against robot enemies."),
  armor("Unyielding", ["Torso"], "While current HP is below one quarter of maximum HP, the wearer may re-roll 1d20 on any test."),
];

export function normalizeLegendaryWeaponCategory(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("small")) return W.small;
  if (text.includes("energy")) return W.energy;
  if (text.includes("big")) return W.big;
  if (text.includes("melee")) return W.melee;
  if (text.includes("unarmed")) return W.unarmed;
  return "";
}

export function canWeaponBeLegendary(weapon) {
  const category = normalizeLegendaryWeaponCategory(weapon?.skill || weapon?.weaponType || weapon?.["Weapon type"]);
  return LEGENDARY_WEAPON_CATEGORIES.includes(category);
}

export function getLegendaryWeaponProperties(weapon) {
  const category = normalizeLegendaryWeaponCategory(weapon?.skill || weapon?.weaponType || weapon?.["Weapon type"]);
  if (!category) return [];
  return LEGENDARY_WEAPON_PROPERTIES.filter((property) => property.categories.includes(category));
}

export function normalizeArmorLocation(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("head")) return "Head";
  if (text.includes("arm")) return "Arm";
  if (text.includes("torso") || text.includes("chest")) return "Torso";
  if (text.includes("leg")) return "Leg";
  return "";
}

export function getLegendaryArmorProperties(location) {
  const normalized = normalizeArmorLocation(location);
  return LEGENDARY_ARMOR_PROPERTIES.filter((property) => property.locations.includes(normalized));
}

export function getLegendaryPropertyById(kind, id) {
  const list = kind === "armor" ? LEGENDARY_ARMOR_PROPERTIES : LEGENDARY_WEAPON_PROPERTIES;
  return list.find((property) => property.id === id) || null;
}

export function getLegendaryArmorPropertiesForLocations(value) {
  const source = String(value || "").toLowerCase();
  let locations = [];
  if (source.includes("all")) locations = ["Head", "Arm", "Torso", "Leg"];
  else {
    if (source.includes("head")) locations.push("Head");
    if (source.includes("arm")) locations.push("Arm");
    if (source.includes("torso") || source.includes("chest")) locations.push("Torso");
    if (source.includes("leg")) locations.push("Leg");
  }
  const seen = new Set();
  return locations.flatMap((location) => getLegendaryArmorProperties(location)).filter((property) => !seen.has(property.id) && seen.add(property.id));
}
