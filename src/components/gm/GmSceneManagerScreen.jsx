import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./gmSceneManagerScreen.css";

const LazyScenePresetPanel = lazy(() => import("./GmScenePresetPanelV2.jsx"));
const LazyProceduralExplorationPanel = lazy(() => import("./GmProceduralExplorationPanel.jsx"));

const COPY={
  en:{title:"SCENE MANAGEMENT",subtitle:"Create, prepare and publish tactical scenes",newScene:"NEW SCENE",name:"Scene name",grid:"Grid",create:"CREATE",selected:"SELECTED",live:"LIVE",offline:"OFFLINE",edit:"EDIT",rename:"RENAME",makeLive:"MAKE LIVE",stopLive:"STOP LIVE",delete:"DELETE",tokens:"tokens",cannotDelete:"Keep at least one scene",confirmDelete:"Delete this scene?",empty:"No scenes",encounter:"ENCOUNTER GENERATOR",generatorHint:"Generate a map and enemies for the selected scene",open:"OPEN MAP",moreActions:"More scene actions",screenCount:"Scenes",newSceneHint:"Add a separate scene for the next location",showDetails:"Room & quest details",hideDetails:"Hide details"},
  ru:{title:"УПРАВЛЕНИЕ СЦЕНАМИ",subtitle:"Создание, подготовка и запуск тактических сцен",newScene:"НОВАЯ СЦЕНА",name:"Название сцены",grid:"Сетка",create:"СОЗДАТЬ",selected:"ВЫБРАНА",live:"LIVE",offline:"OFFLINE",edit:"РЕДАКТИРОВАТЬ",rename:"ПЕРЕИМЕНОВАТЬ",makeLive:"СДЕЛАТЬ LIVE",stopLive:"ОСТАНОВИТЬ LIVE",delete:"УДАЛИТЬ",tokens:"токенов",cannotDelete:"Должна остаться хотя бы одна сцена",confirmDelete:"Удалить эту сцену?",empty:"Нет сцен",encounter:"ГЕНЕРАТОР ЭНКАУНТЕРА",generatorHint:"Карта, противники и сложность в одном месте",open:"ОТКРЫТЬ КАРТУ",moreActions:"Другие действия со сценой",screenCount:"Сцены",newSceneHint:"Добавить отдельную карту для новой локации",showDetails:"Комнаты и задания",hideDetails:"Скрыть детали"},
  uk:{title:"КЕРУВАННЯ СЦЕНАМИ",subtitle:"Створення, підготовка та запуск тактичних сцен",newScene:"НОВА СЦЕНА",name:"Назва сцени",grid:"Сітка",create:"СТВОРИТИ",selected:"ОБРАНА",live:"LIVE",offline:"OFFLINE",edit:"РЕДАГУВАТИ",rename:"ПЕРЕЙМЕНУВАТИ",makeLive:"ЗРОБИТИ LIVE",stopLive:"ЗУПИНИТИ LIVE",delete:"ВИДАЛИТИ",tokens:"токенів",cannotDelete:"Має залишитися хоча б одна сцена",confirmDelete:"Видалити цю сцену?",empty:"Немає сцен",encounter:"ГЕНЕРАТОР ЕНКАУНТЕРА",generatorHint:"Мапа, вороги та складність в одному місці",open:"ВІДКРИТИ МАПУ",moreActions:"Інші дії зі сценою",screenCount:"Сцени",newSceneHint:"Додати окрему мапу нової локації",showDetails:"Кімнати та завдання",hideDetails:"Сховати деталі"},
  pl:{title:"ZARZĄDZANIE SCENAMI",subtitle:"Twórz, przygotowuj i publikuj sceny taktyczne",newScene:"NOWA SCENA",name:"Nazwa sceny",grid:"Siatka",create:"UTWÓRZ",selected:"WYBRANA",live:"LIVE",offline:"OFFLINE",edit:"EDYTUJ",rename:"ZMIEŃ NAZWĘ",makeLive:"USTAW LIVE",stopLive:"ZATRZYMAJ LIVE",delete:"USUŃ",tokens:"tokenów",cannotDelete:"Musi pozostać co najmniej jedna scena",confirmDelete:"Usunąć tę scenę?",empty:"Brak scen",encounter:"GENERATOR SPOTKANIA",generatorHint:"Mapa, przeciwnicy i trudność w jednym miejscu",open:"OTWÓRZ MAPĘ",moreActions:"Więcej działań na scenie",screenCount:"Sceny",newSceneHint:"Dodaj osobną mapę dla nowej lokacji",showDetails:"Pokoje i zadania",hideDetails:"Ukryj szczegóły"},
};
function lang(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";}

export default function GmSceneManagerScreen({session,onOpenBattlemap,openGeneratorRequest=0}){
  const {i18n}=useTranslation();
  const text=COPY[lang(i18n.resolvedLanguage||i18n.language)];
  const scenes=Array.isArray(session?.tacticalScenes)?session.tacticalScenes:[];
  const [name,setName]=useState("");
  const [grid,setGrid]=useState("24x24");
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [showEncounterGenerator,setShowEncounterGenerator]=useState(false);
  const [showExplorationDetails,setShowExplorationDetails]=useState(false);
  useEffect(() => {
    if (openGeneratorRequest > 0) {
      setShowEncounterGenerator(true);
      setShowExplorationDetails(false);
    }
  }, [openGeneratorRequest]);
  const selectedId=String(session?.selectedSceneId||session?.tacticalScene?.sceneId||"");
  const liveId=String(session?.liveSceneId||"");

  const selected=useMemo(()=>scenes.find(scene=>scene.sceneId===selectedId)||null,[scenes,selectedId]);

  async function run(key,fn){
    if(busy)return;
    setBusy(key);setError("");
    try{const result=await fn();if(result?.ok===false)setError(result.error||"FAILED");}
    catch(err){setError(err?.message||"FAILED");}
    finally{setBusy("");}
  }

  async function createScene(){
    const [cols,rows]=String(grid).split("x").map(Number);
    await run("create",async()=>{
      const result=await session?.createTacticalScene?.({name:String(name||"").trim()||undefined,cols,rows});
      if(result?.ok!==false)setName("");
      return result;
    });
  }

  async function editScene(scene){
    await run("select:"+scene.sceneId,async()=>{
      const result=await session?.switchTacticalScene?.(scene.sceneId);
      if(result?.ok!==false)onOpenBattlemap?.();
      return result;
    });
  }

  async function renameScene(scene){
    const next=window.prompt(text.name,scene.name||"");
    if(next==null||!String(next).trim())return;
    await run("rename:"+scene.sceneId,()=>session?.renameTacticalScene?.(scene.sceneId,String(next).trim()));
  }

  async function makeLive(scene){
    await run("live:"+scene.sceneId,async()=>{
      if(selectedId!==scene.sceneId){
        const switched=await session?.switchTacticalScene?.(scene.sceneId);
        if(switched?.ok===false)return switched;
      }
      return session?.enableTacticalScene?.({cols:scene.cols,rows:scene.rows,startZone:scene.startZone,backgroundUrl:scene.backgroundUrl,backgroundName:scene.backgroundName});
    });
  }

  async function deleteScene(scene){
    if(scenes.length<=1){setError(text.cannotDelete);return;}
    if(!window.confirm(text.confirmDelete))return;
    await run("delete:"+scene.sceneId,()=>session?.deleteTacticalScene?.(scene.sceneId));
  }

  return <section className="gm-scene-manager">
    <header className="gm-scene-manager__head">
      <div><span>PIP / 2D20 // GM</span><h2>{text.title}</h2><p>{text.subtitle}</p></div>
      <span className="gm-scene-manager__total">{text.screenCount}: <strong>{scenes.length}</strong></span>
    </header>
    {error?<div className="session-error" role="alert">{error}</div>:null}

    <section className="gm-scene-manager__encounter" aria-label={text.encounter}>
      <button
        type="button"
        className="gm-scene-manager__generator-launch"
        aria-expanded={showEncounterGenerator}
        aria-controls="gm-scene-generator-panel"
        onClick={()=>setShowEncounterGenerator((value)=>!value)}
      >
        <span className="gm-scene-manager__generator-icon" aria-hidden="true">✦</span>
        <span className="gm-scene-manager__generator-copy"><strong>{text.encounter}</strong><small>{text.generatorHint}</small></span>
        <span className="gm-scene-manager__launch-arrow" aria-hidden="true">{showEncounterGenerator?"−":"＋"}</span>
      </button>
      {showEncounterGenerator ? <div className="gm-scene-manager__generator-panel" id="gm-scene-generator-panel">
        <Suspense fallback={<div className="pip-logbox">…</div>}>
          <LazyScenePresetPanel session={session} />
        </Suspense>
        <button type="button" className="gm-scene-manager__details-toggle pip-btn" aria-expanded={showExplorationDetails} onClick={()=>setShowExplorationDetails((value)=>!value)}>
          {showExplorationDetails ? text.hideDetails : text.showDetails} <span aria-hidden="true">{showExplorationDetails ? "⌃" : "⌄"}</span>
        </button>
        {showExplorationDetails ? (
          <Suspense fallback={<div className="pip-logbox">…</div>}>
            <LazyProceduralExplorationPanel session={session}/>
          </Suspense>
        ) : null}
      </div> : null}
    </section>

    <form className="pip-panel gm-scene-manager__create" onSubmit={(event)=>{event.preventDefault();createScene();}}>
      <div className="gm-scene-manager__create-copy">
        <strong>{text.newScene}</strong>
        <small>{text.newSceneHint}</small>
      </div>
      <label><span>{text.name}</span><input className="pip-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Scene 2" /></label>
      <label><span>{text.grid}</span><select className="pip-input" value={grid} onChange={e=>setGrid(e.target.value)}><option value="24x24">24×24</option><option value="36x36">36×36</option><option value="48x48">48×48</option></select></label>
      <button type="submit" className="pip-btn" disabled={Boolean(busy)}>{text.create}</button>
    </form>

    <div className="gm-scene-manager__list-head">
      <h3>{text.screenCount}</h3>
      {selected ? <span>{text.selected}: <strong>{selected.name}</strong></span> : null}
    </div>
    <div className="gm-scene-manager__grid">
      {scenes.length ? scenes.map(scene => {
        const isSelected = scene.sceneId === selectedId, isLive = scene.sceneId === liveId || scene.active;
        return <article className={"pip-panel gm-scene-card"+(isLive?" is-live":"")+(isSelected?" is-selected":"")} key={scene.sceneId}>
          <div className="gm-scene-card__head">
            <div className="gm-scene-card__identity">
              <strong title={scene.name||"Scene"}>{scene.name || "Scene"}</strong>
              <small>{scene.cols}×{scene.rows}<span aria-hidden="true"> · </span>{(scene.tokens||[]).length} {text.tokens}</small>
            </div>
            <span className={"gm-scene-card__status "+(isLive?"is-live":isSelected?"is-selected":"")}>{isLive?text.live:isSelected?text.selected:text.offline}</span>
          </div>
          <div className="gm-scene-card__actions">
            <button type="button" className="pip-btn gm-scene-card__open" disabled={Boolean(busy)} onClick={()=>editScene(scene)}>{text.open}</button>
            {isLive
              ? <button type="button" className="pip-btn gm-scene-card__live-action" disabled={Boolean(busy)} onClick={()=>run("stop",()=>session?.disableTacticalScene?.())}>{text.stopLive}</button>
              : <button type="button" className="pip-btn gm-scene-card__live-action" disabled={Boolean(busy)} onClick={()=>makeLive(scene)}>{text.makeLive}</button>}
            <details className="gm-scene-card__more">
              <summary aria-label={text.moreActions} title={text.moreActions}>•••</summary>
              <div className="gm-scene-card__menu">
                <button type="button" className="pip-btn" disabled={Boolean(busy)} onClick={()=>renameScene(scene)}>{text.rename}</button>
                <button type="button" className="pip-btn gm-scene-card__delete" disabled={Boolean(busy)||scenes.length<=1} onClick={()=>deleteScene(scene)}>{text.delete}</button>
              </div>
            </details>
          </div>
        </article>;
      }) : <div className="stat-sub">{text.empty}</div>}
    </div>
  </section>;
}
