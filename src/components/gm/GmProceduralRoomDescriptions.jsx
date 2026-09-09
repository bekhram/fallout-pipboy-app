import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import {
  generateLocalizedProceduralRooms,
  generateProceduralEncounterSummary,
  generateProceduralRoomData,
} from "../../utils/proceduralRoomContent.js";
import { cellsInsideRoom, getProceduralRoomBounds } from "../../utils/proceduralRoomLayout.js";
import "./gmProceduralRoomDescriptions.css";

const COPY = {
  en: {
    title: "[ ROOM DESCRIPTIONS ]", subtitle: "Generated from the same seed as the map", noMap: "Apply a generated map to see its room contents.", spawn: "PLACE ENEMY TOKENS", spawning: "PLACING...", noEnemies: "This variant has no generated enemies.", startLive: "Start this scene as LIVE before placing enemy tokens.", already: "Enemies for this seed and party settings are already on the map.", spawned: (count) => `Placed ${count} enemy token${count === 1 ? "" : "s"}.`, failed: "Some enemy tokens could not be placed.",
    balance: "ENCOUNTER", party: "Party", enemies: "Enemies", targetXp: "Target XP", actualXp: "Enemy XP", perPlayer: "XP / player", difficulty: "Difficulty",
    difficulties: { easy: "Easy", standard: "Standard", hard: "Hard", deadly: "Deadly" },
  },
  ru: {
    title: "[ ОПИСАНИЕ КОМНАТ ]", subtitle: "Генерируется из того же seed, что и карта", noMap: "Примените сгенерированную карту, чтобы увидеть содержимое комнат.", spawn: "РАССТАВИТЬ ВРАГОВ", spawning: "РАССТАНОВКА...", noEnemies: "В этом варианте враги не сгенерированы.", startLive: "Сначала запустите именно эту сцену как LIVE.", already: "Враги для этого seed и параметров группы уже расставлены.", spawned: (count) => `Расставлено токенов врагов: ${count}.`, failed: "Часть токенов врагов не удалось разместить.",
    balance: "ЭНКАУНТЕР", party: "Группа", enemies: "Врагов", targetXp: "Целевой XP", actualXp: "XP врагов", perPlayer: "XP / игрока", difficulty: "Сложность",
    difficulties: { easy: "Лёгкая", standard: "Обычная", hard: "Сложная", deadly: "Смертельно опасная" },
  },
  uk: {
    title: "[ ОПИС КІМНАТ ]", subtitle: "Генерується з того самого seed, що й мапа", noMap: "Застосуйте згенеровану мапу, щоб побачити вміст кімнат.", spawn: "РОЗСТАВИТИ ВОРОГІВ", spawning: "РОЗСТАНОВКА...", noEnemies: "У цьому варіанті вороги не згенеровані.", startLive: "Спочатку запустіть саме цю сцену як LIVE.", already: "Ворогів для цього seed і параметрів групи вже розставлено.", spawned: (count) => `Розставлено токенів ворогів: ${count}.`, failed: "Частину токенів ворогів не вдалося розмістити.",
    balance: "ЕНКАУНТЕР", party: "Група", enemies: "Ворогів", targetXp: "Цільовий XP", actualXp: "XP ворогів", perPlayer: "XP / гравця", difficulty: "Складність",
    difficulties: { easy: "Легка", standard: "Звичайна", hard: "Складна", deadly: "Смертельно небезпечна" },
  },
  pl: {
    title: "[ OPIS POMIESZCZEŃ ]", subtitle: "Generowany z tego samego seed co mapa", noMap: "Zastosuj wygenerowaną mapę, aby zobaczyć zawartość pomieszczeń.", spawn: "ROZMIEŚĆ WROGÓW", spawning: "ROZMIESZCZANIE...", noEnemies: "Ten wariant nie ma wygenerowanych wrogów.", startLive: "Najpierw uruchom tę scenę jako LIVE.", already: "Wrogowie dla tego seed i ustawień drużyny są już na mapie.", spawned: (count) => `Rozmieszczono tokenów wrogów: ${count}.`, failed: "Nie udało się rozmieścić części tokenów.",
    balance: "SPOTKANIE", party: "Drużyna", enemies: "Wrogowie", targetXp: "Docelowe XP", actualXp: "XP wrogów", perPlayer: "XP / gracza", difficulty: "Trudność",
    difficulties: { easy: "Łatwa", standard: "Standardowa", hard: "Trudna", deadly: "Śmiertelna" },
  },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}

