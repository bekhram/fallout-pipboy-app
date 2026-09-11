import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import { balanceEncounterEnemies, summarizeEncounter } from "./proceduralEncounterBalance.js";
import {
  autoEnemyGroupsForLocation,
  enemyGroupForEntry,
  normalizeEnemyGroup,
} from "./proceduralEnemyGroups.js";

const GRID = 24;

const TEMPLATES = {
  wasteland: [
    { id: "wreckage", marker: "LOOT", names: { en: "Scattered Wreckage", ru: "Разбросанные обломки", uk: "Розкидані уламки", pl: "Rozrzucone wraki" }, desc: { en: "Twisted metal and old cargo are half-buried in the dust.", ru: "Искорёженный металл и старый груз наполовину занесены пылью.", uk: "Покручений метал і старий вантаж наполовину засипані пилом.", pl: "Poskręcany metal i stary ładunek są częściowo zasypane pyłem." }, finds: { en: "scrap, ammunition, tools", ru: "лом, боеприпасы, инструменты", uk: "брухт, боєприпаси, інструменти", pl: "złom, amunicja, narzędzia" } },
    { id: "checkpoint", marker: "ENEMY", names: { en: "Ruined Checkpoint", ru: "Разрушенный блокпост", uk: "Зруйнований блокпост", pl: "Zrujnowany punkt kontrolny" }, desc: { en: "Concrete barriers and a collapsed guard post overlook the open ground.", ru: "Бетонные заграждения и рухнувший пост охраны контролируют открытую местность.", uk: "Бетонні загородження та зруйнований пост охорони виходять на відкриту місцевість.", pl: "Betonowe bariery i zawalony posterunek górują nad otwartym terenem." }, finds: { en: "weapons, ammo, military salvage", ru: "оружие, патроны, военный лом", uk: "зброя, набої, військовий брухт", pl: "broń, amunicja, wojskowy złom" } },
    { id: "camp", marker: "LOOT", names: { en: "Abandoned Camp", ru: "Брошенный лагерь", uk: "Покинутий табір", pl: "Opuszczony obóz" }, desc: { en: "A cold fire pit, torn bedrolls and improvised storage remain here.", ru: "Здесь остались потухший костёр, рваные спальники и самодельные тайники.", uk: "Тут лишилися згасле вогнище, порвані спальники та саморобні сховки.", pl: "Zostało tu wygasłe ognisko, podarte posłania i prowizoryczne schowki." }, finds: { en: "food, water, chems, notes", ru: "еда, вода, химия, записки", uk: "їжа, вода, хімія, записки", pl: "żywność, woda, chemikalia, notatki" } },
    { id: "crater", marker: "LOOT", names: { en: "Blast Crater", ru: "Воронка", uk: "Воронка", pl: "Krater po wybuchu" }, desc: { en: "The crater rim hides debris that was thrown outward by an old explosion.", ru: "На краях воронки лежат обломки, выброшенные давним взрывом.", uk: "На краях воронки лежать уламки, викинуті давнім вибухом.", pl: "Na krawędzi krateru leżą szczątki wyrzucone dawną eksplozją." }, finds: { en: "rare scrap, irradiated salvage", ru: "редкий лом, облучённые находки", uk: "рідкісний брухт, опромінені знахідки", pl: "rzadki złom, napromieniowane znaleziska" } },
    { id: "caravan", marker: "LOOT", names: { en: "Lost Caravan", ru: "Погибший караван", uk: "Загиблий караван", pl: "Zaginiona karawana" }, desc: { en: "Broken crates and pack frames mark where a caravan was stopped.", ru: "Разбитые ящики и вьючные рамы отмечают место гибели каравана.", uk: "Розбиті ящики та в'ючні рами позначають місце загибелі каравану.", pl: "Rozbite skrzynie i stelaże juczne znaczą miejsce zatrzymania karawany." }, finds: { en: "trade goods, caps, medicine", ru: "товары, крышки, медикаменты", uk: "товари, кришки, медикаменти", pl: "towary, kapsle, medykamenty" } },
    { id: "radio", marker: "TERMINAL", names: { en: "Broken Relay", ru: "Сломанный ретранслятор", uk: "Зламаний ретранслятор", pl: "Uszkodzony przekaźnik" }, desc: { en: "A rusted communications mast still has sealed service boxes at its base.", ru: "У ржавой мачты связи у основания сохранились закрытые сервисные ящики.", uk: "Біля іржавої щогли зв'язку вціліли закриті сервісні ящики.", pl: "U podstawy zardzewiałego masztu pozostały zamknięte skrzynki serwisowe." }, finds: { en: "electronics, holotapes, energy cells", ru: "электроника, голозаписи, энергоячейки", uk: "електроніка, голозаписи, енергоосередки", pl: "elektronika, holotaśmy, ogniwa energetyczne" } },
  ],
  forest: [
    { id: "dead_grove", marker: "LOOT", names: { en: "Dead Grove", ru: "Мёртвая роща", uk: "Мертвий гай", pl: "Martwy zagajnik" }, desc: { en: "Dense dead trunks conceal old bones, nests and discarded packs.", ru: "Густые мёртвые стволы скрывают старые кости, гнёзда и брошенные сумки.", uk: "Густі мертві стовбури приховують старі кістки, гнізда та покинуті сумки.", pl: "Gęste martwe pnie skrywają stare kości, gniazda i porzucone torby." }, finds: { en: "herbs, hides, buried packs", ru: "растения, шкуры, спрятанные сумки", uk: "рослини, шкури, сховані сумки", pl: "zioła, skóry, ukryte torby" } },
    { id: "hunter", marker: "ENEMY", names: { en: "Hunter Blind", ru: "Охотничья засидка", uk: "Мисливська засідка", pl: "Ambona myśliwska" }, desc: { en: "A raised blind watches a narrow trail through the trees.", ru: "Приподнятая засидка смотрит на узкую тропу между деревьями.", uk: "Піднята засідка дивиться на вузьку стежку між деревами.", pl: "Podwyższona ambona obserwuje wąską ścieżkę między drzewami." }, finds: { en: "ammo, hunting gear, meat", ru: "патроны, охотничье снаряжение, мясо", uk: "набої, мисливське спорядження, м'ясо", pl: "amunicja, sprzęt łowiecki, mięso" } },
    { id: "nest", marker: "ENEMY", names: { en: "Creature Nest", ru: "Логово существа", uk: "Лігво істоти", pl: "Gniazdo stworzenia" }, desc: { en: "Broken branches and dragged remains form a defended nest.", ru: "Сломанные ветки и растасканные останки образуют защищённое логово.", uk: "Зламані гілки та розтягнуті рештки утворюють захищене лігво.", pl: "Połamane gałęzie i szczątki tworzą bronione gniazdo." }, finds: { en: "bones, hides, swallowed valuables", ru: "кости, шкуры, проглоченные ценности", uk: "кістки, шкури, проковтнуті цінності", pl: "kości, skóry, połknięte kosztowności" } },
    { id: "ranger", marker: "LOOT", names: { en: "Collapsed Ranger Post", ru: "Разрушенный пост рейнджеров", uk: "Зруйнований пост рейнджерів", pl: "Zawalony posterunek strażników" }, desc: { en: "A small lookout hut has collapsed beneath dead branches.", ru: "Небольшая наблюдательная хижина рухнула под мёртвыми ветвями.", uk: "Невелика спостережна хатина завалилася під мертвими гілками.", pl: "Mała budka obserwacyjna zawaliła się pod martwymi gałęziami." }, finds: { en: "maps, survival gear, medical supplies", ru: "карты, снаряжение выживания, медикаменты", uk: "карти, спорядження для виживання, медикаменти", pl: "mapy, sprzęt survivalowy, medykamenty" } },
  ],
  swamp: [
    { id: "sunken", marker: "LOOT", names: { en: "Sunken Wreck", ru: "Затонувшие обломки", uk: "Затонулі уламки", pl: "Zatopiony wrak" }, desc: { en: "Metal wreckage protrudes from black water and reeds.", ru: "Металлические обломки торчат из чёрной воды и камыша.", uk: "Металеві уламки стирчать із чорної води та очерету.", pl: "Metalowy wrak wystaje z czarnej wody i trzcin." }, finds: { en: "sealed containers, scrap, chems", ru: "герметичные контейнеры, лом, химия", uk: "герметичні контейнери, брухт, хімія", pl: "szczelne pojemniki, złom, chemikalia" } },
    { id: "mire", marker: "ENEMY", names: { en: "Mire Nest", ru: "Болотное логово", uk: "Болотяне лігво", pl: "Bagienne gniazdo" }, desc: { en: "Tracks and shells converge on a muddy nesting ground.", ru: "Следы и панцири сходятся к грязному месту гнездования.", uk: "Сліди та панцирі сходяться до багнистого місця гніздування.", pl: "Ślady i pancerze prowadzą do błotnistego lęgowiska." }, finds: { en: "shells, meat, buried objects", ru: "панцири, мясо, утонувшие предметы", uk: "панцирі, м'ясо, затонулі предмети", pl: "pancerze, mięso, zatopione przedmioty" } },
    { id: "shack", marker: "MEDS", names: { en: "Flooded Shack", ru: "Затопленная хижина", uk: "Затоплена хатина", pl: "Zalana chata" }, desc: { en: "A leaning shack remains barely above the waterline.", ru: "Покосившаяся хижина едва возвышается над водой.", uk: "Похилена хатина ледь височіє над водою.", pl: "Przechylona chata ledwie wystaje ponad wodę." }, finds: { en: "food, medicine, personal stash", ru: "еда, медикаменты, личный тайник", uk: "їжа, медикаменти, особиста схованка", pl: "żywność, medykamenty, prywatny schowek" } },
  ],
  ruins: [
    { id: "storefront", marker: "LOOT", names: { en: "Collapsed Storefront", ru: "Обрушенный магазин", uk: "Зруйнована крамниця", pl: "Zawalony sklep" }, desc: { en: "A broken storefront opens into a pocket of searchable debris.", ru: "Разбитая витрина ведёт к куче обломков, которую можно обыскать.", uk: "Розбита вітрина веде до купи уламків, яку можна обшукати.", pl: "Rozbita witryna prowadzi do sterty gruzu nadającego się do przeszukania." }, finds: { en: "consumer goods, caps, food", ru: "товары, крышки, еда", uk: "товари, кришки, їжа", pl: "towary, kapsle, żywność" } },
    { id: "alley", marker: "ENEMY", names: { en: "Blocked Alley", ru: "Перекрытый переулок", uk: "Перекритий провулок", pl: "Zablokowana alejka" }, desc: { en: "Barricades and rubble make a natural ambush point.", ru: "Баррикады и завалы создают естественное место для засады.", uk: "Барикади та завали створюють природне місце для засідки.", pl: "Barykady i gruzy tworzą naturalne miejsce zasadzki." }, finds: { en: "weapons, armor pieces, hidden cache", ru: "оружие, части брони, тайник", uk: "зброя, частини броні, схованка", pl: "broń, części pancerza, skrytka" } },
    { id: "office", marker: "TERMINAL", names: { en: "Exposed Office", ru: "Открытый офис", uk: "Відкритий офіс", pl: "Odsłonięte biuro" }, desc: { en: "A surviving office corner contains desks, cabinets and terminals.", ru: "Уцелевший угол офиса содержит столы, шкафы и терминалы.", uk: "Вцілілий кут офісу містить столи, шафи та термінали.", pl: "Ocalały fragment biura zawiera biurka, szafy i terminale." }, finds: { en: "records, electronics, locked storage", ru: "документы, электроника, закрытые шкафы", uk: "документи, електроніка, замкнені шафи", pl: "dokumenty, elektronika, zamknięte szafki" } },
  ],
};

