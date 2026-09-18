import { useCallback, useEffect, useRef, useState } from 'react';
import { campaignRequest } from '../cloud/persistentCampaigns.js';
import { getCloudAuthSession } from '../cloud/googleAuth.js';

const pendingKey = (id, uid) => `pip2d20:world-pending:${id}:${uid}`;
function readPending(id, uid) {
  try { return JSON.parse(sessionStorage.getItem(pendingKey(id, uid)) || 'null'); } catch { return null; }
}
function writePending(id, uid, command) {
  try { if (command) sessionStorage.setItem(pendingKey(id, uid), JSON.stringify(command)); else sessionStorage.removeItem(pendingKey(id, uid)); } catch { /* Storage may be disabled. In-memory retries remain available. */ }
}

export default function useCampaignWorld(campaignId) {
  const [uid, setUid] = useState(() => getCloudAuthSession()?.firebase?.localId || '');
  const [campaign, setCampaign] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(null);
  const [connected, setConnected] = useState(false);
  const generation = useRef(0), lock = useRef(false), pending = useRef(null);

  useEffect(() => {
    const change = () => setUid(getCloudAuthSession()?.firebase?.localId || '');
    window.addEventListener('pip2d20:cloud-auth-changed', change);
    return () => window.removeEventListener('pip2d20:cloud-auth-changed', change);
  }, []);
  const accept = useCallback(next => {
    setCampaign(old => !old || old.id !== next.id || next.revision >= old.revision ? next : old);
    setConnected(true);
  }, []);

  useEffect(() => {
    const gen = ++generation.current;
    lock.current = false; pending.current = null;
    setCampaign(null); setError(''); setRetry(null); setConnected(false); setBusy(false);
    if (!campaignId || !uid) return;
    pending.current = readPending(campaignId, uid);
    setRetry(pending.current);
    let reading = false;
    const read = async () => {
      if (reading || lock.current || document.hidden) return;
      reading = true;
      try {
        const data = await campaignRequest({ type: 'tick', campaignId });
        if (gen === generation.current) { accept(data.campaign); if (!pending.current) setError(''); }
      } catch (e) {
        if (gen === generation.current) { setConnected(false); setError(e.message); if (e.message === 'FORBIDDEN' || e.message === 'SIGN_IN_REQUIRED') setCampaign(null); }
      } finally { reading = false; }
    };
    void read();
    const timer = setInterval(read, 5000);
    window.addEventListener('online', read);
    document.addEventListener('visibilitychange', read);
    const offline = () => setConnected(false);
    window.addEventListener('offline', offline);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener('online', read); window.removeEventListener('offline', offline); document.removeEventListener('visibilitychange', read); };
  }, [campaignId, uid, accept]);

  const run = useCallback(async input => {
    if (lock.current || !campaignId || !uid || (pending.current && input !== pending.current)) return null;
    const command = { requestId: crypto.randomUUID(), ...input, campaignId };
    const gen = generation.current;
    lock.current = true; setBusy(true); setError('');
    writePending(campaignId, uid, command);
    try {
      const data = await campaignRequest(command);
      writePending(campaignId, uid, null);
      if (gen !== generation.current) return null;
      accept(data.campaign); pending.current = null; setRetry(null);
      return data.campaign;
    } catch (e) {
      if (gen === generation.current) {
        setError(e.message);
        if (!e.status || e.status >= 500) { pending.current = command; setRetry(command); setConnected(false); }
        else { pending.current = null; setRetry(null); writePending(campaignId, uid, null); }
      }
      return null;
    } finally { if (gen === generation.current) { lock.current = false; setBusy(false); } }
  }, [campaignId, uid, accept]);
  return { campaign, uid, busy, error, connected, retry, run, retryLast: () => run(pending.current) };
}
