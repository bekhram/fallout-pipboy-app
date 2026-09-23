import React, { useMemo, useState } from "react";
import {
  calculateCampsite,
  CAMPSITE_FEATURES,
  resolveCampsiteVisitor,
} from "../../utils/winterOfAtomRules.js";
import {
  countCraftingMaterials,
  canAffordMaterials,
  applyCampsiteBuild,
  dismantleActiveCampsite,
  applyWinterCampRest,
  normalizeFeatureSelection,
} from "../../utils/winterCampsiteInventory.js";
import "./campsiteWorldPanel.css";

const STORAGE_KEY="pip2d20_winter_rules_v1";
const COPY={
  en:{title:"CAMPSITE",subtitle:"Wasteland camp",tier:"Tier",apAfter:"AP spent after build test",buildSuccess:"Build test succeeded",difficulty:"Difficulty",materials:"Materials",features:"Feature slots",refund:"Teardown refund",inventoryMaterials:"Inventory materials",notEnough:"Not enough materials",selectedFeatures:"Selected features",build:"BUILD CAMPSITE",active:"ACTIVE CAMPSITE",rest6:"REST 6H",rest24:"REST 24H",dismantle:"DISMANTLE",visitors:"CAMPSITE VISITORS",visitorRoll:"Visitor d20",visitorSecond:"Second d20 (Concealed)",visitorResult:"Visitor",readOnly:"Camp controls are available to the GM."},
  ru:{title:"ЛАГЕРЬ",subtitle:"Стоянка в пустоши",tier:"Уровень",apAfter:"AP после теста постройки",buildSuccess:"Тест постройки успешен",difficulty:"Сложность",materials:"Материалы",features:"Слоты особенностей",refund:"Возврат при разборке",inventoryMaterials:"Материалы в инвентаре",notEnough:"Недостаточно материалов",selectedFeatures:"Выбранные особенности",build:"ПОСТРОИТЬ ЛАГЕРЬ",active:"АКТИВНЫЙ ЛАГЕРЬ",rest6:"ОТДЫХ 6Ч",rest24:"ОТДЫХ 24Ч",dismantle:"РАЗОБРАТЬ",visitors:"ГОСТИ ЛАГЕРЯ",visitorRoll:"d20 посетителей",visitorSecond:"Второй d20 (Concealed)",visitorResult:"Гость",readOnly:"Управление лагерем доступно ГМ."},
  uk:{title:"ТАБІР",subtitle:"Стоянка у пустці",tier:"Рівень",apAfter:"AP після тесту побудови",buildSuccess:"Тест побудови успішний",difficulty:"Складність",materials:"Матеріали",features:"Слоти особливостей",refund:"Повернення при розбиранні",inventoryMaterials:"Матеріали в інвентарі",notEnough:"Недостатньо матеріалів",selectedFeatures:"Обрані особливості",build:"ПОБУДУВАТИ ТАБІР",active:"АКТИВНИЙ ТАБІР",rest6:"ВІДПОЧИНОК 6Г",rest24:"ВІДПОЧИНОК 24Г",dismantle:"РОЗІБРАТИ",visitors:"ГОСТІ ТАБОРУ",visitorRoll:"d20 відвідувачів",visitorSecond:"Другий d20 (Concealed)",visitorResult:"Гість",readOnly:"Керування табором доступне ГМ."},
  pl:{title:"OBOZOWISKO",subtitle:"Obóz na pustkowiu",tier:"Poziom",apAfter:"AP po teście budowy",buildSuccess:"Test budowy udany",difficulty:"Trudność",materials:"Materiały",features:"Miejsca na cechy",refund:"Zwrot po rozbiórce",inventoryMaterials:"Materiały w ekwipunku",notEnough:"Za mało materiałów",selectedFeatures:"Wybrane cechy",build:"ZBUDUJ OBÓZ",active:"AKTYWNY OBÓZ",rest6:"ODPOCZYNEK 6H",rest24:"ODPOCZYNEK 24H",dismantle:"ROZBIERZ",visitors:"GOŚCIE OBOZU",visitorRoll:"d20 gości",visitorSecond:"Drugi d20 (Concealed)",visitorResult:"Gość",readOnly:"Sterowanie obozem jest dostępne dla MG."}
};
function readState(){if(typeof window==="undefined")return{};try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch{return{};}}
function writePatch(patch){if(typeof window==="undefined")return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...readState(),...patch}));}catch{}}
function materialsText(materials){return `C ${materials?.common||0} · U ${materials?.uncommon||0} · R ${materials?.rare||0}`;}
function NumberInput({value,onChange,min=0,max=999,disabled=false}){return <input className="pip-input camp-world__number" type="number" min={min} max={max} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}/>;}

