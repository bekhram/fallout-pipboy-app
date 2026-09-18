import test from 'node:test';
import assert from 'node:assert/strict';
import { getRulebookBuilding } from '../src/data/settlement/rulebookCatalog.js';
import { createSettlement } from '../src/utils/settlementState.js';
import { applySettlementCommand } from '../src/utils/settlementCommands.js';
import { canAffordPlayerCost, payPlayerCost, playerResources } from '../src/utils/settlementDevelopment.js';
import { applyOfflineCommand } from '../src/utils/settlementOfflineApply.js';
import { localCommand, isLocalCommand, commandPrecondition, newRecord, mergeSnapshot, enqueue, projectRecord, prepareBatch, acknowledge, reservationTotals } from '../src/cloud/settlementOfflineProtocol.js';

const uid = 'player_personal';
const campaignId = 'campaign_abcdefabcdefabcdefabcdef';
const rule = getRulebookBuilding('wall_straight');

function character(common = 6) {
  return {
    id: uid,
    name: 'Builder',
    caps: '50',
    inventoryItems: [
      { sourceType: 'crafting_material', materialTier: 'common', quantity: String(common), name: 'Common Materials' },
      { sourceType: 'crafting_material', materialTier: 'uncommon', quantity: '0', name: 'Uncommon Materials' },
      { sourceType: 'crafting_material', materialTier: 'rare', quantity: '0', name: 'Rare Materials' },
    ],
    skills: {},
    perksAndTraits: [],
  };
}

function settlement() {
  const s = createSettlement({ name: 'Personal build', regionId: 'commonwealth', worldX: 1, worldY: 1, ownerCharacterId: uid });
  return {
    ...s,
    id: 'settlement_personal',
    campaignId,
    access: { ownerId: uid, spenders: [] },
    resources: { ...s.resources, caps: 0, materials: 0 },
    stockpile: { ...s.stockpile, materials: { common: 0, uncommon: 0, rare: 0 } },
    buildings: [],
    constructionUpdatedAt: 1000,
    createdAt: 1000,
    lastDayAt: 1000,
  };
}

function snapshot(common = 6) {
  return {
    id: campaignId,
    name: 'Personal build campaign',
    ownerUid: uid,
    revision: 1,
    members: { [uid]: { name: 'Builder', role: 'gm' } },
    memberIds: [uid],
    character: character(common),
    settlements: [settlement()],
  };
}

test('personal construction pays from character inventory without touching settlement stockpile', () => {
  assert.ok(rule);
  const before = settlement(), player = character(6);
  assert.equal(canAffordPlayerCost(player, rule), true);
  const result = applySettlementCommand(before, player, { id: uid, isGM: true, campaignId }, {
    type: 'build', buildingType: 'wall_straight', x: 5, y: 5, paymentSource: 'personal', requestId: 'personal_build_001',
  }, 2000);
  assert.equal(result.settlement.stockpile.materials.common, 0);
  assert.equal(result.settlement.resources.materials, 0);
  assert.equal(result.settlement.buildings.length, 1);
  assert.equal(result.settlement.buildings[0].id, 'building_personal_build_001');
  assert.equal(playerResources(result.character).common, 3);
});

test('player payment helper refuses overspending and removes only requested material tiers', () => {
  const low = character(2);
  assert.equal(canAffordPlayerCost(low, rule), false);
  assert.equal(payPlayerCost(low, rule), null);
  const paid = payPlayerCost(character(6), rule);
  assert.equal(playerResources(paid).common, 3);
  assert.equal(Number(paid.caps), 50);
});

test('only explicitly personal builds enter the offline command journal', () => {
  const personal = { type: 'settlement', settlementId: 'settlement_personal', command: {
    type: 'build', buildingType: 'wall_straight', x: 5, y: 5, paymentSource: 'personal',
  } };
  assert.deepEqual(localCommand(personal), personal);
  assert.equal(isLocalCommand(personal), true);
  assert.equal(isLocalCommand({ ...personal, command: { ...personal.command, paymentSource: undefined } }), false);
});

