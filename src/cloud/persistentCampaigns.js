import { refreshFirebaseSession } from './googleAuth.js';
export async function campaignRequest(command) {
  const session = await refreshFirebaseSession();
  if (!session?.firebase?.idToken) throw new Error('SIGN_IN_REQUIRED');
  const body = { requestId: crypto.randomUUID(), ...command };
  const response = await fetch('/api/campaigns', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.firebase.idToken}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('SERVER_UNAVAILABLE'); }
  if (!response.ok) { const error = new Error(data.error || 'SERVER_ERROR'); error.status = response.status; throw error; }
  return data;
}
