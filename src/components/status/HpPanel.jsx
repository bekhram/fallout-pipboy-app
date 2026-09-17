import React from "react";
import { useTranslation } from "react-i18next";
import SheetIcon from "../layout/SheetIcon.jsx";
import { sheetCopy } from "../layout/sheetCopy.js";

export default function HpPanel({maxHp,currentHp,radiationHp,onHpSliderChange,onRadiationSliderChange,onHpDecrease,onHpIncrease}) {
  const {t,i18n}=useTranslation(); const c=sheetCopy(i18n.resolvedLanguage);
  const max=Math.max(1,Number(maxHp)||1); const rad=Math.max(0,Math.min(Number(radiationHp)||0,max));
  const effective=Math.max(0,max-rad); const hp=Math.max(0,Math.min(Number(currentHp)||0,effective));
  return <section className="pip-panel sheet-health">
    <div className="sheet-card-heading"><SheetIcon name="heart"/><h2>{c.health}</h2></div>
    <div className="sheet-health-number" aria-live="polite">{hp} / {effective}</div>
    <div className="sheet-health-controls">
      <button type="button" aria-label={`${c.health} −1`} onClick={onHpDecrease} disabled={hp<=0}>−</button>
      <div className="sheet-health-track">
        <div className="sheet-health-fill" style={{width:`${hp/max*100}%`}}/>
        <div className="sheet-health-rad" style={{width:`${rad/max*100}%`}}/>
        <input aria-label={c.health} type="range" min="0" max={effective} step="1" value={hp} onChange={e=>onHpSliderChange(Number(e.target.value))}/>
      </div>
      <button type="button" aria-label={`${c.health} +1`} onClick={onHpIncrease} disabled={hp>=effective}>+</button>
    </div>
    <div className="sheet-radiation"><SheetIcon name="radiation"/><span>{t('hp.radiation')}</span><strong>{rad}</strong><button type="button" aria-label={`${t('hp.radiation')} −1`} disabled={rad<=0} onClick={()=>onRadiationSliderChange(rad-1)}>−</button><button type="button" aria-label={`${t('hp.radiation')} +1`} disabled={rad>=max} onClick={()=>onRadiationSliderChange(rad+1)}>+</button></div>
  </section>;
}