const SYMBOLS = { TERMINAL: "T", SAFE: "S", VENDING: "V", ENEMY: "!", WORKBENCH: "W", LOOT: "L", MEDS: "+" };

function specFromScene(scene) {
  const spec = scene?.environment?.proceduralMapSpec;
  return spec && typeof spec === "object" ? spec : null;
}

function normalizeName(value) {
  return String(value || "").toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9а-яёіїєґ]+/gi, " ").replace(/\s+/g, " ").trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findBestiaryEntry(enemyName) {
  const needle = normalizeName(enemyName);
  if (!needle) return null;
  const exact = BESTIARY_ENTRIES.find((entry) => normalizeName(entry?.name) === needle);
  if (exact) return exact;
  return BESTIARY_ENTRIES.find((entry) => {
    const haystack = normalizeName(`${entry?.name || ""} ${entry?.creatureType || ""} ${(entry?.tags || []).join(" ")}`);
    return haystack.includes(needle) || needle.includes(normalizeName(entry?.name));
  }) || null;
}

function makeStats(entry, enemy, stamp, roomId) {
  const hp = Math.max(1, number(entry?.baseMaxHp ?? entry?.maxHp ?? entry?.hp, 6));
  const defense = Math.max(0, number(entry?.baseDefense ?? entry?.defense, 1));
  const xp = Math.max(0, number(enemy?.xp ?? entry?.baseXp ?? entry?.xp, 10));
  return {
    level: enemy?.level || entry?.level || "", hp, maxHp: hp, baseMaxHp: hp, defense, baseDefense: defense, xp, baseXp: xp,
    initiative: entry?.initiative || "", creatureType: entry?.creatureType || enemy?.type || "", body: entry?.body || "", mind: entry?.mind || "", melee: entry?.melee || "", guns: entry?.guns || "", other: entry?.other || "",
    attacks: entry?.attacks || "", abilities: entry?.abilities || "", tactics: entry?.tactics || "", loot: entry?.loot || "", drBlock: entry?.drBlock || "",
    footprint: 1, size: 1, baseSize: 1, generatedEncounterSeed: stamp, generatedRoomId: roomId,
  };
}

function occupiedCells(scene) {
  const occupied = new Set();
  (scene?.tokens || []).forEach((token) => {
    const size = Number(token?.stats?.footprint || token?.size || 1) >= 2 ? 2 : 1;
    const x = Math.floor(Number(token?.x));
    const y = Math.floor(Number(token?.y));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    for (let dy = 0; dy < size; dy += 1) for (let dx = 0; dx < size; dx += 1) occupied.add(`${x + dx}:${y + dy}`);
  });
  return occupied;
}

function specStamp(spec) {
  return [spec.type, spec.seed, spec.avgPartyLevel || 1, spec.partySize || 4, spec.lootRarity || "uncommon", spec.wealth || "standard"].join(":");
}

