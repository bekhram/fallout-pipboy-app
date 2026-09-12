import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import {
  generateLocalizedProceduralRooms,
  generateProceduralEncounterSummary,
  generateProceduralRoomData,
} from "../../utils/proceduralRoomContent.js";
import { applyNpcRank } from "../../utils/npcCombat.js";
import { cellsInsideRoom, getProceduralRoomBounds } from "../../utils/proceduralRoomLayout.js";
import { enemyGroupLabel } from "../../utils/proceduralEnemyGroups.js";
import { generateSettlementRoomMarkers } from "../../utils/proceduralSettlementRoomMarkers.js";
import "./gmProceduralRoomDescriptions.css";
import "./gmSettlementRoomPanel.css";

const COPY = {
  en: {
    title: "[ ROOM DESCRIPTIONS ]",
    subtitle: "The numbered marker matches the same room on the tactical map.",
    house: "House",
    residents: "Residents",
    hostile: "Hostile",
    friendly: "Friendly",
    spawn: "PLACE TOKENS",
    spawning: "PLACING...",
    noEnemies: "This settlement has no generated occupants.",
    startLive: "Start this scene as LIVE before placing tokens.",
    already: "Tokens for this seed and party settings are already on the map.",
    spawned: (count) => `Placed ${count} token${count === 1 ? "" : "s"}.`,
    failed: "Some tokens could not be placed.",
    balance: "ENCOUNTER",
    enemies: "Enemies",
    targetXp: "Target XP",
    actualXp: "Enemy XP",
    perPlayer: "XP / player",
    difficulty: "Difficulty",
    group: "Group",
    civilian: "Civilian",
    ruined: "Ruined",
    raider: "Raider",
    minion: "Minion",
    standard: "Standard",
    special: "Special",
    legendary: "Legendary",
  },
  ru: {
    title: "[ ОПИСАНИЕ КОМНАТ ]",
    subtitle: "Номер в круге совпадает с той же комнатой на тактической карте.",
    house: "Дом",
    residents: "Жители",
    hostile: "Враждебные",
    friendly: "Мирные",
    spawn: "РАССТАВИТЬ ТОКЕНЫ",
    spawning: "РАССТАНОВКА...",
    noEnemies: "В этом поселении нет сгенерированных обитателей.",
    startLive: "Сначала запустите именно эту сцену как LIVE.",
    already: "Токены для этого seed и параметров группы уже расставлены.",
    spawned: (count) => `Расставлено токенов: ${count}.`,
    failed: "Часть токенов не удалось разместить.",
    balance: "ЭНКАУНТЕР",
    enemies: "Врагов",
    targetXp: "Целевой XP",
    actualXp: "XP врагов",
    perPlayer: "XP / игрока",
    difficulty: "Сложность",
    group: "Группа",
    civilian: "Мирный",
    ruined: "Разрушенный",
    raider: "Рейдерский",
    minion: "Миньон",
    standard: "Стандартный",
    special: "Особый",
    legendary: "Легендарный",
  },
  uk: {
    title: "[ ОПИС КІМНАТ ]",
    subtitle: "Номер у колі відповідає тій самій кімнаті на тактичній мапі.",
    house: "Будинок",
    residents: "Мешканці",
    hostile: "Ворожі",
    friendly: "Мирні",
    spawn: "РОЗСТАВИТИ ТОКЕНИ",
    spawning: "РОЗСТАНОВКА...",
    noEnemies: "У цьому поселенні немає згенерованих мешканців.",
    startLive: "Спочатку запустіть саме цю сцену як LIVE.",
    already: "Токени для цього seed та параметрів групи вже розставлені.",
    spawned: (count) => `Розставлено токенів: ${count}.`,
    failed: "Частину токенів не вдалося розмістити.",
    balance: "ЕНКАУНТЕР",
    enemies: "Ворогів",
    targetXp: "Цільовий XP",
    actualXp: "XP ворогів",
    perPlayer: "XP / гравця",
    difficulty: "Складність",
    group: "Група",
    civilian: "Мирний",
    ruined: "Зруйнований",
    raider: "Рейдерський",
    minion: "Міньйон",
    standard: "Звичайний",
    special: "Особливий",
    legendary: "Легендарний",
  },
  pl: {
    title: "[ OPIS POMIESZCZEŃ ]",
    subtitle: "Numer w kółku wskazuje to samo pomieszczenie na mapie taktycznej.",
    house: "Dom",
    residents: "Mieszkańcy",
    hostile: "Wrodzy",
    friendly: "Przyjaźni",
    spawn: "ROZMIEŚĆ TOKENY",
    spawning: "ROZMIESZCZANIE...",
    noEnemies: "Ta osada nie ma wygenerowanych mieszkańców.",
    startLive: "Najpierw uruchom tę scenę jako LIVE.",
    already: "Tokeny dla tego seed i ustawień drużyny są już na mapie.",
    spawned: (count) => `Rozmieszczono tokenów: ${count}.`,
    failed: "Nie udało się rozmieścić części tokenów.",
    balance: "SPOTKANIE",
    enemies: "Wrogów",
    targetXp: "Docelowe XP",
    actualXp: "XP wrogów",
    perPlayer: "XP / gracza",
    difficulty: "Trudność",
    group: "Grupa",
    civilian: "Cywilny",
    ruined: "Zrujnowany",
    raider: "Najeźdźców",
    minion: "Sługa",
    standard: "Zwykły",
    special: "Specjalny",
    legendary: "Legendarny",
  },
};

