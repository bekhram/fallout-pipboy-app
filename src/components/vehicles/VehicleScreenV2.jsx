import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  STOCK_VEHICLES,
  VEHICLE_QUALITIES,
  VEHICLE_MOVEMENT_ACTIONS,
  VEHICLE_OUT_OF_CONTROL,
  VEHICLE_INJURIES,
  cloneVehicle,
  getVehicleCraftCost,
  getVehicleRepairPlan,
  vehicleFuelMilesPerPoint,
  vehicleMovementPlan,
  vehicleRamDamage,
  consumeVehicleFuel,
  applyVehicleInjury,
  removeVehicleInjury,
  beginVehicleTurn,
  vehicleCriticalThreshold,
  vehicleLocationForRoll,
  vehicleInjuryIdForLocation,
} from "../../data/vehicles.js";
import { vehicleAssetFor } from "../../data/vehicleAssets.js";
import { createWeaponRoll } from "../../utils/dice.js";
import "./vehicleScreen.css";

const COPY = {
  en: {
    title:"TRANSPORT",subtitle:"Vehicles, travel and wasteland roads",my:"MY VEHICLES",catalog:"VEHICLE LIBRARY",custom:"CUSTOM",
    active:"ACTIVE",setActive:"SET ACTIVE",add:"ADD OWNED",craft:"CRAFT",remove:"REMOVE",edit:"EDIT",repair:"REPAIR +5 HP",
    noVehicles:"No vehicles in garage.",stats:"VEHICLE STATS",crew:"CREW",qualities:"VEHICLE QUALITIES",movement:"VEHICLE MOVEMENT",
    damage:"DAMAGE & CRITICAL HITS",fuel:"FUEL",ramming:"RAMMING",pilot:"Pilot",gunner:"Gunner",additional:"Additional roles",
    manageCrew:"MANAGE CREW",useFuel:"USE FUEL",refuel:"REFUEL",miles:"Miles",injuries:"Critical injuries",addInjury:"ADD INJURY",
    outControl:"OUT OF CONTROL",resources:"RESOURCES",noResources:"Not enough resources",build:"BUILD CUSTOM",name:"Name",
    scale:"Scale",speed:"Speed",physical:"Physical DR",energy:"Energy DR",hp:"HP",cover:"Cover",impact:"Impact",passengers:"Passengers",
    cargo:"Cargo Capacity",fuelTrack:"Fuel Track",weapons:"Weapons",location:"Repair location",difficulty:"Difficulty",rules:"Royal Flush vehicle rules",
    ram:"RAM",zones:"zones",recent:"Recent effects",none:"No active vehicle effects",gallery:"Garage",damageButton:"DAMAGE -5 HP",mounted:"MOUNTED WEAPONS",attack:"ATTACK",noMounted:"No mounted weapons",ramTest:"END + Pilot · D1"
  },
  ru: {
    title:"ТРАНСПОРТ",subtitle:"Машины, путешествия и дороги Пустоши",my:"МОЙ ТРАНСПОРТ",catalog:"КАТАЛОГ",custom:"СВОЙ ТРАНСПОРТ",
    active:"АКТИВНЫЙ",setActive:"СДЕЛАТЬ АКТИВНЫМ",add:"ДОБАВИТЬ ИМЕЮЩИЙСЯ",craft:"СКРАФТИТЬ",remove:"УДАЛИТЬ",edit:"РЕДАКТИРОВАТЬ",repair:"РЕМОНТ +5 HP",
    noVehicles:"В гараже пока нет транспорта.",stats:"ХАРАКТЕРИСТИКИ",crew:"ЭКИПАЖ",qualities:"КАЧЕСТВА ТРАНСПОРТА",movement:"ДВИЖЕНИЕ",
    damage:"ПОВРЕЖДЕНИЯ И КРИТЫ",fuel:"ТОПЛИВО",ramming:"ТАРАН",pilot:"Пилот",gunner:"Стрелок",additional:"Доп. роли",
    manageCrew:"УПРАВЛЕНИЕ ЭКИПАЖЕМ",useFuel:"ПОТРАТИТЬ ТОПЛИВО",refuel:"ЗАПРАВИТЬ",miles:"Мили",injuries:"Критические повреждения",addInjury:"ДОБАВИТЬ ПОВРЕЖДЕНИЕ",
    outControl:"ПОТЕРЯ УПРАВЛЕНИЯ",resources:"РЕСУРСЫ",noResources:"Не хватает ресурсов",build:"СОБРАТЬ СВОЙ",name:"Название",
    scale:"Масштаб",speed:"Скорость",physical:"Физ. DR",energy:"Энерг. DR",hp:"HP",cover:"Укрытие",impact:"Impact",passengers:"Пассажиры",
    cargo:"Груз",fuelTrack:"Топливо",weapons:"Оружие",location:"Узел ремонта",difficulty:"Сложность",rules:"Правила транспорта Royal Flush",
    ram:"ТАРАН",zones:"зон",recent:"Последние эффекты",none:"Нет активных эффектов",gallery:"Гараж",damageButton:"УРОН -5 HP",mounted:"УСТАНОВЛЕННОЕ ОРУЖИЕ",attack:"АТАКА",noMounted:"Нет установленного оружия",ramTest:"END + Pilot · D1"
  },
  uk: {
    title:"ТРАНСПОРТ",subtitle:"Машини, подорожі та дороги Пустки",my:"МІЙ ТРАНСПОРТ",catalog:"КАТАЛОГ",custom:"ВЛАСНИЙ ТРАНСПОРТ",
    active:"АКТИВНИЙ",setActive:"ЗРОБИТИ АКТИВНИМ",add:"ДОДАТИ НАЯВНИЙ",craft:"СКРАФТИТИ",remove:"ВИДАЛИТИ",edit:"РЕДАГУВАТИ",repair:"РЕМОНТ +5 HP",
    noVehicles:"У гаражі ще немає транспорту.",stats:"ХАРАКТЕРИСТИКИ",crew:"ЕКІПАЖ",qualities:"ЯКОСТІ ТРАНСПОРТУ",movement:"РУХ",
    damage:"ПОШКОДЖЕННЯ І КРИТИ",fuel:"ПАЛИВО",ramming:"ТАРАН",pilot:"Пілот",gunner:"Стрілець",additional:"Дод. ролі",
    manageCrew:"КЕРУВАННЯ ЕКІПАЖЕМ",useFuel:"ВИТРАТИТИ ПАЛИВО",refuel:"ЗАПРАВИТИ",miles:"Милі",injuries:"Критичні пошкодження",addInjury:"ДОДАТИ ПОШКОДЖЕННЯ",
    outControl:"ВТРАТА КЕРУВАННЯ",resources:"РЕСУРСИ",noResources:"Не вистачає ресурсів",build:"ЗІБРАТИ ВЛАСНИЙ",name:"Назва",
    scale:"Масштаб",speed:"Швидкість",physical:"Фіз. DR",energy:"Енерг. DR",hp:"HP",cover:"Укриття",impact:"Impact",passengers:"Пасажири",
    cargo:"Вантаж",fuelTrack:"Паливо",weapons:"Зброя",location:"Вузол ремонту",difficulty:"Складність",rules:"Правила транспорту Royal Flush",
    ram:"ТАРАН",zones:"зон",recent:"Останні ефекти",none:"Немає активних ефектів",gallery:"Гараж",damageButton:"ШКОДА -5 HP",mounted:"ВСТАНОВЛЕНА ЗБРОЯ",attack:"АТАКА",noMounted:"Немає встановленої зброї",ramTest:"END + Pilot · D1"
  },
  pl: {
    title:"POJAZDY",subtitle:"Pojazdy, podróże i drogi pustkowi",my:"MOJE POJAZDY",catalog:"KATALOG",custom:"WŁASNY POJAZD",
    active:"AKTYWNY",setActive:"USTAW AKTYWNY",add:"DODAJ POSIADANY",craft:"WYTWÓRZ",remove:"USUŃ",edit:"EDYTUJ",repair:"NAPRAW +5 HP",
    noVehicles:"Brak pojazdów w garażu.",stats:"STATYSTYKI POJAZDU",crew:"ZAŁOGA",qualities:"CECHY POJAZDU",movement:"RUCH POJAZDU",
    damage:"OBRAŻENIA I KRYTYKI",fuel:"PALIWO",ramming:"TARANOWANIE",pilot:"Pilot",gunner:"Strzelec",additional:"Dodatkowe role",
    manageCrew:"ZARZĄDZAJ ZAŁOGĄ",useFuel:"ZUŻYJ PALIWO",refuel:"ZATANKUJ",miles:"Mile",injuries:"Obrażenia krytyczne",addInjury:"DODAJ OBRAŻENIE",
    outControl:"UTRATA KONTROLI",resources:"ZASOBY",noResources:"Za mało zasobów",build:"ZBUDUJ WŁASNY",name:"Nazwa",
    scale:"Skala",speed:"Prędkość",physical:"Fiz. DR",energy:"Energia DR",hp:"HP",cover:"Osłona",impact:"Impact",passengers:"Pasażerowie",
    cargo:"Ładunek",fuelTrack:"Paliwo",weapons:"Broń",location:"Naprawiana część",difficulty:"Trudność",rules:"Zasady pojazdów Royal Flush",
    ram:"TARAN",zones:"stref",recent:"Ostatnie efekty",none:"Brak aktywnych efektów",gallery:"Garaż",damageButton:"OBRAŻENIA -5 HP",mounted:"BROŃ POKŁADOWA",attack:"ATAK",noMounted:"Brak zamontowanej broni",ramTest:"END + Pilot · D1"
  },
};

