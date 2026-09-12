import * as V5 from "./proceduralRoomContentV5.js";
import { summarizeEncounter } from "./proceduralEncounterBalance.js";
import {
  generateProceduralWastelandPoiData,
  generateLocalizedProceduralWastelandPois,
} from "./proceduralWastelandPoi.js";

function isWasteland(spec = {}) {
  return String(spec?.type || "wasteland") === "wasteland";
}

function isSettlement(spec = {}) {
  return String(spec?.type || "") === "settlement";
}

function hash(value) {
  const text = String(value || "");
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

const HOUSE_GROUPS = {
  civilian: {
    wastelander: ["Wastelander"],
    minuteman: ["Minuteman"],
  },
  raider: {
    raider: ["Raider", "Raider Scavver", "Raider Psycho", "Raider Veteran"],
    super_mutant: ["Super Mutant", "Super Mutant Brute", "Super Mutant Master", "Mutant Hound"],
  },
};

function settlementRoomRules(spec, rooms) {
  return rooms.map((room) => {
    if (room.houseType === "ruined") return { ...room, lootProfile: "ruined" };
    if (room.houseType === "civilian") {
      const group = hash(`${spec.seed}:${room.houseId}:residents`) % 3 === 0 ? "minuteman" : "wastelander";
      const candidates = HOUSE_GROUPS.civilian[group];
      const residents = room.baseRoomId === "living_room"
        ? [{ type: candidates[0], count: 1, candidates, enemyGroup: group, disposition: "friendly", rank: "standard" }]
        : [];
      return { ...room, enemies: [], enemyGroup: "", residents, disposition: "friendly", lootProfile: "civilian" };
    }
    if (room.houseType === "raider") {
      const group = hash(`${spec.seed}:${room.houseId}:hostiles`) % 2 === 0 ? "raider" : "super_mutant";
      const candidates = HOUSE_GROUPS.raider[group];
      const enemies = (room.enemies || []).map((enemy, index) => ({
        ...enemy,
        type: candidates[index % candidates.length],
        candidates: [...candidates],
        enemyGroup: group,
        disposition: "hostile",
      }));
      return { ...room, enemies, enemyGroup: enemies.length ? group : "", disposition: "hostile", lootProfile: "raider" };
    }
    return room;
  });
}

export function generateProceduralRoomData(spec = {}) {
  if (isWasteland(spec)) return generateProceduralWastelandPoiData(spec);
  const rooms = V5.generateProceduralRoomData(spec);
  return isSettlement(spec) ? settlementRoomRules(spec, rooms) : rooms;
}

export function generateProceduralEncounterSummary(spec = {}) {
  const data = generateProceduralRoomData(spec);
  return summarizeEncounter(spec, data);
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
  if (isWasteland(spec)) return generateLocalizedProceduralWastelandPois(spec, lang);
  return V5.localizeProceduralRoomData(generateProceduralRoomData(spec), lang);
}

export const LOOT_RARITIES = V5.LOOT_RARITIES;
export const WEALTH_LEVELS = V5.WEALTH_LEVELS;
export const normalizeLootRarity = V5.normalizeLootRarity;
