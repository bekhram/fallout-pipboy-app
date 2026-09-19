import React,{useCallback,useEffect,useRef,useState} from 'react';
import { useTranslation } from 'react-i18next';
import SettlementScreen from './SettlementScreen.jsx';
import { offlineSettlementStore,subscribeOfflineSettlements } from '../../utils/offlineSettlementStore.js';
import './offlineSettlement.css';

const COPY={
  en:{title:'OFFLINE SETTLEMENTS',offline:'LOCAL DEVICE · NO CLOUD',desc:'Settlement progress is stored only on this device. No campaign, Google sign-in, Firestore, or sync is required.',new:'NEW SETTLEMENT',name:'Settlement name',create:'CREATE',open:'OPEN',day:'Day',people:'Residents',delete:'DELETE',empty:'No local settlements yet.',back:'BACK TO MAP',error:'Local settlement storage is unavailable.',confirm:'Delete this local settlement from this device?'},
  ru:{title:'ОФЛАЙН ПОСЕЛЕНИЯ',offline:'ТОЛЬКО УСТРОЙСТВО · БЕЗ ОБЛАКА',desc:'Развитие поселения хранится только на этом устройстве. Кампания, Google, Firestore и синхронизация не нужны.',new:'НОВОЕ ПОСЕЛЕНИЕ',name:'Название поселения',create:'СОЗДАТЬ',open:'ОТКРЫТЬ',day:'День',people:'Жители',delete:'УДАЛИТЬ',empty:'Локальных поселений пока нет.',back:'НАЗАД К КАРТЕ',error:'Локальное хранилище поселений недоступно.',confirm:'Удалить это локальное поселение с устройства?'},
  uk:{title:'ОФЛАЙН ПОСЕЛЕННЯ',offline:'ЛИШЕ ПРИСТРІЙ · БЕЗ ХМАРИ',desc:'Розвиток поселення зберігається лише на цьому пристрої. Кампанія, Google, Firestore і синхронізація не потрібні.',new:'НОВЕ ПОСЕЛЕННЯ',name:'Назва поселення',create:'СТВОРИТИ',open:'ВІДКРИТИ',day:'День',people:'Жителі',delete:'ВИДАЛИТИ',empty:'Локальних поселень ще немає.',back:'НАЗАД ДО МАПИ',error:'Локальне сховище поселень недоступне.',confirm:'Видалити це локальне поселення з пристрою?'},
  pl:{title:'OSADY OFFLINE',offline:'TYLKO URZĄDZENIE · BEZ CHMURY',desc:'Rozwój osady jest zapisywany wyłącznie na tym urządzeniu. Kampania, Google, Firestore i synchronizacja nie są potrzebne.',new:'NOWA OSADA',name:'Nazwa osady',create:'UTWÓRZ',open:'OTWÓRZ',day:'Dzień',people:'Mieszkańcy',delete:'USUŃ',empty:'Brak lokalnych osad.',back:'WRÓĆ DO MAPY',error:'Lokalny zapis osad jest niedostępny.',confirm:'Usunąć tę lokalną osadę z urządzenia?'},
};

export default function OfflineSettlementHub({onBack,character}){
  const {i18n}=useTranslation();
  const language=String(i18n.resolvedLanguage||i18n.language||'en').split('-')[0];
  const text=COPY[language]||COPY.en;
  const [items,setItems]=useState([]);
  const [active,setActive]=useState(null);
  const [name,setName]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const saveChain=useRef(Promise.resolve());

  const refresh=useCallback(async()=>{
    try{setItems(await offlineSettlementStore.list());setError('');}
    catch{setError(text.error);}
  },[text.error]);

  useEffect(()=>{
    let cancelled=false;
    void refresh();
    const unsubscribe=subscribeOfflineSettlements(()=>{if(!cancelled)void refresh();});
    return()=>{cancelled=true;unsubscribe();};
  },[refresh]);

  useEffect(()=>{
    if(!active)return;
    let cancelled=false;
    const advance=async()=>{
      try{
        const next=await offlineSettlementStore.advance(active.id,Date.now());
        if(!cancelled&&next)setActive(next);
      }catch{if(!cancelled)setError(text.error);}
    };
    const visible=()=>{if(document.visibilityState==='visible')void advance();};
    window.addEventListener('focus',visible);
    document.addEventListener('visibilitychange',visible);
    const timer=window.setInterval(advance,60000);
    return()=>{cancelled=true;window.clearInterval(timer);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
  },[active?.id,text.error]);

  function updateActive(update){
    setActive(current=>{
      if(!current)return current;
      const next=typeof update==='function'?update(current):update;
      saveChain.current=saveChain.current.then(()=>offlineSettlementStore.save(next)).catch(()=>setError(text.error));
      return next;
    });
  }

  async function create(event){
    event.preventDefault();
    if(busy||!name.trim())return;
    setBusy(true);setError('');
    try{
      const leaderCharisma=Math.max(0,Math.min(10,Number(character?.special?.charisma || character?.special?.CHA || 0)));
      const created=await offlineSettlementStore.create({name:name.trim(),leaderCharisma});
      setName('');setActive(created);
    }catch{setError(text.error);}
    finally{setBusy(false);}
  }

  async function open(id){
    setBusy(true);setError('');
    try{setActive(await offlineSettlementStore.get(id));}
    catch{setError(text.error);}
    finally{setBusy(false);}
  }

  async function remove(id){
    if(typeof window!=='undefined'&&!window.confirm(text.confirm))return;
    setBusy(true);
    try{await offlineSettlementStore.remove(id);if(active?.id===id)setActive(null);await refresh();}
    catch{setError(text.error);}
    finally{setBusy(false);}
  }

  if(active)return <SettlementScreen settlement={active} character={character} onUpdate={updateActive} onBack={()=>{setActive(null);void refresh();}} canEdit />;

  return <section className="offline-settlement-hub">
    <header><div><small>{text.offline}</small><h2>⌂ {text.title}</h2><p>{text.desc}</p></div><button type="button" className="pip-action-button" onClick={onBack}>← {text.back}</button></header>
    {error&&<p className="offline-settlement-error" role="alert">{error}</p>}
    <form className="offline-settlement-create pip-panel" onSubmit={create}>
      <strong>{text.new}</strong>
      <input className="pip-input" maxLength={80} placeholder={text.name} value={name} onChange={event=>setName(event.target.value)}/>
      <button className="pip-action-button settlement-primary" disabled={busy||!name.trim()}>{text.create}</button>
    </form>
    <div className="offline-settlement-list">
      {!items.length&&!busy&&<div className="pip-panel offline-settlement-empty">{text.empty}</div>}
      {items.map(item=><article className="pip-panel offline-settlement-row" key={item.id}>
        <div><strong>{item.name}</strong><small>{text.day} {item.settlementDay||1} · {text.people} {(item.settlers||[]).length}</small></div>
        <button type="button" className="pip-action-button settlement-primary" disabled={busy} onClick={()=>void open(item.id)}>{text.open}</button>
        <button type="button" className="pip-action-button settlement-danger" disabled={busy} onClick={()=>void remove(item.id)}>{text.delete}</button>
      </article>)}
    </div>
  </section>;
}