const FALLBACK_TERRAIN = "wasteland";
const ANCHORS = [
  [4, 4], [11, 4], [19, 5], [5, 11], [15, 11], [20, 14], [5, 19], [13, 19], [20, 20],
];

function hashSeed(value) {
  const source = String(value ?? "0");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function mulberry32(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pick(rng, list) { return list[Math.min(list.length - 1, Math.floor(rng() * list.length))]; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function countEnemies(enemies = []) { return enemies.reduce((sum, enemy) => sum + Math.max(0, Math.floor(Number(enemy?.count || 0))), 0); }
function langCode(value) { const code = String(value || "en").toLowerCase().split("-")[0]; return ["en", "ru", "uk", "pl"].includes(code) ? code : "en"; }

function entryXp(entry) {
  const value = Number(entry?.baseXp ?? entry?.xp ?? entry?.experience ?? 0);
  return Number.isFinite(value) && value > 0 ? value : Math.max(5, Number(entry?.level || 1) * 10);
}

function candidateEntries(group) {
  const exact = BESTIARY_ENTRIES.filter((entry) => enemyGroupForEntry(entry) === group);
  return exact.length ? exact : BESTIARY_ENTRIES.filter((entry) => ["raider", "ghoul", "insect", "mole_rat"].includes(enemyGroupForEntry(entry)));
}

function chooseEnemyGroup(spec, rng, index) {
  const configured = normalizeEnemyGroup(spec?.enemyFaction || "auto");
  if (configured !== "auto") return configured;
  const groups = autoEnemyGroupsForLocation("wasteland");
  return groups[(Math.floor(rng() * groups.length) + index) % groups.length] || "raider";
}

function seedEnemy(spec, rng, group, index) {
  const entries = candidateEntries(group).slice().sort((a, b) => entryXp(a) - entryXp(b));
  const band = entries.slice(0, Math.max(1, Math.min(6, entries.length)));
  const entry = pick(rng, band) || entries[0] || BESTIARY_ENTRIES[0];
  if (!entry) return null;
  const level = Math.max(1, Number(entry?.level || 1));
  return {
    type: String(entry?.name || "Wasteland Enemy"),
    npcId: String(entry?.id || ""),
    candidates: [String(entry?.name || "Wasteland Enemy")],
    enemyGroup: group,
    count: 1,
    rank: "standard",
    level,
    baseLevel: level,
    originalLevel: level,
    baseXp: entryXp(entry),
    xp: entryXp(entry),
    sourcePoiIndex: index,
  };
}

function templateSet(terrain) {
  return TEMPLATES[terrain] || TEMPLATES[FALLBACK_TERRAIN];
}

function buildSeedPois(spec = {}) {
  const terrain = String(spec?.terrain || "wasteland").toLowerCase();
  const rng = mulberry32(hashSeed(`${spec?.seed || "1"}:${terrain}:wasteland-poi-v1`));
  const templates = templateSet(terrain);
  const density = clamp(spec?.density ?? 0.55, 0.1, 1);
  const desired = Math.max(4, Math.min(7, 4 + Math.round(density * 3)));
  const anchorOffset = hashSeed(`${spec?.seed || "1"}:poi-anchor`) % ANCHORS.length;
  const pois = [];

  for (let index = 0; index < desired; index += 1) {
    const template = templates[index % templates.length] || templates[0];
    const anchor = ANCHORS[(index + anchorOffset) % ANCHORS.length];
    const x = clamp(anchor[0] + Math.floor(rng() * 3) - 1, 2, GRID - 3);
    const y = clamp(anchor[1] + Math.floor(rng() * 3) - 1, 2, GRID - 3);
    const group = chooseEnemyGroup(spec, rng, index);
    const hasEnemySeed = index < 2 || template.marker === "ENEMY" || rng() < 0.38;
    const enemy = hasEnemySeed ? seedEnemy(spec, rng, group, index) : null;
    const markers = [template.marker || "LOOT"];
    if (enemy && !markers.includes("ENEMY")) markers.push("ENEMY");
    pois.push({
      id: `poi-${index + 1}`,
      poiType: template.id,
      x,
      y,
      radius: terrain === "forest" ? 3 : 2,
      markers,
      enemies: enemy ? [enemy] : [],
      enemyGroup: enemy ? group : "",
      loot: [],
      template,
    });
  }
  return pois;
}

export function generateProceduralWastelandPoiData(spec = {}) {
  return balanceEncounterEnemies(spec, buildSeedPois(spec));
}

export function generateProceduralWastelandEncounterSummary(spec = {}) {
  return summarizeEncounter(spec, generateProceduralWastelandPoiData(spec));
}

export function localizeProceduralWastelandPois(data = [], language = "en") {
  const lang = langCode(language);
  const copy = {
    en: { search: "Search", threat: "Threat", clear: "No obvious hostiles", enemies: "Enemies" },
    ru: { search: "Можно найти", threat: "Угроза", clear: "Явных врагов нет", enemies: "Враги" },
    uk: { search: "Можна знайти", threat: "Загроза", clear: "Явних ворогів немає", enemies: "Вороги" },
    pl: { search: "Można znaleźć", threat: "Zagrożenie", clear: "Brak widocznych wrogów", enemies: "Wrogowie" },
  }[lang];
  return data.map((poi) => {
    const template = poi.template || templateSet("wasteland")[0];
    const enemyCount = countEnemies(poi.enemies);
    return {
      ...poi,
      name: template.names?.[lang] || template.names?.en || poi.poiType,
      description: template.desc?.[lang] || template.desc?.en || "",
      finds: template.finds?.[lang] || template.finds?.en || "",
      lines: [
        template.desc?.[lang] || template.desc?.en || "",
        `${copy.search}: ${template.finds?.[lang] || template.finds?.en || "—"}.`,
        enemyCount ? `${copy.threat}: ${copy.enemies} ×${enemyCount}.` : `${copy.threat}: ${copy.clear}.`,
      ],
    };
  });
}

export function generateLocalizedProceduralWastelandPois(spec = {}, language = "en") {
  return localizeProceduralWastelandPois(generateProceduralWastelandPoiData(spec), language);
}

export function cellsAroundWastelandPoi(poi, cols = GRID, rows = GRID) {
  const cx = Math.floor(Number(poi?.x || 0));
  const cy = Math.floor(Number(poi?.y || 0));
  const radius = Math.max(1, Math.floor(Number(poi?.radius || 2)));
  const cells = [];
  for (let ring = 0; ring <= radius; ring += 1) {
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        cells.push({ x, y });
      }
    }
  }
  return cells;
}
