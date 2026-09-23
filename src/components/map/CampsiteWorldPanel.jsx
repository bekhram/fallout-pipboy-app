import React, { useMemo, useState } from "react";
import { calculateCampsite } from "../../utils/winterOfAtomRules.js";
import { countCraftingMaterials, canAffordMaterials, applyCampsiteBuild, applyWinterCampRest } from "../../utils/winterCampsiteInventory.js";
import "./campsiteWorldPanel.css";

const STORAGE_KEY="pip2d20_winter_rules_v1";
const COPY={
  en:{title:"CAMP",hint:"Rest restores strength, but wasteland conditions can affect Survival and health.",tier:"Camp level",warm:"Warm clothing",raw:"Ate raw / untreated food",dirty:"Drank dirty / untreated water",animals:"Fought animals",sleep:"Slept at least 6 hours",penalty:"Survival penalty",risk:"Risk",none:"none",disease:"disease",poison:"poisoning",cold:"cold exposure",wounds:"wound infection",materials:"Materials",inventory:"Inventory",notEnough:"Not enough materials",apply:"APPLY",cancel:"CANCEL"},
  ru:{title:"ЛАГЕРЬ",hint:"Отдых в лагере восстанавливает силы, но условия Пустоши влияют на Выживание и здоровье.",tier:"Уровень лагеря",warm:"Есть тёплая одежда",raw:"Ел необработанную еду",dirty:"Пил грязную воду",animals:"Сражался с животными",sleep:"Спал не менее 6 часов",penalty:"Штраф к Выживанию",risk:"Риск",none:"нет",disease:"болезнь",poison:"отравление",cold:"переохлаждение",wounds:"инфекция ран",materials:"Материалы",inventory:"В инвентаре",notEnough:"Недостаточно материалов",apply:"ПРИМЕНИТЬ",cancel:"ОТМЕНА"},
  uk:{title:"ТАБІР",hint:"Відпочинок відновлює сили, але умови Пустки впливають на Виживання та здоров'я.",tier:"Рівень табору",warm:"Є теплий одяг",raw:"Їв необроблену їжу",dirty:"Пив брудну воду",animals:"Бився з тваринами",sleep:"Спав щонайменше 6 годин",penalty:"Штраф до Виживання",risk:"Ризик",none:"немає",disease:"хвороба",poison:"отруєння",cold:"переохолодження",wounds:"інфекція ран",materials:"Матеріали",inventory:"В інвентарі",notEnough:"Недостатньо матеріалів",apply:"ЗАСТОСУВАТИ",cancel:"СКАСУВАТИ"},
  pl:{title:"OBÓZ",hint:"Odpoczynek przywraca siły, ale warunki pustkowi wpływają na Survival i zdrowie.",tier:"Poziom obozu",warm:"Ciepła odzież",raw:"Zjadł surowe jedzenie",dirty:"Pił brudną wodę",animals:"Walczył ze zwierzętami",sleep:"Spał co najmniej 6 godzin",penalty:"Kara do Survival",risk:"Ryzyko",none:"brak",disease:"choroba",poison:"zatrucie",cold:"wychłodzenie",wounds:"infekcja ran",materials:"Materiały",inventory:"W ekwipunku",notEnough:"Za mało materiałów",apply:"ZASTOSUJ",cancel:"ANULUJ"}
};
function readState(){if(typeof window==="undefined")return{};try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch{return{};}}
function writePatch(patch){if(typeof window==="undefined")return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...readState(),...patch}));}catch{}}
function mat(m){return `C ${m?.common||0} · U ${m?.uncommon||0} · R ${m?.rare||0}`;}

