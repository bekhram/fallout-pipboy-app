import { personalConstructionCopy } from '../campaign/personalConstructionCopy.js';
import { upgradeRule } from '../../utils/settlementDevelopment.js';
import SettlementDailySummary from "./SettlementDailySummary.jsx";
import SettlementBuildingWorkers from "./SettlementBuildingWorkers.jsx";
import { reserveProvisions } from "../../utils/settlementProvisions.js";
import { reserveCropFertilizer } from "../../utils/settlementResources.js";
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
import { editorHistoryCommand, editorMoveEntry, editorStoreEntry } from "../../utils/settlementEditorHistory.js";
import { hasMayorOffice, setMayorBonusAction, setOfficeRole } from "../../utils/settlementOffices.js";
import { useLiveSessionBridge } from "../../utils/liveSessionBridge.js";
import { canAffordRoom, canAffordRulebookBuilding, createConstructionBuilding, createRoomConstruction, getConstructionProgress, getRoomConstructionProgress, getSettlementRulebookSnapshot, getStructureRoomCapacity, normalizeStockpile, payRoomCost, payRulebookBuildingCost } from "../../utils/settlementDayEngine.js";
import { getSettlementAsset } from "./settlementAssets.js";
import "./settlement.css";
import "./settlementRedesign.css";
import SheetIcon from "../layout/SheetIcon.jsx";
import SettlementPhaserMap from "./SettlementPhaserMap.jsx";