const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliases = {
  Steel:["steel","steel scrap"],Aluminum:["aluminum","aluminium"],Rubber:["rubber"],Gears:["gears","gear"],Screws:["screws","screw"],
  Springs:["springs","spring"],Adhesive:["adhesive"],Oil:["oil"],Circuitry:["circuitry","circuit"],"Nuclear Material":["nuclear material"]
};
const langCode=(value)=>{const code=String(value||"en").toLowerCase().split("-")[0];return COPY[code]?code:"en";};
const itemQuantity=(item)=>Math.max(0,Number(item?.quantity??item?.qty??0)||0);
const isMaterial=(item,material)=>{const key=normalize(item?.canonicalName||item?.name);return (aliases[material]||[normalize(material)]).some(name=>key===normalize(name));};
const countMaterial=(items,material)=>(items||[]).reduce((sum,item)=>sum+(isMaterial(item,material)?itemQuantity(item):0),0);
const canPay=(items,cost)=>Object.entries(cost||{}).every(([material,qty])=>countMaterial(items,material)>=qty);
const spendMaterials=(items,cost)=>{
  const remaining={...(cost||{})};
  return (items||[]).map(item=>{
    const material=Object.keys(remaining).find(key=>remaining[key]>0&&isMaterial(item,key));
    if(!material)return item;
    const qty=itemQuantity(item),spent=Math.min(qty,remaining[material]);
    remaining[material]-=spent;
    return {...item,quantity:String(qty-spent)};
  }).filter(item=>itemQuantity(item)>0||!Object.keys(cost||{}).some(key=>isMaterial(item,key)));
};

