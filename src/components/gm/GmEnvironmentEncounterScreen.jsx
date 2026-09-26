import React,{useMemo,useRef,useState} from "react";
import {useTranslation} from "react-i18next";
import TacticalEnvironmentPanel from "./TacticalEnvironmentPanel.jsx";
import GmProceduralRoomDescriptionsV4 from "./GmProceduralRoomDescriptionsV4.jsx";
import {WINTER_TERRAIN,WINTER_OBSTACLES,WINTER_CONDITIONS} from "../../utils/winterOfAtomRules.js";
import {generateLocalizedProceduralRooms} from "../../utils/proceduralRoomContent.js";
import {MAX_MANUAL_ENEMY_COUNT,normalizeEncounterDifficulty,normalizeEnemyCountOverride} from "../../utils/proceduralEncounterBalance.js";
import {ENEMY_GROUP_OPTIONS,enemyGroupLabel,normalizeEnemyGroup} from "../../utils/proceduralEnemyGroups.js";
import {normalizeTrapCount,normalizeTrapLethality} from "../../utils/proceduralBattlemapExtras.js";
import "./gmEnvironmentEncounterScreen.css";

const DIFFICULTIES=["easy","standard","hard","deadly"];
const LETHALITY=["low","standard","high","deadly"];
const COPY={
 en:{terrain:"TERRAIN / OBSTACLES",conditions:"CONDITIONS",encounter:"ENCOUNTER",difficulty:"Difficulty",faction:"Enemy type",count:"Enemy count",auto:"Auto",traps:"Trap count",lethality:"Trap lethality",preview:"Scene preview",actions:"SCENE ACTIONS",place:"PLACE ENEMIES",remove:"REMOVE ENEMIES",activate:"ACTIVATE SCENE",deactivate:"DEACTIVATE",room:"ROOM DESCRIPTION",noRoom:"Generate/apply a procedural map in Scenes first.",easy:"Easy",standard:"Standard",hard:"Hard",deadly:"Deadly",low:"Low",high:"High"},
 ru:{terrain:"МЕСТНОСТЬ И ПРЕПЯТСТВИЯ",conditions:"УСЛОВИЯ",encounter:"ВСТРЕЧА",difficulty:"Сложность встречи",faction:"Тип врагов",count:"Количество врагов",auto:"Авто",traps:"Количество ловушек",lethality:"Летальность ловушек",preview:"Предпросмотр сцены",actions:"КНОПКИ СЦЕНЫ",place:"РАССТАВИТЬ ВРАГОВ",remove:"УБРАТЬ ВРАГОВ",activate:"АКТИВИРОВАТЬ СЦЕНУ",deactivate:"ДЕАКТИВИРОВАТЬ",room:"ОПИСАНИЕ КОМНАТЫ",noRoom:"Сначала сгенерируйте и примените карту во вкладке «Сцены».",easy:"Лёгкая",standard:"Стандарт",hard:"Сложная",deadly:"Смертельная",low:"Низкая",high:"Высокая"},
 uk:{terrain:"МІСЦЕВІСТЬ І ПЕРЕШКОДИ",conditions:"УМОВИ",encounter:"ЗУСТРІЧ",difficulty:"Складність зустрічі",faction:"Тип ворогів",count:"Кількість ворогів",auto:"Авто",traps:"Кількість пасток",lethality:"Летальність пасток",preview:"Попередній перегляд",actions:"КНОПКИ СЦЕНИ",place:"РОЗСТАВИТИ ВОРОГІВ",remove:"ПРИБРАТИ ВОРОГІВ",activate:"АКТИВУВАТИ СЦЕНУ",deactivate:"ДЕАКТИВУВАТИ",room:"ОПИС КІМНАТИ",noRoom:"Спочатку згенеруйте та застосуйте мапу у вкладці «Сцени».",easy:"Легка",standard:"Стандарт",hard:"Складна",deadly:"Смертельна",low:"Низька",high:"Висока"},
 pl:{terrain:"TEREN / PRZESZKODY",conditions:"WARUNKI",encounter:"SPOTKANIE",difficulty:"Trudność spotkania",faction:"Typ wrogów",count:"Liczba wrogów",auto:"Auto",traps:"Liczba pułapek",lethality:"Śmiertelność pułapek",preview:"Podgląd sceny",actions:"AKCJE SCENY",place:"ROZMIEŚĆ WROGÓW",remove:"USUŃ WROGÓW",activate:"AKTYWUJ SCENĘ",deactivate:"DEZAKTYWUJ",room:"OPIS POMIESZCZENIA",noRoom:"Najpierw wygeneruj i zastosuj mapę w zakładce Sceny.",easy:"Łatwa",standard:"Standard",hard:"Trudna",deadly:"Śmiertelna",low:"Niska",high:"Wysoka"}
};
function lang(v){const c=String(v||"en").toLowerCase().split("-")[0];return COPY[c]?c:"en";}
function spec(scene){const s=scene?.environment?.proceduralMapSpec;return s&&typeof s==="object"?s:null;}

