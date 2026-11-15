import { POWER_ARMOR_PLATING, POWER_ARMOR_SETS, POWER_ARMOR_SYSTEMS, POWER_ARMOR_UPGRADES } from "./powerArmor.js";
import { localizeRecipeGroup } from "./recipeCatalogStrings.js";

const POWER_NAMES = {
  ru: { excavator: "Силовая броня Экскаватор", hellcat: "Силовая броня Hellcat", t65: "Силовая броня T-65", raider: "Рейдерская силовая броня", t45: "Силовая броня T-45", t51: "Силовая броня T-51", t60: "Силовая броня T-60", x01: "Силовая броня X-01", titanium: "Титановое покрытие", lead: "Свинцовое покрытие", photovoltaic: "Фотовольтаическое покрытие", winterized: "Зимнее покрытие", prism: "Призматическая защита", explosive: "Взрывозащитное покрытие", emp: "ЭМИ-защита", "rad-scrubber": "Очиститель радиации", "sensor-array": "Сенсорный комплекс", "targeting-hud": "Система наведения", "internal-database": "Внутренняя база данных", "welded-rebar": "Приваренная арматура", "core-assembly": "Узел ядра", "blood-cleanser": "Очиститель крови", "emergency-protocols": "Аварийные протоколы", "motion-assist": "Сервоприводы движения", "kinetic-dynamo": "Кинетическая динамо-машина", "medic-pump": "Медицинский насос", "reactive-plates": "Реактивные пластины", "tesla-coils": "Катушки Тесла", "stealth-boy": "Стелс-бой", jetpack: "Реактивный ранец", "rusty-knuckles": "Ржавые кастеты", "hydraulic-bracers": "Гидравлические наручи", "optimized-bracers": "Оптимизированные наручи", "tesla-bracers": "Наручи Тесла", "calibrated-shocks": "Калиброванные амортизаторы", "explosive-vent": "Взрывной клапан", "overdrive-servos": "Форсированные сервоприводы" },
  uk: { excavator: "Силова броня Екскаватор", hellcat: "Силова броня Hellcat", t65: "Силова броня T-65", raider: "Рейдерська силова броня", t45: "Силова броня T-45", t51: "Силова броня T-51", t60: "Силова броня T-60", x01: "Силова броня X-01", titanium: "Титанове покриття", lead: "Свинцеве покриття", photovoltaic: "Фотоелектричне покриття", winterized: "Зимове покриття", prism: "Призматичний захист", explosive: "Вибухозахисне покриття", emp: "ЕМІ-захист", "rad-scrubber": "Очищувач радіації", "sensor-array": "Сенсорний комплекс", "targeting-hud": "Система наведення", "internal-database": "Внутрішня база даних", "welded-rebar": "Приварена арматура", "core-assembly": "Вузол ядра", "blood-cleanser": "Очищувач крові", "emergency-protocols": "Аварійні протоколи", "motion-assist": "Сервоприводи руху", "kinetic-dynamo": "Кінетична динамо-машина", "medic-pump": "Медичний насос", "reactive-plates": "Реактивні пластини", "tesla-coils": "Котушки Тесли", "stealth-boy": "Стелс-бой", jetpack: "Реактивний ранець", "rusty-knuckles": "Іржаві кастети", "hydraulic-bracers": "Гідравлічні наручі", "optimized-bracers": "Оптимізовані наручі", "tesla-bracers": "Наручі Тесли", "calibrated-shocks": "Калібровані амортизатори", "explosive-vent": "Вибуховий клапан", "overdrive-servos": "Форсовані сервоприводи" },
  pl: { excavator: "Pancerz wspomagany Excavator", hellcat: "Pancerz wspomagany Hellcat", t65: "Pancerz wspomagany T-65", raider: "Pancerz wspomagany bandytów", t45: "Pancerz wspomagany T-45", t51: "Pancerz wspomagany T-51", t60: "Pancerz wspomagany T-60", x01: "Pancerz wspomagany X-01", titanium: "Powłoka tytanowa", lead: "Powłoka ołowiana", photovoltaic: "Powłoka fotowoltaiczna", winterized: "Powłoka zimowa", prism: "Osłona pryzmatyczna", explosive: "Osłona przeciwwybuchowa", emp: "Osłona EMP", "rad-scrubber": "Oczyszczacz radiacyjny", "sensor-array": "Zespół czujników", "targeting-hud": "System celowniczy HUD", "internal-database": "Wewnętrzna baza danych", "welded-rebar": "Spawane pręty", "core-assembly": "Zespół rdzenia", "blood-cleanser": "Oczyszczacz krwi", "emergency-protocols": "Protokoły awaryjne", "motion-assist": "Serwomechanizmy ruchu", "kinetic-dynamo": "Dynamo kinetyczne", "medic-pump": "Pompa medyczna", "reactive-plates": "Płyty reaktywne", "tesla-coils": "Cewki Tesli", "stealth-boy": "Stealth Boy", jetpack: "Plecak odrzutowy", "rusty-knuckles": "Rdzawe kastety", "hydraulic-bracers": "Hydrauliczne karwasze", "optimized-bracers": "Zoptymalizowane karwasze", "tesla-bracers": "Karwasze Tesli", "calibrated-shocks": "Kalibrowane amortyzatory", "explosive-vent": "Zawór wybuchowy", "overdrive-servos": "Serwomechanizmy nadbiegu" },
};

