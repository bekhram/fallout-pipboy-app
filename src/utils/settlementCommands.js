import { reserveProvisions } from "./settlementProvisions.js";
import { availableSettlementActions } from "./settlementResidents.js";
import { assignSettlementWorkplace } from './settlementWorkplaces.js';
import * as dev from './settlementDevelopment.js';
import { getRulebookBuilding } from '../data/settlement/rulebookCatalog.js';
import { ROOMS, SETTLEMENT_ACTIONS } from '../data/settlement/rulebook.js';
import { createConstructionBuilding, createRoomConstruction, payRulebookBuildingCost, payRoomCost, getStructureRoomCapacity } from './settlementDayEngine.js';
import { linkSettlementAttackBattle, resolveSettlementAttack, setSettlementDefensePlan } from './settlementAttackEngine.js';
import { assignRepairWorker, startBuildingRepair } from './settlementRepair.js';

export function applySettlementCommand(settlement, character, actor, command, now = Date.now()) {
  let s = dev.advanceConstruction(settlement, now);
  const c = command || {};
  const fail = code => { throw new Error(code); };
  if (c.type === 'deposit') {
    const result = dev.deposit(s, character, c.amounts || {}, now);
    if (result.error) fail(result.error);
    return result;
  }
  if (!dev.canSpend(s, actor)) fail('FORBIDDEN');
  const b = s.buildings?.find(item => item.id === c.buildingId);
  const unlocked = () => { if (!b || b.locked || b.type === 'settlement_hq') fail('LOCKED'); };
  const checkedRule = rule => { if (dev.buildBlockers(s, character, rule, actor).length) fail('REQUIREMENTS'); };
  switch (c.type) {
    case 'supplies': s = reserveProvisions(s, c.resource); break;
    case 'build': {
      if (!Number.isInteger(c.x) || !Number.isInteger(c.y) || !dev.canFit(s, c.buildingType, c.x, c.y) || c.buildingType === 'settlement_hq') fail('PLACEMENT');
      checkedRule(getRulebookBuilding(c.buildingType));
      s = payRulebookBuildingCost(s, c.buildingType);
      s = { ...s, buildings: [...s.buildings, createConstructionBuilding({ id: `building_${c.requestId || now}`, type: c.buildingType, x: c.x, y: c.y, now })] };
      break;
    }
    case 'room': {
      if (!b || b.state !== 'active' || (b.rooms || []).length >= getStructureRoomCapacity(b)) fail('ROOM_FULL');
      checkedRule(ROOMS[c.roomType]);
      const room = createRoomConstruction(c.roomType, now);
      s = payRoomCost(s, c.roomType);
      s = { ...s, buildings: s.buildings.map(item => item.id === b.id ? { ...item, rooms: [...(item.rooms || []), room] } : item) };
      break;
    }
    case 'upgrade': s = dev.startUpgrade(s, character, actor, c.buildingId, now); break;
    case 'boost':
      if (!dev.tasks(s).some(t => t.key === c.key)) fail('TASK_FINISHED');
      if (dev.balance(s).caps < dev.boostCost(s, c.key)) fail('insufficient');
      s = dev.boostConstruction(s, actor, c.key, now); break;
    case 'cancel': s = dev.cancelConstruction(s, actor, c.key, now); break;
    case 'priority': s = dev.movePriority(s, actor, c.key, c.direction); break;
    case 'worker': s = dev.assignWorker(s, actor, c.workerId, c.key); break;
    case 'workplace': s = assignSettlementWorkplace(s, c.workerId, c.buildingId); break;
    case 'order': s = dev.createOrder(s, actor, c.kind, c.target, now); break;
    case 'cancelOrder': s = dev.cancelOrder(s, actor, c.orderId); break;
    case 'specialist':
      if (!dev.canManage(s, actor)) fail('FORBIDDEN');
      s = dev.confirmSpecialist(s, actor, c.orderId, c.name, now); break;
    case 'spender':
      if (!dev.canManage(s, actor)) fail('FORBIDDEN');
      s = dev.setSpender(s, actor, c.memberId, c.allowed === true); break;
    case 'move':
      unlocked();
      if (b.upgrade || !Number.isInteger(c.x) || !Number.isInteger(c.y) || !dev.canFit(s, b.type, c.x, c.y, b.id)) fail('PLACEMENT');
      s = { ...s, buildings: s.buildings.map(item => item.id === b.id ? { ...item, x: c.x, y: c.y } : item) }; break;
    case 'demolish':
      unlocked();
      if (b.state === 'construction' || b.upgrade) fail('USE_CANCEL');
      s = { ...s, buildings: s.buildings.filter(item => item.id !== b.id), settlers: s.settlers.map(w => w.assignedBuildingId === b.id || w.settlementAction?.targetBuildingId === b.id || w.settlementAction?.parentBuildingId === b.id ? { ...w, settlementAction: null, assignedBuildingId: null, status: 'idle' } : w) }; break;
    case 'removeRoom': {
      if (!b) fail('NOT_FOUND');
      const room = b.rooms?.find(r => r.id === c.roomId);
      if (!room || room.state === 'construction') fail('USE_CANCEL');
      s = { ...s, buildings: s.buildings.map(item => item.id === b.id ? { ...item, rooms: item.rooms.filter(r => r.id !== room.id) } : item), attributes: { ...s.attributes, happiness: Math.max(1, Math.min(20, Number(s.attributes?.happiness || 10) - (room.happinessApplied ? Number(ROOMS[room.type]?.effects?.happiness || 0) : 0))) }, settlers: s.settlers.map(w => w.settlementAction?.targetRoomId === room.id ? { ...w, settlementAction: null, assignedBuildingId: null, status: 'idle' } : w) }; break;
    }
    case 'action':
      if (!(s.settlers || []).some(w => w.id === c.workerId)) fail('NOT_FOUND');
      if (c.action && !availableSettlementActions(s).some(a => a.id === c.action)) fail('INVALID_ACTION');
      s = { ...s, settlers: s.settlers.map(w => w.id === c.workerId ? { ...w, settlementAction: c.action ? { type: c.action } : null, assignedBuildingId: null, status: c.action ? 'working' : 'idle' } : w) }; break;
    case 'repairStart': s = startBuildingRepair(s, c.buildingId, now); break;
    case 'repairWorker': s = assignRepairWorker(s, c.buildingId, c.workerId, c.assigned !== false); break;
    case 'attackPlan': s = setSettlementDefensePlan(s, c.attackId, c.defenderIds, c.heroes, now); break;
    case 'attackBattle': s = linkSettlementAttackBattle(s, c.attackId, c.tacticalSceneId, now); break;
    case 'attack': s = resolveSettlementAttack(s, c.attackId, now); break;
    default: fail('INVALID_COMMAND');
  }
  return { settlement: s, character };
}
