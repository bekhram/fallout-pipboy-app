import {
  COMMONWEALTH_ENCOUNTERS,
  WEIRD_WASTELAND_ENCOUNTERS,
} from "../data/map/encounterTables.js";
import { LOCATION_TYPES } from "../data/map/locationTypes.js";

function weightedPick(list) {
  const total = list.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of list) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }

  return list[0];
}

export function rollTravelEncounter() {
  const result = weightedPick(COMMONWEALTH_ENCOUNTERS);

  if (result.id === "weird_wasteland") {
    return weightedPick(WEIRD_WASTELAND_ENCOUNTERS);
  }

  return result;
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

export function maybeRollTravelEncounter(terrainId) {
  if (!shouldTriggerEncounter(terrainId)) return null;
  return rollTravelEncounter();
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