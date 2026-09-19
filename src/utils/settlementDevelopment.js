import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { knowsSettlementRecipe } from './settlementRecipes.js';
import { ROOMS } from '../data/settlement/rulebook.js';
import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE } from '../data/settlement/buildings.js';

export const RESOURCE_KEYS = ['caps', 'common', 'uncommon', 'rare'];
const TIERS = RESOURCE_KEYS.slice(1);
export const UPGRADE_PATHS = { small_house: 'barracks', barracks: 'large_house', generator: 'generator_medium', generator_medium: 'generator_large', generator_large: 'fusion_reactor', trading_post: 'trading_shop', trading_shop: 'trading_emporium', first_aid_station: 'clinic', clinic: 'surgery_center', turret: 'heavy_machine_gun_turret', machine_gun_turret: 'heavy_machine_gun_turret', laser_turret: 'heavy_laser_turret' };
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const normalized = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/g, '');
export function actorFor(character, session) { return { id: String(character?.id || character?.characterId || character?.settlementActorId || character?.name || ''), name: character?.name || 'Player', isGM: session?.mode === 'host', campaignId: session?.campaignId }; }
export function canManage(settlement, actor) {
  if (!actor?.id && !actor?.isGM) return false;
  if (actor.isGM && (!settlement.campaignId || actor.campaignId === settlement.campaignId)) return true;
  const owner = settlement.access?.ownerId || settlement.ownerCharacterId;
  return !owner || owner === actor.id; // Legacy solo saves have no owner until claimed.
}
export function canSpend(settlement, actor) { return canManage(settlement, actor) || Boolean(actor?.id && settlement.access?.spenders?.includes(actor.id)); }
export function setSpender(s, actor, id, allowed) {
  if (!canManage(s, actor) || !String(id || '').trim()) return s;
  const spenders = new Set(s.access?.spenders || []);
  if (allowed) spenders.add(id); else spenders.delete(id);
  return { ...s, access: { ownerId: s.access?.ownerId || s.ownerCharacterId || actor.id, spenders: [...spenders] } };
}
export function balance(s) { return { caps: number(s.resources?.caps), common: number(s.stockpile?.materials?.common ?? s.resources?.materials), uncommon: number(s.stockpile?.materials?.uncommon), rare: number(s.stockpile?.materials?.rare) }; }
export function cost(rule) { return Object.fromEntries(RESOURCE_KEYS.map(k => [k, number(k === 'caps' ? rule?.caps : rule?.materials?.[k])])); }
function changeBalance(s, amounts, sign = 1) {
  const before = balance(s);
  const after = Object.fromEntries(RESOURCE_KEYS.map(k => [k, before[k] + sign * number(amounts[k])]));
  return { ...s, resources: { ...s.resources, caps: after.caps, materials: after.common }, stockpile: { ...s.stockpile, materials: Object.fromEntries(TIERS.map(k => [k, after[k]])) } };
}
function perkRank(character,name){
  const target=normalized(name);
  return Math.max(0,...(character?.perksAndTraits || []).filter(owned=>!owned.isOriginTrait && [owned.id,owned.name].some(value=>normalized(value)===target)).map(owned=>number(owned.rank || 1)));
}
function skillRank(character,name){
  const target=normalized(name);
  for(const [key,value] of Object.entries(character?.skills || {})){
    if(normalized(key)===target || normalized(value?.name)===target)return number(value?.rank);
  }
  return 0;
}
export function constructionRequirementBlockers(character,rule,recipeId=null){
  if(!rule)return [{kind:'unavailable'}];
  const result=[];
  const hasPerk=p=>perkRank(character,p.name)>=number(p.rank || 1);
  if(String(rule.rarity||'').toLowerCase()==='rare' && recipeId && !knowsSettlementRecipe(character,recipeId)) result.push({kind:'recipe',label:'Rare recipe'});
  for(const p of [...(rule.perks || []),...(rule.perk?[rule.perk]:[])])if(!hasPerk(p))result.push({kind:'perk',label:`${p.name} ${p.rank}`});
  if(rule.perkAnyOf?.length&&!rule.perkAnyOf.some(hasPerk))result.push({kind:'perk',label:rule.perkAnyOf.map(p=>`${p.name} ${p.rank}`).join(' / ')});
  for(const skill of [...(rule.skills || []),...(rule.skill?[rule.skill]:[])])if(skillRank(character,skill.name)<number(skill.rank))result.push({kind:'skill',label:`${skill.name} ${skill.rank}`});
  return result;
}
export function buildBlockers(s, character, rule, actor = actorFor(character)) {
  if (!rule) return [{ kind: 'unavailable' }];
  const result = [];
  if (!canSpend(s, actor)) result.push({ kind: 'permission' });
  const have = balance(s), need = cost(rule);
  for (const key of RESOURCE_KEYS) if (have[key] < need[key]) result.push({ kind: 'resource', key, have: have[key], need: need[key] });
  result.push(...constructionRequirementBlockers(character,rule));
  return result;
}
export function tasks(s) {
  return (s.buildings || []).flatMap(b => [
    ...(b.state === 'construction' ? [{ key: `building:${b.id}`, kind: 'building', buildingId: b.id, type: b.type, job: b }] : []),
    ...(b.upgrade?.state === 'construction' ? [{ key: `upgrade:${b.id}`, kind: 'upgrade', buildingId: b.id, type: b.upgrade.targetType, job: b.upgrade }] : []),
    ...(b.rooms || []).filter(r => r.state === 'construction').map(r => ({ key: `room:${b.id}:${r.id}`, kind: 'room', buildingId: b.id, roomId: r.id, type: r.type, job: r })),
  ]).sort((a, b) => Number(a.job.queuePriority ?? a.job.startedAt ?? a.job.createdAt ?? 0) - Number(b.job.queuePriority ?? b.job.startedAt ?? b.job.createdAt ?? 0));
}
export function progress(task) {
  const rule = task.kind === 'room' ? ROOMS[task.type] : getRulebookBuilding(task.type);
  const required = Math.max(1, number(task.job.constructionDaysRequired || rule?.constructionDays || 1)) * 1440;
  const done = Math.min(required, number(task.job.constructionProgressDays) * 1440);
  return { required, done, remaining: Math.max(0, required - done) };
}
export function assignedKey(worker) {
  const a = worker.settlementAction;
  if (a?.type !== 'build') return null;
  if (a.targetRoomId) return `room:${a.parentBuildingId}:${a.targetRoomId}`;
  if (a.targetUpgradeId) return `upgrade:${a.targetUpgradeId}`;
  if (a.targetBuildingId) return `building:${a.targetBuildingId}`;
  return null;
}
export function workerCounts(s, queue = tasks(s)) {
  const counts = Object.fromEntries(queue.map(t => [t.key, 0]));
  for (const worker of s.settlers || []) {
    const actions=[worker.settlementAction,worker.bonusSettlementAction].filter(action=>action?.type==='build');
    for(const action of actions){
      const key = action.targetRoomId ? `room:${action.parentBuildingId}:${action.targetRoomId}`
        : action.targetUpgradeId ? `upgrade:${action.targetUpgradeId}`
        : action.targetBuildingId ? `building:${action.targetBuildingId}` : null;
      const task = queue.find(t => t.key === key) || queue[0];
      if (task) counts[task.key] += 1;
    }
  }
  return counts;
}
function editJob(s, task, fn) { return { ...s, buildings: s.buildings.map(b => b.id !== task.buildingId ? b : task.kind === 'building' ? fn(b) : task.kind === 'upgrade' ? { ...b, upgrade: fn(b.upgrade) } : { ...b, rooms: b.rooms.map(r => r.id === task.roomId ? fn(r) : r) }) }; }
function event(s, type, data, now) { return { ...s, events: [{ id: `${type}_${now}_${Math.random().toString(36).slice(2)}`, type, ...data, createdAt: now }, ...(s.events || [])].slice(0, 100) }; }
function complete(s, task, now) {
  const beforeBuilding = (s.buildings || []).find(b => b.id === task.buildingId);
  const previousBuildingHappiness = task.kind === 'upgrade'
    ? Number(getRulebookBuilding(beforeBuilding?.type)?.effects?.happiness || 0)
    : 0;
  const completedBuildingHappiness = task.kind === 'building'
    ? Number(getRulebookBuilding(task.type)?.effects?.happiness || 0)
    : task.kind === 'upgrade'
      ? Number(getRulebookBuilding(task.type)?.effects?.happiness || 0)
      : 0;
  let next = editJob(s, task, job => ({
    ...job,
    state: 'active',
    completedAt: now,
    constructionProgressDays: progress(task).required / 1440,
    ...(task.kind === 'room' || task.kind === 'building' ? { happinessApplied: true } : {}),
  }));
  if (task.kind === 'upgrade') {
    next.buildings = next.buildings.map(b => b.id === task.buildingId
      ? { ...b, type: task.type, level: number(b.level || 1) + 1, upgrade: null, happinessApplied: true }
      : b);
  }
  const happinessDelta = task.kind === 'room'
    ? Number(ROOMS[task.type]?.effects?.happiness || 0)
    : completedBuildingHappiness - previousBuildingHappiness;
  if (happinessDelta) {
    const happiness = Math.max(1, Math.min(20, Number(next.attributes?.happiness || 10) + happinessDelta));
    next.attributes = { ...next.attributes, happiness };
    next.resources = { ...next.resources, happiness };
  }
  next.settlers = (next.settlers || []).map(w => assignedKey(w) === task.key ? { ...w, settlementAction: { type: 'build' }, assignedBuildingId: null } : w);
  return event(next, 'construction_completed', { target: task.key, buildingType: task.type }, now);
}
export function advanceConstruction(s, now = Date.now()) {
  let next = s, cursor = Math.min(now, Number(s.constructionUpdatedAt ?? now));
  while (cursor < now) {
    const queue = tasks(next), counts = workerCounts(next, queue), running = queue.filter(t => counts[t.key] > 0);
    if (!running.length) break;
    const step = Math.min(now - cursor, ...running.map(t => progress(t).remaining / counts[t.key] * 60000));
    for (const task of running) next = editJob(next, task, job => ({ ...job, constructionProgressDays: Math.min(progress(task).required, progress(task).done + step / 60000 * counts[task.key]) / 1440 }));
    cursor += step;
    const completed = tasks(next).filter(t => progress(t).remaining < 1e-6);
    for (const task of completed) next = complete(next, task, cursor);
    if (!step && !completed.length) break;
  }
  return { ...next, constructionUpdatedAt: now };
}
export function boostCost(s, key) {
  const task = tasks(s).find(t => t.key === key);
  if (!task) return 0;
  return Math.ceil(progress(task).remaining / Math.max(1, workerCounts(s)[key] || 0));
}
export function boostConstruction(s, actor, key, now = Date.now()) {
  let next = advanceConstruction(s, now);
  const task = tasks(next).find(t => t.key === key);
  const caps = boostCost(next, key);
  if (!task || !canSpend(next, actor) || balance(next).caps < caps) return next;
  next = editJob(next, task, job => ({ ...job, constructionProgressDays: progress(task).required / 1440, clickCapsSpent: number(job.clickCapsSpent) + caps }));
  next = changeBalance(next, { caps }, -1);
  return complete(next, task, now);
}
export function refundFor(task) { const p = progress(task); return Object.fromEntries(RESOURCE_KEYS.map(k => [k, Math.floor(number(task.job.paidCost?.[k]) * p.remaining / p.required + 1e-8)])); }
export function cancelConstruction(s, actor, key, now = Date.now()) {
  let next = advanceConstruction(s, now);
  const task = tasks(next).find(t => t.key === key);
  if (!task || !canSpend(next, actor) || (task.kind === 'building' && task.job.rooms?.length)) return next;
  const refund = refundFor(task);
  next = { ...next, buildings: next.buildings.flatMap(b => b.id !== task.buildingId ? [b] : task.kind === 'building' ? [] : task.kind === 'upgrade' ? [{ ...b, upgrade: null }] : [{ ...b, rooms: b.rooms.filter(r => r.id !== task.roomId) }]), settlers: (next.settlers || []).map(w => assignedKey(w) === key ? { ...w, settlementAction: { type: 'build' }, assignedBuildingId: null } : w) };
  return event(changeBalance(next, refund), 'construction_cancelled', { target: key, refund }, now);
}
export function movePriority(s, actor, key, direction) {
  if (!canSpend(s, actor) || ![-1,1].includes(direction)) return s;
  const queue = tasks(s), i = queue.findIndex(t => t.key === key), j = i + direction;
  if (i < 0 || j < 0 || j >= queue.length) return s;
  [queue[i], queue[j]] = [queue[j], queue[i]];
  return queue.reduce((state, task, index) => editJob(state, task, job => ({ ...job, queuePriority: index })), s);
}
export function assignWorker(s, actor, workerId, key) {
  if (!canSpend(s, actor)) return s;
  const task = tasks(s).find(t => t.key === key);
  if (key && !task) return s;
  const action = !task ? null : task.kind === 'room' ? { type: 'build', parentBuildingId: task.buildingId, targetRoomId: task.roomId } : task.kind === 'upgrade' ? { type: 'build', targetUpgradeId: task.buildingId } : { type: 'build', targetBuildingId: task.buildingId };
  return { ...s, settlers: (s.settlers || []).map(w => w.id === workerId ? { ...w, settlementAction: action, assignedBuildingId: task?.buildingId || null, status: action ? 'working' : 'idle' } : w) };
}
export function upgradeRule(b) {
  const target = getRulebookBuilding(UPGRADE_PATHS[b?.type]), old = getRulebookBuilding(b?.type);
  if (!target) return null;
  return { ...target, constructionDays: Math.max(1, target.constructionDays - (old?.constructionDays || 0)), caps: Math.max(0, (target.caps || 0) - (old?.caps || 0)), materials: Object.fromEntries(TIERS.map(k => [k, Math.max(0, (target.materials?.[k] || 0) - (old?.materials?.[k] || 0))])) };
}
export function canFit(s, type, x, y, ignoreId) {
  const size = SETTLEMENT_BUILDINGS[type]?.footprint;
  if (!size || x < 0 || y < 0 || x + size.width > SETTLEMENT_GRID_SIZE || y + size.height > SETTLEMENT_GRID_SIZE) return false;
  return !(s.buildings || []).some(b => { if (b.id === ignoreId) return false; const f = SETTLEMENT_BUILDINGS[b.upgrade?.targetType || b.type]?.footprint; return f && x < b.x + f.width && x + size.width > b.x && y < b.y + f.height && y + size.height > b.y; });
}
export function startUpgrade(s, character, actor, id, now = Date.now()) {
  const current = advanceConstruction(s, now), b = current.buildings?.find(b => b.id === id), rule = upgradeRule(b), targetType = UPGRADE_PATHS[b?.type];
  if (!b || b.state !== 'active' || b.upgrade || Number(b.condition ?? 100) <= 0 || !rule || buildBlockers(current, character, rule, actor).length || !canFit(current, targetType, b.x, b.y, b.id)) return current;
  const next = changeBalance(current, cost(rule), -1);
  return { ...next, buildings: next.buildings.map(item => item.id === id ? { ...item, upgrade: { state: 'construction', targetType, constructionDaysRequired: rule.constructionDays, constructionProgressDays: 0, paidCost: cost(rule), startedAt: now } } : item) };
}
export function missingResources(s, rule) { const have = balance(s), need = cost(rule); return Object.fromEntries(RESOURCE_KEYS.map(k => [k, Math.max(0, need[k] - have[k])])); }
export function createOrder(s, actor, kind, target, now = Date.now()) {
  if (!canSpend(s, actor) || !['supply','specialist'].includes(kind) || (s.orders || []).some(o => o.kind === kind && o.target === target && o.state === 'open')) return s;
  if (kind === 'specialist' && !['Repair','Science','Medicine'].includes(target)) return s;
  if (kind === 'supply' && !getRulebookBuilding(target)) return s;
  const requested = kind === 'supply' ? missingResources(s, getRulebookBuilding(target)) : {};
  if (kind === 'supply' && !Object.values(requested).some(v => v > 0)) return s;
  return { ...s, orders: [...(s.orders || []), { id: `order_${now}_${Math.random().toString(36).slice(2)}`, kind, target, requested, delivered: {}, state: 'open', createdAt: now, createdBy: actor.id }] };
}
export function creditOrders(orders = [], amounts, now) {
  const left = { ...amounts };
  return orders.map(o => { if (o.kind !== 'supply' || o.state !== 'open') return o; const delivered = { ...o.delivered }; for (const k of RESOURCE_KEYS) { const n = Math.min(number(left[k]), Math.max(0, number(o.requested[k]) - number(delivered[k]))); delivered[k] = number(delivered[k]) + n; left[k] = number(left[k]) - n; } const done = RESOURCE_KEYS.every(k => delivered[k] >= number(o.requested[k])); return { ...o, delivered, state: done ? 'completed' : 'open', ...(done ? { completedAt: now } : {}) }; });
}
export function cancelOrder(s, actor, id) { return canSpend(s, actor) ? { ...s, orders: (s.orders || []).map(o => o.id === id && o.state === 'open' ? { ...o, state: 'cancelled' } : o) } : s; }
export function confirmSpecialist(s, actor, id, name, now = Date.now()) {
  const order = s.orders?.find(o => o.id === id), label = String(name || '').trim().slice(0,80);
  if (!canManage(s, actor) || !label || order?.kind !== 'specialist' || order.state !== 'open' || (s.settlers || []).length >= 10 + number(s.leader?.charisma)) return s;
  const settlers = [...(s.settlers || []), { id: `specialist_${id}`, name: label, specialty: order.target, skills: { [order.target]: { rank: 3 } }, role: 'unassigned', settlementAction: null, status: 'idle', health: 100 }];
  return event({ ...s, settlers, attributes: { ...s.attributes, people: settlers.length }, resources: { ...s.resources, population: settlers.length }, orders: s.orders.map(o => o.id === id ? { ...o, state: 'completed', completedAt: now } : o) }, 'specialist_arrived', { settlerName: label }, now);
}
const materialNames = { common: ['Common Materials','Обычные материалы','Звичайні матеріали','Materiały pospolite'], uncommon: ['Uncommon Materials','Необычные материалы','Незвичайні матеріали','Materiały niepospolite'], rare: ['Rare Materials','Редкие материалы','Рідкісні матеріали','Materiały rzadkie'] };
export function materialTier(item) { if (item.sourceType === 'crafting_material' && TIERS.includes(item.materialTier)) return item.materialTier; return TIERS.find(k => materialNames[k].some(n => [item.name,item.canonicalName,item.sourceName].some(v => String(v || '').trim().toLowerCase() === n.toLowerCase()))); }
export function playerResources(c) { const available = { caps: number(c?.caps), common: 0, uncommon: 0, rare: 0 }; for (const item of c?.inventoryItems || []) { const k = materialTier(item); if (k) available[k] += number(item.quantity ?? item.qty); } return available; }
export function depositCheck(s, c, input) {
  if (!c) return 'unavailable';
  const values = Object.fromEntries(RESOURCE_KEYS.map(k => [k, Number(input[k] ?? 0)]));
  if (Object.values(values).some(n => !Number.isSafeInteger(n) || n < 0) || !Object.values(values).some(n => n > 0)) return 'invalid';
  const available = playerResources(c);
  if (RESOURCE_KEYS.some(k => values[k] > available[k])) return 'insufficient';
  let capacity = 300;
  for (const b of s.buildings || []) if (b.state === 'active' && Number(b.condition ?? 100) > 0) { capacity += number(getRulebookBuilding(b.type)?.effects?.storageLbs); for (const r of b.rooms || []) if (r.state === 'active') capacity += number(ROOMS[r.type]?.effects?.storageLbs); }
  const used = TIERS.reduce((sum,k) => sum + balance(s)[k],0) + (s.stockpile?.items || []).reduce((sum,i) => sum + number(String(i.weight || 0).replace(',','.')) * number(i.quantity ?? i.qty ?? 1),0);
  const addition = TIERS.reduce((sum,k) => sum + values[k],0);
  return addition > 0 && used + addition > capacity ? 'capacity' : null;
}
export function deposit(s, c, input, now = Date.now()) {
  const error = depositCheck(s,c,input); if (error) return { error };
  const amounts = Object.fromEntries(RESOURCE_KEYS.map(k => [k, Number(input[k] || 0)])), left = { ...amounts };
  const inventoryItems = (c.inventoryItems || []).flatMap(item => { const k = materialTier(item); if (!k || !left[k]) return [item]; const have = number(item.quantity ?? item.qty), spent = Math.min(have,left[k]); left[k] -= spent; return have > spent ? [{ ...item, quantity: String(have-spent), ...(Object.hasOwn(item,'qty') ? {qty:have-spent} : {}) }] : []; });
  const next = changeBalance(s,amounts);
  return { character: { ...c, caps: String(number(c.caps)-amounts.caps), inventoryItems }, settlement: event({ ...next, orders: creditOrders(s.orders,amounts,now), members: { ...s.members, [actorFor(c).id]: { name: c.name || 'Player' } } }, 'stockpile_deposit', { contributor: c.name || 'Player', amounts }, now) };
}
