/** Wire format for the first local-first increment. Financial commands deliberately
 * stay outside this protocol until inventory reservations are shared by all screens. */
export const OFFLINE_PROTOCOL = 1;
export const SYNC_INTERVAL = 24 * 60 * 60 * 1000;
export const MAX_BATCH = 32;
export const MAX_PENDING = 400;
export const MAX_BATCH_BYTES = 48000;
export const LOCAL_ACTIONS = Object.freeze(['action', 'worker', 'workplace', 'move', 'priority', 'build']);
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_:-]{1,160}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(value);
export const fail = code => { throw new Error(code); };
export function canonical(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
export function localCommand(input) {
  if (!input || input.type !== 'settlement' || !id(input.settlementId)) fail('ONLINE_ACTION_REQUIRED');
  const c = input.command;
  if (!c || !LOCAL_ACTIONS.includes(c.type)) fail('ONLINE_ACTION_REQUIRED');
  const required = c.type === 'move' ? ['buildingId'] : c.type === 'priority' ? ['key'] : c.type === 'build' ? ['buildingType'] : ['workerId'];
  if (required.some(key => !id(c[key]))) fail('INVALID_COMMAND');
  let command;
  if (c.type === 'build') {
    if (c.paymentSource !== 'personal' || ![c.x, c.y].every(v => Number.isInteger(v) && v >= 0 && v < 24)) fail('ONLINE_ACTION_REQUIRED');
    command = { type: c.type, buildingType: c.buildingType, x: c.x, y: c.y, paymentSource: 'personal' };
  } else if (c.type === 'move') {
    if (![c.x, c.y].every(v => Number.isInteger(v) && v >= 0 && v < 24)) fail('PLACEMENT');
    command = { type: c.type, buildingId: c.buildingId, x: c.x, y: c.y };
  } else if (c.type === 'priority') {
    if (![-1, 1].includes(c.direction)) fail('INVALID_COMMAND');
    command = { type: c.type, key: c.key, direction: c.direction };
  } else {
    const key = c.type === 'action' ? 'action' : c.type === 'worker' ? 'key' : 'buildingId';
    const value = c[key] || null;
    if (value !== null && !id(value)) fail('INVALID_COMMAND');
    command = { type: c.type, workerId: c.workerId, [key]: value };
  }
  return { type: 'settlement', settlementId: input.settlementId, command };
}
export function isLocalCommand(input) {
  try { localCommand(input); return true; } catch { return false; }
}
const buildingToken = b => b ? {
  id: b.id, type: b.type, state: b.state, x: b.x, y: b.y, locked: Boolean(b.locked),
  rooms: (b.rooms || []).map(r => ({ id: r.id, type: r.type, state: r.state })),
  upgrade: b.upgrade ? { state: b.upgrade.state, targetType: b.upgrade.targetType } : null,
} : null;
/** Compare the specific affected entity, not the whole campaign revision. Changes
 * to a different resident may merge; competing orders for one resident may not. */
export function commandPrecondition(campaign, input, uid = null) {
  const clean = localCommand(input), c = clean.command;
  const s = campaign?.settlements?.find(s => s.id === clean.settlementId);
  if (!s) fail('NOT_FOUND');
  if (c.type === 'build') {
    const character = campaign?.character || campaign?.accounts?.[uid] || null;
    const resources = character ? {
      caps: Number(character.caps || 0),
      inventoryItems: (character.inventoryItems || []).filter(item => item?.sourceType === 'crafting_material').map(item => ({
        materialTier: item.materialTier || null,
        quantity: String(item.quantity ?? item.qty ?? 0),
      })),
    } : null;
    return canonical({
      buildings: (s.buildings || []).map(b => ({ id: b.id, type: b.type, state: b.state, x: b.x, y: b.y })),
      resources,
    });
  }
  if (c.type === 'move') return canonical(buildingToken(s.buildings?.find(b => b.id === c.buildingId)));
  if (c.type === 'priority') return canonical((s.buildings || []).map(b => ({
    id: b.id, state: b.state, priority: b.queuePriority ?? null,
    upgrade: b.upgrade ? { state: b.upgrade.state, priority: b.upgrade.queuePriority ?? null } : null,
    rooms: (b.rooms || []).map(r => ({ id: r.id, state: r.state, priority: r.queuePriority ?? null })),
  })));
  const w = s.settlers?.find(w => w.id === c.workerId);
  if (!w) fail('NOT_FOUND');
  const targetId = c.type === 'workplace' ? c.buildingId : c.type === 'worker' ? c.key?.split(':')[1] : null;
  return canonical({ worker: { id: w.id, action: w.settlementAction || null, building: w.assignedBuildingId || null },
    target: targetId ? buildingToken(s.buildings?.find(b => b.id === targetId)) : null });
}
export function validateBatch(body) {
  if (!body || body.protocol !== OFFLINE_PROTOCOL || body.type !== 'syncSettlement' ||
      !/^campaign_[a-f0-9]{24}$/.test(body.campaignId || '') || !uuid(body.deviceId) || !uuid(body.requestId) ||
      !Array.isArray(body.entries) || !body.entries.length || body.entries.length > MAX_BATCH ||
      new TextEncoder().encode(JSON.stringify(body)).length > 60000) fail('INVALID_SYNC_BATCH');
  let sequence = body.entries[0].sequence;
  const ids = new Set();
  for (const op of body.entries) {
    if (!Number.isSafeInteger(sequence) || sequence < 1 || op.sequence !== sequence++ || !uuid(op.requestId) ||
        ids.has(op.requestId) || typeof op.precondition !== 'string' || op.precondition.length > 20000) fail('INVALID_SYNC_BATCH');
    ids.add(op.requestId);
    // Reject extra command fields rather than silently changing the signed replay.
    if (canonical(op.command) !== canonical(localCommand(op.command))) fail('INVALID_SYNC_BATCH');
  }
  return body;
}
export function newRecord(uid, campaignId, deviceId) {
  return { schema: 1, uid, campaignId, deviceId, nextSequence: 1, snapshot: null,
    receivedAt: 0, lastSyncAt: 0, nextAttemptAt: 0, failures: 0, blocked: false,
    entries: [], inflight: null, immediate: null, history: [], lease: null };
}
export function mergeSnapshot(record, snapshot, now) {
  if (!snapshot || snapshot.id !== record.campaignId || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 ||
      !snapshot.members?.[record.uid] || snapshot.members[record.uid].revoked || !Array.isArray(snapshot.settlements)) fail('INVALID_SNAPSHOT');
  if (record.blocked && snapshot.revision <= (record.blockedRevision || 0)) fail('STALE_SNAPSHOT');
  if (!record.snapshot || snapshot.revision >= record.snapshot.revision) {
    record.snapshot = structuredClone(snapshot); record.receivedAt = now; record.blocked = false;
  }
  return record;
}
export function projectRecord(record, apply) {
  let campaign = record?.blocked ? null : structuredClone(record?.snapshot || null);
  const conflicts = [];
  if (!campaign) return { campaign, conflicts };
  for (const op of record.entries) {
    try {
      if (commandPrecondition(campaign, op.command, record.uid) !== op.precondition) fail('LOCAL_CONFLICT');
      campaign = apply(campaign, record.uid, op.command);
    } catch (error) { conflicts.push({ requestId: op.requestId, error: error.message }); }
  }
  return { campaign, conflicts };
}
export function enqueue(record, input, requestId, now, apply) {
  if (!record.snapshot || record.blocked) fail('NO_OFFLINE_SNAPSHOT');
  if (record.immediate) fail('PENDING_CONFIRMATION');
  if (record.entries.length >= MAX_PENDING) fail('OUTBOX_FULL');
  const command = localCommand(input);
  const { campaign, conflicts } = projectRecord(record, apply);
  if (conflicts.length) fail('SYNC_REQUIRED');
  const precondition = commandPrecondition(campaign, command, record.uid);
  apply(campaign, record.uid, command); // Validate before the transaction can commit.
  if (!Number.isSafeInteger(record.nextSequence) || record.nextSequence >= Number.MAX_SAFE_INTEGER) fail('OUTBOX_FULL');
  const op = { sequence: record.nextSequence, requestId, command, precondition, createdAt: now };
  if (precondition.length > 20000 || new TextEncoder().encode(JSON.stringify(op)).length > MAX_BATCH_BYTES - 512) fail('OUTBOX_ENTRY_TOO_LARGE');
  record.nextSequence++; record.entries.push(op);
  return record;
}
export function prepareBatch(record, requestId) {
  if (record.inflight) return record;
  if (record.immediate) fail('PENDING_CONFIRMATION');
  const body = { protocol: OFFLINE_PROTOCOL, type: 'syncSettlement', campaignId: record.campaignId,
    deviceId: record.deviceId, requestId, entries: [] };
  for (const op of record.entries.slice(0, MAX_BATCH)) {
    body.entries.push(structuredClone(op));
    if (new TextEncoder().encode(JSON.stringify(body)).length > MAX_BATCH_BYTES) { body.entries.pop(); break; }
  }
  if (!body.entries.length) fail('OUTBOX_ENTRY_TOO_LARGE');
  validateBatch(body); record.inflight = body;
  return record;
}
export function acknowledge(record, response, now) {
  const batch = record.inflight;
  if (!batch || response?.requestId !== batch.requestId || response.deviceId !== record.deviceId ||
      response.protocol !== OFFLINE_PROTOCOL || response.through !== batch.entries.at(-1).sequence ||
      !Array.isArray(response.results) || response.results.length !== batch.entries.length) fail('INVALID_SYNC_ACK');
  response.results.forEach((r, i) => {
    const op = batch.entries[i];
    if (r.requestId !== op.requestId || r.sequence !== op.sequence || !['accepted', 'rejected'].includes(r.state)) fail('INVALID_SYNC_ACK');
  });
  mergeSnapshot(record, response.campaign, now);
  const acknowledged = new Set(batch.entries.map(op => op.requestId));
  record.entries = record.entries.filter(op => !acknowledged.has(op.requestId));
  record.history = [...response.results.map(r => ({ ...r, acknowledgedAt: now })), ...record.history].slice(0, 100);
  record.inflight = null; record.failures = 0; record.nextAttemptAt = 0;
  record.lastSyncAt = now;
  return record;
}
export function retryAt(record, now, retryAfter = 0) {
  record.failures = Math.min(12, (record.failures || 0) + 1);
  const delay = Math.min(3600000, 30000 * 2 ** (record.failures - 1));
  record.nextAttemptAt = now + Math.max(delay, Math.min(86400, Math.max(0, Number(retryAfter) || 0)) * 1000);
  return record;
}
export function syncDue(record, now) {
  if (!record || record.blocked || now < record.nextAttemptAt) return false;
  if (record.immediate || record.inflight || record.failures || record.needsDrain) return true;
  return !record.snapshot || !record.lastSyncAt || now - record.lastSyncAt >= SYNC_INTERVAL;
}
