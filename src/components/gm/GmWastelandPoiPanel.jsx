import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BESTIARY_ENTRIES } from "../../data/bestiary.js";
import { buildProceduralNpcTokenStats } from "../../utils/proceduralNpcTokenStats.js";
import { enemyGroupLabel } from "../../utils/proceduralEnemyGroups.js";
import {
  cellsAroundWastelandPoi,
  generateLocalizedProceduralWastelandPois,
  generateProceduralWastelandEncounterSummary,
  generateProceduralWastelandPoiData,
} from "../../utils/proceduralWastelandPoi.js";
import "./gmProceduralRoomDescriptions.css";

const COPY = {
  en: {
    title: "[ WASTELAND POINTS OF INTEREST ]", subtitle: "Open-area exploration generated from the map seed",
    noMap: "Generate a wasteland map to create exploration points.", spawn: "PLACE ENEMY TOKENS", spawning: "PLACING...",
    noEnemies: "This variant has no generated enemies.", startLive: "Start this scene as LIVE before placing enemy tokens.",
    already: "Enemies for these points are already on the map.", spawned: (count) => `Placed ${count} enemy token${count === 1 ? "" : "s"}.`, failed: "Some enemy tokens could not be placed.",
    balance: "ENCOUNTER", party: "Party", enemies: "Enemies", targetXp: "Target XP", actualXp: "Enemy XP", perPlayer: "XP / player",
    difficulty: "Difficulty", group: "Threat", position: "Map", find: "Search", minion: "Minion", standard: "Standard", special: "Special", legendary: "Legendary",
  },
  ru: {
    title: "[ ТОЧКИ ИССЛЕДОВАНИЯ ПУСТОШИ ]", subtitle: "Открытая территория, сгенерированная из seed карты",
    noMap: "Сгенерируйте карту пустоши, чтобы создать точки исследования.", spawn: "РАССТАВИТЬ ВРАГОВ", spawning: "РАССТАНОВКА...",
    noEnemies: "В этом варианте враги не сгенерированы.", startLive: "Сначала запустите эту сцену как LIVE.",
    already: "Враги для этих точек уже расставлены.", spawned: (count) => `Расставлено токенов врагов: ${count}.`, failed: "Часть токенов врагов не удалось разместить.",
    balance: "ЭНКАУНТЕР", party: "Группа", enemies: "Врагов", targetXp: "Целевой XP", actualXp: "XP врагов", perPlayer: "XP / игрока",
    difficulty: "Сложность", group: "Угроза", position: "Карта", find: "Можно найти", minion: "Миньон", standard: "Стандартный", special: "Особый", legendary: "Легендарный",
  },
  uk: {
    title: "[ ТОЧКИ ДОСЛІДЖЕННЯ ПУСТКИ ]", subtitle: "Відкрита територія, згенерована з seed мапи",
    noMap: "Згенеруйте мапу пустки, щоб створити точки дослідження.", spawn: "РОЗСТАВИТИ ВОРОГІВ", spawning: "РОЗСТАНОВКА...",
    noEnemies: "У цьому варіанті вороги не згенеровані.", startLive: "Спочатку запустіть цю сцену як LIVE.",
    already: "Ворогів для цих точок уже розставлено.", spawned: (count) => `Розставлено токенів ворогів: ${count}.`, failed: "Частину токенів не вдалося розмістити.",
    balance: "ЕНКАУНТЕР", party: "Група", enemies: "Ворогів", targetXp: "Цільовий XP", actualXp: "XP ворогів", perPlayer: "XP / гравця",
    difficulty: "Складність", group: "Загроза", position: "Мапа", find: "Можна знайти", minion: "Міньйон", standard: "Звичайний", special: "Особливий", legendary: "Легендарний",
  },
  pl: {
    title: "[ PUNKTY EKSPLORACJI PUSTKOWI ]", subtitle: "Otwarty teren generowany z tego samego seed co mapa",
    noMap: "Wygeneruj mapę pustkowi, aby utworzyć punkty eksploracji.", spawn: "ROZMIEŚĆ WROGÓW", spawning: "ROZMIESZCZANIE...",
    noEnemies: "Ten wariant nie ma wygenerowanych wrogów.", startLive: "Najpierw uruchom tę scenę jako LIVE.",
    already: "Wrogowie dla tych punktów są już na mapie.", spawned: (count) => `Rozmieszczono tokenów wrogów: ${count}.`, failed: "Nie udało się rozmieścić części tokenów.",
    balance: "SPOTKANIE", party: "Drużyna", enemies: "Wrogowie", targetXp: "Docelowe XP", actualXp: "XP wrogów", perPlayer: "XP / gracza",
    difficulty: "Trudność", group: "Zagrożenie", position: "Mapa", find: "Można znaleźć", minion: "Sługa", standard: "Zwykły", special: "Specjalny", legendary: "Legendarny",
  },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
}
function normalizeName(value) { return String(value || "").toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9а-яёіїєґ]+/gi, " ").replace(/\s+/g, " ").trim(); }
function findEntry(enemy) {
  if (enemy?.npcId) {
    const byId = BESTIARY_ENTRIES.find((entry) => String(entry?.id || "") === String(enemy.npcId));
    if (byId) return byId;
  }
  const needle = normalizeName(enemy?.type);
  return BESTIARY_ENTRIES.find((entry) => normalizeName(entry?.name) === needle) || null;
}
function occupiedCells(scene) {
  const result = new Set();
  (scene?.tokens || []).forEach((token) => {
    const x = Math.floor(Number(token?.x)), y = Math.floor(Number(token?.y));
    if (Number.isFinite(x) && Number.isFinite(y)) result.add(`${x}:${y}`);
  });
  return result;
}
function specStamp(spec) {
  return [spec.type, spec.terrain || "wasteland", spec.seed, spec.avgPartyLevel || 1, spec.partySize || 4, spec.encounterDifficulty || "standard", spec.enemyFaction || "auto"].join(":");
}

