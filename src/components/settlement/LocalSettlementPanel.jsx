import React, { useEffect, useRef, useState } from 'react';
import SettlementScreen from './SettlementScreen.jsx';
import { addNpcToLocalSettlement, createLocalSettlement, loadLocalSettlements, removeGuestNpcFromLocalSettlement, removeLocalSettlement, saveLocalSettlements, updateLocalSettlement } from '../../utils/localSettlements.js';

const COPY={
  en:{title:'LOCAL SETTLEMENTS',offline:'Stored only on this device. No campaign or server connection is used.',name:'Settlement name',found:'FOUND SETTLEMENT',empty:'No local settlement yet.',open:'OPEN',remove:'DELETE',importNpc:'ADD PLAYER CHARACTER AS NPC',importHint:'Import another player character JSON. A local NPC copy will be created; it will not stay linked to that player.',imported:'NPC added',badFile:'Could not import character file.',guest:'Guest NPCs'},
  ru:{title:'ЛОКАЛЬНЫЕ ПОСЕЛЕНИЯ',offline:'Хранятся только на этом устройстве. Кампания и сервер не используются.',name:'Название поселения',found:'ОСНОВАТЬ ПОСЕЛЕНИЕ',empty:'Локальных поселений пока нет.',open:'ОТКРЫТЬ',remove:'УДАЛИТЬ',importNpc:'ДОБАВИТЬ ПЕРСОНАЖА ИГРОКА КАК NPC',importHint:'Импортируйте JSON персонажа другого игрока. Будет создана локальная копия NPC без дальнейшей сетевой связи с игроком.',imported:'NPC добавлен',badFile:'Не удалось импортировать файл персонажа.',guest:'Гостевые NPC'},
  uk:{title:'ЛОКАЛЬНІ ПОСЕЛЕННЯ',offline:'Зберігаються лише на цьому пристрої. Кампанія та сервер не використовуються.',name:'Назва поселення',found:'ЗАСНУВАТИ ПОСЕЛЕННЯ',empty:'Локальних поселень ще немає.',open:'ВІДКРИТИ',remove:'ВИДАЛИТИ',importNpc:'ДОДАТИ ПЕРСОНАЖА ГРАВЦЯ ЯК NPC',importHint:'Імпортуйте JSON персонажа іншого гравця. Буде створено локальну копію NPC без подальшого мережевого зв’язку.',imported:'NPC додано',badFile:'Не вдалося імпортувати файл персонажа.',guest:'Гостьові NPC'},
  pl:{title:'LOKALNE OSADY',offline:'Zapisywane wyłącznie na tym urządzeniu. Kampania ani serwer nie są używane.',name:'Nazwa osady',found:'ZAŁÓŻ OSADĘ',empty:'Brak lokalnej osady.',open:'OTWÓRZ',remove:'USUŃ',importNpc:'DODAJ POSTAĆ GRACZA JAKO NPC',importHint:'Zaimportuj JSON postaci innego gracza. Powstanie lokalna kopia NPC bez dalszego połączenia sieciowego.',imported:'NPC dodany',badFile:'Nie udało się zaimportować pliku postaci.',guest:'Gościnni NPC'},
};

export default function LocalSettlementPanel({character,setCharacter,language='en'}){
  const key=String(language||'en').split('-')[0],text=COPY[key]||COPY.en;
  const [settlements,setSettlements]=useState(()=>loadLocalSettlements());
  const [activeId,setActiveId]=useState(null);
  const [name,setName]=useState('');
  const [message,setMessage]=useState('');
  const [importTargetId,setImportTargetId]=useState(null);
  const inputRef=useRef(null);
  useEffect(()=>{const refresh=()=>setSettlements(loadLocalSettlements());window.addEventListener('pip2d20:local-settlements-changed',refresh);return()=>window.removeEventListener('pip2d20:local-settlements-changed',refresh);},[]);
  const active=settlements.find(item=>item.id===activeId)||null;
  function found(event){
    event.preventDefault();
    const settlement=createLocalSettlement({name:name.trim(),character});
    const next=[...settlements,settlement];
    saveLocalSettlements(next);setSettlements(next);setActiveId(settlement.id);setName('');
  }
  function updateActive(updater){
    if(!active)return;
    const next=updateLocalSettlement(settlements,active.id,updater);
    setSettlements(next);
  }
  function remove(id){
    const next=removeLocalSettlement(settlements,id);setSettlements(next);if(activeId===id)setActiveId(null);
  }
  async function importNpc(event){
    const file=event.target.files?.[0];event.target.value='';
    const targetId=importTargetId;setImportTargetId(null);
    if(!file||!targetId)return;
    try{
      const parsed=JSON.parse(await file.text());
      const characterData=parsed?.character||parsed?.data||parsed;
      const next=updateLocalSettlement(settlements,targetId,current=>addNpcToLocalSettlement(current,characterData));
      setSettlements(next);setMessage(text.imported);
    }catch{setMessage(text.badFile);}
  }
  if(active)return <SettlementScreen settlement={active} ownerCharacter={character} setOwnerCharacter={setCharacter} onUpdate={updateActive} onBack={()=>setActiveId(null)} canEdit onRemoveGuestNpc={workerId=>updateActive(current=>removeGuestNpcFromLocalSettlement(current,workerId))}/>;
  return <section className="pip-panel local-settlement-panel">
    <h2>{text.title}</h2><p>{text.offline}</p>
    <form className="campaign-world-found" onSubmit={found}><label>{text.name}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="pip-btn is-primary" disabled={!name.trim()}>{text.found}</button></form>
    {!settlements.length&&<p>{text.empty}</p>}
    <input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={importNpc}/>
    <div className="campaign-world-settlements">{settlements.map(s=><div key={s.id} className="pip-panel">
      <strong>⌂ {s.name}</strong><small>{s.settlers?.length||0} NPC · {text.guest}: {(s.settlers||[]).filter(x=>x.guestNpc).length}</small>
      <div><button type="button" className="pip-btn" onClick={()=>setActiveId(s.id)}>{text.open}</button><button type="button" className="pip-btn" onClick={()=>{setImportTargetId(s.id);requestAnimationFrame(()=>inputRef.current?.click());}}>{text.importNpc}</button><button type="button" className="pip-btn" onClick={()=>remove(s.id)}>{text.remove}</button></div>
    </div>)}</div>
    {!!settlements.length&&<p>{text.importHint}</p>}
    {message&&<p role="status">{message}</p>}
  </section>;
}
