export const SETTLEMENT_GRID_SIZE = 24;

export const STARTING_SETTLEMENT_RESOURCES = {
  population: 4,
  populationLimit: 8,
  food: 8,
  water: 8,
  power: 0,
  materials: 40,
  caps: 100,
  defense: 0,
  happiness: 50,
};

export const SETTLEMENT_BUILDINGS = {
  small_house: {
    id: "small_house",
    category: "housing",
    name: { en: "Small house", ru: "Малый дом", uk: "Малий будинок", pl: "Mały dom" },
    footprint: { width: 3, height: 3 },
    asset: "small_house.png",
    constructionSize: "medium",
    cost: { materials: 20, caps: 25 },
    buildTimeMs: 6 * 60 * 60 * 1000,
    effects: { populationLimit: 4, happiness: 2, defense: 1 },
  },
  crop_field: {
    id: "crop_field",
    category: "food",
    name: { en: "Crop field", ru: "Поле", uk: "Поле", pl: "Pole uprawne" },
    footprint: { width: 4, height: 3 },
    asset: "crop_field.png",
    constructionSize: "medium",
    cost: { materials: 12, caps: 0 },
    buildTimeMs: 3 * 60 * 60 * 1000,
    productionPerDay: { food: 6 },
    workersRequired: 1,
  },
  water_pump: {
    id: "water_pump",
    category: "water",
    name: { en: "Water pump", ru: "Водяная помпа", uk: "Водяна помпа", pl: "Pompa wodna" },
    footprint: { width: 2, height: 2 },
    asset: "water_tower.png",
    constructionSize: "small",
    cost: { materials: 15, caps: 0 },
    buildTimeMs: 4 * 60 * 60 * 1000,
    productionPerDay: { water: 6 },
    effects: { happiness: 1 },
  },
  generator: {
    id: "generator",
    category: "power",
    name: { en: "Generator", ru: "Генератор", uk: "Генератор", pl: "Generator" },
    footprint: { width: 2, height: 2 },
    asset: "generator.png",
    constructionSize: "small",
    cost: { materials: 18, caps: 10 },
    buildTimeMs: 5 * 60 * 60 * 1000,
    productionPerDay: { power: 8 },
    effects: { happiness: -1 },
  },
};

export const SETTLEMENT_BUILDING_LIST = Object.values(SETTLEMENT_BUILDINGS);

export function settlementBuildingName(definition, language = "en") {
  if (!definition) return "";
  const key = String(language || "en").split("-")[0];
  return definition.name?.[key] || definition.name?.en || definition.id;
}
