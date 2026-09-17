import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { playSound } from "../../utils/soundManager";
import SheetIcon from "./SheetIcon.jsx";
import SheetProfile from "./SheetProfile.jsx";
import { sheetCopy } from "./sheetCopy.js";

const EXTRA_TAB_LABELS = {
  companion: {
    en: "COMPANION",
    ru: "СПУТНИК",
    uk: "КОМПАНЬЙОН",
    pl: "TOWARZYSZ",
  },
  bestiary: {
    en: "BESTIARY",
    ru: "БЕСТИАРИЙ",
    uk: "БЕСТІАРІЙ",
    pl: "BESTIARIUSZ",
  },
  crafting: {
    en: "CRAFTING",
    ru: "КРАФТ",
    uk: "КРАФТ",
    pl: "RZEMIOSŁO",
  },
  vehicles: {
    en: "VEHICLES",
    ru: "ТРАНСПОРТ",
    uk: "ТРАНСПОРТ",
    pl: "POJAZDY",
  },
};

export const PIPBOY_TABS = [
  { key: "status", labelKey: "tabs.status" },
  { key: "special", labelKey: "tabs.special" },
  { key: "skills", labelKey: "skills.title" },
  { key: "companion" },
  { key: "weapons", labelKey: "tabs.weapons" },
  { key: "inventory", labelKey: "tabs.inventory" },
  { key: "crafting" },
  { key: "vehicles" },
  { key: "armor", labelKey: "tabs.armor" },
  { key: "perks", labelKey: "tabs.perks" },
  { key: "bestiary" },
  { key: "notes", labelKey: "tabs.notes" },
  { key: "map", labelKey: "tabs.map" },
  { key: "games", labelKey: "tabs.games" },
];


export default function TopNav({ activeTab, onTabChange, onToggleMenu, onOpenDice, onOpenChat, onOpenMap, chatAvailable, localSaveState, profileProps }) {
  const {t,i18n}=useTranslation(); const language=(i18n.resolvedLanguage || 'en').split('-')[0]; const c=sheetCopy(language);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{
    if (!expanded) return;
    const closeOnEscape=event=>{if(event.key==='Escape')setExpanded(false);};
    window.addEventListener('keydown',closeOnEscape);
    return ()=>window.removeEventListener('keydown',closeOnEscape);
  },[expanded]);
  const label=(tab)=>tab.key==='status'?c.overview:tab.key==='skills'?c.skills:EXTRA_TAB_LABELS[tab.key]?.[language] || EXTRA_TAB_LABELS[tab.key]?.en || t(tab.labelKey);
  const icons={status:'person',special:'special',skills:'skills',inventory:'bag',perks:'star',notes:'notes',map:'map',weapons:'melee',armor:'shield',crafting:'flask',vehicles:'map',companion:'person',bestiary:'notes',games:'dice'};
  const primary=['status','special','skills','inventory','perks','notes'];
  const navigate=key=>{setExpanded(false);if(key!==activeTab){playSound('uiTab');onTabChange(key);}};
  const navButton=(key,compact=false)=>{
    const tab=PIPBOY_TABS.find(item=>item.key===key);
    return <button key={key} type="button" className={`sheet-nav-item ${activeTab===key?'is-active':''}`} aria-current={activeTab===key?'page':undefined} onClick={()=>navigate(key)}>{!compact && <SheetIcon name={icons[key]}/>}<span>{key==='inventory'?c.equipment:label(tab)}</span></button>;
  };
  const saveLabel=localSaveState==='saved'?c.saved:localSaveState==='error'?c.saveError:c.saving;
  return <>
    <header className="sheet-topbar">
      <strong className="sheet-brand">PIP 2D20</strong>
      <span className="sheet-breadcrumb">{c.character} / {label(PIPBOY_TABS.find(tab=>tab.key===activeTab)||PIPBOY_TABS[0])}</span>
      <span className={`sheet-save-state is-${localSaveState}`} role="status" title={c.localHint}><SheetIcon name="save"/>{saveLabel}</span>
      <button type="button" className="sheet-icon-button" onClick={onToggleMenu} aria-label={c.settings}><SheetIcon name="settings"/></button>
    </header>
    <aside className="sheet-sidebar" aria-label={c.section}>
      <nav>{primary.map(key=>navButton(key))}<button className={`sheet-nav-item ${!primary.includes(activeTab)?'is-active':''}`} type="button" aria-expanded={expanded} aria-controls="sheet-more-panel" onClick={()=>setExpanded(v=>!v)}><SheetIcon name="more"/>{c.more}</button></nav>
      <div className="sheet-session-tools"><small>{c.tools}</small>
        <button className="sheet-nav-item" type="button" onClick={onOpenChat} disabled={!chatAvailable} title={!chatAvailable?c.offlineChat:undefined}><SheetIcon name="chat"/>{c.chat}</button>
        <button className="sheet-nav-item" type="button" onClick={onOpenDice}><SheetIcon name="dice"/>{c.dice}</button>
        <button className="sheet-nav-item" type="button" onClick={onOpenMap}><SheetIcon name="map"/>{c.map}</button>
      </div>
      <footer>ROBCO INDUSTRIES (TM)<br/>PIP 2D20</footer>
    </aside>
    <div className="sheet-mobile-context">
      <SheetProfile {...profileProps} compact />
      <nav className="sheet-mobile-tabs" aria-label={c.section}>{['status','special','skills'].map(key=>navButton(key,true))}<button className="sheet-icon-button" type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded} aria-controls="sheet-more-panel" aria-label={c.more}><SheetIcon name="chevron"/></button></nav>
    </div>
    {expanded && <section className="sheet-more-panel pip-panel" id="sheet-more-panel" aria-label={c.more}>
      <div className="sheet-card-heading"><h2>{c.more}</h2><button className="sheet-icon-button" type="button" aria-label={c.close} onClick={()=>setExpanded(false)}>×</button></div>
      <nav>{PIPBOY_TABS.map(tab=>navButton(tab.key))}</nav>
    </section>}
    <nav className="sheet-bottom-nav" aria-label={c.tools}>
      <button type="button" className={activeTab==='status'?'is-active':''} onClick={()=>navigate('status')}><SheetIcon name="person"/><span>{c.character}</span></button>
      <button type="button" disabled={!chatAvailable} title={!chatAvailable?c.offlineChat:undefined} onClick={onOpenChat}><SheetIcon name="chat"/><span>{c.chat}</span></button>
      <button type="button" onClick={onOpenDice}><SheetIcon name="dice"/><span>{c.dice}</span></button>
      <button type="button" className={activeTab==='map'?'is-active':''} onClick={onOpenMap}><SheetIcon name="map"/><span>{c.map}</span></button>
      <button type="button" aria-expanded={expanded} aria-controls="sheet-more-panel" onClick={()=>setExpanded(v=>!v)}><SheetIcon name="more"/><span>{c.more}</span></button>
    </nav>
  </>;
}
