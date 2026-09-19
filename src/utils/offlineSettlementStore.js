import { createSettlement, runSimulation } from './settlementState.js';
import { populationNeeds } from './settlementResidents.js';

const DB_NAME='pip2d20-offline-settlements-v1';
const STORE='settlements';
export const OFFLINE_SETTLEMENT_EVENT='pip2d20:offline-settlements-changed';

let opening,channel;

function announce(id=''){
  const detail={id};
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(OFFLINE_SETTLEMENT_EVENT,{detail}));
  try{
    if(!channel&&typeof BroadcastChannel!=='undefined'){
      channel=new BroadcastChannel(DB_NAME);
      channel.onmessage=event=>{if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(OFFLINE_SETTLEMENT_EVENT,{detail:event.data}));};
    }
    channel?.postMessage(detail);
  }catch{/* visibility refresh remains enough */}
}

function database(){
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));return;}
    const request=indexedDB.open(DB_NAME,1);
    let settled=false;
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
    };
    request.onblocked=()=>{settled=true;reject(new Error('LOCAL_STORAGE_BLOCKED'));};
    request.onerror=()=>{settled=true;reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));};
    request.onsuccess=()=>{
      const db=request.result;
      if(settled){db.close();return;}
      db.onversionchange=()=>{db.close();opening=null;};
      resolve(db);
    };
  }).catch(error=>{opening=null;throw error;});
  return opening;
}

async function transaction(mode,work){
  const db=await database();
  return new Promise((resolve,reject)=>{
    let tx,answer,ownError;
    try{tx=db.transaction(STORE,mode,{durability:'strict'});}catch{tx=db.transaction(STORE,mode);}
    const store=tx.objectStore(STORE);
    try{answer=work(store,tx);}catch(error){ownError=error;tx.abort();}
    tx.oncomplete=()=>resolve(answer?.result!==undefined?structuredClone(answer.result):answer);
    tx.onabort=()=>reject(ownError||new Error(tx.error?.name==='QuotaExceededError'?'LOCAL_STORAGE_FULL':'LOCAL_STORAGE_UNAVAILABLE'));
    tx.onerror=()=>{};
  });
}

export function offlineSettlementData(input,now=Date.now()){
  const {campaignId,access,ownerCharacterId,...rest}=input||{};
  const settlement=runSimulation({
    ...rest,
    ownerCharacterId:null,
    ownership:{type:'local_device'},
    offlineStandalone:true,
    localOnly:true,
  },now);
  const reputation={...(settlement.reputation||{}),player:Math.max(0,Math.min(5,Number(settlement.reputation?.player ?? 3)))};
  return {...settlement,ownerCharacterId:null,ownership:{type:'local_device'},reputation,offlineStandalone:true,localOnly:true,offlineUpdatedAt:now};
}

export function createOfflineSettlementData({name='Local Settlement',regionId='commonwealth',worldX=12,worldY=12,leaderCharisma=0}={},now=Date.now()){
  const created=createSettlement({name,regionId,worldX,worldY,ownerCharacterId:null,leaderCharisma});
  return offlineSettlementData(created,now);
}

function requestResult(request,tx){
  const holder={result:null};
  request.onsuccess=()=>{holder.result=request.result;};
  request.onerror=()=>tx.abort();
  return holder;
}

