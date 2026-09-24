import React, { useMemo, useState } from "react";
import { calculateCampsite, CAMPSITE_FEATURES } from "../../utils/winterOfAtomRules.js";
import { countCraftingMaterials, canAffordMaterials, applyCampsiteBuild, applyWinterCampRest, normalizeFeatureSelection } from "../../utils/winterCampsiteInventory.js";
import "./campsiteWorldPanel.css";

const STORAGE_KEY="pip2d20_winter_rules_v1";
const COPY={
  en:{title:"CAMP",hint:"Rest restores strength, but wasteland conditions can affect Survival and health.",tier:"Camp level",tierDifficulty:"Build difficulty",tierFeatures:"Feature slots",tierFailure:"On a failed build test, the campsite is built two tiers lower (minimum Tier 1).",tierDescriptions:{1:"A minimal campsite. No build test is required and it provides 1 campsite feature.",2:"A more prepared campsite with 2 feature slots. Requires a successful group INT build test.",3:"A developed campsite with 3 feature slots and the first Uncommon Material cost.",4:"A strong campsite with 4 feature slots and a demanding construction test.",5:"An advanced campsite with 5 feature slots. Rare Materials are now required.",6:"The highest standard campsite tier: 6 feature slots, the hardest build test, and the largest material cost."},warm:"Warm clothing",raw:"Ate raw / untreated food",dirty:"Drank dirty / untreated water",animals:"Fought animals",sleep:"Slept at least 6 hours",penalty:"Survival penalty",risk:"Risk",none:"none",disease:"disease",poison:"poisoning",cold:"cold exposure",wounds:"wound infection",materials:"Materials",inventory:"Inventory",notEnough:"Not enough materials",apply:"APPLY",cancel:"CANCEL",check:"END + Survival check",roll:"ROLL 2D20",tn:"TN",difficulty:"Difficulty",success:"SUCCESS",failure:"FAILURE",successes:"successes",complications:"complications",needRoll:"Roll the check before applying.",diseaseApplied:"Disease",poisonApplied:"Poisoned",noExposure:"No disease/poison check required.",featureTitle:"Campsite features",featureSelected:"Selected",featureNeed:"Choose features equal to your available slots.",featureMax:"Maximum",featureCopy:{campfire:["Campfire","Provides warmth and helps protect against cold exposure for short periods."],shelter:["Shelter","Protects from weather. Together with a heat source, allows recovery from cold Fatigue."],bedding:["Comfortable Bedding","After sleeping here, gain +2 Maximum HP until you sleep again."],cooking:["Cooking Station","Provides a temporary cooking station for crafting food and beverages."],alarmed:["Alarmed Site","Intruders make an AGI test with difficulty equal to campsite Tier or trigger an alarm."],cleaned:["Cleaned Site","Clears disease/poison sources and marks irradiated spots so they can be avoided."],concealed:["Concealed Site","Tracking Survival difficulty +2; Campsite Visitors are rolled twice and the lower result is used."],defensible:["Defensible Site","Grants 2 CD cover. Each extra pick adds +1 CD, to a maximum of 4 CD."]}},
  ru:{title:"ЛАГЕРЬ",hint:"Отдых в лагере восстанавливает силы, но условия Пустоши влияют на Выживание и здоровье.",tier:"Уровень лагеря",tierDifficulty:"Сложность постройки",tierFeatures:"Ячейки особенностей",tierFailure:"При провале проверки постройки создаётся лагерь на 2 уровня ниже (минимум Tier 1).",tierDescriptions:{1:"Минимальный лагерь. Проверка постройки не требуется, доступна 1 особенность лагеря.",2:"Более подготовленный лагерь с 2 особенностями. Требует успешной групповой INT-проверки постройки.",3:"Развитый лагерь с 3 особенностями; впервые требуются Uncommon Materials.",4:"Хорошо обустроенный лагерь с 4 особенностями и сложной проверкой строительства.",5:"Продвинутый лагерь с 5 особенностями. Для строительства уже нужны Rare Materials.",6:"Максимальный стандартный уровень лагеря: 6 особенностей, самая сложная проверка и наибольшая стоимость материалов."},warm:"Есть тёплая одежда",raw:"Ел необработанную еду",dirty:"Пил грязную воду",animals:"Сражался с животными",sleep:"Спал не менее 6 часов",penalty:"Штраф к Выживанию",risk:"Риск",none:"нет",disease:"болезнь",poison:"отравление",cold:"переохлаждение",wounds:"инфекция ран",materials:"Материалы",inventory:"В инвентаре",notEnough:"Недостаточно материалов",apply:"ПРИМЕНИТЬ",cancel:"ОТМЕНА",check:"Проверка END + Survival",roll:"БРОСИТЬ 2D20",tn:"ЦЧ",difficulty:"Сложность",success:"УСПЕХ",failure:"ПРОВАЛ",successes:"успехов",complications:"осложнений",needRoll:"Сначала выполните проверку.",diseaseApplied:"Болезнь",poisonApplied:"Отравление",noExposure:"Проверка болезни/яда не требуется.",featureTitle:"Особенности лагеря",featureSelected:"Выбрано",featureNeed:"Выберите особенности по числу доступных ячеек.",featureMax:"Максимум",featureCopy:{campfire:["Костёр","Даёт тепло и помогает защищаться от переохлаждения на короткое время."],shelter:["Укрытие","Защищает от непогоды. Вместе с источником тепла позволяет восстанавливать Fatigue от холода."],bedding:["Удобная постель","+2 к максимальному HP после сна до следующего сна."],cooking:["Кулинарная станция","Временная станция для приготовления еды и напитков."],alarmed:["Сигнализация","Вторженец делает AGI-проверку со сложностью, равной Tier лагеря, иначе срабатывает тревога."],cleaned:["Очищенная стоянка","Убирает источники болезней/яда и отмечает радиоактивные зоны."],concealed:["Замаскированная стоянка","+2 к сложности Survival при выслеживании; Campsite Visitors бросаются дважды, берётся меньший результат."],defensible:["Обороняемая стоянка","Даёт 2 CD укрытия. Каждый повторный выбор даёт ещё +1 CD, максимум 4 CD."]}},
  uk:{title:"ТАБІР",hint:"Відпочинок відновлює сили, але умови Пустки впливають на Виживання та здоров'я.",tier:"Рівень табору",tierDifficulty:"Складність будівництва",tierFeatures:"Комірки особливостей",tierFailure:"У разі провалу перевірки будується табір на 2 рівні нижче (мінімум Tier 1).",tierDescriptions:{1:"Мінімальний табір. Перевірка будівництва не потрібна, доступна 1 особливість табору.",2:"Краще підготовлений табір із 2 особливостями. Потребує успішної групової INT-перевірки.",3:"Розвинений табір із 3 особливостями; вперше потрібні Uncommon Materials.",4:"Добре облаштований табір із 4 особливостями та складною перевіркою будівництва.",5:"Просунутий табір із 5 особливостями. Для будівництва вже потрібні Rare Materials.",6:"Найвищий стандартний рівень табору: 6 особливостей, найскладніша перевірка та найбільша вартість матеріалів."},warm:"Є теплий одяг",raw:"Їв необроблену їжу",dirty:"Пив брудну воду",animals:"Бився з тваринами",sleep:"Спав щонайменше 6 годин",penalty:"Штраф до Виживання",risk:"Ризик",none:"немає",disease:"хвороба",poison:"отруєння",cold:"переохолодження",wounds:"інфекція ран",materials:"Матеріали",inventory:"В інвентарі",notEnough:"Недостатньо матеріалів",apply:"ЗАСТОСУВАТИ",cancel:"СКАСУВАТИ",check:"Перевірка END + Survival",roll:"КИНУТИ 2D20",tn:"ЦЧ",difficulty:"Складність",success:"УСПІХ",failure:"ПРОВАЛ",successes:"успіхів",complications:"ускладнень",needRoll:"Спочатку виконайте перевірку.",diseaseApplied:"Хвороба",poisonApplied:"Отруєння",noExposure:"Перевірка хвороби/отрути не потрібна.",featureTitle:"Особливості табору",featureSelected:"Обрано",featureNeed:"Оберіть особливості відповідно до кількості доступних слотів.",featureMax:"Максимум",featureCopy:{campfire:["Багаття","Дає тепло та допомагає захищатися від холоду протягом короткого часу."],shelter:["Укриття","Захищає від негоди. Разом із джерелом тепла дозволяє відновлювати Fatigue від холоду."],bedding:["Зручна постіль","+2 до максимального HP після сну до наступного сну."],cooking:["Кулінарна станція","Тимчасова станція для приготування їжі та напоїв."],alarmed:["Сигналізація","Порушник проходить AGI-перевірку зі складністю, рівною Tier табору, або здіймає тривогу."],cleaned:["Очищена стоянка","Прибирає джерела хвороб/отрути та позначає радіоактивні ділянки."],concealed:["Замаскована стоянка","+2 до складності Survival для вистежування; Campsite Visitors кидаються двічі, береться нижчий результат."],defensible:["Оборонна стоянка","Дає 2 CD укриття. Кожен повторний вибір додає +1 CD, максимум 4 CD."]}},
  pl:{title:"OBÓZ",hint:"Odpoczynek przywraca siły, ale warunki pustkowi wpływają na Survival i zdrowie.",tier:"Poziom obozu",tierDifficulty:"Trudność budowy",tierFeatures:"Miejsca na cechy",tierFailure:"Po nieudanym teście powstaje obóz o 2 poziomy niższy (minimum Tier 1).",tierDescriptions:{1:"Minimalny obóz. Test budowy nie jest wymagany; dostępna jest 1 cecha obozu.",2:"Lepszy obóz z 2 cechami. Wymaga udanego grupowego testu INT.",3:"Rozwinięty obóz z 3 cechami; po raz pierwszy wymaga Uncommon Materials.",4:"Dobrze przygotowany obóz z 4 cechami i trudnym testem budowy.",5:"Zaawansowany obóz z 5 cechami. Do budowy potrzebne są już Rare Materials.",6:"Najwyższy standardowy poziom obozu: 6 cech, najtrudniejszy test i największy koszt materiałów."},warm:"Ciepła odzież",raw:"Zjadł surowe jedzenie",dirty:"Pił brudną wodę",animals:"Walczył ze zwierzętami",sleep:"Spał co najmniej 6 godzin",penalty:"Kara do Survival",risk:"Ryzyko",none:"brak",disease:"choroba",poison:"zatrucie",cold:"wychłodzenie",wounds:"infekcja ran",materials:"Materiały",inventory:"W ekwipunku",notEnough:"Za mało materiałów",apply:"ZASTOSUJ",cancel:"ANULUJ",check:"Test END + Survival",roll:"RZUĆ 2D20",tn:"TN",difficulty:"Trudność",success:"SUKCES",failure:"PORAŻKA",successes:"sukcesów",complications:"komplikacji",needRoll:"Najpierw wykonaj test.",diseaseApplied:"Choroba",poisonApplied:"Zatrucie",noExposure:"Test choroby/trucizny nie jest wymagany.",featureTitle:"Cechy obozu",featureSelected:"Wybrano",featureNeed:"Wybierz liczbę cech równą dostępnej liczbie miejsc.",featureMax:"Maksimum",featureCopy:{campfire:["Ognisko","Zapewnia ciepło i pomaga chronić przed wychłodzeniem przez krótki czas."],shelter:["Schronienie","Chroni przed pogodą. W połączeniu ze źródłem ciepła pozwala odzyskiwać Fatigue z zimna."],bedding:["Wygodne posłanie","+2 do maksymalnego HP po śnie do kolejnego snu."],cooking:["Stanowisko kuchenne","Tymczasowe stanowisko do przygotowywania jedzenia i napojów."],alarmed:["Alarm","Intruz wykonuje test AGI o trudności równej Tier obozu albo uruchamia alarm."],cleaned:["Oczyszczony obóz","Usuwa źródła chorób/trucizn i oznacza napromieniowane miejsca."],concealed:["Ukryty obóz","+2 do trudności Survival przy tropieniu; Campsite Visitors rzuca się dwa razy i używa niższego wyniku."],defensible:["Umocniony obóz","Daje 2 CD osłony. Każdy kolejny wybór daje +1 CD, maksymalnie 4 CD."]}}
};
function readState(){if(typeof window==="undefined")return{};try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch{return{};}}
function writePatch(patch){if(typeof window==="undefined")return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...readState(),...patch}));}catch{}}
function mat(m){return `C ${m?.common||0} · U ${m?.uncommon||0} · R ${m?.rare||0}`;}