const ROOM_SYMBOLS = {
  TERMINAL: "T",
  SAFE: "S",
  VENDING: "V",
  ENEMY: "!",
  TRAP: "!",
  WORKBENCH: "W",
  LOOT: "L",
  AMMO_CRATE: "L",
  SUPPLIES: "L",
  MEDS: "+",
  MEDKIT: "+",
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

function specFromScene(scene) {
  const spec = scene?.environment?.proceduralMapSpec;
  return spec && typeof spec === "object" && String(spec.type || "") === "settlement" ? spec : null;
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9а-яёіїєґ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findBestiaryEntry(enemyName) {
  const needle = normalizeName(enemyName);
  if (!needle) return null;
  const exact = BESTIARY_ENTRIES.find(
    (entry) => normalizeName(entry?.name) === needle || normalizeName(entry?.id) === needle,
  );
  if (exact) return exact;
  return BESTIARY_ENTRIES.find((entry) => {
    const haystack = normalizeName(
      `${entry?.name || ""} ${entry?.id || ""} ${entry?.creatureType || ""} ${(entry?.tags || []).join(" ")}`,
    );
    return haystack.includes(needle) || needle.includes(normalizeName(entry?.name));
  }) || null;
}

function scaleAttackText(value, attackBonus = 0, damageBonus = 0) {
  const attack = Math.max(0, Math.floor(number(attackBonus, 0)));
  const damage = Math.max(0, Math.floor(number(damageBonus, 0)));
  if (!attack && !damage) return String(value || "");
  return String(value || "").split(/\n/).map((line) => {
    let next = line;
    if (attack) next = next.replace(/\bTN\s*(\d+)\b/gi, (_, raw) => `TN ${Math.min(15, Number(raw) + attack)}`);
    if (damage) next = next.replace(/\b(\d+)\s*(CD|DC|КУ)\b/gi, (_, raw, unit) => `${Number(raw) + damage} ${unit}`);
    return next;
  }).join("\n");
}

function makeStats(entry, occupant, stamp, room, marker) {
  const baseHp = Math.max(1, number(entry?.baseMaxHp ?? entry?.maxHp ?? entry?.hp, 6));
  const baseDefense = Math.max(0, number(entry?.baseDefense ?? entry?.defense, 1));
  const baseXp = Math.max(1, number(occupant?.baseXp ?? entry?.baseXp ?? entry?.xp, occupant?.xp || 10));
  const baseLevel = Math.max(1, number(occupant?.baseLevel ?? occupant?.originalLevel ?? entry?.level, 1));
  const effectiveLevel = Math.max(baseLevel, number(occupant?.level, baseLevel));
  const levelDifference = Math.max(0, number(occupant?.levelScaleDifference, effectiveLevel - baseLevel));
  const attackBonus = Math.max(0, number(occupant?.levelAttackBonus, Math.floor(levelDifference / 2)));
  const damageBonus = Math.max(0, number(occupant?.levelDamageBonus, Math.floor(levelDifference / 2)));
  const originalAttacks = entry?.attacks || "";
  const base = {
    level: effectiveLevel,
    baseLevel,
    originalLevel: baseLevel,
    levelScaleDifference: levelDifference,
    levelAttackBonus: attackBonus,
    levelDamageBonus: damageBonus,
    levelScaled: effectiveLevel > baseLevel,
    hp: baseHp,
    maxHp: baseHp,
    baseMaxHp: baseHp,
    defense: baseDefense,
    baseDefense,
    xp: baseXp,
    baseXp,
    initiative: entry?.initiative || "",
    creatureType: entry?.creatureType || occupant?.type || "",
    body: entry?.body || "",
    mind: entry?.mind || "",
    melee: entry?.melee || "",
    guns: entry?.guns || "",
    other: entry?.other || "",
    attacks: scaleAttackText(originalAttacks, attackBonus, damageBonus),
    originalAttacks,
    abilities: entry?.abilities || "",
    tactics: entry?.tactics || "",
    loot: entry?.loot || "",
    drBlock: entry?.drBlock || "",
    footprint: 1,
    size: 1,
    baseSize: 1,
  };

  return {
    ...applyNpcRank(base, {
      rank: occupant?.rank || "standard",
      specialFeatureId: occupant?.specialFeatureId || "",
      specialFeature: occupant?.specialFeature || "",
      legendaryAbilityId: occupant?.legendaryAbilityId || "",
      legendaryAbility: occupant?.legendaryAbility || "",
      legendaryRewardType: occupant?.legendaryRewardType || "",
      legendaryReward: occupant?.legendaryReward || "",
    }),
    generatedEncounterSeed: stamp,
    generatedRoomId: room.id,
    generatedRoomMarker: marker?.marker || null,
    generatedHouseId: room.houseId || "",
    generatedHouseType: room.houseType || "",
    generatedDisposition: occupant?.disposition || room.disposition || "hostile",
    generatedEncounterRank: occupant?.rank || "standard",
    generatedEnemyGroup: occupant?.enemyGroup || room.enemyGroup || "",
  };
}

function occupiedCells(scene) {
  const occupied = new Set();
  (scene?.tokens || []).forEach((token) => {
    const size = Number(token?.stats?.footprint || token?.size || 1) >= 2 ? 2 : 1;
    const x = Math.floor(Number(token?.x));
    const y = Math.floor(Number(token?.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    for (let dy = 0; dy < size; dy += 1) {
      for (let dx = 0; dx < size; dx += 1) occupied.add(`${x + dx}:${y + dy}`);
    }
  });
  return occupied;
}

function roomSpawnCells(bounds) {
  const cells = cellsInsideRoom(bounds);
  const x0 = Number(bounds?.x || 0);
  const y0 = Number(bounds?.y || 0);
  const w = Math.max(1, Number(bounds?.w || 1));
  const h = Math.max(1, Number(bounds?.h || 1));
  const centerX = x0 + (w - 1) / 2;
  const centerY = y0 + (h - 1) / 2;

  const score = (cell) => ((cell.x - centerX) ** 2) + ((cell.y - centerY) ** 2);
  const interior = cells.filter((cell) => (
    w >= 3 && h >= 3
      ? cell.x > x0 && cell.x < x0 + w - 1 && cell.y > y0 && cell.y < y0 + h - 1
      : false
  )).sort((a, b) => score(a) - score(b));
  const interiorKeys = new Set(interior.map((cell) => `${cell.x}:${cell.y}`));
  const rest = cells
    .filter((cell) => !interiorKeys.has(`${cell.x}:${cell.y}`))
    .sort((a, b) => score(a) - score(b));

  return [...interior, ...rest];
}

function specStamp(spec) {
  return [
    spec.type,
    spec.seed,
    spec.terrain || "wasteland",
    spec.avgPartyLevel || 1,
    spec.partySize || 4,
    spec.encounterDifficulty || "standard",
    spec.enemyFaction || "auto",
    spec.lootRarity || "r3",
    spec.wealth || "standard",
  ].join(":");
}

function markerBadges(room) {
  const markers = [...(room?.markers || [])];
  if ((room?.residents || []).some((item) => Number(item?.count || 0) > 0)) markers.unshift("RESIDENT");
  return [...new Set(markers)].slice(0, 5);
}

function markerBadgeSymbol(marker) {
  if (marker === "RESIDENT") return "N";
  return ROOM_SYMBOLS[marker] || "•";
}

export default function GmSettlementRoomPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const spec = specFromScene(scene);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");

  const specKey = spec ? [
    spec.type,
    spec.seed,
    spec.terrain,
    spec.cols,
    spec.rows,
    spec.density,
    spec.lootRarity,
    spec.wealth,
    spec.avgPartyLevel,
    spec.partySize,
    spec.encounterDifficulty,
    spec.enemyFaction || "auto",
  ].join("|") : "";

  const rawRooms = useMemo(() => (spec ? generateProceduralRoomData(spec) : []), [specKey]);
  const localizedRooms = useMemo(() => (spec ? generateLocalizedProceduralRooms(spec, lang) : []), [specKey, lang]);
  const encounter = useMemo(() => (spec ? generateProceduralEncounterSummary(spec) : null), [specKey]);
  const markers = useMemo(() => (spec ? generateSettlementRoomMarkers(spec) : []), [specKey]);

  const localizedById = useMemo(
    () => Object.fromEntries(localizedRooms.map((room) => [room.id, room])),
    [localizedRooms],
  );
  const markerByRoom = useMemo(
    () => Object.fromEntries(markers.map((marker) => [marker.roomId, marker])),
    [markers],
  );

  const residentTotal = rawRooms.reduce(
    (sum, room) => sum + (room.residents || []).reduce((count, resident) => count + Number(resident.count || 0), 0),
    0,
  );
  const enemyTotal = encounter?.totalEnemies || 0;
  const spawnTotal = enemyTotal + residentTotal;

  const placeTokens = async () => {
    if (!spec || placing) return;
    if (!spawnTotal) {
      setMessage(text.noEnemies);
      return;
    }
    if (!session?.liveSceneId || session.liveSceneId !== scene?.sceneId) {
      setMessage(text.startLive);
      return;
    }

    const stamp = specStamp(spec);
    const alreadyPlaced = (scene?.tokens || []).some(
      (token) => token?.stats?.generatedEncounterSeed === stamp,
    );
    if (alreadyPlaced) {
      setMessage(text.already);
      return;
    }

    setPlacing(true);
    setMessage("");
    const boundsByRoom = getProceduralRoomBounds(spec);
    const occupied = occupiedCells(scene);
    let created = 0;
    let failed = false;

    try {
      for (const room of rawRooms) {
        const bounds = boundsByRoom[room.id];
        const marker = markerByRoom[room.id];
        if (!bounds) continue;

        const occupants = [
          ...(room.enemies || []).map((entry) => ({ ...entry, disposition: entry?.disposition || "hostile" })),
          ...(room.residents || []).map((entry) => ({ ...entry, disposition: entry?.disposition || "friendly" })),
        ];
        if (!occupants.length) continue;

        const candidates = roomSpawnCells(bounds);
        let cursor = 0;

        for (const occupant of occupants) {
          for (let index = 0; index < Number(occupant.count || 0); index += 1) {
            while (
              cursor < candidates.length
              && occupied.has(`${candidates[cursor].x}:${candidates[cursor].y}`)
            ) cursor += 1;

            const cell = candidates[cursor];
            if (!cell) {
              failed = true;
              break;
            }
            cursor += 1;

            const entry = occupant?.npcId
              ? BESTIARY_ENTRIES.find((item) => String(item?.id || "") === String(occupant.npcId))
                || findBestiaryEntry(occupant.type)
              : findBestiaryEntry(occupant.type || occupant.name);
            const stats = makeStats(entry, occupant, stamp, room, marker);
            const rank = occupant?.rank || "standard";
            const baseName = String(entry?.name || occupant.type || occupant.name || "NPC");
            const response = await session.createNpcToken?.({
              name: `${baseName} · ${text[rank] || rank}`,
              size: 1,
              npcId: String(entry?.id || ""),
              avatar: String(entry?.avatar || ""),
              stats,
              x: cell.x,
              y: cell.y,
            });

            if (response?.ok) {
              occupied.add(`${cell.x}:${cell.y}`);
              created += 1;
            } else {
              failed = true;
            }
          }
        }
      }

      setMessage(failed ? `${text.spawned(created)} ${text.failed}` : text.spawned(created));
    } finally {
      setPlacing(false);
    }
  };

  if (session?.mode !== "host") return null;
  if (!spec) return null;

  const houseGroups = [];
  const groupMap = new Map();
  rawRooms.forEach((rawRoom) => {
    const key = rawRoom.houseId || `house:${rawRoom.roomInstance || 1}`;
    if (!groupMap.has(key)) {
      const group = {
        id: key,
        number: Math.max(1, Number(rawRoom.roomInstance || 1)),
        houseType: rawRoom.houseType || "",
        disposition: rawRoom.disposition || "",
        rooms: [],
      };
      groupMap.set(key, group);
      houseGroups.push(group);
    }
    groupMap.get(key).rooms.push(rawRoom);
  });

  return (
    <section className="gm-room-descriptions gm-settlement-room-panel pip-panel">
      <header className="gm-room-descriptions__head">
        <div>
          <strong>{text.title}</strong>
          <small>{text.subtitle}</small>
        </div>
      </header>

      {encounter ? (
        <div className="gm-room-descriptions__summary">
          <span>{text.enemies}<b>{enemyTotal}</b></span>
          <span>{text.residents}<b>{residentTotal}</b></span>
          <span>{text.targetXp}<b>{encounter.targetXp}</b></span>
          <span>{text.actualXp}<b>{encounter.actualXp}</b></span>
          <span>{text.perPlayer}<b>{encounter.xpPerPlayer}</b></span>
        </div>
      ) : null}

      <div className="gm-settlement-houses">
        {houseGroups.map((house) => (
          <section key={house.id} className="gm-settlement-house-group">
            <header className="gm-settlement-house-group__head">
              <strong>{text.house} {house.number}</strong>
              <span>{text[house.houseType] || house.houseType || "—"}</span>
              <small>{house.disposition === "friendly" ? text.friendly : text.hostile}</small>
            </header>

            <div className="gm-room-descriptions__grid">
              {house.rooms.map((rawRoom) => {
                const room = localizedById[rawRoom.id] || { id: rawRoom.id, name: rawRoom.baseRoomId, lines: [] };
                const marker = markerByRoom[rawRoom.id];
                const residents = rawRoom.residents || [];
                const lines = [...(room.lines || [])];
                residents.forEach((resident) => {
                  const count = Math.max(1, Number(resident.count || 1));
                  lines.push(`${text.residents}: ${resident.type || resident.name || "NPC"}${count > 1 ? ` ×${count}` : ""}`);
                });

                return (
                  <article key={rawRoom.id} className="gm-room-card gm-settlement-room-card">
                    <div className="gm-room-card__head">
                      <div className="gm-settlement-room-card__identity">
                        <span className="gm-settlement-room-number">{marker?.marker || "?"}</span>
                        <div>
                          <strong>{room.name}</strong>
                          {rawRoom.enemyGroup && (rawRoom.enemies || []).length ? (
                            <small>{text.group}: {enemyGroupLabel(rawRoom.enemyGroup, lang)}</small>
                          ) : null}
                        </div>
                      </div>
                      <div className="gm-room-card__markers" aria-label="room markers">
                        {markerBadges(rawRoom).map((item, index) => (
                          <span key={`${item}-${index}`} title={item}>{markerBadgeSymbol(item)}</span>
                        ))}
                      </div>
                    </div>
                    <div className="gm-room-card__lines">
                      {lines.map((line, index) => <div key={`${rawRoom.id}-${index}`}>{line}</div>)}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="gm-room-descriptions__actions">
        <button
          type="button"
          className="pip-btn is-primary"
          disabled={placing || !spawnTotal}
          onClick={placeTokens}
        >
          {placing ? text.spawning : `${text.spawn}${spawnTotal ? ` (${spawnTotal})` : ""}`}
        </button>
        {message ? <div className="gm-room-descriptions__message">{message}</div> : null}
      </div>
    </section>
  );
}
