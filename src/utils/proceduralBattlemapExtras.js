import { buildOpenWastelandSite } from "./proceduralWastelandOpen.js";
import {
  buildSettlementHouseLayout,
  buildSettlementLayout,
} from "./proceduralSettlement.js";
import { generateProceduralWastelandPoiData } from "./proceduralWastelandPoi.js";

const GRID = 24;
const TRAP_LETHALITIES = ["low", "standard", "high", "deadly"];

const TRAP_PROFILES = {
  low: { difficulty: 1, damageDice: 2 },
  standard: { difficulty: 2, damageDice: 4 },
  high: { difficulty: 3, damageDice: 6 },
  deadly: { difficulty: 4, damageDice: 8 },
};

const COPY = {
  en: {
    trap: "Trap", event: "Event", loot: "Loot cache", workbench: "Workbench", discovery: "Discovery",
    trapNames: ["Hidden trigger", "Electrical hazard", "Radiation trap", "Alarm trap"],
    trapDetail: (profile) => `Detection/disable difficulty ${profile.difficulty}; suggested damage ${profile.damageDice} CD.`,
    events: [
      ["Distress signal", "A weak distress signal points to something nearby."],
      ["Faction traces", "Fresh signs suggest a faction passed through recently."],
      ["Strange broadcast", "A short repeating transmission can be investigated."],
      ["Wandering traveller", "A lone traveller may have information, a request or trade goods."],
      ["Abandoned message", "A note or holotape hints at another nearby location."],
    ],
    loot: [
      ["Medical cache", "Medicine and basic aid supplies."],
      ["Ammo box", "Ammunition and weapon maintenance supplies."],
      ["Supply stash", "Food, water and useful survival gear."],
      ["Technical crate", "Scrap, electronics and repair components."],
      ["Locked cache", "A secured container with potentially valuable contents."],
    ],
    discoveries: [
      ["Old trail", "Tracks and signs reveal how something moved through the area."],
      ["Environmental clue", "The surroundings reveal a clue about what happened here."],
      ["Hidden route", "A concealed path may offer another way through the location."],
    ],
    workbenches: {
      weapons: ["Weapons Workbench", "Repair and modify weapons here."],
      armor: ["Armor Workbench", "Repair and modify armor here."],
      power_armor: ["Power Armor Station", "Service power armor here."],
      chemistry: ["Chemistry Station", "Prepare chems and chemical supplies here."],
      cooking: ["Cooking Station", "Prepare food and purified supplies here."],
      robot: ["Robot Workbench", "Repair or modify robotic equipment here."],
    },
    rarity: "Maximum loot rarity",
  },
  ru: {
    trap: "Ловушка", event: "Событие", loot: "Тайник", workbench: "Верстак", discovery: "Находка",
    trapNames: ["Скрытый механизм", "Электрическая ловушка", "Радиационная ловушка", "Сигнальная ловушка"],
    trapDetail: (profile) => `Сложность обнаружения/обезвреживания ${profile.difficulty}; рекомендуемый урон ${profile.damageDice} КУ.`,
    events: [
      ["Сигнал бедствия", "Слабый сигнал бедствия указывает на что-то неподалёку."],
      ["Следы фракции", "Свежие признаки показывают, что здесь недавно прошла фракция."],
      ["Странная передача", "Короткий повторяющийся радиосигнал можно исследовать."],
      ["Странник", "Одинокий путник может иметь информацию, просьбу или товары."],
      ["Брошенное сообщение", "Записка или голозапись указывает на другую точку поблизости."],
    ],
    loot: [
      ["Медицинский тайник", "Медикаменты и базовые средства помощи."],
      ["Ящик боеприпасов", "Боеприпасы и принадлежности для обслуживания оружия."],
      ["Запас провизии", "Еда, вода и полезное снаряжение для выживания."],
      ["Технический ящик", "Лом, электроника и компоненты для ремонта."],
      ["Запертый тайник", "Защищённый контейнер с потенциально ценным содержимым."],
    ],
    discoveries: [
      ["Старый след", "Следы подсказывают, как кто-то или что-то двигалось через эту область."],
      ["Улика окружения", "Обстановка даёт подсказку о том, что здесь произошло."],
      ["Скрытый проход", "Незаметный путь может дать другой способ пройти локацию."],
    ],
    workbenches: {
      weapons: ["Оружейный верстак", "Здесь можно ремонтировать и модифицировать оружие."],
      armor: ["Верстак брони", "Здесь можно ремонтировать и модифицировать броню."],
      power_armor: ["Станция силовой брони", "Здесь можно обслуживать силовую броню."],
      chemistry: ["Химическая станция", "Здесь можно готовить химию и химические материалы."],
      cooking: ["Кулинарная станция", "Здесь можно готовить еду и припасы."],
      robot: ["Робототехнический верстак", "Здесь можно ремонтировать или модифицировать робототехнику."],
    },
    rarity: "Максимальная редкость лута",
  },
  uk: {
    trap: "Пастка", event: "Подія", loot: "Схованка", workbench: "Верстак", discovery: "Знахідка",
    trapNames: ["Прихований механізм", "Електрична пастка", "Радіаційна пастка", "Сигнальна пастка"],
    trapDetail: (profile) => `Складність виявлення/знешкодження ${profile.difficulty}; рекомендована шкода ${profile.damageDice} КУ.`,
    events: [
      ["Сигнал лиха", "Слабкий сигнал лиха вказує на щось неподалік."],
      ["Сліди фракції", "Свіжі ознаки показують, що тут нещодавно пройшла фракція."],
      ["Дивна передача", "Короткий повторюваний радіосигнал можна дослідити."],
      ["Мандрівник", "Самотній мандрівник може мати інформацію, прохання або товари."],
      ["Покинуте повідомлення", "Записка або голозапис вказує на іншу точку поблизу."],
    ],
    loot: [
      ["Медична схованка", "Медикаменти та базові засоби допомоги."],
      ["Ящик боєприпасів", "Боєприпаси та приладдя для обслуговування зброї."],
      ["Запас провізії", "Їжа, вода та корисне спорядження для виживання."],
      ["Технічний ящик", "Брухт, електроніка та компоненти для ремонту."],
      ["Замкнена схованка", "Захищений контейнер із потенційно цінним вмістом."],
    ],
    discoveries: [
      ["Старий слід", "Сліди підказують, як хтось або щось рухалося через цю область."],
      ["Підказка оточення", "Оточення дає підказку про те, що тут сталося."],
      ["Прихований прохід", "Непомітний шлях може дати інший спосіб пройти локацію."],
    ],
    workbenches: {
      weapons: ["Збройовий верстак", "Тут можна ремонтувати й модифікувати зброю."],
      armor: ["Верстак броні", "Тут можна ремонтувати й модифікувати броню."],
      power_armor: ["Станція силової броні", "Тут можна обслуговувати силову броню."],
      chemistry: ["Хімічна станція", "Тут можна готувати хімію та хімічні матеріали."],
      cooking: ["Кулінарна станція", "Тут можна готувати їжу та припаси."],
      robot: ["Робототехнічний верстак", "Тут можна ремонтувати або модифікувати робототехніку."],
    },
    rarity: "Максимальна рідкість луту",
  },
  pl: {
    trap: "Pułapka", event: "Zdarzenie", loot: "Skrytka", workbench: "Warsztat", discovery: "Odkrycie",
    trapNames: ["Ukryty mechanizm", "Pułapka elektryczna", "Pułapka radiacyjna", "Pułapka alarmowa"],
    trapDetail: (profile) => `Trudność wykrycia/rozbrojenia ${profile.difficulty}; sugerowane obrażenia ${profile.damageDice} CD.`,
    events: [
      ["Sygnał alarmowy", "Słaby sygnał alarmowy wskazuje na coś w pobliżu."],
      ["Ślady frakcji", "Świeże znaki sugerują, że niedawno przechodziła tędy frakcja."],
      ["Dziwna transmisja", "Krótki powtarzający się sygnał radiowy można zbadać."],
      ["Wędrowiec", "Samotny podróżnik może mieć informacje, prośbę lub towary."],
      ["Porzucona wiadomość", "Notatka lub holotaśma wskazuje na inny punkt w pobliżu."],
    ],
    loot: [
      ["Skrytka medyczna", "Leki i podstawowe środki pomocy."],
      ["Skrzynka amunicji", "Amunicja i materiały do konserwacji broni."],
      ["Zapasy", "Żywność, woda i przydatny sprzęt survivalowy."],
      ["Skrzynia techniczna", "Złom, elektronika i części naprawcze."],
      ["Zamknięta skrytka", "Zabezpieczony pojemnik z potencjalnie wartościową zawartością."],
    ],
    discoveries: [
      ["Stary trop", "Ślady pokazują, jak ktoś lub coś przemieszczało się przez ten teren."],
      ["Ślad środowiskowy", "Otoczenie daje wskazówkę, co wydarzyło się w tym miejscu."],
      ["Ukryte przejście", "Niewidoczna trasa może dać alternatywną drogę przez lokację."],
    ],
    workbenches: {
      weapons: ["Warsztat broni", "Tutaj można naprawiać i modyfikować broń."],
      armor: ["Warsztat pancerza", "Tutaj można naprawiać i modyfikować pancerz."],
      power_armor: ["Stacja pancerza wspomaganego", "Tutaj można serwisować pancerz wspomagany."],
      chemistry: ["Stacja chemiczna", "Tutaj można przygotowywać chemię i materiały chemiczne."],
      cooking: ["Stacja gotowania", "Tutaj można przygotowywać jedzenie i zapasy."],
      robot: ["Warsztat robotyczny", "Tutaj można naprawiać lub modyfikować robotykę."],
    },
    rarity: "Maksymalna rzadkość łupu",
  },
};