export default function CampsiteWorldPanel({open=false,onClose,character=null,setCharacter=null,language="en",winterMode=false,onRoll=null,regionId="",currentPosition=null,onApplied=null,buildDifficultyReduction=0}){
  const code=String(language||"en").split("-")[0]; const text=COPY[code]||COPY.en;
  const saved=useMemo(readState,[]);
  const [tier,setTier]=useState(Number(character?.activeCampsite?.tier||saved?.camp?.tier||1));
  const [answers,setAnswers]=useState({warm:true,raw:false,dirty:false,animals:false,sleep:true});
  const [selectedFeatures,setSelectedFeatures]=useState(()=>normalizeFeatureSelection(character?.activeCampsite?.features||[],Number(character?.activeCampsite?.featureSlots||character?.activeCampsite?.tier||saved?.camp?.tier||1)));
  const [checkResult,setCheckResult]=useState(null);
  if(!open)return null;

  const campResult=calculateCampsite({tier,apSpentAfterTest:0,buildSucceeded:true});
  const effectiveBuildDifficulty=campResult.difficulty===0?0:Math.max(1,campResult.difficulty-Math.max(0,Number(buildDifficultyReduction)||0));
  const inventoryTotals=countCraftingMaterials(character?.inventoryItems||[]);
  const canBuild=Boolean(character?.activeCampsite)||canAffordMaterials(character?.inventoryItems||[],campResult.materials);
  const penalty=(answers.raw?1:0)+(answers.dirty?1:0)+(answers.animals?1:0)+(!answers.sleep?1:0)+(winterMode&&!answers.warm?1:0);
  const risks=[answers.raw?text.disease:"",answers.dirty?text.poison:"",answers.animals?text.wounds:"",winterMode&&!answers.warm?text.cold:""].filter(Boolean);
  const survivalEntry=Object.entries(character?.skills||{}).find(([key])=>String(key).toLowerCase().replaceAll("_"," ").trim()==="survival")?.[1]||{};
  const endurance=Math.max(0,Number(character?.special?.E||character?.special?.END||0));
  const survivalRank=Math.max(0,Number(survivalEntry.rank||0)+Number(survivalEntry.bonus||0));
  const criticalRange=survivalEntry.tagged?Math.max(1,Number(survivalEntry.rank||1)):1;
  const targetNumber=Math.max(0,Math.min(20,endurance+survivalRank));
  const contaminationDifficulty=Math.min(5,(answers.raw?1:0)+(answers.dirty?1:0)+(answers.animals?1:0));
  const needsCheck=contaminationDifficulty>0;
  const patch=(key,value)=>{setCheckResult(null);setAnswers(prev=>({...prev,[key]:value}));};
  const rollCheck=()=>{
    if(!needsCheck){setCheckResult({success:true,totalSuccesses:0,rolls:[],difficulty:0,complications:0});return;}
    if(typeof onRoll!=="function")return;
    onRoll({
      id:`camp-survival-${Date.now()}`,
      type:"skill",
      diceType:"d20",
      title:text.check,
      skillName:"Survival",
      skill:{...survivalEntry,rank:String(survivalRank)},
      targetNumber,
      criticalRange,
      testValue:targetNumber,
      diceCount:2,
      difficulty:contaminationDifficulty,
      source:"camp-survival",
      onResult:(result)=>{
        if(result?.diceType!=="d20"||result?.rollType!=="skill")return;
        const totalSuccesses=Math.max(0,Number(result.successes||0));
        setCheckResult({
          rolls:(result.diceValues||[]).map(value=>({value:Number(value)})),
          totalSuccesses,
          complications:Math.max(0,Number(result.complications||0)),
          difficulty:contaminationDifficulty,
          targetNumber,
          success:totalSuccesses>=contaminationDifficulty,
        });
      },
    });
  };
  const diseaseKey=()=>{
    if(answers.dirty)return "dysentery";
    if(answers.raw)return "parasites";
    if(answers.animals)return "weepingSores";
    return null;
  };

  const featureCount=id=>selectedFeatures.filter(item=>item===id).length;
  const toggleFeature=id=>{
    setSelectedFeatures(current=>{
      const count=current.filter(item=>item===id).length;
      if(id==="defensible"){
        if(count>0){
          const copy=[...current];const index=copy.lastIndexOf(id);copy.splice(index,1);return copy;
        }
        if(current.length>=campResult.featureSlots)return current;
        return [...current,id];
      }
      if(count>0)return current.filter(item=>item!==id);
      if(current.length>=campResult.featureSlots)return current;
      return [...current,id];
    });
  };
  const addDefensible=()=>setSelectedFeatures(current=>{
    const count=current.filter(item=>item==="defensible").length;
    if(count>=3 || current.length>=campResult.featureSlots)return current;
    return [...current,"defensible"];
  });
  const removeDefensible=()=>setSelectedFeatures(current=>{
    const index=current.lastIndexOf("defensible");if(index<0)return current;
    const copy=[...current];copy.splice(index,1);return copy;
  });
  const featuresComplete=selectedFeatures.length===campResult.featureSlots;

  const apply=()=>{
    if(typeof setCharacter!=="function"||!canBuild)return;
    setCharacter(prev=>{
      let next=prev;
      if(!prev?.activeCampsite){
        next=applyCampsiteBuild(prev,{...campResult,features:selectedFeatures})||prev;
        if(next?.activeCampsite) next={...next,activeCampsite:{...next.activeCampsite,regionId,worldX:Number(currentPosition?.worldX),worldY:Number(currentPosition?.worldY),placedAt:new Date().toISOString()}};
      } else if(Number(prev.activeCampsite.tier)!==Number(tier)){
        next={...prev,activeCampsite:{...prev.activeCampsite,tier:Number(tier),attemptedTier:Number(tier),featureSlots:campResult.featureSlots,features:normalizeFeatureSelection(selectedFeatures,campResult.featureSlots)}};
      }
      if(next?.activeCampsite&&!Number.isFinite(Number(next.activeCampsite.worldX))){
        next={...next,activeCampsite:{...next.activeCampsite,regionId,worldX:Number(currentPosition?.worldX),worldY:Number(currentPosition?.worldY),placedAt:next.activeCampsite.placedAt||new Date().toISOString()}};
      }
      if(answers.sleep) next=applyWinterCampRest(next,{hours:6});
      const fatigueAdd=(answers.animals?1:0)+(!answers.sleep?1:0)+(winterMode&&!answers.warm?1:0);
      const statuses={...(next.statuses||{})};
      if(winterMode&&!answers.warm) statuses.exposure=true;
      const failedCheck=Boolean(needsCheck&&checkResult&&!checkResult.success);
      const illness=failedCheck?diseaseKey():null;
      if(illness) statuses[illness]=true;
      if(failedCheck&&answers.dirty) statuses.poisoned=true;
      return {
        ...next,
        fatigue:String(Math.max(0,Number(next.fatigue||0)+fatigueAdd)),
        statuses,
        campSurvivalPenalty:penalty,
        lastCampHealthCheck:{
          at:new Date().toISOString(),tier:Number(tier),warmClothing:answers.warm,rawFood:answers.raw,dirtyWater:answers.dirty,
          foughtAnimals:answers.animals,slept:answers.sleep,survivalPenalty:penalty,risks,
          survivalCheck:checkResult?{dice:(checkResult.rolls||[]).map(d=>d.value),targetNumber,difficulty:contaminationDifficulty,successes:checkResult.totalSuccesses||0,complications:checkResult.complications||0,success:Boolean(checkResult.success)}:null,
          diseaseApplied:illness||null,poisoned:Boolean(failedCheck&&answers.dirty)
        }
      };
    });
    writePatch({camp:{...(saved.camp||{}),tier:Number(tier),features:selectedFeatures},lastCampHealthCheck:{...answers,penalty,risks,checkResult}});
    onApplied?.({tier:Number(tier),features:selectedFeatures,penalty,risks,checkResult,answers,regionId,worldX:Number(currentPosition?.worldX),worldY:Number(currentPosition?.worldY)});
    onClose?.();
  };

  return <div className="camp-modal" role="dialog" aria-modal="true" aria-label={text.title} onClick={()=>onClose?.()}>
    <div className="camp-modal__card" onClick={e=>e.stopPropagation()}>
      <header><div><small>PIP / 2D20 // WORLD</small><h2>▲ {text.title}</h2><p>{text.hint}</p></div><button className="camp-modal__close" type="button" onClick={()=>onClose?.()}>×</button></header>
      <label className="camp-modal__tier"><span>{text.tier}</span><select className="pip-input" value={tier} onChange={e=>{const next=Number(e.target.value);setTier(next);const slots=calculateCampsite({tier:next,apSpentAfterTest:0,buildSucceeded:true}).featureSlots;setSelectedFeatures(current=>normalizeFeatureSelection(current,slots));}}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <section className="camp-modal__tier-info">
        <p>{text.tierDescriptions?.[tier]}</p>
        <div className="camp-modal__tier-stats">
          <span>{text.tierDifficulty}: <b>{effectiveBuildDifficulty}</b>{buildDifficultyReduction>0?<small> (−{buildDifficultyReduction} AP)</small>:null}</span>
          <span>{text.materials}: <b>{mat(campResult.materials)}</b></span>
          <span>{text.tierFeatures}: <b>{campResult.featureSlots}</b></span>
        </div>
        <small>{text.tierFailure}</small>
      </section>
      <section className="camp-modal__features">
        <header><strong>{text.featureTitle}</strong><span>{text.featureSelected}: {selectedFeatures.length}/{campResult.featureSlots}</span></header>
        <small>{text.featureNeed}</small>
        <div className="camp-modal__feature-list">
          {CAMPSITE_FEATURES.map(feature=>{const copy=text.featureCopy?.[feature.id]||[feature.label,feature.effect];const count=featureCount(feature.id);return <div key={feature.id} className={`camp-modal__feature ${count?"is-selected":""}`}>
            <button type="button" className="camp-modal__feature-main" onClick={()=>toggleFeature(feature.id)} disabled={!count && selectedFeatures.length>=campResult.featureSlots}>
              <span>{count?"✓":"○"}</span><div><strong>{copy[0]}</strong><small>{copy[1]}</small></div>
            </button>
            {feature.id==="defensible"?<div className="camp-modal__feature-stepper"><button type="button" onClick={removeDefensible} disabled={count<=0}>−</button><b>{count}</b><button type="button" onClick={addDefensible} disabled={count>=3 || selectedFeatures.length>=campResult.featureSlots}>+</button><small>{text.featureMax}: 3</small></div>:null}
          </div>})}
        </div>
      </section>
      {!character?.activeCampsite?<div className="camp-modal__cost"><span>{text.materials}: {mat(campResult.materials)}</span><span>{text.inventory}: {mat(inventoryTotals)}</span>{!canBuild?<strong>{text.notEnough}</strong>:null}</div>:null}
      <div className="camp-modal__questions">
        {[["warm",text.warm],["raw",text.raw],["dirty",text.dirty],["animals",text.animals],["sleep",text.sleep]].map(([key,label])=><label key={key}><input type="checkbox" checked={answers[key]} onChange={e=>patch(key,e.target.checked)}/><span>{label}</span></label>)}
      </div>
      <section className="camp-modal__check"><header><strong>{text.check}</strong><span>{text.tn} {targetNumber} · {text.difficulty} {contaminationDifficulty}</span></header>
        {needsCheck?<><div className="camp-modal__check-meta"><span>END {endurance}</span><span>Survival {survivalRank}{survivalEntry.tagged?" ★":""}</span></div><button type="button" className="pip-btn" onClick={rollCheck}>{text.roll}</button>
        {checkResult?<div className={`camp-modal__roll-result ${checkResult.success?"is-success":"is-failure"}`}><strong>{checkResult.success?text.success:text.failure}</strong><span>{(checkResult.rolls||[]).map(d=>d.value).join(" + ")} · {checkResult.totalSuccesses||0} {text.successes}</span><small>{checkResult.complications||0} {text.complications}</small>{!checkResult.success?<span>{text.diseaseApplied}: {answers.dirty?"Dysentery":answers.raw?"Parasites":answers.animals?"Weeping Sores":"—"}{answers.dirty?` · ${text.poisonApplied}`:""}</span>:null}</div>:null}</>:<small>{text.noExposure}</small>}
      </section>
      <section className={`camp-modal__result ${penalty?"is-warning":"is-safe"}`}><div className="camp-modal__result-icon">♨</div><div><strong>{text.penalty}: <em>{penalty?`-${penalty}`:"0"}</em></strong><span>{text.risk}: {risks.length?risks.join(" / "):text.none}</span><small>{answers.animals?"+1 Fatigue · ":""}{!answers.sleep?"+1 Fatigue · ":""}{winterMode&&!answers.warm?"Exposure · ":""}{answers.sleep?"6h rest applied":""}</small></div></section>
      <footer><button type="button" className="pip-btn" onClick={()=>onClose?.()}>{text.cancel}</button><button type="button" className="pip-btn is-primary" disabled={!canBuild||!featuresComplete||(needsCheck&&!checkResult)} title={!featuresComplete?text.featureNeed:needsCheck&&!checkResult?text.needRoll:""} onClick={apply}>{text.apply}</button></footer>
    </div>
  </div>;
}