function Bar({value,max=5,segments=null}){
  const safeMax=Math.max(1,Number(max)||1);
  const safe=Math.max(0,Math.min(safeMax,Number(value)||0));
  const count=Math.max(1,Math.min(10,Number(segments)||safeMax));
  const filled=Math.round((safe/safeMax)*count);
  return <span className="vehicle-v2-bar" style={{"--vehicle-bar-segments":count}}>{Array.from({length:count},(_,i)=><i key={i} className={i<filled?"is-filled":""}/>)}</span>;
}

function Cost({cost,inventory,labels}){
  return <div className="vehicle-cost"><strong>{labels.resources}:</strong>{Object.entries(cost||{}).map(([key,qty])=>{
    const have=countMaterial(inventory,key);
    return <span key={key} className={have<qty?"is-missing":""}>{key} {have}/{qty}</span>;
  })}</div>;
}

function StatRow({label,children}){return <div className="vehicle-v2-stat-row"><span>{label}</span><b>{children}</b></div>;}

const DAMAGE_COPY={
  en:{incoming:"Incoming damage",type:"Damage type",location:"Hit location",apply:"APPLY DAMAGE",after:"After DR",threshold:"Critical threshold",triggered:"Critical hit triggered",roll:"ROLL CRITICAL LOCATION",hp:"Current HP",repair:"REPAIR INJURY",remove:"REMOVE",help:"Critical Hit: if one attack deals at least 5 + Scale damage after DR, roll d20 on the vehicle hit-location table and apply the matching Injury."},
  ru:{incoming:"Входящий урон",type:"Тип урона",location:"Локация попадания",apply:"ПРИМЕНИТЬ УРОН",after:"После DR",threshold:"Порог крита",triggered:"Сработал крит",roll:"БРОСИТЬ ЛОКАЦИЮ КРИТА",hp:"Текущий HP",repair:"ПОЧИНИТЬ КРИТ",remove:"УДАЛИТЬ",help:"Крит: если одна атака после DR наносит не меньше 5 + Scale урона, бросьте d20 по таблице локаций транспорта и примените соответствующее повреждение."},
  uk:{incoming:"Вхідна шкода",type:"Тип шкоди",location:"Локація влучання",apply:"ЗАСТОСУВАТИ ШКОДУ",after:"Після DR",threshold:"Поріг крита",triggered:"Спрацював крит",roll:"КИНУТИ ЛОКАЦІЮ КРИТА",hp:"Поточний HP",repair:"ПОЛАГОДИТИ КРИТ",remove:"ВИДАЛИТИ",help:"Крит: якщо одна атака після DR завдає не менше 5 + Scale шкоди, киньте d20 за таблицею локацій транспорту й застосуйте відповідне пошкодження."},
  pl:{incoming:"Nadchodzące obrażenia",type:"Typ obrażeń",location:"Miejsce trafienia",apply:"ZASTOSUJ OBRAŻENIA",after:"Po DR",threshold:"Próg krytyka",triggered:"Trafienie krytyczne",roll:"RZUĆ LOKACJĘ KRYTYCZNĄ",hp:"Bieżące HP",repair:"NAPRAW KRYTYK",remove:"USUŃ",help:"Krytyk: jeśli jeden atak zada po DR co najmniej 5 + Scale obrażeń, rzuć k20 na tabelę lokalizacji pojazdu i zastosuj odpowiednie uszkodzenie."}
};
const CUSTOM_DEFAULT={name:"Wasteland Vehicle",scale:2,maxHp:25,cover:"2",speedZones:2,speedMph:45,passengers:"4",impact:5,cargo:100,qualities:["Cargo","Exposed"],locations:[],weapons:[],fuelMax:4,fuelCurrent:4};

