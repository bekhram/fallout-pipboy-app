import { PhaserToken } from "../phaser/PhaserAsset.jsx";
import DiceRollModal from "../dice/DiceRollModal.jsx";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import { getBestiaryTokenUrl } from "../../utils/bestiaryTokens.js";
import { buildNpcAttackRollConfig, effectiveAttackProfile, normalizeStructuredAttack, normalizeWeaponAttack, parseAttackText, parseCombatAbilityAttacks } from "../../utils/npcCombat.js";
import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import TacticalEnemyManager from "./TacticalEnemyManager.jsx";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import GmBattlemapExtrasPanel from "./GmBattlemapExtrasPanel.jsx";
import WastelandPoiPortal from "./WastelandPoiPortal.jsx";
import ProceduralBattlemapExtraPortal from "./ProceduralBattlemapExtraPortal.jsx";
import SettlementRoomMarkerPortal from "./SettlementRoomMarkerPortal.jsx";
import SuperDuperMartRoomMarkerPortal from "./SuperDuperMartRoomMarkerPortal.jsx";
import { GM_AP_ACTIONS, GM_COMPLICATIONS } from "./GmReferenceScreen.jsx";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import { gridDropCell } from "../../utils/battlemapCoordinates.js";
import "./gmSessionMap.css";
import "./sceneLibrary.css";

const DEFAULT_COLS = 12;
const DEFAULT_ROWS = 12;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_BACKGROUND_LENGTH = 790000;

const CREATURE_FEATURE_COPY = {
  en: {
    alpha: { name:"Alpha", effect:"One level higher than normal; improves Body or Mind, one skill, and one additional combat stat. Gains Aggressive and Leader of the Pack." },
    glowing: { name:"Glowing", effect:"Gains Glowing and Immune to Radiation. Deals radiation nearby each turn and improves melee radiation effects." },
    rabid: { name:"Rabid", effect:"Gains Feral and Rabid. Melee attacks gain Persistent (Poison); poison exposure counts as two disease exposures." },
    scorched: { name:"Scorched", effect:"Gains the Scorched ability: aggressive hive-mind behavior against the uninfected. Attacks count as disease exposure." },
    cruel: { name:"Cruel", effect:"Gain 1 Luck point whenever this creature inflicts a critical hit.", mutation:"All attacks gain Vicious; attacks already with Vicious gain +2 CD instead." },
    explosive: { name:"Explosive", effect:"No normal effect.", mutation:"Melee attacks gain Radioactive. At 0 HP the creature explodes for 12 CD Radiation damage at Close range; salvage tests are +2 difficulty." },
    legendary_damage: { name:"Legendary Damage", effect:"Choose one attack: it gains +3 CD. A ranged attack with Fire Rate 1+ may use Let Rip one extra time per scene.", mutation:"The chosen attack can fuel an extra major action for only 1 AP; Let Rip refreshes." },
    legendary_proficiency: { name:"Legendary Proficiency", effect:"Choose one Tag skill. Tests with it gain 1 automatic success.", mutation:"Tests with that Tag skill gain 2 automatic successes instead." },
    radioactive: { name:"Radioactive", effect:"Immune to Radiation damage; all melee attacks gain Radioactive.", mutation:"Creatures within Close range suffer 5 CD Piercing 1 Radiation damage at the start of their turns." },
    rage_heal: { name:"Rage Heal", effect:"Regain 3 HP at the start of each turn.", mutation:"Immediately heal back to maximum HP." },
    scarred: { name:"Scarred", effect:"Physical DR and Energy DR both increase by +2.", mutation:"Roll 1 CD per Injury; on Effect remove that Injury. Physical and Energy DR gain another +2 for the rest of the scene." },
    stalker: { name:"Stalker", effect:"Gain 1 automatic success on Sneak, +2 Initiative, and +1 Defense in concealment.", mutation:"Become invisible as if using a Stealth Boy for the rest of the scene." },
    toxic: { name:"Toxic", effect:"Melee attacks gain Persistent (Poison) plus Radioactive, Stun, or Vicious.", mutation:"Creatures within Reach suffer 5 CD Poison damage at the start of their turns, with the chosen damage effect." },
    tyrant: { name:"Tyrant", effect:"Accompanied by Normal creatures of the same type; number depends on their relative level.", mutation:"The same number of reinforcements arrives when mutation triggers." },
  },
  ru: {
    alpha: { name:"Альфа", effect:"На 1 уровень выше нормы; улучшает Body или Mind, один навык и ещё один боевой параметр. Получает Aggressive и Leader of the Pack." },
    glowing: { name:"Светящийся", effect:"Получает Glowing и иммунитет к радиации. Наносит радиационный урон рядом с собой каждый ход и усиливает радиационные эффекты атак ближнего боя." },
    rabid: { name:"Бешеный", effect:"Получает Feral и Rabid. Атаки ближнего боя получают Persistent (Poison); яд считается двумя воздействиями болезни." },
    scorched: { name:"Обожжённый", effect:"Получает способность Scorched: агрессивное поведение улья против незаражённых. Его атаки считаются воздействием болезни." },
    cruel: { name:"Жестокий", effect:"Получает 1 очко Удачи каждый раз, когда наносит критическое попадание.", mutation:"Все атаки получают Vicious; если Vicious уже есть, атака вместо этого получает +2 КУ." },
    explosive: { name:"Взрывоопасный", effect:"Постоянного эффекта нет.", mutation:"Атаки ближнего боя получают Radioactive. При 0 HP существо взрывается, нанося 12 КУ радиационного урона всем на близкой дистанции; сложность добычи останков +2." },
    legendary_damage: { name:"Легендарный урон", effect:"Выбранная атака получает +3 КУ. Дальняя атака с скорострельностью 1+ может ещё раз за сцену использовать Let Rip.", mutation:"Выбранную атаку можно использовать для дополнительного основного действия за 1 AP; Let Rip восстанавливается." },
    legendary_proficiency: { name:"Легендарное мастерство", effect:"Выберите один Tag-навык. Проверки этим навыком получают 1 автоматический успех.", mutation:"Проверки этим Tag-навыком получают уже 2 автоматических успеха." },
    radioactive: { name:"Радиоактивный", effect:"Иммунитет к радиационному урону; все атаки ближнего боя получают Radioactive.", mutation:"Существа на близкой дистанции получают 5 КУ радиационного урона с Piercing 1 в начале своего хода." },
    rage_heal: { name:"Яростное исцеление", effect:"В начале каждого хода восстанавливает 3 HP.", mutation:"Немедленно восстанавливает HP до максимума." },
    scarred: { name:"Израненный", effect:"Физическое и энергетическое сопротивление увеличиваются на +2.", mutation:"Бросьте 1 КУ за каждую травму; на эффекте травма снимается. Физическое и энергетическое сопротивление дополнительно увеличиваются ещё на +2 до конца сцены." },
    stalker: { name:"Сталкер", effect:"1 автоматический успех на Sneak, +2 к инициативе и +1 к защите в укрытии/темноте.", mutation:"Становится невидимым как при использовании Stealth Boy до конца сцены." },
    toxic: { name:"Токсичный", effect:"Атаки ближнего боя получают Persistent (Poison) и один эффект: Radioactive, Stun или Vicious.", mutation:"Существа в пределах Reach получают 5 КУ ядовитого урона в начале своего хода с выбранным эффектом." },
    tyrant: { name:"Тиран", effect:"Сопровождается обычными существами того же типа; количество зависит от разницы уровней.", mutation:"При мутации прибывает такое же количество подкреплений." },
  },
  uk: {
    alpha: { name:"Альфа", effect:"На 1 рівень вище норми; покращує Body або Mind, одну навичку та ще один бойовий параметр. Отримує Aggressive і Leader of the Pack." },
    glowing: { name:"Сяючий", effect:"Отримує Glowing та імунітет до радіації. Завдає радіаційної шкоди поруч щохід і посилює радіаційні ефекти атак ближнього бою." },
    rabid: { name:"Скажений", effect:"Отримує Feral і Rabid. Атаки ближнього бою отримують Persistent (Poison); отрута рахується як два впливи хвороби." },
    scorched: { name:"Обпалений", effect:"Отримує здатність Scorched: агресивна поведінка вулика проти незаражених. Атаки рахуються як вплив хвороби." },
    cruel: { name:"Жорстокий", effect:"Отримує 1 очко Удачі щоразу, коли завдає критичного влучання.", mutation:"Усі атаки отримують Vicious; якщо Vicious уже є, атака натомість отримує +2 КУ." },
    explosive: { name:"Вибуховий", effect:"Постійного ефекту немає.", mutation:"Атаки ближнього бою отримують Radioactive. При 0 HP істота вибухає, завдаючи 12 КУ радіаційної шкоди всім на близькій дистанції; складність збору здобичі +2." },
    legendary_damage: { name:"Легендарна шкода", effect:"Обрана атака отримує +3 КУ. Дальня атака зі скорострільністю 1+ може ще раз за сцену використати Let Rip.", mutation:"Обрану атаку можна використати для додаткової основної дії за 1 AP; Let Rip відновлюється." },
    legendary_proficiency: { name:"Легендарна майстерність", effect:"Оберіть одну Tag-навичку. Перевірки нею отримують 1 автоматичний успіх.", mutation:"Перевірки цією Tag-навичкою отримують 2 автоматичні успіхи." },
    radioactive: { name:"Радіоактивний", effect:"Імунітет до радіаційної шкоди; усі атаки ближнього бою отримують Radioactive.", mutation:"Істоти на близькій дистанції отримують 5 КУ радіаційної шкоди з Piercing 1 на початку свого ходу." },
    rage_heal: { name:"Люте зцілення", effect:"На початку кожного ходу відновлює 3 HP.", mutation:"Негайно відновлює HP до максимуму." },
    scarred: { name:"Пошрамований", effect:"Фізичний та енергетичний опір збільшуються на +2.", mutation:"Киньте 1 КУ за кожну травму; на ефекті травма знімається. Фізичний та енергетичний опір додатково збільшуються ще на +2 до кінця сцени." },
    stalker: { name:"Сталкер", effect:"1 автоматичний успіх на Sneak, +2 до ініціативи та +1 до захисту в укритті/темряві.", mutation:"Стає невидимим як під дією Stealth Boy до кінця сцени." },
    toxic: { name:"Токсичний", effect:"Атаки ближнього бою отримують Persistent (Poison) і один ефект: Radioactive, Stun або Vicious.", mutation:"Істоти в межах Reach отримують 5 КУ отруйної шкоди на початку свого ходу з обраним ефектом." },
    tyrant: { name:"Тиран", effect:"Супроводжується звичайними істотами того самого типу; кількість залежить від різниці рівнів.", mutation:"Під час мутації прибуває така сама кількість підкріплень." },
  },
  pl: {
    alpha: { name:"Alfa", effect:"Jest o 1 poziom wyżej niż normalnie; poprawia Body lub Mind, jedną umiejętność i dodatkowy parametr bojowy. Otrzymuje Aggressive i Leader of the Pack." },
    glowing: { name:"Świecący", effect:"Otrzymuje Glowing i odporność na promieniowanie. Co turę zadaje obrażenia radiacyjne w pobliżu i wzmacnia radiacyjne efekty ataków wręcz." },
    rabid: { name:"Wściekły", effect:"Otrzymuje Feral i Rabid. Ataki wręcz zyskują Persistent (Poison); trucizna liczy się jako dwa narażenia na chorobę." },
    scorched: { name:"Spalony", effect:"Otrzymuje zdolność Scorched: agresywne zachowanie roju wobec niezarażonych. Ataki liczą się jako narażenie na chorobę." },
    cruel: { name:"Okrutny", effect:"Otrzymuje 1 punkt Szczęścia za każdym razem, gdy zada trafienie krytyczne.", mutation:"Wszystkie ataki zyskują Vicious; jeśli już mają Vicious, zamiast tego zyskują +2 CD." },
    explosive: { name:"Wybuchowy", effect:"Brak stałego efektu.", mutation:"Ataki wręcz zyskują Radioactive. Przy 0 HP istota eksploduje, zadając 12 CD obrażeń radiacyjnych wszystkim w zasięgu Close; trudność pozyskania łupu +2." },
    legendary_damage: { name:"Legendarne obrażenia", effect:"Wybrany atak zyskuje +3 CD. Atak dystansowy z Fire Rate 1+ może raz dodatkowo na scenę użyć Let Rip.", mutation:"Wybrany atak może służyć jako dodatkowa akcja główna za 1 AP; Let Rip odnawia się." },
    legendary_proficiency: { name:"Legendarna biegłość", effect:"Wybierz jedną umiejętność Tag. Testy nią zyskują 1 automatyczny sukces.", mutation:"Testy tą umiejętnością Tag zyskują 2 automatyczne sukcesy." },
    radioactive: { name:"Radioaktywny", effect:"Odporność na obrażenia radiacyjne; wszystkie ataki wręcz zyskują Radioactive.", mutation:"Istoty w zasięgu Close otrzymują 5 CD obrażeń radiacyjnych z Piercing 1 na początku swojej tury." },
    rage_heal: { name:"Szał leczenia", effect:"Na początku każdej tury odzyskuje 3 HP.", mutation:"Natychmiast leczy się do maksymalnego HP." },
    scarred: { name:"Bliznowaty", effect:"Fizyczny i energetyczny DR rosną o +2.", mutation:"Rzuć 1 CD za każdy Uraz; na Efekcie uraz zostaje usunięty. Fizyczny i energetyczny DR rosną o kolejne +2 do końca sceny." },
    stalker: { name:"Stalker", effect:"1 automatyczny sukces na Sneak, +2 Inicjatywy i +1 Obrony w ukryciu/ciemności.", mutation:"Staje się niewidzialny jak po użyciu Stealth Boy do końca sceny." },
    toxic: { name:"Toksyczny", effect:"Ataki wręcz zyskują Persistent (Poison) i jeden efekt: Radioactive, Stun lub Vicious.", mutation:"Istoty w zasięgu Reach otrzymują 5 CD obrażeń od trucizny na początku swojej tury z wybranym efektem." },
    tyrant: { name:"Tyran", effect:"Towarzyszą mu zwykłe istoty tego samego typu; liczba zależy od różnicy poziomów.", mutation:"Po mutacji przybywa taka sama liczba posiłków." },
  },
};

