import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { campaignRequest } from '../cloud/persistentCampaigns.js';
import { getCloudAuthSession } from '../cloud/googleAuth.js';
import { campaignLocalStore, subscribeLocal } from '../cloud/campaignLocalStore.js';
import { createCampaignOfflineController } from '../cloud/campaignOfflineController.js';
import { projectRecord, SYNC_INTERVAL } from '../cloud/settlementOfflineProtocol.js';
import { applyOfflineCommand } from '../utils/settlementOfflineApply.js';

export default function useCampaignWorld(campaignId) {
  const [identity, setIdentity] = useState(() => ({ uid: getCloudAuthSession()?.firebase?.localId || '', epoch: 0 }));
  const { uid } = identity;
  const scope = `${uid}:${campaignId || ''}:${identity.epoch}`;
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const [record, setRecord] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  const ticket = useRef(0), mounted = useRef(false), running = useRef(false), storageFailure = useRef(false);
  const valid = record?.uid === uid && record?.campaignId === campaignId ? record : null;
  useEffect(() => {
    const change = () => { scopeRef.current = ''; setIdentity(old => ({ uid: getCloudAuthSession()?.firebase?.localId || '', epoch: old.epoch + 1 })); };
    window.addEventListener('pip2d20:cloud-auth-changed', change);
    return () => window.removeEventListener('pip2d20:cloud-auth-changed', change);
  }, []);
  const controller = useMemo(() => uid && campaignId ? createCampaignOfflineController({
    uid, campaignId, store: campaignLocalStore, request: campaignRequest, apply: applyOfflineCommand,
    current: () => mounted.current && scopeRef.current === scope && getCloudAuthSession()?.firebase?.localId === uid,
  }) : null, [uid, campaignId, scope]);
  const refresh = useCallback(async () => {
    if (!controller) return null;
    const readTicket = ++ticket.current;
    const next = await controller.get();
    if (mounted.current && scopeRef.current === scope && ticket.current === readTicket) setRecord(next);
    return next;
  }, [controller, scope]);
  const attempt = useCallback(async (manual = false) => {
    if (!controller || running.current || (!manual && (document.hidden || navigator.onLine === false || storageFailure.current))) return false;
    const runToken = Symbol(scope); running.current = runToken;
    if (mounted.current && scopeRef.current === scope) { setBusy(true); setError(''); }
    try {
      const result = await controller.sync({ manual });
      if (manual) storageFailure.current = false;
      return result;
    } catch (e) {
      if (mounted.current && scopeRef.current === scope) { setError(e.message); if (e.message.startsWith('LOCAL_')) storageFailure.current = true; }
      return false;
    } finally {
      if (running.current === runToken) running.current = false;
      if (mounted.current && scopeRef.current === scope) {
        try { await refresh(); } catch (e) { setError(e.message); storageFailure.current = true; }
        setBusy(false);
      }
    }
  }, [controller, refresh, scope]);
  useEffect(() => {
    mounted.current = true; scopeRef.current = scope; running.current = false; setRecord(null); setError(''); setBusy(false); storageFailure.current = false;
    let cancelled = false;
    const update = event => {
      if (!cancelled && (!event?.detail?.uid || event.detail.uid === uid) && (!event?.detail?.campaignId || event.detail.campaignId === campaignId)) {
        void refresh().catch(e => { if (!cancelled) { setError(e.message); storageFailure.current = true; } });
      }
    };
    const network = () => { if (!cancelled) { setOnline(navigator.onLine !== false); update(); void attempt(); } };
    const unsubscribe = subscribeLocal(update);
    window.addEventListener('online', network); window.addEventListener('offline', network);
    document.addEventListener('visibilitychange', network);
    const timer = setInterval(() => { void attempt(); }, 60000); // local eligibility check, not a DB poll
    if (controller) void (async () => {
      try {
        const key = `pip2d20:world-pending:${campaignId}:${uid}`;
        let raw = null, legacy = null;
        try { raw = sessionStorage.getItem(key); if (raw) legacy = JSON.parse(raw); } catch { /* leave unreadable old data untouched */ }
        await controller.initialize(legacy);
        if (legacy && raw) { try { if (sessionStorage.getItem(key) === raw) sessionStorage.removeItem(key); } catch { /* durable copy already exists */ } }
        if (identity.epoch > 0) await campaignLocalStore.change(uid, campaignId, r => { r.authRequired = false; return r; });
        if (!cancelled) { await refresh(); await attempt(); }
      } catch (e) { if (!cancelled) { setError(e.message); storageFailure.current = true; } }
    })();
    return () => { cancelled = true; mounted.current = false; ticket.current++; unsubscribe(); clearInterval(timer);
      window.removeEventListener('online', network); window.removeEventListener('offline', network); document.removeEventListener('visibilitychange', network); };
  }, [controller, scope, uid, campaignId, identity.epoch, refresh, attempt]);
  const projected = useMemo(() => {
    try {
      const view = projectRecord(valid, applyOfflineCommand);
      if (view.campaign && valid?.entries.length) {
        const dirty = new Set(valid.entries.map(op => op.command.settlementId));
        view.campaign.settlements = view.campaign.settlements.map(s => dirty.has(s.id) ? { ...s, offlineDraft: true } : s);
      }
      return view;
    } catch { return { campaign: valid?.snapshot || null, conflicts: [{ error: 'LOCAL_CONFLICT' }] }; }
  }, [valid]);
  const run = useCallback(async input => {
    if (!controller || running.current || storageFailure.current) return null;
    const runToken = Symbol(scope); running.current = runToken; setBusy(true); setError('');
    try { return await controller.run(input); }
    catch (e) { if (mounted.current && scopeRef.current === scope) { setError(e.message); if (e.message.startsWith('LOCAL_') && e.message !== 'LOCAL_BUSY') storageFailure.current = true; } return null; }
    finally { if (running.current === runToken) running.current = false; if (mounted.current && scopeRef.current === scope) {
      try { await refresh(); } catch (e) { setError(e.message); storageFailure.current = true; } setBusy(false);
    } }
  }, [controller, refresh, scope]);
  const linkPersonalSource = useCallback(async sourceId => {
    if (!controller || running.current) return false;
    const token=Symbol(scope);running.current=token;setBusy(true);setError('');
    try { await controller.linkSource(sourceId);return true; }
    catch(e){if(mounted.current&&scopeRef.current===scope)setError(e.message);return false;}
    finally{if(running.current===token)running.current=false;if(mounted.current&&scopeRef.current===scope){try{await refresh();}catch(e){setError(e.message);}setBusy(false);}}
  },[controller,refresh,scope]);
  const exportSave = useCallback(async () => {
    try {
      const json = await campaignLocalStore.export(uid, campaignId);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `pip2d20-${campaignId}-offline.json`;
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); }
  }, [uid, campaignId]);
  const canQueue = Boolean(valid?.snapshot && !valid.blocked && !valid.authRequired && !valid.immediate && !valid.halted && !storageFailure.current);
  return { campaign: projected.campaign, uid, busy, error: error || valid?.lastError || (valid?.blocked ? 'FORBIDDEN' : ''), run, connected: online && !valid?.failures && !valid?.authRequired,
    retry: valid?.immediate?.command || null, retryLast: () => attempt(true), syncNow: () => attempt(true),
    linkPersonalSource,sourceCharacterId:valid?.sourceCharacterId,sourceAvailable:valid?.sourceAvailable,sourceReserved:valid?.sourceReserved,
    personalReady:Boolean(canQueue && valid?.snapshot?.character?.constructionSource?.characterId===valid?.sourceCharacterId && valid?.snapshot?.character?.constructionSource?.deviceId===valid?.deviceId),
    localReady: canQueue, pendingCount: (valid?.entries.length || 0) + (valid?.immediate ? 1 : 0),
    lastSyncAt: valid?.lastSyncAt || 0, nextSyncAt: valid?.nextAttemptAt || (valid?.lastSyncAt ? valid.lastSyncAt + SYNC_INTERVAL : 0),
    conflicts: projected.conflicts, history: valid?.history || [], blocked: Boolean(valid?.blocked), exportSave,
  };
}
