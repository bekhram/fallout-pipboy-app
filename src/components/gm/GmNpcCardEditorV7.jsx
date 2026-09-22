import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CUSTOM_CREATURES_CHANGED_EVENT,
  blankCreature,
  deleteCustomCreature,
  loadCustomCreatures,
  saveCustomCreature,
} from "../../utils/gmCreatureLibrary.js";
import {
  NPC_RANKS,
  applyNpcRank,
  normalizeStructuredAttack,
  normalizeWeaponAttack,
} from "../../utils/npcCombat.js";
import { loadNpcWeaponDatabase } from "../../utils/npcWeaponDatabase.js";
import { findFreePlacement } from "../../utils/gmSessionModel.js";
import "./gmNpcCardEditorV7.css";

const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];
const COPY = {
  en: { title:"CREATE NPC", npc:"NPC", creature:"CREATURE", saved:"SAVED CARD", newCard:"NEW CARD", del:"DELETE", save:"SAVE CHANGES", addMap:"ADD TO MAP", name:"NAME", type:"TYPE", level:"LVL", size:"SIZE", rank:"RANK", horde:"HORDE", members:"MEMBERS", hp:"HP", def:"DEF", xp:"XP", init:"INIT", special:"S.P.E.C.I.A.L.", creatureStats:"CREATURE STATS", attacks:"CUSTOM ATTACKS", addAttack:"ADD ATTACK", attackName:"Attack name", skill:"Skill", damageType:"Damage type", range:"Range", effects:"Effects", weapons:"WEAPONS", chooseWeapon:"Choose weapon", addWeapon:"ADD WEAPON", rof:"ROF", empty:"Nothing added yet", savedOk:"Card saved", added:"Token added to the selected scene", failed:"Could not add token", noScene:"Select a scene first", noSpace:"Not enough free space", required:"Enter a name first" },
  ru: { title:"СОЗДАТЬ NPC", npc:"NPC", creature:"СУЩЕСТВО", saved:"СОХРАНЁННАЯ КАРТОЧКА", newCard:"НОВАЯ КАРТОЧКА", del:"УДАЛИТЬ", save:"СОХРАНИТЬ ИЗМЕНЕНИЯ", addMap:"ДОБАВИТЬ НА КАРТУ", name:"ИМЯ", type:"ТИП", level:"LVL", size:"РАЗМЕР", rank:"РАНГ", horde:"ТОЛПА", members:"УЧАСТНИКОВ", hp:"HP", def:"ЗАЩИТА", xp:"XP", init:"ИНИЦИАТИВА", special:"S.P.E.C.I.A.L.", creatureStats:"ПАРАМЕТРЫ СУЩЕСТВА", attacks:"СВОИ АТАКИ", addAttack:"ДОБАВИТЬ АТАКУ", attackName:"Название атаки", skill:"Навык", damageType:"Тип урона", range:"Дистанция", effects:"Эффекты", weapons:"ОРУЖИЕ", chooseWeapon:"Выбрать оружие", addWeapon:"ДОБАВИТЬ ОРУЖИЕ", rof:"СКОРОСТРЕЛЬНОСТЬ", empty:"Пока ничего не добавлено", savedOk:"Карточка сохранена", added:"Токен добавлен на выбранную сцену", failed:"Не удалось добавить токен", noScene:"Сначала выберите сцену", noSpace:"Недостаточно свободного места", required:"Сначала укажите имя" },
  uk: { title:"СТВОРИТИ NPC", npc:"NPC", creature:"ІСТОТА", saved:"ЗБЕРЕЖЕНА КАРТКА", newCard:"НОВА КАРТКА", del:"ВИДАЛИТИ", save:"ЗБЕРЕГТИ ЗМІНИ", addMap:"ДОДАТИ НА МАПУ", name:"ІМ'Я", type:"ТИП", level:"LVL", size:"РОЗМІР", rank:"РАНГ", horde:"НАТОВП", members:"УЧАСНИКІВ", hp:"HP", def:"ЗАХИСТ", xp:"XP", init:"ІНІЦІАТИВА", special:"S.P.E.C.I.A.L.", creatureStats:"ПАРАМЕТРИ ІСТОТИ", attacks:"ВЛАСНІ АТАКИ", addAttack:"ДОДАТИ АТАКУ", attackName:"Назва атаки", skill:"Навичка", damageType:"Тип шкоди", range:"Дистанція", effects:"Ефекти", weapons:"ЗБРОЯ", chooseWeapon:"Обрати зброю", addWeapon:"ДОДАТИ ЗБРОЮ", rof:"ТЕМП ВОГНЮ", empty:"Поки нічого не додано", savedOk:"Картку збережено", added:"Токен додано на обрану сцену", failed:"Не вдалося додати токен", noScene:"Спочатку оберіть сцену", noSpace:"Недостатньо вільного місця", required:"Спочатку вкажіть ім'я" },
  pl: { title:"UTWÓRZ NPC", npc:"NPC", creature:"STWÓR", saved:"ZAPISANA KARTA", newCard:"NOWA KARTA", del:"USUŃ", save:"ZAPISZ ZMIANY", addMap:"DODAJ NA MAPĘ", name:"NAZWA", type:"TYP", level:"LVL", size:"ROZMIAR", rank:"RANGA", horde:"HORDA", members:"CZŁONKÓW", hp:"HP", def:"OBRONA", xp:"XP", init:"INICJATYWA", special:"S.P.E.C.I.A.L.", creatureStats:"STATYSTYKI STWORA", attacks:"WŁASNE ATAKI", addAttack:"DODAJ ATAK", attackName:"Nazwa ataku", skill:"Umiejętność", damageType:"Typ obrażeń", range:"Zasięg", effects:"Efekty", weapons:"BROŃ", chooseWeapon:"Wybierz broń", addWeapon:"DODAJ BROŃ", rof:"SZYBKOSTRZELNOŚĆ", empty:"Nic jeszcze nie dodano", savedOk:"Karta zapisana", added:"Token dodany do wybranej sceny", failed:"Nie udało się dodać tokena", noScene:"Najpierw wybierz scenę", noSpace:"Brak wolnego miejsca", required:"Najpierw podaj nazwę" },
};
function lang(v){const c=String(v||"en").toLowerCase().split("-")[0];return COPY[c]?c:"en";}
function kindOf(v){return String(v||"").toLowerCase()==="creature"?"creature":"npc";}
function num(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function cloneCard(v){return {...(v||{}),special:{...(v?.special||{})},customAttacks:(v?.customAttacks||[]).map(x=>({...x})),weapons:(v?.weapons||[]).map(x=>({...x}))};}
function Field({label,children,wide=false}){return <label className={wide?"is-wide":""}><span>{label}</span>{children}</label>;}

export default function GmNpcCardEditorV7({session}){
  const {i18n}=useTranslation();
  const t=COPY[lang(i18n.resolvedLanguage||i18n.language)];
  const [kind,setKind]=useState("npc");
  const [draft,setDraft]=useState(()=>cloneCard(blankCreature("npc")));
  const [library,setLibrary]=useState([]);
  const [selectedId,setSelectedId]=useState("");
  const [weaponsDb,setWeaponsDb]=useState([]);
  const [weaponId,setWeaponId]=useState("");
  const [message,setMessage]=useState("");
  const effective=useMemo(()=>applyNpcRank(draft,draft),[draft]);

  const reload=()=>loadCustomCreatures().then(x=>setLibrary(Array.isArray(x)?x:[])).catch(()=>setLibrary([]));
  useEffect(()=>{reload();const h=()=>reload();window.addEventListener(CUSTOM_CREATURES_CHANGED_EVENT,h);return()=>window.removeEventListener(CUSTOM_CREATURES_CHANGED_EVENT,h);},[]);
  useEffect(()=>{loadNpcWeaponDatabase().then(setWeaponsDb).catch(()=>setWeaponsDb([]));},[]);

  const patch=(p)=>setDraft(c=>({...c,...p}));
  const newCard=(nextKind=kind)=>{const k=kindOf(nextKind);setKind(k);setSelectedId("");setDraft(cloneCard(blankCreature(k)));setWeaponId("");setMessage("");};
  const choose=(id)=>{setSelectedId(id);if(!id)return newCard(kind);const item=library.find(x=>String(x.id)===String(id));if(!item)return;setKind(kindOf(item.cardKind));setDraft(cloneCard(item));setMessage("");};

  const save=async()=>{
    if(!String(draft.name||"").trim()){setMessage(t.required);return null;}
    const payload={...draft,cardKind:kind,category:kind,
      customAttacks:(draft.customAttacks||[]).map((x,i)=>normalizeStructuredAttack(x,i)),
      weapons:(draft.weapons||[]).map((x,i)=>normalizeWeaponAttack(x,i))};
    const saved=await saveCustomCreature(payload);
    setDraft(cloneCard(saved));setSelectedId(saved.id);await reload();setMessage(t.savedOk);return saved;
  };
  const remove=async()=>{if(!selectedId)return;await deleteCustomCreature(selectedId);await reload();newCard(kind);};

  const addAttack=()=>setDraft(c=>({...c,customAttacks:[...(c.customAttacks||[]),normalizeStructuredAttack({name:t.attackName,targetNumber:10,damageDice:4,skill:"Combat",attribute:kind==="creature"?"BODY":"SPECIAL",damageType:"Physical",range:"C",effects:""},(c.customAttacks||[]).length)]}));
  const patchAttack=(i,p)=>setDraft(c=>({...c,customAttacks:(c.customAttacks||[]).map((x,n)=>n===i?{...x,...p}:x)}));
  const removeAttack=(i)=>setDraft(c=>({...c,customAttacks:(c.customAttacks||[]).filter((_,n)=>n!==i)}));

  const addWeapon=()=>{const src=weaponsDb.find(x=>x.id===weaponId);if(!src)return;setDraft(c=>({...c,weapons:[...(c.weapons||[]),normalizeWeaponAttack({...src,weaponId:src.id,targetNumber:10,damageDice:src.damage,skill:src.weaponType||"Combat",damageType:src.damageType||"Physical",effects:src.effects||"",range:src.range||"C",rate:src.rate||0},(c.weapons||[]).length)]}));setWeaponId("");};
  const patchWeapon=(i,p)=>setDraft(c=>({...c,weapons:(c.weapons||[]).map((x,n)=>n===i?{...x,...p}:x)}));
  const removeWeapon=(i)=>setDraft(c=>({...c,weapons:(c.weapons||[]).filter((_,n)=>n!==i)}));

  const addToMap=async()=>{
    if(!String(draft.name||"").trim()){setMessage(t.required);return;}
    const scene=session?.tacticalScene;if(!scene){setMessage(t.noScene);return;}
    const stats=applyNpcRank({...draft,customAttacks:(draft.customAttacks||[]).map((x,i)=>normalizeStructuredAttack(x,i)),weapons:(draft.weapons||[]).map((x,i)=>normalizeWeaponAttack(x,i))},draft);
    const footprint=Math.max(1,Math.min(3,num(stats.footprint||stats.size,1)));
    const placement=findFreePlacement(scene,footprint,[]);if(!placement){setMessage(t.noSpace);return;}
    const response=await session.createNpcToken?.({name:draft.name,npcId:draft.id,avatar:draft.avatar||"",size:footprint,x:placement.x,y:placement.y,stats:{...stats,size:footprint,footprint,visibleToPlayers:false,controlledByClientId:""}});
    setMessage(response?.ok?t.added:`${t.failed}${response?.error?` [${response.error}]`:""}`);
  };

  return <section className="pip-panel gm-npc-card-editor-v7">
    <header className="gm-npc-v7-head"><h2>[ {t.title} ]</h2><button className="pip-btn is-primary" type="button" onClick={()=>newCard(kind==="npc"?"creature":"npc")}>{t.npc} ⇄ {t.creature} · {kind==="npc"?t.npc:t.creature}</button></header>
    <div className="gm-npc-v7-library"><Field label={t.saved} wide><select className="pip-input" value={selectedId} onChange={e=>choose(e.target.value)}><option value="">— {t.newCard} —</option>{library.map(x=><option key={x.id} value={x.id}>{kindOf(x.cardKind)==="npc"?t.npc:t.creature} · {x.name}</option>)}</select></Field><button className="pip-btn" type="button" onClick={()=>newCard(kind)}>{t.newCard}</button><button className="pip-btn" type="button" disabled={!selectedId} onClick={remove}>{t.del}</button></div>
    <div className="gm-npc-v7-actions"><button className="pip-btn is-primary" type="button" onClick={save}>{t.save}</button><button className="pip-btn" type="button" onClick={addToMap}>{t.addMap}</button></div>{message?<div className="gm-token-manager-message">{message}</div>:null}

    <div className="gm-npc-v7-grid"><Field label={t.name} wide><input className="pip-input" value={draft.name||""} onChange={e=>patch({name:e.target.value})}/></Field><Field label={t.type} wide><input className="pip-input" value={draft.creatureType||""} onChange={e=>patch({creatureType:e.target.value})}/></Field><Field label={t.level}><input className="pip-input" type="number" value={draft.level??1} onChange={e=>patch({level:num(e.target.value)})}/></Field><Field label={t.size}><select className="pip-input" value={draft.baseSize||1} onChange={e=>patch({baseSize:num(e.target.value,1),size:num(e.target.value,1)})}><option value="1">1×1</option><option value="2">2×2</option></select></Field></div>

    <section className="gm-npc-v7-section"><h3>{t.rank}</h3><div className="gm-npc-v7-ranks">{NPC_RANKS.map(r=><button key={r} type="button" className={`pip-btn${draft.rank===r?" is-primary":""}`} onClick={()=>patch({rank:r})}>{r.toUpperCase()}</button>)}</div><div className="gm-npc-v7-horde"><label><input type="checkbox" checked={Boolean(draft.hordeEnabled)} onChange={e=>patch({hordeEnabled:e.target.checked})}/> {t.horde}</label>{draft.hordeEnabled?<Field label={t.members}><select className="pip-input" value={draft.hordeSize||2} onChange={e=>patch({hordeSize:num(e.target.value,2)})}>{[2,3,4,5].map(x=><option key={x}>{x}</option>)}</select></Field>:null}<b>HP {effective.hp}/{effective.maxHp} · DEF {effective.defense} · {effective.footprint}×{effective.footprint}</b></div></section>

    <section className="gm-npc-v7-section"><h3>STATS</h3><div className="gm-npc-v7-grid gm-npc-v7-stats"><Field label={t.hp}><input className="pip-input" type="number" value={draft.baseMaxHp??10} onChange={e=>patch({baseMaxHp:Math.max(1,num(e.target.value,1)),hp:Math.max(1,num(e.target.value,1)),maxHp:Math.max(1,num(e.target.value,1))})}/></Field><Field label={t.def}><input className="pip-input" type="number" value={draft.baseDefense??1} onChange={e=>patch({baseDefense:Math.max(0,num(e.target.value)),defense:Math.max(0,num(e.target.value))})}/></Field><Field label={t.xp}><input className="pip-input" type="number" value={draft.baseXp??0} onChange={e=>patch({baseXp:Math.max(0,num(e.target.value)),xp:Math.max(0,num(e.target.value))})}/></Field><Field label={t.init}><input className="pip-input" type="number" value={draft.initiative??0} onChange={e=>patch({initiative:Math.max(0,num(e.target.value))})}/></Field></div></section>

    {kind==="npc"?<section className="gm-npc-v7-section"><h3>{t.special}</h3><div className="gm-npc-v7-special">{SPECIAL_KEYS.map(k=><Field key={k} label={k}><input className="pip-input" type="number" value={draft.special?.[k]??5} onChange={e=>setDraft(c=>({...c,special:{...(c.special||{}),[k]:e.target.value}}))}/></Field>)}</div></section>:null}

    <section className="gm-npc-v7-section"><div className="gm-npc-v7-section-head"><h3>{t.attacks}</h3><button className="pip-btn" type="button" onClick={addAttack}>+ {t.addAttack}</button></div><div className="gm-npc-v7-list">{(draft.customAttacks||[]).map((a,i)=><article className="gm-npc-v7-card" key={a.id||i}><Field label={t.attackName} wide><input className="pip-input" value={a.name||""} onChange={e=>patchAttack(i,{name:e.target.value})}/></Field><div className="gm-npc-v7-grid attack"><Field label="TN"><input className="pip-input" inputMode="numeric" value={a.targetNumber??10} onChange={e=>patchAttack(i,{targetNumber:e.target.value})}/></Field><Field label="CD"><input className="pip-input" inputMode="numeric" value={a.damageDice??0} onChange={e=>patchAttack(i,{damageDice:e.target.value})}/></Field><Field label={t.skill}><input className="pip-input" value={a.skill||""} onChange={e=>patchAttack(i,{skill:e.target.value})}/></Field><Field label={t.damageType}><input className="pip-input" value={a.damageType||""} onChange={e=>patchAttack(i,{damageType:e.target.value})}/></Field><Field label={t.range}><input className="pip-input" value={a.range||""} onChange={e=>patchAttack(i,{range:e.target.value})}/></Field><Field label={t.effects} wide><input className="pip-input" value={a.effects||""} onChange={e=>patchAttack(i,{effects:e.target.value})}/></Field></div><button className="pip-btn remove" type="button" onClick={()=>removeAttack(i)}>×</button></article>):<div className="pip-logbox">{t.empty}</div>}</div><button className="pip-btn is-primary full" type="button" onClick={save}>{t.save}</button></section>

    {kind==="npc"?<section className="gm-npc-v7-section"><div className="gm-npc-v7-section-head"><h3>{t.weapons}</h3><span>{weaponsDb.length}</span></div><div className="gm-npc-v7-weapon-picker"><select className="pip-input" value={weaponId} onChange={e=>setWeaponId(e.target.value)}><option value="">— {t.chooseWeapon} —</option>{weaponsDb.map(w=><option key={w.id} value={w.id}>{w.name} · {w.damage} CD</option>)}</select><button className="pip-btn" type="button" disabled={!weaponId} onClick={addWeapon}>+ {t.addWeapon}</button></div><div className="gm-npc-v7-list">{(draft.weapons||[]).map((w,i)=><article className="gm-npc-v7-card weapon" key={`${w.id||w.weaponId||"weapon"}-${i}`}><Field label={t.weapons} wide><input className="pip-input" value={w.name||""} onChange={e=>patchWeapon(i,{name:e.target.value})}/></Field><div className="gm-npc-v7-grid attack"><Field label="TN"><input className="pip-input" inputMode="numeric" value={w.targetNumber??10} onChange={e=>patchWeapon(i,{targetNumber:e.target.value})}/></Field><Field label="CD"><input className="pip-input" inputMode="numeric" value={w.damageDice??0} onChange={e=>patchWeapon(i,{damageDice:e.target.value})}/></Field><Field label={t.skill}><input className="pip-input" value={w.skill||""} onChange={e=>patchWeapon(i,{skill:e.target.value})}/></Field><Field label={t.damageType}><input className="pip-input" value={w.damageType||""} onChange={e=>patchWeapon(i,{damageType:e.target.value})}/></Field><Field label={t.range}><input className="pip-input" value={w.range||""} onChange={e=>patchWeapon(i,{range:e.target.value})}/></Field><Field label={t.rof}><input className="pip-input" inputMode="numeric" value={w.rate??0} onChange={e=>patchWeapon(i,{rate:e.target.value})}/></Field><Field label={t.effects} wide><input className="pip-input" value={w.effects||""} onChange={e=>patchWeapon(i,{effects:e.target.value})}/></Field></div><button className="pip-btn remove" type="button" onClick={()=>removeWeapon(i)}>×</button></article>):null}</div><button className="pip-btn is-primary full" type="button" onClick={save}>{t.save}</button></section>:null}
  </section>;
}
