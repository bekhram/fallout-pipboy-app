import { newRecord, mergeSnapshot } from '../../src/cloud/settlementOfflineProtocol.js';
export const uid = 'player_1';
export const campaignId = 'campaign_0123456789abcdef01234567';
export function campaign() {
  return { id: campaignId, name: 'Offline fixture', ownerUid: uid, revision: 1,
    members: { [uid]: { name: 'Player', role: 'gm' }, player_2: { name: 'Player 2' } }, memberIds: [uid, 'player_2'],
    character: { name: 'Fixture', caps: '100' }, settlements: [{ id: 'settlement_1', campaignId,
      access: { ownerId: uid, spenders: ['player_2'] }, constructionUpdatedAt: 1000,
      resources: { caps: 100, materials: 100 }, buildings: [{ id: 'building_1', type: 'small_house', x: 0, y: 0, state: 'active' }],
      settlers: [{ id: 'worker_1', settlementAction: null }, { id: 'worker_2', settlementAction: null }],
    }] };
}
/** Protocol/controller tests use this tiny adapter; separate integration tests
 * import the real settlement engine. This fixture is not a gameplay substitute. */
export function apply(c, user, input) {
  if (!c.members?.[user] || c.members[user].revoked) throw new Error('FORBIDDEN');
  const next = structuredClone(c), s = next.settlements.find(s => s.id === input.settlementId);
  if (!s) throw new Error('NOT_FOUND');
  if (c.ownerUid !== user && !s.access.spenders.includes(user)) throw new Error('FORBIDDEN');
  const cmd = input.command;
  if (cmd.type === 'action') {
    const worker = s.settlers.find(w => w.id === cmd.workerId);
    if (!worker) throw new Error('NOT_FOUND');
    worker.settlementAction = cmd.action ? { type: cmd.action } : null;
    worker.assignedBuildingId = null;
  } else if (cmd.type === 'move') {
    const b = s.buildings.find(b => b.id === cmd.buildingId);
    if (!b) throw new Error('NOT_FOUND');
    b.x = cmd.x; b.y = cmd.y;
  } else throw new Error('INVALID_COMMAND');
  return next;
}
export const action = (workerId = 'worker_1', job = 'guard') => ({ type: 'settlement', settlementId: 'settlement_1', command: { type: 'action', workerId, action: job } });
export function record(user = uid) {
  return mergeSnapshot(newRecord(user, campaignId, 'device_12345'), campaign(), 1000);
}
export function memoryStore(initial = record()) {
  let value = structuredClone(initial), tail = Promise.resolve();
  const store = {
    async get() { await tail; return structuredClone(value); },
    change(u, c, update) {
      const result = tail.then(() => {
        const next = update(structuredClone(value));
        value = structuredClone(next); return structuredClone(value);
      });
      tail = result.catch(() => {}); return result;
    },
    async claim(u, c, owner, now) {
      let acquired = false;
      const record = await store.change(u, c, r => {
        if (!r.lease || r.lease.until <= now || r.lease.owner === owner) { acquired = true; r.lease = { owner, until: now + 60000 }; }
        return r;
      });
      return { acquired, record };
    },
    release(u, c, owner) { return store.change(u, c, r => { if (r.lease?.owner === owner) r.lease = null; return r; }); },
    block(u, c) { return store.change(u, c, r => { r.blocked = true; r.snapshot = null; return r; }); },
  };
  return store;
}
export function fakeDatabase(initial = campaign()) {
  const docs = new Map([[`persistentCampaigns/${campaignId}`, structuredClone(initial)]]);
  const stats = { reads: 0, writes: 0, transactions: 0 };
  let tail = Promise.resolve();
  const db = { collection: name => ({ doc: id => `${name}/${id}` }) };
  const transaction = work => {
    const promise = tail.then(async () => {
      stats.transactions++;
      let writing = false;
      const pending = [];
      const result = await work({
        async get(ref) { if (writing) throw new Error('READ_AFTER_WRITE'); stats.reads++; return { data: () => structuredClone(docs.get(ref)) }; },
        set(ref, value) { writing = true; pending.push([ref, structuredClone(value)]); },
      });
      for (const [ref, value] of pending) { docs.set(ref, value); stats.writes++; }
      return structuredClone(result);
    });
    tail = promise.catch(() => {}); return promise;
  };
  return { db, transaction, docs, stats };
}
