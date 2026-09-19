import React,{useEffect,useMemo,useState} from 'react';
import { offlineSettlementStore } from '../../utils/offlineSettlementStore.js';
import { populationNeeds } from '../../utils/settlementResidents.js';

const COPY={
  en:{title:'SUPPLY LINES',perk:'Local Leader 1 required',target:'Linked settlement',worker:'Provisioner',connect:'CONNECT',disconnect:'DISCONNECT',resource:'Resource',amount:'Amount',send:'SEND',pull:'PULL',friendly:'Friendly',happy:'Happiness must exceed People in both settlements',none:'No supply lines yet.',caps:'Caps',common:'Common',uncommon:'Uncommon',rare:'Rare',food:'Food',water:'Water'},
  ru:{title:'ЛИНИИ СНАБЖЕНИЯ',perk:'Требуется Local Leader 1',target:'Поселение',worker:'Снабженец',connect:'СВЯЗАТЬ',disconnect:'РАЗОРВАТЬ',resource:'Ресурс',amount:'Количество',send:'ОТПРАВИТЬ',pull:'ЗАБРАТЬ',friendly:'Дружелюбие',happy:'Счастье должно быть выше числа жителей в обоих поселениях',none:'Линий снабжения пока нет.',caps:'Крышки',common:'Обычные',uncommon:'Необычные',rare:'Редкие',food:'Еда',water:'Вода'},
  uk:{title:'ЛІНІЇ ПОСТАЧАННЯ',perk:'Потрібен Local Leader 1',target:'Поселення',worker:'Постачальник',connect:'З’ЄДНАТИ',disconnect:'РОЗІРВАТИ',resource:'Ресурс',amount:'Кількість',send:'НАДІСЛАТИ',pull:'ЗАБРАТИ',friendly:'Дружність',happy:'Щастя має бути вищим за кількість жителів в обох поселеннях',none:'Ліній постачання ще немає.',caps:'Кришки',common:'Звичайні',uncommon:'Незвичайні',rare:'Рідкісні',food:'Їжа',water:'Вода'},
  pl:{title:'LINIE ZAOPATRZENIA',perk:'Wymaga Local Leader 1',target:'Osada',worker:'Zaopatrzeniowiec',connect:'POŁĄCZ',disconnect:'ROZŁĄCZ',resource:'Zasób',amount:'Ilość',send:'WYŚLIJ',pull:'POBIERZ',friendly:'Przyjazna',happy:'Szczęście musi być wyższe niż liczba mieszkańców w obu osadach',none:'Brak linii zaopatrzenia.',caps:'Kapsle',common:'Pospolite',uncommon:'Niepospolite',rare:'Rzadkie',food:'Żywność',water:'Woda'},
};
const KEYS=['caps','common','uncommon','rare','food','water'];

export default function OfflineSupplyLines({active,settlements,language,onActiveChange,onRefresh}){
  const t=COPY[language]||COPY.en;
  const others=(settlements||[]).filter(item=>item.id!==active.id);
  const lines=active.supplyLines||[];
  const [targetId,setTargetId]=useState('');
  const [workerId,setWorkerId]=useState('');
  const [resource,setResource]=useState('common');
  const [amount,setAmount]=useState(1);
  const [lineTarget,setLineTarget]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const localLeaderRank=Number(active.leaderRuleProfile?.localLeaderRank||active.leader?.localLeaderRank||0);
  const freeWorkers=(active.settlers||[]).filter(worker=>!worker.settlementAction?.type);
  const linkedIds=new Set(lines.map(line=>line.otherSettlementId));
  const availableTargets=others.filter(item=>!linkedIds.has(item.id));
  const linked=others.filter(item=>linkedIds.has(item.id));
  useEffect(()=>{if(!targetId&&availableTargets[0])setTargetId(availableTargets[0].id);},[availableTargets.map(item=>item.id).join('|')]);
  useEffect(()=>{if(!workerId&&freeWorkers[0])setWorkerId(freeWorkers[0].id);},[freeWorkers.map(item=>item.id).join('|')]);
  useEffect(()=>{if(!lineTarget&&linked[0])setLineTarget(linked[0].id);},[linked.map(item=>item.id).join('|')]);

  const selectedOther=useMemo(()=>others.find(item=>item.id===lineTarget)||null,[others,lineTarget]);
  const happy=settlement=>Number(settlement?.attributes?.happiness||0)>populationNeeds(settlement);

  async function link(){
    if(busy||!targetId||!workerId)return;
    setBusy(true);setError('');
    try{
      const result=await offlineSettlementStore.linkSupplyLine(active.id,targetId,workerId);
      onActiveChange?.(result.source);
      await onRefresh?.();
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function unlink(otherId){
    if(busy)return;
    setBusy(true);setError('');
    try{
      const result=await offlineSettlementStore.unlinkSupplyLine(active.id,otherId);
      onActiveChange?.(result.first);
      await onRefresh?.();
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }
  async function transfer(direction){
    if(busy||!lineTarget)return;
    const n=Math.max(1,Math.floor(Number(amount)||1)),payload={[resource]:n};
    const source=direction==='send'?active.id:lineTarget,target=direction==='send'?lineTarget:active.id;
    setBusy(true);setError('');
    try{
      const result=await offlineSettlementStore.transferSupply(source,target,payload);
      onActiveChange?.(direction==='send'?result.source:result.target);
      await onRefresh?.();
    }catch(e){setError(e.message);}
    finally{setBusy(false);}
  }

  if(!others.length&&!lines.length)return null;
  return <section className="offline-supply-lines pip-panel">
    <div className="pip-panel-title">{t.title}</div>
    <small>{t.friendly}: {active.reputation?.player ?? 3}/5 · {localLeaderRank<1?t.perk:t.happy}</small>
    {error&&<small role="alert">{error}</small>}
    {localLeaderRank>=1&&availableTargets.length>0&&<div className="offline-supply-connect">
      <select className="pip-input" value={targetId} onChange={e=>setTargetId(e.target.value)}>{availableTargets.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="pip-input" value={workerId} onChange={e=>setWorkerId(e.target.value)}>{freeWorkers.map(worker=><option key={worker.id} value={worker.id}>{worker.name}</option>)}</select>
      <button type="button" className="pip-action-button" disabled={busy||!targetId||!workerId||!freeWorkers.length} onClick={()=>void link()}>{t.connect}</button>
    </div>}
    {!lines.length&&<small>{t.none}</small>}
    {lines.map(line=>{const other=others.find(item=>item.id===line.otherSettlementId);return <div className="offline-supply-line" key={line.id}>
      <span><strong>{other?.name||line.otherSettlementId}</strong><small>{line.provisionerId}</small></span>
      <button type="button" className="pip-action-button settlement-danger" disabled={busy} onClick={()=>void unlink(line.otherSettlementId)}>{t.disconnect}</button>
    </div>})}
    {!!linked.length&&<div className="offline-supply-transfer">
      <select className="pip-input" value={lineTarget} onChange={e=>setLineTarget(e.target.value)}>{linked.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="pip-input" value={resource} onChange={e=>setResource(e.target.value)}>{KEYS.map(key=><option value={key} key={key}>{t[key]}</option>)}</select>
      <input className="pip-input" type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)}/>
      <button type="button" className="pip-action-button" disabled={busy||!happy(active)||!happy(selectedOther)} onClick={()=>void transfer('send')}>{t.send}</button>
      <button type="button" className="pip-action-button" disabled={busy||!happy(active)||!happy(selectedOther)} onClick={()=>void transfer('pull')}>{t.pull}</button>
    </div>}
  </section>;
}
