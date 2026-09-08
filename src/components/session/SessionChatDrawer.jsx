import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import DiceRollModal from "../dice/DiceRollModal.jsx";
import SessionTacticalMap from "./SessionTacticalMap.jsx";
import TacticalSessionHud from "./TacticalSessionHud.jsx";
import { parseLootChatMessage } from "../../utils/lootChat.js";
import {
  appendPurchasedItem,
  getMerchantTypeLabel,
  inventoryTradeKey,
  merchantAcceptsItem,
  merchantBuyPrice,
  merchantSellPrice,
  parseMerchantOfferMessage,
  removeSoldInventoryUnit,
} from "../../utils/merchantSystem.js";
import "./sessionUtilityDrawer.css";
import "./sessionMerchant.css";

const SAVE_KEY = "fallout_pipboy_v4_last_character";
const APPLIED_TRADE_PREFIX = "pip2d20_applied_merchant_trades_v1";
const COPY = {
  en: {
    title:"SESSION CHAT",online:"ONLINE",connecting:"CONNECTING",offline:"OFFLINE",placeholder:"Message the group...",send:"SEND",empty:"No messages or rolls yet.",close:"CLOSE",reconnect:"RECONNECT",dice:"DICE",battlemap:"BATTLEMAP",chat:"CHAT + ROLLS",success:"SUCCESS",failure:"FAILURE",successes:"Suc",complications:"Comp",damage:"Damage",effects:"Effects",difficulty:"Diff",target:"TN",hit:"Hit",addLoot:"ADD TO INVENTORY",cancel:"CANCEL",lootCard:"LOOT ITEM",quantity:"QTY",value:"VALUE",weight:"WEIGHT",rarity:"RARITY",added:"Added to inventory",
    merchants:"MERCHANTS",merchant:"MERCHANT",trade:"TRADE",buy:"BUY",sell:"SELL",back:"BACK",caps:"CAPS",stock:"STOCK",items:"items",yourCaps:"YOUR CAPS",vendorCaps:"MERCHANT CAPS",noMerchants:"No merchants have been created for this session yet.",noStock:"This merchant has no goods left.",noSellable:"This merchant will not buy anything currently in your inventory.",price:"PRICE",owned:"OWNED",pending:"Waiting for session confirmation...",bought:"Purchase completed.",sold:"Item sold.",notEnoughCaps:"You do not have enough caps.",vendorNoCaps:"The merchant does not have enough caps.",soldOut:"That item has already been bought.",wrongType:"This merchant does not buy that type of item.",tradeFailed:"Trade could not be sent to the session.",playerOnly:"Only a player character can trade.",offer:"MERCHANT OFFER",openMerchant:"OPEN TRADE",unavailable:"Merchant is no longer available.",
  },
  ru: {
    title:"ЧАТ СЕССИИ",online:"ОНЛАЙН",connecting:"ПОДКЛЮЧЕНИЕ",offline:"ОФЛАЙН",placeholder:"Сообщение группе...",send:"ОТПРАВИТЬ",empty:"Пока нет сообщений или бросков.",close:"ЗАКРЫТЬ",reconnect:"ПЕРЕПОДКЛЮЧИТЬСЯ",dice:"КУБИКИ",battlemap:"БЕТЛМАП",chat:"ЧАТ + БРОСКИ",success:"УСПЕХ",failure:"ПРОВАЛ",successes:"Усп",complications:"Осл",damage:"Урон",effects:"Эффекты",difficulty:"Сложн",target:"ЦЧ",hit:"Попадание",addLoot:"ДОБАВИТЬ В ИНВЕНТАРЬ",cancel:"ОТМЕНА",lootCard:"КАРТОЧКА ЛУТА",quantity:"КОЛ-ВО",value:"СТОИМОСТЬ",weight:"ВЕС",rarity:"РЕДКОСТЬ",added:"Добавлено в инвентарь",
    merchants:"ТОРГОВЦЫ",merchant:"ТОРГОВЕЦ",trade:"ТОРГОВЛЯ",buy:"КУПИТЬ",sell:"ПРОДАТЬ",back:"НАЗАД",caps:"КРЫШКИ",stock:"ТОВАРЫ",items:"поз.",yourCaps:"ВАШИ КРЫШКИ",vendorCaps:"КРЫШКИ ТОРГОВЦА",noMerchants:"В этой сессии пока нет созданных торговцев.",noStock:"У этого торговца закончились товары.",noSellable:"В вашем инвентаре нет вещей, которые покупает этот торговец.",price:"ЦЕНА",owned:"ЕСТЬ",pending:"Ожидание подтверждения общей сессии...",bought:"Покупка завершена.",sold:"Предмет продан.",notEnoughCaps:"Недостаточно крышек.",vendorNoCaps:"У торговца недостаточно крышек.",soldOut:"Этот товар уже купил другой игрок.",wrongType:"Этот торговец не покупает такой тип предметов.",tradeFailed:"Не удалось отправить сделку в общую сессию.",playerOnly:"Торговать может только персонаж игрока.",offer:"ПРЕДЛОЖЕНИЕ ТОРГОВЦА",openMerchant:"ОТКРЫТЬ ТОРГОВЛЮ",unavailable:"Торговец больше недоступен.",
  },
  uk: {
    title:"ЧАТ СЕСІЇ",online:"ОНЛАЙН",connecting:"ПІДКЛЮЧЕННЯ",offline:"ОФЛАЙН",placeholder:"Повідомлення групі...",send:"НАДІСЛАТИ",empty:"Ще немає повідомлень або кидків.",close:"ЗАКРИТИ",reconnect:"ПЕРЕПІДКЛЮЧИТИСЯ",dice:"КУБИКИ",battlemap:"БЕТЛМАП",chat:"ЧАТ + КИДКИ",success:"УСПІХ",failure:"НЕВДАЧА",successes:"Усп",complications:"Ускл",damage:"Шкода",effects:"Ефекти",difficulty:"Складн",target:"ЦЧ",hit:"Влучання",addLoot:"ДОДАТИ В ІНВЕНТАР",cancel:"СКАСУВАТИ",lootCard:"КАРТКА ЛУТУ",quantity:"К-СТЬ",value:"ВАРТІСТЬ",weight:"ВАГА",rarity:"РІДКІСТЬ",added:"Додано в інвентар",
    merchants:"ТОРГОВЦІ",merchant:"ТОРГОВЕЦЬ",trade:"ТОРГІВЛЯ",buy:"КУПИТИ",sell:"ПРОДАТИ",back:"НАЗАД",caps:"КРИШКИ",stock:"ТОВАРИ",items:"поз.",yourCaps:"ВАШІ КРИШКИ",vendorCaps:"КРИШКИ ТОРГОВЦЯ",noMerchants:"У цій сесії ще немає торговців.",noStock:"У цього торговця закінчилися товари.",noSellable:"У вашому інвентарі немає речей, які купує цей торговець.",price:"ЦІНА",owned:"Є",pending:"Очікування підтвердження спільної сесії...",bought:"Покупку завершено.",sold:"Предмет продано.",notEnoughCaps:"Недостатньо кришок.",vendorNoCaps:"У торговця недостатньо кришок.",soldOut:"Цей товар уже купив інший гравець.",wrongType:"Цей торговець не купує такий тип предметів.",tradeFailed:"Не вдалося надіслати угоду в сесію.",playerOnly:"Торгувати може лише персонаж гравця.",offer:"ПРОПОЗИЦІЯ ТОРГОВЦЯ",openMerchant:"ВІДКРИТИ ТОРГІВЛЮ",unavailable:"Торговець більше недоступний.",
  },
  pl: {
    title:"CZAT SESJI",online:"ONLINE",connecting:"ŁĄCZENIE",offline:"OFFLINE",placeholder:"Wiadomość do grupy...",send:"WYŚLIJ",empty:"Brak wiadomości lub rzutów.",close:"ZAMKNIJ",reconnect:"POŁĄCZ PONOWNIE",dice:"KOŚCI",battlemap:"MAPA WALKI",chat:"CZAT + RZUTY",success:"SUKCES",failure:"PORAŻKA",successes:"Suk",complications:"Kompl",damage:"Obrażenia",effects:"Efekty",difficulty:"Trudn",target:"TN",hit:"Trafienie",addLoot:"DODAJ DO EKWIPUNKU",cancel:"ANULUJ",lootCard:"KARTA ŁUPU",quantity:"ILOŚĆ",value:"WARTOŚĆ",weight:"WAGA",rarity:"RZADKOŚĆ",added:"Dodano do ekwipunku",
    merchants:"HANDLARZE",merchant:"HANDLARZ",trade:"HANDEL",buy:"KUP",sell:"SPRZEDAJ",back:"WSTECZ",caps:"KAPSLE",stock:"TOWAR",items:"poz.",yourCaps:"TWOJE KAPSLE",vendorCaps:"KAPSLE HANDLARZA",noMerchants:"W tej sesji nie ma jeszcze handlarzy.",noStock:"Ten handlarz nie ma już towaru.",noSellable:"Nie masz przedmiotów, które ten handlarz kupuje.",price:"CENA",owned:"MASZ",pending:"Oczekiwanie na potwierdzenie sesji...",bought:"Zakup zakończony.",sold:"Przedmiot sprzedany.",notEnoughCaps:"Masz za mało kapsli.",vendorNoCaps:"Handlarz ma za mało kapsli.",soldOut:"Ten przedmiot kupił już inny gracz.",wrongType:"Ten handlarz nie kupuje tego rodzaju przedmiotów.",tradeFailed:"Nie udało się wysłać transakcji do sesji.",playerOnly:"Handlować może tylko postać gracza.",offer:"OFERTA HANDLARZA",openMerchant:"OTWÓRZ HANDEL",unavailable:"Handlarz nie jest już dostępny.",
  },
};