export default function VehicleScreenV2({character=null,setCharacter=null,onRoll=null}){
  const {i18n}=useTranslation();
  const language=langCode(i18n.resolvedLanguage||i18n.language);
  const labels=COPY[language];
  const damageLabels=DAMAGE_COPY[language]||DAMAGE_COPY.en;
  const [mode,setMode]=useState("garage");
  const [repairLocation,setRepairLocation]=useState("Chassis");
  const [movementAction,setMovementAction]=useState("maneuver");
  const [movementAp,setMovementAp]=useState(0);
  const [fuelMiles,setFuelMiles]=useState(10);
  const [injuryType,setInjuryType]=useState("chassis");
  const [incomingDamage,setIncomingDamage]=useState(0);
  const [damageType,setDamageType]=useState("Physical");
  const [damageLocation,setDamageLocation]=useState("Chassis");
  const [criticalPending,setCriticalPending]=useState(null);
  const [draft,setDraft]=useState(CUSTOM_DEFAULT);
  const vehicles=Array.isArray(character?.vehicles)?character.vehicles:[];
  const inventory=Array.isArray(character?.inventoryItems)?character.inventoryItems:[];
  const activeId=character?.activeVehicleId||vehicles[0]?.id||"";
  const active=vehicles.find(v=>v.id===activeId)||vehicles[0]||null;
  const update=(updater)=>setCharacter?.(prev=>updater(prev||{}));
  const patchVehicle=(id,patcher)=>update(prev=>({...prev,vehicles:(prev.vehicles||[]).map(v=>v.id===id?patcher(v):v)}));
  const setActive=(id)=>update(prev=>({...prev,activeVehicleId:id}));
  const removeVehicle=(id)=>update(prev=>({...prev,vehicles:(prev.vehicles||[]).filter(v=>v.id!==id),activeVehicleId:prev.activeVehicleId===id?"":prev.activeVehicleId}));
  const setHp=(id,delta)=>patchVehicle(id,v=>({...v,currentHp:Math.max(0,Math.min(Number(v.maxHp||1),Number(v.currentHp??v.maxHp)+delta))}));
  const addOwned=(template)=>update(prev=>({...prev,vehicles:[...(prev.vehicles||[]),cloneVehicle(template)]}));
  const craft=(template,custom=false)=>{
    const cost=getVehicleCraftCost(template);
    if(!canPay(inventory,cost)){window.alert(labels.noResources);return;}
    update(prev=>({...prev,inventoryItems:spendMaterials(prev.inventoryItems||[],cost),vehicles:[...(prev.vehicles||[]),cloneVehicle(template,{custom})]}));
  };
  const repair=(vehicle)=>{
    const plan=getVehicleRepairPlan(vehicle,repairLocation);
    if(plan.restore<=0||!canPay(inventory,plan.cost))return;
    update(prev=>({...prev,inventoryItems:spendMaterials(prev.inventoryItems||[],plan.cost),vehicles:(prev.vehicles||[]).map(v=>v.id===vehicle.id?{...v,currentHp:Math.min(Number(v.maxHp||1),Number(v.currentHp||0)+plan.restore)}:v)}));
  };
  const setCrew=(role,value)=>active&&patchVehicle(active.id,v=>({...v,crewRoles:{...(v.crewRoles||{}),[role]:value}}));
  const vehicleLocations=active?.locations?.length?active.locations:[{roll:"1-20",name:"Chassis",physical:0,energy:0}];
  const selectedDamageLocation=vehicleLocations.find((location)=>location.name===damageLocation)||vehicleLocations[0];
  const damageDr=damageType==="Energy"?Number(selectedDamageLocation?.energy||0):Number(selectedDamageLocation?.physical||0);
  const postDrDamage=Math.max(0,Number(incomingDamage||0)-damageDr);
  const criticalThreshold=active?vehicleCriticalThreshold(active):5;
  const setVehicleHp=(value)=>active&&patchVehicle(active.id,(vehicle)=>({...vehicle,currentHp:Math.max(0,Math.min(Number(vehicle.maxHp||1),Number(value)||0))}));
  const applyIncomingDamage=()=>{
    if(!active)return;
    const finalDamage=postDrDamage;
    patchVehicle(active.id,(vehicle)=>({...vehicle,currentHp:Math.max(0,Number(vehicle.currentHp??vehicle.maxHp)-finalDamage),lastDamage:{raw:Number(incomingDamage||0),damageType,location:selectedDamageLocation?.name||"Chassis",dr:damageDr,finalDamage,critical:finalDamage>=criticalThreshold,at:Date.now()}}));
    setCriticalPending(finalDamage>=criticalThreshold?{damage:finalDamage}:null);
  };
  const rollCriticalLocation=()=>{
    if(!active||typeof onRoll!=="function")return;
    onRoll({id:"vehicle-critical-location-"+Date.now(),type:"free",diceType:"d20",title:damageLabels.roll,diceCount:1,source:"vehicle-critical-location",onResult:(result)=>{
      const roll=Number(result?.diceValues?.[0]||0); if(!roll)return;
      const location=vehicleLocationForRoll(active,roll);
      const injuryId=vehicleInjuryIdForLocation(location?.name);
      patchVehicle(active.id,(vehicle)=>applyVehicleInjury(vehicle,injuryId,{location:location?.name,roll}));
      setCriticalPending(null);
    }});
  };
  const repairCriticalInjury=(injury)=>{
    if(!active)return;
    const location=injury?.location||(injury?.id==="engine"?"Engine":injury?.id==="weapon"?"Weapon":injury?.id==="mobility"?"Wheel":"Chassis");
    const plan=getVehicleRepairPlan(active,location);
    if(!canPay(inventory,plan.cost)){window.alert(labels.noResources);return;}
    update((prev)=>({...prev,inventoryItems:spendMaterials(prev.inventoryItems||[],plan.cost),vehicles:(prev.vehicles||[]).map((vehicle)=>vehicle.id!==active.id?vehicle:removeVehicleInjury(vehicle,injury.id))}));
  };
  const pilotSkillEntry=Object.entries(character?.skills||{}).find(([key])=>String(key).toLowerCase().replaceAll("_"," ").trim()==="pilot")?.[1]||{};
  const endurance=Math.max(0,Number(character?.special?.E||character?.special?.END||0));
  const agility=Math.max(0,Number(character?.special?.A||character?.special?.AGI||0));
  const pilotAgilityTarget=Math.max(0,Math.min(20,agility+pilotRank));
  const pilotRank=Math.max(0,Number(pilotSkillEntry.rank||0)+Number(pilotSkillEntry.bonus||0));
  const pilotTarget=Math.max(0,Math.min(20,endurance+pilotRank));
  const pilotCritical=pilotSkillEntry.tagged?Math.max(1,Number(pilotSkillEntry.rank||1)):1;
  const attackWithMountedWeapon=(weapon)=>{
    if(typeof onRoll!=="function")return;
    onRoll({...createWeaponRoll({
      weapon:{...weapon,rate:Number(weapon?.rate??weapon?.fireRate??0),damage:Number(weapon?.damage||0),skill:weapon?.skill||(/laser/i.test(String(weapon?.name||""))?"Energy Weapons":"Big Guns")},
      diceCount:2,
      difficulty:1,
      useRate:false,
    }),id:`vehicle-weapon-${Date.now()}`,source:"vehicle-mounted"});
  };
  const ramVehicle=()=>{
    if(!active||typeof onRoll!=="function")return;
    onRoll({
      id:`vehicle-ram-${Date.now()}`,
      type:"skill",
      diceType:"d20",
      title:`${labels.ram}: ${active.name}`,
      skillName:"Pilot",
      skill:{...pilotSkillEntry,rank:String(pilotRank),attribute:"E"},
      targetNumber:pilotTarget,
      criticalRange:pilotCritical,
      testValue:pilotTarget,
      diceCount:2,
      difficulty:1,
      source:"vehicle-ram",
      onResult:(result)=>{
        if(result?.diceType!=="d20"||result?.rollType!=="skill")return;
        if(Number(result?.successes||0)<1)return;
        window.setTimeout(()=>{
          onRoll({
            id:`vehicle-ram-damage-${Date.now()}`,
            type:"weapon",
            diceType:"d20",
            title:`${labels.ram}: ${active.name}`,
            weapon:{name:`${labels.ram}: ${active.name}`,skill:"Pilot",damage:Number(active.impact||0),rate:0,effects:[],qualities:[]},
            targetNumber:pilotTarget,
            criticalRange:pilotCritical,
            diceCount:1,
            difficulty:0,
            source:"vehicle-ram-damage",
          });
        },150);
      },
    });
  };

  const executeMovementAction=()=>{
    if(!active||!movement)return;
    const commitState=(success,difficulty=0,successes=0,controlLoss=null)=>patchVehicle(active.id,(vehicle)=>{
      const started=beginVehicleTurn(vehicle);
      return {...started,vehicleTurnState:{action:movementAction,zones:success?movement.zones:0,success,difficulty,successes,crewDifficultyModifier:success?(movement.crewDifficultyModifier||0):0,defenseBonus:success?(movement.defenseBonus||0):0,at:Date.now()},lastControlLoss:controlLoss?{...controlLoss,at:Date.now()}:null};
    });
    if(!movement.test){commitState(true,0,0,null);return;}
    if(typeof onRoll!=="function")return;
    const difficulty=Math.max(0,Number(movement.test.difficulty ?? (1+Number(movement.test.difficultyModifier||0))));
    onRoll({
      id:"vehicle-pilot-"+Date.now(),type:"skill",diceType:"d20",title:movement.action.label,skillName:"Pilot",
      skill:{...pilotSkillEntry,rank:String(pilotRank),attribute:"A"},targetNumber:pilotAgilityTarget,criticalRange:pilotCritical,testValue:pilotAgilityTarget,diceCount:2,difficulty,source:"vehicle-pilot",
      onResult:(result)=>{
        if(result?.diceType!=="d20"||result?.rollType!=="skill")return;
        const success=Number(result?.successes||0)>=difficulty;
        const validOutcomes=VEHICLE_OUT_OF_CONTROL.filter(item=>item.id!=="plummet"||(active.qualities||[]).includes("Flying"));
        const controlLoss=!success&&validOutcomes.length?validOutcomes[Math.floor(Math.random()*validOutcomes.length)]:null;
        commitState(success,difficulty,Number(result?.successes||0),controlLoss);
      }
    });
  };
  const movement=active?vehicleMovementPlan(active,movementAction,movementAp):null;
  const fuelInfo=active?vehicleFuelMilesPerPoint(active):null;
  const repairPlan=active?getVehicleRepairPlan(active,repairLocation):null;
  const preview=useMemo(()=>({...CUSTOM_DEFAULT,...draft,currentHp:Number(draft.maxHp||1),qualities:draft.qualities||[]}),[draft]);

  const dashboard=active?<div className="vehicle-v2-dashboard">
    <section className="vehicle-v2-hero pip-panel">
      <div className="vehicle-v2-title-row"><div><h2>{active.name}</h2><small>{active.custom?"Custom Vehicle":active.sourceId||labels.gallery}</small></div><span className="vehicle-v2-active">{labels.active}</span></div>
      <div className="vehicle-v2-qualities">{(active.qualities||[]).slice(0,5).map(q=><span key={q}>{q}</span>)}</div>
      <div className="vehicle-v2-art"><img src={vehicleAssetFor(active)} alt="" draggable={false}/></div>
      <div className="vehicle-v2-thumbs">{vehicles.slice(0,4).map(v=><button key={v.id} type="button" className={v.id===active.id?"is-active":""} onClick={()=>setActive(v.id)}><img src={vehicleAssetFor(v)} alt=""/><span>{v.name}</span></button>)}</div>
    </section>

    <section className="vehicle-v2-stats pip-panel">
      <div className="vehicle-v2-section-head"><h3>{labels.stats}</h3><button className="pip-btn" onClick={()=>setMode("custom")}>{labels.edit}</button></div>
      <StatRow label={labels.scale}>{active.scale}</StatRow>
      <StatRow label={labels.speed}>{active.speedZones} {labels.zones} · {active.speedMph} mph</StatRow>
      <StatRow label={labels.physical}>{active.locations?.[0]?.physical ?? 0}</StatRow>
      <StatRow label={labels.energy}>{active.locations?.[0]?.energy ?? 0}</StatRow>
      <StatRow label={labels.hp}>{active.currentHp??active.maxHp}/{active.maxHp}</StatRow>
      <StatRow label={labels.cover}>{active.cover}</StatRow>
      <StatRow label={labels.impact}>{active.impact} CD</StatRow>
      <StatRow label={labels.passengers}>{active.passengers}</StatRow>
      <StatRow label={labels.cargo}>{active.cargo||0} lb</StatRow>
      <StatRow label={labels.fuelTrack}><span>{active.fuelCurrent??active.fuelMax??0}/{active.fuelMax??0} <Bar value={active.fuelCurrent??active.fuelMax??0} max={Math.max(1,active.fuelMax||5)}/></span></StatRow>
    </section>

    <section className="vehicle-v2-crew pip-panel">
      <div className="vehicle-v2-section-head"><h3>{labels.crew}</h3></div>
      <label><span>{labels.pilot}</span><input value={active.crewRoles?.pilot||""} onChange={e=>setCrew("pilot",e.target.value)} placeholder={labels.pilot}/></label>
      <label><span>{labels.gunner}</span><input value={(active.crewRoles?.gunners||[]).join(", ")} onChange={e=>setCrew("gunners",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))} placeholder={labels.gunner}/></label>
      <label><span>{labels.additional}</span><input value={(active.crewRoles?.additional||[]).join(", ")} onChange={e=>setCrew("additional",e.target.value.split(",").map(v=>v.trim()).filter(Boolean))} placeholder={labels.additional}/></label>
    </section>

    <section className="vehicle-v2-qualities-panel pip-panel">
      <div className="vehicle-v2-section-head"><h3>{labels.qualities}</h3></div>
      <div className="vehicle-v2-qualities">{(active.qualities||[]).map(q=><span key={q}>{q}</span>)}</div>
    </section>

    <section className="vehicle-v2-movement pip-panel">
      <h3>{labels.movement}</h3>
      <div className="vehicle-v2-move-grid">{Object.values(VEHICLE_MOVEMENT_ACTIONS).map(action=>{
        const plan=vehicleMovementPlan(active,action.id,action.id==="focused"?movementAp:0);
        return <button type="button" key={action.id} className={movementAction===action.id?"is-active":""} onClick={()=>setMovementAction(action.id)}>
          <strong>{action.label}</strong><span>{plan.zones} {labels.zones}</span><small>{action.description}</small>
        </button>;
      })}</div>
      {movementAction==="focused"?<label className="vehicle-v2-ap">AP <input type="number" min="0" max="6" value={movementAp} onChange={e=>setMovementAp(Number(e.target.value)||0)}/></label>:null}
      {movement?.test?<div className="vehicle-v2-test">{movement.test.attribute} + {movement.test.skill} · D{movement.test.difficulty??Math.max(0,1+Number(movement.test.difficultyModifier||0))} · TN {pilotAgilityTarget}</div>:null}
      <button type="button" className="pip-btn is-primary" onClick={executeMovementAction}>{movement?.test?labels.attack:labels.action}</button>
      {active.vehicleTurnState?<div className="vehicle-v2-move-status"><strong>{active.vehicleTurnState.action}</strong><span>{active.vehicleTurnState.success===false?"FAILURE":"ACTIVE"} · {active.vehicleTurnState.zones} {labels.zones}{active.vehicleTurnState.defenseBonus?" · Defense +"+active.vehicleTurnState.defenseBonus:""}{active.vehicleTurnState.crewDifficultyModifier?" · Crew D+"+active.vehicleTurnState.crewDifficultyModifier:""}</span></div>:null}
      {active.lastControlLoss?<div className="vehicle-v2-control-warning"><strong>{active.lastControlLoss.label}</strong><small>{active.lastControlLoss.effect}</small></div>:null}
    </section>

    <section className="vehicle-v2-damage pip-panel">
      <div className="vehicle-v2-section-head"><h3>{labels.damage}</h3><button className="pip-btn" onClick={()=>repair(active)} disabled={!repairPlan||repairPlan.restore<=0||!canPay(inventory,repairPlan.cost)}>{labels.repair}</button></div>
      <div className="vehicle-v2-hp-editor">
        <span>{damageLabels.hp}</span>
        <div className="vehicle-v2-hp-controls">
          <button type="button" className="pip-btn" onClick={()=>setHp(active.id,-5)}>−5</button>
          <button type="button" className="pip-btn" onClick={()=>setHp(active.id,-1)}>−1</button>
          <input type="number" min="0" max={active.maxHp} value={active.currentHp??active.maxHp} onChange={e=>setVehicleHp(e.target.value)}/>
          <span>/ {active.maxHp}</span>
          <button type="button" className="pip-btn" onClick={()=>setHp(active.id,1)}>+1</button>
          <button type="button" className="pip-btn" onClick={()=>setHp(active.id,5)}>+5</button>
        </div>
        <Bar value={active.currentHp??active.maxHp} max={active.maxHp} segments={10}/>
      </div>
      <div className="vehicle-v2-crit-help"><strong>{damageLabels.threshold}: {criticalThreshold}</strong><small>{damageLabels.help}</small></div>
      <div className="vehicle-v2-damage-form">
        <label><span>{damageLabels.incoming}</span><input type="number" min="0" value={incomingDamage} onChange={e=>setIncomingDamage(Number(e.target.value)||0)}/></label>
        <label><span>{damageLabels.type}</span><select value={damageType} onChange={e=>setDamageType(e.target.value)}><option>Physical</option><option>Energy</option></select></label>
        <label><span>{damageLabels.location}</span><select value={damageLocation} onChange={e=>setDamageLocation(e.target.value)}>{vehicleLocations.map((location,index)=><option key={location.name+"-"+index} value={location.name}>{location.roll} · {location.name}</option>)}</select></label>
        <div className="vehicle-v2-damage-preview"><span>DR <b>{damageDr}</b></span><span>{damageLabels.after} <b>{postDrDamage}</b></span><span>{damageLabels.threshold} <b>{criticalThreshold}</b></span></div>
        <button type="button" className="pip-btn is-primary" onClick={applyIncomingDamage}>{damageLabels.apply}</button>
      </div>
      {criticalPending?<div className="vehicle-v2-critical-ready"><strong>⚠ {damageLabels.triggered}</strong><span>{criticalPending.damage} ≥ {criticalThreshold}</span><button type="button" className="pip-btn is-primary" onClick={rollCriticalLocation}>{damageLabels.roll}</button></div>:null}
      <div className="vehicle-v2-injuries">
        {(active.injuries||[]).length?(active.injuries||[]).map((injury,index)=><div className="vehicle-v2-injury" key={injury.id+"-"+index}>
          <div><b>{injury.label}</b>{injury.location?<span>{injury.location}{injury.roll?" · d20 "+injury.roll:""}</span>:null}<small>{injury.effect}</small></div>
          <div className="vehicle-v2-injury-actions"><button type="button" className="pip-btn" onClick={()=>repairCriticalInjury(injury)}>{damageLabels.repair}</button><button type="button" className="pip-btn" onClick={()=>patchVehicle(active.id,v=>removeVehicleInjury(v,injury.id))}>{damageLabels.remove}</button></div>
        </div>):<small>{labels.none}</small>}
      </div>
      <details className="vehicle-v2-manual-injury"><summary>{labels.addInjury}</summary><div className="vehicle-v2-inline"><select value={injuryType} onChange={e=>setInjuryType(e.target.value)}>{VEHICLE_INJURIES.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}</select><button className="pip-btn" onClick={()=>patchVehicle(active.id,v=>applyVehicleInjury(v,injuryType))}>{labels.addInjury}</button></div></details>
    </section>
    <section className="vehicle-v2-fuel pip-panel">
      <div className="vehicle-v2-section-head"><h3>{labels.fuel}</h3><button className="pip-btn" onClick={()=>patchVehicle(active.id,v=>({...v,fuelCurrent:Math.min(Number(v.fuelMax||0),Number(v.fuelCurrent||0)+1)}))}>{labels.refuel}</button></div>
      <div className="vehicle-v2-fuel-main"><strong>{active.fuelCurrent??active.fuelMax??0}/{active.fuelMax??0}</strong><Bar value={active.fuelCurrent??active.fuelMax??0} max={Math.max(1,active.fuelMax||5)}/></div>
      <small>{fuelInfo?.miles||0} {labels.miles} / 1 Fuel</small>
      <div className="vehicle-v2-inline"><input type="number" min="0" value={fuelMiles} onChange={e=>setFuelMiles(Number(e.target.value)||0)}/><button className="pip-btn" onClick={()=>patchVehicle(active.id,v=>consumeVehicleFuel(v,fuelMiles,{difficultTerrain:false}))}>{labels.useFuel}</button></div>
    </section>

    <section className="vehicle-v2-weapons pip-panel">
      <h3>{labels.mounted}</h3>
      {(active.weapons||[]).length?(active.weapons||[]).map((weapon,index)=><article className="vehicle-v2-weapon" key={(weapon.name||"weapon")+"-"+index}>
        <div><strong>{weapon.name||labels.weapons}</strong><small>{Number(weapon.damage||0)} CD · {weapon.type||"Physical"} · FR {Number(weapon.fireRate??weapon.rate??0)} · {weapon.range||"M"}</small></div>
        <button type="button" className="pip-btn is-primary" onClick={()=>attackWithMountedWeapon(weapon)}>{labels.attack}</button>
      </article>):<small>{labels.noMounted}</small>}
    </section>

    <section className="vehicle-v2-ram pip-panel">
      <h3>{labels.ramming}</h3><div className="vehicle-v2-ram-value">{vehicleRamDamage(active)} CD</div><small>{labels.ramTest} · TN {pilotTarget}</small><button className="pip-btn is-primary" onClick={ramVehicle}>{labels.ram}</button>
    </section>

    <section className="vehicle-v2-control pip-panel">
      <h3>{labels.outControl}</h3><div className="vehicle-v2-control-list">{VEHICLE_OUT_OF_CONTROL.map(item=><details key={item.id}><summary>{item.label}</summary><small>{item.effect}</small></details>)}</div>
    </section>
  </div>:<div className="pip-panel">{labels.noVehicles}</div>;

  const catalog=<div className="vehicle-v2-catalog">{STOCK_VEHICLES.map(vehicle=>{const cost=getVehicleCraftCost(vehicle);return <article className="pip-panel vehicle-v2-catalog-card" key={vehicle.id}><img src={vehicleAssetFor(vehicle)} alt=""/><h3>{vehicle.name}</h3><div className="vehicle-v2-mini-stats"><span>{labels.scale} {vehicle.scale}</span><span>{labels.hp} {vehicle.maxHp}</span><span>{labels.speed} {vehicle.speedZones}</span><span>{labels.impact} {vehicle.impact} CD</span></div><Cost cost={cost} inventory={inventory} labels={labels}/><div className="vehicle-v2-inline"><button className="pip-btn" onClick={()=>addOwned(vehicle)}>{labels.add}</button><button className="pip-btn is-primary" disabled={!canPay(inventory,cost)} onClick={()=>craft(vehicle)}>{labels.craft}</button></div></article>;})}</div>;

  const custom=<section className="pip-panel vehicle-v2-builder"><h3>{labels.custom}</h3><div className="vehicle-v2-form">
    <label>{labels.name}<input value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))}/></label>
    {["scale","maxHp","speedZones","speedMph","impact","cargo","fuelMax"].map(key=><label key={key}>{key}<input type="number" value={draft[key]} onChange={e=>setDraft(v=>({...v,[key]:Number(e.target.value)}))}/></label>)}
  </div><div className="vehicle-v2-quality-picker">{VEHICLE_QUALITIES.map(q=><label key={q}><input type="checkbox" checked={(draft.qualities||[]).includes(q)} onChange={()=>setDraft(v=>({...v,qualities:v.qualities.includes(q)?v.qualities.filter(x=>x!==q):[...v.qualities,q]}))}/>{q}</label>)}</div><Cost cost={getVehicleCraftCost(preview)} inventory={inventory} labels={labels}/><button className="pip-btn is-primary" onClick={()=>craft(preview,true)} disabled={!String(draft.name||"").trim()||!canPay(inventory,getVehicleCraftCost(preview))}>{labels.build}</button></section>;

  return <div className="vehicle-screen vehicle-screen-v2">
    <header className="vehicle-v2-header"><div><span>PIP / 2D20</span><h1>{labels.title}</h1><p>{labels.subtitle}</p></div><small>{labels.rules}</small></header>
    <nav className="vehicle-v2-tabs"><button className={mode==="garage"?"is-active":""} onClick={()=>setMode("garage")}>🚙 {labels.my}</button><button className={mode==="catalog"?"is-active":""} onClick={()=>setMode("catalog")}>▦ {labels.catalog}</button><button className={mode==="custom"?"is-active":""} onClick={()=>setMode("custom")}>＋ {labels.custom}</button></nav>
    {mode==="garage"?dashboard:mode==="catalog"?catalog:custom}
  </div>;
}
