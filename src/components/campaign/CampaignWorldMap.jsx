import PersonalConstructionPanel from './PersonalConstructionPanel.jsx';
import { personalQuote, personalBlockers } from '../../utils/personalConstruction.js';
import { playerResources, RESOURCE_KEYS } from '../../utils/settlementDevelopment.js';
import PhaserMapViewport from '../phaser/PhaserMapViewport.jsx';
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
import CampaignSyncStatus from './CampaignSyncStatus.jsx';
import { offlineCopy } from './offlineCopy.js';
import './campaignWorld.css';

const MARKER_COPY = {
  en: { title: 'SHARED MARKERS', name: 'Marker name', description: 'Description', add: 'ADD MARKER', save: 'SAVE MARKER', gm: 'GM', player: 'PLAYER', public: 'PUBLIC', gmOnly: 'GM ONLY', delete: 'DELETE', empty: 'No shared markers in this region.', hint: 'Select a point on the map, name it, and add a marker. Public markers are visible to everyone.', objective:'Objective', danger:'Danger', loot:'Loot', quest:'Quest', note:'Note', settlement:'Settlement', live:'LIVE POSITIONS' },
  ru: { title: 'ОБЩИЕ МЕТКИ', name: 'Название метки', description: 'Описание', add: 'ДОБАВИТЬ МЕТКУ', save: 'СОХРАНИТЬ МЕТКУ', gm: 'ГМ', player: 'ИГРОК', public: 'ДЛЯ ВСЕХ', gmOnly: 'ТОЛЬКО ГМ', delete: 'УДАЛИТЬ', empty: 'В этом регионе пока нет общих меток.', hint: 'Выберите точку на карте, назовите её и добавьте метку. Публичные метки видны всем.', objective:'Цель', danger:'Опасность', loot:'Лут', quest:'Квест', note:'Заметка', settlement:'Поселение', live:'ПОЗИЦИИ ИГРОКОВ' },
  uk: { title: 'СПІЛЬНІ МІТКИ', name: 'Назва мітки', description: 'Опис', add: 'ДОДАТИ МІТКУ', save: 'ЗБЕРЕГТИ МІТКУ', gm: 'ГМ', player: 'ГРАВЕЦЬ', public: 'ДЛЯ ВСІХ', gmOnly: 'ЛИШЕ ГМ', delete: 'ВИДАЛИТИ', empty: 'У цьому регіоні ще немає спільних міток.', hint: 'Оберіть точку на мапі, назвіть її та додайте мітку. Публічні мітки бачать усі.', objective:'Ціль', danger:'Небезпека', loot:'Лут', quest:'Квест', note:'Нотатка', settlement:'Поселення', live:'ПОЗИЦІЇ ГРАВЦІВ' },
  pl: { title: 'WSPÓLNE ZNACZNIKI', name: 'Nazwa znacznika', description: 'Opis', add: 'DODAJ ZNACZNIK', save: 'ZAPISZ ZNACZNIK', gm: 'MG', player: 'GRACZ', public: 'PUBLICZNY', gmOnly: 'TYLKO MG', delete: 'USUŃ', empty: 'Brak wspólnych znaczników w tym regionie.', hint: 'Wybierz punkt na mapie, nazwij go i dodaj znacznik. Publiczne znaczniki widzą wszyscy.', objective:'Cel', danger:'Niebezpieczeństwo', loot:'Łup', quest:'Zadanie', note:'Notatka', settlement:'Osada', live:'POZYCJE GRACZY' },
};
const MARKER_ICONS = { objective:'◎', danger:'!', loot:'$', quest:'?', note:'●', settlement:'⌂' };
const MARKER_CATEGORIES = Object.keys(MARKER_ICONS);

function routeLine(start, end) {
  if (!start || !end) return [];
  let x0 = Number(start.x), y0 = Number(start.y), x1 = Number(end.x), y1 = Number(end.y);
  const points = [{ x: x0, y: y0 }];
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, guard = 0;
  while ((x0 !== x1 || y0 !== y1) && guard++ < 128) {
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
    points.push({ x: x0, y: y0 });
  }
  return points;
}

