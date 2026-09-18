export function createCampaignTransport(getSession, fetcher = globalThis.fetch, now = Date.now) {
  let blockedUntil = 0;
  const reads = new Set(['list', 'worldRead', 'loadGmSession', 'tick']);
  const inflight = new Map(), cache = new Map();
  let epoch = 0;
  const quotaError = () => Object.assign(new Error('DATABASE_QUOTA_EXCEEDED'), {
    status: 503, retryAfter: Math.max(1, Math.ceil((blockedUntil - now()) / 1000)),
  });
  return async function campaignRequest(command, { expectedUid } = {}) {
    if (now() < blockedUntil) throw quotaError();
    const session = await getSession();
    if (!session?.firebase?.idToken) throw Object.assign(new Error('SIGN_IN_REQUIRED'), { status: 401 });
    if (expectedUid && session.firebase.localId !== expectedUid) throw Object.assign(new Error('AUTH_CHANGED'), { status: 401 });
    const identity = session.firebase.localId || session.firebase.idToken;
    const key = JSON.stringify([identity, command.type, command.campaignId || '']);
    const reusable = reads.has(command.type);
    if (!reusable) { epoch++; cache.clear(); inflight.clear(); }
    if (reusable && inflight.has(key)) return structuredClone(await inflight.get(key));
    const saved = cache.get(key);
    if (reusable && saved && now() < saved.until) return structuredClone(saved.data);
    const version = epoch;
    const perform = async () => {
      const body = { requestId: crypto.randomUUID(), ...command };
      const response = await fetcher(command.type === 'syncSettlement' ? '/api/settlement-sync' : '/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.firebase.idToken}` },
        body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
      });
      let data;
      try { data = await response.json(); } catch { throw new Error('SERVER_UNAVAILABLE'); }
      if (!response.ok) {
        if (data.error === 'DATABASE_QUOTA_EXCEEDED') {
          const seconds = Number(response.headers.get('Retry-After') || data.retryAfter);
          blockedUntil = now() + (Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) : 300) * 1000;
          throw quotaError();
        }
        const error = new Error(data.error || 'SERVER_ERROR'); error.status = response.status; throw error;
      }
      if (reusable && epoch === version) {
        if (cache.size >= 100) cache.clear();
        cache.set(key, { data: structuredClone(data), until: now() + (command.type === 'list' ? 30000 : 1000) });
      }
      return data;
    };
    const promise = perform();
    if (reusable) inflight.set(key, promise);
    try { return structuredClone(await promise); }
    finally {
      if (!reusable) { epoch++; cache.clear(); inflight.clear(); }
      if (inflight.get(key) === promise) inflight.delete(key);
    }
  };
}
