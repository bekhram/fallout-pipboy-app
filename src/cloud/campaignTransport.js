export function createCampaignTransport(getSession, fetcher = globalThis.fetch, now = Date.now) {
  let blockedUntil = 0;
  const quotaError = () => Object.assign(new Error('DATABASE_QUOTA_EXCEEDED'), { status: 503, retryAfter: Math.max(1, Math.ceil((blockedUntil - now()) / 1000)) });
  return async function campaignRequest(command) {
    if (now() < blockedUntil) throw quotaError();
  const session = await getSession();
  if (!session?.firebase?.idToken) throw new Error('SIGN_IN_REQUIRED');
  const body = { requestId: crypto.randomUUID(), ...command };
  const response = await fetcher('/api/campaigns', {
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
  return data;
}
}
