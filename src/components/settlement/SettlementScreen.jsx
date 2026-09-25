import { personalConstructionCopy } from '../campaign/personalConstructionCopy.js';
import { upgradeRule } from '../../utils/settlementDevelopment.js';
import SettlementDailySummary from "./SettlementDailySummary.jsx";
import SettlementBuildingWorkers from "./SettlementBuildingWorkers.jsx";
import { reserveProvisions } from "../../utils/settlementProvisions.js";
import { availableSettlementActions } from "../../utils/settlementResidents.js";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SETTLEMENT_BUILDINGS, SETTLEMENT_BUILDING_LIST, SETTLEMENT_GRID_SIZE, settlementBuildingName } from "../../data/settlement/buildings.js";
import { ROOMS, SETTLEMENT_ACTIONS, settlementRuleName } from "../../data/settlement/rulebook.js";
import { formatRulebookCost, getRulebookBuilding } from "../../data/settlement/rulebookCatalog.js";
import { calculateSettlementStats, formatBuildTime } from "../../utils/settlementEconomy.js";
import { calculateAttackRisk, resolveSettlementAttack, setSettlementDefensePlan } from "../../utils/settlementAttackEngine.js";
import { startSettlementRaidBattle } from "../../utils/settlementRaidBattle.js";
import { damagedSettlementBuildings, repairCostForBuilding } from "../../utils/settlementRepair.js";
import { settlementProfit } from "../../utils/settlementProfit.js";
import { SETTLER_PERKS, SETTLER_SKILLS, advanceSettlerProfile, settlerProfileLabel, settlerXpForNextLevel, settlerActionBonus } from "../../utils/settlementSettlerProfile.js";
import { checkedPlayerResources, creditPersonalResources, debitPersonalResources } from "../../utils/personalResources.js";
import { resolveSettlementWorkplaces } from "../../utils/settlementWorkplaces.js";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import { SETTLEMENT_DAY_MS, canAffordRoom, canAffordRulebookBuilding, createConstructionBuilding, createRoomConstruction, getConstructionProgress, getRoomConstructionProgress, getSettlementRulebookSnapshot, getStructureRoomCapacity, normalizeStockpile, payRoomCost, payRulebookBuildingCost } from "../../utils/settlementDayEngine.js";
import { getSettlementAsset } from "./settlementAssets.js";
import "./settlement.css";
import "./settlementRedesign.css";
import SheetIcon from "../layout/SheetIcon.jsx";
import SettlementPhaserMap from "./SettlementPhaserMap.jsx";
import SettlementReputationInline from "./SettlementReputationInline.jsx";