export default function CampaignWorldMap({ campaignId, form, onOpenCampaigns, settlementsOnly = false }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const c = worldCopy(language);
  const markerCopy = MARKER_COPY[String(language).split('-')[0]] || MARKER_COPY.en;
  const persistent = /^campaign_[a-f0-9]{24}$/.test(campaignId || '');
  const world = useCampaignWorld(persistent ? campaignId : null);
  const { campaign, uid, busy, connected, error, retry, run } = world;
  const [selected, setSelected] = useState(null), [name, setName] = useState('');
  const [markerName, setMarkerName] = useState(''), [markerDescription, setMarkerDescription] = useState('');
  const [markerCategory, setMarkerCategory] = useState('note'), [markerVisibility, setMarkerVisibility] = useState('public');
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [activeId, setActiveId] = useState(null), [authError, setAuthError] = useState('');
  const [amounts, setAmounts] = useState({ caps: '', common: '', uncommon: '', rare: '' });
  const region = getMapRegion(campaign?.worldMap?.regionId);
  useEffect(() => { setSelected(null); setActiveId(null); setName(''); setMarkerName(''); setMarkerDescription(''); setMarkerCategory('note'); setMarkerVisibility('public'); setSelectedMarkerId(null); }, [campaignId, uid]);
  useEffect(() => { setSelected(null); setSelectedMarkerId(null); }, [region.id]);
  useEffect(() => {
    if (!campaignId || !uid || !world.refreshWorld) return undefined;
    let cancelled=false;
    const poll=()=>{ if(!cancelled && document.visibilityState === 'visible') void world.refreshWorld(); };
    const timer=window.setInterval(poll, 15000);
    const visible=()=>{ if(document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', visible);
    return()=>{cancelled=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  }, [campaignId, uid, world.refreshWorld]);
  const point = selected || region.start;
  const validPoint = Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x <= 63 && point.y <= 63;
  const myPosition = campaign?.worldMap?.positions?.[uid] || region.start;
  const selectedRoute = validPoint && (point.x !== myPosition.x || point.y !== myPosition.y) ? routeLine(myPosition, point) : [];
  const gm = Boolean(campaign && campaign.ownerUid === uid);
  const disabled = busy || !connected || !!retry || world.blocked;
  const localDisabled = busy || !world.localReady;
  const members = Object.entries(campaign?.members || {}).filter(([, member]) => !member.revoked);
  const settlements = campaign?.settlements || [];
  const sharedMarkers = (campaign?.worldMap?.markers || []).filter(marker => marker.regionId === region.id);
  const active = settlements.find(s => s.id === activeId);
  const actor = { id: uid, isGM: gm, campaignId };
  const editable = active && canSpend(active, actor);
  const personalReady = world.personalReady && world.sourceCharacterId === form?._localCharacterId;
  const approvedBalance=playerResources(campaign?.character);
  const available=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,Math.min(approvedBalance[k]||0,world.sourceAvailable?.[k]||0)]));
  const payer=campaign?.character ? {...campaign.character,caps:available.caps,inventoryItems:['common','uncommon','rare'].map(materialTier=>({sourceType:'crafting_material',materialTier,quantity:available[materialTier]}))} : null;
  function canAffordPersonal(command) {
    if(!personalReady || !active)return false;
    try{return personalBlockers(active,payer,personalQuote(active,command).rule,actor).length===0;}catch{return false;}
  }
  async function settlementCommand(command) {
    if(localDisabled||!editable)return false;
    const kinds={build:'buildPersonal',room:'roomPersonal',upgrade:'upgradePersonal'};
    if(kinds[command.type]) {
      if(!personalReady)return false;
      const cmd={...command,type:kinds[command.type],sourceId:world.sourceCharacterId};
      cmd.quote=personalQuote(active,cmd).amounts;
      return Boolean(await run({type:'settlement',settlementId:active.id,command:cmd}));
    }
    return Boolean(await run({type:'settlement',settlementId:active.id,command}));
  }
  const locationName = location => location.nameKey ? t(location.nameKey, { defaultValue: location.name }) : location.name;
  async function submitCharacter() {
    try { setAuthError(''); await run({type: 'submitCharacter', character: characterImport(form, uid)}); } catch { setAuthError(c.error); }
  }
  const status = <CampaignSyncStatus world={world} language={language} authError={authError} />;
  const characterPanel = <details className="campaign-world-character"><summary>{campaign?.character ? `${c.approved}: ${campaign.character.name}` : c.character}</summary>
    {!campaign?.character && <><p>{c.character}</p><button className="pip-btn" disabled={disabled || !form || !!campaign?.proposals?.[uid]} onClick={submitCharacter}>{campaign?.proposals?.[uid] ? c.pending : c.submit}</button></>}
    {gm && Object.entries(campaign?.proposals || {}).map(([id, character]) => <p key={id}>{character.name} <button className="pip-btn" disabled={disabled} onClick={() => run({ type: 'approveCharacter', memberId: id })}>{c.approve}</button></p>)}
  </details>;

  if (!persistent) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{c.quick}</p>{onOpenCampaigns && <button className="pip-btn is-primary" onClick={onOpenCampaigns}>{c.campaigns}</button>}</section>;
  if (!uid) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{c.auth}</p>{authError && <p role="alert">{authError}</p>}<button className="pip-btn" onClick={async () => { try { await signInWithGoogle(); } catch { setAuthError(c.error); } }}>{c.signIn}</button></section>;
  if (!campaign) return <section className="pip-panel campaign-world"><h2>{c.title}</h2>{status}<p>{world.blocked ? c.readOnly : offlineCopy(language).first}</p></section>;

  const settlementControls = <div className="campaign-world-controls">
    {status}{characterPanel}<PersonalConstructionPanel world={world} form={form} language={language}/>
    {!editable && <p>{c.readOnly}</p>}
    {gm && <details><summary>{c.manage}</summary>{members.filter(([id]) => id !== uid).map(([id, m]) => <label className="campaign-world-spender" key={id}><input type="checkbox" disabled={disabled} checked={Boolean(active?.access?.spenders?.includes(id))} onChange={e => run({ type: 'settlement', settlementId: active.id, command: { type: 'spender', memberId: id, allowed: e.target.checked } })}/>{m.name} · {c.spend}</label>)}</details>}
    {campaign.character && <details><summary>{c.deposit}</summary><p>{c.stock}</p><form className="campaign-world-deposit" onSubmit={async e => { e.preventDefault(); const result = await run({ type: 'settlement', settlementId: active.id, command: { type: 'deposit', amounts: Object.fromEntries(Object.entries(amounts).map(([k,v]) => [k, Number(v) || 0])) } }); if (result) setAmounts({ caps:'', common:'', uncommon:'', rare:'' }); }}>
      {Object.keys(amounts).map(key => <label key={key}>{c[key]}<input type="number" min="0" step="1" value={amounts[key]} onChange={e => setAmounts(old => ({ ...old, [key]: e.target.value }))}/></label>)}
      <button className="pip-btn" disabled={disabled || (world.sourceCharacterId && !personalReady) || !Object.values(amounts).some(v => Number(v) > 0)}>{c.deposit}</button>
    </form></details>}
  </div>;

  return <section className="campaign-world" aria-label={c.title}>
    <header className="campaign-world-heading"><div><h2>{c.title}</h2><p>{campaign.name} · {c.shared}</p></div><label>{c.region}<select aria-label={c.region} value={region.id} disabled={!gm || disabled} onChange={e => run({ type: 'worldRegion', regionId: e.target.value })}>{MAP_REGIONS.map(r => <option key={r.id} value={r.id}>{getRegionName(r, language)} · {r.game}</option>)}</select></label></header>
    {status}
    <div className="campaign-world-layout" hidden={settlementsOnly}><div>
      <p>{c.select}</p>
      <PhaserMapViewport cols={64} rows={64} sceneKey={`${campaignId}:${region.id}`} label={c.title}
        selected={validPoint ? point : null}
        player={campaign.worldMap?.positions?.[uid] || region.start}
        route={selectedRoute}
        onCell={(x, y) => { setSelected({ x, y }); setSelectedMarkerId(null); }}
        markers={[
          ...region.locations.map(l => ({ id: l.id, x: l.worldX, y: l.worldY, icon: l.icon || '◆' })),
          ...members.map(([id, m], index) => ({ id: `member-${id}`, ...(campaign.worldMap?.positions?.[id] || region.start), icon: String(index + 1), label: m.name, kind: 'member', memberMarker: true, memberId: id })),
          ...settlements.filter(s => s.regionId === region.id).map(s => ({ id: s.id, x: s.worldX, y: s.worldY, icon: '⌂', label: s.name, settlement: true })),
          ...sharedMarkers.map(marker => ({ ...marker, x: marker.x, y: marker.y, icon: MARKER_ICONS[marker.category] || (marker.kind === 'gm' ? '★' : '●'), label: marker.label, sharedMarker: true })),
        ]}
        onMarker={marker => {
          if (marker.settlement) { setActiveId(marker.id); return; }
          setSelected({ x: marker.x, y: marker.y });
          if (marker.sharedMarker) {
            setSelectedMarkerId(marker.id);
            setMarkerName(marker.label || '');
            setMarkerDescription(marker.description || '');
            setMarkerCategory(marker.category || 'note');
            setMarkerVisibility(marker.visibility || 'public');
          } else {
            setSelectedMarkerId(null);
          }
        }}
      />
    </div><aside className="campaign-world-sidebar">
      <label>{c.choose}<select aria-label={c.choose} value="" onChange={e => {const l=region.locations.find(l=>l.id===e.target.value);if(l)setSelected({x:l.worldX,y:l.worldY});}}><option value="">{c.choose}…</option>{region.locations.map(l=><option key={l.id} value={l.id}>{locationName(l)}</option>)}</select></label>
      <div className="campaign-world-coordinates">{['x','y'].map(axis => <label key={axis}>{axis.toUpperCase()}<input type="number" min="0" max="63" step="1" value={point[axis]} onChange={e=>setSelected({...point,[axis]:e.target.value===''?'':Number(e.target.value)})}/></label>)}</div>
      <button className="pip-btn" disabled={disabled || !validPoint || !selectedRoute.length} onClick={async()=>{const ok=await run({type:'worldMove',regionId:region.id,x:point.x,y:point.y});if(ok)setSelected(null);}}>{c.move}{selectedRoute.length ? ` · ${selectedRoute.length-1}` : ''}</button>
      <section className="campaign-world-markers">
        <h3>{markerCopy.title}</h3>
        <p>{markerCopy.hint}</p>
        <form onSubmit={async e => {
          e.preventDefault();
          if (!validPoint || !markerName.trim()) return;
          const markerId = selectedMarkerId || `marker_${crypto.randomUUID()}`;
          const result = await run({ type:'worldMarkerUpsert', markerId, regionId:region.id, x:point.x, y:point.y, label:markerName.trim(), description:markerDescription.trim(), category:markerCategory, visibility:gm ? markerVisibility : 'public' });
          if (result) { setMarkerName(''); setMarkerDescription(''); setMarkerCategory('note'); setMarkerVisibility('public'); setSelectedMarkerId(null); }
        }}>
          <input className="pip-input" maxLength={80} placeholder={markerCopy.name} value={markerName} onChange={e=>setMarkerName(e.target.value)} />
          <textarea className="pip-input" maxLength={240} rows={2} placeholder={markerCopy.description} value={markerDescription} onChange={e=>setMarkerDescription(e.target.value)} />
          <select className="pip-input" value={markerCategory} onChange={e=>setMarkerCategory(e.target.value)}>{MARKER_CATEGORIES.map(key=><option key={key} value={key}>{MARKER_ICONS[key]} {markerCopy[key]}</option>)}</select>
          {gm && <select className="pip-input" value={markerVisibility} onChange={e=>setMarkerVisibility(e.target.value)}><option value="public">{markerCopy.public}</option><option value="gm">{markerCopy.gmOnly}</option></select>}
          <button className="pip-btn is-primary" disabled={disabled || !validPoint || !markerName.trim()}>{selectedMarkerId ? markerCopy.save : markerCopy.add}</button>
        </form>
        <div className="campaign-world-marker-list">
          {!sharedMarkers.length && <small>{markerCopy.empty}</small>}
          {sharedMarkers.map(marker => {
            const canDelete = gm || marker.createdBy === uid;
            return <div className="campaign-world-marker-row" key={marker.id}>
              <button type="button" className="pip-btn" onClick={()=>{setSelected({x:marker.x,y:marker.y});setSelectedMarkerId(marker.id);setMarkerName(marker.label);setMarkerDescription(marker.description||'');setMarkerCategory(marker.category||'note');setMarkerVisibility(marker.visibility||'public');}}>
                <strong>{MARKER_ICONS[marker.category] || (marker.kind === 'gm' ? '★' : '●')} {marker.label}</strong>
                <small>{marker.kind === 'gm' ? markerCopy.gm : markerCopy.player} · {markerCopy[marker.category] || marker.category || markerCopy.note} · {marker.visibility === 'gm' ? markerCopy.gmOnly : markerCopy.public} · {marker.x}:{marker.y}</small>
                {marker.description && <small>{marker.description}</small>}
              </button>
              {canDelete && <button type="button" className="pip-btn" disabled={disabled} onClick={()=>run({type:'worldMarkerDelete',markerId:marker.id})}>{markerCopy.delete}</button>}
            </div>;
          })}
        </div>
      </section>
      {gm && <form className="campaign-world-found" onSubmit={async e=>{e.preventDefault();const result=await run({type:'found',name:name.trim(),regionId:region.id,worldX:point.x,worldY:point.y});if(result){const created=result.settlements.find(s=>s.regionId===region.id&&s.worldX===point.x&&s.worldY===point.y);setActiveId(created?.id);setName('');}}}><label>{c.name}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="pip-btn is-primary" disabled={disabled||!validPoint||!name.trim()||settlements.length>=5||settlements.some(s=>s.regionId===region.id&&s.worldX===point.x&&s.worldY===point.y)}>{c.found}</button></form>}
      <h3>{markerCopy.live}</h3>{members.map(([id,m],index)=>{const p=campaign.worldMap?.positions?.[id]||region.start;return <button className="pip-btn campaign-world-member-row" key={id} onClick={()=>setSelected({x:p.x,y:p.y})}><span>{index+1}. {m.name}{id===uid?' · YOU':''}</span><small>{p.x}:{p.y}</small></button>;})}
    </aside></div>
    <div className="campaign-world-settlements"><h3>{c.settlements} · {settlements.length}/5</h3>{!settlements.length && <p>{c.empty}</p>}{settlements.map(s=><button className="pip-btn" key={s.id} onClick={()=>setActiveId(s.id)}><strong>⌂ {s.name}</strong><span>{getRegionName(getMapRegion(s.regionId),language)} · {s.worldX}:{s.worldY}</span><span>{c.open} →</span></button>)}</div>
    {characterPanel}
    {active && createPortal(<SettlementScreen key={active.id} settlement={active} onBack={()=>setActiveId(null)} sharedControls={settlementControls} canEdit={Boolean(editable)&&!localDisabled} payment={{ready:personalReady,canAfford:canAffordPersonal}} onCommand={settlementCommand}/>,document.body)}
  </section>;
}
, quest:'?', note:'●', settlement:'⌂' };
const MARKER_CATEGORIES = Object.keys(MARKER_ICONS);

