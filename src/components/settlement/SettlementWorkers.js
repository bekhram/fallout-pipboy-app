import { SettlementWorker } from './SettlementWorker.js';
import { getSettlementResidents } from '../../utils/settlementPopulation.js';

export class SettlementWorkers {
  constructor(scene, cellSize) {
    this.scene = scene;
    this.cellSize = cellSize;
    this.actors = new Map();
  }

  sync(settlement) {
    if (this.settlementId !== settlement.id) {
      this.destroy();
      this.settlementId = settlement.id;
    }
    const residents = getSettlementResidents(settlement);
    const ids = new Set(residents.map(person => person.id));
    for (const [id, actor] of this.actors) {
      if (!ids.has(id)) { actor.destroy(); this.actors.delete(id); }
    }
    const slots = new Set([...this.actors.values()].map(actor => actor.slot));
    for (const person of residents) {
      let actor = this.actors.get(person.id);
      if (!actor) {
        let slot = 0;
        while (slots.has(slot)) slot++;
        slots.add(slot);
        actor = new SettlementWorker(this.scene, this.cellSize, slot);
        this.actors.set(person.id, actor);
      }
      actor.sync(settlement, person);
    }
  }

  update(delta) { for (const actor of this.actors.values()) actor.update(delta); }

  destroy() {
    for (const actor of this.actors.values()) actor.destroy();
    this.actors.clear();
  }
}
