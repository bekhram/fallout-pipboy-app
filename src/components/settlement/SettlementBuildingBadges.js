import { SETTLEMENT_BUILDINGS, settlementBuildingName } from '../../data/settlement/buildings.js';
import { resolveSettlementWorkplaces } from '../../utils/settlementWorkplaces.js';
import { settlerActionBonus } from '../../utils/settlementSettlerProfile.js';
import { buildingIndicators } from './workplaceIndicators.js';
import { workplaceCopy } from './workplaceCopy.js';
import { constructionCopy, constructionDuration } from './constructionCopy.js';

const PRODUCTION_COPY = {
  en:{day:'/day',common:'Common',uncommon:'Uncommon',damage:'damage',effects:'Effects',needsWorker:'needs worker',income:'income'},
  ru:{day:'/день',common:'обычных',uncommon:'необычных',damage:'урон',effects:'эффекты',needsWorker:'нужен работник',income:'доход'},
  uk:{day:'/день',common:'звичайних',uncommon:'незвичайних',damage:'шкода',effects:'ефекти',needsWorker:'потрібен працівник',income:'дохід'},
  pl:{day:'/dzień',common:'pospolite',uncommon:'niepospolite',damage:'obrażenia',effects:'Efekty',needsWorker:'potrzebny pracownik',income:'dochód'},
};
function productionDetail(settlement,plan,site,language){
  const code=String(language||'en').split('-')[0],t=PRODUCTION_COPY[code]||PRODUCTION_COPY.en;
  if(site.action==='scavenging'){
    const workers=(settlement.settlers||[]).filter(w=>w.settlementAction?.type==='scavenging'&&plan.byWorker[w.id]?.active);
    if(!workers.length)return '0 CD '+t.day+' · '+t.needsWorker;
    const skillDice=workers.reduce((sum,w)=>sum+settlerActionBonus(w,'scavenging').skillBonus,0);
    const pool=3+Math.max(0,workers.length-1)+skillDice;
    const scrapper=workers.filter(w=>settlerActionBonus(w,'scavenging').hasPerk).length;
    return pool+' CD '+t.day+' → '+t.damage+'='+t.common+(scrapper?' +'+scrapper+' Common':'')+' · '+t.effects+'='+t.uncommon;
  }
  if(site.action==='business'){
    if(!site.workerIds.length)return '0 '+t.income+' '+t.day+' · '+t.needsWorker;
    const workers=(settlement.settlers||[]).filter(w=>site.workerIds.includes(w.id));
    const skill=workers.reduce((sum,w)=>sum+settlerActionBonus(w,'business').skillBonus,0);
    const trader=workers.filter(w=>settlerActionBonus(w,'business').hasPerk).length;
    return '+'+(Number(site.income||0)+skill+trader)+' '+t.income+' '+t.day;
  }
  return '';
}
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
        const construction = this.scene.add.container(0, 0).setVisible(false);
        const plate = this.scene.add.rectangle(0, 27, 86, 32, 0x102319, .97);
        const caption = this.scene.add.text(0, 20, '', { fontFamily:'Arial, sans-serif', fontSize:'11px', color:'#e2f3bb' }).setOrigin(.5);
        const track = this.scene.add.rectangle(-36, 34, 72, 4, 0x41533d).setOrigin(0, .5);
        const fill = this.scene.add.rectangle(-36, 34, 72, 4, 0xb9d89a).setOrigin(0, .5);
        construction.add([plate, caption, track, fill]);
        const tooltip = this.scene.add.text(0, 19, '', { fontSize:'12px', color:'#e2f3bb', backgroundColor:'#102319f5', padding:{x:7,y:5}, wordWrap:{width:210} }).setOrigin(.5, 0).setVisible(false);
        root.add([disc, icon, status, construction, tooltip]);
        // A tap selects the existing building card; dragging still pans the map.
        for (const target of [disc, icon, plate]) {
          target.setInteractive();
          target.on('pointerover', () => { tooltip.setVisible(true); root.setDepth(250); });
          target.on('pointerout', () => { tooltip.setVisible(false); root.setDepth(50); });
          target.on('pointerdown', pointer => { unit.down = {x:pointer.x,y:pointer.y}; });
          target.on('pointerup', pointer => {
            if (unit.down && Math.hypot(pointer.x-unit.down.x,pointer.y-unit.down.y) <= 8) this.onSelect(b.id);
            unit.down = null;
          });
        }
        unit = {root, disc, icon, status, tooltip, construction, caption, fill}; this.units.set(b.id, unit);
      }
      const indicators = buildingIndicators(b, site);
      const noStaff = site.state === 'active' && ['tend_crops','business','trade_caravan'].includes(site.action) && !site.workerIds.length;
      unit.icon.setText(indicators[0].symbol);
      unit.baseStatus = site.state === 'construction' ? '⚒' : site.state !== 'active' || noStaff ? '!' : '';
      unit.status.setText(unit.baseStatus);
      unit.disc.setStrokeStyle(1.5, site.state !== 'active' || noStaff ? 0xe4b578 : 0xb9d89a);
      const lines = indicators.map(i => `${text[i.kind]}${i.amount !== null ? `: ${i.amount}` : ''}${i.mode === 'daily' ? ` · ${text.daily}` : i.mode === 'rating' ? ` · ${text.rating}` : i.mode === 'roll' ? ` · ${text.roll}` : ''}`);
      const production = productionDetail(settlement,plan,site,language);
      unit.baseTooltip = [settlementBuildingName(def, language), production, ...lines, noStaff ? text.none : text[site.state], `${text.workers}: ${site.workerIds.length}`].filter(Boolean).join('\n');
      unit.tooltip.setText(unit.baseTooltip);
      const bound = bounds.get(b.id);
      unit.anchorX = (b.x + def.footprint.width/2) * 40;
      unit.anchorY = (bound?.top ?? b.y * 40) - 8;
    }
    this.resize();
  }
  updateConstruction(view, language) {
    const text = constructionCopy(language);
    for (const [id, unit] of this.units) {
      const group = view.byBuilding[id];
      unit.hasConstruction = Boolean(group);
      unit.construction.setVisible(Boolean(group));
      if (!group) { unit.tooltip.setText(unit.baseTooltip); unit.status.setText(unit.baseStatus); continue; }
      const marker = group.state === 'confirming' ? '…' : group.state === 'waiting' ? '!' : '⚒';
      unit.status.setText(marker);
      unit.caption.setText(`${group.percent}% · ${group.workers} ⚒`);
      unit.fill.setScale(group.ratio, 1);
      unit.fill.setFillStyle(group.state === 'building' ? 0xb9d89a : 0xe4b578);
      const detail = group.tasks.length === 1 && group.tasks[0].etaMs !== null
        ? `${text.eta}: ${constructionDuration(group.tasks[0].etaMs, language)} · ${text.crew}`
        : group.tasks.length > 1 ? `${text.multiple}: ${group.tasks.length}` : '';
      unit.tooltip.setText([unit.baseTooltip, `${text.title}: ${group.percent}%`, `${text.workers}: ${group.workers}`, text[group.state], text[group.stage], detail].filter(Boolean).join('\n'));
    }
    this.resize();
  }
  resize() {
    const camera = this.scene.cameras.main, zoom = Math.max(.05, camera.zoom);
    for (const unit of this.units.values()) {
      const gap = unit.hasConstruction ? 49 : 13;
      unit.root.setScale(1 / zoom).setPosition(unit.anchorX, Math.max(16 / zoom, unit.anchorY - gap / zoom));
      const screenX = (unit.anchorX - camera.scrollX) * zoom;
      const below = unit.hasConstruction ? 47 : 19;
      const screenY = (unit.root.y - camera.scrollY) * zoom;
      const above = screenY + below + unit.tooltip.height > this.scene.scale.height && screenY > unit.tooltip.height + 20;
      unit.tooltip.setPosition(0, above ? -19 : below).setOrigin(screenX < 120 ? 0 : screenX > this.scene.scale.width-120 ? 1 : .5, above ? 1 : 0);
    }
  }
  destroy() { for (const unit of this.units.values()) unit.root.destroy(); this.units.clear(); }
}