export const POWER_PART_NAMES = {
  en: { head: "Helmet", torso: "Chest piece", arm: "Arm", leg: "Leg" },
  ru: { head: "Шлем", torso: "Нагрудник", arm: "Рука", leg: "Нога" },
  uk: { head: "Шолом", torso: "Нагрудник", arm: "Рука", leg: "Нога" },
  pl: { head: "Hełm", torso: "Napierśnik", arm: "Ramię", leg: "Noga" },
};

const LANG_INDEX = { ru: 0, uk: 1, pl: 2 };

const EXTRA_NAMES = {
  "titus-t60": ["Закалённая T-60 рыцаря Титуса", "Загартована T-60 лицаря Тітуса", "Hartowany pancerz T-60 rycerza Titusa"],
  at0m: ["Силовая броня AT-0M", "Силова броня AT-0M", "Pancerz wspomagany AT-0M"],
  "titus-tempered": ["Закалённая подкладка Титуса", "Загартована підкладка Тітуса", "Hartowana wyściółka Titusa"],
  "integrated-flight-system": ["Встроенная система полёта T-60", "Вбудована система польоту T-60", "Zintegrowany system lotu T-60"],
  "at0m-tendrils": ["Биомеханические щупальца с лезвиями", "Біомеханічні щупальця з лезами", "Biomechaniczne macki z ostrzami"],
};

export function localizePowerArmorName(entry, language) {
  return POWER_NAMES[language]?.[entry?.id] || EXTRA_NAMES[entry?.id]?.[LANG_INDEX[language]] || entry?.name || "";
}

export function localizePowerArmorUpgradeModel(name, language) {
  return name === "Raider II"
    ? ({ ru: "Рейдерская II", uk: "Рейдерська II", pl: "Bandytów II" })[language] || name
    : name;
}