function localizedFeatureText(id, language, kind) {
  const code = CREATURE_FEATURE_COPY[language] ? language : "en";
  const item = CREATURE_FEATURE_COPY[code]?.[String(id || "")];
  if (!item) return "";
  if (kind === "legendary") {
    const effectLabel = code === "ru" ? "Эффект" : code === "uk" ? "Ефект" : code === "pl" ? "Efekt" : "Effect";
    const mutationLabel = code === "ru" ? "Мутация" : code === "uk" ? "Мутація" : code === "pl" ? "Mutacja" : "Mutation";
    return [item.name, item.effect ? `${effectLabel}: ${item.effect}` : "", item.mutation ? `${mutationLabel}: ${item.mutation}` : ""].filter(Boolean).join("\n");
  }
  return [item.name, item.effect].filter(Boolean).join("\n");
}

const LEGENDARY_PERK_COPY = {
  ru: {
    commando:["Коммандо","Высокоскорострельное стрелковое или энергетическое оружие получает +1 КУ."],
    gunslinger:["Стрелок","Одноручное стрелковое или энергетическое оружие с низкой скорострельностью получает +1 КУ."],
    rifleman:["Стрелок из винтовки","Двуручное стрелковое или энергетическое оружие с низкой скорострельностью получает +1 КУ."],
    laser_commander:["Лазерный командир","Энергетическое оружие получает +1 КУ."],
    size_matters:["Размер имеет значение","Тяжёлое оружие получает +1 КУ."],
    iron_fist:["Железный кулак","Безоружные атаки получают +1 КУ."],
    big_leagues:["Высшая лига","Двуручные атаки ближнего боя получают Vicious."],
    shotgun_surgeon:["Хирург с дробовиком","Дробовики получают Piercing +1."],
    piercing_strike:["Пробивающий удар","Безоружные и клинковые атаки ближнего боя получают Piercing +1."],
    demolition_expert:["Эксперт по взрывчатке","Blast-атаки получают Vicious."],
    pyromaniac:["Пироман","Огненные атаки получают +1 КУ."],
    toughness:["Стойкость","Физическое сопротивление +1."],
    refractor:["Рефрактор","Энергетическое сопротивление +1."],
    rad_resistance:["Радиационная стойкость","Сопротивление радиации +1."],
    snakeater:["Змеелов","Сопротивление яду +2."],
  },
  uk: {
    commando:["Командо","Високошвидкісна стрілецька або енергетична зброя отримує +1 КУ."],
    gunslinger:["Стрілець","Одноручна стрілецька або енергетична зброя з низькою скорострільністю отримує +1 КУ."],
    rifleman:["Стрілець із гвинтівки","Дворучна стрілецька або енергетична зброя з низькою скорострільністю отримує +1 КУ."],
    laser_commander:["Лазерний командир","Енергетична зброя отримує +1 КУ."],
    size_matters:["Розмір має значення","Важка зброя отримує +1 КУ."],
    iron_fist:["Залізний кулак","Беззбройні атаки отримують +1 КУ."],
    big_leagues:["Вища ліга","Дворучні атаки ближнього бою отримують Vicious."],
    shotgun_surgeon:["Хірург із дробовиком","Дробовики отримують Piercing +1."],
    piercing_strike:["Пробивний удар","Беззбройні та клинкові атаки ближнього бою отримують Piercing +1."],
    demolition_expert:["Експерт із вибухівки","Blast-атаки отримують Vicious."],
    pyromaniac:["Піроман","Вогняні атаки отримують +1 КУ."],
    toughness:["Стійкість","Фізичний опір +1."],
    refractor:["Рефрактор","Енергетичний опір +1."],
    rad_resistance:["Радіаційна стійкість","Опір радіації +1."],
    snakeater:["Змієїд","Опір отруті +2."],
  },
  pl: {
    commando:["Komandos","Broń strzelecka lub energetyczna o wysokiej szybkostrzelności zyskuje +1 CD."],
    gunslinger:["Rewolwerowiec","Jednoręczna broń strzelecka lub energetyczna o niskiej szybkostrzelności zyskuje +1 CD."],
    rifleman:["Strzelec","Dwuręczna broń strzelecka lub energetyczna o niskiej szybkostrzelności zyskuje +1 CD."],
    laser_commander:["Dowódca laserów","Broń energetyczna zyskuje +1 CD."],
    size_matters:["Rozmiar ma znaczenie","Ciężka broń zyskuje +1 CD."],
    iron_fist:["Żelazna pięść","Ataki bez broni zyskują +1 CD."],
    big_leagues:["Wielka liga","Dwuręczne ataki wręcz zyskują Vicious."],
    shotgun_surgeon:["Chirurg ze strzelbą","Strzelby zyskują Piercing +1."],
    piercing_strike:["Przebijające uderzenie","Ataki bez broni i bronią sieczną zyskują Piercing +1."],
    demolition_expert:["Ekspert od materiałów wybuchowych","Ataki Blast zyskują Vicious."],
    pyromaniac:["Piroman","Ataki ogniowe zyskują +1 CD."],
    toughness:["Wytrzymałość","Fizyczny DR +1."],
    refractor:["Refraktor","Energetyczny DR +1."],
    rad_resistance:["Odporność na radiację","Radiacyjny DR +1."],
    snakeater:["Pożeracz węży","Odporność na truciznę +2."],
  },
};

function localizedLegendaryPerk(perk, language) {
  const item = LEGENDARY_PERK_COPY[language]?.[String(perk?.id || "")];
  return item ? `${item[0]} — ${item[1]}` : `${perk?.name || ""} — ${perk?.description || ""}`;
}

