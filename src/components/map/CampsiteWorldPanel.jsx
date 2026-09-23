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
  en:{title:"CAMPSITE",subtitle:"Wasteland camp",tier:"Tier",apAfter:"AP spent after build test",buildSuccess:"Build test succeeded",difficulty:"Difficulty",materials:"Materials",features:"Feature slots",refund:"Teardown refund",inventoryMaterials:"Inventory materials",notEnough:"Not enough materials",selectedFeatures:"Selected features",build:"BUILD CAMPSITE",active:"ACTIVE CAMPSITE",rest6:"REST 6H",rest24:"REST 24H",dismantle:"DISMANTLE",visitors:"CAMPSITE VISITORS",visitorRoll:"Visitor d20",visitorSecond:"Second d20 (Concealed)",visitorResult:"Visitor",readOnly:"Camp controls are available to the GM.",health:"CAMP HEALTH CHECK",healthHint:"Review food, water, clothing and rest before ending camp.",warmClothing:"Warm clothing",ate:"Ate a meal",rawFood:"Ate raw / untreated food",drank:"Drank enough water",dirtyWater:"Drank dirty / untreated water",slept:"Slept at least 6 hours",extremeCold:"Extreme cold exposure",wounds:"Untreated wounds",radiation:"Radiation received",applyHealth:"APPLY HEALTH CHECK",cancel:"CANCEL",risk:"Risk",safe:"No major risk",illnessRisk:"Food/water contamination — disease or poison test may be required.",coldRisk:"Cold exposure risk",woundRisk:"Untreated wounds may worsen.",lastCheck:"Last health check"},
  ru:{title:"ЛАГЕРЬ",subtitle:"Стоянка в пустоши",tier:"Уровень",apAfter:"AP после теста постройки",buildSuccess:"Тест постройки успешен",difficulty:"Сложность",materials:"Материалы",features:"Слоты особенностей",refund:"Возврат при разборке",inventoryMaterials:"Материалы в инвентаре",notEnough:"Недостаточно материалов",selectedFeatures:"Выбранные особенности",build:"ПОСТРОИТЬ ЛАГЕРЬ",active:"АКТИВНЫЙ ЛАГЕРЬ",rest6:"ОТДЫХ 6Ч",rest24:"ОТДЫХ 24Ч",dismantle:"РАЗОБРАТЬ",visitors:"ГОСТИ ЛАГЕРЯ",visitorRoll:"d20 посетителей",visitorSecond:"Второй d20 (Concealed)",visitorResult:"Гость",readOnly:"Управление лагерем доступно ГМ.",health:"ПРОВЕРКА ЗДОРОВЬЯ В ЛАГЕРЕ",healthHint:"Перед завершением отдыха проверь еду, воду, одежду и сон.",warmClothing:"Тёплая одежда",ate:"Персонаж ел",rawFood:"Ел сырую / необработанную пищу",drank:"Пил достаточно воды",dirtyWater:"Пил грязную / необработанную воду",slept:"Спал не менее 6 часов",extremeCold:"Был на экстремальном холоде",wounds:"Есть необработанные раны",radiation:"Получено радиации",applyHealth:"ПРИМЕНИТЬ ПРОВЕРКУ",cancel:"ОТМЕНА",risk:"Риск",safe:"Серьёзных рисков нет",illnessRisk:"Заражённая еда/вода — может потребоваться проверка на болезнь или яд.",coldRisk:"Риск переохлаждения",woundRisk:"Необработанные раны могут ухудшиться.",lastCheck:"Последняя проверка"},
  uk:{title:"ТАБІР",subtitle:"Стоянка у пустці",tier:"Рівень",apAfter:"AP після тесту побудови",buildSuccess:"Тест побудови успішний",difficulty:"Складність",materials:"Матеріали",features:"Слоти особливостей",refund:"Повернення при розбиранні",inventoryMaterials:"Матеріали в інвентарі",notEnough:"Недостатньо матеріалів",selectedFeatures:"Обрані особливості",build:"ПОБУДУВАТИ ТАБІР",active:"АКТИВНИЙ ТАБІР",rest6:"ВІДПОЧИНОК 6Г",rest24:"ВІДПОЧИНОК 24Г",dismantle:"РОЗІБРАТИ",visitors:"ГОСТІ ТАБОРУ",visitorRoll:"d20 відвідувачів",visitorSecond:"Другий d20 (Concealed)",visitorResult:"Гість",readOnly:"Керування табором доступне ГМ.",health:"ПЕРЕВІРКА ЗДОРОВ'Я В ТАБОРІ",healthHint:"Перед завершенням відпочинку перевір їжу, воду, одяг і сон.",warmClothing:"Теплий одяг",ate:"Персонаж їв",rawFood:"Їв сиру / необроблену їжу",drank:"Пив достатньо води",dirtyWater:"Пив брудну / необроблену воду",slept:"Спав щонайменше 6 годин",extremeCold:"Був на екстремальному холоді",wounds:"Є необроблені рани",radiation:"Отримано радіації",applyHealth:"ЗАСТОСУВАТИ ПЕРЕВІРКУ",cancel:"СКАСУВАТИ",risk:"Ризик",safe:"Суттєвих ризиків немає",illnessRisk:"Заражена їжа/вода — може знадобитися перевірка на хворобу або отруту.",coldRisk:"Ризик переохолодження",woundRisk:"Необроблені рани можуть погіршитися.",lastCheck:"Остання перевірка"},
  pl:{title:"OBOZOWISKO",subtitle:"Obóz na pustkowiu",tier:"Poziom",apAfter:"AP po teście budowy",buildSuccess:"Test budowy udany",difficulty:"Trudność",materials:"Materiały",features:"Miejsca na cechy",refund:"Zwrot po rozbiórce",inventoryMaterials:"Materiały w ekwipunku",notEnough:"Za mało materiałów",selectedFeatures:"Wybrane cechy",build:"ZBUDUJ OBÓZ",active:"AKTYWNY OBÓZ",rest6:"ODPOCZYNEK 6H",rest24:"ODPOCZYNEK 24H",dismantle:"ROZBIERZ",visitors:"GOŚCIE OBOZU",visitorRoll:"d20 gości",visitorSecond:"Drugi d20 (Concealed)",visitorResult:"Gość",readOnly:"Sterowanie obozem jest dostępne dla MG.",health:"KONTROLA ZDROWIA W OBOZIE",healthHint:"Przed zakończeniem odpoczynku sprawdź jedzenie, wodę, odzież i sen.",warmClothing:"Ciepła odzież",ate:"Postać jadła",rawFood:"Zjadła surową / nieprzetworzoną żywność",drank:"Wypiła dość wody",dirtyWater:"Piła brudną / nieuzdatnioną wodę",slept:"Spała co najmniej 6 godzin",extremeCold:"Ekspozycja na ekstremalne zimno",wounds:"Nieleczone rany",radiation:"Otrzymane promieniowanie",applyHealth:"ZASTOSUJ KONTROLĘ",cancel:"ANULUJ",risk:"Ryzyko",safe:"Brak poważnego ryzyka",illnessRisk:"Skażone jedzenie/woda — może wymagać testu choroby lub trucizny.",coldRisk:"Ryzyko wychłodzenia",woundRisk:"Nieleczone rany mogą się pogorszyć.",lastCheck:"Ostatnia kontrola"}
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
  const [healthOpen,setHealthOpen]=useState(false);
  const [health,setHealth]=useState({warmClothing:true,ate:true,rawFood:false,drank:true,dirtyWater:false,slept:true,extremeCold:false,wounds:false,radiation:0});
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
  const warmShelter=Boolean(character?.activeCampsite?.features?.includes("campfire")&&character?.activeCampsite?.features?.includes("shelter"));
  const healthRisks=[
    (health.rawFood||health.dirtyWater)?text.illnessRisk:"",
    (health.extremeCold||(!health.warmClothing&&!warmShelter))?text.coldRisk:"",
    health.wounds?text.woundRisk:"",
  ].filter(Boolean);
  const patchHealth=(patch)=>setHealth(prev=>({...prev,...patch}));
  const applyHealthCheck=()=>{
    if(readOnly||typeof setCharacter!=="function")return;
    setCharacter(prev=>{
      const clamp=(value)=>Math.max(0,Math.min(5,Number(value)||0));
      const coldRisk=health.extremeCold||(!health.warmClothing&&!warmShelter);
      const nextSatiety=clamp((Number(prev.satiety)||0)+(health.ate?1:-1));
      const nextThirst=clamp((Number(prev.thirst)||0)+(health.drank?1:-1));
      const nextVigor=health.slept?5:clamp((Number(prev.vigor)||0)-1);
      const fatigueAdd=(coldRisk?1:0)+(!health.slept?1:0);
      const radiationAdd=Math.max(0,Number(health.radiation)||0);
      const nextRadiation=Math.max(0,Number(prev.radiationHp||0)+radiationAdd);
      return {
        ...prev,
        satiety:String(nextSatiety),
        thirst:String(nextThirst),
        vigor:String(nextVigor),
        fatigue:String(Math.max(0,Number(prev.fatigue||0)+fatigueAdd)),
        radiationHp:String(nextRadiation),
        statuses:{...(prev.statuses||{}),exposure:coldRisk||Boolean(prev.statuses?.exposure)},
        lastCampHealthCheck:{
          at:new Date().toISOString(),
          warmClothing:Boolean(health.warmClothing),
          warmShelter,
          ate:Boolean(health.ate),
          rawFood:Boolean(health.rawFood),
          drank:Boolean(health.drank),
          dirtyWater:Boolean(health.dirtyWater),
          slept:Boolean(health.slept),
          extremeCold:Boolean(health.extremeCold),
          untreatedWounds:Boolean(health.wounds),
          radiation:radiationAdd,
          risks:[...healthRisks],
        },
      };
    });
    setHealthOpen(false);
  };

  return <section className="pip-panel camp-world">
    <header className="camp-world__header"><div><small>PIP / 2D20 // WORLD</small><h3>[ {text.title} ]</h3><p>{text.subtitle}</p></div>{readOnly?<small>{text.readOnly}</small>:null}</header>
    <div className="camp-world__grid">
      <div className="camp-world__build">
        {character?.activeCampsite ? <div className="camp-world__active" role={!readOnly?"button":undefined} tabIndex={!readOnly?0:undefined} onClick={()=>!readOnly&&setHealthOpen(true)} onKeyDown={e=>{if(!readOnly&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setHealthOpen(true);}}}>
          <div className="camp-world__status"><strong>{text.active} · T{character.activeCampsite.tier}</strong><span>{(character.activeCampsite.features||[]).join(", ")||"—"}</span></div>
          {!readOnly?<div className="camp-world__actions" onClick={e=>e.stopPropagation()}><button type="button" className="pip-btn" onClick={()=>rest(6)}>{text.rest6}</button><button type="button" className="pip-btn" onClick={()=>rest(24)}>{text.rest24}</button><button type="button" className="pip-btn" onClick={dismantle}>{text.dismantle}</button></div>:null}
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
    {character?.lastCampHealthCheck ? <small className="camp-world__last-check">{text.lastCheck}: {new Date(character.lastCampHealthCheck.at).toLocaleString()} · {(character.lastCampHealthCheck.risks||[]).length?character.lastCampHealthCheck.risks.join(" · "):text.safe}</small> : null}
    {healthOpen ? <div className="camp-health-modal" role="dialog" aria-modal="true" aria-label={text.health} onClick={()=>setHealthOpen(false)}>
      <div className="camp-health-modal__card" onClick={e=>e.stopPropagation()}>
        <header><div><small>PIP / 2D20 // CAMP</small><h3>[ {text.health} ]</h3><p>{text.healthHint}</p></div><button type="button" className="pip-btn" onClick={()=>setHealthOpen(false)}>×</button></header>
        <div className="camp-health-modal__questions">
          {[
            ["warmClothing",text.warmClothing],
            ["ate",text.ate],
            ["rawFood",text.rawFood],
            ["drank",text.drank],
            ["dirtyWater",text.dirtyWater],
            ["slept",text.slept],
            ["extremeCold",text.extremeCold],
            ["wounds",text.wounds],
          ].map(([key,label])=><label key={key}><input type="checkbox" checked={Boolean(health[key])} onChange={e=>patchHealth({[key]:e.target.checked})}/><span>{label}</span></label>)}
          <label className="camp-health-modal__radiation"><span>{text.radiation}</span><NumberInput min={0} max={999} value={health.radiation} onChange={value=>patchHealth({radiation:value})}/></label>
        </div>
        <div className={"camp-health-modal__risk "+(healthRisks.length?"is-risk":"is-safe")}><strong>{text.risk}</strong>{healthRisks.length?healthRisks.map((risk,index)=><span key={index}>{risk}</span>):<span>{text.safe}</span>}<small>Warm shelter: {warmShelter?"YES":"NO"}</small></div>
        <div className="camp-health-modal__actions"><button type="button" className="pip-btn" onClick={()=>setHealthOpen(false)}>{text.cancel}</button><button type="button" className="pip-btn is-primary" onClick={applyHealthCheck}>{text.applyHealth}</button></div>
      </div>
    </div> : null}
  </section>;
}