const EFFECTS = {
  photovoltaic: ["В начале сцены под прямым солнечным светом получите 1 ОД (один раз).", "На початку сцени під прямим сонячним світлом отримайте 1 ОД (один раз).", "Na początku sceny w bezpośrednim świetle słonecznym zyskaj 1 PA (raz)."],
  explosive: ["+2 ко всем сопротивлениям против оружия со свойством «Взрыв».", "+2 до всіх опорів проти зброї з властивістю «Вибух».", "+2 do wszystkich odporności przeciw broni z cechą Wybuch."],
  "rad-scrubber": ["При работающей броне игнорируйте радиацию от облучённой еды и напитков.", "При ввімкненій броні ігноруйте радіацію від опроміненої їжі й напоїв.", "Gdy pancerz jest zasilany, ignoruj promieniowanie ze skażonej żywności i napojów."],
  "sensor-array": ["При работающей броне можно перебросить 1d20 в проверке Восприятия.", "При ввімкненій броні можна перекинути 1d20 у перевірці Сприйняття.", "Gdy pancerz jest zasilany, możesz przerzucić 1k20 w teście Percepcji."],
  "targeting-hud": ["При работающей броне после прицеливания можно выполнить второе малое действие за 0 ОД.", "При ввімкненій броні після прицілювання можна виконати другу малу дію за 0 ОД.", "Gdy pancerz jest zasilany, po celowaniu możesz wykonać drugą akcję pomniejszą za 0 PA."],
  "internal-database": ["При работающей броне можно перебросить 1d20 в проверке Интеллекта.", "При ввімкненій броні можна перекинути 1d20 у перевірці Інтелекту.", "Gdy pancerz jest zasilany, możesz przerzucić 1k20 w teście Inteligencji."],
  "welded-rebar": ["Осложнение при атаке врага в ближнем бою или без оружия наносит ему 2 КБ урона.", "Ускладнення під час атаки ворога в ближньому бою або без зброї завдає йому 2 КБ ушкоджень.", "Komplikacja przy ataku wręcz lub bez broni zadaje przeciwnikowi 2 KB obrażeń."],
  "core-assembly": ["Если в начале вашего хода общий запас ОД пуст, добавьте в него 1 ОД.", "Якщо на початку вашого ходу спільний запас ОД порожній, додайте до нього 1 ОД.", "Jeśli na początku twojej tury wspólna pula PA jest pusta, dodaj do niej 1 PA."],
  "blood-cleanser": ["При работающей броне можно перебросить проверку зависимости от химикатов.", "При ввімкненій броні можна перекинути перевірку залежності від хімікатів.", "Gdy pancerz jest zasilany, możesz powtórzyć test uzależnienia od chemikaliów."],
  "emergency-protocols": ["При работающей броне и менее четверти максимального HP получите +1 к Защите и +3 ко всем сопротивлениям.", "При ввімкненій броні й менш ніж чверті максимального HP отримайте +1 до Захисту та +3 до всіх опорів.", "Gdy pancerz jest zasilany i masz mniej niż jedną czwartą maks. PW, zyskaj +1 do Obrony i +3 do wszystkich odporności."],
  "motion-assist": ["Сила работающего каркаса становится равной 13.", "Сила ввімкненого каркаса стає рівною 13.", "Siła zasilanej ramy pancerza wynosi 13."],
  "kinetic-dynamo": ["Получив урон, добавьте 1 ОД в общий запас.", "Отримавши ушкодження, додайте 1 ОД до спільного запасу.", "Po otrzymaniu obrażeń dodaj 1 PA do wspólnej puli."],
  "medic-pump": ["Автоматически расходует стимулятор, когда HP падает ниже половины максимума.", "Автоматично витрачає стимулятор, коли HP падає нижче половини максимуму.", "Automatycznie zużywa stimpak, gdy PW spadną poniżej połowy maksimum."],
  "reactive-plates": ["Атакующий в ближнем бою получает физический урон в размере половины выброшенного им урона.", "Нападник у ближньому бою отримує фізичні ушкодження в розмірі половини викинутих ним ушкоджень.", "Atakujący wręcz otrzymuje obrażenia fizyczne równe połowie wyrzuconych przez siebie obrażeń."],
  "tesla-coils": ["Враги, атакующие в ближнем бою, получают 4 КБ энергетического урона.", "Вороги, що атакують у ближньому бою, отримують 4 КБ енергетичних ушкоджень.", "Przeciwnicy atakujący wręcz otrzymują 4 KB obrażeń energetycznych."],
  "stealth-boy": ["Раз за сцену потратьте 1 заряд, чтобы активировать Стелс-бой.", "Раз за сцену витратьте 1 заряд, щоб активувати Стелс-бой.", "Raz na scenę wydaj 1 ładunek, aby aktywować Stealth Boya."],
  jetpack: ["Потратьте 1 заряд, чтобы переместиться ещё на одну зону или совершить ударное приземление.", "Витратьте 1 заряд, щоб переміститися ще на одну зону або виконати ударне приземлення.", "Wydaj 1 ładunek, aby przemieścić się o dodatkową strefę lub wykonać uderzenie przy lądowaniu."],
  "rusty-knuckles": ["Атаки без оружия получают эффект «Продолжительный».", "Атаки без зброї отримують ефект «Тривалий».", "Ataki bez broni zyskują efekt Trwały."],
  "hydraulic-bracers": ["При работающей броне атаки без оружия наносят +2 КБ урона.", "При ввімкненій броні атаки без зброї завдають +2 КБ ушкоджень.", "Gdy pancerz jest zasilany, ataki bez broni zadają +2 KB obrażeń."],
  "optimized-bracers": ["При работающей броне на дополнительный урон в ближнем бою можно потратить до 4 ОД.", "При ввімкненій броні на додаткові ушкодження в ближньому бою можна витратити до 4 ОД.", "Gdy pancerz jest zasilany, możesz wydać do 4 PA na dodatkowe obrażenia wręcz."],
  "tesla-bracers": ["При работающей броне атаки без оружия наносят +2 КБ энергетического урона.", "При ввімкненій броні атаки без зброї завдають +2 КБ енергетичних ушкоджень.", "Gdy pancerz jest zasilany, ataki bez broni zadają +2 KB obrażeń energetycznych."],
  "calibrated-shocks": ["Переносимый вес увеличивается на 50.", "Переносима вага збільшується на 50.", "Udźwig wzrasta o 50."],
  "explosive-vent": ["Ударное приземление наносит урон существам и объектам на близкой дистанции.", "Ударне приземлення завдає ушкоджень істотам і об’єктам на близькій дистанції.", "Uderzenie przy lądowaniu rani istoty i uszkadza obiekty w bliskim zasięgu."],
  "overdrive-servos": ["Во время рывка потратьте 2 ОД, чтобы переместиться ещё на одну зону.", "Під час ривка витратьте 2 ОД, щоб переміститися ще на одну зону.", "Podczas sprintu wydaj 2 PA, aby przemieścić się o kolejną strefę."],
  "titus-tempered": ["Защита этой подкладки уже учтена в параметрах брони Титуса.", "Захист цієї підкладки вже враховано в характеристиках броні Тітуса.", "Ochrona tej wyściółki jest już uwzględniona w statystykach zbroi Titusa."],
  "integrated-flight-system": ["Большое действие: дополнительно к проверке управления бронёй сделайте проверку ВОС + Пилотирование со сложностью, равной числу зон полёта. При успехе долетите до цели. При провале бросьте 4 КБ: пролетите число зон по выпавшим эффектам, затем упадите и получите выпавший урон.", "Велика дія: додатково до перевірки керування бронею зробіть перевірку СПР + Пілотування зі складністю, рівною кількості зон польоту. За успіху долетіть до цілі. За невдачі киньте 4 КБ: пролетіть кількість зон за результатом ефектів, потім упадіть і отримайте викинуті ушкодження.", "Akcja główna: oprócz testu obsługi pancerza wykonaj test PER + Pilotowanie o trudności równej liczbie stref lotu. Przy sukcesie doleć do celu. Przy porażce rzuć 4 KB: przeleć tyle stref, ile wypadło efektów, po czym rozbij się i otrzymaj wyrzucone obrażenia."],
  "at0m-tendrils": ["При работающей броне: атака ближнего боя, 10 КБ физического урона, «Пробивание», «Жестокий», «Разрушение», «Парирование». Для установки нужна Наука.", "При ввімкненій броні: атака ближнього бою, 10 КБ фізичних ушкоджень, «Пробивання», «Жорстокий», «Руйнування», «Парирування». Для встановлення потрібна Наука.", "Gdy pancerz jest zasilany: atak wręcz, 10 KB obrażeń fizycznych, Przebicie, Zaciekły, Niszczenie, Parowanie. Montaż wymaga Nauki."],
};

