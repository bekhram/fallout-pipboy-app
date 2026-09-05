import React, { useEffect, useMemo, useState } from "react";
import {
  BESTIARY_CATEGORIES,
  BESTIARY_ENTRIES,
  createEmptyBestiaryEntry,
} from "../../data/bestiary.js";
import "./bestiary.css";

const STORAGE_KEY = "fallout_pipboy_bestiary_custom_v1";
const SPECIAL_KEYS = ["STR", "PER", "END", "CHA", "INT", "AGI", "LCK"];

const TEXT = {
  en: {
    title:"BESTIARY", subtitle:"Core Rulebook creatures, NPCs, robots, traps and hazards", search:"Search bestiary...", add:"+ ENTRY", edit:"EDIT", save:"SAVE", remove:"DELETE",
    all:"ALL", creature:"CREATURES", enemy:"ENEMIES", ally:"ALLIES", npc:"NPC", robot:"ROBOTS", trap:"TRAPS", hazard:"HAZARDS", obstacle:"OBSTACLES",
    builtIn:"CORE RULEBOOK", custom:"CUSTOM", noResults:"No matching entries.", noSelection:"Select an entry.",
    name:"NAME", category:"CATEGORY", type:"TYPE", level:"LEVEL", xp:"XP", hp:"HP", initiative:"INITIATIVE", defense:"DEFENSE", carryWeight:"CARRY WEIGHT", meleeBonus:"MELEE BONUS", luckPoints:"LUCK",
    body:"BODY", mind:"MIND", melee:"MELEE", guns:"GUNS", other:"OTHER", stats:"STAT BLOCK", special:"S.P.E.C.I.A.L.", skills:"SKILLS", tagged:"TAG", resistances:"DAMAGE RESISTANCE",
    attacks:"ATTACKS", abilities:"SPECIAL ABILITIES", loot:"INVENTORY / SALVAGE", summary:"DESCRIPTION", source:"SOURCE", notes:"NOTES", rule:"TRAP / HAZARD / OBSTACLE",
    detectionDifficulty:"DETECTION", disarmDifficulty:"TEST / DISARM", trigger:"TRIGGER", damage:"DAMAGE", effect:"EFFECT", tags:"TAGS", statKind:"STAT TYPE",
    creatureStats:"CREATURE", characterStats:"CHARACTER NPC", ruleStats:"RULE", referenceHint:"Values and mechanics are taken from the uploaded Core Rulebook. Long lore prose is intentionally summarized rather than copied.", confirmDelete:"Delete this custom entry?",
  },
  ru: {
    title:"БЕСТИАРИЙ", subtitle:"Существа, NPC, роботы, ловушки и опасности из Core Rulebook", search:"Поиск по бестиарию...", add:"+ ЗАПИСЬ", edit:"ИЗМЕНИТЬ", save:"СОХРАНИТЬ", remove:"УДАЛИТЬ",
    all:"ВСЕ", creature:"СУЩЕСТВА", enemy:"ПРОТИВНИКИ", ally:"СОЮЗНИКИ", npc:"NPC", robot:"РОБОТЫ", trap:"ЛОВУШКИ", hazard:"ОПАСНОСТИ", obstacle:"ПРЕПЯТСТВИЯ",
    builtIn:"CORE RULEBOOK", custom:"СВОЯ", noResults:"Ничего не найдено.", noSelection:"Выберите запись.",
    name:"НАЗВАНИЕ", category:"КАТЕГОРИЯ", type:"ТИП", level:"УРОВЕНЬ", xp:"XP", hp:"HP", initiative:"ИНИЦИАТИВА", defense:"ЗАЩИТА", carryWeight:"ГРУЗОПОДЪЁМНОСТЬ", meleeBonus:"БОНУС БЛИЖНЕГО БОЯ", luckPoints:"УДАЧА",
    body:"BODY", mind:"MIND", melee:"БЛИЖНИЙ БОЙ", guns:"ОРУЖИЕ", other:"ДРУГОЕ", stats:"СТАТБЛОК", special:"S.P.E.C.I.A.L.", skills:"НАВЫКИ", tagged:"ТЕГ", resistances:"СОПРОТИВЛЕНИЕ УРОНУ",
    attacks:"АТАКИ", abilities:"ОСОБЫЕ СПОСОБНОСТИ", loot:"ИНВЕНТАРЬ / ДОБЫЧА", summary:"ОПИСАНИЕ", source:"ИСТОЧНИК", notes:"ЗАМЕТКИ", rule:"ЛОВУШКА / ОПАСНОСТЬ / ПРЕПЯТСТВИЕ",
    detectionDifficulty:"ОБНАРУЖЕНИЕ", disarmDifficulty:"ПРОВЕРКА / ОБЕЗВРЕЖИВАНИЕ", trigger:"ТРИГГЕР", damage:"УРОН", effect:"ЭФФЕКТ", tags:"ТЕГИ", statKind:"ТИП СТАТБЛОКА",
    creatureStats:"СУЩЕСТВО", characterStats:"ПЕРСОНАЖ NPC", ruleStats:"ПРАВИЛО", referenceHint:"Числа и механики взяты из загруженной Core Rulebook. Длинный лор пересказан кратко, а не скопирован.", confirmDelete:"Удалить эту пользовательскую запись?",
  },
  uk: {
    title:"БЕСТІАРІЙ", subtitle:"Істоти, NPC, роботи, пастки та небезпеки з Core Rulebook", search:"Пошук у бестіарії...", add:"+ ЗАПИС", edit:"ЗМІНИТИ", save:"ЗБЕРЕГТИ", remove:"ВИДАЛИТИ",
    all:"УСІ", creature:"ІСТОТИ", enemy:"ПРОТИВНИКИ", ally:"СОЮЗНИКИ", npc:"NPC", robot:"РОБОТИ", trap:"ПАСТКИ", hazard:"НЕБЕЗПЕКИ", obstacle:"ПЕРЕШКОДИ",
    builtIn:"CORE RULEBOOK", custom:"ВЛАСНА", noResults:"Нічого не знайдено.", noSelection:"Оберіть запис.",
    name:"НАЗВА", category:"КАТЕГОРІЯ", type:"ТИП", level:"РІВЕНЬ", xp:"XP", hp:"HP", initiative:"ІНІЦІАТИВА", defense:"ЗАХИСТ", carryWeight:"ВАНТАЖОПІДЙОМНІСТЬ", meleeBonus:"БОНУС БЛИЖНЬОГО БОЮ", luckPoints:"УДАЧА",
    body:"BODY", mind:"MIND", melee:"БЛИЖНІЙ БІЙ", guns:"ЗБРОЯ", other:"ІНШЕ", stats:"СТАТБЛОК", special:"S.P.E.C.I.A.L.", skills:"НАВИЧКИ", tagged:"ТЕГ", resistances:"ОПІР ШКОДІ",
    attacks:"АТАКИ", abilities:"ОСОБЛИВІ ЗДІБНОСТІ", loot:"ІНВЕНТАР / ЗДОБИЧ", summary:"ОПИС", source:"ДЖЕРЕЛО", notes:"НОТАТКИ", rule:"ПАСТКА / НЕБЕЗПЕКА / ПЕРЕШКОДА",
    detectionDifficulty:"ВИЯВЛЕННЯ", disarmDifficulty:"ПЕРЕВІРКА / ЗНЕШКОДЖЕННЯ", trigger:"ТРИГЕР", damage:"ШКОДА", effect:"ЕФЕКТ", tags:"ТЕГИ", statKind:"ТИП СТАТБЛОКА",
    creatureStats:"ІСТОТА", characterStats:"ПЕРСОНАЖ NPC", ruleStats:"ПРАВИЛО", referenceHint:"Числа й механіки взято із завантаженої Core Rulebook. Довгий лор стисло переказано, а не скопійовано.", confirmDelete:"Видалити цей власний запис?",
  },
  pl: {
    title:"BESTIARIUSZ", subtitle:"Stworzenia, NPC, roboty, pułapki i zagrożenia z Core Rulebook", search:"Szukaj w bestiariuszu...", add:"+ WPIS", edit:"EDYTUJ", save:"ZAPISZ", remove:"USUŃ",
    all:"WSZYSTKO", creature:"STWORZENIA", enemy:"WROGOWIE", ally:"SOJUSZNICY", npc:"NPC", robot:"ROBOTY", trap:"PUŁAPKI", hazard:"ZAGROŻENIA", obstacle:"PRZESZKODY",
    builtIn:"CORE RULEBOOK", custom:"WŁASNY", noResults:"Brak wyników.", noSelection:"Wybierz wpis.",
    name:"NAZWA", category:"KATEGORIA", type:"TYP", level:"POZIOM", xp:"XP", hp:"HP", initiative:"INICJATYWA", defense:"OBRONA", carryWeight:"UDŹWIG", meleeBonus:"BONUS WRĘCZ", luckPoints:"SZCZĘŚCIE",
    body:"BODY", mind:"MIND", melee:"WALKA WRĘCZ", guns:"BROŃ", other:"INNE", stats:"STATBLOK", special:"S.P.E.C.I.A.L.", skills:"UMIEJĘTNOŚCI", tagged:"TAG", resistances:"ODPORNOŚĆ NA OBRAŻENIA",
    attacks:"ATAKI", abilities:"ZDOLNOŚCI SPECJALNE", loot:"EKWIPUNEK / ŁUP", summary:"OPIS", source:"ŹRÓDŁO", notes:"NOTATKI", rule:"PUŁAPKA / ZAGROŻENIE / PRZESZKODA",
    detectionDifficulty:"WYKRYCIE", disarmDifficulty:"TEST / ROZBROJENIE", trigger:"WYZWALACZ", damage:"OBRAŻENIA", effect:"EFEKT", tags:"TAGI", statKind:"TYP STATBLOKU",
    creatureStats:"STWORZENIE", characterStats:"NPC", ruleStats:"ZASADA", referenceHint:"Wartości i mechaniki pochodzą z przesłanego Core Rulebook. Długi opis fabularny jest streszczony, nie kopiowany.", confirmDelete:"Usunąć ten własny wpis?",
  },
};

