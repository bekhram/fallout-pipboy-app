import * as V4 from "./proceduralRoomContentV4.js";
import { balanceEncounterEnemies, summarizeEncounter } from "./proceduralEncounterBalance.js";
import { buildProceduralRoomBlueprints } from "./proceduralRoomScale.js";
import { isResidentialType, residentialSourceAlias } from "./proceduralResidential.js";

const SOURCE_ROOM_ALIAS = {
  security: "office",
  break_room: "sales",
  janitor: "storage",
  coffee_area: "store",
  house: "office",
  entry: "store",
  hall: "sales",
  living_room: "sales",
  kitchen: "store",
  dining: "sales",
  bedroom: "office",
  master_bedroom: "office",
  child_room: "office",
  bathroom: "wc",
  guest_bathroom: "wc",
  utility: "garage",
  laundry: "storage",
  closet: "storage",
  terrace: "sales",
};

const ROOM_NAMES = {
  en: {
    security: "Security Room", break_room: "Employee Break Room", janitor: "Janitor Room", coffee_area: "Coffee Area", house: "Residential House",
    entry: "Entry", hall: "Hall", living_room: "Living Room", kitchen: "Kitchen", dining: "Dining Room", bedroom: "Bedroom", master_bedroom: "Master Bedroom", child_room: "Child Room", bathroom: "Bathroom", guest_bathroom: "Guest Bathroom", office: "Office", storage: "Storage", utility: "Utility Room", laundry: "Laundry", closet: "Closet", terrace: "Terrace",
  },
  ru: {
    security: "Комната охраны", break_room: "Комната отдыха работников", janitor: "Комната уборщика", coffee_area: "Кофейная зона", house: "Жилой дом",
    entry: "Прихожая", hall: "Холл", living_room: "Гостиная", kitchen: "Кухня", dining: "Столовая", bedroom: "Спальня", master_bedroom: "Мастер-спальня", child_room: "Детская", bathroom: "Ванная", guest_bathroom: "Гостевой санузел", office: "Кабинет", storage: "Кладовая", utility: "Техпомещение", laundry: "Постирочная", closet: "Гардеробная", terrace: "Терраса",
  },
  uk: {
    security: "Кімната охорони", break_room: "Кімната відпочинку працівників", janitor: "Кімната прибиральника", coffee_area: "Кавова зона", house: "Житловий будинок",
    entry: "Передпокій", hall: "Хол", living_room: "Вітальня", kitchen: "Кухня", dining: "Їдальня", bedroom: "Спальня", master_bedroom: "Головна спальня", child_room: "Дитяча", bathroom: "Ванна", guest_bathroom: "Гостьовий санвузол", office: "Кабінет", storage: "Комора", utility: "Технічне приміщення", laundry: "Пральня", closet: "Гардеробна", terrace: "Тераса",
  },
  pl: {
    security: "Pokój ochrony", break_room: "Pokój socjalny pracowników", janitor: "Pomieszczenie sprzątacza", coffee_area: "Strefa kawowa", house: "Dom mieszkalny",
    entry: "Przedpokój", hall: "Hol", living_room: "Salon", kitchen: "Kuchnia", dining: "Jadalnia", bedroom: "Sypialnia", master_bedroom: "Główna sypialnia", child_room: "Pokój dziecięcy", bathroom: "Łazienka", guest_bathroom: "Toaleta gościnna", office: "Gabinet", storage: "Schowek", utility: "Pomieszczenie techniczne", laundry: "Pralnia", closet: "Garderoba", terrace: "Taras",
  },
};

function cloneRoom(room = {}) {
  return {
    ...room,
    markers: [...(room.markers || [])],
    enemies: (room.enemies || []).map((enemy) => ({ ...enemy, candidates: [...(enemy?.candidates || [])] })),
    loot: [...(room.loot || [])],
    safe: room.safe ? { ...room.safe, contents: [...(room.safe.contents || [])] } : null,
    vending: room.vending ? { ...room.vending, stock: [...(room.vending.stock || [])] } : null,
    ammoCrate: room.ammoCrate ? { ...room.ammoCrate, contents: [...(room.ammoCrate.contents || [])] } : null,
    supplies: room.supplies ? { ...room.supplies, food: [...(room.supplies.food || [])], water: [...(room.supplies.water || [])] } : null,
    medkit: room.medkit ? { ...room.medkit, contents: [...(room.medkit.contents || [])] } : null,
    trap: room.trap ? { ...room.trap } : null,
    terminal: room.terminal ? { ...room.terminal } : null,
  };
}

