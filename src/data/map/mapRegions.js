import { FALLOUT_4_LOCATIONS } from "./bostonMap.js";

const location = (id, name, type, worldX, worldY, icon = "◆", major = false) => ({
  id, name, type, worldX, worldY, icon, major,
});

const FALLOUT_1_LOCATIONS = [
  location("fo1_vault_13", "Vault 13", "vault", 8, 8, "13", true),
  location("fo1_vault_15", "Vault 15", "vault", 18, 7, "15", true),
  location("fo1_shady_sands", "Shady Sands", "settlement", 14, 11, "S", true),
  location("fo1_raiders", "Raiders Camp", "camp", 13, 17, "▲"),
  location("fo1_junktown", "Junktown", "town", 9, 22, "J", true),
  location("fo1_hub", "The Hub", "city", 17, 26, "H", true),
  location("fo1_necropolis", "Necropolis", "ruins", 28, 25, "N", true),
  location("fo1_boneyard", "Boneyard", "city", 22, 38, "B", true),
  location("fo1_cathedral", "The Cathedral", "church", 26, 41, "✝", true),
  location("fo1_brotherhood", "Lost Hills", "bunker", 11, 32, "★", true),
  location("fo1_glow", "The Glow", "ruins", 33, 37, "☢", true),
  location("fo1_mariposa", "Mariposa Military Base", "military", 5, 18, "M", true),
];

const FALLOUT_2_LOCATIONS = [
  location("fo2_arroyo", "Arroyo", "village", 8, 7, "A", true),
  location("fo2_klamath", "Klamath", "town", 12, 14, "K", true),
  location("fo2_den", "The Den", "town", 18, 15, "D", true),
  location("fo2_modoc", "Modoc", "town", 21, 10, "M"),
  location("fo2_vault_city", "Vault City", "vault", 27, 13, "V", true),
  location("fo2_gecko", "Gecko", "industrial", 31, 11, "G"),
  location("fo2_broken_hills", "Broken Hills", "town", 32, 21, "B"),
  location("fo2_new_reno", "New Reno", "city", 24, 23, "R", true),
  location("fo2_sierra", "Sierra Army Depot", "military", 20, 29, "★"),
  location("fo2_ncr", "New California Republic", "city", 28, 35, "N", true),
  location("fo2_vault_15", "Vault 15", "vault", 35, 32, "15"),
  location("fo2_san_francisco", "San Francisco", "city", 12, 40, "F", true),
  location("fo2_navarro", "Navarro", "military", 6, 34, "N", true),
];

const FALLOUT_3_LOCATIONS = [
  location("fo3_vault_101", "Vault 101", "vault", 8, 9, "101", true),
  location("fo3_megaton", "Megaton", "settlement", 13, 13, "M", true),
  location("fo3_springvale", "Springvale", "town", 10, 12, "S"),
  location("fo3_super_duper_mart", "Super-Duper Mart", "store", 17, 12, "D"),
  location("fo3_minefield", "Minefield", "town", 22, 8, "M"),
  location("fo3_big_town", "Big Town", "town", 9, 20, "B"),
  location("fo3_aresti", "Arefu", "settlement", 7, 16, "A"),
  location("fo3_rivet_city", "Rivet City", "city", 30, 30, "R", true),
  location("fo3_citadel", "The Citadel", "military", 22, 30, "★", true),
  location("fo3_underworld", "Underworld", "city", 24, 23, "U", true),
  location("fo3_tenpenny", "Tenpenny Tower", "tower", 8, 32, "T", true),
  location("fo3_paradise_falls", "Paradise Falls", "settlement", 13, 6, "P"),
  location("fo3_little_lamplight", "Little Lamplight", "cave", 6, 27, "L"),
  location("fo3_raven_rock", "Raven Rock", "military", 4, 18, "R", true),
];

const NEW_VEGAS_LOCATIONS = [
  location("fnv_goodsprings", "Goodsprings", "town", 8, 35, "G", true),
  location("fnv_primm", "Primm", "town", 13, 39, "P", true),
  location("fnv_nipton", "Nipton", "town", 21, 38, "N"),
  location("fnv_novac", "Novac", "town", 27, 30, "N", true),
  location("fnv_boulder_city", "Boulder City", "town", 33, 25, "B"),
  location("fnv_hoover_dam", "Hoover Dam", "industrial", 39, 24, "H", true),
  location("fnv_vegas_strip", "New Vegas Strip", "city", 24, 16, "V", true),
  location("fnv_freeside", "Freeside", "city", 23, 18, "F", true),
  location("fnv_mccarran", "Camp McCarran", "military", 23, 22, "★"),
  location("fnv_red_rock", "Red Rock Canyon", "camp", 13, 15, "R"),
  location("fnv_jacobstown", "Jacobstown", "settlement", 8, 10, "J"),
  location("fnv_nellis", "Nellis Air Force Base", "military", 31, 10, "A", true),
  location("fnv_hidden_valley", "Hidden Valley", "bunker", 17, 28, "B"),
  location("fnv_black_mountain", "Black Mountain", "mountains", 25, 26, "▲"),
];

export const MAP_REGIONS = [
  { id: "commonwealth", game: "Fallout 4", names: { en: "Commonwealth", ru: "Содружество", uk: "Співдружність", pl: "Wspólnota" }, locations: FALLOUT_4_LOCATIONS, start: { x: 8, y: 6 }, defaultTargetId: "diamond_city", seed: 4 },
  { id: "california_fo1", game: "Fallout", names: { en: "Southern California", ru: "Южная Калифорния", uk: "Південна Каліфорнія", pl: "Południowa Kalifornia" }, locations: FALLOUT_1_LOCATIONS, start: { x: 8, y: 8 }, defaultTargetId: "fo1_shady_sands", seed: 1 },
  { id: "california_fo2", game: "Fallout 2", names: { en: "Northern California", ru: "Северная Калифорния", uk: "Північна Каліфорнія", pl: "Północna Kalifornia" }, locations: FALLOUT_2_LOCATIONS, start: { x: 8, y: 7 }, defaultTargetId: "fo2_klamath", seed: 2 },
  { id: "capital_wasteland", game: "Fallout 3", names: { en: "Capital Wasteland", ru: "Столичная пустошь", uk: "Столична пустка", pl: "Stołeczne Pustkowia" }, locations: FALLOUT_3_LOCATIONS, start: { x: 8, y: 9 }, defaultTargetId: "fo3_megaton", seed: 3 },
  { id: "mojave", game: "Fallout: New Vegas", names: { en: "Mojave Wasteland", ru: "Пустошь Мохаве", uk: "Пустка Мохаве", pl: "Pustkowia Mojave" }, locations: NEW_VEGAS_LOCATIONS, start: { x: 8, y: 35 }, defaultTargetId: "fnv_goodsprings", seed: 5 },
];

export function getMapRegion(regionId) {
  return MAP_REGIONS.find((region) => region.id === regionId) || MAP_REGIONS[0];
}

export function getRegionName(region, language = "en") {
  const code = String(language).toLowerCase().split("-")[0];
  return region?.names?.[code] || region?.names?.en || region?.id || "";
}
