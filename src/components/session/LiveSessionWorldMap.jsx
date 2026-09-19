import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import PhaserMapViewport from "../phaser/PhaserMapViewport.jsx";
import { MAP_REGIONS, getMapRegion, getRegionName } from "../../data/map/mapRegions.js";
import "./liveSessionWorldMap.css";

const COPY = {
  en: { title:"LIVE GLOBAL MAP", hint:"GM markers are shared with everyone in this session.", add:"ADD MARKER", save:"SAVE", del:"DELETE", name:"Marker name", desc:"Description", category:"Category", empty:"No markers yet.", gm:"GM", player:"Read-only shared map" },
  ru: { title:"ГЛОБАЛЬНАЯ КАРТА СЕССИИ", hint:"Метки ГМ сразу показываются всем игрокам этой сессии.", add:"ДОБАВИТЬ МЕТКУ", save:"СОХРАНИТЬ", del:"УДАЛИТЬ", name:"Название метки", desc:"Описание", category:"Категория", empty:"Меток пока нет.", gm:"ГМ", player:"Общая карта только для просмотра" },
  uk: { title:"ГЛОБАЛЬНА МАПА СЕСІЇ", hint:"Мітки ГМ одразу показуються всім гравцям цієї сесії.", add:"ДОДАТИ МІТКУ", save:"ЗБЕРЕГТИ", del:"ВИДАЛИТИ", name:"Назва мітки", desc:"Опис", category:"Категорія", empty:"Міток ще немає.", gm:"ГМ", player:"Спільна мапа лише для перегляду" },
  pl: { title:"GLOBALNA MAPA SESJI", hint:"Znaczniki MG są od razu widoczne dla wszystkich graczy w tej sesji.", add:"DODAJ ZNACZNIK", save:"ZAPISZ", del:"USUŃ", name:"Nazwa znacznika", desc:"Opis", category:"Kategoria", empty:"Brak znaczników.", gm:"MG", player:"Wspólna mapa tylko do podglądu" },
};
const ICONS={objective:"◎",danger:"!",loot:"$",quest:"?",note:"●",settlement:"⌂"};
const CATEGORIES=Object.keys(ICONS);

export default function LiveSessionWorldMap({ session }) {
  const { i18n } = useTranslation();
  const language=String(i18n.resolvedLanguage||i18n.language||"en").split("-")[0];
  const text=COPY[language]||COPY.en;
  const state=session?.liveWorld||{regionId:"commonwealth",markers:[]};
  const region=getMapRegion(state.regionId)||MAP_REGIONS[0];
  const gm=session?.mode==="host";
  const [selected,setSelected]=useState(null);
  const [editingId,setEditingId]=useState(null);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [category,setCategory]=useState("note");
  const markers=useMemo(()=>[
    ...region.locations.map(location=>({id:`location-${location.id}`,x:location.worldX,y:location.worldY,icon:location.icon||"◆",label:location.name,category:"note",kind:"location"})),
    ...(state.markers||[]).filter(marker=>marker.regionId===region.id).map(marker=>({...marker,icon:ICONS[marker.category]||"●",kind:"live"})),
  ],[region,state.markers]);

  function publish(next){ return session?.updateLiveWorld?.({regionId:region.id,markers:next}); }
  function chooseMarker(marker){
    setSelected({x:marker.x,y:marker.y});
    if(marker.kind!=="live"||!gm)return;
    setEditingId(marker.id);setName(marker.label||"");setDescription(marker.description||"");setCategory(marker.category||"note");
  }
  function submit(event){
    event.preventDefault();
    if(!gm||!selected||!name.trim())return;
    const id=editingId||`live-marker-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const marker={id,regionId:region.id,x:selected.x,y:selected.y,label:name.trim().slice(0,80),description:description.trim().slice(0,240),category};
    const next=[...(state.markers||[]).filter(item=>item.id!==id),marker].slice(-200);
    if(publish(next)){setEditingId(null);setName("");setDescription("");setCategory("note");}
  }
  function remove(id){ publish((state.markers||[]).filter(item=>item.id!==id)); }

  return <section className="live-session-world">
    <header><div><small>PIP 2D20 / {gm?text.gm:text.player}</small><h2>{text.title}</h2><p>{text.hint}</p></div>
      <label><select value={region.id} disabled={!gm} onChange={event=>session?.updateLiveWorld?.({regionId:event.target.value,markers:state.markers||[]})}>{MAP_REGIONS.map(item=><option key={item.id} value={item.id}>{getRegionName(item,language)} · {item.game}</option>)}</select></label>
    </header>
    <div className="live-session-world__layout">
      <PhaserMapViewport cols={64} rows={64} sceneKey={`live-world:${session?.sessionCode||"room"}:${region.id}`} label={text.title} selected={selected}
        onCell={(x,y)=>gm&&setSelected({x,y})} onMarker={chooseMarker} markers={markers}/>
      {gm&&<aside className="pip-panel live-session-world__editor">
        <form onSubmit={submit}>
          <input className="pip-input" placeholder={text.name} maxLength={80} value={name} onChange={e=>setName(e.target.value)}/>
          <textarea className="pip-input" placeholder={text.desc} maxLength={240} rows={3} value={description} onChange={e=>setDescription(e.target.value)}/>
          <select className="pip-input" value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(key=><option key={key} value={key}>{ICONS[key]} {key}</option>)}</select>
          <button className="pip-btn is-primary" disabled={!selected||!name.trim()}>{editingId?text.save:text.add}</button>
        </form>
        <div className="live-session-world__markers">{!(state.markers||[]).filter(m=>m.regionId===region.id).length&&<small>{text.empty}</small>}
          {(state.markers||[]).filter(m=>m.regionId===region.id).map(marker=><div key={marker.id}><button type="button" className="pip-btn" onClick={()=>chooseMarker({...marker,kind:"live"})}><strong>{ICONS[marker.category]||"●"} {marker.label}</strong><small>{marker.x}:{marker.y}</small></button><button type="button" className="pip-btn" onClick={()=>remove(marker.id)}>{text.del}</button></div>)}
        </div>
      </aside>}
    </div>
  </section>;
}
