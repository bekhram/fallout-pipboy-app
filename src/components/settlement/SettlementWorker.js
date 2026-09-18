import pawnUrl from '../../assets/settlement/workers/pawn-blue.png';
import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE } from '../../data/settlement/buildings.js';
import { workerGrid, workerCellFree, workerPath, workerWorkPoints } from '../../utils/settlementWorkerPath.js';

const TEXTURE = 'settlement-pawn-blue';
const ANIMATIONS = { idle: [0, 5], walk: [6, 11], build: [12, 17] };

export function preloadSettlementWorker(scene) {
  scene.load.spritesheet(TEXTURE, pawnUrl, { frameWidth: 192, frameHeight: 192 });
}

// One ambient worker for the first integration. Never modifies settlement data.
export class SettlementWorker {
  constructor(scene, cellSize) {
    this.scene = scene;
    this.cellSize = cellSize;
    this.route = [];
    this.wait = 800;
    this.atWork = false;
    this.signature = null;
    for (const [name, [start, end]] of Object.entries(ANIMATIONS)) {
      const key = `${TEXTURE}-${name}`;
      if (!scene.anims.exists(key)) scene.anims.create({
        key, frames: scene.anims.generateFrameNumbers(TEXTURE, { start, end }), frameRate: 10, repeat: -1,
      });
    }
    // The figure occupies only the central ~64 px of each 192 px frame.
    this.sprite = scene.add.sprite(0, 0, TEXTURE).setOrigin(.5, .65).setScale(cellSize / 96).setVisible(false);
    this.play('idle');
  }

  play(name) { this.sprite.play(`${TEXTURE}-${name}`, true); }

  sync(settlement) {
    const person = (settlement.settlers || []).find(p => Number(p.health ?? 100) > 0);
    const buildings = (settlement.buildings || []).filter(b => SETTLEMENT_BUILDINGS[b.type]);
    const action = person?.settlementAction;
    const targetId = action?.targetBuildingId || action?.parentBuildingId || person?.assignedBuildingId;
    const signature = JSON.stringify([settlement.id, person?.id, targetId, buildings.map(b => [b.id, b.type, b.x, b.y, b.state])]);
    if (signature === this.signature) return;
    const changedSettlement = this.settlementId !== settlement.id;
    this.settlementId = settlement.id;
    this.signature = signature;
    this.grid = workerGrid(buildings, SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE);
    const headquarters = buildings.find(b => b.type === 'settlement_hq') || buildings[0];
    this.homePoints = workerWorkPoints(headquarters, SETTLEMENT_BUILDINGS[headquarters?.type], this.grid);
    this.route = [];
    this.atWork = false;
    this.wait = 800;
    this.play('idle');
    if (!person || !this.homePoints.length) { this.sprite.setVisible(false); return; }
    if (changedSettlement || !this.cell || !workerCellFree(this.grid, this.cell)) this.cell = this.homePoints[0];
    // Re-anchor only when the layout changes, never on hover or camera updates.
    this.place(this.cell);
    this.sprite.setVisible(true);
    const assigned = buildings.find(b => b.id === targetId);
    const candidates = assigned ? [assigned] : [
      ...buildings.filter(b => b.state === 'construction'),
      ...buildings.filter(b => b.type === 'workshop' && b.state === 'active'),
    ];
    this.workPoints = [];
    for (const target of candidates) {
      const points = workerWorkPoints(target, SETTLEMENT_BUILDINGS[target.type], this.grid);
      if (workerPath(this.grid, this.cell, points) !== null) {
        this.workPoints = points;
        this.canBuild = target.state === 'construction' || target.type === 'workshop';
        break;
      }
    }
  }

  place(cell) {
    this.sprite.setPosition((cell.x + .5) * this.cellSize, (cell.y + .5) * this.cellSize);
    this.sprite.setDepth(this.sprite.y + 1);
  }

  update(delta) {
    if (!this.sprite.visible) return;
    const dt = Math.min(delta, 100); // Returning to the tab must not teleport the worker.
    if (this.route.length) {
      const next = this.route[0];
      const x = (next.x + .5) * this.cellSize, y = (next.y + .5) * this.cellSize;
      const dx = x - this.sprite.x, dy = y - this.sprite.y;
      const distance = Math.hypot(dx, dy), step = this.cellSize * 1.4 * dt / 1000;
      if (dx) this.sprite.setFlipX(dx < 0);
      this.play('walk');
      if (distance <= step) {
        this.cell = next;
        this.place(next);
        this.route.shift();
        if (!this.route.length) this.arrive();
      } else {
        this.sprite.x += dx / distance * step;
        this.sprite.y += dy / distance * step;
        this.sprite.setDepth(this.sprite.y + 1);
      }
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    const goals = this.atWork ? this.homePoints : this.workPoints;
    const route = workerPath(this.grid, this.cell, goals || []);
    if (route === null) { this.play('idle'); this.wait = 2500; return; }
    this.atWork = !this.atWork;
    this.route = route;
    if (!route.length) this.arrive();
  }

  arrive() {
    this.play(this.atWork && this.canBuild ? 'build' : 'idle');
    this.wait = this.atWork ? 5000 : 2000;
  }

  destroy() { this.sprite.destroy(); }
}
