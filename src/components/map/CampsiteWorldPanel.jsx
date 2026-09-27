import React, { useMemo, useState } from "react";
import {
  calculateCampsite,
  CAMPSITE_FEATURES,
  ROYAL_FLUSH_CAMPING_INHABITANTS,
  royalFlushCampSearchDifficulty,
  resolveRoyalFlushCampSearch,
  rollRoyalFlushCampProduction,
  lookupD20,
} from "../../utils/winterOfAtomRules.js";
import {
  countCraftingMaterials,
  canAffordMaterials,
  applyCampsiteBuild,
  applyWinterCampRest,
  normalizeFeatureSelection,
  applyRoyalFlushCampProduction,
  campsiteFeatureCounts,
  strikeDownActiveCampsite,
  recoverActiveCampsite,
} from "../../utils/winterCampsiteInventory.js";
import "./campsiteWorldPanel.css";

const STORAGE_KEY="pip2d20_winter_rules_v1";
const COPY={
  en:{title:"CAMP",hint:"Rest restores strength, but wasteland conditions can affect Survival and health.",tier:"Camp level",tierDifficulty:"Build difficulty",tierFeatures:"Feature slots",tierFailure:"On a failed build test, the campsite is built two tiers lower (minimum Tier 1).",tierDescriptions:{1:"A minimal campsite. No build test is required and it provides 1 campsite feature.",2:"A more prepared campsite with 2 feature slots. Requires a successful group INT build test.",3:"A developed campsite with 3 feature slots and the first Uncommon Material cost.",4:"A strong campsite with 4 feature slots and a demanding construction test.",5:"An advanced campsite with 5 feature slots. Rare Materials are now required.",6:"The highest standard campsite tier: 6 feature slots, the hardest build test, and the largest material cost."},warm:"Warm clothing",raw:"Ate raw / untreated food",dirty:"Drank dirty / untreated water",animals:"Fought animals",sleep:"Slept at least 6 hours",penalty:"Survival penalty",risk:"Risk",none:"none",disease:"disease",poison:"poisoning",cold:"cold exposure",wounds:"wound infection",materials:"Materials",inventory:"Inventory",notEnough:"Not enough materials",apply:"APPLY",cancel:"CANCEL",check:"END + Survival check",roll:"ROLL 2D20",tn:"TN",difficulty:"Difficulty",success:"SUCCESS",failure:"FAILURE",successes:"successes",complications:"complications",needRoll:"Roll the check before applying.",diseaseApplied:"Disease",poisonApplied:"Poisoned",noExposure:"No disease/poison check required.",featureTitle:"Campsite features",featureSelected:"Selected",featureNeed:"Choose features equal to your available slots.",featureMax:"Maximum",featureCopy:{campfire:["Campfire","Provides warmth and helps protect against cold exposure for short periods."],shelter:["Shelter","Protects from weather. Together with a heat source, allows recovery from cold Fatigue."],bedding:["Comfortable Bedding","After sleeping here, gain +2 Maximum HP until you sleep again."],cooking:["Cooking Station","Provides a temporary cooking station for crafting food and beverages."],alarmed:["Alarmed Site","Intruders make an AGI test with difficulty equal to campsite Tier or trigger an alarm."],cleaned:["Cleaned Site","Clears disease/poison sources and marks irradiated spots so they can be avoided."],concealed:["Concealed Site","Tracking Survival difficulty +2; Campsite Visitors are rolled twice and the lower result is used."],defensible:["Defensible Site","Grants 2 CD cover. Each extra pick adds +1 CD, to a maximum of 4 CD."],water_source:["Water Source","Produces Purified Water every 8 hours. Additional instances increase production."],hunting_traps:["Hunting Traps","Produces Critter Meat every 8 hours. Additional instances increase production."]}},
  ru:{title:"ЛАГЕРЬ",hint:"Отдых в лагере восстанавливает силы, но условия Пустоши влияют на Выживание и здоровье.",tier:"Уровень лагеря",tierDifficulty:"Сложность постройки",tierFeatures:"Ячейки особенностей",tierFailure:"При провале проверки постройки создаётся лагерь на 2 уровня ниже (минимум Tier 1).",tierDescriptions:{1:"Минимальный лагерь. Проверка постройки не требуется, доступна 1 особенность лагеря.",2:"Более подготовленный лагерь с 2 особенностями. Требует успешной групповой INT-проверки постройки.",3:"Развитый лагерь с 3 особенностями; впервые требуются Uncommon Materials.",4:"Хорошо обустроенный лагерь с 4 особенностями и сложной проверкой строительства.",5:"Продвинутый лагерь с 5 особенностями. Для строительства уже нужны Rare Materials.",6:"Максимальный стандартный уровень лагеря: 6 особенностей, самая сложная проверка и наибольшая стоимость материалов."},warm:"Есть тёплая одежда",raw:"Ел необработанную еду",dirty:"Пил грязную воду",animals:"Сражался с животными",sleep:"Спал не менее 6 часов",penalty:"Штраф к Выживанию",risk:"Риск",none:"нет",disease:"болезнь",poison:"отравление",cold:"переохлаждение",wounds:"инфекция ран",materials:"Материалы",inventory:"В инвентаре",notEnough:"Недостаточно материалов",apply:"ПРИМЕНИТЬ",cancel:"ОТМЕНА",check:"Проверка END + Survival",roll:"БРОСИТЬ 2D20",tn:"ЦЧ",difficulty:"Сложность",success:"УСПЕХ",failure:"ПРОВАЛ",successes:"успехов",complications:"осложнений",needRoll:"Сначала выполните проверку.",diseaseApplied:"Болезнь",poisonApplied:"Отравление",noExposure:"Проверка болезни/яда не требуется.",featureTitle:"Особенности лагеря",featureSelected:"Выбрано",featureNeed:"Выберите особенности по числу доступных ячеек.",featureMax:"Максимум",featureCopy:{campfire:["Костёр","Даёт тепло и помогает защищаться от переохлаждения на короткое время."],shelter:["Укрытие","Защищает от непогоды. Вместе с источником тепла позволяет восстанавливать Fatigue от холода."],bedding:["Удобная постель","+2 к максимальному HP после сна до следующего сна."],cooking:["Кулинарная станция","Временная станция для приготовления еды и напитков."],alarmed:["Сигнализация","Вторженец делает AGI-проверку со сложностью, равной Tier лагеря, иначе срабатывает тревога."],cleaned:["Очищенная стоянка","Убирает источники болезней/яда и отмечает радиоактивные зоны."],concealed:["Замаскированная стоянка","+2 к сложности Survival при выслеживании; Campsite Visitors бросаются дважды, берётся меньший результат."],defensible:["Обороняемая стоянка","Даёт 2 CD укрытия. Каждый повторный выбор даёт ещё +1 CD, максимум 4 CD."],water_source:["Источник воды","Производит очищенную воду каждые 8 часов. Повторный выбор увеличивает производство."],hunting_traps:["Охотничьи ловушки","Производят мясо зверьков каждые 8 часов. Повторный выбор увеличивает производство."]}},
  uk:{title:"ТАБІР",hint:"Відпочинок відновлює сили, але умови Пустки впливають на Виживання та здоров'я.",tier:"Рівень табору",tierDifficulty:"Складність будівництва",tierFeatures:"Комірки особливостей",tierFailure:"У разі провалу перевірки будується табір на 2 рівні нижче (мінімум Tier 1).",tierDescriptions:{1:"Мінімальний табір. Перевірка будівництва не потрібна, доступна 1 особливість табору.",2:"Краще підготовлений табір із 2 особливостями. Потребує успішної групової INT-перевірки.",3:"Розвинений табір із 3 особливостями; вперше потрібні Uncommon Materials.",4:"Добре облаштований табір із 4 особливостями та складною перевіркою будівництва.",5:"Просунутий табір із 5 особливостями. Для будівництва вже потрібні Rare Materials.",6:"Найвищий стандартний рівень табору: 6 особливостей, найскладніша перевірка та найбільша вартість матеріалів."},warm:"Є теплий одяг",raw:"Їв необроблену їжу",dirty:"Пив брудну воду",animals:"Бився з тваринами",sleep:"Спав щонайменше 6 годин",penalty:"Штраф до Виживання",risk:"Ризик",none:"немає",disease:"хвороба",poison:"отруєння",cold:"переохолодження",wounds:"інфекція ран",materials:"Матеріали",inventory:"В інвентарі",notEnough:"Недостатньо матеріалів",apply:"ЗАСТОСУВАТИ",cancel:"СКАСУВАТИ",check:"Перевірка END + Survival",roll:"КИНУТИ 2D20",tn:"ЦЧ",difficulty:"Складність",success:"УСПІХ",failure:"ПРОВАЛ",successes:"успіхів",complications:"ускладнень",needRoll:"Спочатку виконайте перевірку.",diseaseApplied:"Хвороба",poisonApplied:"Отруєння",noExposure:"Перевірка хвороби/отрути не потрібна.",featureTitle:"Особливості табору",featureSelected:"Обрано",featureNeed:"Оберіть особливості відповідно до кількості доступних слотів.",featureMax:"Максимум",featureCopy:{campfire:["Багаття","Дає тепло та допомагає захищатися від холоду протягом короткого часу."],shelter:["Укриття","Захищає від негоди. Разом із джерелом тепла дозволяє відновлювати Fatigue від холоду."],bedding:["Зручна постіль","+2 до максимального HP після сну до наступного сну."],cooking:["Кулінарна станція","Тимчасова станція для приготування їжі та напоїв."],alarmed:["Сигналізація","Порушник проходить AGI-перевірку зі складністю, рівною Tier табору, або здіймає тривогу."],cleaned:["Очищена стоянка","Прибирає джерела хвороб/отрути та позначає радіоактивні ділянки."],concealed:["Замаскована стоянка","+2 до складності Survival для вистежування; Campsite Visitors кидаються двічі, береться нижчий результат."],defensible:["Оборонна стоянка","Дає 2 CD укриття. Кожен повторний вибір додає +1 CD, максимум 4 CD."],water_source:["Джерело води","Виробляє очищену воду кожні 8 годин. Повторний вибір збільшує виробництво."],hunting_traps:["Мисливські пастки","Виробляють м'ясо звірів кожні 8 годин. Повторний вибір збільшує виробництво."]}},
  pl:{title:"OBÓZ",hint:"Odpoczynek przywraca siły, ale warunki pustkowi wpływają na Survival i zdrowie.",tier:"Poziom obozu",tierDifficulty:"Trudność budowy",tierFeatures:"Miejsca na cechy",tierFailure:"Po nieudanym teście powstaje obóz o 2 poziomy niższy (minimum Tier 1).",tierDescriptions:{1:"Minimalny obóz. Test budowy nie jest wymagany; dostępna jest 1 cecha obozu.",2:"Lepszy obóz z 2 cechami. Wymaga udanego grupowego testu INT.",3:"Rozwinięty obóz z 3 cechami; po raz pierwszy wymaga Uncommon Materials.",4:"Dobrze przygotowany obóz z 4 cechami i trudnym testem budowy.",5:"Zaawansowany obóz z 5 cechami. Do budowy potrzebne są już Rare Materials.",6:"Najwyższy standardowy poziom obozu: 6 cech, najtrudniejszy test i największy koszt materiałów."},warm:"Ciepła odzież",raw:"Zjadł surowe jedzenie",dirty:"Pił brudną wodę",animals:"Walczył ze zwierzętami",sleep:"Spał co najmniej 6 godzin",penalty:"Kara do Survival",risk:"Ryzyko",none:"brak",disease:"choroba",poison:"zatrucie",cold:"wychłodzenie",wounds:"infekcja ran",materials:"Materiały",inventory:"W ekwipunku",notEnough:"Za mało materiałów",apply:"ZASTOSUJ",cancel:"ANULUJ",check:"Test END + Survival",roll:"RZUĆ 2D20",tn:"TN",difficulty:"Trudność",success:"SUKCES",failure:"PORAŻKA",successes:"sukcesów",complications:"komplikacji",needRoll:"Najpierw wykonaj test.",diseaseApplied:"Choroba",poisonApplied:"Zatrucie",noExposure:"Test choroby/trucizny nie jest wymagany.",featureTitle:"Cechy obozu",featureSelected:"Wybrano",featureNeed:"Wybierz liczbę cech równą dostępnej liczbie miejsc.",featureMax:"Maksimum",featureCopy:{campfire:["Ognisko","Zapewnia ciepło i pomaga chronić przed wychłodzeniem przez krótki czas."],shelter:["Schronienie","Chroni przed pogodą. W połączeniu ze źródłem ciepła pozwala odzyskiwać Fatigue z zimna."],bedding:["Wygodne posłanie","+2 do maksymalnego HP po śnie do kolejnego snu."],cooking:["Stanowisko kuchenne","Tymczasowe stanowisko do przygotowywania jedzenia i napojów."],alarmed:["Alarm","Intruz wykonuje test AGI o trudności równej Tier obozu albo uruchamia alarm."],cleaned:["Oczyszczony obóz","Usuwa źródła chorób/trucizn i oznacza napromieniowane miejsca."],concealed:["Ukryty obóz","+2 do trudności Survival przy tropieniu; Campsite Visitors rzuca się dwa razy i używa niższego wyniku."],defensible:["Umocniony obóz","Daje 2 CD osłony. Każdy kolejny wybór daje +1 CD, maksymalnie 4 CD."],water_source:["Źródło wody","Produkuje oczyszczoną wodę co 8 godzin. Kolejne wybory zwiększają produkcję."],hunting_traps:["Pułapki myśliwskie","Produkują mięso zwierząt co 8 godzin. Kolejne wybory zwiększają produkcję."]}}
};

