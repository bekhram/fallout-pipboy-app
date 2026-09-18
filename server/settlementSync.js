import { createHash } from 'node:crypto';
import { canonical, commandPrecondition, validateBatch, fail, OFFLINE_PROTOCOL } from '../src/cloud/settlementOfflineProtocol.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const REJECTIONS = new Set(['COMMAND_CONFLICT', 'FORBIDDEN', 'NOT_FOUND', 'PLACEMENT', 'LOCKED', 'TASK_FINISHED', 'INVALID_ACTION', 'INVALID_COMMAND', 'REQUIREMENTS', 'WORKPLACE_FULL', 'WORKPLACE_UNAVAILABLE', 'unavailable', 'capacity', 'insufficient', 'invalid']);
/** Persisted stream cursor + one immutable last-batch receipt. A client has exactly
 * one in-flight batch. After a lost response it MUST resend that batch unchanged.
 * Earlier sequence numbers can never execute again, even under another batch ID.
 * All reads occur before writes; transaction retries have no external side effects. */
export async function syncSettlementBatch({ db, transaction, uid, body, now, authorize, advance, apply, visible }) {
  validateBatch(body);
  const streamKey = hash(`${uid}:${body.campaignId}:${body.deviceId}`), digest = hash(canonical(body));
  const campaignRef = db.collection('persistentCampaigns').doc(body.campaignId);
  const streamRef = db.collection('campaignSyncStreams').doc(streamKey);
  return transaction(async tx => {
    const current = (await tx.get(campaignRef)).data();
    authorize(current, uid);
    const previous = (await tx.get(streamRef)).data();
    const reply = (campaign, results, through, duplicate = false) => ({ protocol: OFFLINE_PROTOCOL,
      requestId: body.requestId, deviceId: body.deviceId, campaign: visible(campaign, uid), results, through, duplicate, serverNow: now });
    if (previous?.batchId === body.requestId) {
      if (previous.digest !== digest) fail('REQUEST_ID_REUSED');
      return reply(current, previous.results, previous.through, true);
    }
    if (body.entries[0].sequence !== (previous?.through || 0) + 1) fail('SYNC_SEQUENCE_CONFLICT');
    let next = advance(current, uid, now);
    const results = [];
    for (const op of body.entries) {
      try {
        if (commandPrecondition(next, op.command) !== op.precondition) fail('COMMAND_CONFLICT');
        next = apply(next, uid, op.command, op.requestId, now);
        results.push({ sequence: op.sequence, requestId: op.requestId, state: 'accepted' });
      } catch (error) {
        if (!REJECTIONS.has(error.message)) throw error; // abort unexpected errors, never turn bugs into receipts
        const conflict = ['WORKPLACE_FULL', 'WORKPLACE_UNAVAILABLE'].includes(error.message);
        results.push({ sequence: op.sequence, requestId: op.requestId, state: 'rejected',
          error: conflict ? 'COMMAND_CONFLICT' : error.message, ...(conflict ? { reason: error.message } : {}) });
      }
    }
    const through = body.entries.at(-1).sequence;
    if (next !== current) tx.set(campaignRef, next);
    tx.set(streamRef, { batchId: body.requestId, digest, through, results, updatedAt: now });
    return reply(next, results, through);
  });
}
