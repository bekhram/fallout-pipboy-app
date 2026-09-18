import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE, settlementBuildingName } from '../../data/settlement/buildings.js';
import { SETTLEMENT_ACTIONS } from '../../data/settlement/rulebook.js';
import { getRulebookBuilding } from '../../data/settlement/rulebookCatalog.js';
import { resolveSettlementPower } from '../../utils/settlementPower.js';
import { resolveSettlementWorkplaces } from '../../utils/settlementWorkplaces.js';
import { tasks, assignedKey } from '../../utils/settlementDevelopment.js';
import { createWorkerWorld, resolveWorkerJob } from '../../utils/settlementWorkerRuntime.js';
import { SettlementWorkerActor } from './SettlementWorkerActor.js';

// One actor per saved settler. No network calls, timers or simulation writes.
export class SettlementResidents {
  constructor(scene) {
    this.scene = scene;
    this.units = new Map();
    this.motion = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
    this.reduced = Boolean(this.motion?.matches);
    this.onMotion = event => { this.reduced = event.matches; this.inputSignature = null; if (this.settlement) this.sync(this.settlement, this.language); };
    this.motion?.addEventListener?.('change', this.onMotion);
    scene.events?.once('shutdown', () => this.destroy());
  }

  sync(settlement, language = 'en') {
    if (this.destroyed) return;
    this.settlement = settlement; this.language = language;
    const residents = Array.isArray(settlement.settlers) ? settlement.settlers : [];
    const buildings = Array.isArray(settlement.buildings) ? settlement.buildings : [];
    // Hover/zoom changes call sync too. They must not restart paths or do pathfinding.
    const worldSignature = JSON.stringify([settlement.id, buildings.map(b =>
      [b.id, b.type, b.x, b.y, b.state, b.condition, b.autoDisabled, b.upgrade?.state, b.upgrade?.targetType, (b.rooms || []).map(r => [r.id, r.state])])]);
    const signature = JSON.stringify([worldSignature, language, this.reduced,
      residents.map(r => [r.id, r.name, r.settlementAction, r.assignedBuildingId])]);
    if (this.inputSignature === signature) return;
    if (this.settlementId !== settlement.id) {
      for (const unit of this.units.values()) unit.destroy();
      this.units.clear(); this.settlementId = settlement.id;
    }
    const worldChanged = this.worldSignature !== worldSignature;
    if (worldChanged || !this.world) {
      const power = resolveSettlementPower(settlement);
      this.world = createWorkerWorld(buildings.map(b => ({ ...b,
        footprint: SETTLEMENT_BUILDINGS[b.type]?.footprint,
        effects: getRulebookBuilding(b.type)?.effects || {},
        powered: power.poweredBuildingIds.has(b.id),
      })), SETTLEMENT_GRID_SIZE);
      this.worldSignature = worldSignature;
    }
    const ids = new Set(residents.map(r => r.id));
    for (const [id, unit] of this.units) if (!ids.has(id)) { unit.destroy(); this.units.delete(id); }
    const workplacePlan = resolveSettlementWorkplaces(settlement);
    const queue = tasks(settlement);
    const ordered = [...residents].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    ordered.forEach((resident, index) => {
      let unit = this.units.get(resident.id);
      if (!unit) { unit = new SettlementWorkerActor(this.scene, index); this.units.set(resident.id, unit); }
      const allocation = workplacePlan.byWorker[resident.id];
      const production = resident.settlementAction?.type && resident.settlementAction.type !== 'build';
      // Derived automatic sites are local presentation inputs, never saved to the campaign.
      let visualResident = production && allocation?.active && allocation.buildingId
        ? { ...resident, settlementAction: { ...resident.settlementAction, targetBuildingId: allocation.buildingId } } : resident;
      let jobWorld = this.world;
      if (resident.settlementAction?.type === 'build') {
        // Match the existing construction queue, including its automatic fallback.
        const task = queue.find(t => t.key === assignedKey(resident)) || queue[0];
        if (task) {
          visualResident = { ...resident, settlementAction: task.kind === 'room'
            ? { type:'build', parentBuildingId:task.buildingId, targetRoomId:task.roomId }
            : { type:'build', targetBuildingId:task.buildingId } };
          if (task.kind === 'upgrade') jobWorld = { ...this.world, buildings:this.world.buildings.map(b =>
            b.id === task.buildingId ? { ...b, state:'construction' } : b) };
        }
      }
      let job = resolveWorkerJob(jobWorld, visualResident, index, unit.state);
      if (production && allocation && !allocation.active) job = { ...job, kind:'waiting', reason:allocation.reason || 'unavailable' };
      const definition = SETTLEMENT_ACTIONS[job.action];
      const target = buildings.find(b => b.id === job.targetId);
      const targetDefinition = target && SETTLEMENT_BUILDINGS[target.type];
      unit.configure(this.world, job, {
        resident, language, reduced: this.reduced, reset: worldChanged,
        actionName: definition?.name?.[language] || definition?.name?.en || '',
        targetName: targetDefinition ? settlementBuildingName(targetDefinition, language) : '',
      });
    });
    this.inputSignature = signature;
  }

  update(time, delta) {
    if (this.destroyed) return;
    for (const unit of this.units.values()) unit.update(time, delta);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.motion?.removeEventListener?.('change', this.onMotion);
    for (const unit of this.units.values()) unit.destroy();
    this.units.clear();
  }
}
