export const POWER_ARMOR_FRAME = {
  name: "Armor Frame",
  physical: 0,
  energy: 0,
  radiation: 0,
  hp: 0,
  weight: 150,
  cost: 4500,
  rarity: 4,
};

export const POWER_ARMOR_SETS = [
  {
    id: "raider",
    name: "Raider Power Armor",
    rarity: 2,
    parts: {
      head: { physical: 6, energy: 4, radiation: 7, hp: 7, weight: 14, cost: 50 },
      torso: { physical: 8, energy: 6, radiation: 9, hp: 10, weight: 22, cost: 100 },
      arm: { physical: 4, energy: 3, radiation: 7, hp: 7, weight: 16, cost: 75 },
      leg: { physical: 4, energy: 3, radiation: 7, hp: 7, weight: 17, cost: 75 },
    },
  },
  {
    id: "t45",
    name: "T-45 Power Armor",
    rarity: 2,
    parts: {
      head: { physical: 6, energy: 4, radiation: 7, hp: 7, weight: 12, cost: 60 },
      torso: { physical: 8, energy: 7, radiation: 9, hp: 14, weight: 20, cost: 140 },
      arm: { physical: 4, energy: 3, radiation: 7, hp: 7, weight: 15, cost: 100 },
      leg: { physical: 4, energy: 3, radiation: 7, hp: 7, weight: 15, cost: 100 },
    },
  },
  {
    id: "t51",
    name: "T-51 Power Armor",
    rarity: 3,
    parts: {
      head: { physical: 6, energy: 5, radiation: 7, hp: 9, weight: 12, cost: 80 },
      torso: { physical: 8, energy: 7, radiation: 9, hp: 18, weight: 20, cost: 180 },
      arm: { physical: 5, energy: 4, radiation: 7, hp: 9, weight: 15, cost: 130 },
      leg: { physical: 5, energy: 4, radiation: 7, hp: 9, weight: 15, cost: 130 },
    },
  },
  {
    id: "t60",
    name: "T-60 Power Armor",
    rarity: 4,
    parts: {
      head: { physical: 7, energy: 6, radiation: 7, hp: 10, weight: 12, cost: 650 },
      torso: { physical: 9, energy: 8, radiation: 9, hp: 21, weight: 20, cost: 750 },
      arm: { physical: 6, energy: 5, radiation: 7, hp: 10, weight: 15, cost: 700 },
      leg: { physical: 6, energy: 5, radiation: 7, hp: 10, weight: 15, cost: 700 },
    },
  },
  {
    id: "x01",
    name: "X-01 Power Armor",
    rarity: 5,
    parts: {
      head: { physical: 8, energy: 7, radiation: 7, hp: 12, weight: 12, cost: 60 },
      torso: { physical: 10, energy: 8, radiation: 9, hp: 24, weight: 20, cost: 140 },
      arm: { physical: 7, energy: 6, radiation: 7, hp: 12, weight: 15, cost: 100 },
      leg: { physical: 7, energy: 6, radiation: 7, hp: 12, weight: 15, cost: 100 },
    },
  },
];

export const POWER_ARMOR_PLATING = [
  { id: "none", name: "None" },
  { id: "titanium", name: "Titanium Plating", hp: 1, torsoHp: 2, weight: 1, cost: 10, requirement: "Armorer 3" },
  { id: "lead", name: "Lead Plating", radiation: 2, weight: 2, cost: 10, requirement: "Armorer 1" },
  { id: "photovoltaic", name: "Photovoltaic Plating", weight: 1, cost: 10, requirement: "Science! 3", effect: "+1 AP at the start of a scene in direct sunlight (once)." },
  { id: "winterized", name: "Winterized Coating", energy: 1, weight: 1, cost: 10, requirement: "Armorer 1", excludedSets: ["x01"] },
  { id: "prism", name: "Prism Shielding", energy: 3, weight: 2, cost: 10, requirement: "Science! 2" },
  { id: "explosive", name: "Explosive Shielding", weight: 1, cost: 10, requirement: "Science! 1", effect: "+2 all DR against Blast weapons." },
  { id: "emp", name: "EMP Shielding", energy: 2, weight: 1, cost: 20, requirement: "Armorer 1", onlySets: ["x01"] },
];

