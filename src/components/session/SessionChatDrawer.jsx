import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DiceRollModal from "../dice/DiceRollModal.jsx";
import SessionTacticalMap from "./SessionTacticalMap.jsx";
import TacticalSessionHud from "./TacticalSessionHud.jsx";
import "./sessionUtilityDrawer.css";

const SAVE_KEY = "fallout_pipboy_v4_last_character";
const COPY = {
  en:{title:"SESSION CHAT",online:"ONLINE",connecting:"CONNECTING",offline:"OFFLINE",placeholder:"Message the group...",send:"SEND",empty:"No messages or rolls yet.",close:"CLOSE",reconnect:"RECONNECT",dice:"DICE",battlemap:"BATTLEMAP",success:"SUCCESS",failure:"FAILURE",successes:"Suc",complications:"Comp",damage:"Damage",effects:"Effects",difficulty:"Diff",target:"TN",hit:"Hit"},
  ru:{title:"ЧАТ СЕССИИ",online:"ОНЛАЙН",connecting:"ПОДКЛЮЧЕНИЕ",offline:"ОФЛАЙН",placeholder:"Сообщение группе...",send:"ОТПРАВИТЬ",empty:"Пока нет сообщений или бросков.",close:"ЗАКРЫТЬ",reconnect:"ПЕРЕПОДКЛЮЧИТЬСЯ",dice:"КУБИКИ",battlemap:"БЕТЛМАП",success:"УСПЕХ",failure:"ПРОВАЛ",successes:"Усп",complications:"Осл",damage:"Урон",effects:"Эффекты",difficulty:"Сложн",target:"ЦЧ",hit:"Попадание"},
  uk:{title:"ЧАТ СЕСІЇ",online:"ОНЛАЙН",connecting:"ПІДКЛЮЧЕННЯ",offline:"ОФЛАЙН",placeholder:"Повідомлення групі...",send:"НАДІСЛАТИ",empty:"Ще немає повідомлень або кидків.",close:"ЗАКРИТИ",reconnect:"ПЕРЕПІДКЛЮЧИТИСЯ",dice:"КУБИКИ",battlemap:"БЕТЛМАП",success:"УСПІХ",failure:"НЕВДАЧА",successes:"Усп",complications:"Ускл",damage:"Шкода",effects:"Ефекти",difficulty:"Складн",target:"ЦЧ",hit:"Влучання"},
  pl:{title:"CZAT SESJI",online:"ONLINE",connecting:"ŁĄCZENIE",offline:"OFFLINE",placeholder:"Wiadomość do grupy...",send:"WYŚLIJ",empty:"Brak wiadomości lub rzutów.",close:"ZAMKNIJ",reconnect:"POŁĄCZ PONOWNIE",dice:"KOŚCI",battlemap:"MAPA WALKI",success:"SUKCES",failure:"PORAŻKA",successes:"Suk",complications:"Kompl",damage:"Obrażenia",effects:"Efekty",difficulty:"Trudn",target:"TN",hit:"Trafienie"}
};
function copyFor(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]||COPY.en;}
function time(value){const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?"":d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}
function connection(status){if(status==="online")return"online";if(status==="connecting"||status==="waiting")return"connecting";return"offline";}
function readLocalForm(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");return saved?.data||saved||null;}catch{return null;}}

function RollItem({item,copy}){
  const roll=item?.roll||{},values=Array.isArray(roll.diceValues)?roll.diceValues:[],isD6=roll.diceType==="d6";
  const outcome=roll.outcome==="success"?copy.success:roll.outcome==="failure"?copy.failure:"";
  return <div className="session-drawer-message session-drawer-roll"><div className="session-drawer-message-meta"><strong>{item.sender||"GM"} · {String(roll.diceType||"D20").toUpperCase()}</strong><span>{time(item.timestamp)}</span></div><div className="session-roll-card"><div className="session-roll-title">{roll.label||roll.rollType||String(roll.diceType||"D20").toUpperCase()}{outcome?` · ${outcome}`:""}</div>{values.length?<div className="session-roll-dice">{values.map((v,i)=><span key={`${item.id}-${i}`}>{String(v)}</span>)}</div>:null}<div className="session-roll-stats">{!isD6&&Number.isFinite(Number(roll.successes))?<span>{copy.successes}: {roll.successes}</span>:null}{!isD6&&Number(roll.complications||0)>0?<span>{copy.complications}: {roll.complications}</span>:null}{!isD6&&Number.isFinite(Number(roll.targetNumber))?<span>{copy.target}: {roll.targetNumber}</span>:null}{!isD6&&Number.isFinite(Number(roll.difficulty))?<span>{copy.difficulty}: {roll.difficulty}</span>:null}{!isD6&&roll.hitLocation?.label?<span>{copy.hit}: {roll.hitLocation.label}</span>:null}{isD6&&Number.isFinite(Number(roll.totalDamage))?<span>{copy.damage}: {roll.totalDamage}</span>:null}{isD6&&Number.isFinite(Number(roll.totalEffects))?<span>{copy.effects}: {roll.totalEffects}</span>:null}</div></div></div>;
}
function FeedItem({item,copy}){
  if(item.type==="roll")return <RollItem item={item} copy={copy}/>;
  if(item.type==="system"||item.type==="combat")return <div className="session-drawer-system"><span>{time(item.timestamp)}</span><strong>{item.sender||"SYSTEM"}</strong><span>{item.text||item.event||""}</span></div>;
  return <div className={`session-drawer-message${item.type==="scene"?" is-scene":""}`}><div className="session-drawer-message-meta"><strong>{item.sender||"GM"}</strong><span>{time(item.timestamp)}</span></div><div>{item.text||""}</div></div>;
}

export default function SessionChatDrawer({session,form=null}){
  const {i18n}=useTranslation(),copy=copyFor(i18n.resolvedLanguage||i18n.language);
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(""),[diceOpen,setDiceOpen]=useState(false),[pendingAutoD6,setPendingAutoD6]=useState(null),[battlemapRequest,setBattlemapRequest]=useState(0);
  const listRef=useRef(null);
  const items=useMemo(()=>(session?.feed||[]).filter(Boolean).slice(-160),[session?.feed]);
  const state=connection(session?.status),diceForm=form||readLocalForm();
  const hasBattlemap=Boolean(session?.mode==="player"&&(session?.tacticalScene?.active||session?.liveSceneId));
  useEffect(()=>{if(open&&listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;},[open,items.length]);
  if(!session?.isActive)return null;
  const submit=(event)=>{event.preventDefault();const text=String(draft||"").trim();if(text&&session.sendChat?.(text)){setDraft("");}};
  const openBattlemap=()=>{if(!hasBattlemap)return;setOpen(false);setBattlemapRequest((value)=>value+1);};
  return <>
    <div className={`session-chat-drawer-shell session-utility-drawer-shell${open?" is-open":""}`}>
      <button type="button" className="session-chat-drawer-toggle session-utility-drawer-toggle" onClick={()=>setOpen((v)=>!v)} aria-expanded={open}><span className={`session-status-dot is-${session.status}`}/><span className="session-chat-toggle-label">☰</span><span className="session-chat-toggle-code">{session.sessionCode}</span></button>
      <aside className="session-chat-drawer session-utility-drawer" aria-hidden={!open}>
        <header className="session-chat-drawer-head"><div><div className="pip-bootline">PIP 2D20 NETWORK</div><h2>[ {copy.title} ]</h2></div><button type="button" className="pip-btn" onClick={()=>setOpen(false)}>{copy.close}</button></header>
        <div className="session-chat-connection-strip"><div><span className={`session-status-dot is-${session.status}`}/><strong>{copy[state]}</strong></div><span>{session.sessionCode}</span></div>
        <nav className="session-utility-tabs">
          <button type="button" className="pip-btn is-primary" disabled>CHAT + ROLLS</button>
          {session.mode==="player"?<button type="button" className="pip-btn" disabled={!hasBattlemap} onClick={openBattlemap}>{copy.battlemap}</button>:null}
          <button type="button" className="pip-btn" onClick={()=>{setOpen(false);setDiceOpen(true);}}>{copy.dice}</button>
        </nav>
        {state!=="online"&&session.reconnectNow?<button type="button" className="pip-btn is-primary" onClick={()=>session.reconnectNow()}>↻ {copy.reconnect}</button>:null}
        <div className="session-utility-body"><div ref={listRef} className="session-chat-drawer-list session-utility-list">{items.length?items.map((item)=><FeedItem key={item.id} item={item} copy={copy}/>):<div className="pip-logbox">{copy.empty}</div>}</div></div>
        <form className="session-chat-drawer-form" onSubmit={submit}><input className="pip-input" value={draft} maxLength={500} placeholder={copy.placeholder} onChange={(event)=>setDraft(event.target.value)}/><button type="submit" className="pip-btn is-primary" disabled={state!=="online"||!String(draft).trim()}>{copy.send}</button></form>
      </aside>
      {session.mode==="player"?<SessionTacticalMap session={session} openRequest={battlemapRequest}/>:null}
    </div>
    {session.mode==="host"?<TacticalSessionHud session={session}/>:null}
    <DiceRollModal isOpen={diceOpen} onClose={()=>setDiceOpen(false)} rollConfig={null} form={diceForm} pendingAutoD6={pendingAutoD6} setPendingAutoD6={setPendingAutoD6} combatState={session?.combat||null} currentLuckPoints={undefined} onSpendCombatLuck={undefined} onMarkCombatUse={undefined} onDiceResult={session?.sendDiceResult}/>
  </>;
}