const BUILDING_ICONS = { crop_field: "🌾", water_pump: "💧", generator: "⚡", workshop: "🔧", trading_post: "¤", clinic: "+", guard_post: "▲", turret: "⌖" };
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
const COPY = {
  en: { back: "WORLD MAP", build: "BUILD", people: "RESIDENTS", resources: "RESOURCES", defense: "DEFENSE", events: "EVENTS", cancel: "CANCEL", caps: "Caps", food: "Food", water: "Water", power: "Power", beds: "Beds", happiness: "Happiness", income: "Income", materials: "Materials", construction: "Construction", cannotPlace: "Cannot place here", insufficient: "Not enough stockpile materials", tapMap: "Choose a free area on the map", empty: "Choose a building below", manage: "BUILDING", move: "MOVE", demolish: "DISASSEMBLE", active: "Active", attack: "ATTACK", warning: "Raid warning", attackActive: "Attack in progress", strength: "Enemy strength", autoDefense: "SIMULATE DEFENSE", playBattle: "PLAY BATTLE", resumeBattle: "OPEN BATTLE", gmSessionRequired: "Start the GM session to play this raid on the battlemap.", battlePreparing: "PREPARING BATTLE...", battleFailed: "Could not prepare battlemap", defenders: "DEFENDERS", heroes: "HEROES", heroContribution: "Hero contribution", saveDefense: "SAVE DEFENSE", startsIn: "Starts in", noThreat: "No active threat", victory: "Victory", defeat: "Defeat", battleReport: "TOWER DEFENSE REPORT", rounds: "Rounds", attackers: "Attackers", defeatedEnemies: "Enemies destroyed", breached: "Reached HQ", turrets: "Turrets", turretShots: "Turret shots", turretDamage: "Turret damage", wallsDestroyed: "Walls breached", stolen: "Resources stolen", cosmeticOnly: "Heroes and residents are visual participants only", recovery: "RECOVERY", repair: "START REPAIR", repairing: "Repairing", repairCost: "Repair cost", repairWorkers: "Repair workers", noDamage: "No damaged structures", hqLocked: "Settlement HQ cannot be moved or disassembled", stockpile: "STOCKPILE", common: "Common", uncommon: "Uncommon", rare: "Rare", day: "Day", nextDay: "Next settlement day", target: "Construction target", none: "None", progress: "Progress", riskCheck: "End-of-day risk dice", rooms: "ROOMS", full: "No free room slots", roomBuilding: "Under construction", status: "Status", stable: "Stable", risk: "Attack risk", nextEvent: "Next event", grid: "Grid", condition: "Condition", production: "Production", consumption: "Power use", noEvents: "No recent events", playerProfit: "PLAYER PROFIT", claimProfit: "CLAIM PROFIT", profitEmpty: "No profit available yet", settlementReserve: "50% stays in settlement reserve" },
  ru: { back: "ГЛОБАЛЬНАЯ КАРТА", build: "СТРОИТЬ", people: "ЖИТЕЛИ", resources: "РЕСУРСЫ", defense: "ОБОРОНА", events: "СОБЫТИЯ", cancel: "ОТМЕНА", caps: "Крышки", food: "Еда", water: "Вода", power: "Энергия", beds: "Кровати", happiness: "Счастье", income: "Доход", materials: "Материалы", construction: "Строительство", cannotPlace: "Здесь строить нельзя", insufficient: "Недостаточно материалов в запасах", tapMap: "Выберите свободное место на карте", empty: "Выберите постройку снизу", manage: "ПОСТРОЙКА", move: "ПЕРЕМЕСТИТЬ", demolish: "РАЗОБРАТЬ", active: "Работает", attack: "АТАКА", warning: "Обнаружены враги", attackActive: "Идёт нападение", strength: "Сила врага", autoDefense: "РАССЧИТАТЬ ОБОРОНУ", playBattle: "ИГРАТЬ БОЙ", resumeBattle: "ОТКРЫТЬ БОЙ", gmSessionRequired: "Запустите сессию ГМ, чтобы провести этот рейд на боевой карте.", battlePreparing: "ПОДГОТОВКА БОЯ...", battleFailed: "Не удалось подготовить боевую карту", defenders: "ЗАЩИТНИКИ", heroes: "ГЕРОИ", heroContribution: "Вклад героев", saveDefense: "СОХРАНИТЬ ОБОРОНУ", startsIn: "Начало через", noThreat: "Активных угроз нет", victory: "Победа", defeat: "Поражение", battleReport: "ОТЧЁТ TOWER DEFENSE", rounds: "Раунды", attackers: "Нападавшие", defeatedEnemies: "Уничтожено врагов", breached: "Добрались до штаба", turrets: "Турели", turretShots: "Выстрелы турелей", turretDamage: "Урон турелей", wallsDestroyed: "Пробито стен", stolen: "Украдено ресурсов", cosmeticOnly: "Герои и жители участвуют только визуально", recovery: "ВОССТАНОВЛЕНИЕ", repair: "НАЧАТЬ РЕМОНТ", repairing: "Ремонт", repairCost: "Стоимость ремонта", repairWorkers: "Ремонтники", noDamage: "Повреждённых построек нет", hqLocked: "Штаб поселения нельзя перемещать или разбирать", stockpile: "ЗАПАСЫ", common: "Обычные", uncommon: "Необычные", rare: "Редкие", day: "День", nextDay: "Следующий день поселения", target: "Цель строительства", none: "Нет", progress: "Прогресс", riskCheck: "Кости риска в конце дня", rooms: "КОМНАТЫ", full: "Нет свободных мест для комнат", roomBuilding: "Строится", status: "Статус", stable: "Стабильно", risk: "Риск атаки", nextEvent: "Следующее событие", grid: "Сетка", condition: "Состояние", production: "Производство", consumption: "Потребление энергии", noEvents: "Нет недавних событий", playerProfit: "ПРИБЫЛЬ ИГРОКА", claimProfit: "ЗАБРАТЬ ПРИБЫЛЬ", profitEmpty: "Прибыли пока нет", settlementReserve: "50% остаётся в резерве поселения" },
  uk: { back: "ГЛОБАЛЬНА МАПА", build: "БУДУВАТИ", people: "ЖИТЕЛІ", resources: "РЕСУРСИ", defense: "ОБОРОНА", events: "ПОДІЇ", cancel: "СКАСУВАТИ", caps: "Кришки", food: "Їжа", water: "Вода", power: "Енергія", beds: "Ліжка", happiness: "Щастя", income: "Дохід", materials: "Матеріали", construction: "Будівництво", cannotPlace: "Тут будувати не можна", insufficient: "Недостатньо матеріалів у запасах", tapMap: "Оберіть вільне місце на мапі", empty: "Оберіть споруду знизу", manage: "СПОРУДА", move: "ПЕРЕМІСТИТИ", demolish: "РОЗІБРАТИ", active: "Працює", attack: "АТАКА", warning: "Ворог наближається", attackActive: "Триває напад", strength: "Сила ворога", autoDefense: "РОЗРАХУВАТИ ОБОРОНУ", playBattle: "ГРАТИ БІЙ", resumeBattle: "ВІДКРИТИ БІЙ", gmSessionRequired: "Запустіть сесію ГМ, щоб провести цей рейд на бойовій мапі.", battlePreparing: "ПІДГОТОВКА БОЮ...", battleFailed: "Не вдалося підготувати бойову мапу", defenders: "ЗАХИСНИКИ", heroes: "ГЕРОЇ", heroContribution: "Внесок героїв", saveDefense: "ЗБЕРЕГТИ ОБОРОНУ", startsIn: "Початок через", noThreat: "Активних загроз немає", victory: "Перемога", defeat: "Поразка", battleReport: "ЗВІТ TOWER DEFENSE", rounds: "Раунди", attackers: "Нападники", defeatedEnemies: "Знищено ворогів", breached: "Дісталися штабу", turrets: "Турелі", turretShots: "Постріли турелей", turretDamage: "Шкода турелей", wallsDestroyed: "Пробито стін", stolen: "Вкрадено ресурсів", cosmeticOnly: "Герої та жителі беруть участь лише візуально", recovery: "ВІДНОВЛЕННЯ", repair: "ПОЧАТИ РЕМОНТ", repairing: "Ремонт", repairCost: "Вартість ремонту", repairWorkers: "Ремонтники", noDamage: "Пошкоджених споруд немає", hqLocked: "Штаб поселення не можна переміщати або розбирати", stockpile: "ЗАПАСИ", common: "Звичайні", uncommon: "Незвичайні", rare: "Рідкісні", day: "День", nextDay: "Наступний день поселення", target: "Ціль будівництва", none: "Немає", progress: "Прогрес", riskCheck: "Кості ризику наприкінці дня", rooms: "КІМНАТИ", full: "Немає вільних місць для кімнат", roomBuilding: "Будується", status: "Статус", stable: "Стабільно", risk: "Ризик атаки", nextEvent: "Наступна подія", grid: "Сітка", condition: "Стан", production: "Виробництво", consumption: "Споживання енергії", noEvents: "Немає недавніх подій", playerProfit: "ПРИБУТОК ГРАВЦЯ", claimProfit: "ЗАБРАТИ ПРИБУТОК", profitEmpty: "Прибутку поки немає", settlementReserve: "50% залишається в резерві поселення" },
  pl: { back: "MAPA ŚWIATA", build: "BUDUJ", people: "MIESZKAŃCY", resources: "ZASOBY", defense: "OBRONA", events: "ZDARZENIA", cancel: "ANULUJ", caps: "Kapsle", food: "Żywność", water: "Woda", power: "Energia", beds: "Łóżka", happiness: "Szczęście", income: "Dochód", materials: "Materiały", construction: "Budowa", cannotPlace: "Nie można tu budować", insufficient: "Za mało materiałów w zapasach", tapMap: "Wybierz wolne miejsce na mapie", empty: "Wybierz budynek poniżej", manage: "BUDYNEK", move: "PRZENIEŚ", demolish: "ROZBIERZ", active: "Aktywny", attack: "ATAK", warning: "Wróg się zbliża", attackActive: "Atak trwa", strength: "Siła wroga", autoDefense: "SYMULUJ OBRONĘ", playBattle: "GRAJ BITWĘ", resumeBattle: "OTWÓRZ BITWĘ", gmSessionRequired: "Uruchom sesję MG, aby rozegrać ten najazd na mapie bitwy.", battlePreparing: "PRZYGOTOWYWANIE BITWY...", battleFailed: "Nie udało się przygotować mapy bitwy", defenders: "OBROŃCY", heroes: "BOHATEROWIE", heroContribution: "Wkład bohaterów", saveDefense: "ZAPISZ OBRONĘ", startsIn: "Początek za", noThreat: "Brak aktywnego zagrożenia", victory: "Zwycięstwo", defeat: "Porażka", battleReport: "RAPORT TOWER DEFENSE", rounds: "Rundy", attackers: "Napastnicy", defeatedEnemies: "Zniszczeni wrogowie", breached: "Dotarli do centrum", turrets: "Wieżyczki", turretShots: "Strzały wieżyczek", turretDamage: "Obrażenia wieżyczek", wallsDestroyed: "Przełamane ściany", stolen: "Skradzione zasoby", cosmeticOnly: "Bohaterowie i mieszkańcy uczestniczą tylko wizualnie", recovery: "ODZYSKIWANIE", repair: "ROZPOCZNIJ NAPRAWĘ", repairing: "Naprawa", repairCost: "Koszt naprawy", repairWorkers: "Pracownicy naprawy", noDamage: "Brak uszkodzonych budynków", hqLocked: "Centrum osady nie może być przenoszone ani rozbierane", stockpile: "ZAPASY", common: "Pospolite", uncommon: "Niepospolite", rare: "Rzadkie", day: "Dzień", nextDay: "Następny dzień osady", target: "Cel budowy", none: "Brak", progress: "Postęp", riskCheck: "Kości ryzyka na koniec dnia", rooms: "POMIESZCZENIA", full: "Brak wolnych miejsc", roomBuilding: "W budowie", status: "Status", stable: "Stabilnie", risk: "Ryzyko ataku", nextEvent: "Następne zdarzenie", grid: "Siatka", condition: "Stan", production: "Produkcja", consumption: "Zużycie energii", noEvents: "Brak ostatnich zdarzeń", playerProfit: "ZYSK GRACZA", claimProfit: "ODBIERZ ZYSK", profitEmpty: "Brak dostępnego zysku", settlementReserve: "50% pozostaje w rezerwie osady" },
};
function roomName(type, language) { return ROOM_NAMES[language]?.[type] || ROOM_NAMES.en[type] || type; }
function roomCost(rule) { return [[rule?.materials?.common,"C"],[rule?.materials?.uncommon,"U"],[rule?.materials?.rare,"R"]].filter(([value])=>value).map(([value,suffix])=>`${value} ${suffix}`).join(" · ") || "—"; }
function roomEffects(rule) { const effects=rule?.effects || {}; return [effects.beds ? `🛏 +${effects.beds}` : null,effects.happiness ? `☺ ${effects.happiness > 0 ? "+" : ""}${effects.happiness}` : null,effects.storageLbs ? `📦 +${effects.storageLbs} lbs` : null,effects.office ? "OFFICE" : null].filter(Boolean).join(" · "); }
function occupies(building,x,y) { const def=SETTLEMENT_BUILDINGS[building.type]; return Boolean(def && x>=building.x && y>=building.y && x<building.x+def.footprint.width && y<building.y+def.footprint.height); }
function canPlace(settlement,def,x,y,ignoreBuildingId=null) {
  if (!def || x<0 || y<0 || x+def.footprint.width>SETTLEMENT_GRID_SIZE || y+def.footprint.height>SETTLEMENT_GRID_SIZE) return false;
  for(let yy=y;yy<y+def.footprint.height;yy+=1)for(let xx=x;xx<x+def.footprint.width;xx+=1)if((settlement.buildings || []).some(building=>building.id!==ignoreBuildingId && occupies(building,xx,yy)))return false;
  return true;
}
export default function SettlementScreen({ settlement, onUpdate, onBack, onCommand, canEdit=true, sharedControls, payment, canClaimProfit=false }) {
  const { i18n }=useTranslation();
  const liveSession=useLiveSessionBridge();
  const language=String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const text=COPY[language] || COPY.en;
  const personalText=personalConstructionCopy(language);
  const categoryLabels=CATEGORY_LABELS[language] || CATEGORY_LABELS.en;
  const [selectedCategory,setSelectedCategory]=useState("housing");
  const [panelMode,setPanelMode]=useState("overview");
  const [panelOpen,setPanelOpen]=useState(false);
  const [zoom,setZoom]=useState(100);
  const [defenseDraft,setDefenseDraft]=useState([]);
  const [heroDraft,setHeroDraft]=useState([]);
  const [battleBusy,setBattleBusy]=useState(false);
  const [battleError,setBattleError]=useState("");
  const [editorMode,setEditorMode]=useState(false);
  const [editorBusy,setEditorBusy]=useState(false);
  const [editorUndo,setEditorUndo]=useState([]);
  const [editorRedo,setEditorRedo]=useState([]);
  const ui=({en:{overview:'Overview',title:'Settlement',more:'More',chat:'Chat',close:'Close panel',choose:'Select a building on the map',zoomIn:'Zoom in',zoomOut:'Zoom out'},ru:{overview:'Обзор',title:'Поселение',more:'Ещё',chat:'Чат',close:'Закрыть панель',choose:'Выберите здание на карте',zoomIn:'Приблизить',zoomOut:'Отдалить'},uk:{overview:'Огляд',title:'Поселення',more:'Ще',chat:'Чат',close:'Закрити панель',choose:'Оберіть будівлю на мапі',zoomIn:'Збільшити',zoomOut:'Зменшити'},pl:{overview:'Przegląd',title:'Osada',more:'Więcej',chat:'Czat',close:'Zamknij panel',choose:'Wybierz budynek na mapie',zoomIn:'Przybliż',zoomOut:'Oddal'}})[language] || {overview:'Overview',title:'Settlement',more:'More',chat:'Chat',close:'Close panel',choose:'Select a building on the map',zoomIn:'Zoom in',zoomOut:'Zoom out'};
  const editor=({
    en:{edit:'EDIT',done:'DONE',undo:'UNDO',redo:'REDO',store:'STORE',selected:'Selected',hint:'Select a building to edit the layout',moveHint:'Tap a free grid position',stored:'Stored from editor',confirmDemolish:'Disassemble this building? This cannot be undone.'},
    ru:{edit:'РЕДАКТОР',done:'ГОТОВО',undo:'ОТМЕНИТЬ',redo:'ПОВТОРИТЬ',store:'НА СКЛАД',selected:'Выбрано',hint:'Выберите здание для редактирования',moveHint:'Тапните по свободному месту на сетке',stored:'Убрано в склад из редактора',confirmDemolish:'Разобрать это здание? Отменить это действие нельзя.'},
    uk:{edit:'РЕДАКТОР',done:'ГОТОВО',undo:'СКАСУВАТИ',redo:'ПОВТОРИТИ',store:'НА СКЛАД',selected:'Обрано',hint:'Оберіть споруду для редагування',moveHint:'Торкніться вільного місця на сітці',stored:'Прибрано до складу з редактора',confirmDemolish:'Розібрати цю споруду? Скасувати дію не можна.'},
    pl:{edit:'EDYTUJ',done:'GOTOWE',undo:'COFNIJ',redo:'PONÓW',store:'DO MAGAZYNU',selected:'Wybrano',hint:'Wybierz budynek do edycji układu',moveHint:'Dotknij wolnego miejsca na siatce',stored:'Przeniesiono do magazynu z edytora',confirmDemolish:'Rozebrać ten budynek? Tej operacji nie można cofnąć.'}
  })[language] || {edit:'EDIT',done:'DONE',undo:'UNDO',redo:'REDO',store:'STORE',selected:'Selected',hint:'Select a building to edit the layout',moveHint:'Tap a free grid position',stored:'Stored from editor',confirmDemolish:'Disassemble this building? This cannot be undone.'};
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
  const mayorOfficeActive=hasMayorOffice(settlement);
  const storeBuildings=(settlement.buildings || []).filter(building=>building.state==="active" && getRulebookBuilding(building.type)?.effects?.store);
  const officeText=({
    en:{role:"Office role",none:"None",mayor:"Mayor's Office",trade:"Trade Office",store:"Store Office",bonus:"Mayor Office bonus action"},
    ru:{role:"Роль офиса",none:"Нет",mayor:"Офис мэра",trade:"Торговый офис",store:"Офис магазина",bonus:"Дополнительное действие от офиса мэра"},
    uk:{role:"Роль офісу",none:"Немає",mayor:"Офіс мера",trade:"Торговий офіс",store:"Офіс магазину",bonus:"Додаткова дія від офісу мера"},
    pl:{role:"Rola biura",none:"Brak",mayor:"Biuro burmistrza",trade:"Biuro handlowe",store:"Biuro sklepu",bonus:"Dodatkowa akcja z biura burmistrza"}
  })[language] || {role:"Office role",none:"None",mayor:"Mayor's Office",trade:"Trade Office",store:"Store Office",bonus:"Mayor Office bonus action"};
  const movingBuilding=(settlement.buildings || []).find(building=>building.id===movingBuildingId) || null;
  const movingDef=movingBuilding ? SETTLEMENT_BUILDINGS[movingBuilding.type] : null;
  const storedBuilding=settlement.storedBuildings?.find(b=>b.id===storedBuildingId);
  const placementDef=storedBuilding ? SETTLEMENT_BUILDINGS[storedBuilding.type] : movingDef || selectedDef;
  const placementValid=hoverCell && placementDef ? canPlace(settlement,placementDef,hoverCell.x,hoverCell.y,movingBuildingId) : false;
  const enoughResources=selectedType ? payment ? payment.canAfford({type:"buildPersonal",buildingType:selectedType}) : canAffordRulebookBuilding(settlement,selectedType) : true;
  const visibleBuildings=SETTLEMENT_BUILDING_LIST.filter(definition=>definition.category===selectedCategory && getRulebookBuilding(definition.id));
  const constructionBuildings=(settlement.buildings || []).filter(building=>building.state==="construction");
  const constructionRooms=(settlement.buildings || []).flatMap(building=>(building.rooms || []).filter(room=>room.state==="construction").map(room=>({building,room})));
  const constructionTargets=[...constructionBuildings.map(building=>({value:`building:${building.id}`,label:`${settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)} · ${getConstructionProgress(building).progress}/${getConstructionProgress(building).required}`})),...constructionRooms.map(({building,room})=>({value:`room:${building.id}:${room.id}`,label:`${roomName(room.type,language)} @ ${settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)} · ${getRoomConstructionProgress(room).progress}/${getRoomConstructionProgress(room).required}`}))];
  const materialTotal=Math.floor(Number(stockpile.materials.common || 0)+Number(stockpile.materials.uncommon || 0)+Number(stockpile.materials.rare || 0));
  const nextEvent=activeAttack ? text.warning : (settlement.events || [])[0]?.type?.replaceAll("_"," ") || text.none;
  const statusText=activeAttack ? text.warning : text.stable;
  function rememberEditor(entry){
    if(!entry)return;
    setEditorUndo(current=>[...current,entry].slice(-30));
    setEditorRedo([]);
  }
  function localLayoutCommand(command){
    if(!onUpdate || !command)return false;
    if(command.type==="move"){
      const building=(settlement.buildings || []).find(item=>item.id===command.buildingId);
      const def=building && SETTLEMENT_BUILDINGS[building.type];
      if(!building || !def || building.locked || building.type==="settlement_hq" || !canPlace(settlement,def,command.x,command.y,building.id))return false;
      onUpdate(current=>({...current,buildings:(current.buildings || []).map(item=>item.id===building.id ? {...item,x:command.x,y:command.y} : item)}));
      return true;
    }
    if(command.type==="store"){
      const building=(settlement.buildings || []).find(item=>item.id===command.buildingId);
      if(!building || building.locked || building.type==="settlement_hq" || building.state==="construction" || building.upgrade)return false;
      const now=Date.now(), happinessBonus=building.happinessApplied ? Number(getRulebookBuilding(building.type)?.effects?.happiness || 0) : 0;
      onUpdate(current=>{
        const happiness=Math.max(1,Math.min(20,Number(current.attributes?.happiness || 10)-happinessBonus));
        return {...current,
          buildings:(current.buildings || []).filter(item=>item.id!==building.id),
          storedBuildings:[...(current.storedBuildings || []).filter(item=>item.id!==building.id),{...building,x:null,y:null,storedAt:now,storedReason:"MANUAL_EDITOR",happinessApplied:false}],
          attributes:{...(current.attributes || {}),happiness},
          resources:{...(current.resources || {}),happiness},
          settlers:(current.settlers || []).map(worker=>worker.assignedBuildingId===building.id || worker.settlementAction?.targetBuildingId===building.id || worker.settlementAction?.parentBuildingId===building.id ? {...worker,settlementAction:null,assignedBuildingId:null,status:"idle"} : worker)
        };
      });
      return true;
    }
    if(command.type==="placeStored"){
      const building=(settlement.storedBuildings || []).find(item=>item.id===command.buildingId);
      const def=building && SETTLEMENT_BUILDINGS[building.type];
      if(!building || !def || !canPlace(settlement,def,command.x,command.y))return false;
      onUpdate(current=>{
        const stored=(current.storedBuildings || []).find(item=>item.id===command.buildingId);
        if(!stored)return current;
        const {storedAt,storedReason,...placed}=stored;
        const happinessBonus=Number(getRulebookBuilding(stored.type)?.effects?.happiness || 0);
        const happiness=Math.max(1,Math.min(20,Number(current.attributes?.happiness || 10)+happinessBonus));
        return {...current,
          storedBuildings:(current.storedBuildings || []).filter(item=>item.id!==stored.id),
          buildings:[...(current.buildings || []),{...placed,x:command.x,y:command.y,placedAt:Date.now(),happinessApplied:true}],
          attributes:{...(current.attributes || {}),happiness},
          resources:{...(current.resources || {}),happiness},
        };
      });
      return true;
    }
    return false;
  }
  async function runLayoutCommand(command){
    if(!canEdit || !command)return false;
    if(onCommand)return Boolean(await onCommand(command));
    return localLayoutCommand(command);
  }
  async function undoLayout(){
    const entry=editorUndo[editorUndo.length-1];if(!entry || editorBusy)return;
    const command=editorHistoryCommand(entry,"undo");if(!command)return;
    setEditorBusy(true);
    try{
      if(await runLayoutCommand(command)){
        setEditorUndo(current=>current.slice(0,-1));
        setEditorRedo(current=>[...current,entry].slice(-30));
        setSelectedBuildingId(entry.buildingId);
        setNotice(editor.undo);
      }
    }finally{setEditorBusy(false);}
  }
  async function redoLayout(){
    const entry=editorRedo[editorRedo.length-1];if(!entry || editorBusy)return;
    const command=editorHistoryCommand(entry,"forward");if(!command)return;
    setEditorBusy(true);
    try{
      if(await runLayoutCommand(command)){
        setEditorRedo(current=>current.slice(0,-1));
        setEditorUndo(current=>[...current,entry].slice(-30));
        setSelectedBuildingId(entry.kind==="store" ? null : entry.buildingId);
        setNotice(editor.redo);
      }
    }finally{setEditorBusy(false);}
  }
  async function storeSelected(){
    if(!selectedBuilding || selectedBuildingLocked || editorBusy)return;
    const entry=editorStoreEntry(selectedBuilding);if(!entry)return;
    setEditorBusy(true);
    try{
      if(await runLayoutCommand({type:"store",buildingId:selectedBuilding.id})){
        rememberEditor(entry);setSelectedBuildingId(null);setMovingBuildingId(null);setHoverCell(null);setNotice(editor.store);
      }
    }finally{setEditorBusy(false);}
  }
  async function createBuildingAt(x,y) {
    if(!canEdit || !selectedDef || !selectedRule)return;
    if(!canPlace(settlement,selectedDef,x,y)){setNotice(text.cannotPlace);return;}
    if(!enoughResources){setNotice(payment ? personalText.errors.PERSONAL_RESOURCES_INSUFFICIENT : text.insufficient);return;}
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
    const entry=editorMoveEntry(movingBuilding,{x,y});
    setEditorBusy(true);
    try{
      if(await runLayoutCommand({type:"move",buildingId:movingBuilding.id,x,y})){
        rememberEditor(entry);setMovingBuildingId(null);setSelectedBuildingId(movingBuilding.id);setHoverCell(null);setNotice("");
      }
    }finally{setEditorBusy(false);}
  }
  async function handleCellClick(x,y){
    setHoverCell({x,y});
    if(storedBuildingId){
      if(canEdit && storedBuilding && await runLayoutCommand({type:'placeStored',buildingId:storedBuildingId,x,y})){setStoredBuildingId(null);setHoverCell(null);setNotice("");}
      return;
    }
    if(movingBuildingId)await moveBuildingTo(x,y);else if(selectedType)await createBuildingAt(x,y);
  }
  async function demolishSelected(){
    if(!canEdit || !selectedBuilding || selectedBuildingLocked)return;
    if(typeof window!=="undefined" && !window.confirm(editor.confirmDemolish))return;
    if(onCommand){if(await onCommand({type:"demolish",buildingId:selectedBuilding.id}))setSelectedBuildingId(null);return;}
    onUpdate(current=>{
      const happinessBonus=selectedBuilding.happinessApplied ? Number(getRulebookBuilding(selectedBuilding.type)?.effects?.happiness || 0) : 0;
      const happiness=Math.max(1,Math.min(20,Number(current.attributes?.happiness || 10)-happinessBonus));
      return {...current,
        buildings:(current.buildings || []).filter(building=>building.id!==selectedBuilding.id),
        attributes:{...(current.attributes || {}),happiness},
        resources:{...(current.resources || {}),happiness},
        settlers:(current.settlers || []).map(settler=>settler.settlementAction?.targetBuildingId===selectedBuilding.id || settler.settlementAction?.parentBuildingId===selectedBuilding.id ? {...settler,settlementAction:null,assignedBuildingId:null,status:"idle"} : settler)
      };
    });setSelectedBuildingId(null);
  }
  function assignAction(settlerId,type){
    if(!canEdit)return;if(type && !availableSettlementActions(settlement).some(a=>a.id===type))return;
    if(onCommand){void onCommand({type:"action",workerId:settlerId,action:type});return;}
    onUpdate(current=>({...current,settlers:(current.settlers || []).map(settler=>settler.id===settlerId ? {...settler,settlementAction:type ? {type} : null,assignedBuildingId:null,status:type ? "working" : "idle"} : settler)}));
  }
  function assignBonusAction(settlerId,type){
    if(!canEdit || onCommand || !mayorOfficeActive)return;
    if(type && !availableSettlementActions(settlement).some(action=>action.id===type))return;
    onUpdate(current=>setMayorBonusAction(current,settlerId,type));
  }
  function assignOfficeRole(roomId,role){
    if(!canEdit || onCommand || !selectedBuilding)return;
    onUpdate(current=>setOfficeRole(current,selectedBuilding.id,roomId,role));
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
  function toggleEditor(){
    setEditorMode(value=>{
      const next=!value;
      setPanelOpen(false);setSelectedType(null);setStoredBuildingId(null);setMovingBuildingId(null);setHoverCell(null);setNotice(next ? editor.hint : "");
      if(!next)setSelectedBuildingId(null);
      return next;
    });
  }
  useEffect(()=>{
    if(!editorMode)return;
    const keydown=event=>{
      const mod=event.ctrlKey||event.metaKey;
      if(mod && event.key.toLowerCase()==='z'){
        event.preventDefault();
        if(event.shiftKey)void redoLayout();else void undoLayout();
      }else if(mod && event.key.toLowerCase()==='y'){
        event.preventDefault();void redoLayout();
      }
    };
    window.addEventListener('keydown',keydown);
    return()=>window.removeEventListener('keydown',keydown);
  },[editorMode,editorBusy,editorUndo.length,editorRedo.length]);
  function openCampaignChat(){
    const toggle=document.querySelector(".session-utility-drawer-toggle");
    if(toggle?.getAttribute("aria-expanded")!=="true")toggle?.click();
  }
  const navigation=mode=><button type="button" key={mode} className={panelMode===mode ? "is-active" : ""} aria-current={panelMode===mode ? "page" : undefined} onClick={()=>selectPanel(mode)}><SheetIcon name={{overview:'home',build:'plus',people:'people',resources:'bag',defense:'shield',events:'notes',more:'more'}[mode]}/><span>{ui[mode] || text[mode]}</span></button>;
  return <div className={`pip-screen settlement-screen settlement-dashboard settlement-v2 ${onCommand ? 'is-shared-settlement' : ''} ${settlement.offlineStandalone ? 'is-offline-settlement' : ''} ${panelOpen ? 'is-panel-open' : ''} ${editorMode ? 'is-editor-mode' : ''}`}>
    <header className="settlement-brand"><strong>PIP 2D20 <span>/ {ui.title}</span></strong><span className="settlement-brand-name">{settlement.name}</span><button type="button" className={`pip-action-button settlement-editor-toggle ${editorMode ? "is-active" : ""}`} disabled={!canEdit} onClick={toggleEditor}><span>✥</span>{editorMode ? editor.done : editor.edit}</button>{onCommand && <button type="button" className="pip-action-button settlement-chat-button" aria-label={ui.chat} onClick={openCampaignChat}><SheetIcon name="chat"/></button>}<button type="button" className="pip-action-button" aria-label={ui.more} onClick={()=>selectPanel('more')}><SheetIcon name="settings"/></button></header>
    {sharedControls}
    <div className="settlement-layout settlement-dashboard-grid">
      <aside className="settlement-left-rail pip-panel"><nav className="settlement-left-nav">{['overview','build','people','resources','defense','events'].map(navigation)}</nav><button type="button" className="pip-action-button settlement-exit" onClick={onBack}>← {text.back}</button></aside>
      <main className="settlement-map-wrap settlement-center-panel">
        <div className="settlement-topbar settlement-resource-strip">{[['people',attributes.people,'people'],['food',attributes.food,'food'],['water',attributes.water,'flask'],['power',attributes.power,'bolt'],['defense',attributes.defense,'shield'],['happiness',`${attributes.happiness}/20`,'heart']].map(([key,value,icon])=><div className="settlement-resource-tile" key={key}><SheetIcon name={icon}/><div><small>{text[key]}</small><b>{value}</b></div></div>)}</div>
        <SettlementPhaserMap settlement={settlement} language={language} label={ui.title} zoom={zoom} onZoom={setZoom} selectedBuildingId={selectedBuildingId} placementDef={placementDef} hoverCell={hoverCell} placementValid={placementValid && enoughResources} onHover={cell=>setHoverCell(current=>current?.x===cell?.x && current?.y===cell?.y ? current : cell)} onCell={handleCellClick} onSelect={id=>{setSelectedBuildingId(id);if(editorMode){setPanelOpen(false);setNotice("");}else{setPanelMode('build');setPanelOpen(true);}}}/>
        <div className="settlement-map-controls"><button type="button" aria-label={ui.zoomOut} disabled={zoom===100} onClick={()=>setZoom(value=>Math.max(100,value-25))}>−</button><span>{zoom}%</span><button type="button" aria-label={ui.zoomIn} disabled={zoom===200} onClick={()=>setZoom(value=>Math.min(200,value+25))}>+</button></div>
        <div className="settlement-map-hint" role="status">{notice || (movingBuildingId ? editor.moveHint : selectedDef ? text.tapMap : editorMode ? (selectedBuilding ? `${editor.selected}: ${settlementBuildingName(selectedBuildingDef,language)}` : editor.hint) : ui.choose)}</div>
        <div className="settlement-map-actions"><button type="button" className="pip-action-button settlement-primary" onClick={()=>selectPanel('build')}><SheetIcon name="plus"/>{text.build}</button><button type="button" className={`pip-action-button settlement-editor-toggle ${editorMode ? "is-active" : ""}`} disabled={!canEdit} onClick={toggleEditor}>✥ {editorMode ? editor.done : editor.edit}</button>{(selectedType || movingBuildingId || storedBuildingId) && <button type="button" className="pip-action-button" onClick={()=>{setSelectedType(null);setMovingBuildingId(null);setStoredBuildingId(null);setNotice('');}}>{text.cancel}</button>}</div>
        {editorMode && <div className="settlement-editor-toolbar">
          <button type="button" className="pip-action-button" disabled={editorBusy || !editorUndo.length} onClick={()=>void undoLayout()}>↶ {editor.undo}</button>
          <button type="button" className="pip-action-button" disabled={editorBusy || !editorRedo.length} onClick={()=>void redoLayout()}>↷ {editor.redo}</button>
          {selectedBuilding ? <><span className="settlement-editor-selection"><small>{editor.selected}</small><strong>{settlementBuildingName(selectedBuildingDef,language)}</strong></span>
            {selectedBuildingLocked ? <span className="settlement-hq-note">{text.hqLocked}</span> : <>
              <button type="button" className="pip-action-button" disabled={editorBusy} onClick={()=>{setStoredBuildingId(null);setMovingBuildingId(selectedBuilding.id);setSelectedType(null);setHoverCell(null);setNotice(editor.moveHint);}}>↔ {text.move}</button>
              <button type="button" className="pip-action-button" disabled={editorBusy || selectedBuilding.state==="construction" || Boolean(selectedBuilding.upgrade)} onClick={()=>void storeSelected()}>▣ {editor.store}</button>
              <button type="button" className="pip-action-button settlement-danger" disabled={editorBusy || selectedBuilding.state==="construction" || Boolean(selectedBuilding.upgrade)} onClick={()=>void demolishSelected()}>{text.demolish}</button>
            </>}
            <button type="button" className="pip-action-button settlement-editor-clear" onClick={()=>{setSelectedBuildingId(null);setMovingBuildingId(null);setNotice(editor.hint);}}>×</button>
          </> : <span className="settlement-editor-empty">{editor.hint}</span>}
        </div>}
      </main>
      <aside className="settlement-summary settlement-right-panel pip-panel" aria-label={ui[panelMode] || text[panelMode]}>
        <button type="button" className="settlement-panel-close pip-action-button" aria-label={ui.close} onClick={()=>setPanelOpen(false)}>×</button>
        {panelMode==='more' && <div className="settlement-more">{['overview','defense','events'].map(navigation)}<button type="button" className="pip-action-button" onClick={onBack}>← {text.back}</button></div>}
        {panelMode==='overview' && <><h2>{settlement.name}</h2><p>{statusText}</p><div className="settlement-balance"><span>{text.day}</span><b>{settlement.settlementDay || 1}</b></div><div className="settlement-balance"><span>{text.beds}</span><b>{attributes.beds}</b></div><div className="settlement-balance"><span>{text.income}</span><b>+{attributes.income}</b></div><div className="settlement-balance"><span>{text.caps}</span><b>{Math.floor(Number(settlement.resources?.caps || 0))}</b></div><div className="settlement-balance"><span>{text.materials}</span><b>{materialTotal}</b></div><div className="settlement-balance"><span>{text.risk}</span><b>{attackDice}d20</b></div><label className="settlement-building-picker">{ui.choose}<select className="pip-input" value="" onChange={event=>{if(event.target.value){setSelectedBuildingId(event.target.value);setPanelMode("build");setPanelOpen(true);}}}><option value="">—</option>{(settlement.buildings || []).map(building=><option key={building.id} value={building.id}>{settlementBuildingName(SETTLEMENT_BUILDINGS[building.type],language)}</option>)}</select></label><h3>{text.events}</h3>{(settlement.events || []).length ? settlement.events.slice(0,3).map((event,index)=><div className="settlement-event-row" key={event.id || index}>{String(event.type || '').replaceAll('_',' ')}</div>) : <p>{text.noEvents}</p>}</>}
        {panelMode==="build" && !selectedBuilding ? <><div className="settlement-build-categories" role="tablist" aria-label={text.build}>{BUILD_CATEGORIES.map(category=><button key={category} type="button" className={selectedCategory===category ? "is-selected" : ""} onClick={()=>{setSelectedCategory(category);setSelectedType(null);setHoverCell(null);setNotice("");}}>{categoryLabels[category]}</button>)}</div><div className="settlement-build-menu">{visibleBuildings.map(def=>{const asset=getSettlementAsset(def.asset);const rule=getRulebookBuilding(def.id);return <button key={def.id} type="button" disabled={!canEdit} className={selectedType===def.id ? "is-selected" : ""} onClick={()=>{setSelectedType(def.id);setStoredBuildingId(null);setSelectedBuildingId(null);setMovingBuildingId(null);setNotice("");setPanelOpen(false);}}><div className="settlement-build-menu__preview">{asset ? <img src={asset} alt=""/> : <span>{BUILDING_ICONS[def.id] || "⌂"}</span>}</div><span>{settlementBuildingName(def,language)}</span><small>{def.footprint.width}×{def.footprint.height} · {formatRulebookCost(rule)} · {rule.constructionDays}d</small></button>;})}</div></> : null}
        {panelMode==="build" ? <>
          {payment && <p className="settlement-personal-notice">{personalText.source} · {personalText.pending}</p>}
          {!!settlement.storedBuildings?.length && <section className="settlement-warehouse"><h3>{personalText.warehouse} · {settlement.storedBuildings.length}</h3><small>{personalText.storedNote}</small>
            {settlement.storedBuildings.map(b=><div className="settlement-warehouse-row" key={b.id}><strong>{settlementBuildingName(SETTLEMENT_BUILDINGS[b.type],language)}</strong><small>{b.storedReason==="MANUAL_EDITOR" ? editor.stored : b.funding?.payerUid ? `${personalText.paid}: ${b.funding.payerUid}` : personalText.storedNote}</small>
              <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>{setStoredBuildingId(b.id);setMovingBuildingId(null);setSelectedType(null);setSelectedBuildingId(null);setPanelOpen(false);}}>{personalText.place}</button>
              {b.funding?.type==="character" && <button type="button" className="pip-action-button" disabled={!canEdit || !onCommand} onClick={()=>onCommand?.({type:'cancelStored',buildingId:b.id})}>{personalText.cancelStored}</button>}</div>)}
          </section>}
          {storedBuilding && <p role="status">{personalText.place}: {settlementBuildingName(SETTLEMENT_BUILDINGS[storedBuilding.type],language)} <button type="button" className="pip-action-button" onClick={()=>setStoredBuildingId(null)}>{text.cancel}</button></p>}

          <div className="pip-panel-title">{selectedBuilding ? settlementBuildingName(selectedBuildingDef,language) : text.build}</div>
          {selectedBuilding ? <div className="settlement-building-hero">{selectedBuildingAsset ? <img src={selectedBuildingAsset} alt=""/> : <span>{BUILDING_ICONS[selectedBuilding.type] || "⌂"}</span>}</div> : null}
          <div className={`settlement-stockpile ${selectedBuilding ? "is-hidden" : ""}`}><div className="pip-panel-title">{text.stockpile}</div><div className="settlement-balance"><span>{text.common}</span><b>{Math.floor(stockpile.materials.common)}</b></div><div className="settlement-balance"><span>{text.uncommon}</span><b>{Math.floor(stockpile.materials.uncommon)}</b></div><div className="settlement-balance"><span>{text.rare}</span><b>{Math.floor(stockpile.materials.rare)}</b></div><div className="settlement-balance"><span>{text.caps}</span><b>{Math.floor(Number(settlement.resources?.caps || 0))}</b></div></div>
          {selectedDef && selectedRule ? <div className="settlement-selected-card"><strong>{settlementBuildingName(selectedDef,language)}</strong><span>{selectedDef.footprint.width}×{selectedDef.footprint.height}</span><span>{formatRulebookCost(selectedRule)}</span><span>{text.construction}: {selectedRule.constructionDays} d</span><button type="button" className="pip-action-button" onClick={()=>{setSelectedType(null);setHoverCell(null);}}>{text.cancel}</button></div> : null}
          {selectedBuilding ? <div className="settlement-selected-card"><strong>{settlementBuildingName(selectedBuildingDef,language)}</strong><div className="settlement-balance"><span>{text.condition}</span><b>{Math.round(Number(selectedBuilding.condition ?? 100))}%</b></div>{selectedBuilding.state==="construction" ? <span>{text.progress}: {getConstructionProgress(selectedBuilding).progress}/{getConstructionProgress(selectedBuilding).required} d</span> : <span>{text.active}</span>}
            {selectedBuilding.state==='construction' && onCommand && <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>onCommand({type:'cancel',key:`building:${selectedBuilding.id}`})}>{personalText.cancel}</button>}
            {payment && selectedBuilding.state==='active' && upgradeRule(selectedBuilding) && !selectedBuilding.upgrade && <button type="button" className="pip-action-button" disabled={!canEdit || !payment.canAfford({type:'upgradePersonal',buildingId:selectedBuilding.id})} onClick={()=>onCommand({type:'upgrade',buildingId:selectedBuilding.id})}>{personalText.upgrade}</button>}
            <SettlementBuildingWorkers key={`${settlement.id}:${selectedBuilding.id}`} settlement={settlement} building={selectedBuilding} language={language} canEdit={canEdit} onCommand={onCommand} onUpdate={onUpdate} roomLabel={type=>roomName(type,language)}/>
            {selectedBuildingRule?.effects?.requiresPower ? <div className="settlement-balance"><span>{text.consumption}</span><b>{selectedBuildingRule.effects.requiresPower} ⚡</b></div> : null}
            {selectedRoomCapacity>0 ? <div className="settlement-rooms"><div className="pip-panel-title">{text.rooms} · {selectedRooms.length}/{selectedRoomCapacity}</div>{selectedRooms.map(room=><div key={room.id} className="settlement-room-row"><span><strong>{roomName(room.type,language)}</strong><small>{roomEffects(ROOMS[room.type])}{room.state==="construction" ? ` · ${text.roomBuilding} ${getRoomConstructionProgress(room).progress}/${getRoomConstructionProgress(room).required}d` : ""}</small>{room.type==="office" && room.state==="active" && !onCommand ? <label className="settlement-office-role">{officeText.role}<select className="pip-input" value={room.officeRole || ""} onChange={event=>assignOfficeRole(room.id,event.target.value)}><option value="">{officeText.none}</option><option value="mayor">{officeText.mayor}</option><option value="trade">{officeText.trade}</option>{storeBuildings.map(store=><option key={store.id} value={`store:${store.id}`}>{officeText.store}: {settlementBuildingName(SETTLEMENT_BUILDINGS[store.type],language)}</option>)}</select></label> : null}</span><button type="button" className="pip-action-button settlement-danger" disabled={!canEdit} onClick={()=>removeRoom(room.id)}>×</button></div>)}{selectedBuilding.state==="active" && selectedRooms.length<selectedRoomCapacity ? <div className="settlement-room-build-list">{ROOM_ORDER.map(type=><button key={type} type="button" className="pip-action-button" disabled={!canEdit || (payment ? !payment.canAfford({type:"roomPersonal",buildingId:selectedBuilding?.id,roomType:type}) : !canAffordRoom(settlement,type))} onClick={()=>addRoom(type)}><span>{roomName(type,language)}</span><small>{roomCost(ROOMS[type])} · {ROOMS[type].constructionDays}d · {roomEffects(ROOMS[type])}</small></button>)}</div> : selectedRooms.length>=selectedRoomCapacity ? <small>{text.full}</small> : null}</div> : null}
            {selectedBuildingLocked ? <span className="settlement-hq-note">{text.hqLocked}</span> : <><button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>{setStoredBuildingId(null);setMovingBuildingId(selectedBuilding.id);setSelectedType(null);setPanelOpen(false);}}>{text.move}</button><button type="button" className="pip-action-button" disabled={!canEdit || selectedBuilding.state==="construction" || Boolean(selectedBuilding.upgrade)} onClick={()=>void storeSelected()}>{editor.store}</button><button type="button" className="pip-action-button settlement-danger" disabled={!canEdit || selectedBuilding.state==="construction" || Boolean(selectedBuilding.upgrade)} onClick={()=>void demolishSelected()}>{text.demolish}</button></>}<button type="button" className="pip-action-button" onClick={()=>{setSelectedBuildingId(null);setMovingBuildingId(null);}}>{text.cancel}</button></div> : null}
        </> : null}
        {panelMode==="people" ? <div className="settlement-people settlement-people--panel"><div className="pip-panel-title">{text.people}</div>{(settlement.settlers || []).map(settler=><div key={settler.id} className="settlement-person settlement-person--actions"><span><strong>{settler.name}</strong><small>{settler.status}</small>{settler.settlementAction?.targetBuildingId && <button type="button" className="pip-action-button" onClick={()=>{setSelectedBuildingId(settler.settlementAction.targetBuildingId);setPanelMode('build');setPanelOpen(true);}}>{workplaceName(settler.settlementAction.targetBuildingId)}</button>}</span><select className="pip-input" disabled={!canEdit} value={settler.settlementAction?.type || ""} onChange={event=>assignAction(settler.id,event.target.value)}><option value="">{text.none}</option>{availableSettlementActions(settlement).map(action=><option key={action.id} value={action.id}>{settlementRuleName(action,language)}</option>)}</select>{settler.settlementAction?.type==="build" ? <select className="pip-input" disabled={!canEdit} value={currentBuildTargetValue(settler)} onChange={event=>assignBuildTarget(settler.id,event.target.value)}><option value="">{text.target}</option>{constructionTargets.map(target=><option key={target.value} value={target.value}>{target.label}</option>)}</select> : null}{mayorOfficeActive && !onCommand ? <label className="settlement-bonus-action">{officeText.bonus}<select className="pip-input" disabled={!canEdit} value={settler.bonusSettlementAction?.type || ""} onChange={event=>assignBonusAction(settler.id,event.target.value)}><option value="">{text.none}</option>{availableSettlementActions(settlement).map(action=><option key={action.id} value={action.id}>{settlementRuleName(action,language)}</option>)}</select></label> : null}</div>)}</div> : null}
        {panelMode==="resources" ? <div className="settlement-resource-panel"><div className="pip-panel-title">{text.resources}</div><SettlementDailySummary settlement={settlement} language={language} canEdit={canEdit} onSupply={resource=>{if(onCommand)void onCommand({type:"supplies",resource});else onUpdate(current=>reserveProvisions(current,resource));}} onFertilizer={onCommand ? null : ()=>onUpdate(current=>reserveCropFertilizer(current,1))}/><div className="settlement-balance"><span>{text.food}</span><b>{attributes.food}</b></div><div className="settlement-balance"><span>{text.water}</span><b>{attributes.water}</b></div><div className="settlement-balance"><span>{text.power}</span><b>{attributes.power}</b></div><div className="settlement-balance"><span>{text.beds}</span><b>{attributes.beds}</b></div><div className="settlement-balance"><span>{text.income}</span><b>{attributes.income}</b></div><div className="settlement-balance"><span>{text.common}</span><b>{Math.floor(stockpile.materials.common)}</b></div><div className="settlement-balance"><span>{text.uncommon}</span><b>{Math.floor(stockpile.materials.uncommon)}</b></div><div className="settlement-balance"><span>{text.rare}</span><b>{Math.floor(stockpile.materials.rare)}</b></div><small>{Math.floor(snapshot.stockpileCapacityLbs)} lbs</small>{!settlement.offlineStandalone && <section className="settlement-profit-card"><div className="pip-panel-title">{text.playerProfit}</div><small>{text.settlementReserve}</small><div className="settlement-balance"><span>{text.caps}</span><b>{profit.claimable.caps}</b></div><div className="settlement-balance"><span>{text.food}</span><b>{profit.claimable.food}</b></div><div className="settlement-balance"><span>{text.water}</span><b>{profit.claimable.water}</b></div>{hasProfit ? <button type="button" className="pip-action-button settlement-primary" disabled={!canClaimProfit} onClick={claimProfit}>{text.claimProfit}</button> : <small>{text.profitEmpty}</small>}</section>}</div> : null}
        {panelMode==="defense" ? <div className={`settlement-defense-panel ${activeAttack ? "is-alert" : ""}`}><div className="pip-panel-title">{text.attack}</div><div className="settlement-balance"><span>{text.defense}</span><b>{attributes.defense}</b></div><div className="settlement-balance"><span>{text.riskCheck}</span><b>{attackDice ? `${attackDice}d20` : "—"}</b></div>{activeAttack ? <><strong>{activeAttack.state==="warning" ? text.warning : text.attackActive}</strong><span>{activeAttack.faction?.replaceAll("_"," ")}</span><div className="settlement-balance"><span>{text.strength}</span><b>{activeAttack.strength}</b></div><span>{text.startsIn}: {formatBuildTime(Number(activeAttack.startsAt)-Date.now())}</span><small>{text.cosmeticOnly}</small>{settlement.offlineStandalone ? null : liveSession?.mode==="host" && liveSession?.status==="online" ? <button type="button" className="pip-action-button settlement-primary" disabled={!canEdit || battleBusy} onClick={playRaidBattle}>{battleBusy ? text.battlePreparing : activeAttack.tacticalSceneId ? text.resumeBattle : text.playBattle}</button> : <small>{text.gmSessionRequired}</small>}{battleError ? <small role="alert">{battleError}</small> : null}<button type="button" className="pip-action-button" disabled={!canEdit || battleBusy} onClick={resolveAttackNow}>{text.autoDefense}</button></> : lastResolvedAttack ? <><strong>{lastResolvedAttack.result==="victory" ? text.victory : text.defeat} · {lastResolvedAttack.faction?.replaceAll("_"," ")}</strong>{lastResolvedAttack.battleReport ? <div className="settlement-auto-battle-report"><div className="pip-panel-title">{text.battleReport}</div><small>{text.cosmeticOnly}</small><div className="settlement-balance"><span>{text.rounds}</span><b>{lastResolvedAttack.battleReport.rounds}</b></div><div className="settlement-balance"><span>{text.attackers}</span><b>{lastResolvedAttack.battleReport.enemyCount}</b></div><div className="settlement-balance"><span>{text.defeatedEnemies}</span><b>{lastResolvedAttack.battleReport.enemiesDefeated}</b></div><div className="settlement-balance"><span>{text.breached}</span><b>{lastResolvedAttack.battleReport.enemiesBreached}</b></div><div className="settlement-balance"><span>{text.turrets}</span><b>{lastResolvedAttack.battleReport.turretCount}</b></div><div className="settlement-balance"><span>{text.turretShots}</span><b>{lastResolvedAttack.battleReport.turretShots}</b></div><div className="settlement-balance"><span>{text.turretDamage}</span><b>{lastResolvedAttack.battleReport.turretDamage}</b></div><div className="settlement-balance"><span>{text.wallsDestroyed}</span><b>{lastResolvedAttack.battleReport.destroyedWalls?.length || 0}</b></div>{lastResolvedAttack.battleReport.stolen ? <><div className="settlement-balance"><span>{text.stolen}</span><b>{lastResolvedAttack.battleReport.stolen.percent}%</b></div><small>Caps −{lastResolvedAttack.battleReport.stolen.caps} · C −{lastResolvedAttack.battleReport.stolen.common} · U −{lastResolvedAttack.battleReport.stolen.uncommon} · R −{lastResolvedAttack.battleReport.stolen.rare} · Food −{lastResolvedAttack.battleReport.stolen.food} · Water −{lastResolvedAttack.battleReport.stolen.water}</small></> : null}</div> : null}</> : <span>{text.noThreat}</span>}<section className="settlement-recovery"><div className="pip-panel-title">{text.recovery}</div>{damagedBuildings.length ? damagedBuildings.map(building=>{const def=SETTLEMENT_BUILDINGS[building.type];const workers=new Set(building.repair?.workerIds || []);return <div className="settlement-selected-card" key={building.id}><strong>{settlementBuildingName(def,language)}</strong><div className="settlement-balance"><span>{text.condition}</span><b>{Math.round(Number(building.condition ?? 0))}%</b></div><div className="settlement-balance"><span>{text.repairCost}</span><b>{repairCostForBuilding(building)} C</b></div>{building.repair ? <><small>{text.repairing} · {text.repairWorkers}: {workers.size}</small>{(settlement.settlers || []).map(worker=><label className="settlement-person" key={worker.id}><span><strong>{worker.name}</strong><small>{worker.status || "idle"}</small></span><input type="checkbox" disabled={!canEdit} checked={workers.has(worker.id)} onChange={event=>toggleRepairWorker(building.id,worker.id,event.target.checked)}/></label>)}</> : <button type="button" className="pip-action-button" disabled={!canEdit} onClick={()=>startRepair(building.id)}>{text.repair}</button>}</div>}) : <small>{text.noDamage}</small>}</section></div> : null}
        {panelMode==="events" ? <div className="settlement-events-panel"><div className="pip-panel-title">{text.events}</div>{(settlement.events || []).length ? (settlement.events || []).slice(0,12).map((event,index)=><div key={event.id || `${event.type}-${index}`} className="settlement-event-row"><strong>{String(event.type || "event").replaceAll("_"," ")}</strong><small>{event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}</small></div>) : <span>{text.noEvents}</span>}</div> : null}
      </aside>
    </div>
    <nav className="settlement-mobile-nav">{['overview','build','people','resources'].map(navigation)}{onCommand && <button type="button" onClick={openCampaignChat}><SheetIcon name="chat"/><span>{ui.chat}</span></button>}{navigation('more')}</nav>
  </div>;
}
