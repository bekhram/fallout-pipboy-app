import React, { useMemo, useState } from "react";
import { calculateJourneyDifficulty, JOURNEY_COMPLICATIONS, WINTER_WASTELAND_SCAVENGING, lookupD20, lookup2D20 } from "../../utils/winterOfAtomRules.js";
import { getWinterSurvivalTest } from "../../utils/winterTravelAutomation.js";

const COPY={
  en:{title:"TRAVEL RESOLVER",route:"Route conditions",speed:"Journey speed",routeQ:"Established route",familiar:"Familiar area",friendly:"Friendly faction controls area",directions:"Good directions / landmarks",obstacles:"Major obstacles easily avoided",cautious:"Cautious",normal:"Normal",hurried:"Hurried",difficulty:"Navigation difficulty",duration:"Travel time",ap:"AP OPTIONS",ideal:"Ideal Campsite",idealHint:"1+ AP: next campsite build difficulty -1 per AP (min 1)",clever:"Clever Plan",cleverHint:"2 AP per -1 navigation difficulty",lucky:"Lucky Break",luckyHint:"3 AP: avoid one random encounter",trash:"Treasure From Trash",trashHint:"3 AP: roll Winter Wasteland Scavenging",roll:"ROLL END + SURVIVAL",continue:"CONTINUE TRAVEL",cancel:"CANCEL",success:"NAVIGATION SUCCESS",failure:"NAVIGATION FAILURE",complications:"Complications",scavenged:"Scavenging",needRoll:"Roll the navigation test first."},
  ru:{title:"РАСЧЁТ ПУТЕШЕСТВИЯ",route:"Условия маршрута",speed:"Темп путешествия",routeQ:"Есть установленный маршрут",familiar:"Местность знакома",friendly:"Территорию контролирует дружественная фракция",directions:"Есть хорошие ориентиры / указания",obstacles:"Крупные препятствия легко обойти",cautious:"Осторожно",normal:"Нормально",hurried:"Спешка",difficulty:"Сложность навигации",duration:"Время пути",ap:"ОПЦИИ AP",ideal:"Идеальное место лагеря",idealHint:"1+ AP: -1 к сложности постройки следующего лагеря за AP (мин. 1)",clever:"Хитрый план",cleverHint:"2 AP за -1 к сложности навигации",lucky:"Счастливый случай",luckyHint:"3 AP: избежать одной случайной встречи",trash:"Сокровища из хлама",trashHint:"3 AP: бросок Winter Wasteland Scavenging",roll:"БРОСИТЬ END + SURVIVAL",continue:"ПРОДОЛЖИТЬ ПУТЬ",cancel:"ОТМЕНА",success:"НАВИГАЦИЯ УСПЕШНА",failure:"НАВИГАЦИЯ ПРОВАЛЕНА",complications:"Осложнения",scavenged:"Находка",needRoll:"Сначала выполните проверку навигации."},
  uk:{title:"РОЗРАХУНОК ПОДОРОЖІ",route:"Умови маршруту",speed:"Темп подорожі",routeQ:"Є встановлений маршрут",familiar:"Місцевість знайома",friendly:"Територію контролює дружня фракція",directions:"Є хороші орієнтири / вказівки",obstacles:"Великі перешкоди легко обійти",cautious:"Обережно",normal:"Нормально",hurried:"Поспіх",difficulty:"Складність навігації",duration:"Час подорожі",ap:"ОПЦІЇ AP",ideal:"Ідеальне місце табору",idealHint:"1+ AP: -1 до складності будівництва наступного табору за AP (мін. 1)",clever:"Хитрий план",cleverHint:"2 AP за -1 до складності навігації",lucky:"Щасливий випадок",luckyHint:"3 AP: уникнути однієї випадкової зустрічі",trash:"Скарб зі сміття",trashHint:"3 AP: кидок Winter Wasteland Scavenging",roll:"КИНУТИ END + SURVIVAL",continue:"ПРОДОВЖИТИ ПОДОРОЖ",cancel:"СКАСУВАТИ",success:"НАВІГАЦІЯ УСПІШНА",failure:"НАВІГАЦІЮ ПРОВАЛЕНО",complications:"Ускладнення",scavenged:"Знахідка",needRoll:"Спочатку виконайте перевірку навігації."},
  pl:{title:"ROZSTRZYGNIĘCIE PODRÓŻY",route:"Warunki trasy",speed:"Tempo podróży",routeQ:"Ustalona trasa",familiar:"Znany teren",friendly:"Przyjazna frakcja kontroluje teren",directions:"Dobre wskazówki / punkty orientacyjne",obstacles:"Duże przeszkody łatwe do ominięcia",cautious:"Ostrożnie",normal:"Normalnie",hurried:"Pośpiech",difficulty:"Trudność nawigacji",duration:"Czas podróży",ap:"OPCJE AP",ideal:"Idealne obozowisko",idealHint:"1+ AP: -1 do trudności budowy następnego obozu za AP (min. 1)",clever:"Sprytny plan",cleverHint:"2 AP za -1 do trudności nawigacji",lucky:"Szczęśliwy traf",luckyHint:"3 AP: uniknij jednego losowego spotkania",trash:"Skarb ze złomu",trashHint:"3 AP: rzut Winter Wasteland Scavenging",roll:"RZUĆ END + SURVIVAL",continue:"KONTYNUUJ PODRÓŻ",cancel:"ANULUJ",success:"NAWIGACJA UDANA",failure:"NAWIGACJA NIEUDANA",complications:"Komplikacje",scavenged:"Znalezisko",needRoll:"Najpierw wykonaj test nawigacji."}
};

