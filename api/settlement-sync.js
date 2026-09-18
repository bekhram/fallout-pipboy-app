import { isDeepStrictEqual } from 'node:util';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { campaignCommand, publicCampaign, requireMember } from '../server/campaignState.js';
import { createCampaignUsage } from '../server/campaignUsage.js';
import { campaignDiagnostic, isCampaignQuotaError } from '../server/campaignDiagnostics.js';
import { syncSettlementBatch } from '../server/settlementSync.js';
import { applyOfflineCommand } from '../src/utils/settlementOfflineApply.js';

function services() {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) throw new Error('SERVER_NOT_CONFIGURED');
    initializeApp({ credential: json ? cert(JSON.parse(json)) : applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID });
  }
  return { auth: getAuth(), db: getFirestore() };
}
function advance(current, uid, now) {
  const next = campaignCommand(current, uid, { type: 'tick' }, now);
  const comparable = settlements => settlements.map(s => {
    if (s.buildings?.some(b => b.state === 'construction' || b.upgrade?.state === 'construction' || b.rooms?.some(r => r.state === 'construction'))) return s;
    const { constructionUpdatedAt, ...state } = s;
    return state;
  });
  return isDeepStrictEqual(comparable(current.settlements), comparable(next.settlements)) ? current : next;
}
export function createSettlementSyncHandler(getServices = services) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    const usage = createCampaignUsage(); let outcome = 'completed';
    try {
      const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
      if (!token) return res.status(401).json({ error: 'SIGN_IN_REQUIRED' });
      const { auth, db } = getServices();
      let identity;
      try { identity = await auth.verifyIdToken(token, true); } catch { return res.status(401).json({ error: 'SIGN_IN_REQUIRED' }); }
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return res.status(400).json({ error: 'INVALID_SYNC_BATCH' }); }
      const result = await syncSettlementBatch({ db, uid: identity.uid, body, now: Date.now(),
        transaction: work => usage.transaction(db, work), authorize: requireMember, advance, visible: publicCampaign,
        apply(campaign, uid, input, requestId, now) {
          // The same validation powers the local preview; canonical gameplay still
          // runs in the existing server command handler at SERVER time only.
          applyOfflineCommand({ ...campaign, character: campaign.accounts[uid] || null }, uid, input, requestId);
          return campaignCommand(campaign, uid, { ...input, requestId }, now);
        },
      });
      return res.json(result);
    } catch (error) {
      outcome = 'error';
      if (isCampaignQuotaError(error)) {
        res.setHeader('Retry-After', '300');
        return res.status(503).json({ error: 'DATABASE_QUOTA_EXCEEDED', retryAfter: 300 });
      }
      const code = String(error?.message || 'SERVER_ERROR');
      const safe = ['FORBIDDEN', 'INVALID_SYNC_BATCH', 'ONLINE_ACTION_REQUIRED', 'INVALID_COMMAND', 'PLACEMENT', 'REQUEST_ID_REUSED', 'SYNC_SEQUENCE_CONFLICT'].includes(code);
      if (!safe) console.error('settlement_sync_failure', campaignDiagnostic(error, 'syncSettlement', 'database-or-command'));
      return res.status(code === 'FORBIDDEN' ? 403 : safe ? 400 : 500).json({ error: safe ? code : 'SERVER_ERROR' });
    } finally { console.info('settlement_sync_usage', usage.report('syncSettlement', outcome)); }
  };
}
export default createSettlementSyncHandler();