function langOf(value) {
  const code=String(value||"en").split("-")[0];
  return TEXT[code]?code:"en";
}
function readCustom() {
  try { const x=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); return Array.isArray(x)?x:[]; } catch { return []; }
}
function writeCustom(entries) { try { localStorage.setItem(STORAGE_KEY,JSON.stringify(entries)); } catch {} }
function textOf(entry) {
  return [entry.name,entry.category,entry.creatureType,entry.summary,entry.attacks,entry.abilities,entry.loot,entry.source,...(entry.tags||[]),...(entry.skills||[]).map(s=>s.name)].filter(Boolean).join(" ").toLowerCase();
}
function Info({label,value}) {
  if (value===undefined||value===null||String(value).trim()==="") return null;
  return <div className="bestiary-info-field"><span>{label}</span><strong>{String(value)}</strong></div>;
}
function Section({title,children}) { return <div className="bestiary-section"><h4>[ {title} ]</h4>{children}</div>; }
function TextBox({value}) { if(!String(value||"").trim()) return null; return <div className="pip-logbox bestiary-text">{value}</div>; }
function Field({label,value,onChange,multiline=false}) {
  return <label className={`bestiary-edit-field${multiline?" is-wide":""}`}><span>{label}</span>{multiline?<textarea className="pip-textarea" value={value||""} onChange={e=>onChange(e.target.value)}/>:<input className="pip-input" value={value||""} onChange={e=>onChange(e.target.value)}/>}</label>;
}

