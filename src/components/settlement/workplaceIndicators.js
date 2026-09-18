// Shared semantic icons. Amounts are forecasts, never a source of inventory writes.
export const RESOURCE_SYMBOLS = { food:'🌾', water:'💧', power:'ϟ', income:'¤', materials:'⚙', defense:'⬟', crafting:'⚒', caravan:'⇄', housing:'⌂', storage:'▣', happiness:'☺', livestock:'♉', construction:'⚒', unknown:'◇' };
export const JOB_SYMBOLS = { build:'⚒', tend_crops:'🌾', guard:'⬟', business:'¤', scavenging:'⚙', hunting_gathering:'♧', trade_caravan:'⇄', idle:'•' };
export function workerIndicator(action, phase, cargo = false) {
  return { symbol: JOB_SYMBOLS[action] || JOB_SYMBOLS.idle,
    status: phase === 'waiting' ? '!' : cargo ? '▣' : '', warning: phase === 'waiting' };
}
export function buildingIndicators(building, site) {
  const e = site?.effects || {}, active = site?.state === 'active';
  const result = [];
  const add = (kind, amount = null, mode = 'service') => result.push({ kind, symbol: RESOURCE_SYMBOLS[kind], amount: active ? amount : amount === null ? null : 0, mode });
  if (e.cropSlots) add('food', site.food, 'daily');
  if (e.water) add('water', Number(e.water), 'daily');
  if (e.power) add('power', Number(e.power), 'capacity');
  if (e.store) add('income', site.income, 'rating');
  if (e.improvedScavenging) add('materials', null, 'roll');
  if (e.defense || e.guardActionDefenseBonus || e.defensePerGuardPost) add('defense');
  if (e.crafting) add('crafting');
  if (e.tradeOutpost) add('caravan');
  if (e.roomCapacity || building.type === 'settlement_hq') add('housing');
  if (e.storageLbs) add('storage');
  if (e.brahminCapacity) add('livestock');
  if (e.happiness && !e.store) add('happiness');
  if (!result.length) add('unknown');
  return result;
}
