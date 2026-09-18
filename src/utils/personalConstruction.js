import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE } from '../data/settlement/buildings.js';
import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { ROOMS } from '../data/settlement/rulebook.js';
import { createConstructionBuilding, getStructureRoomCapacity } from './settlementDayEngine.js';
import * as dev from './settlementDevelopment.js';
import { checkedResources, checkedPlayerResources, debitPersonalResources } from './personalResources.js';

export const PERSONAL_ACTIONS = ['buildPersonal', 'roomPersonal', 'upgradePersonal'];
export const isPersonalAction = command => PERSONAL_ACTIONS.includes(command?.type);
const fail = code => { throw new Error(code); };
export function personalQuote(s, command) {
  let rule;
  if (command.type === 'buildPersonal') rule = getRulebookBuilding(command.buildingType);
  else if (command.type === 'roomPersonal') rule = ROOMS[command.roomType];
  else if (command.type === 'upgradePersonal') rule = dev.upgradeRule(s.buildings.find(b => b.id === command.buildingId));
  if (!rule) fail('INVALID_COMMAND');
  return { rule, amounts: checkedResources(dev.cost(rule)) };
}
export function insideSettlement(type, x, y) {
  const size = SETTLEMENT_BUILDINGS[type]?.footprint;
  return Boolean(size && Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 &&
    x + size.width <= SETTLEMENT_GRID_SIZE && y + size.height <= SETTLEMENT_GRID_SIZE);
}
export function personalBlockers(s, character, rule, actor) {
  const have = dev.playerResources(character);
  const view = { ...s, resources: { ...s.resources, caps: have.caps, materials: have.common },
    stockpile: { ...s.stockpile, materials: { common: have.common, uncommon: have.uncommon, rare: have.rare } } };
  return dev.buildBlockers(view, character, rule, actor);
}
/** Existing rules, but a personal payer and immutable provenance. A conflicting
 * NEW building is stored; invalid terrain/out-of-bounds or unpaid work is rejected.
 * Nothing in storedBuildings is visible to the production/construction engines. */