export const offlineSettlementStore={
  async list(){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).getAll();
      request.onsuccess=()=>resolve((request.result||[]).sort((a,b)=>Number(b.offlineUpdatedAt||b.createdAt||0)-Number(a.offlineUpdatedAt||a.createdAt||0)));
      request.onerror=()=>reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));
    });
  },
  async get(id,now=Date.now()){
    if(!id)return null;
    const db=await database();
    return new Promise((resolve,reject)=>{
      let result,ownError;
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),request=store.get(id);
      request.onsuccess=()=>{
        try{
          if(!request.result){result=null;return;}
          result=offlineSettlementData(request.result,now);
          store.put(result);
        }catch(error){ownError=error;tx.abort();}
      };
      tx.oncomplete=()=>resolve(result?structuredClone(result):null);
      tx.onabort=()=>reject(ownError||new Error('LOCAL_STORAGE_UNAVAILABLE'));
      tx.onerror=()=>{};
    });
  },
  async save(settlement,now=Date.now()){
    const next={...offlineSettlementData({...settlement,offlineUpdatedAt:now},now),offlineUpdatedAt:now};
    const db=await database();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(next);
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(new Error(tx.error?.name==='QuotaExceededError'?'LOCAL_STORAGE_FULL':'LOCAL_STORAGE_UNAVAILABLE'));
      tx.onerror=()=>{};
    });
    announce(next.id);
    return structuredClone(next);
  },
  async create(options={}){
    const settlement=createOfflineSettlementData(options);
    return this.save(settlement);
  },
  async remove(id){
    const db=await database();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(new Error('LOCAL_STORAGE_UNAVAILABLE'));
      tx.onerror=()=>{};
    });
    announce(id);
  },
  async advance(id,now=Date.now()){return this.get(id,now);},
  async linkSupplyLine(sourceId,targetId,workerId,now=Date.now()){
    if(!sourceId||!targetId||sourceId===targetId)throw new Error('INVALID_SUPPLY_LINE');
    const db=await database();
    let sourceResult,targetResult,ownError;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
      const a=store.get(sourceId),b=store.get(targetId);
      let source,target,ready=0;
      const finish=()=>{
        if(++ready<2)return;
        try{
          source=offlineSettlementData(source,now);target=offlineSettlementData(target,now);
          if(!source||!target)throw new Error('NOT_FOUND');
          const leaderRank=Math.max(Number(source.leaderRuleProfile?.localLeaderRank||0),Number(target.leaderRuleProfile?.localLeaderRank||0));
          if(leaderRank<1)throw new Error('LOCAL_LEADER_REQUIRED');
          if(Number(source.reputation?.player||0)<3||Number(target.reputation?.player||0)<3)throw new Error('FRIENDLY_REPUTATION_REQUIRED');
          const worker=(source.settlers||[]).find(item=>item.id===workerId);
          if(!worker||worker.settlementAction?.type)throw new Error('SETTLER_NOT_AVAILABLE');
          const existing=(source.supplyLines||[]).find(line=>line.otherSettlementId===target.id);
          if(existing)throw new Error('SUPPLY_LINE_EXISTS');
          const lineId=`supply_${[source.id,target.id].sort().join('_')}`;
          const sourceLine={id:lineId,otherSettlementId:target.id,sourceSettlementId:source.id,targetSettlementId:target.id,provisionerId:worker.id,createdAt:now};
          const targetLine={...sourceLine,otherSettlementId:source.id};
          source={...source,supplyLines:[...(source.supplyLines||[]),sourceLine],settlers:(source.settlers||[]).map(item=>item.id===worker.id?{...item,settlementAction:{type:'supply_line',targetSettlementId:target.id},assignedBuildingId:null,status:'working'}:item),offlineUpdatedAt:now};
          target={...target,supplyLines:[...(target.supplyLines||[]),targetLine],offlineUpdatedAt:now};
          store.put(source);store.put(target);sourceResult=source;targetResult=target;
        }catch(error){ownError=error;tx.abort();}
      };
      a.onsuccess=()=>{source=a.result;finish();};b.onsuccess=()=>{target=b.result;finish();};
      a.onerror=b.onerror=()=>tx.abort();
      tx.oncomplete=resolve;tx.onabort=()=>reject(ownError||new Error('LOCAL_STORAGE_UNAVAILABLE'));tx.onerror=()=>{};
    });
    announce(sourceId);announce(targetId);
    return {source:structuredClone(sourceResult),target:structuredClone(targetResult)};
  },
  async transferSupply(sourceId,targetId,amounts={},now=Date.now()){
    if(!sourceId||!targetId||sourceId===targetId)throw new Error('INVALID_SUPPLY_LINE');
    const keys=['caps','common','uncommon','rare','food','water'];
    const transfer=Object.fromEntries(keys.map(key=>[key,Math.max(0,Math.floor(Number(amounts[key])||0))]));
    if(!keys.some(key=>transfer[key]>0))throw new Error('INVALID_RESOURCE_AMOUNT');
    const db=await database();
    let sourceResult,targetResult,ownError;
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),a=store.get(sourceId),b=store.get(targetId);
      let source,target,ready=0;
      const finish=()=>{
        if(++ready<2)return;
        try{
          source=offlineSettlementData(source,now);target=offlineSettlementData(target,now);
          if(!source||!target)throw new Error('NOT_FOUND');
          if(!(source.supplyLines||[]).some(line=>line.otherSettlementId===target.id))throw new Error('SUPPLY_LINE_REQUIRED');
          const happy=s=>Number(s.attributes?.happiness||0)>populationNeeds(s);
          if(!happy(source)||!happy(target))throw new Error('SUPPLY_LINE_UNHAPPY');
          const sm={common:Number(source.stockpile?.materials?.common||0),uncommon:Number(source.stockpile?.materials?.uncommon||0),rare:Number(source.stockpile?.materials?.rare||0)};
          const tm={common:Number(target.stockpile?.materials?.common||0),uncommon:Number(target.stockpile?.materials?.uncommon||0),rare:Number(target.stockpile?.materials?.rare||0)};
          const sp={food:Number(source.stockpile?.provisions?.food||0),water:Number(source.stockpile?.provisions?.water||0)};
          const tp={food:Number(target.stockpile?.provisions?.food||0),water:Number(target.stockpile?.provisions?.water||0)};
          if(transfer.caps>Number(source.resources?.caps||0)||['common','uncommon','rare'].some(key=>transfer[key]>sm[key])||['food','water'].some(key=>transfer[key]>sp[key]))throw new Error('INSUFFICIENT_RESOURCE');
          for(const key of ['common','uncommon','rare']){sm[key]-=transfer[key];tm[key]+=transfer[key];}
          for(const key of ['food','water']){sp[key]-=transfer[key];tp[key]+=transfer[key];}
          source={...source,resources:{...(source.resources||{}),caps:Number(source.resources?.caps||0)-transfer.caps,materials:sm.common},stockpile:{...(source.stockpile||{}),materials:sm,provisions:sp},offlineUpdatedAt:now};
          target={...target,resources:{...(target.resources||{}),caps:Number(target.resources?.caps||0)+transfer.caps,materials:tm.common},stockpile:{...(target.stockpile||{}),materials:tm,provisions:tp},offlineUpdatedAt:now};
          store.put(source);store.put(target);sourceResult=source;targetResult=target;
        }catch(error){ownError=error;tx.abort();}
      };
      a.onsuccess=()=>{source=a.result;finish();};b.onsuccess=()=>{target=b.result;finish();};
      a.onerror=b.onerror=()=>tx.abort();
      tx.oncomplete=resolve;tx.onabort=()=>reject(ownError||new Error('LOCAL_STORAGE_UNAVAILABLE'));tx.onerror=()=>{};
    });
    announce(sourceId);announce(targetId);
    return {source:structuredClone(sourceResult),target:structuredClone(targetResult)};
  },
};

export function subscribeOfflineSettlements(listener){
  try{
    if(!channel&&typeof BroadcastChannel!=='undefined'){
      channel=new BroadcastChannel(DB_NAME);
      channel.onmessage=e=>window.dispatchEvent(new CustomEvent(OFFLINE_SETTLEMENT_EVENT,{detail:e.data}));
    }
  }catch{}
  window.addEventListener(OFFLINE_SETTLEMENT_EVENT,listener);
  return()=>window.removeEventListener(OFFLINE_SETTLEMENT_EVENT,listener);
}
