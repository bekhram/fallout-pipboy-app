import { isPersonalAction, applyPersonalConstruction, placeStoredBuilding, cancelPersonalConstruction } from '../src/utils/personalConstruction.js';
import { checkedResources, creditPersonalResources } from '../src/utils/personalResources.js';
import { MAP_REGIONS } from '../src/data/map/mapRegions.js';
import { SETTLEMENT_BUILDINGS } from '../src/data/settlement/buildings.js';
import { ROOMS } from '../src/data/settlement/rulebook.js';
import { createSettlement, runSimulation } from '../src/utils/settlementState.js';
import { applySettlementCommand } from '../src/utils/settlementCommands.js';
import { characterImport } from '../src/utils/campaignCharacter.js';
export { characterImport } from '../src/utils/campaignCharacter.js';

export function requireMember(c, uid) {
  if (!c || !c.members?.[uid] || c.members[uid].revoked) throw new Error('FORBIDDEN');
  return c.members[uid];
}
const label = value => String(value || '').trim().slice(0, 80);
export function newCampaign(id, uid, name, now) {
  return { id, name: label(name) || 'Campaign', ownerUid: uid, memberIds: [uid], members: { [uid]: { name: 'GM', joinedAt: now, role: 'gm' } }, settlements: [], accounts: {}, proposals: {}, revision: 0, createdAt: now, updatedAt: now };
}
export function publicCampaign(c, uid) {
  requireMember(c, uid);
  const { accounts, proposals, inviteHash, ...visible } = c;
  if (visible.worldMap) visible.worldMap = { ...visible.worldMap, positions: Object.fromEntries(Object.entries(visible.worldMap.positions || {}).filter(([id]) => c.memberIds.includes(id))) };
  return { ...visible, character: accounts[uid] || null, proposals: uid === c.ownerUid ? proposals : (proposals[uid] ? { [uid]: proposals[uid] } : {}), approvedMembers: Object.keys(accounts), hasInvite: Boolean(inviteHash) };
}
export function campaignCommand(original, uid, cmd, now) {
  requireMember(original, uid);
  let c = structuredClone(original);
  const gm = c.ownerUid === uid;
  const admin = () => { if (!gm) throw new Error('FORBIDDEN'); };
  switch (cmd.type) {
    case 'worldMove': {
      const world = c.worldMap || { regionId: 'commonwealth', positions: {} };
      if (cmd.regionId !== world.regionId || !Number.isInteger(cmd.x) || !Number.isInteger(cmd.y) || cmd.x < 0 || cmd.y < 0 || cmd.x > 63 || cmd.y > 63) throw new Error('INVALID_LOCATION');
      c.worldMap = { ...world, positions: { ...world.positions, [uid]: { x: cmd.x, y: cmd.y, updatedAt: now } } }; break;
    }
    case 'worldRegion': {
      admin(); const region = MAP_REGIONS.find(r => r.id === cmd.regionId);
      if (!region) throw new Error('INVALID_LOCATION');
      c.worldMap = { regionId: region.id, positions: Object.fromEntries(c.memberIds.map(id => [id, { ...region.start, updatedAt: now }])) }; break;
    }
    case 'teamFound': {
      admin();
      const world = c.worldMap || { regionId: 'commonwealth', positions: {} };
      const pos = world.positions[uid] || MAP_REGIONS.find(r => r.id === world.regionId).start;
      return campaignCommand(original, uid, { ...cmd, type: 'found', regionId: world.regionId, worldX: pos.x, worldY: pos.y }, now);
    }
    case 'sessionPresence':
      admin();
      if (!/^[A-Z0-9]{6}$/.test(cmd.code || '')) throw new Error('INVALID_REQUEST');
      c.liveSession = { code: cmd.code, updatedAt: now }; break;
    case 'tick':
      c.settlements = c.settlements.map(s => runSimulation(s, now)); break;
    case 'linkPersonalSource': {
      const account=c.accounts[uid];
      if(!account)throw new Error('CHARACTER_NOT_APPROVED');
      if(!/^[a-zA-Z0-9_-]{8,100}$/.test(cmd.sourceId || '') || !/^[a-zA-Z0-9_-]{8,100}$/.test(cmd.deviceId || ''))throw new Error('INVALID_REQUEST');
      if(account.constructionSource && (account.constructionSource.characterId!==cmd.sourceId || account.constructionSource.deviceId!==cmd.deviceId))throw new Error('PERSONAL_DEVICE_REQUIRED');
      account.constructionSource ||= {characterId:cmd.sourceId,deviceId:cmd.deviceId,credits:{caps:0,common:0,uncommon:0,rare:0}};
      break;
    }
    case 'submitCharacter':
      if (c.accounts[uid]) throw new Error('ALREADY_IMPORTED');
      c.proposals[uid] = characterImport(cmd.character, uid); break;
    case 'approveCharacter':
      admin();
      requireMember(c, cmd.memberId);
      if (!c.proposals[cmd.memberId] || c.accounts[cmd.memberId]) throw new Error('ALREADY_IMPORTED');
      c.accounts[cmd.memberId] = c.proposals[cmd.memberId];
      c.members[cmd.memberId].name = c.proposals[cmd.memberId].name;
      delete c.proposals[cmd.memberId]; break;
    case 'revoke':
      admin();
      if (cmd.memberId === uid) throw new Error('OWNER_REQUIRED');
      requireMember(c, cmd.memberId);
      c.members[cmd.memberId].revoked = true;
      c.memberIds = c.memberIds.filter(id => id !== cmd.memberId);
      c.settlements = c.settlements.map(s => ({ ...s, access: { ...s.access, spenders: (s.access.spenders || []).filter(id => id !== cmd.memberId) } })); break;
    case 'importSettlement': {
      admin();
      const input = cmd.settlement;
      if (!input || c.settlements.length >= 5 || c.settlements.some(s => s.importedFrom === input.id)) throw new Error('IMPORT_UNAVAILABLE');
      if (!Array.isArray(input.buildings) || input.buildings.length > 200 || !Array.isArray(input.settlers) || input.settlers.length > 50) throw new Error('INVALID_SETTLEMENT');
      for (const b of input.buildings) {
        if (!Object.hasOwn(SETTLEMENT_BUILDINGS, b.type) || !Number.isInteger(b.x) || !Number.isInteger(b.y) || b.x < 0 || b.y < 0 || b.x > 23 || b.y > 23 || (b.rooms || []).some(r => !Object.hasOwn(ROOMS, r.type))) throw new Error('INVALID_SETTLEMENT');
        if (b.upgrade && !Object.hasOwn(SETTLEMENT_BUILDINGS, b.upgrade.targetType)) throw new Error('INVALID_SETTLEMENT');
      }
      const baseline = createSettlement({ name: label(input.name), regionId: input.regionId || 'commonwealth', worldX: Number(input.worldX) || 0, worldY: Number(input.worldY) || 0, ownerCharacterId: uid });
      const imported = runSimulation({ ...baseline, ...input, id: `settlement_${cmd.requestId}`, importedFrom: String(input.id), campaignId: c.id, ownerCharacterId: uid, access: { ownerId: uid, spenders: [] }, members: {}, orders: [], createdAt: now, lastDayAt: now, nextDayAt: now + 86400000, constructionUpdatedAt: now, events: [] }, now);
      c.settlements.push(imported); break;
    }
    case 'found': {
      admin();
      if (c.settlements.length >= 5) throw new Error('SETTLEMENT_LIMIT');
      if (!['commonwealth','california_fo1','california_fo2','capital_wasteland','mojave'].includes(cmd.regionId) || !Number.isSafeInteger(cmd.worldX) || !Number.isSafeInteger(cmd.worldY)) throw new Error('INVALID_LOCATION');
      if (c.settlements.some(s => s.regionId === cmd.regionId && s.worldX === cmd.worldX && s.worldY === cmd.worldY)) throw new Error('LOCATION_OCCUPIED');
      const s = createSettlement({ name: label(cmd.name), regionId: cmd.regionId, worldX: cmd.worldX, worldY: cmd.worldY, ownerCharacterId: uid, leaderCharisma: c.accounts[uid]?.special?.charisma || 0 });
      c.settlements.push({ ...s, id: `settlement_${cmd.requestId}`, campaignId: c.id }); break;
    }
    case 'settlement': {
      const index = c.settlements.findIndex(s => s.id === cmd.settlementId);
      if (index < 0) throw new Error('NOT_FOUND');
      const actor = { id: uid, name: c.members[uid].name, isGM: gm, campaignId: c.id, deviceId: cmd.deviceId };
      const action = { ...cmd.command, requestId: cmd.requestId };
      if (action.type === 'spender') requireMember(c, action.memberId);
      if (['build','room','upgrade','deposit'].includes(action.type) && !c.accounts[uid]) throw new Error('CHARACTER_NOT_APPROVED');
      let result;
      const settlement=runSimulation(c.settlements[index],now);
      if (isPersonalAction(action)) {
        result=applyPersonalConstruction(settlement,c.accounts[uid],actor,action,now);
      } else if (action.type==='placeStored') {
        result={settlement:placeStoredBuilding(settlement,actor,action,now)};
      } else if (['cancel','cancelStored'].includes(action.type)) {
        result=cancelPersonalConstruction(settlement,actor,action,now);
        if(result?.refund) {
          const {payerUid,sourceId,amounts}=result.refund;
          const payer=c.accounts[payerUid];
          if(!payer || payer.constructionSource?.characterId!==sourceId)throw new Error('REFUND_TARGET_UNAVAILABLE');
          const credited=creditPersonalResources(payer,amounts);
          const credits=checkedResources(Object.fromEntries(['caps','common','uncommon','rare'].map(k=>[k,(payer.constructionSource.credits?.[k]||0)+(amounts[k]||0)])));
          c.accounts[payerUid]={...credited,constructionSource:{...payer.constructionSource,credits}};
        }
      }
      if(!result) {
        if(c.accounts[uid]?.constructionSource && ['build','room','upgrade'].includes(action.type))throw new Error('PERSONAL_PAYMENT_REQUIRED');
        if(action.type==='deposit' && c.accounts[uid]?.constructionSource && c.accounts[uid].constructionSource.deviceId!==cmd.deviceId)throw new Error('PERSONAL_DEVICE_REQUIRED');
        result = applySettlementCommand(settlement, c.accounts[uid], actor, action, now);
      }
      c.settlements[index] = result.settlement;
      if (result.character) c.accounts[uid] = result.character;
      break;
    }
    default: throw new Error('INVALID_COMMAND');
  }
  c.revision += 1; c.updatedAt = now;
  if (JSON.stringify(c).length > 700000) throw new Error('CAMPAIGN_SIZE_LIMIT');
  return c;
}