const ROYAL_COPY={
  en:{rules:"Rules",winter:"Winter of Atom",royal:"Royal Flush",findSite:"FIND CAMPSITE",dangerous:"Dangerous area",inhospitable:"Inhospitable area",siteCheck:"PER + Survival",siteReady:"Campsite found",siteFailed:"No suitable campsite found",inhabitants:"Camping inhabitants",campAp:"Camping Kit AP",spendKit:"SPEND 1 CAMP AP",production:"CAMP PRODUCTION · 8H",produce:"PRODUCE",strike:"STRIKE DOWN",recover:"RECOVER",recoverCheck:"AGI + Survival D1",teardown:"TAKE DOWN CAMP",heat:"EXTREME HEAT",heatHours:"Hours exposed",heavy:"Heavy clothing / armor",terrain:"Difficult terrain / obstacles",thirsty:"Thirsty / Dehydrated",shade:"Breaks in shelter / shade",hydrated:"Hydrated",heatCheck:"END + Survival",heatRoll:"ROLL HEAT CHECK",heatFailure:"Heat exposure failure",heatSuccess:"Heat resisted",heatFatigue:"Fatigue on failure"},
  ru:{rules:"Правила",winter:"Winter of Atom",royal:"Royal Flush",findSite:"НАЙТИ МЕСТО",dangerous:"Опасная местность",inhospitable:"Негостеприимная местность",siteCheck:"PER + Survival",siteReady:"Место для лагеря найдено",siteFailed:"Подходящее место не найдено",inhabitants:"Обитатели места",campAp:"AP Camping Kit",spendKit:"ПОТРАТИТЬ 1 CAMP AP",production:"ПРОИЗВОДСТВО ЛАГЕРЯ · 8Ч",produce:"ПРОИЗВЕСТИ",strike:"БЫСТРО СВЕРНУТЬ",recover:"РАЗОБРАТЬ И ВЕРНУТЬ",recoverCheck:"AGI + Survival D1",teardown:"СВЕРНУТЬ ЛАГЕРЬ",heat:"ЭКСТРЕМАЛЬНАЯ ЖАРА",heatHours:"Часов под жарой",heavy:"Тяжёлая одежда / броня",terrain:"Сложная местность / препятствия",thirsty:"Thirsty / Dehydrated",shade:"Перерывы в укрытии / тени",hydrated:"Hydrated",heatCheck:"END + Survival",heatRoll:"БРОСИТЬ ПРОВЕРКУ ЖАРЫ",heatFailure:"Провал воздействия жары",heatSuccess:"Жара перенесена",heatFatigue:"Fatigue при провале"},
  uk:{rules:"Правила",winter:"Winter of Atom",royal:"Royal Flush",findSite:"ЗНАЙТИ МІСЦЕ",dangerous:"Небезпечна місцевість",inhospitable:"Негостинна місцевість",siteCheck:"PER + Survival",siteReady:"Місце для табору знайдено",siteFailed:"Придатне місце не знайдено",inhabitants:"Мешканці місця",campAp:"AP Camping Kit",spendKit:"ВИТРАТИТИ 1 CAMP AP",production:"ВИРОБНИЦТВО ТАБОРУ · 8Г",produce:"ВИРОБИТИ",strike:"ШВИДКО ЗГОРНУТИ",recover:"РОЗІБРАТИ Й ПОВЕРНУТИ",recoverCheck:"AGI + Survival D1",teardown:"ЗГОРНУТИ ТАБІР",heat:"ЕКСТРЕМАЛЬНА СПЕКА",heatHours:"Годин під спекою",heavy:"Важкий одяг / броня",terrain:"Складна місцевість / перешкоди",thirsty:"Thirsty / Dehydrated",shade:"Перерви в укритті / тіні",hydrated:"Hydrated",heatCheck:"END + Survival",heatRoll:"КИНУТИ ПЕРЕВІРКУ СПЕКИ",heatFailure:"Провал впливу спеки",heatSuccess:"Спеку витримано",heatFatigue:"Fatigue при провалі"},
  pl:{rules:"Zasady",winter:"Winter of Atom",royal:"Royal Flush",findSite:"ZNAJDŹ MIEJSCE",dangerous:"Niebezpieczny teren",inhospitable:"Nieprzyjazny teren",siteCheck:"PER + Survival",siteReady:"Znaleziono miejsce na obóz",siteFailed:"Nie znaleziono odpowiedniego miejsca",inhabitants:"Mieszkańcy miejsca",campAp:"AP Camping Kit",spendKit:"WYDAJ 1 CAMP AP",production:"PRODUKCJA OBOZU · 8H",produce:"PRODUKUJ",strike:"SZYBKO ZWIŃ",recover:"ODZYSKAJ MATERIAŁY",recoverCheck:"AGI + Survival D1",teardown:"ZWIŃ OBÓZ",heat:"EKSTREMALNY UPAŁ",heatHours:"Godziny ekspozycji",heavy:"Ciężka odzież / pancerz",terrain:"Trudny teren / przeszkody",thirsty:"Thirsty / Dehydrated",shade:"Przerwy w schronieniu / cieniu",hydrated:"Hydrated",heatCheck:"END + Survival",heatRoll:"RZUĆ TEST UPAŁU",heatFailure:"Nieudany test upału",heatSuccess:"Upał wytrzymany",heatFatigue:"Fatigue przy porażce"}
};