export default function GmWastelandPoiPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const spec = scene?.environment?.proceduralMapSpec || null;
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const key = spec ? [spec.seed, spec.terrain, spec.density, spec.avgPartyLevel, spec.partySize, spec.encounterDifficulty, spec.enemyFaction].join("|") : "";
  const rawPois = useMemo(() => spec ? generateProceduralWastelandPoiData(spec) : [], [key]);
  const pois = useMemo(() => spec ? generateLocalizedProceduralWastelandPois(spec, lang) : [], [key, lang]);
  const encounter = useMemo(() => spec ? generateProceduralWastelandEncounterSummary(spec) : null, [key]);
  const enemyTotal = encounter?.totalEnemies || 0;

  if (session?.mode !== "host" || !spec || String(spec.type || "") !== "wasteland") return null;

  const placeEnemies = async () => {
    if (placing) return;
    if (!enemyTotal) { setMessage(text.noEnemies); return; }
    if (!session?.liveSceneId || session.liveSceneId !== scene?.sceneId) { setMessage(text.startLive); return; }
    const stamp = specStamp(spec);
    if ((scene?.tokens || []).some((token) => token?.stats?.generatedEncounterSeed === stamp && token?.stats?.generatedPoiId)) { setMessage(text.already); return; }
    setPlacing(true); setMessage("");
    const occupied = occupiedCells(scene);
    let created = 0, failed = false;
    try {
      for (const poi of rawPois) {
        const candidates = cellsAroundWastelandPoi(poi, Number(scene?.cols || 24), Number(scene?.rows || 24));
        let cursor = 0;
        for (const enemy of poi.enemies || []) {
          for (let i = 0; i < Math.max(0, Number(enemy.count || 0)); i += 1) {
            while (cursor < candidates.length && occupied.has(`${candidates[cursor].x}:${candidates[cursor].y}`)) cursor += 1;
            const cell = candidates[cursor++];
            if (!cell) { failed = true; break; }
            const entry = findEntry(enemy);
            const stats = await buildProceduralNpcTokenStats(entry, enemy, {
              stamp,
              poiId: poi.id,
              locationId: poi.id,
            });
            const rank = enemy?.rank || "standard";
            const response = await session.createNpcToken?.({
              name: `${entry?.name || enemy?.type || "NPC"} · ${text[rank] || rank}`,
              size: 1, npcId: String(entry?.id || ""), avatar: String(entry?.avatar || ""), stats, x: cell.x, y: cell.y,
            });
            if (response?.ok) { occupied.add(`${cell.x}:${cell.y}`); created += 1; } else failed = true;
          }
        }
      }
      setMessage(failed ? `${text.spawned(created)} ${text.failed}` : text.spawned(created));
    } finally { setPlacing(false); }
  };

  const ranks = encounter?.rankCounts || { minion: 0, standard: 0, special: 0, legendary: 0 };
  return (
    <section className="gm-room-descriptions pip-panel">
      <header className="gm-room-descriptions__head"><strong>{text.title}</strong><small>{text.subtitle}</small></header>
      {encounter ? <div className="gm-room-descriptions__balance">
        <strong>{text.balance}</strong><span>{text.party}<b>{encounter.partySize} × Lv.{encounter.avgPartyLevel}</b></span><span>{text.enemies}<b>{enemyTotal}</b></span>
        <span>{text.targetXp}<b>{encounter.targetXp}</b></span><span>{text.actualXp}<b>{encounter.actualXp}</b></span><span>{text.perPlayer}<b>{encounter.xpPerPlayer}</b></span>
        <span>{text.minion}<b>{ranks.minion}</b></span><span>{text.standard}<b>{ranks.standard}</b></span><span>{text.special}<b>{ranks.special}</b></span><span>{text.legendary}<b>{ranks.legendary}</b></span>
      </div> : null}
      <div className="gm-room-descriptions__list">{pois.map((poi, index) => (
        <article key={poi.id} className="gm-room-card">
          <div className="gm-room-card__head"><div className="gm-room-card__title"><strong>{index + 1}. {poi.name}</strong><small>{text.position}: {poi.x + 1}:{poi.y + 1}{poi.enemyGroup ? ` · ${text.group}: ${enemyGroupLabel(poi.enemyGroup, lang)}` : ""}</small></div>
          <div className="gm-room-card__markers">{(poi.markers || []).map((marker) => <span key={marker}>{marker === "ENEMY" ? "!" : marker === "TERMINAL" ? "T" : marker === "MEDS" ? "+" : "L"}</span>)}</div></div>
          <div className="gm-room-card__lines">{poi.lines.map((line, lineIndex) => <div key={`${poi.id}-${lineIndex}`}>{line}</div>)}
            {(poi.enemies || []).length ? <div>{(poi.enemies || []).map((enemy, enemyIndex) => <span key={`${enemy.type}-${enemyIndex}`}>{enemy.type} ×{enemy.count} [{text[enemy.rank] || enemy.rank}] </span>)}</div> : null}
          </div>
        </article>
      ))}</div>
      <div className="gm-room-descriptions__actions"><button type="button" className="pip-btn is-primary" disabled={placing || !enemyTotal} onClick={placeEnemies}>{placing ? text.spawning : `${text.spawn} (${enemyTotal})`}</button>{message ? <div className="gm-room-descriptions__message">{message}</div> : null}</div>
    </section>
  );
}
