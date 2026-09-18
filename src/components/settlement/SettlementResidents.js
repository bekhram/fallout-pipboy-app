import { residentWalkableCells, residentDestination, residentPath } from '../../utils/settlementResidentPaths.js';
import { SETTLEMENT_ACTIONS } from '../../data/settlement/rulebook.js';

const CELL = 40;
const COLORS = { build: 0xe5b563, tend_crops: 0x96bd63, guard: 0x92aaca, business: 0xc79ad1, scavenging: 0xb89b7b, hunting_gathering: 0x71b8a4, trade_caravan: 0xdcb47c };
const SYMBOLS = { build: '⚒', tend_crops: '♧', guard: '◇', business: '¢', scavenging: '⚙', hunting_gathering: '↗', trade_caravan: '↔' };

// Presentation only. Animation never changes the settlement's simulation or inventory.
export class SettlementResidents {
  constructor(scene) { this.scene = scene; this.units = new Map(); this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  sync(settlement, language) {
    this.settlement = settlement;
    const residents = settlement.settlers || [];
    const ids = new Set(residents.map(r => r.id));
    for (const [id, unit] of this.units) if (!ids.has(id)) { unit.container.destroy(); this.units.delete(id); }
    const signature = JSON.stringify((settlement.buildings || []).map(b => [b.id,b.type,b.x,b.y,b.state]));
    const changed = signature !== this.signature;
    if (changed) { this.cells = residentWalkableCells(settlement); this.signature = signature; }
    residents.forEach((resident, index) => {
      let unit = this.units.get(resident.id);
      const goal = residentDestination(settlement, resident, this.cells, index);
      if (!goal) { if (unit) unit.container.setVisible(false); return; }
      if (!unit) {
        const spawn = this.cells[index % this.cells.length];
        const container = this.scene.add.container((spawn.x+.5)*CELL,(spawn.y+.5)*CELL).setDepth(20);
        const shadow = this.scene.add.ellipse(0,2,14,6,0x000000,.35);
        const left = this.scene.add.rectangle(-3,-3,3,9,0x384438).setOrigin(.5,0);
        const right = this.scene.add.rectangle(3,-3,3,9,0x384438).setOrigin(.5,0);
        const body = this.scene.add.rectangle(0,-10,11,13,0x8db29c);
        const arm = this.scene.add.rectangle(7,-13,3,10,0xd4ad88).setOrigin(.5,0);
        const head = this.scene.add.circle(0,-21,5,0xd4ad88);
        const hat = this.scene.add.rectangle(0,-25,12,3,0x5a6748);
        const symbol = this.scene.add.text(0,-43,'',{fontSize:'13px',color:'#ffe1a0',stroke:'#10251a',strokeThickness:3}).setOrigin(.5);
        const label = this.scene.add.text(0,10,'',{fontSize:'10px',color:'#e1edd4',backgroundColor:'#10251acc',padding:{x:3,y:2}}).setOrigin(.5,0).setVisible(false);
        container.add([shadow,left,right,body,arm,head,hat,symbol,label]);
        body.setInteractive();body.on('pointerover',()=>label.setVisible(true));body.on('pointerout',()=>label.setVisible(false));
        unit={container,left,right,body,arm,hat,symbol,label,index,path:[],pause:0};this.units.set(resident.id,unit);
      }
      unit.container.setVisible(true);
      const action = resident.settlementAction?.type || '';
      unit.body.setFillStyle(COLORS[action] || 0x8db29c);
      unit.symbol.setText(SYMBOLS[action] || '');
      unit.label.setText(`${resident.name}\n${SETTLEMENT_ACTIONS[action]?.name?.[language] || SETTLEMENT_ACTIONS[action]?.name?.en || '—'}`);
      const task = JSON.stringify(resident.settlementAction);
      if (changed || unit.task !== task) {
        let start = {x:Math.floor(unit.container.x/CELL),y:Math.floor(unit.container.y/CELL)};
        if (!this.cells.some(p=>p.x===start.x&&p.y===start.y)) {
          start = [...this.cells].sort((a,b)=>Math.hypot(a.x-start.x,a.y-start.y)-Math.hypot(b.x-start.x,b.y-start.y))[0];
          unit.container.setPosition((start.x+.5)*CELL,(start.y+.5)*CELL);
        }
        unit.path=residentPath(start,goal,this.cells).slice(1);unit.goal=goal;unit.task=task;
        unit.action=action==='build' && !resident.settlementAction?.targetBuildingId && !resident.settlementAction?.parentBuildingId ? '' : action;
        if(this.reduced) unit.container.setPosition((goal.x+.5)*CELL,(goal.y+.5)*CELL);
      }
    });
  }
  update(time, delta) {
    if (this.reduced || !this.cells?.length) return;
    for (const unit of this.units.values()) {
      const moving = unit.path.length > 0;
      if (moving) {
        const next=unit.path[0],x=(next.x+.5)*CELL,y=(next.y+.5)*CELL;
        const dx=x-unit.container.x,dy=y-unit.container.y,distance=Math.hypot(dx,dy),step=22*Math.min(delta,80)/1000;
        if(distance<=step){unit.container.setPosition(x,y);unit.path.shift();unit.pause=time+1800+unit.index*110;}
        else unit.container.setPosition(unit.container.x+dx/distance*step,unit.container.y+dy/distance*step);
      } else if (time>unit.pause && ['guard','trade_caravan','scavenging','hunting_gathering',''].includes(unit.action)) {
        const start={x:Math.floor(unit.container.x/CELL),y:Math.floor(unit.container.y/CELL)};
        const nearby=this.cells.filter(p=>Math.abs(p.x-unit.goal.x)+Math.abs(p.y-unit.goal.y)<5);
        const goal=nearby[(Math.floor(time/2000)+unit.index*7)%Math.max(1,nearby.length)];
        unit.path=residentPath(start,goal,this.cells).slice(1);unit.pause=time+3000;
      }
      const swing=Math.sin(time/110+unit.index);
      unit.left.rotation=moving?swing*.4:0;unit.right.rotation=moving?-swing*.4:0;
      const atWork=Math.hypot(unit.container.x-(unit.goal.x+.5)*CELL,unit.container.y-(unit.goal.y+.5)*CELL)<2;
      unit.arm.rotation=moving?-swing*.5:atWork&&unit.action==='build'?-1+swing*.9:atWork&&unit.action==='tend_crops'?.6+swing*.4:0;
      unit.container.setDepth(20+unit.container.y/10000);
    }
  }
}