const BUILDING_ICONS = { crop_field: "🌾", water_pump: "💧", generator: "⚡", armor_workbench: "🔧", trading_post: "¤", clinic: "+", guard_post: "▲", turret: "⌖" };
const BUILD_CATEGORIES = ["housing", "food", "water", "power", "production", "commerce", "services", "defense"];
const ROOM_ORDER = ["private_room", "dormitory", "quarters", "lounge", "storage", "office"];
const PANEL_ICONS = { build: "⚒", people: "👥", resources: "▣", defense: "⬟", events: "!" };
const ROOM_NAMES = {
  en: { private_room: "Private Room", dormitory: "Dormitory", quarters: "Quarters", lounge: "Lounge", storage: "Storage", office: "Office" },
  ru: { private_room: "Личная комната", dormitory: "Общежитие", quarters: "Жилые помещения", lounge: "Гостиная", storage: "Склад", office: "Офис" },
  uk: { private_room: "Приватна кімната", dormitory: "Гуртожиток", quarters: "Житлові приміщення", lounge: "Вітальня", storage: "Сховище", office: "Офіс" },
  pl: { private_room: "Pokój prywatny", dormitory: "Dormitorium", quarters: "Kwatery", lounge: "Salon", storage: "Magazyn", office: "Biuro" },
};
const CATEGORY_LABELS = {
  en: { housing: "HOUSING", food: "FOOD", water: "WATER", power: "POWER", production: "PRODUCTION", commerce: "TRADE", services: "SERVICES", defense: "DEFENSE" },
  ru: { housing: "ЖИЛЬЁ", food: "ЕДА", water: "ВОДА", power: "ЭНЕРГИЯ", production: "ПРОИЗВОДСТВО", commerce: "ТОРГОВЛЯ", services: "СЕРВИС", defense: "ОБОРОНА" },
  uk: { housing: "ЖИТЛО", food: "ЇЖА", water: "ВОДА", power: "ЕНЕРГІЯ", production: "ВИРОБНИЦТВО", commerce: "ТОРГІВЛЯ", services: "СЕРВІС", defense: "ОБОРОНА" },
  pl: { housing: "MIESZKANIA", food: "ŻYWNOŚĆ", water: "WODA", power: "ENERGIA", production: "PRODUKCJA", commerce: "HANDEL", services: "USŁUGI", defense: "OBRONA" },
};
const BUILD_INFO_COPY = {
  en:{gives:"PRODUCES / PROVIDES",requirements:"REQUIREMENTS",missing:"MISSING",ready:"READY",common:"Common",uncommon:"Uncommon",rare:"Rare",caps:"Caps",skill:"Skill",perk:"Perk",oneOf:"One of",powerUse:"Power use",power:"Power",water:"Water",defense:"Defense",income:"Income",happiness:"Happiness",beds:"Beds",rooms:"Room slots",storage:"Storage",crops:"Crop slots",brahmin:"Brahmin capacity",worker:"Worker",crafting:"Crafting",recruitment:"Attracts settlers",trade:"Trade outpost",scavenging:"Improved scavenging",transmit:"Transmits power",guardBonus:"Guard defense",store:"Store tier",medical:"Medical services",salvage:"Salvage bonus"},
  ru:{gives:"ДАЁТ / ПРОИЗВОДИТ",requirements:"ТРЕБОВАНИЯ",missing:"НЕ ХВАТАЕТ",ready:"ГОТОВО",common:"Обычные",uncommon:"Необычные",rare:"Редкие",caps:"Крышки",skill:"Навык",perk:"Перк",oneOf:"Один из",powerUse:"Потребляет энергии",power:"Энергия",water:"Вода",defense:"Оборона",income:"Доход",happiness:"Счастье",beds:"Кровати",rooms:"Места комнат",storage:"Хранилище",crops:"Ячейки культур",brahmin:"Вместимость браминов",worker:"Работник",crafting:"Крафт",recruitment:"Привлекает поселенцев",trade:"Торговый пост",scavenging:"Улучшенный сбор хлама",transmit:"Передаёт энергию",guardBonus:"Бонус охраны",store:"Уровень магазина",medical:"Медицинские услуги",salvage:"Бонус хлама"},
  uk:{gives:"ДАЄ / ВИРОБЛЯЄ",requirements:"ВИМОГИ",missing:"НЕ ВИСТАЧАЄ",ready:"ГОТОВО",common:"Звичайні",uncommon:"Незвичайні",rare:"Рідкісні",caps:"Кришки",skill:"Навичка",perk:"Перк",oneOf:"Один з",powerUse:"Споживає енергії",power:"Енергія",water:"Вода",defense:"Оборона",income:"Дохід",happiness:"Щастя",beds:"Ліжка",rooms:"Місця кімнат",storage:"Сховище",crops:"Комірки культур",brahmin:"Місткість брамінів",worker:"Працівник",crafting:"Крафт",recruitment:"Приваблює поселенців",trade:"Торговий пост",scavenging:"Покращений збір брухту",transmit:"Передає енергію",guardBonus:"Бонус охорони",store:"Рівень магазину",medical:"Медичні послуги",salvage:"Бонус брухту"},
  pl:{gives:"DAJE / PRODUKUJE",requirements:"WYMAGANIA",missing:"BRAKUJE",ready:"GOTOWE",common:"Pospolite",uncommon:"Niepospolite",rare:"Rzadkie",caps:"Kapsle",skill:"Umiejętność",perk:"Atut",oneOf:"Jeden z",powerUse:"Zużycie energii",power:"Energia",water:"Woda",defense:"Obrona",income:"Dochód",happiness:"Szczęście",beds:"Łóżka",rooms:"Miejsca na pokoje",storage:"Magazyn",crops:"Miejsca upraw",brahmin:"Pojemność braminów",worker:"Pracownik",crafting:"Rzemiosło",recruitment:"Przyciąga osadników",trade:"Punkt handlowy",scavenging:"Lepsze zbieranie złomu",transmit:"Przesyła energię",guardBonus:"Bonus straży",store:"Poziom sklepu",medical:"Usługi medyczne",salvage:"Bonus złomu"},
};
const COPY = {
  en: { back: "WORLD MAP", build: "BUILD", people: "RESIDENTS", resources: "RESOURCES", defense: "DEFENSE", events: "EVENTS", cancel: "CANCEL", caps: "Caps", food: "Food", water: "Water", power: "Power", beds: "Beds", happiness: "Happiness", income: "Income", materials: "Materials", construction: "Construction", cannotPlace: "Cannot place here", insufficient: "Not enough stockpile materials", tapMap: "Choose a free area on the map", empty: "Choose a building below", manage: "BUILDING", move: "MOVE", demolish: "DISASSEMBLE", active: "Active", attack: "ATTACK", warning: "Raid warning", attackActive: "Attack in progress", strength: "Enemy strength", autoDefense: "SIMULATE DEFENSE", playBattle: "PLAY BATTLE", resumeBattle: "OPEN BATTLE", gmSessionRequired: "Start the GM session to play this raid on the battlemap.", battlePreparing: "PREPARING BATTLE...", battleFailed: "Could not prepare battlemap", defenders: "DEFENDERS", heroes: "HEROES", heroContribution: "Hero contribution", saveDefense: "SAVE DEFENSE", startsIn: "Starts in", noThreat: "No active threat", victory: "Victory", defeat: "Defeat", battleReport: "TOWER DEFENSE REPORT", rounds: "Rounds", attackers: "Attackers", defeatedEnemies: "Enemies destroyed", breached: "Reached HQ", turrets: "Turrets", turretShots: "Turret shots", turretDamage: "Turret damage", wallsDestroyed: "Walls breached", stolen: "Resources stolen", cosmeticOnly: "Heroes and residents are visual participants only", recovery: "RECOVERY", repair: "START REPAIR", repairing: "Repairing", repairCost: "Repair cost", repairWorkers: "Repair workers", noDamage: "No damaged structures", hqLocked: "Settlement HQ cannot be moved or disassembled", stockpile: "STOCKPILE", common: "Common", uncommon: "Uncommon", rare: "Rare", day: "Day", nextDay: "Next settlement day", target: "Construction target", none: "None", progress: "Progress", riskCheck: "End-of-day risk dice", perimeter: "Perimeter deterrence", firepower: "Turret firepower", rooms: "ROOMS", full: "No free room slots", roomBuilding: "Under construction", status: "Status", stable: "Stable", risk: "Attack risk", nextEvent: "Next event", grid: "Grid", condition: "Condition", production: "Production", consumption: "Power use", noEvents: "No recent events", playerProfit: "PLAYER PROFIT", claimProfit: "CLAIM PROFIT", profitEmpty: "No profit available yet", settlementReserve: "50% stays in settlement reserve", level: "Level", xp: "XP", advancement: "ADVANCEMENT", improveSkill: "Improve skill", learnPerk: "Learn perk", newSettler: "NEW SETTLER", assignNow: "ASSIGN WORK", unassigned: "Unassigned", importedNpc: "IMPORTED NPC", removeNpc: "REMOVE NPC", sourceJson: "Imported from JSON", health: "Health", sick: "Sick", injured: "Injured", recovering: "Recovering", idle: "Healthy", transfer:"TRANSFER RESOURCES", deposit:"TO SETTLEMENT", withdraw:"TO PLAYER", playerHave:"Player", settlementHave:"Settlement", produced:"Produced / stored" },
  ru: { back: "ГЛОБАЛЬНАЯ КАРТА", build: "СТРОИТЬ", people: "ЖИТЕЛИ", resources: "РЕСУРСЫ", defense: "ОБОРОНА", events: "СОБЫТИЯ", cancel: "ОТМЕНА", caps: "Крышки", food: "Еда", water: "Вода", power: "Энергия", beds: "Кровати", happiness: "Счастье", income: "Доход", materials: "Материалы", construction: "Строительство", cannotPlace: "Здесь строить нельзя", insufficient: "Недостаточно материалов в запасах", tapMap: "Выберите свободное место на карте", empty: "Выберите постройку снизу", manage: "ПОСТРОЙКА", move: "ПЕРЕМЕСТИТЬ", demolish: "РАЗОБРАТЬ", active: "Работает", attack: "АТАКА", warning: "Обнаружены враги", attackActive: "Идёт нападение", strength: "Сила врага", autoDefense: "РАССЧИТАТЬ ОБОРОНУ", playBattle: "ИГРАТЬ БОЙ", resumeBattle: "ОТКРЫТЬ БОЙ", gmSessionRequired: "Запустите сессию ГМ, чтобы провести этот рейд на боевой карте.", battlePreparing: "ПОДГОТОВКА БОЯ...", battleFailed: "Не удалось подготовить боевую карту", defenders: "ЗАЩИТНИКИ", heroes: "ГЕРОИ", heroContribution: "Вклад героев", saveDefense: "СОХРАНИТЬ ОБОРОНУ", startsIn: "Начало через", noThreat: "Активных угроз нет", victory: "Победа", defeat: "Поражение", battleReport: "ОТЧЁТ TOWER DEFENSE", rounds: "Раунды", attackers: "Нападавшие", defeatedEnemies: "Уничтожено врагов", breached: "Добрались до штаба", turrets: "Турели", turretShots: "Выстрелы турелей", turretDamage: "Урон турелей", wallsDestroyed: "Пробито стен", stolen: "Украдено ресурсов", cosmeticOnly: "Герои и жители участвуют только визуально", recovery: "ВОССТАНОВЛЕНИЕ", repair: "НАЧАТЬ РЕМОНТ", repairing: "Ремонт", repairCost: "Стоимость ремонта", repairWorkers: "Ремонтники", noDamage: "Повреждённых построек нет", hqLocked: "Штаб поселения нельзя перемещать или разбирать", stockpile: "ЗАПАСЫ", common: "Обычные", uncommon: "Необычные", rare: "Редкие", day: "День", nextDay: "Следующий день поселения", target: "Цель строительства", none: "Нет", progress: "Прогресс", riskCheck: "Кости риска в конце дня", perimeter: "Снижение риска периметром", firepower: "Огневая мощь турелей", rooms: "КОМНАТЫ", full: "Нет свободных мест для комнат", roomBuilding: "Строится", status: "Статус", stable: "Стабильно", risk: "Риск атаки", nextEvent: "Следующее событие", grid: "Сетка", condition: "Состояние", production: "Производство", consumption: "Потребление энергии", noEvents: "Нет недавних событий", playerProfit: "ПРИБЫЛЬ ИГРОКА", claimProfit: "ЗАБРАТЬ ПРИБЫЛЬ", profitEmpty: "Прибыли пока нет", settlementReserve: "50% остаётся в резерве поселения", level: "Уровень", xp: "Опыт", advancement: "РАЗВИТИЕ", improveSkill: "Улучшить навык", learnPerk: "Получить перк", newSettler: "НОВЫЙ ПОСЕЛЕНЕЦ", assignNow: "НАЗНАЧИТЬ РАБОТУ", unassigned: "Без назначения", importedNpc: "ИМПОРТИРОВАННЫЙ NPC", removeNpc: "УДАЛИТЬ NPC", sourceJson: "Импортирован из JSON", health: "Здоровье", sick: "Болен", injured: "Травмирован", recovering: "Восстанавливается", idle: "Здоров", transfer:"ПЕРЕВОД РЕСУРСОВ", deposit:"В ПОСЕЛЕНИЕ", withdraw:"ИГРОКУ", playerHave:"У игрока", settlementHave:"Поселение", produced:"Произведено / хранится" },
  uk: { back: "ГЛОБАЛЬНА МАПА", build: "БУДУВАТИ", people: "ЖИТЕЛІ", resources: "РЕСУРСИ", defense: "ОБОРОНА", events: "ПОДІЇ", cancel: "СКАСУВАТИ", caps: "Кришки", food: "Їжа", water: "Вода", power: "Енергія", beds: "Ліжка", happiness: "Щастя", income: "Дохід", materials: "Матеріали", construction: "Будівництво", cannotPlace: "Тут будувати не можна", insufficient: "Недостатньо матеріалів у запасах", tapMap: "Оберіть вільне місце на мапі", empty: "Оберіть споруду знизу", manage: "СПОРУДА", move: "ПЕРЕМІСТИТИ", demolish: "РОЗІБРАТИ", active: "Працює", attack: "АТАКА", warning: "Ворог наближається", attackActive: "Триває напад", strength: "Сила ворога", autoDefense: "РОЗРАХУВАТИ ОБОРОНУ", playBattle: "ГРАТИ БІЙ", resumeBattle: "ВІДКРИТИ БІЙ", gmSessionRequired: "Запустіть сесію ГМ, щоб провести цей рейд на бойовій мапі.", battlePreparing: "ПІДГОТОВКА БОЮ...", battleFailed: "Не вдалося підготувати бойову мапу", defenders: "ЗАХИСНИКИ", heroes: "ГЕРОЇ", heroContribution: "Внесок героїв", saveDefense: "ЗБЕРЕГТИ ОБОРОНУ", startsIn: "Початок через", noThreat: "Активних загроз немає", victory: "Перемога", defeat: "Поразка", battleReport: "ЗВІТ TOWER DEFENSE", rounds: "Раунди", attackers: "Нападники", defeatedEnemies: "Знищено ворогів", breached: "Дісталися штабу", turrets: "Турелі", turretShots: "Постріли турелей", turretDamage: "Шкода турелей", wallsDestroyed: "Пробито стін", stolen: "Вкрадено ресурсів", cosmeticOnly: "Герої та жителі беруть участь лише візуально", recovery: "ВІДНОВЛЕННЯ", repair: "ПОЧАТИ РЕМОНТ", repairing: "Ремонт", repairCost: "Вартість ремонту", repairWorkers: "Ремонтники", noDamage: "Пошкоджених споруд немає", hqLocked: "Штаб поселення не можна переміщати або розбирати", stockpile: "ЗАПАСИ", common: "Звичайні", uncommon: "Незвичайні", rare: "Рідкісні", day: "День", nextDay: "Наступний день поселення", target: "Ціль будівництва", none: "Немає", progress: "Прогрес", riskCheck: "Кості ризику наприкінці дня", perimeter: "Зниження ризику периметром", firepower: "Вогнева міць турелей", rooms: "КІМНАТИ", full: "Немає вільних місць для кімнат", roomBuilding: "Будується", status: "Статус", stable: "Стабільно", risk: "Ризик атаки", nextEvent: "Наступна подія", grid: "Сітка", condition: "Стан", production: "Виробництво", consumption: "Споживання енергії", noEvents: "Немає недавніх подій", playerProfit: "ПРИБУТОК ГРАВЦЯ", claimProfit: "ЗАБРАТИ ПРИБУТОК", profitEmpty: "Прибутку поки немає", settlementReserve: "50% залишається в резерві поселення", level: "Рівень", xp: "Досвід", advancement: "РОЗВИТОК", improveSkill: "Покращити навичку", learnPerk: "Отримати перк", newSettler: "НОВИЙ ПОСЕЛЕНЕЦЬ", assignNow: "ПРИЗНАЧИТИ РОБОТУ", unassigned: "Без призначення", importedNpc: "ІМПОРТОВАНИЙ NPC", removeNpc: "ВИДАЛИТИ NPC", sourceJson: "Імпортовано з JSON", health: "Здоров’я", sick: "Хворіє", injured: "Травмований", recovering: "Відновлюється", idle: "Здоровий", transfer:"ПЕРЕДАЧА РЕСУРСІВ", deposit:"У ПОСЕЛЕННЯ", withdraw:"ГРАВЦЮ", playerHave:"У гравця", settlementHave:"Поселення", produced:"Вироблено / зберігається" },
  pl: { back: "MAPA ŚWIATA", build: "BUDUJ", people: "MIESZKAŃCY", resources: "ZASOBY", defense: "OBRONA", events: "ZDARZENIA", cancel: "ANULUJ", caps: "Kapsle", food: "Żywność", water: "Woda", power: "Energia", beds: "Łóżka", happiness: "Szczęście", income: "Dochód", materials: "Materiały", construction: "Budowa", cannotPlace: "Nie można tu budować", insufficient: "Za mało materiałów w zapasach", tapMap: "Wybierz wolne miejsce na mapie", empty: "Wybierz budynek poniżej", manage: "BUDYNEK", move: "PRZENIEŚ", demolish: "ROZBIERZ", active: "Aktywny", attack: "ATAK", warning: "Wróg się zbliża", attackActive: "Atak trwa", strength: "Siła wroga", autoDefense: "SYMULUJ OBRONĘ", playBattle: "GRAJ BITWĘ", resumeBattle: "OTWÓRZ BITWĘ", gmSessionRequired: "Uruchom sesję MG, aby rozegrać ten najazd na mapie bitwy.", battlePreparing: "PRZYGOTOWYWANIE BITWY...", battleFailed: "Nie udało się przygotować mapy bitwy", defenders: "OBROŃCY", heroes: "BOHATEROWIE", heroContribution: "Wkład bohaterów", saveDefense: "ZAPISZ OBRONĘ", startsIn: "Początek za", noThreat: "Brak aktywnego zagrożenia", victory: "Zwycięstwo", defeat: "Porażka", battleReport: "RAPORT TOWER DEFENSE", rounds: "Rundy", attackers: "Napastnicy", defeatedEnemies: "Zniszczeni wrogowie", breached: "Dotarli do centrum", turrets: "Wieżyczki", turretShots: "Strzały wieżyczek", turretDamage: "Obrażenia wieżyczek", wallsDestroyed: "Przełamane ściany", stolen: "Skradzione zasoby", cosmeticOnly: "Bohaterowie i mieszkańcy uczestniczą tylko wizualnie", recovery: "ODZYSKIWANIE", repair: "ROZPOCZNIJ NAPRAWĘ", repairing: "Naprawa", repairCost: "Koszt naprawy", repairWorkers: "Pracownicy naprawy", noDamage: "Brak uszkodzonych budynków", hqLocked: "Centrum osady nie może być przenoszone ani rozbierane", stockpile: "ZAPASY", common: "Pospolite", uncommon: "Niepospolite", rare: "Rzadkie", day: "Dzień", nextDay: "Następny dzień osady", target: "Cel budowy", none: "Brak", progress: "Postęp", riskCheck: "Kości ryzyka na koniec dnia", perimeter: "Redukcja ryzyka przez obwód", firepower: "Siła ognia wieżyczek", rooms: "POMIESZCZENIA", full: "Brak wolnych miejsc", roomBuilding: "W budowie", status: "Status", stable: "Stabilnie", risk: "Ryzyko ataku", nextEvent: "Następne zdarzenie", grid: "Siatka", condition: "Stan", production: "Produkcja", consumption: "Zużycie energii", noEvents: "Brak ostatnich zdarzeń", playerProfit: "ZYSK GRACZA", claimProfit: "ODBIERZ ZYSK", profitEmpty: "Brak dostępnego zysku", settlementReserve: "50% pozostaje w rezerwie osady", level: "Poziom", xp: "PD", advancement: "ROZWÓJ", improveSkill: "Ulepsz umiejętność", learnPerk: "Zdobądź perk", newSettler: "NOWY MIESZKANIEC", assignNow: "PRZYDZIEL PRACĘ", unassigned: "Bez przydziału", importedNpc: "IMPORTOWANY NPC", removeNpc: "USUŃ NPC", sourceJson: "Zaimportowano z JSON", health: "Zdrowie", sick: "Chory", injured: "Ranny", recovering: "Wraca do zdrowia", idle: "Zdrowy", transfer:"TRANSFER ZASOBÓW", deposit:"DO OSADY", withdraw:"DO GRACZA", playerHave:"Gracz", settlementHave:"Osada", produced:"Wyprodukowano / magazyn" },
};
const EVENT_COPY={
  en:{travelling_merchant:'Travelling merchant',lucky_find:'Lucky find',minor_illness:'Minor illness',equipment_failure:'Equipment failure',settler_dispute:'Settler dispute',good_harvest:'Good harvest',wanderer_story:'Wanderer story'},
  ru:{travelling_merchant:'Странствующий торговец',lucky_find:'Удачная находка',minor_illness:'Лёгкая болезнь',equipment_failure:'Поломка оборудования',settler_dispute:'Спор поселенцев',good_harvest:'Хороший урожай',wanderer_story:'История странника'},
  uk:{travelling_merchant:'Мандрівний торговець',lucky_find:'Вдала знахідка',minor_illness:'Легка хвороба',equipment_failure:'Поломка обладнання',settler_dispute:'Суперечка поселенців',good_harvest:'Гарний врожай',wanderer_story:'Історія мандрівника'},
  pl:{travelling_merchant:'Wędrowny handlarz',lucky_find:'Szczęśliwe znalezisko',minor_illness:'Lekka choroba',equipment_failure:'Awaria sprzętu',settler_dispute:'Spór mieszkańców',good_harvest:'Dobre zbiory',wanderer_story:'Opowieść wędrowca'},
};
function eventText(event,language){
  const key=String(language||'en').split('-')[0],name=EVENT_COPY[key]?.[event?.type]||EVENT_COPY.en[event?.type]||String(event?.type||'event').replaceAll('_',' ');
  const parts=[name];
  if(event?.caps)parts.push(`+${event.caps} caps`);
  if(event?.common)parts.push(`+${event.common} common`);
  if(event?.uncommon)parts.push(`+${event.uncommon} uncommon`);
  if(event?.rare)parts.push(`+${event.rare} rare`);
  if(event?.food)parts.push(`+${event.food} food`);
  if(event?.happiness)parts.push(`+${event.happiness} happiness`);
  if(event?.happinessLoss)parts.push(`-${event.happinessLoss} happiness`);
  if(event?.healthLoss)parts.push(`${event.settlerName||''} -${event.healthLoss} HP`.trim());
  if(event?.conditionLoss)parts.push(`${event.buildingType||''} -${event.conditionLoss}%`.trim());
  if(event?.skill)parts.push(`${event.skill} ${event.skillRank||0}`);
  if(event?.mitigated)parts.push('✓');
  return parts.filter(Boolean).join(' · ');
}
function roomName(type, language) { return ROOM_NAMES[language]?.[type] || ROOM_NAMES.en[type] || type; }
function roomCost(rule) { return [[rule?.materials?.common,"C"],[rule?.materials?.uncommon,"U"],[rule?.materials?.rare,"R"]].filter(([value])=>value).map(([value,suffix])=>`${value} ${suffix}`).join(" · ") || "—"; }
function roomEffects(rule) { const effects=rule?.effects || {}; return [effects.beds ? `🛏 +${effects.beds}` : null,effects.happiness ? `☺ ${effects.happiness > 0 ? "+" : ""}${effects.happiness}` : null,effects.storageLbs ? `📦 +${effects.storageLbs} lbs` : null,effects.office ? "OFFICE" : null].filter(Boolean).join(" · "); }
function normalizeRuleName(value){return String(value||"").toLowerCase().replace(/[^a-z0-9а-яёіїєґ]+/gi," ").replace(/\s+/g," ").trim();}
function characterSkillRank(character,name){const needle=normalizeRuleName(name);for(const [key,value] of Object.entries(character?.skills||{})){if(normalizeRuleName(key)===needle)return Math.max(0,Number(value?.rank??value??0)||0);}return 0;}
function characterPerkRank(character,name){const needle=normalizeRuleName(name);const source=[...(character?.perksAndTraits||[]),...(character?.perks||[])];let best=0;for(const item of source){if(normalizeRuleName(item?.name||item?.id||item)!==needle)continue;best=Math.max(best,Number(item?.rank??item?.level??1)||1);}return best;}
function buildingEffectParts(rule,definition,copy){const e=rule?.effects||{},parts=[];if(e.power)parts.push(`⚡ ${copy.power} +${e.power}`);if(e.water)parts.push(`💧 ${copy.water} +${e.water}`);if(e.defense)parts.push(`⬟ ${copy.defense} +${e.defense}`);if(e.income)parts.push(`¤ ${copy.income} +${e.income}`);if(e.happiness)parts.push(`♥ ${copy.happiness} +${e.happiness}`);if(e.beds)parts.push(`🛏 ${copy.beds} +${e.beds}`);if(e.roomCapacity)parts.push(`▦ ${copy.rooms} +${e.roomCapacity}`);if(e.storageLbs)parts.push(`▣ ${copy.storage} +${e.storageLbs} lbs`);if(e.cropSlots)parts.push(`🌾 ${copy.crops} +${e.cropSlots}`);if(e.brahminCapacity)parts.push(`🐂 ${copy.brahmin} +${e.brahminCapacity}`);if(e.requiresPower)parts.push(`−⚡ ${copy.powerUse} ${e.requiresPower}`);if(e.crafting)parts.push(`🔧 ${copy.crafting}: ${String(e.craftingType||"").replaceAll("_"," ")}`);if(e.attractsPeople)parts.push(`👥 ${copy.recruitment}`);if(e.tradeOutpost)parts.push(`¤ ${copy.trade}`);if(e.improvedScavenging)parts.push(`♻ ${copy.scavenging}`);if(e.transmitsPower)parts.push(`⚡ ${copy.transmit}`);if(e.guardActionDefenseBonus)parts.push(`⬟ ${copy.guardBonus} +${e.guardActionDefenseBonus}`);if(e.defensePerGuardPost)parts.push(`⬟ ${copy.guardBonus} +${e.defensePerGuardPost}/post`);if(e.storeTier)parts.push(`¤ ${copy.store} ${e.storeTier}`);if(e.medical)parts.push(`+ ${copy.medical}`);if(e.salvageBonusDice)parts.push(`♻ ${copy.salvage} +${e.salvageBonusDice} CD`);if(Number(definition?.workersRequired||0)>0)parts.push(`👤 ${copy.worker} ×${definition.workersRequired}`);return parts;}
function buildingRequirementState(rule,settlement,character,copy){const stock=normalizeStockpile(settlement?.stockpile,settlement?.resources?.materials),caps=Math.max(0,Number(settlement?.resources?.caps||0)),rows=[];for(const [key,label] of [["common",copy.common],["uncommon",copy.uncommon],["rare",copy.rare]]){const need=Math.max(0,Number(rule?.materials?.[key]||0));if(!need)continue;const have=Math.max(0,Number(stock.materials?.[key]||0));rows.push({label:`${label}: ${have}/${need}`,ok:have>=need});}if(Number(rule?.caps||0)>0)rows.push({label:`${copy.caps}: ${caps}/${rule.caps}`,ok:caps>=Number(rule.caps)});[...(rule?.skill?[rule.skill]:[]),...(rule?.skills||[])].forEach(req=>{const actual=character?characterSkillRank(character,req.name):null;rows.push({label:`${copy.skill}: ${req.name} ${actual===null?"?":actual}/${req.rank}`,ok:actual===null?null:actual>=Number(req.rank)});});[...(rule?.perk?[rule.perk]:[]),...(rule?.perks||[])].forEach(req=>{const actual=character?characterPerkRank(character,req.name):null;rows.push({label:`${copy.perk}: ${req.name} ${actual===null?"?":actual}/${req.rank}`,ok:actual===null?null:actual>=Number(req.rank)});});if(Array.isArray(rule?.perkAnyOf)&&rule.perkAnyOf.length){const values=rule.perkAnyOf.map(req=>({req,actual:character?characterPerkRank(character,req.name):null}));rows.push({label:`${copy.oneOf}: ${values.map(({req,actual})=>`${req.name} ${actual===null?"?":actual}/${req.rank}`).join(" | ")}`,ok:character?values.some(({req,actual})=>actual>=Number(req.rank)):null});}return {rows,missing:rows.filter(row=>row.ok===false),ok:rows.every(row=>row.ok!==false)};}
function selectedBuildingProduction(settlement,building,language){
  if(!building)return '';
  const plan=resolveSettlementWorkplaces(settlement),site=plan.byBuilding[building.id];
  if(!site)return '';
  const code=String(language||'en').split('-')[0];
  const copy={
    en:{day:'/day',income:'income',common:'Common',uncommon:'Uncommon',damage:'damage',effects:'Effects',needs:'needs worker'},
    ru:{day:'/день',income:'доход',common:'обычные',uncommon:'необычные',damage:'урон',effects:'эффекты',needs:'нужен работник'},
    uk:{day:'/день',income:'дохід',common:'звичайні',uncommon:'незвичайні',damage:'шкода',effects:'ефекти',needs:'потрібен працівник'},
    pl:{day:'/dzień',income:'dochód',common:'pospolite',uncommon:'niepospolite',damage:'obrażenia',effects:'Efekty',needs:'potrzebny pracownik'},
  };
  const t=copy[code]||copy.en;
  if(site.action==='trade_caravan'){
    if(!site.workerIds.length)return '0 caps '+t.day+' · '+t.needs;
    const worker=(settlement.settlers||[]).find(w=>site.workerIds.includes(w.id));
    const bonus=settlerActionBonus(worker||{},'trade_caravan');
    const minCaps=20+(Number(bonus.rank||0)*5)+(bonus.hasPerk?10:0);
    const maxCaps=40+(Number(bonus.rank||0)*5)+(bonus.hasPerk?10:0);
    return minCaps+'–'+maxCaps+' caps '+t.day+' · materials chance';
  }
  if(site.action==='business'){
    if(!site.workerIds.length)return '0 '+t.income+' '+t.day+' · '+t.needs;
    const workers=(settlement.settlers||[]).filter(w=>site.workerIds.includes(w.id));
    const skill=workers.reduce((sum,w)=>sum+settlerActionBonus(w,'business').skillBonus,0);
    const perk=workers.filter(w=>settlerActionBonus(w,'business').hasPerk).length;
    return '+'+(Number(site.income||0)+skill+perk)+' '+t.income+' '+t.day;
  }
  if(site.action==='scavenging'){
    const workers=(settlement.settlers||[]).filter(w=>w.settlementAction?.type==='scavenging'&&plan.byWorker[w.id]?.active);
    if(!workers.length)return '0 CD '+t.day+' · '+t.needs;
    const skill=workers.reduce((sum,w)=>sum+settlerActionBonus(w,'scavenging').skillBonus,0);
    const pool=3+Math.max(0,workers.length-1)+skill;
    const perk=workers.filter(w=>settlerActionBonus(w,'scavenging').hasPerk).length;
    return pool+' CD '+t.day+' → '+t.damage+'='+t.common+(perk?' +'+perk+' Common':'')+' · '+t.effects+'='+t.uncommon;
  }
  return '';
}
function occupies(building,x,y) { const def=SETTLEMENT_BUILDINGS[building.type]; return Boolean(def && x>=building.x && y>=building.y && x<building.x+def.footprint.width && y<building.y+def.footprint.height); }
function canPlace(settlement,def,x,y,ignoreBuildingId=null) {
  if (!def || x<0 || y<0 || x+def.footprint.width>SETTLEMENT_GRID_SIZE || y+def.footprint.height>SETTLEMENT_GRID_SIZE) return false;
  for(let yy=y;yy<y+def.footprint.height;yy+=1)for(let xx=x;xx<x+def.footprint.width;xx+=1)if((settlement.buildings || []).some(building=>building.id!==ignoreBuildingId && occupies(building,xx,yy)))return false;
  return true;
}
export default function SettlementScreen({ settlement, onUpdate, onBack, onCommand, canEdit=true, sharedControls, payment, canClaimProfit=false, onRemoveGuestNpc, ownerCharacter=null, setOwnerCharacter=null }) {
  const { i18n }=useTranslation();
  const liveSession=useLiveSessionBridge();
  const language=String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const text=COPY[language] || COPY.en;
  const personalText=personalConstructionCopy(language);
  const categoryLabels=CATEGORY_LABELS[language] || CATEGORY_LABELS.en;
  const buildInfo=BUILD_INFO_COPY[language] || BUILD_INFO_COPY.en;
  const [selectedCategory,setSelectedCategory]=useState("housing");
  const [panelMode,setPanelMode]=useState("overview");
  const [panelOpen,setPanelOpen]=useState(false);
  const [zoom,setZoom]=useState(100);
  const [defenseDraft,setDefenseDraft]=useState([]);
  const [heroDraft,setHeroDraft]=useState([]);
  const [battleBusy,setBattleBusy]=useState(false);
  const [battleError,setBattleError]=useState("");
  const [transferAmounts,setTransferAmounts]=useState({caps:10,food:1,water:1,common:5,uncommon:1,rare:1});
  const ui=({en:{overview:'Overview',title:'Settlement',more:'More',chat:'Chat',close:'Close panel',choose:'Select a building on the map',zoomIn:'Zoom in',zoomOut:'Zoom out'},ru:{overview:'Обзор',title:'Поселение',more:'Ещё',chat:'Чат',close:'Закрыть панель',choose:'Выберите здание на карте',zoomIn:'Приблизить',zoomOut:'Отдалить'},uk:{overview:'Огляд',title:'Поселення',more:'Ще',chat:'Чат',close:'Закрити панель',choose:'Оберіть будівлю на мапі',zoomIn:'Збільшити',zoomOut:'Зменшити'},pl:{overview:'Przegląd',title:'Osada',more:'Więcej',chat:'Czat',close:'Zamknij panel',choose:'Wybierz budynek na mapie',zoomIn:'Przybliż',zoomOut:'Oddal'}})[language] || {overview:'Overview',title:'Settlement',more:'More',chat:'Chat',close:'Close panel',choose:'Select a building on the map',zoomIn:'Zoom in',zoomOut:'Zoom out'};
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[]);
  useEffect(()=>{if(!onCommand)return;const root=document.getElementById("root"),focused=document.activeElement;const previous=root?.inert;if(root)root.inert=true;return()=>{if(root)root.inert=previous;if(focused?.isConnected)focused.focus?.();};},[Boolean(onCommand)]);
  useEffect(()=>{const close=event=>{if(event.key==='Escape')setPanelOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const [selectedType,setSelectedType]=useState(null);
  const [selectedBuildingId,setSelectedBuildingId]=useState(null);
  const [movingBuildingId,setMovingBuildingId]=useState(null);
  const [storedBuildingId,setStoredBuildingId]=useState(null);
  const [hoverCell,setHoverCell]=useState(null);
  const [notice,setNotice]=useState("");
  const stats=useMemo(()=>calculateSettlementStats(settlement),[settlement]);
  const snapshot=useMemo(()=>getSettlementRulebookSnapshot(settlement),[settlement]);
  const attributes={...stats.attributes,power:snapshot.power,defense:snapshot.defense,beds:snapshot.beds};
  const stockpile=normalizeStockpile(settlement.stockpile,settlement.resources?.materials);
  const profit=useMemo(()=>settlementProfit(settlement),[settlement]);
  const hasProfit=Boolean(profit.claimable.caps || profit.claimable.food || profit.claimable.water);
  const attackDice=calculateAttackRisk(settlement);
  const activeAttack=(settlement.attacks || []).find(attack=>attack.state==="warning" || attack.state==="active") || null;
  const lastResolvedAttack=(settlement.attacks || []).find(attack=>attack.state==="resolved") || null;
  const damagedBuildings=useMemo(()=>damagedSettlementBuildings(settlement),[settlement]);
  useEffect(()=>{setDefenseDraft(activeAttack?.defenderIds || []);},[activeAttack?.id,JSON.stringify(activeAttack?.defenderIds || [])]);
  useEffect(()=>{setHeroDraft(activeAttack?.heroParticipants?.map(hero=>hero.clientId) || []);},[activeAttack?.id,JSON.stringify(activeAttack?.heroParticipants || [])]);
  const selectedDef=selectedType ? SETTLEMENT_BUILDINGS[selectedType] : null;
  const selectedRule=selectedType ? getRulebookBuilding(selectedType) : null;
  const selectedBuilding=(settlement.buildings || []).find(building=>building.id===selectedBuildingId) || null;
  const selectedBuildingDef=selectedBuilding ? SETTLEMENT_BUILDINGS[selectedBuilding.type] : null;
  const selectedBuildingRule=selectedBuilding ? getRulebookBuilding(selectedBuilding.type) : null;
  const selectedBuildingAsset=selectedBuildingDef ? getSettlementAsset(selectedBuildingDef.asset) : null;
  const selectedBuildingLocked=selectedBuilding?.type==="settlement_hq" || Boolean(selectedBuilding?.locked);
  const selectedRoomCapacity=selectedBuilding ? getStructureRoomCapacity(selectedBuilding) : 0;
  const selectedRooms=selectedBuilding?.rooms || [];
  const movingBuilding=(settlement.buildings || []).find(building=>building.id===movingBuildingId) || null;
  const movingDef=movingBuilding ? SETTLEMENT_BUILDINGS[movingBuilding.type] : null;
  const storedBuilding=settlement.storedBuildings?.find(b=>b.id===storedBuildingId);
  const placementDef=storedBuilding ? SETTLEMENT_BUILDINGS[storedBuilding.type] : movingDef || selectedDef;
  const placementValid=hoverCell && placementDef ? canPlace(settlement,placementDef,hoverCell.x,hoverCell.y,movingBuildingId) : false;
  const selectedRequirementState=selectedRule ? buildingRequirementState(selectedRule,settlement,ownerCharacter,buildInfo) : {rows:[],missing:[],ok:true};
  const enoughResources=selectedType ? (payment ? payment.canAfford({type:"buildPersonal",buildingType:selectedType}) : canAffordRulebookBuilding(settlement,selectedType)) && selectedRequirementState.ok : true;
  const visibleBuildings=SETTLEMENT_BUILDING_LIST.filter(definition=>definition.category===selectedCategory && getRulebookBuilding(definition.id));
  const constructionBuildings=(settlement.buildings || []).filter(building=>building.state==="construction");
  const constructionRooms=(settlement.buildings || []).flatMap(building=>(building.rooms || []).filter(room=>room.state==="construction").map(room=>({building,room})));
  const constructionTargets=[...constructionBuildings.map(building=>({value:`building:${building.id}`,label:`${settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)} · ${getConstructionProgress(building).progress}/${getConstructionProgress(building).required}`})),...constructionRooms.map(({building,room})=>({value:`room:${building.id}:${room.id}`,label:`${roomName(room.type,language)} @ ${settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)} · ${getRoomConstructionProgress(room).progress}/${getRoomConstructionProgress(room).required}`}))];
  const materialTotal=Math.floor(Number(stockpile.materials.common || 0)+Number(stockpile.materials.uncommon || 0)+Number(stockpile.materials.rare || 0));
  const nextEvent=activeAttack ? text.warning : (settlement.events || [])[0]?.type?.replaceAll("_"," ") || text.none;
  const latestRecruitEvent=(settlement.events || []).find(event=>event.type==="settler_joined");
  const latestRecruit=latestRecruitEvent ? (settlement.settlers || []).find(settler=>settler.id===latestRecruitEvent.settlerId) : null;
  const latestRecruitIsFresh=Boolean(latestRecruit && Number(latestRecruit.joinedAt || latestRecruitEvent?.createdAt || 0) && Date.now()-Number(latestRecruit.joinedAt || latestRecruitEvent.createdAt)<SETTLEMENT_DAY_MS);
  const statusText=activeAttack ? text.warning : text.stable;
  async function createBuildingAt(x,y) {
    if(!canEdit || !selectedDef || !selectedRule)return;
    if(!canPlace(settlement,selectedDef,x,y)){setNotice(text.cannotPlace);return;}
    if(!enoughResources){const missing=selectedRequirementState.missing.map(item=>item.label).join(" · ");setNotice(missing ? `${buildInfo.missing}: ${missing}` : (payment ? personalText.errors.PERSONAL_RESOURCES_INSUFFICIENT : text.insufficient));return;}
    if(onCommand){if(await onCommand({type:"build",buildingType:selectedDef.id,x,y})){setSelectedType(null);setHoverCell(null);setNotice("");}return;}
    const now=Date.now();onUpdate(current=>{const paid=payRulebookBuildingCost(current,selectedDef.id);return {...paid,buildings:[...(paid.buildings || []),createConstructionBuilding({id:`building_${now}_${Math.random().toString(36).slice(2,7)}`,type:selectedDef.id,x,y,now})]};});
    setSelectedType(null);setHoverCell(null);setNotice("");
  }
  function addRoom(type) {
    if(!canEdit)return;
    if(onCommand){if(selectedBuilding)void onCommand({type:"room",buildingId:selectedBuilding.id,roomType:type});return;}
    if(!selectedBuilding || selectedBuilding.state!=="active" || !selectedRoomCapacity)return;
    if(selectedRooms.length>=selectedRoomCapacity){setNotice(text.full);return;}
    if((payment ? !payment.canAfford({type:"roomPersonal",buildingId:selectedBuilding?.id,roomType:type}) : !canAffordRoom(settlement,type))){setNotice(payment ? personalText.errors.PERSONAL_RESOURCES_INSUFFICIENT : text.insufficient);return;}
    const room=createRoomConstruction(type);if(!room)return;
    onUpdate(current=>{const paid=payRoomCost(current,type);return {...paid,buildings:(paid.buildings || []).map(building=>building.id===selectedBuilding.id ? {...building,rooms:[...(building.rooms || []),room]} : building)};});setNotice("");
  }
  function removeRoom(roomId) {
    if(!canEdit)return;
    if(onCommand){if(selectedBuilding){const room=selectedRooms.find(r=>r.id===roomId);void onCommand(room?.state==="construction"?{type:"cancel",key:`room:${selectedBuilding.id}:${roomId}`}:{type:"removeRoom",buildingId:selectedBuilding.id,roomId});}return;}
    if(!selectedBuilding)return;
    onUpdate(current=>{let happinessDelta=0;const buildings=(current.buildings || []).map(building=>{if(building.id!==selectedBuilding.id)return building;const room=(building.rooms || []).find(item=>item.id===roomId);if(room?.state==="active" && room?.happinessApplied)happinessDelta=-Number(ROOMS[room.type]?.effects?.happiness || 0);return {...building,rooms:(building.rooms || []).filter(item=>item.id!==roomId)};});return {...current,buildings,attributes:{...(current.attributes || {}),happiness:Math.max(1,Math.min(20,Number(current.attributes?.happiness || 10)+happinessDelta))},settlers:(current.settlers || []).map(settler=>settler.settlementAction?.targetRoomId===roomId ? {...settler,settlementAction:null,status:"idle"} : settler)};});
  }
  async function moveBuildingTo(x,y) {
    if(!canEdit || !movingBuilding || !movingDef || movingBuilding.locked || movingBuilding.type==="settlement_hq")return;
    if(!canPlace(settlement,movingDef,x,y,movingBuilding.id)){setNotice(text.cannotPlace);return;}
    if(onCommand){if(await onCommand({type:"move",buildingId:movingBuilding.id,x,y})){setMovingBuildingId(null);setHoverCell(null);}return;}
    onUpdate(current=>({...current,buildings:(current.buildings || []).map(building=>building.id===movingBuilding.id ? {...building,x,y} : building)}));setMovingBuildingId(null);setSelectedBuildingId(movingBuilding.id);setHoverCell(null);setNotice("");
  }
  async function handleCellClick(x,y){setHoverCell({x,y});if(storedBuildingId){if(canEdit && storedBuilding && await onCommand?.({type:'placeStored',buildingId:storedBuildingId,x,y})){setStoredBuildingId(null);setHoverCell(null);}return;}if(movingBuildingId)moveBuildingTo(x,y);else if(selectedType)createBuildingAt(x,y);}
  async function demolishSelected(){
    if(!canEdit)return;
    if(onCommand){if(selectedBuilding && await onCommand({type:"demolish",buildingId:selectedBuilding.id}))setSelectedBuildingId(null);return;}
    if(!selectedBuilding || selectedBuildingLocked)return;
    onUpdate(current=>({...current,buildings:(current.buildings || []).filter(building=>building.id!==selectedBuilding.id),settlers:(current.settlers || []).map(settler=>settler.settlementAction?.targetBuildingId===selectedBuilding.id || settler.settlementAction?.parentBuildingId===selectedBuilding.id ? {...settler,settlementAction:null,assignedBuildingId:null,status:"idle"} : settler)}));setSelectedBuildingId(null);
  }
  function advanceSettler(workerId,rewardType,rewardId){
    if(!canEdit)return;
    if(onCommand){void onCommand({type:"settlerAdvance",workerId,rewardType,rewardId});return;}
    onUpdate(current=>({...current,settlers:(current.settlers || []).map(worker=>worker.id===workerId ? advanceSettlerProfile(worker,rewardType,rewardId) : worker)}));
  }
  function assignAction(settlerId,type){
    if(!canEdit)return;if(type && !availableSettlementActions(settlement).some(a=>a.id===type))return;
    if(onCommand){void onCommand({type:"action",workerId:settlerId,action:type});return;}
    onUpdate(current=>({...current,settlers:(current.settlers || []).map(settler=>settler.id===settlerId ? {...settler,settlementAction:type ? {type} : null,assignedBuildingId:null,status:type ? "working" : "idle"} : settler)}));
  }
  function assignBuildTarget(settlerId,value){
    if(!canEdit)return;
    if(onCommand){void onCommand({type:"worker",workerId:settlerId,key:value || null});return;}
    onUpdate(current=>({...current,settlers:(current.settlers || []).map(settler=>{if(settler.id!==settlerId)return settler;if(!value)return {...settler,settlementAction:{type:"build"},assignedBuildingId:null,status:"idle"};const [kind,parentId,roomId]=value.split(":");if(kind==="room")return {...settler,settlementAction:{type:"build",parentBuildingId:parentId,targetRoomId:roomId},assignedBuildingId:parentId,status:"working"};return {...settler,settlementAction:{type:"build",targetBuildingId:parentId},assignedBuildingId:parentId,status:"working"};})}));
  }
  function workplaceName(id){const b=(settlement.buildings || []).find(b=>b.id===id);const def=b && SETTLEMENT_BUILDINGS[b.type];return def ? settlementBuildingName(def,language) : text.manage;}
  function currentBuildTargetValue(settler){const action=settler.settlementAction;if(action?.targetRoomId)return `room:${action.parentBuildingId}:${action.targetRoomId}`;if(action?.targetBuildingId)return `building:${action.targetBuildingId}`;return "";}
  function resolveAttackNow(){if(!canEdit)return;if(onCommand){if(activeAttack)void onCommand({type:"attack",attackId:activeAttack.id});return;}if(activeAttack)onUpdate(current=>resolveSettlementAttack(current,activeAttack.id));}
  function toggleDefender(id){setDefenseDraft(current=>current.includes(id) ? current.filter(item=>item!==id) : [...current,id]);}
  function toggleHero(id){setHeroDraft(current=>current.includes(id) ? current.filter(item=>item!==id) : [...current,id]);}
  function selectedHeroes(){
    return (liveSession?.players || []).filter(player=>heroDraft.includes(String(player.clientId || player.peerId || ""))).map(player=>({
      clientId:String(player.clientId || player.peerId || ""),
      name:String(player.character?.name || player.name || "Hero"),
      level:Number(player.character?.level || 1),
      defense:Number(player.character?.defense || 0),
      currentHp:Number(player.character?.currentHp || 0),
      maxHp:Number(player.character?.maxHp || 0),
    }));
  }
  function saveDefensePlan(){if(!canEdit || !activeAttack)return;const heroes=selectedHeroes();if(onCommand){void onCommand({type:"attackPlan",attackId:activeAttack.id,defenderIds:defenseDraft,heroes});return;}onUpdate(current=>setSettlementDefensePlan(current,activeAttack.id,defenseDraft,heroes));}
  async function claimProfit(){if(!canClaimProfit || !hasProfit || !onCommand)return;await onCommand({type:"claimProfit"});}
  function addSupplyStack(items,kind,quantity){
    const amount=Math.max(0,Math.floor(Number(quantity)||0));if(!amount)return items||[];
    const marker=`settlement_transfer_${kind}`;
    const next=structuredClone(items||[]);
    const existing=next.find(item=>item?.sourceType===marker);
    if(existing){existing.quantity=String(Math.max(0,Number((existing.quantity ?? existing.qty) || 0))+amount);return next;}
    next.push({sourceType:marker,canonicalName:kind==="food"?"Settlement Food Supply":"Settlement Water Supply",name:kind==="food"?"Settlement Food Supply":"Settlement Water Supply",category:kind==="food"?"food":"beverage",quantity:String(amount),cost:"0",weight:"1"});
    return next;
  }
  function removeSupply(items,kind,quantity){
    let left=Math.max(0,Math.floor(Number(quantity)||0));
    const categories=kind==="food"?["food"]:["beverage","drink"];
    const next=[];
    for(const item of items||[]){
      if(!left||!categories.includes(String(item?.category||"").toLowerCase())){next.push(item);continue;}
      const qty=Math.max(0,Number((item.quantity ?? item.qty) || 0));const take=Math.min(left,qty);left-=take;const remain=qty-take;if(remain)next.push({...item,quantity:String(remain),...(Object.hasOwn(item,"qty")?{qty:remain}:{})});
    }
    if(left>0)throw new Error("INSUFFICIENT_SUPPLY");
    return next;
  }
  function playerSupplyCount(kind){
    const categories=kind==="food"?["food"]:["beverage","drink"];
    return (ownerCharacter?.inventoryItems||[]).filter(item=>categories.includes(String(item?.category||"").toLowerCase())).reduce((sum,item)=>sum+Math.max(0,Number((item.quantity ?? item.qty) || 0)),0);
  }
  function transferLocalResource(kind,direction){
    if(!setOwnerCharacter||onCommand)return;
    const amount=Math.max(1,Math.floor(Number(transferAmounts[kind]||1)));
    const currentStock=normalizeStockpile(settlement.stockpile,settlement.resources?.materials);
    try{
      if(["caps","common","uncommon","rare"].includes(kind)){
        if(direction==="deposit"){
          const input={caps:0,common:0,uncommon:0,rare:0,[kind]:amount};
          const result=debitPersonalResources(ownerCharacter,input);
          setOwnerCharacter(result.character);
          onUpdate(current=>{
            const stock=normalizeStockpile(current.stockpile,current.resources?.materials);
            if(kind==="caps")return {...current,resources:{...(current.resources||{}),caps:Number(current.resources?.caps||0)+amount}};
            return {...current,stockpile:{...stock,materials:{...stock.materials,[kind]:Number(stock.materials?.[kind]||0)+amount}},resources:{...(current.resources||{}),materials:kind==="common"?Number(stock.materials.common||0)+amount:Number(current.resources?.materials||0)}};
          });
        }else{
          const available=kind==="caps"?Math.max(0,Number(settlement.resources?.caps||0)):Math.max(0,Number(currentStock.materials?.[kind]||0));
          if(available<amount)throw new Error("INSUFFICIENT_SETTLEMENT_RESOURCE");
          setOwnerCharacter(prev=>creditPersonalResources(prev,{caps:kind==="caps"?amount:0,common:kind==="common"?amount:0,uncommon:kind==="uncommon"?amount:0,rare:kind==="rare"?amount:0}));
          onUpdate(current=>{
            const stock=normalizeStockpile(current.stockpile,current.resources?.materials);
            if(kind==="caps")return {...current,resources:{...(current.resources||{}),caps:Math.max(0,Number(current.resources?.caps||0)-amount)}};
            const materials={...stock.materials,[kind]:Math.max(0,Number(stock.materials?.[kind]||0)-amount)};
            return {...current,stockpile:{...stock,materials},resources:{...(current.resources||{}),materials:materials.common}};
          });
        }
      }else if(["food","water"].includes(kind)){
        if(direction==="deposit"){
          const nextItems=removeSupply(ownerCharacter.inventoryItems,kind,amount);
          setOwnerCharacter(prev=>({...prev,inventoryItems:nextItems}));
          onUpdate(current=>{
            const stock=normalizeStockpile(current.stockpile,current.resources?.materials);
            const provisions={food:Number(stock.provisions?.food||0),water:Number(stock.provisions?.water||0)};
            provisions[kind]+=amount;
            return {...current,stockpile:{...stock,provisions}};
          });
        }else{
          const available=Math.max(0,Number(currentStock.provisions?.[kind]||0));
          if(available<amount)throw new Error("INSUFFICIENT_SETTLEMENT_RESOURCE");
          setOwnerCharacter(prev=>({...prev,inventoryItems:addSupplyStack(prev.inventoryItems,kind,amount)}));
          onUpdate(current=>{
            const stock=normalizeStockpile(current.stockpile,current.resources?.materials);
            const provisions={food:Number(stock.provisions?.food||0),water:Number(stock.provisions?.water||0)};
            provisions[kind]=Math.max(0,provisions[kind]-amount);
            return {...current,stockpile:{...stock,provisions}};
          });
        }
      }
      setNotice("");
    }catch(error){setNotice(error?.message||"TRANSFER_FAILED");}
  }
  function startRepair(buildingId){if(!canEdit)return;if(onCommand){void onCommand({type:"repairStart",buildingId});return;}}
  function toggleRepairWorker(buildingId,workerId,assigned){if(!canEdit)return;if(onCommand){void onCommand({type:"repairWorker",buildingId,workerId,assigned});return;}}
  async function playRaidBattle(){
    if(!canEdit || !activeAttack || battleBusy)return;
    setBattleBusy(true);setBattleError("");
    try{
      const prepared=await startSettlementRaidBattle(liveSession,settlement,activeAttack,[]);
      if(!prepared?.ok)throw new Error(prepared?.error || "BATTLE_SETUP_FAILED");
      if(onCommand && prepared.sceneId && prepared.sceneId!==activeAttack.tacticalSceneId){
        await onCommand({type:"attackBattle",attackId:activeAttack.id,tacticalSceneId:prepared.sceneId});
      }
      window.dispatchEvent(new CustomEvent("pip2d20:gm-open-battlemap"));
    }catch(error){
      setBattleError(`${text.battleFailed}: ${error?.message || "ERROR"}`);
    }finally{setBattleBusy(false);}
  }
  function selectPanel(mode){setPanelMode(mode);setPanelOpen(mode!=="overview");if(mode==="build")setSelectedBuildingId(null);if(mode!=="build"){setSelectedType(null);setHoverCell(null);setMovingBuildingId(null);}}
  function openCampaignChat(){
    const toggle=document.querySelector(".session-utility-drawer-toggle");
    if(toggle?.getAttribute("aria-expanded")!=="true")toggle?.click();
  }
  const navigation=mode=><button type="button" key={mode} className={panelMode===mode ? "is-active" : ""} aria-current={panelMode===mode ? "page" : undefined} onClick={()=>selectPanel(mode)}><SheetIcon name={{overview:'home',build:'plus',people:'people',resources:'bag',defense:'shield',events:'notes',more:'more'}[mode]}/><span>{ui[mode] || text[mode]}</span></button>;
  return <div className={`pip-screen settlement-screen settlement-dashboard settlement-v2 ${onCommand ? 'is-shared-settlement' : ''} ${panelOpen ? 'is-panel-open' : ''}`}>
    <header className="settlement-brand"><strong>PIP 2D20 <span>/ {ui.title}</span></strong><span className="settlement-brand-name">{settlement.name}</span>{onCommand ? <button type="button" className="pip-action-button settlement-chat-button" aria-label={ui.chat} onClick={openCampaignChat}><SheetIcon name="chat"/></button> : null}<button type="button" className="pip-action-button" aria-label={ui.more} onClick={()=>selectPanel('more')}><SheetIcon name="settings"/></button></header>
    {sharedControls}
    <div className="settlement-layout settlement-dashboard-grid">
      <aside className="settlement-left-rail pip-panel"><nav className="settlement-left-nav">{['overview','build','people','resources','defense','events'].map(navigation)}</nav><button type="button" className="pip-action-button settlement-exit" onClick={onBack}>← {text.back}</button></aside>
      <main className="settlement-map-wrap settlement-center-panel">
        <div className="settlement-topbar settlement-resource-strip">{[['people',attributes.people,'people'],['food',attributes.food,'food'],['water',attributes.water,'flask'],['power',attributes.power,'bolt'],['defense',attributes.defense,'shield'],['happiness',`${attributes.happiness}/20`,'heart']].map(([key,value,icon])=><div className="settlement-resource-tile" key={key}><SheetIcon name={icon}/><div><small>{text[key]}</small><b>{value}</b></div></div>)}</div>
        <SettlementReputationInline settlement={settlement} language={language} canEdit={canEdit}/>
        <SettlementPhaserMap settlement={settlement} language={language} label={ui.title} zoom={zoom} onZoom={setZoom} selectedBuildingId={selectedBuildingId} placementDef={placementDef} hoverCell={hoverCell} placementValid={placementValid && enoughResources} onHover={cell=>setHoverCell(current=>current?.x===cell?.x && current?.y===cell?.y ? current : cell)} onCell={handleCellClick} onSelect={id=>{setSelectedBuildingId(id);setPanelMode('build');setPanelOpen(true);}}/>
        <div className="settlement-map-controls"><button type="button" aria-label={ui.zoomOut} disabled={zoom===100} onClick={()=>setZoom(value=>Math.max(100,value-25))}>−</button><span>{zoom}%</span><button type="button" aria-label={ui.zoomIn} disabled={zoom===200} onClick={()=>setZoom(value=>Math.min(200,value+25))}>+</button></div>
        <div className="settlement-map-hint" role="status">{notice || (movingBuildingId ? text.move : selectedDef ? text.tapMap : ui.choose)}</div>
        <div className="settlement-map-actions"><button type="button" className="pip-action-button settlement-primary" onClick={()=>selectPanel('build')}><SheetIcon name="plus"/>{text.build}</button>{(selectedType || movingBuildingId || storedBuildingId) && <button type="button" className="pip-action-button" onClick={()=>{setSelectedType(null);setMovingBuildingId(null);setStoredBuildingId(null);setNotice('');}}>{text.cancel}</button>}</div>
      </main>
      <aside className="settlement-summary settlement-right-panel pip-panel" aria-label={ui[panelMode] || text[panelMode]}>
        <button type="button" className="settlement-panel-close pip-action-button" aria-label={ui.close} onClick={()=>setPanelOpen(false)}>×</button>
        {panelMode==='more' && <div className="settlement-more">{['overview','defense','events'].map(navigation)}<button type="button" className="pip-action-button" onClick={onBack}>← {text.back}</button></div>}
        {panelMode==='overview' && <><h2>{settlement.name}</h2><p>{statusText}</p><div className="settlement-balance"><span>{text.day}</span><b>{settlement.settlementDay || 1}</b></div><div className="settlement-balance"><span>{text.beds}</span><b>{attributes.beds}</b></div><div className="settlement-balance"><span>{text.income}</span><b>+{attributes.income}</b></div><div className="settlement-balance"><span>{text.caps}</span><b>{Math.floor(Number(settlement.resources?.caps || 0))}</b></div><div className="settlement-balance"><span>{text.materials}</span><b>{materialTotal}</b></div><div className="settlement-balance"><span>{text.risk}</span><b>{attackDice}d20</b></div><label className="settlement-building-picker">{ui.choose}<select className="pip-input" value="" onChange={event=>{if(event.target.value){setSelectedBuildingId(event.target.value);setPanelMode("build");setPanelOpen(true);}}}><option value="">—</option>{(settlement.buildings || []).map(building=><option key={building.id} value={building.id}>{settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)}</option>)}</select></label><h3>{text.events}</h3>{(settlement.events || []).length ? settlement.events.slice(0,3).map((event,index)=><div className="settlement-event-row" key={event.id || index}>{eventText(event,language)}</div>) : <p>{text.noEvents}</p>}</>}
        {panelMode==="build" && !selectedBuilding ? <><div className="settlement-build-categories" role="tablist" aria-label={text.build}>{BUILD_CATEGORIES.map(category=><button key={category} type="button" className={selectedCategory===category ? "is-selected" : ""} onClick={()=>{setSelectedCategory(category);setSelectedType(null);setHoverCell(null);setNotice("");}}>{categoryLabels[category]}</button>)}</div><div className="settlement-build-menu">{visibleBuildings.map(def=>{const asset=getSettlementAsset(def.asset);const rule=getRulebookBuilding(def.id);const effects=buildingEffectParts(rule,def,buildInfo);const req=buildingRequirementState(rule,settlement,ownerCharacter,buildInfo);return <button key={def.id} type="button" disabled={!canEdit} className={`${selectedType===def.id ? "is-selected " : ""}${req.ok ? "is-build-ready" : "is-build-blocked"}`} onClick={()=>{setSelectedType(def.id);setStoredBuildingId(null);setSelectedBuildingId(null);setMovingBuildingId(null);setNotice("");setPanelOpen(false);}}><div className="settlement-build-menu__preview">{asset ? <img src={asset} alt=""/> : <span>{BUILDING_ICONS[def.id] || "⌂"}</span>}</div><span>{settlementBuildingName(def,language)}</span><small>{def.footprint.width}×{def.footprint.height} · {formatRulebookCost(rule)} · {rule.constructionDays}d</small>{effects.length?<div className="settlement-build-card__effects"><b>{buildInfo.gives}</b>{effects.map((item,index)=><span key={index}>{item}</span>)}</div>:null}<div className="settlement-build-card__requirements"><b>{buildInfo.requirements}</b>{req.rows.map((item,index)=><span key={index} className={item.ok===false?"is-missing":item.ok===true?"is-ok":"is-unknown"}>{item.ok===false?"✕":item.ok===true?"✓":"•"} {item.label}</span>)}</div>{req.missing.length?<strong className="settlement-build-card__missing">{buildInfo.missing}: {req.missing.map(item=>item.label).join(" · ")}</strong>:<strong className="settlement-build-card__ready">✓ {buildInfo.ready}</strong>}</button>;})}</div></> : null}
        {panelMode==="build" ? <>
          {payment && <p className="settlement-personal-notice">{personalText.source} · {personalText.pending}</p>}
          {!!settlement.storedBuildings?.length && <section className="settlement-warehouse"><h3>{personalText.warehouse} · {settlement.storedBuildings.length}</h3><small>{personalText.storedNote}</small>
            {settlement.storedBuildings.map(b=><div className="settlement-warehouse-row" key={b.id}><strong>{settlementBuildingName(SETTLEMENT_BUILDINGS[b.type],language)}</strong><small>{personalText.paid}: {b.funding?.payerUid}</small>
              <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>{setStoredBuildingId(b.id);setMovingBuildingId(null);setSelectedType(null);setSelectedBuildingId(null);setPanelOpen(false);}}>{personalText.place}</button>
              <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>onCommand?.({type:'cancelStored',buildingId:b.id})}>{personalText.cancelStored}</button></div>)}
          </section>}
          {storedBuilding && <p role="status">{personalText.place}: {settlementBuildingName(SETTLEMENT_BUILDINGS[storedBuilding.type],language)} <button type="button" className="pip-action-button" onClick={()=>setStoredBuildingId(null)}>{text.cancel}</button></p>}

          <div className="pip-panel-title">{selectedBuilding ? settlementBuildingName(selectedBuildingDef,language) : text.build}</div>
          {selectedBuilding ? <div className="settlement-building-hero">{selectedBuildingAsset ? <img src={selectedBuildingAsset} alt=""/> : <span>{BUILDING_ICONS[selectedBuilding.type] || "⌂"}</span>}</div> : null}
          <div className={`settlement-stockpile ${selectedBuilding ? "is-hidden" : ""}`}><div className="pip-panel-title">{text.stockpile}</div><div className="settlement-balance"><span>{text.common}</span><b>{Math.floor(stockpile.materials.common)}</b></div><div className="settlement-balance"><span>{text.uncommon}</span><b>{Math.floor(stockpile.materials.uncommon)}</b></div><div className="settlement-balance"><span>{text.rare}</span><b>{Math.floor(stockpile.materials.rare)}</b></div><div className="settlement-balance"><span>{text.caps}</span><b>{Math.floor(Number(settlement.resources?.caps || 0))}</b></div></div>
          {selectedDef && selectedRule ? <div className="settlement-selected-card"><strong>{settlementBuildingName(selectedDef,language)}</strong><span>{selectedDef.footprint.width}×{selectedDef.footprint.height}</span><span>{formatRulebookCost(selectedRule)}</span><span>{text.construction}: {selectedRule.constructionDays} d</span><div className="settlement-build-card__effects"><b>{buildInfo.gives}</b>{buildingEffectParts(selectedRule,selectedDef,buildInfo).map((item,index)=><span key={index}>{item}</span>)}</div><div className="settlement-build-card__requirements"><b>{buildInfo.requirements}</b>{selectedRequirementState.rows.map((item,index)=><span key={index} className={item.ok===false?"is-missing":item.ok===true?"is-ok":"is-unknown"}>{item.ok===false?"✕":item.ok===true?"✓":"•"} {item.label}</span>)}</div>{selectedRequirementState.missing.length?<strong className="settlement-build-card__missing">{buildInfo.missing}: {selectedRequirementState.missing.map(item=>item.label).join(" · ")}</strong>:<strong className="settlement-build-card__ready">✓ {buildInfo.ready}</strong>}<button type="button" className="pip-action-button" onClick={()=>{setSelectedType(null);setHoverCell(null);}}>{text.cancel}</button></div> : null}
          {selectedBuilding ? <div className="settlement-selected-card"><strong>{settlementBuildingName(selectedBuildingDef,language)}</strong><div className="settlement-balance"><span>{text.condition}</span><b>{Math.round(Number(selectedBuilding.condition ?? 100))}%</b></div>{selectedBuilding.state==="construction" ? <span>{text.progress}: {getConstructionProgress(selectedBuilding).progress}/{getConstructionProgress(selectedBuilding).required} d</span> : <span>{text.active}</span>}{selectedBuilding.state==="active" && selectedBuildingProduction(settlement,selectedBuilding,language) ? <strong className="settlement-production-forecast">{selectedBuildingProduction(settlement,selectedBuilding,language)}</strong> : null}
            {selectedBuilding.state==='construction' && onCommand && <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>onCommand({type:'cancel',key:`building:${selectedBuilding.id}`})}>{personalText.cancel}</button>}
            {payment && selectedBuilding.state==='active' && upgradeRule(selectedBuilding) && !selectedBuilding.upgrade && <button type="button" className="pip-action-button" disabled={!canEdit || !payment.canAfford({type:'upgradePersonal',buildingId:selectedBuilding.id})} onClick={()=>onCommand({type:'upgrade',buildingId:selectedBuilding.id})}>{personalText.upgrade}</button>}
            <SettlementBuildingWorkers key={`${settlement.id}:${selectedBuilding.id}`} settlement={settlement} building={selectedBuilding} language={language} canEdit={canEdit} onCommand={onCommand} onUpdate={onUpdate} roomLabel={type=>roomName(type,language)}/>
            {selectedBuildingRule?.effects?.requiresPower ? <div className="settlement-balance"><span>{text.consumption}</span><b>{selectedBuildingRule.effects.requiresPower} ⚡</b></div> : null}
            {selectedRoomCapacity>0 ? <div className="settlement-rooms"><div className="pip-panel-title">{text.rooms} · {selectedRooms.length}/{selectedRoomCapacity}</div>{selectedRooms.map(room=><div key={room.id} className="settlement-room-row"><span><strong>{roomName(room.type,language)}</strong><small>{roomEffects(ROOMS[room.type])}{room.state==="construction" ? ` · ${text.roomBuilding} ${getRoomConstructionProgress(room).progress}/${getRoomConstructionProgress(room).required}d` : ""}</small></span><button type="button" className="pip-action-button settlement-danger" disabled={!canEdit} onClick={()=>removeRoom(room.id)}>×</button></div>)}{selectedBuilding.state==="active" && selectedRooms.length<selectedRoomCapacity ? <div className="settlement-room-build-list">{ROOM_ORDER.map(type=><button key={type} type="button" className="pip-action-button" disabled={!canEdit || (payment ? !payment.canAfford({type:"roomPersonal",buildingId:selectedBuilding?.id,roomType:type}) : !canAffordRoom(settlement,type))} onClick={()=>addRoom(type)}><span>{roomName(type,language)}</span><small>{roomCost(ROOMS[type])} · {ROOMS[type].constructionDays}d · {roomEffects(ROOMS[type])}</small></button>)}</div> : selectedRooms.length>=selectedRoomCapacity ? <small>{text.full}</small> : null}</div> : null}
            {selectedBuildingLocked ? <span className="settlement-hq-note">{text.hqLocked}</span> : <><button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>{setStoredBuildingId(null);setMovingBuildingId(selectedBuilding.id);setSelectedType(null);setPanelOpen(false);}}>{text.move}</button><button type="button" className="pip-action-button settlement-danger" disabled={!canEdit} onClick={demolishSelected}>{text.demolish}</button></>}<button type="button" className="pip-action-button" onClick={()=>{setSelectedBuildingId(null);setMovingBuildingId(null);}}>{text.cancel}</button></div> : null}
        </> : null}
        {panelMode==="people" ? <div className="settlement-people settlement-people--panel"><div className="pip-panel-title">{text.people}</div>{latestRecruitIsFresh && latestRecruit ? <div className="settlement-selected-card settlement-new-settler"><strong>★ {text.newSettler}</strong><span>{latestRecruit.name}</span><small>{text.unassigned}</small><button type="button" className="pip-action-button settlement-primary" onClick={()=>document.getElementById(`settler-action-${latestRecruit.id}`)?.focus()}>{text.assignNow}</button></div> : null}{(settlement.settlers || []).map(settler=><div key={settler.id} className="settlement-person settlement-person--actions"><span><strong>{settler.name}{settler.guestNpc ? ` · ${text.importedNpc}` : ""}</strong><small>{text[settler.status] || settler.status} · {text.health} {Math.round(Number(settler.health ?? 100))}%</small>{settler.guestNpc ? <small>{text.sourceJson}{settler.sourceCharacterName ? ` · ${settler.sourceCharacterName}` : ""}</small> : null}{settler.skills || settler.perks?.length ? <small>{settlerProfileLabel(settler,language)}</small> : null}<small>{text.level} {settler.level || 1} · {text.xp} {Math.floor(Number(settler.experience || 0))}/{settlerXpForNextLevel(settler)}</small>{settler.settlementAction?.targetBuildingId && <button type="button" className="pip-action-button" onClick={()=>{setSelectedBuildingId(settler.settlementAction.targetBuildingId);setPanelMode('build');setPanelOpen(true);}}>{workplaceName(settler.settlementAction.targetBuildingId)}</button>}{settler.guestNpc && onRemoveGuestNpc ? <button type="button" className="pip-action-button settlement-danger" disabled={!canEdit} onClick={()=>onRemoveGuestNpc(settler.id)}>{text.removeNpc}</button> : null}</span><select id={`settler-action-${settler.id}`} className="pip-input" disabled={!canEdit} value={settler.settlementAction?.type || ""} onChange={event=>assignAction(settler.id,event.target.value)}><option value="">{text.none}</option>{availableSettlementActions(settlement).map(action=><option key={action.id} value={action.id}>{settlementRuleName(action,language)}</option>)}</select>{settler.settlementAction?.type==="build" ? <select className="pip-input" disabled={!canEdit} value={currentBuildTargetValue(settler)} onChange={event=>assignBuildTarget(settler.id,event.target.value)}><option value="">{text.target}</option>{constructionTargets.map(target=><option key={target.value} value={target.value}>{target.label}</option>)}</select> : null}</div>)}</div> : null}
        {panelMode==="resources" ? <div className="settlement-resource-panel"><div className="pip-panel-title">{text.resources}</div><SettlementDailySummary settlement={settlement} language={language} canEdit={canEdit} onSupply={resource=>{if(onCommand)void onCommand({type:"supplies",resource});else onUpdate(current=>reserveProvisions(current,resource));}}/><div className="settlement-balance"><span>{text.food}</span><b>{attributes.food}</b></div><div className="settlement-balance"><span>{text.water}</span><b>{attributes.water}</b></div><div className="settlement-balance"><span>{text.power}</span><b>{attributes.power}</b></div><div className="settlement-balance"><span>{text.beds}</span><b>{attributes.beds}</b></div><div className="settlement-balance"><span>{text.income}</span><b>{attributes.income}</b></div><div className="settlement-balance"><span>{text.common}</span><b>{Math.floor(stockpile.materials.common)}</b></div><div className="settlement-balance"><span>{text.uncommon}</span><b>{Math.floor(stockpile.materials.uncommon)}</b></div><div className="settlement-balance"><span>{text.rare}</span><b>{Math.floor(stockpile.materials.rare)}</b></div><small>{Math.floor(snapshot.stockpileCapacityLbs)} lbs</small><section className="settlement-resource-transfer"><div className="pip-panel-title">{text.transfer}</div><small>{text.produced}</small>{["caps","food","water","common","uncommon","rare"].map(kind=>{const playerHave=kind==="caps"?Number(ownerCharacter?.caps||0):kind==="food"||kind==="water"?playerSupplyCount(kind):(()=>{try{return checkedPlayerResources(ownerCharacter)[kind]||0;}catch{return 0;}})();const settlementHave=kind==="caps"?Number(settlement.resources?.caps||0):kind==="food"||kind==="water"?Number(stockpile.provisions?.[kind]||0):Number(stockpile.materials?.[kind]||0);return <div className="settlement-transfer-row" key={kind}><div><strong>{text[kind]||kind}</strong><small>{text.playerHave}: {playerHave} · {text.settlementHave}: {settlementHave}</small></div><input className="pip-input" type="number" min="1" value={transferAmounts[kind]} onChange={e=>setTransferAmounts(current=>({...current,[kind]:Math.max(1,Number(e.target.value)||1)}))}/><button type="button" className="pip-action-button" disabled={!setOwnerCharacter||Boolean(onCommand)} onClick={()=>transferLocalResource(kind,"deposit")}>→ {text.deposit}</button><button type="button" className="pip-action-button" disabled={!setOwnerCharacter||Boolean(onCommand)} onClick={()=>transferLocalResource(kind,"withdraw")}>← {text.withdraw}</button></div>})}</section><section className="settlement-profit-card"><div className="pip-panel-title">{text.playerProfit}</div><small>{text.settlementReserve}</small><div className="settlement-balance"><span>{text.caps}</span><b>{profit.claimable.caps}</b></div><div className="settlement-balance"><span>{text.food}</span><b>{profit.claimable.food}</b></div><div className="settlement-balance"><span>{text.water}</span><b>{profit.claimable.water}</b></div>{hasProfit ? <button type="button" className="pip-action-button settlement-primary" disabled={!canClaimProfit} onClick={claimProfit}>{text.claimProfit}</button> : <small>{text.profitEmpty}</small>}</section></div> : null}
        {panelMode==="defense" ? <div className={`settlement-defense-panel ${activeAttack ? "is-alert" : ""}`}><div className="pip-panel-title">{text.attack}</div><div className="settlement-balance"><span>{text.defense}</span><b>{attributes.defense}</b></div><div className="settlement-balance"><span>{text.riskCheck}</span><b>{attackDice ? `${attackDice}d20` : "—"}</b></div><div className="settlement-balance"><span>{text.perimeter}</span><b>−{snapshot.wallDeterrence || 0} d20 · {snapshot.fortificationPoints || 0} pts</b></div><div className="settlement-balance"><span>{text.firepower}</span><b>{snapshot.turretFirepower || 0} · {snapshot.turretCount || 0} turrets</b></div>{activeAttack ? <><strong>{activeAttack.state==="warning" ? text.warning : text.attackActive}</strong><span>{activeAttack.faction?.replaceAll("_"," ")}</span><div className="settlement-balance"><span>{text.strength}</span><b>{activeAttack.strength}</b></div><span>{text.startsIn}: {formatBuildTime(Number(activeAttack.startsAt)-Date.now())}</span><small>{text.cosmeticOnly}</small>{liveSession?.mode==="host" && liveSession?.status==="online" ? <button type="button" className="pip-action-button settlement-primary" disabled={!canEdit || battleBusy} onClick={playRaidBattle}>{battleBusy ? text.battlePreparing : activeAttack.tacticalSceneId ? text.resumeBattle : text.playBattle}</button> : <small>{text.gmSessionRequired}</small>}{battleError ? <small role="alert">{battleError}</small> : null}<button type="button" className="pip-action-button" disabled={!canEdit || battleBusy} onClick={resolveAttackNow}>{text.autoDefense}</button></> : lastResolvedAttack ? <><strong>{lastResolvedAttack.result==="victory" ? text.victory : text.defeat} · {lastResolvedAttack.faction?.replaceAll("_"," ")}</strong>{lastResolvedAttack.battleReport ? <div className="settlement-auto-battle-report"><div className="pip-panel-title">{text.battleReport}</div><small>{text.cosmeticOnly}</small><div className="settlement-balance"><span>{text.rounds}</span><b>{lastResolvedAttack.battleReport.rounds}</b></div><div className="settlement-balance"><span>{text.attackers}</span><b>{lastResolvedAttack.battleReport.enemyCount}</b></div><div className="settlement-balance"><span>{text.defeatedEnemies}</span><b>{lastResolvedAttack.battleReport.enemiesDefeated}</b></div><div className="settlement-balance"><span>{text.breached}</span><b>{lastResolvedAttack.battleReport.enemiesBreached}</b></div><div className="settlement-balance"><span>{text.turrets}</span><b>{lastResolvedAttack.battleReport.turretCount}</b></div><div className="settlement-balance"><span>{text.turretShots}</span><b>{lastResolvedAttack.battleReport.turretShots}</b></div><div className="settlement-balance"><span>{text.turretDamage}</span><b>{lastResolvedAttack.battleReport.turretDamage}</b></div><div className="settlement-balance"><span>{text.wallsDestroyed}</span><b>{lastResolvedAttack.battleReport.destroyedWalls?.length || 0}</b></div>{lastResolvedAttack.battleReport.stolen ? <><div className="settlement-balance"><span>{text.stolen}</span><b>{lastResolvedAttack.battleReport.stolen.percent}%</b></div><small>Caps −{lastResolvedAttack.battleReport.stolen.caps} · C −{lastResolvedAttack.battleReport.stolen.common} · U −{lastResolvedAttack.battleReport.stolen.uncommon} · R −{lastResolvedAttack.battleReport.stolen.rare} · Food −{lastResolvedAttack.battleReport.stolen.food} · Water −{lastResolvedAttack.battleReport.stolen.water}</small></> : null}</div> : null}</> : <span>{text.noThreat}</span>}<section className="settlement-recovery"><div className="pip-panel-title">{text.recovery}</div>{damagedBuildings.length ? damagedBuildings.map(building=>{const def=SETTLEMENT_BUILDINGS[building.type];const workers=new Set(building.repair?.workerIds || []);return <div className="settlement-selected-card" key={building.id}><strong>{settlementBuildingName(def,language)}</strong><div className="settlement-balance"><span>{text.condition}</span><b>{Math.round(Number(building.condition ?? 0))}%</b></div><div className="settlement-balance"><span>{text.repairCost}</span><b>{repairCostForBuilding(building)} C</b></div>{building.repair ? <><small>{text.repairing} · {text.repairWorkers}: {workers.size}</small>{(settlement.settlers || []).map(worker=><label className="settlement-person" key={worker.id}><span><strong>{worker.name}</strong><small>{worker.status || "idle"}</small></span><input type="checkbox" disabled={!canEdit} checked={workers.has(worker.id)} onChange={event=>toggleRepairWorker(building.id,worker.id,event.target.checked)}/></label>)}</> : <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>startRepair(building.id)}>{text.repair}</button>}</div>}) : <small>{text.noDamage}</small>}</section></div> : null}
        {panelMode==="events" ? <div className="settlement-events-panel"><div className="pip-panel-title">{text.events}</div>{(settlement.events || []).length ? (settlement.events || []).slice(0,12).map((event,index)=><div key={event.id || `${event.type}-${index}`} className="settlement-event-row"><strong>{String(event.type || "event").replaceAll("_"," ")}</strong><small>{event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}</small></div>) : <span>{text.noEvents}</span>}</div> : null}
      </aside>
    </div>
    <nav className="settlement-mobile-nav">{['overview','build','people','resources'].map(navigation)}{onCommand ? <button type="button" onClick={openCampaignChat}><SheetIcon name="chat"/><span>{ui.chat}</span></button> : null}{navigation('more')}</nav>
  </div>;
}
