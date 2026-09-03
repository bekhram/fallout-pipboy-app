const TRUE = "TRUE";

function parseNumber(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function parseCsvRecords(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function locationsFrom(row) {
  return {
    head: row[4] === TRUE,
    arms: row[5] === TRUE,
    legs: row[6] === TRUE,
    torso: row[7] === TRUE,
  };
}

function familyFromHeading(heading) {
  const value = heading.toLowerCase();
  if (value.includes("raider")) return "raider";
  if (value.includes("leather")) return "leather";
  if (value.includes("metal")) return "metal";
  if (value.includes("combat")) return "combat";
  if (value.includes("synth")) return "synth";
  if (value.includes("vault jumpsuit")) return "vault-jumpsuit";
  if (value.includes("ballistic")) return "ballistic";
  if (value.includes("robot")) return "robot";
  if (value.includes("upgrade")) return "upgrade";
  return "";
}

export function getArmorFamily(name = "") {
  const value = name.toLowerCase();
  if (value.includes("raider")) return "raider";
  if (value.includes("leather")) return "leather";
  if (value.includes("metal")) return "metal";
  if (value.includes("combat")) return "combat";
  if (value.includes("synth")) return "synth";
  if (value.includes("vault jumpsuit")) return "vault-jumpsuit";
  if (value.includes("robot") || value.includes("plating") || value.includes("frame")) return "robot";
  return "clothing";
}

export function parseArmorDatabase(csvText) {
  const rows = parseCsvRecords(csvText);
  const items = [];
  const mods = [];
  let majorSection = "";
  let heading = "";
  let isModSection = false;

  rows.slice(2).forEach((row, index) => {
    const item = String(row[0] || "").trim();
    if (!item) return;

    const hasStats = row.slice(1, 11).some((value) => String(value || "").trim());
    const isHeading = !hasStats;

    if (isHeading) {
      heading = item;
      if (["MATERIAL MODS", "ARMOUR UPGRADE MODS", "CLOTHING AND OUTFIT MODS", "ROBOT MODS"].includes(item)) {
        majorSection = item;
        isModSection = true;
      } else if (!isModSection && item === item.toUpperCase()) {
        majorSection = item;
      }
      return;
    }

    const entry = {
      id: `${slug(item)}-${index + 3}`,
      name: item,
      physical: parseNumber(row[1]),
      energy: parseNumber(row[2]),
      radiation: parseNumber(row[3]),
      locations: locationsFrom(row),
      weight: parseNumber(row[8]),
      cost: parseNumber(row[9]),
      rarity: String(row[10] || "").trim(),
      effects: String(row[11] || "").trim(),
      category: majorSection,
      group: heading,
      family: isModSection ? familyFromHeading(heading || majorSection) : getArmorFamily(item),
    };

    (isModSection ? mods : items).push(entry);
  });

  return { items, mods };
}

export const PART_LOCATION = {
  Head: "head",
  "Left Arm": "arms",
  "Right Arm": "arms",
  Torso: "torso",
  "Left Leg": "legs",
  "Right Leg": "legs",
};

export function compatibleArmorItems(items, part) {
  const location = PART_LOCATION[part];
  return items.filter((item) => item.locations[location] && item.family !== "robot");
}

const UPGRADE_ARMOR_FAMILIES = new Set([
  "raider",
  "leather",
  "metal",
  "combat",
  "synth",
]);

const BALLISTIC_WEAVE_ITEMS = new Set([
  "casual clothing",
  "formal clothing",
  "formal hat",
  "heavy coat",
  "lab coat",
  "military fatigues",
]);

export function compatibleArmorMods(mods, item, part) {
  if (!item) return { materials: [], upgrades: [] };
  const location = PART_LOCATION[part];
  const materials = mods.filter((mod) => {
    if (!mod.locations[location]) return false;
    if (mod.family === item.family) return true;
    if (mod.family === "ballistic") {
      return BALLISTIC_WEAVE_ITEMS.has(item.name.toLowerCase());
    }
    return mod.family === "vault-jumpsuit" && item.family === "vault-jumpsuit";
  });
  const upgrades = mods.filter(
    (mod) =>
      mod.family === "upgrade" &&
      mod.locations[location] &&
      UPGRADE_ARMOR_FAMILIES.has(item.family)
  );
  return { materials, upgrades };
}

export function armorModMultiplier(mod, part) {
  if (!mod || part !== "Torso") return 1;
  const alsoFitsAnotherLocation =
    mod.locations?.head || mod.locations?.arms || mod.locations?.legs;
  return alsoFitsAnotherLocation ? 2 : 1;
}

export function calculateArmorPart(item, material, upgrade, manual = {}, part = "") {
  const add = (field) =>
    Number(item?.[field] || 0) +
    Number(material?.[field] || 0) +
    Number(upgrade?.[field] || 0) +
    Number(manual?.[field] || 0);

  return {
    physical: add("physical"),
    energy: add("energy"),
    radiation: add("radiation"),
    poison: Number(manual?.poison || 0),
    hp: Number(manual?.hp || 0),
    weight:
      Number(item?.weight || 0) +
      Number(material?.weight || 0) * armorModMultiplier(material, part) +
      Number(upgrade?.weight || 0) * armorModMultiplier(upgrade, part),
    cost:
      Number(item?.cost || 0) +
      Number(material?.cost || 0) * armorModMultiplier(material, part) +
      Number(upgrade?.cost || 0) * armorModMultiplier(upgrade, part),
  };
}

export function calculateNormalArmorLocations(armor = {}, database = { items: [], mods: [] }) {
  const items = database?.items || [];
  const mods = database?.mods || [];
  const slots = armor?._equipment?.slots || {};
  const condition = armor?._condition?.parts || {};
  const result = {};

  Object.keys(PART_LOCATION).forEach((part) => {
    const selected = slots[part] || {};
    const item = items.find((entry) => entry.id === selected.itemId);
    const availableMods = compatibleArmorMods(mods, item, part);
    const material = availableMods.materials.find((entry) => entry.id === selected.materialId);
    const upgrade = availableMods.upgrades.find((entry) => entry.id === selected.upgradeId);
    const maximum = calculateArmorPart(item, material, upgrade, armor?.[part], part);

    result[part] = {
      ...maximum,
      ...(condition[part]?.current || {}),
    };
  });

  return result;
}