export default function GmProceduralRoomDescriptions({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const spec = specFromScene(scene);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");

  const specKey = spec ? [spec.type, spec.seed, spec.cols, spec.rows, spec.density, spec.lootRarity, spec.wealth, spec.avgPartyLevel, spec.partySize].join("|") : "";
  const rawRooms = useMemo(() => (spec ? generateProceduralRoomData(spec) : []), [specKey]);
  const rooms = useMemo(() => (spec ? generateLocalizedProceduralRooms(spec, lang) : []), [specKey, lang]);
  const encounter = useMemo(() => (spec ? generateProceduralEncounterSummary(spec) : null), [specKey]);
  const enemyTotal = encounter?.totalEnemies || 0;

  if (session?.mode !== "host") return null;

  const placeEnemies = async () => {
    if (!spec || placing) return;
    if (!enemyTotal) { setMessage(text.noEnemies); return; }
    if (!session?.liveSceneId || session.liveSceneId !== scene?.sceneId) { setMessage(text.startLive); return; }

    const stamp = specStamp(spec);
    const alreadyPlaced = (scene?.tokens || []).some((token) => token?.stats?.generatedEncounterSeed === stamp);
    if (alreadyPlaced) { setMessage(text.already); return; }

    setPlacing(true);
    setMessage("");
    const boundsByRoom = getProceduralRoomBounds(spec);
    const occupied = occupiedCells(scene);
    let created = 0;
    let failed = false;

    try {
      for (const room of rawRooms) {
        const bounds = boundsByRoom[room.id];
        if (!bounds || !(room.enemies || []).length) continue;
        const candidates = cellsInsideRoom(bounds).reverse();
        let cursor = 0;
        for (const enemy of room.enemies) {
          for (let index = 0; index < Number(enemy.count || 0); index += 1) {
            while (cursor < candidates.length && occupied.has(`${candidates[cursor].x}:${candidates[cursor].y}`)) cursor += 1;
            const cell = candidates[cursor];
            if (!cell) { failed = true; break; }
            cursor += 1;
            const entry = enemy.npcId ? BESTIARY_ENTRIES.find((item) => String(item?.id || "") === String(enemy.npcId)) || findBestiaryEntry(enemy.type) : findBestiaryEntry(enemy.type);
            const response = await session.createNpcToken?.({
              name: String(entry?.name || enemy.type || "NPC"), size: 1, npcId: String(entry?.id || ""), avatar: String(entry?.avatar || ""),
              stats: makeStats(entry, enemy, stamp, room.id), x: cell.x, y: cell.y,
            });
            if (response?.ok) { occupied.add(`${cell.x}:${cell.y}`); created += 1; } else failed = true;
          }
        }
      }
      setMessage(failed ? `${text.spawned(created)} ${text.failed}` : text.spawned(created));
    } finally { setPlacing(false); }
  };

  return (
    <section className="gm-room-descriptions pip-panel">
      <header className="gm-room-descriptions__head"><strong>{text.title}</strong><small>{text.subtitle}</small></header>
      {!spec ? <div className="gm-room-descriptions__empty">{text.noMap}</div> : null}

      {encounter ? (
        <div className="gm-room-descriptions__balance">
          <strong>{text.balance}</strong>
          <span>{text.party}<b>{encounter.partySize} × Lv.{encounter.avgPartyLevel}</b></span>
          <span>{text.enemies}<b>{encounter.totalEnemies}</b></span>
          <span>{text.targetXp}<b>{encounter.targetXp}</b></span>
          <span>{text.actualXp}<b>{encounter.actualXp}</b></span>
          <span>{text.perPlayer}<b>{encounter.xpPerPlayer}</b></span>
          <span>{text.difficulty}<b>{text.difficulties[encounter.difficulty] || encounter.difficulty}</b></span>
        </div>
      ) : null}

      {rooms.length ? <div className="gm-room-descriptions__list">{rooms.map((room) => (
        <article key={room.id} className="gm-room-card">
          <div className="gm-room-card__head"><strong>{room.name}</strong><div className="gm-room-card__markers" aria-label="room markers">{(room.markers || []).slice(0, 5).map((marker, index) => <span key={`${marker}-${index}`} title={marker}>{SYMBOLS[marker] || "•"}</span>)}</div></div>
          <div className="gm-room-card__lines">{room.lines.map((line, index) => <div key={`${room.id}-${index}`}>{line}</div>)}</div>
        </article>
      ))}</div> : null}

      {spec ? <div className="gm-room-descriptions__actions"><button type="button" className="pip-btn is-primary" disabled={placing || !enemyTotal} onClick={placeEnemies}>{placing ? text.spawning : `${text.spawn}${enemyTotal ? ` (${enemyTotal})` : ""}`}</button>{message ? <div className="gm-room-descriptions__message">{message}</div> : null}</div> : null}
    </section>
  );
}