function routeLine(start, end) {
  if (!start || !end) return [];
  let x0=Number(start.x), y0=Number(start.y), x1=Number(end.x), y1=Number(end.y);
  const points=[{x:x0,y:y0}], dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
  let err=dx+dy, guard=0;
  while ((x0!==x1 || y0!==y1) && guard++ < 128) {
    const e2=2*err;
    if(e2>=dy){err+=dy;x0+=sx;}
    if(e2<=dx){err+=dx;y0+=sy;}
    points.push({x:x0,y:y0});
  }
  return points;
}

export default function CampaignWorldMap({ campaignId, form, onOpenCampaigns, settlementsOnly = false }) {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const c = worldCopy(language);
  const markerCopy = MARKER_COPY[String(language).split('-')[0]] || MARKER_COPY.en;
  const persistent = /^campaign_[a-f0-9]{24}$/.test(campaignId || '');
  const world = useCampaignWorld(persistent ? campaignId : null);
  const { campaign, uid, busy, connected, error, retry, run } = world;
  const [selected, setSelected] = useState(null), [name, setName] = useState('');
  const [markerName, setMarkerName] = useState(''), [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [activeId, setActiveId] = useState(null), [authError, setAuthError] = useState('');
  const [amounts, setAmounts] = useState({ caps: '', common: '', uncommon: '', rare: '' });
  const region = getMapRegion(campaign?.worldMap?.regionId);
  useEffect(() => { setSelected(null); setActiveId(null); setName(''); setMarkerName(''); setSelectedMarkerId(null); }, [campaignId, uid]);
  useEffect(() => { setSelected(null); setSelectedMarkerId(null); }, [region.id]);
  const point = selected || region.start;
  const validPoint = Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.y >= 0 && point.x <= 63 && point.y <= 63;
  const gm = Boolean(campaign && campaign.ownerUid === uid);
  const disabled = busy || !connected || !!retry || world.blocked;
  const localDisabled = busy || !world.localReady;
  const members = Object.entries(campaign?.members || {}).filter(([, member]) => !member.revoked);
  const settlements = campaign?.settlements || [];
  const sharedMarkers = (campaign?.worldMap?.markers || []).filter(marker => marker.regionId === region.id);
  const active = settlements.find(s => s.id === activeId);
  const actor = { id: uid, isGM: gm, campaignId };
  const editable = active && canSpend(active, actor);
  const personalReady = world.personalReady && world.sourceCharacterId === form?._localCharacterId;
  const approvedBalance=playerResources(campaign?.character);
  const available=Object.fromEntries(RESOURCE_KEYS.map(k=>[k,Math.min(approvedBalance[k]||0,world.sourceAvailable?.[k]||0)]));
  const payer=campaign?.character ? {...campaign.character,caps:available.caps,inventoryItems:['common','uncommon','rare'].map(materialTier=>({sourceType:'crafting_material',materialTier,quantity:available[materialTier]}))} : null;
  function canAffordPersonal(command) {
    if(!personalReady || !active)return false;
    try{return personalBlockers(active,payer,personalQuote(active,command).rule,actor).length===0;}catch{return false;}
  }
  async function settlementCommand(command) {
    if(localDisabled||!editable)return false;
    const kinds={build:'buildPersonal',room:'roomPersonal',upgrade:'upgradePersonal'};
    if(kinds[command.type]) {
      if(!personalReady)return false;
      const cmd={...command,type:kinds[command.type],sourceId:world.sourceCharacterId};
      cmd.quote=personalQuote(active,cmd).amounts;
      return Boolean(await run({type:'settlement',settlementId:active.id,command:cmd}));
    }
    return Boolean(await run({type:'settlement',settlementId:active.id,command}));
  }
  const locationName = location => location.nameKey ? t(location.nameKey, { defaultValue: location.name }) : location.name;
  async function submitCharacter() {
    try { setAuthError(''); await run({type: 'submitCharacter', character: characterImport(form, uid)}); } catch { setAuthError(c.error); }
  }
  const status = <CampaignSyncStatus world={world} language={language} authError={authError} />;
  const characterPanel = <details className="campaign-world-character"><summary>{campaign?.character ? `${c.approved}: ${campaign.character.name}` : c.character}</summary>
    {!campaign?.character && <><p>{c.character}</p><button className="pip-btn" disabled={disabled || !form || !!campaign?.proposals?.[uid]} onClick={submitCharacter}>{campaign?.proposals?.[uid] ? c.pending : c.submit}</button></>}
    {gm && Object.entries(campaign?.proposals || {}).map(([id, character]) => <p key={id}>{character.name} <button className="pip-btn" disabled={disabled} onClick={() => run({ type: 'approveCharacter', memberId: id })}>{c.approve}</button></p>)}
  </details>;

  if (!persistent) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{c.quick}</p>{onOpenCampaigns && <button className="pip-btn is-primary" onClick={onOpenCampaigns}>{c.campaigns}</button>}</section>;
  if (!uid) return <section className="pip-panel campaign-world"><h2>{c.title}</h2><p>{c.auth}</p>{authError && <p role="alert">{authError}</p>}<button className="pip-btn" onClick={async () => { try { await signInWithGoogle(); } catch { setAuthError(c.error); } }}>{c.signIn}</button></section>;
  if (!campaign) return <section className="pip-panel campaign-world"><h2>{c.title}</h2>{status}<p>{world.blocked ? c.readOnly : offlineCopy(language).first}</p></section>;

  const settlementControls = <div className="campaign-world-controls">
    {status}{characterPanel}<PersonalConstructionPanel world={world} form={form} language={language}/>
    {!editable && <p>{c.readOnly}</p>}
    {gm && <details><summary>{c.manage}</summary>{members.filter(([id]) => id !== uid).map(([id, m]) => <label className="campaign-world-spender" key={id}><input type="checkbox" disabled={disabled} checked={Boolean(active?.access?.spenders?.includes(id))} onChange={e => run({ type: 'settlement', settlementId: active.id, command: { type: 'spender', memberId: id, allowed: e.target.checked } })}/>{m.name} · {c.spend}</label>)}</details>}
    {campaign.character && <details><summary>{c.deposit}</summary><p>{c.stock}</p><form className="campaign-world-deposit" onSubmit={async e => { e.preventDefault(); const result = await run({ type: 'settlement', settlementId: active.id, command: { type: 'deposit', amounts: Object.fromEntries(Object.entries(amounts).map(([k,v]) => [k, Number(v) || 0])) } }); if (result) setAmounts({ caps:'', common:'', uncommon:'', rare:'' }); }}>
      {Object.keys(amounts).map(key => <label key={key}>{c[key]}<input type="number" min="0" step="1" value={amounts[key]} onChange={e => setAmounts(old => ({ ...old, [key]: e.target.value }))}/></label>)}
      <button className="pip-btn" disabled={disabled || (world.sourceCharacterId && !personalReady) || !Object.values(amounts).some(v => Number(v) > 0)}>{c.deposit}</button>
    </form></details>}
  </div>;

  return <section className="campaign-world" aria-label={c.title}>
    <header className="campaign-world-heading"><div><h2>{c.title}</h2><p>{campaign.name} · {c.shared}</p></div><label>{c.region}<select aria-label={c.region} value={region.id} disabled={!gm || disabled} onChange={e => run({ type: 'worldRegion', regionId: e.target.value })}>{MAP_REGIONS.map(r => <option key={r.id} value={r.id}>{getRegionName(r, language)} · {r.game}</option>)}</select></label></header>
    {status}
    <div className="campaign-world-layout" hidden={settlementsOnly}><div>
      <p>{c.select}</p>
      <PhaserMapViewport cols={64} rows={64} sceneKey={`${campaignId}:${region.id}`} label={c.title}
        selected={validPoint ? point : null}
        player={campaign.worldMap?.positions?.[uid] || region.start}
        onCell={(x, y) => setSelected({ x, y })}
        markers={[
          ...region.locations.map(l => ({ id: l.id, x: l.worldX, y: l.worldY, icon: l.icon || '◆' })),
          ...members.map(([id, m], index) => ({ id: `member-${id}`, ...(campaign.worldMap?.positions?.[id] || region.start), icon: String(index + 1) })),
          ...settlements.filter(s => s.regionId === region.id).map(s => ({ id: s.id, x: s.worldX, y: s.worldY, icon: '⌂', settlement: true })),
          ...sharedMarkers.map(marker => ({ ...marker, x: marker.x, y: marker.y, icon: marker.kind === 'gm' ? '★' : '●', label: marker.label, sharedMarker: true })),
        ]}
        onMarker={marker => {
          if (marker.settlement) { setActiveId(marker.id); return; }
          setSelected({ x: marker.x, y: marker.y });
          setSelectedMarkerId(marker.sharedMarker ? marker.id : null);
        }}
      />
    </div><aside className="campaign-world-sidebar">
      <label>{c.choose}<select aria-label={c.choose} value="" onChange={e => {const l=region.locations.find(l=>l.id===e.target.value);if(l)setSelected({x:l.worldX,y:l.worldY});}}><option value="">{c.choose}…</option>{region.locations.map(l=><option key={l.id} value={l.id}>{locationName(l)}</option>)}</select></label>
      <div className="campaign-world-coordinates">{['x','y'].map(axis => <label key={axis}>{axis.toUpperCase()}<input type="number" min="0" max="63" step="1" value={point[axis]} onChange={e=>setSelected({...point,[axis]:e.target.value===''?'':Number(e.target.value)})}/></label>)}</div>
      <button className="pip-btn" disabled={disabled || !validPoint} onClick={()=>run({type:'worldMove',regionId:region.id,x:point.x,y:point.y})}>{c.move}</button>
      <section className="campaign-world-markers">
        <h3>{markerCopy.title}</h3>
        <p>{markerCopy.hint}</p>
        <form onSubmit={async e => {
          e.preventDefault();
          if (!validPoint || !markerName.trim()) return;
          const markerId = selectedMarkerId || `marker_${crypto.randomUUID()}`;
          const result = await run({ type:'worldMarkerUpsert', markerId, regionId:region.id, x:point.x, y:point.y, label:markerName.trim() });
          if (result) { setMarkerName(''); setSelectedMarkerId(null); }
        }}>
          <input className="pip-input" maxLength={80} placeholder={markerCopy.name} value={markerName} onChange={e=>setMarkerName(e.target.value)} />
          <button className="pip-btn is-primary" disabled={disabled || !validPoint || !markerName.trim()}>{markerCopy.add}</button>
        </form>
        <div className="campaign-world-marker-list">
          {!sharedMarkers.length && <small>{markerCopy.empty}</small>}
          {sharedMarkers.map(marker => {
            const canDelete = gm || marker.createdBy === uid;
            return <div className="campaign-world-marker-row" key={marker.id}>
              <button type="button" className="pip-btn" onClick={()=>{setSelected({x:marker.x,y:marker.y});setSelectedMarkerId(marker.id);setMarkerName(marker.label);}}>
                <strong>{marker.kind === 'gm' ? '★' : '●'} {marker.label}</strong>
                <small>{marker.kind === 'gm' ? markerCopy.gm : markerCopy.player} · {marker.x}:{marker.y}</small>
              </button>
              {canDelete && <button type="button" className="pip-btn" disabled={disabled} onClick={()=>run({type:'worldMarkerDelete',markerId:marker.id})}>{markerCopy.delete}</button>}
            </div>;
          })}
        </div>
      </section>
      {gm && <form className="campaign-world-found" onSubmit={async e=>{e.preventDefault();const result=await run({type:'found',name:name.trim(),regionId:region.id,worldX:point.x,worldY:point.y});if(result){const created=result.settlements.find(s=>s.regionId===region.id&&s.worldX===point.x&&s.worldY===point.y);setActiveId(created?.id);setName('');}}}><label>{c.name}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><button className="pip-btn is-primary" disabled={disabled||!validPoint||!name.trim()||settlements.length>=5||settlements.some(s=>s.regionId===region.id&&s.worldX===point.x&&s.worldY===point.y)}>{c.found}</button></form>}
      <h3>{c.members}</h3>{members.map(([id,m],index)=>{const p=campaign.worldMap?.positions?.[id]||region.start;return <button className="pip-btn" key={id} onClick={()=>setSelected({x:p.x,y:p.y})}>{index+1}. {m.name} · {p.x}:{p.y}</button>;})}
    </aside></div>
    <div className="campaign-world-settlements"><h3>{c.settlements} · {settlements.length}/5</h3>{!settlements.length && <p>{c.empty}</p>}{settlements.map(s=><button className="pip-btn" key={s.id} onClick={()=>setActiveId(s.id)}><strong>⌂ {s.name}</strong><span>{getRegionName(getMapRegion(s.regionId),language)} · {s.worldX}:{s.worldY}</span><span>{c.open} →</span></button>)}</div>
    {characterPanel}
    {active && createPortal(<SettlementScreen key={active.id} settlement={active} onBack={()=>setActiveId(null)} sharedControls={settlementControls} canEdit={Boolean(editable)&&!localDisabled} payment={{ready:personalReady,canAfford:canAffordPersonal}} onCommand={settlementCommand}/>,document.body)}
  </section>;
}
