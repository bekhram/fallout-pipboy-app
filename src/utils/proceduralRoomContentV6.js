import * as V5 from "./proceduralRoomContentV5.js";
import { summarizeEncounter } from "./proceduralEncounterBalance.js";

function isWasteland(spec = {}) {
  return String(spec?.type || "wasteland") === "wasteland";
}

export function generateProceduralRoomData(spec = {}) {
  if (isWasteland(spec)) return [];
  return V5.generateProceduralRoomData(spec);
}

export function generateProceduralEncounterSummary(spec = {}) {
  if (isWasteland(spec)) return summarizeEncounter({ ...spec, cols: 24, rows: 24 }, []);
  return V5.generateProceduralEncounterSummary(spec);
}

export function roomDataById(data = [], id) {
  return V5.roomDataById(data, id);
}

export function roomPrimaryMarker(roomData) {
  return V5.roomPrimaryMarker(roomData);
}

export function localizeProceduralRoomData(data = [], lang = "en") {
  return V5.localizeProceduralRoomData(data, lang);
}

export function generateLocalizedProceduralRooms(spec = {}, lang = "en") {
  if (isWasteland(spec)) return [];
  return V5.generateLocalizedProceduralRooms(spec, lang);
}

export const LOOT_RARITIES = V5.LOOT_RARITIES;
export const WEALTH_LEVELS = V5.WEALTH_LEVELS;
export const normalizeLootRarity = V5.normalizeLootRarity;