export function applyPersonalConstruction(settlement, character, actor, command, now, { local = false } = {}) {
  if (!dev.canSpend(settlement, actor)) fail('FORBIDDEN');
  const source = character?.constructionSource;
  if (!source || source.characterId !== command.sourceId || source.deviceId !== actor.deviceId) fail('PERSONAL_DEVICE_REQUIRED');
  if (!command.requestId) fail('INVALID_COMMAND');
  const s = local ? structuredClone(settlement) : dev.advanceConstruction(settlement, now);
  const { rule, amounts } = personalQuote(s, command);
  const quoted = checkedResources(command.quote);
  if (dev.RESOURCE_KEYS.some(k => quoted[k] !== amounts[k])) fail('CONSTRUCTION_COST_CHANGED');
  const blockers = personalBlockers(s, character, rule, actor);
  if (blockers.some(b => b.kind === 'resource')) fail('PERSONAL_RESOURCES_INSUFFICIENT');
  if (blockers.length) fail('REQUIREMENTS');
  const b = s.buildings.find(b => b.id === command.buildingId);
  if (command.type === 'buildPersonal') {
    if (command.buildingType === 'settlement_hq' || !insideSettlement(command.buildingType, command.x, command.y)) fail('PLACEMENT');
  } else if (command.type === 'roomPersonal') {
    if (!b || b.state !== 'active' || (b.rooms || []).length >= getStructureRoomCapacity(b)) fail('ROOM_FULL');
  } else {
    if (!b || b.state !== 'active' || b.upgrade || b.locked || b.type === 'settlement_hq' || Number(b.condition ?? 100) <= 0) fail('LOCKED');
    if (!dev.canFit(s, dev.UPGRADE_PATHS[b.type], b.x, b.y, b.id)) fail('PLACEMENT');
  }
  const { character: paid } = debitPersonalResources(character, amounts);
  const funding = { type: 'character', payerUid: actor.id, sourceId: command.sourceId, deviceId: source.deviceId, requestId: command.requestId };
  let result = s;
  if (command.type === 'buildPersonal') {
    const building = { ...createConstructionBuilding({ id: `building_${command.requestId}`, type: command.buildingType, x: command.x, y: command.y, now }), funding };
    if ([...(s.buildings || []), ...(s.storedBuildings || [])].some(b => b.id === building.id)) fail('DUPLICATE_BUILDING');
    if (dev.canFit(s, command.buildingType, command.x, command.y)) result = { ...s, buildings: [...s.buildings, building] };
    else {
      if (local) fail('PLACEMENT');
      result = { ...s, storedBuildings: [...(s.storedBuildings || []), { ...building, x: null, y: null, storedAt: now, storedReason: 'PLACEMENT_CONFLICT' }] };
    }
  } else if (command.type === 'roomPersonal') {
    if ((b.rooms || []).some(r => r.id === `room_${command.requestId}`)) fail('DUPLICATE_BUILDING');
    const room = { id: `room_${command.requestId}`, type: command.roomType, state: 'construction', constructionDaysRequired: Math.max(1, rule.constructionDays || 1),
      constructionProgressDays: 0, paidCost: amounts, funding, createdAt: now };
    result = { ...s, buildings: s.buildings.map(item => item.id === b.id ? { ...item, rooms: [...(item.rooms || []), room] } : item) };
  } else {
    const upgrade = { state: 'construction', targetType: dev.UPGRADE_PATHS[b.type], constructionDaysRequired: rule.constructionDays,
      constructionProgressDays: 0, paidCost: amounts, funding, startedAt: now };
    result = { ...s, buildings: s.buildings.map(item => item.id === b.id ? { ...item, upgrade } : item) };
  }
  return { settlement: result, character: paid };
}
export function placeStoredBuilding(settlement, actor, command, now) {
  if (!dev.canSpend(settlement, actor)) fail('FORBIDDEN');
  const b = settlement.storedBuildings?.find(b => b.id === command.buildingId);
  if (!b || settlement.buildings.some(item => item.id === b.id)) fail('NOT_FOUND');
  if (!insideSettlement(b.type, command.x, command.y) || !dev.canFit(settlement, b.type, command.x, command.y)) fail('PLACEMENT');
  const { storedAt, storedReason, ...building } = b;
  return { ...settlement, storedBuildings: settlement.storedBuildings.filter(item => item.id !== b.id),
    buildings: [...settlement.buildings, { ...building, x: command.x, y: command.y, placedAt: now }] };
}

/** Remove a personally funded task without ever crediting the communal stockpile.
 * The caller must credit the ORIGINAL payer in the same server transaction. */
export function cancelPersonalConstruction(settlement, actor, command, now) {
  if (!dev.canSpend(settlement, actor)) fail('FORBIDDEN');
  const s = dev.advanceConstruction(settlement,now);
  if (command.type === 'cancelStored') {
    const b = s.storedBuildings?.find(b=>b.id===command.buildingId);
    if(!b || b.funding?.type!=='character')fail('NOT_FOUND');
    return { settlement:{...s,storedBuildings:s.storedBuildings.filter(item=>item.id!==b.id)},
      refund:{...b.funding,amounts:checkedResources(b.paidCost)} };
  }
  const task=dev.tasks(s).find(t=>t.key===command.key);
  if(!task || task.job.funding?.type!=='character')return null;
  if(task.kind==='building' && task.job.rooms?.length)fail('LOCKED');
  const refund=dev.refundFor(task);
  const next=dev.cancelConstruction(s,actor,command.key,now);
  // cancelConstruction's legacy path credits the stockpile; restore just its
  // original currency/material fields. Retain all removals/worker cleanup/events.
  return {settlement:{...next,resources:{...next.resources,caps:s.resources?.caps || 0,materials:s.resources?.materials || 0},
    stockpile:{...next.stockpile,materials:{...s.stockpile?.materials}}},
    refund:{...task.job.funding,amounts:refund}};
}