function randomD20(){return 1+Math.floor(Math.random()*20);}

export default function WinterTravelResolver({open=false,character=null,language="en",baseHours=1,onRoll,onCancel,onResolve}){
  const code=String(language||"en").split("-")[0],t=COPY[code]||COPY.en;
  const [form,setForm]=useState({speed:"normal",establishedRoute:true,familiarArea:true,friendlyFaction:true,goodDirections:true,obstaclesAvoidable:true,idealAp:0,cleverAp:0,luckyBreak:false,treasure:false});
  const [result,setResult]=useState(null);
  const journey=useMemo(()=>calculateJourneyDifficulty({
    establishedRoute:form.establishedRoute,
    familiarArea:form.familiarArea,
    friendlyFaction:form.friendlyFaction,
    goodDirections:form.goodDirections,
    obstaclesAvoidable:form.obstaclesAvoidable,
    durationHours:Math.max(1,Number(baseHours)||1),
    speed:form.speed,
    apDifficultyReduction:Math.floor(Math.max(0,Number(form.cleverAp)||0)/2),
  }),[form,baseHours]);
  const survival=useMemo(()=>getWinterSurvivalTest(character||{}),[character]);
  const automaticResult=journey.difficulty===0 ? {success:true,successes:0,complications:0,rolls:[],complicationResults:[],scavenging:null,automatic:true} : null;
  const effectiveResult=result||automaticResult;
  if(!open)return null;

  const patch=(key,value)=>{setForm(prev=>({...prev,[key]:value}));setResult(null);};
  const roll=()=>{
    if(typeof onRoll!=="function")return;
    onRoll({
      id:`winter-nav-${Date.now()}`,
      type:"skill",
      diceType:"d20",
      title:t.title,
      skillName:"Survival",
      skill:{...(character?.skills?.Survival||{}),rank:String(survival.skillRank)},
      targetNumber:survival.targetNumber,
      criticalRange:survival.criticalRange,
      testValue:survival.targetNumber,
      diceCount:2,
      difficulty:journey.difficulty,
      source:"winter-navigation",
      onResult:(value)=>{
        if(value?.diceType!=="d20"||value?.rollType!=="skill")return;
        const successes=Math.max(0,Number(value.successes||0));
        const complications=Math.max(0,Number(value.complications||0));
        const complicationResults=Array.from({length:complications},()=>{const d20=randomD20();return lookupD20(JOURNEY_COMPLICATIONS,d20);});
        const scavenging=form.treasure?(()=>{const a=randomD20(),b=randomD20();return lookup2D20(WINTER_WASTELAND_SCAVENGING,a,b);})():null;
        setResult({success:successes>=journey.difficulty,successes,complications,rolls:value.diceValues||[],complicationResults,scavenging});
      }
    });
  };

  const confirm=()=>{
    if(!effectiveResult)return;
    onResolve?.({
      ...journey,
      navigation:effectiveResult,
      speed:form.speed,
      durationMultiplier:journey.durationHours/Math.max(1,Number(baseHours)||1),
      cleverPlanAp:Math.max(0,Math.floor(Number(form.cleverAp)||0)),
      idealCampsiteAp:Math.max(0,Math.floor(Number(form.idealAp)||0)),
      luckyBreak:Boolean(form.luckyBreak),
      treasureFromTrash:Boolean(form.treasure),
      campsiteDifficultyReduction:Math.max(0,Math.floor(Number(form.idealAp)||0)),
    });
  };

  return <div className="pip-travel-resolver" role="dialog" aria-modal="true" aria-label={t.title}>
    <div className="pip-travel-resolver__card pip-panel">
      <header><div><small>PIP / 2D20 // WINTER TRAVEL</small><h2>{t.title}</h2></div><button type="button" onClick={onCancel}>×</button></header>
      <section><h3>{t.route}</h3>
        {[
          ["establishedRoute",t.routeQ],["familiarArea",t.familiar],["friendlyFaction",t.friendly],["goodDirections",t.directions],["obstaclesAvoidable",t.obstacles]
        ].map(([key,label])=><label className="pip-travel-check" key={key}><input type="checkbox" checked={form[key]} onChange={e=>patch(key,e.target.checked)}/><span>{label}</span></label>)}
      </section>
      <label className="pip-travel-field"><span>{t.speed}</span><select className="pip-input" value={form.speed} onChange={e=>patch("speed",e.target.value)}><option value="cautious">{t.cautious}</option><option value="normal">{t.normal}</option><option value="hurried">{t.hurried}</option></select></label>
      <div className="pip-travel-resolver__summary"><strong>{t.difficulty}: D{journey.difficulty}</strong><span>{t.duration}: {journey.durationHours}h</span><span>END + Survival TN {survival.targetNumber}</span></div>
      <section><h3>{t.ap}</h3>
        <label className="pip-travel-ap"><span><b>{t.ideal}</b><small>{t.idealHint}</small></span><input className="pip-input" type="number" min="0" max="10" value={form.idealAp} onChange={e=>patch("idealAp",e.target.value)}/></label>
        <label className="pip-travel-ap"><span><b>{t.clever}</b><small>{t.cleverHint}</small></span><input className="pip-input" type="number" min="0" max="10" step="2" value={form.cleverAp} onChange={e=>patch("cleverAp",Math.floor(Math.max(0,Number(e.target.value)||0)/2)*2)}/></label>
        <label className="pip-travel-check"><input type="checkbox" checked={form.luckyBreak} onChange={e=>patch("luckyBreak",e.target.checked)}/><span><b>{t.lucky}</b><small>{t.luckyHint}</small></span></label>
        <label className="pip-travel-check"><input type="checkbox" checked={form.treasure} onChange={e=>patch("treasure",e.target.checked)}/><span><b>{t.trash}</b><small>{t.trashHint}</small></span></label>
      </section>
      {journey.difficulty>0 ? <button type="button" className="pip-btn is-primary" onClick={roll}>{t.roll}</button> : null}
      {effectiveResult?<section className={`pip-travel-result ${effectiveResult.success?"is-success":"is-failure"}`}><strong>{effectiveResult.success?t.success:t.failure}</strong><span>{effectiveResult.automatic?"D0 · AUTO":`${effectiveResult.successes}S · ${effectiveResult.complications}C`}</span>{effectiveResult.complicationResults?.length?<div><b>{t.complications}</b>{effectiveResult.complicationResults.map((item,index)=><small key={index}>{item.roll}: {item.text}</small>)}</div>:null}{effectiveResult.scavenging?<div><b>{t.scavenged}</b><small>{effectiveResult.scavenging.rollA}+{effectiveResult.scavenging.rollB}={effectiveResult.scavenging.total}: {effectiveResult.scavenging.text}</small></div>:null}</section>:null}
      <footer><button type="button" className="pip-btn" onClick={onCancel}>{t.cancel}</button><button type="button" className="pip-btn is-primary" disabled={!effectiveResult} title={!effectiveResult?t.needRoll:""} onClick={confirm}>{t.continue}</button></footer>
    </div>
  </div>;
}
