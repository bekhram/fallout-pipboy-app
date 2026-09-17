import React from "react";
import {useTranslation} from "react-i18next";
import HpPanel from "./HpPanel.jsx";
import VitalsPanel from "./VitalsPanel.jsx";
import InjuryPanel from "./InjuryPanel.jsx";
import SheetEffects from "./SheetEffects.jsx";
import SheetProfile from "../layout/SheetProfile.jsx";
import SheetIcon from "../layout/SheetIcon.jsx";
import SheetDisclosure from "../layout/SheetDisclosure.jsx";
import {sheetCopy} from "../layout/sheetCopy.js";

export default function StatusScreen(props) {
  const {form,derived,armor,currentLuckPoints=0,onSpendLuck,onTopLevelChange,onInjuryToggle,onArmorChange,onOpenConditions,onOpenDerived,onOpenDice,onOpenSkills}=props;
  const {t,i18n}=useTranslation();const c=sheetCopy(i18n.resolvedLanguage);
  const survivalConditions=[['satiety','starving'],['thirst','dehydrated'],['vigor','exhausted']].filter(([field])=>Number(form[field]||0)===0).map(([,key])=>({key,group:'negative',nameKey:`statuses.${key}.name`,descriptionKey:`statuses.${key}.description`,durationKey:'statuses.duration.whileZero'}));
  return <div className="sheet-overview">
    <SheetProfile {...props}/>
    <HpPanel {...props} maxHp={props.hpMax} currentHp={props.hpCurrent}/>
    <section className="pip-panel sheet-combat"><div className="sheet-card-heading"><SheetIcon name="target"/><h2>{c.combat}</h2><button className="sheet-icon-button sheet-edit-stats" type="button" aria-label={t('main.statsAction')} onClick={onOpenDerived}><SheetIcon name="edit"/></button></div>
      <div className="sheet-combat-grid">
        {[['shield',t('main.defense'),derived.defense],['bolt',t('main.initiative'),derived.initiative],['melee',t('main.melee'),derived.md],['luck',t('derived.luckPoints'),currentLuckPoints]].map(([icon,label,value])=><div className="sheet-combat-stat" key={icon}><SheetIcon name={icon}/><div><small>{label}</small><strong>{value}</strong></div></div>)}
      </div>
    </section>
    <div className="sheet-body"><InjuryPanel injuries={form.injuries} statuses={form.statuses} armor={armor} derived={derived} onToggle={onInjuryToggle} onArmorChange={onArmorChange} survivalConditions={survivalConditions} bodyOnly /></div>
    <SheetDisclosure title={c.survival} icon="food" className="sheet-survival"><VitalsPanel form={form} onTopLevelChange={onTopLevelChange} compact /></SheetDisclosure>
    <SheetEffects {...props} survivalConditions={survivalConditions}/>
    <section className="pip-panel sheet-quick"><div className="sheet-card-heading"><SheetIcon name="bolt"/><h2>{c.quick}</h2></div><div className="sheet-quick-grid">
      <button type="button" onClick={onOpenSkills}><SheetIcon name="skills"/><span><strong>{c.skillCheck}</strong><small>{c.skillHint}</small></span></button>
      <button type="button" onClick={onOpenDice}><SheetIcon name="dice"/><span><strong>{c.dice}</strong><small>{c.diceHint}</small></span></button>
      <button type="button" className="sheet-luck-action" disabled={currentLuckPoints<=0} onClick={onSpendLuck}><SheetIcon name="luck"/><span>{t('main.luckAction')} · {currentLuckPoints}</span></button>
    </div></section>
  </div>;
}
