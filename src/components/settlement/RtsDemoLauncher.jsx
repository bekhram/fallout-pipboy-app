import React, { useState } from 'react';
import SettlementScreen from './SettlementScreen.jsx';
import { createSettlement } from '../../utils/settlementState.js';

function createDemo() {
  const base = createSettlement({ name: 'RTS Demo', regionId: 'commonwealth', worldX: 12, worldY: 12 });
  const now = Date.now();
  const active = (id, type, x, y) => ({
    id, type, x, y, rotation: 0, state: 'active', condition: 100,
    startedAt: now, completedAt: now, rooms: [],
  });
  const jobs = [
    { type: 'tend_crops', targetBuildingId: 'demo_farm' },
    { type: 'guard', targetBuildingId: 'demo_guard' },
    { type: 'scavenging' },
    { type: 'hunting_gathering' },
  ];
  const names = ['Mara', 'Boone', 'Ada', 'Cooper'];
  return {
    ...base,
    name: 'RTS Demo',
    buildings: [
      ...(base.buildings || []),
      active('demo_farm', 'crop_field', 3, 3),
      active('demo_water', 'water_pump', 8, 3),
      active('demo_generator', 'generator', 17, 3),
      active('demo_guard', 'guard_post', 3, 17),
      active('demo_workshop', 'workshop', 17, 17),
    ],
    stockpile: {
      ...(base.stockpile || {}),
      materials: { common: 250, uncommon: 40, rare: 10 },
      provisions: { food: 20, water: 20 },
    },
    resources: { ...(base.resources || {}), caps: 500, materials: 250 },
    settlers: (base.settlers || []).map((settler, index) => ({
      ...settler,
      name: names[index] || settler.name,
      settlementAction: jobs[index] || null,
      assignedBuildingId: jobs[index]?.targetBuildingId || null,
      status: jobs[index] ? 'working' : 'idle',
    })),
  };
}

export default function RtsDemoLauncher({ onExit }) {
  const [settlement, setSettlement] = useState(createDemo);
  return <SettlementScreen
    settlement={settlement}
    canEdit
    onUpdate={update => setSettlement(current => typeof update === 'function' ? update(current) : update)}
    onBack={onExit}
  />;
}
