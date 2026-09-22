import React, { useMemo, useState } from "react";
import {
  calculateJourneyDifficulty,
  calculateColdExposureDifficulty,
  coldExposureFailure,
  calculateCampsite,
  CAMPSITE_FEATURES,
  REPUTATION_RANKS,
  prepareReputationTest,
  resolveReputationTest,
  lookupD20,
  JOURNEY_COMPLICATIONS,
  WINTER_RANDOM_ENCOUNTERS,
  WINTER_TERRAIN,
  WINTER_OBSTACLES,
  WINTER_CONDITIONS,
  SETTLEMENT_TASKS,
} from "../../utils/winterOfAtomRules.js";
import "./gmWinterRulesPanel.css";

const STORAGE_KEY="pip2d20_winter_rules_v1";

const COPY={
  en:{title:"WINTER SURVIVAL",travel:"TRAVEL",cold:"COLD EXPOSURE",camp:"CAMPSITE",rep:"SETTLEMENT REPUTATION",duration:"Base duration (hours)",speed:"Speed",route:"Established route",familiar:"Familiar area",friendly:"Friendly faction controls area",directions:"Good directions / landmarks",obstacles:"Major obstacles easily avoided",difficulty:"Difficulty",finalDuration:"Travel time",compRange:"Complication range",apReduction:"Clever plan reduction",roll:"d20 result",complication:"Journey complication",encounter:"Winter encounter",hours:"Hours exposed",warmClothing:"Warm clothing",extreme:"Extreme cold",shelter:"Warm shelter",hotFood:"Hot food/drink",activity:"Heavy travel/combat",failedExposure:"Apply failed exposure",complication20:"Complication rolled",fatigue:"Fatigue",recovery:"Warm shelter rest",tier:"Tier",apAfter:"AP spent after build test",buildSuccess:"Build test succeeded",materials:"Materials",features:"Feature slots",refund:"Teardown refund",settlement:"Settlement",rank:"Rank",positive:"Positive influences",negative:"Negative influences",charisma:"Charisma",dice:"Dice",resolve:"Resolve reputation test",result:"Result",success:"SUCCESS",failure:"FAILURE",apply:"Apply result",tasks:"Tasks unlocked at Friendly+",terrain:"Terrain / obstacles",conditions:"Conditions"},
  ru:{title:"ЗИМНЕЕ ВЫЖИВАНИЕ",travel:"ПУТЕШЕСТВИЕ",cold:"ХОЛОД",camp:"ЛАГЕРЬ",rep:"РЕПУТАЦИЯ ПОСЕЛЕНИЯ",duration:"Базовое время (часы)",speed:"Темп",route:"Есть проложенный маршрут",familiar:"Местность знакома",friendly:"Зона под контролем дружественной фракции",directions:"Есть хорошие ориентиры",obstacles:"Крупные препятствия легко обойти",difficulty:"Сложность",finalDuration:"Время пути",compRange:"Диапазон осложнений",apReduction:"Снижение за умный план",roll:"Результат d20",complication:"Осложнение пути",encounter:"Зимняя встреча",hours:"Часы на холоде",warmClothing:"Тёплая одежда",extreme:"Экстремальный холод",shelter:"Тёплое укрытие",hotFood:"Горячая еда/напиток",activity:"Тяжёлый путь/бой",failedExposure:"Применить провал",complication20:"Выпала complication",fatigue:"Усталость",recovery:"Отдых в тёплом укрытии",tier:"Уровень",apAfter:"AP после теста постройки",buildSuccess:"Тест постройки успешен",materials:"Материалы",features:"Слоты особенностей",refund:"Возврат при разборке",settlement:"Поселение",rank:"Ранг",positive:"Положительные влияния",negative:"Отрицательные влияния",charisma:"Харизма",dice:"Кубы",resolve:"Рассчитать репутацию",result:"Результат",success:"УСПЕХ",failure:"ПРОВАЛ",apply:"Применить результат",tasks:"Задания доступны с Friendly+",terrain:"Местность / препятствия",conditions:"Условия"},
  uk:{title:"ЗИМОВЕ ВИЖИВАННЯ",travel:"ПОДОРОЖ",cold:"ХОЛОД",camp:"ТАБІР",rep:"РЕПУТАЦІЯ ПОСЕЛЕННЯ",duration:"Базова тривалість (години)",speed:"Темп",route:"Є усталений маршрут",familiar:"Місцевість знайома",friendly:"Зона під контролем дружньої фракції",directions:"Є добрі орієнтири",obstacles:"Великі перешкоди легко оминути",difficulty:"Складність",finalDuration:"Час подорожі",compRange:"Діапазон ускладнень",apReduction:"Зниження за хитрий план",roll:"Результат d20",complication:"Ускладнення подорожі",encounter:"Зимова зустріч",hours:"Години на холоді",warmClothing:"Теплий одяг",extreme:"Екстремальний холод",shelter:"Тепле укриття",hotFood:"Гаряча їжа/напій",activity:"Важка подорож/бій",failedExposure:"Застосувати провал",complication20:"Випала complication",fatigue:"Втома",recovery:"Відпочинок у теплому укритті",tier:"Рівень",apAfter:"AP після тесту побудови",buildSuccess:"Тест побудови успішний",materials:"Матеріали",features:"Слоти особливостей",refund:"Повернення при розбиранні",settlement:"Поселення",rank:"Ранг",positive:"Позитивні впливи",negative:"Негативні впливи",charisma:"Харизма",dice:"Куби",resolve:"Розрахувати репутацію",result:"Результат",success:"УСПІХ",failure:"ПРОВАЛ",apply:"Застосувати результат",tasks:"Завдання доступні з Friendly+",terrain:"Місцевість / перешкоди",conditions:"Умови"},
  pl:{title:"ZIMOWE PRZETRWANIE",travel:"PODRÓŻ",cold:"EKSPOZYCJA NA ZIMNO",camp:"OBOZOWISKO",rep:"REPUTACJA OSADY",duration:"Bazowy czas (godziny)",speed:"Tempo",route:"Ustalona trasa",familiar:"Znany teren",friendly:"Przyjazna frakcja kontroluje teren",directions:"Dobre wskazówki / punkty orientacyjne",obstacles:"Duże przeszkody łatwe do ominięcia",difficulty:"Trudność",finalDuration:"Czas podróży",compRange:"Zakres komplikacji",apReduction:"Redukcja za sprytny plan",roll:"Wynik d20",complication:"Komplikacja podróży",encounter:"Zimowe spotkanie",hours:"Godziny ekspozycji",warmClothing:"Ciepła odzież",extreme:"Ekstremalne zimno",shelter:"Ciepłe schronienie",hotFood:"Gorące jedzenie/napój",activity:"Ciężka podróż/walka",failedExposure:"Zastosuj porażkę",complication20:"Wypadła komplikacja",fatigue:"Zmęczenie",recovery:"Odpoczynek w ciepłym schronieniu",tier:"Poziom",apAfter:"AP po teście budowy",buildSuccess:"Test budowy udany",materials:"Materiały",features:"Miejsca na cechy",refund:"Zwrot po rozbiórce",settlement:"Osada",rank:"Ranga",positive:"Pozytywne wpływy",negative:"Negatywne wpływy",charisma:"Charyzma",dice:"Kości",resolve:"Rozstrzygnij reputację",result:"Wynik",success:"SUKCES",failure:"PORAŻKA",apply:"Zastosuj wynik",tasks:"Zadania dostępne od Friendly+",terrain:"Teren / przeszkody",conditions:"Warunki"}
};

