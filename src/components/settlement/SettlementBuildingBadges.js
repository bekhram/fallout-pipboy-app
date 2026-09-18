import { SETTLEMENT_BUILDINGS, settlementBuildingName } from '../../data/settlement/buildings.js';
import { resolveSettlementWorkplaces } from '../../utils/settlementWorkplaces.js';
import { buildingIndicators } from './workplaceIndicators.js';
import { workplaceCopy } from './workplaceCopy.js';

// Screen-sized badges anchored to world buildings. They never intercept map drags.
export class SettlementBuildingBadges {
  constructor(scene, onSelect) {
    this.scene = scene; this.onSelect = onSelect; this.units = new Map();
    scene.events.once('shutdown', () => this.destroy());
  }
  sync(settlement, language, bounds = new Map()) {
    const signature = JSON.stringify([settlement.id, language, settlement.buildings, (settlement.settlers || []).map(w => [w.id, w.settlementAction])]);
    if (signature === this.signature) { this.resize(); return; }
    this.signature = signature;
    const plan = resolveSettlementWorkplaces(settlement), text = workplaceCopy(language);
    const ids = new Set((settlement.buildings || []).map(b => b.id));
    for (const [id, unit] of this.units) if (!ids.has(id)) { unit.root.destroy(); this.units.delete(id); }
    for (const b of settlement.buildings || []) {
      const def = SETTLEMENT_BUILDINGS[b.type], site = plan.byBuilding[b.id];
      if (!def || !site) continue;
      let unit = this.units.get(b.id);
      if (!unit) {
        const root = this.scene.add.container(0, 0).setDepth(50);
        const disc = this.scene.add.circle(0, 0, 13, 0x102319, .97).setStrokeStyle(1.5, 0xb9d89a);
        const icon = this.scene.add.text(0, 0, '', { fontFamily:'Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif', fontSize:'20px', color:'#e2f3bb' }).setOrigin(.5);
        const status = this.scene.add.text(12, -12, '', { fontSize:'12px', color:'#ffd29b', backgroundColor:'#152219', padding:{x:2,y:1} }).setOrigin(.5);
        const tooltip = this.scene.add.text(0, 19, '', { fontSize:'12px', color:'#e2f3bb', backgroundColor:'#102319f5', padding:{x:7,y:5}, wordWrap:{width:210} }).setOrigin(.5, 0).setVisible(false);
        root.add([disc, icon, status, tooltip]);
        // A tap selects the existing building card; dragging still pans the map.
        for (const target of [disc, icon]) {
          target.setInteractive();
          target.on('pointerover', () => { tooltip.setVisible(true); root.setDepth(250); });
          target.on('pointerout', () => { tooltip.setVisible(false); root.setDepth(50); });
          target.on('pointerdown', pointer => { unit.down = {x:pointer.x,y:pointer.y}; });
          target.on('pointerup', pointer => {
            if (unit.down && Math.hypot(pointer.x-unit.down.x,pointer.y-unit.down.y) <= 8) this.onSelect(b.id);
            unit.down = null;
          });
        }
        unit = {root, disc, icon, status, tooltip}; this.units.set(b.id, unit);
      }
      const indicators = buildingIndicators(b, site);
      const noStaff = site.state === 'active' && ['tend_crops','business','trade_caravan'].includes(site.action) && !site.workerIds.length;
      unit.icon.setText(indicators[0].symbol);
      unit.status.setText(site.state === 'construction' ? '⚒' : site.state !== 'active' || noStaff ? '!' : '');
      unit.disc.setStrokeStyle(1.5, site.state !== 'active' || noStaff ? 0xe4b578 : 0xb9d89a);
      const lines = indicators.map(i => `${text[i.kind]}${i.amount !== null ? `: ${i.amount}` : ''}${i.mode === 'daily' ? ` · ${text.daily}` : i.mode === 'rating' ? ` · ${text.rating}` : i.mode === 'roll' ? ` · ${text.roll}` : ''}`);
      unit.tooltip.setText([settlementBuildingName(def, language), ...lines, noStaff ? text.none : text[site.state], `${text.workers}: ${site.workerIds.length}`].join('\n'));
      const bound = bounds.get(b.id);
      unit.anchorX = (b.x + def.footprint.width/2) * 40;
      unit.anchorY = (bound?.top ?? b.y * 40) - 8;
    }
    this.resize();
  }
  resize() {
    const zoom = Math.max(.05, this.scene.cameras.main.zoom);
    for (const unit of this.units.values()) {
      unit.root.setScale(1 / zoom).setPosition(unit.anchorX, Math.max(16 / zoom, unit.anchorY - 13 / zoom));
      // Keep long descriptions inside the viewport instead of clipping at edges.
      const screenX = (unit.anchorX - this.scene.cameras.main.scrollX) * zoom;
      unit.tooltip.setOrigin(screenX < 120 ? 0 : screenX > this.scene.scale.width-120 ? 1 : .5, 0);
    }
  }
  destroy() { for (const unit of this.units.values()) unit.root.destroy(); this.units.clear(); }
}