function readState(){if(typeof window==="undefined")return{};try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")||{};}catch{return{};}}
function writePatch(patch){if(typeof window==="undefined")return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...readState(),...patch}));}catch{}}
function mat(m){return `C ${m?.common||0} · U ${m?.uncommon||0} · R ${m?.rare||0}`;}

export default function CampsiteWorldPanel({open=false,onClose,character=null,setCharacter=null,language="en",winterMode=false,onRoll=null,regionId="",currentPosition=null,onApplied=null,buildDifficultyReduction=0}){
  const code=String(language||"en").split("-")[0]; const text=COPY[code]||COPY.en; const royalText=ROYAL_COPY[code]||ROYAL_COPY.en;
  const saved=useMemo(readState,[]);
  const [tier,setTier]=useState(Number(character?.activeCampsite?.tier||saved?.camp?.tier||1));
  const [answers,setAnswers]=useState({warm:true,raw:false,dirty:false,animals:false,sleep:true});
  const [selectedFeatures,setSelectedFeatures]=useState(()=>normalizeFeatureSelection(character?.activeCampsite?.features||[],Number(character?.activeCampsite?.featureSlots||character?.activeCampsite?.tier||saved?.camp?.tier||1)));
  const [checkResult,setCheckResult]=useState(null);
  const [rulesMode,setRulesMode]=useState(character?.activeCampsite?.rulesMode||saved?.camp?.rulesMode||"royal_flush");
  const [siteOptions,setSiteOptions]=useState({dangerous:false,inhospitable:false});
  const [siteResult,setSiteResult]=useState(null);
  const [inhabitantResult,setInhabitantResult]=useState(null);
  const [campKitSpent,setCampKitSpent]=useState(false);
  const [recoverResult,setRecoverResult]=useState(null);
  const [heatOptions,setHeatOptions]=useState(()=>({
    enabled:false,
    hours:1,
    heavy:false,
    terrain:false,
    thirsty:Number(character?.thirst||0)===0,
    shade:false,
    hydrated:Number(character?.thirst||0)>=4,
  }));
  const [heatResult,setHeatResult]=useState(null);
  if(!open)return null;

  const campResult=calculateCampsite({tier,apSpentAfterTest:0,buildSucceeded:true,rulesMode});
  const hasCampingKit=(character?.inventoryItems||[]).some(item=>String(item?.canonicalName||item?.name||"").toLowerCase()==="camping kit");
  const effectiveBuildDifficulty=campResult.difficulty===0?0:Math.max(1,campResult.difficulty-Math.max(0,Number(buildDifficultyReduction)||0)-(campKitSpent?1:0));
  const featureOptions=rulesMode==="royal_flush"?CAMPSITE_FEATURES:CAMPSITE_FEATURES.filter(feature=>!["water_source","hunting_traps"].includes(feature.id));
  const productionCounts=campsiteFeatureCounts(character||{});
  const inventoryTotals=countCraftingMaterials(character?.inventoryItems||[]);
  const canBuild=Boolean(character?.activeCampsite)||canAffordMaterials(character?.inventoryItems||[],campResult.materials);
  const penalty=(answers.raw?1:0)+(answers.dirty?1:0)+(answers.animals?1:0)+(!answers.sleep?1:0)+(winterMode&&!answers.warm?1:0);
  const risks=[answers.raw?text.disease:"",answers.dirty?text.poison:"",answers.animals?text.wounds:"",winterMode&&!answers.warm?text.cold:""].filter(Boolean);
  const survivalEntry=Object.entries(character?.skills||{}).find(([key])=>String(key).toLowerCase().replaceAll("_"," ").trim()==="survival")?.[1]||{};
  const endurance=Math.max(0,Number(character?.special?.E||character?.special?.END||0));
  const survivalRank=Math.max(0,Number(survivalEntry.rank||0)+Number(survivalEntry.bonus||0));
  const criticalRange=survivalEntry.tagged?Math.max(1,Number(survivalEntry.rank||1)):1;
  const targetNumber=Math.max(0,Math.min(20,endurance+survivalRank));
  const heatHours=Math.max(1,Math.min(8,Math.floor(Number(heatOptions.hours)||1)));
  const heatDifficulty=Math.max(0,Math.min(5,
    heatHours+
    (heatOptions.heavy?1:0)+
    (heatOptions.terrain?1:0)+
    (heatOptions.thirsty?1:0)-
    (heatOptions.shade?1:0)-
    (heatOptions.hydrated?1:0)
  ));
  const patchHeat=(key,value)=>{setHeatResult(null);setHeatOptions(prev=>({...prev,[key]:value}));};
  const rollHeatCheck=()=>{
    if(!heatOptions.enabled||typeof onRoll!=="function")return;
    onRoll({
      id:`camp-heat-${Date.now()}`,
      type:"skill",diceType:"d20",title:royalText.heatCheck,skillName:"Survival",
      skill:{...survivalEntry,rank:String(survivalRank)},
      targetNumber,criticalRange,testValue:targetNumber,diceCount:2,difficulty:heatDifficulty,source:"royal-flush-extreme-heat",
      onResult:(result)=>{
        if(result?.diceType!=="d20"||result?.rollType!=="skill")return;
        const successes=Math.max(0,Number(result.successes||0));
        setHeatResult({
          success:successes>=heatDifficulty,
          successes,
          difficulty:heatDifficulty,
          diceValues:result.diceValues||[],
          complications:Math.max(0,Number(result.complications||0)),
        });
      },
    });
  };
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
  const repeatableFeatures=new Set(["defensible","water_source","hunting_traps"]);
  const toggleFeature=id=>{
    setSelectedFeatures(current=>{
      const count=current.filter(item=>item===id).length;
      if(repeatableFeatures.has(id)){
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

  const perception=Math.max(0,Number(character?.special?.P||character?.special?.PER||0));
  const campsiteSearchDifficulty=royalFlushCampSearchDifficulty(siteOptions);
  const campsiteSearchTarget=Math.max(0,Math.min(20,perception+survivalRank));
  const rollCampsiteSearch=()=>{
    if(typeof onRoll!=="function")return;
    onRoll({
      id:`camp-search-${Date.now()}`,type:"skill",diceType:"d20",title:royalText.siteCheck,skillName:"Survival",
      skill:{...survivalEntry,rank:String(survivalRank)},targetNumber:campsiteSearchTarget,criticalRange,diceCount:2,difficulty:campsiteSearchDifficulty,source:"royal-flush-camp-search",
      onResult:(result)=>{
        if(result?.diceType!=="d20")return;
        const resolved=resolveRoyalFlushCampSearch({rolls:result.diceValues||[],targetNumber:campsiteSearchTarget,difficulty:campsiteSearchDifficulty});
        setSiteResult(resolved);
        if(resolved.complications>0){
          const roll=1+Math.floor(Math.random()*20);
          setInhabitantResult(lookupD20(ROYAL_FLUSH_CAMPING_INHABITANTS,roll));
        }else setInhabitantResult(null);
      }
    });
  };
  const produceCampResources=()=>{
    if(typeof setCharacter!=="function"||!character?.activeCampsite)return;
    const productions=[];
    if(productionCounts.waterSource>0)productions.push(rollRoyalFlushCampProduction({featureId:"water_source",instances:productionCounts.waterSource,periods:1}));
    if(productionCounts.huntingTraps>0)productions.push(rollRoyalFlushCampProduction({featureId:"hunting_traps",instances:productionCounts.huntingTraps,periods:1}));
    setCharacter(prev=>productions.reduce((next,production)=>applyRoyalFlushCampProduction(next,production),prev));
  };
  const strikeDownCamp=()=>{ if(typeof setCharacter==="function")setCharacter(prev=>strikeDownActiveCampsite(prev,{campers:1})); onClose?.(); };
  const recoverCamp=()=>{
    if(typeof onRoll!=="function"||typeof setCharacter!=="function")return;
    const agility=Math.max(0,Number(character?.special?.A||character?.special?.AGI||0));
    const tn=Math.max(0,Math.min(20,agility+survivalRank));
    onRoll({id:`camp-recover-${Date.now()}`,type:"skill",diceType:"d20",title:royalText.recoverCheck,skillName:"Survival",skill:{...survivalEntry,rank:String(survivalRank)},targetNumber:tn,criticalRange,diceCount:2,difficulty:1,source:"royal-flush-camp-recover",
      onResult:(result)=>{const success=Number(result?.successes||0)>=1;setRecoverResult({success,rolls:result?.diceValues||[]});setCharacter(prev=>recoverActiveCampsite(prev,{campers:1,success}));onClose?.();}
    });
  };

  const apply=()=>{
    if(typeof setCharacter!=="function"||!canBuild)return;
    if(rulesMode==="royal_flush"&&!character?.activeCampsite&&!siteResult?.success)return;
    setCharacter(prev=>{
      let next=prev;
      if(!prev?.activeCampsite){
        next=applyCampsiteBuild(prev,{...campResult,features:selectedFeatures,rulesMode})||prev;
        if(next?.activeCampsite) next={...next,activeCampsite:{...next.activeCampsite,rulesMode,regionId,worldX:Number(currentPosition?.worldX),worldY:Number(currentPosition?.worldY),placedAt:new Date().toISOString()}};
      } else if(Number(prev.activeCampsite.tier)!==Number(tier)){
        next={...prev,activeCampsite:{...prev.activeCampsite,tier:Number(tier),attemptedTier:Number(tier),featureSlots:campResult.featureSlots,features:normalizeFeatureSelection(selectedFeatures,campResult.featureSlots)}};
      }
      if(next?.activeCampsite&&!Number.isFinite(Number(next.activeCampsite.worldX))){
        next={...next,activeCampsite:{...next.activeCampsite,regionId,worldX:Number(currentPosition?.worldX),worldY:Number(currentPosition?.worldY),placedAt:next.activeCampsite.placedAt||new Date().toISOString()}};
      }
      if(answers.sleep) next=applyWinterCampRest(next,{hours:6});
      const heatFatigue=heatOptions.enabled&&heatResult&&!heatResult.success?heatHours:0;
      const fatigueAdd=(answers.animals?1:0)+(!answers.sleep?1:0)+(winterMode&&!answers.warm?1:0)+heatFatigue;
      const statuses={...(next.statuses||{})};
      if(winterMode&&!answers.warm) statuses.exposure=true;
      const failedCheck=Boolean(needsCheck&&checkResult&&!checkResult.success);
      const illness=failedCheck?diseaseKey():null;
      if(illness) statuses[illness]=true;
      if(failedCheck&&answers.dirty) statuses.poisoned=true;
      return {
        ...next,
        fatigue:String(Math.max(0,Number(next.fatigue||0)+fatigueAdd)),
        thirst:heatOptions.enabled
          ? String(Math.max(0,Number(next.thirst||0)-Math.floor(heatHours/2)))
          : next.thirst,
        statuses,
        campSurvivalPenalty:penalty,
        lastCampHealthCheck:{
          at:new Date().toISOString(),tier:Number(tier),warmClothing:answers.warm,rawFood:answers.raw,dirtyWater:answers.dirty,
          foughtAnimals:answers.animals,slept:answers.sleep,survivalPenalty:penalty,risks,
          survivalCheck:checkResult?{dice:(checkResult.rolls||[]).map(d=>d.value),targetNumber,difficulty:contaminationDifficulty,successes:checkResult.totalSuccesses||0,complications:checkResult.complications||0,success:Boolean(checkResult.success)}:null,
          diseaseApplied:illness||null,poisoned:Boolean(failedCheck&&answers.dirty),
          extremeHeat:heatOptions.enabled?{
            hours:heatHours,difficulty:heatDifficulty,
            options:{...heatOptions},
            result:heatResult,
            fatigueApplied:heatFatigue,
          }:null
        }
      };
    });
    writePatch({camp:{...(saved.camp||{}),tier:Number(tier),features:selectedFeatures,rulesMode},lastCampHealthCheck:{...answers,penalty,risks,checkResult}});
    onApplied?.({tier:Number(tier),features:selectedFeatures,penalty,risks,checkResult,answers,regionId,worldX:Number(currentPosition?.worldX),worldY:Number(currentPosition?.worldY)});
    onClose?.();
  };

  return <div className="camp-modal" role="dialog" aria-modal="true" aria-label={text.title} onClick={()=>onClose?.()}>
    <div className="camp-modal__card" onClick={e=>e.stopPropagation()}>
      <header><div><small>PIP / 2D20 // WORLD</small><h2>▲ {text.title}</h2><p>{text.hint}</p></div><button className="camp-modal__close" type="button" onClick={()=>onClose?.()}>×</button></header>
      <section className="camp-modal__rules">
        <label><span>{royalText.rules}</span><select className="pip-input" value={rulesMode} onChange={e=>{setRulesMode(e.target.value);setSiteResult(null);setInhabitantResult(null);setCampKitSpent(false);}}>
          <option value="royal_flush">{royalText.royal}</option><option value="winter">{royalText.winter}</option>
        </select></label>
      </section>
      {rulesMode==="royal_flush"&&!character?.activeCampsite?<section className="camp-modal__site-search">
        <header><strong>{royalText.findSite}</strong><span>{royalText.siteCheck} · TN {campsiteSearchTarget} · D{campsiteSearchDifficulty}</span></header>
        <label><input type="checkbox" checked={siteOptions.dangerous} onChange={e=>{setSiteOptions(v=>({...v,dangerous:e.target.checked}));setSiteResult(null);}}/><span>{royalText.dangerous}</span></label>
        <label><input type="checkbox" checked={siteOptions.inhospitable} onChange={e=>{setSiteOptions(v=>({...v,inhospitable:e.target.checked}));setSiteResult(null);}}/><span>{royalText.inhospitable}</span></label>
        <button type="button" className="pip-btn" onClick={rollCampsiteSearch}>{royalText.findSite}</button>
        {siteResult?<div className={`camp-modal__roll-result ${siteResult.success?"is-success":"is-failure"}`}><strong>{siteResult.success?royalText.siteReady:royalText.siteFailed}</strong><span>{siteResult.successes} / {siteResult.difficulty}</span><small>Complications: {siteResult.complications}</small></div>:null}
        {inhabitantResult?<div className="camp-modal__inhabitants"><strong>{royalText.inhabitants} · d20 {inhabitantResult.roll}</strong><span>{inhabitantResult.text}</span></div>:null}
      </section>:null}
      <label className="camp-modal__tier"><span>{text.tier}</span><select className="pip-input" value={tier} onChange={e=>{const next=Number(e.target.value);setTier(next);const slots=calculateCampsite({tier:next,apSpentAfterTest:0,buildSucceeded:true,rulesMode}).featureSlots;setSelectedFeatures(current=>normalizeFeatureSelection(current,slots));}}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
      <section className="camp-modal__tier-info">
        <p>{text.tierDescriptions?.[tier]}</p>
        <div className="camp-modal__tier-stats">
          <span>{text.tierDifficulty}: <b>{effectiveBuildDifficulty}</b>{buildDifficultyReduction>0?<small> (−{buildDifficultyReduction} AP)</small>:null}</span>
          <span>{text.materials}: <b>{mat(campResult.materials)}</b></span>
          <span>{text.tierFeatures}: <b>{campResult.featureSlots}</b></span>
          {rulesMode==="royal_flush"&&hasCampingKit?<span>{royalText.campAp}: <b>{campKitSpent?0:1}</b> {!campKitSpent?<button type="button" className="pip-btn" onClick={()=>setCampKitSpent(true)}>{royalText.spendKit}</button>:null}</span>:null}
        </div>
        <small>{text.tierFailure}</small>
      </section>
      <section className="camp-modal__features">
        <header><strong>{text.featureTitle}</strong><span>{text.featureSelected}: {selectedFeatures.length}/{campResult.featureSlots}</span></header>
        <small>{text.featureNeed}</small>
        <div className="camp-modal__feature-list">
          {featureOptions.map(feature=>{const copy=text.featureCopy?.[feature.id]||[feature.label,feature.effect];const count=featureCount(feature.id);return <div key={feature.id} className={`camp-modal__feature ${count?"is-selected":""}`}>
            <button type="button" className="camp-modal__feature-main" onClick={()=>toggleFeature(feature.id)} disabled={!count && selectedFeatures.length>=campResult.featureSlots}>
              <span>{count?"✓":"○"}</span><div><strong>{copy[0]}</strong><small>{copy[1]}</small></div>
            </button>
            {feature.id==="defensible"?<div className="camp-modal__feature-stepper"><button type="button" onClick={removeDefensible} disabled={count<=0}>−</button><b>{count}</b><button type="button" onClick={addDefensible} disabled={count>=3 || selectedFeatures.length>=campResult.featureSlots}>+</button><small>{text.featureMax}: 3</small></div>:null}
            {["water_source","hunting_traps"].includes(feature.id)?<div className="camp-modal__feature-stepper"><button type="button" onClick={()=>setSelectedFeatures(current=>{const i=current.lastIndexOf(feature.id);if(i<0)return current;const copy=[...current];copy.splice(i,1);return copy;})} disabled={count<=0}>−</button><b>{count}</b><button type="button" onClick={()=>setSelectedFeatures(current=>current.length>=campResult.featureSlots?current:[...current,feature.id])} disabled={selectedFeatures.length>=campResult.featureSlots}>+</button></div>:null}
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
      {rulesMode==="royal_flush"?<section className="camp-modal__heat">
        <header><strong>{royalText.heat}</strong><label className="camp-modal__heat-toggle"><input type="checkbox" checked={heatOptions.enabled} onChange={e=>patchHeat("enabled",e.target.checked)}/><span>ON</span></label></header>
        {heatOptions.enabled?<div className="camp-modal__heat-body">
          <label><span>{royalText.heatHours}</span><input className="pip-input" type="number" min="1" max="8" value={heatOptions.hours} onChange={e=>patchHeat("hours",Math.max(1,Math.min(8,Number(e.target.value)||1)))}/></label>
          <label><input type="checkbox" checked={heatOptions.heavy} onChange={e=>patchHeat("heavy",e.target.checked)}/><span>{royalText.heavy} · +1D</span></label>
          <label><input type="checkbox" checked={heatOptions.terrain} onChange={e=>patchHeat("terrain",e.target.checked)}/><span>{royalText.terrain} · +1D</span></label>
          <label><input type="checkbox" checked={heatOptions.thirsty} onChange={e=>{patchHeat("thirsty",e.target.checked);if(e.target.checked)patchHeat("hydrated",false);}}/><span>{royalText.thirsty} · +1D</span></label>
          <label><input type="checkbox" checked={heatOptions.shade} onChange={e=>patchHeat("shade",e.target.checked)}/><span>{royalText.shade} · −1D</span></label>
          <label><input type="checkbox" checked={heatOptions.hydrated} onChange={e=>{patchHeat("hydrated",e.target.checked);if(e.target.checked)patchHeat("thirsty",false);}}/><span>{royalText.hydrated} · −1D</span></label>
          <div className="camp-modal__heat-summary"><strong>{royalText.heatCheck}</strong><span>TN {targetNumber} · D{heatDifficulty}</span><small>{royalText.heatFatigue}: {heatHours}</small></div>
          <button type="button" className="pip-btn" onClick={rollHeatCheck}>{royalText.heatRoll}</button>
          {heatResult?<div className={`camp-modal__roll-result ${heatResult.success?"is-success":"is-failure"}`}>
            <strong>{heatResult.success?royalText.heatSuccess:royalText.heatFailure}</strong>
            <span>{heatResult.successes} / {heatResult.difficulty}</span>
            {!heatResult.success?<small>+{heatHours} Fatigue</small>:null}
          </div>:null}
        </div>:null}
      </section>:null}
      <section className={`camp-modal__result ${penalty?"is-warning":"is-safe"}`}><div className="camp-modal__result-icon">♨</div><div><strong>{text.penalty}: <em>{penalty?`-${penalty}`:"0"}</em></strong><span>{text.risk}: {risks.length?risks.join(" / "):text.none}</span><small>{answers.animals?"+1 Fatigue · ":""}{!answers.sleep?"+1 Fatigue · ":""}{winterMode&&!answers.warm?"Exposure · ":""}{answers.sleep?"6h rest applied":""}</small></div></section>
      {rulesMode==="royal_flush"&&character?.activeCampsite?<section className="camp-modal__production">
        <header><strong>{royalText.production}</strong></header>
        <span>Water Source ×{productionCounts.waterSource} · Hunting Traps ×{productionCounts.huntingTraps}</span>
        {(productionCounts.waterSource||productionCounts.huntingTraps)?<button type="button" className="pip-btn" onClick={produceCampResources}>{royalText.produce}</button>:null}
      </section>:null}
      {character?.activeCampsite?<section className="camp-modal__teardown">
        <header><strong>{royalText.teardown}</strong></header>
        <button type="button" className="pip-btn" onClick={strikeDownCamp}>{royalText.strike}</button>
        <button type="button" className="pip-btn" onClick={recoverCamp}>{royalText.recover}</button>
        {recoverResult?<small>{recoverResult.success?"SUCCESS":"FAILURE"}</small>:null}
      </section>:null}
      <footer><button type="button" className="pip-btn" onClick={()=>onClose?.()}>{text.cancel}</button><button type="button" className="pip-btn is-primary" disabled={!canBuild||!featuresComplete||(needsCheck&&!checkResult)||(rulesMode==="royal_flush"&&!character?.activeCampsite&&!siteResult?.success)} title={!featuresComplete?text.featureNeed:needsCheck&&!checkResult?text.needRoll:""} onClick={apply}>{text.apply}</button></footer>
    </div>
  </div>;
}