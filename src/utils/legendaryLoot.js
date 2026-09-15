import { parseArmorDatabase } from "./armorDatabase.js";
import { loadNpcWeaponDatabase } from "./npcWeaponDatabase.js";
import { normalizeWeaponAttack } from "./npcCombat.js";
import { applyLegendaryWeaponEffects } from "./legendaryEffects.js";
import {
  getLegendaryArmorPropertiesForLocations,
  getLegendaryWeaponProperties,
} from "../data/legendaryProperties.js";

function pick(list = []) {
  if (!Array.isArray(list) || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)] || null;
}

function armorLocationText(item = {}) {
  if (typeof item.locationsCovered === "string" && item.locationsCovered) return item.locationsCovered;
  if (typeof item.location === "string" && item.location) return item.location;
  if (typeof item.locations === "string" && item.locations) return item.locations;
  const source = item.locations && typeof item.locations === "object" ? item.locations : {};
  const locations = [];
  if (source.head) locations.push("Head");
  if (source.arms) locations.push("Arms");
  if (source.torso) locations.push("Torso");
  if (source.legs) locations.push("Legs");
  return locations.join(", ");
}

export function makeLegendaryEquipment(item = {}, kind = "") {
  const itemKind = kind || (item.sourceType === "weapon" || item.category === "weapons" || item.weaponType ? "weapon" : "armor");
  if (itemKind === "weapon") {
    const properties = getLegendaryWeaponProperties(item);
    const property = pick(properties);
    if (!property) return null;
    return {
      ...item,
      legendary: true,
      legendaryProperty: property.id,
      legendaryPropertyName: property.name,
      legendaryDescription: property.description,
      legendaryKind: "weapon",
    };
  }

  const locationText = armorLocationText(item);
  const properties = getLegendaryArmorPropertiesForLocations(locationText);
  const property = pick(properties);
  if (!property) return null;
  const covered = property.locations || [];
  const location = pick(covered) || "";
  return {
    ...item,
    legendary: true,
    legendaryProperty: property.id,
    legendaryPropertyName: property.name,
    legendaryDescription: property.description,
    legendaryLocation: location,
    legendaryKind: "armor",
    locationsCovered: locationText,
  };
}

let armorPromise = null;
async function loadArmorItems() {
  if (armorPromise) return armorPromise;
  armorPromise = fetch("/Armor.csv", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`ARMOR_DB_${response.status}`);
      return response.text();
    })
    .then((text) => parseArmorDatabase(text).items || [])
    .catch(() => []);
  return armorPromise;
}

export async function generateRandomLegendaryEquipment({ kind = "random" } = {}) {
  const [weapons, armor] = await Promise.all([loadNpcWeaponDatabase().catch(() => []), loadArmorItems()]);
  const weaponCandidates = (weapons || []).map((item) => makeLegendaryEquipment(item, "weapon")).filter(Boolean);
  const armorCandidates = (armor || []).map((item) => makeLegendaryEquipment(item, "armor")).filter(Boolean);
  let candidates = [];
  if (kind === "weapon") candidates = weaponCandidates;
  else if (kind === "armor") candidates = armorCandidates;
  else candidates = [...weaponCandidates, ...armorCandidates];
  return pick(candidates);
}

export function legendaryRewardLabel(item = {}) {
  const property = String(item.legendaryPropertyName || "Legendary");
  const name = String(item.name || item.canonicalName || "Item");
  return `★ ${property} · ${name}`;
}

export function legendaryWeaponToNpcAttack(item = {}, index = 0) {
  if (!item || item.legendaryKind !== "weapon") return null;
  const calculated = applyLegendaryWeaponEffects({
    ...item,
    damage: item.damageDice ?? item.creatureDamage ?? item.damage ?? 0,
    type: item.damageType || item.type || "Physical",
    effects: Array.isArray(item.effects)
      ? item.effects
      : String(item.effects || "").split(",").map((value) => value.trim()).filter(Boolean),
    qualities: Array.isArray(item.qualities)
      ? item.qualities
      : String(item.qualities || "").split(",").map((value) => value.trim()).filter(Boolean),
  });
  return normalizeWeaponAttack({
    ...item,
    ...calculated,
    id: `legendary-${item.id || index}`,
    weaponId: item.id || "",
    name: legendaryRewardLabel(item),
    targetNumber: Number(item.targetNumber || 10),
    damageDice: Number.parseInt(String(calculated.damage ?? item.damage ?? 0), 10) || 0,
    damageType: calculated.type || item.damageType || "Physical",
    attribute: item.attribute || "PER",
    skill: item.skill || item.weaponType || "Guns",
    effects: Array.isArray(calculated.effects) ? calculated.effects.join(", ") : String(calculated.effects || ""),
    qualities: Array.isArray(calculated.qualities) ? calculated.qualities.join(", ") : String(calculated.qualities || ""),
    source: "legendary-loot",
    legendary: true,
    legendaryProperty: item.legendaryProperty,
    legendaryPropertyName: item.legendaryPropertyName,
  }, index);
}

export async function enrichLegendaryNpcStats(stats = {}) {
  if (String(stats.rank || "").toLowerCase() !== "legendary") return { ...stats };
  if (stats.legendaryLootItem?.legendary) return { ...stats };
  if (String(stats.legendaryReward || "").trim()) return { ...stats };

  const item = await generateRandomLegendaryEquipment({ kind: "random" });
  if (!item) return { ...stats };
  const label = legendaryRewardLabel(item);
  const next = {
    ...stats,
    legendaryLootItem: item,
    legendaryRewardType: item.legendaryKind,
    legendaryReward: label,
    loot: [String(stats.loot || "").trim(), label].filter(Boolean).join("\n"),
  };

  const isNpc = String(stats.cardKind || stats.kind || stats.category || "").toLowerCase() === "npc";
  if (isNpc && item.legendaryKind === "weapon") {
    const weapons = Array.isArray(stats.weapons) ? stats.weapons : [];
    const attack = legendaryWeaponToNpcAttack(item, weapons.length);
    if (attack) next.weapons = [...weapons, attack];
  }
  return next;
}
