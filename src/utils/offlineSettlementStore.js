import { createSettlement, runSimulation } from './settlementState.js';

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
  return {...settlement,ownerCharacterId:null,ownership:{type:'local_device'},offlineStandalone:true,localOnly:true,offlineUpdatedAt:now};
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
