import { RESOURCE_KEYS, materialTier, playerResources } from './settlementDevelopment.js';

export const zeroResources = () => Object.fromEntries(RESOURCE_KEYS.map(k => [k, 0]));
export function checkedResources(values, maximum = 1000000) {
  const result = Object.fromEntries(RESOURCE_KEYS.map(k => [k, Number(values?.[k] ?? 0)]));
  if (RESOURCE_KEYS.some(k => !Number.isSafeInteger(result[k]) || result[k] < 0 || result[k] > maximum)) throw new Error('INVALID_RESOURCE_AMOUNT');
  return result;
}
export function checkedPlayerResources(character) {
  // Do not silently turn malformed negative/fractional inventory stacks into money.
  if (!character || !Array.isArray(character.inventoryItems)) throw new Error('CHARACTER_NOT_APPROVED');
  const cap = Number(character.caps || 0);
  if (!Number.isSafeInteger(cap) || cap < 0 || cap > 1000000) throw new Error('INVALID_RESOURCE_AMOUNT');
  for (const item of character.inventoryItems) {
    if (!materialTier(item)) continue;
    const quantity = Number(item.quantity ?? item.qty ?? 0);
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) throw new Error('INVALID_RESOURCE_AMOUNT');
  }
  return checkedResources(playerResources(character));
}
export function debitPersonalResources(character, input) {
  const cost = checkedResources(input), have = checkedPlayerResources(character), left = { ...cost };
  if (RESOURCE_KEYS.some(k => have[k] < cost[k])) throw new Error('PERSONAL_RESOURCES_INSUFFICIENT');
  const removed = [];
  const inventoryItems = character.inventoryItems.flatMap(item => {
    const tier = materialTier(item), n = tier ? Math.min(left[tier], Number(item.quantity ?? item.qty ?? 0)) : 0;
    if (!n) return [item];
    left[tier] -= n;
    removed.push({ ...item, quantity: String(n), ...(Object.hasOwn(item, 'qty') ? { qty: n } : {}) });
    const remaining = Number(item.quantity ?? item.qty ?? 0) - n;
    return remaining ? [{ ...item, quantity: String(remaining), ...(Object.hasOwn(item, 'qty') ? { qty: remaining } : {}) }] : [];
  });
  return { character: { ...character, caps: String(have.caps - cost.caps), inventoryItems }, removed, cost };
}
export function creditPersonalResources(character, input, removed = null) {
  const amounts = checkedResources(input), have = checkedPlayerResources(character);
  checkedResources(Object.fromEntries(RESOURCE_KEYS.map(k => [k, have[k] + amounts[k]])));
  // Preserve the exact original inventory metadata when releasing a local hold.
  const additions = removed || RESOURCE_KEYS.filter(k => k !== 'caps' && amounts[k]).map(materialTier => ({
    sourceType: 'crafting_material', category: 'junk', materialTier,
    name: `${materialTier} materials`, quantity: String(amounts[materialTier]), cost: '0', weight: '1',
  }));
  const check = playerResources({ caps: amounts.caps, inventoryItems: additions });
  if (RESOURCE_KEYS.some(k => check[k] !== amounts[k])) throw new Error('INVALID_RESOURCE_RECEIPT');
  const metadata = item => JSON.stringify(Object.fromEntries(Object.entries(item).filter(([key]) => !['quantity','qty'].includes(key)).sort(([a],[b]) => a.localeCompare(b))));
  const inventoryItems = structuredClone(character.inventoryItems);
  for (const item of structuredClone(additions)) {
    const existing = inventoryItems.find(before => metadata(before) === metadata(item));
    if (existing) {
      const quantity = Number(existing.quantity ?? existing.qty ?? 0) + Number(item.quantity ?? item.qty ?? 0);
      existing.quantity = String(quantity); if (Object.hasOwn(existing, 'qty')) existing.qty = quantity;
    } else inventoryItems.push(item);
  }
  return { ...character, caps: String(have.caps + amounts.caps), inventoryItems };
}