test('queued personal construction reserves projected inventory and prevents double spending', () => {
  const record = mergeSnapshot(newRecord(uid, campaignId, 'device_personal_12345'), snapshot(5), 1000);
  const first = { type: 'settlement', settlementId: 'settlement_personal', command: {
    type: 'build', buildingType: 'wall_straight', x: 5, y: 5, paymentSource: 'personal',
  } };
  enqueue(record, first, 'request_personal_0001', 1100, applyOfflineCommand);
  const projected = projectRecord(record, applyOfflineCommand).campaign;
  assert.equal(projected.settlements[0].buildings[0].id, 'building_request_personal_0001');
  assert.equal(playerResources(projected.character).common, 2);
  assert.throws(() => enqueue(record, { ...first, command: { ...first.command, x: 9 } }, 'request_personal_0002', 1200, applyOfflineCommand), /insufficient/);
  assert.equal(record.entries.length, 1);
});


test('personal build precondition detects competing inventory or map changes before server payment', () => {
  const command = { type: 'settlement', settlementId: 'settlement_personal', command: {
    type: 'build', buildingType: 'wall_straight', x: 5, y: 5, paymentSource: 'personal',
  } };
  const base = snapshot(6);
  const token = commandPrecondition(base, command, uid);
  const spentElsewhere = structuredClone(base);
  spentElsewhere.character.inventoryItems[0].quantity = '5';
  assert.notEqual(commandPrecondition(spentElsewhere, command, uid), token);
  const occupied = structuredClone(base);
  occupied.settlements[0].buildings.push({ id: 'other', type: 'wall_straight', state: 'active', x: 5, y: 5 });
  assert.notEqual(commandPrecondition(occupied, command, uid), token);
});


test('accepted personal builds move from pending reservation into durable sheet spend without changing total availability', () => {
  const record = mergeSnapshot(newRecord(uid, campaignId, 'device_personal_accepted'), snapshot(6), 1000);
  const command = { type: 'settlement', settlementId: 'settlement_personal', command: {
    type: 'build', buildingType: 'wall_straight', x: 5, y: 5, paymentSource: 'personal',
  } };
  enqueue(record, command, 'request_personal_accept', 1100, applyOfflineCommand);
  assert.equal(reservationTotals(record).common, 3);
  prepareBatch(record, 'batch_personal_accept');
  const serverCampaign = applyOfflineCommand(snapshot(6), uid, command, 'request_personal_accept');
  serverCampaign.revision = 2;
  acknowledge(record, {
    protocol: 1,
    requestId: 'batch_personal_accept',
    deviceId: 'device_personal_accepted',
    through: 1,
    campaign: serverCampaign,
    results: [{ sequence: 1, requestId: 'request_personal_accept', state: 'accepted' }],
  }, 2000);
  assert.equal(record.entries.length, 0);
  assert.equal(record.sheetSpent.common, 3);
  assert.equal(reservationTotals(record).common, 3);
  assert.equal(record.history[0].command.command.paymentSource, 'personal');
});

test('rejected personal builds release pending reservation and do not enter durable spend', () => {
  const record = mergeSnapshot(newRecord(uid, campaignId, 'device_personal_reject'), snapshot(6), 1000);
  const command = { type: 'settlement', settlementId: 'settlement_personal', command: {
    type: 'build', buildingType: 'wall_straight', x: 5, y: 5, paymentSource: 'personal',
  } };
  enqueue(record, command, 'request_personal_reject', 1100, applyOfflineCommand);
  prepareBatch(record, 'batch_personal_reject');
  acknowledge(record, {
    protocol: 1,
    requestId: 'batch_personal_reject',
    deviceId: 'device_personal_reject',
    through: 1,
    campaign: snapshot(6),
    results: [{ sequence: 1, requestId: 'request_personal_reject', state: 'rejected', error: 'COMMAND_CONFLICT' }],
  }, 2000);
  assert.equal(reservationTotals(record).common, 0);
  assert.equal(record.sheetSpent.common, 0);
});
