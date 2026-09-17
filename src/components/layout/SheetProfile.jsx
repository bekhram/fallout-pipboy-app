import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import SheetIcon from "./SheetIcon.jsx";
import { sheetCopy } from "./sheetCopy.js";
import { ORIGINS } from "../data/origins.js";
import OriginSelectionModal from "../shared/OriginSelectionModal.jsx";
import defaultPortrait from "../../assets/injuries/vaultboy_healthy.png";

export default function SheetProfile({ form, portraitPreview, onPickPortrait, onRemovePortrait, onTopLevelChange, onChangeOrigin, compact=false }) {
  const {t,i18n}=useTranslation(); const c=sheetCopy(i18n.resolvedLanguage);
  const [editing,setEditing]=useState(false); const [originOpen,setOriginOpen]=useState(false);
  const prefix=compact?'mobile-profile':'desktop-profile';
  return <section className={`sheet-profile pip-panel ${compact?'sheet-profile--compact':'sheet-profile--desktop'} ${editing?'is-editing':''}`}>
    <div className="sheet-profile-portrait">
      <button type="button" onClick={onPickPortrait} aria-label={c.portrait}><img src={portraitPreview || defaultPortrait} alt="" /></button>
      {portraitPreview && (!compact || editing) && <button className="sheet-remove-portrait" type="button" onClick={onRemovePortrait} aria-label={c.removePortrait}>×</button>}
    </div>
    <div className="sheet-profile-main">
      <div className="sheet-profile-name">
        {(!compact || editing) ? <input id={`${prefix}-name`} aria-label={t('main.name')} value={form.characterName} placeholder={c.unnamed} onChange={e=>onTopLevelChange('characterName',e.target.value)} /> : <strong>{form.characterName || c.unnamed}</strong>}
        <button type="button" className="sheet-icon-button" onClick={()=>compact ? setEditing(v=>!v) : document.getElementById(`${prefix}-name`)?.focus()} aria-label={editing?c.close:c.edit} aria-expanded={editing}><SheetIcon name={editing?'chevron':'edit'}/></button>
      </div>
      <button type="button" className="sheet-profile-origin" onClick={()=>setOriginOpen(true)}>{form.origin && ORIGINS[form.origin] ? t(ORIGINS[form.origin].translationKey) : t('characterCreation.selectOriginTitle')}</button>
      {compact && !editing && <div className="sheet-profile-summary">{t('main.level')} {form.level} · {t('main.xp')} {form.xp || 0}</div>}
      <div className="sheet-profile-progression">
        <label htmlFor={`${prefix}-level`}>{t('main.level')}</label><input id={`${prefix}-level`} type="number" min="1" inputMode="numeric" value={form.level} onChange={e=>onTopLevelChange('level',e.target.value)} />
        <label htmlFor={`${prefix}-xp`}>{t('main.xp')}</label><input id={`${prefix}-xp`} type="number" min="0" inputMode="numeric" value={form.xp ?? 0} onChange={e=>onTopLevelChange('xp',String(Math.max(0,Number(e.target.value)||0)))} />
      </div>
    </div>
    <OriginSelectionModal open={originOpen} onSelectOrigin={(id,traits,pack)=>{onChangeOrigin(id,traits,pack,t);setOriginOpen(false);}} onCancel={()=>setOriginOpen(false)} />
  </section>;
}