const COPY = {
  en: {
    title: "TACTICAL MAP",
    waiting: "Waiting for the GM room...",
    players: "PLAYER TOKENS",
    startZone: "START ZONE",
    editStart: "EDIT START ZONE",
    finishEdit: "FINISH EDITING",
    startScene: "ENABLE SCENE",
    resetPlayers: "RETURN PLAYERS TO START",
    endScene: "END LIVE SCENE",
    inactive: "Prepare this scene, then enable it when players should enter.",
    active: "SCENE LIVE",
    move: "Drag any token to a free cell, or select it and click a destination cell.",
    editHint: "Click cells to edit the player start zone.",
    size: "GRID",
    resetMap: "RESET SCENE",
    uploadBackground: "UPLOAD BACKGROUND",
    replaceBackground: "REPLACE BACKGROUND",
    removeBackground: "REMOVE BACKGROUND",
    background: "BACKGROUND",
    noBackground: "No background image",
    processing: "PROCESSING IMAGE...",
    imageError: "Could not prepare this image.",
    imageTooLarge: "Image is too large. Maximum source file size is 12 MB.",
    connected: "PLAYERS",
    scenes: "SCENES",
    newScene: "+ NEW SCENE",
    deleteScene: "DELETE",
    saveName: "SAVE NAME",
    sceneName: "SCENE NAME",
    live: "LIVE",
    authority: "PIP 2D20 // GM DEVICE AUTHORITY", sceneActions:"SCENE ACTIONS", actionPoints:"ACTION POINTS", playersAp:"Players AP", gmAp:"GM AP", placeEnemies:"PLACE ENEMIES", removeEnemies:"REMOVE ENEMIES", activateScene:"ACTIVATE SCENE", deactivateScene:"DEACTIVATE SCENE", creatures:"CREATURES ON MAP", focus:"FOCUS", expand:"EXPAND", collapse:"COLLAPSE", attacks:"ATTACKS", noAttacks:"No attacks available.", show:"SHOW", hide:"HIDE", remove:"REMOVE", hp:"HP", initiative:"INIT", initiativeOrder:"INITIATIVE", previousTurn:"PREV", nextTurn:"NEXT", round:"ROUND", dead:"DEAD", emptyCreatures:"No creatures on this scene.", rooms:"ROOM DESCRIPTIONS", randomComplication:"RANDOM COMPLICATION · 2 AP", randomApSpend:"RANDOM AP ACTION", notEnoughAp:"Not enough GM AP",
    stat:{type:"TYPE",body:"BODY",mind:"MIND",melee:"MELEE",guns:"GUNS",other:"OTHER",skills:"SKILLS",special:"SPECIAL",specialFeature:"SPECIAL FEATURE",legendaryAbility:"LEGENDARY ABILITY",abilities:"ABILITIES",legendaryPerks:"LEGENDARY PERKS",perkDr:"PERK DR",resistance:"RESISTANCE",tactics:"TACTICS",loot:"LOOT",summary:"SUMMARY",notes:"NOTES",source:"SOURCE",rank:"RANK",size:"SIZE"},
  },
  ru: {
    title: "ТАКТИЧЕСКАЯ КАРТА",
    waiting: "Ожидаю комнату ГМ...",
    players: "ТОКЕНЫ ИГРОКОВ",
    startZone: "СТАРТОВАЯ ЗОНА",
    editStart: "ИЗМЕНИТЬ СТАРТОВУЮ ЗОНУ",
    finishEdit: "ЗАКОНЧИТЬ РЕДАКТИРОВАНИЕ",
    startScene: "ВКЛЮЧИТЬ СЦЕНУ",
    resetPlayers: "ВЕРНУТЬ ИГРОКОВ В СТАРТ",
    endScene: "ЗАВЕРШИТЬ LIVE СЦЕНУ",
    inactive: "Подготовьте эту сцену и включите её, когда игрокам нужно войти.",
    active: "СЦЕНА LIVE",
    move: "Перетягивайте любые токены или выберите токен и нажмите клетку назначения.",
    editHint: "Нажимайте клетки, чтобы изменить стартовую зону.",
    size: "СЕТКА",
    resetMap: "СБРОСИТЬ СЦЕНУ",
    uploadBackground: "ЗАГРУЗИТЬ ФОН",
    replaceBackground: "ЗАМЕНИТЬ ФОН",
    removeBackground: "УДАЛИТЬ ФОН",
    background: "ФОН",
    noBackground: "Фоновая картинка не загружена",
    processing: "ОБРАБОТКА ИЗОБРАЖЕНИЯ...",
    imageError: "Не удалось подготовить изображение.",
    imageTooLarge: "Файл слишком большой. Максимум 12 МБ.",
    connected: "ИГРОКИ",
    scenes: "СЦЕНЫ",
    newScene: "+ НОВАЯ СЦЕНА",
    deleteScene: "УДАЛИТЬ",
    saveName: "СОХРАНИТЬ ИМЯ",
    sceneName: "ИМЯ СЦЕНЫ",
    live: "АКТИВНА",
    authority: "PIP 2D20 // УСТРОЙСТВО ГМ", sceneActions:"ДЕЙСТВИЯ СЦЕНЫ", actionPoints:"ЭКШЕН ПОИНТЫ", playersAp:"AP игроков", gmAp:"AP ГМа", placeEnemies:"РАССТАВИТЬ ВРАГОВ", removeEnemies:"УБРАТЬ ВРАГОВ", activateScene:"АКТИВИРОВАТЬ СЦЕНУ", deactivateScene:"ДЕАКТИВИРОВАТЬ", creatures:"СУЩЕСТВА НА КАРТЕ", focus:"ФОКУС", expand:"РАЗВЕРНУТЬ", collapse:"СВЕРНУТЬ", attacks:"АТАКИ", noAttacks:"Нет доступных атак.", show:"ПОКАЗАТЬ", hide:"СКРЫТЬ", remove:"УДАЛИТЬ", hp:"HP", initiative:"ИНИЦ.", initiativeOrder:"ИНИЦИАТИВА", previousTurn:"ПРЕД. ХОД", nextTurn:"СЛЕД. ХОД", round:"РАУНД", dead:"МЕРТВ", emptyCreatures:"На сцене нет существ.", rooms:"ОПИСАНИЕ КОМНАТ", randomComplication:"СЛУЧАЙНОЕ ОСЛОЖНЕНИЕ · 2 AP", randomApSpend:"СЛУЧАЙНАЯ ТРАТА AP", notEnoughAp:"Недостаточно AP ГМа",
    stat:{type:"ТИП",body:"ТЕЛО",mind:"РАЗУМ",melee:"БЛИЖНИЙ БОЙ",guns:"СТРЕЛЬБА",other:"ДРУГОЕ",skills:"НАВЫКИ",special:"SPECIAL",specialFeature:"ОСОБОЕ СВОЙСТВО",legendaryAbility:"ЛЕГЕНДАРНАЯ СПОСОБНОСТЬ",abilities:"СПОСОБНОСТИ",legendaryPerks:"ЛЕГЕНДАРНЫЕ ПЕРКИ",perkDr:"СОПРОТИВЛЕНИЯ ОТ ПЕРКОВ",resistance:"СОПРОТИВЛЕНИЯ",tactics:"ТАКТИКА",loot:"ДОБЫЧА",summary:"ОПИСАНИЕ",notes:"ЗАМЕТКИ",source:"ИСТОЧНИК",rank:"РАНГ",size:"РАЗМЕР"},
  },
  uk: {
    title: "ТАКТИЧНА МАПА",
    waiting: "Очікую кімнату ГМ...",
    players: "ТОКЕНИ ГРАВЦІВ",
    startZone: "СТАРТОВА ЗОНА",
    editStart: "ЗМІНИТИ СТАРТОВУ ЗОНУ",
    finishEdit: "ЗАКІНЧИТИ РЕДАГУВАННЯ",
    startScene: "УВІМКНУТИ СЦЕНУ",
    resetPlayers: "ПОВЕРНУТИ ГРАВЦІВ НА СТАРТ",
    endScene: "ЗАВЕРШИТИ LIVE СЦЕНУ",
    inactive:
      "Підготуйте цю сцену та увімкніть її, коли гравцям потрібно увійти.",
    active: "СЦЕНА LIVE",
    move: "Перетягуйте будь-які токени або оберіть токен і натисніть клітинку призначення.",
    editHint: "Натискайте клітинки, щоб змінити стартову зону.",
    size: "СІТКА",
    resetMap: "СКИНУТИ СЦЕНУ",
    uploadBackground: "ЗАВАНТАЖИТИ ФОН",
    replaceBackground: "ЗАМІНИТИ ФОН",
    removeBackground: "ВИДАЛИТИ ФОН",
    background: "ФОН",
    noBackground: "Фонове зображення не завантажено",
    processing: "ОБРОБКА ЗОБРАЖЕННЯ...",
    imageError: "Не вдалося підготувати зображення.",
    imageTooLarge: "Файл завеликий. Максимум 12 МБ.",
    connected: "ГРАВЦІ",
    scenes: "СЦЕНИ",
    newScene: "+ НОВА СЦЕНА",
    deleteScene: "ВИДАЛИТИ",
    saveName: "ЗБЕРЕГТИ ІМ'Я",
    sceneName: "НАЗВА СЦЕНИ",
    live: "АКТИВНА",
    authority: "PIP 2D20 // ПРИСТРІЙ ГМ", sceneActions:"ДІЇ СЦЕНИ", actionPoints:"ЕКШЕН ПОІНТИ", playersAp:"AP гравців", gmAp:"AP ГМа", placeEnemies:"РОЗСТАВИТИ ВОРОГІВ", removeEnemies:"ПРИБРАТИ ВОРОГІВ", activateScene:"АКТИВУВАТИ СЦЕНУ", deactivateScene:"ДЕАКТИВУВАТИ", creatures:"ІСТОТИ НА МАПІ", focus:"ФОКУС", expand:"РОЗГОРНУТИ", collapse:"ЗГОРНУТИ", attacks:"АТАКИ", noAttacks:"Немає доступних атак.", show:"ПОКАЗАТИ", hide:"СХОВАТИ", remove:"ВИДАЛИТИ", hp:"HP", initiative:"ІНІЦ.", initiativeOrder:"ІНІЦІАТИВА", previousTurn:"ПОПЕР. ХІД", nextTurn:"НАСТ. ХІД", round:"РАУНД", dead:"МЕРТВИЙ", emptyCreatures:"На сцені немає істот.", rooms:"ОПИС КІМНАТ", randomComplication:"ВИПАДКОВЕ УСКЛАДНЕННЯ · 2 AP", randomApSpend:"ВИПАДКОВА ВИТРАТА AP", notEnoughAp:"Недостатньо AP ГМа",
    stat:{type:"ТИП",body:"ТІЛО",mind:"РОЗУМ",melee:"БЛИЖНІЙ БІЙ",guns:"СТРІЛЬБА",other:"ІНШЕ",skills:"НАВИЧКИ",special:"SPECIAL",specialFeature:"ОСОБЛИВА ВЛАСТИВІСТЬ",legendaryAbility:"ЛЕГЕНДАРНА ЗДІБНІСТЬ",abilities:"ЗДІБНОСТІ",legendaryPerks:"ЛЕГЕНДАРНІ ПЕРКИ",perkDr:"ОПІР ВІД ПЕРКІВ",resistance:"ОПІР",tactics:"ТАКТИКА",loot:"ЗДОБИЧ",summary:"ОПИС",notes:"НОТАТКИ",source:"ДЖЕРЕЛО",rank:"РАНГ",size:"РОЗМІР"},
  },
  pl: {
    title: "MAPA TAKTYCZNA",
    waiting: "Oczekiwanie na pokój GM...",
    players: "TOKENY GRACZY",
    startZone: "STREFA STARTOWA",
    editStart: "EDYTUJ STREFĘ STARTOWĄ",
    finishEdit: "ZAKOŃCZ EDYCJĘ",
    startScene: "WŁĄCZ SCENĘ",
    resetPlayers: "PRZENIEŚ GRACZY NA START",
    endScene: "ZAKOŃCZ SCENĘ LIVE",
    inactive: "Przygotuj scenę i włącz ją, gdy gracze mają wejść.",
    active: "SCENA LIVE",
    move: "Przeciągaj dowolne tokeny albo wybierz token i kliknij pole docelowe.",
    editHint: "Klikaj pola, aby edytować strefę startową.",
    size: "SIATKA",
    resetMap: "RESETUJ SCENĘ",
    uploadBackground: "WGRAJ TŁO",
    replaceBackground: "ZMIEŃ TŁO",
    removeBackground: "USUŃ TŁO",
    background: "TŁO",
    noBackground: "Brak obrazu tła",
    processing: "PRZETWARZANIE OBRAZU...",
    imageError: "Nie udało się przygotować obrazu.",
    imageTooLarge: "Plik jest za duży. Maks. 12 MB.",
    connected: "GRACZE",
    scenes: "SCENY",
    newScene: "+ NOWA SCENA",
    deleteScene: "USUŃ",
    saveName: "ZAPISZ NAZWĘ",
    sceneName: "NAZWA SCENY",
    live: "AKTYWNA",
    authority: "PIP 2D20 // URZĄDZENIE MG", sceneActions:"AKCJE SCENY", actionPoints:"PUNKTY AKCJI", playersAp:"AP graczy", gmAp:"AP MG", placeEnemies:"ROZMIEŚĆ WROGÓW", removeEnemies:"USUŃ WROGÓW", activateScene:"AKTYWUJ SCENĘ", deactivateScene:"DEZAKTYWUJ", creatures:"ISTOTY NA MAPIE", focus:"FOKUS", expand:"ROZWIŃ", collapse:"ZWIŃ", attacks:"ATAKI", noAttacks:"Brak dostępnych ataków.", show:"POKAŻ", hide:"UKRYJ", remove:"USUŃ", hp:"HP", initiative:"INIT", initiativeOrder:"INICJATYWA", previousTurn:"POPRZ. TURA", nextTurn:"NAST. TURA", round:"RUNDA", dead:"MARTWY", emptyCreatures:"Brak istot na scenie.", rooms:"OPISY POMIESZCZEŃ", randomComplication:"LOSOWA KOMPLIKACJA · 2 AP", randomApSpend:"LOSOWY WYDATEK AP", notEnoughAp:"Za mało AP MG",
    stat:{type:"TYP",body:"CIAŁO",mind:"UMYSŁ",melee:"WALKA WRĘCZ",guns:"STRZELECTWO",other:"INNE",skills:"UMIEJĘTNOŚCI",special:"SPECIAL",specialFeature:"CECHA SPECJALNA",legendaryAbility:"ZDOLNOŚĆ LEGENDARNA",abilities:"ZDOLNOŚCI",legendaryPerks:"LEGENDARNE PERKI",perkDr:"ODPORNOŚCI Z PERKÓW",resistance:"ODPORNOŚCI",tactics:"TAKTYKA",loot:"ŁUP",summary:"OPIS",notes:"NOTATKI",source:"ŹRÓDŁO",rank:"RANGA",size:"ROZMIAR"},
  },
};

