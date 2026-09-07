import React, { useMemo } from "react";
import {
  LOCATION_TYPES,
  TERRAIN_TYPES,
  ZONE_TYPES,
  TIME_TYPES,
  WEATHER_TYPES,
  ZONE_SUBTYPES,
  environmentEffects,
  labelFor,
  languageCode,
  normalizeTacticalEnvironment,
} from "../../utils/tacticalEnvironment.js";
import "./tacticalEnvironmentPanel.css";

const COPY={
  en:{title:"ENCOUNTER ENVIRONMENT",location:"LOCATION",terrain:"TERRAIN",zone:"ZONE",feature:"FEATURE",time:"TIME",weather:"WEATHER",startCd:"START CD",growthCd:"+CD / ROUND",effects:"ACTIVE EFFECTS",asset:"MAP ASSET",pending:"Background assets will be linked here in the next step.",seed:"MAP VARIANT",auto:"AUTO LIGHTING"},
  ru:{title:"ОКРУЖЕНИЕ ЭНКАУНТЕРА",location:"ЛОКАЦИЯ",terrain:"ЛАНДШАФТ",zone:"ЗОНА",feature:"ОСОБЕННОСТЬ",time:"ВРЕМЯ",weather:"ПОГОДА",startCd:"СТАРТ КУ",growthCd:"+КУ / РАУНД",effects:"АКТИВНЫЕ ЭФФЕКТЫ",asset:"АССЕТ КАРТЫ",pending:"На следующем этапе здесь будут привязаны готовые фоны для выбранного типа локации.",seed:"ВАРИАНТ КАРТЫ",auto:"АВТО ОСВЕЩЕНИЕ"},
  uk:{title:"ОТОЧЕННЯ ЕНКАУНТЕРА",location:"ЛОКАЦІЯ",terrain:"ЛАНДШАФТ",zone:"ЗОНА",feature:"ОСОБЛИВІСТЬ",time:"ЧАС",weather:"ПОГОДА",startCd:"СТАРТ КУ",growthCd:"+КУ / РАУНД",effects:"АКТИВНІ ЕФЕКТИ",asset:"АСЕТ МАПИ",pending:"На наступному етапі тут будуть прив'язані готові фони для вибраного типу локації.",seed:"ВАРІАНТ МАПИ",auto:"АВТО ОСВІТЛЕННЯ"},
  pl:{title:"ŚRODOWISKO SPOTKANIA",location:"LOKACJA",terrain:"TEREN",zone:"STREFA",feature:"CECHA",time:"PORA",weather:"POGODA",startCd:"START CD",growthCd:"+CD / RUNDA",effects:"AKTYWNE EFEKTY",asset:"ASSET MAPY",pending:"W następnym kroku tutaj zostaną podpięte gotowe tła dla wybranego typu lokacji.",seed:"WARIANT MAPY",auto:"AUTO OŚWIETLENIE"},
};

function copy(){const code=languageCode();return COPY[code]||COPY.en;}
function option(group,key){return <option key={key} value={key}>{labelFor(group,key)}</option>;}

export function TacticalEnvironmentSummary({scene,compact=false}){
  const env=normalizeTacticalEnvironment(scene?.environment);
  const effects=useMemo(()=>environmentEffects(env),[env.locationType,env.terrain,env.zoneType,env.zoneSubtype,env.timeOfDay,env.weather,env.hazardBaseCd,env.hazardGrowthCd]);
  const text=copy();
  return <section className={`tactical-environment-summary${compact?" is-compact":""}`}>
    <div className="tactical-environment-summary__chips">
      <span><b>{text.location}</b>{labelFor("locationType",env.locationType)}</span>
      <span><b>{text.terrain}</b>{labelFor("terrain",env.terrain)}</span>
      <span className={`is-zone-${env.zoneType}`}><b>{text.zone}</b>{labelFor("zoneType",env.zoneType)}{env.zoneSubtype?` · ${labelFor("zoneSubtype",env.zoneSubtype)}`:""}</span>
      <span><b>{text.time}</b>{labelFor("timeOfDay",env.timeOfDay)}</span>
      <span><b>{text.weather}</b>{labelFor("weather",env.weather)}</span>
    </div>
    {!compact?<div className="tactical-environment-summary__effects">{effects.map((effect,index)=><span key={`${effect}-${index}`}>{effect}</span>)}</div>:null}
  </section>;
}

