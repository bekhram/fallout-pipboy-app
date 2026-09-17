import React from "react";
import { useTranslation } from "react-i18next";
import { STATUS_LIST } from "../../constants.js";
import { PIPBOY_END_CONSUMABLE_EFFECT_EVENT } from "../../utils/consumableEffects.js";
import SheetDisclosure from "../layout/SheetDisclosure.jsx";
import SheetIcon from "../layout/SheetIcon.jsx";
import {sheetCopy} from "../layout/sheetCopy.js";
export default function SheetEffects({form,derived,survivalConditions,onOpenConditions,onStealthBoyAdvance,onStealthBoyEnd}) {
  const {t,i18n}=useTranslation();const c=sheetCopy(i18n.resolvedLanguage);
  const statuses=[...STATUS_LIST.filter(item=>form.statuses?.[item.key]),...survivalConditions].filter((item,i,all)=>all.findIndex(x=>x.key===item.key)===i);
  const effects=derived?.activeConsumableEffects || [];
  const stealth=form.stealthBoyState?.active;
  return <SheetDisclosure title={c.effects} icon="flask" count={statuses.length+effects.length+(stealth?1:0)} className="sheet-effects">
    <button className="sheet-add-effect" type="button" onClick={onOpenConditions}><SheetIcon name="plus"/>{c.add}</button>
    {!statuses.length&&!effects.length&&!stealth&&<div className="sheet-empty">{c.emptyEffects}</div>}
    {statuses.map(item=><details className="sheet-effect" key={item.key}><summary>{t(item.nameKey)}</summary><p>{t(item.descriptionKey)}</p><small>{t(item.durationKey)}</small></details>)}
    {effects.map(effect=><div className="sheet-effect" key={effect.id}><strong>{effect.sourceName}</strong><p>{effect.effectText}</p><small>{effect.duration}</small><button type="button" className="pip-btn" onClick={()=>window.dispatchEvent(new CustomEvent(PIPBOY_END_CONSUMABLE_EFFECT_EVENT,{detail:{effectId:effect.id}}))}>{c.end}</button></div>)}
    {stealth&&<div className="sheet-effect"><strong>Stealth Boy · {form.stealthBoyState.remainingTurns}</strong><div className="pip-tagrow"><button type="button" className="pip-btn" onClick={onStealthBoyAdvance}>{c.nextTurn}</button><button type="button" className="pip-btn" onClick={onStealthBoyEnd}>{c.end}</button></div></div>}
  </SheetDisclosure>;
}
