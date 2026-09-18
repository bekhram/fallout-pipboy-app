import { isPersonalAction, applyPersonalConstruction, placeStoredBuilding } from './personalConstruction.js';
import { applySettlementCommand } from './settlementCommands.js';
import { tasks, canSpend } from './settlementDevelopment.js';
import { localCommand, fail } from '../cloud/settlementOfflineProtocol.js';

/** Reuse existing gameplay validation, without awarding offline days, advancing
 * clocks, mutating an inventory, or persisting speculative construction results. */
export function applyOfflineCommand(campaign, uid, input, context = {}) {
  const clean = localCommand(input), command = clean.command;
  if (!campaign?.members?.[uid] || campaign.members[uid].revoked) fail('FORBIDDEN');
  const index = campaign.settlements?.findIndex(s => s.id === clean.settlementId);
  if (index === undefined || index < 0) fail('NOT_FOUND');
  const settlement = campaign.settlements[index];
  const actor = { id: uid, deviceId:context.deviceId, isGM: campaign.ownerUid === uid, campaignId: campaign.id };
  if (!canSpend(settlement, actor)) fail('FORBIDDEN');
  if (['worker', 'action', 'workplace'].includes(command.type) && !settlement.settlers?.some(w => w.id === command.workerId)) fail('NOT_FOUND');
  if (command.type === 'worker' && command.key && !tasks(settlement).some(t => t.key === command.key)) fail('TASK_FINISHED');
  if (command.type === 'priority' && !tasks(settlement).some(t => t.key === command.key)) fail('TASK_FINISHED');
  const frozenAt = Number(settlement.constructionUpdatedAt ?? settlement.lastDayAt ?? settlement.createdAt ?? 0);
  if (isPersonalAction(command)) {
    const result = applyPersonalConstruction(settlement, campaign.character, actor, { ...command,requestId:context.requestId }, frozenAt, {local:true});
    return { ...campaign,character:result.character,settlements:campaign.settlements.map((s,i)=>i===index?result.settlement:s) };
  }
  if (command.type === 'placeStored') return { ...campaign,settlements:campaign.settlements.map((s,i)=>i===index?placeStoredBuilding(s,actor,command,frozenAt):s) };
  const result = applySettlementCommand(structuredClone(settlement), campaign.character || null, actor, command, frozenAt);
  return { ...campaign, settlements: campaign.settlements.map((s, i) => i === index ? result.settlement : s) };
}
