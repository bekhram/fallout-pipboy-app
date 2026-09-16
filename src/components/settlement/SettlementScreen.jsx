import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SETTLEMENT_BUILDINGS,
  SETTLEMENT_BUILDING_LIST,
  SETTLEMENT_GRID_SIZE,
  settlementBuildingName,
} from "../../data/settlement/buildings.js";
import { ROOMS, SETTLEMENT_ACTIONS, settlementRuleName } from "../../data/settlement/rulebook.js";
import { formatRulebookCost, getRulebookBuilding } from "../../data/settlement/rulebookCatalog.js";
import { calculateSettlementStats, formatBuildTime } from "../../utils/settlementEconomy.js";
import { calculateAttackRisk, resolveSettlementAttack } from "../../utils/settlementAttackEngine.js";
import {
  canAffordRoom,
  canAffordRulebookBuilding,
  createConstructionBuilding,
  createRoomConstruction,
  getConstructionProgress,
  getRoomConstructionProgress,
  getSettlementRulebookSnapshot,
  getStructureRoomCapacity,
  normalizeStockpile,
  payRoomCost,
  payRulebookBuildingCost,
} from "../../utils/settlementDayEngine.js";
import { getConstructionAsset, getSettlementAsset } from "./settlementAssets.js";
import "./settlement.css";

