import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildProceduralNpcTokenStats } from "../../utils/proceduralNpcTokenStats.js";
import {
  generateVaultEncounterPlan,
  vaultRoomMarkers,
  vaultSpawnCells,
} from "../../utils/proceduralVaultEncounter.js";
import { enemyGroupLabel } from "../../utils/proceduralEnemyGroups.js";

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
  const spec = scene?.environment?.proceduralMapSpec || null;
  const layout = scene?.environment?.vaultLayout || null;
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");

  const key = spec ? [
    spec.type, spec.seed, spec.cols, spec.rows, spec.partySize, spec.avgPartyLevel,
    spec.encounterDifficulty, spec.enemyFaction, spec.enemyCountOverride,
  ].join("|") : "";

  const plan = useMemo(
    () => (String(spec?.type || "") === "vault_tunnels" && layout ? generateVaultEncounterPlan(spec, layout) : null),
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