function lang(value){const code=String(value||"en").split("-")[0];return COPY[code]?code:"en";}
function readState(){if(typeof window==="undefined")return{};try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch{return{};}}
function writeState(value){if(typeof window==="undefined")return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));}catch{}}
function Checkbox({label,checked,onChange}){return <label className="winter-check"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>;}
function NumberInput({value,onChange,min=0,max=999}){return <input className="pip-input winter-number" type="number" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/>;}
function materialsText(materials){return `C ${materials.common||0} · U ${materials.uncommon||0} · R ${materials.rare||0}`;}

export default function GmWinterRulesPanel({character=null,setCharacter=null,language="en"}){
  const text=COPY[lang(language)];
  const initial=useMemo(readState,[]);
  const [travel,setTravel]=useState(initial.travel||{durationHours:24,speed:"normal",establishedRoute:true,familiarArea:true,friendlyFaction:true,goodDirections:true,obstaclesAvoidable:true,apDifficultyReduction:0,roll:1});
  const [cold,setCold]=useState(initial.cold||{hours:1,warmClothing:true,extremeCold:false,warmShelter:false,hotFood:false,physicalActivity:false,complication:false});
  const [camp,setCamp]=useState(initial.camp||{tier:1,apSpentAfterTest:0,buildSucceeded:true});
  const [rep,setRep]=useState(initial.rep||{settlement:"Diamond City",rank:2,positive:0,negative:0,rolls:"",last:null});
  const [encounterRoll,setEncounterRoll]=useState(initial.encounterRoll||1);

  const save=(next)=>writeState({travel,cold,camp,rep,encounterRoll,...next});
  const patchTravel=(patch)=>{const next={...travel,...patch};setTravel(next);save({travel:next});};
  const patchCold=(patch)=>{const next={...cold,...patch};setCold(next);save({cold:next});};
  const patchCamp=(patch)=>{const next={...camp,...patch};setCamp(next);save({camp:next});};
  const patchRep=(patch)=>{const next={...rep,...patch};setRep(next);save({rep:next});};

  const travelResult=useMemo(()=>calculateJourneyDifficulty(travel),[travel]);
  const coldDifficulty=useMemo(()=>calculateColdExposureDifficulty(cold),[cold]);
  const currentHp=Math.max(0,Number(character?.currentHp||0));
  const coldFailure=useMemo(()=>coldExposureFailure({hours:cold.hours,currentHp,complication:cold.complication}),[cold.hours,cold.complication,currentHp]);
  const campResult=useMemo(()=>calculateCampsite(camp),[camp]);
  const charisma=Math.max(0,Number(character?.special?.C??character?.special?.CHA??0));
  const repSetup=useMemo(()=>prepareReputationTest({charisma,rank:rep.rank,positive:rep.positive,negative:rep.negative}),[charisma,rep.rank,rep.positive,rep.negative]);
  const comp=lookupD20(JOURNEY_COMPLICATIONS,travel.roll);
  const encounter=lookupD20(WINTER_RANDOM_ENCOUNTERS,encounterRoll);

  const applyColdFailure=()=>{
    if(typeof setCharacter!=="function")return;
    setCharacter(prev=>{
      const existing=Math.max(0,Number(prev?.fatigue||0));
      return {...prev,fatigue:String(Math.min(coldFailure.fatigueCap,existing+coldFailure.fatigue)),coldExposureRecoveryHours:String(coldFailure.warmShelterRestHours),coldExposureLocked:Boolean(coldFailure.lockedByComplication)};
    });
  };

  const resolveRep=()=>{
    const rolls=String(rep.rolls||"").split(/[\s,;]+/).map(Number).filter(n=>Number.isFinite(n));
    const result=resolveReputationTest({charisma,rank:rep.rank,positive:rep.positive,negative:rep.negative,rolls});
    patchRep({last:result});
  };
  const applyRep=()=>{if(!rep.last)return;patchRep({rank:rep.last.nextRank,last:null,rolls:""});};

  return <section className="gm-winter pip-screen">
    <header className="gm-winter__header"><span>PIP / 2D20 // WINTER OF ATOM</span><h2>[ {text.title} ]</h2></header>
    <div className="gm-winter__grid">
      <article className="pip-panel gm-winter-card">
        <h3>[ {text.travel} ]</h3>
        <label>{text.duration}<NumberInput value={travel.durationHours} onChange={v=>patchTravel({durationHours:v})}/></label>
        <label>{text.speed}<select className="pip-input" value={travel.speed} onChange={e=>patchTravel({speed:e.target.value})}><option value="cautious">Cautious</option><option value="normal">Normal</option><option value="hurried">Hurried</option></select></label>
        <Checkbox label={text.route} checked={travel.establishedRoute} onChange={v=>patchTravel({establishedRoute:v})}/>
        <Checkbox label={text.familiar} checked={travel.familiarArea} onChange={v=>patchTravel({familiarArea:v})}/>
        <Checkbox label={text.friendly} checked={travel.friendlyFaction} onChange={v=>patchTravel({friendlyFaction:v})}/>
        <Checkbox label={text.directions} checked={travel.goodDirections} onChange={v=>patchTravel({goodDirections:v})}/>
        <Checkbox label={text.obstacles} checked={travel.obstaclesAvoidable} onChange={v=>patchTravel({obstaclesAvoidable:v})}/>
        <label>{text.apReduction}<NumberInput value={travel.apDifficultyReduction} onChange={v=>patchTravel({apDifficultyReduction:v})} max={5}/></label>
        <div className="winter-result"><b>{text.difficulty}: {travelResult.difficulty}</b><span>{text.finalDuration}: {travelResult.durationHours}h</span><span>{text.compRange}: {travelResult.complicationRange? `${21-travelResult.complicationRange}-20`:"—"}</span></div>
        <label>{text.roll}<NumberInput value={travel.roll} onChange={v=>patchTravel({roll:v})} min={1} max={20}/></label>
        <div className="winter-note"><b>{text.complication}</b><span>{comp.text}</span></div>
        <label>{text.encounter}<NumberInput value={encounterRoll} onChange={v=>{setEncounterRoll(v);save({encounterRoll:v});}} min={1} max={20}/></label>
        <div className="winter-note"><span>{encounter.text}</span></div>
      </article>

      <article className="pip-panel gm-winter-card">
        <h3>[ {text.cold} ]</h3>
        <label>{text.hours}<NumberInput value={cold.hours} onChange={v=>patchCold({hours:v})}/></label>
        <Checkbox label={text.warmClothing} checked={cold.warmClothing} onChange={v=>patchCold({warmClothing:v})}/>
        <Checkbox label={text.extreme} checked={cold.extremeCold} onChange={v=>patchCold({extremeCold:v})}/>
        <Checkbox label={text.shelter} checked={cold.warmShelter} onChange={v=>patchCold({warmShelter:v})}/>
        <Checkbox label={text.hotFood} checked={cold.hotFood} onChange={v=>patchCold({hotFood:v})}/>
        <Checkbox label={text.activity} checked={cold.physicalActivity} onChange={v=>patchCold({physicalActivity:v})}/>
        <Checkbox label={text.complication20} checked={cold.complication} onChange={v=>patchCold({complication:v})}/>
        <div className="winter-result"><b>{text.difficulty}: {coldDifficulty}</b><span>{text.fatigue}: +{coldFailure.fatigue} (max {coldFailure.fatigueCap})</span><span>{text.recovery}: {coldFailure.warmShelterRestHours}h</span></div>
        <button type="button" className="pip-btn" onClick={applyColdFailure} disabled={typeof setCharacter!=="function"}>{text.failedExposure}</button>
      </article>

      <article className="pip-panel gm-winter-card">
        <h3>[ {text.camp} ]</h3>
        <label>{text.tier}<select className="pip-input" value={camp.tier} onChange={e=>patchCamp({tier:e.target.value})}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
        <label>{text.apAfter}<NumberInput value={camp.apSpentAfterTest} onChange={v=>patchCamp({apSpentAfterTest:v})}/></label>
        <Checkbox label={text.buildSuccess} checked={camp.buildSucceeded} onChange={v=>patchCamp({buildSucceeded:v})}/>
        <div className="winter-result"><b>{text.difficulty}: {campResult.difficulty}</b><span>{text.materials}: {materialsText(campResult.materials)}</span><span>Built tier: {campResult.builtTier}</span><span>{text.features}: {campResult.featureSlots}</span><span>{text.refund}: {materialsText(campResult.teardownRefund)}</span></div>
        <div className="winter-feature-list">{CAMPSITE_FEATURES.map(f=><div key={f.id}><strong>{f.label}</strong><span>{f.effect}</span></div>)}</div>
      </article>

      <article className="pip-panel gm-winter-card">
        <h3>[ {text.rep} ]</h3>
        <label>{text.settlement}<input className="pip-input" value={rep.settlement} onChange={e=>patchRep({settlement:e.target.value})}/></label>
        <label>{text.rank}<select className="pip-input" value={rep.rank} onChange={e=>patchRep({rank:Number(e.target.value),last:null})}>{REPUTATION_RANKS.map(r=><option key={r.rank} value={r.rank}>{r.rank} · {r.label}</option>)}</select></label>
        <label>{text.charisma}<span className="winter-readonly">{charisma}</span></label>
        <label>{text.positive}<NumberInput value={rep.positive} onChange={v=>patchRep({positive:v,last:null})}/></label>
        <label>{text.negative}<NumberInput value={rep.negative} onChange={v=>patchRep({negative:v,last:null})}/></label>
        <div className="winter-result"><span>TN {repSetup.targetNumber}</span><span>D{repSetup.difficulty}</span><span>{repSetup.diceCount}d20</span></div>
        <label>{text.dice}<input className="pip-input" placeholder="3, 11, 20" value={rep.rolls} onChange={e=>patchRep({rolls:e.target.value,last:null})}/></label>
        <button type="button" className="pip-btn" onClick={resolveRep}>{text.resolve}</button>
        {rep.last?<div className="winter-result"><b>{text.result}: {rep.last.success?text.success:text.failure}</b><span>Successes: {rep.last.successes}</span><span>GM AP: +{rep.last.gmAp}</span><span>Rank → {rep.last.nextRank}</span><button type="button" className="pip-btn" onClick={applyRep}>{text.apply}</button></div>:null}
        {Number(rep.rank)>=3?<div className="winter-note"><b>{text.tasks}</b><span>{SETTLEMENT_TASKS.map(t=>`${t.label} (${t.attribute})`).join(" · ")}</span></div>:null}
      </article>

      <article className="pip-panel gm-winter-card gm-winter-card--reference">
        <h3>[ {text.terrain} ]</h3>
        {[...WINTER_TERRAIN,...WINTER_OBSTACLES].map(item=><div key={item.id} className="winter-ref-row"><span>{item.label}</span><b>{item.ap} AP</b></div>)}
        <h3>[ {text.conditions} ]</h3>
        {WINTER_CONDITIONS.map(item=><div key={item.id} className="winter-ref-row winter-ref-row--stack"><strong>{item.label}</strong><span>{item.effect}</span></div>)}
      </article>
    </div>
  </section>;
}