function languageCode(language) {
  const code = String(language || "en")
    .toLowerCase()
    .split("-")[0];
  return COPY[code] ? code : "en";
}

function makeStartZone(cols, rows) {
  const result = [];
  for (let y = Math.max(0, rows - 3); y < rows; y += 1) {
    for (let x = 0; x < Math.min(3, cols); x += 1) result.push({ x, y });
  }
  return result;
}

function tokenSize(token) {
  const n = Number(token?.stats?.footprint || token?.size);
  return n === 3 ? 3 : n === 2 ? 2 : 1;
}
function cellKey(x, y) {
  return `${x}:${y}`;
}

function cellsFor(token, x = token.x, y = token.y) {
  const result = [];
  const size = tokenSize(token);
  for (let dy = 0; dy < size; dy += 1)
    for (let dx = 0; dx < size; dx += 1) result.push(cellKey(x + dx, y + dy));
  return result;
}

function freeCell(tokens, movingId, x, y, size, cols, rows) {
  if (x < 0 || y < 0 || x + size > cols || y + size > rows) return false;
  const occupied = new Set();
  tokens.forEach((token) => {
    if (token.id === movingId) return;
    cellsFor(token).forEach((key) => occupied.add(key));
  });
  return cellsFor({ id: movingId, x, y, size }).every(
    (key) => !occupied.has(key)
  );
}

function pointerPlacement(grid, event, cols, rows, drag) {
  if (!grid) return null;
  const rect = grid.getBoundingClientRect();
  const firstCell = grid.querySelector?.(".gm-session-map__cell");
  const cellRect = firstCell?.getBoundingClientRect?.();
  const cellWidth = cellRect?.width || rect.width / Math.max(1, cols);
  const cellHeight = cellRect?.height || rect.height / Math.max(1, rows);
  return gridDropCell({
    clientX: event.clientX,
    clientY: event.clientY,
    rect,
    scrollLeft: grid.dataset.phaserGrid ? 0 : grid.scrollLeft,
    scrollTop: grid.dataset.phaserGrid ? 0 : grid.scrollTop,
    cellWidth,
    cellHeight,
    cols,
    rows,
    size: drag.size,
    anchorX: drag.anchorX,
    anchorY: drag.anchorY,
  });
}

