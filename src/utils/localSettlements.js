import { createSettlement, runSimulation } from './settlementState.js';
import { createSettlerProfile } from './settlementSettlerProfile.js';

export const LOCAL_SETTLEMENTS_KEY = 'pip2d20.localSettlements.v1';

function safeParse(value,fallback){
  try{return JSON.parse(value);}catch{return fallback;}
}
export function loadLocalSettlements(){
  if(typeof window==='undefined')return [];
  const raw=safeParse(window.localStorage.getItem(LOCAL_SETTLEMENTS_KEY)||'[]',[]);
  if(!Array.isArray(raw))return [];
  return raw.map(item=>runSimulation(item));
}
export function saveLocalSettlements(settlements){
  if(typeof window==='undefined')return settlements;
  window.localStorage.setItem(LOCAL_SETTLEMENTS_KEY,JSON.stringify(settlements||[]));
  window.dispatchEvent(new CustomEvent('pip2d20:local-settlements-changed'));
  return settlements;
}
export function createLocalSettlement({name,character,regionId='commonwealth',worldX=0,worldY=0}={}){
  return createSettlement({
    name,
    regionId,
    worldX,
    worldY,
    ownerCharacterId:character?._localCharacterId||character?.id||character?.characterId||null,
    leaderCharisma:Number(character?.special?.charisma ?? character?.special?.C ?? 0)||0,
  });
}
export function updateLocalSettlement(settlements,id,updater){
  const next=(settlements||[]).map(item=>item.id===id ? runSimulation(typeof updater==='function'?updater(item):updater) : item);
  saveLocalSettlements(next);
  return next;
}
export function removeLocalSettlement(settlements,id){
  const next=(settlements||[]).filter(item=>item.id!==id);
  saveLocalSettlements(next);
  return next;
}
function rankOf(character,name){
  const skill=character?.skills?.[name] || character?.skills?.[name.toLowerCase()] || null;
  return Math.max(0,Math.min(4,Number(skill?.rank ?? skill ?? 0)||0));
}
function importedPerks(character){
  const names=(character?.perksAndTraits||character?.perks||[]).map(item=>String(item?.name||item?.id||item||'').toLowerCase());
  const result=[];
  if(names.some(v=>v.includes('scrap')))result.push('scrapper');
  if(names.some(v=>v.includes('hunter')))result.push('hunter');
  if(names.some(v=>v.includes('medic')))result.push('medic');
  if(names.some(v=>v.includes('trade')||v.includes('barter')))result.push('trader');
  if(names.some(v=>v.includes('repair')||v.includes('mechanic')))result.push('mechanic');
  return [...new Set(result)].slice(0,2);
}
export function characterToSettlementNpc(character){
  const fallback=createSettlerProfile();
  const skills={
    Repair:{rank:rankOf(character,'Repair')},
    Science:{rank:rankOf(character,'Science')},
    Medicine:{rank:rankOf(character,'Medicine')},
    Survival:{rank:rankOf(character,'Survival')},
    Barter:{rank:rankOf(character,'Barter')},
    'Small Guns':{rank:rankOf(character,'Small Guns')},
  };
  const hasAny=Object.values(skills).some(skill=>skill.rank>0);
  const perks=importedPerks(character);
  return {
    id:`guest_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    name:String(character?.name||character?.characterName||'Guest character').trim().slice(0,80)||'Guest character',
    role:'guest_npc',
    guestNpc:true,
    sourceCharacterName:String(character?.name||character?.characterName||''),
    assignedBuildingId:null,
    settlementAction:null,
    health:100,
    status:'idle',
    specialty:hasAny ? Object.entries(skills).sort((a,b)=>b[1].rank-a[1].rank)[0][0] : fallback.specialty,
    skills:hasAny?skills:fallback.skills,
    perks:perks.length?perks:fallback.perks,
    level:Math.max(1,Number(character?.level||1)||1),
    experience:0,
    advancementPoints:0,
    importedAt:Date.now(),
  };
}
export function addNpcToLocalSettlement(settlement,character){
  const npc=characterToSettlementNpc(character);
  const settlers=[...(settlement.settlers||[]),npc];
  return runSimulation({
    ...settlement,
    settlers,
    attributes:{...(settlement.attributes||{}),people:settlers.length},
    resources:{...(settlement.resources||{}),population:settlers.length},
    events:[{id:`guest_joined_${Date.now()}`,type:'guest_npc_joined',settlerId:npc.id,settlerName:npc.name,createdAt:Date.now()},...(settlement.events||[])].slice(0,100),
  });
}