function hashSeed(value) {
  const text = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function randint(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1));
}

function shuffle(rng, values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(rng() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

function overlapsCell(rect, x, y, pad = 0) {
  return x >= Number(rect?.x || 0) - pad
    && x < Number(rect?.x || 0) + Number(rect?.w || 0) + pad
    && y >= Number(rect?.y || 0) - pad
    && y < Number(rect?.y || 0) + Number(rect?.h || 0) + pad;
}

export function normalizeTrapCount(value) {
  return Math.floor(clamp(value ?? 2, 0, 8));
}

export function normalizeTrapLethality(value) {
  const normalized = String(value || "standard").toLowerCase();
  return TRAP_LETHALITIES.includes(normalized) ? normalized : "standard";
}

function occupancyForWasteland(spec, reservedRects = []) {
  const site = buildOpenWastelandSite({ ...spec, type: "wasteland", reservedRects });
  return [
    ...(site.roads || []),
    ...(site.terrain || []),
    ...(site.obstacles || []),
    ...(site.vehicles || []),
    ...(site.trees || []),
    ...reservedRects,
  ];
}

function markerOffset(spec) {
  const type = String(spec?.type || "");
  if (type === "settlement") return buildSettlementHouseLayout(spec).length;
  if (type === "wasteland") return generateProceduralWastelandPoiData(spec).length;
  return 0;
}

function openCells(spec) {
  const type = String(spec?.type || "wasteland");
  let blocked = [];
  if (type === "settlement") {
    const layout = buildSettlementLayout(spec);
    const houses = (layout.houses || []).map(({ x, y, w, h }) => ({ x, y, w, h }));
    blocked = occupancyForWasteland(spec, houses);
    blocked.push(...(layout.routeReservations || []));
  } else if (type === "wasteland") {
    blocked = occupancyForWasteland(spec);
  }

  const cells = [];
  for (let y = 1; y < GRID - 1; y += 1) {
    for (let x = 1; x < GRID - 1; x += 1) {
      if (blocked.some((rect) => overlapsCell(rect, x, y, 0.25))) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

function pickCells(spec, count) {
  const rng = mulberry32(hashSeed(`${spec?.seed || "1"}:${spec?.type || "wasteland"}:${spec?.terrain || "wasteland"}:battlemap-extras-v1`));
  const candidates = shuffle(rng, openCells(spec));
  const chosen = [];
  for (const cell of candidates) {
    if (chosen.some((item) => Math.abs(item.x - cell.x) + Math.abs(item.y - cell.y) < 3)) continue;
    chosen.push(cell);
    if (chosen.length >= count) break;
  }
  if (chosen.length < count) {
    for (const cell of candidates) {
      if (chosen.some((item) => item.x === cell.x && item.y === cell.y)) continue;
      chosen.push(cell);
      if (chosen.length >= count) break;
    }
  }
  return { rng, cells: chosen };
}

function countsForSpec(spec) {
  const density = clamp(spec?.density ?? 0.55, 0.1, 1);
  const wealth = String(spec?.wealth || "standard");
  const lootByWealth = { poor: 1, standard: 2, rich: 3, wealthy: 4 };
  const trapCount = normalizeTrapCount(spec?.trapCount);
  const eventCount = density < 0.35 ? 1 : density < 0.75 ? 2 : 3;
  const lootCount = Math.max(1, Number(lootByWealth[wealth] || 2));
  const discoveryCount = density >= 0.7 ? 1 : 0;
  const workbenchCount = String(spec?.type || "") === "settlement"
    ? 1 + (hashSeed(`${spec?.seed || "1"}:settlement-workbench-count`) % 3)
    : 0;
  return { trapCount, eventCount, lootCount, discoveryCount, workbenchCount };
}

function markerSymbol(kind) {
  if (kind === "trap") return "!";
  if (kind === "event") return "E";
  if (kind === "loot") return "L";
  if (kind === "workbench") return "W";
  return "?";
}

export function generateProceduralBattlemapExtras(spec = {}) {
  const counts = countsForSpec(spec);
  const total = counts.trapCount + counts.eventCount + counts.lootCount + counts.discoveryCount + counts.workbenchCount;
  if (!total) return [];

  const { rng, cells } = pickCells(spec, total);
  const offset = markerOffset(spec);
  const lethality = normalizeTrapLethality(spec?.trapLethality);
  const profile = TRAP_PROFILES[lethality];
  const extras = [];
  let cursor = 0;

  const add = (kind, data = {}) => {
    const cell = cells[cursor++];
    if (!cell) return;
    const marker = offset + extras.length + 1;
    extras.push({
      id: `extra-${kind}-${marker}`,
      kind,
      marker,
      symbol: markerSymbol(kind),
      x: cell.x,
      y: cell.y,
      ...data,
    });
  };

  const trapKinds = ["hidden", "electric", "radiation", "alarm"];
  for (let index = 0; index < counts.trapCount; index += 1) {
    const trapType = trapKinds[Math.floor(rng() * trapKinds.length)];
    add("trap", { trapType, lethality, difficulty: profile.difficulty, damageDice: profile.damageDice, variant: index });
  }

  for (let index = 0; index < counts.eventCount; index += 1) {
    add("event", { variant: randint(rng, 0, COPY.en.events.length - 1) });
  }
  for (let index = 0; index < counts.lootCount; index += 1) {
    add("loot", { variant: randint(rng, 0, COPY.en.loot.length - 1), lootRarity: String(spec?.lootRarity || "r3"), wealth: String(spec?.wealth || "standard") });
  }
  for (let index = 0; index < counts.discoveryCount; index += 1) {
    add("discovery", { variant: randint(rng, 0, COPY.en.discoveries.length - 1) });
  }

  if (counts.workbenchCount) {
    const types = shuffle(rng, Object.keys(COPY.en.workbenches));
    for (let index = 0; index < counts.workbenchCount; index += 1) add("workbench", { workbenchType: types[index % types.length] });
  }

  return extras;
}

export function localizeProceduralBattlemapExtras(extras = [], lang = "en") {
  const language = COPY[lang] ? lang : "en";
  const text = COPY[language];
  return extras.map((extra) => {
    if (extra.kind === "trap") {
      const nameIndex = ["hidden", "electric", "radiation", "alarm"].indexOf(extra.trapType);
      return {
        ...extra,
        category: text.trap,
        name: text.trapNames[Math.max(0, nameIndex)] || text.trap,
        description: text.trapDetail({ difficulty: extra.difficulty, damageDice: extra.damageDice }),
      };
    }
    if (extra.kind === "event") {
      const [name, description] = text.events[extra.variant % text.events.length];
      return { ...extra, category: text.event, name, description };
    }
    if (extra.kind === "loot") {
      const [name, description] = text.loot[extra.variant % text.loot.length];
      return { ...extra, category: text.loot, name, description: `${description} ${text.rarity}: ${String(extra.lootRarity || "r3").toUpperCase()}.` };
    }
    if (extra.kind === "workbench") {
      const [name, description] = text.workbenches[extra.workbenchType] || [text.workbench, ""];
      return { ...extra, category: text.workbench, name, description };
    }
    const [name, description] = text.discoveries[extra.variant % text.discoveries.length];
    return { ...extra, category: text.discovery, name, description };
  });
}

export function generateLocalizedProceduralBattlemapExtras(spec = {}, lang = "en") {
  return localizeProceduralBattlemapExtras(generateProceduralBattlemapExtras(spec), lang);
}