export default function TacticalEnvironmentPanel({scene,session}){
  const env=normalizeTacticalEnvironment(scene?.environment);
  const text=copy();
  const effects=useMemo(()=>environmentEffects(env),[env.locationType,env.terrain,env.zoneType,env.zoneSubtype,env.timeOfDay,env.weather,env.hazardBaseCd,env.hazardGrowthCd]);
  if(!scene||!session?.isActive||session?.mode!=="host")return null;

  const save=(patch)=>{
    const next=normalizeTacticalEnvironment({...env,...patch});
    if(patch.zoneType){
      const allowed=ZONE_SUBTYPES[next.zoneType]||[""];
      if(!allowed.includes(next.zoneSubtype))next.zoneSubtype=allowed[0]||"";
    }
    return session.updateTacticalScene?.({environment:next});
  };

  const subtypes=ZONE_SUBTYPES[env.zoneType]||[""];
  const hazard=env.zoneType!=="normal";

  return <section className="pip-panel tactical-environment-panel">
    <header className="tactical-environment-panel__head">
      <div><div className="pip-bootline">TACTICAL SCENE PROFILE</div><h2>[ {text.title} ]</h2></div>
      <span>{scene.active?"LIVE":"PREP"}</span>
    </header>

    <div className="tactical-environment-grid">
      <label><span>{text.location}</span><select className="pip-input" value={env.locationType} onChange={(e)=>save({locationType:e.target.value})}>{LOCATION_TYPES.map((key)=>option("locationType",key))}</select></label>
      <label><span>{text.terrain}</span><select className="pip-input" value={env.terrain} onChange={(e)=>save({terrain:e.target.value})}>{TERRAIN_TYPES.map((key)=>option("terrain",key))}</select></label>
      <label><span>{text.zone}</span><select className="pip-input" value={env.zoneType} onChange={(e)=>save({zoneType:e.target.value})}>{ZONE_TYPES.map((key)=>option("zoneType",key))}</select></label>
      <label><span>{text.feature}</span><select className="pip-input" value={env.zoneSubtype} disabled={subtypes.length<=1} onChange={(e)=>save({zoneSubtype:e.target.value})}>{subtypes.map((key)=>option("zoneSubtype",key))}</select></label>
      <label><span>{text.time}</span><select className="pip-input" value={env.timeOfDay} onChange={(e)=>save({timeOfDay:e.target.value})}>{TIME_TYPES.map((key)=>option("timeOfDay",key))}</select></label>
      <label><span>{text.weather}</span><select className="pip-input" value={env.weather} onChange={(e)=>save({weather:e.target.value})}>{WEATHER_TYPES.map((key)=>option("weather",key))}</select></label>
      <label><span>{text.startCd}</span><input className="pip-input" type="number" min="1" max="12" disabled={!hazard} value={env.hazardBaseCd} onChange={(e)=>save({hazardBaseCd:Number(e.target.value)||1})}/></label>
      <label><span>{text.growthCd}</span><input className="pip-input" type="number" min="0" max="6" disabled={!hazard} value={env.hazardGrowthCd} onChange={(e)=>save({hazardGrowthCd:Number(e.target.value)||0})}/></label>
    </div>

    <div className="tactical-environment-effects"><strong>[ {text.effects} ]</strong>{effects.map((effect,index)=><span key={`${effect}-${index}`}>{effect}</span>)}</div>

    <div className="tactical-environment-map-slot">
      <div><strong>{text.asset}</strong><span>{env.mapAssetId||text.pending}</span></div>
      <label><span>{text.seed}</span><input className="pip-input" value={env.mapVariantSeed} placeholder="AUTO" maxLength={80} onChange={(e)=>save({mapVariantSeed:e.target.value})}/></label>
      <label><span>{text.auto}</span><select className="pip-input" value={env.lightingPreset} onChange={(e)=>save({lightingPreset:e.target.value})}><option value="auto">AUTO</option><option value="bright">BRIGHT</option><option value="dark">DARK</option><option value="emergency">EMERGENCY</option></select></label>
    </div>
  </section>;
}