const BUILDING_ICONS = { crop_field: "🌾", water_pump: "💧", generator: "⚡", workshop: "🔧", trading_post: "¤", clinic: "+", guard_post: "▲", turret: "⌖" };
const BUILD_CATEGORIES = ["housing", "food", "water", "power", "production", "commerce", "services", "defense"];
const ROOM_ORDER = ["private_room", "dormitory", "quarters", "lounge", "storage", "office"];
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
  en: { back: "WORLD MAP", build: "BUILD", cancel: "CANCEL", caps: "Caps", food: "Food", water: "Water", power: "Power", people: "People", defense: "Defense", beds: "Beds", happiness: "Happiness", income: "Income", construction: "Construction", cannotPlace: "Cannot place here", insufficient: "Not enough stockpile materials", tapMap: "Choose a free area on the map", empty: "Choose a building below", manage: "BUILDING", move: "MOVE", demolish: "DISASSEMBLE", active: "Active", attack: "ATTACK", warning: "Raid warning", attackActive: "Attack in progress", strength: "Enemy strength", autoDefense: "AUTO DEFENSE", startsIn: "Starts in", noThreat: "No active threat", victory: "Victory", defeat: "Defeat", hqLocked: "Settlement HQ cannot be moved or disassembled", stockpile: "STOCKPILE", common: "Common", uncommon: "Uncommon", rare: "Rare", day: "Day", nextDay: "Next settlement day", target: "Construction target", none: "None", progress: "Progress", riskCheck: "End-of-day risk dice", rooms: "ROOMS", roomSlots: "Room slots", addRoom: "ADD ROOM", full: "No free room slots", roomBuilding: "Under construction" },
  ru: { back: "ГЛОБАЛЬНАЯ КАРТА", build: "СТРОИТЬ", cancel: "ОТМЕНА", caps: "Крышки", food: "Еда", water: "Вода", power: "Энергия", people: "Люди", defense: "Защита", beds: "Кровати", happiness: "Счастье", income: "Доход", construction: "Строительство", cannotPlace: "Здесь строить нельзя", insufficient: "Недостаточно материалов в запасах", tapMap: "Выберите свободное место на карте", empty: "Выберите постройку снизу", manage: "ПОСТРОЙКА", move: "ПЕРЕМЕСТИТЬ", demolish: "РАЗОБРАТЬ", active: "Работает", attack: "АТАКА", warning: "Обнаружены враги", attackActive: "Идёт нападение", strength: "Сила врага", autoDefense: "АВТООБОРОНА", startsIn: "Начало через", noThreat: "Активных угроз нет", victory: "Победа", defeat: "Поражение", hqLocked: "Штаб поселения нельзя перемещать или разбирать", stockpile: "ЗАПАСЫ", common: "Обычные", uncommon: "Необычные", rare: "Редкие", day: "День", nextDay: "Следующий день поселения", target: "Цель строительства", none: "Нет", progress: "Прогресс", riskCheck: "Кости риска в конце дня", rooms: "КОМНАТЫ", roomSlots: "Места для комнат", addRoom: "ДОБАВИТЬ КОМНАТУ", full: "Нет свободных мест для комнат", roomBuilding: "Строится" },
  uk: { back: "ГЛОБАЛЬНА МАПА", build: "БУДУВАТИ", cancel: "СКАСУВАТИ", caps: "Кришки", food: "Їжа", water: "Вода", power: "Енергія", people: "Люди", defense: "Захист", beds: "Ліжка", happiness: "Щастя", income: "Дохід", construction: "Будівництво", cannotPlace: "Тут будувати не можна", insufficient: "Недостатньо матеріалів у запасах", tapMap: "Оберіть вільне місце на мапі", empty: "Оберіть споруду знизу", manage: "СПОРУДА", move: "ПЕРЕМІСТИТИ", demolish: "РОЗІБРАТИ", active: "Працює", attack: "АТАКА", warning: "Ворог наближається", attackActive: "Триває напад", strength: "Сила ворога", autoDefense: "АВТООБОРОНА", startsIn: "Початок через", noThreat: "Активних загроз немає", victory: "Перемога", defeat: "Поразка", hqLocked: "Штаб поселення не можна переміщати або розбирати", stockpile: "ЗАПАСИ", common: "Звичайні", uncommon: "Незвичайні", rare: "Рідкісні", day: "День", nextDay: "Наступний день поселення", target: "Ціль будівництва", none: "Немає", progress: "Прогрес", riskCheck: "Кості ризику наприкінці дня", rooms: "КІМНАТИ", roomSlots: "Місця для кімнат", addRoom: "ДОДАТИ КІМНАТУ", full: "Немає вільних місць для кімнат", roomBuilding: "Будується" },
  pl: { back: "MAPA ŚWIATA", build: "BUDUJ", cancel: "ANULUJ", caps: "Kapsle", food: "Żywność", water: "Woda", power: "Energia", people: "Ludzie", defense: "Obrona", beds: "Łóżka", happiness: "Szczęście", income: "Dochód", construction: "Budowa", cannotPlace: "Nie można tu budować", insufficient: "Za mało materiałów w zapasach", tapMap: "Wybierz wolne miejsce na mapie", empty: "Wybierz budynek poniżej", manage: "BUDYNEK", move: "PRZENIEŚ", demolish: "ROZBIERZ", active: "Aktywny", attack: "ATAK", warning: "Wróg się zbliża", attackActive: "Atak trwa", strength: "Siła wroga", autoDefense: "AUTOOBRONA", startsIn: "Początek za", noThreat: "Brak aktywnego zagrożenia", victory: "Zwycięstwo", defeat: "Porażka", hqLocked: "Centrum osady nie może być przenoszone ani rozbierane", stockpile: "ZAPASY", common: "Pospolite", uncommon: "Niepospolite", rare: "Rzadkie", day: "Dzień", nextDay: "Następny dzień osady", target: "Cel budowy", none: "Brak", progress: "Postęp", riskCheck: "Kości ryzyka na koniec dnia", rooms: "POMIESZCZENIA", roomSlots: "Miejsca na pomieszczenia", addRoom: "DODAJ POMIESZCZENIE", full: "Brak wolnych miejsc", roomBuilding: "W budowie" },
};

