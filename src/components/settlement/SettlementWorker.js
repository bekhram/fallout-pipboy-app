import { SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE } from '../../data/settlement/buildings.js';
import { workerGrid, workerCellFree, workerPath, workerWorkPoints } from '../../utils/settlementWorkerPath.js';

const TEXTURE = 'settlement-pawn-blue';
const ANIMATIONS = { idle: [0, 5], walk: [6, 11], build: [12, 17], chop: [18, 23], carryIdle: [24, 29], carryWalk: [30, 35] };
const GATHER = ['scavenging', 'hunting_gathering'];

export function preloadSettlementWorker(scene, pawnUrl) {
  scene.load.spritesheet(TEXTURE, pawnUrl, { frameWidth: 192, frameHeight: 192 });
}

// One cosmetic actor. Animation never awards resources or advances construction.
export class SettlementWorker {
  constructor(scene, cellSize) {
    this.scene = scene;
    this.cellSize = cellSize;
    this.route = [];
    this.signature = null;
    this.clock = 0;
    for (const [name, [start, end]] of Object.entries(ANIMATIONS)) {
      const key = `${TEXTURE}-${name}`;
      if (!scene.anims.exists(key)) scene.anims.create({
        key, frames: scene.anims.generateFrameNumbers(TEXTURE, { start, end }), frameRate: 10, repeat: -1,
      });
    }
    this.sprite = scene.add.sprite(0, 0, TEXTURE).setOrigin(.5, .65).setScale(cellSize / 96).setVisible(false);
    // Carry poses intentionally have empty hands: a separate crate follows them.
    this.cargo = scene.add.graphics().setScale(cellSize / 40).setVisible(false);
    this.cargo.fillStyle(0x89603a).fillRect(-7, -5, 14, 10);
    this.cargo.lineStyle(1.5, 0xd7b47b).strokeRect(-7, -5, 14, 10).lineBetween(-6, -4, 6, 4);
    this.materials = scene.add.graphics().setScale(cellSize / 40).setVisible(false);
    this.materials.fillStyle(0x795437).fillRect(-7, -3, 13, 5).fillRect(-4, -7, 12, 5);
    this.materials.lineStyle(1, 0xc6a06a).lineBetween(-6, -1, 5, -1).lineBetween(-3, -5, 7, -5);
    this.setPhase('rest');
  }

  play(name) { this.sprite.play(`${TEXTURE}-${name}`, true); }

  setPhase(phase) {
    this.phase = phase;
    this.carrying = (this.job === 'build' && ['loading', 'outbound', 'delivery'].includes(phase))
      || (this.job === 'gather' && ['pickup', 'inbound', 'unloading'].includes(phase));
    const moving = ['outbound', 'inbound', 'returning'].includes(phase);
    this.play(moving ? (this.carrying ? 'carryWalk' : 'walk')
      : this.carrying ? 'carryIdle' : phase === 'work' ? this.workAnimation : 'idle');
    this.wait = phase === 'work' ? 3600 : phase === 'rest' ? 1800 : 650;
    this.updateCargo();
  }

  sync(settlement) {
    const person = (settlement.settlers || []).find(p => Number(p.health ?? 100) > 0);
    const buildings = (settlement.buildings || []).filter(b => SETTLEMENT_BUILDINGS[b.type]);
    const action = person?.settlementAction;
    const targetId = action?.targetBuildingId || action?.parentBuildingId || action?.targetUpgradeId || person?.assignedBuildingId;
    const signature = JSON.stringify([settlement.id, person?.id, action, targetId,
      buildings.map(b => [b.id, b.type, b.x, b.y, b.state, b.upgrade?.targetType,
        (b.rooms || []).filter(r => r.state === 'construction').map(r => r.id)])]);
    if (signature === this.signature) return;
    const changedSettlement = this.settlementId !== settlement.id;
    this.settlementId = settlement.id;
    this.signature = signature;
    this.grid = workerGrid(buildings, SETTLEMENT_BUILDINGS, SETTLEMENT_GRID_SIZE);
    const headquarters = buildings.find(b => b.type === 'settlement_hq') || buildings[0];
    this.homePoints = workerWorkPoints(headquarters, SETTLEMENT_BUILDINGS[headquarters?.type], this.grid);
    this.route = [];
    this.job = 'idle';
    this.workAnimation = 'idle';
    this.workPoints = [];
    this.materials.setVisible(false);
    this.setPhase('rest');
    if (!person || !this.homePoints.length) { this.sprite.setVisible(false); this.cargo.setVisible(false); return; }
    if (changedSettlement || !this.cell || !workerCellFree(this.grid, this.cell)) this.cell = this.homePoints[0];
    this.place(this.cell);
    this.sprite.setVisible(true);
    const assigned = buildings.find(b => b.id === targetId);
    const type = action?.type;
    const construction = b => b.state === 'construction' || b.upgrade || (b.rooms || []).some(r => r.state === 'construction');
    const candidates = assigned ? [assigned] : GATHER.includes(type) || type === 'guard' ? []
      : type === 'tend_crops' ? buildings.filter(b => ['crop_field', 'greenhouse'].includes(b.type) && b.state === 'active')
      : !type || type === 'build' ? [...buildings.filter(construction), ...buildings.filter(b => b.type === 'workshop' && b.state === 'active')]
      : [];
    for (const target of candidates) {
      // Separate stops ensure adjacent buildings cannot cause loading in place forever.
      const homeKeys = new Set(this.homePoints.map(p => `${p.x},${p.y}`));
      const points = workerWorkPoints(target, SETTLEMENT_BUILDINGS[target.type], this.grid)
        .filter(p => !homeKeys.has(`${p.x},${p.y}`));
      if (!points.length || workerPath(this.grid, this.cell, points) === null) continue;
      this.workPoints = points;
      this.job = construction(target) || target.type === 'workshop' || type === 'build' ? 'build'
        : ['crop_field', 'greenhouse'].includes(target.type) ? 'gather' : 'idle';
      this.workAnimation = this.job === 'build' ? 'build' : 'idle';
      break;
    }
    if (GATHER.includes(type)) {
      this.job = 'gather';
      this.workAnimation = 'chop';
      this.workPoints = this.freeDestination();
      if (this.workPoints.length) {
        const p = this.workPoints[0];
        this.materials.setPosition((p.x + .78) * this.cellSize, (p.y + .53) * this.cellSize)
          .setDepth((p.y + .5) * this.cellSize).setVisible(true);
      }
    } else if (type === 'guard' || (!type && !this.workPoints.length)) {
      this.job = 'patrol';
      this.workPoints = this.freeDestination();
    }
    this.setPhase('rest');
    if (!this.homePoints.some(p => p.x === this.cell.x && p.y === this.cell.y)) {
      this.travel('returning', this.homePoints);
    }
  }

