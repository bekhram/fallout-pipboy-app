import { BESTIARY_ENTRIES } from "../data/bestiary.js";
import {
  enemyGroupForEntry,
  normalizeEnemyGroup,
} from "./proceduralEnemyGroups.js";
import {
  normalizeEnemyCountOverride,
  proceduralRankCounts,
} from "./proceduralEncounterBalance.js";
import { generateVaultLayout } from "./proceduralVaultGenerator.js";

const VAULT_AUTO_GROUPS = [
  "ghoul",
  "robot",
  "raider",
  "super_mutant",
  "institute",
  "vault_dweller",
  "insect",
];

function hashSeed(value) {
  const text = String(value ?? "1");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rngFor(value) {
  let state = hashSeed(value);
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isNpcEntry(entry) {
  if (!entry || entry.statKind === "rule") return false;
  return !["trap", "hazard", "obstacle"].includes(String(entry.category || "").toLowerCase());
}

function difficultyTotal(spec = {}) {
  const party = Math.max(1, Math.floor(Number(spec.partySize || 4)));
  const difficulty = String(spec.encounterDifficulty || "standard");
  const factor = difficulty === "easy" ? 0.75 : difficulty === "hard" ? 1.5 : difficulty === "deadly" ? 2 : 1;
  return Math.max(1, Math.min(50, Math.round(party * factor)));
}

export function vaultRoomTiles(layout) {
  return (layout?.tiles || []).filter((tile) => tile.kind !== "corridor" && tile.tileId !== "atrium_vault_entrance");
}

export function vaultRoomMarkers(layout) {
  return vaultRoomTiles(layout).map((tile, index) => ({
    id: `vault-room-marker-${tile.id}`,
    roomId: tile.id,
    tileId: tile.tileId,
    label: tile.label || tile.tileId,
    marker: index + 1,
    x: Number(tile.cellX || 0) + Number(tile.w || 12) / 2,
    y: Number(tile.cellY || 0) + Number(tile.h || 12) / 2,
    sector: tile.sector || "",
    ruined: tile.kind === "ruined_room",
  }));
}

function chooseGroup(spec, rng) {
  const requested = normalizeEnemyGroup(spec?.enemyFaction);
  if (requested && requested !== "auto") return requested;
  return VAULT_AUTO_GROUPS[Math.floor(rng() * VAULT_AUTO_GROUPS.length)] || "ghoul";
}

function compatibleEntries(group) {
  const entries = BESTIARY_ENTRIES.filter(isNpcEntry).filter((entry) => enemyGroupForEntry(entry) === group);
  return entries.length ? entries : BESTIARY_ENTRIES.filter(isNpcEntry);
}

function shuffled(rng, values) {
  return [...values]
    .map((value) => ({ value, roll: rng() }))
    .sort((a, b) => a.roll - b.roll)
    .map((item) => item.value);
}

export function generateVaultEncounterPlan(spec = {}, suppliedLayout = null) {
  const layout = suppliedLayout || generateVaultLayout(spec);
  const rooms = vaultRoomTiles(layout);
  if (!rooms.length) return { group: "auto", total: 0, rooms: [], rankCounts: { minion: 0, standard: 0, special: 0, legendary: 0 } };

  const rng = rngFor(`vault-encounter:${spec.seed || "1"}:${spec.cols || 24}:${spec.enemyFaction || "auto"}:${spec.encounterDifficulty || "standard"}:${spec.enemyCountOverride || 0}`);
  const group = chooseGroup(spec, rng);
  const entries = compatibleEntries(group);
  const override = normalizeEnemyCountOverride(spec?.enemyCountOverride);
  const total = override || difficultyTotal(spec);
  const rankCounts = proceduralRankCounts(total);
  const ranks = [];
  ["legendary", "special", "standard", "minion"].forEach((rank) => {
    for (let i = 0; i < Number(rankCounts?.[rank] || 0); i += 1) ranks.push(rank);
  });
  while (ranks.length < total) ranks.push("standard");

  const orderedRooms = shuffled(rng, rooms);
  const result = orderedRooms.map((room) => ({ room, enemies: [] }));
  ranks.slice(0, total).forEach((rank, index) => {
    const roomBucket = result[index % result.length];
    const entry = entries[Math.floor(rng() * entries.length)] || entries[0];
    if (!entry) return;
    roomBucket.enemies.push({
      entry,
      type: entry.name || entry.id || "Enemy",
      npcId: entry.id || "",
      rank,
      count: 1,
      enemyGroup: group,
      baseXp: Number(entry.baseXp ?? entry.xp ?? 10) || 10,
      xp: Number(entry.baseXp ?? entry.xp ?? 10) || 10,
    });
  });

  return {
    group,
    total,
    rankCounts,
    rooms: result.filter((item) => item.enemies.length),
  };
}

export function vaultSpawnCells(tile) {
  if (!tile) return [];
  const x0 = Math.floor(Number(tile.cellX || 0));
  const y0 = Math.floor(Number(tile.cellY || 0));
  const w = Math.max(1, Math.floor(Number(tile.w || 12)));
  const h = Math.max(1, Math.floor(Number(tile.h || 12)));
  const cells = [];
  for (let y = y0 + 2; y <= y0 + h - 3; y += 1) {
    for (let x = x0 + 2; x <= x0 + w - 3; x += 1) {
      const dx = Math.abs(x - (x0 + (w - 1) / 2));
      const dy = Math.abs(y - (y0 + (h - 1) / 2));
      cells.push({ x, y, score: dx + dy });
    }
  }
  return cells.sort((a, b) => a.score - b.score || a.y - b.y || a.x - b.x);
}


export const VAULT_ROOM_DESCRIPTIONS = {
  entrance_airlock: {
    en: "Entry decontamination and pressure-control chamber. Good place for alarms, sealed doors and first-contact threats.",
    ru: "Входной шлюз с деконтаминацией и контролем давления. Подходит для тревоги, гермодверей и первой встречи с угрозой.",
    uk: "Вхідний шлюз із деконтамінацією та контролем тиску. Підходить для тривоги, гермодверей і першої зустрічі із загрозою.",
    pl: "Śluza wejściowa z dekontaminacją i kontrolą ciśnienia. Dobre miejsce na alarm, grodzie i pierwsze zagrożenie.",
  },
  security_checkpoint: {
    en: "Security screening point with consoles and controlled access. Expect cameras, turrets, guards or locked storage.",
    ru: "Пост охраны с терминалами и контролем доступа. Здесь логичны камеры, турели, охрана и запертые шкафы.",
    uk: "Пост охорони з терміналами та контролем доступу. Тут доречні камери, турелі, охорона й замкнені шафи.",
    pl: "Punkt ochrony z terminalami i kontrolą dostępu. Pasują tu kamery, wieżyczki, strażnicy i zamknięte schowki.",
  },
  command_room: {
    en: "Vault operations center with monitoring, communications and administrative terminals.",
    ru: "Центр управления убежищем: мониторинг, связь и административные терминалы.",
    uk: "Центр керування сховищем: моніторинг, зв'язок та адміністративні термінали.",
    pl: "Centrum operacyjne schronu: monitoring, łączność i terminale administracyjne.",
  },
  living_quarters: {
    en: "Residential section with bunks, lockers and personal belongings. Often contains survivors, clues or small loot.",
    ru: "Жилой сектор с койками, шкафчиками и личными вещами. Здесь часто встречаются выжившие, улики и мелкий лут.",
    uk: "Житловий сектор із ліжками, шафками та особистими речами. Тут часто трапляються вцілілі, зачіпки й дрібний лут.",
    pl: "Sekcja mieszkalna z łóżkami, szafkami i rzeczami osobistymi. Częste miejsce ocalałych, wskazówek i drobnego łupu.",
  },
  cafeteria: {
    en: "Communal dining and food-service area. Useful for supplies, ambushes and environmental storytelling.",
    ru: "Общая столовая и зона раздачи пищи. Подходит для припасов, засад и следов прошлой жизни.",
    uk: "Спільна їдальня та зона видачі їжі. Підходить для припасів, засідок і слідів минулого життя.",
    pl: "Stołówka i zaplecze żywnościowe. Dobre miejsce na zapasy, zasadzki i ślady dawnego życia.",
  },
  medbay: {
    en: "Medical ward with treatment beds, diagnostic equipment and medicine storage.",
    ru: "Медицинский блок с койками, диагностикой и запасами медикаментов.",
    uk: "Медичний блок із ліжками, діагностикою та запасами медикаментів.",
    pl: "Blok medyczny z łóżkami, diagnostyką i zapasem leków.",
  },
  armory: {
    en: "Restricted weapons storage with racks, ammunition and reinforced access.",
    ru: "Закрытый оружейный склад со стойками, боеприпасами и усиленным доступом.",
    uk: "Закритий збройовий склад зі стійками, боєприпасами та посиленим доступом.",
    pl: "Zamknięty magazyn broni ze stojakami, amunicją i wzmocnionym dostępem.",
  },
  workshop: {
    en: "Maintenance workshop with tools, parts and machinery. Suitable for crafting resources and robots.",
    ru: "Ремонтная мастерская с инструментами, деталями и оборудованием. Здесь логичны ресурсы для крафта и роботы.",
    uk: "Ремонтна майстерня з інструментами, деталями та обладнанням. Тут доречні ресурси для крафту й роботи.",
    pl: "Warsztat naprawczy z narzędziami, częściami i maszynami. Dobre miejsce na zasoby rzemieślnicze i roboty.",
  },
  power_reactor: {
    en: "Primary power section. High-value infrastructure with radiation, heat and machinery hazards.",
    ru: "Энергетический отсек убежища. Важная инфраструктура с риском радиации, жара и аварий оборудования.",
    uk: "Енергетичний відсік сховища. Важлива інфраструктура з ризиком радіації, спеки й аварій обладнання.",
    pl: "Sekcja energetyczna schronu. Kluczowa infrastruktura z ryzykiem promieniowania, ciepła i awarii maszyn.",
  },
  water_treatment: {
    en: "Water purification and pumping systems. Pipes, tanks and maintenance access create tight combat lanes.",
    ru: "Система очистки и подачи воды. Трубы, резервуары и техпроходы создают тесные линии боя.",
    uk: "Система очищення та подачі води. Труби, резервуари й техпроходи створюють тісні лінії бою.",
    pl: "System uzdatniania i pompowania wody. Rury, zbiorniki i przejścia techniczne tworzą ciasne linie walki.",
  },
  storage: {
    en: "General storage with crates and supplies. Strong candidate for salvage, food, ammunition or mission items.",
    ru: "Общий склад с ящиками и припасами. Хорошее место для хлама, еды, боеприпасов и предметов задания.",
    uk: "Загальний склад із ящиками та припасами. Гарне місце для брухту, їжі, боєприпасів і предметів завдання.",
    pl: "Magazyn ogólny ze skrzyniami i zapasami. Dobre miejsce na złom, żywność, amunicję i przedmioty misji.",
  },
  hydroponics: {
    en: "Vault food-production section with planters, irrigation and environmental controls.",
    ru: "Секция производства пищи с гидропоникой, поливом и климатическим контролем.",
    uk: "Секція виробництва їжі з гідропонікою, поливом і кліматичним контролем.",
    pl: "Sekcja produkcji żywności z hydroponiką, nawadnianiem i kontrolą klimatu.",
  },
};

export function localizedVaultRoomDescription(tileId, lang = "en", ruined = false) {
  const code = ["en", "ru", "uk", "pl"].includes(String(lang || "en").toLowerCase().split("-")[0])
    ? String(lang || "en").toLowerCase().split("-")[0]
    : "en";
  const baseId = String(tileId || "").replace(/^ruined_/, "");
  const item = VAULT_ROOM_DESCRIPTIONS[baseId];
  const base = item?.[code] || item?.en || "";
  if (!base) return "";
  if (!ruined) return base;
  const prefix = {
    en: "Ruined: ",
    ru: "Разрушено: ",
    uk: "Зруйновано: ",
    pl: "Zrujnowane: ",
  }[code];
  return prefix + base;
}

export function localizedVaultRoomData(layout, lang = "en") {
  return vaultRoomMarkers(layout).map((marker) => ({
    id: marker.roomId,
    name: marker.label,
    roomNumber: marker.marker,
    sector: marker.sector,
    ruined: marker.ruined,
    tileId: marker.tileId,
    description: localizedVaultRoomDescription(marker.tileId, lang, marker.ruined),
  }));
}
