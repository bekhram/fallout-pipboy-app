import * as V4 from "./proceduralRoomContentV4.js";
import { balanceEncounterEnemies, summarizeEncounter } from "./proceduralEncounterBalance.js";
import { buildProceduralRoomBlueprints } from "./proceduralRoomScale.js";

function cloneRoom(room = {}) {
  return {
    ...room,
    markers: [...(room.markers || [])],
    enemies: (room.enemies || []).map((enemy) => ({
      ...enemy,
      candidates: [...(enemy?.candidates || [])],
    })),
    loot: [...(room.loot || [])],
    safe: room.safe ? { ...room.safe, contents: [...(room.safe.contents || [])] } : null,
    vending: room.vending ? { ...room.vending, stock: [...(room.vending.stock || [])] } : null,
    ammoCrate: room.ammoCrate ? { ...room.ammoCrate, contents: [...(room.ammoCrate.contents || [])] } : null,
    supplies: room.supplies ? {
      ...room.supplies,
      food: [...(room.supplies.food || [])],
      water: [...(room.supplies.water || [])],
    } : null,
    medkit: room.medkit ? { ...room.medkit, contents: [...(room.medkit.contents || [])] } : null,
    trap: room.trap ? { ...room.trap } : null,
    terminal: room.terminal ? { ...room.terminal } : null,
  };
}

function sourceSeed(spec, sourceSet) {
  return `${String(spec?.seed || "1")}:room-set:${sourceSet}`;
}

function expandedBaseRooms(spec = {}) {
  const blueprints = buildProceduralRoomBlueprints(spec);
  if (!blueprints.length) return [];

  const sourceSets = new Map();
  const getSourceSet = (index) => {
    if (!sourceSets.has(index)) {
      sourceSets.set(index, V4.generateProceduralRoomData({
        ...spec,
        seed: sourceSeed(spec, index),
      }));
    }
    return sourceSets.get(index);
  };

  return blueprints.map((blueprint) => {
    const sourceRooms = getSourceSet(blueprint.sourceSet);
    const source = sourceRooms.find((room) => room?.id === blueprint.baseRoomId)
      || getSourceSet(0).find((room) => room?.id === blueprint.baseRoomId)
      || sourceRooms[0]
      || {};
    const room = cloneRoom(source);
    return {
      ...room,
      id: blueprint.id,
      baseRoomId: blueprint.baseRoomId,
      roomInstance: blueprint.instance,
      roomSlot: blueprint.slot,
      roomSourceSet: blueprint.sourceSet,
    };
  });
}

export function generateProceduralRoomData(spec = {}) {
  const rooms = expandedBaseRooms(spec);
  return balanceEncounterEnemies(spec, rooms);
}

export function generateProceduralEncounterSummary(spec = {}) {
  const rooms = generateProceduralRoomData(spec);
  return summarizeEncounter(spec, rooms);
}

export function roomDataById(data = [], id) {
  return data.find((room) => room?.id === id) || null;
}

export function roomPrimaryMarker(roomData) {
  return V4.roomPrimaryMarker(roomData);
}

export function localizeProceduralRoomData(data = [], lang = "en") {
  return data.map((raw) => {
    const baseRoomId = raw?.baseRoomId || String(raw?.id || "").split("__")[0];
    const surrogate = { ...cloneRoom(raw), id: baseRoomId };
    const localized = V4.localizeProceduralRoomData([surrogate], lang)[0] || {
      ...raw,
      name: baseRoomId,
      lines: [],
    };
    const instance = Math.max(1, Number(raw?.roomInstance) || 1);
    return {
      ...localized,
      id: raw.id,
      baseRoomId,
      roomInstance: instance,
      roomSlot: raw.roomSlot,
      roomSourceSet: raw.roomSourceSet,
      markers: [...(raw.markers || [])],
      name: `${localized.name || baseRoomId}${instance > 1 ? ` ${instance}` : ""}`,
    };
  });
}

export function generateLocalizedProceduralRooms(spec = {}, lang = "en") {
  return localizeProceduralRoomData(generateProceduralRoomData(spec), lang);
}

export const LOOT_RARITIES = V4.LOOT_RARITIES;
export const WEALTH_LEVELS = V4.WEALTH_LEVELS;
export const normalizeLootRarity = V4.normalizeLootRarity;
