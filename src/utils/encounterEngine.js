import {
  APP_CUSTOM_ENCOUNTERS,
  OFFICIAL_COMMONWEALTH_ENCOUNTERS,
  OFFICIAL_WEIRD_WASTELAND_ENCOUNTERS,
} from "../data/map/encounterTables.js";
import { LOCATION_TYPES } from "../data/map/locationTypes.js";

function weightedPick(list) {
  const total = list.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  let roll = Math.random() * total;

  for (const item of list) {
    if (roll < Number(item.weight || 0)) return item;
    roll -= Number(item.weight || 0);
  }

  return list[0] || null;
}

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function byD20(table, roll) {
  return table.find((entry) => roll >= Number(entry.rollMin) && roll <= Number(entry.rollMax)) || null;
}

function localizeOfficialEncounter(entry, language = "en", roll = null, weirdRoll = null) {
  if (!entry) return null;
  const lang = ["en", "ru", "uk", "pl"].includes(String(language || "").split("-")[0])
    ? String(language).split("-")[0]
    : "en";
  return {
    ...entry,
    text: entry.texts?.[lang] || entry.texts?.en || entry.id,
    roll,
    weirdRoll,
  };
}

export function rollTravelEncounter(options = {}) {
  const regionId = options?.regionId || "commonwealth";
  const language = options?.language || "en";

  if (regionId === "commonwealth") {
    const roll = rollD20();
    const result = byD20(OFFICIAL_COMMONWEALTH_ENCOUNTERS, roll);
    if (!result) return null;

    if (result.id === "official_weird_wasteland") {
      const weirdRoll = rollD20();
      const weirdResult = byD20(OFFICIAL_WEIRD_WASTELAND_ENCOUNTERS, weirdRoll);
      return localizeOfficialEncounter(weirdResult, language, roll, weirdRoll);
    }

    return localizeOfficialEncounter(result, language, roll, null);
  }

  const custom = weightedPick(APP_CUSTOM_ENCOUNTERS);
  return custom ? { ...custom, generationSource: "app_custom", regionId } : null;
}

export function getEncounterChanceByTerrain(terrainId) {
  switch (terrainId) {
    case "plain":
      return 0.25;
    case "city":
      return 0.4;
    case "hard":
      return 0.45;
    case "very_hard":
      return 0.55;
    default:
      return 0.2;
  }
}

export function shouldTriggerEncounter(terrainId) {
  return Math.random() < getEncounterChanceByTerrain(terrainId);
}

export function maybeRollTravelEncounter(terrainId, options = {}) {
  if (!shouldTriggerEncounter(terrainId)) return null;
  return rollTravelEncounter(options && typeof options === "object" ? options : {});
}

export function getLocationChanceByTerrain(terrainId) {
  switch (terrainId) {
    case "plain":
      return 0.2;
    case "city":
      return 0.4;
    case "hard":
      return 0.35;
    case "very_hard":
      return 0.45;
    default:
      return 0.1;
  }
}

export function maybeGenerateLocation(terrainId) {
  const pool = LOCATION_TYPES.filter((item) =>
    item.terrains.includes(terrainId)
  );

  if (!pool.length) return null;

  const picked = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: picked.id,
    name: picked.name,
    danger: picked.danger,
    loot: picked.loot,
  };
}

export function isLocationEncounter(encounter) {
  return encounter?.type === "location";
}

export function isTrapEncounter(encounter) {
  return encounter?.type === "trap";
}

export function isLootEncounter(encounter) {
  return encounter?.type === "loot";
}

export function isAmbushEncounter(encounter) {
  return encounter?.type === "ambush";
}
