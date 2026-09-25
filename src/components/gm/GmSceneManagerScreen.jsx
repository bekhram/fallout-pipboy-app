import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./gmSceneManagerScreen.css";

const COPY={
  en:{title:"SCENE MANAGEMENT",subtitle:"Create, prepare and publish tactical scenes",newScene:"NEW SCENE",name:"Scene name",grid:"Grid",create:"CREATE",selected:"SELECTED",live:"LIVE",offline:"OFFLINE",edit:"EDIT",rename:"RENAME",makeLive:"MAKE LIVE",stopLive:"STOP LIVE",delete:"DELETE",tokens:"tokens",cannotDelete:"Keep at least one scene",confirmDelete:"Delete this scene?",empty:"No scenes"},
  ru:{title:"УПРАВЛЕНИЕ СЦЕНАМИ",subtitle:"Создание, подготовка и запуск тактических сцен",newScene:"НОВАЯ СЦЕНА",name:"Название сцены",grid:"Сетка",create:"СОЗДАТЬ",selected:"ВЫБРАНА",live:"LIVE",offline:"OFFLINE",edit:"РЕДАКТИРОВАТЬ",rename:"ПЕРЕИМЕНОВАТЬ",makeLive:"СДЕЛАТЬ LIVE",stopLive:"ОСТАНОВИТЬ LIVE",delete:"УДАЛИТЬ",tokens:"токенов",cannotDelete:"Должна остаться хотя бы одна сцена",confirmDelete:"Удалить эту сцену?",empty:"Нет сцен"},
  uk:{title:"КЕРУВАННЯ СЦЕНАМИ",subtitle:"Створення, підготовка та запуск тактичних сцен",newScene:"НОВА СЦЕНА",name:"Назва сцени",grid:"Сітка",create:"СТВОРИТИ",selected:"ОБРАНА",live:"LIVE",offline:"OFFLINE",edit:"РЕДАГУВАТИ",rename:"ПЕРЕЙМЕНУВАТИ",makeLive:"ЗРОБИТИ LIVE",stopLive:"ЗУПИНИТИ LIVE",delete:"ВИДАЛИТИ",tokens:"токенів",cannotDelete:"Має залишитися хоча б одна сцена",confirmDelete:"Видалити цю сцену?",empty:"Немає сцен"},
  pl:{title:"ZARZĄDZANIE SCENAMI",subtitle:"Twórz, przygotowuj i publikuj sceny taktyczne",newScene:"NOWA SCENA",name:"Nazwa sceny",grid:"Siatka",create:"UTWÓRZ",selected:"WYBRANA",live:"LIVE",offline:"OFFLINE",edit:"EDYTUJ",rename:"ZMIEŃ NAZWĘ",makeLive:"USTAW LIVE",stopLive:"ZATRZYMAJ LIVE",delete:"USUŃ",tokens:"tokenów",cannotDelete:"Musi pozostać co najmniej jedna scena",confirmDelete:"Usunąć tę scenę?",empty:"Brak scen"},
};
function lang(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";}

export default function GmSceneManagerScreen({session,onOpenBattlemap}){
  const {i18n}=useTranslation();
  const text=COPY[lang(i18n.resolvedLanguage||i18n.language)];
  const scenes=Array.isArray(session?.tacticalScenes)?session.tacticalScenes:[];
  const [name,setName]=useState("");
  const [grid,setGrid]=useState("12x12");
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
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
    <header className="gm-scene-manager__head"><span>PIP / 2D20 // GM</span><h2>[ {text.title} ]</h2><p>{text.subtitle}</p></header>
    {error?<div className="session-error">{error}</div>:null}
    <section className="pip-panel gm-scene-manager__create">
      <div className="pip-panel-title">{text.newScene}</div>
      <label><span>{text.name}</span><input className="pip-input" value={name} onChange={e=>setName(e.target.value)} placeholder="Scene 2"/></label>
      <label><span>{text.grid}</span><select className="pip-input" value={grid} onChange={e=>setGrid(e.target.value)}><option>8x8</option><option>10x10</option><option>12x12</option><option>16x16</option><option>20x20</option><option>24x24</option><option>30x30</option></select></label>
      <button type="button" className="pip-btn is-primary" disabled={Boolean(busy)} onClick={createScene}>{text.create}</button>
    </section>
    <div className="gm-scene-manager__grid">
      {scenes.length?scenes.map(scene=>{
        const isSelected=scene.sceneId===selectedId,isLive=scene.sceneId===liveId||scene.active;
        return <article className={"pip-panel gm-scene-card"+(isLive?" is-live":"")+(isSelected?" is-selected":"")} key={scene.sceneId}>
          <div className="gm-scene-card__head"><div><strong>{scene.name||"Scene"}</strong><small>{scene.cols}×{scene.rows} · {(scene.tokens||[]).length} {text.tokens}</small></div><span className={"gm-scene-card__status "+(isLive?"is-live":isSelected?"is-selected":"")}>{isLive?text.live:isSelected?text.selected:text.offline}</span></div>
          <div className="gm-scene-card__actions">
            <button type="button" className="pip-btn" disabled={Boolean(busy)} onClick={()=>editScene(scene)}>{text.edit}</button>
            <button type="button" className="pip-btn" disabled={Boolean(busy)} onClick={()=>renameScene(scene)}>{text.rename}</button>
            {isLive?<button type="button" className="pip-btn" disabled={Boolean(busy)} onClick={()=>run("stop",()=>session?.disableTacticalScene?.())}>{text.stopLive}</button>:<button type="button" className="pip-btn is-primary" disabled={Boolean(busy)} onClick={()=>makeLive(scene)}>{text.makeLive}</button>}
            <button type="button" className="pip-btn gm-scene-card__delete" disabled={Boolean(busy)||scenes.length<=1} onClick={()=>deleteScene(scene)}>{text.delete}</button>
          </div>
        </article>;
      }):<div className="stat-sub">{text.empty}</div>}
    </div>
    {selected?<small className="gm-scene-manager__selected">{text.selected}: {selected.name}</small>:null}
  </section>;
}
