import { playerResources } from './settlementDevelopment.js';
const label = value => String(value || '').trim().slice(0, 80);
export function characterImport(input, uid) {
  const resources = playerResources(input);
  if (Object.values(resources).some(v => !Number.isSafeInteger(v) || v < 0 || v > 1000000)) throw new Error('INVALID_CHARACTER');
  return {
    id: uid, name: label(input?.name || input?.characterName) || 'Player', caps: resources.caps,
    inventoryItems: ['common','uncommon','rare'].map(materialTier => ({ sourceType: 'crafting_material', materialTier, quantity: resources[materialTier], name: `${materialTier} materials` })),
    skills: Object.fromEntries(Object.entries(input?.skills || {}).slice(0, 40).map(([key, v]) => [label(key), { rank: Math.min(6, Math.max(0, Math.floor(Number(v?.rank) || 0))) }])),
    perksAndTraits: (input?.perksAndTraits || []).slice(0, 100).map(p => ({ id: label(p.id), name: label(p.name), rank: Math.min(10, Math.max(1, Math.floor(Number(p.rank) || 1))), isOriginTrait: Boolean(p.isOriginTrait) })),
    special: { charisma: Math.min(10, Math.max(0, Number(input?.special?.charisma || input?.special?.CHA || 0))) },
  };
}
