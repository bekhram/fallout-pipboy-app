import React, { useCallback, useEffect, useRef, useState } from 'react';
import { campaignLocalStore, subscribeLocal } from '../../cloud/campaignLocalStore.js';
import { getCloudAuthSession, signInWithGoogle } from '../../cloud/googleAuth.js';
import { campaignRequest } from '../../cloud/persistentCampaigns.js';
import { SYNC_INTERVAL } from '../../cloud/settlementOfflineProtocol.js';
import CampaignWorldMap from './CampaignWorldMap.jsx';
import { offlineCopy, offlineError } from './offlineCopy.js';
import { worldCopy, worldError } from './worldCopy.js';
import './campaignOffline.css';

export default function CampaignOfflineHub({ language, form }) {
  const c = offlineCopy(language);
  const [authVersion, setAuthVersion] = useState(0);
  const [uid, setUid] = useState(() => getCloudAuthSession()?.firebase?.localId || '');
  const [list, setList] = useState(null), [active, setActive] = useState(null), [cached, setCached] = useState({});
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const epoch = useRef(0);
  const rows = list?.uid === uid ? list.campaigns : [];
  const loadCached = useCallback(async () => {
    if (!uid) return null;
    const gen = epoch.current, saved = await campaignLocalStore.list(uid);
    const present = {};
    for (const item of saved?.campaigns || []) {
      const world = await campaignLocalStore.get(uid, item.id);
      present[item.id] = Boolean(world?.snapshot && !world.blocked);
    }
    if (gen === epoch.current && getCloudAuthSession()?.firebase?.localId === uid) { setList(saved); setCached(present); }
    return saved;
  }, [uid]);
  const refresh = useCallback(async () => {
    if (!uid || navigator.onLine === false) { setError('OFFLINE'); return; }
    const gen = epoch.current; setBusy(true); setError('');
    try { await campaignRequest({ type: 'list' }, { expectedUid: uid }); await loadCached(); }
    catch (e) { if (gen === epoch.current) setError(e.message); }
    finally { if (gen === epoch.current) setBusy(false); }
  }, [uid, loadCached]);
  useEffect(() => {
    const change = () => { epoch.current++; setAuthVersion(v => v + 1); setUid(getCloudAuthSession()?.firebase?.localId || ''); setActive(null); setList(null); setCached({}); setError(''); setBusy(false); };
    window.addEventListener('pip2d20:cloud-auth-changed', change);
    return () => { epoch.current++; window.removeEventListener('pip2d20:cloud-auth-changed', change); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    void loadCached().then(saved => { if (!cancelled && uid && (!saved?.receivedAt || Date.now() - saved.receivedAt >= SYNC_INTERVAL)) void refresh(); })
      .catch(e => { if (!cancelled) setError(e.message); });
    const unsubscribe = subscribeLocal(event => { if (event.detail?.uid === uid) void loadCached().catch(e => { if (!cancelled) setError(e.message); }); });
    return () => { cancelled = true; unsubscribe(); };
  }, [uid, authVersion, loadCached, refresh]);
  if (active?.uid === uid) return <section className="campaign-offline-hub">
    <button type="button" className="pip-btn" onClick={() => setActive(null)}>← {c.back}</button>
    <CampaignWorldMap key={active.id} campaignId={active.id} form={form} />
  </section>;
  return <section className="campaign-offline-hub pip-panel" aria-label={c.title}>
    <header className="campaign-offline-status__line"><h2>{c.title}</h2>{uid && <button type="button" className="pip-btn" disabled={busy} onClick={refresh}>{c.refresh}</button>}</header>
    <p>{c.snapshot}</p>
    {error && <p role="alert">{offlineError(error, language, worldError(error, worldCopy(language)))}</p>}
    {!uid ? <><p>{c.auth}</p><button type="button" className="pip-btn" onClick={() => signInWithGoogle().catch(e => setError(e.message))}>{c.signIn}</button></> : <>
      {!rows.length && <p>{busy ? c.syncing : c.empty}</p>}
      <div className="campaign-offline-list">{rows.map(item => <button type="button" className="pip-btn campaign-offline-row" key={item.id}
        onClick={() => { setError(''); setActive({ uid, id: item.id }); }}>
        <strong>{item.name}</strong><small>{cached[item.id] ? c.stored : c.uncached}</small><span>{c.open} →</span>
      </button>)}</div>
      <p>{c.first}</p><details><summary>{c.offline}</summary><p>{c.scope}</p></details>
    </>}
  </section>;
}
