import { canonical } from './settlementOfflineProtocol.js';
import { checkedResources, checkedPlayerResources, debitPersonalResources, creditPersonalResources, zeroResources } from '../utils/personalResources.js';
import { isPersonalAction } from '../utils/personalConstruction.js';

const fail = code => { throw new Error(code); };
export const localCharacterId = form => form?._localCharacterId;
export function newLocalCharacter(form) {
  if (!form?._localCharacterId) fail('LOCAL_CHARACTER_REQUIRED');
  return { id: form._localCharacterId, form: { ...structuredClone(form), _localRevision: 1 }, revision: 1,
    holds: {}, creditsApplied: zeroResources(), boundUid: null, boundCampaignId: null };
}
/** A single authoritative local form. Every sheet/crafting/trade update sees its
 * available inventory, already net of holds. Whole-form writes must match the
 * persisted revision; importing a different character uses a NEW local identity. */
export function updateLocalCharacter(record, update, expectedRevision = null) {
  const before = record.form;
  let next = typeof update === 'function' ? update(structuredClone(before)) : structuredClone(update);
  if (!next || typeof next !== 'object') fail('INVALID_CHARACTER');
  if (next._localCharacterId !== record.id) fail('LOCAL_CHARACTER_CHANGED');
  if (typeof update !== 'function' && next._localRevision !== before._localRevision) fail('STALE_CHARACTER_UPDATE');
  // A functional setter may still close over an inventory calculated from an old
  // render (crafting/repair). Spreading prev alone does not make that safe. Reject
  // financial changes if a reservation or another tab advanced its input version.
  const changesInventory = canonical(next.inventoryItems || []) !== canonical(before.inventoryItems || []) ||
    String(next.caps ?? '') !== String(before.caps ?? '');
  if (record.boundUid && changesInventory && expectedRevision !== null && expectedRevision !== before._localRevision) fail('STALE_CHARACTER_UPDATE');
  next._localRevision = before._localRevision;
  if (record.boundUid) checkedPlayerResources(next);
  if (canonical(next) === canonical(before)) return record;
  record.revision++;
  record.form = { ...next, _localRevision: record.revision };
  return record;
}
function pendingPayments(world) {
  const result = [];
  for (const op of world.entries || []) {
    if (isPersonalAction(op.command.command)) result.push({ requestId: op.requestId, amounts: op.command.command.quote, sourceId: op.command.command.sourceId });
  }
  const immediate = world.immediate?.command;
  if (world.sourceCharacterId && immediate?.type === 'settlement' && immediate.command?.type === 'deposit') {
    result.push({ requestId: immediate.requestId, amounts: immediate.command.amounts, sourceId: world.sourceCharacterId });
  }
  return result;
}
/** Called INSIDE the same IDB transaction as append / acknowledge. No resource
 * mutation can commit without its outbox operation, and a lost ACK keeps its hold.
 * A denied account keeps holds until an authoritative outcome is available. */
export function reconcilePersonalHolds(previousWorld, world, record) {
  const payments = pendingPayments(world);
  if (!record) {
    if (payments.length) fail('LOCAL_CHARACTER_REQUIRED');
    return record;
  }
  if (record.boundUid !== world.uid || record.boundCampaignId !== world.campaignId || record.id !== world.sourceCharacterId) fail('PERSONAL_SOURCE_MISMATCH');
  const before = canonical(record);
  const pendingIds = new Set(payments.map(p => p.requestId));
  for (const payment of payments) {
    if (payment.sourceId !== record.id) fail('PERSONAL_SOURCE_MISMATCH');
    const cost = checkedResources(payment.amounts);
    const existing = record.holds[payment.requestId];
    if (existing) {
      if (canonical(existing.amounts) !== canonical(cost)) fail('REQUEST_ID_REUSED');
      continue;
    }
    if ((record.settledIds || []).includes(payment.requestId)) fail('REQUEST_ID_REUSED');
    const paid = debitPersonalResources(record.form, cost);
    record.form = paid.character;
    record.holds[payment.requestId] = { amounts: cost, removed: paid.removed, campaignId: world.campaignId, uid: world.uid };
  }
  for (const [requestId, hold] of Object.entries(record.holds)) {
    if (hold.campaignId !== world.campaignId || pendingIds.has(requestId)) continue;
    const result = (world.history || []).find(r => r.requestId === requestId);
    if (!result || !['accepted', 'rejected'].includes(result.state)) fail('RESERVATION_ACK_REQUIRED');
    if (result.state === 'rejected') record.form = creditPersonalResources(record.form, hold.amounts, hold.removed);
    delete record.holds[requestId];
    record.settledIds = [...(record.settledIds || []), requestId].slice(-1000);
  }
  const source = world.snapshot?.character?.constructionSource;
  if (source && source.characterId === record.id && source.deviceId === world.deviceId) {
    const totals = checkedResources(source.credits || {}), delta = zeroResources();
    for (const key of Object.keys(delta)) {
      if (totals[key] < (record.creditsApplied[key] || 0)) fail('STALE_PAYMENT_LEDGER');
      delta[key] = totals[key] - (record.creditsApplied[key] || 0);
    }
    if (Object.values(delta).some(Boolean)) record.form = creditPersonalResources(record.form, delta);
    record.creditsApplied = totals;
  }
  if (before !== canonical(record)) { record.revision++; record.form._localRevision = record.revision; }
  return record;
}
export function totalHolds(record) {
  const totals = zeroResources();
  for (const h of Object.values(record?.holds || {})) for (const key of Object.keys(totals)) totals[key] += h.amounts[key] || 0;
  return totals;
}
