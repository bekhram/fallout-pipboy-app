import { isDeepStrictEqual } from 'node:util';
import { createCampaignUsage } from '../server/campaignUsage.js';
import { campaignDiagnostic, isCampaignQuotaError } from '../server/campaignDiagnostics.js';
import { createHash, randomBytes } from 'node:crypto';
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { campaignCommand, newCampaign, publicCampaign, requireMember } from '../server/campaignState.js';

function services() {
  if (!getApps().length) {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) throw new Error('SERVER_NOT_CONFIGURED');
    initializeApp({ credential: json ? cert(JSON.parse(json)) : applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID });
  }
  return { auth: getAuth(), db: getFirestore() };
}
const hash = value => createHash('sha256').update(value).digest('hex');
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
export function createCampaignHandler(getServices = services) {
return async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  let operation = 'unknown', stage = 'authentication', outcome = 'completed';
  const usage = createCampaignUsage();
  try {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) return res.status(401).json({ error: 'SIGN_IN_REQUIRED' });
    stage = 'services';
    const { db, auth } = getServices();
    stage = 'authentication';
    let identity;
    try { identity = await auth.verifyIdToken(token, true); } catch { return res.status(401).json({ error: 'SIGN_IN_REQUIRED' }); }
    const uid = identity.uid;
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body) throw new Error('INVALID_REQUEST');
    operation = body.type; stage = 'database-or-command';
    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > (body.type === 'saveGmSession' ? 850000 : 60000)) throw new Error('PAYLOAD_TOO_LARGE');
    const campaigns = db.collection('persistentCampaigns');
    if (['loadGmSession', 'saveGmSession'].includes(body.type)) {
      if (!validId(body.campaignId)) throw new Error('INVALID_REQUEST');
      const result = await usage.transaction(db, async tx => {
        const doc = await tx.get(campaigns.doc(body.campaignId));
        const c = doc.data(); requireMember(c, uid);
        if (c.ownerUid !== uid) throw new Error('FORBIDDEN');
        const ref = db.collection('campaignGmSaves').doc(c.id);
        const saved = (await tx.get(ref)).data();
        if (body.type === 'loadGmSession') return { snapshot: saved ? JSON.parse(saved.json) : null };
        if (!body.snapshot?.state || body.snapshot.state.campaignId !== c.id || !Number.isSafeInteger(body.snapshot.state.revision) || body.snapshot.state.revision < 0) throw new Error('INVALID_REQUEST');
        if (saved && body.snapshot.state.revision < saved.revision) throw new Error('STALE_SESSION');
        tx.set(ref, { json: JSON.stringify(body.snapshot), revision: body.snapshot.state.revision, updatedAt: Date.now() });
        return { saved: true };
      });
      return res.json(result);
    }
    if (body.type === 'list') {
      usage.counts.queryAttempts++;
      const docs = await campaigns.where('memberIds', 'array-contains', uid).limit(100).get();
      usage.counts.queryDocumentsReturned += docs.docs.length;
      return res.json({ campaigns: docs.docs.map(d => ({ id: d.id, name: d.data().name, ownerUid: d.data().ownerUid })) });
    }
    if (body.type === 'worldRead') {
      if (!validId(body.campaignId)) throw new Error('INVALID_REQUEST');
      usage.counts.documentReadAttempts++;
      const doc = await campaigns.doc(body.campaignId).get();
      return res.json({ campaign: publicCampaign(doc.data(), uid) });
    }
    if (body.type === 'tick') {
      if (!validId(body.campaignId)) throw new Error('INVALID_REQUEST');
      const campaign = await usage.transaction(db, async tx => {
        const ref = campaigns.doc(body.campaignId);
        const doc = await tx.get(ref); const current = doc.data(); requireMember(current, uid);
        if (Date.now() - current.updatedAt < 60000) { usage.counts.skippedTickWrites++; return publicCampaign(current, uid); }
        const next = campaignCommand(current, uid, { type: 'tick' }, Date.now());
        // An idle construction clock alone must not turn a read into a write.
        const comparable = settlements => settlements.map(s => {
          if (s.buildings?.some(b => b.state === 'construction')) return s;
          const { constructionUpdatedAt, ...state } = s;
          return state;
        });
        if (isDeepStrictEqual(comparable(current.settlements), comparable(next.settlements))) {
          usage.counts.skippedTickWrites++;
          return publicCampaign(current, uid);
        }
        tx.set(ref, next); return publicCampaign(next, uid);
      });
      return res.json({ campaign });
    }
    if (!validId(body.requestId)) throw new Error('INVALID_REQUEST');
    const receipt = db.collection('campaignReceipts').doc(hash(`${uid}:${body.requestId}`));
    const digest = hash(JSON.stringify(body));
    const result = await usage.transaction(db, async tx => {
      const prior = await tx.get(receipt);
      if (prior.exists) {
        if (prior.data().digest !== digest) throw new Error('REQUEST_ID_REUSED');
        if (prior.data().deleted) return { deleted: true, campaignId: prior.data().campaignId, duplicate: true };
        const saved = await tx.get(campaigns.doc(prior.data().campaignId));
        return { campaign: publicCampaign(saved.data(), uid), duplicate: true };
      }
      const now = Date.now();
      let ref, c, invite;
      if (body.type === 'create') {
        ref = campaigns.doc(`campaign_${hash(`${uid}:${body.requestId}`).slice(0, 24)}`);
        c = newCampaign(ref.id, uid, body.name, now);
      } else if (body.type === 'join') {
        if (!/^[a-f0-9]{48}$/.test(body.invite || '')) throw new Error('INVITE_INVALID');
        const inviteRef = db.collection('campaignInvites').doc(hash(body.invite));
        const inviteDoc = await tx.get(inviteRef);
        if (!inviteDoc.exists || inviteDoc.data().expiresAt < now) throw new Error('INVITE_INVALID');
        ref = campaigns.doc(inviteDoc.data().campaignId);
        const doc = await tx.get(ref); c = doc.data();
        if (!c || c.inviteHash !== hash(body.invite) || c.members[uid]?.revoked || c.memberIds.length >= 20) throw new Error('INVITE_INVALID');
        c.members[uid] ||= { name: String(identity.name || 'Player').slice(0,80), role: 'player', joinedAt: now };
        c.memberIds = [...new Set([...c.memberIds, uid])];
        c.inviteHash = null; // one-time invitation
        tx.delete(inviteRef);
      } else {
        if (!validId(body.campaignId)) throw new Error('INVALID_REQUEST');
        ref = campaigns.doc(body.campaignId);
        const doc = await tx.get(ref); c = doc.data(); requireMember(c, uid);
        if (body.type === 'delete') {
          if (c.ownerUid !== uid) throw new Error('FORBIDDEN');
          tx.delete(ref);
          tx.delete(db.collection('campaignGmSaves').doc(c.id));
          if (c.inviteHash) tx.delete(db.collection('campaignInvites').doc(c.inviteHash));
          tx.set(receipt, { digest, campaignId: c.id, deleted: true, createdAt: now });
          return { deleted: true, campaignId: c.id };
        } else if (body.type === 'invite') {
          if (c.ownerUid !== uid) throw new Error('FORBIDDEN');
          invite = randomBytes(24).toString('hex');
          c.inviteHash = hash(invite);
          tx.set(db.collection('campaignInvites').doc(c.inviteHash), { campaignId: c.id, expiresAt: now + 7 * 86400000 });
        } else if (body.type === 'revokeInvite') {
          if (c.ownerUid !== uid) throw new Error('FORBIDDEN');
          c.inviteHash = null;
        } else {
          c = campaignCommand(c, uid, body, now);
        }
      }
      if (['join','invite','revokeInvite'].includes(body.type)) { c.revision += 1; c.updatedAt = now; }
      tx.set(ref, c);
      tx.set(receipt, { digest, campaignId: c.id, createdAt: now });
      return { campaign: publicCampaign(c, uid), ...(invite ? { invite } : {}) };
    });
    return res.json(result);
  } catch (error) {
    outcome = 'error';
    const code = String(error?.message || 'SERVER_ERROR');
    const safe = /^[A-Z_]+$/.test(code) || ['invalid','insufficient','capacity','unavailable'].includes(code);
    const quota = isCampaignQuotaError(error);
    if (quota || !safe || code === 'SERVER_NOT_CONFIGURED') {
      const diagnostic = campaignDiagnostic(error, operation, stage);
      console.error('campaign_api_failure', diagnostic);
      res.setHeader('X-Campaign-Trace', diagnostic.traceId);
    }
    if (quota) {
      res.setHeader('Retry-After', '300');
      return res.status(503).json({ error: 'DATABASE_QUOTA_EXCEEDED', retryAfter: 300 });
    }
    return res.status(code === 'FORBIDDEN' ? 403 : code === 'SERVER_NOT_CONFIGURED' ? 503 : safe ? 400 : 500).json({ error: safe ? code : 'SERVER_ERROR' });
  } finally {
    // Only allowlisted operation names and numeric counters; no IDs or payloads.
    if (stage === 'database-or-command') console.info('campaign_api_usage', usage.report(campaignDiagnostic(null, operation, stage).operation, outcome));
  }
}
}
export default createCampaignHandler();
