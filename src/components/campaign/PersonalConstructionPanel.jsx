import React from 'react';
import { personalConstructionCopy } from './personalConstructionCopy.js';
import { worldCopy } from './worldCopy.js';
import { playerResources, RESOURCE_KEYS } from '../../utils/settlementDevelopment.js';

export default function PersonalConstructionPanel({world,form,language}) {
  const t=personalConstructionCopy(language), c=worldCopy(language);
  const approved=world.campaign?.character;
  const compatible=world.personalReady && world.sourceCharacterId===form?._localCharacterId;
  const cloud=playerResources(approved), local=world.sourceAvailable||{};
  return <section className="campaign-personal-payment pip-panel" aria-label={t.title}>
    <strong>{t.source}</strong>
    <p>{t.local}: {form?.name || form?.characterName || '—'}<br/>{t.approved}: {approved?.name||'—'}</p>
    {!compatible ? <button type="button" className="pip-btn" disabled={world.busy || !world.connected || !approved || !form?._localCharacterId}
      onClick={()=>world.linkPersonalSource(form._localCharacterId)}>{t.link}</button> : <>
      <p>{t.linked}</p>
      <div className="campaign-personal-balances">{RESOURCE_KEYS.map(key=><div key={key}><span>{c[key] || key}</span>
        <b>{Math.min(cloud[key]||0,local[key]||0)}</b><small>{t.reserved}: {world.sourceReserved?.[key]||0}</small></div>)}</div>
      <small>{t.available}</small>
    </>}
    <p>{t.note}</p>
  </section>;
}
