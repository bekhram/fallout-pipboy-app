import React, { useImperativeHandle, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import {
  generateLocalizedProceduralRooms,
  generateProceduralEncounterSummary,
  generateProceduralRoomData,
} from "../../utils/proceduralRoomContent.js";
import { buildProceduralNpcTokenStats } from "../../utils/proceduralNpcTokenStats.js";
import { cellsInsideRoom, getProceduralRoomBounds } from "../../utils/proceduralRoomLayout.js";
import { enemyGroupLabel } from "../../utils/proceduralEnemyGroups.js";
import { generateRedRocketRoomMarkers } from "../../utils/proceduralSettlementRoomMarkers.js";
import { cellsAroundWastelandPoi } from "../../utils/proceduralWastelandPoi.js";
import "./gmProceduralRoomDescriptions.css";
import "./gmProceduralRoomMarkers.css";

const COPY = {
  en: {
    title: "[ ROOM DESCRIPTIONS ]", subtitle: "Generated from the same seed as the map", noMap: "Apply a generated map to see its room contents.", spawn: "PLACE ENEMY TOKENS", spawning: "PLACING...", noEnemies: "This variant has no generated enemies.", startLive: "Start this scene as LIVE before placing enemy tokens.", already: "Enemies for this seed and party settings are already on the map.", spawned: (count) => `Placed ${count} enemy token${count === 1 ? "" : "s"}.`, failed: "Some enemy tokens could not be placed.",
    balance: "ENCOUNTER", party: "Party", enemies: "Enemies", targetXp: "Target XP", actualXp: "Enemy XP", perPlayer: "XP / player", difficulty: "Difficulty", group: "Group", scaled: "Scaled",
    minion: "Minion", standard: "Standard", special: "Special", legendary: "Legendary",
    difficulties: { easy: "Easy", standard: "Standard", hard: "Hard", deadly: "Deadly" },
  },
  ru: {
    title: "[ ОПИСАНИЕ КОМНАТ ]", subtitle: "Генерируется из того же seed, что и карта", noMap: "Примените сгенерированную карту, чтобы увидеть содержимое комнат.", spawn: "РАССТАВИТЬ ВРАГОВ", spawning: "РАССТАНОВКА...", noEnemies: "В этом варианте враги не сгенерированы.", startLive: "Сначала запустите именно эту сцену как LIVE.", already: "Враги для этого seed и параметров группы уже расставлены.", spawned: (count) => `Расставлено токенов врагов: ${count}.`, failed: "Часть токенов врагов не удалось разместить.",
    balance: "ЭНКАУНТЕР", party: "Группа", enemies: "Врагов", targetXp: "Целевой XP", actualXp: "XP врагов", perPlayer: "XP / игрока", difficulty: "Сложность", group: "Группа врагов", scaled: "Подтянуто",
    minion: "Миньон", standard: "Стандартный", special: "Особый", legendary: "Легендарный",
    difficulties: { easy: "Лёгкая", standard: "Обычная", hard: "Сложная", deadly: "Смертельно опасная" },
  },
  uk: {
    title: "[ ОПИС КІМНАТ ]", subtitle: "Генерується з того самого seed, що й мапа", noMap: "Застосуйте згенеровану мапу, щоб побачити вміст кімнат.", spawn: "РОЗСТАВИТИ ВОРОГІВ", spawning: "РОЗСТАНОВКА...", noEnemies: "У цьому варіанті вороги не сгенерированы.", startLive: "Спочатку запустіть саме цю сцену як LIVE.", already: "Ворогів для цього seed і параметрів групи вже розставлено.", spawned: (count) => `Розставлено токенів ворогів: ${count}.`, failed: "Частину токенів ворогів не вдалося розмістити.",
    balance: "ЕНКАУНТЕР", party: "Група", enemies: "Ворогів", targetXp: "Цільовий XP", actualXp: "XP ворогів", perPlayer: "XP / гравця", difficulty: "Складність", group: "Група ворогів", scaled: "Підтягнуто",
    minion: "Міньйон", standard: "Звичайний", special: "Особливий", legendary: "Легендарний",
    difficulties: { easy: "Легка", standard: "Звичайна", hard: "Складна", deadly: "Смертельно небезпечна" },
  },
  pl: {
    title: "[ OPIS POMIESZCZEŃ ]", subtitle: "Generowany z tego samego seed co mapa", noMap: "Zastosuj wygenerowaną mapę, aby zobaczyć zawartość pomieszczeń.", spawn: "ROZMIEŚĆ WROGÓW", spawning: "ROZMIESZCZANIE...", noEnemies: "Ten wariant nie ma wygenerowanych wrogów.", startLive: "Najpierw uruchom tę scenę jako LIVE.", already: "Wrogowie dla tego seed i ustawień drużyny są już na mapie.", spawned: (count) => `Rozmieszczono tokenów wrogów: ${count}.`, failed: "Nie udało się rozmieścić części tokenów.",
    balance: "SPOTKANIE", party: "Drużyna", enemies: "Wrogowie", targetXp: "Docelowe XP", actualXp: "XP wrogów", perPlayer: "XP / gracza", difficulty: "Trudność", group: "Grupa wrogów", scaled: "Podniesiono",
    minion: "Sługa", standard: "Zwykły", special: "Specjalny", legendary: "Legendarny",
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

function findBestiaryEntry(enemyName) {
  const needle = normalizeName(enemyName);
  if (!needle) return null;
  const exact = BESTIARY_ENTRIES.find((entry) => normalizeName(entry?.name) === needle || normalizeName(entry?.id) === needle);
  if (exact) return exact;
  return BESTIARY_ENTRIES.find((entry) => {
    const haystack = normalizeName(`${entry?.name || ""} ${entry?.id || ""} ${entry?.creatureType || ""} ${(entry?.tags || []).join(" ")}`);
    return haystack.includes(needle) || needle.includes(normalizeName(entry?.name));
  }) || null;
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

function wastelandSpawnCandidates(poi, cols = 24, rows = 24) {
  const cx = Math.floor(Number(poi?.x || 0));
  const cy = Math.floor(Number(poi?.y || 0));
  return cellsAroundWastelandPoi(poi, cols, rows)
    .filter((cell) => !(cell.x === cx && cell.y === cy))
    .sort((a, b) => {
      const ad = Math.max(Math.abs(a.x - cx), Math.abs(a.y - cy));
      const bd = Math.max(Math.abs(b.x - cx), Math.abs(b.y - cy));
      if (ad !== bd) return ad - bd;
      const aa = Math.atan2(a.y - cy, a.x - cx);
      const ba = Math.atan2(b.y - cy, b.x - cx);
      return aa - ba;
    });
}


function specStamp(spec) {
  return [
    spec.type,
    spec.seed,
    spec.avgPartyLevel || 1,
    spec.partySize || 4,
    spec.encounterDifficulty || "standard",
    spec.enemyFaction || "auto",
    spec.lootRarity || "r3",
    spec.wealth || "standard",
  ].join(":");
}

const GmProceduralRoomDescriptionsV4 = React.forwardRef(function GmProceduralRoomDescriptionsV4({ session, embedded = false }, ref) {
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
  const rooms = useMemo(() => (spec ? generateLocalizedProceduralRooms(spec, lang) : []), [specKey, lang]);
  const encounter = useMemo(() => (spec ? generateProceduralEncounterSummary(spec) : null), [specKey]);
  const numberedMarkers = useMemo(
    () => (String(spec?.type || "") === "red_rocket" ? generateRedRocketRoomMarkers(spec) : []),
    [specKey],
  );
  const numberedMarkerByRoom = useMemo(
    () => Object.fromEntries(numberedMarkers.map((marker) => [marker.roomId, marker])),
    [numberedMarkers],
  );
  const enemyTotal = encounter?.totalEnemies || 0;
  const residentTotal = rawRooms.reduce((sum, room) => sum + (room.residents || []).reduce((count, resident) => count + Number(resident.count || 0), 0), 0);
  const spawnTotal = enemyTotal + residentTotal;

  if (session?.mode !== "host") return null;

  const placeEnemies = async () => {
    if (!spec || placing) return { ok: false, error: "NOT_READY", message: "" };
    if (!spawnTotal) { setMessage(text.noEnemies); return { ok: false, error: "NO_ENEMIES", message: text.noEnemies }; }
    if (!session?.liveSceneId || session.liveSceneId !== scene?.sceneId) {
      setMessage(text.startLive);
      return { ok: false, error: "SCENE_NOT_LIVE", message: text.startLive };
    }

    const stamp = specStamp(spec);
    const alreadyPlaced = (scene?.tokens || []).some((token) => token?.stats?.generatedEncounterSeed === stamp);
    if (alreadyPlaced) {
      setMessage(text.already);
      return { ok: true, already: true, count: 0, message: text.already };
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
        const occupants = [...(room.enemies || []), ...(room.residents || [])];
        if (!occupants.length) continue;
        const candidates = String(spec?.type || "") === "wasteland"
          ? wastelandSpawnCandidates(room, Number(spec?.cols || 24), Number(spec?.rows || 24))
          : bounds
            ? cellsInsideRoom(bounds).reverse()
            : [];
        if (!candidates.length) { failed = true; continue; }
        let cursor = 0;
        for (const enemy of occupants) {
          for (let index = 0; index < Number(enemy.count || 0); index += 1) {
            while (cursor < candidates.length && occupied.has(`${candidates[cursor].x}:${candidates[cursor].y}`)) cursor += 1;
            const cell = candidates[cursor];
            if (!cell) { failed = true; break; }
            cursor += 1;
            const entry = enemy.npcId
              ? BESTIARY_ENTRIES.find((item) => String(item?.id || "") === String(enemy.npcId)) || findBestiaryEntry(enemy.type)
              : findBestiaryEntry(enemy.type);
            const stats = await buildProceduralNpcTokenStats(entry, enemy, {
              stamp,
              roomId: room.id,
              locationId: room.id,
            });
            const rank = enemy?.rank || "standard";
            const baseName = String(entry?.name || enemy.type || "NPC");
            const response = await session.createNpcToken?.({
              name: `${baseName} · ${text[rank] || rank}`,
              size: 1,
              npcId: String(entry?.id || ""),
              avatar: String(entry?.avatar || ""),
              stats,
              x: cell.x,
              y: cell.y,
            });
            let placed = Boolean(response?.ok);
            const tokenId = response?.token?.id;
            if (placed && tokenId && typeof session.moveToken === "function") {
              const moved = await session.moveToken(tokenId, cell.x, cell.y);
              if (moved?.ok === false) {
                placed = false;
                await session.deleteToken?.(tokenId);
              }
            }
            if (placed) {
              occupied.add(`${cell.x}:${cell.y}`);
              created += 1;
            } else {
              failed = true;
            }
          }
        }
      }
      const finalMessage = failed ? `${text.spawned(created)} ${text.failed}` : text.spawned(created);
      setMessage(finalMessage);
      return { ok: created > 0 && !failed, partial: created > 0 && failed, count: created, message: finalMessage };
    } catch (error) {
      setMessage(text.failed);
      return { ok: false, error: error?.message || "PLACE_ENEMIES_FAILED", count: created, message: text.failed };
    } finally {
      setPlacing(false);
    }
  };

  useImperativeHandle(ref,()=>({
    placeEnemies,
    canPlace:Boolean(spec && spawnTotal && !placing),
    spawnTotal:Number(spawnTotal||0),
  }),[spec,spawnTotal,placing,scene?.sceneId,scene?.active]);

  const ranks = encounter?.rankCounts || { minion: 0, standard: 0, special: 0, legendary: 0 };

  return (
    <section className={`gm-room-descriptions pip-panel${embedded ? " is-embedded" : ""}`}>
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
          <span>{text.minion}<b>{ranks.minion}</b></span>
          <span>{text.standard}<b>{ranks.standard}</b></span>
          <span>{text.special}<b>{ranks.special}</b></span>
          <span>{text.legendary}<b>{ranks.legendary}</b></span>
          {encounter.scaledEnemies ? <span>{text.scaled}<b>{encounter.scaledEnemies}</b></span> : null}
        </div>
      ) : null}

      {rooms.length ? <div className="gm-room-descriptions__list">{rooms.map((room, roomIndex) => {
        const numberedMarker = numberedMarkerByRoom[room.id];
        const locationNumber = String(spec?.type || "") === "wasteland"
          ? roomIndex + 1
          : numberedMarker?.marker || null;
        return (
        <article key={room.id} className="gm-room-card" data-location-number={locationNumber || undefined}>
          <div className="gm-room-card__head">
            <div className="gm-room-card__title">
              <div className="gm-room-card__numbered-title">
                {locationNumber ? <span className="gm-room-card__number">{locationNumber}</span> : null}
                <strong>{room.name}</strong>
              </div>
              {room.enemyGroup && (room.enemies || []).length ? <small>{text.group}: {enemyGroupLabel(room.enemyGroup, lang)}</small> : null}
            </div>
            <div className="gm-room-card__markers" aria-label="room markers">{(room.markers || []).slice(0, 5).map((marker, index) => <span key={`${marker}-${index}`} title={marker}>{SYMBOLS[marker] || "•"}</span>)}</div>
          </div>
          <div className="gm-room-card__lines">{room.lines.map((line, index) => <div key={`${room.id}-${index}`}>{line}</div>)}</div>
        </article>
        );
      })}</div> : null}

      {spec ? <div className="gm-room-descriptions__actions"><button type="button" className="pip-btn is-primary" disabled={placing || !spawnTotal} onClick={placeEnemies}>{placing ? text.spawning : `${text.spawn}${spawnTotal ? ` (${spawnTotal})` : ""}`}</button>{message ? <div className="gm-room-descriptions__message">{message}</div> : null}</div> : null}
    </section>
  );
});

export default GmProceduralRoomDescriptionsV4;
