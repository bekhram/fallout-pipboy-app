import {
  POWER_ARMOR_FRAME,
  POWER_ARMOR_PLATING,
  POWER_ARMOR_SETS,
  POWER_ARMOR_SYSTEMS,
  availablePowerMods,
  availablePowerUpgrades,
  calculatePowerPart,
} from "../data/powerArmor.js";

const SLOT_DEFS = [
  { id: "Head", type: "head", label: "Helmet" },
  { id: "Torso", type: "torso", label: "Chest Piece" },
  { id: "Left Arm", type: "arm", label: "Left Arm" },
  { id: "Right Arm", type: "arm", label: "Right Arm" },
  { id: "Left Leg", type: "leg", label: "Left Leg" },
  { id: "Right Leg", type: "leg", label: "Right Leg" },
];

function byId(list, id) {
  return list.find((entry) => entry.id === id);
}

function normalizeSlots(loadout = {}) {
  if (loadout.slots && Object.keys(loadout.slots).length) return loadout.slots;

  const setId = POWER_ARMOR_SETS.some((set) => set.id === loadout.setId)
    ? loadout.setId
    : "";

  if (!setId) return {};

  return Object.fromEntries(
    SLOT_DEFS.map((slot) => [
      slot.id,
      {
        setId,
        upgradeId: "none",
        platingId: loadout.mods?.[slot.type]?.platingId || "none",
        systemId: loadout.mods?.[slot.type]?.systemId || "none",
      },
    ])
  );
}

function hasPowerArmorFrame(loadout = {}, slots = {}) {
  const hasPieces = Object.values(slots).some((slot) => Boolean(slot?.setId));
  if (hasPieces) return true;

  const setId = String(loadout.setId || "").trim();
  return Boolean(setId && setId !== "none");
}

function makeInventoryItem({
  sourceId,
  name,
  weight,
  cost,
  rarity,
  effect = "",
  physical = "",
  energy = "",
  radiation = "",
  locations = "",
}) {
  return {
    name,
    quantity: "1",
    cost: String(cost ?? ""),
    weight: String(weight ?? ""),
    category: "armor",
    sourceType: "power_armor",
    sourceId,
    rarity: String(rarity ?? ""),
    effect,
    armorPhysical: physical === "" ? "" : String(physical),
    armorEnergy: energy === "" ? "" : String(energy),
    armorRadiation: radiation === "" ? "" : String(radiation),
    armorLocations: locations,
    armorGroup: "POWER ARMOR",
    equipped: true,
  };
}

export function buildPowerArmorInventoryItems(loadout = {}) {
  const slots = normalizeSlots(loadout);
  const result = [];

  if (hasPowerArmorFrame(loadout, slots)) {
    result.push(
      makeInventoryItem({
        sourceId: "power-armor:frame",
        name: POWER_ARMOR_FRAME.name,
        weight: POWER_ARMOR_FRAME.weight,
        cost: POWER_ARMOR_FRAME.cost,
        rarity: POWER_ARMOR_FRAME.rarity,
        effect: "Equipped power armor frame",
        locations: "All",
      })
    );
  }

  SLOT_DEFS.forEach((definition) => {
    const selected = slots[definition.id] || {};
    const set = byId(POWER_ARMOR_SETS, selected.setId);
    if (!set) return;

    const upgradeOptions = availablePowerUpgrades(set.id, definition.type);
    const selectedUpgrade = byId(upgradeOptions, selected.upgradeId) || {};

    const platingOptions = set.id === "raider"
      ? POWER_ARMOR_PLATING.filter((mod) => mod.id === "none")
      : availablePowerMods(POWER_ARMOR_PLATING, set.id, definition.type);
    const systemOptions = availablePowerMods(
      POWER_ARMOR_SYSTEMS,
      set.id,
      definition.type
    );

    const plating = byId(platingOptions, selected.platingId) || platingOptions[0] || {};
    const system = byId(systemOptions, selected.systemId) || systemOptions[0] || {};
    const stats = calculatePowerPart(
      set.parts[definition.type],
      plating,
      system,
      definition.type,
      selectedUpgrade
    );

    result.push(
      makeInventoryItem({
        sourceId: `power-armor:${definition.id}`,
        name: `${set.name} — ${definition.label}`,
        weight: stats.weight,
        cost: stats.cost,
        rarity: set.rarity,
        effect: [plating.effect, system.effect].filter(Boolean).join(" "),
        physical: stats.physical,
        energy: stats.energy,
        radiation: stats.radiation,
        locations: definition.id,
      })
    );
  });

  return result;
}

export function getPowerArmorInventoryWeight(loadout = {}) {
  return buildPowerArmorInventoryItems(loadout).reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.weight || 0),
    0
  );
}
