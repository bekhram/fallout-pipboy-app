import { SETTLEMENT_BUILDINGS } from '../../data/settlement/buildings.js';

const CELL = 40;
// Reuse existing site and building textures. No sprites or textures are created
// per frame; structural changes replace a unit, progress only changes its reveal.
export class SettlementBuildingVisuals {
  constructor(scene, layer) {
    this.scene = scene; this.layer = layer; this.units = new Map(); this.bounds = new Map();
    scene.events.once('shutdown', () => this.destroy());
  }
  sync(settlement, view) {
    const ids = new Set((settlement.buildings || []).map(b => b.id));
    for (const [id, unit] of this.units) if (!ids.has(id)) { unit.root.destroy(); this.units.delete(id); this.bounds.delete(id); }
    for (const b of settlement.buildings || []) {
      const def = SETTLEMENT_BUILDINGS[b.type];
      if (!def) continue;
      const construction = view.byBuilding[b.id];
      const mode = b.state === 'construction' ? 'new' : construction ? 'interior' : 'ready';
      const condition = Math.max(0, Math.min(100, Number(b.condition ?? 100)));
      const damageStage = condition <= 0 || b.state === 'destroyed' ? 3 : condition < 40 ? 2 : condition < 80 ? 1 : 0;
      const repairing = Boolean(b.repair);
      const signature = JSON.stringify([b.type, b.x, b.y, mode, damageStage, repairing]);
      let unit = this.units.get(b.id);
      if (!unit || unit.signature !== signature) {
        unit?.root.destroy();
        const root = this.scene.add.container(0, 0); this.layer.add(root);
        const w = def.footprint.width * CELL, h = def.footprint.height * CELL;
        const x = (b.x + def.footprint.width / 2) * CELL, y = (b.y + def.footprint.height) * CELL;
        const image = (key, factor = 1) => {
          if (!this.scene.textures.exists(key)) return null;
          const sprite = this.scene.add.image(x, y, key).setOrigin(.5, 1);
          sprite.setScale(Math.min(w * 1.3 / sprite.width, h * 1.3 / sprite.height) * factor);
          root.add(sprite); return sprite;
        };
        const ready = image(def.asset);
        const site = mode !== 'ready' ? image(`construction-${def.constructionSize || 'medium'}`, mode === 'interior' ? .42 : 1) : null;
        if (!ready && !site) root.add(this.scene.add.rectangle(x, y - h / 2, w, h, 0x477959));
        if (mode === 'new' && ready && site) {
          // Site below the progressively revealed building.
          root.remove(site); root.addAt(site, 0);
        }
        const scaffold = this.scene.add.graphics(); root.add(scaffold);
        const half = Math.min(w * .46, 60), top = y - Math.min(h * .75, 100);
        scaffold.lineStyle(2, 0xc7a574, .9);
        scaffold.lineBetween(x-half, y, x-half, top).lineBetween(x+half, y, x+half, top);
        scaffold.lineBetween(x-half, top, x+half, top).lineBetween(x-half, y-8, x+half, top+8);
        scaffold.setVisible(false);
        const damage = this.scene.add.graphics(); root.add(damage);
        const smoke = this.scene.add.text(x, y - Math.min(h * .9, 100), '', { fontSize:'22px', color:'#c6c6b6', backgroundColor:'#1a201acc', padding:{x:3,y:1} }).setOrigin(.5);
        root.add(smoke);
        const repairBadge = this.scene.add.text(x, y - Math.min(h * .65, 74), '', { fontSize:'16px', color:'#ffe2a1', backgroundColor:'#102319ee', padding:{x:4,y:2} }).setOrigin(.5);
        root.add(repairBadge);
        unit = { root, ready, site, scaffold, damage, smoke, repairBadge, signature, mode };
        this.units.set(b.id, unit);
        this.bounds.set(b.id, { top: Math.min(ready ? ready.y-ready.displayHeight : b.y*CELL, site ? site.y-site.displayHeight : b.y*CELL) });
      }
      const stage = construction?.stage || 'site';
      if (typeof unit.damage?.clear === 'function') unit.damage.clear();
      if (damageStage > 0 && typeof unit.damage?.fillStyle === 'function' && typeof unit.damage?.lineStyle === 'function') {
        const defn = SETTLEMENT_BUILDINGS[b.type], w = defn.footprint.width * CELL, h = defn.footprint.height * CELL;
        const x = (b.x + defn.footprint.width / 2) * CELL, y = (b.y + defn.footprint.height) * CELL;
        unit.damage.fillStyle(0x111111, damageStage === 1 ? .18 : damageStage === 2 ? .34 : .52).fillRect(x-w/2, y-h, w, h);
        unit.damage.lineStyle(2, 0x2d2a24, .85);
        unit.damage.lineBetween(x-w*.28,y-h*.82,x-w*.06,y-h*.52);
        unit.damage.lineBetween(x-w*.06,y-h*.52,x+w*.18,y-h*.67);
        if (damageStage >= 2) unit.damage.lineBetween(x+w*.22,y-h*.92,x+w*.02,y-h*.36);
      }
      unit.smoke?.setText(damageStage >= 3 ? '☁' : damageStage === 2 ? '·☁' : '').setVisible(damageStage >= 2);
      unit.repairBadge?.setText(repairing ? '🛠' : '').setVisible(repairing);
      if (mode === 'new') {
        unit.site?.setAlpha(stage === 'site' ? 1 : stage === 'frame' ? .9 : .45);
        if (unit.ready) {
          const fraction = stage === 'site' ? 0 : stage === 'frame' ? .5 : .9;
          unit.ready.setVisible(fraction > 0).setAlpha(.85);
          unit.ready.setCrop(0, unit.ready.height * (1-fraction), unit.ready.width, unit.ready.height * fraction);
        }
        unit.scaffold.setVisible(stage !== 'site');
      } else {
        unit.ready?.setVisible(true).setAlpha(1).setCrop();
        unit.site?.setAlpha(.9);
        // Working rooms/upgrades do not hide an already functioning parent.
        unit.scaffold.setVisible(mode === 'interior');
      }
    }
    return this.bounds;
  }
  destroy() { for (const unit of this.units.values()) unit.root.destroy(); this.units.clear(); this.bounds.clear(); }
}