function roomName(type, language) {
  return ROOM_NAMES[language]?.[type] || ROOM_NAMES.en[type] || type;
}
function roomCost(rule) {
  const parts = [];
  if (rule?.materials?.common) parts.push(`${rule.materials.common} C`);
  if (rule?.materials?.uncommon) parts.push(`${rule.materials.uncommon} U`);
  if (rule?.materials?.rare) parts.push(`${rule.materials.rare} R`);
  return parts.join(" · ") || "—";
}
function roomEffects(rule) {
  const effects = rule?.effects || {};
  const parts = [];
  if (effects.beds) parts.push(`🛏 +${effects.beds}`);
  if (effects.happiness) parts.push(`☺ ${effects.happiness > 0 ? "+" : ""}${effects.happiness}`);
  if (effects.storageLbs) parts.push(`📦 +${effects.storageLbs} lbs`);
  if (effects.office) parts.push("OFFICE");
  return parts.join(" · ");
}
function occupies(building, x, y) {
  const def = SETTLEMENT_BUILDINGS[building.type];
  return Boolean(def && x >= building.x && y >= building.y && x < building.x + def.footprint.width && y < building.y + def.footprint.height);
}
function canPlace(settlement, def, x, y, ignoreBuildingId = null) {
  if (!def || x < 0 || y < 0 || x + def.footprint.width > SETTLEMENT_GRID_SIZE || y + def.footprint.height > SETTLEMENT_GRID_SIZE) return false;
  for (let yy = y; yy < y + def.footprint.height; yy += 1) for (let xx = x; xx < x + def.footprint.width; xx += 1) {
    if ((settlement.buildings || []).some((building) => building.id !== ignoreBuildingId && occupies(building, xx, yy))) return false;
  }
  return true;
}
function BuildingVisual({ building, def, language }) {
  if (building.state === "construction") {
    const constructionAsset = getConstructionAsset(def.constructionSize || "medium");
    const progress = getConstructionProgress(building);
    return <div className="settlement-construction-scaffold"><img src={constructionAsset} alt="" draggable="false" /><small>{progress.progress}/{progress.required} d</small></div>;
  }
  const asset = getSettlementAsset(def.asset);
  if (asset) return <img src={asset} alt={settlementBuildingName(def, language)} draggable="false" />;
  return <div className={`settlement-generic-building settlement-generic-building--${building.type}`}>{BUILDING_ICONS[building.type] || "⌂"}</div>;
}