export default function CampsiteWorldPanel({character=null,setCharacter=null,language="en",readOnly=false}){
  const code=String(language||"en").split("-")[0];
  const text=COPY[code]||COPY.en;
  const initial=useMemo(readState,[]);
  const [camp,setCamp]=useState(initial.camp||{tier:1,apSpentAfterTest:0,buildSucceeded:true,features:[]});
  const [visitorRoll,setVisitorRoll]=useState(initial.visitorRoll||1);
  const [visitorSecond,setVisitorSecond]=useState(initial.visitorSecond||1);
  const campResult=useMemo(()=>calculateCampsite(camp),[camp]);
  const materialTotals=useMemo(()=>countCraftingMaterials(character?.inventoryItems||[]),[character?.inventoryItems]);
  const selectedFeatures=normalizeFeatureSelection(camp.features||[],campResult.featureSlots);
  const campAffordable=canAffordMaterials(character?.inventoryItems||[],campResult.materials);
  const activeFeatures=character?.activeCampsite?.features||selectedFeatures;
  const concealed=activeFeatures.includes("concealed");
  const visitor=resolveCampsiteVisitor({rollA:visitorRoll,rollB:visitorSecond,concealed});

  const patchCamp=(patch)=>{const next={...camp,...patch};setCamp(next);writePatch({camp:next});};
  const toggleFeature=(id)=>{
    if(readOnly)return;
    const current=normalizeFeatureSelection(camp.features||[],campResult.featureSlots);
    const next=current.includes(id)?current.filter(item=>item!==id):normalizeFeatureSelection([...current,id],campResult.featureSlots);
    patchCamp({features:next});
  };
  const build=()=>{
    if(readOnly||typeof setCharacter!=="function"||!campAffordable)return;
    setCharacter(prev=>applyCampsiteBuild(prev,{...campResult,features:selectedFeatures})||prev);
  };
  const dismantle=()=>{if(!readOnly&&typeof setCharacter==="function")setCharacter(prev=>dismantleActiveCampsite(prev));};
  const rest=(hours)=>{if(!readOnly&&typeof setCharacter==="function")setCharacter(prev=>applyWinterCampRest(prev,{hours}));};
  const setVisitorA=(value)=>{setVisitorRoll(value);writePatch({visitorRoll:value});};
  const setVisitorB=(value)=>{setVisitorSecond(value);writePatch({visitorSecond:value});};

  return <section className="pip-panel camp-world">
    <header className="camp-world__header"><div><small>PIP / 2D20 // WORLD</small><h3>[ {text.title} ]</h3><p>{text.subtitle}</p></div>{readOnly?<small>{text.readOnly}</small>:null}</header>
    <div className="camp-world__grid">
      <div className="camp-world__build">
        {character?.activeCampsite ? <div className="camp-world__active">
          <div className="camp-world__status"><strong>{text.active} · T{character.activeCampsite.tier}</strong><span>{(character.activeCampsite.features||[]).join(", ")||"—"}</span></div>
          {!readOnly?<div className="camp-world__actions"><button type="button" className="pip-btn" onClick={()=>rest(6)}>{text.rest6}</button><button type="button" className="pip-btn" onClick={()=>rest(24)}>{text.rest24}</button><button type="button" className="pip-btn" onClick={dismantle}>{text.dismantle}</button></div>:null}
        </div> : <>
          <div className="camp-world__fields">
            <label>{text.tier}<select className="pip-input" value={camp.tier} disabled={readOnly} onChange={e=>patchCamp({tier:e.target.value,features:[]})}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
            <label>{text.apAfter}<NumberInput value={camp.apSpentAfterTest} disabled={readOnly} onChange={v=>patchCamp({apSpentAfterTest:v,features:normalizeFeatureSelection(camp.features||[],calculateCampsite({...camp,apSpentAfterTest:v}).featureSlots)})}/></label>
            <label className="camp-world__check"><input type="checkbox" checked={camp.buildSucceeded} disabled={readOnly} onChange={e=>patchCamp({buildSucceeded:e.target.checked,features:[]})}/><span>{text.buildSuccess}</span></label>
          </div>
          <div className="camp-world__status"><strong>{text.difficulty}: {campResult.difficulty}</strong><span>{text.materials}: {materialsText(campResult.materials)}</span><span>{text.features}: {campResult.featureSlots}</span><span>{text.refund}: {materialsText(campResult.teardownRefund)}</span></div>
          <div className="camp-world__materials"><strong>{text.inventoryMaterials}</strong><span>{materialsText(materialTotals)}</span>{!campAffordable?<em>{text.notEnough}</em>:null}</div>
          <div className="camp-world__features">{CAMPSITE_FEATURES.map(feature=><label key={feature.id} className={selectedFeatures.includes(feature.id)?"is-selected":""}><input type="checkbox" checked={selectedFeatures.includes(feature.id)} disabled={readOnly||(!selectedFeatures.includes(feature.id)&&selectedFeatures.length>=campResult.featureSlots)} onChange={()=>toggleFeature(feature.id)}/><span><strong>{feature.label}</strong><small>{feature.effect}</small></span></label>)}</div>
          <div className="camp-world__selected"><strong>{text.selectedFeatures}: {selectedFeatures.length}/{campResult.featureSlots}</strong><span>{selectedFeatures.join(", ")||"—"}</span></div>
          {!readOnly?<button type="button" className="pip-btn is-primary camp-world__build-button" disabled={!campAffordable||selectedFeatures.length>campResult.featureSlots} onClick={build}>{text.build}</button>:null}
        </>}
      </div>
      <aside className="camp-world__visitors">
        <h4>[ {text.visitors} ]</h4>
        <label>{text.visitorRoll}<NumberInput value={visitorRoll} disabled={readOnly} min={1} max={20} onChange={setVisitorA}/></label>
        {concealed?<label>{text.visitorSecond}<NumberInput value={visitorSecond} disabled={readOnly} min={1} max={20} onChange={setVisitorB}/></label>:null}
        <div className="camp-world__visitor-result"><strong>{text.visitorResult}: {visitor.roll}</strong>{concealed?<small>Concealed: min({visitor.rollA}, {visitor.rollB})</small>:null}<p>{visitor.text}</p></div>
      </aside>
    </div>
  </section>;
}