export default function RulebookBestiaryPanel({language:languageProp}) {
  const language=langOf(languageProp||(typeof navigator!=="undefined"?navigator.language:"en"));
  const c=TEXT[language];
  const [category,setCategory]=useState("all");
  const [query,setQuery]=useState("");
  const [customEntries,setCustomEntries]=useState(readCustom);
  const [selectedId,setSelectedId]=useState(BESTIARY_ENTRIES[0]?.id||null);
  const [editing,setEditing]=useState(false);
  useEffect(()=>writeCustom(customEntries),[customEntries]);

  const entries=useMemo(()=>[...BESTIARY_ENTRIES,...customEntries],[customEntries]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return entries.filter(e=>(category==="all"||e.category===category)&&(!q||textOf(e).includes(q)));
  },[entries,category,query]);
  useEffect(()=>{
    if(filtered.length&&!filtered.some(e=>e.id===selectedId)){setSelectedId(filtered[0].id);setEditing(false);}
  },[filtered,selectedId]);
  const selected=entries.find(e=>e.id===selectedId)||null;

  const update=(key,value)=>{
    if(!selected?.custom)return;
    setCustomEntries(prev=>prev.map(e=>e.id===selected.id?{...e,[key]:value}:e));
  };
  const updateSpecial=(key,value)=>update("special",{...(selected.special||{}),[key]:value});
  const add=()=>{
    const next=createEmptyBestiaryEntry(category==="all"?"creature":category);
    setCustomEntries(prev=>[...prev,next]);setSelectedId(next.id);setEditing(true);
  };
  const remove=()=>{
    if(!selected?.custom)return;
    if(typeof window!=="undefined"&&!window.confirm(c.confirmDelete))return;
    setCustomEntries(prev=>prev.filter(e=>e.id!==selected.id));setSelectedId(BESTIARY_ENTRIES[0]?.id||null);setEditing(false);
  };

  const renderEditor=()=>{
    const ruleLike=selected.statKind==="rule"||["trap","hazard","obstacle"].includes(selected.category);
    return <div className="bestiary-editor">
      <div className="bestiary-detail-head"><div><span className="pip-tag is-selected">{c.custom}</span><h3>{selected.name||c.add.replace("+ ","")}</h3></div><div className="pip-actions-inline"><button className="pip-btn is-primary" type="button" onClick={()=>setEditing(false)}>{c.save}</button><button className="pip-btn" type="button" onClick={remove}>{c.remove}</button></div></div>
      <div className="bestiary-edit-grid">
        <Field label={c.name} value={selected.name} onChange={v=>update("name",v)}/>
        <label className="bestiary-edit-field"><span>{c.category}</span><select className="pip-input" value={selected.category} onChange={e=>update("category",e.target.value)}>{BESTIARY_CATEGORIES.filter(x=>x!=="all").map(x=><option key={x} value={x}>{c[x]}</option>)}</select></label>
        <label className="bestiary-edit-field"><span>{c.statKind}</span><select className="pip-input" value={selected.statKind||"creature"} onChange={e=>update("statKind",e.target.value)}><option value="creature">{c.creatureStats}</option><option value="character">{c.characterStats}</option><option value="rule">{c.ruleStats}</option></select></label>
        <Field label={c.type} value={selected.creatureType} onChange={v=>update("creatureType",v)}/><Field label={c.level} value={selected.level} onChange={v=>update("level",v)}/><Field label={c.xp} value={selected.xp} onChange={v=>update("xp",v)}/>
        {selected.statKind==="creature"&&["body","mind","melee","guns","other"].map(k=><Field key={k} label={c[k]} value={selected[k]} onChange={v=>update(k,v)}/>)}
        {selected.statKind==="character"&&SPECIAL_KEYS.map(k=><Field key={k} label={k} value={selected.special?.[k]} onChange={v=>updateSpecial(k,v)}/>)}
        {!ruleLike&&<><Field label={c.hp} value={selected.hp} onChange={v=>update("hp",v)}/><Field label={c.initiative} value={selected.initiative} onChange={v=>update("initiative",v)}/><Field label={c.defense} value={selected.defense} onChange={v=>update("defense",v)}/><Field label={c.carryWeight} value={selected.carryWeight} onChange={v=>update("carryWeight",v)}/><Field label={c.meleeBonus} value={selected.meleeBonus} onChange={v=>update("meleeBonus",v)}/><Field label={c.luckPoints} value={selected.luckPoints} onChange={v=>update("luckPoints",v)}/><Field label={c.resistances} value={selected.drBlock} onChange={v=>update("drBlock",v)} multiline/><Field label={c.attacks} value={selected.attacks} onChange={v=>update("attacks",v)} multiline/><Field label={c.abilities} value={selected.abilities} onChange={v=>update("abilities",v)} multiline/><Field label={c.loot} value={selected.loot} onChange={v=>update("loot",v)} multiline/></>}
        {ruleLike&&<><Field label={c.detectionDifficulty} value={selected.detectionDifficulty} onChange={v=>update("detectionDifficulty",v)} multiline/><Field label={c.disarmDifficulty} value={selected.disarmDifficulty} onChange={v=>update("disarmDifficulty",v)} multiline/><Field label={c.trigger} value={selected.trigger} onChange={v=>update("trigger",v)} multiline/><Field label={c.damage} value={selected.damage} onChange={v=>update("damage",v)} multiline/><Field label={c.effect} value={selected.effect} onChange={v=>update("effect",v)} multiline/></>}
        <Field label={c.summary} value={selected.summary} onChange={v=>update("summary",v)} multiline/><Field label={c.source} value={selected.source} onChange={v=>update("source",v)} multiline/><Field label={c.notes} value={selected.notes} onChange={v=>update("notes",v)} multiline/>
      </div>
    </div>;
  };

  const renderCard=()=>{
    const kind=selected.statKind||(["trap","hazard","obstacle"].includes(selected.category)?"rule":"creature");
    return <div className="bestiary-card">
      <div className="bestiary-detail-head"><div className="bestiary-title-block"><div className="pip-tagrow is-wrap"><span className="pip-tag is-selected">{c[selected.category]||selected.category}</span><span className="pip-tag">{selected.custom?c.custom:c.builtIn}</span></div><h3>{selected.name}</h3>{selected.creatureType?<span>{selected.creatureType}</span>:null}</div>{selected.custom?<button type="button" className="pip-btn" onClick={()=>setEditing(true)}>{c.edit}</button>:null}</div>
      {selected.tags?.length?<div className="pip-tagrow is-wrap bestiary-tags">{selected.tags.map(tag=><span className="pip-tag" key={tag}>{tag}</span>)}</div>:null}

      {kind!=="rule"?<Section title={c.stats}><div className="bestiary-stat-grid"><Info label={c.level} value={selected.level}/><Info label={c.xp} value={selected.xp}/>{kind==="creature"?<><Info label={c.body} value={selected.body}/><Info label={c.mind} value={selected.mind}/><Info label={c.melee} value={selected.melee}/><Info label={c.guns} value={selected.guns}/><Info label={c.other} value={selected.other}/></>:null}<Info label={c.hp} value={selected.hp}/><Info label={c.initiative} value={selected.initiative}/><Info label={c.defense} value={selected.defense}/><Info label={c.carryWeight} value={selected.carryWeight}/><Info label={c.meleeBonus} value={selected.meleeBonus}/><Info label={c.luckPoints} value={selected.luckPoints}/></div></Section>:null}

      {kind==="character"&&selected.special?<Section title={c.special}><div className="bestiary-stat-grid bestiary-special-grid">{SPECIAL_KEYS.map(k=><Info key={k} label={k} value={selected.special[k]}/>)}</div></Section>:null}
      {kind==="character"&&selected.skills?.length?<Section title={c.skills}><div className="bestiary-skill-grid">{selected.skills.map((skill,i)=><div className={`bestiary-skill${skill.tagged?" is-tagged":""}`} key={`${skill.name}-${i}`}><span>{skill.name}</span><strong>{skill.rating}</strong>{skill.tagged?<small>{c.tagged}</small>:null}</div>)}</div></Section>:null}
      {kind!=="rule"&&selected.drBlock?<Section title={c.resistances}><TextBox value={selected.drBlock}/></Section>:null}
      {kind==="rule"?<Section title={c.rule}><div className="bestiary-stat-grid"><Info label={c.detectionDifficulty} value={selected.detectionDifficulty}/><Info label={c.disarmDifficulty} value={selected.disarmDifficulty}/></div><Info label={c.trigger} value={selected.trigger}/><Info label={c.damage} value={selected.damage}/><Info label={c.effect} value={selected.effect}/></Section>:null}
      {selected.summary?<Section title={c.summary}><TextBox value={selected.summary}/></Section>:null}
      {selected.attacks?<Section title={c.attacks}><TextBox value={selected.attacks}/></Section>:null}
      {selected.abilities?<Section title={c.abilities}><TextBox value={selected.abilities}/></Section>:null}
      {selected.loot?<Section title={c.loot}><TextBox value={selected.loot}/></Section>:null}
      {selected.source?<Section title={c.source}><TextBox value={selected.source}/></Section>:null}
      {selected.notes?<Section title={c.notes}><TextBox value={selected.notes}/></Section>:null}
      {!selected.custom?<div className="pip-logbox bestiary-reference-hint">{c.referenceHint}</div>:null}
    </div>;
  };

  return <section className="pip-panel pip-block bestiary-panel">
    <div className="pip-head bestiary-head"><div><h2>[ {c.title} ]</h2><span>{c.subtitle}</span></div><button type="button" className="pip-btn is-primary" onClick={add}>{c.add}</button></div>
    <div className="bestiary-toolbar push-bottom"><input className="pip-input bestiary-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={c.search}/><div className="pip-tagrow is-wrap bestiary-filters">{BESTIARY_CATEGORIES.map(key=><button key={key} type="button" className={`pip-tag ${category===key?"is-selected":""}`} onClick={()=>setCategory(key)}>{c[key]}</button>)}</div></div>
    <div className="bestiary-layout"><div className="bestiary-list pip-logbox">{filtered.length?filtered.map(entry=><button key={entry.id} type="button" className={`bestiary-list-item ${selectedId===entry.id?"is-selected":""}`} onClick={()=>{setSelectedId(entry.id);setEditing(false);}}><span className="bestiary-list-main"><strong>{entry.name||"—"}</strong><small>{c[entry.category]||entry.category}{entry.level?` // LVL ${entry.level}`:""}</small></span><span className="bestiary-list-kind">{entry.custom?c.custom:c.builtIn}</span></button>):<div className="bestiary-empty">{c.noResults}</div>}</div><div className="bestiary-detail">{!selected?<div className="pip-logbox bestiary-empty">{c.noSelection}</div>:editing&&selected.custom?renderEditor():renderCard()}</div></div>
  </section>;
}