export default function SettlementScreen({ settlement, onUpdate, onBack }) {
  const { i18n } = useTranslation();
  const language = String(i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const text = COPY[language] || COPY.en;
  const categoryLabels = CATEGORY_LABELS[language] || CATEGORY_LABELS.en;
  const [selectedCategory, setSelectedCategory] = useState("housing");
  const [selectedType, setSelectedType] = useState(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [movingBuildingId, setMovingBuildingId] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [notice, setNotice] = useState("");
  const stats = useMemo(() => calculateSettlementStats(settlement), [settlement]);
  const snapshot = useMemo(() => getSettlementRulebookSnapshot(settlement), [settlement]);
  const attributes = { ...stats.attributes, power: snapshot.power, defense: snapshot.defense, beds: snapshot.beds };
  const stockpile = normalizeStockpile(settlement.stockpile, settlement.resources?.materials);
  const attackDice = calculateAttackRisk(settlement);
  const activeAttack = (settlement.attacks || []).find((attack) => attack.state === "warning" || attack.state === "active") || null;
  const lastResolvedAttack = (settlement.attacks || []).find((attack) => attack.state === "resolved") || null;
  const selectedDef = selectedType ? SETTLEMENT_BUILDINGS[selectedType] : null;
  const selectedRule = selectedType ? getRulebookBuilding(selectedType) : null;
  const selectedBuilding = (settlement.buildings || []).find((building) => building.id === selectedBuildingId) || null;
  const selectedBuildingLocked = selectedBuilding?.type === "settlement_hq" || Boolean(selectedBuilding?.locked);
  const selectedRoomCapacity = selectedBuilding ? getStructureRoomCapacity(selectedBuilding) : 0;
  const selectedRooms = selectedBuilding?.rooms || [];
  const movingBuilding = (settlement.buildings || []).find((building) => building.id === movingBuildingId) || null;
  const movingDef = movingBuilding ? SETTLEMENT_BUILDINGS[movingBuilding.type] : null;
  const placementDef = movingDef || selectedDef;
  const placementValid = hoverCell && placementDef ? canPlace(settlement, placementDef, hoverCell.x, hoverCell.y, movingBuildingId) : false;
  const enoughResources = selectedType ? canAffordRulebookBuilding(settlement, selectedType) : true;
  const visibleBuildings = SETTLEMENT_BUILDING_LIST.filter((definition) => definition.category === selectedCategory && getRulebookBuilding(definition.id));
  const constructionBuildings = (settlement.buildings || []).filter((building) => building.state === "construction");
  const constructionRooms = (settlement.buildings || []).flatMap((building) => (building.rooms || []).filter((room) => room.state === "construction").map((room) => ({ building, room })));
  const constructionTargets = [
    ...constructionBuildings.map((building) => ({ value: `building:${building.id}`, label: `${settlementBuildingName(SETTLEMENT_BUILDINGS[building.type], language)} · ${getConstructionProgress(building).progress}/${getConstructionProgress(building).required}` })),
    ...constructionRooms.map(({ building, room }) => ({ value: `room:${building.id}:${room.id}`, label: `${roomName(room.type, language)} @ ${settlementBuildingName(SETTLEMENT_BUILDINGS[building.type], language)} · ${getRoomConstructionProgress(room).progress}/${getRoomConstructionProgress(room).required}` })),
  ];

  function createBuildingAt(x, y) {
    if (!selectedDef || !selectedRule) return;
    if (!canPlace(settlement, selectedDef, x, y)) { setNotice(text.cannotPlace); return; }
    if (!enoughResources) { setNotice(text.insufficient); return; }
    const now = Date.now();
    onUpdate((current) => {
      const paid = payRulebookBuildingCost(current, selectedDef.id);
      return { ...paid, buildings: [...(paid.buildings || []), createConstructionBuilding({ id: `building_${now}_${Math.random().toString(36).slice(2, 7)}`, type: selectedDef.id, x, y, now })] };
    });
    setSelectedType(null); setHoverCell(null); setNotice("");
  }
  function addRoom(type) {
    if (!selectedBuilding || selectedBuilding.state !== "active" || !selectedRoomCapacity) return;
    if (selectedRooms.length >= selectedRoomCapacity) { setNotice(text.full); return; }
    if (!canAffordRoom(settlement, type)) { setNotice(text.insufficient); return; }
    const room = createRoomConstruction(type);
    if (!room) return;
    onUpdate((current) => {
      const paid = payRoomCost(current, type);
      return { ...paid, buildings: (paid.buildings || []).map((building) => building.id === selectedBuilding.id ? { ...building, rooms: [...(building.rooms || []), room] } : building) };
    });
    setNotice("");
  }
  function removeRoom(roomId) {
    if (!selectedBuilding) return;
    onUpdate((current) => {
      let happinessDelta = 0;
      const buildings = (current.buildings || []).map((building) => {
        if (building.id !== selectedBuilding.id) return building;
        const room = (building.rooms || []).find((item) => item.id === roomId);
        if (room?.state === "active" && room?.happinessApplied) happinessDelta = -Number(ROOMS[room.type]?.effects?.happiness || 0);
        return { ...building, rooms: (building.rooms || []).filter((item) => item.id !== roomId) };
      });
      return {
        ...current,
        buildings,
        attributes: { ...(current.attributes || {}), happiness: Math.max(1, Math.min(20, Number(current.attributes?.happiness || 10) + happinessDelta)) },
        settlers: (current.settlers || []).map((settler) => settler.settlementAction?.targetRoomId === roomId ? { ...settler, settlementAction: null, status: "idle" } : settler),
      };
    });
  }
  function moveBuildingTo(x, y) {
    if (!movingBuilding || !movingDef || movingBuilding.locked || movingBuilding.type === "settlement_hq") return;
    if (!canPlace(settlement, movingDef, x, y, movingBuilding.id)) { setNotice(text.cannotPlace); return; }
    onUpdate((current) => ({ ...current, buildings: (current.buildings || []).map((building) => building.id === movingBuilding.id ? { ...building, x, y } : building) }));
    setMovingBuildingId(null); setSelectedBuildingId(movingBuilding.id); setHoverCell(null); setNotice("");
  }
  function handleCellClick(x, y) {
    setHoverCell({ x, y });
    if (movingBuildingId) moveBuildingTo(x, y); else if (selectedType) createBuildingAt(x, y);
  }
  function demolishSelected() {
    if (!selectedBuilding || selectedBuildingLocked) return;
    onUpdate((current) => ({
      ...current,
      buildings: (current.buildings || []).filter((building) => building.id !== selectedBuilding.id),
      settlers: (current.settlers || []).map((settler) => settler.settlementAction?.targetBuildingId === selectedBuilding.id || settler.settlementAction?.parentBuildingId === selectedBuilding.id ? { ...settler, settlementAction: null, assignedBuildingId: null, status: "idle" } : settler),
    }));
    setSelectedBuildingId(null);
  }
  function assignAction(settlerId, type) {
    onUpdate((current) => ({ ...current, settlers: (current.settlers || []).map((settler) => settler.id === settlerId ? { ...settler, settlementAction: type ? { type } : null, status: type ? "working" : "idle" } : settler) }));
  }
  function assignBuildTarget(settlerId, value) {
    onUpdate((current) => ({ ...current, settlers: (current.settlers || []).map((settler) => {
      if (settler.id !== settlerId) return settler;
      if (!value) return { ...settler, settlementAction: { type: "build" }, assignedBuildingId: null, status: "idle" };
      const [kind, parentId, roomId] = value.split(":");
      if (kind === "room") return { ...settler, settlementAction: { type: "build", parentBuildingId: parentId, targetRoomId: roomId }, assignedBuildingId: parentId, status: "working" };
      return { ...settler, settlementAction: { type: "build", targetBuildingId: parentId }, assignedBuildingId: parentId, status: "working" };
    }) }));
  }
  function currentBuildTargetValue(settler) {
    const action = settler.settlementAction;
    if (action?.targetRoomId) return `room:${action.parentBuildingId}:${action.targetRoomId}`;
    if (action?.targetBuildingId) return `building:${action.targetBuildingId}`;
    return "";
  }
  function resolveAttackNow() {
    if (activeAttack) onUpdate((current) => resolveSettlementAttack(current, activeAttack.id));
  }

  return <div className="pip-screen settlement-screen">
    <div className="settlement-topbar">
      <button type="button" className="pip-action-button settlement-back" onClick={onBack}>{text.back}</button>
      <div className="settlement-title"><strong>{settlement.name}</strong><span>{text.day} {settlement.settlementDay || 1} · {text.nextDay}: {formatBuildTime(Number(settlement.nextDayAt) - Date.now())}</span></div>
      <div className="settlement-stats">
        <span>👥 {text.people} <b>{attributes.people}/{stats.peopleMax}</b></span><span>🍲 {text.food} <b>{attributes.food}</b></span><span>💧 {text.water} <b>{attributes.water}</b></span><span>⚡ {text.power} <b>{attributes.power}</b></span><span>🛡 {text.defense} <b>{attributes.defense}</b></span><span>🛏 {text.beds} <b>{attributes.beds}</b></span><span>☺ {text.happiness} <b>{attributes.happiness}</b></span><span>¤ {text.income} <b>{attributes.income}</b></span>
      </div>
    </div>

    <div className="settlement-layout">
      <div className="settlement-map-wrap"><div className="settlement-map" onMouseLeave={() => setHoverCell(null)}>
        {Array.from({ length: SETTLEMENT_GRID_SIZE * SETTLEMENT_GRID_SIZE }, (_, index) => { const x = index % SETTLEMENT_GRID_SIZE; const y = Math.floor(index / SETTLEMENT_GRID_SIZE); return <button key={`${x}-${y}`} type="button" className="settlement-cell" aria-label={`${x},${y}`} onMouseEnter={() => setHoverCell({ x, y })} onFocus={() => setHoverCell({ x, y })} onClick={() => handleCellClick(x, y)} />; })}
        {(settlement.buildings || []).map((building) => { const def = SETTLEMENT_BUILDINGS[building.type]; if (!def) return null; return <button type="button" key={building.id} className={`settlement-building ${building.state === "construction" ? "is-construction" : ""} ${building.type === "settlement_hq" ? "is-hq" : ""} ${selectedBuildingId === building.id ? "is-selected" : ""} ${movingBuildingId === building.id ? "is-moving" : ""}`} style={{ left: `${building.x / SETTLEMENT_GRID_SIZE * 100}%`, top: `${building.y / SETTLEMENT_GRID_SIZE * 100}%`, width: `${def.footprint.width / SETTLEMENT_GRID_SIZE * 100}%`, height: `${def.footprint.height / SETTLEMENT_GRID_SIZE * 100}%` }} title={settlementBuildingName(def, language)} onClick={(event) => { event.stopPropagation(); if (!selectedType && !movingBuildingId) setSelectedBuildingId(building.id); }}><BuildingVisual building={building} def={def} language={language} /></button>; })}
        {placementDef && hoverCell ? <div className={`settlement-placement ${placementValid && enoughResources ? "is-valid" : "is-invalid"}`} style={{ left: `${hoverCell.x / SETTLEMENT_GRID_SIZE * 100}%`, top: `${hoverCell.y / SETTLEMENT_GRID_SIZE * 100}%`, width: `${placementDef.footprint.width / SETTLEMENT_GRID_SIZE * 100}%`, height: `${placementDef.footprint.height / SETTLEMENT_GRID_SIZE * 100}%` }} /> : null}
      </div><div className="settlement-map-hint">{notice || (movingBuildingId ? text.move : selectedDef ? text.tapMap : text.empty)}</div></div>

      <aside className="settlement-summary pip-panel">
        <div className="pip-panel-title">{selectedBuilding ? text.manage : text.build}</div>
        <div className="settlement-stockpile"><div className="pip-panel-title">{text.stockpile}</div><div className="settlement-balance"><span>{text.common}</span><b>{Math.floor(stockpile.materials.common)}</b></div><div className="settlement-balance"><span>{text.uncommon}</span><b>{Math.floor(stockpile.materials.uncommon)}</b></div><div className="settlement-balance"><span>{text.rare}</span><b>{Math.floor(stockpile.materials.rare)}</b></div><div className="settlement-balance"><span>{text.caps}</span><b>{Math.floor(Number(settlement.resources?.caps || 0))}</b></div><small>{Math.floor(snapshot.stockpileCapacityLbs)} lbs</small></div>
        {selectedDef && selectedRule ? <div className="settlement-selected-card"><strong>{settlementBuildingName(selectedDef, language)}</strong><span>{selectedDef.footprint.width}×{selectedDef.footprint.height}</span><span>{formatRulebookCost(selectedRule)}</span><span>{text.construction}: {selectedRule.constructionDays} d</span><button type="button" className="pip-action-button" onClick={() => { setSelectedType(null); setHoverCell(null); }}>{text.cancel}</button></div> : null}
        {selectedBuilding ? <div className="settlement-selected-card"><strong>{settlementBuildingName(SETTLEMENT_BUILDINGS[selectedBuilding.type], language)}</strong>{selectedBuilding.state === "construction" ? <span>{text.progress}: {getConstructionProgress(selectedBuilding).progress}/{getConstructionProgress(selectedBuilding).required} d</span> : <span>{text.active}</span>}{selectedRoomCapacity > 0 ? <div className="settlement-rooms"><div className="pip-panel-title">{text.rooms} · {selectedRooms.length}/{selectedRoomCapacity}</div>{selectedRooms.map((room) => <div key={room.id} className="settlement-room-row"><span><strong>{roomName(room.type, language)}</strong><small>{roomEffects(ROOMS[room.type])}{room.state === "construction" ? ` · ${text.roomBuilding} ${getRoomConstructionProgress(room).progress}/${getRoomConstructionProgress(room).required}d` : ""}</small></span><button type="button" className="pip-action-button settlement-danger" onClick={() => removeRoom(room.id)}>×</button></div>)}{selectedBuilding.state === "active" && selectedRooms.length < selectedRoomCapacity ? <div className="settlement-room-build-list">{ROOM_ORDER.map((type) => <button key={type} type="button" className="pip-action-button" disabled={!canAffordRoom(settlement, type)} onClick={() => addRoom(type)}><span>{roomName(type, language)}</span><small>{roomCost(ROOMS[type])} · {ROOMS[type].constructionDays}d · {roomEffects(ROOMS[type])}</small></button>)}</div> : selectedRooms.length >= selectedRoomCapacity ? <small>{text.full}</small> : null}</div> : null}{selectedBuildingLocked ? <span className="settlement-hq-note">{text.hqLocked}</span> : <><button type="button" className="pip-action-button" onClick={() => { setMovingBuildingId(selectedBuilding.id); setSelectedType(null); }}>{text.move}</button><button type="button" className="pip-action-button settlement-danger" onClick={demolishSelected}>{text.demolish}</button></>}<button type="button" className="pip-action-button" onClick={() => { setSelectedBuildingId(null); setMovingBuildingId(null); }}>{text.cancel}</button></div> : null}
        <div className={`settlement-defense-panel ${activeAttack ? "is-alert" : ""}`}><div className="pip-panel-title">{text.attack}</div><div className="settlement-balance"><span>{text.riskCheck}</span><b>{attackDice ? `${attackDice}d20` : "—"}</b></div>{activeAttack ? <><strong>{activeAttack.state === "warning" ? text.warning : text.attackActive}</strong><span>{activeAttack.faction?.replaceAll("_", " ")}</span><div className="settlement-balance"><span>{text.strength}</span><b>{activeAttack.strength}</b></div><span>{text.startsIn}: {formatBuildTime(Number(activeAttack.startsAt) - Date.now())}</span><button type="button" className="pip-action-button" onClick={resolveAttackNow}>{text.autoDefense}</button></> : <span>{lastResolvedAttack ? `${lastResolvedAttack.result === "victory" ? text.victory : text.defeat} · ${lastResolvedAttack.faction?.replaceAll("_", " ")}` : text.noThreat}</span>}</div>
        <div className="settlement-people"><div className="pip-panel-title">{text.people}</div>{(settlement.settlers || []).map((settler) => <div key={settler.id} className="settlement-person settlement-person--actions"><span><strong>{settler.name}</strong><small>{settler.status}</small></span><select className="pip-input" value={settler.settlementAction?.type || ""} onChange={(event) => assignAction(settler.id, event.target.value)}><option value="">{text.none}</option>{Object.values(SETTLEMENT_ACTIONS).map((action) => <option key={action.id} value={action.id}>{settlementRuleName(action, language)}</option>)}</select>{settler.settlementAction?.type === "build" ? <select className="pip-input" value={currentBuildTargetValue(settler)} onChange={(event) => assignBuildTarget(settler.id, event.target.value)}><option value="">{text.target}</option>{constructionTargets.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}</select> : null}</div>)}</div>
      </aside>
    </div>

    <div className="settlement-build-categories" role="tablist" aria-label={text.build}>{BUILD_CATEGORIES.map((category) => <button key={category} type="button" className={selectedCategory === category ? "is-selected" : ""} onClick={() => { setSelectedCategory(category); setSelectedType(null); setHoverCell(null); setNotice(""); }}>{categoryLabels[category]}</button>)}</div>
    <div className="settlement-build-menu">{visibleBuildings.map((def) => { const asset = getSettlementAsset(def.asset); const rule = getRulebookBuilding(def.id); return <button key={def.id} type="button" className={selectedType === def.id ? "is-selected" : ""} onClick={() => { setSelectedType(def.id); setSelectedBuildingId(null); setMovingBuildingId(null); setNotice(""); }}><div className="settlement-build-menu__preview">{asset ? <img src={asset} alt="" /> : <span>{BUILDING_ICONS[def.id] || "⌂"}</span>}</div><span>{settlementBuildingName(def, language)}</span><small>{def.footprint.width}×{def.footprint.height} · {formatRulebookCost(rule)} · {rule.constructionDays}d</small></button>; })}</div>
  </div>;
}