function copyFor(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]||COPY.en;}
function languageFor(value){const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";}
function time(value){const d=new Date(value||Date.now());return Number.isNaN(d.getTime())?"":d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});}
function connection(status){if(status==="online")return"online";if(status==="connecting"||status==="waiting")return"connecting";return"offline";}
function readLocalForm(){try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");return saved?.data||saved||null;}catch{return null;}}
function persistLocalForm(nextForm){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");
    const payload=saved?.data&&typeof saved.data==="object"?{...saved,data:nextForm}:nextForm;
    localStorage.setItem(SAVE_KEY,JSON.stringify(payload));
  }catch{}
}
function updateCharacter(form,setForm,updater){
  if(typeof setForm==="function"){
    setForm((previous)=>{const next=updater(previous||{});persistLocalForm(next);return next;});
    return;
  }
  const source=(form&&typeof form==="object"?form:readLocalForm())||{};
  const next=updater(source);
  if(form&&typeof form==="object")Object.assign(form,next);
  persistLocalForm(next);
}

function inventoryIdentity(item){return `${String(item?.category||"").toLowerCase()}::${String(item?.name||"").trim().toLowerCase()}`;}
function isStackableLoot(item){return ["ammo","caps","junk","aid"].includes(String(item?.lootType||"").toLowerCase());}
function appendLoot(items,item){
  const current=Array.isArray(items)?[...items]:[];
  if(isStackableLoot(item)){
    const key=inventoryIdentity(item),index=current.findIndex((entry)=>inventoryIdentity(entry)===key);
    if(index>=0){
      const previous=current[index],quantity=Math.max(0,Number(previous?.quantity||0))+Math.max(1,Number(item?.quantity||1));
      current[index]={...previous,quantity:String(quantity)};
      return current;
    }
  }
  current.push({...item,quantity:String(Math.max(1,Number(item?.quantity||1)))});
  return current;
}
function persistLootItem(form,setForm,item){
  const normalized={...item,id:item?.id||`loot-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,name:String(item?.name||"Loot"),quantity:String(Math.max(1,Number(item?.quantity||1))),cost:String(item?.cost??"-"),weight:String(item?.weight??"0"),rarity:String(item?.rarity??"0"),category:String(item?.category||"misc"),sourceType:String(item?.sourceType||"loot"),sourceId:item?.sourceId??null,effect:String(item?.effect||"")};
  updateCharacter(form,setForm,(previous)=>({...previous,inventoryItems:appendLoot(previous.inventoryItems,normalized)}));
  return normalized;
}

function appliedTradeKey(session){return `${APPLIED_TRADE_PREFIX}:${String(session?.sessionCode||"local")}:${String(session?.clientId||"client")}`;}
function readAppliedTrades(session){try{return new Set(JSON.parse(localStorage.getItem(appliedTradeKey(session))||"[]"));}catch{return new Set();}}
function writeAppliedTrades(session,set){try{localStorage.setItem(appliedTradeKey(session),JSON.stringify([...set].slice(-400)));}catch{}}
function tradeError(copy,reason){if(reason==="SOLD_OUT")return copy.soldOut;if(reason==="NO_VENDOR_CAPS")return copy.vendorNoCaps;if(reason==="WRONG_TYPE")return copy.wrongType;return copy.tradeFailed;}

function RollItem({item,copy}){
  const roll=item?.roll||{},values=Array.isArray(roll.diceValues)?roll.diceValues:[],isD6=roll.diceType==="d6";
  const outcome=roll.outcome==="success"?copy.success:roll.outcome==="failure"?copy.failure:"";
  return <div className="session-drawer-message session-drawer-roll"><div className="session-drawer-message-meta"><strong>{item.sender||"GM"} · {String(roll.diceType||"D20").toUpperCase()}</strong><span>{time(item.timestamp)}</span></div><div className="session-roll-card"><div className="session-roll-title">{roll.label||roll.rollType||String(roll.diceType||"D20").toUpperCase()}{outcome?` · ${outcome}`:""}</div>{values.length?<div className="session-roll-dice">{values.map((v,i)=><span key={`${item.id}-${i}`}>{String(v)}</span>)}</div>:null}<div className="session-roll-stats">{!isD6&&Number.isFinite(Number(roll.successes))?<span>{copy.successes}: {roll.successes}</span>:null}{!isD6&&Number(roll.complications||0)>0?<span>{copy.complications}: {roll.complications}</span>:null}{!isD6&&Number.isFinite(Number(roll.targetNumber))?<span>{copy.target}: {roll.targetNumber}</span>:null}{!isD6&&Number.isFinite(Number(roll.difficulty))?<span>{copy.difficulty}: {roll.difficulty}</span>:null}{!isD6&&roll.hitLocation?.label?<span>{copy.hit}: {roll.hitLocation.label}</span>:null}{isD6&&Number.isFinite(Number(roll.totalDamage))?<span>{copy.damage}: {roll.totalDamage}</span>:null}{isD6&&Number.isFinite(Number(roll.totalEffects))?<span>{copy.effects}: {roll.totalEffects}</span>:null}</div></div></div>;
}

function MerchantOfferCard({merchant,copy,language,onOpen,onBuy,canTrade,pending}){
  if(!merchant)return <div className="session-merchant-offer is-unavailable"><strong>{copy.offer}</strong><span>{copy.unavailable}</span></div>;
  return <section className="session-merchant-offer">
    <div className="session-merchant-offer__head"><div><div className="pip-bootline">{copy.offer}</div><button type="button" className="session-merchant-name-link" onClick={()=>onOpen?.(merchant.id)}>{merchant.name}</button><small>{getMerchantTypeLabel(merchant.merchantType,language)}</small></div><strong>💰 {merchant.caps}</strong></div>
    <div className="session-merchant-offer__stock">{merchant.stock.length?merchant.stock.map((stockItem)=><div className="session-merchant-offer__row" key={stockItem.stockId}><button type="button" className="session-merchant-item-link" onClick={()=>onOpen?.(merchant.id)}>{stockItem.name}{Number(stockItem.quantity)>1?` ×${stockItem.quantity}`:""}</button><span>💰 {merchantBuyPrice(stockItem)}</span>{canTrade?<button type="button" className="pip-btn is-primary session-merchant-mini-buy" disabled={Boolean(pending)} onClick={()=>onBuy?.(merchant,stockItem)}>{copy.buy}</button>:null}</div>):<div className="pip-logbox">{copy.noStock}</div>}</div>
    <button type="button" className="pip-btn session-merchant-open" onClick={()=>onOpen?.(merchant.id)}>{copy.openMerchant}</button>
  </section>;
}

function FeedItem({item,copy,language,onLootClick,merchants,onOpenMerchant,onBuy,canTrade,pending}){
  if(item.type==="roll")return <RollItem item={item} copy={copy}/>;
  if(item.type==="system"||item.type==="combat")return <div className="session-drawer-system"><span>{time(item.timestamp)}</span><strong>{item.sender||"SYSTEM"}</strong><span>{item.text||item.event||""}</span></div>;
  const offer=parseMerchantOfferMessage(item.text);
  if(offer){
    const merchant=(merchants||[]).find((entry)=>entry.id===offer.merchantId)||null;
    return <div className="session-drawer-message is-merchant"><div className="session-drawer-message-meta"><strong>{item.sender||"GM"}</strong><span>{time(item.timestamp)}</span></div><MerchantOfferCard merchant={merchant} copy={copy} language={language} onOpen={onOpenMerchant} onBuy={onBuy} canTrade={canTrade} pending={pending}/></div>;
  }
  const loot=parseLootChatMessage(item.text);
  if(loot){
    const entry=loot.item;
    return <div className="session-drawer-message is-loot"><div className="session-drawer-message-meta"><strong>{item.sender||"GM"}</strong><span>{time(item.timestamp)}</span></div><div className="session-loot-chat-line"><span>🎁 [{loot.label}] </span><button type="button" className="session-loot-item-link" onClick={()=>onLootClick?.(entry)}>{entry.name}</button>{Number(entry.quantity)>1?<span> ×{entry.quantity}</span>:null}<span> — 💰{entry.cost} · ⚖{entry.weight} · R{entry.rarity}</span></div></div>;
  }
  return <div className={`session-drawer-message${item.type==="scene"?" is-scene":""}`}><div className="session-drawer-message-meta"><strong>{item.sender||"GM"}</strong><span>{time(item.timestamp)}</span></div><div>{item.text||""}</div></div>;
}

function MerchantDirectory({session,form,copy,language,selectedMerchantId,setSelectedMerchantId,tradeTab,setTradeTab,onBuy,onSell,pending}){
  const merchants=Array.isArray(session?.merchants)?session.merchants:[];
  const merchant=merchants.find((entry)=>entry.id===selectedMerchantId)||null;
  const playerCaps=Math.max(0,Number(form?.caps||0));
  if(!merchant){
    return <div className="session-merchants-directory">{merchants.length?merchants.map((entry)=><button type="button" className="session-merchant-directory-card" key={entry.id} onClick={()=>setSelectedMerchantId(entry.id)}><span><strong>{entry.name}</strong><small>{getMerchantTypeLabel(entry.merchantType,language)}</small></span><span><strong>💰 {entry.caps}</strong><small>{entry.stock.length} {copy.items}</small></span></button>):<div className="pip-logbox">{copy.noMerchants}</div>}</div>;
  }

  const inventory=Array.isArray(form?.inventoryItems)?form.inventoryItems:[];
  const sellable=inventory.map((item,index)=>({item,index,key:inventoryTradeKey(item,index)})).filter(({item})=>Number(item?.quantity??item?.qty??0)>0&&merchantAcceptsItem(merchant.merchantType,item));
  return <section className="session-merchant-trade">
    <header className="session-merchant-trade__head"><button type="button" className="pip-btn" onClick={()=>setSelectedMerchantId("")}>← {copy.back}</button><div><div className="pip-bootline">{getMerchantTypeLabel(merchant.merchantType,language)}</div><h3>{merchant.name}</h3></div></header>
    <div className="session-merchant-wallets"><span>{copy.yourCaps}: <strong>💰 {playerCaps}</strong></span><span>{copy.vendorCaps}: <strong>💰 {merchant.caps}</strong></span></div>
    <nav className="session-merchant-subtabs"><button type="button" className={`pip-btn${tradeTab==="buy"?" is-primary":""}`} onClick={()=>setTradeTab("buy")}>{copy.buy}</button><button type="button" className={`pip-btn${tradeTab==="sell"?" is-primary":""}`} onClick={()=>setTradeTab("sell")}>{copy.sell}</button></nav>
    {tradeTab==="buy"?<div className="session-merchant-trade-list">{merchant.stock.length?merchant.stock.map((stockItem)=><div className="session-merchant-trade-row" key={stockItem.stockId}><div><strong>{stockItem.name}</strong><small>R{stockItem.rarity} · ⚖ {stockItem.weight}{Number(stockItem.quantity)>1?` · ×${stockItem.quantity}`:""}</small></div><span>💰 {merchantBuyPrice(stockItem)}</span><button type="button" className="pip-btn is-primary" disabled={Boolean(pending)||playerCaps<merchantBuyPrice(stockItem)} onClick={()=>onBuy(merchant,stockItem)}>{copy.buy}</button></div>):<div className="pip-logbox">{copy.noStock}</div>}</div>:null}
    {tradeTab==="sell"?<div className="session-merchant-trade-list">{sellable.length?sellable.map(({item,index,key})=><div className="session-merchant-trade-row" key={key}><div><strong>{item.name||item.canonicalName}</strong><small>{copy.owned}: {Math.max(1,Number(item?.quantity??item?.qty??1))} · R{item?.rarity||0}</small></div><span>💰 {merchantSellPrice(item)}</span><button type="button" className="pip-btn is-primary" disabled={Boolean(pending)||merchant.caps<merchantSellPrice(item)} onClick={()=>onSell(merchant,item,index,key)}>{copy.sell}</button></div>):<div className="pip-logbox">{copy.noSellable}</div>}</div>:null}
  </section>;
}

export default function SessionChatDrawer({session,form=null,setForm=null}){
  const {i18n}=useTranslation();
  const language=languageFor(i18n.resolvedLanguage||i18n.language),copy=copyFor(language);
  const [open,setOpen]=useState(false),[draft,setDraft]=useState(""),[diceOpen,setDiceOpen]=useState(false),[pendingAutoD6,setPendingAutoD6]=useState(null),[battlemapRequest,setBattlemapRequest]=useState(0),[lootDraft,setLootDraft]=useState(null),[lootQuantity,setLootQuantity]=useState("1"),[lootStatus,setLootStatus]=useState("");
  const [view,setView]=useState("chat"),[selectedMerchantId,setSelectedMerchantId]=useState(""),[tradeTab,setTradeTab]=useState("buy"),[tradeStatus,setTradeStatus]=useState(""),[pendingTradeId,setPendingTradeId]=useState("");
  const listRef=useRef(null);
  const items=useMemo(()=>(session?.feed||[]).filter(Boolean).slice(-160),[session?.feed]);
  const state=connection(session?.status),diceForm=form||readLocalForm(),characterForm=form||diceForm||{};
  const merchants=Array.isArray(session?.merchants)?session.merchants:[];
  const hasBattlemap=Boolean(session?.mode==="player"&&(session?.tacticalScene?.active||session?.liveSceneId));
  const canTrade=session?.mode==="player";

  useEffect(()=>{if(open&&view==="chat"&&listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;},[open,view,items.length]);
  useEffect(()=>{
    if(!selectedMerchantId)return;
    if(!merchants.some((entry)=>entry.id===selectedMerchantId))setSelectedMerchantId("");
  },[merchants,selectedMerchantId]);

  useEffect(()=>{
    if(!canTrade||!session?.clientId)return;
    const results=Array.isArray(session?.merchantTradeResults)?session.merchantTradeResults:[];
    const applied=readAppliedTrades(session);
    let appliedChanged=false;
    for(const result of results){
      if(String(result?.actorClientId||"")!==String(session.clientId||""))continue;
      if(!result?.accepted){
        if(pendingTradeId&&result.tradeId===pendingTradeId){setTradeStatus(tradeError(copy,result.reason));setPendingTradeId("");}
        continue;
      }
      if(applied.has(result.tradeId)){
        if(pendingTradeId&&result.tradeId===pendingTradeId){setTradeStatus(result.kind==="sell"?copy.sold:copy.bought);setPendingTradeId("");}
        continue;
      }
      updateCharacter(form,setForm,(previous)=>{
        const caps=Math.max(0,Number(previous?.caps||0));
        if(result.kind==="sell"){
          return {...previous,caps:String(caps+Math.max(0,Number(result.price||0))),inventoryItems:removeSoldInventoryUnit(previous.inventoryItems,result.playerItemKey,result.item)};
        }
        return {...previous,caps:String(Math.max(0,caps-Math.max(0,Number(result.price||0)))),inventoryItems:appendPurchasedItem(previous.inventoryItems,result.item)};
      });
      applied.add(result.tradeId);appliedChanged=true;
      if(pendingTradeId&&result.tradeId===pendingTradeId){setTradeStatus(result.kind==="sell"?copy.sold:copy.bought);setPendingTradeId("");}
    }
    if(appliedChanged)writeAppliedTrades(session,applied);
  },[session?.merchantTradeResults,session?.clientId,canTrade,pendingTradeId,form,setForm,copy]);

  if(!session?.isActive)return null;
  const submit=(event)=>{event.preventDefault();const text=String(draft||"").trim();if(text&&session.sendChat?.(text)){setDraft("");}};
  const openBattlemap=()=>{if(!hasBattlemap)return;setOpen(false);setBattlemapRequest((value)=>value+1);};
  const openLoot=(item)=>{setLootDraft(item);setLootQuantity(String(Math.max(1,Number(item?.quantity||1))));setLootStatus("");};
  const addLoot=()=>{if(!lootDraft)return;persistLootItem(form||diceForm,setForm,{...lootDraft,quantity:String(Math.max(1,Number(lootQuantity)||1))});setLootStatus(copy.added);setLootDraft(null);};
  const openMerchant=(merchantId)=>{setSelectedMerchantId(String(merchantId||""));setTradeTab("buy");setView("merchants");setTradeStatus("");};
  const buyFromMerchant=(merchant,item)=>{
    if(!canTrade){setTradeStatus(copy.playerOnly);return;}
    if(pendingTradeId)return;
    const price=merchantBuyPrice(item),caps=Math.max(0,Number((form||readLocalForm()||{})?.caps||0));
    if(caps<price){setTradeStatus(copy.notEnoughCaps);return;}
    const tradeId=`trade-${session.clientId}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const sent=Boolean(session?.tradeWithMerchant?.({tradeId,merchantId:merchant.id,kind:"buy",stockId:item.stockId}));
    if(!sent){setTradeStatus(copy.tradeFailed);return;}
    setPendingTradeId(tradeId);setTradeStatus(copy.pending);
  };
  const sellToMerchant=(merchant,item,index,key)=>{
    if(!canTrade){setTradeStatus(copy.playerOnly);return;}
    if(pendingTradeId)return;
    if(!merchantAcceptsItem(merchant.merchantType,item)){setTradeStatus(copy.wrongType);return;}
    const price=merchantSellPrice(item);
    if(Number(merchant.caps||0)<price){setTradeStatus(copy.vendorNoCaps);return;}
    const tradeId=`trade-${session.clientId}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const soldSnapshot={...item,quantity:1};
    const sent=Boolean(session?.tradeWithMerchant?.({tradeId,merchantId:merchant.id,kind:"sell",item:soldSnapshot,playerItemKey:key||inventoryTradeKey(item,index)}));
    if(!sent){setTradeStatus(copy.tradeFailed);return;}
    setPendingTradeId(tradeId);setTradeStatus(copy.pending);
  };

  return <>
    <div className={`session-chat-drawer-shell session-utility-drawer-shell${open?" is-open":""}`}>
      <button type="button" className="session-chat-drawer-toggle session-utility-drawer-toggle" onClick={()=>setOpen((v)=>!v)} aria-expanded={open} aria-label={open?copy.close:copy.title} title={open?copy.close:copy.title}><span className="session-chat-toggle-label">{open?"×":"💬"}</span></button>
      <aside className="session-chat-drawer session-utility-drawer" aria-hidden={!open}>
        <header className="session-chat-drawer-head"><div><div className="pip-bootline">PIP 2D20 NETWORK</div><h2>[ {view==="merchants"?copy.merchants:copy.title} ]</h2></div><button type="button" className="pip-btn" onClick={()=>setOpen(false)}>{copy.close}</button></header>
        <div className="session-chat-connection-strip"><div><span className={`session-status-dot is-${session.status}`}/><strong>{copy[state]}</strong></div><span>{session.sessionCode}</span></div>
        <nav className="session-utility-tabs">
          <button type="button" className={`pip-btn${view==="chat"?" is-primary":""}`} onClick={()=>setView("chat")}>{copy.chat}</button>
          <button type="button" className={`pip-btn${view==="merchants"?" is-primary":""}`} onClick={()=>setView("merchants")}>{copy.merchants}{merchants.length?` (${merchants.length})`:""}</button>
          {session.mode==="player"?<button type="button" className="pip-btn" disabled={!hasBattlemap} onClick={openBattlemap}>{copy.battlemap}</button>:null}
          <button type="button" className="pip-btn" onClick={()=>{setOpen(false);setDiceOpen(true);}}>{copy.dice}</button>
        </nav>
        {state!=="online"&&session.reconnectNow?<button type="button" className="pip-btn is-primary" onClick={()=>session.reconnectNow()}>↻ {copy.reconnect}</button>:null}

        {view==="chat"?<>
          <div className="session-utility-body"><div ref={listRef} className="session-chat-drawer-list session-utility-list">{items.length?items.map((item)=><FeedItem key={item.id} item={item} copy={copy} language={language} onLootClick={openLoot} merchants={merchants} onOpenMerchant={openMerchant} onBuy={buyFromMerchant} canTrade={canTrade} pending={pendingTradeId}/>):<div className="pip-logbox">{copy.empty}</div>}</div></div>
          {lootDraft?<section className="session-loot-add-card"><div className="pip-bootline">{copy.lootCard}</div><strong>{lootDraft.name}</strong><div className="session-loot-add-card__stats"><span>💰 {lootDraft.cost}</span><span>⚖ {lootDraft.weight}</span><span>R{lootDraft.rarity}</span></div><label>{copy.quantity}<input className="pip-input" type="number" min="1" max="9999" value={lootQuantity} onChange={(event)=>setLootQuantity(event.target.value)}/></label><div className="session-loot-add-card__actions"><button type="button" className="pip-btn is-primary" onClick={addLoot}>{copy.addLoot}</button><button type="button" className="pip-btn" onClick={()=>setLootDraft(null)}>{copy.cancel}</button></div></section>:null}
          {lootStatus?<div className="session-loot-added-status">{lootStatus}</div>:null}
          <form className="session-chat-drawer-form" onSubmit={submit}><input className="pip-input" value={draft} maxLength={500} placeholder={copy.placeholder} onChange={(event)=>setDraft(event.target.value)}/><button type="submit" className="pip-btn is-primary" disabled={state!=="online"||!String(draft).trim()}>{copy.send}</button></form>
        </>:null}

        {view==="merchants"?<div className="session-utility-body session-merchant-body"><MerchantDirectory session={session} form={characterForm} copy={copy} language={language} selectedMerchantId={selectedMerchantId} setSelectedMerchantId={setSelectedMerchantId} tradeTab={tradeTab} setTradeTab={setTradeTab} onBuy={buyFromMerchant} onSell={sellToMerchant} pending={pendingTradeId}/>{tradeStatus?<div className="session-merchant-trade-status">{tradeStatus}</div>:null}</div>:null}
      </aside>
      {session.mode==="player"?<SessionTacticalMap session={session} openRequest={battlemapRequest}/>:null}
    </div>
    {session.mode==="host"?<TacticalSessionHud session={session}/>:null}
    <DiceRollModal isOpen={diceOpen} onClose={()=>setDiceOpen(false)} rollConfig={null} form={diceForm} pendingAutoD6={pendingAutoD6} setPendingAutoD6={setPendingAutoD6} combatState={session?.combat||null} currentLuckPoints={undefined} onSpendCombatLuck={undefined} onMarkCombatUse={undefined} onDiceResult={session?.sendDiceResult}/>
  </>;
}