  freeDestination() {
    // Pick a reachable outdoor stop; no route crosses a building footprint.
    const origin = this.homePoints[0], candidates = [];
    for (let y = 0; y < this.grid.size; y++) for (let x = 0; x < this.grid.size; x++) {
      const distance = Math.abs(x - origin.x) + Math.abs(y - origin.y);
      if (distance >= 4 && distance <= 7 && workerCellFree(this.grid, { x, y })) candidates.push({ x, y });
    }
    candidates.sort((a, b) => b.y - a.y || a.x - b.x);
    for (const p of candidates) if (workerPath(this.grid, this.cell, [p]) !== null) return [p];
    return [];
  }

  updateCargo() {
    const bob = this.route.length ? Math.sin(this.clock / 90) * this.cellSize * .025 : 0;
    this.cargo.setPosition(this.sprite.x, this.sprite.y - this.cellSize * .64 + bob)
      .setDepth(this.sprite.y + 2).setVisible(this.sprite.visible && this.carrying);
  }

  place(cell) {
    this.sprite.setPosition((cell.x + .5) * this.cellSize, (cell.y + .5) * this.cellSize);
    this.sprite.setDepth(this.sprite.y + 1);
    this.updateCargo();
  }

  travel(phase, goals) {
    const route = workerPath(this.grid, this.cell, goals);
    if (route === null || !route.length) { this.setPhase('rest'); return; }
    this.route = route;
    this.setPhase(phase);
  }

  update(delta) {
    if (!this.sprite.visible) return;
    const dt = Math.min(delta, 100);
    this.clock += dt;
    if (this.route.length) {
      const next = this.route[0];
      const x = (next.x + .5) * this.cellSize, y = (next.y + .5) * this.cellSize;
      const dx = x - this.sprite.x, dy = y - this.sprite.y;
      const distance = Math.hypot(dx, dy), step = this.cellSize * (this.carrying ? 1.1 : 1.4) * dt / 1000;
      if (dx) this.sprite.setFlipX(dx < 0);
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
      this.updateCargo();
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    switch (this.phase) {
      case 'rest':
        if (!this.workPoints.length) { this.wait = 2000; break; }
        if (this.job === 'build') this.setPhase('loading');
        else this.travel('outbound', this.workPoints);
        break;
      case 'loading': this.travel('outbound', this.workPoints); break;
      case 'delivery': this.setPhase('work'); break;
      case 'work':
        if (this.job === 'gather') this.setPhase('pickup');
        else this.travel('inbound', this.homePoints);
        break;
      case 'pickup': this.travel('inbound', this.homePoints); break;
      case 'unloading': this.setPhase('rest'); break;
    }
  }

  arrive() {
    if (this.phase === 'outbound') {
      if (this.workAnimation === 'chop') this.sprite.setFlipX(false);
      this.setPhase(this.job === 'build' ? 'delivery' : 'work');
    } else this.setPhase(this.phase === 'inbound' && this.job === 'gather' ? 'unloading' : 'rest');
  }

  destroy() { this.sprite.destroy(); this.cargo.destroy(); this.materials.destroy(); }
}