export default function GmEnvironmentEncounterScreen({session}){
 const {i18n}=useTranslation();const language=lang(i18n.resolvedLanguage||i18n.language);const text=COPY[language];
 const scene=session?.tacticalScene||null;const saved=spec(scene);const roomRef=useRef(null);const [busy,setBusy]=useState("");
 const rooms=useMemo(()=>saved?generateLocalizedProceduralRooms(saved,language):[],[saved?.type,saved?.seed,saved?.cols,saved?.rows,language]);
 const firstRoom=rooms[0]||null;
 const difficulty=normalizeEncounterDifficulty(saved?.encounterDifficulty);
 const faction=normalizeEnemyGroup(saved?.enemyFaction);
 const count=normalizeEnemyCountOverride(saved?.enemyCountOverride);
 const traps=normalizeTrapCount(saved?.trapCount);
 const lethality=normalizeTrapLethality(saved?.trapLethality);
 const live=Boolean(scene&&session?.liveSceneId===scene.sceneId&&scene.active);
 const enemies=(scene?.tokens||[]).filter(t=>t.kind!=="player");

 const patchSpec=async(patch)=>{
   if(!saved)return;
   await session.updateTacticalScene?.({environment:{...(scene.environment||{}),proceduralMapSpec:{...saved,...patch}}});
 };
 const removeEnemies=async()=>{if(busy)return;setBusy("remove");try{for(const token of enemies)await session.deleteToken?.(token.id);}finally{setBusy("");}};
 const placeEnemies=async()=>{if(busy)return;setBusy("place");try{await roomRef.current?.placeEnemies?.();}finally{setBusy("");}};
 const activate=()=>session.enableTacticalScene?.({cols:scene.cols,rows:scene.rows,startZone:scene.startZone,backgroundUrl:scene.backgroundUrl,backgroundName:scene.backgroundName});
 return <section className="gm-environment-screen">
   <div className="gm-environment-screen__environment"><TacticalEnvironmentPanel scene={scene} session={session}/></div>

   <div className="gm-environment-screen__references">
     <section className="pip-panel gm-environment-reference"><h3>{text.terrain}</h3>{[...WINTER_TERRAIN,...WINTER_OBSTACLES].slice(0,6).map(item=><div className="gm-environment-reference__row" key={item.id}><span>{item.label}</span><b>{item.ap} AP</b></div>)}</section>
     <section className="pip-panel gm-environment-reference"><h3>{text.conditions}</h3>{WINTER_CONDITIONS.slice(0,5).map(item=><div className="gm-environment-condition" key={item.id}><b>{item.label}</b><span>{item.effect}</span></div>)}</section>
   </div>

   <section className="pip-panel gm-environment-encounter">
     <h3>{text.encounter}</h3>
     <div className="gm-environment-encounter__body">
       <div className="gm-environment-encounter__controls">
         <label><span>{text.difficulty}</span><select className="pip-input" value={difficulty} disabled={!saved} onChange={e=>patchSpec({encounterDifficulty:normalizeEncounterDifficulty(e.target.value)})}>{DIFFICULTIES.map(v=><option key={v} value={v}>{text[v]}</option>)}</select></label>
         <label><span>{text.faction}</span><select className="pip-input" value={faction} disabled={!saved} onChange={e=>patchSpec({enemyFaction:normalizeEnemyGroup(e.target.value)})}>{ENEMY_GROUP_OPTIONS.map(v=><option key={v} value={v}>{enemyGroupLabel(v,language)}</option>)}</select></label>
         <label><span>{text.count}</span><input className="pip-input" type="number" min="0" max={MAX_MANUAL_ENEMY_COUNT} value={count} disabled={!saved} onChange={e=>patchSpec({enemyCountOverride:normalizeEnemyCountOverride(e.target.value)})}/><small>{count===0?text.auto:""}</small></label>
         <label><span>{text.traps}</span><input className="pip-input" type="number" min="0" max="8" value={traps} disabled={!saved} onChange={e=>patchSpec({trapCount:normalizeTrapCount(e.target.value)})}/></label>
         <label><span>{text.lethality}</span><select className="pip-input" value={lethality} disabled={!saved} onChange={e=>patchSpec({trapLethality:normalizeTrapLethality(e.target.value)})}>{LETHALITY.map(v=><option key={v} value={v}>{text[v]}</option>)}</select></label>
       </div>
       <div className="gm-environment-preview"><span>{text.preview}</span>{scene?.backgroundUrl?<img src={scene.backgroundUrl} alt=""/>:<div className="gm-environment-preview__empty">—</div>}<small>{scene?.backgroundName||firstRoom?.name||"—"}</small></div>
     </div>
   </section>

   <div className="gm-environment-screen__bottom">
     <section className="pip-panel gm-environment-actions"><h3>{text.actions}</h3><div><button className="pip-btn" type="button" disabled={Boolean(busy)||!saved} onClick={placeEnemies}>{text.place}</button><button className="pip-btn" type="button" disabled={Boolean(busy)||!enemies.length} onClick={removeEnemies}>{text.remove}</button>{live?<button className="pip-btn" type="button" onClick={()=>session.disableTacticalScene?.()}>{text.deactivate}</button>:<button className="pip-btn is-primary" type="button" onClick={activate}>{text.activate}</button>}</div></section>
     <section className="pip-panel gm-environment-room"><h3>{text.room}</h3>{firstRoom?<><b>{firstRoom.name}</b><div>{(firstRoom.lines||[]).slice(0,3).map((line,i)=><p key={i}>{line}</p>)}</div></>:<p>{text.noRoom}</p>}</section>
   </div>

   <div className="gm-environment-screen__room-engine" aria-hidden="true"><GmProceduralRoomDescriptionsV4 ref={roomRef} session={session} embedded/></div>
 </section>;
}