function sourceSeed(spec, sourceSet) { return `${String(spec?.seed || "1")}:room-set:${sourceSet}`; }

function emptyRoom(id) {
  return { id, markers: [], enemies: [], loot: [], terminal: null, safe: null, vending: null, workbench: false, hazard: null, special: null, trap: null, ammoCrate: null, supplies: null, medkit: null };
}

function expandedBaseRooms(spec = {}) {
  const blueprints = buildProceduralRoomBlueprints(spec);
  if (!blueprints.length) return [];
  const residential = isResidentialType(spec?.type);
  const sourceSpec = residential ? { ...spec, type: "red_rocket" } : spec;
  const sourceSets = new Map();
  const getSourceSet = (index) => {
    if (!sourceSets.has(index)) sourceSets.set(index, V4.generateProceduralRoomData({ ...sourceSpec, seed: sourceSeed(sourceSpec, index) }));
    return sourceSets.get(index);
  };

  return blueprints.map((blueprint) => {
    const sourceRooms = getSourceSet(blueprint.sourceSet);
    const alias = residential
      ? residentialSourceAlias(blueprint.baseRoomId)
      : (SOURCE_ROOM_ALIAS[blueprint.baseRoomId] || blueprint.baseRoomId);
    const source = sourceRooms.find((room) => room?.id === alias)
      || getSourceSet(0).find((room) => room?.id === alias)
      || (blueprint.baseRoomId === "house" ? emptyRoom("house") : sourceRooms[0])
      || emptyRoom(alias);
    const room = cloneRoom(source);
    return {
      ...room,
      id: blueprint.id,
      baseRoomId: blueprint.baseRoomId,
      roomInstance: blueprint.instance,
      roomSlot: blueprint.slot,
      roomSourceSet: blueprint.sourceSet,
      roomZone: blueprint.zone || "main",
      houseId: blueprint.houseId || "",
      houseType: blueprint.houseType || "",
      disposition: blueprint.disposition || "",
      allowedGroups: [...(blueprint.allowedGroups || [])],
      lootProfile: blueprint.houseType || "",
    };
  });
}

export function generateProceduralRoomData(spec = {}) {
  return balanceEncounterEnemies(spec, expandedBaseRooms(spec));
}

export function generateProceduralEncounterSummary(spec = {}) {
  const rooms = generateProceduralRoomData(spec);
  return summarizeEncounter(spec, rooms);
}

export function roomDataById(data = [], id) { return data.find((room) => room?.id === id) || null; }
export function roomPrimaryMarker(roomData) { return V4.roomPrimaryMarker(roomData); }

export function localizeProceduralRoomData(data = [], lang = "en") {
  const language = ROOM_NAMES[lang] ? lang : "en";
  return data.map((raw) => {
    const baseRoomId = raw?.baseRoomId || String(raw?.id || "").split("__")[0];
    const alias = SOURCE_ROOM_ALIAS[baseRoomId] || baseRoomId;
    const surrogate = { ...cloneRoom(raw), id: alias };
    const localized = V4.localizeProceduralRoomData([surrogate], lang)[0] || { ...raw, name: baseRoomId, lines: [] };
    const instance = Math.max(1, Number(raw?.roomInstance) || 1);
    const customName = ROOM_NAMES[language]?.[baseRoomId];
    const shouldNumber = baseRoomId === "house" && instance > 1;
    return {
      ...localized,
      id: raw.id,
      baseRoomId,
      roomInstance: instance,
      roomSlot: raw.roomSlot,
      roomSourceSet: raw.roomSourceSet,
      roomZone: raw.roomZone,
      markers: [...(raw.markers || [])],
      name: `${customName || localized.name || baseRoomId}${shouldNumber ? ` ${instance}` : ""}`,
    };
  });
}

export function generateLocalizedProceduralRooms(spec = {}, lang = "en") { return localizeProceduralRoomData(generateProceduralRoomData(spec), lang); }
export const LOOT_RARITIES = V4.LOOT_RARITIES;
export const WEALTH_LEVELS = V4.WEALTH_LEVELS;
export const normalizeLootRarity = V4.normalizeLootRarity;