export function localizePowerArmorEffect(entry, language) {
  return EFFECTS[entry?.id]?.[LANG_INDEX[language]] || entry?.effect || "";
}

const MODS_BY_ID = new Map(
  [...POWER_ARMOR_UPGRADES, ...POWER_ARMOR_PLATING, ...POWER_ARMOR_SYSTEMS].map((mod) => [mod.id, mod])
);
const SETS_BY_NAME = new Map(POWER_ARMOR_SETS.map((set) => [set.name, set]));

const SLOT_LABELS = {
  ru: { Head: "Голова", Torso: "Торс", "Left Arm": "Левая рука", "Right Arm": "Правая рука", "Left Leg": "Левая нога", "Right Leg": "Правая нога", All: "Всё тело" },
  uk: { Head: "Голова", Torso: "Тулуб", "Left Arm": "Ліва рука", "Right Arm": "Права рука", "Left Leg": "Ліва нога", "Right Leg": "Права нога", All: "Усе тіло" },
  pl: { Head: "Głowa", Torso: "Tułów", "Left Arm": "Lewa ręka", "Right Arm": "Prawa ręka", "Left Leg": "Lewa noga", "Right Leg": "Prawa noga", All: "Całe ciało" },
};

function localizedUpgradePart(mod, language) {
  return `${localizePowerArmorUpgradeModel(mod.model, language)} — ${POWER_PART_NAMES[language][mod.type]}`;
}