function autoScrollNearEdge(grid, clientX, clientY) {
  if (!grid || grid.dataset.phaserGrid) return;
  const rect = grid.getBoundingClientRect();
  const edge = Math.min(
    64,
    Math.max(36, Math.min(rect.width, rect.height) * 0.12)
  );
  const speed = 18;
  const dx =
    clientX < rect.left + edge
      ? -speed
      : clientX > rect.right - edge
      ? speed
      : 0;
  const dy =
    clientY < rect.top + edge
      ? -speed
      : clientY > rect.bottom - edge
      ? speed
      : 0;
  if (dx || dy) grid.scrollBy({ left: dx, top: dy, behavior: "auto" });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function renderImage(image, maxDimension, quality) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("canvas");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

async function compressBackground(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("image");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("too-large");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    for (const [dimension, quality] of [
      [1500, 0.72],
      [1250, 0.68],
      [1050, 0.62],
      [900, 0.58],
      [760, 0.54],
    ]) {
      const result = renderImage(image, dimension, quality);
      if (result.length <= MAX_BACKGROUND_LENGTH) return result;
    }
    throw new Error("too-large");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function npcStats(entry) {
  if (!entry) return null;
  const maxHp = Number(entry.maxHp ?? entry.hp ?? entry.health ?? 0) || null;
  return {
    hp: maxHp,
    maxHp,
    defense: Number(entry.defense ?? entry.def ?? 0) || null,
    initiative: Number(entry.initiative ?? entry.init ?? 0) || null,
    level: Number(entry.level ?? 0) || null,
    attacks: String(entry.attacks ?? entry.attack ?? ""),
    drBlock: String(entry.drBlock ?? entry.dr ?? entry.resistance ?? ""),
  };
}

function managerToken(token) {
  const stats = token.stats || {};
  return {
    ...token,
    bestiaryId: token.npcId || "",
    hp: stats.hp ?? stats.currentHp ?? null,
    maxHp: stats.maxHp ?? null,
    defense: stats.defense ?? null,
    initiative: stats.initiative ?? null,
    level: stats.level ?? null,
    attacks: stats.attacks ?? "",
    drBlock: stats.drBlock ?? "",
  };
}

function mapBestiaryEntry(token) {
  const id = String(token?.npcId || "");
  return BESTIARY_ENTRIES.find((entry) => String(entry?.id || "") === id) || null;
}

function mapCreatureAttacks(token) {
  const stats = token?.stats || {};
  const linked = mapBestiaryEntry(token);
  const attacksText = stats.attacks || linked?.attacks || "";
  const parsed = parseAttackText(attacksText);
  const custom = (Array.isArray(stats.customAttacks) ? stats.customAttacks : []).map(normalizeStructuredAttack);
  const weapons = (Array.isArray(stats.weapons) ? stats.weapons : []).map(normalizeWeaponAttack);
  const abilityAttacks = parseCombatAbilityAttacks(stats.abilities || linked?.abilities || "", attacksText);
  const seen = new Set();
  return [...parsed, ...custom, ...weapons, ...abilityAttacks].filter((attack) => {
    const key = String(attack?.name || "").trim().toLowerCase() || JSON.stringify([Number(attack?.targetNumber || 0), Number(attack?.damageDice || 0), String(attack?.damageType || "")]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function attackKindLabel(attack, language) {
  const skill = String(attack?.skill || attack?.weaponType || "").trim().toLowerCase();
  const range = String(attack?.range || "").trim().toUpperCase();
  const rangedSkills = ["small guns","energy weapons","big guns","explosives","throwing"];
  const meleeSkills = ["melee weapons","unarmed","melee"];
  let kind = "";
  if (rangedSkills.includes(skill) || range) kind = "ranged";
  else if (meleeSkills.includes(skill)) kind = "melee";
  else kind = "melee";

  const labels = {
    en: { melee:"MELEE", ranged:"RANGED" },
    ru: { melee:"БЛИЖНИЙ БОЙ", ranged:"ДАЛЬНЯЯ" },
    uk: { melee:"БЛИЖНІЙ БІЙ", ranged:"ДАЛЬНЯ" },
    pl: { melee:"WALKA WRĘCZ", ranged:"DYSTANSOWA" },
  };
  const label = labels[language]?.[kind] || labels.en[kind];
  return range ? `${label} · ${range}` : label;
}

const MOBILE_TOKEN_PALETTE = [
  "#78ff98",
  "#ffd166",
  "#62d9ff",
  "#ff7ad9",
  "#ff9b54",
  "#8da2ff",
  "#d6ff63",
  "#c58cff",
];

function tokenAccentColor(token) {
  if (token?.kind === "player") return "#62d9ff";
  const explicit = Number(token?.stats?.tokenColorIndex);
  let index;
  if (Number.isFinite(explicit)) {
    index = Math.abs(Math.floor(explicit)) % MOBILE_TOKEN_PALETTE.length;
  } else {
    const text = String(token?.stats?.hordeGroupId || token?.id || token?.name || "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    index = Math.abs(hash) % MOBILE_TOKEN_PALETTE.length;
  }
  return MOBILE_TOKEN_PALETTE[index];
}

function MapCreatureAvatar({ token, linked }) {
  const [url, setUrl] = useState(String(token?.avatar || linked?.avatar || ""));
  useEffect(() => {
    let cancelled = false;
    const direct = String(token?.avatar || linked?.avatar || "");
    if (direct) { setUrl(direct); return () => { cancelled = true; }; }
    if (!token?.npcId) { setUrl(""); return () => { cancelled = true; }; }
    getBestiaryTokenUrl(token.npcId)
      .then((next) => { if (!cancelled) setUrl(String(next || "")); })
      .catch(() => { if (!cancelled) setUrl(""); });
    return () => { cancelled = true; };
  }, [token?.id, token?.avatar, token?.npcId, linked?.avatar]);
  const fallback = String(token?.name || "N").trim().slice(0, 1).toUpperCase() || "N";
  return <div className="gm-map-creature__avatar">{url ? <img src={url} alt="" draggable={false} /> : <span>{fallback}</span>}</div>;
}

function localizedRankLabel(rank, language) {
  const value = String(rank || "standard").toLowerCase();
  const labels = {
    en: { minion:"MINION", standard:"STANDARD", special:"SPECIAL", legendary:"LEGENDARY" },
    ru: { minion:"МИНЬОН", standard:"ОБЫЧНЫЙ", special:"ОСОБЫЙ", legendary:"ЛЕГЕНДАРНЫЙ" },
    uk: { minion:"МІНЬЙОН", standard:"ЗВИЧАЙНИЙ", special:"ОСОБЛИВИЙ", legendary:"ЛЕГЕНДАРНИЙ" },
    pl: { minion:"SŁUGA", standard:"ZWYKŁY", special:"SPECJALNY", legendary:"LEGENDARNY" },
  };
  return labels[language]?.[value] || value.toUpperCase();
}

function InitiativeAvatar({ token, dead }) {
  const linked = mapBestiaryEntry(token);
  const [url, setUrl] = useState(String(token?.avatar || linked?.avatar || ""));
  useEffect(() => {
    let cancelled = false;
    const direct = String(token?.avatar || linked?.avatar || "");
    if (direct) { setUrl(direct); return () => { cancelled = true; }; }
    if (!token?.npcId) { setUrl(""); return () => { cancelled = true; }; }
    getBestiaryTokenUrl(token.npcId)
      .then((next) => { if (!cancelled) setUrl(String(next || "")); })
      .catch(() => { if (!cancelled) setUrl(""); });
    return () => { cancelled = true; };
  }, [token?.id, token?.avatar, token?.npcId, linked?.avatar]);

  return (
    <span className="gm-mobile-initiative__avatar" style={{"--token-accent":tokenAccentColor(token)}}>
      {url ? <img src={url} alt="" draggable={false} /> : <b>{String(token?.name || "T").slice(0,1)}</b>}
      {dead ? <i aria-hidden="true">×</i> : null}
    </span>
  );
}

function EnemyHpEditor({ token, hp, maxHp, onCommit }) {
  const [draft, setDraft] = useState(String(hp));
  useEffect(() => { setDraft(String(hp)); }, [hp, token?.id]);
  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) { setDraft(String(hp)); return; }
    const next = Math.max(0, Math.min(Math.max(1, maxHp), Math.round(parsed)));
    setDraft(String(next));
    if (next !== hp) onCommit?.(next);
  };
  return (
    <label className="gm-map-creature__hp-editor">
      <span>HP</span>
      <input
        type="number"
        min="0"
        max={Math.max(1,maxHp)}
        value={draft}
        onChange={(event)=>setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event)=>{ if(event.key==="Enter"){ event.currentTarget.blur(); } }}
        aria-label="HP"
      />
      <small>/ {Math.max(1,maxHp)}</small>
    </label>
  );
}


export default function GmSessionMapV2({ session: sessionProp = null }) {
  const { i18n } = useTranslation();
  const bridgedSession = useLiveSessionBridge();
  const session = sessionProp || bridgedSession;
  const language = languageCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[language];
  const scene = session?.tacticalScene || null;
  const scenes = Array.isArray(session?.tacticalScenes)
    ? session.tacticalScenes
    : [];
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [editingStart, setEditingStart] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragState, setDragState] = useState(null);
  const [sceneName, setSceneName] = useState(scene?.name || "");
  const gridRef = useRef(null);
  const dragRef = useRef(null);
  const suppressCellClickRef = useRef(false);
  const fileRef = useRef(null);
  const roomDescriptionsRef = useRef(null);
  const [sceneActionBusy,setSceneActionBusy]=useState("");
  const [gmActionResult,setGmActionResult]=useState(null);
  const [expandedMapCreatureId,setExpandedMapCreatureId]=useState("");
  const [mapDiceOpen,setMapDiceOpen]=useState(false);
  const [mapRollConfig,setMapRollConfig]=useState(null);
  const [mapPendingAutoD6,setMapPendingAutoD6]=useState(null);

  useEffect(() => {
    setSceneName(scene?.name || "");
    setSelectedTokenId(null);
    setExpandedMapCreatureId("");
    setEditingStart(false);
    dragRef.current = null;
    setDragState(null);
  }, [scene?.sceneId]);

  if (!session?.isActive || session?.mode !== "host" || !scene) {
    return (
      <section className="pip-panel gm-session-map tactical-map">
        <div className="gm-session-map__hint">{text.waiting}</div>
      </section>
    );
  }

  const cols = Number(scene.environment?.proceduralMapSpec?.cols || scene.cols || DEFAULT_COLS);
  const rows = Number(scene.environment?.proceduralMapSpec?.rows || scene.rows || DEFAULT_ROWS);
  const tokens = Array.isArray(scene.tokens) ? scene.tokens : [];
  const playerTokens = tokens.filter((token) => token.kind === "player");
  const enemyTokens = tokens.filter((token) => token.kind !== "player");
  const initiativeTokens = [...tokens].sort((a,b) =>
    Number(b?.stats?.initiative || 0) - Number(a?.stats?.initiative || 0)
    || String(a?.name || "").localeCompare(String(b?.name || ""))
  );
  const aliveInitiativeTokenIds = initiativeTokens
    .filter((token) => token.kind === "player" || Number(token?.stats?.hp ?? token?.stats?.currentHp ?? 1) > 0)
    .map((token) => String(token.id));
  const activeTurnTokenId = String(session?.turnState?.activeTokenId || "");
  const currentRound = Math.max(1, Number(session?.turnState?.round || 1));
  const startKeys = new Set(
    (scene.startZone || []).map((cell) => cellKey(cell.x, cell.y))
  );
  const liveScene =
    scenes.find((item) => item.sceneId === session.liveSceneId) || null;
  const selectedIsLive = scene.sceneId === session.liveSceneId && scene.active;

  const setGridSize = async (value) => {
    if (selectedIsLive) return;
    const [nextCols, nextRows] = String(value).split("x").map(Number);
    if (!nextCols || !nextRows) return;
    const proceduralSpec = scene?.environment?.proceduralMapSpec;
    await session.updateTacticalScene?.({
      cols: nextCols,
      rows: nextRows,
      startZone: makeStartZone(nextCols, nextRows),
      ...(proceduralSpec ? {
        environment: {
          ...(scene.environment || {}),
          proceduralMapSpec: {
            ...proceduralSpec,
            cols: nextCols,
            rows: nextRows,
          },
        },
      } : {}),
    });
  };

  const toggleStartCell = async (x, y) => {
    if (!editingStart) return;
    const key = cellKey(x, y);
    const current = scene.startZone || [];
    const next = startKeys.has(key)
      ? current.filter((cell) => cellKey(cell.x, cell.y) !== key)
      : [...current, { x, y }];
    await session.updateTacticalScene?.({ startZone: next });
  };

  const uploadBackground = async (file) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const backgroundUrl = await compressBackground(file);
      await session.updateTacticalScene?.({
        backgroundUrl,
        backgroundName: file.name,
      });
    } catch (error) {
      setUploadError(
        error?.message === "too-large" ? text.imageTooLarge : text.imageError
      );
    } finally {
      setUploading(false);
    }
  };

  const enableScene = async () => {
    setEditingStart(false);
    await session.enableTacticalScene?.({
      cols,
      rows,
      startZone: scene.startZone,
      backgroundUrl: scene.backgroundUrl,
      backgroundName: scene.backgroundName,
    });
  };

  const returnPlayersToStart = async () => {
    if (!selectedIsLive) return;
    const placed = enemyTokens.map((token) => ({ ...token }));
    const preferred = scene.startZone?.length
      ? scene.startZone
      : makeStartZone(cols, rows);
    for (const token of playerTokens) {
      const size = tokenSize(token);
      let target = null;
      for (const cell of preferred) {
        if (freeCell(placed, token.id, cell.x, cell.y, size, cols, rows)) {
          target = cell;
          break;
        }
      }
      if (!target) continue;
      await session.moveToken?.(token.id, target.x, target.y);
      placed.push({ ...token, x: target.x, y: target.y });
    }
  };

  const resetScene = async () => {
    if (selectedIsLive) await session.disableTacticalScene?.();
    for (const token of [...tokens]) await session.deleteToken?.(token.id);
    await session.updateTacticalScene?.({
      cols: DEFAULT_COLS,
      rows: DEFAULT_ROWS,
      startZone: makeStartZone(DEFAULT_COLS, DEFAULT_ROWS),
      backgroundUrl: "",
      backgroundName: "",
    });
  };

  const addEnemy = async ({ entry, name, size }) =>
    session.createNpcToken?.({
      name,
      size,
      npcId: entry?.id || null,
      stats: npcStats(entry),
    });

  const updateEnemy = async (tokenId, patch = {}) => {
    const source = tokens.find((token) => token.id === tokenId);
    if (!source) return;
    const next = {};
    if (Object.prototype.hasOwnProperty.call(patch, "avatar"))
      next.avatar = patch.avatar;
    if (Object.prototype.hasOwnProperty.call(patch, "size"))
      next.size = patch.size;
    if (Object.prototype.hasOwnProperty.call(patch, "name"))
      next.name = patch.name;
    const statKeys = [
      "hp",
      "maxHp",
      "defense",
      "initiative",
      "level",
      "attacks",
      "drBlock",
    ];
    if (
      statKeys.some((key) => Object.prototype.hasOwnProperty.call(patch, key))
    ) {
      next.stats = { ...(source.stats || {}) };
      statKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(patch, key))
          next.stats[key] = patch[key];
      });
    }
    await session.updateToken?.(tokenId, next);
  };

  const changeEnemyHp = async (token, delta) => {
    if (!token || token.kind === "player") return;
    const stats = token.stats || {};
    const maxHp = Math.max(1, Number(stats.maxHp ?? stats.hp ?? 1));
    const currentHp = Math.max(0, Number(stats.hp ?? stats.currentHp ?? maxHp));
    const nextHp = Math.max(0, Math.min(maxHp, currentHp + Number(delta || 0)));
    await updateEnemy(token.id, { hp: nextHp });
  };


  const placeGeneratedEnemies = async () => {
    if(sceneActionBusy)return;
    setSceneActionBusy("place");
    setGmActionResult(null);
    try{
      const result = await roomDescriptionsRef.current?.placeEnemies?.();
      if (!result) {
        setGmActionResult({ error:true, label:text.placeEnemies, effect:"Encounter data is not ready." });
        return;
      }
      setGmActionResult({
        error: result.ok === false && !result.partial,
        label: result.message || text.placeEnemies,
        effect: result.count ? `${result.count}` : "",
      });
    } catch (error) {
      setGmActionResult({ error:true, label:text.placeEnemies, effect:error?.message || "PLACE_ENEMIES_FAILED" });
    } finally {
      setSceneActionBusy("");
    }
  };

  const removeAllEnemies = async () => {
    if(sceneActionBusy)return;
    setSceneActionBusy("remove");
    try{
      for(const token of enemyTokens) await session.deleteToken?.(token.id);
      setSelectedTokenId(null);
    } finally {
      setSceneActionBusy("");
    }
  };

  const focusToken = (tokenId) => {
    setSelectedTokenId(tokenId);
    const token = tokens.find((item) => String(item.id) === String(tokenId));
    if (token && gridRef.current?.phaserMap) {
      gridRef.current.phaserMap.focus(Number(token.x || 0), Number(token.y || 0));
    } else {
      gridRef.current?.scrollIntoView?.({behavior:"smooth",block:"center"});
    }
  };

  const toggleMapCreatureCard = (tokenId) => {
    setSelectedTokenId(tokenId);
    setExpandedMapCreatureId((current) => String(current) === String(tokenId) ? "" : String(tokenId));
  };

  const openMapAttackRoll = (attack, token) => {
    setSelectedTokenId(token.id);
    setMapRollConfig(buildNpcAttackRollConfig(attack, token?.stats || {}, token?.name || "NPC"));
    setMapPendingAutoD6(null);
    setMapDiceOpen(true);
  };

  const toggleTokenVisibility = async (token) => {
    const current=token?.stats?.visibleToPlayers !== false;
    await session.updateToken?.(token.id,{stats:{...(token.stats||{}),visibleToPlayers:!current}});
  };

  const actionPoints=scene.actionPoints||{players:0,gm:0,max:6};
  const changeActionPoints = async (pool,delta) => {
    const current=Math.max(0,Math.floor(Number(actionPoints?.[pool]||0)));
    const next=pool==="players"
      ? Math.max(0,Math.min(6,current+delta))
      : Math.max(0,current+delta);
    await session.updateTacticalScene?.({
      actionPoints:{
        players:Math.max(0,Math.min(6,Math.floor(Number(actionPoints.players||0)))),
        gm:Math.max(0,Math.floor(Number(actionPoints.gm||0))),
        max:6,
        [pool]:next,
      },
    });
  };

  const persistGmApEvent = async ({cost,type,label,effect,roll=null,random=true}) => {
    const currentAp=scene.actionPoints||{players:0,gm:0,max:6};
    const gm=Math.max(0,Math.floor(Number(currentAp.gm||0)));
    if(gm<cost){setGmActionResult({error:true,label:text.notEnoughAp,effect:""});return false;}
    const event={id:"gm_ap_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),type,label,effect,cost,roll,random,createdAt:Date.now()};
    await session.updateTacticalScene?.({
      actionPoints:{players:Math.max(0,Math.min(6,Math.floor(Number(currentAp.players||0)))),gm:Math.max(0,gm-cost),max:6},
      gmApEvents:[event,...(scene.gmApEvents||[])].slice(0,30),
      ...(type==="complication"?{lastGmComplication:event}:{}),
    });
    setGmActionResult(event);
    return true;
  };

  const runRandomComplication = async () => {
    const item=GM_COMPLICATIONS[Math.floor(Math.random()*GM_COMPLICATIONS.length)];
    await persistGmApEvent({cost:2,type:"complication",label:item.name[languageCode(i18n.resolvedLanguage||i18n.language)],effect:item.effect[languageCode(i18n.resolvedLanguage||i18n.language)],roll:item.roll,random:true});
  };

  const runRandomApSpend = async () => {
    const gm=Math.max(0,Math.floor(Number(scene.actionPoints?.gm||0)));
    const affordable=GM_AP_ACTIONS.filter(item=>Number(item.cost||0)<=gm);
    if(!affordable.length){setGmActionResult({error:true,label:text.notEnoughAp,effect:""});return;}
    const item=affordable[Math.floor(Math.random()*affordable.length)];
    const lang=languageCode(i18n.resolvedLanguage||i18n.language);
    await persistGmApEvent({cost:item.cost,type:"action",label:item.name[lang],effect:item.effect[lang],random:true});
  };

  const moveSelected = async (x, y) => {
    if (suppressCellClickRef.current) return;
    if (!selectedTokenId || editingStart) return;
    await session.moveToken?.(selectedTokenId, x, y);
  };

  const beginDrag = (event, token) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = tokenSize(token);
    const anchorX = Math.max(
      0,
      Math.min(
        size - 1,
        Math.floor(
          ((event.clientX - rect.left) / Math.max(1, rect.width)) * size
        )
      )
    );
    const anchorY = Math.max(
      0,
      Math.min(
        size - 1,
        Math.floor(
          ((event.clientY - rect.top) / Math.max(1, rect.height)) * size
        )
      )
    );
    dragRef.current = {
      tokenId: token.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      anchorX,
      anchorY,
      size,
      pointerType: event.pointerType,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragState({
      tokenId: token.id,
      x: event.clientX,
      y: event.clientY,
      avatar: token.avatar || "",
      name: token.name || "",
      size,
      moved: false,
    });
    event.stopPropagation();
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const threshold = drag.pointerType === "touch" ? 8 : 5;
    drag.moved =
      drag.moved ||
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >
        threshold;
    let placement = null;
    let valid = false;
    if (drag.moved) {
      event.preventDefault();
      autoScrollNearEdge(gridRef.current, event.clientX, event.clientY);
      placement = pointerPlacement(gridRef.current, event, cols, rows, drag);
      valid = Boolean(
        placement &&
          freeCell(
            tokens,
            drag.tokenId,
            placement.x,
            placement.y,
            drag.size,
            cols,
            rows
          )
      );
    }
    setDragState((value) =>
      value
        ? {
            ...value,
            x: event.clientX,
            y: event.clientY,
            moved: drag.moved,
            targetX: placement?.x,
            targetY: placement?.y,
            valid,
          }
        : value
    );
  };

  const finishDrag = async (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();
    if (!drag.moved) {
      setSelectedTokenId((value) =>
        value === drag.tokenId ? null : drag.tokenId
      );
      return;
    }
    event.preventDefault();
    suppressCellClickRef.current = true;
    requestAnimationFrame(() => {
      suppressCellClickRef.current = false;
    });
    const placement = pointerPlacement(
      gridRef.current,
      event,
      cols,
      rows,
      drag
    );
    if (
      !placement ||
      !freeCell(
        tokens,
        drag.tokenId,
        placement.x,
        placement.y,
        drag.size,
        cols,
        rows
      )
    )
      return;
    await session.moveToken?.(drag.tokenId, placement.x, placement.y);
  };

  const cancelDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragState(null);
    event.stopPropagation();
  };

  const dragTargetKeys = new Set();
  if (
    dragState?.moved &&
    Number.isFinite(dragState.targetX) &&
    Number.isFinite(dragState.targetY)
  ) {
    cellsFor({
      x: dragState.targetX,
      y: dragState.targetY,
      size: dragState.size,
    }).forEach((key) => dragTargetKeys.add(key));
  }

  const lightweightGrid = cols * rows > 576;

  const gridPointFromEvent = (event) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = Math.max(0, Math.min(cols - 1, Math.floor(((event.clientX - rect.left) / rect.width) * cols)));
    const y = Math.max(0, Math.min(rows - 1, Math.floor(((event.clientY - rect.top) / rect.height) * rows)));
    return { x, y };
  };

  const handleLightweightGridClick = (event) => {
    if (!lightweightGrid || suppressCellClickRef.current) return;
    if (event.target?.closest?.(".gm-session-token")) return;
    const point = gridPointFromEvent(event);
    if (!point) return;
    if (editingStart) void toggleStartCell(point.x, point.y);
    else void moveSelected(point.x, point.y);
  };

  const tokensByAnchor = new Map();
  tokens.forEach((token) => {
    const key = cellKey(Number(token.x), Number(token.y));
    const anchored = tokensByAnchor.get(key);
    if (anchored) anchored.push(token);
    else tokensByAnchor.set(key, [token]);
  });

  const cells = [];
  if (!lightweightGrid) {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const anchored = tokensByAnchor.get(cellKey(x, y)) || [];
        cells.push(
          <button
            type="button"
            key={cellKey(x, y)}
            className={`gm-session-map__cell tactical-cell${startKeys.has(cellKey(x, y)) ? " is-start-zone" : ""}${editingStart ? " is-start-edit" : ""}${dragTargetKeys.has(cellKey(x, y)) ? dragState?.valid ? " is-drag-target" : " is-drag-invalid" : ""}`}
            onClick={() => editingStart ? toggleStartCell(x, y) : moveSelected(x, y)}
          >
            {anchored.length ? (
              <span className="gm-session-map__tokens">
                {anchored.map((token) => {
                  const size = tokenSize(token);
                  return (
                    <span
                      key={token.id}
                      className={`gm-session-token ${token.kind === "player" ? "is-player" : "is-npc is-enemy"} is-size-${size}${selectedTokenId === token.id ? " is-selected" : ""}${dragState?.tokenId === token.id ? " is-dragging" : ""}`}
                      onPointerDown={(event) => beginDrag(event, token)}
                      onPointerMove={moveDrag}
                      onPointerUp={finishDrag}
                      onPointerCancel={cancelDrag}
                    >
                      <PhaserToken token={token} selected={selectedTokenId === token.id} />
                      <small>{token.name}</small>
                    </span>
                  );
                })}
              </span>
            ) : null}
          </button>
        );
      }
    }
  } else {
    cells.push(
      <div key="lightweight-grid" className="gm-session-map__lightweight-layer" aria-hidden="true">
        {(scene.startZone || []).map((cell) => (
          <i
            key={`start:${cell.x}:${cell.y}`}
            className={`gm-session-map__light-cell is-start-zone${editingStart ? " is-start-edit" : ""}`}
            style={{
              left: `${(Number(cell.x || 0) / cols) * 100}%`,
              top: `${(Number(cell.y || 0) / rows) * 100}%`,
              width: `${100 / cols}%`,
              height: `${100 / rows}%`,
            }}
          />
        ))}
        {dragState?.moved && Number.isFinite(dragState.targetX) && Number.isFinite(dragState.targetY) ? (
          <i
            className={`gm-session-map__light-cell ${dragState.valid ? "is-drag-target" : "is-drag-invalid"}`}
            style={{
              left: `${(dragState.targetX / cols) * 100}%`,
              top: `${(dragState.targetY / rows) * 100}%`,
              width: `${(100 / cols) * Math.max(1, dragState.size || 1)}%`,
              height: `${(100 / rows) * Math.max(1, dragState.size || 1)}%`,
            }}
          />
        ) : null}
        {tokens.map((token) => {
          const size = tokenSize(token);
          return (
            <span
              key={token.id}
              className={`gm-session-token gm-session-token--lightweight ${token.kind === "player" ? "is-player" : "is-npc is-enemy"} is-size-${size}${selectedTokenId === token.id ? " is-selected" : ""}${dragState?.tokenId === token.id ? " is-dragging" : ""}`}
              style={{
                left: `${((Number(token.x || 0) + size / 2) / cols) * 100}%`,
                top: `${((Number(token.y || 0) + size / 2) / rows) * 100}%`,
                width: `${(100 / cols) * size}%`,
                height: `${(100 / rows) * size}%`,
              }}
              onPointerDown={(event) => beginDrag(event, token)}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={cancelDrag}
            >
              <PhaserToken token={token} selected={selectedTokenId === token.id} />
              <small>{token.name}</small>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <section className="pip-panel gm-session-map tactical-map">
      <div className="gm-session-map__head">
        <div>
          <div className="gm-session-map__eyebrow">{text.authority}</div>
          <h2>[ {text.title} ]</h2>
        </div>
        <div className="gm-session-map__meta">
          <span>{session.sessionCode}</span>
          <span className={selectedIsLive ? "tactical-live" : ""}>
            {selectedIsLive ? text.active : session.status}
          </span>
          <span>
            {text.connected}: {session.players?.length || 0}
          </span>
          <span>
            {text.players}: {playerTokens.length}
          </span>
        </div>
      </div>

      <details className="phaser-map-settings">
        <summary>{text.scenes} · {text.background}</summary>
      <div className="gm-scene-library">
        <label>
          <span>{text.scenes}</span>
          <select
            className="pip-input"
            value={session.selectedSceneId || scene.sceneId}
            onChange={(event) =>
              session.switchTacticalScene?.(event.target.value)
            }
          >
            {scenes.map((item) => (
              <option key={item.sceneId} value={item.sceneId}>
                {item.name}
                {item.sceneId === session.liveSceneId ? ` • ${text.live}` : ""}
              </option>
            ))}
          </select>
        </label>
        <input
          className="pip-input gm-scene-library__name"
          value={sceneName}
          maxLength={80}
          placeholder={text.sceneName}
          onChange={(event) => setSceneName(event.target.value)}
        />
        <button
          type="button"
          className="pip-btn"
          onClick={() =>
            session.renameTacticalScene?.(scene.sceneId, sceneName)
          }
        >
          {text.saveName}
        </button>
        <button
          type="button"
          className="pip-btn is-primary"
          onClick={() =>
            session.createTacticalScene?.({
              name: `${text.scenes} ${scenes.length + 1}`,
              cols,
              rows,
            })
          }
        >
          {text.newScene}
        </button>
        <button
          type="button"
          className="pip-btn"
          disabled={scenes.length <= 1}
          onClick={() => session.deleteTacticalScene?.(scene.sceneId)}
        >
          {text.deleteScene}
        </button>
        {liveScene ? (
          <span className="gm-scene-library__live">
            {text.live}: {liveScene.name}
          </span>
        ) : null}
      </div>

      <div className="tactical-toolbar">
        <label className="tactical-size-select">
          {text.size}
          <select
            className="pip-input"
            value={`${cols}x${rows}`}
            disabled={selectedIsLive}
            onChange={(event) => setGridSize(event.target.value)}
          >
            <option value="8x8">8×8</option>
            <option value="12x12">12×12</option>
            <option value="16x12">16×12</option>
            <option value="16x16">16×16</option>
            {[18,24,36,48,60].map(size => <option key={size} value={`${size}x${size}`}>{size}×{size}</option>)}
            {![[8,8],[12,12],[16,12],[16,16],[18,18],[24,24],[36,36],[48,48],[60,60]].some(([x,y]) => x === cols && y === rows) && <option value={`${cols}x${rows}`}>{cols}×{rows}</option>}
          </select>
        </label>
        <button
          type="button"
          className={`pip-btn${editingStart ? " is-primary" : ""}`}
          onClick={() => setEditingStart((value) => !value)}
        >
          {editingStart ? text.finishEdit : text.editStart}
        </button>
        {!selectedIsLive ? (
          <button
            type="button"
            className="pip-btn is-primary"
            onClick={enableScene}
          >
            {text.startScene}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="pip-btn"
              onClick={returnPlayersToStart}
            >
              {text.resetPlayers}
            </button>
            <button
              type="button"
              className="pip-btn"
              onClick={() => session.disableTacticalScene?.()}
            >
              {text.endScene}
            </button>
          </>
        )}
        <button type="button" className="pip-btn" onClick={resetScene}>
          {text.resetMap}
        </button>
      </div>

      <div
        className={`gm-session-map__hint${editingStart ? " is-editing" : ""}`}
      >
        {editingStart
          ? text.editHint
          : selectedIsLive
          ? text.move
          : text.inactive}{" "}
        · {text.startZone}: {scene.startZone?.length || 0}
      </div>
      <input
        ref={fileRef}
        className="tactical-background-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          uploadBackground(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="tactical-background-bar">
        <div className="tactical-background-info">
          <span>{text.background}</span>
          <strong>{scene.backgroundName || text.noBackground}</strong>
        </div>
        <div className="tactical-background-actions">
          <button
            type="button"
            className="pip-btn"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? text.processing
              : scene.backgroundUrl
              ? text.replaceBackground
              : text.uploadBackground}
          </button>
          {scene.backgroundUrl ? (
            <button
              type="button"
              className="pip-btn"
              onClick={() =>
                session.updateTacticalScene?.({
                  backgroundUrl: "",
                  backgroundName: "",
                })
              }
            >
              {text.removeBackground}
            </button>
          ) : null}
        </div>
      </div>
      {uploadError ? (
        <div className="session-error tactical-background-error">
          {uploadError}
        </div>
      ) : null}
      </details>

      <section className="gm-map-actions pip-panel">
        <div className="gm-map-actions__head">
          <div className="pip-panel-title">{text.sceneActions}</div>
          <div className="gm-map-ap" aria-label={text.actionPoints}>
            <div className="gm-map-ap__row">
              <span>{text.playersAp}</span>
              <button type="button" onClick={()=>changeActionPoints("players",-1)}>−</button>
              <strong>{Math.max(0,Math.min(6,Number(actionPoints.players||0)))}/6</strong>
              <button type="button" onClick={()=>changeActionPoints("players",1)}>+</button>
            </div>
            <div className="gm-map-ap__row">
              <span>{text.gmAp}</span>
              <button type="button" onClick={()=>changeActionPoints("gm",-1)}>−</button>
              <strong>{Math.max(0,Number(actionPoints.gm||0))}</strong>
              <button type="button" onClick={()=>changeActionPoints("gm",1)}>+</button>
            </div>
          </div>
        </div>
        <div className="gm-map-actions__buttons">
          <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)} onClick={placeGeneratedEnemies}>{text.placeEnemies}</button>
          <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)||!enemyTokens.length} onClick={removeAllEnemies}>{text.removeEnemies}</button>
          {!selectedIsLive
            ? <button type="button" className="pip-btn is-primary" disabled={Boolean(sceneActionBusy)} onClick={enableScene}>{text.activateScene}</button>
            : <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)} onClick={()=>session.disableTacticalScene?.()}>{text.deactivateScene}</button>}
          <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)||Math.max(0,Number(actionPoints.gm||0))<2} onClick={runRandomComplication}>{text.randomComplication}</button>
          <button type="button" className="pip-btn" disabled={Boolean(sceneActionBusy)||Math.max(0,Number(actionPoints.gm||0))<1} onClick={runRandomApSpend}>{text.randomApSpend}</button>
        </div>
        {gmActionResult ? <div className={"gm-map-action-result"+(gmActionResult.error?" is-error":"")}>
          <strong>{gmActionResult.cost?("−"+gmActionResult.cost+" AP · "):""}{gmActionResult.label}</strong>
          {gmActionResult.effect?<span>{gmActionResult.effect}</span>:null}
          {gmActionResult.roll?<small>d20: {gmActionResult.roll}</small>:null}
        </div>:null}
      </section>

      <section className="gm-mobile-initiative" aria-label={text.initiativeOrder}>
        <div className="gm-mobile-initiative__head">
          <button type="button" className="pip-btn" disabled={!aliveInitiativeTokenIds.length} onClick={()=>session.advanceTurn?.(aliveInitiativeTokenIds,-1)}>{text.previousTurn}</button>
          <strong>{text.round} {currentRound}</strong>
          <button type="button" className="pip-btn is-primary" disabled={!aliveInitiativeTokenIds.length} onClick={()=>session.advanceTurn?.(aliveInitiativeTokenIds,1)}>{text.nextTurn}</button>
        </div>
        <div className="gm-mobile-initiative__list">
          {initiativeTokens.map((token,index)=>{
            const init=Number(token?.stats?.initiative||0);
            const hp=Number(token?.stats?.hp ?? token?.stats?.currentHp ?? 1);
            const dead=token.kind!=="player"&&hp<=0;
            const active=String(token.id)===activeTurnTokenId;
            return <button
              type="button"
              className={"gm-mobile-initiative__entry"+(active?" is-active":"")+(dead?" is-dead":"")}
              key={token.id}
              onClick={()=>focusToken(token.id)}
              title={(token.name||"Token")+" · "+text.initiative+" "+init+(dead?" · "+text.dead:"")}
              aria-label={(token.name||"Token")+" · "+text.initiative+" "+init}
            >
              <InitiativeAvatar token={token} dead={dead} />
              <span className="gm-mobile-initiative__meta">
                <b>{token.name||"Token"}</b>
                <small>{token.kind==="player"?"PLAYER":localizedRankLabel(token?.stats?.rank,language)}</small>
              </span>
            </button>;
          })}
        </div>
      </section>

      <PhaserMapViewport cols={cols} rows={rows} sceneKey={scene.sceneId} background={scene.backgroundUrl} gridRef={gridRef} player={playerTokens[0]} label={text.title}>
      <div
        data-phaser-grid="true"
        ref={gridRef}
        onClick={handleLightweightGridClick}
        className={`gm-session-map__grid tactical-grid${lightweightGrid ? " is-lightweight-grid" : ""}${
          scene.backgroundUrl ? " has-background" : ""
        }${dragState?.moved ? " is-drag-active" : ""}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`,
          "--battlemap-cell": "64px",
          "--battlemap-world-width": `${cols * 64}px`,
          "--battlemap-world-height": `${rows * 64}px`,
        }}
      >
        {cells}
      </div>
      </PhaserMapViewport>

      <WastelandPoiPortal session={session} />
      <ProceduralBattlemapExtraPortal session={session} />
      <SettlementRoomMarkerPortal session={session} />
      <SuperDuperMartRoomMarkerPortal session={session} />

      <GmBattlemapExtrasPanel session={session} />

      <section className="gm-map-creatures pip-panel">
        <div className="pip-panel-title">{text.creatures}</div>
        {tokens.length ? <div className="gm-map-creatures__list">{tokens.map(token=>{
          const hp=Number(token?.stats?.hp ?? token?.stats?.currentHp ?? 0);
          const maxHp=Number(token?.stats?.maxHp ?? token?.stats?.hp ?? 0);
          const init=Number(token?.stats?.initiative ?? 0);
          const visible=token.kind==="player" || token?.stats?.visibleToPlayers !== false;
          const expanded=String(expandedMapCreatureId)===String(token.id);
          const attacks=token.kind!=="player"?mapCreatureAttacks(token):[];
          const stats=token?.stats||{};
          const linked=token.kind!=="player"?mapBestiaryEntry(token):null;
          const detail=(label,value)=>value!==undefined&&value!==null&&String(value).trim()!==""?<div className="gm-map-creature__detail-line"><strong>{label}</strong><span>{typeof value==="object"?JSON.stringify(value):String(value)}</span></div>:null;
          return <article
            className={"gm-map-creature"+(selectedTokenId===token.id?" is-selected":"")+(expanded?" is-expanded":"")+(token.kind!=="player"&&hp<=0?" is-dead":"")}
            data-token-id={String(token.id)}
            key={token.id}
          >
            <MapCreatureAvatar token={token} linked={linked} />
            <div className="gm-map-creature__main">
              <div className="gm-map-creature__title-row">
                <strong>{token.name||"Token"}</strong>
                {token.kind!=="player"?<button type="button" className="gm-map-creature__expand" aria-label={expanded?text.collapse:text.expand} aria-expanded={expanded} onClick={()=>toggleMapCreatureCard(token.id)}>{expanded?"⌃":"⌄"}</button>:null}
              </div>
              <small>{token.kind==="player"?"PLAYER":"NPC"} · [{Number(token.x)||0},{Number(token.y)||0}] · {text.hp} {hp}{maxHp?"/"+maxHp:""} · {text.initiative} {init}</small>
            </div>
            <div className="gm-map-creature__actions">
              <button type="button" className="pip-btn" onClick={()=>focusToken(token.id)}>{text.focus}</button>
              {token.kind!=="player"?<button type="button" className="pip-btn gm-map-creature__hp-btn" onClick={()=>changeEnemyHp(token,-1)} disabled={hp<=0}>− HP</button>:null}
              {token.kind!=="player"?<EnemyHpEditor token={token} hp={hp} maxHp={Math.max(1,maxHp)} onCommit={(next)=>updateEnemy(token.id,{hp:next})} />:null}
              {token.kind!=="player"?<button type="button" className="pip-btn gm-map-creature__hp-btn" onClick={()=>changeEnemyHp(token,1)} disabled={hp>=Math.max(1,maxHp)}>+ HP</button>:null}
              {token.kind!=="player"?<button type="button" className="pip-btn" onClick={()=>toggleTokenVisibility(token)}>{visible?text.hide:text.show}</button>:null}
              {token.kind!=="player"?<button type="button" className="pip-btn" onClick={()=>session.deleteToken?.(token.id)}>{text.remove}</button>:null}
            </div>
            {token.kind!=="player"&&hp<=0?<div className="gm-map-creature__dead-label">[ {text.dead} ]</div>:null}
            {expanded&&token.kind!=="player"?<div className="gm-map-creature__details">
              <div className="gm-map-creature__stats">
                <span>HP <b>{hp}/{maxHp||"—"}</b></span>
                <span>DEF <b>{Number(stats.defense||0)}</b></span>
                <span>{text.initiative} <b>{init}</b></span>
                <span>LVL <b>{Number(stats.level||0)}</b></span>
                <span>XP <b>{Number(stats.xp||0)}</b></span>
                <span>{text.stat.rank} <b>{String(stats.rank||"standard")}</b></span>
                <span>DR <b>+{Number(stats.resistanceBonus||0)}</b></span>
                <span>DMG <b>×{Number(stats.damageMultiplier||1)}</b></span>
                <span>{text.stat.size} <b>{Number(stats.footprint||token.size||1)}×{Number(stats.footprint||token.size||1)}</b></span>
              </div>
              <div className="gm-map-creature__full-stats">
                {detail(text.stat.type,stats.creatureType||linked?.creatureType)}
                {detail(text.stat.body,stats.body??linked?.body)}
                {detail(text.stat.mind,stats.mind??linked?.mind)}
                {detail(text.stat.melee,stats.melee??linked?.melee)}
                {detail(text.stat.guns,stats.guns??linked?.guns)}
                {detail(text.stat.other,stats.other??linked?.other)}
                {detail(text.stat.skills,stats.skills??linked?.skills)}
                {detail(text.stat.special,stats.special??linked?.special)}
                {detail(text.stat.specialFeature, localizedFeatureText(stats.specialFeatureId,language,"special") || stats.specialFeature)}
                {detail(text.stat.legendaryAbility, localizedFeatureText(stats.legendaryAbilityId,language,"legendary") || stats.legendaryAbility)}
                {detail(text.stat.abilities,stats.abilities??linked?.abilities)}
                {Array.isArray(stats.legendaryPerks)&&stats.legendaryPerks.length?detail(text.stat.legendaryPerks,stats.legendaryPerks.map((perk)=>localizedLegendaryPerk(perk,language)).join("\n")):null}
                {(stats.physicalDrBonus||stats.energyDrBonus||stats.radiationDrBonus||stats.poisonDrBonus)?detail(text.stat.perkDr,[
                  stats.physicalDrBonus?`Physical +${stats.physicalDrBonus}`:"",
                  stats.energyDrBonus?`Energy +${stats.energyDrBonus}`:"",
                  stats.radiationDrBonus?`Radiation +${stats.radiationDrBonus}`:"",
                  stats.poisonDrBonus?`Poison +${stats.poisonDrBonus}`:"",
                ].filter(Boolean).join(" · ")):null}
                {detail(text.stat.resistance,stats.drBlock??linked?.drBlock)}
                {detail(text.stat.tactics,stats.tactics??linked?.tactics)}
                {detail(text.stat.loot,stats.loot??linked?.loot)}
                {detail(text.stat.summary,stats.summary??linked?.summary)}
                {detail(text.stat.notes,stats.notes)}
                {detail(text.stat.source,stats.source??linked?.source)}
              </div>
              <div className="gm-map-creature__attacks">
                <strong>[ {text.attacks} ]</strong>
                {attacks.length?attacks.map((attack,index)=>{
                  const profile=effectiveAttackProfile(attack,stats);
                  return <button type="button" className="gm-npc-attack-button" key={attack.id||attack.name||index} onClick={()=>openMapAttackRoll(attack,token)}>
                    <b>{attack.name||text.attacks}<em>{attackKindLabel(profile,language)}</em></b>
                    <span>{profile.d20Count}d20 · TN {profile.targetNumber||"—"} · {profile.damageDice} CD · {profile.damageType||"—"}{profile.effects?" · "+profile.effects:""}</span>
                  </button>;
                }):<small>{text.noAttacks}</small>}
              </div>
            </div>:null}
          </article>;
        })}</div>:<small className="gm-map-creatures__empty">{text.emptyCreatures}</small>}
      </section>

      <section className="gm-map-rooms">
        <GmProceduralRoomDescriptionsV4 ref={roomDescriptionsRef} session={session} embedded />
      </section>

      <TacticalEnemyManager
        tokens={enemyTokens.map(managerToken)}
        selectedTokenId={selectedTokenId}
        onSelectToken={setSelectedTokenId}
        onAddToken={addEnemy}
        onRemoveToken={(tokenId) => session.deleteToken?.(tokenId)}
        onUpdateToken={updateEnemy}
      />
      <DiceRollModal
        isOpen={mapDiceOpen}
        onClose={()=>setMapDiceOpen(false)}
        rollConfig={mapRollConfig}
        form={null}
        pendingAutoD6={mapPendingAutoD6}
        setPendingAutoD6={setMapPendingAutoD6}
        combatState={session?.combat||null}
        currentLuckPoints={undefined}
        onSpendCombatLuck={undefined}
        onMarkCombatUse={undefined}
        onDiceResult={session?.sendDiceResult}
      />

      {dragState?.moved ? (
        <div
          className={`tactical-drag-ghost is-size-${dragState.size}`}
          style={{ left: dragState.x, top: dragState.y }}
        >
          {dragState.avatar ? (
            <img src={dragState.avatar} alt="" />
          ) : (
            <b>{String(dragState.name || "T").slice(0, 1)}</b>
          )}
        </div>
      ) : null}
    </section>
  );
}
