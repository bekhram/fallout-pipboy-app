export function officeRooms(settlement) {
  return (settlement.buildings || []).flatMap(building =>
    (building.rooms || []).filter(room => room.type === 'office' && room.state === 'active')
      .map(room => ({ buildingId: building.id, roomId: room.id, role: room.officeRole || '' }))
  );
}

export function hasMayorOffice(settlement) {
  return officeRooms(settlement).some(office => office.role === 'mayor');
}

export function hasTradeOffice(settlement) {
  return officeRooms(settlement).some(office => office.role === 'trade');
}

export function storeHasOffice(settlement, storeId) {
  return officeRooms(settlement).some(office => office.role === `store:${storeId}`);
}

export function setOfficeRole(settlement, buildingId, roomId, role = '') {
  const normalized = String(role || '');
  const valid = normalized === '' || normalized === 'mayor' || normalized === 'trade' || /^store:[a-zA-Z0-9_:-]+$/.test(normalized);
  if (!valid) throw new Error('INVALID_OFFICE_ROLE');
  let found = false;
  const buildings = (settlement.buildings || []).map(building => ({
    ...building,
    rooms: (building.rooms || []).map(room => {
      if (building.id === buildingId && room.id === roomId) {
        if (room.type !== 'office' || room.state !== 'active') throw new Error('INVALID_OFFICE');
        found = true;
        return { ...room, officeRole: normalized || null };
      }
      if (normalized && room.type === 'office' && room.officeRole === normalized) return { ...room, officeRole: null };
      return room;
    }),
  }));
  if (!found) throw new Error('INVALID_OFFICE');
  return { ...settlement, buildings };
}

export function setMayorBonusAction(settlement, workerId, action = '') {
  if (!hasMayorOffice(settlement)) throw new Error('MAYOR_OFFICE_REQUIRED');
  if (workerId && !(settlement.settlers || []).some(worker => worker.id === workerId)) throw new Error('NOT_FOUND');
  return {
    ...settlement,
    settlers: (settlement.settlers || []).map(worker => ({
      ...worker,
      bonusSettlementAction: worker.id === workerId && action ? { type: action } : null,
    })),
  };
}

export function dailyActionTypes(settlement) {
  const actions = [];
  for (const worker of settlement.settlers || []) {
    if (worker.settlementAction?.type) actions.push({ workerId: worker.id, bonus: false, action: worker.settlementAction });
    if (worker.bonusSettlementAction?.type && hasMayorOffice(settlement)) actions.push({ workerId: worker.id, bonus: true, action: worker.bonusSettlementAction });
  }
  return actions;
}
