import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildProceduralNpcTokenStats } from "../../utils/proceduralNpcTokenStats.js";
import { applyGeneratedEncounterPower } from "../../utils/proceduralEncounterDifficultyPower.js";
import {
  generateVaultEncounterPlan,
  vaultRoomMarkers,
  vaultSpawnCells,
} from "../../utils/proceduralVaultEncounter.js";
import { enemyGroupLabel } from "../../utils/proceduralEnemyGroups.js";
import { generateVaultLayout, vaultSpecFromScene } from "../../utils/proceduralVaultGenerator.js";

const ROOM_DESCRIPTIONS = {
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

function vaultRoomDescription(tileId, lang, ruined) {
  const baseId = String(tileId || "").replace(/^ruined_/, "");
  const item = ROOM_DESCRIPTIONS[baseId];
  const base = item?.[lang] || item?.en || "";
  if (!base) return "";
  if (!ruined) return base;
  const ruinedPrefix = {
    en: "Ruined: ",
    ru: "Разрушено: ",
    uk: "Зруйновано: ",
    pl: "Zrujnowane: ",
  }[lang] || "Ruined: ";
  return ruinedPrefix + base;
}

const COPY = {
  en: { title:"VAULT ENCOUNTER", rooms:"ROOMS", focus:"FOCUS ROOM", roomEnemies:"Enemies", place:"PLACE VAULT ENEMIES", placing:"PLACING...", group:"Group", total:"Enemies", live:"Start this scene as LIVE first.", already:"Enemies for this Vault seed are already placed.", done:(n)=>`Placed ${n} Vault enemy token${n===1?"":"s"}.`, failed:"Some Vault enemies could not be placed." },
  ru: { title:"ЭНКАУНТЕР УБЕЖИЩА", rooms:"КОМНАТЫ", focus:"ПОКАЗАТЬ КОМНАТУ", roomEnemies:"Врагов", place:"РАССТАВИТЬ ВРАГОВ", placing:"РАССТАНОВКА...", group:"Группа", total:"Врагов", live:"Сначала запустите эту сцену как LIVE.", already:"Враги для этого Vault seed уже расставлены.", done:(n)=>`Расставлено токенов врагов: ${n}.`, failed:"Часть врагов не удалось разместить." },
  uk: { title:"ЕНКАУНТЕР СХОВИЩА", rooms:"КІМНАТИ", focus:"ПОКАЗАТИ КІМНАТУ", roomEnemies:"Ворогів", place:"РОЗСТАВИТИ ВОРОГІВ", placing:"РОЗСТАНОВКА...", group:"Група", total:"Ворогів", live:"Спочатку запустіть цю сцену як LIVE.", already:"Ворогів для цього Vault seed уже розставлено.", done:(n)=>`Розставлено токенів ворогів: ${n}.`, failed:"Частину ворогів не вдалося розмістити." },
  pl: { title:"SPOTKANIE W SCHRONIE", rooms:"POMIESZCZENIA", focus:"POKAŻ POMIESZCZENIE", roomEnemies:"Wrogowie", place:"ROZMIEŚĆ WROGÓW", placing:"ROZMIESZCZANIE...", group:"Grupa", total:"Wrogowie", live:"Najpierw uruchom tę scenę jako LIVE.", already:"Wrogowie dla tego Vault seed są już rozmieszczeni.", done:(n)=>`Rozmieszczono tokenów: ${n}.`, failed:"Nie udało się rozmieścić części wrogów." },
};

function langCode(value) {
  const code = String(value || "en").toLowerCase().split("-")[0];
  return COPY[code] ? code : "en";
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

function stampFor(spec) {
  return [
    "vault",
    spec?.seed || "1",
    spec?.cols || 24,
    spec?.avgPartyLevel || 1,
    spec?.partySize || 4,
    spec?.encounterDifficulty || "standard",
    spec?.enemyFaction || "auto",
    spec?.enemyCountOverride || 0,
  ].join(":");
}

export default function GmVaultEncounterPanel({ session }) {
  const { i18n } = useTranslation();
  const lang = langCode(i18n.resolvedLanguage || i18n.language);
  const text = COPY[lang];
  const scene = session?.tacticalScene || null;
  const spec = vaultSpecFromScene(scene);
  const persistedLayout = scene?.environment?.vaultLayout || null;
  const layout = useMemo(
    () => (Array.isArray(persistedLayout?.tiles) && persistedLayout.tiles.length
      ? persistedLayout
      : (spec ? generateVaultLayout(spec) : null)),
    [persistedLayout, spec?.type, spec?.seed, spec?.cols, spec?.rows],
  );
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");

  const key = spec ? [
    spec.type, spec.seed, spec.cols, spec.rows, spec.partySize, spec.avgPartyLevel,
    spec.encounterDifficulty, spec.enemyFaction, spec.enemyCountOverride,
  ].join("|") : "";

  const plan = useMemo(
    () => (spec && layout ? generateVaultEncounterPlan(spec, layout) : null),
    [key, layout],
  );
  const markers = useMemo(() => (layout ? vaultRoomMarkers(layout) : []), [layout]);
  const enemiesByRoom = useMemo(
    () => Object.fromEntries((plan?.rooms || []).map((bucket) => [bucket.room.id, bucket.enemies.length])),
    [plan],
  );

  const focusRoom = (roomId) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("pip2d20:vault-focus-room", { detail: { roomId } }));
  };

  if (session?.mode !== "host" || !plan) return null;

  const place = async () => {
    if (placing || !plan.total) return;
    if (!session?.liveSceneId || session.liveSceneId !== scene?.sceneId) {
      setMessage(text.live);
      return;
    }

    const stamp = stampFor(spec);
    if ((scene?.tokens || []).some((token) => token?.stats?.generatedEncounterSeed === stamp)) {
      setMessage(text.already);
      return;
    }

    setPlacing(true);
    setMessage("");
    const occupied = occupiedCells(scene);
    let created = 0;
    let failed = false;

    try {
      for (const bucket of plan.rooms) {
        const cells = vaultSpawnCells(bucket.room);
        let cursor = 0;
        for (const enemy of bucket.enemies) {
          while (cursor < cells.length && occupied.has(`${cells[cursor].x}:${cells[cursor].y}`)) cursor += 1;
          const cell = cells[cursor++];
          if (!cell) { failed = true; continue; }

          const stats = await buildProceduralNpcTokenStats(enemy.entry, enemy, {
            stamp,
            roomId: bucket.room.id,
            locationId: bucket.room.tileId || bucket.room.id,
          });

          const response = await session.createNpcToken?.({
            name: `${enemy.entry?.name || enemy.type || "Enemy"} · ${enemy.rank}`,
            size: 1,
            npcId: String(enemy.entry?.id || ""),
            avatar: String(enemy.entry?.avatar || ""),
            stats: applyGeneratedEncounterPower(stats, spec),
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

      setMessage(failed ? `${text.done(created)} ${text.failed}` : text.done(created));
    } catch {
      setMessage(text.failed);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <section className="pip-panel gm-vault-encounter-panel">
      <header style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
        <strong>[ {text.title} ]</strong>
        <span>{plan.total}</span>
      </header>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
        <span>{text.group}<b style={{display:"block"}}>{enemyGroupLabel(plan.group, lang)}</b></span>
        <span>{text.total}<b style={{display:"block"}}>{plan.total}</b></span>
      </div>
      <div style={{marginTop:12}}>
        <strong>[ {text.rooms} ]</strong>
        <div style={{display:"grid",gap:8,marginTop:8}}>
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              className="pip-btn"
              onClick={() => focusRoom(marker.roomId)}
              title={text.focus}
              style={{display:"grid",gridTemplateColumns:"34px minmax(0,1fr) auto",alignItems:"center",gap:8,textAlign:"left",width:"100%"}}
            >
              <b style={{display:"grid",placeItems:"center",width:28,height:28,border:"1px solid currentColor",borderRadius:"50%"}}>{marker.marker}</b>
              <span style={{minWidth:0}}>
                <strong style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{marker.label}</strong>
                <small>{marker.sector}{marker.ruined ? " · RUINED" : ""}</small>
                <small style={{display:"block",marginTop:4,opacity:.78,lineHeight:1.35,whiteSpace:"normal"}}>
                  {vaultRoomDescription(marker.tileId, lang, marker.ruined)}
                </small>
              </span>
              <span>{text.roomEnemies}: <b>{enemiesByRoom[marker.roomId] || 0}</b></span>
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="pip-btn is-primary" disabled={placing || !plan.total} onClick={place} style={{marginTop:10,width:"100%"}}>
        {placing ? text.placing : `${text.place} (${plan.total})`}
      </button>
      {message ? <div className="gm-room-descriptions__message" style={{marginTop:8}}>{message}</div> : null}
    </section>
  );
}
