import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import useCampaignWorld from '../../hooks/useCampaignWorld.js';
import { signInWithGoogle } from '../../cloud/googleAuth.js';
import { MAP_REGIONS, getMapRegion, getRegionName } from '../../data/map/mapRegions.js';
import { canSpend } from '../../utils/settlementDevelopment.js';
import { characterImport } from '../../utils/campaignCharacter.js';
import SettlementScreen from '../settlement/SettlementScreen.jsx';
import { worldCopy, worldError } from './worldCopy.js';
import './campaignWorld.css';

export default function CampaignWorldMap({ campaignId, form, onOpenCampaigns }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const c = worldCopy(language);
  const persistent = /^campaign_[a-f0-9]{24}$/.test(campaignId || '');
  const world = useCampaignWorld(persistent ? campaignId : null);
  const { campaign, uid, busy, connected, error, retry, run } = world;
  const [selected, setSelected] = useState(null), [name, setName] = useState('');
  const [activeId, setActiveId] = useState(null), [authError, setAuthError] = useState('');
  const [amounts, setAmounts] = useState({ caps: '', common: '', uncommon: '', rare: '' });
  const region = getMapRegion(campaign?.worldMap?.regionId);
  useEffect(() => { setSelected(null); setActiveId(null); setName(''); }, [campaignId, uid]);
  useEffect(() => setSelected(null), [region.id]);
  const point = selected || region.start;
  const validPoint = Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x <= 63 && point.y <= 63;
  const gm = Boolean(campaign && campaign.ownerUid === uid);
  const disabled = busy || !connected || !!retry;
  const members = Object.entries(campaign?.members || {}).filter(([, member]) => !member.revoked);
  const settlements = campaign?.settlements || [];
  const active = settlements.find(s => s.id === activeId);
  const actor = { id: uid, isGM: gm, campaignId };
  const editable = active && canSpend(active, actor);
  const locationName = location => location.nameKey ? t(location.nameKey, { defaultValue: location.name }) : location.name;
  async function submitCharacter() {
    try { setAuthError(''); await run({type: 'submitCharacter', character: characterImport(form, uid)}); } catch { setAuthError(c.error); }
  }
  const status = <div className="campaign-world-status" role="status">
    <span>{busy ? c.busy : connected ? c.synced : c.offline}</span>
    {authError && <span role="alert">{authError}</span>}
    {error && <span role="alert">{worldError(error, c)}</span>}
    {retry && <button className="pip-btn" disabled={busy} onClick={world.retryLast}>{c.retry}</button>}
  </div>;
  const characterPanel = <details className="campaign-world-character"><summary>{campaign?.character ? `${c.approved}: ${campaign.character.name}` : c.character}</summary>
    {!campaign?.character && <><p>{c.character}</p><button className="pip-btn" disabled={disabled || !form || !!campaign?.proposals?.[uid]} onClick={submitCharacter}>{campaign?.proposals?.[uid] ? c.pending : c.submit}</button></>}
    {gm && Object.entries(campaign?.proposals || {}).map(([id, character]) => <p key={id}>{character.name} <button className="pip-btn" disabled={disabled} onClick={() => run({ type: 'approveCharacter', memberId: id })}>{c.approve}</button></p>)}
  </details>;

  if (!persistent) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{c.quick}</p>{onOpenCampaigns && <button className="pip-btn is-primary" onClick={onOpenCampaigns}>{c.campaigns}</button>}</section>;
  if (!uid) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{c.auth}</p>{authError && <p role="alert">{authError}</p>}<button className="pip-btn" onClick={async () => { try { await signInWithGoogle(); } catch { setAuthError(c.error); } }}>{c.signIn}</button></section>;
  if (!campaign) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{error ? worldError(error, c) : c.loading}</p></section>;

  const settlementControls = <div className="campaign-world-controls">
    {status}{characterPanel}
    {!editable && <p>{c.readOnly}</p>}
    {gm && <details><summary>{c.manage}</summary>{members.filter(([id]) => id !== uid).map(([id, m]) => <label className="campaign-world-spender" key={id}><input type="checkbox" disabled={disabled} checked={Boolean(active?.access?.spenders?.includes(id))} onChange={e => run({ type: 'settlement', settlementId: active.id, command: { type: 'spender', memberId: id, allowed: e.target.checked } })}/>{m.name} · {c.spend}</label>)}</details>}
    {campaign.character && <details><summary>{c.deposit}</summary><p>{c.stock}</p><form className="campaign-world-deposit" onSubmit={async e => { e.preventDefault(); const result = await run({ type: 'settlement', settlementId: active.id, command: { type: 'deposit', amounts: Object.fromEntries(Object.entries(amounts).map(([k,v]) => [k, Number(v) || 0])) } }); if (result) setAmounts({ caps:'', common:'', uncommon:'', rare:'' }); }}>
      {Object.keys(amounts).map(key => <label key={key}>{c[key]}<input type="number" min="0" step="1" value={amounts[key]} onChange={e => setAmounts(old => ({ ...old, [key]: e.target.value }))}/></label>)}
      <button className="pip-btn" disabled={disabled || !Object.values(amounts).some(v => Number(v) > 0)}>{c.deposit}</button>
    </form></details>}
  </div>;

  return <section className="campaign-world" aria-label={c.title}>
    <header className="campaign-world-heading"><div><h2>{c.title}</h2><p>{campaign.name} · {c.shared}</p></div><label>{c.region}<select aria-label={c.region} value={region.id} disabled={!gm || disabled} onChange={e => run({ type: 'worldRegion', regionId: e.target.value })}>{MAP_REGIONS.map(r => <option key={r.id} value={r.id}>{getRegionName(r, language)} · {r.game}</option>)}</select></label></header>
    {status}
    <div className="campaign-world-layout"><div>
      <p>{c.select}</p>
      <div className="campaign-world-scroll" tabIndex={0} aria-label={c.title}>
        <div className="campaign-world-board" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setSelected({ x: Math.max(0, Math.min(63, Math.floor((e.clientX - rect.left) / rect.width * 64))), y: Math.max(0, Math.min(63, Math.floor((e.clientY - rect.top) / rect.height * 64))) }); }}>
          <span className="campaign-world-watermark">{getRegionName(region, language)}</span>
          {region.locations.map(l => <button type="button" key={l.id} className="campaign-world-marker is-location" style={{left:`${(l.worldX+.5)/64*100}%`,top:`${(l.worldY+.5)/64*100}%`}} title={locationName(l)} aria-label={locationName(l)} onClick={e => {e.stopPropagation();setSelected({x:l.worldX,y:l.worldY});}}>{l.icon || '◆'}</button>)}
          {settlements.filter(s => s.regionId === region.id).map(s => <button type="button" className="campaign-world-marker is-settlement" key={s.id} title={s.name} aria-label={`${c.open}: ${s.name}`} style={{left:`${(s.worldX+.5)/64*100}%`,top:`${(s.worldY+.5)/64*100}%`}} onClick={e => {e.stopPropagation();setActiveId(s.id);}}>⌂<small>{s.name}</small></button>)}
          {members.map(([id,m], index) => { const p=campaign.worldMap?.positions?.[id] || region.start; return <span className={`campaign-world-marker is-member ${id===uid?'is-self':''}`} key={id} style={{left:`${(p.x+.5)/64*100}%`,top:`${(p.y+.5)/64*100}%`,marginLeft:index*5}} title={`${m.name} · X:${p.x} Y:${p.y}`}>{index+1}</span>; })}
          {validPoint && <span className="campaign-world-selection" style={{left:`${(point.x+.5)/64*100}%`,top:`${(point.y+.5)/64*100}%`}}>＋</span>}
        </div>
      </div>
    </div><aside className="campaign-world-sidebar">
      <label>{c.choose}<select aria-label={c.choose} value="" onChange={e => {const l=region.locations.find(l=>l.id===e.target.value);if(l)setSelected({x:l.worldX,y:l.worldY});}}><option value="">{c.choose}…</option>{region.locations.map(l=><option key={l.id} value={l.id}>{locationName(l)}</option>)}</select></label>
      <div className="campaign-world-coordinates">{['x','y'].map(axis => <label key={axis}>{axis.toUpperCase()}<input type="number" min="0" max="63" step="1" value={point[axis]} onChange={e=>setSelected({...point,[axis]:e.target.value===''?'':Number(e.target.value)})}/></label>)}</div>
      <button className="pip-btn" disabled={disabled || !validPoint} onClick={()=>run({type:'worldMove',regionId:region.id,x:point.x,y:point.y})}>{c.move}</button>
      {gm && <form className="campaign-world-found" onSubmit={async e=>{e.preventDefault();const result=await run({type:'found',name:name.trim(),regionId:region.id,worldX:point.x,worldY:point.y});if(result){const created=result.settlements.find(s=>s.regionId===region.id&&s.worldX===point.x&&s.worldY===point.y);setActiveId(created?.id);setName('');}}}><label>{c.name}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="pip-btn is-primary" disabled={disabled||!validPoint||!name.trim()||settlements.length>=5||settlements.some(s=>s.regionId===region.id&&s.worldX===point.x&&s.worldY===point.y)}>{c.found}</button></form>}
      <h3>{c.members}</h3>{members.map(([id,m],index)=>{const p=campaign.worldMap?.positions?.[id]||region.start;return <button className="pip-btn" key={id} onClick={()=>setSelected({x:p.x,y:p.y})}>{index+1}. {m.name} · {p.x}:{p.y}</button>;})}
    </aside></div>
    <div className="campaign-world-settlements"><h3>{c.settlements} · {settlements.length}/5</h3>{!settlements.length && <p>{c.empty}</p>}{settlements.map(s=><button className="pip-btn" key={s.id} onClick={()=>setActiveId(s.id)}><strong>⌂ {s.name}</strong><span>{getRegionName(getMapRegion(s.regionId),language)} · {s.worldX}:{s.worldY}</span><span>{c.open} →</span></button>)}</div>
    {characterPanel}
    {active && createPortal(<SettlementScreen key={active.id} settlement={active} onBack={()=>setActiveId(null)} sharedControls={settlementControls} canEdit={Boolean(editable)&&!disabled} onCommand={async command=>{if(disabled||!editable)return false;return Boolean(await run({type:'settlement',settlementId:active.id,command}));}}/>,document.body)}
  </section>;
}
