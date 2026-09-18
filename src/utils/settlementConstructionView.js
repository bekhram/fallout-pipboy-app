import { tasks, progress, workerCounts, advanceConstruction } from './settlementDevelopment.js';

/** Read-only projection of the existing clock; never pass this result to onUpdate.
 * A projected completion remains 'confirming' until it arrives in saved state.
 * ETA assumes the current crew, not workers that may join later from the queue.
 */
export function settlementConstructionView(settlement, now = Date.now()) {
  const queue = tasks(settlement);
  const anchor = settlement.constructionUpdatedAt == null ? NaN : Number(settlement.constructionUpdatedAt);
  const time = Number.isFinite(Number(now)) ? Number(now) : anchor;
  const projected = queue.length && Number.isFinite(anchor) && time > anchor
    ? advanceConstruction(settlement, time) : settlement;
  const live = new Map(tasks(projected).map(task => [task.key, task]));
  const counts = workerCounts(projected);
  const savedCounts = workerCounts(settlement, queue);
  const byKey = {}, byBuilding = {};
  for (const task of queue) {
    const current = live.get(task.key);
    const saved = progress(task);
    const value = current ? progress(current) : { ...saved, done: saved.required, remaining: 0 };
    const workers = current ? (counts[task.key] || 0) : (savedCounts[task.key] || 0);
    const ratio = Math.max(0, Math.min(1, value.done / value.required));
    const state = !current || value.remaining <= 0 ? 'confirming' : workers > 0 ? 'building' : 'waiting';
    const view = {
      key: task.key, kind: task.kind, type: task.type, buildingId: task.buildingId,
      roomId: task.roomId || null, done: value.done, required: value.required,
      ratio, percent: state === 'confirming' ? 100 : Math.min(99, Math.floor(ratio * 100)),
      workers, state, etaMs: state === 'building' ? Math.ceil(value.remaining * 60000 / workers) : null,
      stage: constructionStage(ratio),
    };
    byKey[task.key] = view;
    (byBuilding[task.buildingId] ||= { tasks: [] }).tasks.push(view);
  }
  for (const group of Object.values(byBuilding)) {
    const total = group.tasks.reduce((n, task) => n + task.required, 0);
    group.ratio = group.tasks.reduce((n, task) => n + task.done, 0) / total;
    group.workers = group.tasks.reduce((n, task) => n + (task.state === 'confirming' ? 0 : task.workers), 0);
    group.state = group.tasks.every(task => task.state === 'confirming') ? 'confirming'
      : group.tasks.some(task => task.state === 'building') ? 'building' : 'waiting';
    // Pending confirmations have no active crew; retain the previous count only
    // on the individual task card, where it is explicitly labelled as pending.
    group.percent = group.state === 'confirming' ? 100 : Math.min(99, Math.floor(group.ratio * 100));
    group.stage = constructionStage(group.ratio);
  }
  return { byKey, byBuilding };
}

export function constructionStage(ratio) {
  const value = Math.max(0, Math.min(1, Number(ratio) || 0));
  return value < 1 / 3 ? 'site' : value < 2 / 3 ? 'frame' : 'finishing';
}

/** Deduplicate confirmed events, not projected ones. Opening/switching a save
 * establishes a baseline; historical completions are not replayed as new toasts.
 */
export class ConstructionNoticeTracker {
  constructor() { this.initialized = false; this.settlementId = undefined; this.seen = new Set(); }
  read(settlement) {
    const events = (settlement.events || []).filter(event => event.type === 'construction_completed');
    const key = event => `${event.target}:${event.createdAt ?? event.id}`;
    const changed = !this.initialized || this.settlementId !== settlement.id;
    const fresh = changed ? [] : events.filter(event => !this.seen.has(key(event)));
    if (changed) this.seen.clear();
    this.settlementId = settlement.id; this.initialized = true;
    events.forEach(event => this.seen.add(key(event)));
    // Event history itself is capped by the engine; bound this UI-only cache too.
    if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-250));
    return fresh.filter(event => {
      const [, buildingId] = String(event.target || '').split(':');
      return (settlement.buildings || []).some(building => building.id === buildingId && building.state === 'active');
    }).slice(0, 3);
  }
}