export const POWER_ARMOR_SYSTEMS = [
  { id: "none", name: "None", locations: ["head", "torso", "arm", "leg"] },
  { id: "rad-scrubber", name: "Rad Scrubber", locations: ["head"], weight: 1, cost: 100, requirement: "Science! 2", effect: "Ignore radiation from irradiated food or drink while powered." },
  { id: "sensor-array", name: "Sensor Array", locations: ["head"], weight: 1, cost: 100, requirement: "Science! 3", effect: "Re-roll 1d20 on PER tests while powered." },
  { id: "targeting-hud", name: "Targeting HUD", locations: ["head"], weight: 1, cost: 100, requirement: "Science! 3", effect: "After Aim, take a second minor action for 0 AP while powered." },
  { id: "internal-database", name: "Internal Database", locations: ["head"], weight: 1, cost: 100, requirement: "Science! 2", effect: "Re-roll 1d20 on INT tests while powered." },
  { id: "welded-rebar", name: "Welded Rebar", locations: ["torso"], weight: 2, cost: 25, requirement: "Armorer 1", onlySets: ["raider"], effect: "Complications on enemy melee or unarmed attacks inflict 2 CD damage." },
  { id: "core-assembly", name: "Core Assembly", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 3", effect: "If the group AP pool is empty at the start of your turn, add 1 AP." },
  { id: "blood-cleanser", name: "Blood Cleanser", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 1", effect: "Re-roll addiction rolls for addictive chems while powered." },
  { id: "emergency-protocols", name: "Emergency Protocols", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 4", effect: "Below one quarter HP: +1 Defense and +3 all DR while powered." },
  { id: "motion-assist", name: "Motion-Assist Servos", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 3", effect: "Armor Frame STR becomes 13 while powered." },
  { id: "kinetic-dynamo", name: "Kinetic Dynamo", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 4", effect: "After suffering damage, add 1 AP to the group pool." },
  { id: "medic-pump", name: "Medic Pump", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 4", effect: "Automatically use a Stimpak when HP falls below half maximum." },
  { id: "reactive-plates", name: "Reactive Plates", locations: ["torso"], weight: 2, cost: 100, requirement: "Armorer 4", effect: "Melee attackers suffer Physical damage equal to half their rolled damage." },
  { id: "tesla-coils", name: "Tesla Coils", locations: ["torso"], weight: 2, cost: 100, requirement: "Science! 3", effect: "Enemies making melee attacks suffer 4 CD Energy damage." },
  { id: "stealth-boy", name: "Stealth Boy", locations: ["torso"], weight: 1, cost: 100, requirement: "Science! 4", effect: "Activate a Stealth Boy once per scene by spending 1 charge." },
  { id: "jetpack", name: "Jetpack", locations: ["torso"], weight: 1, cost: 500, requirement: "Armorer 4, Science! 4", effect: "Spend 1 charge to move one additional zone or perform an impact landing." },
  { id: "rusty-knuckles", name: "Rusty Knuckles", locations: ["arm"], weight: 1, cost: 50, requirement: "Blacksmith 1", effect: "Unarmed attacks gain Persistent." },
  { id: "hydraulic-bracers", name: "Hydraulic Bracers", locations: ["arm"], weight: 1, cost: 100, requirement: "Blacksmith 3", effect: "Unarmed attacks inflict +2 CD damage while powered." },
  { id: "optimized-bracers", name: "Optimized Bracers", locations: ["arm"], weight: 1, cost: 100, requirement: "Blacksmith 1", effect: "Spend up to 4 AP on bonus melee damage while powered." },
  { id: "tesla-bracers", name: "Tesla Bracers", locations: ["arm"], weight: 1, cost: 150, requirement: "Blacksmith 3, Science! 1", effect: "Unarmed attacks inflict +2 CD Energy damage while powered." },
  { id: "calibrated-shocks", name: "Calibrated Shocks", locations: ["leg"], weight: 1, cost: 100, requirement: "Science! 2", effect: "Carry weight increases by 50." },
  { id: "explosive-vent", name: "Explosive Vent", locations: ["leg"], weight: 1, cost: 100, requirement: "Science! 3", effect: "Impact landings damage creatures and objects within Close range." },
  { id: "overdrive-servos", name: "Overdrive Servos", locations: ["leg"], weight: 1, cost: 100, requirement: "Science! 3", effect: "While sprinting, spend 2 AP to move one additional zone." },
];

export const POWER_PARTS = [
  { id: "head", label: "Head", count: 1 },
  { id: "torso", label: "Torso", count: 1 },
  { id: "arm", label: "Arms", count: 2 },
  { id: "leg", label: "Legs", count: 2 },
];

export function availablePowerMods(mods, setId, location) {
  return mods.filter((mod) => {
    if (mod.locations && !mod.locations.includes(location)) return false;
    if (mod.onlySets && !mod.onlySets.includes(setId)) return false;
    if (mod.excludedSets?.includes(setId)) return false;
    return true;
  });
}

export function calculatePowerPart(part, plating = {}, system = {}, location) {
  return {
    physical: Number(part.physical || 0) + Number(plating.physical || 0),
    energy: Number(part.energy || 0) + Number(plating.energy || 0),
    radiation: Number(part.radiation || 0) + Number(plating.radiation || 0),
    hp: Number(part.hp || 0) + Number(location === "torso" ? plating.torsoHp || plating.hp || 0 : plating.hp || 0),
    weight: Number(part.weight || 0) + Number(plating.weight || 0) * (location === "torso" ? 2 : 1) + Number(system.weight || 0),
    cost: Number(part.cost || 0) + Number(plating.cost || 0) * (location === "torso" ? 2 : 1) + Number(system.cost || 0),
  };
}


export function calculatePowerArmorLocations(loadout) {
  if (!loadout?.setId && !loadout?.slots) return null;

  const slotDefinitions = [
    { part: "Head", type: "head" },
    { part: "Torso", type: "torso" },
    { part: "Left Arm", type: "arm" },
    { part: "Right Arm", type: "arm" },
    { part: "Left Leg", type: "leg" },
    { part: "Right Leg", type: "leg" },
  ];
  const legacySet = POWER_ARMOR_SETS.find((set) => set.id === loadout.setId);
  const slots = loadout.slots || {};
  const hasPiece =
    Object.values(slots).some((slot) => slot?.setId) || Boolean(legacySet);

  if (loadout.setId === "none" && !hasPiece) return null;

  const empty = () => ({
    physical: 0,
    energy: 0,
    radiation: 0,
    poison: 0,
    hp: 0,
  });

  if (!hasPiece) {
    return Object.fromEntries(
      slotDefinitions.map(({ part }) => [part, empty()])
    );
  }

  return Object.fromEntries(
    slotDefinitions.map(({ part, type }) => {
      const selected = slots[part] || {};
      const selectedSet =
        POWER_ARMOR_SETS.find((set) => set.id === selected.setId) || legacySet;
      if (!selectedSet) return [part, empty()];

      const legacyMods = loadout.mods?.[type] || {};
      const platingId = selected.platingId || legacyMods.platingId || "none";
      const systemId = selected.systemId || legacyMods.systemId || "none";
      const platingOptions =
        selectedSet.id === "raider"
          ? POWER_ARMOR_PLATING.filter((mod) => mod.id === "none")
          : availablePowerMods(POWER_ARMOR_PLATING, selectedSet.id, type);
      const systemOptions = availablePowerMods(
        POWER_ARMOR_SYSTEMS,
        selectedSet.id,
        type
      );
      const plating =
        platingOptions.find((mod) => mod.id === platingId) || platingOptions[0];
      const system =
        systemOptions.find((mod) => mod.id === systemId) || systemOptions[0];
      const stats = calculatePowerPart(
        selectedSet.parts[type],
        plating,
        system,
        type
      );

      return [
        part,
        {
          physical: stats.physical,
          energy: stats.energy,
          radiation: stats.radiation,
          poison: 0,
          hp: stats.hp,
        },
      ];
    })
  );
}
