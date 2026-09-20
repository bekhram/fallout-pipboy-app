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
  happiness: 10,
};

export const SETTLEMENT_BUILDINGS = {
  settlement_hq: {
    id: "settlement_hq", category: "special",
    name: { en: "Settlement HQ", ru: "Штаб поселения", uk: "Штаб поселення", pl: "Centrum osady" },
    footprint: { width: 4, height: 4 }, asset: "settlement_hq.png", constructionSize: "large", buildable: false,
  },
  small_house: {
    id: "small_house", category: "housing",
    name: { en: "Small house", ru: "Малый дом", uk: "Малий будинок", pl: "Mały dom" },
    footprint: { width: 3, height: 3 }, asset: "small_house.png", constructionSize: "medium",
  },
  barracks: {
    id: "barracks", category: "housing",
    name: { en: "Barracks", ru: "Казарма", uk: "Казарма", pl: "Koszary" },
    footprint: { width: 4, height: 3 }, asset: "barracks.png", constructionSize: "large",
  },
  large_house: {
    id: "large_house", category: "housing",
    name: { en: "Large house", ru: "Большой дом", uk: "Великий будинок", pl: "Duży dom" },
    footprint: { width: 4, height: 4 }, asset: "large_house-v2.png", constructionSize: "large",
  },
  crop_field: {
    id: "crop_field", category: "food",
    name: { en: "Crop field", ru: "Поле", uk: "Поле", pl: "Pole uprawne" },
    footprint: { width: 4, height: 3 }, asset: "crop_field.png", constructionSize: "medium", workersRequired: 1,
  },
  greenhouse: {
    id: "greenhouse", category: "food",
    name: { en: "Greenhouse", ru: "Теплица", uk: "Теплиця", pl: "Szklarnia" },
    footprint: { width: 4, height: 3 }, asset: "greenhouse.png", constructionSize: "large", workersRequired: 1,
  },
  brahmin_pen: {
    id: "brahmin_pen", category: "food",
    name: { en: "Brahmin pen", ru: "Загон браминов", uk: "Загін брамінів", pl: "Zagroda braminów" },
    footprint: { width: 4, height: 4 }, asset: "brahmin_pen.png", constructionSize: "large", workersRequired: 1,
  },
  water_pump: {
    id: "water_pump", category: "water",
    name: { en: "Water pump", ru: "Водяная помпа", uk: "Водяна помпа", pl: "Pompa wodna" },
    footprint: { width: 2, height: 2 }, asset: "water_pump.png", constructionSize: "small",
  },
  water_purifier: {
    id: "water_purifier", category: "water",
    name: { en: "Water purifier", ru: "Очиститель воды", uk: "Очищувач води", pl: "Oczyszczalnia wody" },
    footprint: { width: 3, height: 3 }, asset: "water_purifier-v2.png", constructionSize: "medium",
  },
  water_tower: {
    id: "water_tower", category: "water",
    name: { en: "Water tower", ru: "Водонапорная башня", uk: "Водонапірна вежа", pl: "Wieża ciśnień" },
    footprint: { width: 3, height: 3 }, asset: "water_tower.png", constructionSize: "medium",
  },

  windmill: {
    id: "windmill", category: "power",
    name: { en: "Windmill", ru: "Ветряк", uk: "Вітряк", pl: "Wiatrak" },
    footprint: { width: 2, height: 2 }, asset: "windmill.png", constructionSize: "medium",
  },
  generator: {
    id: "generator", category: "power",
    name: { en: "Small generator", ru: "Малый генератор", uk: "Малий генератор", pl: "Mały generator" },
    footprint: { width: 2, height: 2 }, asset: "generator_small.png", constructionSize: "small",
  },
  generator_medium: {
    id: "generator_medium", category: "power",
    name: { en: "Medium generator", ru: "Средний генератор", uk: "Середній генератор", pl: "Średni generator" },
    footprint: { width: 2, height: 2 }, asset: "generator_medium.png", constructionSize: "medium",
  },
  generator_large: {
    id: "generator_large", category: "power",
    name: { en: "Large generator", ru: "Большой генератор", uk: "Великий генератор", pl: "Duży generator" },
    footprint: { width: 3, height: 3 }, asset: "generator_large-v2.png", constructionSize: "large",
  },
  fusion_reactor: {
    id: "fusion_reactor", category: "power",
    name: { en: "Fusion reactor", ru: "Термоядерный реактор", uk: "Термоядерний реактор", pl: "Reaktor fuzyjny" },
    footprint: { width: 4, height: 4 }, asset: "fusion_reactor.png", constructionSize: "large",
  },
  power_pylon: {
    id: "power_pylon", category: "power",
    name: { en: "Power pylon", ru: "Электроопора", uk: "Електроопора", pl: "Słup energetyczny" },
    footprint: { width: 1, height: 1 }, asset: "power_pylon.png", constructionSize: "small",
  },
  lights: {
    id: "lights", category: "power",
    name: { en: "Lights", ru: "Освещение", uk: "Освітлення", pl: "Oświetlenie" },
    footprint: { width: 1, height: 1 }, asset: "lights.png", constructionSize: "small",
  },
  radio_beacon: {
    id: "radio_beacon", category: "power",
    name: { en: "Radio beacon", ru: "Радиомаяк", uk: "Радіомаяк", pl: "Radiolatarnia" },
    footprint: { width: 2, height: 2 }, asset: "radio_beacon.png", constructionSize: "small",
  },

  armor_workbench: {
    id: "armor_workbench", category: "production",
    name: { en: "Armor workbench", ru: "Верстак брони", uk: "Верстак броні", pl: "Warsztat pancerza" },
    footprint: { width: 2, height: 2 }, asset: "armor_workbench.png", constructionSize: "medium",
  },
  chemistry_station: {
    id: "chemistry_station", category: "production",
    name: { en: "Chemistry station", ru: "Химическая станция", uk: "Хімічна станція", pl: "Stacja chemiczna" },
    footprint: { width: 2, height: 2 }, asset: "chemistry_station.png", constructionSize: "medium",
  },
  cooking_station: {
    id: "cooking_station", category: "production",
    name: { en: "Cooking station", ru: "Кулинарная станция", uk: "Кулінарна станція", pl: "Stacja gotowania" },
    footprint: { width: 2, height: 2 }, asset: "cooking_station.png", constructionSize: "small",
  },
  power_armor_station: {
    id: "power_armor_station", category: "production",
    name: { en: "Power armor station", ru: "Станция силовой брони", uk: "Станція силової броні", pl: "Stacja pancerza wspomaganego" },
    footprint: { width: 3, height: 3 }, asset: "power_armor_station.png", constructionSize: "large",
  },
  weapons_workbench: {
    id: "weapons_workbench", category: "production",
    name: { en: "Weapons workbench", ru: "Оружейный верстак", uk: "Збройовий верстак", pl: "Warsztat broni" },
    footprint: { width: 2, height: 2 }, asset: "weapons_workbench.png", constructionSize: "medium",
  },
  robot_workbench: {
    id: "robot_workbench", category: "production",
    name: { en: "Robot workbench", ru: "Верстак робототехники", uk: "Верстак робототехніки", pl: "Warsztat robotyczny" },
    footprint: { width: 3, height: 3 }, asset: "robot_workbench.png", constructionSize: "large",
  },
  scrap_yard: {
    id: "scrap_yard", category: "production",
    name: { en: "Scrap yard", ru: "Свалка", uk: "Звалище", pl: "Złomowisko" },
    footprint: { width: 4, height: 3 }, asset: "scrap_yard.png", constructionSize: "large", workersRequired: 1,
  },
  warehouse: {
    id: "warehouse", category: "production",
    name: { en: "Warehouse", ru: "Склад", uk: "Склад", pl: "Magazyn" },
    footprint: { width: 4, height: 3 }, asset: "warehouse.png", constructionSize: "large",
  },

  trading_post: {
    id: "trading_post", category: "commerce",
    name: { en: "Trading stand", ru: "Торговый прилавок", uk: "Торговий прилавок", pl: "Stoisko handlowe" },
    footprint: { width: 2, height: 2 }, asset: "trading_post-v2.png", constructionSize: "small", workersRequired: 1,
  },
  trading_shop: {
    id: "trading_shop", category: "commerce",
    name: { en: "Trading shop", ru: "Торговый магазин", uk: "Торгова крамниця", pl: "Sklep handlowy" },
    footprint: { width: 3, height: 3 }, asset: "trading_post-v2.png", constructionSize: "medium", workersRequired: 1,
  },
  trading_emporium: {
    id: "trading_emporium", category: "commerce",
    name: { en: "Trading emporium", ru: "Торговый эмпориум", uk: "Торговий емпоріум", pl: "Emporium handlowe" },
    footprint: { width: 4, height: 3 }, asset: "trading_emporium.png", constructionSize: "large", workersRequired: 1,
  },
  caravan_post: {
    id: "caravan_post", category: "commerce",
    name: { en: "Trade caravan post", ru: "Пост торгового каравана", uk: "Пост торгового каравану", pl: "Posterunek karawany handlowej" },
    footprint: { width: 4, height: 3 }, asset: "caravan_post.png", constructionSize: "large", workersRequired: 1,
  },

  first_aid_station: {
    id: "first_aid_station", category: "services",
    name: { en: "First aid station", ru: "Пункт первой помощи", uk: "Пункт першої допомоги", pl: "Punkt pierwszej pomocy" },
    footprint: { width: 2, height: 2 }, asset: "clinic.png", constructionSize: "small", workersRequired: 1,
  },
  clinic: {
    id: "clinic", category: "services",
    name: { en: "Clinic", ru: "Клиника", uk: "Клініка", pl: "Klinika" },
    footprint: { width: 3, height: 3 }, asset: "clinic-v2.png", constructionSize: "medium", workersRequired: 1,
  },
  surgery_center: {
    id: "surgery_center", category: "services",
    name: { en: "Surgery center", ru: "Хирургический центр", uk: "Хірургічний центр", pl: "Centrum chirurgiczne" },
    footprint: { width: 4, height: 3 }, asset: "surgery_center.png", constructionSize: "large", workersRequired: 1,
  },

  guard_post: {
    id: "guard_post", category: "defense",
    name: { en: "Guard post", ru: "Пост охраны", uk: "Пост охорони", pl: "Posterunek" },
    footprint: { width: 2, height: 2 }, asset: "guard_post-v2.png", constructionSize: "small", workersRequired: 1,
  },
  siren: {
    id: "siren", category: "defense",
    name: { en: "Siren", ru: "Сирена", uk: "Сирена", pl: "Syrena" },
    footprint: { width: 1, height: 1 }, asset: "siren.png", constructionSize: "small",
  },
  turret: {
    id: "turret", category: "defense",
    name: { en: "Machine gun turret", ru: "Пулемётная турель", uk: "Кулеметна турель", pl: "Wieżyczka karabinowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },
  machine_gun_turret: {
    id: "machine_gun_turret", category: "defense",
    name: { en: "Machine gun turret", ru: "Пулемётная турель", uk: "Кулеметна турель", pl: "Wieżyczka karabinowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },
  heavy_machine_gun_turret: {
    id: "heavy_machine_gun_turret", category: "defense",
    name: { en: "Heavy machine gun turret", ru: "Тяжёлая пулемётная турель", uk: "Важка кулеметна турель", pl: "Ciężka wieżyczka karabinowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },
  laser_turret: {
    id: "laser_turret", category: "defense",
    name: { en: "Laser turret", ru: "Лазерная турель", uk: "Лазерна турель", pl: "Wieżyczka laserowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },
  heavy_laser_turret: {
    id: "heavy_laser_turret", category: "defense",
    name: { en: "Heavy laser turret", ru: "Тяжёлая лазерная турель", uk: "Важка лазерна турель", pl: "Ciężka wieżyczka laserowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },
  shotgun_turret: {
    id: "shotgun_turret", category: "defense",
    name: { en: "Shotgun turret", ru: "Дробовая турель", uk: "Дробова турель", pl: "Wieżyczka śrutowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },
  spotlight_turret: {
    id: "spotlight_turret", category: "defense",
    name: { en: "Spotlight turret", ru: "Турель-прожектор", uk: "Турель-прожектор", pl: "Wieżyczka reflektorowa" },
    footprint: { width: 1, height: 1 }, asset: "turret.png", constructionSize: "small",
  },

  wall_straight: {
    id: "wall_straight", category: "defense",
    name: { en: "Wall", ru: "Стена", uk: "Стіна", pl: "Mur" },
    footprint: { width: 1, height: 1 }, asset: "wall_straight.png", constructionSize: "small",
  },
  wall_corner: {
    id: "wall_corner", category: "defense",
    name: { en: "Wall corner", ru: "Угол стены", uk: "Кут стіни", pl: "Narożnik muru" },
    footprint: { width: 1, height: 1 }, asset: "wall_corner.png", constructionSize: "small",
  },
  wall_corner_reverse: {
    id: "wall_corner_reverse", category: "defense",
    name: { en: "Wall corner (reverse)", ru: "Угол стены (обратный)", uk: "Кут стіни (зворотний)", pl: "Narożnik muru (odwrócony)" },
    footprint: { width: 1, height: 1 }, asset: "wall_corner_reverse.png", constructionSize: "small",
  },
  gate: {
    id: "gate", category: "defense",
    name: { en: "Gate", ru: "Ворота", uk: "Ворота", pl: "Brama" },
    footprint: { width: 2, height: 1 }, asset: "gate.png", constructionSize: "small",
  },
};

export const SETTLEMENT_BUILDING_LIST = Object.values(SETTLEMENT_BUILDINGS).filter((definition) => definition.buildable !== false);

export function settlementBuildingName(definition, language = "en") {
  if (!definition) return "";
  const key = String(language || "en").split("-")[0];
  return definition.name?.[key] || definition.name?.en || definition.id;
}
