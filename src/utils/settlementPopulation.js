// Shared by the residents counter and cosmetic actors, including legacy saves.
export function getSettlementPopulation(settlement) {
  if (Array.isArray(settlement.settlers) && settlement.settlers.length) return settlement.settlers.length;
  const value = Number(settlement.attributes?.people ?? settlement.resources?.population ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function getSettlementResidents(settlement) {
  if (Array.isArray(settlement.settlers) && settlement.settlers.length) return settlement.settlers;
  // Older saves may have a population counter without individual resident records.
  return Array.from({ length: getSettlementPopulation(settlement) }, (_, index) => ({
    id: `legacy-resident-${index}`, health: 100, settlementAction: null,
  }));
}