export default function CampsiteWorldPanel({open=false,onClose,character=null,setCharacter=null,language="en",winterMode=false}){
  const code=String(language||"en").split("-")[0]; const text=COPY[code]||COPY.en;
  const saved=useMemo(readState,[]);
  const [tier,setTier]=useState(Number(character?.activeCampsite?.tier||saved?.camp?.tier||1));
  const [answers,setAnswers]=useState({warm:true,raw:false,dirty:false,animals:false,sleep:true});
  if(!open)return null;

  const campResult=calculateCampsite({tier,apSpentAfterTest:0,buildSucceeded:true});
  const inventoryTotals=countCraftingMaterials(character?.inventoryItems||[]);
  const canBuild=Boolean(character?.activeCampsite)||canAffordMaterials(character?.inventoryItems||[],campResult.materials);
  const penalty=(answers.raw?1:0)+(answers.dirty?1:0)+(answers.animals?1:0)+(!answers.sleep?1:0)+(winterMode&&!answers.warm?1:0);
  const risks=[answers.raw?text.disease:"",answers.dirty?text.poison:"",answers.animals?text.wounds:"",winterMode&&!answers.warm?text.cold:""].filter(Boolean);
  const patch=(key,value)=>setAnswers(prev=>({...prev,[key]:value}));

  const apply=()=>{
    if(typeof setCharacter!=="function"||!canBuild)return;
    setCharacter(prev=>{
      let next=prev;
      if(!prev?.activeCampsite){
        next=applyCampsiteBuild(prev,{...campResult,features:[]})||prev;
      } else if(Number(prev.activeCampsite.tier)!==Number(tier)){
        next={...prev,activeCampsite:{...prev.activeCampsite,tier:Number(tier),attemptedTier:Number(tier)}};
      }
      if(answers.sleep) next=applyWinterCampRest(next,{hours:6});
      const fatigueAdd=(answers.animals?1:0)+(!answers.sleep?1:0)+(winterMode&&!answers.warm?1:0);
      const statuses={...(next.statuses||{})};
      if(winterMode&&!answers.warm) statuses.exposure=true;
      return {
        ...next,
        fatigue:String(Math.max(0,Number(next.fatigue||0)+fatigueAdd)),
        statuses,
        campSurvivalPenalty:penalty,
        lastCampHealthCheck:{
          at:new Date().toISOString(),tier:Number(tier),warmClothing:answers.warm,rawFood:answers.raw,dirtyWater:answers.dirty,
          foughtAnimals:answers.animals,slept:answers.sleep,survivalPenalty:penalty,risks
        }
      };
    });
    writePatch({camp:{...(saved.camp||{}),tier:Number(tier)},lastCampHealthCheck:{...answers,penalty,risks}});
    onClose?.();
  };

  return <div className="camp-modal" role="dialog" aria-modal="true" aria-label={text.title} onClick={()=>onClose?.()}>
    <div className="camp-modal__card" onClick={e=>e.stopPropagation()}>
      <header><div><small>PIP / 2D20 // WORLD</small><h2>▲ {text.title}</h2><p>{text.hint}</p></div><button className="camp-modal__close" type="button" onClick={()=>onClose?.()}>×</button></header>
      <label className="camp-modal__tier"><span>{text.tier}</span><select className="pip-input" value={tier} onChange={e=>setTier(Number(e.target.value))}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      {!character?.activeCampsite?<div className="camp-modal__cost"><span>{text.materials}: {mat(campResult.materials)}</span><span>{text.inventory}: {mat(inventoryTotals)}</span>{!canBuild?<strong>{text.notEnough}</strong>:null}</div>:null}
      <div className="camp-modal__questions">
        {[["warm",text.warm],["raw",text.raw],["dirty",text.dirty],["animals",text.animals],["sleep",text.sleep]].map(([key,label])=><label key={key}><input type="checkbox" checked={answers[key]} onChange={e=>patch(key,e.target.checked)}/><span>{label}</span></label>)}
      </div>
      <section className={`camp-modal__result ${penalty?"is-warning":"is-safe"}`}><div className="camp-modal__result-icon">♨</div><div><strong>{text.penalty}: <em>{penalty?`-${penalty}`:"0"}</em></strong><span>{text.risk}: {risks.length?risks.join(" / "):text.none}</span><small>{answers.animals?"+1 Fatigue · ":""}{!answers.sleep?"+1 Fatigue · ":""}{winterMode&&!answers.warm?"Exposure · ":""}{answers.sleep?"6h rest applied":""}</small></div></section>
      <footer><button type="button" className="pip-btn" onClick={()=>onClose?.()}>{text.cancel}</button><button type="button" className="pip-btn is-primary" disabled={!canBuild} onClick={apply}>{text.apply}</button></footer>
    </div>
  </div>;
}