export function localizePowerArmorInventoryItem(item, name, effect, language) {
  const index = LANG_INDEX[language];
  if (index === undefined || !item) return null;
  if (item.sourceType === "power_armor") {
    const slot = SLOT_LABELS[language][item.armorLocations];
    if (item.sourceId === "power-armor:frame") {
      return {
        displayName: ["Каркас силовой брони", "Каркас силової броні", "Rama pancerza wspomaganego"][index],
        displayEffect: ["Надетый каркас силовой брони", "Одягнений каркас силової броні", "Założona rama pancerza wspomaganego"][index],
        displayArmorLocations: slot,
      };
    }
    const [setName] = name.split(" — ", 2);
    const set = SETS_BY_NAME.get(setName);
    if (!set || !slot) return null;
    let displayEffect = effect;
    if (displayEffect) {
      for (const mod of MODS_BY_ID.values()) {
        if (mod.effect && displayEffect.includes(mod.effect)) {
          displayEffect = displayEffect.replace(mod.effect, localizePowerArmorEffect(mod, language));
        }
      }
    }
    return { displayName: `${localizePowerArmorName(set, language)} — ${slot}`, displayEffect, displayArmorLocations: slot };
  }

  if (item.sourceType !== "power_armor_mod" && item.craftingWorkbench !== "power_armor") return null;
  let mod = MODS_BY_ID.get(item.sourceId);
  const [legacyName] = name.split(" — ", 2);
  if (!mod) {
    mod = [...POWER_ARMOR_SYSTEMS, ...POWER_ARMOR_PLATING].find((entry) => entry.name === legacyName.split(" (")[0]);
  }
  if (!mod) return null;
  return {
    displayName: mod.model ? localizedUpgradePart(mod, language) : `${localizePowerArmorName(mod, language)} — ${localizeRecipeGroup(
      POWER_ARMOR_PLATING.includes(mod) ? "POWER ARMOR PLATING" : "POWER ARMOR SYSTEMS",
      language
    )}`,
    displayEffect: localizePowerArmorEffect(mod, language),
  };
}
